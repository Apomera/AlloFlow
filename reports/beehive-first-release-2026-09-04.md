# Bee tool: first improvement release

The first release turns the food-stores misconception into an untimed investigation using the existing daily colony model. Open **Beekeeper → Investigate falling stores**. A saved draft changes the button to **Resume investigation**.

## Learner experience

1. Predict what will happen to food stores during a summer dearth and give a reason. Incorrect predictions can be tested.
2. Observe Run A: flower visits continue, but daily food consumption exceeds income.
3. Choose supplemental food or a flower patch, predict its effect relative to Run A, and register the plan before Run B appears.
4. Compare matching Day 55 endpoints and inspect both food budgets. The interface distinguishes having more food than the control from having stores that are growing.
5. Explain the mechanism and apply it to a new situation with doubled consumption.
6. Save the prediction, plan, evidence, explanation, transfer response, and model limitations in Science Notebook.

The investigation uses separate practice colonies. The existing hive, experiment baseline, and role notebook remain available. Progress uses the host's existing save format. Changed or damaged registered plans return to the planning step; repeated activation cannot skip an observation step.

## Accessibility and visuals

The lesson provides native radio controls, selected or written responses, visible keyboard focus, explicit step headings, untimed progression, and focus restoration when returning to the hive or opening the notebook. Charts have solid/dashed lines, a text summary, and matching data tables. Tables can scroll locally on narrow screens. Light, dark, and forced-color layouts are supported. No sound, animation, dragging, or reaction speed is required to complete this lesson.

## Science and incentives

- Primary mite, disease, and stability meters now identify their values as model indices. Explanations distinguish these from sampled infestation rates, outbreak probabilities, and measured bee emotions.
- Supplemental food is described as modeled food stores in honey-equivalent pounds.
- The conflicting Drone low-energy hint now agrees with the flight model: observation gates do not restore energy.
- The honey-storage quiz includes stingless bees.
- The treatment-count award is replaced with **Mite Evidence**: an effective intervention at elevated model pressure plus a self-reviewed prediction, evidence, and explanation. This recognizes recorded reflection; it does not automatically judge the scientific quality of prose.

## Model boundaries and further work

Practice runs share a deterministic Day 0 warm-up and exclude random events. Flower benefits are immediate, food is combined in one honey-equivalent store, and biological rates and seasons are simplified. These limits appear in the lesson and its saved record.

This release does not introduce demographic cohorts, delayed plant growth, separate nectar/feed/honey pools, or independent weather and management random streams for the broader sandbox. Those remain follow-up simulation work from the analysis. The new lesson is in English; a localization pass and sessions with learners using assistive technology remain useful follow-ups. Automated accessibility scans do not establish full WCAG conformance.

## Verification

- 363 unit/regression tests verified across 38 Bee test files. The full run passed 359 tests; four legacy accessibility cases were affected by scan timeouts or axe remaining busy. The isolated accessibility rerun passed all 54 tests in that file, resolving the four failures.
- Three Chromium browser tests passed on the final implementation: the full keyboard journey, preserved hive state and notebook saving, 320/390-pixel reflow, light/dark accessibility and contrast scans, forced-color rendering, and enlarged text.
- The canonical Bee source and public mirror are byte-identical. The changed tracked files pass git diff --check.
- Visual inspection covered desktop comparison and narrow-screen prediction/comparison layouts. Automated scans found no scoped WCAG A/AA violations in the tested lesson states; no assistive-technology user study was performed.
