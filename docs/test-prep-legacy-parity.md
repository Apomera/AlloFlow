# Test Prep Hub legacy-parity and reuse audit

Updated: 2026-07-14

## Outcome

The native AlloFlow Test Prep Hub should reuse the legacy Pass the EPPP content only after review, while reusing one pack-agnostic learning engine for EPPP and every other exam pack. It must not reproduce the legacy app's unofficial scaled scores, pass classifications, or uncalibrated CAT ability estimates.

## Current parity

| Capability | Native status | Notes |
| --- | --- | --- |
| Independent practice banks | Complete | EPPP has fifteen selectable, blueprint-balanced banks of 100. Other packs use the same `batchSize` contract. |
| Blueprint versioning and transition notice | Complete for current EPPP pack | The pack identifies the current eight-domain Part 1-Knowledge blueprint used during 2026-2027 and links to ASPPB's scheduled integrated six-domain EPPP transition in the fourth quarter of 2027. |
| Answer explanations and option feedback | Complete for released native packs | Sources, full source names, credibility explanations, and review metadata travel with each item. |
| Timed simulation | Complete where pack metadata provides it | Uses `simulationItemCount` and `simulationTimeMinutes`; results are explicitly not official scores or pass predictions. |
| Resume an interrupted set | Complete | A normalized session record works with any registered pack. |
| Saved-question review | Complete | Saved IDs are namespaced by pack. |
| Domain, skill, and confidence diagnostics | Complete | The same analytics functions process every pack. |
| Transparent smart review | Complete | `buildReviewSet` prioritizes confident misses, prior misses, low-confidence correct answers, weaker domains, and unseen items while maintaining domain coverage. It is not CAT. |
| Progress backup and restore | Complete | Versioned export/import includes normalized attempts, per-item learning signals, saved-review IDs, learner annotations, and study plans for all packs; v1 files remain importable. |
| Learning chapters, diagrams, checks, flashcards, and memory aids | Structurally migrated; content review in progress | All 49 EPPP chapters and 209 of 415 flashcards have source-review records. The remaining flashcards, memory aids, term definitions, and diagrams retain separate review gates; independent qualified expert validation is still pending. |
| Unified released-content search and filters | Complete for released pack content | One pack-wide index searches released questions, chapters, flashcards, memory aids, written-response workshops, and learner-created notes/highlights. Quarantined legacy content remains excluded. |
| Transparent flashcard scheduling | Complete | Existing Know/Again ratings migrate into a pack-scoped schedule. Due queues use disclosed 10-minute and 1/3/7/14/30/60/120-day intervals without implying readiness. |
| Notes and highlights | Complete | Exportable pack-scoped records can attach to general study, questions, chapters, flashcards, memory aids, and written-response workshops. Contextual question/chapter actions and accessible editing controls are native. |
| Goals, streaks, and study calendar | Partial | Weekly question, completed-set, and active-day goals plus an activity streak are native and explicitly non-predictive. A future calendar may schedule specific study sessions and reminders. |
| Custom domain quiz builder | Complete | Learners select domains, a 1–100 item length, and a visible variation. The engine balances domains and deterministically reproduces the same set from the same choices. |
| Community feedback | Not migrated | Requires moderation, privacy, abuse handling, and an evidence workflow before it belongs in AlloFlow. |
| Legacy CAT and scaled/pass estimates | Deliberately excluded | The legacy heuristics are not psychometrically calibrated and must not be presented as ability estimates, official scaled scores, or pass predictions. |

## Remaining content work

