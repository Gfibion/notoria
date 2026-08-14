CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all client access on rate_limits"
  ON public.rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.bump_rate_limit(_bucket text, _subject text, _limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '24 hours';

  INSERT INTO public.rate_limits (bucket, subject, window_start, count)
  VALUES (_bucket, _subject, date_trunc('hour', now()), 1)
  ON CONFLICT (bucket, subject, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1, updated_at = now()
  RETURNING count INTO new_count;

  RETURN new_count <= _limit;
END $$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, text, integer) TO service_role;