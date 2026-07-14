-- Mapeia clientes (nome usado no upflu-dashboard) para grupos do WhatsApp,
-- usado pelo agente de relatórios (cron/client-reports). Preencher manualmente:
-- jid no formato "123456789-987654321@g.us" (grupo) — pegue no log do webhook
-- ao mandar qualquer mensagem no grupo, ou via GET /chat/findChats da Evolution API.
create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  client_name text not null unique, -- deve bater com clients.name no upflu-dashboard
  jid text not null,
  created_at timestamptz default now()
);
