# CTIS 2026 Portals

This workspace has two separate browser pages for the event workflow:

- `submission.html` for teacher abstract submission
- `review.html` for reviewer management, paper assignment, scoring, comments, and rankings
- `index.html` as a landing page linking to both portals

## Run It

Open `index.html` in any modern browser and choose the portal you want. No build step is required.

## Notes

- Both portals use the same Supabase project for shared state and submission files.
- The teacher-facing submission page does not expose reviewer assignment, scores, or rankings.
- The review page includes reviewer management, assignment mapping, review entry, and ranking tools.
- The submission page can trigger a confirmation email through a Supabase Edge Function after a successful save.

## Submission Email Setup

The browser app calls a Supabase Edge Function named `send-submission-email` after a successful submission. The function source is included at:

- `supabase/functions/send-submission-email/index.ts`

Before it can send email, deploy it in Supabase and set these secrets:

- `RESEND_API_KEY`
- `SUBMISSION_FROM_EMAIL`

Expected subject line:

- `VE CTIS Submission - <Submission Id> - <Title>`

Recipients:

- the teacher email address entered in the form
- `meera@visionempowertrust.org`
