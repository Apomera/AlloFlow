# Materials Grade 2 illustrated edition

Completed September 7, 2026. Why Windows Are Not Wool: Matching Materials to Jobs.

The illustrated edition contains 24 distinct embedded images: 10 glossary pictures and 14 lesson panels. It preserves all nine original resource IDs and types, adds four native image resources, and is about 0.67 MB. Every image has visually reviewed alt text, vision provenance, and a matching native hash. Fourteen captions and nine labels remain editable in AlloFlow. Generated artwork contains no text, numerals, logos, or watermarks.

Output: allopacks/illustrated/materials_grade2.allopack.json. Exact prompts, original PNGs, optimized WebP files, and mapping manifests: allopacks/media/materials_grade2/.

## Accuracy refinements

Reading, glossary, chart, memory aids, sorting, quiz, FAQ, and investigation now distinguish hardness from flexibility and resistance to breaking; bending from stretching; surface texture from transparency; and reuse from recycling. Wool can vary in feel, coatings can change water behavior, and objects may combine materials. The early-plastics statement now places their development in the 1800s.

The spill activity compares water behavior using equal-size dry samples, equal measured water amounts, equal waiting times, and repeated fresh samples. It records water on the surface, damp fibers, and water reaching the tray. It does not rank absorption by wet-patch size or claim that a single water bead proves waterproof performance. Where samples differ in thickness or layers, students describe those limitations. Illustrations model possible observations, not measured experimental results.

Primary references used for the review:

- [NGSS: Grade 2 structure and properties of matter](https://www.nextgenscience.org/topic-arrangement/2structure-and-properties-matter)
- [ACS: Second grade properties investigations](https://www.acs.org/education/resources/k-8/inquiryinaction/second-grade.html)
- [Science History Institute: History of plastics](https://www.sciencehistory.org/education/classroom-activities/role-playing-games/case-of-plastics/history-and-future-of-plastics/)

## Verification

323 focused tests passed across seven illustrated-pack and catalog suites. The new six-test suite covers native descriptions and hashes, unique embedded assets, preserved resources and editable fields, artifact-contract validation, round-trip integrity, stale/decorative alt handling, and science/quiz consistency.

The production-component harness verifies CommunityCatalog load and actual Download JSON actions using local catalog responses, the production loadProjectFromJson bridge and MiscHandlers loader, offline reopen, preservation of resource values, decoding all 24 images, all 14 native panel alt attributes, and mobile bounds for all nine labels. A mobile preview prompted shorter labels and an additional overlap assertion.

Reports, screenshots, and the downloaded round-trip file: scratch/materials_grade2-qa/. These checks use production components with local responses; they are not a live deployment, a full signed-in teacher session, or a teacher-edited Save Project test. AI visual/content review is complete; educator review remains pending.

## Rebuild and publication

Run node dev-tools/build_materials_illustrated.cjs, node dev-tools/qa_materials_illustrated.cjs, and the focused suite tests/allopack_materials_illustrated.test.js. Lesson corrections are implemented in dev-tools/refine_materials_content.cjs.

Follow docs/CLAUDE_HANDOFF_ILLUSTRATED_ALLOPACK_PUBLISH.md for live publication. Add only the intended illustrated edition through the published-pack manifest used by catalog/generate_index.js, preserving source authorship and CC-BY-4.0 metadata. No catalog publication, commit, or push was performed in this task.

Final verification after label shortening: all six Materials tests passed again; the production-component harness passed again, including the new mobile label-overlap assertion.
