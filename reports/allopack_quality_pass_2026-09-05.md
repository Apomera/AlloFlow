# AlloPack quality pass and enrichment, September 5, 2026

Claude. Scope: every pack in `allopacks/` (21 at the start, 38 at the end). Nothing in this pass changes `catalog/index.json`; publication of the text-only packs is a separate decision (see "Catalog" below).

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
## Fifth pass (same day): the FAQ was the hardest text in the pack

The audit estimates the reading level of the `simplified` reading and nothing else. Every other thing a student reads went unmeasured. Running the same estimator across the FAQ answers found a pattern that held across the whole catalog: **the FAQ was routinely the hardest prose in the pack**, often two to four grades above the reading it supports. That is backwards. The FAQ is where a student goes when the reading already lost them.

Eight packs were above their own stated grade band. All eight are now within it, edited by splitting long sentences rather than by cutting content — every fact survives, spot-checked afterwards against a list of the specific claims each answer had to keep.

| Pack | Band | FAQ before | FAQ after |
| --- | --- | --- | --- |
| American Revolution | 5 | 9.8 | 4.6 |
| Weather vs. Climate | 5-6 | 8.8 | 5.4 |
| Plate Tectonics | 6 | 8.3 | 6.6 |
| Area and Perimeter | 3-4 | 7.4 | 4.8 |
| Figurative Language | 5 | 7.1 | 6.1 |
| Main Idea | 4-5 | 7.1 | 5.4 |
| Forces and Motion | 3 | 5.3 | 3.3 |
| Day Sky, Night Sky | 1 | 3.4 | 1.3 |

The nuance stayed. The American Revolution FAQ still says that Crispus Attucks became a symbol for the colonial cause while slavery continued in every colony, that Native nations made their own strategic choices and that a colonial victory usually meant more pressure on Native land, and that nobody knows who fired first at Lexington. Those answers are now four to five grades easier to read.

**One half of the check was wrong and was removed.** The first version also measured the directions body, and flagged two packs. Reading them showed the flag was an artifact: a directions body is a numbered checklist of resource titles, and long proper titles like "A Retelling Card for a Reading Buddy" push the score up without making anything harder to read. The check now covers FAQ prose only, with the reason recorded in the source so it does not get re-added.

Quiz stems were considered and deliberately left unmeasured: they are short, which makes the estimate noisy, and a question that quotes a figurative sentence scores high for reasons that have nothing to do with difficulty.
## Sixth pass (same day): the same question asked of every text a student reads

The fifth pass fixed the FAQ. It did not ask whether the FAQ was the only place this had happened. Measuring the remaining student-facing prose the same way answered that: the FAQ was not special, and the worst offender was somewhere else entirely.

| Text | Packs over their own band, before |
| --- | --- |
| Applied-challenge brief | 7 |
| Glossary definitions | 2 |
| Memory-aid examples | 2 |
| Anchor-chart bullets | 0 |
| Concept-map items | 0 |

The **challenge brief** is the one that matters most and was the worst by a distance — up to 9.6 against a grade-7 band. It is also the text with the strongest excuse: a brief has a context, a driving question, open questions, criteria and a deliverable, and that shape pulls writing toward formal, clause-heavy prose. The excuse does not survive contact with the purpose. The brief is what a student must get through *before they can start the task at all*. A student who cannot read it cannot begin.

Twelve flags across ten packs, all now clear, all fixed the same way as the FAQ — splitting long sentences, keeping every requirement:

| Pack | Text | Before | After |
| --- | --- | --- | --- |
| Proportional Relationships | brief | 9.6 | 5.8 |
| American Revolution | memory-aid | 8.4 | 5.9 |
| American Revolution | glossary | 7.4 | 5.0 |
| Figurative Language | glossary | 7.6 | 5.1 |
| Figurative Language | brief | 7.4 | 6.0 |
| Ecosystems | brief | 7.2 | 4.8 |
| Area and Perimeter | brief | 7.1 | 4.8 |
| Point of View | brief | 6.6 | 4.6 |
| Fractions | memory-aid | 6.4 | 3.5 |
| Forces and Motion | brief | 5.3 | 2.8 |
| Day Sky, Night Sky | memory-aid | 4.8 | 1.9 |
| Day Sky, Night Sky | brief | 4.7 | 2.3 |
| Tell It Back | memory-aid | 4.1 | 2.5 |

