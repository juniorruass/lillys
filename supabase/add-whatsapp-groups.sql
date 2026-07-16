-- Grupos do WhatsApp sincronizados ao vivo da Evolution API (GET /api/whatsapp/groups
-- faz upsert por jid a cada carregamento da página de Grupos). client_name mapeia pro
-- cliente no upflu-dashboard (usado pelo agente de relatórios, cron/client-reports).
-- attend_enabled + knowledge alimentam o modo atendente automático no webhook.
create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  jid text not null unique,
  subject text,
  client_name text,
  attend_enabled boolean default false,
  knowledge text,
  synced_at timestamptz,
  created_at timestamptz default now()
);
