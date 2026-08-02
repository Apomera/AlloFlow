# STEM Lab Category & Discoverability Audit

**Date:** 2026-08-02
**Scope:** `stem_lab/stem_lab_module.js` tile catalog (`_allStemTools`), the category
filter chips, and the tool search haystack.
**Catalog state at audit:** 128 tiles in 16 category sections. `check_stem_tile_catalog.cjs`
passes (every `registerTool` id has a tile and vice versa), so this audit is about how tools are
*shelved and found*, not whether they are wired up.

> Every number in this document was computed from the source, not estimated. Reproduction
> commands are in the Appendix.

---

## Summary

The catalog has no missing or broken tools. What it has is a shelving problem in three layers:

1. **The filter chips match category names by naive substring**, which produces wrong and
   accidental groupings. Physics and Chemistry tools do not appear under the Science chip;
   31 Life & Earth Science tools do appear under Creative.
2. **Two sections have become dumping grounds** holding 43% of the catalog between them,
   while six sections hold 2 to 4 tools each.
3. **Search only indexes the tile blurb, not the tool.** Seven of fourteen realistic teacher
   queries return zero results for content that ships today.

Layer 1 is a bug with a small fix. Layer 2 is a taxonomy decision. Layer 3 is the highest
ratio of user value to effort in the whole audit.

---

## Part 1 - How categorization works today

A tool's category is **positional, not declared**. `_allStemTools` is one flat array; a
`{ category: true }` header row starts a section, and every tile after it belongs to that
section until the next header. There is no `category:` field on a tool tile.

The filter chips (All / Science / Math / Engineering / Creative / Applied / Games) then work by
scanning *backwards* from each tile to find its header, lowercasing that header's **display
label**, and testing it against a keyword list with `indexOf`
(`stem_lab_module.js:5266-5283`):

```js
var _catMap = { science: ['Science','Biology','Life Science','science'],
                math: ['Math','math'],
                engineering: ['Engineering','tech','cs','engineering'],
                creative: ['Creative','creative','Art'],
                applied: ['Applied','applied','geo','life-skills','life skills','economics','social studies'],
                strategy: ['Strategy','strategy'] };
```

Two consequences follow from matching translated display text with `indexOf`:

- The mapping breaks in any non-English UI, because it tests English keywords against a
  translated label. Under a Spanish or Somali UI the chips filter close to nothing.
- Substrings match inside unrelated words. This is the source of Finding 1.

---

## Part 2 - Findings

### F1. Chip filtering is driven by accidental substring matches (bug)

| Category section | Chip it lands under | Why |
|---|---|---|
| Physics & Chemistry | **engineering** | `"physi`**`cs`**`"` contains `cs` |
| Life & Earth Science | science **and creative** | `"e`**`art`**`h"` contains `Art` |
| Geography & Earth Science | science, creative **and applied** | `earth`→`Art`, `geography`→`geo` |
| Social Studies & Economics | **engineering** and applied | `"economi`**`cs`**`"` contains `cs` |
| Computer Science | **science** | contains `Science`; never matches `cs` as a word |

What each chip actually shows today:

| Chip | Tools shown | Reality |
|---|---|---|
| Science | 44 | **Contains no physics or chemistry tool.** |
| Engineering | 44 | 24 of them are Social Studies / life-skills tools. |
| Creative | 40 | Only 4 are arts tools; 36 are earth/life science. |
| Applied | 29 | |
| Math | 25 | Correct. |
| Games | 5 | Correct. |

Two sections match **no chip at all**, so their tools never appear under any filter:
**Sound, Speech & Music** (echolocation, oratory, singing) and **Ecology & Migration**
(birdLab, raptorHunt, migration). They remain reachable through All, search, and scrolling,
so nothing is invisible - but the filter silently lies about them.

A teacher filtering to Science to plan a physics lesson sees zero physics tools. That single
line is probably the whole of the "weird categorization" feeling.

### F2. Two dumping grounds hold 43% of the catalog

