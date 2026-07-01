import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useSignedUrl(path: string | null | undefined, bucket: "avatars" | "chat-media" | "stories") {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path, bucket]);
  return url;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });
}
