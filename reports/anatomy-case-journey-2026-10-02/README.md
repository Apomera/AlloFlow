# Anatomy clinical case enhancement — 2 October 2026

Clinical cases now have a readable reasoning flow and a reliable round trip to the diagram. Opening a posterior case marker from an answered anterior Quiz preserves the question, answers, score, and activity. Returning restores the original diagram, selection, search, study filter, activity, and saved 3D preference while retaining newer writing.

## What changed

- Added a named case banner beside the diagram with the authored marker scope and a clear return button.
- Split the case panel into reading, optional reasoning, hint, explanation, uncertainty, and resources. Added a draft character counter and separate progress for the current atlas and all eight cases.
- Raised case prose and controls to 16px, or 17px in larger text. Improved spacing, theme colors, visible focus, mobile wrapping, and touch targets.
- Hint, reveal, retry, review, and return actions focus the relevant content. Return uses the case title when the explanation is hidden. Delayed actions respect deliberate focus changes.
- Guarded updates against changed navigation, changed case rows, duplicate actions, and malformed or inherited saved records. Review remains participation and does not create retrieval credit.
- Added ten labels in English, French, Latin American Spanish, and Arabic across both runtime catalogs.

## Verification

| Check | Result |
| --- | --- |
| Dedicated case journey fixture | 238/238 passed across both runtime copies |
| Supporting fixtures | 315/315 passed across seven files |
| Distinct unit checks | 553/553 passed |
| Browser journeys | 5/5 passed, no skips or retries |
| Scoped accessibility scans | 20, zero violations |
| Browser errors / horizontal overflow | Zero |
| Smallest measured case text | 16px; 17px in larger text |
| Smallest measured button | 46 × 49.19px |
| Minimum measured text contrast | 7.66:1; 13.99:1 in forced colors |
| Final screenshots | 13 visually reviewed; hashes verified |

The browser journeys use actual Quiz answers, card ratings, and a Spotter answer. They check the posterior marker and exact Quiz return, phone reload with newer reasoning, hidden-explanation fallback, active Spotter with a saved 3D preference, hint/reveal/retry/review focus, and legacy return compatibility. The display matrix covers English desktop and 320px phone layouts in light, dark, and contrast modes; Arabic RTL with larger text in the same themes; and forced colors. Both forced-color action labels also pass pixel checks.

The authored eight-case data block is unchanged. Runtime copies are byte-identical. All final source evidence uses LF SHA256 **2fb12e25f3ca63870d5a7c827fe380ca53d31401fcf472735284e744085c4731**. No staging, commit, or push was performed; the runtime files remain modified and unstaged.

## Evidence

- [Final verification](final-verification.json), [dedicated results](case-unit-results.json), [supporting results](support-final-tests.json).
- [Browser verification](browser-verification.json), [browser observations](browser-validation.json), [Playwright results](playwright-results.json).
- [Localization and preservation audit](localization-audit.json), [label manifest](../../dev-tools/i18n/anatomy_case_journey_20261002.json).
- [Desktop case panel](screenshots/desktop-case-reading-feedback.png), [Arabic larger-text case](screenshots/phone-arabic-dark-case.png), [contrast case](screenshots/phone-contrast-case.png), [forced-color return](screenshots/phone-forced-case-marker-context.png).

The localization audit compares this pass with the preserved dirty worktree. Earlier Anatomy and Connections labels remain intact. Concurrent Dinolab changes in the English catalogs were classified separately and retained. Existing English Anatomy registration gaps are 1,713 → 1,712 under the same literal-call method, with zero new gaps; this pass does not claim a clean global registration gate.

Initial diagnostics are retained separately: two dedicated failures identified the corrected Spotter 3D preference issue, and an early browser run used a double pointer activation for a focus assertion. The final browser fixture uses a single activation for focus; duplicate review safety is verified by the dedicated unit fixture. Final results above use the refined source.
