# Growth Mindset Workshop: grounded reframing

Date: 2026-09-12. Fifteenth SEL enhancement pass.

## Learning purpose

Reframe It now practices a specific, fair response to a difficulty, paired with a feasible next step. The activity does not label the learner or score the tone of a response. A concern about unfair feedback, inaccessible instruction, money or exclusion may be accurate. Learners need not add "yet", feel positive or continue an unsuitable goal.

This is an authored learning activity, not a validated intervention. A [large school experiment](https://www.nature.com/articles/s41586-019-1466-y) found that growth-mindset intervention effects depended on context; it does not establish effectiveness for this tool. The [National Academies learning synthesis](https://www.nationalacademies.org/read/24783/chapter/9) informs the emphasis on actionable feedback. Its [discussion of transfer](https://www.nationalacademies.org/read/9853/chapter/6) supports checking a strategy in a different example. The detailed scenarios and interface sequence are design choices rather than tested prescriptions from those sources.

## Optional practice sequence

1. **Notice what is real and what is assumed.** Each fictional case includes a thought, context, a concern to acknowledge, and a question that checks a broad inference. Learners may note evidence and draft a fair response.
2. **Compare a grounded example.** Opening the example does not hide or replace writing. Prompts invite disagreement and adaptation, rather than matching a correct answer.
3. **Choose a strategy, support or pause.** A disclosure offers a case-specific step, needed support and a review point. Optional routes are to adjust, ask for support, pause, or change the goal. The learner can combine routes in a note or leave the selection blank. Adults remain responsible for addressing instruction and unfair conditions.
4. **Revisit a changed situation.** A fictional development tests whether the same response still fits. A separate revision field preserves the earlier response. Keeping a plan can be reasoned; revision is not compulsory.

All writing is optional; learners can think, draw or discuss without submitting notes. Use fictional examples without requiring personal disclosure. Model texts are possible approaches, not guarantees or requirements. For younger learners, facilitate one step at a time and offer read-aloud or an accessible response format.

## Cases

### Elementary

- **Getting started in math:** The blocks help, but the written symbols are still confusing.
- **A label after a hard task:** The learner notices that some pieces are missing.
- **When hard means too much:** The quiet space is unavailable today.
- **Comparing with a classmate:** The classmate does not want to teach the technique.
- **Choosing a pause:** The available paper cannot support the planned height.
- **Already knowing part of it:** The changed example reveals a step the learner cannot explain.
- **Learning after an error:** The label is too small to read comfortably.
- **Reading with support:** A line guide helps tracking but some words remain unfamiliar.
- **Trying with enough safety:** Someone laughs during a practice attempt.
- **An artwork that does not fit the plan:** The learner decides the unusual shape is something they like.

### Middle

- **Finding the missing math step:** The learner understands the example but cannot start a differently worded problem.
- **Speaking with options:** The presentation must include questions from an audience.
- **Questioning feedback fairly:** The teacher supplies a valid correction but leaves another concern unexplained.
- **Effort without a verdict:** The learner has less study time because of responsibilities at home.
- **The part we cannot see:** A timed format is preventing the learner from showing what they understand.
- **Interpreting a test result:** Most errors came from misreading the instructions rather than the studied concept.
- **A goal worth choosing:** A new responsibility makes the club schedule unmanageable.
- **Belonging and classroom conditions:** Extra instruction helps the topic, but the excluding remarks continue.

### High

- **Creating within constraints:** The preferred idea requires materials the learner cannot access.
- **A missing prerequisite:** The deadline arrives before the needed instruction is available.
- **Help that is safe to request:** The first person dismisses the question instead of answering it.
- **A score and a wider plan:** A retake would cost money or time needed for something else.
- **Trying without changing identity:** A member makes a stereotype-based comment during the visit.
- **Practice with unequal resources:** The learner loses access to the equipment used for practice.

## Learning cards

All 15 former Brain Science cards were rewritten; the tab is now Learning & Practice with its existing `brain` state ID. The cards remove deterministic brain-growth, myelin-speed, brain-type and universal improvement claims. They discuss manageable challenge, feedback, context, access and checking understanding. A feeling of struggle is not a measurement of learning. New sessions open Reframe It; previously saved tab selections remain respected.

## Drafts and compatibility

`practiceSelected` stores one case ID per grade band. `practiceDrafts` stores notes by stable case ID: `evidence`, `first`, `route`, `plan`, `review`, and `revised`, plus `modelSeen` and `changeSeen`. Opening a model or changed situation does not assign an achievement or update historical reframe totals. Fields remain editable. Separate first and revised notes are not an immutable version history: a learner can intentionally edit either.

The existing tool/project state callbacks handle updates. No new storage service, transmission or AI call is added. An older `reframeInput` stays available as an unassigned response because the old format did not identify its case or band. Explicit copying fills only an empty current response and preserves the older copy. Existing reframe score/attempt totals remain intact. An invalid selected case falls back to a bounded legacy index or the first case; malformed note values display as empty.

## Validation and limits

Validation passed **527 existing regression checks and 35 browser workflows** (33 focused workflows and two actual-hub checks), with two existing regression skips. All 72 tools passed initial-render smoke checks. Three full-rule axe scans scoped to the practice activity returned zero violations. Dark evidence and high-contrast revision phone captures were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Final results are recorded in `reports/sel-growth-depth/validation.json`. The focused harness renders the actual tool with simulated state callbacks. It checks all 24 cases, all 15 learning cards, optional writing, route changes, separate first/revised notes, case/band state, serialized restoration, legacy copying, keyboard focus and phone layouts in three themes. The hub test separately checks return/reopen through the real hub.

These checks do not establish a real project-file round trip, packaged Desktop behavior, live assistive-technology usability or classroom outcomes. The remaining Yet Stories, Growth Map, AI Coach, Future Me and Educator Lens workflows were not substantively reviewed in this pass. The scoped accessibility scan covers the new practice region; it is not a whole-tool accessibility certification. Nothing was pushed or deployed.