Nothing was dropped to get there. Proportional Relationships still asks for five data pairs with inputs far apart, an output-over-input column, a verdict that names the break point if there is one, and the constant stated with its units. The Ecosystems brief still asks for confidence ratings on each prediction. Two of the ten flagged packs — Day Sky, Night Sky and Tell It Back — were written earlier the same day, which is the useful part: the check caught new work, not only inherited work.

One edit was reverted on review. Simplifying the Simile definition to "two different things" reads more easily than "two unlike things" and is subtly wrong, because a comparison of two *similar* things is not a simile at all. Precision beat the fraction of a grade level, and the word went back.

The excluded blocks stay excluded, each for a stated reason recorded in the source: the directions body (a checklist of resource titles), anchor-chart bullets and concept-map items (sentence fragments), and quiz stems (too short to estimate, and a stem quoting a figurative sentence scores high for reasons unrelated to difficulty). Both fragment blocks measured clean anyway, which is some evidence the exclusions are not hiding anything.
## Seventh pass (same day): concept sorts, and three checks that were not worth shipping

The audit checks quizzes for surface tells — an answer far longer than its distractors — and checks nothing of the kind for concept sorts, even though a sort is graded the same way. Three ways a sort can be solved without understanding it were probed. Only one turned out to be real, and none of the three produced a gate worth keeping. The four defects below were found by reading the output, not by a rule.

### Probe 1: items listed in category blocks — not a defect, the game shuffles

Three packs list their sort cards grouped by category, so position alone would give the answer. It does not: the student game runs an inline Fisher-Yates over the items before dealing them (`games_source.jsx`, in the effect that sets `currentContainer: 'deck'`). The grouped order is only ever seen in the teacher review panel, which groups by category on purpose. Checking this before "fixing" it saved rewriting three packs to no effect.

### Probe 2: one category's cards systematically longer — real, in two packs

Shuffling does not change card length, so this one survives. Four packs had a mean-length ratio above 1.8 between categories, but ratio alone is the wrong test: in the Constitution sort the two *shortest* cards sit in different categories, so length is not a strategy a student could rely on. Two were genuine, and both are fixed:

- **Cell Structure** ran 4.05. Every "BOTH plant and animal" card was a single organelle name while the animal-only cards were full clauses, so "if it is one word, put it in BOTH" worked on five of the ten cards. Shortening the two animal cards brings it to 1.55.
- **Ratios** ran 2.04 on the back of one card, `4 : 5 (added 2 to each part)`, four times longer than every other card in the sort — and the parenthetical states the misconception, which is to say the card explains its own answer. It is now `4 : 5`. Ratio 1.24.

Simple Machines also carried a self-classifying card: "A flagpole rope running over a wheel at the top" describes a rope running over a wheel, which *is* the definition of a pulley, so the card sorts itself. Now "A flagpole rope".

### Probe 3: cards the pack never teaches — one real defect, but no shippable rule

This found the worst item of the pass. **"Centrioles (used when the cell divides)" appears exactly once in the entire Cell Structure pack: on that card.** Not in the reading, the glossary, the anchor chart, the concept map, the quiz or the FAQ. A student either already knew it or guessed. It is now "No cell wall", which is reasoned straight from the reading's paragraph on why celery snaps and you do not.

The automated version of this check does not work and was not shipped. It flags a card whose content words appear nowhere else in the pack, and it cannot tell an untaught technical term from a deliberately fresh example. It flags every card in the Tell It Back sort — which uses a different story from the reading *on purpose*, so the sort tests story structure rather than memory — and every example sentence in the Figurative Language and Point of View sorts, where fresh examples are the whole point. One true finding against roughly twenty false ones is not a gate.

That is the third check this week to be measured and then dropped, after the directions body and the quiz stems. The pattern is worth naming: a probe that finds a real defect has still earned nothing until its false-positive rate is looked at.
## Eighth pass (same day): what the packs say to each other

