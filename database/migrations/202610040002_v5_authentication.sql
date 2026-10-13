-- MORPHORA V5.0.2 — Authentication account provisioning
-- Creates the minimal account rows when Supabase Auth creates a user.

begin;

create or replace function public.morphora_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_language text;
  requested_name text;
begin
  requested_language := case when new.raw_user_meta_data ->> 'language' in ('es', 'en') then new.raw_user_meta_data ->> 'language' else 'es' end;
  requested_name := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), 120), '');

  insert into public.profiles (user_id, display_name, avatar_url)
  values (new.id, requested_name, nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), 2048), ''))
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id, language, theme)
  values (new.id, requested_language, 'system')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists morphora_auth_user_created on auth.users;
create trigger morphora_auth_user_created
after insert on auth.users
for each row execute function public.morphora_handle_new_auth_user();

commit;
