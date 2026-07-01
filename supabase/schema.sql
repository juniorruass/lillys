-- Lilly's — Schema Supabase
-- Executar no SQL Editor do Supabase

-- Tarefas e pendências
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'task', -- 'task' | 'pending'
  priority text default 'normal',    -- 'low' | 'normal' | 'high'
  completed boolean default false,
  due_date date,
  due_time time,
  reminder_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Metas do dia
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Notas rápidas e Insights
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  type text default 'quick', -- 'quick' | 'insight'
  created_at timestamptz default now()
);

-- Hábitos (definição)
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- 'espiritualidade' | 'exercicio' | 'estudo' | 'leitura' | 'outro'
  icon text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Registro diário de hábitos
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade,
  date date not null default current_date,
  completed boolean default false,
  note text,
  unique(habit_id, date)
);

-- Estudos (livros, cursos)
create table if not exists studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  type text default 'livro', -- 'livro' | 'curso' | 'podcast' | 'artigo'
  progress int default 0,    -- 0-100
  total_pages int,
  status text default 'em_andamento', -- 'em_andamento' | 'concluido' | 'pausado'
  cover_url text,
  notes text,
  started_at date,
  finished_at date,
  created_at timestamptz default now()
);

-- Financeiro pessoal
create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'entrada' | 'saida'
  amount numeric(10,2) not null,
  category text,      -- 'alimentacao' | 'transporte' | 'lazer' | 'saude' | 'investimento' | 'outros'
  description text,
  account text default 'principal', -- conta/cartão
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Meta financeira mensal
create table if not exists finance_goals (
  id uuid primary key default gen_random_uuid(),
  month date not null, -- primeiro dia do mês
  income_goal numeric(10,2),
  expense_limit numeric(10,2),
  savings_goal numeric(10,2),
  created_at timestamptz default now(),
  unique(month)
);

-- Projetos profissionais
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text default 'ativo', -- 'ativo' | 'pausado' | 'concluido' | 'arquivado'
  color text default '#00C8FF',
  due_date date,
  order_index int default 0, -- posição na fileira de seletor (drag-and-drop)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tarefas de projeto (kanban)
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  status text default 'todo', -- 'todo' | 'doing' | 'done'
  priority text default 'normal',
  "order" int default 0,
  due_date date,
  due_time time,
  created_at timestamptz default now()
);

-- Revisão semanal
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  accomplished text,
  pending text,
  next_focus text,
  mood int,          -- 1-5
  created_at timestamptz default now(),
  unique(week_start)
);

-- Espiritualidade (log diário detalhado)
create table if not exists spirituality_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  prayer boolean default false,
  reading boolean default false,
  gratitude text,
  reflection text,
  created_at timestamptz default now(),
  unique(date)
);

-- Calendário / Eventos
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  time time,
  end_time time,
  color text default '#00C8FF',
  type text default 'event', -- 'event' | 'reminder' | 'task'
  created_at timestamptz default now()
);

-- Push subscriptions (PWA notifications)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tentativas de login (rate limiting persistente + auditoria)
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  success boolean default false,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists idx_login_attempts_ip_created on login_attempts(ip, created_at);
create index if not exists idx_login_attempts_created on login_attempts(created_at desc);

-- IPs banidos permanentemente
create table if not exists banned_ips (
  id uuid primary key default gen_random_uuid(),
  ip text not null unique,
  reason text,
  banned_at timestamptz default now()
);

-- Histórico de conversa do WhatsApp (memória de curto prazo para o agente)
create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  role text not null,    -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);
create index if not exists idx_chat_history_created on chat_history(created_at desc);

-- Dados padrão de hábitos
insert into habits (name, category, icon) values
  ('Oração', 'espiritualidade', '🙏'),
  ('Leitura bíblica', 'espiritualidade', '📖'),
  ('Gratidão', 'espiritualidade', '✨'),
  ('Exercício', 'exercicio', '💪'),
  ('Estudo', 'estudo', '📚'),
  ('Leitura', 'leitura', '📘')
on conflict do nothing;
