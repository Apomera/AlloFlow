# Learning-route visual clarity — 2026-10-03

The four learning routes now have visible button boundaries, complete labels, and targets at least 48px tall. Route text retains its existing 16px size. The smaller Essentials and Advanced labels increase from 11.5px to 14px, with 16px labels in large-text mode. Selected routes and workspace choices use a 3px border and underline, including high contrast and forced colors. Keyboard focus stays inside each control.

The layout follows the available lab width: four route columns above 980px, two from 441–980px, and one at 440px or below. Workspace detail moves to a separate row as the lab narrows. This also works in a narrow lab embedded within a wider browser.

## Measured clarity

| Layout | Smallest control text | Route columns | Rail height |
| --- | --- | --- | --- |
| phone | 11.5 → 14.0 px | 2 → 1 | 178 → 307 px |
| tablet | 11.5 → 14.0 px | 4 → 2 | 119 → 195 px |
| desktop | 11.5 → 14.0 px | 4 → 4 | 67 → 82 px |
| embedded-medium | 11.5 → 14.0 px | 3 → 2 | 120 → 195 px |
| embedded-large | 16.0 → 16.0 px | 2 → 1 | 224 → 308 px |
| forced-colors | 11.5 → 14.0 px | 2 → 1 | 167 → 307 px |

All six final layouts have no horizontal overflow, clipped text, or forced single-line labels. The taller phone layout gives each full route name its own row. Before/after inventories match exactly for labels, accessible names, titles, disabled states, and selections.

## Verification

| Checks | Result |
| --- | --- |
| Six layouts, resize with focus retained, Guided activation, practical locks, and increased text spacing | 10 browser cases passed |
| Lab evidence and workspace layout unit suites | 197 unit cases passed |
| Accessibility within the learning-route toolbar | Six scoped audits, zero violations |

All six scoped audits finished with zero violations and zero incomplete checks.

Keyboard checks cover Arrow keys, Home, End, Enter, and Space. Switching Essentials and Advanced preserves specimen position, notes, confidence, identifications, revealed layers, procedure evidence, and scores. Guided activation preserves saved evidence. Practical mode retains three disabled route locks, and keyboard navigation skips them.

The final browser run used the local working tree with one Chromium worker, no retries, and video disabled. It finished in 47.5 seconds. Six baseline captures are excluded from the behavioral total. Screenshots make the sticky next-action card static only during capture.

To rerun: `npx playwright test tests/e2e/dissection-route-clarity.spec.ts --workers=1 --retries=0`. Focused units: `npx vitest run tests/dissection_lab_improvements.test.js tests/dissection_workspace_bands.test.js --pool=threads --maxWorkers=1`.

## Verification history

The first browser run passed nine cases and failed the forced-colors selected-border check. A global forced-colors rule used an important 1px border, overriding the new selection style. The scoped selected-border rule now uses the same priority. All ten cases passed in a fresh full run with the original assertion retained. Only that final run contributes to the passing browser total.

The baseline renderer was saved before this pass and matched SHA-256 `2a2ff5929bdc6a54d080b973b8588fc1e1a5f5438cebce25c789859405afba18`. Its six captures use the same fixture and browser spec as the final run. The temporary renderer was removed after validation. Raw attempt records retain source and spec hashes before and after each run.

[Baseline attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before/attempt.json) · [Initial browser attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/initial/attempt.json) · [Final browser attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/final/attempt.json) · [Unit attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/unit/attempt.json)

## Screenshots

[phone before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-phone.png) · [phone after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-phone.png) · [phone keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-phone.png)

[tablet before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-tablet.png) · [tablet after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-tablet.png) · [tablet keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-tablet.png)

[desktop before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-desktop.png) · [desktop after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-desktop.png) · [desktop keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-desktop.png)

[embedded-medium before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-embedded-medium.png) · [embedded-medium after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-embedded-medium.png) · [embedded-medium keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-embedded-medium.png)

[embedded-large before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-embedded-large.png) · [embedded-large after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-embedded-large.png) · [embedded-large keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-embedded-large.png)

[forced-colors before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/before-forced-colors.png) · [forced-colors after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/after-forced-colors.png) · [forced-colors keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/focus-forced-colors.png)

[Guided investigation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/guided.png) · [Practical route locks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/practical.png) · [Increased text spacing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/text-spacing.png)

## Source integrity

Both renderer copies match, parse successfully, and retain LF line endings. Reversing the six recorded CSS edits reproduces the starting renderer exactly. All content outside the injected stylesheet is byte-identical. Scoped whitespace checks passed. Changes remain unstaged and uncommitted.

Final renderer SHA-256: `c947bbdf3f4e2d2ead29a5498efbde95e3823e8b17fe8fc08e2b451928dc20a1`

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/verification.json) · [Reversible CSS edit record](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-route-clarity-2026-10-03/source-edit.json) · [Permanent browser spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-route-clarity.spec.ts)
