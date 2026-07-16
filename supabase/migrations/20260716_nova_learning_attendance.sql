-- Class sessions + attendance records for teacher mode.
-- Also links organisation members to staff/student profiles for mode resolution.

alter table public.organisation_members
  add column if not exists linked_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists linked_student_id uuid references public.students(id) on delete set null;

-- Allow a student app-role for linked student accounts (optional).
do $$
begin
  alter table public.organisation_members drop constraint if exists organisation_members_role_check;
exception when undefined_object then null;
end $$;

alter table public.organisation_members
  add constraint organisation_members_role_check
  check (role in ('owner','admin','manager','tutor','finance','student'));

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  programme text not null,
  session_date date not null,
  start_time text,
  room text,
  staff_id uuid references public.staff(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, programme, session_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present','absent','late','excused')),
  arrival_time text,
  departure_time text,
  note text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.student_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  year_group text,
  age smallint,
  mocks_date date,
  exam_date date,
  daily_minutes int not null default 90,
  topic_minutes int not null default 45,
  subject_ids text[] not null default '{}',
  missed_days date[] not null default '{}',
  completed_topics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, student_id)
);

create index if not exists idx_class_sessions_org_date on public.class_sessions(organisation_id, session_date);
create index if not exists idx_attendance_session on public.attendance_records(session_id);
create index if not exists idx_learning_profiles_student on public.student_learning_profiles(student_id);

alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.student_learning_profiles enable row level security;

drop policy if exists class_sessions_member_all on public.class_sessions;
create policy class_sessions_member_all on public.class_sessions
  for all using (public.is_org_member(organisation_id))
  with check (public.is_org_member(organisation_id));

drop policy if exists attendance_records_member_all on public.attendance_records;
create policy attendance_records_member_all on public.attendance_records
  for all using (public.is_org_member(organisation_id))
  with check (public.is_org_member(organisation_id));

drop policy if exists learning_profiles_member_all on public.student_learning_profiles;
create policy learning_profiles_member_all on public.student_learning_profiles
  for all using (public.is_org_member(organisation_id))
  with check (public.is_org_member(organisation_id));