Every pass so far reviewed packs one at a time. But 26 packs share one catalog, and a teacher may well use two of them in the same year, so the packs can quietly disagree with each other in a way no single-pack review would ever surface. Twenty-three terms are defined in more than one pack, and reading them side by side found two real conflicts.

Most of the twenty-three are not conflicts and should not be "fixed". Force is simpler in the grade-3 pack than the grade-6 one, which is correct. Function means the job an organelle does in the Cell Structure pack and a rule with one output per input in Linear Equations, which is just English. Oxygen is defined by what cells do with it in Body Systems and by what plants release in Plant Needs; those are complementary halves of one fact.

### Two that were wrong

**Compare, in Point of View.** Defined as "To show how two things are alike" — while that pack's own reading tells students to "compare what each one knows" and to "see the **contrast**". The glossary contradicted the reading three paragraphs away, and it told a student the opposite of the skill the pack teaches, which is noticing what a narrator *cannot* know. It now reads "To look at two things side by side to see how they are alike and how they differ." The Figurative Language definition was scoped rather than changed, since likeness genuinely is what a simile does: "To show how two things are alike, which is the job a simile or a metaphor does."

**Retell, in Point of View.** Defined as "To tell a story again in a new way, such as from a different narrator." The grade-2 pack teaches retelling as a *faithful* recount — same events, right order, your own words — and that is what RL.2.2 asks for. A student who learns it in grade 2 and meets this in grade 4 has the meaning quietly overwritten. It now keeps the base meaning and adds the twist: "To tell a story again. Here you keep the same events but tell them from a different narrator." That also matches the pack's own challenge criteria, which require every event of the original scene to stay the same.

### The tool

`dev-tools/report_shared_glossary_terms.cjs` prints every shared term with its definitions side by side. It is deliberately **not** part of the audit and has no pass or fail: most differences are correct, and only a human reading them can separate grade-appropriate scoping from a contradiction. Making it a gate would have meant either twenty-one false alarms or a threshold tuned until it caught nothing.
## Ninth pass (same day): an id collision I introduced

The shape suite checks that resource ids are unique *within* a pack. Nothing checked them across the catalog. `day_night_sky_grade1` was authored earlier the same day with the `sk-` prefix, for sky, while `simple_machines_grade5` already owned it. All nine resource ids collided, plus two objective ids.

**The honest scope of this: it was not a live bug.** The host defends itself twice over. Load Project *replaces* the history rather than merging it, so two packs are never in one session by that route, and `normalizeArtifactInstanceIds` assigns every item a distinct instance id on load using a `used` set, so even duplicates within a single loaded file are separated. Checking that before writing this up kept a hygiene fix from being reported as a defect.

It is still worth removing. The packs are a public catalog, an id is the thing a `resourceRef` and a `lessonRef` resolve against, and a prefix collision is invisible to every other check. The grade-1 pack now uses `dn-` throughout, including its concept-sort categories, its memory-aid card ids and its shot-list image slots, so a future author does not find a pack with two prefixes in it.

`tests/allopack_id_uniqueness.test.js` now holds three properties across the whole catalog: no shared resource ids, no shared objective ids, and one prefix per pack owned by that pack alone. It was calibrated by reintroducing the exact collision and confirming two of the three assertions fail, then restoring. The renamed pack was re-checked live in the deployed app, since every internal reference had moved.
## Tenth pass (same day): every pack, loaded for real

Nine passes of review had verified five packs in the deployed app and reasoned about the other twenty-one. The vitest suite validates shapes against the renderers' contracts, which is not the same as the app accepting the file — the illustrated pilot passed every shape check in July and was still rejected by the Agent Core depth limit. So the last thing worth doing was the dull one: load all of them.

`dev-tools/smoke_allopacks_live.mjs` route-injects each pack over the catalog entry, drives the real launch flow, clicks Load in AlloFlow, and checks four things: no failure toast, a history count equal to the file's, every resource title present in the history list, and no page errors or error boundary. **26 of 26 packs load clean**, from the 9-resource grade-1 pack to the 12-resource Photosynthesis pack.

An opt-in `--deep` mode also opens every resource in turn and checks it renders more than a blank panel. That is QA step 2 of the seed plan in full, and the most expensive manual item on it.

### The first run said 25 of 26 packs were broken. None of them were.

