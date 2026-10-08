CREATE TABLE public.classic_subscriptions (
  user_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.classic_subscriptions TO service_role;
ALTER TABLE public.classic_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access classic_subscriptions" ON public.classic_subscriptions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.classic_payments (
  reference text PRIMARY KEY,
  user_hash text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.classic_payments TO service_role;
ALTER TABLE public.classic_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access classic_payments" ON public.classic_payments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.classic_devices (
  owner_key text PRIMARY KEY,
  user_hash text NOT NULL,
  label text,
  bound_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classic_devices_user_hash_idx ON public.classic_devices(user_hash);
GRANT ALL ON public.classic_devices TO service_role;
ALTER TABLE public.classic_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access classic_devices" ON public.classic_devices FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Records a Classic payment once and extends the subscription by _days.
CREATE OR REPLACE FUNCTION public.apply_classic_payment(_reference text, _user_hash text, _amount integer, _currency text, _days integer)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  inserted integer;
  cur timestamptz;
  new_exp timestamptz;
BEGIN
  INSERT INTO public.classic_payments(reference, user_hash, amount, currency, days)
  VALUES (_reference, _user_hash, _amount, _currency, _days)
  ON CONFLICT (reference) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  SELECT expires_at INTO cur FROM public.classic_subscriptions WHERE user_hash = _user_hash FOR UPDATE;
  IF inserted = 0 THEN
    RETURN cur;
  END IF;
  new_exp := greatest(coalesce(cur, now()), now()) + make_interval(days => _days);
  INSERT INTO public.classic_subscriptions(user_hash, expires_at) VALUES (_user_hash, new_exp)
  ON CONFLICT (user_hash) DO UPDATE SET expires_at = new_exp, updated_at = now();
  RETURN new_exp;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_classic_payment(text, text, integer, text, integer) FROM PUBLIC, anon, authenticated;