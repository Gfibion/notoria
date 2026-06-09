-- Admins table (strict max 2)
CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('master','invited')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admins_one_master ON public.admins(role) WHERE role='master';

GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read own row" ON public.admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_admin_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.admins) >= 2 THEN
    RAISE EXCEPTION 'Admin limit reached (max 2)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_admin_limit BEFORE INSERT ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_limit();

-- Seed table: emails that auto-become admins on first signup
CREATE TABLE public.admin_seeds (
  email text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('master','invited')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_seeds TO service_role;
ALTER TABLE public.admin_seeds ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_seeds(email, role) VALUES ('gfibiongenesis@gmail.com', 'master');

-- Admin invites (one-time, master creates them)
CREATE TABLE public.admin_invites (
  token text PRIMARY KEY,
  email text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Escrow public key (single-row, used to wrap each backup's content key)
CREATE TABLE public.admin_escrow (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key_jwk jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_escrow TO authenticated, anon;
GRANT ALL ON public.admin_escrow TO service_role;
ALTER TABLE public.admin_escrow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow public key readable" ON public.admin_escrow FOR SELECT
  TO authenticated, anon USING (true);

-- Add escrow-wrapped-key column to cloud_backups
ALTER TABLE public.cloud_backups ADD COLUMN escrow_wrapped_key text;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admins WHERE user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admins WHERE user_id = _uid AND role = 'master')
$$;

-- Auto-promote seeded emails on signup
CREATE OR REPLACE FUNCTION public.handle_admin_seed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seed_role text;
BEGIN
  SELECT role INTO seed_role FROM public.admin_seeds WHERE email = NEW.email;
  IF seed_role IS NOT NULL THEN
    INSERT INTO public.admins(user_id, email, role) VALUES (NEW.id, NEW.email, seed_role);
    DELETE FROM public.admin_seeds WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_seed();