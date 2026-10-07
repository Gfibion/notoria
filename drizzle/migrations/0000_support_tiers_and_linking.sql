alter table public.coffee_supports add column if not exists user_hash text;
alter table public.coffee_supports add column if not exists tier text;

create index if not exists coffee_supports_user_hash_idx on public.coffee_supports(user_hash);

-- Returns the highest support tier ever verified for a Cloud ID hash.
create or replace function public.get_supporter_tier(_user_hash text)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when bool_or(tier = 'champion') then 'champion'
    when bool_or(tier = 'backer') then 'backer'
    when bool_or(tier = 'supporter') then 'supporter'
  end
  from public.coffee_supports
  where user_hash = _user_hash and status = 'succeeded' and tier is not null
$$;

revoke all on function public.get_supporter_tier(text) from public;
grant execute on function public.get_supporter_tier(text) to anon, authenticated;
grant all on public.coffee_supports to service_role;