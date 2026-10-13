-- MORPHORA V5.0.4.1 — Cloud Sync Foundation
-- Adds revision-aware sync metadata and tombstones to user_documents.
-- Run after the V5.0.1 and V5.0.2 migrations.

begin;

alter table public.user_documents
  add column if not exists deleted_at timestamptz,
  add column if not exists last_mutation_id uuid,
  add column if not exists last_client_id text;

-- Client IDs are deliberately opaque application identifiers, never auth or
-- provider secrets. Keep them bounded to avoid accidental oversized writes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_documents_last_client_id_length'
      and conrelid = 'public.user_documents'::regclass
  ) then
    alter table public.user_documents
      add constraint user_documents_last_client_id_length
      check (last_client_id is null or char_length(last_client_id) between 1 and 120);
  end if;
end;
$$;

create index if not exists user_documents_user_changed_idx
  on public.user_documents (user_id, updated_at asc, id asc);

create index if not exists user_documents_user_deleted_idx
  on public.user_documents (user_id, deleted_at)
  where deleted_at is not null;

-- Re-assert the browser security boundary. Grants decide which operations the
-- authenticated role may attempt; RLS policies from V5.0.1 decide which rows.
revoke all on table public.user_documents from anon, authenticated;
grant select, insert, update, delete on table public.user_documents to authenticated;
alter table public.user_documents enable row level security;
alter table public.user_documents force row level security;

-- The canonical policies are repeated idempotently so a fresh or partially
-- configured project ends V5.0.4.1 with the intended per-user isolation.
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
