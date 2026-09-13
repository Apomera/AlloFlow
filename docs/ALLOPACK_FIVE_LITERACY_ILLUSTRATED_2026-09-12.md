# Five literacy AlloPacks — illustrated editions

Completed locally on 2026-09-12. Original text-only packs are preserved. These are educator-review drafts; no live publication, commit or push.

## Files and coverage

| Illustrated pack | Resources | Image placements | Audited text refinements | Native lesson labels |
| --- | ---: | ---: | ---: | ---: |
| [Word Families, Grade 1](../allopacks/illustrated/word_families_grade1.allopack.json) | 13 | 31 | 31 | 10 |
| [Story Retelling, Grade 2](../allopacks/illustrated/story_retell_grade2.allopack.json) | 14 | 30 | 50 | 0 |
| [Context Clues, Grade 3](../allopacks/illustrated/context_clues_grade3.allopack.json) | 14 | 31 | 32 | 9 |
| [Main Idea, Grade 4](../allopacks/illustrated/main_idea_grade4.allopack.json) | 14 | 30 | 23 | 6 |
| [Point of View, Grade 4](../allopacks/illustrated/point_of_view_grade4.allopack.json) | 14 | 32 | 38 | 0 |
| Total | 69 | 154 | 174 | 25 |

All 50 glossary entries, 21 anchor sections, 43 concept-sort cards and 40 lesson panels have embedded images. Ten selected generated illustrations and 81 SVG diagram designs are reused where appropriate; 154 placements does not mean 154 unique paintings. Each pack is below the two-million-character import limit.

Artwork styles vary by topic: felt applique for word families; gouache and paper collage for the puppy story; cut-paper and pastel for context clues; woodcut and watercolor for food-crop contexts; linocut and colored pencil for the puddle narrative. The few people shown are stylized story characters. The puddle scene was edited to match Maya’s concerned expression, and the first-person view was edited to use the same purple lace-up shoes.

Raster artwork is text-free. Twenty-five native labels supply key letter, word-part and main-idea examples without baking text into images. These labels remain editable in the app. Other schematic marks illustrate organization and require the accompanying text; pictures do not replace decoding or evidence from narration.

## Content corrections

- Word Families: distinguishes consonant blends such as st from digraphs sh/ch; clarifies speech sounds versus written letters, vowel placement and rhyming across spelling patterns. The flip-book example now meets its own five-word and blend criteria. Reading is not framed as guessing from pictures or automatically learning six new words.
- Story Retelling: frames beginning/middle/end as a useful organizer rather than a universal problem-solution formula. But is a possible clue, not a guaranteed transition. A supplied bike-story context makes sort classifications meaningful. The puppy ending is an invented story, not a pet-training claim.
- Context Clues: distinguishes examples of a category from inference based on a result; the challenge now uses citrus examples. Clarifies meaningful affixes versus arbitrary letter removal, dictionary checking, signal-word limits, and names. Drought no longer requires a total absence of rain, and a glacier is described as moving land ice.
- Main Idea: separates topics, main ideas and supporting versus background details; treats the cover-test answer as a draft to check. Replaces the ancient-honey edibility claim and unsourced wingbeat figure with simpler bee facts. Removes the universal one-in-three-bites formulation and uses food-crop examples. An invented library paragraph replaces the medical quiz passage.
- Point of View: checks narration outside dialogue; an isolated I or she is insufficient. Third person may have limited or broad knowledge. First-person narrators may infer or recount explanations of others’ thoughts. Added inner thoughts in retellings are labeled as plausible inventions when the source does not establish them. Pictures of expressions cannot prove feelings or intentions.

Each changed original string field has a before/after audit under `allopacks/media/<slug>/content-refinements.json`.

## Fact-check references

