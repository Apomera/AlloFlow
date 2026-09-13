# Anatomy enhancements — September 12, 2026

Implemented the highest-priority improvements from the [anatomy review](../anatomy-deep-review-2026-09-12/README.md), covering scientific content, learning design, engagement, and interface usability. The canonical anatomy source and its desktop public copy contain identical changes.

| Area | Delivered |
| --- | --- |
| Scientific classification | Separated the ten navigation collections from eleven scientific system labels. Added explicit memberships for shared structures, including the pancreas, pharynx, diaphragm, hypothalamus, and gonads. “Organ Systems” is no longer a quiz answer. |
| Quiz reliability | The thyroid correctly accepts Endocrine; digestive and urinary organs receive appropriate choices. Distractors exclude every recorded valid membership. Updated question context invalidates obsolete saved system-grading feedback. Two-structure pools now rotate both structures through system-identification questions. |
| Scientific wording | Corrected skull composition and sutures, the fibula’s load-bearing contribution, elbow extension, sternal marrow sampling, deltoid vaccination wording, kidney filtrate volume, screening qualifications, and several unsupported fun facts. Revised the altitude vignette and corrected the muscle selected in the exercise scenario. |
| Source visibility | Structure cards now provide expandable source links, scientific memberships, and a clear description of the references’ scope. Specific references accompany the skull, fibula, triceps, sternum, deltoid, and kidney corrections. |
| Learning level | The selected K–5, 6–8, or 9–12+ level controls both the structure set and explanation language. Kindergarten and Pre-K labels are recognized. Young learners no longer receive advanced clinical text in quiz feedback or revealed flashcards. |
| Learning evidence | Recorded correct answers and attempts are shown separately from confidence. Choosing “Got it” does not manufacture scored evidence. The progress map and exploration badges use more accurate labels. Existing review scheduling and saved study rounds remain in place. |
| Homeostasis | Added a predict–compare–explain activity. Learners compare brief warming or cooling with feedback active versus a disabled response, inspect the graph and equivalent data table, and explain why the response diminishes near the starting temperature. |
| Mobile interface | Added a native activity selector, compact Explore and Homeostasis settings, and an early selected-structure summary with a working focus link to the full card. Flashcards precede deck settings in both document and keyboard order. |
| Localization and accessibility | Added 55 strings in French, Latin American Spanish, and Arabic to both shipped catalogs. The new activity has labeled native inputs, keyboard access, live feedback, an accessible chart, a data-table alternative, and corrected dark-theme and RTL styling. |
| AI tutor | The prompt now includes the selected structure’s lesson text, scientific memberships, supplied references, and recent conversation. Its explanation guidance follows the selected learning band. Live model-response quality was not evaluated. |

The Homeostasis activity is an illustrative feedback model. Its starting temperature, step size, delay, and response coefficient are teaching choices, not a physiological calibration. The activity explains these limits and links to [OpenStax’s account of homeostasis](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-5-homeostasis).

**Measured mobile results**

At a 390 × 844 viewport using the same full-detail study setting:

| Content | Review measurement | Enhanced measurement |
| --- | ---: | ---: |
| First flashcard | About 749 px from page top | 453 px |
| Quiz panel | About 500 px | 358 px |
| Selected structure summary | No early summary | 358 px |

The Homeostasis experiment begins at 408 px on a 320-pixel-wide screen. Explore, Cards, Quiz, Homeostasis, and the sampled translated layouts had no horizontal overflow at the tested sizes. The full structure card remains available below the diagram, with a direct focus action from its compact summary.

**Verification**

The latest results across the full anatomy regression run and subsequent targeted reruns are **608 passing checks across 37 test files, with no remaining failures**. The full run initially reported three outdated test expectations; corrected fixtures and the final classification, source-copy, and localization checks passed in the 198-check targeted rerun. [Validation summary](validation-summary.json) preserves the run counts and final source hash.

Browser checks verified correct thyroid grading, flashcard reveal and navigation, focus transfer to structure details, model comparisons, saved explanations, mobile activity changes, Blueprint and Surface loading, three translated layouts, and RTL behavior. No JavaScript page errors were observed. [Browser evidence](browser-results.json) and [focused dark-theme/RTL results](theme-rtl-results.json) include the measurements.

The sampled Homeostasis screen produced zero automated axe violations. Axe left contrast and ARIA items requiring manual judgment; this result is not a complete accessibility-conformance assessment. Visual review additionally found and corrected faint dark-mode field text and clipped RTL chart labels.

**Screenshots**

- [Phone flashcards](phone-390-cards.png)
- [Phone Explore summary](phone-390-explore.png)
- [Correct thyroid quiz feedback](desktop-thyroid-quiz.png)
- [Dark-theme feedback activity](dark-feedback-detail.png)
- [Arabic feedback activity](arabic-feedback-detail.png)

**Remaining opportunities**

This delivery addresses the priority defects and adds a complete feedback-learning activity. A comprehensive specialist review of the remaining clinical statements and anatomical geometry, broader translation coverage for existing content, assistive-technology testing, and consolidation of study history across duplicate concept records remain useful follow-on work. The new source disclosures deliberately identify their limited review scope.

No deployment was performed. Existing unrelated workspace changes were preserved.
