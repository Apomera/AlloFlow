# School Rewards pathway readiness

This report covers the local package and its automated checks. The integrated tests run the actual portal HTML and Apps Script code with simulated Google Sheets, Drive, identity, locks, triggers, and email. They do not certify a school's live Google Workspace deployment or a physical printer.

## Repeatable release check

Run `npm run verify:school-rewards` from the repository root.

Latest local verification (2026-09-04): all **491 pre-existing tests across 15 files passed** in the broader release run; that command reported a host timeout starting the new onboarding worker. After the final demo fixes and rebuild, the affected check passed **171 tests across 4 files**, including all **6 new onboarding regressions**, with exit code 0 (`scratch/school-rewards-demo-verified-results.json`). These runs cover 497 distinct cases; there was not one clean 497-test invocation. The final browser demo passed Staff → Student → Cashier → Administrator, with balances 9 → 29 → 14 and stock 20 → 19. Desktop and 390px mobile screenshots were inspected; no horizontal overflow or page errors were found, and the tour stays above mobile navigation. Spanish Portal coverage is 858/858 catalogue entries. Continuation (2026-09-04, Claude): after the award-notice period fix and practice rebuild, the four affected suites passed **172 tests** (`--pool=threads`); the onboarding suite's worker timed out at startup in that run and passed separately, **7 of 7**, with `--pool=forks`. Portal and practice mirrors were re-verified byte-identical.

The command includes the school rewards repository, portal, setup panel, language packs, manual, practice pages, Leadership Hub launcher, classroom reward boundary, Print Lab tool, and Geometry World handoff tests.

## Pathways covered

| Pathway | Automated evidence | Live check before school use |
| --- | --- | --- |
| Setup and deployment | Setup/bootstrap, role rules, schema migrations, launcher, copyable files and deployment mirrors | Run the setup/status check from the intended managed administrator account; deploy updated Code.gs and Portal.html |
| Student access | Own balances, recognition, goals/catalog, activity and role-specific navigation | Sign in as two test students and confirm each sees only their own records |
| Staff recognition | Single/group awards, explanations, corrections, undo, partial failures and retry recovery | Award and undo a small recognition using designated test accounts |
| Physical store | Open-window checks, inventory, reserved points, checkout, receipts, refund and integrity reconciliation | Complete one test purchase and refund; verify balances, stock and managed-email receipt |
| Print submission | Recipe and GLB/STL handoff validation, upload limits/hash checks, private review and linked revisions | Review a recipe and a sample imported file with the school's trained print operator |
| Print fulfillment | Quote, reservation, queue, print status, fulfillment, cancellation and print refund | Confirm the school’s material/printer profiles and hand-delivery procedure |
| Moderated model catalog | Consent, moderation, reporting, publication permissions and private recipe remix | Approve a test design and verify the allowed remix from another test student account |
| Guardian and student mail | Consent, statements/digests, quota handling, resumable runs and uncertain-delivery resolution | Verify consented test addresses, actual delivery and scheduled-trigger ownership |
| Administration | Members/roster, catalog and stock adjustments, windows, categories, levels, SIS preview/apply, reports, records, retention and year rollover | Preview the school's approved roster export; validate timezone, academic year, ownership and retention choices |
| Recovery and integrity | Interrupted writes, duplicate requests, inventory/audit integrity, receipt recovery and pending operations | Run the integrity report and verify the school backup/recovery procedure |
| Language and training | English/Spanish pack parity, setup help, manuals and practice pages | Have staff review the terminology and practice their assigned role |

## Small administrator demo

The fictional-data rewards/store demo is ready for a guided walkthrough. Use [the presenter guide](school_rewards_admin_demo.md). Live school deployment and advanced pathways still require the acceptance checks below. The continuation context is in [the Claude handoff](../CLAUDE_SCHOOL_REWARDS_HANDOFF.md).

## Improvements from this review

