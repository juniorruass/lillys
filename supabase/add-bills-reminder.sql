-- Lembrete de contas a pagar (reaproveita finance_entries type='conta')
alter table finance_entries add column if not exists reminder_sent boolean default false;
