# AlloPack refinement results — 2026-09-19

> Water Cycle follow-up completed: [completion and edition-consistency results](WATER-CYCLE-COMPLETION.md). The missing activities noted below are now integrated locally.

The remaining local formatting, generation, and content-refinement priorities from the initial audit are implemented. All 105 pack files import successfully through the production offline bridge. Image content and descriptions were preserved. Nothing was committed, published, or deployed.

## Completed work

- **Generation completeness:** provider output must match the normalized requested resource types, count, and order, including automatic reading companions. Invalid plan entries fail before provider work.
- **Native formatting:** unknown quiz types are rejected; renderer-facing fields for seven additional native quiz types and Cornell notes receive nested validation. Base64 image bytes no longer trigger the text privacy heuristic. The text-only service still rejects embedded images independently.
- **Outline activity selection:** restored missing `structureType` fields that older illustration refiners dropped while replacing outline data. All 25 outline resources now have their native activity selector.
- **Content clarity:** simplified the flagged reading, glossary, FAQ, and memory-support language; added selective vocabulary emphasis; removed stale hand-maintained word counts; revised quiz distractors and answer positions while retaining answer integrity. The original Argument & Evidence resources now agree with the corrected illustrated lesson about facts, claims, evidence, and reasoning.
- **Specific supports:** five newer lessons now have lesson-specific sentence frames and transfer examples in both editions and their authoring inputs.
- **Review provenance:** the five-pack builder requires a sourced, dated review tied to the exact fact array before marking it verified. Removed unsupported automatic flags from explicitly pending drafts. Preserved 33 exact-match inherited review attributions with source path, resource ID, source author statement, and fact hash. Inherited attribution is not a new human review. Revised wording remains marked for educator review.
- **Catalog identity:** Crew Repair and Crew Teamwork now use `crepair-` and `cteam-` prefixes, resolving collisions with Chemical Reactions and Constitution. Internal references and image plans were updated; the existing cross-catalog uniqueness tests pass.
- **Auditable editions:** reconciled 2,261 cumulative source-to-illustrated change records across all 43 illustrated editions. These include earlier illustration-era edits, not just this pass. Large structural text comparisons explicitly strip artwork while separate image/hash tests retain image coverage. The dated migration and audit utilities are repeatable.

The migration log includes 101 changed pack files; many received only metadata or review-state maintenance, rather than a full prose rewrite. Exact change records also update illustrated-edition audit metadata.

## Results

| Check | Result |
| --- | --- |
| Original / illustrated editions | 62 / 43 |
| Production offline imports | 105 files, 1,245 resources passed |
| Embedded image placements | 1,404; no missing alt text |
| Illustrated glossary/chart/sort image gaps | None |
| Automated content-review flags | 88 before → 1 after |
| Exact content audit and inherited-review checks | Passed |
| Agent-core source/public mirrors | All four matched |
| Catalog entries | 43; entries unchanged |

The remaining heuristic flag is Cell Structure's single animal-model sort item. The 3 plant / 1 animal / 6 shared distribution is intentional, and directions now explain why the groups need not be equal and ask learners to justify shared structures.

Reading estimates improved from 3.9 to 0.3 for Word Families, 4.3 to 2.2 for Story Retell, 9.0 to 4.1 for Figurative Language, and 10.1 to 5.8 for Plate Tectonics. These are rough formula outputs, not validated grade placement or proof of instructional quality.

The full 57-file catalog/generation/export test run passed 1,146 tests and exposed one stale Energy audit-count assertion. After correcting that assertion and adding four malformed-fact cases, the focused two-file rerun passed all 11 tests. This verifies 1,151 distinct cases across the final run and rerun. Earlier worker-startup timeouts on the busy Windows host were avoided by reusing a worker with `--no-isolate`; the final full run used the normal jsdom setup. Source-preservation, scientific-model, image/hash, and native-label assertions remain in place.

## Scope and remaining review

- **Educator review:** wording changes are AI-assisted. Original editions outside the explicit reconciliation retain their older content. Neither the heuristic audit nor inherited author attribution establishes factual or standards clearance for every lesson.
- **Water Cycle pilot:** its illustrated edition predates two additions in the text-only source: `wc-memory` and `wc-challenge`. This difference is now recorded explicitly in its content-audit metadata. Those resources need a science pass before being ported: some existing wording conflates infiltrated soil water with groundwater. They were not copied into the pilot or represented as newly verified.
- **Visual and live checks:** this pass verifies existing image bytes, hashes, alt presence, and imports, but does not re-inspect every picture or exercise the signed-in live community library. No new images were generated. Local changes will not reach live downloads until committed and published through the normal workflow.
- **MCP scope:** the text-draft endpoint is still not a lossless editor for existing illustrated packs. Its supported-type and size restrictions remain intentional. A separate catalog-editing contract would be additional work; the current HTML-export endpoint still requires `items`, not the AlloPack `history` envelope.

Selected scientific distinctions were checked against primary sources: [NHLBI heart rhythm](https://www.nhlbi.nih.gov/health/heart/heart-beats), [USGS plate tectonics](https://pubs.usgs.gov/gip/dynamic/understanding.html), [ACS reaction evidence](https://www.acs.org/middleschoolchemistry/lessonplans/chapter6/lesson1.html), [NASA photosynthesis and light](https://astrobiology.nasa.gov/news/the-full-palette-of-photosynthesis/), and [UC Berkeley natural selection](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/natural-selection/). These checks support the specified revisions and do not constitute a complete source review of all packs.

## Reproduce

```text
node dev-tools/verify_allopack_refinements_20260919.cjs
node dev-tools/qa_allopack_imports.cjs 2026-09-19
node dev-tools/audit_allopack_image_coverage.cjs 2026-09-19
node dev-tools/audit_allopacks.cjs --json
node dev-tools/check_agent_core_mirrors.cjs
npx vitest run tests/allopack tests/agent_core_resource_pack_service.test.js tests/export_quiz_html_worksheet_parity.test.js --no-isolate --maxWorkers=1 --testTimeout=60000
```

See [machine-readable validation](refinement-validation.json), [migration changes](refinement-changes.json), and [after-audit results](quality-audit-after-refinement.json). The original audit remains preserved in `quality-audit.json` and the initial README.
