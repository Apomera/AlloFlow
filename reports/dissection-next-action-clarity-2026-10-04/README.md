# Next-action clarity — 2026-10-04

The next-action card now gives setup, recording, study, Guided evidence, and assessment states the same readable hierarchy as inspection. Supporting text and context use at least 14px, headings use 18px, and buttons retain 16px text with targets at least 48px tall. Large-text mode uses at least 16px supporting text and 20px headings. Solid tone backgrounds, a clear leading border, and separate specimen-context chips make the recommendation easier to scan.

The step badge preserves its intended two lines on wider layouts and fits naturally on phones. Focus outlines stay inside buttons and the programmatically focused heading. The white primary outline measures 5.47:1 against teal; the blue secondary outline measures 5.43:1 against white. High contrast and forced colors retain a thicker, underlined primary action. The badge and specimen context now expose their existing accessible names as groups.

## Measured layout

| Layout | Smallest supporting text | Card columns | Height |
| --- | --- | --- | --- |
| phone | 10.9 → 14.0 px | 1 → 1 | 279 → 374 px |
| tablet | 10.9 → 14.0 px | 3 → 2 | 120 → 234 px |
| desktop | 10.9 → 14.0 px | 3 → 3 | 119 → 171 px |
| embedded-medium | 10.9 → 14.0 px | 2 → 1 | 177 → 374 px |
| embedded-large | 10.9 → 16.0 px | 1 → 1 | 368 → 451 px |
| forced-colors | 10.9 → 14.0 px | 2 → 1 | 201 → 376 px |

All six layouts have no horizontal overflow or clipped text. The actions form their own row as the lab narrows, then stack below the recommendation at 520px or below. The layout follows the embedded lab width. Sticky behavior remains on wider layouts and becomes static at 980px or below. The taller phone card accommodates readable instructions and full action labels.

## Verification

| Checks | Result |
| --- | --- |
| Six layouts, keyboard handoffs, procedure/setup focus, Guided evidence, text spacing, resizing, and one planning prompt | 13 browser cases passed on installed source |
| Existing lab evidence and workspace layout suites | 197 unit cases passed |
| Accessibility within the next-action card | Six audits, zero violations and zero incomplete findings |

Primary and secondary actions reach study tools, the specimen, the missing note, the assessment summary, the pending Guided evidence check, or the required instrument. These checks preserve notes, confidence, inspected structures, verified identifications, procedure evidence, scores, view, and Guided position. Opening a missing record may select that existing structure; selection is intentionally excluded from the saved-evidence comparison.

Before/after inventories match for every visible title, instruction, context value, workflow label, action, button name, and disabled state. Five CSS edits and two group roles refine presentation and semantics. Action handlers, completion rules, and all other renderer logic remain identical.

The final installed-source run used one Chromium worker, no retries, video disabled, no renderer substitution, and a 1024MB Node heap limit. It finished in 153.2 seconds. Six matching baseline captures are excluded from the behavioral total. Screenshots make the sticky card static only during capture; keyboard and resizing checks use its real runtime behavior.

Rerun: `npx playwright test tests/e2e/dissection-next-action-clarity.spec.ts --workers=1 --retries=0`. Focused units: `npx vitest run tests/dissection_lab_improvements.test.js tests/dissection_workspace_bands.test.js --pool=threads --maxWorkers=1`.

## Verification history

The first prepared-source run passed 12 cases and failed the planning check because its selector did not exist in the app. The test now checks the actual `#diss-learning-checkpoint` and still requires zero duplicate next-action cards. Screenshot review also prompted the desktop badge line-break refinement. A fresh prepared-source run passed all 13 cases.

An earlier installed-source run stopped after 11 logged passes and produced no final result. The next run recorded five passes, two worker failures at 0ms, and six skipped cases; stderr reports a native out-of-memory failure. A fresh run with a smaller Node heap passed all 13 cases. All raw logs are retained.

Visual review then found that the original blue inset outline had weak contrast against the teal primary button. The primary now uses white, while secondary actions keep blue. The browser checks now measure outline contrast and require at least 3:1, along with the original width, inset, focus destination, and saved-evidence assertions. The final full run passed all 13 cases on the corrected source, followed by 197 unit checks. Only that final run contributes to the reported browser total.

The scratch renderer matched starting SHA-256 `c947bbdf3f4e2d2ead29a5498efbde95e3823e8b17fe8fc08e2b451928dc20a1`. Matching baseline captures were repeated with the final portable spec and byte-identical harness snapshots. Temporary renderer copies and harness snapshots were removed after verification.

[Matching final-spec baseline](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-focus/attempt.json) · [Initial prepared-source attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/candidate/attempt.json) · [Revised prepared-source attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/candidate-final/attempt.json) · [Interrupted installed-source log](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/final/stdout.txt) · [Worker memory failure](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/final-complete/results.json) · [Earlier complete run](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/final-stable/attempt.json) · [Final installed-source attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/final-focus/attempt.json) · [Unit attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/unit/attempt.json)

## Screenshots

[phone before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-phone.png) · [phone after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-phone.png) · [phone focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-phone.png)

[tablet before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-tablet.png) · [tablet after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-tablet.png) · [tablet focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-tablet.png)

[desktop before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-desktop.png) · [desktop after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-desktop.png) · [desktop focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-desktop.png)

[embedded-medium before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-embedded-medium.png) · [embedded-medium after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-embedded-medium.png) · [embedded-medium focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-embedded-medium.png)

[embedded-large before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-embedded-large.png) · [embedded-large after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-embedded-large.png) · [embedded-large focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-embedded-large.png)

[forced-colors before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/before-forced-colors.png) · [forced-colors after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/after-forced-colors.png) · [forced-colors focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/focus-forced-colors.png)

[Missing record](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/record.png) · [Assessment summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/assessment.png) · [Guided evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/guided.png) · [Ready procedure](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/procedure.png) · [Instrument setup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/setup.png) · [Text spacing and heading focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/text-spacing.png)

## Source integrity

Both renderer copies match, parse successfully, and retain LF line endings. Reversing the seven recorded edits exactly reconstructs the starting renderer. Everything outside the stylesheet and two group roles is byte-identical. Scoped whitespace checks passed. Changes remain unstaged and uncommitted.

Final renderer SHA-256: `a6a85471f36a50ca85a45f942e5acea54b6c75197195bcf1465f76713c6061fc`

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/verification.json) · [Reversible source record](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-next-action-clarity-2026-10-04/source-edit.json) · [Permanent browser spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-next-action-clarity.spec.ts)
