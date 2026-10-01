# Guided experiment journey

## Improvement

The three existing Simple bench experiments now work as a continuing investigation. Each question retains its prediction, model evidence, and explanation when the learner moves to another question. A progress indicator counts experiments tested; it does not claim mastery, require a correct first prediction, or require written reflection. The evidence panel offers the next experiment that has not been tested. After all three, it points learners toward their own question in Plan an investigation. No rewards or XP were added.

Returning to tested evidence keeps the live bench unchanged. The panel explains when its saved evidence differs from the bench and provides **Load this experiment result**, using the existing electrical Undo history. Untested lessons load their own baseline. Notes in the independent investigation notebook are preserved. Explicitly trying an experiment again starts a new prediction and replaces that question's earlier result and explanation; nearby copy states this. Its tested count remains earned and cannot increase twice.

## Shared helper

`window.StemLab.circuitLessonStart(state, id)` returns an update patch, or `null` for an unknown lesson. It captures the current legacy lesson fields into `lessonRecords`, restores the selected question, and opens the learning section. Nested evidence is copied. For tested questions the patch contains only learning metadata; for untested questions it also contains the modeled baseline circuit. The Quick start guide can reuse this helper for the initial loop experiment. `.circuit-lessons > summary` remains a native keyboard-focusable target with its original label.

## Checks

New `tests/circuit_guided_journey.test.js`: **5 passed**.

- Migration of existing lesson fields, independent evidence copies, and unknown IDs.
- Draft prediction navigation with zero tested progress.
- Wrong prediction → test → explanation → next question → return, preserving evidence and the live circuit.
- Explicit saved-result reload → Undo, preserving lesson notes and the investigation notebook.
- Next untried question, all-three completion without written explanations, and repeated trials without extra progress or XP.

Existing `tests/circuit_learning.test.js` and `tests/circuit_learning_regressions.test.js`: **22 passed** in the same targeted run. The first new-suite attempt used an invalid notebook test fixture and was corrected before the passing focused run. Root owns browser, accessibility, full regression, and deployed mirror verification.