`Life & Earth Science` holds **31** tools and `Social Studies & Economics` holds **24**, out of
128. Six sections hold 2 to 4. The large sections are no longer coherent:

- **Social Studies & Economics** contains `cephalopodLab` (marine biology), `evoLab`
  (evolution), `statsLab` (inferential statistics), `llmLiteracy` (AI literacy),
  `learningLab` and `assessmentLiteracy` (educational psychology), `typingPractice`
  (keyboarding), and `worldBuilder` (a literary RPG). Only `economicsLab` and `lifeSkills`
  clearly belong.
- **Life & Earth Science** contains `coasterLab` (roller-coaster physics), five astronomy and
  spaceflight tools, and most of the chemistry set (`molecule`, `titrationLab`,
  `bakingScience`, `decomposer`).

### F3. Duplicate and overlapping section names

- **"Advanced Math" appears twice**: `_cat_AdvancedMath` (7 tools) and
  `_cat_AdvancedMathLogic`, labelled `📐 Advanced Math` (4 tools). To a user these read as the
  same section listed twice.
- **Earth Science appears in two headers**: `Life & Earth Science` and
  `🌍 Geography & Earth Science`.
- **Biology is spread across four sections**: `Life & Earth Science`,
  `🧬 Biology & Life Science`, `🌍 Ecology & Migration`, and `Social Studies & Economics`.

### F4. Sibling tools are shelved apart

| Tool | Section today | Its natural sibling | Sibling's section |
|---|---|---|---|
| `echoTrainer` (Echo Navigator) | Social Studies & Economics | `echolocation` | Sound, Speech & Music |
| `punnett` (genetic crosses) | Physics & Chemistry | `dnaLab` | Biology & Life Science |
| `dataPlot`, `dataStudio`, `lumen` | Physics & Chemistry | `dataLab`, `statsLab` | Technology & AI / Social Studies |
| `geoSandbox` | Math Fundamentals | `geometryProver`, `geometryWorld` | 📐 Advanced Math |
| `coasterLab` | Life & Earth Science | `physics`, `throwlab` | Physics & Chemistry / Social Studies |

### F5. Search indexes the tile blurb, not the tool (highest-value finding)

`_stemToolSearchHaystack` (`stem_lab_module.js:5207-5211`) builds its index from the tile's
`id`, `label`, `desc`, `category`, and any `aliases`. It never sees the tool's own registered
description or its actual feature set. Only 15 tools have entries in `_searchAliasMap`.

Simulating the real search function against real teacher queries:

| Query | Results | Content that exists |
|---|---|---|
| `periodic table` | **0** | `molecule` ships a full 118-element table with orbital clouds |
| `international space station` | **0** | `spaceStation` is a clickable 3D ISS |
| `skinner` | **0** | `behaviorLab` teaches operant conditioning |
| `reinforcement schedule` | **0** | `behaviorLab` |
| `transpiration` | **0** | `waterCycle` |
| `virtual microscope` | **0** | `microbiology` |
| `food safety` | **0** | `kitchenLab` teaches USDA temps and the danger zone |
| `apollo` | 2 | |
| `igneous` | 1 | |
| `natural selection` | 1 | |

Thirteen tools describe substantially more in their own `registerTool` description than their
catalog tile does, and none of the thirteen has a search alias: `rockCycle`, `behaviorLab`,
`microbiology`, `moonMission`, `autoRepair`, `weldLab`, `schoolBehaviorToolkit`,
`nutritionLab`, `evoLab`, `magnetism`, `echoTrainer`, `waterCycle`, `spaceStation`.
`rockCycle` self-describes in 381 characters against a 72-character tile.

**This reframes the roadmap.** Before building anything new, note that a teacher who wants a
periodic table today concludes AlloFlow does not have one.

### F6. Chip mapping is English-only

Because `_catMap` tests English keywords against translated headers, the chips degrade to
near-empty in every localized UI. Given the 49 shipped language packs, this affects far more
than an edge case.

---

## Part 3 - Taxonomy (SHIPPED)

