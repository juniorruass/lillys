-- Rascunhos de vídeo gerados pelo agente de vídeo (Veo 3), aguardando aprovação
-- do Junior antes de publicar no TikTok.
create table if not exists video_drafts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  caption text,
  status text not null default 'generating', -- 'generating' | 'ready' | 'posted' | 'failed' | 'discarded'
  file_path text, -- caminho relativo servido em /videos/<id>.mp4
  error text,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now()
);
