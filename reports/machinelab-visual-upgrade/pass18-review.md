# Machine Lab: lever arm guides (pass 18)

The lever now places its effort and load contacts at distances from the pivot that match the selected arm ratio. Previously, the contacts were inset from the beam ends by unequal amounts, distorting that visual ratio. Equal beam extensions support the effort pad and load seat beyond their contact centres.

Colored arm guides run from the pivot to each contact on both sides of the beam. They turn with the beam and remain visible from front and rear views. The observation text explains what they measure. Motion travel is bounded to keep the extended beam and guides clear of the platform at extreme ratios.

## Checks

Eleven new tests cover exact arm ratios, equal beam end margins, guide endpoints, rotation, bed clearance, and the lever-only explanation. Browser scenarios cover equal, unequal, and reversed arms at half/full stroke, a rear view, keyboard inspection on 320px and 390px screens, reduced motion, and demonstration/station controls.

Each of the three browser themes passed nine desktop scenarios with no browser errors or horizontal overflow. Visually inspected the light default lever and dark mobile lever.

[Default lever at full stroke](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass18-light/lever-2-1-100.png>)

[Dark mobile lever](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass18-dark/mobile-lever-320.png>)

## Publishing

Changes remain local. Source and desktop mirror were checked for independent edits before synchronization. No commit, push, or deployment was performed in this pass.

## Final test results

All 335 focused tests passed across five files covering geometry, views, accessibility, cameras, and translation. The initial run completed two files and encountered a worker timeout; the remaining three files passed in a separate rerun. The full Machine Lab suite was not rerun for this scoped lever change.

Source and desktop mirror are byte-identical. JavaScript syntax and scoped whitespace checks passed. SHA-256: e3e6fc7e72053bd21c41e5031aa69eff1c7304f8a62708ec4d951e88732eb642.
