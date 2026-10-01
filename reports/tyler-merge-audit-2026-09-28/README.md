# Tyler onboarding and Classroom merge audit

This is the original audit. Follow-up implementation and integrated validation are recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md).

Date: September 28, 2026, America/New_York.

## Answer and current status

Yes. The Codex chat **Resume roster fixes** (`01a0ead7-c945-73e0-bad7-d78b308abbde`) continued Claude's roster work in `C:/tmp/tyler_onboarding_review`. Its saved `REVIEW_CONTINUATION.md` reports completion of that continuation, with **173 passing tests in nine roster suites**. I independently read the JSON result: 173 passed, zero failed.

That does **not** establish that the overall Tyler merge is complete. The continuation note explicitly says nothing was merged, pushed, or deployed. The checkout is detached at Tyler's branch tip, and Claude's refinements plus the continuation fixes remain uncommitted there.

### Verified Git state

| Item | Value |
| --- | --- |
| Main and live `origin/main` tip | `42188dba9a920270b4a88c039bee8d7f2933e996` |
| Tyler and live `origin/onboarding-redesign` tip | `d7bb1b940d2c96c91517f50f204ba76cfaf73035` |
| Common ancestor | `efed3b8d6fee9d7d72a4fbe8919bb0835d2ead16` |
| Commits unique to main / Tyler | 60 / 10 |
| Paths changed by Tyler since the common ancestor | 215 |
| Paths changed on both committed branches | 36 |
| Tyler paths also modified in the busy main working tree | 147 at the audit snapshot |

The overlap counts identify review scope; they are not counts of merge conflicts. Other chats are actively changing the main working tree. Remote tips were verified with `git ls-remote`, without fetching or changing refs.

The separate chat **Establish release baseline ownership** owns broader release integration. Its recent history does not establish that this Tyler candidate was included. An earlier archived chat, **Merge agent work into main**, integrated nine other Claude branches; its listed scope did not include Tyler's onboarding branch.

## What Tyler contributed

The ten branch commits, September 25 through 28, combine several product changes:

- Role-first launch choices and a clearer teacher entry into Guided Mode.
- A Class & Materials area that exposes class groups and created resources.
- A first-step path choice, a sample result, and a clearer Family starting point.
- Role-specific tool labels, including Reading tools for teachers.
- Google Classroom roster acquisition, a same-origin handoff to AlloFlow, and teacher-held keys for repeat synchronization.
- Private teacher labels separate from exported roster data.
- A more compact roster toolbar and helper-tab completion behavior.

These changes are worth retaining. They affect entry, navigation, identity persistence, and data exchange, so a clean textual merge alone is insufficient validation.

## Improvements already present in the review candidate

### Claude's roster review

The seven-item handoff addressed:

1. Closing a roster panel with a pending Classroom handoff, including telling the helper that nothing changed.
2. A visible, focused fallback when a browser blocks the helper pop-up.
3. Recovery instructions for linked imports, where downloading is unavailable.
4. Restoring Export JSON and Print worksheet to the everyday toolbar.
5. Prompting the teacher to save a newly created sync key and explaining why.
6. Re-reading device storage before updates, responding to other tabs, refusing a 21st sync key instead of deleting an older key, and warning about private-label eviction.
7. Storing private labels by learner ID so reusing a codename does not transfer the previous learner's label.

The nine English string registrations and both loose-end wording corrections had already landed before the continuing agent started.

### Codex's additional roster fixes

- Versioned, per-class migration metadata resolves single-word and hyphenated legacy codenames that could be mistaken for learner IDs.
- Failed sync-key saves, loads, and unlinks now report failure. A linked roster is not applied if its key could not be saved.
- Pending imports are rejected when the destination roster changes before confirmation.
- Two additional error strings are registered, bringing this handoff to eleven English roster strings.

### Onboarding refinements also present

Claude's uncommitted work aligns the spoken first step with Choose a path, prevents premature auto-advance, restores focus after Family/full-workspace entry, explains unavailable live sessions, avoids a premature welcome after a failed join, remembers the preferred teacher workspace, and gives families direct Home behavior tools rather than the educator hub.

Merging only `origin/onboarding-redesign` would omit these uncommitted review fixes. Copying the review checkout wholesale over current main would discard newer main work.

## Findings that still need resolution

### 1. Preserve both source-input contracts during integration

**Priority: high.** Both branches edit the same SourceInputShell wiring. Main supplies `selectedOwnSourceIds`, `setSelectedOwnSourceIds`, `documentsOnly`, and `setDocumentsOnly`; Tyler adds `guidedMode`.

