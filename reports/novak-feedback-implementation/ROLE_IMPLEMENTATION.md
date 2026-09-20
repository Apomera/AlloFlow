# Novak feedback: role consistency implemented

Date: 2026-09-19. This completes the approved role-consistency follow-up in `ROLE_REVIEW.md`. Changes are local; no commit or deployment was made.

## Result

- Source analysis and the reader use matching **Use in this lesson** controls: Main reading, Supporting reading, or Not designated. The text's form (Original text, Original with supports, Adapted text) is shown separately.
- An original source and its supported reading share their lesson role. Adaptations retain their own role and a separate record of the original's role. Changing one lesson's role does not change an identical excerpt in another lesson.
- Making an adaptation a main reading requires explicit teacher confirmation. Imported main-reading claims without educator authorization are flagged for review and excluded from activity-source choices until corrected.
- **Based on** and **Use for activities** explicitly select the passage for activities without changing its role. Automatic choice follows the current lesson's roles. Ambiguous choices require a selection; deleted or unavailable choices never fall back to a different passage silently.
- Activities based on an adaptation receive its actual adapted text. The original snapshot remains separate provenance. Source Text's Analyze action uses its visible input, while Full Pack analysis can deliberately analyze a selected adaptation.
- Full Pack retains the reviewed input and rejects a stale reviewed plan after relevant source or role changes. Quiz analysis and lesson context stay within the selected reading family and lesson.
- Role, source-family, lesson, and input metadata survive save/load and student-pack/export paths. History and exports distinguish form from role. Source-access checks require the matching reading family and lesson, including analyses of adapted text.
- Existing original-preserving reading, source-format defaults, and optional side-by-side change markings remain available.

## Verification

Focused passing runs (groups overlap; counts are not additive):

| Area | Result |
| --- | --- |
| Shared role/source contract, hydration, and host callbacks | 145/145 |
| Generation, Full Pack, and embedded audit regression suites | 159/159 |
| Delivery, exports, and history sharing regression suites | 60/60; final contract refinement rechecked 30/30 |
| Reader and host integration regression suites | 94/94 |
| Stateful browser role/source checks | 9 passed, no runtime errors |
| Generated/public module pairs | 16 matching pairs |
| Canonical and desktop app shells | 3 syntax checks; parity apart from intended loader mode |

Browser evidence is in `role-browser-results.json`, `roles-analysis-desktop.png`, `roles-adapted-desktop.png`, and `roles-analysis-320.png`. Checks use the production selector, analysis, reader, and shared role modules in a stateful fixture. They cover role propagation, explicit adaptation selection, confirmation cancellation/acceptance, lesson scoping, reopening fixture state, and 320px controls. AI/audio callbacks are mocked; these checks do not evaluate live generated content. Save/load behavior is covered separately by contract tests.

The broader Firestore suite still has two previously identified, unrelated Memory Aid `visualAlt` cleanup failures. Focused role and reading suites pass. Scoped whitespace checks pass.

## Remaining follow-ups

Teacher gloss authoring, importance-based density, and the remaining reader source-family lookups were completed in the subsequent [gloss enhancement pass](../novak-gloss-enhancements/IMPLEMENTATION.md). Live model evaluation remains unverified because the local evaluation environment has no configured provider credentials. Community publication of preserved readings still uses the existing explicit refusal; this work does not expand its public payload. Local reading, student packs, and supported export paths carry the source/role information described above.
