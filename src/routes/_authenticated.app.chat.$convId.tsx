import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import {
  ArrowLeftIcon, SendIcon, MicIcon, ImageIcon, VideoIcon, PhoneIcon,
  PlayIcon, CloseIcon, MenuIcon, UsersIcon, UserPlusIcon,
} from "@/components/icons";
import { CHAT_BACKGROUNDS, getBgCss } from "@/lib/chat-backgrounds";
import { useSignedUrl } from "@/lib/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat/$convId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { convId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [drawer, setDrawer] = useState<null | "menu" | "bg">(null);
  const [addOpen, setAddOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileVidRef = useRef<HTMLInputElement>(null);

  const { data: meta } = useQuery({
    queryKey: ["conv-meta", convId],
    queryFn: async () => {
      const { data: conv } = await supabase
        .from("conversations").select("id, is_group, name, avatar_url, created_by")
        .eq("id", convId).maybeSingle();
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id, chat_bg, profiles:profiles!conversation_members_user_id_fkey(id,display_name,avatar_url,friend_id)")
        .eq("conversation_id", convId);
      const me = members?.find((m: any) => m.user_id === user!.id);
      const others = (members ?? []).filter((m: any) => m.user_id !== user!.id);
      return { conv, me, others, members: members ?? [] };
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", convId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`msg-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", convId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${convId}` },
        () => qc.invalidateQueries({ queryKey: ["conv-meta", convId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (extra?: Partial<{ type: string; content: string; media_url: string }>) => {
    const payload = extra ?? { type: "text", content: text.trim() };
    if (payload.type === "text" && !payload.content) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: convId, sender_id: user!.id,
      type: payload.type as any, content: payload.content, media_url: payload.media_url,
    });
    if (error) { toast.error(error.message); return; }
    if (!extra) setText("");
  };

  const uploadAndSend = async (file: File, type: "image" | "video" | "voice") => {
    const ext = file.name.split(".").pop() || (type === "voice" ? "webm" : "bin");
    const path = `${user!.id}/${convId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) { toast.error(error.message); return; }
    await send({ type, media_url: path });
  };

  const setBg = async (bgId: string) => {
    await supabase.from("conversation_members").update({ chat_bg: bgId })
      .eq("conversation_id", convId).eq("user_id", user!.id);
    qc.invalidateQueries({ queryKey: ["conv-meta", convId] });
    setDrawer(null);
  };

  // voice recording
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec; chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadAndSend(file, "voice");
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start(); setRecording(true);
    } catch { toast.error("Không thể truy cập mic"); }
  };
  const stopRec = () => { recorderRef.current?.stop(); setRecording(false); };

  const bg = getBgCss(meta?.me?.chat_bg);
  const isGroup = meta?.conv?.is_group;
  const others = meta?.others ?? [];
  const title = isGroup ? meta?.conv?.name : (others[0]?.profiles as any)?.display_name ?? "Bạn";
  const subtitle = isGroup
    ? `${(meta?.members.length ?? 0)} thành viên`
    : `ID ${(others[0]?.profiles as any)?.friend_id ?? "—"}`;

  const senderMap = useMemo(() => {
    const m: Record<string, any> = {};
    (meta?.members ?? []).forEach((mb: any) => { m[mb.user_id] = mb.profiles; });
    return m;
  }, [meta]);

  const excludeIds = useMemo(() => (meta?.members ?? []).map((m: any) => m.user_id), [meta]);

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: bg }}>
      <header className="flex items-center gap-2 glass px-2.5 py-2 border-b border-border">
        <Link to="/app" className="rounded-full p-2 text-muted-foreground active:bg-secondary">
          <ArrowLeftIcon size={22} />
        </Link>
        {isGroup ? (
          <div className="h-10 w-10 rounded-full bg-gradient-pink grid place-items-center text-white">
            <UsersIcon size={20} />
          </div>
        ) : (
          <Avatar path={(others[0]?.profiles as any)?.avatar_url} name={(others[0]?.profiles as any)?.display_name} size={40} />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        <button
          onClick={() => navigate({ to: "/app/call/$convId", params: { convId } })}
          className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink active:scale-95"
        >
          <PhoneIcon size={18} />
        </button>
        <button onClick={() => setDrawer("menu")} className="rounded-full p-2 text-muted-foreground active:bg-secondary">
          <MenuIcon size={22} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {messages?.map((m: any, i: number) => {
          const prev = messages[i - 1];
          const showAvatar = isGroup && m.sender_id !== user!.id && (!prev || prev.sender_id !== m.sender_id);
          const showName = showAvatar;
          return (
            <MessageBubble
              key={m.id}
              msg={m}
              mine={m.sender_id === user!.id}
              isGroup={!!isGroup}
              sender={senderMap[m.sender_id]}
              showAvatar={showAvatar}
              showName={showName}
            />
          );
        })}
      </div>

      <div className="glass p-2 border-t border-border safe-bottom">
        <div className="flex items-end gap-1.5">
          <button onClick={() => fileImgRef.current?.click()} className="rounded-full p-2.5 text-primary bg-secondary"><ImageIcon size={20} /></button>
          <button onClick={() => fileVidRef.current?.click()} className="rounded-full p-2.5 text-primary bg-secondary"><VideoIcon size={20} /></button>
          <input ref={fileImgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAndSend(e.target.files[0], "image")} />
          <input ref={fileVidRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAndSend(e.target.files[0], "video")} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Aa..."
            className="flex-1 rounded-full bg-muted px-4 py-2.5 outline-none focus:ring-2 ring-primary text-sm"
          />
          {text.trim() ? (
            <button onClick={() => send()} className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink active:scale-95">
              <SendIcon size={20} />
            </button>
          ) : (
            <button
              onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={recording ? stopRec : undefined}
              onTouchStart={startRec} onTouchEnd={stopRec}
              className={`rounded-full p-2.5 shadow-pink ${recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"}`}
            ><MicIcon size={20} /></button>
          )}
        </div>
        {recording && <p className="text-center text-xs text-destructive mt-1 animate-pulse">🎤 Đang ghi âm... thả ra để gửi</p>}
      </div>

      {/* drawer / menu */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm"
            onClick={() => setDrawer(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26 }}
              className="w-full rounded-t-3xl bg-card p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{drawer === "menu" ? "Tuỳ chọn" : "Đổi nền chat"}</h3>
                <button onClick={() => setDrawer(null)} className="rounded-full bg-muted p-1.5"><CloseIcon size={18} /></button>
              </div>

              {drawer === "menu" && (
                <div className="space-y-2">
                  {isGroup && (
                    <button onClick={() => { setDrawer(null); setAddOpen(true); }}
                      className="w-full flex items-center gap-3 rounded-2xl bg-secondary p-3.5 active:scale-[0.99]">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><UserPlusIcon size={20} /></span>
                      <span className="font-bold">Thêm thành viên</span>
                    </button>
                  )}
                  <button onClick={() => setDrawer("bg")}
                    className="w-full flex items-center gap-3 rounded-2xl bg-secondary p-3.5 active:scale-[0.99]">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-pink text-white"><ImageIcon size={20} /></span>
                    <span className="font-bold">Đổi nền chat</span>
                  </button>
                  <button onClick={() => { setDrawer(null); navigate({ to: "/app/call/$convId", params: { convId } }); }}
                    className="w-full flex items-center gap-3 rounded-2xl bg-secondary p-3.5 active:scale-[0.99]">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><PhoneIcon size={20} /></span>
                    <span className="font-bold">{isGroup ? "Gọi nhóm" : "Gọi thoại"}</span>
                  </button>
                  {isGroup && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-muted-foreground mb-2">Thành viên ({meta?.members.length})</p>
                      <ul className="space-y-1.5">
                        {meta?.members.map((m: any) => (
                          <li key={m.user_id} className="flex items-center gap-3 rounded-2xl p-2">
                            <Avatar path={m.profiles?.avatar_url} name={m.profiles?.display_name} size={38} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{m.profiles?.display_name}{m.user_id === user!.id && " (Bạn)"}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">ID {m.profiles?.friend_id}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {drawer === "bg" && (
                <div className="grid grid-cols-3 gap-3">
                  {CHAT_BACKGROUNDS.map((b) => (
                    <button
                      key={b.id} onClick={() => setBg(b.id)}
                      className={`aspect-[3/4] rounded-2xl border-2 transition ${meta?.me?.chat_bg === b.id ? "border-primary scale-95" : "border-transparent"}`}
                      style={{ background: b.css }}
                    >
                      <span className="block text-xs font-bold text-foreground/80 bg-card/70 mx-2 mt-2 rounded-full py-0.5">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateGroupModal open={addOpen} onClose={() => setAddOpen(false)} addToConvId={convId} excludeIds={excludeIds} />
    </div>
  );
}

function MessageBubble({ msg, mine, isGroup, sender, showAvatar, showName }: {
  msg: any; mine: boolean; isGroup: boolean; sender?: any; showAvatar?: boolean; showName?: boolean;
}) {
  const mediaUrl = useSignedUrl(msg.media_url, "chat-media");
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}
    >
      {!mine && isGroup && (
        <div className="w-7 shrink-0">
          {showAvatar && <Avatar path={sender?.avatar_url} name={sender?.display_name} size={28} />}
        </div>
      )}
      <div className="flex flex-col max-w-[78%]">
        {showName && !mine && isGroup && (
          <span className="text-[10px] text-muted-foreground font-bold ml-3 mb-0.5">{sender?.display_name}</span>
        )}
        <div
          className={`rounded-3xl px-3.5 py-2 shadow-soft ${
            mine ? "bg-bubble-me text-bubble-me-foreground rounded-br-md" : "bg-bubble-them text-bubble-them-foreground rounded-bl-md"
          }`}
        >
          {msg.type === "text" && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.content}</p>}
          {msg.type === "image" && mediaUrl && <img src={mediaUrl} className="rounded-2xl max-w-[260px]" alt="" />}
          {msg.type === "video" && mediaUrl && <video src={mediaUrl} controls className="rounded-2xl max-w-[260px]" />}
          {msg.type === "voice" && mediaUrl && (
            <div className="flex items-center gap-2 min-w-[180px]">
              <PlayIcon size={18} />
              <audio src={mediaUrl} controls className="h-8" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
