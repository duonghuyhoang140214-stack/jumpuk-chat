import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { CloseIcon, CheckIcon, UsersIcon } from "@/components/icons";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  /** If set, instead of creating a new group, add selected friends to this existing group */
  addToConvId?: string;
  excludeIds?: string[];
}

export function CreateGroupModal({ open, onClose, addToConvId, excludeIds = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: friends } = useQuery({
    queryKey: ["friend-list-simple"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("*, requester:profiles!friendships_requester_id_fkey(id,display_name,avatar_url,friend_id), addressee:profiles!friendships_addressee_id_fkey(id,display_name,avatar_url,friend_id)")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      return (data ?? []).map((f: any) => f.requester_id === user!.id ? f.addressee : f.requester);
    },
  });

  const toggle = (id: string) => {
    setPicked((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (addToConvId) {
      if (picked.size === 0) return;
      setBusy(true);
      try {
        for (const id of picked) {
          const { error } = await supabase.rpc("add_group_member", { _conv: addToConvId, _target: id });
          if (error) throw error;
        }
        toast.success("Đã thêm thành viên");
        qc.invalidateQueries();
        onClose();
        setPicked(new Set());
      } catch (e: any) {
        toast.error(e.message);
      } finally { setBusy(false); }
      return;
    }
    if (!name.trim() || picked.size === 0) {
      toast.error("Cần tên nhóm và ít nhất 1 thành viên");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_group", {
        _name: name.trim(),
        _member_ids: Array.from(picked),
      });
      if (error) throw error;
      toast.success("Đã tạo nhóm 🎉");
      qc.invalidateQueries();
      onClose();
      setName(""); setPicked(new Set());
      navigate({ to: "/app/chat/$convId", params: { convId: data as string } });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const visible = (friends ?? []).filter((f: any) => !excludeIds.includes(f.id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full rounded-t-3xl bg-card p-5 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UsersIcon size={22} className="text-primary" />
                {addToConvId ? "Thêm thành viên" : "Tạo nhóm mới"}
              </h3>
              <button onClick={onClose} className="rounded-full bg-muted p-1.5"><CloseIcon size={18} /></button>
            </div>

            {!addToConvId && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên nhóm (VD: Lớp 10A1 🐷)"
                maxLength={50}
                className="mb-3 rounded-2xl bg-muted px-4 py-3 outline-none focus:ring-2 ring-primary"
              />
            )}

            <p className="text-xs font-bold text-muted-foreground mb-2">
              Chọn bạn bè ({picked.size})
            </p>
            <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
              {!visible.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Chưa có bạn bè để thêm</p>
              ) : visible.map((f: any) => {
                const on = picked.has(f.id);
                return (
                  <button
                    key={f.id} onClick={() => toggle(f.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-2.5 transition ${on ? "bg-primary/10" : "active:bg-secondary"}`}
                  >
                    <Avatar path={f.avatar_url} name={f.display_name} size={42} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold truncate text-sm">{f.display_name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">ID {f.friend_id}</p>
                    </div>
                    <span className={`h-6 w-6 rounded-full grid place-items-center border-2 ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                      {on && <CheckIcon size={14} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={busy || picked.size === 0 || (!addToConvId && !name.trim())}
              className="mt-4 w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground shadow-pink disabled:opacity-40 active:scale-[0.98]"
            >
              {addToConvId ? `Thêm ${picked.size} người` : `Tạo nhóm với ${picked.size} người`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
