-- ParkBuddy normalized Supabase schema.
-- Run this in Supabase SQL Editor for the target project.
-- The legacy parkbuddy_app_state table is kept as a fallback/migration snapshot.

create table if not exists public.parkbuddy_app_state (
  state_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.parkbuddy_app_settings (
  state_key text primary key,
  recent_places text[] not null default '{}'::text[],
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parkbuddy_clubs (
  state_key text not null,
  id text not null,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, id),
  unique (state_key, name)
);

create table if not exists public.parkbuddy_members (
  state_key text not null,
  id text not null,
  club_id text,
  name text not null default '',
  gender text not null default '',
  phone text not null default '',
  club_name text not null default '',
  position text not null default '회원',
  skill_level text not null default '초급',
  handicap numeric not null default 0,
  is_leader_candidate boolean not null default false,
  average_score numeric,
  participation_count integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, id)
);

create table if not exists public.parkbuddy_courses (
  state_key text not null,
  id text not null,
  club_id text,
  province text not null default '',
  name text not null default '',
  created_at_text text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, id)
);

create table if not exists public.parkbuddy_rounds (
  state_key text not null,
  id text not null,
  club_id text,
  title text not null default '',
  round_date text not null default '',
  place text not null default '',
  method text not null default '',
  holes integer not null default 0,
  status text not null default 'scored',
  assignment_mode text not null default '',
  participant_count integer not null default 0,
  team_count integer not null default 0,
  saved_at_text text not null default '',
  scored_at_text text not null default '',
  round jsonb not null default '{}'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  teams jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, id)
);

create table if not exists public.parkbuddy_round_scores (
  state_key text not null,
  round_id text not null,
  entry_id text not null,
  scores jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, round_id, entry_id)
);

create table if not exists public.parkbuddy_round_rankings (
  state_key text not null,
  round_id text not null,
  ranking_key text not null,
  rank_order integer not null default 0,
  display_name text not null default '',
  ranking jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (state_key, round_id, ranking_key)
);

create index if not exists parkbuddy_members_state_position_name_idx
on public.parkbuddy_members (state_key, position, name);

create index if not exists parkbuddy_courses_state_province_name_idx
on public.parkbuddy_courses (state_key, province, name);

create index if not exists parkbuddy_rounds_state_date_idx
on public.parkbuddy_rounds (state_key, round_date desc, updated_at desc);

create index if not exists parkbuddy_round_scores_state_round_idx
on public.parkbuddy_round_scores (state_key, round_id);

