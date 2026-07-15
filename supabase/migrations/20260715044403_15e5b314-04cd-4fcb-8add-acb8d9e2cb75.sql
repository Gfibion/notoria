
-- Passkeys stored per admin
CREATE TABLE public.admin_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_type TEXT,
  backed_up BOOLEAN NOT NULL DEFAULT false,
  aaguid TEXT,
  nickname TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_passkeys_admin ON public.admin_passkeys(admin_id);

GRANT ALL ON public.admin_passkeys TO service_role;
ALTER TABLE public.admin_passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_passkeys_deny_all" ON public.admin_passkeys
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Short-lived WebAuthn challenges (registration + authentication)
CREATE TABLE public.admin_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
  admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
  user_id UUID,
  device_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_webauthn_challenges_exp ON public.admin_webauthn_challenges(expires_at);

GRANT ALL ON public.admin_webauthn_challenges TO service_role;
ALTER TABLE public.admin_webauthn_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_webauthn_challenges_deny_all" ON public.admin_webauthn_challenges
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Passwordless passkey verification handoff (consumed by bootstrap)
CREATE TABLE public.admin_webauthn_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_webauthn_verifications_lookup
  ON public.admin_webauthn_verifications(admin_id, device_id, consumed_at);

GRANT ALL ON public.admin_webauthn_verifications TO service_role;
ALTER TABLE public.admin_webauthn_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_webauthn_verifications_deny_all" ON public.admin_webauthn_verifications
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Track when the current device was last biometrically verified
ALTER TABLE public.admin_devices
  ADD COLUMN IF NOT EXISTS webauthn_verified_at TIMESTAMPTZ;
