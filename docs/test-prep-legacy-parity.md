# Test Prep Hub legacy-parity and reuse audit

Updated: 2026-07-14

## Outcome

The native AlloFlow Test Prep Hub should reuse the legacy Pass the EPPP content only after review, while reusing one pack-agnostic learning engine for EPPP and every other exam pack. It must not reproduce the legacy app's unofficial scaled scores, pass classifications, or uncalibrated CAT ability estimates.

## Current parity

| Capability | Native status | Notes |
| --- | --- | --- |
| Independent practice banks | Complete | EPPP has fifteen selectable, blueprint-balanced banks of 100. Other packs use the same `batchSize` contract. |
| Answer explanations and option feedback | Complete for released native packs | Sources, full source names, credibility explanations, and review metadata travel with each item. |
| Timed simulation | Complete where pack metadata provides it | Uses `simulationItemCount` and `simulationTimeMinutes`; results are explicitly not official scores or pass predictions. |
| Resume an interrupted set | Complete | A normalized session record works with any registered pack. |
| Saved-question review | Complete | Saved IDs are namespaced by pack. |
| Domain, skill, and confidence diagnostics | Complete | The same analytics functions process every pack. |
| Transparent smart review | Complete | `buildReviewSet` prioritizes confident misses, prior misses, low-confidence correct answers, weaker domains, and unseen items while maintaining domain coverage. It is not CAT. |
| Progress backup and restore | Complete | Versioned export/import includes normalized attempts, per-item learning signals, and saved-review IDs for all packs. |
| Learning chapters, diagrams, checks, flashcards, and memory aids | Structurally migrated | All 49 EPPP chapters are source-reviewed. The broader legacy flashcard, memory-aid, term-definition, and diagram inventories still have separate review gates. |
| Learning-library search and filters | Partial | Native chapter/flashcard/memory-aid search exists; a single global search across questions, notes, and all learning objects does not. |
| Flashcard ratings | Partial | Ratings persist per pack, but due-date scheduling and a transparent spaced-repetition queue remain to be built. |
| Notes and highlights | Not yet native | Legacy notes/highlights should be redesigned with exportable, pack-scoped records and accessible annotation controls. |
| Goals, streaks, and study calendar | Not yet native | Future goals should emphasize activity and retrieval plans without implying exam readiness. |
| Custom domain quiz builder | Not yet native | The engine supports targeted skills and smart review; learner-selected domains, lengths, and deterministic shuffle are the next reusable practice-builder layer. |
| Community feedback | Not migrated | Requires moderation, privacy, abuse handling, and an evidence workflow before it belongs in AlloFlow. |
| Legacy CAT and scaled/pass estimates | Deliberately excluded | The legacy heuristics are not psychometrically calibrated and must not be presented as ability estimates, official scaled scores, or pass predictions. |

## Remaining content work

- 1,443 of 2,933 legacy questions have entered the native QA-passed bank; 1,490 remain quarantined.
- All 49 textbook chapters have source-review status, but independent qualified psychology/assessment review is still pending.
- Only a small reviewed subset of the 415 flashcards and 255 memory aids is release-ready; the rest remain preserved but gated.
- Diagram templates and term definitions are inventoried, but need claim-level source review and accessible interaction review before broad native release.
- Released questions still require production validation and, if meaningful score interpretations are ever desired, real psychometric calibration using response data and qualified expertise.

## Reusable engine contract

A new pack can register through `registerPack` after `normalizePack`/`validatePack`, then use the same APIs:

- `arrangeBalancedBatches`, `batchMeta`, and `buildBatchDiagnostic`
- `scoreAttempt`, `recordAttempt`, and `recordBatchAttempt`
- `buildProgressAnalytics` and `buildReviewSet`
- `exportProgress`, `importProgress`, and `normalizeReviewItems`
- shared simulation, saved-question, session-resume, learning-library, source-display, and accessibility UI

Cross-pack tests exercise this contract with EPPP, Praxis Audiology 5343, Praxis Reading Specialist 5302, and Praxis Educational Leadership 5412. Pack-specific builders remain responsible for blueprint metadata, question content, learning content, authoritative sources, and QA rules.