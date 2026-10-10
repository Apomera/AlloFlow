# Dissection Lab: clearer replay contacts

Completed locally October 10, 2026. Receipts use UTC. Changes remain uncommitted.

## Improvements

- Replay now places inspection, forceps, pin, probe, dropper, and wick actions at each action's own recorded contact. It no longer substitutes the final procedure's contact for an earlier action. Recorded cutting paths retain their existing behavior.
- Saved and supported contacts are labeled **SAVED POSITION** and **SUPPORTED POSITION**. Legacy or invalid contacts use the teaching guide and display **TEACHING POSITION**. Paused review adds a readable explanation beside its controls, including “Illustrative position; contact not recorded.”
- Pending forceps and pin targets are hidden during a matching active replay, so they do not compete with the action being reviewed. Normal tool guidance returns after Stop or expiry. Mismatched, expired, and quiz replays do not suppress guidance.
- New inspection clicks retain their actual contact. Direct probe drags retain their endpoint, and supported probe buttons record the selected organ position with supported provenance. Missing direct contacts remain illustrative.
- Position captions can wrap over three rows. Existing 16px/18px review typography, responsive controls, high contrast, and forced-color focus remain available.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit checks | 44 passed: 26 contact/record-writer cases, 15 prior review cases and 3 existing instrument/UI checks; 239 other cases excluded by filter | [unit-4](unit-4/run.json) |
| New native contact scenarios | Four Chromium layouts passed, zero retries | [browser-2](browser-2/run.json) |
| Existing native review regressions | Four passed, zero retries | [regression-2](regression-2/run.json) |
| Scoped axe scans | Zero violations in four layouts; no incomplete rules | [verification](verification.json) |
| Source parity and syntax | Canonical/runtime bytes match; source parses | [verification](verification.json) |
| Prior work | 1794 protected files unchanged; all 18 edits reverse exactly to baseline | [verification](verification.json) |

The new browser checks use desktop motion, a 320px reduced-motion phone, a 390px forced-color phone, and a 320px embedded view with Large text and High contrast. They inspect actual native canvas drawing positions, per-action labels, paused controls, saved state, and pending forceps/pin hints before, during, and after replay. All eight final panel/canvas captures were inspected. See [visual review](visual-review.json) and [captures](browser-2/captures).

## Run history and limits

- The first guarded source save encountered a full C: drive. Atomic replacement left both production copies at baseline. Cleanup removed 1.852MiB from this chat's inactive prior replay-review test temporary directory; report artifacts and shared files were preserved. External free capacity later recovered, allowing the pass to finish.
- unit-2 caught an existing exact-prefix source contract after adding a probe contact. Reordering the payload fields restored that contract without changing behavior or the protected test.
- regression-1 lost its terminal session after two logged passes. It has no final exit/result receipt and is excluded from completion evidence. [Interruption receipt](regression-1/interruption.json). The accepted regression run repeats all four scenarios.
- browser-1 passed desktop and caught a fixture collection issue after axe on the reduced-motion phone: clearing captured drawing records discarded the correctly held static frame. The fixture retains the current native frame and clears records before state-changing actions, keeping geometry and label assertions strict.
- Every accepted receipt pins its source and test inputs before and after the run. Retained failed/interrupted attempts are not completion evidence.
- Writer unit cases execute extracted production action, calibration, record-writing and drag-finalization functions with unrelated presentation, scenario and tissue effects isolated. They do not claim a full plugin interaction. This is focused component/browser verification, not a full application build or a screen-reader audit. Contact labels describe the available recorded evidence; saved pressure remains simulation evidence.

## Reproducibility and ownership

Source SHA256: `feb4ed7cac726ab812edd71be1804d06410ef39de437c54f0668d7dab59ba92f`.

Exact edits, compressed baseline/final sources and tests, raw test logs, captures, and runner scripts are retained. Baseline HEAD: `21b719454f295c4e4f677b0c804e1b44254a5383`; final HEAD: `2d91f012e40567acb51a2c7147d4af7cb4f6c76e`. No commits affecting this pass's owned source/test scope were detected. Index names match baseline. No staging, commit, push, or deployment was performed.
