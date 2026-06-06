import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import { PigLogo } from "@/components/PigLogo";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ChatList,
});

function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: convs, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations(id, last_message_at)")
        .eq("user_id", user!.id);
      if (!members) return [];
      const ids = members.map((m: any) => m.conversation_id);
      if (!ids.length) return [];
      // get other party for each
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
        const others = (allMembers ?? []).filter((m: any) => m.conversation_id === id && m.user_id !== user!.id);
        const last = (lastMsgs ?? []).find((m: any) => m.conversation_id === id);
        const conv = members.find((m: any) => m.conversation_id === id)?.conversations as any;
        return { id, other: others[0], last, last_message_at: conv?.last_message_at };
      }).sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-card/90 backdrop-blur px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <PigLogo size={36} />
          <h1 className="text-2xl text-primary">Jumpuk</h1>
        </div>
        <Link to="/app/friends" className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">+ Bạn</Link>
      </header>

      <div className="mx-auto max-w-md p-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Đang tải...</p>
        ) : !convs?.length ? (
          <div className="text-center py-16 px-6">
            <PigLogo size={100} className="mx-auto opacity-60" />
            <p className="mt-4 text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
            <p className="text-sm text-muted-foreground mt-1">Kết bạn qua ID 7 số rồi bắt đầu nhắn nhé!</p>
            <button onClick={() => navigate({ to: "/app/friends" })} className="mt-6 rounded-full bg-primary px-6 py-3 text-primary-foreground font-bold shadow-pink">
              Đi tìm bạn
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {convs.map((c: any) => (
              <li key={c.id}>
                <Link
                  to="/app/chat/$convId"
                  params={{ convId: c.id }}
                  className="flex items-center gap-3 rounded-2xl p-3 hover:bg-secondary/60 transition"
                >
                  <Avatar path={c.other?.profiles?.avatar_url} name={c.other?.profiles?.display_name} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold truncate">{c.other?.profiles?.display_name ?? "Bạn"}</p>
                      {c.last_message_at && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.last ? previewMsg(c.last) : "Bắt đầu trò chuyện..."}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function previewMsg(m: any) {
  if (m.type === "image") return "📷 Ảnh";
  if (m.type === "video") return "🎬 Video";
  if (m.type === "voice") return "🎤 Tin nhắn thoại";
  return m.content ?? "";
}
