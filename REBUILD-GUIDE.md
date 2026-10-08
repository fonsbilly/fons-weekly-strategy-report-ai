# Weekly Strategy Report AI — Rebuild Guide

A complete handoff spec for recreating this tool on a **separate account** (e.g. a CTI
business Claude Code / GitHub / Vercel / Supabase account). Hand this whole file to a fresh
Claude Code session and it has everything it needs.

---

## 0. What this tool does (capabilities)

A web app that replaces a Regional VP's manual weekly process — branch directors emailing
status, the RVP hand-scrubbing it and pasting into ChatGPT — with a purpose-built system.

- **Two roles:** one **RVP** (admin) and multiple **directors** (one per branch).
- **Structured weekly submissions:** each director submits Positives / Challenges / Narrative,
  timestamped; late-vs-on-time is computed automatically against a configurable deadline.
  Text areas auto-grow; each field has **microphone dictation** (browser Web Speech API).
- **Status dashboard:** shows who has/hasn't submitted this week and their timeliness
  (visible to everyone), but **report content stays private** to the submitting director + RVP.
  RVP gets a **one-click "Remind non-submitters"** button (opens their own mail client, BCC).
- **Duplicate-content nudge:** on submit, an AI check compares a director's report to their
  own prior weeks and warns them if they're recycling — never compares across directors.
- **Coaching / training:** RVP sets general guidance + per-director focus notes in Settings; on
  submit, an AI check nudges the director if they missed something the RVP asked for.
- **Compile & scrub (RVP):** RVP reads each branch's report, checkboxes which sections to
  include, types their own "AI Initiatives" segment. Missing branches are flagged (no
  fabrication) with an opt-in to backfill from that branch's last 4 weeks.
- **Script generation (RVP):** one click sends the selections + settings to Claude, which
  writes a timed spoken script (INTRO / one section per branch / AI) in the RVP's voice, to a
  target total time. Editable, re-savable, copy-to-clipboard.
- **Reading-speed calibration:** RVP takes a 60-second read-aloud test that sets words-per-minute
  so scripts land on time. Talk time auto-distributes: intro + AI get fixed seconds, the
  remainder splits evenly across active branches.
- **History:** past weeks' reports (RVP sees all branches + the finalized script per week;
  directors see only their own).
- **Trends:** timeliness/activity metrics over a configurable date range (RVP only) + an
  on-demand AI analysis — cross-branch correlations for the RVP, own-branch recurring themes
  for directors.
- **Settings (RVP):** voice/style guide, talk-time config, submission deadline, coaching
  guidance + per-director focus notes, reading-speed test, API-key status indicator.

---

## 1. Fastest way to recreate it (recommended)

The code is **identical across accounts** — only the infrastructure (GitHub/Vercel/Supabase)
differs. So don't rebuild from scratch:

1. **Copy the source folder** `fons-weekly-strategy-report-ai/` to the new machine/account
   (or clone the repo `github.com/fonsbilly/fons-weekly-strategy-report-ai`). Delete `.git`
   and re-init if you want a clean history.
2. Do the **Infrastructure setup** in §3 (new GitHub repo, new Vercel project, new Supabase
   project, env vars, run the schema, create the RVP user).
3. Push to the new repo → Vercel auto-deploys. Done.

The rest of this doc (§2, §4–§8) is the full spec for understanding/modifying it or rebuilding
from zero.

---

## 2. Tech stack (exact versions that build cleanly on Vercel)

- **Next.js 14** App Router + **TypeScript** (strict).
- **Supabase** — Postgres + Auth + Row Level Security.
- **Anthropic Claude API** — server-side only.
- Deployed on **Vercel** (Hobby is fine).

`package.json` dependencies:
```json
"@anthropic-ai/sdk": "^0.32.1",
"@supabase/ssr": "^0.5.2",
"@supabase/supabase-js": "^2.47.10",
"date-fns": "^3.6.0",
"date-fns-tz": "^3.2.0",
"next": "^14.2.18",
"react": "^18.3.1",
"react-dom": "^18.3.1"
```
devDeps: `@types/node ^22`, `@types/react ^18`, `@types/react-dom ^18`, `typescript ^5.7`.

