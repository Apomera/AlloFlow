# Sample-transfer inspection - September 12, 2026

The Titration Lab sample-transfer exercise now offers close-ups of the weighing boat and receiver, plus a proportional solid-mass display. Open Equipment, choose **Transfer the solid**, and use **Inspect sample transfer** above the diagram.

## Views and guidance

- **Whole bench** keeps the two vessels in context and is the default whenever the activity is opened.
- **Follow the sample** shows the loaded boat, stays with any solid left after a dry pour, and switches to the receiver when all of the sample has arrived. With no loaded sample it shows the whole bench.
- **Weighing boat** and **Receiver** keep the chosen close-up through subsequent actions. The boat framing follows its actual ready or tilted pose.

Changing a view changes no measurements, records, or live chemistry. The native select supports keyboard operation and connects to the diagram and its state-aware explanation. Reopening the activity restores the whole-bench view while retaining the trial and record.

After the model rinse, the boat has a subtle blue wet-surface cue and no remaining solid grains. Guidance explains why its wet mass cannot be used as a dry after-transfer reading. The receiver note distinguishes rinse solvent from solid sample mass.

## Solid-mass display

The bar shows the current solid mass in the receiver and the current solid mass left in the boat. Its widths use the actual rounded model masses, including tiny samples where nominal residue rounds to zero. Visible labels, a hatched residue segment, exact masses, and an equation provide alternatives to color. No minimum segment width distorts the proportions.

For a 0.5000 g sample with 4% dry-pour residue, the bar is 96% received and 4% remaining, with **0.5000 g = 0.4800 g + 0.0200 g**. After rinsing, it becomes **0.5000 g = 0.5000 g + 0.0000 g**. An older recorded dry-transfer value remains visible and stale until the learner records the updated transfer; the current bar never presents that older value as current.

The bar's data fills and legend swatches preserve their colors and hatch in forced-colors mode. The surrounding controls and text honor the user's forced-color scheme. The diagram remains a responsive SVG illustration with schematic grains, not a particle-count scale or a new WebGL simulation. Rinse liquid is excluded from solid-mass totals.

See [the sample-transfer practice notes](titration-transfer-practice-2026-09-09.md) for the existing model assumptions, workflow, and chemistry references. The no-spill and complete-model-rinse assumptions remain unchanged.

## Verification

- **192 tests passed across 12 suites**, including eight new tests for view selection, framing, actual rounded mass fractions, stale records, state-aware explanations, and invalid sources. The report is `reports/chemistry-refinement-2026-09-06/titration-transfer-inspection-tests.json`.
- **44 scoped browser accessibility/layout scans passed**: 18 in the new inspection harness and 26 in the existing transfer regression harness. There were no scoped axe violations, horizontal overflow, or page errors at 1200 px and 320 px.
- Browser coverage includes keyboard view selection, dry residue, rinsing, old versus current records, returning to the activity, zero residue, a tiny sample, invalid source recovery, forced colors, and preservation of weighing and live chemistry state.
- Desktop and phone screenshots were visually inspected. The final forced-colors screenshot confirms the mass bar remains visible; the final phone close-up confirms the wet boat and guidance fit the narrow layout.
- Source syntax, exact source/public copy equality, 16 new English string fallbacks, all 542 equipment-helper English keys, and scoped whitespace checks passed.

Run `node reports/chemistry-refinement-2026-09-06/titration-transfer-inspection-browser.cjs` for the new browser checks. Run `node reports/chemistry-refinement-2026-09-06/titration-transfer-browser.cjs` for the existing transfer workflow regression checks. Results and screenshots use the corresponding prefixes in that directory.

There are **16 new English keys** in this pass. Other-language translations remain pending; existing language-pack checks do not establish that this new copy is translated. Changes are local, with no deployment or physical-device classroom trial included in this verification.
