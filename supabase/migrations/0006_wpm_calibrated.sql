-- Track whether the RVP has run the reading-speed (WPM) calibration test yet,
-- so first-run can prompt for it. Also store the fixed intro/AI reservations
-- explicitly; branch time is computed live from (total - intro - ai) / active branches.
alter table org_settings add column wpm_calibrated boolean not null default false;
alter table org_settings add column intro_seconds integer not null default 20;
alter table org_settings add column ai_seconds integer not null default 40;
