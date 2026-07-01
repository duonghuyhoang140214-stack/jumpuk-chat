import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { useSignedUrl } from "@/lib/hooks";
import {
  HeartIcon, CommentIcon, ShareIcon, SearchIcon,
  CloseIcon, SendIcon, ImageIcon, VideoIcon, TrashIcon,
} from "@/components/icons";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/stories")({
  component: StoriesFeed,
});

interface Story {
  id: string;
  user_id: string;
  media_type: "image" | "video";
  media_path: string;
  caption: string | null;
  created_at: string;
  profiles: { id: string; display_name: string; avatar_url: string | null; friend_id: string } | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

function StoriesFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);

  const { data: stories, refetch } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stories")
        .select("*, profiles:profiles!stories_user_id_fkey(id,display_name,avatar_url,friend_id)")
        .order("created_at", { ascending: false })
        .limit(80);
      const list = (data ?? []) as any[];
      const ids = list.map((s) => s.id);
      if (!ids.length) return [] as Story[];
      const [{ data: likes }, { data: myLikes }, { data: cCounts }] = await Promise.all([
        supabase.from("story_likes").select("story_id").in("story_id", ids),
        supabase.from("story_likes").select("story_id").in("story_id", ids).eq("user_id", user!.id),
        supabase.from("story_comments").select("story_id").in("story_id", ids),
      ]);
      const likeMap: Record<string, number> = {};
      (likes ?? []).forEach((l: any) => { likeMap[l.story_id] = (likeMap[l.story_id] ?? 0) + 1; });
      const cMap: Record<string, number> = {};
      (cCounts ?? []).forEach((c: any) => { cMap[c.story_id] = (cMap[c.story_id] ?? 0) + 1; });
      const mine = new Set((myLikes ?? []).map((l: any) => l.story_id));
      return list.map((s) => ({
        ...s,
        like_count: likeMap[s.id] ?? 0,
        liked_by_me: mine.has(s.id),
        comment_count: cMap[s.id] ?? 0,
      })) as Story[];
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["story-search", search],
    enabled: search.trim().length > 0,
    queryFn: async () => {
      const q = search.trim();
      const [byUser, byCaption] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, friend_id")
          .or(`display_name.ilike.%${q}%,friend_id.ilike.%${q}%`).limit(10),
        supabase.from("stories").select("id, caption, user_id, media_type, media_path")
          .ilike("caption", `%${q}%`).limit(10),
      ]);
      return { users: byUser.data ?? [], caps: byCaption.data ?? [] };
    },
  });

  const filtered = useMemo(() => stories ?? [], [stories]);

  const toggleLike = async (story: Story) => {
    if (story.liked_by_me) {
      await supabase.from("story_likes").delete()
        .eq("story_id", story.id).eq("user_id", user!.id);
    } else {
      await supabase.from("story_likes").insert({ story_id: story.id, user_id: user!.id });
    }
    refetch();
  };

  const del = async (s: Story) => {
    if (s.user_id !== user!.id) return;
    if (!confirm("Xóa nhật ký này?")) return;
    await supabase.from("stories").delete().eq("id", s.id);
    await supabase.storage.from("stories").remove([s.media_path]);
    refetch();
  };

  return (
    <div className="h-[100dvh] bg-black text-white overflow-hidden relative">
      {/* Search bar */}
      <div className="absolute top-0 inset-x-0 z-30 pt-safe">
        <div className="mx-auto max-w-md px-3 pt-3">
          <div className="glass-strong rounded-full flex items-center gap-2 px-3 py-2 border border-white/20">
            <SearchIcon size={18} className="text-white/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tài khoản, ID hoặc nội dung..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/50"
            />
            {search && (
              <button onClick={() => setSearch("")}><CloseIcon size={16} /></button>
            )}
          </div>
        </div>
      </div>

      {/* Search results overlay */}
      {search && searchResults && (
        <div className="absolute inset-0 z-20 bg-black/90 pt-20 pb-24 overflow-y-auto">
          <div className="mx-auto max-w-md px-4 space-y-2">
            <p className="text-xs uppercase font-bold text-white/50 tracking-wider">Người dùng</p>
            {searchResults.users.length === 0 && <p className="text-white/40 text-sm">Không có kết quả</p>}
            {searchResults.users.map((u: any) => (
              <button
                key={u.id}
                onClick={() => { setSearch(""); navigate({ to: "/app/user/$userId", params: { userId: u.id } }); }}
                className="w-full flex items-center gap-3 rounded-2xl bg-white/5 p-3 active:bg-white/10"
              >
                <Avatar path={u.avatar_url} name={u.display_name} size={44} />
                <div className="text-left flex-1">
                  <p className="font-bold">{u.display_name}</p>
                  <p className="text-xs text-white/50 font-mono">ID {u.friend_id}</p>
                </div>
              </button>
            ))}
            {searchResults.caps.length > 0 && (
              <>
                <p className="text-xs uppercase font-bold text-white/50 tracking-wider mt-4">Nội dung nhật ký</p>
                {searchResults.caps.map((c: any) => (
                  <div key={c.id} className="rounded-2xl bg-white/5 p-3 text-sm">{c.caption}</div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth" style={{ scrollbarWidth: "none" }}>
        {!filtered.length && (
          <div className="h-full grid place-items-center text-center px-8">
            <div>
              <p className="text-lg font-bold">Chưa có nhật ký nào</p>
              <p className="text-sm text-white/60 mt-2">Bấm dấu + ở thanh dưới để đăng bài đầu tiên nhé!</p>
            </div>
          </div>
        )}
        {filtered.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            isMe={s.user_id === user!.id}
            onLike={() => toggleLike(s)}
            onComment={() => setOpenComments(s.id)}
            onDelete={() => del(s)}
            onProfile={() => navigate({ to: "/app/user/$userId", params: { userId: s.user_id } })}
          />
        ))}
      </div>

      {openComments && (
        <CommentsSheet storyId={openComments} onClose={() => { setOpenComments(null); refetch(); }} />
      )}

      <BottomNav />
    </div>
  );
}

function StoryCard({ story, isMe, onLike, onComment, onDelete, onProfile }: {
  story: Story; isMe: boolean;
  onLike: () => void; onComment: () => void; onDelete: () => void; onProfile: () => void;
}) {
  const url = useSignedUrl(story.media_path, "stories");
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!vidRef.current) return;
    const el = vidRef.current;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [url]);

  return (
    <section className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden">
      <div className="absolute inset-0 bg-black">
        {url && (story.media_type === "video" ? (
          <video ref={vidRef} src={url} loop muted={false} playsInline className="h-full w-full object-contain" />
        ) : (
          <img src={url} className="h-full w-full object-contain" />
        ))}
      </div>
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Right actions (TikTok style) */}
      <div className="absolute right-2 bottom-32 z-10 flex flex-col items-center gap-4">
        <button onClick={onProfile} className="relative">
          <Avatar path={story.profiles?.avatar_url} name={story.profiles?.display_name} size={48} className="ring-2 ring-white" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-xs font-bold">+</span>
        </button>
        <button onClick={onLike} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <span className={`grid h-11 w-11 place-items-center rounded-full ${story.liked_by_me ? "bg-primary text-white" : "bg-black/40 text-white"}`}>
            <HeartIcon size={26} />
          </span>
          <span className="text-xs font-bold drop-shadow">{story.like_count}</span>
        </button>
        <button onClick={onComment} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40">
            <CommentIcon size={24} />
          </span>
          <span className="text-xs font-bold drop-shadow">{story.comment_count}</span>
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(`Jumpuk story: ${story.profiles?.display_name}`); toast.success("Đã sao chép"); }}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40"><ShareIcon size={22} /></span>
          <span className="text-xs font-bold drop-shadow">Share</span>
        </button>
        {isMe && (
          <button onClick={onDelete} className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-red-300 active:scale-90">
            <TrashIcon size={22} />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-24 z-10 px-4 pr-16">
        <button onClick={onProfile} className="flex items-center gap-2 mb-2">
          <span className="font-bold">@{story.profiles?.display_name}</span>
          <span className="text-xs text-white/70">· {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: vi })}</span>
        </button>
        {story.caption && <p className="text-sm leading-snug whitespace-pre-wrap">{story.caption}</p>}
      </div>
    </section>
  );
}

function CommentsSheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<{ file: File; type: "image" | "video"; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const { data: comments, refetch } = useQuery({
    queryKey: ["comments", storyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("story_comments")
        .select("*, profiles:profiles!story_comments_user_id_fkey(id,display_name,avatar_url)")
        .eq("story_id", storyId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`cmts-${storyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_comments", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["comments", storyId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, qc]);

  const pickMedia = async (f: File, t: "image" | "video") => {
    if (t === "video") {
      const url = URL.createObjectURL(f);
      const v = document.createElement("video"); v.src = url; v.preload = "metadata";
      await new Promise((r) => { v.onloadedmetadata = () => r(null); });
      if (v.duration > 15.5) { toast.error("Video tối đa 15 giây!"); URL.revokeObjectURL(url); return; }
      setMedia({ file: f, type: "video", url });
    } else {
      setMedia({ file: f, type: "image", url: URL.createObjectURL(f) });
    }
  };

  const send = async () => {
    if (!text.trim() && !media) return;
    setSending(true);
    try {
      let media_path: string | null = null;
      let media_type: "image" | "video" | null = null;
      if (media) {
        const ext = media.file.name.split(".").pop() ?? (media.type === "video" ? "mp4" : "jpg");
        media_path = `${user!.id}/cmt-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("stories").upload(media_path, media.file, { contentType: media.file.type });
        if (error) throw error;
        media_type = media.type;
      }
      const { error } = await supabase.from("story_comments").insert({
        story_id: storyId, user_id: user!.id,
        content: text.trim() || null, media_type, media_path,
      });
      if (error) throw error;
      setText(""); if (media) URL.revokeObjectURL(media.url); setMedia(null);
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Bình luận</h3>
          <button onClick={onClose} className="rounded-full bg-muted p-2 text-foreground"><CloseIcon size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-foreground">
          {!comments?.length && <p className="text-center text-muted-foreground py-8 text-sm">Hãy là người đầu tiên bình luận</p>}
          {comments?.map((c: any) => (
            <CommentRow key={c.id} c={c} />
          ))}
        </div>
        {media && (
          <div className="border-t border-border p-2 flex items-center gap-2 bg-muted/50">
            <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-black shrink-0">
              {media.type === "image" ? <img src={media.url} className="h-full w-full object-cover" /> : <video src={media.url} className="h-full w-full object-cover" />}
              <button onClick={() => { URL.revokeObjectURL(media.url); setMedia(null); }} className="absolute top-0 right-0 bg-black/70 text-white rounded-bl-lg p-0.5"><CloseIcon size={12} /></button>
            </div>
            <span className="text-xs text-muted-foreground">{media.type === "video" ? "Video ≤ 15s" : "Ảnh"} đính kèm</span>
          </div>
        )}
        <div className="border-t border-border p-2 flex items-center gap-2 pb-safe">
          <button onClick={() => imgRef.current?.click()} className="rounded-full p-2 text-primary bg-secondary"><ImageIcon size={20} /></button>
          <button onClick={() => vidRef.current?.click()} className="rounded-full p-2 text-primary bg-secondary"><VideoIcon size={20} /></button>
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickMedia(e.target.files[0], "image")} />
          <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickMedia(e.target.files[0], "video")} />
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Viết bình luận..."
            className="flex-1 rounded-full bg-muted px-4 py-2 text-foreground outline-none focus:ring-2 ring-primary"
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          />
          <button disabled={sending} onClick={send} className="rounded-full bg-primary p-2 text-primary-foreground shadow-pink disabled:opacity-50"><SendIcon size={20} /></button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({ c }: { c: any }) {
  const url = useSignedUrl(c.media_path, "stories");
  return (
    <div className="flex gap-2">
      <Avatar path={c.profiles?.avatar_url} name={c.profiles?.display_name} size={36} />
      <div className="flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <p className="text-xs font-bold">{c.profiles?.display_name}</p>
          {c.content && <p className="text-sm whitespace-pre-wrap">{c.content}</p>}
          {url && c.media_type === "image" && <img src={url} className="mt-2 rounded-xl max-h-48" />}
          {url && c.media_type === "video" && <video src={url} controls className="mt-2 rounded-xl max-h-48" />}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: vi })}</p>
      </div>
    </div>
  );
}
