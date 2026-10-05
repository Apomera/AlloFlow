# Classroom reliability acceptance

This lane is a focused real-browser acceptance harness, not release certification. It creates synthetic resources in fresh teacher and student browser contexts, blocks every external origin, and uses only a loopback mailbox.

Completed local acceptance at `2026-10-03T14:24:04.650Z`: [report](./report.json), with exact tested input hashes. It passed 22 native clip completions, zero learner synthesis, native Enter/Stop navigation, both response reload/submission paths, explicit teacher storage isolation, and 1280/320 CSS-pixel reflow. [Native bridge acceptance](./bridge-report.json) separately passed its save/restore scenario. Native zoom remains **Blocked**, and the manual release rows below remain **Not tested**. See [execution notes](./EXECUTION-NOTES.md) for preserved failed attempts, repairs, and scope limits.

The runner extends the existing local studio delivery harness in memory with exact, unique anchors. It does not edit production sources or the original harness. It captures every source/module hash and fails if an input changes during acceptance.

The coordinator's first execution stopped before browser launch because the upstream harness searched `AlloFlowANTI.txt` for a submission block that has moved into `host_handlers_source.jsx`. The report-local runner now extracts the actual current `handleSubmitAssignment` projection block and pure `sanitizeSubmissionData` declaration by unique Babel AST nodes and source offsets. It supplies the fixture through the original `__d` dependency reads. Production student autosave extraction and logic are unchanged. This is a harness maintenance fix, not a reproduced product defect; see `EXECUTION-NOTES.md`.

The second execution exposed an omitted current chunk-cleanup dependency in the upstream extraction. The report-local runner includes the canonical cleanup/completion functions and chunk-size constant, finishes the actual recipient decode lifecycle, and audits free application bindings in the helper bundle before browser launch. The failure and bounded harness repair remain in `EXECUTION-NOTES.md`.

The third execution reached delivery but attempted to fill the MemoryAid draft while its Study view kept the writing pane collapsed. The corrected journey opens Make it mine, AppliedChallenge's Build stage, and its Read or listen disclosure through their native keyboard controls. Visibility is preserved and awaited; `uiNavigation` records successful panel openings. This harness maintenance and its execution boundary are recorded in `EXECUTION-NOTES.md`.

The fourth execution reached the narrow reflow assertion after successful native audio and keyboard checks, but measured horizontal overflow at 320 CSS pixels. The coordinator confirmed that the fixture had omitted the actual global app CSS baseline. The next run compiles the exact app stylesheet and Tailwind configuration, with only content discovery scoped to mounted modules/harness/HTML; both inputs are hash-recorded. It retains the overflow assertion and emits failure JSON plus a screenshot before stopping if overflow remains, including exact element bounds and completed partial checks. No production layout edits are made for the incomplete fixture.

## Automated checks prepared

- Teacher audio preparation, production `UtilsPure.storageDB` and `writeVerifiedStorageSnapshot`, native IndexedDB transaction acknowledgement and strict read-back. Close the teacher tab, reopen it, then deliver the restored resource bytes.
- Separate student context receives out-of-order and duplicate transport chunks, with the existing temporary delivery failure and retry. No teacher storage or private teacher practice/source data reaches the learner.
- Student opens each actual writing pane with Enter, writes both studio responses, reloads, and retrieves the actual IndexedDB records using host autosave code.
- Native `HTMLMediaElement.play` remains intact. Non-silent synthetic WAV clips must expose positive finite duration, advance their playback position, and emit native `ended` for every expected segment. Learner synthesis must remain zero. This establishes playback completion in the browser, not intelligibility or physical speaker output.
- Enter activates the reference-reading control and the Stop control. Cancelled playback returns to idle without a completion claim.
- Freshly compiled actual app stylesheet and Tailwind configuration for the mounted modules and harness, with 1280/320 CSS-pixel overflow checks. These checks are reflow samples, not browser zoom.
- Probe native Chrome zoom shortcuts and retain observed device-pixel ratio and CSS viewport metrics. If metrics do not change, the result is **Blocked**; do not describe it as a zoom pass.

## Execution

Prepared command, to run only in the coordinator's serialized browser slot:

```powershell
node reports/classroom-reliability-2026-10-01/accessibility/acceptance.cjs
```

The command launches one headless Chromium process, two fresh contexts and a loopback HTTP server. It compiles Tailwind CSS in memory, writes only this lane's `report.json`, and closes Chromium/server on completion. No provider calls, hosted account changes, module builds or full app build.

An additional prepared runner exercises the production device-storage client and exact canonical bridge HTML in native nested cross-origin frames. Playwright supplies local bytes at the configured CDN URL; it fulfills or blocks every page request. It does not mock postMessage, protocol replies, IndexedDB or transaction acknowledgement. It approves the synthetic consent UI using Enter, completes two actual workspace and atomic recovery saves, checks the committed bridge database, then reloads under a different synthetic app origin within the same top-level-site partition and verifies history/recovery/consent retention.

```powershell
node reports/classroom-reliability-2026-10-01/accessibility/bridge-acceptance.cjs
```

This writes `bridge-report.json` and closes its single Chromium process. It uses an isolated context with no user data. It does not certify Google Canvas embedding, its real top-level partition, deployed bytes, the complete app's save effect or manual assistive technology.

## Manual release acceptance still required

Record tester, commit/build, browser/OS/AT version, date, steps, result, evidence and retest commit for each row. **Not tested** and **Blocked** remain distinct from **Pass**.

| Journey | Windows NVDA + Chrome/Edge | macOS VoiceOver + Safari | Native 200% zoom | Native 400% zoom |
|---|---|---|---|---|
| Teacher saves, closes, reopens and edits a lesson | Not tested | Not tested | Not tested | Not tested |
| Teacher starts and student joins the actual classroom transport | Not tested | Not tested | Not tested | Not tested |
| Learner reads original/adapted text and receives reviewed word supports | Not tested | Not tested | Not tested | Not tested |
| Learner hears every delivered narration segment, stops, retries and completes | Not tested | Not tested | Not tested | Not tested |
| Learner writes, reloads and submits; teacher reviews the response | Not tested | Not tested | Not tested | Not tested |
| Export/download receives headings, reading order, tables and media alternatives | Not tested | Not tested | Not tested | Not tested |

Check accessible names, landmarks, focus order, focus visibility/obscuring, status/error announcements, Escape/dialog focus return, reflow and recovery. A DOM assertion cannot certify an announcement in NVDA/VoiceOver. Canvas partition/consent recovery, real Firestore/Mailbox availability, cold voice preparation and narration quality remain separate checks.
