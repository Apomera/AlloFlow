# Solution volume and concentration comparison - September 12, 2026

After recording a mixed 100 mL preparation, open **Explore volume and concentration** below the preparation controls. The optional panel compares a 25 mL aliquot with dilution of the whole sample to a final volume of 250 mL or 500 mL.

## Learning interaction

Each selection starts independently from the recorded preparation. Taking a representative portion changes its volume and solute mass in the same proportion. Diluting the whole sample preserves its solute mass while increasing final solution volume. The comparison uses mass concentration in g/L; no molar mass is assumed.

For the 0.4800 g preparation used in the transfer exercise:

| Example | Solution volume | Solute mass | Mass concentration |
| --- | --- | --- | --- |
| Recorded preparation | 100 mL | 0.4800 g | 4.8000 g/L |
| Take a 25 mL portion | 25 mL | 0.1200 g | 4.8000 g/L |
| Dilute the whole sample to 250 mL | 250 mL | 0.4800 g | 1.9200 g/L |
| Dilute the whole sample to 500 mL | 500 mL | 0.4800 g | 0.9600 g/L |

The equation beneath the diagrams uses the selected result's solute mass and solution volume in liters. Calculations retain the smallest supported sample: a 0.0001 g preparation produces a calculated 0.000025 g aliquot, or 0.0002 g/L after dilution of the whole sample to 500 mL. These values remain visible rather than rounding to zero.

The underlying distinction follows the treatment of homogeneous solutions and conserved solute during dilution in [OpenStax Chemistry 2e, section 3.3](https://openstax.org/books/chemistry-2e/pages/3-3-molarity). The new comparison applies the same volume relationships to the existing preparation's mass concentration. The examples above are calculated from the activity's own recorded mass.

## Visuals and controls

Paired SVG diagrams use tiles with equal front-face area to represent 25 mL each. The recorded solution has four tiles; the three examples have one, ten, or twenty. Solute symbols remain proportional within each pair: 24 symbols in the original, six in the aliquot, and 24 in either whole-sample dilution. Colors do not predict a chemical solution's appearance.

The diagrams include perspective faces and shadows, with a clear legend identifying them as abstract volume diagrams. Dots represent relative solute amount, not visible grains or literal molecules. Numerical volume, solute mass, concentration, and a written explanation make the relationship available without relying on the drawing or color.

Native radio controls support arrow-key selection. The disclosure exposes its mounted panel through `aria-controls`; Escape inside the panel closes it and returns focus to the disclosure button. The selected example is retained while the component stays mounted. Reopening the equipment activity, restarting and completing a preparation, or changing to a different recorded sample restores a closed panel and the aliquot default.

The optional panel is full width and its cards stack at narrow widths. It does not add animation, WebGL rendering, or a remote asset dependency.

## Records and model boundaries

The helper reads only a valid mixed preparation and returns calculated examples. It does not consume stock solution, create an aliquot record, or change any preparation, transfer, weighing, notebook, or live titration state. A later upstream transfer change does not silently replace the retained preparation mass. Explicitly loading the new delivered sample follows the existing restart workflow.

Dilution choices mean **final solution volume**, not a solvent-addition volume. The panel directs learners to suitable larger volumetric glassware and explicitly says not to overfill the existing 100 mL flask. It assumes no loss, no reaction, quantitative transfer, and complete mixing. This is a conceptual comparison, not a new simulated dilution procedure or a measurement-uncertainty model.

See the [preparation workflow](titration-preparation-practice-2026-09-09.md) and [aliquot practice](titration-aliquot-practice-2026-09-09.md) for the connected technique exercises.

## Verification

- **200 tests passed across 13 suites** in the final run, including eight new comparison tests. They cover mass/volume identities, consistency with the actual aliquot result, retained source state, invalid completion gates, unsupported selections, tiny samples, and proportional diagrams. Report: `reports/chemistry-refinement-2026-09-06/titration-solution-comparison-final-tests.json`.
- **30 scoped browser accessibility/layout scans passed** at 1200 px and 320 px: 14 in the new comparison harness and 16 in the existing meniscus-preview regression harness. No scoped axe violations, horizontal overflow, or page errors were reported.
- Browser checks cover completion, keyboard radios, Escape focus return, forced colors, retained versus reloaded samples, activity navigation, tiny values, malformed state, and unchanged live chemistry.
- Desktop, phone, and forced-colors screenshots were visually reviewed.
- Source syntax, exact source/public equality, English catalog/fallback consistency, and scoped whitespace were checked. An initial English key-prefix mismatch was caught by the coverage test and corrected before the final passing run.

Run `node reports/chemistry-refinement-2026-09-06/titration-solution-comparison-browser.cjs` for the comparison and `node reports/chemistry-refinement-2026-09-06/titration-preparation-preview-browser.cjs` for the connected preview regression checks. Screenshots and reports use those prefixes in the same directory. Vitest uses `--pool=threads --maxWorkers=1`.

There are **17 new registered English strings**. Other-language translations remain pending. Changes are local; this verification includes no deployment or physical-device classroom trial.

Follow-up: [solution comparison predictions](titration-solution-prediction-2026-09-12.md) adds optional predictions for solute mass and concentration, separate feedback, and accessible reveal/retry controls.
