# Claude handoff: School Rewards & Store
Updated: 2026-09-04

## User request and stopping point

The user has repeatedly authorized reviewing, fixing, and improving the School Rewards/store tool across its pathways. Their latest product question was whether it is ready for a small administrator demo, and whether onboarding, clarity, ease of use, or visual polish needs work.

Their latest instruction is to prepare this handoff so Claude can take over because Codex quota is nearly exhausted. Continue from this state; do not restart the review or repeat completed work.

**Assessment:** ready for a small guided demonstration of fictional rewards/store data. The final browser walkthrough passed through Staff → Student → Cashier → Administrator. This is not certification of a live school deployment. No live school data, emails, deployment, or printer operations were used.

## Workspace and working rules

- Repository: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
- Windows, PowerShell; Node v24.11.1; Vitest 4.1.5; Python and Playwright are installed.
- The worktree contains extensive unrelated and concurrent changes. Preserve them. Do not reset, clean, overwrite, or commit the entire worktree.
- No commits or deployments were made for this review.
- User prefers action over repeated permission questions. Continue bounded local fixes and checks. Ask only for missing information or genuinely required approval.
- No subagents were requested. Do not delegate unless authorized.
- Markdown is the appropriate format for this coding handoff; no Word artifact was requested.

## Changes completed in the final demo/onboarding pass

Main source: `apps_script/school_rewards/Portal.html`.

1. Added a global `[hidden]{display:none!important}` rule. The practice Customize panel had `hidden` set but its CSS `display:grid` overrode browser hiding, exposing more than three screens of advanced setup before the tool.
2. Admin setup now opens with First-week checklist and School settings expanded, with the other 17 sections collapsed. Section index links expand their destination, update toggle state, scroll there, and focus its heading.
3. Incomplete first-week checklist steps now have buttons opening the appropriate setup section or Award/Store tab. Administrators count as register-capable, and inactive-only recognition categories no longer count as configured.
4. “Adjust stock” from a catalog item expands the separate inventory section before focusing its current-stock summary.
5. Fixed two student-picker usability bugs:
   - Clicking an already selected single-student radio tile keeps it selected. Group-mode checkbox toggling remains unchanged.
   - Search fields now update on `input` only; grade/homeroom selects update on `change` only. Previously both events rebuilt results. Blurring search while clicking a student replaced the target between pointer-down and click, silently losing the first click. This was reproduced in a real browser.
6. Added English/Spanish catalogue entries for the new checklist actions. Portal Spanish coverage is **858/858** catalogue entries.

Practice source: `dev-tools/build_school_rewards_practice.py`.

7. Added a compact system introduction, role explanation, native expandable “Five-minute administrator demo,” and toolbar “Demo guide” button.
8. The tour starts only when requested, keeping Overview stationary while the presenter introduces the system.
9. Pending tour timers are cancelled on exit/Escape or superseded steps, preventing a delayed popup from reappearing after exit.
10. On phones, the practice toolbar scrolls normally. The tour measures and stays above the bottom tab navigation; section scrolling accounts for the desktop toolbar.
11. The guide explicitly identifies fictional browser data, simulated emails/receipts, and the separate live deployment/Print Lab checks.

Both root and desktop practice pages were rebuilt. Portal and practice mirrors match.

## Demo route and verified results

Presenter guide: `docs/school_rewards_admin_demo.md`.
Practice page: `school-rewards-practice.html`.

Use a fresh **Shopping day** scenario. Scenario changes/reset discard practice transactions; switching roles preserves them.

1. Staff → Overview: explain roster, circulating points, open store, prizes, and the four roles.
2. Staff → Award points: search Avery, select Avery R., award 20 points in Helpful with “Included a classmate in the group.”
3. Student → Overview, then Progress & activity: show Avery’s balance and recognition. Browse Store.
4. Cashier → Store: select Avery in the student dropdown, add one Front-of-line pass at 15 points, review and confirm checkout.
5. Administrator → Admin setup: show the checklist and use section links for access, prizes, inventory, and shopping windows.

Real browser verification of the final generated HTML:
- Avery starts at 9, increases to **29**, then decreases to **14** after checkout.
- Front-of-line pass stock decreases from **20 to 19**.
- Role switching preserves awards and orders; student activity shows the exact feedback.
- Admin checklist reaches complete; 17 of 19 admin cards start collapsed.
- At 390 × 844, document width is 390 (no horizontal overflow), toolbar is static, and tour bottom is 721 while navigation starts at 733.
- No page JavaScript errors.

Visual QA screenshots, all inspected:
- `scratch/school-rewards-demo-after-staff.png`
- `scratch/school-rewards-demo-after-admin.png`
- `scratch/school-rewards-demo-after-mobile.png`
- `scratch/school-rewards-demo-after-mobile-tour.png`

The visual style is adequate for this small guided demo. Further redesign is not a prerequisite. Gather administrator feedback before adding more screens.

## Tests and evidence — read carefully

