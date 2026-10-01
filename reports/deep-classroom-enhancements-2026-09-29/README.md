# Classroom workflow enhancements

Completed a deeper pass on the remaining K5 classroom and family-workflow gaps. Changes remain uncommitted.

## Behavior

- Family and independent learner progress now occupies the main workspace. Closing it returns to the saved source text. The compact phone header offers progress directly.
- Family member selection displays that person's saved session history, with dates, response counts and opened-resource counts. Device-wide activity totals are labeled separately. Missing or damaged session fields show an unknown value. Long histories have a Show more control, and selection resets when a member is removed.
- Weekly word accuracy excludes tracing and other ungraded practice, matching the main accuracy summary. Practice still counts toward volume, and future-dated words do not inflate this week's score.
- Flashcard audio stops click propagation immediately and waits for its module. Requests that lose their playback session or card context are discarded. Only the latest pending click can start playback.
- Document auto-continue waits for its module and rejects superseded, stopped or changed-document requests before starting a round.
- The progress heading receives keyboard focus. Details exposes its expanded state and controls a real hidden panel. Family selection exposes its pressed state. Touch targets are at least 44 pixels high, and the family selector follows the active theme.
- The progress download button describes the local file download. Ten progress labels are localized in English, French, Latin American Spanish and Arabic.
- Teacher components are now included in the theme generator's main-workspace scope. AppStyles, Teacher and Header modules were rebuilt with their individual builders. The maintained validation selection and its input manifest include the new coverage.

## Verification

- **145 distinct targeted assertions pass across 14 files.** The combined run recorded 144 passes and one test that still selected the previous Close Dashboard label. Correcting the selector produced a clean 13/13 browser-module recheck. The other 132 assertions remain supported by the combined run. Raw reports are retained in final-tests.json and browser-recheck.json.
- Six styled Chromium cases passed at 320 or 1280 pixels across light, dark and contrast themes, including French and Arabic. Each had no horizontal overflow and zero reported axe violations. Screenshots were also inspected; that review caught and corrected a pale gradient in contrast mode that the initial axe run did not flag.
- Full local app flows passed for family mode at 1280 and 390 pixels and independent learning at 1280 pixels. Each verified placement in main, absence of the empty workspace panes, keyboard close, retained source text and no page exceptions. The phone check uses the compact dashboard shortcut. See full-app-results.json and full-app-parent-390.png.
- Six intentional regressions were rejected by their intended assertions: stale audio context, stale document generation, ungraded weekly scoring, an unscoped family selector, progress outside main and a hidden phone dashboard control. Candidate files and request interception were used; shared source files were never mutated.
- The first weekly mutation exposed a substring assertion where 90% satisfied 0%. The assertion now compares the complete score, and the mutation fails correctly. Initial proof reports remain available alongside the final proof reports.
- Final audit: all three host copies parse and match; Teacher, Header and AppStyles public mirrors match; surrounding Teacher source and AppStyles CSS are preserved; generated theme CSS is current; translated keys match their mirrors; and zero declared inputs changed during the final recheck.
- Focused render-reference checks passed for Teacher, Header and AppStyles. Existing parent-mode coverage passed for all 63 packs and five established keys.

This is targeted local verification. Live AI rehearsal and the normal shared-tree release validation remain separate work.

## Evidence and recovery

completion.json summarizes the final result. Before-images and hashes are under before/ and before.json; own-changes.patch compares those saved working-tree inputs with the result. New maintained tests are in tests/k5_deep_action_readiness.test.js, tests/dashboard_progress_workspace.test.js and tests/learner_progress_scope_browser.test.js.

Proof details are in proof-results.json and compact-header-proof.json. Full app harnesses and their verification-only shell are under C:/tmp/alloflow_dispatch/wave2/deep-classroom-2026-09-29/. No normal application build, Git staging, commit, push or deployment was performed.
