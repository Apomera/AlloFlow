# Recall practice follow-up

The flashcard activity now asks learners to recall a structure's function before revealing the reference, compare their explanation, and choose what to review next.

## Changes

- Clear recall → reference comparison → self-rating sequence, with an optional draft and alternatives to typing (say, sign, or sketch).
- Complete existing function references remain available. The flashcard answer no longer appends clinical commentary without species or clinical context.
- Separate counts for recalled, review again, and not rated. Skipping never records a successful recall.
- Focused rounds for marked or unrated cards, using a fixed queue so changing one rating cannot skip the following card.
- Round summaries explicitly distinguish self-ratings from a mastery score.
- Responsive cards, large controls, keyboard focus on the new prompt or summary, and a direct return to the specimen.
- Opening practice closes the selected inspector, avoiding an immediate function-answer cue.
- Fresh sessions on reopening, specimen changes, layer changes, and specimen reset. Drafts and self-ratings are transient and described as such in the interface.
- No additions to saved observations, evidence notes, confidence, identification credit, assessment scores, or the quiz review queue.
- Canonical and desktop dissection bundles are byte-identical.

## Verification

- 53 focused reference, discovery, and recall unit checks passed, including 13 new recall cases.
- 269 of 270 broader dissection, workspace, canvas, and anatomy integration checks passed.
- The remaining failure is the pre-existing shared bridge parity check: desktop/web-app/public/stem_lab_module.js differs from the canonical shared module. This follow-up did not modify those shared module files.
- Three browser scenarios passed across the initial and follow-up runs: keyboard review plus restart and evidence isolation, phone reflow/accessibility, and layer-change state isolation.
- The first layer test used the internal ID “tympanum” as search text instead of the displayed name “Tympanic Membrane.” Correcting the fixture to search “tympanic” resolved it; no application change was needed.
- Axe reported zero WCAG A/AA violations in the phone recall prompt and revealed-answer panel. This is scoped automated coverage, not an accessibility certification.
- Visually inspected the mobile answer and desktop summary screenshots.
- JavaScript syntax, scoped whitespace checks, and dissection bundle parity passed.

The activity supports self-directed recall; it does not automatically grade scientific explanations. Newly introduced interface strings use localization keys with English fallbacks. This pass did not perform a complete anatomical-content audit.

## Artifacts

- [Phone prompt](recall-prompt-mobile.png)
- [Phone revealed answer](recall-answer-mobile.png)
- [Desktop round summary](recall-summary-desktop.png)
- [Focused unit results](recall-unit.log)
- [Broader regression results](recall-regression.log)
- [Initial browser run](recall-browser.log)
- [Corrected fixture and lifecycle checks](recall-followup.log)