Implemented in the reorder commit. Every one of the 128 tiles is assigned exactly once, and
each tile's source text was preserved byte-for-byte - only its position and owning header
changed. Section sizes go from 2-31 to 4-14.

| # | Section | Chip | N | Notable moves in |
|---|---|---|---:|---|
| 1 | Math Fundamentals *(i18n)* | math | 10 | number and operations core |
| 2 | Advanced Math *(i18n)* | math | 5 | algebra, functions, calculus |
| 3 | 📐 Geometry & Measurement | math | 7 | `geoSandbox`, `geometryProver`, `geometryWorld` reunited |
| 4 | 📊 Data, Statistics & Probability | math | 6 | `statsLab`, `dataPlot`, `dataStudio`, `dataLab`, `lumen` |
| 5 | 🧬 Life Science & Genetics | science | 9 | `punnett` from Physics; `evoLab` from Social Studies |
| 6 | 🫀 Human Body, Health & Safety | science | 6 | `nutritionLab`, `firstResponse`, `kitchenLab` |
| 7 | 🌍 Ecology, Environment & Animals | science | 14 | `birdLab`, `raptorHunt`, `migration`, `cephalopodLab` |
| 8 | 🌎 Earth & Space Science | science | 14 | astronomy + spaceflight unified |
| 9 | Physics & Chemistry *(i18n)* | science | 10 | `coasterLab` in; chemistry set rejoined |
| 10 | ⚙️ Engineering & Design | engineering | 5 | `archStudio`, `bridgeLab`, `printingPress` |
| 11 | 💻 Computing, AI & Digital Literacy | engineering | 12 | `llmLiteracy` from Social Studies |
| 12 | Arts & Music *(i18n)* | creative | 8 | `echolocation` + `echoTrainer` reunited |
| 13 | 🧠 Learning & Behavioral Science | applied | 4 | `learningLab`, `assessmentLiteracy` join |
| 14 | 💰 Life Skills, Careers & Economics | applied | 10 | |
| 15 | 🏅 Sports & Movement Science | applied | 4 | `throwlab`, `skatelab`, `playlab`, `swimLab` |
| 16 | ⚔️ Strategy Games | strategy | 4 | |

Per-chip totals: science 53, math 28, applied 18, engineering 17, creative 8, strategy 4.

**On i18n.** Four sections marked *(i18n)* keep their existing `t()` keys, which is why the
implemented names differ slightly from the first draft of this audit: Chemistry and Physics
were merged so the translated `stem.tools_menu.physics_chemistry` key survives, and
"Number & Operations" stayed "Math Fundamentals". The other 12 headers are hardcoded English,
which matches the pre-existing convention (11 of the old 16 were already hardcoded) but is
still debt. **Follow-up:** add `stem.tools_menu.*` keys for those 12 and hand-translate them
into the language packs. The chip filter itself no longer depends on label text at all, so
translating a header can never again break filtering.

---

## Part 4 - Implementation status

**Step 1 - Declare the chip on the header. DONE.**
Each `{ category: true }` header now carries `chip: '<id>'` and the filter compares that field;
the `_catMap` substring table is gone. Fixes F1 and F6. Verified 16/16 headers carry a valid
chip and all 128 tiles are chip-reachable.

**Step 2 - Backfill search aliases. DONE.**
`_searchAliasMap` went from 14 to 29 entries, covering the 13 drifted tools plus `molecule`
(the periodic table) and `kitchenLab` (food safety). All seven dead queries now resolve;
precision spot-checked for new catch-alls. Every keyword came from the tool's own
`registerTool` description.

**Step 3 - Reorder to the Part 3 taxonomy. DONE.**
Landed as its own commit. Tiles were sliced and reassembled, never re-printed, so all 128 kept
their exact source text (independently verified: 0 tiles changed).

### Remaining

**Step 4 - `check_stem_search_coverage.cjs` gate.** Step 2 fixed today's 15 tools but not the
root cause: the haystack still cannot see a tool's own description, so the next tool can ship
under-indexed. A gate that fails when a tool's `registerTool` desc contains a substantive term
absent from its tile desc and aliases would close this permanently.

