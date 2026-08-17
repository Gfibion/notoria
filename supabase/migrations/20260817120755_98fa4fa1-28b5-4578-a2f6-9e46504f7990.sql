DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_admin_seed();
DROP TABLE IF EXISTS public.admin_seeds;