create index if not exists parkbuddy_round_rankings_state_round_rank_idx
on public.parkbuddy_round_rankings (state_key, round_id, rank_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_parkbuddy_app_state_updated_at on public.parkbuddy_app_state;
create trigger set_parkbuddy_app_state_updated_at
before update on public.parkbuddy_app_state
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_app_settings_updated_at on public.parkbuddy_app_settings;
create trigger set_parkbuddy_app_settings_updated_at
before update on public.parkbuddy_app_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_clubs_updated_at on public.parkbuddy_clubs;
create trigger set_parkbuddy_clubs_updated_at
before update on public.parkbuddy_clubs
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_members_updated_at on public.parkbuddy_members;
create trigger set_parkbuddy_members_updated_at
before update on public.parkbuddy_members
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_courses_updated_at on public.parkbuddy_courses;
create trigger set_parkbuddy_courses_updated_at
before update on public.parkbuddy_courses
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_rounds_updated_at on public.parkbuddy_rounds;
create trigger set_parkbuddy_rounds_updated_at
before update on public.parkbuddy_rounds
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_round_scores_updated_at on public.parkbuddy_round_scores;
create trigger set_parkbuddy_round_scores_updated_at
before update on public.parkbuddy_round_scores
for each row execute function public.set_updated_at();

drop trigger if exists set_parkbuddy_round_rankings_updated_at on public.parkbuddy_round_rankings;
create trigger set_parkbuddy_round_rankings_updated_at
before update on public.parkbuddy_round_rankings
for each row execute function public.set_updated_at();

alter table public.parkbuddy_app_state enable row level security;
alter table public.parkbuddy_app_settings enable row level security;
alter table public.parkbuddy_clubs enable row level security;
alter table public.parkbuddy_members enable row level security;
alter table public.parkbuddy_courses enable row level security;
alter table public.parkbuddy_rounds enable row level security;
alter table public.parkbuddy_round_scores enable row level security;
alter table public.parkbuddy_round_rankings enable row level security;

drop policy if exists "parkbuddy app state read" on public.parkbuddy_app_state;
drop policy if exists "parkbuddy app state insert" on public.parkbuddy_app_state;
drop policy if exists "parkbuddy app state update" on public.parkbuddy_app_state;
drop policy if exists "parkbuddy app state delete" on public.parkbuddy_app_state;
create policy "parkbuddy app state read" on public.parkbuddy_app_state for select to anon, authenticated using (true);
create policy "parkbuddy app state insert" on public.parkbuddy_app_state for insert to anon, authenticated with check (true);
create policy "parkbuddy app state update" on public.parkbuddy_app_state for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy app state delete" on public.parkbuddy_app_state for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy settings read" on public.parkbuddy_app_settings;
drop policy if exists "parkbuddy settings insert" on public.parkbuddy_app_settings;
drop policy if exists "parkbuddy settings update" on public.parkbuddy_app_settings;
drop policy if exists "parkbuddy settings delete" on public.parkbuddy_app_settings;
create policy "parkbuddy settings read" on public.parkbuddy_app_settings for select to anon, authenticated using (true);
create policy "parkbuddy settings insert" on public.parkbuddy_app_settings for insert to anon, authenticated with check (true);
create policy "parkbuddy settings update" on public.parkbuddy_app_settings for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy settings delete" on public.parkbuddy_app_settings for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy clubs read" on public.parkbuddy_clubs;
drop policy if exists "parkbuddy clubs insert" on public.parkbuddy_clubs;
drop policy if exists "parkbuddy clubs update" on public.parkbuddy_clubs;
drop policy if exists "parkbuddy clubs delete" on public.parkbuddy_clubs;
create policy "parkbuddy clubs read" on public.parkbuddy_clubs for select to anon, authenticated using (true);
create policy "parkbuddy clubs insert" on public.parkbuddy_clubs for insert to anon, authenticated with check (true);
create policy "parkbuddy clubs update" on public.parkbuddy_clubs for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy clubs delete" on public.parkbuddy_clubs for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy members read" on public.parkbuddy_members;
drop policy if exists "parkbuddy members insert" on public.parkbuddy_members;
drop policy if exists "parkbuddy members update" on public.parkbuddy_members;
drop policy if exists "parkbuddy members delete" on public.parkbuddy_members;
create policy "parkbuddy members read" on public.parkbuddy_members for select to anon, authenticated using (true);
create policy "parkbuddy members insert" on public.parkbuddy_members for insert to anon, authenticated with check (true);
create policy "parkbuddy members update" on public.parkbuddy_members for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy members delete" on public.parkbuddy_members for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy courses read" on public.parkbuddy_courses;
drop policy if exists "parkbuddy courses insert" on public.parkbuddy_courses;
drop policy if exists "parkbuddy courses update" on public.parkbuddy_courses;
drop policy if exists "parkbuddy courses delete" on public.parkbuddy_courses;
create policy "parkbuddy courses read" on public.parkbuddy_courses for select to anon, authenticated using (true);
create policy "parkbuddy courses insert" on public.parkbuddy_courses for insert to anon, authenticated with check (true);
create policy "parkbuddy courses update" on public.parkbuddy_courses for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy courses delete" on public.parkbuddy_courses for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy rounds read" on public.parkbuddy_rounds;
drop policy if exists "parkbuddy rounds insert" on public.parkbuddy_rounds;
drop policy if exists "parkbuddy rounds update" on public.parkbuddy_rounds;
drop policy if exists "parkbuddy rounds delete" on public.parkbuddy_rounds;
create policy "parkbuddy rounds read" on public.parkbuddy_rounds for select to anon, authenticated using (true);
create policy "parkbuddy rounds insert" on public.parkbuddy_rounds for insert to anon, authenticated with check (true);
create policy "parkbuddy rounds update" on public.parkbuddy_rounds for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy rounds delete" on public.parkbuddy_rounds for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy scores read" on public.parkbuddy_round_scores;
drop policy if exists "parkbuddy scores insert" on public.parkbuddy_round_scores;
drop policy if exists "parkbuddy scores update" on public.parkbuddy_round_scores;
drop policy if exists "parkbuddy scores delete" on public.parkbuddy_round_scores;
create policy "parkbuddy scores read" on public.parkbuddy_round_scores for select to anon, authenticated using (true);
create policy "parkbuddy scores insert" on public.parkbuddy_round_scores for insert to anon, authenticated with check (true);
create policy "parkbuddy scores update" on public.parkbuddy_round_scores for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy scores delete" on public.parkbuddy_round_scores for delete to anon, authenticated using (true);

drop policy if exists "parkbuddy rankings read" on public.parkbuddy_round_rankings;
drop policy if exists "parkbuddy rankings insert" on public.parkbuddy_round_rankings;
drop policy if exists "parkbuddy rankings update" on public.parkbuddy_round_rankings;
drop policy if exists "parkbuddy rankings delete" on public.parkbuddy_round_rankings;
create policy "parkbuddy rankings read" on public.parkbuddy_round_rankings for select to anon, authenticated using (true);
create policy "parkbuddy rankings insert" on public.parkbuddy_round_rankings for insert to anon, authenticated with check (true);
create policy "parkbuddy rankings update" on public.parkbuddy_round_rankings for update to anon, authenticated using (true) with check (true);
create policy "parkbuddy rankings delete" on public.parkbuddy_round_rankings for delete to anon, authenticated using (true);

comment on table public.parkbuddy_app_state is
'Legacy ParkBuddy MVP JSON state store. Kept as fallback while normalized tables are rolled out.';

comment on table public.parkbuddy_members is
'ParkBuddy member rows for Table Editor visibility and future club-based access control.';

comment on table public.parkbuddy_rounds is
'ParkBuddy round record headers. Scores and ranking snapshots are split into child tables.';
