# Matter and Plant Needs illustrated editions

Completed September 7, 2026.

| Pack | Images | Glossary | Lesson panels | Resources | File size |
|---|---:|---:|---:|---:|---:|
| States of Matter | 24 | 11 | 13 | 14 | about 0.52 MB |
| What Plants Need | 24 | 10 | 14 | 14 | about 1.15 MB |

Files: allopacks/illustrated/states_of_matter_grade4.allopack.json and allopacks/illustrated/plant_needs_grade3.allopack.json.

Both preserve the original resource IDs and activity types. Four native image resources are added to each. Images are embedded WebP data with image-specific alt text, vision provenance, matching native hashes, and editable captions and labels. Generated source PNGs and exact prompts are retained under allopacks/media/. Six appropriate images reuse previously reviewed artwork. One initial particle image was rejected and replaced because its magnification model could mislead.

Science refinements include arrangement and movement rather than speed alone; energy transfer during phase changes; closed-system mass comparisons; invisible vapor versus visible droplets; oxygen and suitable temperatures during germination; stored seed food; nutrients and space; and photosynthesis versus respiration. Readings, quizzes, memory aids, charts, frames, and investigations are aligned. Fair-test examples now control competing conditions and avoid treating predictions as guaranteed results.

Content references:
- [American Chemical Society: Melting](https://www.acs.org/middleschoolchemistry/lessonplans/chapter2/lesson5.html)
- [American Chemical Society: Conservation of mass](https://www.acs.org/education/resources/k-8/inquiryinaction/fifth-grade/chapter-4/conservation-of-mass.html)
- [University of Minnesota: Seed physiology](https://open.lib.umn.edu/horticulture/chapter/9-2-seed-physiology/)
- [University of Minnesota: Seedling issues](https://blog-fruit-vegetable-ipm.extension.umn.edu/2020/04/troubleshooting-seedling-issues.html)
- [University of Minnesota: Soybean germination](https://blog-nwcrops.extension.umn.edu/2023/05/its-magic-neat-process-of-soybean.html)

## Verification

311 focused tests passed across five files: 12 new matter/plant checks and 299 existing illustrated-pack/catalog checks. The first new-suite run needed its React harness initialization corrected; the final new-suite rerun passed all 12.

Each pack passed the actual CommunityCatalog load and Download JSON actions using local catalog responses, the production loadProjectFromJson bridge and MiscHandlers loader, offline reopen, preservation of resource values, decoding of all 24 images, and native VisualPanelGrid alt attributes. Mobile checks confirm every supplied label stays within its panel bounds. Desktop and mobile screenshots were generated and mobile previews visually inspected.

Reports: scratch/states_of_matter_grade4-qa/report.json and scratch/plant_needs_grade3-qa/report.json. Screenshots and downloaded round-trip files are in those same folders.

Scope: component integration using production code; not a full signed-in teacher session, teacher-edited Save Project test, or live deployment. AI visual/content review is complete; educator review remains pending. No catalog publication, commit, or push was performed.

## Rebuild and publication

Run dev-tools/build_matter_plant_illustrated.cjs with either pack slug, followed by dev-tools/qa_matter_plant_illustrated.cjs with that slug. Focused tests are in tests/allopack_matter_plant_illustrated.test.js.

For live publication, follow docs/CLAUDE_HANDOFF_ILLUSTRATED_ALLOPACK_PUBLISH.md. Add only the intended illustrated editions through the published-pack manifest used by catalog/generate_index.js. Preserve CC-BY-4.0 and the source-author/AI-edition provenance. Do not use the bulk text-pack catalog apply script to publish unrelated packs.

