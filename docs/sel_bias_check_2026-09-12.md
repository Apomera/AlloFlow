# Decision Workshop: Bias Check evidence practice

Date: 2026-09-12. Twenty-fifth SEL enhancement pass.

## What changed

All 24 Bias Check entries (eight per grade band) now offer a careful explanation, fictional example, question, checking approach and explicit limits. A labeled selector replaces the reveal/next cycle. Learners can browse directly and optionally build an evidence check without losing notes when they change examples.

Revealing the old cards increased a studied counter, added practice-log entries and awarded XP and badges, even when the same card was revisited. The new activity does not treat reading as demonstrated learning. Historical counters and awards remain, and the progress label and two badge descriptions identify their earlier card-reveal origin.

## Content depth and corrections

| Area | Refinement |
| --- | --- |
| Responsibility and fairness | Separate responsibility within someone's control from blame for others' harm; examine participation and supports without dismissing fairness concerns. |
| Spotlight and negative experiences | Avoid claiming nobody noticed a mistake or prescribing a positive-thought ratio. Actual teasing and harmful patterns still require attention. |
| Confirmation and anchoring | Check relevant observations, source quality and the basis of an estimate. Another opinion or disagreement is not automatically stronger evidence. |
| Sunk cost and planning | Compare future costs, useful work, dependencies and support. Neither quitting nor multiplying an estimate by a fixed number is an automatic answer. |
| Attribution and availability | Distinguish observed behavior from explanations, and independent events from repeated reports. Maintain boundaries while examining uncertainty. |
| Confidence and skill | Check performance on a defined task instead of treating confidence as a marker of ignorance or assuming experts are always underconfident. |
| Familiarity, narratives and preferences | Compare real transition costs, examine alternative causes and ask about others' preferences rather than inferring them. |

Several labels now use plain descriptions where the old wording suggested a universal diagnosis or a precise research construct that the example did not establish. These include Responsibility and blame, Fairness and equal treatment, and Assumed preferences. All original entry IDs and the eight-item order within each band are retained.

## Evidence-checking workspace

The optional workspace asks for:

1. What we know.
2. A working thought.
3. Another possible explanation.
4. A useful check or support.
5. What I would keep or change.

Elementary prompts use simpler language. Every field is optional, labeled and connected to its help text. Learners can use a fictional situation, discuss without writing, or leave an interpretation unresolved. A pattern name is a prompt to inspect reasoning, not proof that a person is biased. An alternative must fit the facts; imagining a possibility does not make it equally likely.

Checking evidence should not require personal disclosure, dismissal of reported harm or removal of appropriate boundaries. The aim is a more specific and supportable interpretation, not forced positive thinking or compulsory agreement with an authority figure.

## Source checks and limits

The APA Dictionary's [confirmation bias](https://dictionary.apa.org/confirmation-bias) and [availability heuristic](https://dictionary.apa.org/availability-heuristic) entries support distinguishing selective evidence-gathering from memory-based judgments of likelihood. Its [fundamental attribution error definition](https://dictionary.apa.org/fundamental-attribution-error) emphasizes over-weighting personal characteristics relative to situational influences, which corrects the earlier card's narrower self/other contrast.

[Kruger and Dunning's original study](https://pubmed.ncbi.nlm.nih.gov/10626367/) concerned self-assessment and performance on particular tasks. The revised example focuses on checking a spreadsheet formula with known inputs. It does not turn an observed confidence level into a person-level ability judgment.

These sources were checked on 2026-09-12; the dictionary definitions and original-study abstract were available through indexed excerpts where direct page extraction was limited. The student examples and practical checking prompts are authored adaptations. This review does not establish that the activity eliminates cognitive bias or provides a validated assessment. The collection includes everyday thinking patterns as well as named research constructs.

## Saved-state compatibility

`biasSelections[band]` retains a selected entry for each grade band. `biasDrafts[band + ':' + entryId]` stores five independent fields: `facts`, `interpretation`, `alternative`, `check` and `review`. Switching examples, tabs or grades preserves other drafts. Unknown fields are kept, while malformed values produce usable empty controls. If a new selection is absent, a valid older `biasIdx` still resolves to its previous position.

The old single `biasReflection` is shown separately because its intended case cannot be reliably inferred after earlier navigation. An explicit copy action inserts it only into an empty working thought, keeps the original, opens the notes and moves focus to the copied text. A screen-reader announcement confirms the copy. Existing writing is never overwritten by that action. Legacy reveal flags, counters, logs and badges are retained unchanged.

The UI explains that notes belong to the current project and that save/export controls are needed for durable storage. Disclosures reset when changing examples while the notes remain. Other Decision Workshop activities retain their existing behavior.

## Validation and delivery

Focused browser coverage checks all 24 entries, five-note persistence across examples and grades, serialized restoration, old reflection copying and focus, historical data, malformed values, keyboard selection and three phone themes. The final run contains 30 tests. The existing shared SEL and Decision Workshop suite passed 581 checks, with two pre-existing skips; it includes the preceding moral-reasoning and consequence-map workflows.

Three axe scans cover the whole revised region with notes and earlier-reflection controls expanded at 320px. All nine example/approach/notes phone captures were visually reviewed in light, dark and high contrast. Native select titles can truncate at narrow widths; the full selected title appears below. These are scoped checks, not full-app accessibility certification.

Final actual-hub results, syntax, all-tool renders and source/public parity are recorded in `reports/sel-bias-check/validation.json`. Raw run logs are `reports/sel-bias-check-{focused,regressions,hub,render}.log`.

No push, deployment or packaged build is included. The ignored generated `desktop/app-build` output was not rebuilt; installed/packaged copies need a fresh build to receive these changes.

Final validation: all 30 focused cases, 581 regression checks and three selected actual-hub workflows passed (614 unique checks). Ninety filtered hub cases and two pre-existing regression skips are excluded. All 72 SEL tools rendered. Syntax, whitespace and source/public parity passed.

Commit status: committed as `5e0964c45` after the unrelated source-pair mismatch cleared on recheck. The normal pre-commit hook passed without bypass.
