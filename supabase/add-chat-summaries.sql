-- Lilly's — Memória de longo prazo
-- Executar no SQL Editor do Supabase

create table if not exists chat_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary text not null,
  created_at timestamptz default now()
);

create index if not exists idx_chat_summaries_user on chat_summaries(user_id, period_end desc);