New tests: `tests/school_rewards_onboarding.test.js` (6 integration tests using the complete generated practice page). They cover optional hiding, stationary introduction, guide focus, section expansion/focus, stock navigation, actionable checklist truth, preserved student selection and search-blur DOM stability, and cancelled/superseded tour steps.

Updated `tests/school_rewards_plain_language.test.js` to expect an opt-in tour and demo guide.

Latest successful affected check:
```powershell
npx vitest run tests/school_rewards_onboarding.test.js tests/school_rewards_print_portal.test.js tests/school_rewards_portal_features.test.js tests/school_rewards_practice.test.js --pool=threads --maxWorkers=1 --testTimeout=120000 --reporter=json --outputFile=scratch/school-rewards-demo-verified-results.json
```
**171 tests passed across 4 files, exit code 0.** This ran after the final search-blur fix and final rebuild.

Earlier broader command:
```powershell
npm run verify:school-rewards -- --pool=threads
```
All **491 pre-existing tests across 15 files passed**, but the command exited 1 because the host timed out while starting the new onboarding worker. The new tests were subsequently run successfully in the final 171-test check. Thus 497 distinct cases are covered across the broader run and affected reruns; do not claim one clean 497-test invocation.

Host load was erratic. Some other attempts hit worker startup timeouts, and one onboarding attempt exceeded 60 seconds. The latest affected run passed with 120-second per-test limits. JSON `success` can be true despite a worker-start failure reported in console; check command exit codes and console as well as assertion totals.

Relevant reports:
- `scratch/school-rewards-demo-verified-results.json`: final 171/4 success.
- `scratch/school-rewards-demo-final-results.json`: 491 existing tests, see worker caveat above.
- `scratch/school-rewards-practice-final-results.json`: independent 8-test success.
- Older `*-results.json` files can represent stale builds or interrupted runs; do not mistake them for the latest state.

Browser check:
```powershell
node scratch/school-rewards-demo-browser-check.cjs
```
Latest exit code: 0. It creates an isolated headless Chromium and an ephemeral loopback HTTP server serving the final HTML from memory, exercises the guide, captures screenshots, and closes both. It contains diagnostic selection/award logs from debugging; these are test output, not product UI.

Catalogue audit reported zero missing strings. Seven deployment files, generated-page parity, and script parsing were verified before the last small picker changes; final Portal/practice parity was rechecked afterward. A final scoped whitespace/parity check is reasonable when continuing.

## Build and environment pitfalls

Canonical package:
- `apps_script/school_rewards/Code.gs`
- `apps_script/school_rewards/Portal.html`
- `apps_script/school_rewards/README.md`
- `apps_script/school_rewards/portal_strings.json`
- `apps_script/school_rewards/i18n_src/es.json`

Mirrors: same paths below `desktop/web-app/public/`.
Generated practice pages: root and `desktop/web-app/public/school-rewards-practice.html`.

Usual builds:
```powershell
node _build_school_rewards_i18n.js
python dev-tools/build_school_rewards_practice.py
```
Regenerate practice after changing Portal, language packs, or the practice builder. Keep canonical catalogues and deployment mirrors synchronized.

OneDrive/sandbox issues:
- Ordinary shell calls often hit ACL failures; elevated local calls worked. One automatic approval review timed out; the allowed retry succeeded. No action remains blocked by approval.
- Python practice generation intermittently fails at `output.truncate()` with PermissionError after writing, potentially leaving an old trailing suffix. Always verify complete output and mirror parity.
- Existing-file Node `r+` writes followed by `fs.ftruncateSync` worked. A fallback preserving the Python generator is saved as `scratch/rebuild-school-rewards-practice-with-node.cjs`. It executes the builder through page generation, then writes both outputs through Node handles.
- For i18n rebuilds, the same Node existing-file write wrapper may be necessary around `fs.writeFileSync` before requiring the builder.
- Native CUA APIs were disabled; CUA startup failed, and the shared Chrome DevTools profile was already in use. Do not stop another task’s browser. Isolated Playwright worked.
- The older Python preview server at `127.0.0.1:58176` became unreliable. Do not use that URL as a validated demo link. The successful browser test uses its own ephemeral server.
- Old local helper sessions may still exist; do not terminate unrelated processes. Only clean up clearly identified helpers from this task.

## Earlier improvements already present — preserve them

See `docs/school_rewards_readiness.md` for the broader pathway matrix and history. Previous passes already addressed:
- UTC serialization with local schedule editors, exact saved timestamps through status changes, invalid/reversed/clock-change dates, saved print quote deadlines and review metadata.
- Signed, resumable private remixes, administrator recovery, student read-only settlement checks, and integrity reporting for pending or tampered operations.
- Stable exact-retry keys, duplicate-submit guards, uncertain outcome preservation across later errors/reloads, and confirmed-save versus failed-refresh handling.
- Stale refresh ordering; group awards, checkout, finite inventory, catalog saves, mail outbox recovery, SIS import, and file-upload race protections.
- Role boundaries and integrated rewards, store, print, moderation, guardian mail, SIS, reporting, and year rollover tests.

## Remaining work / suggested next steps