- 1,443 of 2,933 legacy questions have entered the native QA-passed bank; 1,490 remain quarantined.
- The next 500 quarantined candidates are organized into five blueprint-weighted editorial batches. Each carries explicit automated risks and review tasks; none is learner-visible or counted as reviewed merely because it appears in the docket.
- The first claim-level adjudication batch reviewed the 10 candidates with no detected docket risks. Four needed minor corrections and six needed major rewrites; none was promoted. This confirms that automated risk screening is prioritization, not approval.
- The second claim-level adjudication batch reviewed 10 additional candidates across all eight EPPP domains. Four needed minor corrections and six needed major rewrites; none was promoted. Twenty legacy candidates have now completed editorial adjudication, while independent expert review remains pending.
- The third claim-level adjudication batch reviewed 10 candidates selected for consequential clinical, psychometric, cultural, statistical, and legal nuance. Four needed minor corrections and six needed major rewrites; none was promoted. Thirty legacy candidates have now completed editorial adjudication, while independent expert review remains pending.
- The fourth claim-level adjudication batch reviewed 10 candidates prioritized for duplicates, missing sources, weak feedback, clinical overstatement, and jurisdiction-sensitive law. Three needed minor corrections and seven needed major rewrites; none was promoted. Forty legacy candidates have now completed editorial adjudication, while independent expert review remains pending.
- The fifth claim-level adjudication batch reviewed 10 candidates prioritized for ambiguous percentages, duplicate definitions, medication-risk overstatement, incomplete diagnostic thresholds, and jurisdiction-sensitive licensure. Four needed minor corrections and six needed major rewrites; none was promoted. The cumulative adjudication index now tracks 50 unique legacy candidates, all still quarantined pending independent expert review and production validation.
- The sixth claim-level adjudication batch reviewed 10 candidates prioritized for neuroscience myths, cultural overgeneralization, psychometric inference, current medication regulation, diagnostic oversimplification, and jurisdiction-sensitive record retention. Two needed minor corrections and eight needed major rewrites; none was promoted. The cumulative adjudication index now discovers batches automatically and tracks 60 unique legacy candidates, all still quarantined pending independent expert review and production validation.
- The seventh claim-level adjudication batch reviewed 10 candidates prioritized for imaging inference, eyewitness-memory and developmental overgeneralization, assessment misuse, intervention-mechanism absolutes, illness-course models, and legally sensitive record disclosure. Three needed minor corrections and seven needed major rewrites; none was promoted. The cumulative adjudication index now tracks 70 unique legacy candidates, all still quarantined pending independent expert review and production validation.
- The first assisted bulk editorial wave reviewed 500 additional stable, nonduplicate candidates in five sets of 100. It excludes text- or flag-detected time-sensitive claims and domain-misaligned records, gives every proposed item a full named source with credibility rationale and option-specific feedback, and balances answer positions within each set. One item qualified as a minor-revision proposal and 499 as major-rewrite proposals; all remain quarantined. Across the native bank, high-touch adjudications, and this assisted wave, 2,013 of 2,933 legacy questions now have an editorial review record and 920 remain without one. Independent expert validation is still pending.
- All 49 textbook chapters have source-review status, but independent qualified psychology/assessment review is still pending.
- Flashcard review wave 01 audited 100 additional cards across all eight domains, revised 88 legacy wordings for accuracy or nuance, attached 17 full named reputable-source records with credibility explanations, and kept every card gated from learner release pending independent expert validation. Together with the 9 earlier reviews, 109 of 415 flashcards now have source-review records and 306 remain in first-pass review.
- Flashcard review wave 02 audited another 100 cards across all eight domains, rewrote all 100 after accuracy, nuance, source-alignment, and overclaim review, and attached 24 full named reputable-source records with credibility explanations. The reviewed total is now 209 of 415; 206 remain in first-pass review, and every reviewed card remains gated pending independent qualified expert validation.
- Eight of 255 memory aids have source-review records, two have editorial review but still need sources, and the rest remain preserved but gated.
- Diagram templates and term definitions are inventoried, but need claim-level source review and accessible interaction review before broad native release.
- Released questions still require production validation and, if meaningful score interpretations are ever desired, real psychometric calibration using response data and qualified expertise.
- The current pack must remain labeled Part 1-Knowledge. ASPPB says the current Part 1 and Part 2 blueprints continue during 2026 and 2027, while an integrated six-domain EPPP becomes operational in the fourth quarter of 2027; that future exam requires a separate versioned pack rather than silently remapping this bank.

## Reusable engine contract

A new pack can register through `registerPack` after `normalizePack`/`validatePack`, then use the same APIs:

- `arrangeBalancedBatches`, `batchMeta`, and `buildBatchDiagnostic`
- `scoreAttempt`, `recordAttempt`, and `recordBatchAttempt`
- `buildProgressAnalytics`, `buildReviewSet`, and `buildCustomQuiz`
- `searchPack` across released questions and learning objects
- `normalizeFlashcardSchedule`, `rateFlashcard`, and `buildFlashcardQueue` for transparent retrieval scheduling
- `normalizeAnnotations`, `upsertAnnotation`, and `deleteAnnotation` for portable pack-scoped study records
- `normalizeStudyPlans`, `studyPlanForPack`, and `buildStudyPlanStatus` for non-predictive weekly activity goals
- `exportProgress`, `importProgress`, and `normalizeReviewItems`
- shared simulation, saved-question, session-resume, learning-library, source-display, and accessibility UI

Cross-pack tests exercise this contract with EPPP, Praxis Audiology 5343, Praxis Reading Specialist 5302, and Praxis Educational Leadership 5412. Pack-specific builders remain responsible for blueprint metadata, question content, learning content, authoritative sources, and QA rules.