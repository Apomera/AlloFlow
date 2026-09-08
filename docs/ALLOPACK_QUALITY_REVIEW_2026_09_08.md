# AlloPack quality review — September 8, 2026

> Artwork follow-up completed later on September 8: all 27 previously pending concept-sort images are now embedded. The earlier pending counts below are historical. See [completed image repair](ALLOPACK_NATIVE_RESOURCE_IMAGE_REPAIR.md).

Reviewed the 45 existing text-only AlloPacks and six illustrated editions; created five additional text-only packs. The collection now has **50 text-only packs plus six illustrated editions**, containing 595 resources across 56 files.

## Five new packs

| Pack | Grade | Resources | Future image slots |
|---|---|---:|---:|
| [Feel the Buzz — Sound and Vibration](../allopacks/sound_vibration_grade1.allopack.json) | 1 | 10 | 25 |
| [Who Lives Here? — Comparing Habitats](../allopacks/habitats_diversity_grade2.allopack.json) | 2 | 10 | 25 |
| [Break, Move, Settle — Changing Land](../allopacks/weathering_erosion_grade4.allopack.json) | 4 | 10 | 25 |
| [Same Digits, Different Values — Decimals](../allopacks/decimal_place_value_grade5.allopack.json) | 5 | 10 | 26 |
| [Likely Is Not Certain — Probability Models](../allopacks/probability_models_grade7.allopack.json) | 7 | 10 | 25 |

Each contains directions, reading, glossary, anchor chart, concept sort, sentence frames, quiz, memory aid, FAQ, and applied challenge. Each quiz has five multiple-choice and two short-answer questions. Metadata identifies an AI-assisted draft with educator review pending.

The adjacent `.IMAGES.md` files and `allopacks/authoring/*.images.json` provide 126 planned slots in total. These cover every glossary term, every native anchor-chart section, every native concept-sort card, and eight additional lesson panels per pack. No images were generated. Future artwork must be text-free; labels stay editable in the app. Mathematical diagrams require exact quantities and matching whole units. Alt text and image hashes must be supplied after reviewing the actual artwork; no fabricated alt provenance was added.

Authoring sources live in `allopacks/authoring/<slug>.json`. Rebuild from the repository root with `node dev-tools/build_five_text_allopacks.cjs`.

## Checks and corrections

- Checked all pack envelopes, registered resource shapes, objective references, identifier uniqueness, quiz answer integrity, image metadata, and catalog contracts using the AlloPack test suites.
- Ran the heuristic content audit over all 56 files: reading-level estimates, definition repetition, glossary coverage, answer-position distribution, answer-length clues, category balance, directions coverage, and citation-shaped claims.
- Reviewed the new science readings, sorting classifications, investigations, and answer keys. Habitat comparisons distinguish kinds from counts and limit claims from short observations. Sound distinguishes loudness from pitch. Weathering, erosion, and deposition distinguish changing in place, moving, and settling.
- Reviewed the new numerical examples. Corrected the decimal worked example: 3.407 has zero hundredths, compared with seven hundredths in 3.470. Added a numerical check for all decimal sort assignments. Probability distinguishes equally likely counters from unequal color probabilities, replacement from removal, and model probability from observed frequency.
- Simplified illustrated materials, forces, plant, and matter explanations and memory cues. Retained important qualifications about balanced forces, seed food stores, plant oxygen needs, material comparisons, and model limits. Balanced two sets of quiz distractor lengths and added lesson-panel titles to directions.
- Preserved changes in the illustrated builders through `dev-tools/refine_illustrated_quality.cjs`.
- Updated two legacy flagship test assumptions: the registered resource list and the existing guarded translation code assertion.

The 50 text-only packs have **zero heuristic flags**. Four illustrated editions retain a `no imageShotList companion` notice: forces, materials, plant needs, and states of matter. Their reviewed artwork manifests exist under `allopacks/media/<slug>/manifest.json`; the notice reflects a metadata convention difference, not evidence that their existing artwork is absent. It does not waive the outstanding native sort artwork below.

## Verification evidence

- **600 tests passed across 12 AlloPack/catalog test files.**
- Production JSON bridge, `MiscHandlers`, and history hydration successfully imported **all 56 files / 595 resources offline**, preserving every original resource field. Reproduce with `node dev-tools/qa_allopack_imports.cjs`.
- [Text-pack audit](allopack-quality-2026-09-08/text-audit.json)
- [Illustrated audit](allopack-quality-2026-09-08/illustrated-audit.json)
- [Import results](allopack-quality-2026-09-08/imports.json)

This is a structural, heuristic, and targeted editorial review, not independent subject-expert certification of every statement in all 45 older packs. Readability estimates are screening tools, not proof of suitability for every learner. The import harness uses production loading code with state callbacks; it is not a full signed-in UI or live community-library publication test. Existing component tests exercise illustrated content. No new whole-app visual review or live publication occurred in this pass.

## Existing illustrated artwork still to finish

| Illustrated edition | Anchor sections filled | Sort cards filled | Sort images pending |
|---|---:|---:|---:|
| Forces and motion | 4 | 10 | 0 |
| Materials | 4 | 3 | 6 |
| Plant needs | 5 | 6 | 4 |
| States of matter | 5 | 5 | 4 |
| Water cycle | 5 | 6 | 4 |
| Weather versus climate | 4 | 1 | 9 |
| Total | 27 | 31 | 27 |

See [native resource image repair handoff](ALLOPACK_NATIVE_RESOURCE_IMAGE_REPAIR.md) for exact remaining targets and prompts. All 27 anchor sections already have images; 27 of 58 sort cards still need artwork. The current native views do not consistently expose the stored descriptive alt fields: anchors and teacher sorting use decorative image treatment, and the sorting game uses the card text. Stored image descriptions should not be described as fully wired screen-reader support.

## Standards references used for the new drafts

The sources establish intended learning targets, not third-party certification of these lessons:

- [NGSS 1-PS4: sound and vibration](https://www.nextgenscience.org/dci-arrangement/1-ps4-waves-and-their-applications-technologies-information-transfer)
- [NGSS 2-LS4-1: comparing diversity in habitats](https://www.nextgenscience.org/pe/2-ls4-1-biological-evolution-unity-and-diversity)
- [NGSS Grade 4 Earth systems](https://www.nextgenscience.org/topic-arrangement/4earths-systems-processes-shape-earth)
- [CCSS Grade 5 number and operations in base ten](https://www.thecorestandards.org/Math/Content/5/NBT/)
- [CCSS 7.SP.C.5: probability interpretation](https://www.thecorestandards.org/Math/Content/7/SP/C/5/)
- [CCSS 7.SP.C.7: probability models](https://www.thecorestandards.org/Math/Content/7/SP/C/7/)

All five new files are local drafts ready to import for educator review. They have not been published to the live community library.
