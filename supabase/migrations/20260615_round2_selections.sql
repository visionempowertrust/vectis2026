create table if not exists public.portal_round2_selections (
  id text primary key,
  submission_id text not null references public.portal_submissions(id) on delete cascade,
  category text not null default '',
  selected_at timestamptz not null default timezone('utc', now()),
  constraint portal_round2_selections_submission_key unique (submission_id)
);

create table if not exists public.portal_round2_assignments (
  id text primary key,
  submission_id text not null references public.portal_submissions(id) on delete cascade,
  reviewer_id text not null references public.portal_reviewers(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),
  constraint portal_round2_assignments_submission_reviewer_key unique (submission_id, reviewer_id)
);

create table if not exists public.portal_round2_reviews (
  id text primary key,
  submission_id text not null references public.portal_submissions(id) on delete cascade,
  reviewer_id text not null references public.portal_reviewers(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  total_score numeric not null default 0,
  recommendation text not null default '',
  comments text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portal_round2_reviews_submission_reviewer_key unique (submission_id, reviewer_id)
);

drop trigger if exists portal_round2_reviews_touch_updated_at on public.portal_round2_reviews;
create trigger portal_round2_reviews_touch_updated_at
before update on public.portal_round2_reviews
for each row
execute function public.portal_touch_updated_at();

alter table public.portal_round2_selections enable row level security;
alter table public.portal_round2_assignments enable row level security;
alter table public.portal_round2_reviews enable row level security;

drop policy if exists "portal_round2_selections_public_rw" on public.portal_round2_selections;
create policy "portal_round2_selections_public_rw"
on public.portal_round2_selections
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "portal_round2_assignments_public_rw" on public.portal_round2_assignments;
create policy "portal_round2_assignments_public_rw"
on public.portal_round2_assignments
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "portal_round2_reviews_public_rw" on public.portal_round2_reviews;
create policy "portal_round2_reviews_public_rw"
on public.portal_round2_reviews
for all
to anon, authenticated
using (true)
with check (true);
