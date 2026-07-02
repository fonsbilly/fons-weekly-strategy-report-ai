-- Replace whole-submission selection with per-section (positives/challenges/narrative)
-- selection, keyed by director_id, matching the RVP's chosen scrub granularity.
alter table weekly_scripts drop column selected_submission_ids;
alter table weekly_scripts add column selected_fields jsonb not null default '{}';
