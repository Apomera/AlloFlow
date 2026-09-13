# Making Ten, Grade 1 — illustrated edition

Completed locally on 2026-09-12. [Illustrated AlloPack](../allopacks/illustrated/making_ten_grade1.allopack.json). Original text-only pack preserved. Educator review pending; no live publication, commit or push.

## Coverage and artwork

All 31 native placements are filled: 10 glossary entries, four anchor-chart sections, nine concept-sort cards and eight lesson panels. The pack contains 14 resources and is below the two-million-character import limit.

Three generated originals use tactile felt and layered-paper artwork: ten buttons in two rows of five, six-and-four tiles, and two groups of five stars. Their exact counts were visually checked. Fifteen SVG diagram designs supply precise counter groups, a ten frame with eight filled spaces, splitting five into two and three, and make-ten results for 8 + 5 and 9 + 6. Reuse occurs where concepts match; 31 placements does not mean 31 unique paintings.

Artwork is text-free. Titles and captions remain editable. Every placement carries an image-specific description, hash and embedded WebP pixels. Sources, generation prompts, SVGs, compressed images and placement records are saved in [the media folder](../allopacks/media/making_ten_grade1/manifest.json).

## Content refinements

[51 audited field changes](../allopacks/media/making_ten_grade1/content-refinements.json) clarify the whole-number range zero through ten, include ten-and-zero, define a number bond as a whole and its parts, and replace mandatory finger-counting assumptions with counters, frames, drawings or supported pointing. The reading removes pressure to find calculations easy or answer quickly.

The activity distinguishes eleven ordered pairs from six pairs when order is ignored. An empty group is allowed. Existing math answers and quiz keys remain correct. The five-problem activity is renamed Make-Ten Problems so its title does not imply ten questions.

The split-five caption explicitly says the upper and lower pictures show the same five counters at different stages; students should not add both stages. Button captions distinguish buttons from button holes. Colors support grouping, while spatial separation and descriptions also identify the groups.

## Verification and scope

- 308 tests passed: six targeted pack checks plus 302 catalog checks. Exact diagram counter totals, all nine sorting classifications, math answers, image data, hashes, audit entries, preserved source content and the production artifact envelope are checked.
- Production imports pass for 78 collection files and 911 resources. There are now 28 illustrated editions.
- Local catalog download and offline production-loader reopen preserved all 14 resources; all 31 image placements decoded offline and all eight lesson alt attributes were verified.
- Four anchor images and all nine sort images rendered offline in both teacher and student sort views. Zero pending slots.
- All generated originals, the diagram contact sheet, four mobile lesson groups and the mobile native-resource view were visually inspected.

[Test report](allopack-quality-2026-09-12/making-ten-tests.json), [integration report](allopack-quality-2026-09-12/making_ten_grade1-integration.json), [native resources](allopack-quality-2026-09-12/making_ten_grade1-native-resources.json), [collection imports](allopack-quality-2026-09-12/imports.json).

Screenshots are in `scratch/making_ten_grade1-qa/` and `scratch/resource-backfill-qa/making_ten_grade1/`. Checks use production components with local catalog responses, not a live signed-in community-library session. Harness translations and styling are incomplete. Small thumbnails serve as reminders; use enlarged lesson panels for counting instruction.

Descriptions are stored in all slots. Existing glossary and lesson views consume them; anchor and teacher-sort views treat their adjacent images as decorative, while the student sort uses card statements as alt. This is not a complete screen-reader audit of those renderers.

## Rebuild

```powershell
node dev-tools/build_making_ten_illustrated.cjs making_ten_grade1
```

Use the wrapper so the content refiner runs after image assembly. The initial planner refuses to overwrite an existing manifest. The images are copied into the workspace; reopening the pack does not depend on the image generator or remote image URLs.
