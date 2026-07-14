-- Marca eventos já avisados pelo agente de contexto proativo (evita spam)
alter table events add column if not exists context_notified boolean default false;
