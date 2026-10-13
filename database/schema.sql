-- MORPHORA V5.0.1 — Backend Foundation
-- Canonical first migration for account-scoped application data.
-- Safe for Supabase Postgres. Guest/local-only MORPHORA does not use these tables.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'es' check (language in ('es', 'en')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('annotations', 'drawings', 'learning_progress', 'quiz_history', 'bookmarks')),
  document_key text not null default 'root' check (char_length(document_key) between 1 and 240),
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  deleted_at timestamptz,
  last_mutation_id uuid,
  last_client_id text check (last_client_id is null or char_length(last_client_id) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_type, document_key)
);

create index if not exists user_documents_user_type_updated_idx
  on public.user_documents (user_id, document_type, updated_at desc);

create index if not exists user_documents_user_changed_idx
  on public.user_documents (user_id, updated_at asc, id asc);

create index if not exists user_documents_user_deleted_idx
  on public.user_documents (user_id, deleted_at)
  where deleted_at is not null;

create or replace function public.morphora_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.morphora_touch_user_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.revision = old.revision + 1;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.morphora_set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.morphora_set_updated_at();

drop trigger if exists user_documents_touch on public.user_documents;
create trigger user_documents_touch
before update on public.user_documents
for each row execute function public.morphora_touch_user_document();

-- Explicitly remove browser roles before granting only the operations we need.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
revoke all on table public.user_documents from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.user_documents to authenticated;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_documents enable row level security;

alter table public.profiles force row level security;
alter table public.user_preferences force row level security;
alter table public.user_documents force row level security;

-- Profiles: authenticated users can only access their own row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Preferences: authenticated users can only access their own row.
drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_preferences_delete_own on public.user_preferences;
create policy user_preferences_delete_own on public.user_preferences
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- User documents: notes/drawings/progress/bookmarks are always scoped to auth.uid().
drop policy if exists user_documents_select_own on public.user_documents;
create policy user_documents_select_own on public.user_documents
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_documents_insert_own on public.user_documents;
create policy user_documents_insert_own on public.user_documents
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_documents_update_own on public.user_documents;
create policy user_documents_update_own on public.user_documents
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists user_documents_delete_own on public.user_documents;
create policy user_documents_delete_own on public.user_documents
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

commit;

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
