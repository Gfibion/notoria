ALTER TABLE public.admin_devices DROP CONSTRAINT IF EXISTS admin_devices_pkey;

DELETE FROM public.admin_devices a
USING public.admin_devices b
WHERE a.ctid < b.ctid
  AND a.admin_id = b.admin_id
  AND a.device_id = b.device_id;

ALTER TABLE public.admin_devices
  ADD CONSTRAINT admin_devices_pkey PRIMARY KEY (admin_id, device_id);

CREATE INDEX IF NOT EXISTS admin_devices_admin_idx ON public.admin_devices(admin_id);