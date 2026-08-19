
CREATE TABLE public.ai_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  note_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_sessions_admin_idx ON public.ai_sessions (admin_id, updated_at DESC);

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  action TEXT NOT NULL DEFAULT 'chat' CHECK (action IN ('chat','summarize','rewrite','categorize')),
  content TEXT NOT NULL,
  result JSONB,
  used_history BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_session_idx ON public.ai_messages (session_id, created_at);

CREATE TABLE public.ai_usage (
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (admin_id, day)
);

GRANT ALL ON public.ai_sessions TO service_role;
GRANT ALL ON public.ai_messages TO service_role;
GRANT ALL ON public.ai_usage TO service_role;

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_sessions_no_client_access" ON public.ai_sessions FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "ai_messages_no_client_access" ON public.ai_messages FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "ai_usage_no_client_access" ON public.ai_usage FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.bump_ai_usage(_admin_id UUID, _limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (admin_id, day, count)
  VALUES (_admin_id, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (admin_id, day)
  DO UPDATE SET count = public.ai_usage.count + 1
  RETURNING count INTO new_count;

  RETURN new_count <= _limit;
END;
$$;
