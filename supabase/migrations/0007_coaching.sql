-- RVP coaching: per-director focus notes + general org-wide guidance. Used at submit time to
-- nudge a director if their report doesn't address what the RVP asked them to cover.
alter table profiles add column focus_notes text not null default '';
alter table org_settings add column coaching_guidance text not null default '';
