# Sample-transfer practice — September 9, 2026

The Titration Lab Equipment tab now connects the balance exercise to an interactive sample-transfer exercise and the volumetric-flask guide. Choose **Transfer the solid** in the preparation path, or **Study sample transfer** after recording a mass on the balance.

## Student workflow

1. Use a current recorded sample from weighing. The exercise takes a copy; it does not consume or alter that sample.
2. Choose an illustrative dry-pour residue setting from 0–10%, then pour. A perspective diagram and three mass cards distinguish the starting solid, solid in the receiver, and solid left in the boat.
3. Compare the dry boat masses to find the mass delivered. For 0.5000 g at 4% residue, 0.4800 g arrives and 0.0200 g remains. The dry difference is 2.8456 − 2.3656 = 0.4800 g.
4. Record that result or rinse the remaining solid into the receiver. The rinse model transfers the remaining sample, and the dry after-mass calculation is replaced by an explanation that a wet boat is unsuitable for that dry difference.
5. Record the updated transfer and continue to solution preparation. The volumetric-flask guide shows the delivered mass and links back to the transfer exercise.

If a recorded dry transfer is later rinsed, its earlier mass remains visible and is marked stale. The preparation guide asks for an updated record. If the weighing sample changes, the transfer retains its original sample until **Use recorded sample** is selected again. A stale weighing record cannot start a new trial. **Restart transfer** retains the trial's sample and residue setting but clears its transfer record.

## Model boundaries and content accuracy

Masses are stored as integer units of 0.0001 g; the solid mass in the receiver plus the solid left in the boat always equals the starting mass. Rinse liquid is excluded from those sample-mass totals. The residue slider selects an example outcome, not a physical prediction for a powder. The grain illustrations are qualitative, not a particle-count scale.

The model assumes no spills and a complete rinse in one action. Real methods require compatible solvent and the specified rinsing procedure; one rinse does not guarantee complete transfer. The activity explains dissolution and transfer with rinsings before final solution volume, but does not simulate dissolution, compute concentration, or modify the live titration or its notebook.

The visuals are responsive SVG illustrations with perspective. No new WebGL scene, continuous animation, or remote media dependency is introduced. Controls use native buttons and a labeled keyboard-operable slider; live guidance updates when a transfer is recorded. Navigation focuses the selected equipment detail.

- [University of York: adding material to a flask](https://chemtl.york.ac.uk/techniques/basic-techniques/weigh-measure/adding-material-to-a-flask) supports residue accounting through before/after weighing or compatible rinsing.
- [University of York: preparing solutions from solids](https://chemtl.york.ac.uk/techniques/quantification/volumetrics/copy-of-preparing-solutions-from-solids) connects known mass, dissolution, rinsings, and final solution volume.

## Verification

- **134 tests passed across six suites**, covering transfer, weighing, other titration tabs, focus relationships, English keys, and the immersive bench. The final run used `--pool=threads --maxWorkers=1`; an earlier fork-pool run hit worker-startup timeouts. The successful final report is `titration-transfer-tests-threads.json`.
- **26 browser accessibility/layout scans passed**, with no scoped violations, overflow, or page errors.
- Source syntax, exact source/public mirror equality, all 204 equipment-helper English keys, and scoped whitespace checks passed.

The new unit tests cover current versus stale weighing records, exact mass conservation over the residue range, action order, locked settings, rinsing, dry versus wet masses, stale transfer records, immutable sample copies, restart, zero residue, and malformed saved state.

The browser harness uses the actual widget, React, and application styles. It exercises the complete weighing-to-transfer-to-preparation path, source changes, both recorded transfer methods, focus handoffs, keyboard/forced-colors use, malformed-state recovery, Escape focus return, and preservation of live chemistry fields. It includes 26 scoped axe accessibility and overflow checks across 1200 px and 320 px layouts. Desktop and phone screenshots were inspected; the pour enters through the receiver opening and the highlighted residue follows the tilted boat.

Run `node reports/chemistry-refinement-2026-09-06/titration-transfer-browser.cjs`. Its results and screenshots use the `titration-transfer-*` prefix in the same directory. Test execution totals are recorded in the companion JSON report(s).

There are 49 new registered English keys in this pass, including updated next-step guidance. Other-language translations remain pending; passing the existing language-pack coverage checks does not mean this new copy is translated.

Changes are local. This verification does not include deployment or a physical-device classroom trial.

Follow-up: [volumetric preparation practice](titration-preparation-practice-2026-09-09.md) now uses this delivered mass for a make-to-volume exercise and a mass-concentration record.
