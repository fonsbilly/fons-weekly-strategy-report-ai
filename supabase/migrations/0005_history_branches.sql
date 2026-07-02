-- Tracks which branches the RVP has opted to backfill with recent history
-- (rather than leaving blank) when no current-week submission exists.
alter table weekly_scripts add column use_history_branches text[] not null default '{}';
