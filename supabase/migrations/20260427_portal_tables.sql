create table if not exists public.portal_submissions (
  id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  title text not null default '',
  authors text not null default '',
  school_name text not null default '',
  school_address text not null default '',
  emails text not null default '',
  submission_category text not null default '',
  theme text not null default '',
  implementation_start text,
  weekly_periods integer,
  teacher_count integer,
  student_count integer,
  grades text not null default '',
  attachment_name text,
  attachment_url text,
  attachment_path text
);

create table if not exists public.portal_reviewers (
  id text primary key,
  name text not null default '',
  email text not null default '',
  expertise text not null default '',
  capacity integer not null default 1 check (capacity > 0)
);

create table if not exists public.portal_assignments (
  id text primary key,
  submission_id text not null references public.portal_submissions(id) on delete cascade,
  reviewer_id text not null references public.portal_reviewers(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),
  constraint portal_assignments_submission_reviewer_key unique (submission_id, reviewer_id)
);

create table if not exists public.portal_reviews (
  id text primary key,
  submission_id text not null references public.portal_submissions(id) on delete cascade,
  reviewer_id text not null references public.portal_reviewers(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  total_score numeric not null default 0,
  recommendation text not null default '',
  comments text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portal_reviews_submission_reviewer_key unique (submission_id, reviewer_id)
);

create or replace function public.portal_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists portal_submissions_touch_updated_at on public.portal_submissions;
create trigger portal_submissions_touch_updated_at
before update on public.portal_submissions
for each row
execute function public.portal_touch_updated_at();

drop trigger if exists portal_reviews_touch_updated_at on public.portal_reviews;
create trigger portal_reviews_touch_updated_at
before update on public.portal_reviews
for each row
execute function public.portal_touch_updated_at();

alter table public.portal_submissions enable row level security;
alter table public.portal_reviewers enable row level security;
alter table public.portal_assignments enable row level security;
alter table public.portal_reviews enable row level security;

drop policy if exists "portal_submissions_public_rw" on public.portal_submissions;
create policy "portal_submissions_public_rw"
on public.portal_submissions
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "portal_reviewers_public_rw" on public.portal_reviewers;
create policy "portal_reviewers_public_rw"
on public.portal_reviewers
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "portal_assignments_public_rw" on public.portal_assignments;
create policy "portal_assignments_public_rw"
on public.portal_assignments
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "portal_reviews_public_rw" on public.portal_reviews;
create policy "portal_reviews_public_rw"
on public.portal_reviews
for all
to anon, authenticated
using (true)
with check (true);