The phonics review used Reading Rockets’ explanations of letter-sound relationships, consonant digraphs and blending. [Phonics in practice](https://www.readingrockets.org/reading-101/reading-101-learning-modules/course-modules/phonics/practice), [alphabetic principle](https://www.readingrockets.org/topics/phonics-and-decoding/articles/alphabetic-principle).

The context-clue definitions were checked against [Drought.gov’s drought basics](https://www.drought.gov/what-is-drought/drought-basics) and the [USGS glacier definition](https://www.usgs.gov/faqs/what-a-glacier?page=1&qt-news_science_products=3).

Food-crop and bee background was checked using [USDA pollinator information](https://www.nal.usda.gov/animal-health-and-welfare/insects-and-pollinators), [USDA’s pollinator facts](https://www.fs.usda.gov/wildflowers/pollinators/documents/PresMemoJune2014/PollinatorFactSheet-PresMemo.pdf), and [Iowa State Extension’s bee facts](https://www.extension.iastate.edu/page/files/documents/May%202021.pdf). These are source checks for lesson facts, not endorsements of the generated pictures or full pedagogical certification.

## Validation and review limits

- [332 tests pass](allopack-quality-2026-09-12/five-literacy-tests.json): 30 targeted checks plus 302 catalog checks. Coverage includes embedded data and hashes, source preservation, audited changes, corrected content, answer keys, categories, editable labels and the production artifact envelope.
- [Production collection imports pass](allopack-quality-2026-09-12/imports.json) for 88 files and 1,051 resources. There are now 38 illustrated editions.
- Local catalog download and offline production-loader reopening preserve all 69 resources. All 154 image placements decode offline, and all 40 lesson-panel alt attributes are present.
- All 21 anchor images and 43 concept-sort images render in native components, including teacher and student sort views. No pending image slots.
- All 25 editable labels stay inside their mobile image boundaries without label-to-label overlap.
- Visual review covered ten selected generated originals, every selected diagram contact sheet, twenty mobile lesson groups and five native-resource mobile views. The corrected bat and shovel also appear in the reviewed native sort views.

Per-pack reports are saved under `docs/allopack-quality-2026-09-12/` as `<slug>-integration.json` and `<slug>-native-resources.json`. Screenshots are under `scratch/<slug>-qa/`, `scratch/resource-backfill-qa/<slug>/`, and `scratch/<slug>-mobile-review.jpg`.

These checks use production components with local catalog responses, not a live signed-in community-library publication session. Harness translations and styling are incomplete. Review grade appropriateness, label choices, accessible phonological supports and textual examples before publication. Small thumbnails support recognition; enlarged lesson panels support instruction.

Every placement stores an image-specific description and matching hash. Existing glossary and lesson views consume descriptions. Anchor and teacher-sort images are currently treated as decorative beside their text; student sort uses card statements as alt. This batch is not a complete screen-reader audit of those renderers.

## Sources and rebuild

Built-in image generation was used, including two targeted edits. Selected source PNGs, original and edit prompts, SVGs, compressed images and placement manifests are copied into `allopacks/media/<slug>/`. See each `source-prompts.json` and `manifest.json` for the exact prompts and provenance. Reopening the packs does not depend on remote image URLs or the generator.

```powershell
node dev-tools/build_five_literacy_illustrated.cjs word_families_grade1 story_retell_grade2 context_clues_grade3 main_idea_grade4 point_of_view_grade4
```

The wrapper assembles images, applies the audited content refiner and adds native labels. The initial planner refuses to overwrite an existing manifest. Diagrams are defined in `dev-tools/five_literacy_diagrams.cjs`; labels are defined in `dev-tools/five_literacy_native_labels.cjs`.

## Remaining text-only packs

Twelve remain after this batch: American Revolution Causes, Ancient Egypt, Argument and Evidence, Central Idea, Constitution, Figurative Language, Local Government, Map Skills, Rules and Fairness, Scarcity and Choice, Theme Development, and Then and Now. Choose the next batch from those original packs; do not overwrite the illustrated editions completed here.
