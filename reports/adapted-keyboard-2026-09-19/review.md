# Adapted reader keyboard refinement — September 19, 2026

- Escape is handled by the active reading-help dialog and no longer propagates to the workspace Escape handler. Closing help preserves Focus view.
- Modal Tab navigation includes native disclosure summaries, making pronunciation symbols accessible with Tab and Enter.
- Hidden, inert, disabled, and collapsed-disclosure controls are excluded from the focus loop. Tab from the dialog container enters its visible controls.

Validation: 95 tests passed across reader interaction, popup audio, and accessibility suites. Chromium checks at 320 and 1280 pixels verified forward/reverse Tab cycling, keyboard disclosure activation, Escape isolation, and preservation of Focus view. See tests.json and browser-results.json. Root/public module parity and canonical cache references are recorded in build-verification.json.

Changes are local, not deployed. Browser verification uses the real reader modules in an isolated harness, with a simulated global Escape listener.
