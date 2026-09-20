# Pass 8: reduce repeated writing and simplify the workspace

Implemented locally September 19, 2026. No deployment was performed.

## What changed

- **Point to existing reasoning.** The review now offers “I've explained this elsewhere” for lesson connections, checks, decisions, and transfer. Learners can identify a passage or location in their response, linked work with an explanation, or evidence notes. These are explicitly learner-created references, not verification or grades. Changes to the underlying text/link require rechecking. Saving and removing a reference preserve useful keyboard focus.
- **Keep references with the response.** References survive the shared learner-response boundary, text backup, restoration, typed submission, response/teacher print copies, and full HTML export. Blank task/paper presets omit them. The full-export fallback retains the location with a recheck notice. AI feedback receives the learner's location and freshness status, without gaining access to an external artifact.
- **Simpler mobile navigation.** Backup/restore controls sit in a work menu, with device-save status outside it and recovery controls expanded after a save error. Progress uses the same five stages as navigation. Lesson ideas, the situation, and requirements are accessible above the active work, with a return-to-writing control. Repeated context and identical prompt text take less space.
- **Search without the organizer.** Selected references append to ordinary evidence notes when the organizer is off. Existing writing is preserved; duplicate and capacity checks reject an addition without truncation. Source links can be reopened, and source-review prompts focus the notes. Citation metadata alone does not count as an explanation. Adding a source clears an earlier coaching hint.
- **Editable query starters.** Learners may start with a teacher-provided open question and edit it. No search runs until they explicitly press Search. The existing provider labeling, privacy boundary, and availability policy remain in effect.
- **Clearer setup and expression choices.** Available time appears beside the lesson target; customization is folded into one panel; a readable summary explains task depth and support. Build presents writing and linked sketch/model/recording options directly. Optional vocabulary help explains claim, assumption, tradeoff, and criterion.

## Validation

- **169 passing tests across 14 suites**, using the latest result for each suite. The broad run passed 167 tests and exposed one navigation assertion tied to the previous progress UI; the final 62-test recheck passed. An earlier shared test was updated to call the repository's already-extracted host handler. Application host code was not changed for that test correction.
- **11 browser states** across 1280px, 390px, and 320px, including reference save/edit/recheck, ordinary-notes source capture, and teacher setup. Zero page errors, horizontal overflow, or axe violations in the inspected states. This is automated accessibility coverage, not a complete accessibility certification.
- Reviewed mobile start and reference-review screenshots. At 390px, the authored starting page is **1537px tall**, down from 2139px (about 28% shorter). The first field starts at 846px, down from 964px. At 320px it starts at 846px, down from 1094px. These include the preview banner and toolbar and are fixture-specific measurements.
- Source freshness checked with the component builder; generated root/public bundles and catalogs match. Scoped whitespace checks passed.

Details: [validation summary](pass8-validation-summary.json), [final tests](pass8-final-recheck.json), [browser results](pass8-browser-results.json), [preview](current-preview.html?pass=8).

## Remaining evidence and later options

The preview uses an authored task and mocked AI/search. The September 19 live-AI readiness check still reports a missing credential in this execution environment; **zero model calls were made**. No learner sessions have been conducted. [Updated trial tasks](PASS8-TRIAL.md) cover reference discoverability, changed writing, ordinary-notes sources, expression choice, and teacher setup.

Structured citation records, teacher-selected source collections, and native recording/drawing integration remain later options to prioritize from trial observations. This pass adds editable query starters and consistent capture to the existing Google-backed search integration; it does not automatically search or generate answers.
