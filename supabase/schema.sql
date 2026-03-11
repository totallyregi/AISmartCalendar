-- Run this in Supabase SQL Editor to create tables and RLS.
-- Replace if you use migrations instead.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schedule text not null default '',
  created_at timestamptz default now()
);

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date not null,
  course_name text not null default '',
  notes text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  created_at timestamptz default now()
);

-- Assignment subtasks (AI breakdown)
create table if not exists public.assignment_subtasks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  title text not null,
  "order" int not null default 0,
  completed boolean not null default false
);

-- Habits (e.g. Gym, Workout, Reading)
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  typical_duration_min int not null default 30,
  preferred_time text,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Daily plans (AI-generated)
create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  plan_json jsonb not null default '{"blocks":[]}',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Check-ins (one per user per day)
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  responses_json jsonb not null default '{}',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_subtasks enable row level security;
alter table public.habits enable row level security;
alter table public.daily_plans enable row level security;
alter table public.check_ins enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can CRUD own classes" on public.classes for all using (auth.uid() = user_id);

create policy "Users can CRUD own assignments" on public.assignments for all using (auth.uid() = user_id);

create policy "Users can CRUD subtasks of own assignments" on public.assignment_subtasks for all
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.user_id = auth.uid()));

create policy "Users can CRUD own habits" on public.habits for all using (auth.uid() = user_id);

create policy "Users can CRUD own daily_plans" on public.daily_plans for all using (auth.uid() = user_id);

create policy "Users can CRUD own check_ins" on public.check_ins for all using (auth.uid() = user_id);

-- Trigger to create profile on signup (optional)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
