import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/hooks";

interface Props {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ path, name, size = 48, className }: Props) {
  const url = useSignedUrl(path, "avatars");
  const initials = (name ?? "?").slice(0, 1).toUpperCase();
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-pink font-bold text-white ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? <img src={url} alt={name ?? ""} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

// Helper to fetch profile by user id (used in cards)
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });
}
