# History recovery enhancements

Completed locally on September 29, 2026. Changes remain uncommitted.

## Result

- Opening a History resource waits for its handler and the shared sentence, interactive-text, and glossary helpers. Cold-start reading opens now render successfully.
- The selected row shows a loading status and exposes aria-busy. Repeat clicks on that row are ignored; another resource can still be selected.
- Only the latest selection opens. Navigation, source changes, role/session changes, and unmounting cancel an obsolete pending open.
- A failed module load clears the loading state and supports an explicit retry.
- Missing resource types, incomplete book/set/manipulative metadata, and empty or malformed transcripts are rejected before workspace, visited-state, or live-follow changes. Valid transcript text and titles are recovered from usable saved fields.
- Recovery messages were added in English, French, Latin American Spanish, and Arabic.

The original synchronous restore wrapper remains intact for existing callers. Tests cover homework recovery, the unsaved reading-support confirmation, saved source/support payloads, resource ordering, move-to-unit controls, and Learning Web behavior.

## Verification

| Evidence | Result |
| --- | --- |
| Targeted unit and actual-module UI checks | 180 passed across 11 files |
| Full local app workflows | 6 passed |
| Isolated regression mutations | 10 intended assertion failures detected |
| Final source/artifact/scope audit | 24 passed |
| Final declared input snapshot | 34 inputs; zero changes in the final check interval |

The browser ran the current full local host, actual built modules, the bundled React runtime, real compiled styles, and the real offline-history hydration path. Service workers were blocked. The workflows covered latest selection during a delayed load, departure to a new workspace source, failed loading followed by retry, incomplete book/transcript recovery, a 390 px phone layout, and delayed reader dependencies. No page errors, unhandled rejections, or component crashes occurred in the passing runs. Background remote metadata requests returned HTTP 400; the deliberately failed-load workflow also records its injected network errors.

Screenshots were inspected: the row status is visible on desktop and phone, and incomplete records show the recovery message while retaining the source.

## Files and scope

Canonical host: AlloFlowANTI.txt and its two desktop source mirrors. Scoped modules: misc_handlers_source.jsx and view_history_panel_source.jsx, with current root/public builds. The three new regression files are registered additively in dev-tools/remediation_validation.json.

The host matches the saved working-tree preimage after removing this pass's History bridge and two props. Misc source outside handleRestoreView and History source outside the targeted edits are preserved. Built output matches both scoped builder recipes. All five handler/render-helper module pairs match their public mirrors.

Language banks received concurrent STEM additions and translations during this pass. They were preserved. All existing History labels plus the two new messages match the intended changes. The pre-existing nine unrelated English root/public differences remain recorded in final-audit.json; whole English-bank parity is not claimed. own-changes.patch isolates this pass's production edits against saved preimages and excludes concurrent STEM work.

## Evidence files

- final-targeted-tests.json: final 180-check result.
- full-app-results.json: six passing browser workflows and verified host identity.
- regression-proofs.json: ten isolated candidates; shared sources were never mutated.
- final-audit.json: syntax, parity, builder output, scope, labels, selection, and stability checks.
- locale-audit-differences.json: concurrent changes outside this pass's History messages.
- before.json, before/, intervening/: guarded preimages and concurrent edits discovered before implementation.
- full-app-attempt-1.json through full-app-attempt-4.json: initial browser attempts, retained for review.

Initial browser attempts exposed three real cold-start helper failures, all addressed by the final dependency wait. Initial harness corrections covered the phone's workspace History tab, source-field visibility after switching tabs, and the existing transcript-title suffix behavior. The scratch audit needed explicit dependency paths and hashbang removal when evaluating builder scripts. The first mutation audit incorrectly treated Vitest's runWithTimeout stack frame as a timeout; the final audit checks actual timeout errors and assertion failures. Raw attempts are retained, and none count toward the passing results above.

## Reproduction and limits

Run the three new History tests with Vitest; the full targeted file list is recorded in final-targeted-tests.json. The verification-only server and browser scripts live in C:/tmp/alloflow_dispatch/wave2/history-recovery-2026-09-29. They create a current local /app/ shell without changing shipping assets. The preview server was stopped after verification.

This pass verifies local saved-resource recovery. It does not claim API-backed generation, live classroom synchronization, the whole repository release gate, or a deployment. Other synchronous restore callers retain their current behavior and remain candidates for further startup-readiness review.

After the final audit, the English banks received further concurrent edits. post-report-check.json confirms unchanged application code and unchanged History/common labels. The zero-change input count above applies to the final audit interval.