**Step 5 - i18n keys for the 12 hardcoded headers** (see the note in Part 3).

**Step 6 - Refresh stale tile descriptions** so the tile advertises what the tool actually does.
`rockCycle` (381 chars of real features against a 72-char tile) is the worst case.

---

## Part 5 - Future tools worth building

Two framing notes before the list.

First, at 128 tools the marginal cost of a new tile is no longer just build effort; it is
discovery cost for every teacher who now scrolls past it. Several apparent gaps below are
better solved by surfacing existing content than by adding a tile.

Second, these are ranked by whether the whitespace is real. I verified each against the source
rather than assuming.

### Already covered - surface, do not build

| Apparent gap | Reality |
|---|---|
| Periodic table | Full 118-element table already inside `molecule`. Needs an alias and a tile-desc mention. |
| Gas laws, states of matter | `particleLab3d`. |
| Buoyancy, convection, resonance | Mentioned across 9-17 tools but with no dedicated home. Candidates for cross-links rather than new tools. |

### Tier 1 - real whitespace, high curricular value

1. **Word Problem Workshop (schema-based instruction).** Zero coverage in the catalog
   (`schema-based` appears in 0 files). Teaches students to classify word problems by
   structure - change, group, compare, rate - rather than hunting keywords. This is an
   evidence-based math intervention for students with learning disabilities, it is the single
   most-requested support in special-ed math, and no mainstream edtech ships it. It is also
   the strongest fit for the research-readiness track with Dr. Howorth.
2. **Simple Machines & Mechanical Advantage.** No dedicated tool. Levers, pulleys, inclined
   planes, wheel-and-axle, gears, screws, with a mechanical-advantage calculator and a design
   challenge. A K-8 NGSS staple and currently the largest elementary physics hole.
   `bikeLab` already has a 2-D force-vector sandbox to build on.
3. **Experiment Designer.** `independent variable` appears in exactly one file. Students set
   up variables, controls, sample size, and randomization, then see how confounds corrupt a
   result. Fills the NGSS science-practices gap that sits between `statsLab` (analysis) and
   `lumen` (write-up), and makes both more useful.

### Tier 2 - strong fit with AlloFlow's UDL identity

4. **AAC & Communication Lab.** Core-vocabulary boards, message building, partner-assisted
   scanning. Essentially absent today (one incidental mention). Directly serves the students
   AlloFlow is built for, and Symbol Studio plus the existing TTS stack supply most of the
   pieces.
5. **Sign Language & Fingerspelling.** Zero coverage. Pairs naturally with `accessLens` and
   the existing accessibility cluster.
6. **Heat & Thermal Energy.** `specific heat` appears in 2 files. Conduction, convection,
   radiation, phase change, and an insulation design challenge. `particleLab3d`'s 3D engine is
   directly reusable.

### Tier 3 - rounds out existing pathways

7. **Python / text-based coding**, bridging from `codingPlayground`'s blocks. The Blockly
   runtime already ships a code pane.
8. **Sound & Acoustics** - standing waves, resonance, decibels, hearing. Completes the
   cluster with `echolocation`, `singing`, and `musicSynth`.
9. **Density & Buoyancy** - reuses the `fisherLab` / `aquacultureLab` three.js water.
10. **Tides & Oceanography** - Maine-relevant; `fisherLab` already models tides.

---

## Appendix - reproduction

```bash
# Catalog parity (passes today)
node dev-tools/check_stem_tile_catalog.cjs

# Category sections, tool counts, and chip reachability
#   scratchpad/analyze.cjs, chip_totals.cjs

# Search simulation against real teacher queries
#   scratchpad/sim_search.cjs

# Tile-vs-tool description drift
#   scratchpad/desc_drift.cjs
```

Chip logic: `stem_lab/stem_lab_module.js:5252-5293`.
Search haystack: `stem_lab/stem_lab_module.js:5184-5213`.
Catalog array: `stem_lab/stem_lab_module.js:4549` onward.
