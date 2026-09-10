# Area and Perimeter — concept-focused illustrated edition

[Importable AlloPack](../allopacks/illustrated/area_perimeter_grade4.allopack.json) · [Prompts and image descriptions](../allopacks/media/area_perimeter_grade4/manifest.json)

The Fence and the Floor now contains 31 images across 14 resources: ten glossary diagrams, four anchor images, nine sorting illustrations and eight lesson panels. The portable JSON contains 309,879 characters.

Nine text-free cartoon illustrations, made with the built-in image generator, show actual jobs: fencing, carpeting, frame trim, painting, sod, ribbon borders, tiling, roof lights and paper covering a box top. No classroom portraits were added. The remaining 22 images are exact SVG diagrams rendered and embedded as WebP.

## Accuracy

The tiled 8-by-5 yard contains 40 square units and its boundary measures 26 length units. The 7-by-7 rug has area 49 and perimeter 28. Same-perimeter comparisons use identical tile scales: 6 by 6 versus 10 by 2, and 11 by 1 versus 8 by 4. The separate square-unit example uses identical tiles throughout. Tests verify the tile geometry and counts.

The job illustrations communicate what is being measured and are not scale drawings. Colored edges indicate the outside boundary; tiles show covered space. The exact numerical dimensions and units remain in native editable captions, not painted into the images. The formula glossary picture illustrates the rectangle-area relationship rather than replacing written mathematical notation.

[Integration evidence](allopack-quality-2026-09-09/area-perimeter-integration.json) · [Native anchor and sorting evidence](allopack-quality-2026-09-09/area-perimeter-native-resources.json)

## Verification and limitations

- 642 tests passed across 22 AlloPack/catalog suites, including 13 new pack and diagram checks.
- All 63 pack files, containing 693 resources, imported through the offline production loading code.
- Local CommunityCatalog load, actual download and offline reopening preserved the pack contents.
- All embedded images decoded offline, and the eight lesson descriptions reached native image alt attributes.
- Native anchor, teacher-sort and student-sort components rendered every image with no pending slots. Mobile screenshots were inspected for picture/content association.

[Regression evidence](allopack-quality-2026-09-09/area-groups-regression.json) · [Collection import evidence](allopack-quality-2026-09-09/imports.json)

These are local component harness checks, not live publication or a full signed-in teacher session. The harness omits full app styling and translations. Existing anchor and teacher-sort views treat pictures as decorative beside text; student-sort uses the card text as alt. Stored detailed descriptions are not consistently consumed in those views. Glossary and lesson renderers do consume their reviewed descriptions. Small thumbnails may need enlargement for exact counting.

Original text-only files are unchanged. The illustrated editions preserve source resources and answer keys, adding native images, four two-panel lesson resources and explanatory directions. Educator review of the source lesson and illustrated edition remains pending. No community-library entry was published.

## Rebuild and source assets

The manifest is the selected source of truth for image specifications, prompts, descriptions and files. Editable SVGs, rendered PNGs and embedded WebPs are saved beside it. The initial source generator is dev-tools/plan_area_groups_images.cjs; dev-tools/refine_area_groups_diagrams.cjs records the container and unit refinements. The initial planner deliberately refuses to overwrite an existing manifest.

Build with node dev-tools/build_math_illustrated.cjs PACK_SLUG. Verify with node dev-tools/qa_math_illustrated.cjs PACK_SLUG and node dev-tools/qa_allopack_resource_images.cjs PACK_SLUG. Run collection import checks with node dev-tools/qa_allopack_imports.cjs 2026-09-09.

Thirteen illustrated editions are now complete. Future artwork should continue to explain concepts, steps, quantities or relationships; classroom portraits are useful only when the visible action adds instruction.