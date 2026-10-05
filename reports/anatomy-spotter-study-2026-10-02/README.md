# Anatomy Spotter enhancement — 2 October 2026

Spotter now has a clear study loop: answer, compare the two functions, open the missed structure, and return to the saved feedback. Pausing an unanswered round in Explore restores ordinary diagram labels and selection.

## What changed

- Added a named study banner and a direct return to the same answered round. Return restores the original atlas, orientation, layer level, selection, search, study filter, Quiz setting, and saved 3D preference while retaining newer work.
- Separated “Your answer” and “Marked structure” into readable function comparisons. The header now names both correct answers and total answered questions.
- Raised panel and banner text to 16px, or 17px in larger text. Enlarged vocabulary controls, filled Start/Next/Return actions, and made End visually quieter. Refined spacing, wrapping, focus, theme colors, and forced colors.
- Function explanations choose their own text direction, so the existing English fallbacks read naturally within Arabic screens. Authored function wording remains unchanged.
- Kept crosshair protection specific to the displayed Spotter activity. Diagram clicks leave an unanswered round intact; Explore uses full names and normal selection. Named Learning tools are hidden before an answer, including when the saved selection matches the target, then return in Explore and after feedback.
- Guarded saved origins, changed navigation, changed rounds, and delayed effects. Actions preserve newer notes, clinical reasoning, quizzes, cards, Connections practice, timing, and learning evidence. Opening Spotter Study clears unrelated return banners.
- Display a best timed response only when a valid positive record exists. Untimed or empty records no longer appear as a 0.0-second best.
- Added eight labels in English, French, Latin American Spanish, and Arabic across both catalog copies.

## Verification

| Check | Result |
| --- | --- |
| Dedicated Spotter journey fixture | 232/232 passed across both runtimes |
| Supporting and localization fixtures | 473/473 passed across eight files on the behavior checkpoint |
| Distinct unit checks across checkpoints | 705/705 passed |
| Browser journeys | Five main journeys and one Arabic supplement passed |
| Scoped accessibility scans | 23; zero violations |
| Browser errors / horizontal overflow | Zero |
| Smallest measured panel and banner text | 16px; 17px in larger text |
| Smallest measured control | 46 × 44px |
| Minimum measured text contrast | 7.29:1 |
| Screenshots | 18 visually reviewed; hashes verified |

The browser journeys check actual Quiz work and wrong Spotter answers, Study/reload/new writing/return, pending Spotter versus paused Explore, deliberate focus and superseded origins, function comparison, score, text-to-speech, and absent timed records. The visual matrix covers desktop and 320px English phones in light, dark, and contrast modes, 320px Arabic RTL with larger text in the same themes, and forced colors. The report scopes typography measurements to the Spotter panel and study banner.

The authored systems and clinical data, and the previous clinical study journey, are unchanged against the preserved dirty worktree. Runtime copies are byte-identical. The final source, Arabic supplement, and localization audit use LF SHA256 **ac1f6aaf8f6bd41449b79ee81c8de9bb4c971bf58b30864d0c6c2ecc126f9ff8**. The 232 interaction checks and five main browser journeys use **076c52eb1bfed83695fb2dfe138692a8fedc7c96155df91073484482ef97a75a**; the last change adds two text-direction attributes, covered by the Arabic supplement. The 473 supporting checks last completed on **d62e1f8aa968806557b357945bf6b12e1061954aee292baa98d9b057267a0db7**. [Exact reversal proof](candidate-chain-proof.json) links these checkpoints. Later broad reruns hit worker startup or outer time limits and are excluded from passing counts. No staging, commit, or push was performed; runtime files remain modified and unstaged.

## Evidence

- [Final verification](final-verification.json), [final dedicated checks](spotter-unit-results.json), [supporting checkpoint](support-final-d62-tests.json), [localization tests](localization-tests.json).
- [Main browser verification](browser-verification.json), [browser observations](browser-validation.json), [Playwright results](playwright-results.json), [final Arabic supplement](rtl-supplement/verification.json).
- [Localization and preservation audit](localization-audit.json), [label manifest](../../dev-tools/i18n/anatomy_spotter_study_20261002.json), [source preservation](source-preservation.json).
- [Desktop study diagram](screenshots/desktop-study-whole-model.png), [phone returned feedback](screenshots/phone-returned-feedback.png), [pending crosshair](screenshots/phone-pending-crosshair-whole-model.png), [paused Explore](screenshots/phone-paused-explore-whole-model.png).
- [Final Arabic feedback](rtl-supplement/screenshots/phone-arabic-dark-feedback-direction.png), [final Arabic study diagram](rtl-supplement/screenshots/phone-arabic-dark-study-direction.png).

The localization audit preserves earlier Anatomy, Clinical, and Connections labels. Concurrent English catalog updates remain separately recorded and intact. Existing English Anatomy registration gaps are 1,712 → 1,711 under the same literal-call method, with zero new gaps; no global registration gate is claimed.

Diagnostics are retained separately. Fixture refinements settle startup participation flags, focus the actual mounted and visible control, account for an unrelated already-earned badge sound, and assert the named heading separately from its function paragraph. Source refinements correct an unnecessary state mutation, guard optional scrolling, clear foreign origins, and fix the timed-record footer. Final CSS changes reverse exactly to the fully passing behavior candidate. A cold worker startup, a first canvas case that exceeded the runner budget, and a screenshot timeout are preserved as environment diagnostics. Final runs keep all assertions and use serial execution with additional time where needed.
