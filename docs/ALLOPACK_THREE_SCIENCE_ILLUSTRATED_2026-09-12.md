# Three illustrated science AlloPacks — September 12, 2026

Completed local review editions of Plate Tectonics (grade 6), Body Systems (grade 6) and Photosynthesis (grade 7). Original text-only files remain separate. No community-library entry was published, and educator review is pending.

## Importable files and coverage

| Pack | Glossary | Anchor sections | Sort cards | Lesson panels | Total placements | Resources |
|---|---:|---:|---:|---:|---:|---:|
| [Plate Tectonics](../allopacks/illustrated/plate_tectonics_grade6.allopack.json) | 12 | 5 | 9 | 8 | 34 | 15 |
| [Body Systems](../allopacks/illustrated/body_systems_grade6.allopack.json) | 12 | 4 | 10 | 8 | 34 | 15 |
| [Photosynthesis](../allopacks/illustrated/photosynthesis_grade7.allopack.json) | 10 | 5 | 9 | 8 | 32 | 16 |

There are 100 image placements, using 15 newly generated originals and 26 distinct code-native diagram designs. Artwork is reused when the same concept appears in another resource: 22 placements use the generated originals and 78 use diagrams. These are not 100 unique original illustrations.

The built-in image generator produced the artwork. Geology uses layered-paper and mineral-pencil landscapes; body systems use soft clay and pencil organ models; photosynthesis uses botanical watercolor and pencil studies. There are no generated people. Exact diagrams control motion, flow and molecular counts. Artwork contains no baked-in labels; lesson captions and labels remain editable in the app.

Every slot stores a reviewed image-specific description and hash. All selected PNGs, SVGs and embedded WebPs are retained in the corresponding media directory. Final prompts, source paths, descriptions and resource mapping:

- [Plate manifest](../allopacks/media/plate_tectonics_grade6/manifest.json) · [prompts](../allopacks/media/plate_tectonics_grade6/source-prompts.json)
- [Body manifest](../allopacks/media/body_systems_grade6/manifest.json) · [prompts](../allopacks/media/body_systems_grade6/source-prompts.json)
- [Photosynthesis manifest](../allopacks/media/photosynthesis_grade7/manifest.json) · [prompts](../allopacks/media/photosynthesis_grade7/source-prompts.json)

## Accuracy review

**Plate Tectonics:** 52 audited field changes distinguish crust from lithosphere, describe the mantle as mostly solid, separate continental collision from oceanic subduction, and acknowledge creep and earthquakes beyond transform boundaries. Wegener's story now distinguishes his proposal from modern plate tectonics and avoids claiming universal ridicule or that evidence is worthless without a complete mechanism. Antarctic coal supports past environments but alone cannot prove movement. [USGS plate definition](https://pubs.usgs.gov/gip/dynamic/tectonic.html), [development of the theory](https://pubs.usgs.gov/gip/dynamic/developing.html), [historical perspective](https://pubs.usgs.gov/gip/dynamic/historical.html).

The fern fossil is a generic example, not Mesosaurus. Landscapes are artistic, not surveyed maps. Boundary views, scale limits and magnetic-band color conventions are explicit in captions. [Correction audit](../allopacks/media/plate_tectonics_grade6/content-refinements.json).

**Body Systems:** 41 audited changes distinguish gas exchange from breathing, define arteries and veins by flow direction, describe many dietary fats entering lymph before blood, and explain that heart pacemaker cells initiate the rhythm while nerves and hormones regulate it. The lesson describes ATP and the limits of the relay metaphor. Activity measurements show rate changes, not which signal came first. Optional participation and consistent counting windows are explicit. [NHLBI gas exchange](https://www.nhlbi.nih.gov/health/lungs/breathing-benefits), [heart rhythm](https://www.nhlbi.nih.gov/health/heart/heart-beats), [NIDDK digestion](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works).

Organ models omit fine anatomy. The circulation diagram uses two symbols for the sides of ONE heart and says so in its caption. Blue denotes lower oxygen, not blue blood. The digestive route omits accessory organs and the large intestine; the absorption panel omits lymph and identifies that limitation. [Correction audit](../allopacks/media/body_systems_grade6/content-refinements.json).

**Photosynthesis:** 66 audited changes separate material reactants from light energy, replace the claim that green light is useless, distinguish carbon source from total fresh mass, and qualify the willow experiment's conclusions. The sort's input category includes energy without calling it a material reactant. Cellular respiration and artificial-light photosynthesis are explained consistently. The growing experiment now acknowledges photon-delivery confounds and that height or fresh mass does not directly measure photosynthetic rate. [NASA carbon cycle](https://science.nasa.gov/earth/earth-observatory/the-carbon-cycle/), [MSU green-light guidance](https://www.canr.msu.edu/floriculture/uploads/files/is%20green%20light%20useful.pdf), [MSU light measurement](https://www.canr.msu.edu/uploads/resources/pdfs/lightquality.pdf).

Molecule colors are conventions; the gold sugar hexagon is explicitly a token, not a molecular structure. The overview is not a balanced equation. Algae artwork illustrates diversity, not species identification. The shortened sorting label fits the 390-pixel mobile harness. [Correction audit](../allopacks/media/photosynthesis_grade7/content-refinements.json).

## Verification and scope

- All 27 targeted checks passed: six tests for each pack plus nine catalog checks. Tests cover complete native coverage, portable pixels, alt hashes, retained content, scientific conventions, valid answer options and every audited field change.
- All 74 collection files, containing 853 resources, passed production-loader imports. There are now 24 illustrated editions.
- Local catalog download and offline reopen preserved all 46 resources in these three editions. All 100 embedded images decoded offline, and all 24 lesson alt attributes were verified.
- All 14 anchor images and all 28 sort images rendered in both teacher and student sort views, with zero pending slots.
- All 15 generated originals, all diagram contact sheets, all 12 mobile lesson groups and all three native-resource mobile views were visually reviewed.

[Test evidence](allopack-quality-2026-09-12/three-science-tests.json) · [Collection import evidence](allopack-quality-2026-09-12/imports.json)

Per-pack integration and native-resource reports are saved in `docs/allopack-quality-2026-09-12/`, named with each pack slug. Screenshots remain in `scratch/<slug>-qa/` and `scratch/resource-backfill-qa/<slug>/`.

Checks use local catalog responses and production components, not a live deployment or full signed-in teacher session. Harness translations and styling are incomplete. Small anchor thumbnails serve as reminders; use larger panels to teach details.

Rich descriptions are stored in all slots. Existing glossary and lesson views consume them; anchor and teacher-sort renderers treat nearby images as decorative, while student-sort uses card statements as alt. A full accessibility review of those renderer behaviors remains separate from this pack integration.

## Rebuild

Run:

```powershell
node dev-tools/build_three_science_illustrated.cjs plate_tectonics_grade6 body_systems_grade6 photosynthesis_grade7
```

The wrapper runs the shared builder and then the appropriate audited content refiner. Running the generic builder alone would omit corrections. The planner `dev-tools/plan_three_science_illustrated.cjs` refuses to overwrite an existing manifest. No commit, push or live publication was performed.
