# Food Webs — botanical cut-paper illustrated edition

[Importable AlloPack](../allopacks/illustrated/ecosystems_food_webs_grade5.allopack.json) · [Selected artwork, prompts and descriptions](../allopacks/media/ecosystems_food_webs_grade5/manifest.json)

This Grade 5 edition contains 35 image placements across 15 resources: 12 glossary pictures, five anchor-section images, ten concept-sort pictures and eight lesson panels. Thirteen original collages were generated with the built-in image generator and five diagram designs were authored as SVG. Appropriate reuse gives 24 collage placements and 11 diagram placements. The portable JSON contains 1,294,261 characters.

The botanical cut-paper style continues the previous pack's paper direction. Subjects include an oak, grasshopper, fungi on dead wood, pond algae, a hawk with prey, an earthworm, rooted grass, an omnivorous bear, symbolic bacteria, a Venus flytrap, browsing deer, a meadow and a deer population. No generic classroom portraits were added. Artwork is text-free; native captions and lesson text stay editable. Reviewed image descriptions and image hashes are embedded.

## Accuracy and teaching notes

Food arrows run from food to eater. A plant-rabbit-hawk chain and a branching plant-rabbit/mouse-hawk web show selected feeding paths, not all possible diets or a verified local species inventory. Sunlight supplies the illustrated meadow model, with an explicit note that some ecosystems use chemical energy. [NOAA on photosynthesis and chemosynthesis](https://oceanexplorer.noaa.gov/lesson/vents-and-volcanoes-fueling-life/)

The transfer diagram contains exactly 100 equal dots at the first level and 10 at the next. Its caption identifies this as an approximate teaching model; dots are energy markers, not organisms. Actual transfer efficiency varies. Mineral nutrient uptake is shown separately from energy flow. The directions explicitly say that energy is transformed and dispersed, not created, destroyed or recycled by decomposers. [Energy transfer teaching reference](https://www.khanacademy.org/science/ap-biology/ecology-ap/energy-flow-through-ecosystems/a/energy-flow-and-primary-productivity)

The flytrap stays in the original producer category: it photosynthesizes and obtains nutrients from captured prey. [National Park Service carnivorous-plant teaching reference](https://www.nps.gov/bith/planyourvisit/upload/FINAL-Carnivorous-Plants-Brochure-July-2017-508-2.pdf)

The original earthworm card remains in the broad decomposer category used by this lesson, with a directions note distinguishing detritivores from fungi and bacteria in the narrower terminology. The bacteria artwork is a symbolic magnified scene of cells and organic fragments, not a deer carcass or a literal view of cells eating with mouths. It serves as a subject cue for the original bacteria sorting card.

The Yellowstone narrative is preserved, with an added qualification that wolf effects occur among multiple causes and the story is not a controlled before-and-after experiment. [National Park Service: cycles and processes](https://www.nps.gov/yell/learn/nature/cyclesprocesses.htm)

Original source material still has oversimplifications requiring educator review, including the memory aid's phrase that energy is “made” and “recycled,” the outline's absolute sunlight claim, and broad claims about predator abundance. The new notes correct the interpretation but this image-integration pass is not a full rewrite or scientific certification of the source lesson. Images are not to scale or species-identification guides.

## Verification

- All 13 targeted pack/catalog tests passed, including four new pack integrity checks.
- All 65 pack files, containing 721 resources, imported through production loading code.
- Local CommunityCatalog load, actual download and offline reopening preserved all 15 resources.
- All 35 embedded images decoded offline; eight lesson descriptions reached native alt attributes.
- Native components displayed five anchor images, ten teacher-sort images and ten student-sort images, with no pending image slots.
- Diagram contact sheets and mobile lesson/native resource screenshots were visually inspected.

[Test evidence](allopack-quality-2026-09-09/ecosystems-tests.json) · [Integration evidence](allopack-quality-2026-09-09/ecosystems-integration.json) · [Native-resource evidence](allopack-quality-2026-09-09/ecosystems-native-resources.json) · [Collection imports](allopack-quality-2026-09-09/imports.json)

Checks use a local component harness, not a live deployment or full signed-in session. Harness styling and translations are incomplete. Existing anchor and teacher-sort renderers treat images as decorative beside text; student-sort uses the card statement as alt. Detailed descriptions are stored but are not consistently consumed by those views. Glossary and lesson renderers consume their reviewed descriptions. Enlarge the energy diagram for counting individual dots.

The original text-only pack remains unchanged. Educator review remains pending. No community-library entry was published.

## Rebuild

The manifest records all prompts and selected source files. Sources, editable SVGs, rendered PNGs and embedded WebPs are in allopacks/media/ecosystems_food_webs_grade5. The initial planner is dev-tools/plan_ecosystem_collage.cjs; it refuses to overwrite a manifest. Rebuild with node dev-tools/build_math_illustrated.cjs ecosystems_food_webs_grade5. The generic builder supports science packs despite its historical filename.

Fifteen illustrated editions are now present.
