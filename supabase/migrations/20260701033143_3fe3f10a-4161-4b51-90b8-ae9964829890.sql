
-- STORIES
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  media_path TEXT NOT NULL,
  caption TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read stories" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own story" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own story" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX stories_user_created_idx ON public.stories(user_id, created_at DESC);

-- FOLLOWS
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read follows" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "follow others" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "unfollow own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX follows_followee_idx ON public.follows(followee_id);

-- CALL HISTORY
CREATE TABLE public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice','group')),
  status TEXT NOT NULL DEFAULT 'ended' CHECK (status IN ('ended','missed','declined','ongoing')),
  duration_sec INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_history TO authenticated;
GRANT ALL ON public.call_history TO service_role;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own calls" ON public.call_history FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "insert own calls" ON public.call_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "update own calls" ON public.call_history FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE INDEX call_history_caller_idx ON public.call_history(caller_id, started_at DESC);
CREATE INDEX call_history_callee_idx ON public.call_history(callee_id, started_at DESC);

-- STORY LIKES
CREATE TABLE public.story_likes (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read likes" ON public.story_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "like as self" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike own" ON public.story_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORY COMMENTS
CREATE TABLE public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_type TEXT CHECK (media_type IN ('image','video')),
  media_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.story_comments TO authenticated;
GRANT ALL ON public.story_comments TO service_role;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read comments" ON public.story_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comment as self" ON public.story_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.story_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX story_comments_story_idx ON public.story_comments(story_id, created_at);

-- Storage RLS for stories bucket
CREATE POLICY "auth read stories files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories');
CREATE POLICY "auth upload own stories" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "auth delete own stories" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
