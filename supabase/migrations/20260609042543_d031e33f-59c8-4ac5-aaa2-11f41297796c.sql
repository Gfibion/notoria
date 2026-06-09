-- Deny-all policies for tables only accessed via service_role
CREATE POLICY "no direct access invites" ON public.admin_invites FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "no direct access seeds" ON public.admin_seeds FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Lock down SECURITY DEFINER helper execution
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_master_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_admin_seed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_admin_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_master_admin(uuid) TO service_role;

-- Add search_path to enforce_admin_limit
CREATE OR REPLACE FUNCTION public.enforce_admin_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.admins) >= 2 THEN
    RAISE EXCEPTION 'Admin limit reached (max 2)';
  END IF;
  RETURN NEW;
END $$;