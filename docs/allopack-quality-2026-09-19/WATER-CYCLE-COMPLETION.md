# Water Cycle completion and edition consistency — 2026-09-19

Water Cycle now includes its missing memory aid and applied challenge in the illustrated edition. Both editions share the revised reading, quiz, FAQ, sentence frames, memory aid, and challenge. Existing image bytes, alt text, image hashes, and native picture labels were preserved.

## Content improvements

- Distinguishes water entering soil (infiltration), soil moisture, and groundwater in the saturated zone below the water table. The same distinction now appears in the reading, glossary, chart, sort, written response, memory cue, and design brief.
- Treats the four chart headings as a simple model, not a required sequence for every drop. Removes the question claiming an exact age for a learner's drinking water.
- Corrects the condensation sort heading: a cold glass and ground-level fog show droplet formation, not necessarily clouds in the sky.
- Qualifies claims about visible mist, cloud ice, and ocean inputs/outputs. The memory cue no longer says all visible water must be liquid.
- Gives the schoolyard design task a fictional context, explicit proposal-only boundaries, and a parallel tray example that distinguishes retained soil water from evidence of aquifer recharge.
- Adds directions and manual completion goals for the two restored activities. Their revised fact sets carry source URLs and fact hashes but remain marked pending educator review.
- Adds memory-aid and applied-challenge tags to the existing local catalog entry and its source record. Catalog generation reproduces the updated entries. No live publication occurred.

The science distinctions were checked against [USGS infiltration](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle), [USGS aquifers and groundwater](https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater), [USGS cycle pathways](https://water.usgs.gov/edu/activity-watercyclebegin.html), and [NOAA clouds](https://www.nesdis.noaa.gov/our-environment/clouds). This is a targeted AI-assisted source check, not educator certification.

## Prevention and verification

A new edition-consistency validator compares all 43 original/illustrated pairs. It rejects missing source resources, changed resource types, duplicate illustrated IDs, and unresolved direction or lesson references. Additional image resources are allowed. The existing content-audit verifier now runs this check; it no longer merely reports missing source resources as a successful audit.

- Broader Water Cycle, flagship, catalog shape, edition, and answer-integrity run: **870 tests passed**.
- New science and edition regression run: **51 tests passed**, including 47 overlapping edition cases from the broader run.
- Production offline imports: **105 files / 1,247 resources passed**.
- Image coverage: **1,404 placements, zero missing alt text, zero illustrated glossary/chart/sort gaps**.
- Native Water Cycle chart/sort render: **5 chart images and 10 sort images decoded in both review and game views**.
- Native Memory Aid and Applied Challenge views: rendered at desktop and mobile viewport sizes with **zero page errors** and **zero model calls**. Student and teacher HTML exports contain both activities and revised science text, without object-string formatting artifacts.
- Water Cycle heuristic audit: **zero flags in either edition**, reading estimate 5.5 (a rough readability formula, not validated grade placement).
- Exact cumulative content/provenance audit: passed, with **no source-only resources remaining**.

The activity harness uses an intercepted test origin so native local/session storage can work; its initial about:blank attempt failed because storage was unavailable. This was corrected in the harness. Screenshots and exports are in `scratch/water-cycle-completion/`; screenshots were captured but not visually inspected in this pass because the image-view filesystem helper failed. Programmatic view checks do not certify visual layout, keyboard interaction, full quiz gameplay, or signed-in community-library behavior.

## Reproduce

```text
node dev-tools/verify_allopack_refinements_20260919.cjs
node dev-tools/qa_water_cycle_completion.cjs
node dev-tools/qa_allopack_resource_images.cjs water_cycle_grade6
node dev-tools/qa_allopack_imports.cjs 2026-09-19
npx vitest run tests/allopack_water_cycle_completion.test.js tests/allopack_edition_consistency.test.js tests/allopack_flagship.test.js tests/allopack_catalog.test.js tests/allopack_illustrated.test.js tests/allopack_answer_integrity.test.js --no-isolate --maxWorkers=1 --testTimeout=60000
```

Next useful work is a visual and keyboard review in the complete app, followed by the signed-in community-library smoke test after publication. Other original editions can still differ pedagogically from their illustrated revisions; the new structural check prevents missing resources but does not prove semantic agreement across every field.
