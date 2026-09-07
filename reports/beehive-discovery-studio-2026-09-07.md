# Bee discovery studio

The Bee Tool opens around its simulation, with six guided discoveries and a consistent cream-and-forest palette. This second enhancement pass adds hands-on direction decoding, temperature experiments beside the scene, and frozen before-and-after evidence.

## Interactive learning

- The waggle decoder connects a vertical comb to an outdoor compass. Keyboard-operable sliders change the dance angle and sun bearing, while the food bearing updates immediately. Text readouts and SVG descriptions explain both coordinate systems. The activity models direction; it does not imply a fixed duration-to-distance calibration.
- The existing thermoregulation inquiry now appears beside the discovery card when selected. It keeps its sliders, trial log, hypothesis, feedback, and model note. A shared temperature calculation supplies both the display and captured evidence, preserving the original equation.
- Focusable links connect hands-on activities with the prediction and evidence card, including on narrow screens. Larger controls, clearer typography, and dark-theme styling support the temperature activity.
- All six discoveries retain prediction revision, conceptual feedback, explanatory diagrams, separate drafts, and notebook saving. The existing 18 science views and all three simulation perspectives remain available.

## Evidence and interpretation

Capture observation freezes a structured snapshot. Compare now records another moment without replacing the baseline. The comparison shows before, after, and measured change for each relevant reading, with explicit no-change feedback.

Dance trials capture angles and bearings; temperature trials capture outside temperature, fanning bees, brood, and the estimated hive temperature. Colony, network, and flight activities capture their own model readings. Angular changes use the shortest turn around the circle; percentage changes use percentage points where appropriate.

Run identities and clocks prevent mixing a restart or reversed timeline with an old baseline. Legacy written observations remain visible and request a fresh numeric capture before comparison. Updating the observation clears the previous comparison. Saved comparisons and explanations appear in the Science Notebook and portfolio export, with a reminder that a before-and-after change alone does not establish its cause.

## Verification

The complete Bee regression run reported 391 passed, 0 failed, and 0 skipped tests across 40 files.

The ten browser scenarios passed across the initial run and a focused rerun after fixing the nested temperature widget placement. They cover rendered canvas pixels, keyboard controls, prediction revision, frozen and comparative evidence, notebook export, run changes, legacy records, separate drafts, all three perspectives, 320px reflow, dark theme, forced colors, reduced motion, and layout focus. The temperature activity also receives a final dedicated 320px dark-theme accessibility check. Axe checks include color contrast.

Reproduce:

```text
node node_modules/vitest/vitest.mjs run beehive --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node node_modules/@playwright/test/cli.js test tests/e2e/beehive-discovery-studio.spec.ts --workers=1 --reporter=line --retries=0

```

Screenshots are in `scratch/beehive-discovery/`, including `waggle-decoder.png`, `temperature-trial.png`, and mobile dark previews. Source and desktop mirror are identical. Changes are local; no production deployment was performed.

## Science references linked from the activities

- [NC State Extension: honey bee dance language](https://content.ces.ncsu.edu/honey-bee-dance-language)
- [US Forest Service: pollination](https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd899357.pdf)
- [Extension: colony cooling](https://ask.extension.org/kb/faq.php?id=915070)
