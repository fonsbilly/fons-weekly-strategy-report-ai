-- Weekly Strategy Report AI: Row Level Security
-- Run after 0001_init.sql

alter table profiles enable row level security;
alter table submissions enable row level security;
alter table weekly_scripts enable row level security;
alter table org_settings enable row level security;

-- Helper: is the current user the RVP? SECURITY DEFINER avoids recursive RLS reads on profiles.
create function is_rvp() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'rvp' and is_active
  );
$$;

-- profiles: everyone can read all active profiles (names/branches needed for dashboard + roster);
-- only RVP can insert/delete; a user can update their own row.
create policy "profiles_select_all" on profiles for select using (true);

create policy "profiles_insert_rvp_only" on profiles for insert
  with check (is_rvp());

create policy "profiles_update_rvp_or_self" on profiles for update
  using (is_rvp() or id = auth.uid())
  with check (is_rvp() or id = auth.uid());

create policy "profiles_delete_rvp_only" on profiles for delete
  using (is_rvp());

-- submissions: full-row SELECT (including content) restricted to owner + RVP.
create policy "submissions_select_owner_or_rvp" on submissions for select
  using (director_id = auth.uid() or is_rvp());

create policy "submissions_insert_own_only" on submissions for insert
  with check (director_id = auth.uid());

create policy "submissions_update_owner_or_rvp" on submissions for update
  using (director_id = auth.uid() or is_rvp())
  with check (director_id = auth.uid() or is_rvp());

create policy "submissions_delete_rvp_only" on submissions for delete
  using (is_rvp());

-- weekly_scripts: RVP-only, full stop (directors never see the compile/script view).
create policy "weekly_scripts_rvp_only" on weekly_scripts for all
  using (is_rvp()) with check (is_rvp());

-- org_settings: readable by all authenticated users (directors need deadline/timezone hints),
-- writable only by the RVP.
create policy "org_settings_select_all" on org_settings for select
  using (auth.role() = 'authenticated');

create policy "org_settings_update_rvp_only" on org_settings for update
  using (is_rvp()) with check (is_rvp());

-- Status-only exposure: lets every authenticated user see WHO submitted and HOW TIMELY,
-- without exposing report content. Deliberately a SECURITY DEFINER function rather than a
-- plain view: a view over submissions (RLS-protected) would inherit that restriction and hide
-- row existence entirely from non-owners, defeating "status visible to all."
create or replace function get_week_status(p_week_start date)
returns table (
  director_id uuid,
  director_name text,
  branch branch_name,
  submitted_at timestamptz,
  is_late boolean,
  has_submitted boolean
)
language sql security definer stable as $$
  select
    p.id,
    p.full_name,
    p.branch,
    s.submitted_at,
    s.is_late,
    (s.id is not null) as has_submitted
  from profiles p
  left join submissions s on s.director_id = p.id and s.week_start = p_week_start
  where p.role = 'director' and p.is_active;
$$;
grant execute on function get_week_status(date) to authenticated;
