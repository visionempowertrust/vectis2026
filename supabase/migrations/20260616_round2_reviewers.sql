create table if not exists public.portal_round2_reviewers (
  id text primary key,
  name text not null default '',
  email text not null default '',
  expertise text not null default ''
);

alter table public.portal_round2_reviewers enable row level security;

drop policy if exists "portal_round2_reviewers_public_rw" on public.portal_round2_reviewers;
create policy "portal_round2_reviewers_public_rw"
on public.portal_round2_reviewers
for all
to anon, authenticated
using (true)
with check (true);

alter table if exists public.portal_round2_assignments
drop constraint if exists portal_round2_assignments_reviewer_id_fkey;

alter table if exists public.portal_round2_assignments
add constraint portal_round2_assignments_reviewer_id_fkey
foreign key (reviewer_id)
references public.portal_round2_reviewers(id)
on delete cascade;

alter table if exists public.portal_round2_reviews
drop constraint if exists portal_round2_reviews_reviewer_id_fkey;

alter table if exists public.portal_round2_reviews
add constraint portal_round2_reviews_reviewer_id_fkey
foreign key (reviewer_id)
references public.portal_round2_reviewers(id)
on delete cascade;
