# Land-surface cutaway and workbench

This pass makes the Land-Surface Scenario Lab show how its five existing inputs shape an illustrative landscape. Rain marks respond to rainfall; soil and pore water respond to antecedent wetness; cover and surface angle change with their native controls. Permeability changes the passage cue while grain and pore geometry remain fixed.

## Interactions and layout

- Open **Explore → Conditions → Land-surface pathways** in the local preview.
- Each of the five feature cards opens and focuses its existing native control.
- **See updated cutaway** returns keyboard focus to the diagram heading without changing learner data.
- Wide layouts place controls beside the scene and both readings. Phones stack the evidence before the controls.
- Zero rain removes new rainfall and pathway marks while retaining the soil wetness setting.
- Light, dark, contrast, and forced-colors styles keep the direction key and native focus cues readable. The SVG is decorative; visible text carries the meaning.

The scene is schematic. Runoff and infiltration retain their original independent 0–100 teaching indices. Arrow geometry does not encode water amounts, and the shallow infiltration arrow does not depict groundwater recharge.

## Verification

- **205 browser checks passed**, with eight bounded captures at 1040, 390, and 320 pixels, reduced motion, and all four color settings.
- **113 regression tests passed** across seven files, including 13 new cutaway tests. The six existing test files were not edited. Six suites passed in the full run; the comparison suite passed separately after a setup timeout. Both raw runs are retained in the unit-runs folder.
- Native keyboard actions checked feature focus, range endpoints, cover/permeability/slope choices, return focus, original equations, fixed pore geometry, and preservation of saved observations, baselines, scores, and paused parcel progress.
- Both installed runtime copies and every loaded browser response matched 3931756397bb4943e201fe8b7761dc9d83facac7421d013d9ddb6d0e7db6c875.
- Reversing exactly three presentation slices reproduces the entire starting runtime byte for byte: f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086.
- The owned QA browser and temporary QA server closed. The existing preview remains available on port 8770.

From the repository root, run the read-only verifier:

    node reports/watercycle-land-cutaway/verify.cjs

After a future enhancement changes the installed source, verify only this frozen receipt with --snapshot-only.

The accepted browser receipt and captures are in [3931756397bb-2026-10-05T21-06-56-082Z](3931756397bb-2026-10-05T21-06-56-082Z/results.json). The frozen runtime, exact presentation replacements, test receipt, and artifact hashes support review of this pass. Earlier visual reports remain untouched. Changes are uncommitted.
