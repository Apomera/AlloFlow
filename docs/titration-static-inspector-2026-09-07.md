# Titration static addition inspector — September 7, 2026

Reviewed the current lab before extending it. Recent additions include the live experiment command panel, stage backdrop, glass sheen, corrected burette tip, endpoint blooms in 2D and 3D, the longer 1,750 ms animation lifetime, the corrected reference curve, and redox-specific diagram labeling. These changes remain in place.

The new Inspect addition control opens the flask close-up and provides static snapshots of drop release, impact, mixing, and settling. A native keyboard-operable timeline allows intermediate poses. The canvas carries a Static illustration badge and an accessible phase description. Help explicitly distinguishes the illustrative timeline from reaction-speed measurements.

Inspection is component-local: it does not add titrant or change pH, potential, notebook entries, or saved experiment state. It remains usable with reduced motion because the viewer draws only the requested pose and does not run an animation loop. Return to live view exits inspection. Real additions, changed readings/setup, switching apparatus focus, and 2D/3D changes also exit it. WebGL failure hides inspector controls and exposes the existing 2D fallback.

The scene uses its existing drop and endpoint bloom geometry. A fixed preview time drives the same pose code used by the animated cue. The stopcock closes when the illustrated drop phase ends. Existing live-animation timing and chemistry calculations are unchanged.

The notebook persistence regression now waits 1,800 ms instead of 900 ms, so it actually covers completion of the newer 1,750 ms animation callback.

Source and public mirror: `stem_lab/stem_tool_titration.js` and `desktop/web-app/public/stem_lab/stem_tool_titration.js`. New strings are registered in the English titration catalog; other-language translations remain follow-up work. No deployment or dependency changes.

Validation: 71 focused tests across four files passed. Real Chromium verified still frames under system reduced motion, keyboard timeline control, unchanged experiment data, automatic return to live view, redox units, and WebGL fallback/recovery. Three axe scans at 1200, 360, and 320 px found no WCAG A/AA violations or horizontal overflow. Desktop and phone screenshots were visually inspected. Source/public byte parity, syntax, and scoped whitespace checks passed. Reports and screenshots are in `reports/chemistry-refinement-2026-09-06/titration-inspector-*`.
