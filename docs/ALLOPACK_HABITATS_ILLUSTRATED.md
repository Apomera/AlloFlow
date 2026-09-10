# Comparing Habitats — cartoon illustrated edition

Completed September 8, 2026.

[Importable illustrated AlloPack](../allopacks/illustrated/habitats_diversity_grade2.allopack.json) · [Prompts and reviewed descriptions](../allopacks/media/habitats_diversity_grade2/manifest.json)

The Grade 2 pack, Who Lives Here? — Comparing Habitats, now contains 25 selected cartoon images across 14 resources: eight glossary pictures, eight lesson panels, three native anchor-section images and six native sorting-card images. All images are embedded in the portable JSON (978,762 characters). Selected PNGs and optimized WebP files are saved under allopacks/media/habitats_diversity_grade2/. The original text-only pack is unchanged.

The built-in image generator produced 27 candidates; 25 were selected after visual inspection. Two counting-chart candidates were replaced because of animal facial or limb details. The final counting chart uses three similar birds beside a bird, fish and rabbit, preserving the distinction between individuals and kinds without changing the source anchor text. The selected prompts, source paths, descriptions and review status are recorded in the manifest.

Artwork includes varied cartoon students, including a child using a wheelchair actively comparing habitat pictures. Outdoor observation and indoor picture comparisons both appear. Plants and animals are represented in ponds, forests, gardens and dry ground, with an evening scene illustrating the limits of a short daytime visit. Illustrations are examples rather than exhaustive habitat records or scale drawings.

## Accuracy and descriptions

The three-snail sorting card contains exactly three snails. The four-animal lesson comparison has four similar beetles on one side and a beetle, snail, butterfly and earthworm on the other. The hidden-animal card shows vegetation concealing the space behind it and reveals no animal. The quiet-garden card contains no visible animals without asserting their permanent absence. Similar pictured ponds do not establish a claim about every pond.

Images contain no instructional words or answer labels. Titles and captions remain native editable text. Every selected image has a description based on the reviewed pixels and a matching hash. A still image does not prove a bird was heard, a search duration, or the identity of an unseen animal; the directions state these limits. Original reading, activities, questions, answer keys, objectives and references are preserved. Educator review remains pending.

## Verification

- 608 tests passed across 14 AlloPack/catalog suites.
- All 58 pack files, containing 623 resources, imported through the production loading code.
- Local CommunityCatalog load, actual download, and offline production-loader reopening preserved the habitat pack data.
- All 25 embedded images decoded offline; the actual lesson renderer exposed all eight reviewed lesson descriptions as alt attributes.
- All three anchor images and six sort images rendered in the native anchor, teacher-sort and student-sort components, with no pending image slots.

[Catalog and lesson-panel evidence](allopack-quality-2026-09-08/habitats-integration.json) · [Native resource evidence](allopack-quality-2026-09-08/habitats-native-resources.json) · [Collection import evidence](allopack-quality-2026-09-08/imports.json)

These are local component integration checks with local catalog responses, not a live publication or a full signed-in teacher session. Existing anchor and teacher-sort components use decorative image treatment beside text, while the student-sort game uses card text as alt; stored image descriptions are not yet consistently consumed in those components. No community-library entry was published.

## Rebuild

Run node dev-tools/build_habitats_illustrated.cjs. For verification, run node dev-tools/qa_habitats_illustrated.cjs and node dev-tools/qa_allopack_resource_images.cjs habitats_diversity_grade2.

Eight illustrated editions are now complete. The next of the five new drafts is weathering_erosion_grade4; no artwork for that pack was generated in this pass.
