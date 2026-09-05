# AlloPack quality pass and enrichment, September 5, 2026

Claude. Scope: every pack in `allopacks/` (21 at the start, 24 at the end). Nothing in this pass changes `catalog/index.json`; publication of the text-only packs is a separate decision (see "Catalog" below).

## What was checked

1. **Automated structure.** `tests/allopack_catalog.test.js` runs the same shape checks on every pack file (envelope, unique ids, registered types, student-safe types, directions normalizer, per-type shapes, privacy scan, size, no embedded images, Agent Core contract). Baseline: 128 checks green across 21 packs. Final: 146 checks green across 24 packs, plus 9 illustrated-pack checks and 27 contract checks (182 total).
2. **Structural audit the suite does not make.** New read-only tool `dev-tools/audit_allopacks.cjs`: Flesch-Kincaid grade of the reading versus the stated band, word count, quiz answer-position spread, option-length tells (correct answer far longer or shorter than its distractors), glossary terms bolded on first use in the reading, definitions that echo the term, concept-sort balance, objective references, standards gloss, shot-list presence.
3. **Close factual read of all 21 original packs.** Each pack was dumped to text and read in full (reading, glossary, sort, quiz, frames, FAQ, charts, timelines, math problems).

## Findings and fixes (86 targeted edits across 17 packs, all in `scratch/allopack-audit-2026-09-05/apply_pack_fixes.cjs`)

Content quality was high throughout: readings are warm and accurate, distractors encode real misconceptions, FAQs answer questions kids ask, and standards are glossed honestly (Simple Machines even notes that NGSS has no dedicated expectation). The fixes were precise rather than structural:

- **Science accuracy.** Photosynthesis timeline step 5 implied the released oxygen is "left over" atoms; it now says water is split and its oxygen released. Water Cycle corrections from the earlier session (cooling instead of "air holds vapor", ice crystals in clouds, ocean balance, rain salinity) carried into the illustrated build. Magnetism's sort card "stainless steel fork (varies by type)" was a genuinely ambiguous sort item and became "a steel screwdriver tip". Plant Needs' sort card "soil to hold its roots" contradicted its own FAQ about soil-free growing and became "space for its roots to spread". Weather vs Climate's definition of average as "a middle value" (that is the median) became "a typical value".
- **Internal consistency.** Ecosystems' directions opened with an unexplained 1958 event while the reading tells the Yellowstone wolf story; the hook now matches. The American Revolution quiz misquoted the reading; it now paraphrases. The Constitution reading's "windows nailed shut" became "kept shut". Proportional Relationships listed the glossary term Origin twice; the duplicate became Predict, and a FAQ that asked about proportionality "going down" but answered about constants below 1 was reworded to match.
- **Test-wiseness.** 24 multiple-choice items had a correct answer noticeably longer than every distractor. Each distractor was lengthened with misconception content (never padding), and the Ratios item's distractors became two-digit ratios so the equivalent one is no longer the only long option. Every `correctAnswer` still matches an option byte for byte, and the audit reports zero length tells.
- **Glossary coverage.** Weather vs Climate's reading now introduces temperature, precipitation, forecast, atmosphere, region, average, trend and pattern in bold on first use.

Remaining audit flags are heuristics, not defects: Linear Equations reads below grade 8 on Flesch-Kincaid (deliberately accessible), Fractions' reading is 278 words, and a few directions bodies name fewer than half the resources by title.

## Enrichment: the two newest resource types in every pack

The app gained Memory Aid Studio (`memory-aid`) and Applied Challenge Studio (`applied-challenge`) on August 28, and no pack used them. Their pack shapes were derived from the studios' own normalizers (`normalizeMemoryAidData`, `normalizeAppliedChallengeData`), verified by loading a probe pack through the deployed app and opening both views, then documented.

- **Every pack now carries one Memory Aid** (2-3 cards, three different aid types per pack, facts quoted from the pack's own reading, `factLocked` and `factVerified` so the studio shows "0 items to review") **and one Applied Challenge** (a brief with a real audience, locked lesson facts, open questions, criteria that require the pack's vocabulary, and a finishable deliverable; families spread across investigate, design, decide, propose and explore; grade 3-4 briefs use compact scope). Ecosystems, which had no FAQ, gained one. Directions gained a numbered step for each new resource.
- Authored content lives in `scratch/allopack-audit-2026-09-05/new_resources_batch1-5.json` and `water_cycle_new_resources.json`; `merge_new_resources.cjs` inserts them idempotently (memory aid after the anchor chart, challenge last).
- `tests/allopack_catalog.test.js` now registers both types and checks their shapes (schema version, card count and fields, aid types, verified facts, challenge family and brief fields, resolvable `lessonRef`).
- `docs/ALLOPACK_FORMAT_SPEC.md` and `docs/ALLOPACK_AUTHORING_PROMPT.md` now document anchor-chart, note-taking, timeline, outline, math, memory-aid and applied-challenge so an outside author (or ChatGPT) can produce them.

Verified in the deployed app with the local pack routed in: Water Cycle probe, Plant Needs (grade 3) and Moon Phases all load; Memory Aid Studio and Applied Challenge Studio render the authored cards and briefs with the expected chips and "Ready to share, 0 items to review"; no page errors.

## Three new text-only packs (images can be added later)

| Pack | Grade | Standards | Resources |
| --- | --- | --- | --- |
| Moon Phases and Eclipses | 6 | NGSS MS-ESS1-1; RST.6-8.7 | directions, reading, glossary, anchor chart, memory aid, sort, quiz, frames, FAQ, design challenge |
| Forces and Motion | 3 | NGSS 3-PS2-1, 3-PS2-2; RI.3.3 | directions, reading, glossary, anchor chart, memory aid, sort, quiz, FAQ, investigation |
| Point of View | 4 | RL.4.6, RL.4.3, W.4.3 | directions, reading, glossary, anchor chart, memory aid, sort, quiz, frames, FAQ, design challenge |

Each has an `.IMAGES.md` shot list written to the text-free policy from the Water Cycle pilot (no raster text, native labels with anchor coordinates, alt reviewed against the rendered image, "not to scale" stated in captions), so a later ChatGPT or in-app pass can build an illustrated edition without touching the text pack. All three pass the shape suite and the audit with no length tells or position skew.

## Catalog

`catalog/index.json` is unchanged. The 24 text-only packs are ready for the seed plan's manual smoke checks (2-7). `node dev-tools/build_allopack_catalog_entries.cjs` prints the manifest entries for every pack not yet listed, and only `--apply` writes them; because raw main is the live catalog and other sessions deploy from this tree, adding entries is a publication act that should be a deliberate decision.

## Files

- Packs: `allopacks/*.allopack.json` (21 edited, 3 new), `allopacks/{moon_phases_grade6,forces_motion_grade3,point_of_view_grade4}.IMAGES.md`
- Tools: `dev-tools/audit_allopacks.cjs`, `dev-tools/build_allopack_catalog_entries.cjs`
- Tests: `tests/allopack_catalog.test.js`
- Docs: `docs/ALLOPACK_FORMAT_SPEC.md`, `docs/ALLOPACK_AUTHORING_PROMPT.md`, `docs/COMMUNITY_CATALOG_SEED_PLAN.md`
- Working files (not for the repo): `scratch/allopack-audit-2026-09-05/`
