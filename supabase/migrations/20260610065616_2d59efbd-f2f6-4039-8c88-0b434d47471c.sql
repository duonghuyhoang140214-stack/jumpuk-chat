
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;
ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE public.conversation_members
  ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
