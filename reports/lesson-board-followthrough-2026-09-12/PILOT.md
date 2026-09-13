# Board game classroom pilot

Prepared September 12, 2026. This is a teacher-run protocol; no classroom pilot has been conducted.

## Before learners join

Choose one short lesson and a small group of three to six learners. Allow about 20 minutes. Use the core mission for the first session. Confirm that all information needed to answer the board activities appears in the lesson or visible task, and check every keyed answer, hint, explanation, and ordering criterion. Use the setting and learner-level preferences when generating a board.

For a resource created from an assessment, open **Assessment coverage** in setup. Inspect the full item list, including the last item in a large assessment. An exact excerpt link traces shared evidence; it does not establish that the board assesses the same skill as the original question. Plan separate practice for unrepresented skills.

Enable rotating classroom roles if useful. Explain that Navigator invites route ideas, Evidence Reader helps examine lesson evidence, and Builder compares project costs and effects. Everyone can propose and answer. Responsibilities can be shared or passed.

## Session sequence

| Time | Activity | Observe |
| --- | --- | --- |
| 0-3 min | Ask learners to explain the mission and choose a first route. | Can they identify the next action and the mission requirements? |
| 3-8 min | Resolve a location with a mix of correct, incorrect, and missing responses. Open a retry. | Does feedback distinguish the shared result from each learner's evidence? Do roles stay stable during the retry? |
| 8-13 min | Open a new move and compare a yield project with a shortcut. Invite a late learner if practical. | Do roles rotate? Does the late learner enter the next rotation? Can learners explain their construction choice? |
| 13-16 min | Pause/resume, then save a progress report. | Are answer controls clear while paused? Can the teacher find and export the report? |
| 16-20 min | Learners use suggested practice and answer the exit questions. | Can they revisit a missed idea without mistaking practice for a changed recorded result? |

The teacher should stop or replace any activity with an inaccurate or ambiguous answer. Record the issue and the relevant source excerpt before continuing.

## Exit questions

1. What were you trying to accomplish, and what could you do next?
2. Which choice changed your route or resources? Why did you choose it?
3. What did you understand better after the feedback or practice?
4. Where did you get stuck because of the interface or wording?

## Observation sheet

- Lesson / subject / learner level:
- Mission / board filename / provider and model, if used:
- Number of learners and devices:
- Activities needing factual or wording corrections:
- Learners who could explain their next action without help:
- Role sharing, rotation, and participation observations:
- Construction choices explained with evidence:
- Keyboard, small-screen, or reading barriers:
- First versus latest responses and suggested practice checked:
- Report reopened successfully / CSV opened successfully:
- Changes needed before a larger session:

A useful next step is a second run after addressing any recurring confusion. A successful technical playthrough alone is not evidence of learning effectiveness.

## Real AI generation checks

The prepared runner covers primary fractions, middle-school ecosystems, and secondary evidence evaluation, across all three missions. It uses the production board validator, permits one repair per board, checks a complete playable route and a wrong-answer retry where available, and caps the run at six provider calls and six HTTP attempts. It saves generated board files for educator inspection.

Run locally with an already configured provider; do not put API keys in a command, report, or chat:

```powershell
node dev-tools/validate_lesson_board_generation.cjs
node dev-tools/validate_lesson_board_generation.cjs --execute
```

The runner reuses the existing text-complexity pilot provider options. Use that runner's configured backend, model, and endpoint options for a local provider when applicable. The current attempted run is recorded in `ai-validation/validation.json`: blocked by a missing credential, with zero provider calls. Review the generated activities for factual accuracy, clarity, and learner-level fit after a real run; the automated checks do not make those judgments.
