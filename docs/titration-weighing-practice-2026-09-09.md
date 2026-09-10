# Weighing practice and equipment refinements — September 9, 2026

Titration Lab's Equipment tab now contains 14 entries and nine illustrated walkthroughs. This pass adds an analytical balance, weighing boat, and spatula, plus a working weighing exercise. A preparation strip links weighing, sample transfer, and volumetric solution preparation near the top of the tab.

## Student workflow

Select **Weigh a sample** or the **Analytical balance** equipment card. Open the draft shield, place the empty boat, close the shield, and tare. Open it again to add coarse or fine portions, then close it to record the sample mass. The balance artwork reflects the door, boat, sample, and spatula state. A sticky mass readout stays visible while phone users operate the controls.

Gross mass, tare offset, and net reading are shown separately. Removing the boat retains the tare offset and correctly produces a negative reading; returning the boat restores its loaded reading. A recorded mass is preserved when the sample changes and is explicitly marked as stale until the student records again. An overshoot can be recorded as its actual mass rather than being changed to the target.

Weighing progress and the last practice record survive equipment navigation in `titrationLab.weighingPractice`. Restart clears only this exercise. The live titration, presets, volumes, and existing notebook are unchanged by weighing actions.

The activity is an explicitly simplified practice model: 0.5000 g target, ±0.0020 g activity band, fixed additions of 0.1000/0.0100/0.0010 g, a 2 g sample limit, and immediate model stability with closed doors. The band is not measurement uncertainty; the displayed decimals are not an accuracy guarantee. This is not a calibrated instrument or a complete balance physics model.

## Refinements to the existing walkthroughs

All nine illustrated guides now have **Next step**, **Review from start**, and links to related equipment. Direct stage selection remains available. Changing equipment focuses its detail panel; closing a walkthrough returns focus to its card. Each rendered walkthrough uses a unique ID for instructions and SVG definitions. The step counter derives its total from the guide data.

The new weighing-boat guide explains residue accounting; the spatula guide distinguishes controlled portions from a calibrated mass. All three new guides include source links and technique/error notes. The diagrams are SVG illustrations with perspective, not new WebGL viewers or camera-controlled 3D objects.

## Content references

- [Purdue: use of the analytical balance](https://chemed.chem.purdue.edu/genchem/lab/equipment/analytical/instructions) — balance preparation, vessel tare, and reading with closed doors.
- [METTLER TOLEDO: analytical balances](https://www.mt.com/us/en/home/products/Laboratory_Weighing_Solutions/analytical-balances.html) — gross/net/tare distinctions, draft shielding, and readability versus measurement performance.
- [University of York: adding material to a flask](https://chemtl.york.ac.uk/techniques/basic-techniques/weigh-measure/adding-material-to-a-flask) — residue accounting and vessel/solvent compatibility.
- [University of York: solutions from solids](https://chemtl.york.ac.uk/techniques/quantification/volumetrics/copy-of-preparing-solutions-from-solids) — connecting known sample mass, complete transfer, dissolution, and final solution volume.
- [UC Davis Spring 2026 Chemistry 2B manual, page A-52](https://chemistry.ucdavis.edu/sites/g/files/dgvnsk196/files/inline-files/2B%20Student%20Lab%20Manual%20Spring%202026.pdf#page=172) — clean spatulas, stock contamination, and handling excess solid. The linked handling guidance was checked directly; other institutions can prescribe different local procedures.

## Verification

- **124 tests passed** across weighing practice, remaining tabs, focus relationships, existing internationalization checks, and the immersive bench.
- New tests cover exact accumulation, tare and addition gates, negative readings, actual versus stale records, malformed saved state, the practice limit, non-mutating transitions, reset, and every equipment helper's English fallback.
- Chromium exercised the complete weighing workflow, retained progress across boat/spatula guides, an overshoot, a stale record, boat removal/return, keyboard activation, corrupted-state recovery, and preservation of the live titration state.
- **67 automated axe scans passed:** 54 guide scans (nine guides × three stages × two widths), 12 weighing scans (six states × two widths), and one full Equipment-tab scan. Widths were 1200 and 320 pixels. No scoped overflow or page errors were detected.
- The phone readout was verified to stay visible at the activity controls. Forced-colors keyboard activation, next/restart navigation, focus returns, related links, and unmount were checked.
- Desktop and phone screenshots were inspected, including the new balance, boat-transfer, and spatula diagrams. Source syntax, source/public parity, and scoped whitespace checks passed.

There are 85 new English keys in this pass, bringing the equipment helpers to 156 registered keys. Other language translations remain pending. Passing the legacy pack-coverage checks does not imply that new copy has been translated.

Run `node reports/chemistry-refinement-2026-09-06/titration-weighing-browser.cjs` for the complete browser workflow. The existing `titration-equipment-browser.cjs` also recognizes the expanded equipment set. Reports and screenshots are in that directory under `titration-weighing-*`, `titration-equipment-*`, and `titration-preparation-path-mobile.jpg`.

These are local component checks using the actual widget, React, Three.js, and application stylesheet. No deployment, physical-device classroom trial, or complete accessibility certification was performed.

Follow-up: [sample-transfer practice](titration-transfer-practice-2026-09-09.md) now connects the weighing record to residue accounting and solution preparation.