The first attempt reused one Playwright browser context across the loop. AlloFlow keeps the chosen role and the wizard-dismissed flag in localStorage, so from the second pack onward the app skipped the launch pad entirely: "Full Platform" and "Teacher" were not on the page, and every click in the navigation sequence timed out. Twenty-five `locator.click: Timeout` failures, in a loop over content, reading exactly like twenty-five broken packs.

That was checked rather than guessed: drive the onboarding on one page, close it, open a second page in the same context, and read back `{ full: false, teacher: false, keys: 42 }` — forty-two localStorage keys carried over and the launch pad gone. A fresh context per pack, with the route handlers inside the loop and tolerant onboarding clicks, passes all twenty-six.

The general shape is worth keeping: **a harness failure that impersonates the thing under test**. A timeout inside a content loop looks like a content defect, and the report would have been the exact opposite of the truth. The reason is now a comment in the script and a note in the seed plan, because the next person to touch it will be tempted to hoist the context out of the loop for speed.

### What this does and does not settle for publishing

Steps 2 and the load half of step 3 of the seed plan are now automated and green, and step 9 (reading level within the stated band) is covered by the audit. Steps 4 through 7 still need a human: playing a word game to a win and watching the goal tick, the Spanish translation pass, in-app image generation against the shot lists, and the send-home round trip. `catalog/index.json` remains unchanged at two entries.
## Eleventh pass (same day): three new packs, chosen by where the catalog was thinnest

Counting the catalog by subject and grade rather than by pack decided what to write. Science had fourteen packs; Social Studies had two, both upper grades; Math had five, none below grade 3.

| Pack | Grade | Subject | Standards | Why this one |
| --- | --- | --- | --- | --- |
| Ten Is a Bundle | 2 | Math | 2.NBT.A.1, A.3, A.4, B.5 | first math pack below grade 3; also uses `math`, a type only 5 of 26 packs had |
| Reading a Map | 3 | Social Studies | C3 D2.Geo.1 and D2.Geo.2, RI.3.7 | first elementary social studies pack in the catalog |
| Why Cities Grew on the Nile | 6 | Social Studies | C3 D2.His.14, D2.Geo.5, D2.His.10, RH.6-8.2 | first world history pack; middle-grade social studies was empty |

Each was written against every gate the previous ten passes built, so they arrived already carrying an anchor chart, a memory aid and an applied challenge, with prose held to the grade band. All three load clean in the deployed app.

**Each has an argument rather than a topic.** Place Value turns on the fact that the same digit is worth three different things depending where it stands, and that a zero is doing work by holding a place open. Map Skills is built on the idea that every map leaves something out on purpose, so the reading ends by asking what the mapmaker chose to show — and the concept sort makes half its cards true-but-unhelpful details a city map would drop. The Egypt pack deliberately refuses to be about pyramids: it follows the chain from a predictable flood to silt to surplus to specialists to writing, notes that much of the earliest writing anywhere is receipts rather than poetry, and closes on whose evidence survived and whose did not.

The Egypt FAQ corrects the story most students arrive with. The evidence from the workers' villages at Giza — bread ovens, medical care, burials of honour — points to paid labourers rather than enslaved crowds, and the answer says so while also saying plainly that Egypt did hold enslaved people, so it is not a clean story either.

**The gates caught one of the three.** The grade-2 challenge brief came in at Flesch-Kincaid 4.4 against a band of 2, and was rewritten before the pack was committed. That is the sixth-pass check doing exactly its job on new work. The id-uniqueness gate from the ninth pass also shaped authoring rather than catching a mistake: prefixes were checked against the catalog before writing, not after.

**The shot lists carry the hard part.** Two of these topics fight the no-raster-text policy directly. A place-value pack is about numerals, and a map pack is made of writing. Both shot lists resolve it the same way and say so explicitly: the picture supplies the quantity or the place, and AlloFlow's native labels supply the symbol or the name — which is the lesson in both cases. A key box is rendered empty with blank space beside each symbol; a scale bar has tick marks and no numbers. The Egypt list adds a rule of its own: no invented hieroglyphs, because plausible-looking nonsense script is the historical equivalent of raster text.

