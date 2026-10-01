# Anatomy guidance and dashboard refinements

October 1, 2026. This evidence was recorded before the subsequent activity-switch refinement and scoped Anatomy commit.

## What improved

- **Clearer progress:** the dashboard explains which totals cover all saved work and which confidence counts use the current view. “To revisit” describes Need practice and Learning ratings; a short explanation distinguishes these from cards due for review.
- **Reliable next steps:** recommendations use the latest saved ratings, viewed flags, and quiz progress. Opening Quiz keeps its current question, answer, score, and attempts. Cards retains saved rounds and opens All structures when a review deck is empty.
- **Useful recovery:** every authored empty diagram context offers a populated view. A small structure pool leads to Cards when it cannot support Spotter.
- **Safer navigation:** retained controls and queued updates are checked against the current activity, diagram, learning band, and study-sheet state. Delayed focus respects newer activities, questions, writing, and user focus. Malformed saved destination fields are normalized.
- **Stronger visuals:** all six metric cards remain visible on phones. The dashboard has readable headings, theme colors, 44px controls, and larger-text support. Challenge icons and score text fit without clipping; Arabic score ordering is isolated correctly.
- **Localized guidance:** 24 labels added to French, Latin American Spanish, and Arabic, with identical desktop mirrors.

## Validation

| Check | Result |
| --- | --- |
| Distinct unit checks | 1,283 across 25 suites |
| New guidance behavior checks | 84 across both source copies |
| New localization checks | 21 |
| Browser journeys | 5 passed |
| Scoped accessibility scans | 96; zero violations |
| Dashboard layout | All six metrics visible; no internal scrolling or horizontal overflow |
| Guidance controls | Minimum 44px targets |
| Larger text | Minimum 17px in exercised content |
| Print checks | 6 across light, dark, and contrast themes |
| Source and locale mirrors | Exact byte parity |
| Screenshots | Four final captures reviewed at original resolution |

The broad unit run found four assertions tied to the old dashboard labels and one malformed-save metadata bug. After those corrections, all six affected suites passed again: 288 checks. Together with the other 19 passing suites, this gives 1,283 distinct passing checks. The final icon sizing and Arabic score presentation were checked in the browser.

Browser journeys covered guidance, saved-round return, study-record imports and exports, saved reflections, and activity writing. Accessibility scans cover the dashboard, study-sheet, and activity components exercised by those journeys. The guidance matrix includes 320px, 720px, and 1280px layouts, three themes, and Arabic with larger text.

## Visual evidence

- [Phone dashboard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/dashboard-phone.png)
- [Dark dashboard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/dashboard-dark.png)
- [Arabic dashboard with larger text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/dashboard-arabic.png)
- [Empty-view recovery](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/recovery-phone.png)

## Detailed evidence

- [Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/verification.json)
- [Broad unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/unit-results.json)
- [Repeated affected unit suites](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/final-ui-unit-results.json)
- [Guidance browser validation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/guidance-browser-validation.json)
- [Saved-round return regression](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/study-return-regression-validation.json)
- [Study-record regression](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/study-record-regression-validation.json)
- [Reflection regression](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/reflection-regression-validation.json)
- [Activity-writing regression](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-guidance-2026-10-01/activity-writing-regression-validation.json)

Canonical source: [stem_tool_anatomy.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_anatomy.js). LF-normalized SHA-256: `ed1cd299eb1d276e4464d1ca03e76b493fe0c67c19668f3a88228b3d2e9ac0a5`.
