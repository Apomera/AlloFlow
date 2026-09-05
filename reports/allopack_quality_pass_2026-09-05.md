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

## Second pass (same day): closing every remaining audit flag

The first pass left eight heuristic flags open. All are now closed, and `dev-tools/audit_allopacks.cjs` reports zero flags across all 24 packs.

- **Four circular glossary definitions rewritten.** "Orbit" was defined with "orbits", "Magnet" with "magnetic", "Energy" with "energy", and "Quotation" with "quotation marks". A student who does not know the word learned nothing from those. Each replacement is checked against the term's own stem so it cannot regress.
- **Retention pairing added to two quizzes.** American Revolution and Linear Equations gave every item a unique `conceptLabel`, so no concept was ever tested twice and retention tracking had nothing to pair. Three labels were merged onto existing concepts: the Intolerable Acts item now shares "escalation pattern", and computing slope and modelling a drain now share the labels of the items that introduce those ideas.
- **Every glossary term is now introduced in its own reading.** Central Idea (5 terms), Linear Equations (6), Proportional Relationships (5) and Fractions (4) each had vocabulary that appeared in the glossary and games but never in the text. Thirteen edits weave them in, bolded on first use. Fractions also rose from 278 to 382 words, clearing the 350-word floor, and Linear Equations from 444 to 509, which also lifted its reading level closer to its grade band.

### New check: do the promised games actually work?

The shape suite verifies a game objective points at a glossary; it never asked whether that glossary is *playable*. The audit now mirrors the real eligibility rules from `games_source.jsx`: the crossword grid takes 3 to 15 cells, the scramble needs more than two characters and at least two distinct ones, and both strip spaces so multi-word terms fold together. Answer checking folds the same way, so a student typing "unit rate" still matches.

That surfaced one genuine gap. The Constitution pack offered only a crossword, and "Unconstitutional" is 16 letters, so the grid silently dropped the pack's central civics term and no game ever drilled it. Rather than shorten the vocabulary word for a grid's sake, the pack gained a matching objective, which has no length rule. The check now flags only terms that *no* game can reach, and it was calibrated against a deliberately broken copy to confirm it is not blind.

### Test debt

`tests/allopack_illustrated.test.js` intermittently failed on the 5-second default budget: one case Babel-transforms three JSX tags and server-renders each. It now carries an explicit 30-second timeout, and both suites pass at the default budget (155 checks).
## Third pass (same day): the primary grades, and a crash the pack suite cannot see

Every pack in the catalog was grade 3 or above, so the youngest readers had nothing. Two packs now cover the gap.

| Pack | Grade | Standards | Resources |
| --- | --- | --- | --- |
| Day Sky, Night Sky | 1 | NGSS 1-ESS1-1, 1-ESS1-2; RI.1.1; SL.1.1 | directions, reading, glossary, anchor chart, memory aid, sort, quiz, FAQ, investigation |
| Tell It Back (beginning, middle, end) | 2 | RL.2.5, RL.2.2, SL.2.4 | directions, reading, glossary, anchor chart, memory aid, sort, quiz, frames, FAQ, design challenge |

Both are text-only with an `.IMAGES.md` shot list, like the three from the first pass. Both carry the two newest studio types from the start rather than being retrofitted.

**The audit had to learn what a primary reading is.** Its word-count rule wanted 350-550 words for every pack, which is a fine target for grade 5 and nonsense for grade 1: held to it, an author would have to write text no six-year-old finishes. The target is now 180-230 words when the stated grade band tops out at 2, and unchanged above that. The grade-1 reading lands at 235 words and reads at Flesch-Kincaid 0.6; the grade-2 reading at 224 words and FK 2.0. All 26 packs report zero flags.

Two content notes. Day and night is a topic where the ordinary way of speaking is the misconception — "the sun goes down" — so the reading says plainly that the Sun does not move across the sky and that the reader is the one turning, and the concept sort makes four of its eight cards the guesses children actually make. The grade-2 pack teaches retelling on a story it tells you first (Ada and the puppy) and then makes you sort a different story (Sam and the bike), so the sort tests the structure rather than memory of the reading.

### The bug: one early failure blanked every resource after it

Loading the grade-1 pack into the deployed app and opening its resources in order produced "Component Error" on the anchor chart, the Memory Aid Studio and the Applied Challenge Studio. The pack passed all 152 shape checks and the grade-3 pack loaded in the same session was fine, so the natural conclusion was bad data in the new pack. It was not.

