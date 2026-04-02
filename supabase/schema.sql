-- AISmartCalendar v2 schema
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.habit_type as enum ('fixed', 'flexible');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.assignment_status as enum ('not_started', 'in_progress', 'done');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.weekly_plan_status as enum ('generated', 'locked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_code text not null,
  class_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_meetings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_sections(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (extract(minute from start_time)::int % 15 = 0),
  check (extract(minute from end_time)::int % 15 = 0)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.class_sections(id) on delete cascade,
  name text not null,
  due_at timestamptz not null,
  estimated_minutes int not null check (estimated_minutes > 0 and estimated_minutes % 15 = 0),
  remaining_minutes int not null check (remaining_minutes >= 0 and remaining_minutes % 15 = 0),
  status public.assignment_status not null default 'not_started',
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.habit_type not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_fixed_slots (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  check (extract(minute from start_time)::int % 15 = 0),
  check (extract(minute from end_time)::int % 15 = 0)
);

create table if not exists public.habit_flexible_rules (
  habit_id uuid primary key references public.habits(id) on delete cascade,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes % 15 = 0),
  preferred_days smallint[] not null default '{}',
  times_per_week smallint,
  check (times_per_week is null or (times_per_week >= 1 and times_per_week <= 7))
);

create table if not exists public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  provider_account_email text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.external_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  provider_event_id text not null,
  summary text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_event_id),
  check (ends_at > starts_at)
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  status public.weekly_plan_status not null default 'generated',
  generated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table if not exists public.weekly_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  block_type text not null check (block_type in ('assignment', 'habit_flexible', 'habit_fixed', 'class', 'external')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  habit_id uuid references public.habits(id) on delete set null,
  source_ref text,
  planned_minutes int generated always as ((extract(epoch from (ends_at - starts_at)) / 60)::int) stored,
  check (ends_at > starts_at),
  check (planned_minutes % 15 = 0)
);

alter table public.weekly_plan_blocks
  add column if not exists origin text not null default 'applied',
  add column if not exists editable boolean not null default true;

create table if not exists public.ai_draft_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  block_type text not null check (block_type in ('assignment', 'habit_flexible', 'habit_fixed', 'class', 'external', 'personal')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  habit_id uuid references public.habits(id) on delete set null,
  editable boolean not null default true,
  applied boolean not null default false,
  check (ends_at > starts_at),
  unique(user_id, week_start_date, title, starts_at, ends_at)
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'manual',
  editable boolean not null default true,
  check (ends_at > starts_at)
);

create table if not exists public.class_meeting_overrides (
  id uuid primary key default gen_random_uuid(),
  class_meeting_id uuid not null references public.class_meetings(id) on delete cascade,
  class_id uuid not null references public.class_sections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  override_date date not null,
  canceled boolean not null default false,
  override_start_time time,
  override_end_time time,
  check (
    canceled = true or (override_start_time is not null and override_end_time is not null and override_end_time > override_start_time)
  ),
  unique(class_meeting_id, override_date)
);

create table if not exists public.scheduler_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  min_daily_minutes int not null default 120 check (min_daily_minutes >= 0 and min_daily_minutes % 15 = 0),
  preferred_daily_minutes int not null default 180 check (preferred_daily_minutes >= 0 and preferred_daily_minutes % 15 = 0),
  max_daily_minutes int not null default 300 check (max_daily_minutes > 0 and max_daily_minutes % 15 = 0),
  max_consecutive_minutes int not null default 120 check (max_consecutive_minutes > 0 and max_consecutive_minutes % 15 = 0),
  break_minutes int not null default 30 check (break_minutes >= 0 and break_minutes % 15 = 0),
  default_apply_days smallint[] not null default '{1,2,3,4,5}',
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_daily_minutes <= preferred_daily_minutes),
  check (preferred_daily_minutes <= max_daily_minutes)
);

create table if not exists public.scheduler_preferred_windows (
  id uuid primary key default gen_random_uuid(),
  preference_id uuid not null references public.scheduler_preferences(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  is_override boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (extract(minute from start_time)::int % 15 = 0),
  check (extract(minute from end_time)::int % 15 = 0)
);

alter table public.scheduler_preferences
  add column if not exists timezone text not null default 'America/Chicago';

alter table public.profiles enable row level security;
alter table public.class_sections enable row level security;
alter table public.class_meetings enable row level security;
alter table public.assignments enable row level security;
alter table public.habits enable row level security;
alter table public.habit_fixed_slots enable row level security;
alter table public.habit_flexible_rules enable row level security;
alter table public.external_calendars enable row level security;
alter table public.external_events enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_blocks enable row level security;
alter table public.ai_draft_blocks enable row level security;
alter table public.user_events enable row level security;
alter table public.class_meeting_overrides enable row level security;
alter table public.scheduler_preferences enable row level security;
alter table public.scheduler_preferred_windows enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can CRUD own class sections" on public.class_sections for all using (auth.uid() = user_id);
create policy "Users can CRUD own class meetings" on public.class_meetings for all
using (exists (select 1 from public.class_sections cs where cs.id = class_id and cs.user_id = auth.uid()));
create policy "Users can CRUD own assignments" on public.assignments for all using (auth.uid() = user_id);
create policy "Users can CRUD own habits" on public.habits for all using (auth.uid() = user_id);
create policy "Users can CRUD own fixed slots" on public.habit_fixed_slots for all
using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "Users can CRUD own flexible rules" on public.habit_flexible_rules for all
using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "Users can CRUD own external calendars" on public.external_calendars for all using (auth.uid() = user_id);
create policy "Users can CRUD own external events" on public.external_events for all using (auth.uid() = user_id);
create policy "Users can CRUD own weekly plans" on public.weekly_plans for all using (auth.uid() = user_id);
create policy "Users can CRUD own weekly blocks" on public.weekly_plan_blocks for all using (auth.uid() = user_id);
create policy "Users can CRUD own AI draft blocks" on public.ai_draft_blocks for all using (auth.uid() = user_id);
create policy "Users can CRUD own user events" on public.user_events for all using (auth.uid() = user_id);
create policy "Users can CRUD own class meeting overrides" on public.class_meeting_overrides for all using (auth.uid() = user_id);
drop policy if exists "Users can CRUD own scheduler preferences" on public.scheduler_preferences;
drop policy if exists "Users can CRUD own scheduler windows" on public.scheduler_preferred_windows;
create policy "Users can CRUD own scheduler preferences" on public.scheduler_preferences for all using (auth.uid() = user_id);
create policy "Users can CRUD own scheduler windows" on public.scheduler_preferred_windows for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
