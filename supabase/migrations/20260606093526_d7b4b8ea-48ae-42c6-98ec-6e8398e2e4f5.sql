
-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Jumpuker',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- generate unique 7-digit friend id
CREATE OR REPLACE FUNCTION public.generate_friend_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_id := lpad((floor(random()*9000000)+1000000)::int::text, 7, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_id = v_id) INTO v_exists;
    IF NOT v_exists THEN RETURN v_id; END IF;
  END LOOP;
END; $$;

-- auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, friend_id, display_name)
  VALUES (NEW.id, public.generate_friend_id(), COALESCE(NEW.raw_user_meta_data->>'display_name', 'Jumpuker'));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== FRIENDSHIPS ==========
CREATE TYPE public.friendship_status AS ENUM ('pending','accepted','blocked');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Create friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Update friendship if party" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Delete friendship if party" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ========== CONVERSATIONS ==========
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_bg TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- security definer to check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_conv_member(_conv UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _user);
$$;

CREATE POLICY "View conversations if member" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conv_member(id, auth.uid()));
CREATE POLICY "Update conversations if member" ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conv_member(id, auth.uid()));
CREATE POLICY "Insert conversations any auth" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "View members if member" ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conv_member(conversation_id, auth.uid()));
CREATE POLICY "Insert members if member or self-bootstrap" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_conv_member(conversation_id, auth.uid()));
CREATE POLICY "Update own member row" ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- get-or-create DM between current user and other
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv UUID;
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF v_me = other_user THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;
  -- must be accepted friends
  IF NOT EXISTS(SELECT 1 FROM public.friendships
    WHERE status='accepted'
      AND ((requester_id=v_me AND addressee_id=other_user) OR (requester_id=other_user AND addressee_id=v_me)))
  THEN RAISE EXCEPTION 'not friends'; END IF;

  SELECT cm1.conversation_id INTO v_conv
  FROM public.conversation_members cm1
  JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  WHERE cm1.user_id = v_me AND cm2.user_id = other_user
  LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO v_conv;
    INSERT INTO public.conversation_members(conversation_id, user_id) VALUES (v_conv, v_me), (v_conv, other_user);
  END IF;
  RETURN v_conv;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(UUID) TO authenticated;

-- ========== MESSAGES ==========
CREATE TYPE public.message_type AS ENUM ('text','image','video','voice');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View messages if member" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conv_member(conversation_id, auth.uid()));
CREATE POLICY "Send messages if member" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conv_member(conversation_id, auth.uid()));
CREATE POLICY "Delete own messages" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

-- bump last_message_at
CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
