# CTIS 2026 Portals

This workspace has two separate browser pages for the event workflow:

- `submission.html` for teacher abstract submission
- `review.html` for reviewer management, paper assignment, scoring, comments, and rankings
- `index.html` as a landing page linking to both portals

## Run It

Open `index.html` in any modern browser and choose the portal you want. No build step is required.

## Notes

- Both portals use the same Supabase project for shared state and submission files.
- Shared state now lives in Supabase Postgres tables instead of `state/state.json`.
- The teacher-facing submission page does not expose reviewer assignment, scores, or rankings.
- The review page includes reviewer management, assignment mapping, review entry, and ranking tools.
- The submission page can trigger a confirmation email through a Supabase Edge Function after a successful save.

## Supabase Database Setup

Apply the schema in:

- `supabase/migrations/20260427_portal_tables.sql`

This creates:

- `portal_submissions`
- `portal_reviewers`
- `portal_assignments`
- `portal_reviews`

Attachments remain in Supabase Storage under the `vectis2026` bucket.

## One-Time Import From Existing state.json

Deploy the Edge Function at:

- `supabase/functions/import-state-json/index.ts`

Then invoke it once after the SQL migration is applied. It imports:

- `state/state.json`
- existing per-submission metadata from `submissions/*.json`

Required function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`

Example invocation body:

```json
{
  "bucket": "vectis2026",
  "statePath": "state/state.json"
}
```

## Submission Email Setup

The browser app calls a Supabase Edge Function named `send-submission-email` after a successful submission. The function source is included at:

- `supabase/functions/send-submission-email/index.ts`

Before it can send email, deploy it in Supabase and set these secrets:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Expected subject line:

- `VE CTIS Submission - <Submission Id> - <Title>`

Recipients:

- the teacher email address entered in the form
- `meera@visionempowertrust.org`
