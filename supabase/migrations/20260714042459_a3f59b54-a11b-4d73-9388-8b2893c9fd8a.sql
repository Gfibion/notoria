
-- Explicit fail-closed policies for admins: block client-side write access.
-- The admins table is only mutated by edge functions running with the service_role,
-- which bypasses RLS. These policies document that intent so future scanners and
-- reviewers see explicit deny rules instead of "no policy".
CREATE POLICY "Deny client inserts on admins"
  ON public.admins
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on admins"
  ON public.admins
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client deletes on admins"
  ON public.admins
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- Explicit fail-closed policy for admin_device_links: no client access at all.
-- Tokens are minted and redeemed by edge functions using the service_role.
CREATE POLICY "Deny all client access on admin_device_links"
  ON public.admin_device_links
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