**The machine has no local Node/npm.** All installs/builds happen in Vercel's cloud on push.
Iterate by pushing and reading the Vercel build log — the Vercel build IS your typecheck.

---

## 3. Infrastructure setup (do this once; same whether you copy or rebuild)

### 3a. Supabase
1. Create a new Supabase project. Note the **Project URL** and, under **Project Settings →
   API Keys → the "Legacy anon, service_role" tab**, the **anon** and **service_role** keys.
   ⚠️ Use the **legacy** keys, not the new `sb_publishable…`/`sb_secret…` ones — `@supabase/ssr`
   expects the legacy JWT-style keys.
2. **SQL Editor → New query →** paste and run the **entire consolidated schema in §4**. One paste.
3. **Authentication → Providers/Settings:** email/password only; **disable public sign-ups**.
4. **Authentication → URL Configuration:** set **Site URL** and add a **Redirect URL** =
   the deployed app URL (e.g. `https://<project>.vercel.app`).
5. **Create the RVP user:** Authentication → Users → Add user (set a password; enable
   auto-confirm). Copy their **User UID**, then in SQL Editor run (substitute UID + email):
   ```sql
   insert into profiles (id, email, full_name, role)
   values ('THE-UID', 'rvp@company.com', 'RVP Name', 'rvp');
   ```
   If a password ever needs resetting without email, run:
   ```sql
   update auth.users set encrypted_password = crypt('NewPassword', gen_salt('bf'))
   where email = 'someone@company.com';
   ```

### 3b. Anthropic
Create an API key at console.anthropic.com. It goes in Vercel env vars only (never the DB).

### 3c. GitHub + Vercel
1. New **empty** GitHub repo; push the code to `main`.
2. Import it into a **new Vercel project** (framework auto-detects Next.js).
3. **Vercel → Settings → Environments → add these to Production AND Preview:**
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = legacy anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = legacy service_role key
   - `ANTHROPIC_API_KEY` = Anthropic key
4. Push to `main` → auto-deploys to production.

---

## 4. Consolidated database schema (run once, top to bottom)

> This merges migrations 0001–0007. `branch_name` is **hardcoded** — change the three enum
> values (and the `BRANCH_LABELS` maps in the code) if the new deployment has different
> branches. `segment_seconds` is legacy/unused (timing is computed from intro/ai seconds) but
> harmless to keep.