- Optional practice customization stays hidden until opened. The practice page explains the four roles and offers an opt-in tour and five-minute demo guide.
- Admin section links and unfinished checklist buttons open the relevant screen and preserve keyboard focus. Advanced sections start collapsed; catalog stock actions open the inventory section.
- Student search no longer rebuilds results when losing focus, preserving the first click on a student. Clicking an already selected single-student tile keeps it selected.
- Tour timers cancel cleanly on exit or superseded steps, and mobile tour positioning respects bottom navigation.
- **Built-in help (2026-09-04).** A Help button in the portal header opens a role-aware guide inside the portal: the two kinds of points, who does what, finding and verifying a student, the two-step checkout, and setup ownership, with links to the manual, quick cards, and practice page. Sections show only for the signed-in role and every string is in the Spanish pack (918/918). Screenshots: `scratch/school-rewards-help-{staff,staff-es,admin,student-phone}.png`.
- **Open is not always open right now.** The Store tab now says in words when a window is set to Open but its start time has not arrived (and when checkout opens) or its end time has passed. The first-week checklist hint explains Preview versus Open and the schedule. The Overview's "How this pilot works" gained a fourth line separating spendable balance from growth levels.
- **Manual and quick cards refreshed** (`school-rewards-manual.html`, `school-rewards-quick-cards.html`, both mirrored): finding a student, two-step checkout, Open-but-scheduled windows, the collapsed Admin layout with checklist buttons, the two numbers a student sees, the Demo guide, the Help button, and the English-only practice wrapper. Reviewed date moved to September 4, 2026.
- **Manual visuals (2026-09-04, second pass).** Section 1 gained an accessible inline SVG of how points move (award → available balance → checkout; award → growth level; title/desc for screen readers; theme-aware via CSS variables) and an "If you get lost, press Help" paragraph. Section 5 gained a three-column "Shopping day at a glance" box. Four figures were captured fresh from the practice page with `scratch/school-rewards-manual-capture.cjs` and converted to 1180px JPGs in `school-rewards-manual-assets/` (mirrored): the practice page with the demo guide open (replaces 09), the built-in Help panel (10), the Admin tab with the collapsed layout and a checklist action button (11, replaces the stale 07 figure in the text; the 07 file remains), and the Store tab for a window set to Open before its start time (12). Diagram and box were rendered in light and dark and inspected.
- The award confirmation notice no longer doubles the period after an abbreviated surname (“Points recorded for Avery R.”). A seventh onboarding regression covers the notice text and its Undo button.


- Shopping-window saves send explicit UTC instants while their editors display local time. Status changes retain exact stored dates, including seconds and repeated clock hours. Invalid dates, reversed ranges and clock-change gaps are rejected locally.
- Saved print quotes retain their deadlines, override decisions, explanations and intentionally blank review fields. New quote defaults use the operator’s local time. Material/time estimates reject invalid values instead of silently rounding or substituting zero.

- The practice-page builder writes UTF-8 bytes without Windows newline conversion and avoids truncating synced files before opening them for updates. Both generated copies are checked for complete scripts, the full guided tour and deployment parity.

- Administrators can resume a private remix from its integrity-report row using only the original signed student intent. Altered or duplicate request records and missing, changed or duplicate files remain blocked; separate audit events record the administrator while preserving student attribution.
- Pending remix requests now contribute to the integrity report’s pending-operation count, and invalid remix signatures are reported explicitly.
- After administrator recovery, the original student can clear the stale retry state through a read-only status check on refresh, only after completion is confirmed and the recovered model is visible.
- A later coded rejection cannot discard an earlier uncertain request, including after a page reload. Known first-attempt validation errors release the form for correction; unknown outcomes retain the original key. Quote expiration and whole-number point limits are checked before submission.

- Private recipe remixes use a signed recovery record, a stable model ID and verified file reuse. Interrupted requests retain their original retry identity; ambiguous or conflicting files require administrator review.
- Print Lab, publication/moderation and guardian actions suppress overlapping submits and retain exact request keys after lost responses. Changed drafts cannot silently become new actions while the original is unresolved.
- Full and store refreshes stage results before rendering; older responses and errors are ignored. Checkout stops if another refresh supersedes its availability check.

- Confirmed changes throughout rewards, refunds, Print Lab, roster/member administration, school settings, windows, email scheduling and records workflows retain their completion message if the following refresh fails. Refresh saved changes performs only reads; genuinely uncertain requests keep their original retry behavior.
- Prize and stock editors immediately display the values returned by a confirmed save.

- Print handoff, binary-asset, and SIS file imports keep only the latest selection; stale reads and errors cannot overwrite it or restore a cleared selection.
- Partial group awards retain recorded/failed counts, warnings and the original retry key even if refresh fails or is retried.
- Roster preview/apply lock the selected import and suppress duplicate requests while running. Failed applies retain the original confirmation and idempotency key for retry.
- Print submission locks its draft during registration/upload/submission and suppresses duplicate clicks.
- A Print Lab loading failure no longer prevents core rewards and administration from rendering. An explicit retry control restores Print Lab; unavailable Print Lab content remains hidden.
- The catalog publication and private-remix pathway was verified end to end, including the existing permission normalization.
- Complete portal-to-repository tests now exercise role navigation, recognition-to-refund, recipe-to-print-refund, publication-to-remix, and administrative SIS/mail/report/year workflows.

## Deployment boundary

These are local source and packaged-file improvements. Updating this repository does not update an existing Apps Script deployment. Publish a new version of the school-owned deployment after copying the updated package files. Existing schema-v6 repositories need no schema migration for these changes; older repositories must follow the documented migration order.

SIS support is an approved JSON snapshot workflow, not a live vendor connection. Printer actions record workflow status; they do not send commands to a printer. Guardian consent and physical print review remain school responsibilities.
