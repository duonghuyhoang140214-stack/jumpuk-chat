
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE OR REPLACE FUNCTION public.create_group(_name TEXT, _member_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_conv UUID;
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;
  IF _member_ids IS NULL OR array_length(_member_ids, 1) IS NULL THEN RAISE EXCEPTION 'need members'; END IF;

  -- verify each member is an accepted friend
  FOREACH v_id IN ARRAY _member_ids LOOP
    IF v_id = v_me THEN CONTINUE; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.friendships
      WHERE status='accepted'
        AND ((requester_id=v_me AND addressee_id=v_id) OR (requester_id=v_id AND addressee_id=v_me)))
    THEN RAISE EXCEPTION 'member % is not a friend', v_id; END IF;
  END LOOP;

  INSERT INTO public.conversations(is_group, name, created_by)
    VALUES (true, trim(_name), v_me) RETURNING id INTO v_conv;
  INSERT INTO public.conversation_members(conversation_id, user_id) VALUES (v_conv, v_me);
  FOREACH v_id IN ARRAY _member_ids LOOP
    IF v_id <> v_me THEN
      INSERT INTO public.conversation_members(conversation_id, user_id) VALUES (v_conv, v_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN v_conv;
END; $$;

CREATE OR REPLACE FUNCTION public.add_group_member(_conv UUID, _target UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_is_group BOOLEAN;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT is_group INTO v_is_group FROM public.conversations WHERE id = _conv;
  IF v_is_group IS NOT TRUE THEN RAISE EXCEPTION 'not a group'; END IF;
  IF NOT public.is_conv_member(_conv, v_me) THEN RAISE EXCEPTION 'not a member'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.friendships
    WHERE status='accepted'
      AND ((requester_id=v_me AND addressee_id=_target) OR (requester_id=_target AND addressee_id=v_me)))
  THEN RAISE EXCEPTION 'target is not your friend'; END IF;
  INSERT INTO public.conversation_members(conversation_id, user_id) VALUES (_conv, _target)
  ON CONFLICT DO NOTHING;
END; $$;

-- Add a unique constraint to prevent duplicate members (idempotent)
DO $$ BEGIN
  ALTER TABLE public.conversation_members ADD CONSTRAINT conversation_members_unique UNIQUE (conversation_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
