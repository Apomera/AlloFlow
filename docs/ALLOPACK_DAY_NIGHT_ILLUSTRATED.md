# Day Sky, Night Sky — cut-paper illustrated edition

[Importable AlloPack](../allopacks/illustrated/day_night_sky_grade1.allopack.json) · [Prompts, selected sources and image descriptions](../allopacks/media/day_night_sky_grade1/manifest.json)

The Grade 1 pack contains 30 illustrated placements across 13 resources: ten glossary pictures, four anchor-section images, eight concept-sort images and eight lesson panels. Eight generated cut-paper collage originals and six exact diagram designs are reused where the same subject recurs. There are 17 collage placements and 13 diagram placements, not 30 unique generated pictures. The portable JSON contains 384,321 characters.

Layered colored paper, visible fibers and gentle shadows give this edition a different visual style. No people or generic classroom scenes were added. Artwork is text-free; original resource text and lesson captions remain native and editable. All placements have reviewed descriptions and hashes.

## Instructional accuracy

The rotation diagram lights the half facing the Sun and uses a separate curved arrow for turning. Earth rotates approximately once every 24 hours. The fixed Sun is a simplified daily-rotation model, not a claim that the Sun is absolutely stationary in space. [NASA Earth facts](https://science.nasa.gov/earth/facts/)

The Moon diagram shows incoming sunlight and reflected light toward Earth. It does not portray the Moon as a lamp. A separate blue-sky Moon illustration supports the daytime-Moon concept. [NASA Moonlight](https://science.nasa.gov/moon/moonlight/) · [NASA daytime Moon explanation](https://www.nasa.gov/solar-system/why-can-you-see-the-moon-during-the-day-we-asked-a-nasa-scientist-episode-19/)

Sunrise and sunset panels are successive observations, not multiple Suns. Day/night pattern panels do not assert equal durations. Shadow examples show possible observations, not measurements or a universal daily shadow path. The directions retain the instruction never to look directly at the Sun.

Diagrams are not to scale; the paper Earth is a simplified symbol, not an exact map. The illustrated edition preserves the original lesson and answer keys and adds model limitations to the directions. Source phrases such as “The Sun stays put” still need educator interpretation using that clarification.

Concept-sort pictures are subject cues paired with the original statements, not literal depictions of false claims. For example, no walking Sun or falling stars were drawn. Identical Sun and star pictures accompany both true and false statements so the picture alone does not label the answer.

## Verification and publication status

- Local production CommunityCatalog load, actual download and offline reopening passed, preserving all 13 resources.
- All 30 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Native components rendered four anchor images, eight teacher-sort images and eight student-sort images; zero pending image slots.
- Mobile lesson and native-resource screenshots were visually inspected.
- All 64 pack files, containing 706 resources, imported through the production loading code.

[Integration evidence](allopack-quality-2026-09-09/day-night-integration.json) · [Native resource evidence](allopack-quality-2026-09-09/day-night-native-resources.json) · [Collection import evidence](allopack-quality-2026-09-09/imports.json)

These are local component harness checks, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Existing anchor and teacher-sort views treat pictures as decorative beside text; student-sort uses the card statement as alt. The richer descriptions are stored, but those views do not consistently consume them. Glossary and lesson views consume their reviewed descriptions.

The original text-only pack remains unchanged. Educator review remains pending. This edition has not been published to the live community library.

## Rebuild

The manifest and selected assets are the source of truth. Run node dev-tools/build_math_illustrated.cjs day_night_sky_grade1 to rebuild. The generic builder supports this science pack despite its historical filename. Verify native resources with node dev-tools/qa_allopack_resource_images.cjs day_night_sky_grade1. The initial planner dev-tools/plan_day_night_collage.cjs refuses to overwrite an existing manifest. Final diagram refinements are retained directly in the selected SVGs and PNGs.


Regression results: the new pack passed all four integrity tests. The collection run passed 645 of 646 checks; one existing Equal Groups test exceeded its default five-second timeout. All four Equal Groups tests passed when rerun with a 30-second allowance. No assertion failure remained. [Initial results](allopack-quality-2026-09-09/day-night-regression.json) · [Timeout recheck](allopack-quality-2026-09-09/day-night-timeout-recheck.json)

