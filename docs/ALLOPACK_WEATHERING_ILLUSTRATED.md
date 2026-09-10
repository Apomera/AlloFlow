# Weathering and Erosion — cartoon illustrated edition

Completed September 9, 2026.

[Importable illustrated AlloPack](../allopacks/illustrated/weathering_erosion_grade4.allopack.json) · [Prompts and reviewed descriptions](../allopacks/media/weathering_erosion_grade4/manifest.json)

The Grade 4 pack, Break, Move, Settle — Changing Land, contains 25 selected cartoon images across 14 resources: eight glossary pictures, eight lesson panels, three native anchor-section images and six native sorting-card images. All images are embedded in the portable JSON (964,541 characters). Selected PNGs and optimized WebP files are saved under allopacks/media/weathering_erosion_grade4/. The original text-only pack is unchanged.

The built-in image generator produced 27 candidates; 25 were selected after visual inspection. One tray comparison was replaced to make its supporting wedges physically clear. One observation scene was replaced because it introduced planted and bare trays, which would confuse the intended slope-only investigation. Final prompts, source paths, pixel-specific descriptions and review status are saved in the manifest.

Cartoon students have varied appearances and skin tones. A child using a wheelchair actively compares samples while a peer records a picture. Examples include roots in cracks, water and ice, windblown sand, stream transport, glacier debris, falling stones and floodplain deposits. Artwork contains no instructional words; titles, captions and original activity text remain editable.

## Accuracy and descriptions

Weathering changes rock in place; erosion moves material; deposition leaves it behind. Captions qualify freezing as one possible process and avoid claiming every crack has that origin. Grains and cracks may be enlarged for visibility, and motion strokes are drawing cues. Sediment may settle at different locations; the artwork does not imply all grains settle at once.

The slope-test images illustrate a setup, not measured experimental results. Original directions retain controls for soil and water inputs, repeat trials and consistent evidence collection. The water-color panel explicitly says darker water is not an exact sediment-mass measurement. General tray-model examples include plants; these are separate from the controlled slope comparison, whose trays are both bare. Captions explain that real hills have conditions a tray does not reproduce.

Each image has a description based on the reviewed pixels and a matching image hash. Original learning content, objectives, answer keys, categories and references are preserved. Educator review remains pending.

## Verification

- 612 tests passed across 15 AlloPack/catalog suites.
- All 59 pack files, containing 637 resources, imported through production loading code.
- Local CommunityCatalog load, actual download and offline production-loader reopening preserved the pack data.
- All 25 embedded images decoded offline; the actual lesson renderer exposed all eight lesson descriptions as alt attributes.
- Three anchor images and six sorting images rendered in native anchor, teacher-sort and student-sort components, with no pending slots.
- The mobile native-resource screenshot was visually inspected for image presence and association with the intended content.

[Catalog and lesson-panel evidence](allopack-quality-2026-09-08/weathering-integration.json) · [Native resource evidence](allopack-quality-2026-09-08/weathering-native-resources.json) · [Collection import evidence](allopack-quality-2026-09-08/imports.json)

These are local component integration checks with local catalog responses, not a live publication or a full signed-in teacher session. The isolated native-resource harness does not reproduce full app styling or translation. Existing anchor and teacher-sort components treat images as decorative beside text; the student-sort game uses card text as alt. Stored image descriptions are not yet consistently consumed in those components. No community-library entry was published.

## Rebuild

Run node dev-tools/build_weathering_illustrated.cjs. Verify with node dev-tools/qa_weathering_illustrated.cjs and node dev-tools/qa_allopack_resource_images.cjs weathering_erosion_grade4.

Nine illustrated editions are now complete. Next is decimal_place_value_grade5; no images for that pack were generated in this pass.
