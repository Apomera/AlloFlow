# CircuitTool learning flow and visual enhancements

The active experiment now reaches its question sooner. A compact progress row and a collapsible experiment chooser replace the long preamble above the question.

Start and Resume focus the question or saved result. Opening the chooser changes no saved state. Selecting the current lesson preserves an edited circuit, and selecting a different lesson closes the chooser before focusing its question or evidence. The chooser also closes correctly when its native toggle event has not yet reached React.

The target action restores full opacity immediately when enabled, preserving readable contrast. Evidence cards adapt to enlarged text by stacking when they need more room, and current values can wrap between the number and unit.

This pass completes the accumulated CircuitTool work: guided evidence charts and circuit replay, component cards and inspector hierarchy, clearer controls and feedback, corrected series and parallel diagram connections, readable eight-branch spacing, precise current/power units, and accessible workbench labels.

## Validation

All 238 tests in 21 files passed. The final browser run passed 15 accessibility scans, 15 layout checks, 15 checks of text inside result cards, and 27 focus checks, with no reported errors or visual issues.

The final evidence is recorded in [validation-summary.json](validation-summary.json), [regression.json](regression.json), and [navigation-results.json](navigation-results.json). Tests cover lesson navigation and native toggle timing, evidence and Undo, onboarding, challenges, workspace orientation, schematic connectivity, measurement precision, localization, and Connected instruments.

Browser checks use the actual source in a React/Chromium harness at 1280px, 390px, and 320px. They check keyboard focus, contrast, control sizes, page overflow, native chooser behavior, preserved notes and history, and reduced motion. The phone checks also double the lesson text size. A 320px check verifies that 90.00 and 180.00 mA readings, and the +90.00 mA change, remain inside the result cards' padding.

Source and desktop mirror are byte-identical. Final validation checks their hashes against the browser run, tests, JavaScript syntax, and scoped Git whitespace.

## Previews

- [Compact active lesson, phone](start-active-320.png)
- [Experiment chooser, desktop](chooser-open-1280.png)
- [Resumed saved result, phone](resumed-result-390.png)
- [Resumed result with 200% lesson text, 320px](resumed-result-200pct-text-320.png)
- [Longer readings with 200% lesson text, 320px](paths-result-200pct-text-320.png)

Run `node reports/circuit-lesson-navigation-2026-09-29/navigation-check.cjs` to repeat the browser audit, then `node reports/circuit-lesson-navigation-2026-09-29/validate-final.cjs` after the recorded regression suite to verify the evidence matches the current files. Other browser engines were not exercised in this pass.