The catalog now holds 29 packs across grades 1 to 8: Science 14, ELA 6, Math 6, Social Studies 4 (counting the American Revolution pack, whose standards are half literacy).
## Twelfth pass (into September 6): filling the coverage grid to 38 packs

Counting the catalog as a grade-by-subject grid, rather than as a list, made the remaining work obvious. Nine more packs were written across three rounds, each aimed at an empty or near-empty cell.

| Pack | Grade | Subject | The cell it filled |
| --- | --- | --- | --- |
| The Words Around the Word | 3 | ELA | ELA had nothing at grade 3 |
| Filling Space | 5 | Math | math jumped from 3-4 straight to 6 |
| Why Windows Are Not Wool | 2 | Science | science had nothing at grade 2 |
| Did Anything New Actually Form? | 8 | Science | grade 8 had no science at all |
| Says Who? | 6 | ELA | grade 6 had no ELA |
| Ten Is a Friendly Number | 1 | Math | grade 1 had one pack in total |
| Learn One, Read Many | 1 | ELA | no decoding pack anywhere in the catalog |
| Who Decided That? | 4 | Social Studies | no civics below grade 8 |
| Everything Has a Cost | 7 | Social Studies | economics was entirely absent |

**Every grade from 1 to 8 now has Science, ELA and Math.** Social Studies covers grades 3, 4, 6 and 7 directly, plus 5 and 8 through the two history packs whose standards are literacy-coded.

Each pack carries an argument rather than a topic. Volume builds the formula out of countable cubes so that `l x w x h` reads as *cubes in a layer, times layers* rather than a rule handed down. The grade-8 chemistry pack turns on the fact that all five textbook indicators of a reaction have physical impostors, so appearance settles nothing and only a properties comparison does. The grade-6 ELA pack argues that most weak arguments are not lies but true facts stapled to a claim they do not reach, and its hardest exercise is running that test on a conclusion you already agree with. The economics pack defines opportunity cost as the runner-up specifically, not everything turned down.

### The symbol collision, five times over

A pattern emerged that is worth stating for anyone authoring the next pack. **The no-raster-text policy collides head-on with any topic whose subject matter is symbols**, and by now that has happened five times: numerals (place value, making ten), place names (map skills), sentences (context clues, argument), and letters themselves (word families).

Every one resolves the same way, and each shot list now says so explicitly: **the image carries the quantity, the place, or the structure; AlloFlow's native labels carry the symbol.** A key box renders empty with blank space beside each symbol. A scale bar gets tick marks and no numbers. A sentence is drawn as a line of grey word-bars with one highlighted. Word Families is the sharpest case, because the topic *is* letters: the artwork shows a cat, a hat and a bat, and the words are labels the child has to decode. A picture with "cat" painted into it does the decoding for them and teaches nothing.

### Three subject-specific art traps

- **Chemistry.** The impostor pairs must be genuinely indistinguishable — reaction bubbles beside boiling bubbles, same glassware, same angle, same light. A dramatic fizzing beaker captioned "reaction" would teach the exact reflex the pack exists to break.
- **Civics.** Stock government imagery is domes, flags, gavels and suits at podiums, all of which teach that this is remote and not for you. The reading argues the opposite, so the set is deliberately unimpressive: folding chairs, a noticeboard, a microphone anyone can step up to. The one grand building appears in the distance on purpose.
- **Economics.** No currency anywhere. The pack's first move is that economics is about scarcity rather than money, and a coin would undo it in one image. Cost is shown as the thing not taken: a closed door, an empty wedge, a shaded third place on a podium.

### What the gates caught, on new work

The checks built in passes two through nine earned their keep against content written after them. The grade-2 challenge brief came in at FK 4.4 against a band of 2; the Context Clues memory aid at 5.5 against a band of 3; the grade-1 glossary at 3.1 against a band of 1. All three were rewritten before commit. The civics quiz tripped the option-length check with a correct answer of 21 characters against distractors of 39 to 44 — **a correct answer much shorter than its distractors gives itself away exactly as a longer one does**, and the audit tests both directions.

One defect got through every gate and was caught by eye: a `bublets` typo sitting beside `bullets` in an anchor chart. The JSON stayed valid and every shape check passed, because an unknown extra key is not something any of them look for.

