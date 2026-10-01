# Tyler integration: fixes and verification

## Result

The implementation candidate is in `C:/tmp/tyler_integration_candidate`. It combines current main's captured working state, Tyler's onboarding branch, Claude's review refinements, the completed roster continuation, and the fixes below. The review checkout at `C:/tmp/tyler_onboarding_review` also contains the label and role fixes.

This is an uncommitted integration candidate. Main application files were not overwritten. Nothing was committed, pushed, or deployed. Main is shared with other active chats, so its current files must be compared with the saved snapshot before applying the candidate.

## Fixed behavior

- A refused private-label save retains the previous durable label and the editable draft, and displays an error. A successful retry clears that error.
- A refused clear or migration retains the old state. Removing a learner stops when that learner's private label cannot be removed. Removing an unlabeled learner does not require an unrelated label write.
- Failed writes do not claim that another class's private labels were evicted.
- An open label draft is bound to its original class and learner ID. A roster replacement or class switch invalidates that draft with a warning, preventing an old note from attaching to a different learner. A failed save remains retryable for the same learner. This additional fix is in the integration candidate; it was not copied back to the earlier review checkout.
- Role selection uses a shared transition that clears incompatible Family, Independent, and Guided flags. Specialist entry follows that transition too.
- Access-code completion retains the requested workspace; cancel clears the pending choice. Session resume records the actual role and restores Guided/full workspace and Guided progress.
- Family adult behavior controls disappear in child view.

The new private-label failure and identity-change messages, plus the missing Family header labels, are registered in the English catalog and mirrored public catalog. Translation of the new messages remains separate release work.

## Source reconciliation

The baseline is main `42188dba9a920270b4a88c039bee8d7f2933e996` plus 877 captured working files. Tyler's tip is `d7bb1b940d2c96c91517f50f204ba76cfaf73035`; their common ancestor is `efed3b8d6fee9d7d72a4fbe8919bb0835d2ead16`. Canonical changes from the reviewed Tyler checkout were reconciled against that baseline.

- The SourceInputShell host and component retain both Tyler's `guidedMode` and main's selected-document and documents-only controls.
- Main's accessible button names are retained alongside Tyler's AI availability behavior.
- Lazy loading, module promotion, and retry behavior are retained with main's current module versions.
- Main's build toolchain is retained. Thirteen changed modules were rebuilt from source, Classroom assets were rebuilt, and the host was generated from `AlloFlowANTI.txt` using the development shell build.
- All 120 reconciled source/test paths were checked for unresolved conflict markers. Both host JSX files parse. All 19 checked root/public asset pairs match.

The candidate uses a sparse checkout to avoid copying large unrelated media. Its `node_modules` directories are junctions to main; do not recursively delete them. The final manifest and compressed file archive preserve the reviewed integration independently of the temporary checkout.

## Verification

- Integrated roster and onboarding: **275 passing tests** across fifteen suites after targeted retries and the three draft-identity regressions. Four suites initially timed out while starting workers and then passed all 102 tests. One stale dashboard assertion was replaced with evaluation of the actual Teacher/Independent/Family routing guards; that suite passed all eight tests.
- Four previously failing host/roster wiring suites: **46 passing tests**. Two initially failed to start workers; a fresh run completed their 13 tests successfully.
- Guided Mode with main's own-source controls: **24 passing tests** across four suites, exercising the real host callback and generated components. See `own-source-verification.md`.
- Additional changed runtime/accessibility suites: **268 passing tests and one existing skip** across fifteen suites. See `runtime-a11y-verification.md` for missing-fixture repairs, catalog keys, and updated actual-panel assertions.
- Total across those 38 distinct suites: **613 passed, one existing skip**. Counts use each suite's final completed result, excluding diagnostic failures and duplicate reruns.
- The final draft-identity change passed **87 tests** together: private labels (37), linked sync (17), and safe roster updates (33). Both draft-transfer regressions failed against the old module before the fix; see `private-draft-verification.md`.
- The repaired End session regression detects a deliberately removed callback in a scratch copy; live source was re-read after the check.
- Before integration, twelve new private-label regressions reproduced the failures. Five temporary mutations were detected by the new label tests. Role and child-view regressions also failed before their fixes and passed afterward.

The real generated app passed **seven distinct launch/role browser checks**. These cover role cards, accessible names/descriptions, keyboard focus and Student expansion, full Teacher workspace reload, fresh Specialist persistence, Family to Specialist, and Guided Teacher to Specialist including reload. The first run had stale test assumptions: Specialist correctly stores a null workspace (workspace is Teacher-only), and the Teacher editor locator had changed. The corrected targeted rerun passed all five selected tests; the two other distinct checks passed in the initial run. Initial failures are retained. See `browser/` for evidence and exact scope.

Seven storage checks also passed in Chromium using the final generated teacher module in a minimal React host with a fictional roster: denied save, retry, denied clear, denied learner deletion, reload after failed clear, reload after successful clear, and learner-ID replacement during an open draft. The fetched teacher module hash matches the final candidate. An in-memory mutation that ignored failed writes was caught; on-disk code was unchanged. Reports and screenshots are in `browser/labels-report.json`, `browser/labels-selftest-report.json`, and `browser/label-*-refused.png`.

Browser coverage is local and uses synthetic data. The label component harness complements the full-app role checks; it does not establish a complete production, mobile, RTL, or real-account Classroom release matrix.

## Evidence and handoff

- `integration-main-snapshot.json`: the main working files included in this candidate.
- `integration-merge.json` and `integration-preimages/`: reconciliation record and canonical preimages. Historical conflict counts in the merge record describe intermediate output; final source was checked separately.
- `integration-build.log` and `integration-build.json`: build commands, host parsing, and generated/public hashes.
- `integration-final-manifest.json`: final file hashes, predecessor hashes, and main drift at packaging time.
- `integration-final-files.tar.gz`: portable archive of the scoped final files and manifest.
- `integration-archive-verification.json`: all 222 archive entries (221 candidate files plus manifest) verified against their SHA-256 hashes. The archive is approximately 367 MiB and expands to approximately 1.00 GiB, largely because it preserves all affected language packs and mirrors.

Before a future merge, re-check main drift, reconcile any newer edits, and run the affected tests again. The candidate is a captured baseline, not a lock on the shared tree.

During verification, shared main changed in eleven overlapping paths: the canonical host and its two generated copies, the UI catalog and mirror, and Arabic, French, and Latin American Spanish packs and mirrors. These changes have not been overwritten. See `MAIN_DRIFT.md` and the final manifest before applying this candidate; it is ready for source review, not a blanket replacement of the current main tree.

The drift audit found no semantic conflict with the candidate fixes: one unrelated module cache stamp, 537 English catalog additions and four revisions, and 21 additions in each of those three language packs. Main's English source and public catalogs currently disagree on 655 plate-tectonics keys and one wording change. Preserve that active work explicitly during final release integration. Some live hashes changed again after packaging; `MAIN_DRIFT.md` records its later observation, and both records are snapshots.

Preparation and merge-resolution scripts in this directory record one-time reconstruction steps; do not rerun them over the finished candidate. The manifest identifies whether predecessor comparisons use exact working-file bytes or LF-normalized Git text.

## Remaining release work

The original audit identified stale translated class-code instructions and untranslated recovery messages. Those translations are not completed by these fixes. Google Classroom's checked-in configuration remains disabled; no real Google account or deployment was enabled or tested. A production release and live validation have not been performed.
