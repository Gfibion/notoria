-- Cloud backup table for end-to-end-encrypted notes.
-- No link to auth.users (users don't register). Access only via edge functions using service_role.
-- user_hash = SHA-256(secret_key) so the secret never lives on the server.

CREATE TABLE public.cloud_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_hash TEXT NOT NULL,
  note_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  nonce TEXT NOT NULL,
  client_updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_hash, note_id)
);

CREATE INDEX idx_cloud_backups_user_hash ON public.cloud_backups (user_hash);

-- Service-role only. Anon/authenticated have NO direct access — all reads/writes go through edge functions.
GRANT ALL ON public.cloud_backups TO service_role;

ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;

-- Explicitly deny direct client access. (No policies for anon/authenticated = no access.)
CREATE POLICY "service_role_full_access" ON public.cloud_backups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cloud_backups_updated_at
BEFORE UPDATE ON public.cloud_backups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();