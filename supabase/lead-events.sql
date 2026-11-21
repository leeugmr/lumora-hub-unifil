-- Lumora HUB: histórico de etapas dos leads (alimenta o funil e os insights do Pipeline).
-- Já aplicado no projeto LumoraHUB em 2026-11-17 (migration lead_events). Rode depois de team.sql.
-- O app não grava aqui: o gatilho registra cada lead criado e cada mudança de etapa.

create table if not exists public.lead_events (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  at timestamptz not null default now(),
  by_person text
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, at);
alter table public.lead_events enable row level security;
drop policy if exists equipe_lumora on public.lead_events;
create policy equipe_lumora on public.lead_events for select to authenticated using (private.is_team_member());

create or replace function private.log_lead_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.lead_events (lead_id, from_stage, to_stage, by_person)
    values (new.id, case when tg_op = 'UPDATE' then old.stage end, new.stage, private.current_person());
  end if;
  return new;
end $$;
revoke execute on function private.log_lead_stage() from public, anon, authenticated;

drop trigger if exists lead_stage_log on public.leads;
create trigger lead_stage_log after insert or update of stage on public.leads
  for each row execute function private.log_lead_stage();

-- Leads que já existiam: um evento com a etapa atual na data da última atualização (aproximado).
insert into public.lead_events (lead_id, from_stage, to_stage, at)
select l.id, null, l.stage, l.updated_at from public.leads l
where not exists (select 1 from public.lead_events e where e.lead_id = l.id);

alter publication supabase_realtime add table public.lead_events;

-- Motivo da perda (migration lead_lost_reason, 2026-11-17). Lista fixa em src/lib/labels.ts (LOST_REASONS).
alter table public.leads add column if not exists lost_reason text;
comment on column public.leads.lost_reason is 'Motivo da perda (lista fixa em src/lib/labels.ts LOST_REASONS); só preenchido quando stage = perdido.';
