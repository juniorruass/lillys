-- Controle de quais tipos de mensagem diária entram no cron/group-daily,
-- decidido por grupo (todas ligadas por padrão). E controle de limite de
-- mensagens por hora no modo atendente (10/h — ver handleGroupMessage).
alter table whatsapp_groups add column if not exists daily_bom_dia boolean default true;
alter table whatsapp_groups add column if not exists daily_pergunta boolean default true;
alter table whatsapp_groups add column if not exists daily_metricas boolean default true;
alter table whatsapp_groups add column if not exists daily_relatorios boolean default true;
alter table whatsapp_groups add column if not exists daily_lembretes boolean default true;
alter table whatsapp_groups add column if not exists muted_until timestamptz;
