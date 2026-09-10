# Decimal Place Value — illustrated edition

Completed September 9, 2026.

[Importable AlloPack](../allopacks/illustrated/decimal_place_value_grade5.allopack.json) · [Image prompts and descriptions](../allopacks/media/decimal_place_value_grade5/manifest.json)

The Grade 5 pack, Same Digits, Different Values — Decimals, has 26 images across 14 resources: nine glossary pictures, three native anchor images, six native sorting-card images and eight lesson panels. Five images are generated classroom cartoons and 21 are exact diagrams. The portable JSON is 772,119 characters.

## Mathematical accuracy

Sorting diagrams represent 0.50, 0.500, 0.05, 0.499, 0.51 and 0.605 with exactly 500, 500, 50, 499, 510 and 605 shaded cells out of 1,000 equal cells. All ten small hundred-grids together form one whole. The equal-value cards intentionally use identical imagery. Near-half values differ by real cells, not approximate generative shading.

The equivalence lesson uses two identical whole squares. Tenths, hundredths and thousandths are precisely partitioned. Zero-placement examples distinguish 0.6 from 0.06 while trailing fractional zeros preserve value. The original reading, objectives, questions, answer keys and references are preserved.

Images contain no instructional text; decimal notation stays in native activity text and captions. Blank tiles and place boxes provide context for notation rather than independently teaching a digit. Classroom ribbons are not scale drawings. Students and educators should use the exact diagrams and source text for numerical conclusions.

Diagrams retain 1,000-pixel resolution. The default small sorting thumbnails cannot clearly show a one-thousandth difference; use an enlarged image or the native number text for close comparisons. The directions explain the whole and cell-reading order.

[Decimal integration evidence](allopack-quality-2026-09-09/decimal-integration.json) · [Native resource evidence](allopack-quality-2026-09-09/decimal-native-resources.json)

## Verification

- 626 tests passed across 18 AlloPack/catalog suites. The decimal description-limit check was also rerun after tightening its assertion.
- All 61 pack files, containing 665 resources, imported through production loading code.
- Local CommunityCatalog loading, actual download and offline production-loader reopening preserved original fields and all embedded image data.
- Each pack exposed all eight reviewed lesson descriptions through the native lesson renderer.
- Each pack rendered all three anchor images and all six sorting images in teacher and student components, with no pending image slots.
- Mobile native-resource screenshots were inspected for image placement. These isolated harnesses do not reproduce full app styling or translation.

[Regression evidence](allopack-quality-2026-09-09/math-regression.json) · [Collection import evidence](allopack-quality-2026-09-09/imports.json) · [Embedded diagram pixel checks](allopack-quality-2026-09-09/math-diagram-pixels.json)

All 41 exact diagrams were reviewed visually and checked after WebP embedding. The pixel checks sampled 9,124 decimal cell centers and 107 probability counter centers against their SVG colors. Mathematical tests separately checked source values, equal cell areas, identical whole sizes, target-counter separation and the seven-in-twenty record.

Every image has a reviewed description and a matching image hash. Existing anchor and teacher-sort components treat pictures as decorative beside text; the student-sort game uses the card text as alt. Stored descriptions are not yet consistently consumed in those components. Native glossary and lesson helpers do consume their reviewed descriptions.

These are local component integration checks, not a live publication or a full signed-in teacher session. Educator review remains pending. No community-library entry was published.

## Rebuild

The canonical selected prompts, source paths and diagram specifications are in each manifest. Original PNGs, optimized WebP files and editable SVG diagram sources are saved beside it. The built-in image generator supplied classroom cartoons; deterministic SVG code supplied exact mathematical diagrams. No external image API was used.

Run node dev-tools/build_math_illustrated.cjs PACK_SLUG, then node dev-tools/qa_math_illustrated.cjs PACK_SLUG and node dev-tools/qa_allopack_resource_images.cjs PACK_SLUG. Run node dev-tools/qa_math_diagram_pixels.cjs for embedded math checks and node dev-tools/qa_allopack_imports.cjs 2026-09-09 for collection import evidence.

Eleven illustrated editions are now complete. These two packs finish the five newer text drafts that began with Sound and Vibration. Original text-only packs remain unchanged.