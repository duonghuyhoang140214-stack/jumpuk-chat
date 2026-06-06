import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMyProfile } from "@/lib/hooks";
import { Avatar } from "@/components/Avatar";
import { BottomNav } from "@/components/BottomNav";
import { CopyIcon, ImageIcon } from "@/components/icons";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const copyId = () => {
    navigator.clipboard.writeText(profile.friend_id);
    toast.success("Đã sao chép ID!");
  };

  const updateName = async () => {
    if (!name.trim()) return;
    await supabase.from("profiles").update({ display_name: name }).eq("id", user!.id);
    setName("");
    refetch();
    qc.invalidateQueries();
    toast.success("Đã cập nhật tên");
  };

  const uploadAvatar = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user!.id);
    refetch();
    qc.invalidateQueries();
    toast.success("Đã đổi ảnh đại diện");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur px-5 py-3 border-b border-border">
        <h1 className="text-2xl text-primary">Hồ sơ</h1>
      </header>

      <div className="mx-auto max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar path={profile.avatar_url} name={profile.display_name} size={120} />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-2.5 text-primary-foreground shadow-pink border-4 border-background"
            >
              <ImageIcon size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </div>
          <h2 className="text-2xl font-bold">{profile.display_name}</h2>
        </div>

        <div className="rounded-3xl bg-gradient-pink p-6 text-white shadow-pink text-center">
          <p className="text-xs uppercase opacity-80 font-semibold tracking-widest">ID Kết bạn</p>
          <button onClick={copyId} className="mt-2 flex items-center justify-center gap-3 mx-auto group">
            <span className="text-4xl font-mono font-bold tracking-[0.25em]">{profile.friend_id}</span>
            <CopyIcon size={22} className="opacity-80 group-active:scale-90" />
          </button>
          <p className="mt-2 text-xs opacity-80">Bấm để sao chép · Chia sẻ để được kết bạn</p>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <label className="text-sm font-bold text-muted-foreground">Đổi tên hiển thị</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={profile.display_name}
              className="flex-1 rounded-xl bg-muted px-4 py-2.5 outline-none focus:ring-2 ring-primary"
            />
            <button onClick={updateName} className="rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground">Lưu</button>
          </div>
        </div>

        <button onClick={signOut} className="w-full rounded-2xl border-2 border-destructive/30 py-3 font-bold text-destructive">
          Đăng xuất
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
