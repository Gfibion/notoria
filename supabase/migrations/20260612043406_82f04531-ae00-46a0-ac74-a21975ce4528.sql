
CREATE TABLE public.coffee_supports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id text NOT NULL UNIQUE,
  product_id text,
  product_name text,
  amount integer,
  currency text,
  status text NOT NULL,
  customer_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.coffee_supports TO service_role;

ALTER TABLE public.coffee_supports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct access coffee_supports"
  ON public.coffee_supports
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX coffee_supports_created_at_idx ON public.coffee_supports (created_at DESC);
