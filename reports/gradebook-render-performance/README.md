# Saved gradebook render performance

Date: 2026-09-19. Local source changes; no deployment.

Submission Inbox now caches entry averages and student summaries while the gradebook is open. The cache depends on the saved-entry snapshot, grouping mode, and open state. Unrelated renders and expanding a student reuse the result. Saving/deleting entries refreshes the saved snapshot through the existing refresh counter. Closing the gradebook discards its summary and performs no score aggregation.

The existing scoring rules are preserved: numeric response scores only, rounded per-submission averages, then an unweighted average of those rounded averages per student. Case-insensitive nickname grouping, first-entry display metadata, entry order, alphabetical student order, and latest graded-date selection are unchanged. A Map replaces the grouping object so nicknames such as `__proto__` and `constructor` also work. Saved records and the CSV/AlloSheet export paths are not modified.

## Browser evidence

The actual generated Inbox was mounted with production React and synthetic gradebooks containing 60 or 600 submissions, each with 20 response scores. The fixture counts scans of score collections across 25 repeated renders per state.

| Gradebook state | 60 submissions: before → after | 600 submissions: before → after |
| --- | ---: | ---: |
| Submission rows | 1,500 → 0 | 15,000 → 0 |
| Student summaries | 1,500 → 0 | 15,000 → 0 |
| One student expanded | 1,550 → 0 | 15,500 → 0 |
| Closed | 0 → 0 | 0 → 0 |

Displayed content matched the baseline in submission/student/expanded views, after deleting an entry, after switching grouping modes, and after reopening. Deletion updated both browser storage and the summaries. No page errors occurred.

These counts measure avoided score-aggregation work after the first render of each state, not whole-app latency or Core Web Vitals. Rendering rows and other presentation work still occur. No live AI provider or user data was used.

## Validation

All 33 distinct selected tests passed, including five summary tests and existing Inbox localization, accessibility, AlloSheet handoff, and source-review runtime checks. The combined run returned `STACK_TRACE_ERROR` for one existing structural accessibility check; that unchanged check passed on its isolated retry. Both result files are retained.

Generated module syntax, scoped whitespace, and root/public/app-build byte parity passed. A Windows Node file-write error on the shell was resolved with a guarded native filesystem write; only the Inbox CDN hash changed in this pass.

Reproduce with `node dev-tools/gradebook_render_performance.cjs`. The fixture pins baseline `e883ad2b3fd2466575bc9a1b77c88dff72836a86`; override using `GRADEBOOK_BASELINE_REF`. Detailed browser and test results are in this directory.

The local commit also carries the preceding isolated performance passes and their evidence, preserving them together while leaving shared HEAD and staging untouched.