The overlap is in `AlloFlowANTI.txt` and `view_sidebar_panels_source.jsx`. Selecting one side's entire line can remove document-only source controls or Guided Mode behavior. Integrate the combined props and component signature, then test both features together. The committed-main ANTI location is around line 40911; Tyler's is around 40809. The matching sidebar signature is around committed-main line 4333 and Tyler line 4372. Lines in the active tree can move.

The teacher-history and modal/panel loader changes also overlap main's CDN/version changes. Preserve the lazy-loading, promotion, and retry behavior and rebuild with the current main toolchain. Current `build.js` includes a broader content-hash pin list, including `firestore_sync_module.js`; bringing over Tyler's older toolchain or generated host would lose newer release work.

### 2. Private-label writes still ignore persistence failure

**Priority: high for data integrity.** In the review candidate's `teacher_source.jsx`, `alloWriteTeacherPrivateLabels` returns false when browser storage refuses a write or deletion. `updatePrivateLabels` ignores that result and updates the React state and reference anyway. A label can appear saved without surviving reload; a label can appear cleared while its old value remains stored.

This is separate from the sync-key failure handling the continuing agent just fixed. Saving, clearing, migration, and removal must honor the writer's result. Keep the draft available when a save fails, display a localized error, and verify the stored result before claiming a durable clear.

An isolated UI harness using copies of the unchanged candidate reproduced the problem: one successful-save control and three defect checks all passed. A quota-refused save disappears after reopening; a denied Clear reappears after reopening; a denied label removal during learner deletion leaves the label stored. No export or network leakage was demonstrated. The probe and JSON result are saved beside this report. Passing these diagnostic checks confirms the defect, not correct product behavior.

### 3. Role transitions can retain the previous role's restrictions

**Priority: high.** Executing the candidate's actual `chooseLaunchRole` function with state stubs reproduced two transitions:

- Family, then Start, then Specialist leaves `isParentMode` true.
- Guided Teacher, then Start, then Specialist leaves `guidedMode` true.

The Specialist branch returns before the normal role-reset path (`AlloFlowANTI.txt`, approximately lines 19173 through 19180). Return to Start does not clear those flags (`host_handlers_source.jsx`, approximately lines 9091 through 9116). The educator hub uses parent/independent flags to hide school-professional tools, so stale role state changes what the specialist can access.

The six-hour resume path also serializes a specialist as an ordinary teacher, and it does not restore Guided Mode. The new teacher-workspace preference affects the Launch Pad, but automatic resume bypasses that choice. These problems exist in the branch's transition design; they are not evidence that the continuing roster agent introduced them.

Use one complete role/workspace transition for launch doors, access-code completion, and session resume. Reset incompatible flags, persist the actual role, and preserve the intended guided progress. Add tests covering same-session transitions and reload, rather than testing each door only from a fresh default state.

There is also a candidate-introduced child-view concern: `homeBehaviorToolsAvailable` checks `isParentMode` and the callback, but omits `isTeacherMode` (`view_header_source.jsx:247`). The handoff to Student View changes `isTeacherMode` only, leaving the new Home behavior tools control available. This is source-confirmed and needs a rendered/browser check of the intended adult/child boundary; no private-data exposure was demonstrated.

### 4. Localization still contains contradictory instructions

**Priority: medium, required for a multilingual release.** Tyler's own `dev-tools/i18n_stale_after_onboarding_clarify_2026-09-25.md` lists stale translations. It records 61 packs that still describe a four-character class code. I verified that exact defect in the branch's Spanish Latin America and French packs, although the entry flow requires five characters.

The same two packs still refer to switching through a generic menu and typing a codename, while the revised UI uses Start & setup and codename pick-lists. These are functional instructions, not merely stylistic differences.

The eleven reviewed English roster strings are present in the review catalog but absent from main's catalog. None appears in main's 63 language packs; the original Tyler branch does not contain the three sampled new recovery keys either, and the review has no language-pack edits. Preserve the English fallbacks during integration and track translation completion separately. Do not claim registration in `ui_strings.js` means translation is complete.

### 5. Wider regression checks are not yet all green

The continuation establishes a strong focused roster result, but records existing failures outside it:

| Suite | Reported failures | Explanation in the continuation |
| --- | ---: | --- |
| `guided_host_wiring.test.js` | 7 | Tests inspect implementation moved into extracted modules; isolated original/current runs both show 20 pass, 7 fail. |
| `post_session_follow_up_planner.test.js` | 3 | Host-handler extraction mismatch; harness errors also recorded. |
| `roster_wiring.test.js` | 1 | Existing host-handler extraction mismatch. |
| `roster_session_history.test.js` | 1 | Old color expectation differs from unchanged source. |

