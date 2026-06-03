create table if not exists public.parkbuddy_app_state (
  state_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

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
for each row
execute function public.set_updated_at();

alter table public.parkbuddy_app_state enable row level security;

drop policy if exists "parkbuddy app state read" on public.parkbuddy_app_state;
drop policy if exists "parkbuddy app state insert" on public.parkbuddy_app_state;
drop policy if exists "parkbuddy app state update" on public.parkbuddy_app_state;

create policy "parkbuddy app state read"
on public.parkbuddy_app_state
for select
to anon, authenticated
using (true);

create policy "parkbuddy app state insert"
on public.parkbuddy_app_state
for insert
to anon, authenticated
with check (true);

create policy "parkbuddy app state update"
on public.parkbuddy_app_state
for update
to anon, authenticated
using (true)
with check (true);

comment on table public.parkbuddy_app_state is
'ParkBuddy MVP JSON state store. Replace open anon policies with authenticated club/admin policies before production login rollout.';
