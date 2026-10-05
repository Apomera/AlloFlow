# Geometry World Lesson Transition Persistence Follow-Up

Date: 2026-10-03. Read-only fourth-pass audit, except this report.

Status: **Open and deferred to a focused persistence pass.** No production change or new test was made for this finding. Existing save-helper tests do not establish that a failed autosave prevents a live workspace from being replaced.

## Finding

**High: changing worlds can discard the only current copy of a Free Build after autosave has explicitly failed.**

In `engine.loadLesson`, the preview camera is disposed, `flushWorkshopDraft()` is called without checking its result, workshop identity is cleared, and the world is then cleared. Failed persistence therefore does not prevent destructive replacement. Source: [core lesson loader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:11581).

The installed flush function returns a structured save result. `saveWorldDraft` intentionally returns `ok:false` for browser write failure, invalid/unavailable shelf storage, shelf capacity, validation failure, stale project version, or a project removed in another tab. It does not change the current project ID/version/signature on failure. The lesson loader immediately nulls those values anyway. Sources: [save result and ownership checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:986), [installed flush contract](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:1035).

Example: tab A updates a saved project. Tab B still holds its own newer unsaved geometry but an older project version. Tab B's autosave correctly refuses to overwrite A. Starting a guided lesson in B nevertheless clears B's live geometry, without preserving it as a variation or export. The current Home save notice is advisory only: [Home notice](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:3254).

Line references are an audit snapshot; nearby fourth-pass UI work can move them. Function names are the stable references.

## Failure Types And Existing Recovery

| Failure | Required semantics | Existing recovery |
| --- | --- | --- |
| Quota, unavailable storage, malformed shelf, shelf byte/block limit | Keep current world and existing shelf untouched. Do not label a download as browser autosave. | Live editable JSON export does not depend on localStorage. Retry after resolving storage; save a variation can still fail for the same reason. |
| Eight-project shelf full | Do not silently evict a saved project. | Export live JSON, remove an explicitly chosen other saved project, then retry. |
| Saved project changed in another tab | Do not overwrite the newer version, auto-refresh the current geometry, or remove the current project's identity to circumvent ownership checks. | Export current live JSON or explicitly use Save variation, which creates a new identity without changing the original project. |
| Saved project removed in another tab | Do not recreate the removed ID implicitly. | Export live JSON or explicitly save a new variation if capacity permits. |
| Invalid live geometry | Do not destroy it merely because the normalized draft cannot be saved. | Keep the world; report validation reason. Export validation may also fail, so download must not be promised unconditionally. |

Relevant paths:

- [Live JSON export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:635) reads current engine geometry, validates it, and downloads a Blob. It does not require shelf autosave. A download click is not evidence that the learner retained the file.
- [Save variation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:1014) is an intentional safe fork for a stale tab. Do not invoke it automatically to make a transition pass.
- [Open a shelf project](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:3425) already checks `saveWorldDraft(live)` and stops if it fails. This is the established fail-closed pattern. Its empty-project branch still needs to honor the future `loadLesson` result.
- Shelf removal has an explicit confirmation and disables removal of the current project. It is not an authorization to discard the current live workspace.
- Editable import has an explicit replacement confirmation and transactional memory recovery. It is not a general-purpose discard authorization for subsequent lesson changes.

The existing stale-tab message says to download and reopen the saved project, but reopening currently attempts the failing backup again. Download alone does not alter the stale version. An explicit continuation policy is needed to avoid either data loss or trapping the learner indefinitely.

## Smallest Safe Continuation Policy

1. Preflight at the central world-replacement boundary, **before any camera, selection, preview, identity, log, progress, or block mutation**. Flush the live draft once. Only replace after a confirmed successful result. Missing flush is acceptable during initial engine construction; the installed function returns `ok:true` outside Free Build and `ok:true, skipped:true` during a deliberate transactional restore. Exceptions must become a controlled failed transition, not a half-completed replacement.
2. Make success explicit and propagate it. A `true`/`false` return from `loadLesson` is compatible with existing boolean Home and sandbox launch bridges, but every caller must honor it. Reject an installed flush's malformed/unknown result rather than silently treating it as durable storage. Test doubles should implement the actual structured flush contract.
3. On failure, keep the current engine/world and current lesson identity. Show the actual reason in an accessible notice in the initiating surface. Keep **Stay here**, **Download current build JSON**, and **Retry** reachable. Do not close Home/editor/library, clear learning evidence, move focus into a replacement world, log a successful load, or start a practice record on rejection.
4. Offer **Continue without saving** only as an explicit confirmation that names the current workspace and intended target. It must be a one-shot authorization for that exact engine/current workspace/target, invalidated by any intervening edit or different transition request. It must not be persisted, reused, or interpreted as permission to overwrite a stale saved project. The old shelf remains unchanged. Never auto-continue after clicking Download.
5. Reuse that preflight for destructive `clearWorld` replacement routes, rather than guarding only `loadLesson`. Otherwise legacy peer-world imports still bypass the protection.

