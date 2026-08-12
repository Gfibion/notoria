-- 1. Remove escrow system
DROP TABLE IF EXISTS public.admin_escrow CASCADE;
ALTER TABLE public.cloud_backups DROP COLUMN IF EXISTS escrow_wrapped_key;

-- 2. Chronological ordering per user identity
CREATE INDEX IF NOT EXISTS cloud_backups_user_chrono_idx
  ON public.cloud_backups (user_hash, client_updated_at DESC);

-- 3. Strict permissions: only edge functions (service_role) may touch backups
REVOKE ALL ON public.cloud_backups FROM anon, authenticated;
GRANT ALL ON public.cloud_backups TO service_role;

ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_backups FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all client access on cloud_backups" ON public.cloud_backups;
CREATE POLICY "Deny all client access on cloud_backups"
  ON public.cloud_backups
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);