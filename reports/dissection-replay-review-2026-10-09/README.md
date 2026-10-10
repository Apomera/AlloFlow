# Dissection Lab: learner-controlled action review

Work began October 9 and completed locally October 10, 2026. Receipts use UTC. Changes remain uncommitted.

## Improvements

- **Review actions** opens the first recorded action paused, showing its full stroke. Previous and Next hold each action for inspection; Resume continues from the selected action. Automatic Replay attempt also supports pause and navigation.
- A panel directly below the specimen shows the action number, name, and playback state. Its 16px text becomes 18px with Large text. Controls wrap in narrow views and have at least 44px height. High contrast and forced colors retain readable borders and focus.
- Launch brings the specimen into view and focuses the replay toggle. Boundary navigation retains a usable focus target. Stop and Escape return to the launch control, or to the visible Technique practice summary when its panel is closed. Native timer completion retains focus through intervening presentation renders.
- Review cancels an active teaching demonstration. New actions, view/layer changes, and fullscreen entry end review so its overlay cannot conflict with the new interaction. Existing recorded evidence, notes, and progress are preserved.
- Held actions retain the existing saved/supported/teaching path labels and honest missing-pressure wording.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit checks | 18 passed: 15 new timing/navigation cases and 3 existing instrument/UI regressions; 239 other cases excluded by filter | [unit-5](unit-5/run.json) |
| Native Chromium scenarios | 4 passed, 0 failed, 0 retries | [browser-7](browser-7/run.json) |
| Scoped axe scans of review controls | Zero violations in all four; no incomplete rules | [verification](verification.json) |
| Canonical/runtime parity and syntax | Bytes match; source parses | [verification](verification.json) |
| Prior work | 1046 protected files unchanged; 32 source edits reverse exactly to baseline | [verification](verification.json) |

The browser cases use desktop motion, a 320px reduced-motion phone, a 390px forced-color phone, and a 320px embedded view with Large text and High contrast. They check native keyboard launch, pause/hold/navigation/resume, caption evidence and bounds, focus at boundaries and completion, Stop/Escape, collapsed-panel fallback, demonstration cancellation, fullscreen entry/exit, view/layer cancellation, and complete saved-state equality excluding elapsed time and transient replay/feedback.

All eight final panel and canvas captures were inspected. See [visual review](visual-review.json) and [captures](browser-7/captures). Raw axe results remain available; focused scans do not establish whole-app accessibility.

## Retained run history and limits

- unit-1 passed 17 checks and caught a changed replay entry signature. The original entry function is retained as a wrapper. unit-2 through unit-5 pass all 18 checks on their respective pinned inputs; only the final pinned run is completion evidence.
- browser-2 caught specimen launch remaining off screen. The focus callback now queries the live canvas after render.
- browser-3 timed out because axe was run while the fixture clock was paused. Axe now runs with the clock advancing while the review itself stays paused.
- browser-4 passed desktop and caught a fixture caption capture issue in reduced motion. The fixture now reads the latest actual static canvas draw, retaining wrapped rows and asserting the current step; it does not call internal redraw helpers.
- browser-5 was interrupted by a desktop session refresh after three logged cases. It has no final result or exit receipt and contributes no completion evidence; [interruption receipt](browser-5/interruption.json) retains recovery hashes. The final run repeats all four cases.
- browser-6 caught a fixture clock race: its post-axe pause target was only 100ms ahead and had passed before the browser received the request. The fixture uses a 60-second virtual-clock lead; pauseAt fast-forwards rather than waiting, and all replay/state assertions remain intact.
- Audit identified simultaneous teaching overlays, hidden return-focus targets, and fullscreen hiding the review controls. Final native checks cover their fixes.
- This is focused component/browser verification, not a full application build or a screen-reader audit. Saved pressure remains simulation evidence, as documented by the preceding replay-evidence pass.

## Reproducibility and ownership

Source SHA256: `ca1ebfd63cce6cd95c722e3354ad4e813eef3ae48d61e6e5ace6c917cb0d3654`.
Exact edit records, baseline/final compressed sources and tests, input hashes, raw logs, captures, and runner scripts are retained. Baseline HEAD: `3bc1e436017284c7ff6a10d0217323a97509c7f8`; final HEAD: `21b719454f295c4e4f677b0c804e1b44254a5383`. No commits affecting this pass's owned source/test scope were detected. Index names are unchanged from baseline. No staging, commit, push, or deployment was performed.
