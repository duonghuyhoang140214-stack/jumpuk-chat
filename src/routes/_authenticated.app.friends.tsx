import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import { CheckIcon, CloseIcon, ChatIcon, PhoneIcon, UserPlusIcon } from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/friends")({
  component: FriendsPage,
});

type Tab = "friends" | "incoming" | "sent";

function FriendsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [friendId, setFriendId] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>("friends");

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
    if (!/^\d{7}$/.test(id)) { toast.error("ID phải có 7 chữ số"); return; }
    setSending(true);
    try {
      const { data: target } = await supabase.from("profiles").select("id, display_name").eq("friend_id", id).maybeSingle();
      if (!target) throw new Error("Không tìm thấy người dùng với ID này");
      if (target.id === user!.id) throw new Error("Không thể tự kết bạn với chính mình");
      const { error } = await supabase.from("friendships").insert({
        requester_id: user!.id, addressee_id: target.id, status: "pending",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Đã gửi lời mời trước đó");
        throw error;
      }
      toast.success(`Đã gửi lời mời tới ${target.display_name}`);
      setFriendId("");
      setTab("sent");
      qc.invalidateQueries({ queryKey: ["friendships"] });
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  };

  const accept = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["friendships"] });
    toast.success("Đã chấp nhận! 🐷");
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
  const startCall = async (otherId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user: otherId });
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/app/call/$convId", params: { convId: data as string } });
  };

  const incoming = (friendships ?? []).filter((f: any) => f.status === "pending" && f.addressee_id === user!.id);
  const sent = (friendships ?? []).filter((f: any) => f.status === "pending" && f.requester_id === user!.id);
  const accepted = (friendships ?? []).filter((f: any) => f.status === "accepted");

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 glass px-5 pt-3 pb-2 border-b border-border">
        <h1 className="text-2xl text-primary">Bạn bè</h1>
      </header>

      <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* add friend */}
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
            <UserPlusIcon size={14} /> Thêm bạn bằng ID 7 số
          </p>
          <div className="flex gap-2">
            <input
              value={friendId}
              onChange={(e) => setFriendId(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder="0000000" maxLength={7} inputMode="numeric"
              className="flex-1 rounded-2xl bg-muted px-4 py-3 text-center tracking-[0.4em] font-mono text-lg outline-none focus:ring-2 ring-primary"
            />
            <button
              onClick={sendRequest}
              disabled={sending || friendId.length !== 7}
              className="rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-pink disabled:opacity-40 active:scale-95"
            >Gửi</button>
          </div>
        </section>

        {/* tabs */}
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {([
            { id: "friends", label: `Bạn bè (${accepted.length})` },
            { id: "incoming", label: `Đến (${incoming.length})` },
            { id: "sent", label: `Đã gửi (${sent.length})` },
          ] as const).map((t) => (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                tab === t.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground"
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* lists */}
        {tab === "friends" && (
          !accepted.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">Chưa có bạn bè 🐷</p>
          ) : (
            <ul className="space-y-2">
              {accepted.map((f: any) => {
                const other = f.requester_id === user!.id ? f.addressee : f.requester;
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                    <Avatar path={other.avatar_url} name={other.display_name} size={46} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{other.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID {other.friend_id}</p>
                    </div>
                    <button onClick={() => startCall(other.id)} className="rounded-full bg-secondary p-2.5 text-primary"><PhoneIcon size={18} /></button>
                    <button onClick={() => startChat(other.id)} className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink"><ChatIcon size={18} /></button>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {tab === "incoming" && (
          !incoming.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">Không có lời mời nào</p>
          ) : (
            <ul className="space-y-2">
              {incoming.map((f: any) => (
                <li key={f.id} className="rounded-2xl bg-card p-3 shadow-card">
                  <div className="flex items-center gap-3">
                    <Avatar path={f.requester.avatar_url} name={f.requester.display_name} size={46} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{f.requester.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID {f.requester.friend_id}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={() => accept(f.id)} className="rounded-xl bg-primary py-2 font-bold text-primary-foreground text-sm shadow-pink flex items-center justify-center gap-1.5">
                      <CheckIcon size={16} /> Đồng ý
                    </button>
                    <button onClick={() => reject(f.id)} className="rounded-xl bg-muted py-2 font-bold text-muted-foreground text-sm flex items-center justify-center gap-1.5">
                      <CloseIcon size={16} /> Từ chối
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "sent" && (
          !sent.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">Chưa gửi lời mời nào</p>
          ) : (
            <ul className="space-y-2">
              {sent.map((f: any) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-card/60 p-3">
                  <Avatar path={f.addressee.avatar_url} name={f.addressee.display_name} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{f.addressee.display_name}</p>
                    <p className="text-xs text-muted-foreground">⏳ Đang chờ phản hồi · ID {f.addressee.friend_id}</p>
                  </div>
                  <button onClick={() => reject(f.id)} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">Thu hồi</button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
      <BottomNav />
    </div>
  );
}
