import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { PhoneIcon, PhoneMissedIcon, ArrowLeftIcon } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/calls")({
  component: CallHistory,
});

function CallHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["call-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("call_history")
        .select("*, caller:profiles!call_history_caller_id_fkey(id,display_name,avatar_url), callee:profiles!call_history_callee_id_fkey(id,display_name,avatar_url)")
        .or(`caller_id.eq.${user!.id},callee_id.eq.${user!.id}`)
        .order("started_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen pb-28 bg-background">
      <header className="sticky top-0 z-20 glass border-b border-border">
        <div className="mx-auto max-w-md flex items-center gap-2 px-3 py-3">
          <button onClick={() => navigate({ to: "/app" })} className="rounded-full p-2 bg-secondary"><ArrowLeftIcon size={20} /></button>
          <h1 className="text-lg text-primary flex-1">Lịch sử cuộc gọi</h1>
        </div>
      </header>
      <div className="mx-auto max-w-md p-3 space-y-1">
        {!data?.length && (
          <p className="text-center text-muted-foreground py-16">Chưa có cuộc gọi nào</p>
        )}
        {data?.map((c: any) => {
          const other = c.caller_id === user!.id ? c.callee : c.caller;
          const outgoing = c.caller_id === user!.id;
          const missed = c.status === "missed" || c.status === "declined";
          return (
            <Link
              key={c.id}
              to="/app/chat/$convId"
              params={{ convId: c.conversation_id }}
              className="flex items-center gap-3 rounded-2xl p-3 active:bg-secondary/70"
            >
              <Avatar path={other?.avatar_url} name={other?.display_name} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{other?.display_name ?? "Người dùng"}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {missed ? <PhoneMissedIcon size={14} className="text-destructive" /> :
                    <PhoneIcon size={14} className={outgoing ? "text-primary" : "text-green-500"} />}
                  <span>{outgoing ? "Gọi đi" : "Gọi đến"}</span>
                  {c.duration_sec > 0 && <span>· {fmt(c.duration_sec)}</span>}
                  <span>· {formatDistanceToNow(new Date(c.started_at), { addSuffix: true, locale: vi })}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate({ to: "/app/call/$convId", params: { convId: c.conversation_id } }); }}
                className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink"
              ><PhoneIcon size={18} /></button>
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
