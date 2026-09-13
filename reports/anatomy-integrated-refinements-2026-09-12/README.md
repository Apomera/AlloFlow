# Anatomy refinements — September 12, 2026

Implemented the assessment, imaging, brain, vocabulary, and tutor improvements identified in the two preceding anatomy reviews. The canonical module and active desktop copy contain the same changes.

## Learning and scientific accuracy

- **Brain activity:** Replaced statements equating EEG bands with specific diseases, intelligence, or consciousness with qualified explanations of normal patterns and interpretation limits. The lesson explains frequency, age, alertness, medicines, and recording artifacts. Sources: [American Epilepsy Society EEG atlas](https://www.ncbi.nlm.nih.gov/books/NBK390343/), [FDA assessment of the NEBA device](https://www.accessdata.fda.gov/cdrh_docs/reviews/k112711.pdf), and [Whitham et al., 2007](https://pubmed.ncbi.nlm.nih.gov/17574912/).
- **Clinical context:** Updated the brain-death statement to identify the specific 2023 US guideline and explain why EEG does not assess brainstem function. It links to the [AAN/AAP/CNS/SCCM guideline](https://www.upstate.edu/medstaff/pdf/braindeath_declaration_and_organ_donation_november2025.pdf). Clinical content uses one grade-aware gate in Explore, comparison, quiz feedback, and tutor context.
- **Sleep:** Replaced the dense, always-visible material with a short introduction, an unscored question about overnight REM patterns, explanatory feedback, and optional sleep-stage details. It distinguishes typical patterns from fixed schedules and notes that dreams also occur outside REM sleep. Sources: [NHLBI sleep stages](https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep) and [NICHD sleep and dreaming](https://www.nichd.nih.gov/health/topics/sleep/conditioninfo/what-happens).
- **Imaging:** MRI is described as using no *ionizing* radiation. Device safety is framed as identification and assessment of applicable MR conditions. T1 signal descriptions are qualified as conventional patterns. Source: [FDA MRI benefits and risks](https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/benefits-and-risks).
- **Application questions:** Added 13 authored structure-and-function scenarios linked to the previously reviewed clinical notes. Feedback retains the complete explanation, reasoning question, and clinical reference. Structures without an authored scenario use a function question.

## Interaction and accessibility

| Area | Result |
| --- | --- |
| Quiz diagram | The answer marker uses the same structure as the current question, including later practice cycles. |
| Quiz continuity | Stored question identity prevents stale callbacks from scoring another question or overwriting newer confidence and recall records. Duplicate submissions are ignored. |
| Practice progression | A continuous-practice label shows correct answers, answers submitted, and a question number that does not wrap. Restart clears session counters. |
| True/False | Each block of eight binary items has four true and four false answers in a seeded shuffled order. The displayed question retains its truth value through answers and reloads. |
| Keyboard and speech | Next Question restores focus to the quiz. Questions have a read-aloud control; vocabulary and brain controls have distinct accessible names. |
| Vocabulary | Stable term IDs replace English substring matching. All ten terms are reachable from Explore, revealed cards, and Spotter feedback. Legacy studied-term names retain credit, and a term earns credit only once. |
| Relationships | Authored links use explicit structure IDs. Organs no longer inherit unrelated processes from their navigation collection. Structures without a direct link have an explanatory empty state. |
| Imaging input | Repeated Enter during answer review does not place a pin. Pointer placement preserves the cursor position. |
| Brain layout | Opaque surfaces, 14px body text, neutral heading colors, 44px controls, optional details, and dark-mode styling replace the dense colored cards. Younger learners do not receive advanced EEG or sleep-stage cards. |
| Tutor | The prompt includes the selected lesson’s permitted clinical explanation, reasoning prompt, reference, vocabulary, and brain-study context. If the service is unavailable, the learner receives reviewed lesson text. |

## Validation

**894 regression tests across 46 files are verified.** The full run passed 892 tests and identified two obsolete assertions requiring clipped clinical text. After updating those assertions and comparison selectors, all 58 tests in the two affected files passed. The implementation did not change between these runs. Raw and consolidated results are retained. The final counts and source hash are recorded in `verification.json`. Regression coverage includes stale and duplicate callbacks, fresh study evidence, restored quiz questions, balanced binary practice, all 13 application-question explanations, age gates, and vocabulary credit in French, Latin American Spanish, and Arabic.

The Chromium run covers quiz/diagram agreement, keyboard continuation, imaging review and placement, direct relationship links, tutor context, four grade bands, 1280/390/320px viewports, dark mode, and three translated interfaces. It produced **15 screenshots** and **10 scoped accessibility scans with zero violations and zero incomplete checks**. The phone overview and expanded dark-mode screenshots were also visually inspected. These scans cover the changed brain and vocabulary surfaces, not every screen in the application.

All **99 new text keys** are present in the three language packs and their desktop copies. Canonical structure references, translation placeholders, source syntax, and mirror equality are checked by `verify.cjs` and the localization script.

This is a local source update. No deployment or commit was performed. The tutor browser check uses a stubbed response to inspect supplied context; it does not evaluate a live model’s answers.

Evidence: `tests-results.json`, `browser-results.json`, `verification.json`, and the PNG screenshots in this folder. Earlier audit evidence remains in the `anatomy-next-review-2026-09-12` and `anatomy-assessment-review-2026-09-12` report folders.
