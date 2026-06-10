
CREATE TABLE public.admin_devices (
  admin_id uuid PRIMARY KEY REFERENCES public.admins(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  ip text,
  user_agent text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_devices TO authenticated;
GRANT ALL ON public.admin_devices TO service_role;
ALTER TABLE public.admin_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads own device" ON public.admin_devices
  FOR SELECT TO authenticated
  USING (admin_id IN (SELECT id FROM public.admins WHERE user_id = auth.uid()));

CREATE TABLE public.admin_device_links (
  token text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  created_by_device text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at timestamptz
);
GRANT ALL ON public.admin_device_links TO service_role;
ALTER TABLE public.admin_device_links ENABLE ROW LEVEL SECURITY;
-- no policies: service-role only
