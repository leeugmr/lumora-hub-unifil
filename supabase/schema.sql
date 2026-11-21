-- Lumora HUB: esquema do banco (Supabase / Postgres)
-- Rode uma vez no SQL Editor do Supabase. Depois rode seed.sql.

create table if not exists clients (
  id text primary key,
  name text not null,
  front text not null default 'Studio',
  status text not null default 'ativo',
  delivery text not null default '',
  monthly_value integer,
  can_publicize boolean not null default false,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id text primary key,
  name text not null,
  front text not null default 'Studio',
  stage text not null default 'contato',
  source text not null default '',
  summary text not null default '',
  value_estimate integer,
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  name text not null,
  kind text not null default 'interno',
  status text not null default 'ideia',
  client_id text references clients(id) on delete set null,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  owners text[] not null default '{}',
  due date,
  done boolean not null default false,
  done_at timestamptz,
  area text not null default 'operacao',
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  cycle integer not null default 1,
  week integer not null,
  weekday text not null,
  front text not null,
  title text not null,
  format text not null default '',
  brief text not null default '',
  visual text not null default '',
  channel text not null default '',
  status text not null default 'nao iniciado',
  owner text,
  link text,
  blocked_by text
);

create table if not exists decisions (
  id text primary key,
  title text not null,
  state text not null default 'aberta',
  context text not null default '',
  decided_at date,
  area text not null default ''
);

create table if not exists notes (
  id text primary key,
  ref_type text not null,
  ref_id text not null,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_ref_idx on tasks (ref_type, ref_id);
create index if not exists notes_ref_idx on notes (ref_type, ref_id);

-- Segurança: só quem tem login (os 4 sócios) lê e escreve.
-- Desative o cadastro público em Authentication > Sign In / Providers > "Allow new users to sign up".
do $$
declare t text;
begin
  foreach t in array array['clients','leads','projects','tasks','posts','decisions','notes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe_lumora on %I', t);
    execute format('create policy equipe_lumora on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Tempo real: mudanças aparecem na hora para os quatro.
alter publication supabase_realtime add table clients, leads, projects, tasks, posts, decisions, notes;
