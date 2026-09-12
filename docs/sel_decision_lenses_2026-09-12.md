# Decision Workshop: moral reasoning through cases

Date: 2026-09-12. Twenty-fourth SEL enhancement pass.

## Purpose

The former Moral Compass tab asked learners to agree with short statements, converted the answers into percentages and a dominant ethical framework, and offered an AI-generated personal moral profile. Completing it earned XP and badges, including a badge for closely balanced scores. That arithmetic does not establish a learner's moral character or the quality of their reasoning.

The tab is now **Moral reasoning**, while its saved navigation ID remains `compass`. It invites learners to examine a fictional case through four complementary questions, identify unknowns and reconsider after a condition changes. There is no profile calculation, score, required answer, completion reward or AI submission in this activity.

## Six fictional cases

| Grade band | Case | Main tension | New information |
| --- | --- | --- | --- |
| Elementary | One set of materials | Turn-taking and usable participation | Another usable set can be prepared with a short wait |
| Elementary | A promise and a changed need | A cleanup commitment and a safe ride home | Most of the task can wait, but loose materials need securing |
| Middle | A photo for the class project | Deadline pressure and an image boundary | A suitable replacement image needs a small script change |
| Middle | The unfinished group section | Missing work, uncertain motives and workload | The student has handwritten notes but no device access |
| High | An event that not everyone can attend | Existing plans, participation barriers and budget | An accessible alternative changes the planned entertainment |
| High | Support with strings attached | Exhibition supplies and pressured disclosure | Revised sponsor terms remove the personal-information request |

Each case supplies possible routes, four situated lens applications, a changed condition and one possible response for comparison. These are authored educational examples. They are not a comprehensive ethics curriculum or an assessment of a learner.

## Four questions, used together

- **Possible outcomes:** benefits, costs, uncertainty and who carries them.
- **Rights and fairness:** boundaries, consent, privacy and usable participation.
- **Care and relationships:** missing perspectives, requested support and shared responsibility.
- **Commitments and integrity:** responsibilities, honest communication and revising agreements when conditions change.

The [Markkula Center's introduction to its ethical decision-making framework](https://www.scu.edu/ethics/ethics-resources/ethical-decision-making/introduction-to-a-framework-for-ethical-decision-making/) describes multiple lenses as aids to contextual judgment, not an algorithm that determines an answer. That distinction informs this redesign. The four question groups here are a simplified author-created structure, not a reproduction of the Center's six-lens framework or a validated moral inventory.

Use a case as shared practice before inviting personal application. A learner can think, discuss or draw elsewhere without entering text. Ask which facts support a reason, whose perspective is missing, and what would need checking before action. A changed answer is not inherently better: a learner may explain why a boundary still applies while choosing a more practical route. Considering several lenses should not become a vote that overrides consent or participation needs.

## Interface and project state

One case is shown at a time. Possible routes, each lens and the comparison response use native disclosures. Controls have explicit names and at least 44px targets. Notes are labeled and tied to help text. The case selection remains focused after keyboard selection, and the changed-condition button exposes its expanded state without moving focus.

Optional notes cover the starting reason, each of four lenses, information to check, revised reasoning and a next step/review point. `compassDrafts[band + ':' + caseId]` stores those eight text fields plus `changeSeen`. `compassSelections[band]` keeps each grade band's selected case. Switching cases or bands does not overwrite another draft. Unknown draft fields are retained, and malformed selection/note values fall back to usable controls. Disclosure state resets on a case or grade change; the explicit changed-condition state stays with its draft.

Notes live in current project data. The interface reminds learners to use the hub save/export controls for durable storage and to review private details before sharing.

## Historical compatibility

Earlier `mcAnswers`, `mcDone`, `mcAiResp`, practice-log entries and earned badges are retained. An optional Earlier quiz records disclosure displays recognized historical answers and explains that the old prompts are not action guidance. Earlier generated text remains in project data without being presented as a current moral interpretation. Two historical badge descriptions now state their earlier-quiz origin. The other Decision Workshop activities and their reward systems remain outside this refinement.

Canonical and public source modules are synchronized. The ignored generated `desktop/app-build` artifact was not rebuilt; installed/packaged copies need a fresh build to receive these changes. No push or deployment was performed.

## Validation

Focused browser coverage exercises all six cases and 24 lens applications, changed conditions and response examples, optional writing, separate drafts across cases and grades, serialized restoration, existing quiz data, malformed values and keyboard focus. All 12 focused tests passed. The existing shared SEL and Decision Workshop suite passed 569 tests, with two pre-existing skips.

Three axe scans of the new practice region at 320px found no violations. Nine screenshots showing case selection, a lens and revision in light, dark and high contrast were visually reviewed. Long native-select labels truncate at narrow widths; the complete selected title is repeated below. This is scoped accessibility verification, not full-app certification.

All 72 SEL tools passed the render smoke check. Final actual-hub counts and source parity are recorded in `reports/sel-decision-lenses/validation.json`. Raw logs are `reports/sel-decision-lenses-{focused,regressions,hub,render}.log`.

Final validation: two selected actual-hub workflows passed, bringing the total to 583 unique passing checks. Ninety filtered hub cases and the two pre-existing regression skips are not counted as passes. Syntax, scoped whitespace and source/public byte parity passed.
