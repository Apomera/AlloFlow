# Dilution in 3D — September 7, 2026

The Titration Lab's Dilution Calc tab now includes an interactive comparison of the measured stock aliquot and final diluted solution. The existing calculator supplies both concentrations and volumes; no chemistry calculation was replaced.

Two matching cylindrical vessels show liquid heights in the stock-to-final volume ratio. Each liquid contains 18 representative solute packets, illustrating equal amounts of solute before and after dilution. Marker size shrinks to fit shallow aliquots; the explanatory caption directs students to compare count and numerical readings. Vessel dimensions, colors, and markers are illustrative. The preparation procedure remains below the comparison.

The scene uses the shared `StemLab.makeOrbitViewer` factory with static demand rendering, shared materials/geometries, and no textures or continuous animation. Students can rotate with mouse drag or arrow keys, zoom with buttons or +/−, reset with a button or 0, and toggle solute markers. Touch swipes retain normal page scrolling. A selectable 2D comparison uses the same volume ratio and becomes available automatically if WebGL fails. Calculator values survive view and tab changes.

Numerical cards remain outside the canvas, including the amount of solute. All controls have accessible labels, visible focus, and 44 px minimum targets. Cards stack at phone widths. New English strings are registered; other-language translations remain follow-up work.

Source: `stem_lab/stem_tool_titration.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_titration.js`. Evidence: `reports/chemistry-refinement-2026-09-06/titration-dilution-*`. No dependency or deployment changes.

Validation: 71 focused tests across four files passed, including vessel-volume ratios, packet containment/counts, camera bounds, existing dilution calculations, accessibility contracts, and translation coverage. Real Chromium WebGL checks passed with no page errors. Six axe scans across both views at 1200, 360, and 320 px found no WCAG A/AA violations or horizontal overflow. Desktop and mobile screenshots were visually inspected. Syntax, source/public byte parity, and scoped whitespace checks passed. Tall-panel screenshots are captured after interaction assertions because browser capture temporarily changes the viewport.
