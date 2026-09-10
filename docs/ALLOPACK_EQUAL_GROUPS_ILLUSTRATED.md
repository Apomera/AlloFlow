# Equal Groups — concept-focused illustrated edition

[Importable AlloPack](../allopacks/illustrated/equal_groups_grade3.allopack.json) · [Image specifications and descriptions](../allopacks/media/equal_groups_grade3/manifest.json)

What Times Really Means now contains 32 images across 14 resources: ten glossary pictures, four anchor images, ten sorting-card pictures and eight lesson panels. The portable JSON contains 674,232 characters. All images are exact text-free object diagrams; no generated classroom portraits were used.

## Accuracy

Sorting pictures contain the exact source quantities: crackers 3/3/3/3; flowers 5/5/5/5/5/5; chairs 8/8/8; apples 2/2/2/2/2; eggs 6/6; crackers 2/5/1; books 4/7; chairs 4/4/6; marbles 6/3; and crayons 10/10/10/10/7. Actual SVG objects are counted in tests rather than trusting declared totals. Plates, vases, bags, shelves and an egg carton connect the drawings to the card scenarios.

Array pictures show horizontal rows, vertical columns and equal totals when transposed. The known-fact example shows all ten groups of six with the final group outlined for removal; its caption states that removing those six leaves 54. Four empty group spaces represent four groups of zero.

The original lesson sometimes says unequal groups cannot be multiplied. Added directions explicitly limit that shortcut to one group count times one common group size; unequal collections can still be handled by addition, regrouping or combining multiplication and addition. The original source text and answer keys are preserved for educator review.

The exact diagrams were authored as SVGs and rendered to PNG/WebP. No new image-generation calls were needed for this pack. Captions and number notation remain native editable text.

[Integration evidence](allopack-quality-2026-09-09/equal-groups-integration.json) · [Native anchor and sorting evidence](allopack-quality-2026-09-09/equal-groups-native-resources.json)

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