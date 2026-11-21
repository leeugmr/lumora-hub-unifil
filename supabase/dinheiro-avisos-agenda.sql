-- Lumora HUB: valor do funil, contratos e mensalidades, avisos no celular e agenda.
-- Aplicado no projeto LumoraHUB em 2026-11-17 (migration dinheiro_avisos_agenda). Rode depois de notes.sql.
-- Os segredos dos avisos (chave VAPID privada e segredo do gatilho) ficam no Vault do Supabase,
-- com os nomes hub_vapid_private, hub_vapid_public, hub_push_secret. Não estão neste arquivo.

-- 1. Funil: o valor do lead pode ser mensal ou único.
alter table public.leads add column if not exists value_kind text not null default 'mensal'
  check (value_kind in ('mensal', 'unico'));

-- 2. Contratos (o que o cliente paga) e pagamentos (cada mês ou parcela recebida).
create table if not exists public.contracts (
  id text primary key,
  client_id text not null references public.clients(id) on delete cascade,
  title text not null default '',
  kind text not null default 'mensal' check (kind in ('mensal', 'unico')),
  amount integer not null check (amount >= 0),
  due_day integer check (due_day between 1 and 31),     -- mensal: dia do vencimento
  due_date date,                                         -- único: data do vencimento
  start_date date not null default current_date,
  end_date date,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  owner text check (owner in ('leo', 'fab', 'bea', 'fran')), -- quem cobra
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contracts_client_idx on public.contracts (client_id);

create table if not exists public.payments (
  id text primary key,
  contract_id text not null references public.contracts(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'), -- AAAA-MM da cobrança
  amount integer not null check (amount >= 0),
  paid_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (contract_id, period)
);

do $$
declare t text;
begin
  foreach t in array array['contracts', 'payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists equipe_lumora on public.%I', t);
    execute format('create policy equipe_lumora on public.%I for all to authenticated using (private.is_team_member()) with check (private.is_team_member())', t);
  end loop;
end $$;
alter publication supabase_realtime add table public.contracts, public.payments;

-- 3. Avisos no celular: uma inscrição por aparelho, só o dono vê e mexe.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  person text not null check (person in ('leo', 'fab', 'bea', 'fran')),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists inscricao_propria on public.push_subscriptions;
create policy inscricao_propria on public.push_subscriptions for all to authenticated
  using (person = private.current_person()) with check (person = private.current_person());

-- 4. Ajustes pessoais (link secreto da agenda). Só o dono lê.
create table if not exists public.personal_settings (
  person text primary key check (person in ('leo', 'fab', 'bea', 'fran')),
  calendar_ics text,
  updated_at timestamptz not null default now()
);
alter table public.personal_settings enable row level security;
drop policy if exists ajustes_proprios on public.personal_settings;
create policy ajustes_proprios on public.personal_settings for all to authenticated
  using (person = private.current_person()) with check (person = private.current_person());

-- 5. Gatilhos dos avisos: chamam a Edge Function "notify".
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.notify_hub(payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'hub_push_secret';
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/notify',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hub-secret', secret)
  );
end;
$$;
revoke execute on function private.notify_hub(jsonb) from public, anon, authenticated;

-- Tarefa nova ou com dono novo: avisa quem entrou (menos quem fez a mudança).
create or replace function private.task_assigned()
returns trigger language plpgsql security definer set search_path = '' as $$
declare added text[];
begin
  if new.done then return new; end if;
  if tg_op = 'INSERT' then
    added := new.owners;
  else
    select coalesce(array_agg(o), '{}') into added from unnest(new.owners) o where not (o = any(old.owners));
  end if;
  if coalesce(array_length(added, 1), 0) = 0 then return new; end if;
  perform private.notify_hub(jsonb_build_object(
    'type', 'task_assigned', 'task_id', new.id, 'to', to_jsonb(added), 'actor', private.current_person()
  ));
  return new;
end;
$$;
revoke execute on function private.task_assigned() from public, anon, authenticated;

drop trigger if exists task_assigned on public.tasks;
create trigger task_assigned after insert or update of owners on public.tasks
  for each row execute function private.task_assigned();

-- Resumo diário às 7h (10h UTC), segunda a sábado: prazos de hoje, atrasos e cobranças.
select cron.unschedule(jobid) from cron.job where jobname = 'hub-daily-push';
select cron.schedule('hub-daily-push', '0 10 * * 1-6', $$select private.notify_hub('{"type":"daily"}'::jsonb)$$);
