import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeftIcon, ImageIcon, VideoIcon, CloseIcon } from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/post-story")({
  component: PostStory,
});

function PostStory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f: File, t: "image" | "video") => {
    if (t === "video") {
      const url = URL.createObjectURL(f);
      const v = document.createElement("video");
      v.src = url; v.preload = "metadata";
      await new Promise((res) => { v.onloadedmetadata = () => res(null); });
      if (v.duration > 30.5) {
        toast.error("Video tối đa 30 giây!");
        URL.revokeObjectURL(url);
        return;
      }
      setVideoDuration(v.duration);
      setPreview(url);
    } else {
      setPreview(URL.createObjectURL(f));
    }
    setFile(f); setType(t);
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setCaption(""); setVideoDuration(0);
  };

  const post = async () => {
    if (!file) { toast.error("Chọn ảnh hoặc video trước"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? (type === "video" ? "mp4" : "jpg");
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("stories").insert({
        user_id: user!.id,
        media_type: type,
        media_path: path,
        caption: caption || null,
        duration_ms: type === "video" ? Math.round(videoDuration * 1000) : null,
      });
      if (insErr) throw insErr;
      toast.success("Đăng nhật ký thành công!");
      navigate({ to: "/app/stories" });
    } catch (e: any) {
      toast.error(e.message ?? "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <header className="sticky top-0 z-20 glass border-b border-border">
        <div className="mx-auto max-w-md flex items-center gap-2 px-3 py-3">
          <button onClick={() => navigate({ to: "/app" })} className="rounded-full p-2 bg-secondary"><ArrowLeftIcon size={20} /></button>
          <h1 className="text-lg text-primary flex-1">Đăng nhật ký</h1>
          <button
            disabled={!file || busy}
            onClick={post}
            className="rounded-full bg-primary px-5 py-2 text-primary-foreground font-bold shadow-pink disabled:opacity-40"
          >{busy ? "..." : "Đăng"}</button>
        </div>
      </header>

      <div className="mx-auto max-w-md p-4 space-y-4">
        {!preview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => imgRef.current?.click()}
              className="aspect-square rounded-3xl bg-gradient-pink text-white grid place-items-center gap-2 shadow-pink active:scale-95 transition"
            >
              <ImageIcon size={44} />
              <span className="font-bold">Ảnh nhật ký</span>
            </button>
            <button
              onClick={() => vidRef.current?.click()}
              className="aspect-square rounded-3xl bg-card text-primary border-2 border-primary/30 grid place-items-center gap-2 active:scale-95 transition"
            >
              <VideoIcon size={44} />
              <span className="font-bold">Video ≤ 30s</span>
            </button>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0], "image")} />
            <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0], "video")} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[9/16] max-h-[60vh] mx-auto">
              {type === "image" ? (
                <img src={preview} className="w-full h-full object-contain" />
              ) : (
                <video src={preview} controls className="w-full h-full object-contain" />
              )}
              <button onClick={clear} className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-2">
                <CloseIcon size={18} />
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Viết chú thích cho nhật ký..."
              rows={3}
              className="w-full rounded-2xl bg-muted p-3 outline-none focus:ring-2 ring-primary resize-none"
            />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
