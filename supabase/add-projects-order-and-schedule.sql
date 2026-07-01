-- Reordenação de projetos (drag-and-drop) + agendamento de tarefas de projeto no calendário

alter table projects add column if not exists order_index int default 0;

-- Preenche order_index inicial pela ordem de criação, para quem já tem projetos cadastrados
update projects set order_index = t.rn
from (
  select id, row_number() over (order by created_at) as rn
  from projects
) t
where projects.id = t.id and projects.order_index = 0;

alter table project_tasks add column if not exists due_date date;
alter table project_tasks add column if not exists due_time time;
