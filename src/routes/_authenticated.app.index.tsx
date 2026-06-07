import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import { PigLogo } from "@/components/PigLogo";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { UsersIcon, PenIcon } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ChatList,
});

function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showGroup, setShowGroup] = useState(false);

  const { data: convs, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations(id, last_message_at, is_group, name, avatar_url)")
        .eq("user_id", user!.id);
      if (!members) return [];
      const ids = members.map((m: any) => m.conversation_id);
      if (!ids.length) return [];
      const { data: allMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, profiles:profiles!conversation_members_user_id_fkey(id, display_name, avatar_url, friend_id)")
        .in("conversation_id", ids);
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("conversation_id, content, type, created_at, sender_id")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });
      return ids.map((id: string) => {
        const conv = members.find((m: any) => m.conversation_id === id)?.conversations as any;
        const allM = (allMembers ?? []).filter((m: any) => m.conversation_id === id);
        const others = allM.filter((m: any) => m.user_id !== user!.id);
        const last = (lastMsgs ?? []).find((m: any) => m.conversation_id === id);
        return { id, conv, others, last, last_message_at: conv?.last_message_at };
      }).sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 glass border-b border-border">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-pink text-white shadow-pink">
              <PigLogo size={26} color="white" />
            </span>
            <div>
              <h1 className="text-xl text-primary leading-none">Jumpuk</h1>
              <p className="text-[10px] text-muted-foreground font-semibold">Chat hồng • Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGroup(true)}
              className="rounded-full bg-secondary p-2.5 text-primary active:scale-95"
              aria-label="Tạo nhóm"
            ><UsersIcon size={20} /></button>
            <Link
              to="/app/friends"
              className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink"
              aria-label="Bạn bè"
            ><PenIcon size={20} /></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md p-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Đang tải...</p>
        ) : !convs?.length ? (
          <div className="text-center py-16 px-6">
            <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-pink grid place-items-center shadow-pink">
              <PigLogo size={72} color="white" />
            </div>
            <p className="mt-5 text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
            <p className="text-sm text-muted-foreground mt-1">Kết bạn qua ID 7 số rồi bắt đầu nhắn nhé!</p>
            <button onClick={() => navigate({ to: "/app/friends" })} className="mt-6 rounded-full bg-primary px-6 py-3 text-primary-foreground font-bold shadow-pink">
              Đi tìm bạn
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {convs.map((c: any) => {
              const isGroup = c.conv?.is_group;
              const title = isGroup ? (c.conv?.name ?? "Nhóm") : (c.others[0]?.profiles?.display_name ?? "Bạn");
              const subtitle = isGroup
                ? `${c.others.length + 1} thành viên`
                : null;
              return (
                <li key={c.id}>
                  <Link
                    to="/app/chat/$convId"
                    params={{ convId: c.id }}
                    className="flex items-center gap-3 rounded-2xl p-2.5 active:bg-secondary/80 transition"
                  >
                    {isGroup ? (
                      <GroupAvatar members={c.others} size={52} />
                    ) : (
                      <Avatar path={c.others[0]?.profiles?.avatar_url} name={c.others[0]?.profiles?.display_name} size={52} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold truncate flex items-center gap-1.5">
                          {isGroup && <UsersIcon size={14} className="text-primary shrink-0" />}
                          {title}
                        </p>
                        {c.last_message_at && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.last ? previewMsg(c.last) : (subtitle ?? "Bắt đầu trò chuyện...")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
      <CreateGroupModal open={showGroup} onClose={() => setShowGroup(false)} />
    </div>
  );
}

function GroupAvatar({ members, size }: { members: any[]; size: number }) {
  const a = members[0]?.profiles;
  const b = members[1]?.profiles;
  const h = size, half = size * 0.62;
  return (
    <div className="relative shrink-0" style={{ width: h, height: h }}>
      <div className="absolute left-0 top-0">
        <Avatar path={a?.avatar_url} name={a?.display_name} size={half} />
      </div>
      <div className="absolute right-0 bottom-0 ring-2 ring-background rounded-full">
        <Avatar path={b?.avatar_url} name={b?.display_name ?? "+"} size={half} />
      </div>
    </div>
  );
}

function previewMsg(m: any) {
  if (m.type === "image") return "📷 Ảnh";
  if (m.type === "video") return "🎬 Video";
  if (m.type === "voice") return "🎤 Tin nhắn thoại";
  return m.content ?? "";
}
