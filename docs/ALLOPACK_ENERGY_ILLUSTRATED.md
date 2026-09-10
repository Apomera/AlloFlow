# Energy Moves — cut-paper illustrated edition

[Importable AlloPack](../allopacks/illustrated/energy_transfer_grade4.allopack.json) · [Artwork, prompts and descriptions](../allopacks/media/energy_transfer_grade4/manifest.json) · [Exact content changes](../allopacks/media/energy_transfer_grade4/content-refinements.json)

The Grade 4 edition contains 35 illustrated placements across 14 resources: ten glossary images, five anchor-section images, twelve sorting images and eight lesson panels. Eleven original collages were generated with the built-in image generator; six exact diagram designs were authored as SVG. Reuse across activities produces 19 collage placements and 16 diagram placements. The final portable JSON contains 482,395 characters.

Paper illustrations show a drum, calling across a field, a plucked guitar string, a flashlight, sunlight reaching a plant, room lighting, a spoon in soup, a radiator, hands around a mug, a kettle connection and a tablet charger. People appear only where a calling/listening or hand action supplies evidence. Labels and captions remain native and editable; the artwork contains no text. Every placement includes a reviewed description and image hash.

## Scientific refinements

Eleven field changes are recorded with before/after text in the audit linked above. They apply only to this illustrated edition. The original text-only file is unchanged.

- Electric current is defined as flow of electric charge, not energy itself. The reading and anchor chart describe a complete circuit; the diagram connects opposite battery terminals through the bulb filament. [EIA: batteries and circuits](https://www.eia.gov/energyexplained/electricity/batteries-circuits-and-transformers.php)
- The reading, chart and quiz qualify warm-to-cool transfer as net heat flow occurring on its own. Devices can move heat from colder to warmer regions with an energy supply. [Department of Energy: heat pumps](https://www.energy.gov/energysaver/heat-pump-systems)
- Speed comparisons explicitly hold mass constant. Position diagrams show successive observations at equal time intervals, not multiple simultaneous balls.
- The marble sequence is an idealized equal-mass, straight-on collision. The revised reading avoids promising that every collision leaves the first object stopped.
- The clapping answer no longer claims, without a measurement, that most energy becomes sound. Battery answers no longer describe energy as destroyed, the battery as literally empty, or dispersed energy as universally unusable.

The new captions explain that arrows, light cones, sound arcs and warmth wisps are visual conventions. Output arrow widths do not claim measured energy proportions. Sorting follows the journey named by each statement; a device can involve several transfer mechanisms.

Appliance pictures are observation examples. The directions keep practical construction to teacher-approved low-voltage circuits and exclude handling hot liquids or household wiring. The circuit illustration is a conceptual model, not a component assembly specification.

## Verification

- All 15 targeted pack/catalog tests passed, including six pack checks covering image integrity, source preservation with audited changes, scientific wording and position-diagram geometry.
- All 66 pack files, containing 735 resources, imported through production loading code.
- Local CommunityCatalog load, actual download and offline reopening preserved all 14 resources.
- All 35 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Five anchor images, twelve teacher-sort images and twelve student-sort images rendered with zero pending image slots.
- Diagram contact sheets and mobile lesson/native-resource screenshots were visually inspected.

[Test results](allopack-quality-2026-09-09/energy-tests.json) · [Integration evidence](allopack-quality-2026-09-09/energy-integration.json) · [Native-resource evidence](allopack-quality-2026-09-09/energy-native-resources.json) · [Collection imports](allopack-quality-2026-09-09/imports.json)

These checks use local production-component harnesses, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Existing anchor and teacher-sort views treat images as decorative beside text; student-sort uses card text as alt. Rich descriptions are stored but are not consistently consumed by those views. Glossary and lesson renderers use their reviewed descriptions.

Educator review remains pending. Nothing was published to the live community library.

## Rebuild

Use node dev-tools/build_energy_illustrated.cjs. This runs the shared image builder, then applies the tracked corrections from dev-tools/energy_content_refinements.cjs. Running only the historical generic builder would omit those corrections.

The manifest and selected source assets live in allopacks/media/energy_transfer_grade4. The initial planner dev-tools/plan_energy_collage.cjs refuses to overwrite an existing manifest. Source PNGs, editable SVGs and embedded WebPs are retained.

Sixteen illustrated editions are now present.
