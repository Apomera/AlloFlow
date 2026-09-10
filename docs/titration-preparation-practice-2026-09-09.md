# Volumetric preparation practice — September 9, 2026

The Equipment tab now continues the weighing and transfer sequence with an interactive 100 mL solution-preparation exercise. Open **Prepare the solution** in the preparation path or continue from a recorded sample transfer.

## Workflow and visuals

Load the delivered mass from a current transfer record. Dissolve the sample, then transfer the solution and receiver/funnel rinsings. The model places the flask at 95.00 mL so the student can practise approaching its single mark with 1.00 mL and 0.05 mL model additions.

The SVG scene shows the receiver, a volumetric flask, and an eye-level meniscus view. **Enlarge meniscus** provides a keyboard-operable close-up for smaller screens without changing any measurements. The bottom of the modeled meniscus meets the calibration line at 100.00 mL. Readable numerical values and status text accompany the illustration. The close-up explicitly exaggerates small differences near the mark so a 0.05 mL model overshoot is visible; its height is not a quantitative volume scale.

The student must align the eye with the mark and reach the target volume before **Stopper and mix** creates a prepared-solution record. A stopper and inversion cue distinguish completion; mixing does not change the liquid's displayed color.

For example, the earlier dry transfer delivers 0.4800 g. Making that mass up to 100 mL gives **4.800 g/L**. This is mass concentration, not molarity; molarity requires the solute's molar mass. The calculation uses final solution volume, rather than the volume of solvent added.

## Overshoot and retained records

An addition can cross the mark. The exercise preserves the actual model volume and blocks completion until the preparation is restarted. It explains why removing some mixed solution does not restore the intended concentration.

The preparation keeps a copy of its delivered mass. Later transfer changes do not silently replace that copy or an existing preparation result. The UI flags the changed source; loading a sample explicitly starts a new preparation. An absent or stale transfer record cannot start one. Restart retains the chosen sample mass and resets dissolution, filling, and eye alignment. Equipment navigation retains progress.

The exercise stores its own state in `titrationLab.preparationPractice`. It does not alter the balance sample, transfer record, live titration, or existing titration notebook.

## Model boundaries

Sample mass uses integer units of 0.0001 g, and volume uses integer units of 0.01 mL. The additions are fixed model portions, not a guarantee of actual drop size. The additional numerical volume display is a teaching aid; a real volumetric flask has one calibration mark and is not a graduated cylinder.

Complete dissolution, quantitative transfer, the initial 95.00 mL fill, and complete mixing in one action are explicit simplifications. Liquid heights are schematic. The exercise does not model solubility, thermal expansion, or uncertainty. Its instructions direct students to follow the reviewed procedure and the flask's calibration temperature.

The procedural order, use of rinsings, eye-level reading of the lower meniscus for a clear solution, and repeated inversion follow [University of York guidance on preparing solutions from solids](https://chemtl.york.ac.uk/techniques/quantification/volumetrics/copy-of-preparing-solutions-from-solids).

## Verification

**145 tests passed across seven targeted suites.** After the final visual refinement, all 11 English-coverage and focus checks passed again. **26 browser accessibility/layout scans passed**, with no scoped violations, overflow, or page errors. Source syntax, exact source/public parity, all 250 equipment-helper English strings, and scoped whitespace checks passed. Desktop and phone screenshots were visually inspected, including the enlarged meniscus and overshoot state. The targeted tests cover source-record eligibility, action order, integer volume accumulation, meniscus/mixing gates, overshoot, final mass-concentration units, retained snapshots, restart, and malformed saved-state recovery, alongside the existing titration checks.

The browser fixture uses the actual widget, React, and application stylesheet. It exercises the transfer-to-preparation path, both delivered masses, near-mark additions, missing eye alignment, mixing, a changed source, overshoot, navigation retention, forced-colors keyboard use, meniscus enlargement, corrupted state, and preservation of the live experiment. Screenshots and scoped axe/overflow checks cover 1200 px and 320 px layouts.

Run `node reports/chemistry-refinement-2026-09-06/titration-preparation-browser.cjs`. Reports and images use the `titration-preparation-*` prefix in the same directory. The targeted Vitest run uses `--pool=threads --maxWorkers=1` because fork-worker startup timed out in the preceding task.

There are 46 new English keys in this pass. Other-language translations remain pending. Source and desktop/public copies are kept identical. These are local changes; no deployment or physical-device classroom trial is included.

Follow-up: [volumetric pipetting practice](titration-aliquot-practice-2026-09-09.md) now takes a 25 mL aliquot from a copy of the prepared solution and records its concentration and calculated solute mass.