An initial hard-block-only guard reduces loss risk, but is not a complete learner flow under permanent storage failure. The scoped persistence pass should ship the checked caller contract and explicit continuation UX together.

## Caller Audit

All routes below currently need success propagation or preservation of their transactional exception. These references identify real calls, not just visible buttons.

| Route | Current ordering/risk | Source |
| --- | --- | --- |
| `loadLessonByKey` for authored, practice, saved AI lessons | Hides intro/reflection and clears measure history regardless of load result. Practice record begins before load. Saved AI metadata is patched unconditionally. Its engine-not-ready retry also needs a resolved success result without dismissing the initiating UI. | [lesson-key dispatcher](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:14932) |
| `startHomeLesson` / `startPracticeRound` | Updates active lesson, closes Home/intro/settings, switches HUD, takes world focus, and returns a success-like value independently of the dispatch result. | [Home/practice bridge](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:15323) |
| `finishGeneration` | Loads, saves generated lesson, switches active lesson, announces success, and awards XP. A generated lesson may still be retained in My Lessons on rejection, but generation success must not imply it replaced the current world. | [AI finish](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:15062) |
| Legacy lesson JSON file import | Announces and logs a successful import after unchecked load. Validated editable-world branch already handles `restoreEditableWorld` result. | [world import](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:16427) |
| My Lessons launch | Closes library and switches active lesson/editor metadata after unchecked load. | [saved lesson launch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:16868) |
| JSON editor Apply | Saves and announces application, changes active lesson, and closes editor after unchecked load. Preserve typed editor JSON if blocked. | [editor apply](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:16907) |
| Reset World | Resets prediction engine state, score, answered NPCs, objectives, and histories even if replacement fails. | [reset action](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:17066) |
| Completion Next / Replay / New round | Next changes active lesson before load. Replay clears persisted lesson answers before load. New round clears history/wrong-answer state before practice bridge. Defer these mutations until preflight succeeds while keeping completed-lesson records intact. | [completion actions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:17904) |
| Peer-world lesson / block import | Lesson branch ignores result. Legacy blocks branch calls `clearWorld` directly, bypassing the central loader, then both close the library and announce/log success. | [peer replacement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:18487) |
| `startSandboxMode` | Calls load, clears selection, updates world/lesson/HUD state, and returns true without checking load. Home blank-workspace buttons depend on its boolean. | [blank sandbox start](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:754) |
| `restoreProject` | Calls load then replays snapshot blocks/state/identity and consumes the return project. Must not replay into the unchanged world after a blocked load. | [return-project restore](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:1434) |
| `restorePendingEditableBuild` | Deletes pending intent/source before load and patches/announces success. Preserve pending payload if replacement is blocked. | [pending handoff restore](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:2371) |
| Builder mount / tool-switch resume | Falls back to unchecked blank-sandbox load after failed resume and then patches sandbox state. Distinguish no resumable project from a rejected transition. | [builder mount](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:3730) |
| `openShelfProject` | Existing backup check is correct, but empty-world fallback manufactures `{ok:true}` after unchecked load. Keep chosen project and selection unchanged on rejection. | [shelf open](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:3425) |

Initial default lesson creation calls the loader before autosave is installed; it must remain able to create the first world. [Default initialization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:14642).

## Preserve Existing Transactional Semantics

- `captureProject` ignores the flush result but still captures a complete **in-memory** workspace: current blocks, undo/redo, camera, local learning state, selection, and draft identity. Do not reject this snapshot merely because durable storage failed. Editable-import recovery and Print Lab return continuity depend on it. [Capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:1415).
- `restoreEditableWorld` deliberately sets `_workshopRestoreInProgress`; its flush returns `{ok:true, skipped:true}` to avoid writing a partly restored world. Preserve this exception and its rollback path. Do not add a guard that recursively blocks recovery or saves partial import geometry. [Transactional import](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:890), [recovery replay](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:810).
- `destroyEngine` also flushes without checking before destroying and clearing the live engine. A loader guard alone does **not** protect general app navigation/unmount. The host must approve navigation before unmount, or preserve a clearly identified volatile recovery snapshot; aborting disposal itself risks leaving listeners and rendering alive. Browser/tab closure cannot rely on a custom asynchronous modal. This is adjacent follow-up scope, not a reason to claim the lesson-transition finding solved. [Teardown](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:14655).

