-- Weekly Strategy Report AI: core schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New Query -> paste -> Run)

create type user_role as enum ('rvp', 'director');
create type branch_name as enum ('detroit', 'grand_rapids', 'indianapolis');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role user_role not null,
  branch branch_name,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint director_has_branch check (
    (role = 'director' and branch is not null) or (role = 'rvp' and branch is null)
  )
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references profiles(id) on delete cascade,
  branch branch_name not null,
  week_start date not null,
  positives text not null default '',
  challenges text not null default '',
  narrative text not null default '',
  submitted_at timestamptz not null default now(),
  is_late boolean not null,
  acknowledged_duplicate_warning boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (director_id, week_start)
);
create index submissions_week_idx on submissions(week_start);
create index submissions_director_idx on submissions(director_id);

create table weekly_scripts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  selected_submission_ids uuid[] not null default '{}',
  ai_initiatives_content text not null default '',
  generated_script text,
  final_script text,
  status text not null default 'draft' check (status in ('draft', 'generated', 'finalized')),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org_settings (
  id boolean primary key default true check (id),
  style_guide text not null default '',
  words_per_minute integer not null default 150,
  segment_seconds jsonb not null default '{"intro":20,"detroit":40,"grand_rapids":40,"indy":40,"ai_initiatives":40}',
  total_target_seconds integer not null default 180,
  submission_deadline_day text not null default 'thursday',
  submission_deadline_time time not null default '23:59:00',
  timezone text not null default 'America/Detroit',
  updated_at timestamptz not null default now()
);