Expanding the app's own error disclosure gave the real cause: the *reading*, opened first, threw `[formatInteractiveText] PhaseNHelpers module not loaded` because the deferred module queue had not drained yet. Everything after that was collateral. `<ErrorBoundary>` around the content viewer had no `key`, so React kept one instance and `hasError` never cleared — every subsequent resource rendered the fallback instead of its content. Worse, the fallback advises the user to try "switching views", which without a key does nothing at all.

The boundary is now keyed by resource id and active view, so switching either remounts it and clears a stale error. A transient module race costs one view instead of the session. Covered by `tests/content_viewer_boundary_key.test.js` across all three shell copies, with the assertion checked against the pre-fix tag to confirm it actually fails there.

This is a host change, so it cannot be seen until the bundle is rebuilt and deployed; the route-inject harness only swaps view modules, not the shell. What *was* verified live: both new packs load into the deployed app with every resource rendering and no page errors, including the crossword-eligible glossary, the sentence frames, and both studios showing "Ready to share, 0 items to review".
## Fourth pass (same day): the resource types the catalog was not using

Counting resource types across the 26 packs turned up two gaps that no single pack review would surface.

**Five packs had no anchor chart** — American Revolution, Fractions on the Number Line, Photosynthesis, Plate Tectonics, and Weather vs. Climate — while the other twenty-one did. Each now has one, and each is built around the move that pack actually teaches rather than being a restatement of the glossary: the escalation cycle (Britain acts, colonists protest, Britain responds harder, more colonists join); reading the top and bottom numbers off a number line, with the 1/8-versus-1/4 trap called out; the three boundary types plus why Wegener was dismissed for lacking a mechanism; and the time-scale question that settles most weather-versus-climate arguments.

Photosynthesis needed care, because that pack already had an inputs-and-outputs concept map, and the obvious anchor chart would have duplicated it. Its chart is instead the four things people get wrong — that a plant eats soil, that leaves are green because chlorophyll uses green light, that plants do not respire, and that oxygen is the point rather than a by-product.

**`outline` was used by exactly one pack out of twenty-six.** That is the type the app renders as a Visual Organizer, with an interactive map and a 3D view, so twenty-five packs were leaving a whole surface unused. Five more now have one, chosen because their content is genuinely hierarchical rather than to raise a count:

| Pack | Concept map | Why this content suits it |
| --- | --- | --- |
| Body Systems | The Handoff Map | six systems, but the lesson is the handoffs between them |
| Simple Machines | Six Machines, Two Families | the six group into the inclined-plane and lever families |
| Figurative Language | Five Ways to Say It Sideways | five devices, grouped by what the sentence does |
| Ecosystems | Where the Energy Goes | producers, consumers, decomposers, and the ten percent rule |
| Cell Structure | The Factory Floor Plan | organelles grouped by the job they do |

The Simple Machines map is the one that adds something the reading does not state: the six machines are grouped into the two families engineers actually use, with the wheel and axle presented as a lever that turns in a full circle and the pulley as a wheel and axle with a rope in its groove. Every pack that gained a resource also gained a numbered directions step naming it, so the audit's "directions body names its resources" check still passes against the higher resource count.

Anchor charts now stand at 26 of 26, and the audit gained a flag for a pack without one, calibrated against a deliberately stripped copy. Concept maps stand at 6 of 26. Verified live: the Cell Structure map renders in the deployed app as a Visual Organizer with its six branches and lettered items, no page errors.
## Files

- Packs: `allopacks/*.allopack.json` (21 edited, 5 new), `allopacks/{moon_phases_grade6,forces_motion_grade3,point_of_view_grade4,day_night_sky_grade1,story_retell_grade2}.IMAGES.md`
- Tools: `dev-tools/audit_allopacks.cjs`, `dev-tools/build_allopack_catalog_entries.cjs`
- Tests: `tests/allopack_catalog.test.js`, `tests/content_viewer_boundary_key.test.js`
- Host fix: `AlloFlowANTI.txt` and its two paired copies (content-viewer boundary key)
- Docs: `docs/ALLOPACK_FORMAT_SPEC.md`, `docs/ALLOPACK_AUTHORING_PROMPT.md`, `docs/COMMUNITY_CATALOG_SEED_PLAN.md`
- Working files (not for the repo): `scratch/allopack-audit-2026-09-05/`