```sql
-- ===== enums =====
create type user_role as enum ('rvp', 'director');
create type branch_name as enum ('detroit', 'grand_rapids', 'indianapolis');

-- ===== tables =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role user_role not null,
  branch branch_name,
  is_active boolean not null default true,
  focus_notes text not null default '',
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
  selected_fields jsonb not null default '{}',
  use_history_branches text[] not null default '{}',
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
  coaching_guidance text not null default '',
  words_per_minute integer not null default 150,
  wpm_calibrated boolean not null default false,
  segment_seconds jsonb not null default '{"intro":20,"detroit":40,"grand_rapids":40,"indy":40,"ai_initiatives":40}',
  total_target_seconds integer not null default 180,
  intro_seconds integer not null default 20,
  ai_seconds integer not null default 40,
  submission_deadline_day text not null default 'thursday',
  submission_deadline_time time not null default '23:59:00',
  timezone text not null default 'America/Detroit',
  updated_at timestamptz not null default now()
);
insert into org_settings (id) values (true);

-- ===== RLS =====
alter table profiles enable row level security;
alter table submissions enable row level security;
alter table weekly_scripts enable row level security;
alter table org_settings enable row level security;

create function is_rvp() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'rvp' and is_active);
$$;

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_rvp_only" on profiles for insert with check (is_rvp());
create policy "profiles_update_rvp_or_self" on profiles for update
  using (is_rvp() or id = auth.uid()) with check (is_rvp() or id = auth.uid());
create policy "profiles_delete_rvp_only" on profiles for delete using (is_rvp());

create policy "submissions_select_owner_or_rvp" on submissions for select
  using (director_id = auth.uid() or is_rvp());
create policy "submissions_insert_own_only" on submissions for insert
  with check (director_id = auth.uid());
create policy "submissions_update_owner_or_rvp" on submissions for update
  using (director_id = auth.uid() or is_rvp()) with check (director_id = auth.uid() or is_rvp());
create policy "submissions_delete_rvp_only" on submissions for delete using (is_rvp());

create policy "weekly_scripts_rvp_only" on weekly_scripts for all
  using (is_rvp()) with check (is_rvp());

create policy "org_settings_select_all" on org_settings for select
  using (auth.role() = 'authenticated');
create policy "org_settings_update_rvp_only" on org_settings for update
  using (is_rvp()) with check (is_rvp());

-- Status visible to all WITHOUT exposing content: a SECURITY DEFINER function, NOT a view.
-- (A view over an RLS-protected table hides row existence from non-owners, defeating the goal.)
create or replace function get_week_status(p_week_start date)
returns table (director_id uuid, director_name text, branch branch_name,
               submitted_at timestamptz, is_late boolean, has_submitted boolean)
language sql security definer stable as $$
  select p.id, p.full_name, p.branch, s.submitted_at, s.is_late, (s.id is not null)
  from profiles p
  left join submissions s on s.director_id = p.id and s.week_start = p_week_start
  where p.role = 'director' and p.is_active;
$$;
grant execute on function get_week_status(date) to authenticated;
```

---

## 5. App structure (routes / lib / components)

```
middleware.ts                     Supabase session refresh + redirect unauth'd -> /login
app/
  page.tsx                        redirect -> /dashboard or /login
  login/page.tsx                  email/password sign-in
  set-password/page.tsx           director sets password from an invite (kept as fallback)
  (protected)/
    layout.tsx                    session+profile gate; role-based nav. export const dynamic="force-dynamic"
    SignOutButton.tsx
    dashboard/                    status table (recomputes lateness live) + Remind button
    submit/                       SubmissionForm: 3 auto-grow fields + MicButton; runs coach+dup checks on submit
    history/                      role-aware past reports
    trends/                       date range + metrics (RVP) + on-demand AI analysis
    admin/
      layout.tsx                  RVP-only gate (redirect directors)
      roster/                     add/deactivate directors (temp password shown to relay)
      compile/                    scrub view + AI-Initiatives + Generate Script/edit/save/copy
      settings/                   SettingsForm + WpmTest: voice, timing, deadline, coaching notes
  api/
    roster/route.ts               POST create director (service-role, temp password); PATCH activate/deactivate
    submissions/route.ts          POST upsert; is_late computed on FIRST submission only (sticky)
    submissions/check-duplicate/  POST -> duplicateCheck (Haiku), same-director only
    submissions/coach-check/      POST -> coachCheck (Haiku), against guidance+focus notes
    compile/route.ts              POST save selections/AI text/history opt-in
    generate-script/route.ts      POST -> generateScript (Opus); PATCH save final_script
    settings/route.ts             PUT org_settings + per-director focus_notes
    settings/wpm/route.ts         PUT words_per_minute + wpm_calibrated
    trends/route.ts               POST -> analyzeTrends (Opus), RVP=cross-branch, director=own themes
lib/
  supabase/client.ts server.ts admin.ts   (@supabase/ssr; admin.ts service-role, imported ONLY by roster route)
  anthropic/client.ts                      server-only Anthropic factory (ANTHROPIC_API_KEY)
  anthropic/duplicateCheck.ts generateScript.ts coachCheck.ts trendAnalysis.ts
  weeks.ts   getWeekStart + isLate/computeDeadline (timezone-correct)
  timing.ts  allocateTime + wordTarget
  types.ts
components/MicButton.tsx           Web Speech API dictation, hides itself if unsupported
```

