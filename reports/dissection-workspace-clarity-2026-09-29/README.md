# Dissection Lab workspace clarity

September 29, 2026

The lab now responds to the width of its own workspace. A narrow lab embedded in a wide desktop page gets a stacked specimen and notebook, readable technique controls, and a next-action card that stays in normal document flow. This prevents the sticky card from covering the field monitor or notebook controls.

The field monitor gives small screens wider cards, wraps full tissue-status descriptions, and shows metric values in larger type. Secondary descriptions use solid text and more line spacing. Pre-contact checks use the same layout and larger controls.

Protocol labels and instructions are larger. Larger-text mode also applies to bold labels, numeric values, small descriptions, and definition lists. Long structure names and navigation buttons wrap into separate rows when needed.

## Visual review

- [Previous monitor in an embedded lab](before-monitor-embedded-520.png)
- [Updated monitor in an embedded lab](after-monitor-embedded-520.png)
- [Smallest monitor with larger text and high contrast](after-monitor-embedded-320.png)
- [Phone monitor at 320 pixels](after-monitor-320.png)
- [Protocol instructions with larger text](after-protocol-embedded-320.png)
- [Previous embedded 520-pixel stage](before-stage-embedded-520.png)
- [Updated embedded 520-pixel stage](after-stage-embedded-520.png)
- [Updated embedded 320-pixel stage with larger text and high contrast](after-stage-embedded-320.png)
- [Phone stage at 320 pixels](after-stage-320.png)
- [Phone stage at 390 pixels with larger text](after-stage-390.png)
- [Long structure name and evidence note at 320 pixels](after-selection-320.png)
- [Tablet stage](after-stage-768.png)
- [Desktop stage](after-stage-1440.png)

## Verification

The browser checks use the local renderers and compiled app styles. They measure panel widths, check for clipped text and horizontal overflow, verify text sizes, exercise monitor and structure controls, and retain an existing evidence note. Scenarios include phone, tablet, desktop, and narrow embedded layouts; the smallest embedded case also uses high contrast and larger text.

The preserved prior renderer reproduced an embedded-layout failure: a pointer click on the field monitor was intercepted by the sticky next-action card. The comparison captures use keyboard activation to open that monitor. The updated checks use ordinary pointer clicks.

Final results are recorded in [verification.json](verification.json), [browser-results.json](browser-results.json), and [unit-results.json](unit-results.json).

All 15 Chromium scenarios passed: six workspace layouts and nine overlay/contact regressions. All 109 focused regression checks passed. Both renderer copies match byte for byte and pass syntax and scoped whitespace checks.

All changes remain uncommitted.
