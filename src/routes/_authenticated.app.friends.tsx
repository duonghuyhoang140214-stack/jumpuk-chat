import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import { CheckIcon, CloseIcon, ChatIcon } from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [friendId, setFriendId] = useState("");
  const [sending, setSending] = useState(false);

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("*, requester:profiles!friendships_requester_id_fkey(id,display_name,avatar_url,friend_id), addressee:profiles!friendships_addressee_id_fkey(id,display_name,avatar_url,friend_id)")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("friends")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () =>
        qc.invalidateQueries({ queryKey: ["friendships"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const sendRequest = async () => {
    const id = friendId.trim();
    if (!/^\d{7}$/.test(id)) {
      toast.error("ID phải có 7 chữ số");
      return;
    }
    setSending(true);
    try {
      const { data: target } = await supabase.from("profiles").select("id, display_name").eq("friend_id", id).maybeSingle();
      if (!target) throw new Error("Không tìm thấy người dùng với ID này");
      if (target.id === user!.id) throw new Error("Không thể tự kết bạn với chính mình");
      const { error } = await supabase.from("friendships").insert({
        requester_id: user!.id,
        addressee_id: target.id,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Đã gửi lời mời trước đó");
        throw error;
      }
      toast.success(`Đã gửi lời mời tới ${target.display_name}`);
      setFriendId("");
      qc.invalidateQueries({ queryKey: ["friendships"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const accept = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["friendships"] });
    toast.success("Đã chấp nhận!");
  };
  const reject = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["friendships"] });
  };
  const startChat = async (otherId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user: otherId });
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/app/chat/$convId", params: { convId: data as string } });
  };

  const incoming = (friendships ?? []).filter((f: any) => f.status === "pending" && f.addressee_id === user!.id);
  const outgoing = (friendships ?? []).filter((f: any) => f.status === "pending" && f.requester_id === user!.id);
  const accepted = (friendships ?? []).filter((f: any) => f.status === "accepted");

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur px-5 py-3 border-b border-border">
        <h1 className="text-2xl text-primary">Bạn bè</h1>
      </header>

      <div className="mx-auto max-w-md p-4 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-muted-foreground mb-2">Thêm bạn bằng ID 7 số</h2>
          <div className="flex gap-2">
            <input
              value={friendId}
              onChange={(e) => setFriendId(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder="0000000"
              maxLength={7}
              className="flex-1 rounded-2xl bg-card px-4 py-3 text-center tracking-[0.4em] font-mono text-lg outline-none focus:ring-2 ring-primary shadow-card"
            />
            <button
              onClick={sendRequest}
              disabled={sending || friendId.length !== 7}
              className="rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-pink disabled:opacity-40 active:scale-95"
            >
              Gửi
            </button>
          </div>
        </section>

        {incoming.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground mb-2">Lời mời đến ({incoming.length})</h2>
            <ul className="space-y-2">
              {incoming.map((f: any) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                  <Avatar path={f.requester.avatar_url} name={f.requester.display_name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{f.requester.display_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {f.requester.friend_id}</p>
                  </div>
                  <button onClick={() => accept(f.id)} className="rounded-full bg-primary p-2 text-primary-foreground shadow-pink">
                    <CheckIcon size={18} />
                  </button>
                  <button onClick={() => reject(f.id)} className="rounded-full bg-muted p-2 text-muted-foreground">
                    <CloseIcon size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground mb-2">Đang chờ ({outgoing.length})</h2>
            <ul className="space-y-2">
              {outgoing.map((f: any) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-card/60 p-3">
                  <Avatar path={f.addressee.avatar_url} name={f.addressee.display_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{f.addressee.display_name}</p>
                    <p className="text-xs text-muted-foreground">Đang chờ phản hồi...</p>
                  </div>
                  <button onClick={() => reject(f.id)} className="text-xs text-muted-foreground">Huỷ</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-muted-foreground mb-2">Bạn bè ({accepted.length})</h2>
          {!accepted.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có bạn bè 🐷</p>
          ) : (
            <ul className="space-y-2">
              {accepted.map((f: any) => {
                const other = f.requester_id === user!.id ? f.addressee : f.requester;
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                    <Avatar path={other.avatar_url} name={other.display_name} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{other.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID: {other.friend_id}</p>
                    </div>
                    <button onClick={() => startChat(other.id)} className="rounded-full bg-primary p-2 text-primary-foreground shadow-pink">
                      <ChatIcon size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
