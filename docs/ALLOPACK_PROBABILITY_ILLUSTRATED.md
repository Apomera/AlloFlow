# Probability Models — concept-focused revision 2

The current edition replaces all five classroom portraits with instructional diagrams. The 25 active images now focus on counters, the draw process, replacement, trial records and model/data comparisons. The portable pack contains 685,658 characters across 14 resources.

[Current AlloPack](../allopacks/illustrated/probability_models_grade7.allopack.json) · [Current specifications and descriptions](../allopacks/media/probability_models_grade7/manifest.json)

The revised single-trial visual shows one possible result; mixing shows hidden contents rather than a student portrait. The introductory panel separates the opaque bag from the revealed model. Six individual record spaces demonstrate recording every trial. The final panel compares one red outcome in a four-counter model with seven red results in a twenty-trial sample. Native captions explain that examples are not guaranteed schedules and that shaking alone does not establish equal chances.

Original activity text, objectives, answer keys and references remain preserved. The prior images and manifest-v1.json remain available for audit; new selected source filenames use concept-v2. These exact diagrams were created as editable SVGs and embedded as WebP, not generated classroom artwork.

Validation for this revision: 13 targeted tests passed across three suites; local catalog download and offline reopening decoded all 25 images and exposed all eight lesson descriptions. Embedded pixel checks passed for 143 probability counter centers across all 25 diagrams. Native anchor/sort images were unchanged from the previously verified edition. No live publication occurred; educator review remains pending.

[Revision 2 integration evidence](allopack-quality-2026-09-09/probability-v2-integration.json) · [Current pixel evidence](allopack-quality-2026-09-09/math-diagram-pixels.json)

Future artwork guidance: explain a specific concept, relationship, step or piece of evidence. Include people only when their visible action adds instructional information. Avoid substituting classroom portraits for the concept.

---

## Historical first-edition notes

# Probability Models — illustrated edition

Completed September 9, 2026.

[Importable AlloPack](../allopacks/illustrated/probability_models_grade7.allopack.json) · [Image prompts and descriptions](../allopacks/media/probability_models_grade7/manifest.json)

The Grade 7 pack, Likely Is Not Certain — Probability Models, has 25 images across 14 resources: eight glossary pictures, three native anchor images, six native sorting-card images and eight lesson panels. Five selected images are generated classroom cartoons and 20 are exact diagrams. One generated candidate was replaced because of an extra-arm error. The portable JSON is 745,966 characters.

## Mathematical accuracy

The stated mixed bag contains exactly three blue counters and one red of equal size and shape. The all-red sorting bag contains four red counters. Target-event counters occupy detached dashed bubbles, so they are not counted as extra bag contents. Directions explain this convention. The blue and red names remain available in the native text.

Bag diagrams reveal contents only to explain the model. Actual trial scenes use opaque bags and illustrate drawing without looking. Pictures cannot establish equal selection chances; captions state the required assumptions. Returning a counter and mixing restores the intended setup.

Possible short runs vary without requiring one red in every four draws. The sample record contains exactly seven red and thirteen blue results, matching 7/20 = 0.35. Captions avoid saying a streak makes red due or that every larger sample must match better. A separate unequal-size example prompts students to examine model assumptions.

Artwork remains text-free. Captions, titles, activity text, objectives, original answer keys and references stay native and editable. Diverse cartoon students actively participate, including a wheelchair user.

[Probability integration evidence](allopack-quality-2026-09-09/probability-integration.json) · [Native resource evidence](allopack-quality-2026-09-09/probability-native-resources.json)

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