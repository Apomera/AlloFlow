# Titration volume tracker — September 9, 2026

The burette close-up now offers **Measure volume**. The tracker shows start and current 50 mL burette scales side by side, with glass shading, numbered graduations, and cyan/gold reading guides. Set start reading creates a local mark; the delivered-volume total updates as titrant is added. The tracker includes small addition buttons so students can observe the change without leaving the panel.

Within one fill, the explanation subtracts the start reading from the current reading. Across a refill, it separates the volume from the starting fill, any complete intervening fills, and the current fill. For example, 49.5 mL to 0.5 mL after one refill gives 1.0 mL delivered. An exact 50.0 mL reading is represented as an empty burette. Refill identity is determined before rounding, matching the live apparatus even when restored state contains extra decimal precision. Calculations use the displayed tenths of a millilitre.

Marks survive closing/reopening the tracker, inspecting the flask, and switching between 2D and 3D. Changing the titration setup or moving the volume below the marked value clears the mark. Marks are temporary and do not create notebook records. Setting or clearing one does not dispense titrant or change existing readings/notes. Ordinary notebook saves retain the actual cumulative experiment reading.

Opening the tracker focuses Set start reading; Escape and Close tracker return focus to Measure volume. Controls remain usable in the WebGL fallback and with reduced motion/forced colors. At narrow widths the paired scales stay together and the calculation/controls stack below them.

No chemistry engine, dependency, animation loop, or renderer was added. Source/public copies are identical. New English strings are registered in the titration catalog; translations remain follow-up work.

## Validation

- 100 targeted tests passed: 74 immersive/measurement tests, 15 motion/persistence tests, and 11 internationalization checks. The 74 measurement/scene tests passed again after the restored-decimal boundary refinement; they are not counted twice.
- Eight new tests cover empty-fill boundaries, malformed inputs, decimal precision, differences within later fills, crossings, empty-burette starts, complete intervening fills, and invalid/unset marks.
- Real Chromium checks passed for marking/clearing, additions, saved notebook readings, retained viewer identity, close-up/view changes, Escape/close focus, refill crossings, restored fractional readings, backward volume changes, setup resets, dark titrant, indicator changes, WebGL fallback, touch additions, and forced-colors keyboard marking.
- All 20 final WCAG axe scans passed across unmarked, clear-titrant, empty, refill, and redox states at 1200, 760, 360, and 320 pixel widths. No horizontal overflow or page errors were observed.
- Desktop, mobile, refill, and companion 3D-burette screenshots were visually inspected. Syntax, scoped whitespace, source/public byte parity, and tracker English-fallback matching passed.

The browser harness uses the actual widget, React, Three.js, and application styles in a local fixture. These are component-level checks, not a deployed-platform, complete accessibility, or physical-device audit. No deployment was performed.

## Evidence

Run `node reports/chemistry-refinement-2026-09-06/titration-volume-tracker-browser.cjs` to repeat the browser checks. The same directory contains `titration-volume-tracker-browser-results.json`, `titration-volume-tracker-tests.json`, `titration-volume-tracker-boundary-tests.json`, and the tracker JPEG screenshots.