## Focused Verification Plan

Create `tests/geometry_world_lesson_transition_guard.test.js` during implementation. Use the real extracted `engine.loadLesson` and real builder `installWorldAutosave`/`saveWorldDraft`, not a mock loader that simply clears blocks. Use mounted core/builder surfaces for caller and notice/focus tests.

| Test | Required assertion |
| --- | --- |
| Browser `setItem` throws quota error | Transition rejected. Exact live cells/shapes/rotations, project ID/version/signature, current lesson, selection, undo/redo, camera, previews, and learning state survive. No successful `lesson_load` event. |
| Shelf read throws or contains malformed/over-limit data | Rejected without replacing or repairing shelf implicitly. Live export action remains available where validation permits. |
| Shelf already has eight projects and live world has no ID | No eviction and no world replacement. Explicit removal of another chosen project followed by Retry can succeed. |
| Two-tab version conflict | Newer stored project remains byte-for-byte intact; stale tab's distinct live geometry stays. Export uses stale tab's live geometry, not stored project. |
| Project removed by another tab | Removed ID is not recreated. Save variation makes an explicitly new ID, leaves other projects intact, and a subsequent normal transition succeeds. |
| Unchanged build with stale ownership | Still rejected: ownership checks precede the unchanged-signature shortcut. |
| Successful save / unchanged valid save / blank new sandbox / non-sandbox | Transition succeeds once and preserves existing progress-loading behavior. Missing initial autosave does not block first-world initialization. |
| Throwing flush / malformed result | Controlled rejection before mutation; readable reason; no trapped overlay or global save-bypass flag. |
| Home guided launch / practice / blank sandbox | Rejected load keeps Home open and old active lesson/HUD/progress. Practice record does not begin; no focus transfer or false success return. Retry succeeds after cause resolves. |
| My Lessons / editor / generated lesson / imported lesson | No false loaded/apply announcement, XP for replacement, active lesson switch, or loss of editor text on rejection. Generated content may be retained separately with accurate messaging. |
| Reset / Replay / Next / New practice round | Rejection does not clear persisted answers, score, completion status, notebook, prediction state, or reflection. Successful retry mutates exactly once. |
| Peer legacy block world | Shared preflight runs before direct `clearWorld`; failure cannot bypass protection. |
| Empty shelf project / pending Print Lab return | Result propagates; pending/snapshot identity is retained if blocked; no blocks replayed into old world and no false handoff consumption. |
| Editable import success and simulated mid-restore failure | `{ok:true, skipped:true}` path remains supported, exact memory rollback works, and `_workshopRestoreInProgress` is restored/removed in `finally`. |
| Stay / Download / Retry / confirmed discard | Escape/Stay leaves world untouched. Download initiates live export but never auto-loads. Only explicit confirmed discard proceeds without save; cancellation preserves work. |
| Discard intent invalidation | Intervening block edit, target change, replaced engine, or completed/canceled transition invalidates one-shot authorization. No bypass survives reload or later stale-tab conflict. |
| App navigation / teardown | Separate integration test states residual scope honestly: failed flush must not be mistaken for a durable draft when returning. Preserve successful Print Lab return behavior and proper disposal. |

Existing coverage to retain:

- [Workshop save-helper tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/geometry_world_workshop.test.js:41) already cover exact data, unchanged saves, intentional empty deletion, quota/malformed shelf, stale writes, and capacity. They do not execute the production lesson loader under those failures.
- [Variation tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/geometry_world_variations.test.js:39) cover intentional fork identity and stale-tab recovery.
- [Print Lab continuity tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/geometry_world_printlab_continuity.test.js:44) model `loadLesson` with a clearing stub. They verify resume/handoff state but cannot detect the ignored production flush result. Keep their intended memory-snapshot continuity, and add actual-loader tests for the new guard.

No new test run was needed for this documentation-only audit. This report proposes the contract and regression surface; it does not claim these transition failures are fixed.
