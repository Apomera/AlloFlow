# CircuitTool workbench polish · September 29, 2026

Completed a further visual pass on the circuit workbench. All changes remain uncommitted; no deployment was made.

## What changed

- Grouped Schematic/3D controls directly above the drawing, with Undo, Redo, and motion controls alongside them.
- Framed the schematic with a clear title, circuit status, and source-current reading.
- Put voltage, current, and power readings first in the inspector, followed by settings and move controls.
- Turned the component editor into consistent cards with clear names, grouped settings, and larger controls. Cards use two columns on desktop and one on phones.
- Improved the reading map, live feedback, and disabled-button contrast. Preserved keyboard focus and reduced-motion behavior.
- Corrected diagram wiring: series parts now share a distinct return rail, and every parallel branch connects to both supply rails. Symbol leads and charge-marker paths follow the corrected wiring.
- Expanded crowded parallel diagrams so eight branches remain separate and readable.
- Used precise units for schematic current labels and the current/power readout cards. Small nonzero currents are now described accurately in the schematic's accessible label.

## Verification

- **143 tests passed across 14 files**, including drawn electrical connections, part reordering, small-current labels, onboarding, guided investigations, export, localization, and accessibility.
- **6 browser workflows passed** in a Chromium harness using the actual CircuitTool source and React. Checks cover switch operation, value editing, Undo, keyboard reordering, 3D selection, parallel branches, and reduced motion.
- **15 axe scans and 15 layout checks passed** across 1280px, 390px, and 320px widths, with no reported violations or page overflow.
- **30 visible keyboard-focus checks and 3 motion checks passed.** The audit saved 42 focused screenshots with no reported visual issues or page errors.
- Visually reviewed the diagram, component cards, inspector, readouts, and 3D bench. The phone schematic retains its labeled horizontal scroll area.
- Source and desktop copy are byte-identical. JavaScript syntax and scoped Git whitespace checks pass.

An initial browser pass identified low contrast in a disabled move control. Explicit muted colors replaced the opacity treatment, and the complete audit passed afterward. Browser evidence here covers Chromium; other browser engines were not exercised in this pass.

## Preview

- [Closed circuit and inspector, desktop](closed-loop-schematic-1280.png)
- [Component cards, 320px phone](closed-loop-components-320.png)
- [Current and power readings, 320px phone](closed-loop-readouts-320.png)
- [Eight parallel branches](parallel-eight-schematic-1280.png)
- [3D bench](3d-loop-scene-1280.png)

## Evidence and reproduction

- [Final validation summary](validation-summary.json)
- [Regression results](regression.json)
- [Browser results](workbench-results.json)
- [Browser audit script](workbench-check.cjs)
- [Final validation script](validate-final.cjs)

Run `node reports/circuit-workbench-polish-2026-09-29/workbench-check.cjs` to repeat the browser audit. Run `node reports/circuit-workbench-polish-2026-09-29/validate-final.cjs` after the recorded regression suite and browser audit to verify the evidence matches the current files.

Verified source SHA-256: `de05ec334cd1b1578e43e4a24ff56157d1f6b029fd77885180d4da89bb477b24`.
