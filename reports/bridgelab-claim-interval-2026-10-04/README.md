# Bridge Lab: evidence that follows the energy question

## What changed

The interval card in **Match evidence to your claim** always displayed damping loss. That gave students a narrow writing scaffold after they inspected ground energy removal or elastic-to-kinetic exchange.

The existing card now offers **Interval evidence quantity**:

- **Follow energy question** uses net input work for shaking or ground removal, kinetic change for exchange, and damping loss for settling or a custom interval.
- Students can choose **Net input work**, **Damping loss**, **Stored change**, **Kinetic change**, or **Elastic change** explicitly. A manual choice stays in place as they inspect other questions; choosing Follow again restores the automatic choice.
- A and B display the same quantity across the same chronological interval. Signed changes retain their signs and tiny values retain scientific notation. Negative readings use pink text on screen.
- The question label belongs to **B · current**, or the current experiment when there is no reference. Endpoint matching identifies a preset question; other endpoints say **Custom interval**. Notebook reference A can have different cycle boundaries from current B.
- Sentence frames describe the chosen measurement and leave the explanation to the student. Exchange guidance asks students to examine elastic change and damping loss. Settling guidance asks them to consider the stored energy at 16 s.
- The native selector has a label, contextual help, a 44 px minimum target and keyboard support. Changing it pauses playback.

The local choice survives reference selection, scene selection, graphics fallback and opening the report. The printed current draft shows the effective quantity, signed values and sentence frame without interactive controls. Sentence frames end cleanly at the placeholder ellipsis so an extra period cannot wrap onto a separate line. Saved interval trial records continue to carry their inputs, endpoints and student writing; the complete energy table is recalculated when printed.

## Recorded comparison context

Each damping-guide reading set now describes the conditions of its own pair: controlled damping change, identical inputs, different response mode or ground motion, or one/both trials with no shaking. Recorded and printed evidence retains this context when live settings change.

Guide inputs and readings preserve small nonzero values. The shared inspection time uses three decimal places so a time such as 7.217 s matches the notebook's display.

## Interpretation

Net input work includes energy transferred in both directions. A kinetic-energy change alone does not establish elastic-to-kinetic conversion; the interval balance supplies the related changes and damping loss. A larger damping ratio also need not produce a larger loss over 16–24 s because the trials can start that interval with different stored energy.

These additions use the existing illustrative relative modal model and accumulated interval quantities.

## Validation

- **242 automated checks:** complete immersive interaction, seismic model and inertia suites, including six new claim-interval workflows.
- **16 browser workflows:** four new claim-interval workflows plus existing claim evidence, rate history, energy questions and writing evidence flows. Coverage includes desktop, 320 px phone layout, keyboard selection, A/B provenance, graphics loss/recovery, precise readings and printed output.
- **144 numerical scenarios:** the recorded rate-history and energy invariants are checked against the final source fingerprint, including 207,504 samples, 415,008 power readings, and 720 interval detail windows.
- Source syntax, identical source mirrors, matching English strings for all **1,304 literal keys**, and captured final layouts.

The machine-readable results and source fingerprint are saved in `unit-results.json`, `browser-results.json`, `model-invariants.json` and `source-verification.json`. The complete unit run uses one worker and a 4 GB Node heap. An initial 2 GB run reached the worker memory limit with 237 passed and five unfinished; the complete retry passed every assertion. `unit-focused.json` retains the initial six-check run before the final guide copy/time refinement; those six tests also run in the final complete suites.

From the project root, `node --max-old-space-size=2048 reports/bridgelab-claim-interval-2026-10-04/verify-rate-history.cjs` repeats the numerical sweep. `node reports/bridgelab-claim-interval-2026-10-04/verify.cjs` checks the saved reports, source syntax, mirrors, translations and source fingerprint.

Changes remain uncommitted.
