-- Lumora HUB: lista da equipe e acesso só para a equipe.
-- Já aplicado no projeto LumoraHUB em 2026-11-16 (migrations team_members_allowlist e
-- move_team_check_to_private_schema). Rode depois de schema.sql num projeto novo.
-- Para trocar ou incluir alguém: edite a tabela team_members (e-mail em minúsculas → leo, fab, bea ou fran).

create table if not exists public.team_members (
  email text primary key check (email = lower(email)),
  person text not null unique check (person in ('leo', 'fab', 'bea', 'fran')),
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

-- Preencha com os e-mails da equipe:
-- insert into public.team_members (email, person) values ('...', 'leo'), ('...', 'fab'), ('...', 'bea'), ('...', 'fran');

-- Checagem "é da equipe?" num schema que a API não expõe.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_team_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke execute on function private.is_team_member() from public, anon;
grant execute on function private.is_team_member() to authenticated;

drop policy if exists equipe_le_lista on public.team_members;
create policy equipe_le_lista on public.team_members for select to authenticated using (private.is_team_member());

do $$
declare t text;
begin
  foreach t in array array['clients','leads','projects','tasks','posts','decisions','notes'] loop
    execute format('drop policy if exists equipe_lumora on public.%I', t);
    execute format('create policy equipe_lumora on public.%I for all to authenticated using (private.is_team_member()) with check (private.is_team_member())', t);
  end loop;
end $$;

-- Trava de cadastro: a conta só é criada se o e-mail estiver na lista.
create or replace function public.guard_team_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.team_members where email = lower(new.email)) then
    raise exception 'EMAIL_FORA_DA_EQUIPE: este e-mail não está na equipe da Lumora';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_team_signup() from public, anon, authenticated;

drop trigger if exists guard_team_signup on auth.users;
create trigger guard_team_signup before insert on auth.users for each row execute function public.guard_team_signup();
