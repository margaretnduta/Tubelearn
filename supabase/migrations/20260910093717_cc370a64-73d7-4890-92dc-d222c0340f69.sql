CREATE TABLE public.video_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_chat_messages TO authenticated;
GRANT ALL ON public.video_chat_messages TO service_role;

ALTER TABLE public.video_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own chat all" ON public.video_chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX video_chat_messages_video_idx ON public.video_chat_messages (video_id, created_at);