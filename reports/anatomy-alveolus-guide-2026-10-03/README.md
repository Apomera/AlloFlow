# Alveolar exchange guide enhancement

October 3, 2026

The exchange atlas now separates the alveolus and capillary overview from the magnified air–blood barrier. Numbered markers connect both illustrations to readable structure keys. Four process buttons, Previous and Next controls, and a clear explanation keep the selected process close to the diagrams.

## Changes

- Replaced tiny diagram words with HTML structure keys. The six barrier layers remain readable on phones instead of disappearing behind the former mobile label rule.
- Added a visible exchange status and preserved the paused preference when changing steps.
- Kept the original oxygen and carbon dioxide directions, mechanism layers, and pulmonary edema overlay. The capillary pointer now targets the vessel separately from a red blood cell.
- Guarded controls and delayed handoffs against changed study contexts while preserving newer notes, quiz work, cards, spotter progress, and clinical study records.
- Made the heart handoff retain the playback preference, open the normal left-heart return view, and move keyboard focus to the destination. A newer input focus is respected.
- Added 62 English labels and 186 native translations across French, Latin American Spanish, and Arabic, including the clinical explanation and heart handoff.
- Improved contrast, touch targets, dark theme, larger text, RTL wrapping, and forced colors.

The original anatomy data and eight scientific, clinical, and handoff passages are unchanged. Eight of the nine original SVG path definitions remain; the connector between the former inset and overview was removed because the illustrations now occupy separate figures. Both runtime copies match. Reversing the alveolus renderer and its scoped CSS restores the exact source baseline, including the prior kidney and gallery enhancements.

## Verification

| Check | Final result |
| --- | --- |
| Required unit checks | 283 passed: 108 alveolus, 74 kidney, 64 gallery, 28 scale, 9 science |
| Browser journeys | 2 passed; no retries or skipped journeys |
| Accessibility scans of the guide | 5; zero violations |
| Reviewed screenshots | 6, with independent visual review |
| Diagram measurements | 10 |
| Page errors, horizontal overflow, marker intersections | None measured in the tested views |
| Minimum HTML text contrast | 5.93:1 |
| Minimum diagram number contrast | 7.56:1 |
| Minimum measured control size | 106.64 × 48.39px |
| HTML text and structure keys | 16px normally; 17px with larger text |
| Phone diagram numbers | 14.67px overview; 16.86px barrier |

The five display settings are desktop light, 320px phone light, phone dark, Arabic dark with larger text, and forced colors. The two browser journeys cover the four steps, playback preference, saved work, keyboard focus, clinical view, and the route to the heart. All nine selected science titles ran; 146 unrelated science cases were skipped.

The baseline phone diagram words measured 2.98–4.83px, while the HTML step text was 11px and header controls were 30.5px high. The new guide replaces those words with readable keys and larger diagram numbers. The prior airflow badge measured 2.77:1 contrast.

The final unit run retained 246 successful thread-worker cases and ran the remaining 37 cases in one fork worker after thread startup timed out. All five successful proofs use the same final source and fixture hashes. Earlier diagnostic runs remain available alongside the final evidence.

### Scope

These results cover the exchange guide, five display settings, and the listed regressions. French and Spanish catalog values and placeholders were checked; the translated browser view was Arabic. Other regional diagrams retain their existing layouts. This is not a full application accessibility audit.

## Evidence and captures

- [Final delivery verification](delivery-check.json)
- [Source scope and catalog verification](source-scope-proof.json)
- [Combined final unit summary](units-final-02a0343a-summary.json)
- [Browser measurements and review](browser-review-summary.json)
- [Browser test results](playwright-results.json)
- [Independent visual review](runs/browser-02a0343a-01/independent-visual-review.json)
- [Localization validation](catalog-validation.json) and [readback](catalog-readback.json)
- [Desktop guide](screenshots/desktop-light-alveolus-guide.png)
- [Phone light](screenshots/phone-light-alveolus-guide.png) and [phone dark](screenshots/phone-dark-alveolus-guide.png)
- [Arabic with larger text](screenshots/phone-arabic-dark-larger-alveolus-guide.png)
- [Forced colors](screenshots/phone-forced-colors-alveolus-guide.png)
- [Clinical step 2](screenshots/desktop-alveolus-clinical-step-2.png)
- [Baseline review](baseline/review-summary.json)

The final runtime SHA256 is `02a0343a0390d1df187d685fdfdd541a2926c1f4491387fc1eb16d2818ebbd0c`. Final delivery evidence uses this hash; earlier diagnostic captures are kept in their own run folders.

[Scoped Git whitespace checks](git-validation.json) passed. The changes remain unstaged and uncommitted.