1. Read this handoff and the presenter guide. The immediate user goal is a small demo; avoid an open-ended feature spree.
2. Finish any desired final scoped checks and update the readiness report if needed. Re-run the full release command only if new code or unresolved test concerns justify it.
3. Use the fictional demo with administrators and collect where they hesitate: finding a student, explaining progress versus spendable points, checkout confirmation, and ownership of setup.
4. Optional polish after feedback:
   - Practice controls and the new practice introduction/guide are still English. The live Portal catalogue’s Spanish coverage is complete, but do not describe the entire practice wrapper as fully bilingual. (Manual section 12 now says this explicitly.)
   - ~~The award notice produced “Avery R..” with a double period.~~ Fixed 2026-09-04 (Claude): `offerUndo` in `Portal.html` collapses the doubled period when the student label already ends in one; mirrors and both practice pages rebuilt; regression added as the seventh test in `tests/school_rewards_onboarding.test.js`.
   - ~~The checklist evaluates stored window status rather than whether a scheduled window is open right now.~~ Addressed 2026-09-04: the Store tab note names a window that is set to Open but outside its schedule (`{1} is set to Open, but shopping has not started yet. Checkout opens {2}.` / `{1} has passed its end time…`), the checklist hint explains Preview vs Open and the schedule, and the built-in Help panel has an entry for it. Checklist label text unchanged (pinned by `school_rewards_plain_language.test.js`).
   - Review the amount of introductory copy on small screens if mobile demos become common.
5. Before real school use, complete the actual Google Workspace sign-in/role tests, roster/ownership/timezone setup, test purchase/refund and email delivery, and school-specific acceptance in the readiness matrix.
6. Keep Print Lab hidden for this short demo. Practice stubs do not implement every advanced operation; integrity and receipt/email statuses are simulated. Printing, moderation, guardian communications, SIS, and recovery require a configured deployment and separate checks.

No further demo-facing blocker was identified after the final browser walkthrough.

## Claude continuation (2026-09-04)

- Verified all seven canonical/mirror school-rewards files and both practice pages byte-identical before and after the change.
- Affected suites: 172 passed across 4 files with `--pool=threads`; the onboarding worker timed out at startup in that run (host load, not a test failure). Onboarding rerun alone: 7 passed with `--pool=forks`. When threads workers refuse to start, `--pool=forks` has been the reliable fallback.
- Re-ran `node scratch/school-rewards-demo-browser-check.cjs` against the rebuilt page: exit 0, balances 9 → 29 → 14, stock 20 → 19, 17 of 19 admin cards collapsed, checklist complete, 390px mobile with no overflow, no page errors.
- Still uncommitted, as before. Nothing was deployed.

## Claude continuation 2 (2026-09-04): built-in help, clarity pass, manual refresh

- `Portal.html`: `#help-toggle` button beside the language menu; `#help-panel` (role-gated via the existing `data-awarder` / `data-checkout` / `data-admin` attributes plus a new `data-student` gate added to `render()`); Escape and Close return focus to the button. Store-window note for Open-but-scheduled windows; checklist hint; Overview line 4. 60 new catalogue strings via `node dev-tools/school_rewards_portal_catalogue.cjs --write`, Spanish written into `i18n_src/es.json`, packs rebuilt with `node _build_school_rewards_i18n.js` → 918/918.
- Practice builder: welcome paragraph mentions Help; the five-minute demo guide gained an Orient step. Both practice pages rebuilt via `scratch/rebuild-school-rewards-practice-with-node.cjs`.
- Manual + quick cards updated and mirrored (see readiness report for the list). The teacher guide chapter 20 still does not mention School Rewards although the manual says it is part of the Leadership Hub; left alone because that guide has its own build and chapter 19 is mid-edit by another session.
- New tests in `tests/school_rewards_onboarding.test.js`: help toggle/gating/links/Escape, student and cashier gating plus Spanish translation of the panel, scheduled-window note. Browser check: `node scratch/school-rewards-help-browser-check.cjs` (exit 0; no page errors; phone width 390 with no overflow; Spanish panel has no English left).
- Manual visuals pass (same day): inline SVG points-flow diagram + "Shopping day at a glance" box + four fresh figures (09 replaced, 10–12 new). Capture: `node scratch/school-rewards-manual-capture.cjs` (crops portal shots below the sticky practice bar; the scheduled-window shot mutates the practice repo then clicks Refresh live availability rather than reloading, because the practice ledger does not persist that mutation across a reload). Render check: `node scratch/school-rewards-manual-render-check.cjs` (light + dark). No Portal code changed in this pass; no tests needed rerunning.
- Test evidence for this pass (all `--pool=forks --maxWorkers=1 --testTimeout=120000`, one file per invocation because parallel worker startups time out on this host): onboarding 12/12 (incl. 3 new), plain_language 7/7, portal_i18n 6/6, portal_packs 25/25, portal_features 18/18, pathways 12/12. Browser check `scratch/school-rewards-help-browser-check.cjs` exit 0. Catalogue: 918 entries, Spanish 918/918, `school_rewards_portal_catalogue.cjs` reports 0 missing.
