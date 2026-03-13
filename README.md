# CTIS 2026 Review Portal

This workspace now has two separate browser pages for the event workflow:

- `submission.html` for teacher abstract submission
- `review.html` for reviewer management, paper assignment, scoring, comments, and rankings
- `index.html` as a simple landing page linking to both portals

## Run it

Open `index.html` in any modern browser and choose the portal you want. No build step or server is required.

## Notes

- Both portals share the same browser `localStorage` data, so submissions entered in the teacher portal appear in the review portal automatically.
- The teacher-facing submission page does not expose reviewer assignment, scores, or rankings.
- The review page includes reviewer management, assignment mapping, review entry, ranking, and JSON import/export tools.
- The submission form fields were aligned to the abstract template you shared, including background, implementation, impact, conclusion, and references.
