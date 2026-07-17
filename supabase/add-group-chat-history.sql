-- Memória de curto prazo do modo atendente de grupos (mesmo papel do
-- chat_history do PV, mas por grupo em vez de por usuário).
create table if not exists group_chat_history (
  id uuid primary key default gen_random_uuid(),
  jid text not null,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);
create index if not exists idx_group_chat_history_jid_created on group_chat_history(jid, created_at desc);