All nine packs pass the audit at zero flags and load clean in the deployed app.
## Thirteenth pass: fact-checking the packs written after the first read

The first pass did a close factual read of the original 21 packs. The 17 written since have been checked by every gate in this report and by nothing at all for truth. Every number and name in them rested on the author's recall, which is exactly the thing not to trust.

So: extract every sentence in those packs carrying a number, a date, a proper name or a quantity word, and check them one at a time. Fifty-seven claims.

**Fifty-six held up.** The Moon's synodic cycle at about 29.5 days, alongside the sidereal 27 days for one orbit — two different numbers that the pack correctly keeps distinct. The Sun being about 400 times wider than the Moon and about 400 times further away, which is why an eclipse fits so neatly. The far side first photographed in 1959. Africa about fourteen times the area of Greenland. Van Helmont's willow gaining about 74 kg over five years while the soil lost almost nothing. Champollion publishing the decipherment in 1822. The Giza workers' villages with their bread ovens and healed fractures. A litre being exactly 1000 cubic centimetres. Lavoisier in the 1770s. Wolves back in Yellowstone in 1995. Twelve colonies at the First Continental Congress in 1774.

### The one that did not

A concept-sort card in the argument pack read: **"A 2019 survey found 62 percent of families eat out."**

There is no such survey. The year, the percentage and the finding were invented, and they were invented in a lesson whose entire subject is how to tell a supported claim from an unsupported one. It sat in the Evidence category, presented to students as an example of what good evidence looks like.

Nothing could have caught it. It passed every shape check, every reading-level check and every game check, because it is perfectly well-formed. It reads as authoritative precisely because it has the shape of a citation.

The card now reads "Our class survey found 19 of 28 families eat out weekly" — still concrete, still genuinely evidence for the sort, and obviously local rather than borrowed authority. The other two evidence cards in that sort were already local ("forty students used the library after three last week"), which is what made the invented one stand out.

### The check that came out of it

The audit now flags **citation-shaped claims**: a year next to a percentage, or the phrase "a 2019 survey" and its relatives. It cannot tell a real statistic from an invented one — nothing can, from inside the file — so it does not try. It flags the shape and asks a human to either attach a real source or reword it as something local and obviously illustrative.

The false-positive risk is low: one hit across 38 packs, and that hit was the defect. It was calibrated by putting the fabricated sentence back and confirming the flag fires.

This is the fourth check in this report to be judged on its false-positive rate before shipping, and the first to survive because the rate was genuinely near zero. It belongs in the audit for a specific reason: these packs are AI-authored and the catalog has no sourcing mechanism, so a sentence that looks like a citation is a standing liability rather than an occasional slip.
## Fourteenth pass: the standards audit the seed plan has been waiting for

Cross-set check 8 in `docs/COMMUNITY_CATALOG_SEED_PLAN.md` reads: *standards spot-audit against the official NGSS/CCSS text (codes AND glosses accurate) — scientific-integrity rule: never claim an alignment the content doesn't earn.* It gates the launch of the catalog itself, and it had never been run. Fourteen of these packs were written from recall by the same author who had just been caught inventing a statistic, so it was overdue.

Every code and every gloss across 38 packs, checked one at a time. Most are correct: the CCSS math codes are right in all seven math packs, the ELA codes are right in all eight, the C3 codes are right, and the NGSS performance expectations are right for chemistry, forces, materials, cells, body systems, plate tectonics, ecosystems, moon phases and the water cycle.

### Two alignments were not earned

**Day Sky, Night Sky cited NGSS 1-ESS1-2 with a gloss I had rewritten to fit the pack.** The real expectation is *"make observations at different times of **year** to relate the amount of daylight to the time of year"* — it is about seasonal daylight. The pack said *"make observations at different times of **day** to describe patterns of change."* One word changed, and the standard became something the pack does teach.

That is worse than a wrong code. A wrong code is a typo; a rewritten gloss is a claim dressed up to pass. The pack does not teach seasonal daylight, so 1-ESS1-2 is now dropped, and the envelope says plainly that it covers the daily half of 1-ESS1-1 and does not claim the other expectation.

