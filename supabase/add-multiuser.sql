-- Tabela de usuários do WhatsApp
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique, -- formato: 5573998579317 (apenas dígitos com DDI)
  name text,
  created_at timestamptz default now()
);

-- Insere o Junior como primeiro usuário
insert into users (phone, name) values ('5573998579317', 'Junior')
on conflict (phone) do nothing;

-- Adiciona user_id em todas as tabelas de dados
alter table tasks add column if not exists user_id uuid references users(id) on delete cascade;
alter table goals add column if not exists user_id uuid references users(id) on delete cascade;
alter table notes add column if not exists user_id uuid references users(id) on delete cascade;
alter table finance_entries add column if not exists user_id uuid references users(id) on delete cascade;
alter table events add column if not exists user_id uuid references users(id) on delete cascade;
alter table habit_logs add column if not exists user_id uuid references users(id) on delete cascade;
alter table weekly_reviews add column if not exists user_id uuid references users(id) on delete cascade;
alter table spirituality_logs add column if not exists user_id uuid references users(id) on delete cascade;
alter table chat_history add column if not exists user_id uuid references users(id) on delete cascade;

-- Migra dados existentes para o Junior
update tasks set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update goals set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update notes set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update finance_entries set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update events set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update habit_logs set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update weekly_reviews set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update spirituality_logs set user_id = (select id from users where phone = '5573998579317') where user_id is null;
update chat_history set user_id = (select id from users where phone = '5573998579317') where user_id is null;

-- Corrige constraints únicas para suportar múltiplos usuários
alter table habit_logs drop constraint if exists habit_logs_habit_type_date_key;
alter table habit_logs add constraint if not exists habit_logs_user_habit_date_unique
  unique (user_id, habit_type, date);

alter table spirituality_logs drop constraint if exists spirituality_logs_date_key;
alter table spirituality_logs add constraint if not exists spirituality_logs_user_date_unique
  unique (user_id, date);

alter table weekly_reviews drop constraint if exists weekly_reviews_week_start_key;
alter table weekly_reviews add constraint if not exists weekly_reviews_user_week_unique
  unique (user_id, week_start);

-- Índices
create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_notes_user on notes(user_id);
create index if not exists idx_finance_user on finance_entries(user_id);
create index if not exists idx_chat_history_user on chat_history(user_id, created_at desc);
