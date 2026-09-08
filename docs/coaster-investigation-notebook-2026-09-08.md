# CoasterLab investigation notebook - 2026-09-08

Physics pit stop experiments now include a learner-written investigation notebook in Build. Three collapsible sections guide learners through planning one change and fixed conditions, recording a prediction with a reason, observing baseline and revised runs, and explaining what the evidence suggests. Prompts explicitly support stalls, non-comparable readings, and revising a prediction.

Energy, Turns, and Airtime retain separate notebooks. Notes save with the existing local physics pit state, survive dismissal/navigation/reload, and accept short phrases or keywords. Existing predictions and explanations migrate without losing text. Each of the six notebook fields is limited to 600 characters, and restored text is escaped for safe display.

Download my notes produces a plain-text file for the active investigation with its evidence prompt and entered notes. The file identifies observations as learner-recorded, not automatically captured telemetry. If device storage is unavailable, the notebook reports that state and retains writing in the open activity.

Validation:
- 252 unit checks passed across physics pit recovery, CoasterLab, and visual presentation.
- The focused Chromium/Three.js notebook browser check passed in 6.0 minutes using FX Lite. It covers keyboard disclosure control, focus retention while typing, separate investigations, dismissal and reload recovery, markup displayed as text, download contents, phone-width overflow, storage failure recovery, unchanged coaster design, and zero page errors.
- Desktop notebook capture reviewed visually. Phone overflow and note-entry/navigation checks passed; the phone element capture includes clipping from the existing split scrolling panel.
- Initial full-effects browser run exceeded its five-minute test budget; trace assertions passed up to that timeout. The broader browser run was stopped, and the focused notebook check was rerun with a ten-minute budget and FX Lite.
- JavaScript syntax and targeted git whitespace checks passed.
- Canonical and desktop tool copies are byte-identical UTF-8 LF; SHA-256: 07675e28111c255d8a2297ed9890156418f3357d2e52ba457642a07cdbce5e18.

Browser spec: `tests/e2e/coaster-investigation-notebook.spec.ts`.
Final captures: `scratch/coaster-notebook-final/`.
