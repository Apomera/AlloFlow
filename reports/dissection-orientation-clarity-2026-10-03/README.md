# Dissection Lab: clearer view and orientation guide

The View & orientation guide now responds to the lab's available width. A narrow embedded lab gets readable stacked view cards and a full-width axis diagram, even inside a wide browser window.

## Improvements

- View cards use one column up to 440 px, two up to 900 px, and four on wider labs.
- Axis guidance stacks below the diagram up to 900 px. Larger circle/diamond markers and labels clarify the two landmarks.
- Visible headings separate choosing a view, reading the illustration, and preparing a layer.
- Body text and captions are at least 14 px; large-text mode uses at least 16 px. Controls are at least 48 px tall.
- Narrow headers keep the title and current view together, with the disclosure marker beside them.
- Forced colors use a persistent selected border and a separate keyboard focus outline.

View changes retain their existing behavior: changing the preset clears the current structure selection while preserving layer preparation, recorded evidence, identification credit, scores, Guided checkpoints and scenario timestamps. Internal view remains a study preset. Quiz and timed-practical modes keep this reference guide hidden.

## Measured clarity

Axis label sizes below include SVG scaling, so they describe the size actually rendered on screen.

| Layout | View columns, before → after | Smallest axis label, before → after | Smallest text after |
| --- | --- | --- | --- |
| phone | 2 → 1 | 8.8 → 15.9 px | 14.0 px |
| tablet | 4 → 2 | 10.5 → 22.0 px | 14.0 px |
| desktop | 4 → 4 | 11.5 → 20.8 px | 14.0 px |
| embedded-large | 4 → 1 | 3.1 → 18.8 px | 16.0 px |
| forced-colors | 2 → 1 | 11.4 → 20.7 px | 14.0 px |

All five final layouts have no horizontal overflow or clipped text. Landmark labels stay within the SVG. The existing button inventory, names, selected states and disabled states match the baseline.

## Verification

| Checks | Result |
| --- | --- |
| New layout, keyboard, resize, mirrored-axis, assessment and Guided cases | 11 passed |
| Existing spatial-guide and view-control browser cases | 8 passed |
| Total behavioral browser cases | 19 passed |
| Reference, lab and canvas unit checks | 243 passed |
| Scoped orientation-guide accessibility audits | Five audits, zero violations |

Five earlier baseline captures measure the original presentation and are excluded from the 19 behavioral cases. Browser verification uses the local working-tree Chromium harness with video disabled and one worker. The next-action card uses static positioning during screenshots. Accessibility audits cover the orientation guide.

SVG contrast checks remain incomplete in phone, tablet, desktop, embedded-large, forced-colors. Manual source and screenshot review found legible landmark labels on the figure backgrounds; the automated results remain marked incomplete.

## Verification history

The first baseline command selected no tests because its title filter was anchored before Playwright's project/file prefix. The corrected filter captured all five layouts; [the empty setup result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-setup/attempt.json) is retained. Product source and test assertions were unchanged.

The first enhancement passed all 11 new cases. Screenshot review then found the narrow disclosure marker on a separate row. A small header layout refinement kept it beside the title and view, and the new suite passed all 11 cases again. Captures now move the pointer outside the guide before the initial screenshot so hover does not resemble another selection. [The first passing run](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/new-initial/attempt.json) is retained.

The first unit run passed 242 of 243 cases. The remaining contract found that the desktop text catalog lacked 39 existing Perception study strings. Guarded semantic and textual comparisons proved that the desktop copy had no unique keys or changed shared values. Copying the unchanged source bytes repaired the mirror; no Dissection strings or test expectations changed. The full focused unit rerun passed all 243 cases. [Repair details and reconstruction evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/catalog-mirror-repair.json) and [the initial unit result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/unit-initial/attempt.json) are retained.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/verification.json) · [Source edit record](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/source-edit.json) · [Browser spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-orientation-clarity.spec.ts)

## Screenshots

[phone before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-phone.png) · [phone after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/after-phone.png) · [phone keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/focus-phone.png)

[tablet before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-tablet.png) · [tablet after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/after-tablet.png) · [tablet keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/focus-tablet.png)

[desktop before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-desktop.png) · [desktop after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/after-desktop.png) · [desktop keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/focus-desktop.png)

[embedded-large before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-embedded-large.png) · [embedded-large after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/after-embedded-large.png) · [embedded-large keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/focus-embedded-large.png)

[forced-colors before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/before-forced-colors.png) · [forced-colors after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/after-forced-colors.png) · [forced-colors keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/focus-forced-colors.png)

[Pig mirrored axis](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/pig-mirrored.png) · [Isolated-eye mirrored axis](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-orientation-clarity-2026-10-03/sheepEye-mirrored.png)

## Source integrity

Both renderer copies are byte-identical, parse successfully and retain LF line endings. Reversing the six recorded edits reconstructs the original renderer hash exactly. Scoped whitespace checks passed and temporary regression specs were removed.

Final renderer SHA-256: `e1ed893a422ed3deeb0c001cb9e639ee75df5593f21f695d66b61a3a74fd0500`

Changes remain unstaged and uncommitted.
