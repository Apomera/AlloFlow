# First Response Lab: hand orientation study

Learners can now predict which hand surface stays upward or beside the cheek, compare the same hand before and after the turn, and explain the features they followed. The study becomes available after the first five recovery steps are complete. Fold, nail and cheek symbols provide visual cues.

## Changes

- **The camera shows the chosen hand and pose.** Near and supporting comparisons select both together. The original near-hand comparison buttons now return to the near hand after a supporting-hand close-up.
- **Phone comparisons reveal the model.** A ready viewer scrolls into view, waits for its camera fit, and receives focus. The request stops after 60 frames, or when the viewer, mount, hand request or learner focus changes.
- **Adult, child and infant have separate studies.** Two native radio groups offer palm, back-of-hand and unsure choices. Checking explains the illustrated model. An optional note holds 2,000 characters; resetting one age preserves the others.
- **Observations survive reloads and project restores.** The notebook is included in the tool's window/localStorage snapshot and project export. Pending hydration survives the first save. Explicit project records replace the study; an empty map clears it. Older projects without the field and malformed whole maps preserve current observations and immediately repair their saved snapshot.
- **Controls remain usable in accessible views and failures.** Native disclosure, fieldsets, labels, feedback and textarea support keyboard use. Forced colors retain readable controls. The written study works when rendering or browser storage fails.

These questions describe the illustration. They do not score or complete recovery skills.

## Verified results

| Check | Result |
| --- | --- |
| New unit checks | **46 passed**, zero failures |
| Native Chromium workflows | **5 passed**, one worker, zero retries, skips or flaky results |
| Scoped accessibility scans | **12 scans** across six conditions; zero violations |
| Saved native captures | **25** |
| Runtime mirrors | Identical, **770,651 bytes** |
| Documented source reversal | All **10 edits** reverse exactly to the previous source |

The browser workflows cover adult, child, infant at 320px, renderer fallback, and real reload/project restore. Each age workflow verifies ten hand-camera comparisons, scene/resource preservation, observations, reset behavior, contrast and disposal. The phone workflow also checks keyboard controls, resizing, forced colors and offscreen camera requests. Reload checks use fresh same-origin pages without a seeded study, retain all three records, restore a project, and verify an age reset survives another reload.

See [verification](verification.json), [unit report](units-passed/hand-study.json), [unit log](units-passed/hand-study.log), [native report](final-browser-json-string/browser-run.json), and [native log](final-browser-json-string/browser-run.log).

Reviewed captures: [adult hand and cheek](final-browser-json-string/adult-checked-stage.png), [adult study](final-browser-json-string/adult-checked-study.png), [320px hand detail](final-browser-json-string/phone-infant-checked-stage.png), and [phone study in forced colors](final-browser-json-string/phone-infant-forced-colors-study.png).

## Preservation

Final source SHA256: `cc354bd12dd0712e1e628ebfc16689ba584c3b988d1b085df5a41e1f67cecc26`. Reversing the ten documented edits restores the **754,764-byte** baseline, SHA256 `970fbb0e068412f3d3e3fb4ed01013a1afb56b9d5270fb2eb18d24201bfd012c`. Geometry, materials, existing camera-fit math, clinical guidance, recovery completion and other learning records are preserved. See [source preservation](source-preservation.json).

The earlier patient-finish fixture retains its fixed supporting-hand before-source hash `6e24299465bceafcce0f079ef8171d6ab2871f852a64483acad90ac57cd79a9f`. Its guarded adapter removes only the documented study additions before removing the original finish block. Fixed hash lines and geometry/material expectations were preserved. See [adapter preservation](finish-adapter-preservation.json).

## Retained diagnostics and limits

- An intermediate source recorded [37/38 passing checks](units-extended-fileurl/hand-study.json). Its queued-camera fixture flushed only the parent animation-frame callback; the final fixture drains the whole pending frame batch.
- Earlier 60/180-second worker-startup and Windows import-path attempts ran zero assertions. A [config-startup attempt](units-config-startup/hand-study.log) also stopped before collection because Vite tried to write outside the workspace. The passing run uses the installed jsdom setup before the repository setup file, after worker readiness, and the supported native config loader. No dependencies or repository-wide configuration changed.
- A follow-up of **190 existing checks was interrupted during startup** after the 46 new checks passed and the runner connection refreshed. Those 190 checks are not claimed as passes in this update. [Interruption evidence](units-interrupted/patient-finish-environment.jsonl) and task-specific process receipts are retained. Exact source reversal and native scene invariants verified preservation.
- The [first native attempt](browser-run.json) recorded four fixture failures: three compared draw counts under different cameras, and one installed a failed-viewer stub after construction. The final fixture compares matching-camera references and installs the conditional stub before the tool script.
- [Five later launch failures](final-browser/browser-run.json) came from the sandbox selecting an empty browser cache. The successful run uses the existing matching Chromium cache explicitly.
- The installed-cache attempt timed out while transferring a scene snapshot through a remote JSHandle; its remaining tests were stopped. [Failure context](final-browser-installed/software-artifacts/firstresponse-hand-study-a-ca719-eal-hand-camera-comparisons-chromium/error-context.md) is retained. The passing fixture transfers native JSON with undefined fields preserved and rejects non-finite evidence values; its geometry, material, camera, resource and state assertions remain intact.

These are local software-rendered Chromium checks; no physical-device performance measurement or full application build is claimed.

Changes remain unstaged and uncommitted. No push or deployment.