**Everything Has a Cost cited C3 D2.Eco.3.6-8**, which is about the roles of buyers and sellers in product, labour and financial markets. The pack teaches scarcity, opportunity cost, sunk cost and marginal thinking, and never touches markets at all. The code is real and the gloss was accurate; the alignment simply was not earned. Dropped.

### Ten glosses too thin to check

A gloss exists so a teacher can judge the alignment without looking the code up. "Domain vocabulary" and "cite specific textual evidence" do not do that job. Ten were fragments rather than expectations, and each now carries the official wording — including MS-LS1-1, MS-LS1-7, RST.6-8.1, RST.6-8.3, RST.6-8.4 and RST.6-8.7.

### One honest note added

Weather vs. Climate is a grade 5-6 pack citing a grade-3 expectation and a middle-school one. That looked like carelessness and is not: **NGSS places no weather or climate performance expectation at grade 5 at all.** The pack now says so, in the same way the Simple Machines pack already notes that NGSS has no dedicated simple-machines expectation. A gap in the standards is worth stating rather than papering over with the nearest plausible code.

Seed-plan cross-set check 8 is now done for all 38 packs.
## Fifteenth pass: the answer keys

The previous two passes found fabrications by reading claims against the world. The same exposure exists in a worse place. **A wrong answer key does not merely mislead — it marks the student who understood as wrong.** The shape suite checks that `correctAnswer` is byte-identical to some option, which says nothing at all about whether it is the right one.

Three checks, and this time the result is a clean one.

**All 38 math answers verified arithmetically.** Every problem in all eight math resources, worked independently of the stated answer: the 8-by-5 dog yard at 26 feet of fence and 40 square feet of sod, the 24-foot fence giving 36 square feet as a 6-by-6 and only 20 as a 2-by-10, the slope of 3 through (0,4) and (2,10), 5.76 over 18 ounces coming out dearer per ounce than 3.60 over 12, 120 cubic centimetres over a 30-square-centimetre base standing 4 tall. All correct.

**All 190 multiple-choice items checked for structural ambiguity.** No repeated options, and no item where the correct answer string matches more than one option. Either would make an item unanswerable.

**All 70 answer keys in the fourteen newest packs read by hand**, including a check that no distractor is also defensible. All correct. The closest call was the chemistry item where a beaker starts bubbling: one distractor says "a gas is being produced by new substances", which is tempting until you notice that boiling produces a gas of the *same* substance, so the option is genuinely false and the key — "something worth investigating, and nothing more" — is genuinely right.

Reporting a pass that found nothing matters as much as reporting one that found something. The two previous passes each found a fabrication, and it would be easy to assume the same rate holds everywhere. It does not: the arithmetic and the keys were sound.

### What is now held automatically

`tests/allopack_answer_integrity.test.js` keeps the machine-checkable half: no repeated options, exactly one option equal to the key, a usable expected answer on every short-answer item, and every math problem carrying an answer plus at least two non-empty worked steps. It was calibrated by making two options identical in one pack and confirming the failure, then restoring.

It cannot check truth, and the file says so. That part was done by hand and will need doing again by hand whenever a pack is edited.
## Files

- Packs: `allopacks/*.allopack.json` (21 edited, 5 new), `allopacks/{moon_phases_grade6,forces_motion_grade3,point_of_view_grade4,day_night_sky_grade1,story_retell_grade2}.IMAGES.md`
- Tools: `dev-tools/audit_allopacks.cjs`, `dev-tools/build_allopack_catalog_entries.cjs`, `dev-tools/report_shared_glossary_terms.cjs`, `dev-tools/smoke_allopacks_live.mjs`
- Tests: `tests/allopack_catalog.test.js`, `tests/content_viewer_boundary_key.test.js`, `tests/allopack_id_uniqueness.test.js`, `tests/allopack_answer_integrity.test.js`
- Host fix: `AlloFlowANTI.txt` and its two paired copies (content-viewer boundary key)
- Docs: `docs/ALLOPACK_FORMAT_SPEC.md`, `docs/ALLOPACK_AUTHORING_PROMPT.md`, `docs/COMMUNITY_CATALOG_SEED_PLAN.md`
- Working files (not for the repo): `scratch/allopack-audit-2026-09-05/`
