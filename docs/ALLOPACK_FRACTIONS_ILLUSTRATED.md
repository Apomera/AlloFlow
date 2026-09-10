# Fractions on the Number Line — illustrated edition

[Importable AlloPack](../allopacks/illustrated/fractions_number_line_grade4.allopack.json) · [Artwork, prompts and descriptions](../allopacks/media/fractions_number_line_grade4/manifest.json) · [Before/after content audit](../allopacks/media/fractions_number_line_grade4/content-refinements.json)

This edition contains 32 illustrated placements across 15 resources: ten glossary images, five anchor-section images, nine sorting pictures and eight lesson panels. Seventeen exact SVG diagram designs supply 31 placements; one original cut-paper materials illustration was created with the built-in image generator. The portable JSON contains 323,737 characters.

The pictures emphasize fraction values, equal intervals, equivalent locations, the same whole and continuation past one. All nine sort cards use the same unit length and the same colors, avoiding category color hints. Partition widths, tick counts and dot positions are exact. The preparation collage shows blank materials, not a completed fraction model. A marked measuring tool is needed for the activity; the illustrated straightedge has no scale.

Artwork has no baked-in text. Native lesson captions identify endpoints, distinguish intervals from tick marks and explain each model. Students should add numerical labels to their own number lines. All 32 placements have reviewed image-specific descriptions and production-compatible hashes.

## Mathematical refinements

Sixteen field changes apply only to the illustrated edition; the original source file remains unchanged. The audit records every before/after value.

The reading now compares numbers by their position farther to the right, restricting the distance-from-zero shortcut to positive fractions. It keeps the same whole when comparing unit fractions, explicitly allows fractions beyond one, and acknowledges that equal slices can also represent fraction amounts. The anchor title no longer implies that area models are invalid.

The FAQ distinguishes terminating decimals from repeating decimals and makes the no-greatest-fraction question explicitly about values strictly between 0 and 1. The sharing example specifies the total number of people. Related anchor, memory and sentence-frame wording clarifies the same-whole condition. Assessment keys and sorting categories remain unchanged.

The measured lesson example chooses a 2-meter whole: fourths are 50 centimeters, eighths 25 centimeters, and 5/4 is 2.5 meters from zero. The displayed two-whole span fits the brief's 4-meter space.

## Verification

- All 15 targeted pack/catalog tests passed, including six pack checks.
- Tests check fraction values against original sort cards, exact cell widths, tick counts, colored-part counts, marked coordinates, equivalent-location alignment, description hashes and the complete before/after audit.
- All 68 pack files, containing 765 resources, passed the production-loader import check.
- Local CommunityCatalog loading, download and offline reopening preserved all 15 resources.
- All 32 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Five anchor images, nine teacher-sort images and nine student-sort images rendered with zero pending image slots.
- The exact-diagram contact sheet, native resource mobile screenshot and all four mobile lesson groups were visually inspected.

[Test results](allopack-quality-2026-09-09/fractions-tests.json) · [Integration evidence](allopack-quality-2026-09-09/fractions-integration.json) · [Native-resource evidence](allopack-quality-2026-09-09/fractions-native-resources.json) · [Collection imports](allopack-quality-2026-09-09/imports.json)

These checks use local production-component harnesses, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Native anchor thumbnails are small; use the larger lesson panels to teach exact partition counts. Existing anchor and teacher-sort views treat images as decorative beside text; student-sort uses the card statement as alt. Rich descriptions are stored but are not consistently consumed in those views. Glossary and lesson renderers consume the reviewed descriptions.

Educator review is pending. No community-library entry was published.

## Rebuild

Run `node dev-tools/build_fraction_illustrated.cjs`. It runs the shared image builder and applies `dev-tools/fraction_content_refinements.cjs`. Running only the generic builder would omit the content corrections.

The manifest contains the final prompts, selected source paths and descriptions. PNG sources, editable SVG diagrams and embedded WebPs are retained under `allopacks/media/fractions_number_line_grade4`. The planner refuses to overwrite an existing manifest.

Eighteen illustrated editions are now present.