Baseline failures help establish attribution. They do not prove the combined release works. Update extraction-sensitive tests to execute the real modules and host wiring, then rerun the affected suites on the actual integrated candidate. Do not erase failure coverage by weakening assertions or blindly refreshing snapshots.

This audit independently ran six focused onboarding suites with cache disabled: **91 passed and seven failed**. The five behavioral suites passed; all seven failures were in the already documented `guided_host_wiring.test.js` suite. This corroborates the continuation's narrower 71-test behavioral result while retaining the broader failures in the record.

### 6. Test the real startup and Classroom routes after integration

The continuation did not run a fresh real-browser session. Its component tests and mirror checks do not cover every application startup, remote-module, and cross-window interaction.

The existing `tests/e2e/02-launch-pad.spec.ts` still expects the old Guided Mode / Full AlloFlow / Learning Tools / Educator Tools cards. The new pad uses Teacher / Student / Family / Specialist. Update the browser assertions and test real focus targets; the existing keyboard check only verifies that AlloFlow remains in the page.

The helper's checked-in configuration is explicitly disabled (`enabled: false`, `reviewedDeployment: false`, empty client ID). Therefore code integration and live Google Classroom availability are separate completion criteria. Preserve the disabled configuration during this merge. Use the documented deployment review and an approved environment to test real-account access when that is in scope.

## Enhancements to prioritize after the blockers

1. **Replace small silent storage limits with explicit management.** The candidate safely refuses the 21st linked class, but a specialist may need more. Private labels retain only eight classes. Prefer an explicit class-management/archive flow and a storage budget; do not remove another class's labels as an incidental effect of saving a new one.
2. **Make recovery states clear.** Show whether a class is linked on this device, whether its key has been explicitly saved, and what the teacher can do after storage refusal or a stale confirmation. Do not imply that a downloaded roster contains the private labels or key.
3. **Keep entry paths consistent.** Exercise teacher Guided/full, Family, independent learner, specialist, student explore, and class-code entry from a fresh device and after returning to Start. Retain keyboard focus and role-specific controls across those transitions.
4. **Keep failure messages understandable in the selected language.** Prioritize class-code instructions, missing-backend guidance, key persistence, and import confirmation before cosmetic copy.

## Concrete integration and verification sequence

1. Capture the review candidate's tracked diff, untracked regression test, continuation note, and test report. Record file hashes. It is a detached, uncommitted checkout, so its branch name alone cannot reproduce the reviewed work.
2. Choose one integration owner and an isolated candidate based on the agreed current main state. Account for the active main working-tree edits before combining anything.
3. Integrate Tyler's canonical source changes and the reviewed fixes together. Resolve host/component prop unions and loader changes explicitly. Bring over new tests and the eleven catalog strings.
4. Address private-label persistence, complete role transitions and resume, and the incorrect class-code instructions. Re-run focused failure-path tests.
5. Regenerate modules, the host, public copies, and manifests using current main's build scripts. Verify freshness and source/output parity. Do not use generated files to overwrite canonical source.
6. Run the 173 roster checks, the reviewed onboarding checks, repaired wiring suites, source research/document-only tests, and the existing build/interface/localization gates appropriate to the changed files.
7. Run an actual browser matrix at desktop and narrow phone widths, keyboard-only and RTL: all role doors; Guided path selection/resume; source-document constraints; no-backend join; pop-up blocked; helper close; stale confirmation; two tabs; storage refusal; class limits; learner deletion/reuse; export and print privacy. Verify that the browser loads the candidate's modules.
8. Record the exact integrated commit and validation results. A commit/merge and any deployment require the user's explicit instruction in the chat performing them. After an authorized deployment, verify the live entry points and module versions against that exact candidate.

## Scope of this audit

This chat inspected chat history, repository history, current remote tips, source, diffs, documentation, and saved test results. Independent review agents examined onboarding behavior and integration conflicts. No production source was changed, no merge was performed, and nothing was committed, pushed, or deployed by this audit. New files in this report directory are the audit deliverable.

### Saved evidence

- `snapshot.json`: candidate file fingerprints and Git identifiers. Fingerprints describe the reviewed bytes; they are not a backup of the uncommitted source.
- `roster-continuation.md`: copied completion note from the continuing chat.
- `roster-tests.json`: the 173 passing roster tests.
- `private-label-storage.probe.js`: isolated UI diagnostic, intended to run with the candidate's test setup in a disposable copy.
- `private-label-storage-results.json`: normal-save control plus three reproduced persistence defects.

The private-label probe used a disposable folder at `C:/Users/cabba/AppData/Local/Temp/tyler-label-storage-audit-cebb9811cbc644518299c0e75951e825`. Its source/module hashes matched the candidate after execution. The review checkout's `node_modules` directories are junctions into main; do not recursively delete that checkout.
