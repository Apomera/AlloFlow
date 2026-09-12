# Goal Setter: purposeful creative practice and feedback

Date: 2026-09-12. Twenty-third SEL enhancement pass.

## What changed

Nine creative SMART plans and six starter prompts now focus on a chosen artistic decision, a manageable practice strategy and evidence that helps choose the next step. All three examples have elementary, middle and high-school versions with context, learner choices, access supports and review points.

| Example | Elementary | Middle | High |
| --- | --- | --- | --- |
| Explore an artistic choice | Compare marks that show wind | Compare poster details for where attention goes | Compare brief studies against an intended effect |
| Practise a musical passage | Locate pauses in a short rhythm with a useful cue | Explore one transition using a slower pace or model | Investigate phrasing, articulation or rhythmic clarity in a passage |
| Revise a story with purpose | Link a character's want and action | Revise a scene for a motive or turning point | Compare a passage revision against an intended effect |

The former plans used daily output, minutes, pages, whole-piece mastery and public performance or publication as default targets. The new plans keep meaningful criteria while allowing small studies, supported practice, multiple expressive forms and private work. A learner can compare choices, locate a difficulty, explain a revision or identify a needed support. This evidence is more informative for these learning purposes than a streak or output quota alone.

## Optional feedback support

Each of the nine plans has a collapsed **Ask for useful feedback (optional)** disclosure. It provides a question tied to that example and grade level, followed by guidance for interpreting a response. Learners can choose a willing reviewer or use the question for self-review. A specific observation can prompt a trial or revision; the learner retains authorship and can keep a deliberate choice.

For example, a middle-school story prompt asks what changed for a character and which detail led the reader to that interpretation. It models requesting feedback on the scene while leaving spelling or presentation for a different stage. The music prompts ask for a specific cue or observation rather than a global talent judgment.

The disclosure uses native keyboard behavior, inherits the library theme and offers a minimum 44px summary target. Its open state resets when the example or grade changes so a previous prompt does not carry into a new context. It is absent from categories without feedback content. Opening it does not create a goal, change saved goal data or award XP. A new template remains an explicit action.

## Pedagogical basis and use

[CAST's guidance on graduated support for practice and performance](https://udlguidelines.cast.org/action-expression/expression-communication/fluencies-practice-performance/) emphasizes exploration, models, accessible feedback and supports suited to the learning goal and context. The authored examples apply those principles through focused experiments and comparisons. This is a design rationale, not a validation study of this digital activity.

Use a fictional example first, then identify the learner's own purpose, suitable support and evidence. Keep the chosen criterion clear: which effect, transition, motive or detail is being explored? Avoid replacing a concrete target with a vague instruction to be creative. A change can be useful even when it leads to keeping the original version, seeking another model or narrowing the task.

Public sharing and performance can be meaningful when chosen; they are separate from whether practice or revision occurred. Accessible tools, dictation, symbols, models and assistance do not invalidate the learner's creative choices. Evidence and personal subject matter can remain private. Feedback should address the intended purpose and audience rather than treating one language, voice or communication method as universally correct.

## Compatibility and scope

Creative examples retain the existing `example-0`, `example-1` and `example-2` selection IDs. Existing saved goals and their wording remain unchanged. New copies retain the standard five SMART fields, with practical support and review instructions included in the copy. The optional feedback question remains a library aid and is not a new saved field or automatic submission to an AI service.

Other categories' starter and example data were checked against the preceding health commit and remain unchanged. Canonical and public source modules match. The ignored generated `desktop/app-build` output is not rebuilt in this pass; packaged or installed copies need a fresh build to receive the changes. No push or deployment is included.

## Validation

Final counts and scope are recorded in `reports/sel-goals-creative/validation.json`. Focused browser coverage checks all nine age-adapted copies, optional feedback and XP stability, editing/restoration, legacy selections, keyboard access, prompt changes across examples and grades, and three phone themes. The actual-hub workflow checks that the creative goal retains its evidence and review fields after editing and returning to the activity.

All nine phone captures (library, feedback and SMART plan in light, dark and high contrast) were visually reviewed. Three axe scans cover the library with feedback expanded at 320px. These are scoped checks, not a full-app accessibility certification.

The initial focused run had nine failures because the test expected no XP at all after loading an existing goal fixture. Existing badge evaluation can already have awarded XP before the feedback is opened. The test was corrected to compare XP immediately before and after opening feedback; no product reward behavior was changed. The corrected focused run passed all 14 cases. The original failure log is retained at `reports/sel-goals-creative-focused-initial.log`.

Final validation: 14 focused browser cases, 594 regression checks and four actual-hub workflows passed (612 unique passes). Two pre-existing regression skips and 87 filtered hub cases are excluded. All 72 SEL tools rendered, syntax and scoped whitespace passed, and source/public copies are byte-identical.
