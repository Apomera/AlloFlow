# Volume, Grade 5 — illustrated edition

[Importable AlloPack](../allopacks/illustrated/volume_grade5.allopack.json) · [Artwork, prompts and descriptions](../allopacks/media/volume_grade5/manifest.json) · [Before/after content audit](../allopacks/media/volume_grade5/content-refinements.json)

This edition contains 32 image placements across 14 resources: ten glossary pictures, five anchor-section images, nine concept-sort pictures and eight lesson panels. Nine original illustrations were made with the built-in image generator in a warm hand-printed style. Eleven exact SVG diagram designs supply the mathematical models. Reuse gives 11 generated-art placements and 21 diagram placements. The portable JSON contains 887,755 characters.

The illustrations show sand in a sandbox, soil in a raised bed, water in a tank, carpet coverage, a painted wall, a window pane, a fenced yard, a single ribbon loop around a box and mirror trim. They focus on what is measured rather than people. Artwork contains no baked-in text. Native captions explain the diagrams; reviewed image descriptions and production-compatible hashes are embedded.

## Mathematical review

Twenty-two field refinements apply only to the illustrated edition. The original text-only pack is unchanged; the audit records each before/after value.

The lesson distinguishes base area in square units from a one-unit-thick layer's volume in cubic units. It limits exact whole-cube counting to appropriate solids and explains that not every shape can be decomposed into rectangular prisms. Prism and height definitions now specify matching parallel polygon bases and perpendicular height.

The pyramid FAQ uses a prism with the same base area and perpendicular height as its comparison, rather than an unspecified surrounding box. Mixed-unit products are described as meaningful but requiring conversion. A general prism slice is no longer assumed to contain a whole-number tiling of unit cubes.

The sort cards distinguish wall area from paint quantity, glass area from glass volume, and a single ribbon loop from a bow or crossed wrapping. Their original category answers remain unchanged. The layer memory aid now states the thickness assumption and the limitations of a real sliced-loaf analogy.

The packaging challenge specifies ideal closed rectangular boxes, internal capacity, all six faces, positive integer dimensions and rotations counted only once. It excludes wall thickness, seams, tabs and cutting waste from the mathematical comparison, leaving practical tradeoffs for discussion.

## Diagram review

The 4-by-3-by-5 solid contains 60 cubes, including hidden cubes. Its visible face grids are not themselves the cube count. Five matching layers are laid out separately, making every top grid visible; join them without gaps to form the original solid.

The joined L solid uses 16 teal cubes and 12 ochre cubes, with no overlapping volume. The two equal-volume rectangular solids contain 36 cubes each. The cube net contains six square faces and compares 24 square cm of covering with 8 cubic cm of enclosed space for a 2 cm edge.

The tank image shows a water level below its rim. That amount is less than full capacity; use internal measurements for capacity calculations. Generated object illustrations are not scale drawings.

## Verification

- All 15 targeted pack/catalog checks passed, including six pack tests.
- Tests verify model cube counts, unique occupied positions, layer counts, visible face grids, joined-block counts, description hashes, source preservation and the complete content audit.
- All 69 pack files, containing 779 resources, passed the production-loader import check.
- Local CommunityCatalog loading, download and offline reopening preserved all 14 resources.
- All 32 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Five anchor images, nine teacher-sort images and nine student-sort images rendered, with zero pending slots.
- All generated sources, the exact-diagram contact sheet, four mobile lesson groups and the native-resource mobile screenshot were visually reviewed.

[Test results](allopack-quality-2026-09-09/volume-tests.json) · [Integration evidence](allopack-quality-2026-09-09/volume-integration.json) · [Native-resource evidence](allopack-quality-2026-09-09/volume-native-resources.json) · [Collection imports](allopack-quality-2026-09-09/imports.json)

These checks use local production-component harnesses, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Small native anchor thumbnails work as reminders; use the larger lesson panels for exact cube counting.

Rich descriptions are stored for every image. Existing anchor and teacher-sort views treat images as decorative beside text; student-sort uses card statements as alt. Glossary and lesson views consume the reviewed descriptions. Full accessibility review of those existing renderer behaviors remains separate from pack integration.

Educator review is pending. No community-library entry was published.

## Rebuild

Run `node dev-tools/build_volume_illustrated.cjs`. This runs the shared image builder and then `dev-tools/volume_content_refinements.cjs`. Running the generic builder alone omits the wording corrections.

The manifest contains the final prompts and selected source references. Source PNGs, editable SVGs and embedded WebPs are stored under `allopacks/media/volume_grade5`. The planner `dev-tools/plan_volume_illustrated.cjs` refuses to overwrite an existing manifest.

Nineteen illustrated editions are now present.

