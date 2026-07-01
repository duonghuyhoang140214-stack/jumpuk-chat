import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { useSignedUrl } from "@/lib/hooks";
import { ArrowLeftIcon, ChatIcon, PhoneIcon, PlayIcon } from "@/components/icons";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/user/$userId")({
  component: UserProfile,
});

function UserProfile() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMe = userId === user!.id;

  const { data } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const [{ data: profile }, followers, following, stories, myFollow] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
        supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("stories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("follows").select("follower_id").eq("follower_id", user!.id).eq("followee_id", userId).maybeSingle(),
      ]);
      return {
        profile,
        followers: followers.count ?? 0,
        following: following.count ?? 0,
        stories: stories.data ?? [],
        isFollowing: !!myFollow.data,
      };
    },
  });

  const toggleFollow = async () => {
    if (!data) return;
    if (data.isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user!.id).eq("followee_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user!.id, followee_id: userId });
    }
    qc.invalidateQueries({ queryKey: ["user-profile", userId] });
  };

  const startChat = async () => {
    // Find/create 1:1 conversation
    const { data: existing } = await supabase.rpc("get_or_create_dm", { other_user: userId }).maybeSingle();
    if (existing) navigate({ to: "/app/chat/$convId", params: { convId: existing as string } });
    else toast.error("Không tạo được cuộc trò chuyện");
  };

  if (!data?.profile) return <div className="p-8 text-center">Đang tải...</div>;

  const p = data.profile;
  return (
    <div className="min-h-screen pb-28 bg-background">
      <header className="sticky top-0 z-20 glass border-b border-border">
        <div className="mx-auto max-w-md flex items-center gap-2 px-3 py-3">
          <button onClick={() => navigate({ to: "/app/stories" })} className="rounded-full p-2 bg-secondary"><ArrowLeftIcon size={20} /></button>
          <h1 className="text-lg text-primary flex-1 truncate">@{p.display_name}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md p-5">
        <div className="flex flex-col items-center gap-3">
          <Avatar path={p.avatar_url} name={p.display_name} size={110} className="ring-4 ring-primary/30" />
          <div className="text-center">
            <h2 className="text-xl font-bold">{p.display_name}</h2>
            <p className="text-xs text-muted-foreground font-mono">ID {p.friend_id}</p>
          </div>

          <div className="flex gap-6 mt-2">
            <div className="text-center">
              <p className="font-bold text-lg">{data.stories.length}</p>
              <p className="text-xs text-muted-foreground">Nhật ký</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{data.followers}</p>
              <p className="text-xs text-muted-foreground">Người theo dõi</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{data.following}</p>
              <p className="text-xs text-muted-foreground">Đang theo dõi</p>
            </div>
          </div>

          {!isMe && (
            <div className="flex gap-2 w-full mt-3">
              <button
                onClick={toggleFollow}
                className={`flex-1 rounded-full py-2.5 font-bold ${data.isFollowing ? "bg-secondary text-primary" : "bg-gradient-pink text-white shadow-pink"}`}
              >{data.isFollowing ? "Đang theo dõi" : "Theo dõi"}</button>
              <button onClick={startChat} className="grid place-items-center rounded-full bg-secondary text-primary h-11 w-11"><ChatIcon size={20} /></button>
              <button onClick={startChat} className="grid place-items-center rounded-full bg-secondary text-primary h-11 w-11"><PhoneIcon size={20} /></button>
            </div>
          )}
        </div>

        <h3 className="mt-6 mb-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">Tường nhật ký</h3>
        {data.stories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Chưa có bài đăng nào</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {data.stories.map((s: any) => (
              <StoryThumb key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function StoryThumb({ s }: { s: any }) {
  const url = useSignedUrl(s.media_path, "stories");
  return (
    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
      {url && (s.media_type === "video" ? (
        <video src={url} className="h-full w-full object-cover" />
      ) : (
        <img src={url} className="h-full w-full object-cover" />
      ))}
      {s.media_type === "video" && (
        <span className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"><PlayIcon size={12} /></span>
      )}
      <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/50 rounded px-1">
        {format(new Date(s.created_at), "dd/MM")}
      </span>
    </div>
  );
}
