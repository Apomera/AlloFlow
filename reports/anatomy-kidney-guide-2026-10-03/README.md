# Kidney guide enhancement

October 3, 2026

The kidney atlas now presents three separate illustrations: the kidney in the body, kidney regions, and the nephron. Numbered markers connect each illustration to readable structure keys. The four filtration steps have a clear explanation, current structure markers, Previous and Next controls, and an explicit flow status.

## Changes

- Replaced crowded diagram text with HTML keys that stay readable on phones and with larger text enabled.
- Preserved the paused flow preference when changing steps. Navigation stops at the first and last steps.
- Kept notes and saved study work through accepted updates, and guarded delayed actions against changed study contexts.
- Retained the clinical protein leak overlay and moved its explanation into readable text.
- Added 59 English labels and 177 translations across French, Latin American Spanish, and Arabic. All four catalog pairs match at final verification.
- Improved dark theme contrast, keyboard focus, RTL layout, and forced color support.

The original anatomy content and mechanism narratives are unchanged. Fifteen of the original seventeen SVG paths remain; two scale connectors were removed because their illustrations now occupy separate panels. The runtime source and desktop copy are identical. Reversing the kidney renderer and its scoped CSS restores the exact source baseline.

## Verification

| Check | Result |
| --- | --- |
| Focused unit checks | 175 passed: 74 kidney, 64 gallery, 28 scale, 9 science |
| Browser journeys | 2 passed; no retries or skipped journeys |
| Accessibility scans | 5 scans of the guide; zero violations |
| Reviewed screenshots | 6 |
| Horizontal overflow, marker intersections, page errors | None measured in the tested views |
| Minimum measured text contrast | 5.93:1 |
| Minimum measured control size | 103.53 × 48.39px |
| Structure key text | 16px normally; 17px with larger text |
| Smallest phone diagram number | 14.875px |

The five tested views are desktop light, 320px phone light, phone dark, Arabic dark with larger text, and forced colors. The two journeys cover navigation, keyboard focus, playback preferences, saved work, and the clinical overlay. The science run selected nine relevant cases; 146 unrelated science cases were skipped.

Before this change, kidney SVG labels measured about 2.54–3.81px on a 320px phone and had two measured text intersections. The redesigned guide has 16px structure keys, approximately 15px phone markers, and no measured marker intersections.

### Limits

The inherited kidney-to-heart handoff paragraph and “Connect cardiac output” button remain English in the Arabic view. Other regional diagrams retain their existing layouts. These results cover the kidney guide and the listed regressions; they are not a full application accessibility audit.

## Evidence and captures

- [Final delivery verification](delivery-check.json)
- [Source scope and catalog verification](source-scope-proof.json)
- [Browser measurements and visual review](browser-review-summary.json)
- [Browser test results](playwright-results.json)
- [Navigation and regression unit proof](kidney-guide-navigation-units-9faaef01-2026-10-03T14-49-03-916Z-proof.json)
- [Selected science unit proof](kidney-existing-science-units-9faaef01-2026-10-03T14-49-03-916Z-proof.json)
- [Desktop guide](screenshots/desktop-light-kidney-guide.png)
- [Phone light](screenshots/phone-light-kidney-guide.png), [phone dark](screenshots/phone-dark-kidney-guide.png)
- [Arabic with larger text](screenshots/phone-arabic-dark-larger-kidney-guide.png)
- [Forced colors](screenshots/phone-forced-colors-kidney-guide.png)
- [Clinical step](screenshots/desktop-kidney-clinical-step-3.png)
- [Baseline measurements](before-baseline-metrics.json)

The final runtime SHA256 is `9faaef017b8cff11cf5d0968334e861a84a34994415c4be2d67dc32e7af358fc`. Earlier diagnostic runs are retained separately; final evidence uses this source hash.

Scoped Git whitespace checks passed. The changes remain unstaged and uncommitted.