**Every page/layout/route that reads live Supabase data has `export const dynamic = "force-dynamic";`**
(Next.js otherwise cached reads and served stale data.)

---

## 6. Claude API integration (server-side only)

| Call | Model | Purpose |
|---|---|---|
| `generateScript.ts` | `claude-opus-4-8` | Write the timed script from selected content + style guide + per-segment word targets |
| `trendAnalysis.ts` | `claude-opus-4-8` | Cross-branch correlations (RVP) / recurring themes (director) over a date range |
| `duplicateCheck.ts` | `claude-haiku-4-5-20251001` | Is this submission recycled vs the same director's prior weeks? (JSON out) |
| `coachCheck.ts` | `claude-haiku-4-5-20251001` | Does the submission miss what the RVP asked this director to cover? (JSON out) |

All four build a system+user prompt, call `client.messages.create(...)`, and (for the two
Haiku checks + trends) regex-extract a JSON object and **fail open** (never block on error).
The key is a Vercel env var, read via `process.env.ANTHROPIC_API_KEY`, never stored in the DB.

---

## 7. The gotchas (read these first — they cost real time)

1. **Schema changes need SQL run by hand** in the Supabase SQL Editor. There's no way for the
   agent to run DDL remotely. Run the whole §4 block once up front so this only happens once.
2. **Onboard directors with temp passwords, NOT emailed invite links.** Corporate email
   security (link-scanning) pre-clicks and burns single-use auth links before the user sees
   them; Supabase free-tier email is also rate-limited. The roster route creates the user with
   a generated temp password and shows it to the RVP to relay directly (Teams/chat).
3. **`export const dynamic = "force-dynamic"`** on every page/layout/route reading live data,
   or Next.js serves stale cached reads.
4. **TypeScript strict mode fails the Vercel build** on untyped params (e.g. Supabase cookie
   `setAll` callbacks need explicit types). No local Node = the Vercel build is your typecheck.
5. **Git author email must match a verified email on the target Vercel account**, or Vercel
   Hobby marks the deploy **"Blocked."** Set `git config user.email` to an email that account
   owns before pushing. (On the personal setup, `bfons@comcast.net` worked and
   `bill.fons@cti.com` was blocked — on the CTI account it may be the reverse. Match the account.)
6. **Use LEGACY Supabase keys** (anon/service_role), not the new publishable/secret ones.
7. **Timezone math:** compute the deadline by building a wall-clock string for the deadline
   day/time and passing it through `fromZonedTime(wall, timeZone)` (see `lib/weeks.ts`). Don't
   shift the base date first — that was a bug that marked on-time afternoon submissions late.
   The dashboard also **recomputes** lateness live from `submitted_at` so old rows self-correct.
8. **`is_late` is sticky:** only set on a director's FIRST submission of the week; later edits
   change content only, so an on-time report edited after the deadline stays on time.
9. **`branch_name` enum + `BRANCH_LABELS` maps are hardcoded** to detroit/grand_rapids/
   indianapolis. Change both together for different branches.
10. **RVP is bootstrapped by hand** (auth user + a `profiles` row via SQL); public sign-up is
    off, so nobody can self-register.
11. **Verify via Vercel preview deploys**, not a local dev server (there is none).

---

## 8. Suggested build order (if rebuilding from scratch)

0. Scaffold Next.js + push + confirm Vercel builds a placeholder.
1. Supabase project + run §4 schema + create RVP user + set Vercel env vars.
2. Auth shell: `@supabase/ssr` clients, middleware, login, protected layout.
3. Roster admin (temp-password director creation).
4. Submission form + status dashboard (get_week_status RPC).
5. Duplicate-content check (first Claude call).
6. Settings screen + reading-speed test + timing allocation.
7. Compile/scrub view + script generation (+ history-backfill for missing branches).
8. History + Trends (+ date range + cross-branch analysis).
9. Polish: mic dictation, one-click reminders, coaching notes, timezone/lateness fixes.

---

*Live reference implementation: `github.com/fonsbilly/fons-weekly-strategy-report-ai`.*
