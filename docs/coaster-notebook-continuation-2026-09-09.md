# CoasterLab notebook continuation - 2026-09-09

The investigation notebook now summarizes written prompts across Plan, Observe, and Explain. Counts describe the presence of notes only; they do not grade answers or infer scientific correctness. Whitespace-only responses remain empty.

Continue notes finds the first empty prompt, opens its section, closes the other notebook sections, scrolls the field into view, and moves keyboard focus to it. Once every prompt has writing, the button becomes Review my explanation. Clearing a note restores continuation to that gap. Existing saved notebooks need no migration.

The summary updates without rebuilding form controls, preserving typing focus and selection. Its live announcement changes only when the number of non-empty prompts changes. Each stage shows a numeric count as well as a border treatment.

Validation:
- 251 CoasterLab and physics-pit checks passed in the initial run. The visual-presentation worker timed out during startup; its four checks passed on separate rerun (255 passing checks overall).
- Chromium/Three.js browser test passed in 5.4 minutes using FX Lite: restored note counts, keyboard continuation, first-gap selection, one open section, phone field visibility verified by hit testing, stable typing focus, completed-to-incomplete transitions, navigation persistence, no horizontal overflow, unchanged design, and zero page errors.
- Desktop and phone summaries and the focused phone prompt reviewed visually.
- Syntax and targeted git whitespace checks passed.
- Canonical and desktop copies are byte-identical UTF-8 LF.

Browser spec: `tests/e2e/coaster-notebook-continuation.spec.ts`.
Screenshots: `scratch/coaster-continuation-browser/`.
