# Community Catalog — Seed List + QA Plan

Ten launch packs (flagship included), chosen to cover grade bands, subjects, and every resource
type at least twice. All authored to AlloPack v0.1 (English-first policy; embedded Spanish
glossary translations where high-ELL-value). Standards are load-bearing metadata: every pack
names its codes with a gloss.

## Seed list

| # | Pack | Grade | Standards | Notes |
|---|---|---|---|---|
| 1 | ✅ The Water Cycle — Earth's Recycling System | 6 | NGSS MS-ESS2-4; CCSS.RST.6-8.4 | Flagship (shipped) |
| 2 | Photosynthesis — How Plants Eat Sunlight | 7 | NGSS MS-LS1-6; CCSS.RST.6-8.4 | Concept-sort of inputs/outputs; pairs w/ Ecosystem STEM lab |
| 3 | Fractions on the Number Line | 3-4 | CCSS.MATH.3.NF.A.2 | Uses math-type problems + manipulative slots |
| 4 | The Constitution — Why Rules for the Rule-Makers | 8 | C3 D2.Civ.4.6-8; CCSS.RH.6-8.2 | DBQ-lite via faq + quiz evidence items |
| 5 | Plate Tectonics — The Earth Puzzle | 6 | NGSS MS-ESS2-3 | Pairs w/ Plate Tectonics STEM lab quest objective |
| 6 | Figurative Language — Say It Sideways | 5 | CCSS.ELA-LITERACY.L.5.5 | Sentence-frames heavy; concept-sort simile/metaphor/idiom |
| 7 | The Cell — Smallest Living Factory | 7 | NGSS MS-LS1-1, MS-LS1-2 | Image-slot rich (labeled organelles) |
| 8 | Weather vs. Climate | 5-6 | NGSS MS-ESS2-5, 3-ESS2-2 | Misconception-focused quiz (the classic conflation) |
| 9 | Ratios in Real Life — Recipes & Maps | 6 | CCSS.MATH.6.RP.A.1-3 | Numeric-response quiz items |
| 10 | Magnetism — Invisible Push and Pull | 6-7 | NGSS MS-PS2-3, MS-PS2-5 | Objectives tether into the Magnetism STEM lab (inter-tool quest line pilot) |

Authoring order: 2, 8, 5 first (science cluster reuses the flagship's patterns), then 6, 4
(ELA/SS stretch the type coverage), then math pair (3, 9 — needs the math-type grounding pass
first), then 7, 10 (image-heavy + inter-tool pilot last, most new surface).

## QA plan (run per pack, then once across the set)

**Automated (per pack — clone of the flagship suite, parameterized):**
1. `tests/allopack_flagship.test.js` pattern: envelope, unique ids, student-safe types,
   per-type shapes, byte-exact quiz answers, resolvable resourceRefs, legal gameTypes,
   glossary-present-for-game-goals, privacy scan, size cap, no embedded images, meta =
   display strings, standards present in the allopack block, Agent Core validateArtifact OK.

**Manual import smoke (per pack, ~10 min, Aaron or pilot teacher):**
2. Load Project → every resource opens and renders (no blanks — the directions lesson).
3. Directions open first; quest map draws; goals list matches the pack's objectives.
4. Play one word game to a win → its goal auto-ticks; XP goal shows a delta bar; manual
   checkbox persists across a reload.
5. Translate → Spanish (whole pack): every resource translates; directions goals still
   auto-check (tethers repointed); no '[object Object]' anywhere; title suffixes correct.
6. Generate the shot-list images in-app; attach; alt text reads correctly with Read Aloud.
7. Send home → shelf → reopen without session: pack + progress intact.

**Cross-set checks (once):**
8. Standards spot-audit against the official NGSS/CCSS text (codes AND glosses accurate) —
   scientific-integrity rule: never claim an alignment the content doesn't earn.
9. Reading-level pass: each pack's leveled text within its stated grade band (in-app level
   check tool).
10. A second device runs pack #1 and #10 end-to-end (the inter-tool quest line is the newest
    surface).

**Catalog gate:** a pack enters the community catalog only after 1-7 pass; 8-10 gate the
launch of the catalog itself.
