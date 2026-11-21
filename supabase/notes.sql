-- Lumora HUB: anotações pessoais (privadas do dono; compartilhadas aparecem para a equipe).
-- Já aplicado no projeto LumoraHUB em 2026-11-16 (migration personal_notes). Rode depois de team.sql.

create or replace function private.current_person()
returns text language sql stable security definer set search_path = '' as $$
  select person from public.team_members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke execute on function private.current_person() from public, anon;
grant execute on function private.current_person() to authenticated;

create table if not exists public.personal_notes (
  id text primary key,
  owner text not null check (owner in ('leo', 'fab', 'bea', 'fran')),
  title text not null default '',
  body text not null default '',
  shared boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_notes_owner_idx on public.personal_notes (owner, updated_at desc);
alter table public.personal_notes enable row level security;

drop policy if exists notas_ler on public.personal_notes;
create policy notas_ler on public.personal_notes for select to authenticated
  using (owner = private.current_person() or (shared and private.is_team_member()));
drop policy if exists notas_criar on public.personal_notes;
create policy notas_criar on public.personal_notes for insert to authenticated
  with check (owner = private.current_person());
drop policy if exists notas_editar on public.personal_notes;
create policy notas_editar on public.personal_notes for update to authenticated
  using (owner = private.current_person()) with check (owner = private.current_person());
drop policy if exists notas_apagar on public.personal_notes;
create policy notas_apagar on public.personal_notes for delete to authenticated
  using (owner = private.current_person());

alter publication supabase_realtime add table public.personal_notes;
