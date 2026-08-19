
REVOKE EXECUTE ON FUNCTION public.bump_ai_usage(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ai_usage(UUID, INTEGER) TO service_role;
