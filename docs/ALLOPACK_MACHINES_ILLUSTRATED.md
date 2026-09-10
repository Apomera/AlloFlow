# Simple Machines — mechanical cut-paper illustrated edition

[Importable AlloPack](../allopacks/illustrated/simple_machines_grade5.allopack.json) · [Artwork, prompts and descriptions](../allopacks/media/simple_machines_grade5/manifest.json) · [Before/after content audit](../allopacks/media/simple_machines_grade5/content-refinements.json)

This Grade 5-6 edition contains 36 illustrated placements across 15 resources: twelve glossary images, six anchor-section images, ten sorting pictures and eight lesson panels. Eleven selected original collages were generated with the built-in image generator; ten diagram designs were authored as SVG. Reuse across activities gives 15 collage placements and 21 diagram placements. The final portable JSON contains 324,924 characters.

Artwork includes a seesaw, access ramp, doorknob shaft, flagpole pulley, axe wedge, crowbar, steering wheel, corded blinds, front teeth contacting an apple, a bottle opener and a screw. The selected crowbar was regenerated to place its tip visibly under the plank and its heel on the support. The screw uses a continuous spiral rather than separate rings. Artwork is text-free, with native editable captions and reviewed image descriptions and hashes.

## Scientific and activity refinements

Thirty-four field changes are recorded in the audit. They apply only to the illustrated edition; the original text-only file is unchanged.

A fixed pulley changes direction without ideal force multiplication. A movable pulley attached to the load can multiply force, depending on supporting rope segments. The two lesson pictures show these arrangements separately; the movable-pulley example has two supporting segments and an upward effort pull. Adding a second fixed wheel alone does not guarantee a twofold advantage. [TeachEngineering: Powerful Pulleys](https://www.teachengineering.org/lessons/cub_simple_lesson05)

The lever diagram puts the effort on the longer arm and the load on the shorter arm. Text now acknowledges that some machines trade for speed or change direction instead of reducing effort force. The exact ramp has a sloping length twice its rise; the ideal steady-motion comparison therefore uses half the direct lifting force over twice the distance. It is a geometry model, not an access-ramp specification. [OpenStax: Simple Machines](https://openstax.org/books/physics/pages/9-3-simple-machines)

Two equal-area tile arrangements model force 2 times distance 4 and force 1 times distance 8, both giving work 8 in compatible units. The friction diagram opposes rightward sliding. Wording distinguishes ideal input/output work equality from real mechanical-energy losses and does not imply energy destruction or that friction losses are always small.

The water-jug activity now uses a teacher-approved tabletop model: a sealed load of no more than 250 grams, lifted no more than 10 centimeters above a tray. Force is measured in newtons within the spring scale range. The full-size water-cooler jug is a design context, not a student lifting exercise. The revised brief, criteria, materials and example consistently use the small model.

The object pictures identify mechanical features; they are not assembly or tool-use instructions. The blind mechanism is simplified and not representative of every blind design. Exact quantitative claims belong to the diagrams and captions. Educator review of the lesson, examples and classroom implementation remains pending.

## Verification

- All 15 targeted pack/catalog tests passed, including six pack checks.
- Tests verify the exact 2:1 ramp geometry, equal-work tile counts, complete image coverage, description hashes, recorded content refinements and bounded model activity.
- All 67 pack files, containing 750 resources, imported through the production loading code.
- Local CommunityCatalog load, actual download and offline reopening preserved all 15 resources.
- All 36 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Six anchor images, ten teacher-sort images and ten student-sort images rendered with zero pending image slots.
- Diagram contact sheets and mobile lesson/native-resource screenshots were visually inspected.

[Test results](allopack-quality-2026-09-09/machines-tests.json) · [Integration evidence](allopack-quality-2026-09-09/machines-integration.json) · [Native-resource evidence](allopack-quality-2026-09-09/machines-native-resources.json) · [Collection imports](allopack-quality-2026-09-09/imports.json)

These are local production-component harness checks, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Existing anchor and teacher-sort views treat images as decorative beside text; student-sort uses the card statement as alt. Detailed descriptions are stored but not consistently consumed by those views. Glossary and lesson renderers consume the reviewed descriptions.

No community-library entry was published.

## Rebuild

Run node dev-tools/build_machine_illustrated.cjs. It runs the shared image builder and applies dev-tools/machine_content_refinements.cjs. Using only the generic builder would omit the content corrections.

The manifest and selected sources live in allopacks/media/simple_machines_grade5. Source PNGs, final editable SVGs and embedded WebPs are retained. The initial planner dev-tools/plan_machine_collage.cjs refuses to overwrite a manifest; final wedge contact refinements are stored in the selected SVGs.

Seventeen illustrated editions are now present.
