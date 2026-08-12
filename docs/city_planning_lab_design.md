# City Planning Lab

> **Implementation status (2026-08-11):** Phase 1 is **BUILT and UNCOMMITTED**.
> `stem_lab/stem_tool_citylab.js` exists, is mirrored to `desktop/web-app/public/stem_lab/`,
> and is wired at all three registration points in both module copies and both ANTI copies.
> **Three towns ship**: Riverbend (§18), where stormwater and budget bind; Mesa Hollow (§18),
> where water supply binds and the farms are drinking it; and Harborlight (§21), where the
> constraint is time and the safe area of the map changes with the assumption set.
> **Framing decided 2026-08-11: engineering for now**, with the civics and geography angle to
> be interwoven later rather than bundled into this tool's review.
> The plan memo rubric lives in `docs/city_planning_lab_memo_rubric.md`; it grades the
> reasoning, never the plan, which is why the tool still produces no score. The contested
> tier now has its promised other half, the `Discussion` tab (§22). Three suites, **110 green**:
> `city_lab_core` (59, the model and the scenario registry), `city_lab_render` (22, the
> markup, server-rendered), `city_lab_interaction` (29, mounted for real and driven with
> DOM events, so effects run and focus moves). **Every promise this doc makes is now
> built**; the audit that closed the last of them is §19.
> **Every surface has been rendered and looked at** via server-side React plus the real
> compiled Tailwind bundle, screenshotted with Playwright: Design in both themes, Parcel
> table, Assumption Lab with results, and Memo. Looking found five defects (§16); driving it
> found three more, including an accessibility regression (§17). **Live browser smoke in
> Canvas is still owed**, as is hand-translated i18n. Phases 2 and 3 are unbuilt. Where this
> doc and the module disagree, the module wins.

> STEM Lab tool · `id: cityLab` · file `stem_lab/stem_tool_citylab.js` · single
> hand-maintained module, no build step · mirror `desktop/web-app/public/stem_lab/` ·
> proposed band: grades 6-10, calibrated to the King Middle pilot

---

## Executive Summary

**City Planning Lab** is a constraint-satisfaction design tool. A student is handed a real
town with real terrain and a planning brief whose requirements genuinely conflict, then
places land uses and infrastructure on a parcel grid while a scorecard recomputes on every
edit. The deliverable is not a score. It is a **plan memo** in which the student states
which constraints they met, which they missed, and which trade-off they chose to accept.

**The design's single hard gate is epistemic, not mechanical.** In a planning simulation
the coefficients *are* claims. If a student upzones and rent falls on screen, AlloFlow has
asserted a contested empirical claim as fact, which violates the project's standing rule
against presenting contested science as settled. Every other design decision here follows
from the fix: indicators are sorted into three tiers by epistemic status (§3), the
Contested tier is **never rendered as a number the plan produces**, and the tool's most
important mode is the **Assumption Lab**, where one plan is scored under two documented
parameter sets and the student is asked which conclusions survive both.

That reframing is not damage control. "Which parts of my conclusion are robust to the
assumptions I am least sure about" is a better and more durable learning target than any
planning fact the simulation could otherwise teach, and it is itself uncontested.

**What it is not:** not a city-builder game, not a tick-based economy, no population that
grows on its own, no score, no stars, no timer, no win state. The town does not run. It is
evaluated.

**Fills a real catalog gap.** A grep for urban, zoning, land use, and walkability across all
147 current STEM tools and `docs/` returns nothing. `archStudio` is building-scale,
`gisStudio` analyzes places but never lets a student design one, `bridgeLab` is a single
structure, `stewardshipHub` is regional environmental scenario work, `economicsLab` is
macro and personal finance, and `arcCity` wears a city skin over function graphing. Nothing
in the catalog says "design a place under competing constraints." It would also be the
first tool carrying a civics and geography load, in a catalog whose chips are currently
math, science, engineering, applied, creative, and strategy, with no social studies chip at
all.

---

## 1. Concept & Pitch

- **Framing (one screen, skippable, under 40 words):** *"Riverbend has to find room for
  1,200 more homes in the next twenty years. The floodplain is off limits, the bond is
  fixed, and the planning board wants families within a short walk of a park. Show
  them a plan."*
- **Core loop:** read the brief → inspect the terrain → place land uses and networks →
  watch the constraint report update → find the binding constraint → revise → when you stop
  revising, write the memo that says what you gave up and why.
- **No opponent, no clock, no growth engine.** The town is frozen. Every number on screen
  is a function of the plan as it currently stands, recomputed synchronously, deterministic
  for a given plan and assumption set.
- **The headline move is the Assumption Lab.** One plan, two documented parameter sets,
  side-by-side scorecards, and one highlighted column: the indicators whose *ranking flips*
  between the two. Those are the parts of the plan that depend on a contested belief. The
  rest are robust. Naming that difference is the point of the tool.

---

## 2. The Board & The Model

### 2.1 Parcel grid

- **12 × 12 = 144 parcels.** Each parcel is 100 m × 100 m = **1 hectare**. The hectare unit
  is chosen so per-capita and density arithmetic stays clean enough for a sixth grader to
  do by hand and check the dashboard against it. Any student who cannot verify a displayed
  number with a pencil has been handed a black box.
- **Fixed terrain per scenario, authored not generated:** elevation band, watercourse,
  mapped 100-year floodplain polygon, existing road spine, existing civic buildings, soil
  or slope constraints. Terrain is never randomized. Two students on the same scenario are
  looking at the same town.
- **Editable layers:** land use (one value per parcel), road segments and path segments on
  parcel edges, and a green-infrastructure overlay per parcel. **Transit stops are phase 2**,
  not v1: they only earn their place once mode share is modelled, and mode share is the
  contested-rate-table problem in §3.

**As built, Riverbend has 87 dry buildable parcels.** That number is worth stating up front
because it produces the scenario's sharpest result entirely within Tier 1: at 12 dwellings
per hectare, 87 parcels is 1,044 homes, which is **less than the 1,200 the brief requires**.
Low density does not merely cost more in Riverbend. It cannot house the town at all, and
that conclusion is pure area arithmetic, so no assumption set can move it. It is asserted
by `tests/city_lab_core.test.js`.

### 2.2 Land use palette (v1)

| Use | Units / ha | Runoff coeff `C` | Notes |
|---|---|---|---|
| Preserve / wetland | 0 | 0.10 | Buildable, but every town judges you on taking it (`req_preserve`) |
| Farm | 0 | 0.20 | Conversion is tracked and reported |
| Park / open space | 0 | 0.20 | Counts toward park access and green space |
| Housing, low | 12 | 0.45 | |
| Housing, mid | 45 | 0.65 | |
| Mixed use | 60 | 0.75 | Housing above, ground-floor retail |
| Commercial | 0 | 0.85 | |
| Civic (school, clinic, library) | 0 | 0.75 | Anchors walk-access measurement |
| Light industry | 0 | 0.85 | |

Every number in that table is a **scenario data value, not a constant baked into logic**,
is displayed in the parcel inspector, and is editable in the Assumption Lab. That claim was
merely aspirational until a second town forced it to become true; see §18. A scenario may
also rename a use for display, which is why "open field" reads as "desert scrub" in Mesa
Hollow. Runoff
coefficients are standard published rational-method values; the doc that ships with the
tool names the source and states the published range rather than a single point value.

### 2.3 Networks

Roads, paths, and transit are edges on the parcel lattice, not free-drawn lines. That
choice is load-bearing for accessibility: an edge is `{from: 'C7', to: 'C8', kind: 'local'}`,
which is a thing a keyboard user can pick from two lists and a screen reader can read aloud.
A free-hand drag tool would make the primary mechanic mouse-only, which is the failure mode
this repo has been bitten by before.

Walk access is a breadth-first search over the path-and-road graph, not straight-line
distance. Straight-line "as the crow flies" access is the classic way a planning dashboard
tells a comfortable lie, and the difference between the two is worth surfacing: the tool
can show both and let a student see the gap where a river has no bridge.

---

## 3. The Integrity Spine: three tiers of indicator

**This section is the contract. Feedback copy, exports, and the teacher panel may only make
claims permitted here.** It is the analogue of the BUILDS / EXPOSES split in
`arc_city_design.md` §3, and like that split it must be enforced by a test, not by good
intentions.

### Tier 1: MEASURED

Geometry and accounting over the plan as drawn. No empirical claim, no coefficient, no
disputable step. Always shown, always trustworthy, always hand-checkable.

| Indicator (as built) | Definition |
|---|---|
| `newUnitsServed` / `totalUnitsServed` | Σ (parcels of type × units/ha), counting only parcels a road component reaches |
| `unitsUnserved` | dwellings zoned but unreachable, reported so the gap is never silent |
| `builtAreaHa` | hectares under a non-natural use |
| `farmlandConvertedHa` / `preserveConvertedHa` | hectares rezoned, by source type |
| `newUnitsInFloodplain` / `existingUnitsInFloodplain` | units on parcels intersecting the mapped floodplain, split so the grandfathered ones are never charged to the student |
| `parkHa` | hectares of park |
| `parkAccessPct` | share of counted dwellings within 5 minutes network distance of a park |
| `newRoadMetres` | Σ new segment lengths |

**Two indicators had to move up a tier during implementation, and the reason is instructive.**
The first draft of this table listed *impervious fraction* and *green space per 1,000
residents* as measured. Neither survives contact with the code:

- Impervious fraction is only meaningful here as the area-weighted **runoff coefficient**,
  and that coefficient is exactly the parameter the assumption sets scale. It is a model
  input wearing a measurement's clothes. It sits in Tier 2.
- Green space per 1,000 residents divides by population, and population is homes × household
  size. That multiplier is an assumption. **Park hectares** is Tier 1; **park hectares per
  1,000 residents** is Tier 2.

This is what the tier discipline is for. The test in §11 that asserts *no* Tier 1 indicator
moves when the assumptions flip is what caught both, and either one would have quietly
undermined the claim that measured numbers are assumption-free.

Population is displayed as "1,240 homes (about 2,980 residents at 2.4 per household)" with
the multiplier visible and editable. A derived number never hides its input.

### Tier 2: MODELED

A published engineering formula with named parameters. Shown, but **every modeled indicator
carries an "open the model" affordance** that reveals the formula, the current parameter
values, the published range, and the source. Parameters are editable in the Assumption Lab.

| Indicator | Model | Honest caveat shipped with it |
|---|---|---|
| `runoffCoefficient`, `peakRunoffQ`, `baselineRunoffQ`, `runoffRatio` | Rational method, `Q = C · i · A`, with `C` the area-weighted runoff coefficient over all 144 parcels and `i` a 50 mm/h design storm | Valid for small watersheds; a screening estimate, not a drainage design, and it says nothing about where the water actually goes |
| `capitalCost` | Σ (unit cost × quantity) over roads, bridges, paths, park land, green infrastructure and civic buildings | Unit costs vary enormously by region and year, and the bond covers public infrastructure only, which is itself a modelling choice worth arguing about |
| `population`, `parkHaPer1000` | homes × household size | A single multiplier, and the reason both sit here rather than in Tier 1 |
| Trip generation *(phase 2, unbuilt)* | Trips/day per land use from published rate tables | Rate tables are drawn from suburban auto-oriented sites and are contested for mixed-use and urban contexts; this caveat must be shown in the panel, not buried |

**Green infrastructure** is credited as a flat reduction in effective `C`, floored at the
open-field value. Stormwater manuals typically credit somewhere between 0.10 and 0.20 for
well-maintained practices, and that published range is exactly what the conservative and
optimistic assumption sets span, so a student can see the whole disagreement rather than a
midpoint presented as fact.

The runoff model is the best math object in the tool. The area-weighted coefficient is a
genuine weighted average that a seventh grader can compute by hand, it responds visibly and
correctly to design changes, and it is real engineering practice rather than a fabricated
game mechanic.

### Tier 3: CONTESTED

**Never rendered as a number the plan produces. No exceptions.**

Rent and housing cost, displacement and neighborhood change, economic growth, job creation,
crime, health outcomes, school quality, property values, "happiness" or "citizen approval."

These are the outputs a commercial city-builder leans on hardest and they are exactly the
ones where the causal evidence is genuinely contested. A simulation that prints a rent
number has asserted a causal claim to a child in the most persuasive form available, a
number on a screen the child produced themselves.

They are not absent from the tool. They appear as:

1. **Discussion prompts. BUILT** as the `Discussion` tab: per-town questions plus four
   shared ones, each naming at least two positions with their reasoning and none marked
   correct. See §22.
2. **Documented case studies** in the reading layer, which is history rather than
   simulation. Redlining maps, urban renewal displacement, and the Dutch and Japanese
   zoning contrasts are documented record and can be presented as such.
3. **Assumption Lab parameters** where a contested belief is upstream of a modeled number,
   made explicit as a belief rather than smuggled in as a coefficient.

**Enforcement:** a test asserts that the intersection of the rendered indicator id set and
the `CONTESTED_IDS` set is empty, in every mode, including exports and the teacher panel. If
a future contributor adds a rent readout, the suite goes red with a message that points here.

### 3.1 The Assumption Lab

The student builds one plan, then picks two named assumption sets and runs both.

Each set is a bundle of parameter values with a one-line statement of what it assumes. To
keep this out of partisan framing, sets are defined as **positions within the published
range** for the same parameters rather than as ideological positions. Three ship in v1:

| Set | `runoffScale` | `giCredit` | `costScale` | `householdSize` |
|---|---|---|---|---|
| **Central** (default) | 1.00 | 0.15 | 1.00 | 2.4 |
| **Conservative** (high end) | 1.10 | 0.10 | 1.20 | 2.6 |
| **Optimistic** (low end) | 0.90 | 0.20 | 0.85 | 2.2 |

Note that conservative is not uniformly "higher": it pairs high runoff coefficients and high
costs with a **low** green-infrastructure credit, because a cautious engineer discounts the
mitigation as well as inflating the load. Making that internally coherent matters more than
making the numbers move in one direction.

The comparison view shows Set A, Set B and the change, with the indicators that moved listed
first and the ones that did not move in a visually separated "did not move at all" block
labelled as the measured quantities. Above both sits the only verdict that matters: whether
any *requirement* flipped between the two sets, and if so, which.

The closing prompt is the whole tool in one sentence: *"Which of your conclusions hold under
both sets? Those are the ones you can defend."*

---

## 4. The Brief & The Constraint Report

A scenario brief is a list of hard requirements and soft targets that cannot all be met.
Riverbend, the v1 scenario:

| # | Requirement | Type |
|---|---|---|
| 1 | Add at least 1,200 housing units **that a road actually reaches** | hard |
| 2 | Zero new housing units inside the mapped 100-year floodplain | hard |
| 3 | Peak runoff no more than 25% above today's baseline | hard |
| 4 | Capital cost at or under the $22M bond | hard |
| 5 | At least 90% of homes within a 5-minute walk of a park | soft target |
| 6 | Convert no more than 15 ha of active farmland | soft target |

Three of those numbers were set by probing the model rather than by taste, and the reasoning
is worth recording because it constrains any future scenario author:

- **"That a road actually reaches"** is what makes the road budget bind. Without it a student
  zones parcels for free and the only costs are parks and green infrastructure. A dwelling on
  a parcel no road component reaches is reported but not counted.
- **25% above baseline, not "no greater than."** At zero increase the requirement is
  unsatisfiable: housing 1,200 more families on 144 hectares raises the area-weighted runoff
  coefficient no matter how it is arranged. A constraint nobody can meet teaches nothing. The
  ceiling is expressed as a **ratio against a baseline recomputed under the same assumption
  set**, so the scaling largely cancels, which is itself the better modelling lesson.
- **$22M, not $18M.** At $18M only the highest-density arrangements survived, which
  contradicts the promise that the scenario has more than one answer. At $22M three
  materially different plans pass and sprawl still fails by more than a factor of two.

The constraint report is a **checklist with margins**, never a grade: "Met, 1,240 of 1,200
units." "Missed by 6 ha, 21 of 15 ha farmland converted." Soft targets that are missed are
reported as a distance, not a failure.

**There is no single correct plan and the tool never claims one exists.** No solution is
stored. No "optimal" is computed or hinted at. A scenario is authored only if at least three
materially different plans satisfy every hard constraint, and that property is asserted by a
test that checks three stored reference plans, which are used *only* as test fixtures and are
never shown to students.

### 4.1 The anti-fishing gate

A plan can be brute-forced by shuffling parcels until the dashboard turns green, which
teaches nothing. Three mechanisms, mirroring `arc_city_design.md` §2.4:

1. **Predict-then-place. BUILT, and it reveals.** After a run of six edits, a one-tap
   prompt: has the runoff coefficient gone up, down, or stayed about the same since the last
   check? The prompt names the value it is comparing against, and answering reveals what
   actually happened and by how much. Logged as a cheap honest signal, never punitive, never
   scored, and the panel says so on screen. The first version stored the coefficient as it
   stood *after* the changes, which made the question unanswerable; see §19.
2. **Move-budget mode. BUILT.** A `Limited moves` button restarts the open town from its
   baseline with 45 edits. Every edit path is gated, not only land use, so roads and green
   infrastructure spend from the same budget. **An edit that changes nothing costs nothing**,
   which matters: charging for a no-op would punish a student for checking. Undo restores the
   whole plan including its edit count, so a spent move comes back with it and the budget
   stays honest in both directions. The count is a live `role="status"` region, and an
   attempt made with no moves left announces why rather than failing silently.
3. **The memo is the deliverable.** A plan is only marked complete when the student has
   named the binding constraint and the trade-off they accepted. A plan that meets every
   hard requirement with an empty memo is "constraints met, rationale not given."

---

## 5. Standards Alignment (targets, to be verified)

Stated as alignment *targets*. Verify against the pilot's adopted framework before any of
this appears in teacher-facing copy.

- **NGSS:** MS-ETS1-1 and MS-ETS1-2 (criteria and constraints, evaluate competing
  solutions), MS-ESS3-3 (monitor and minimize human environmental impact), MS-ESS3-4
  (per-capita resource consumption), HS-ETS1-3 (evaluate a solution against prioritized
  criteria and trade-offs), HS-ETS1-4 (use a computational model to test a proposed
  solution).
- **Math:** 6.RP and 7.RP (ratio and proportional reasoning, per-capita rates), 6.G and 7.G
  (area), 6.SP and 7.SP (summarizing data), HSN-Q (quantities, units, level of precision),
  HSS-ID (interpreting data).
- **C3 Framework:** D2.Geo.4-6 (spatial patterns, human-environment interaction),
  D2.Civ.10-14 (public policy and deliberation), D4.6 and D4.7 (taking informed action).

HS-ETS1-4 is the strongest single alignment in the catalog for this tool, and the
Assumption Lab is precisely what that standard's "computational model" language is reaching
for.

---

## 6. UDL & Accessibility

Not a fallback layer. The table path and the keyboard path are peer ways to do the same
work, and the mechanic in §2.3 was chosen to make that true rather than to make it possible.

- **Table twin.** Every map view has a parcel table: id, grid coordinates, land use, area,
  elevation, in-floodplain flag, network walk distance to nearest park and school. **The
  plan is fully editable from the table.** Same posture as `gisStudio`'s data-table twin.
- **Keyboard. Built.** Every parcel is a real `<button>`, so Tab reaches it and Enter or
  Space selects it without an `onKeyDown` of its own. On top of that the grid answers
  **arrow keys** (move the cursor and focus), **Home / End** (jump to the west or east edge
  of the row), **digits 1-9 then 0** (assign land use in palette order), **G** (toggle green
  infrastructure) and **?** (open the shortcut list, which is also a real button for people
  not using a keyboard). Nothing uses `div` + `role` + `tabIndex`, so the dead-control class
  this repo has shipped before cannot occur, and a render test asserts that.
- **Undo and redo**, up to 50 steps, holding whole plans rather than a diff log so the
  history cannot drift from the thing it describes. A reset is reachable by undo, and is
  additionally a two-step confirm styled distinctly from the exports beside it.
- **Screen reader.** Every placement announces the delta, not just the action: *"Parcel C7
  set to mixed use. Housing capacity 1,240 units, up 60. Impervious fraction 34 percent, up
  1 point."* The announcer must be the shared `announceToSR`. A local re-implementation that
  only writes to component state drops every announcement silently, a class that has already
  cost this repo a full tool's accessibility.
- **Color.** Land uses are distinguished by label and fill pattern, never by hue alone. All
  palette values come from the validated slots and are checked in both light and dark
  themes. Hardcoded dark values combined with theme variables render invisible in light
  mode.
- **No timers anywhere.** Think time is the accommodation.
- **Reading level.** Brief and prompts target the pilot band, with the tool's own vocabulary
  (parcel, impervious, floodplain, per capita) defined inline on first use.

---

## 7. Rendering: real buttons, not canvas and not SVG

**As built, the board is a CSS grid of 144 real `<button>` elements**, with the road network
in an `aria-hidden` absolutely-positioned overlay above it.

The first draft of this section recommended SVG. That was the right instinct about canvas and
the wrong conclusion about the element. The reasoning against canvas holds and is worth
keeping:

1. Canvas silently ignores `ctx.fillStyle = 'var(--x)'` and draws in the previous fill colour,
   a failure class this repo has a dedicated scanner for.
2. A canvas board means an animation loop, which is the stale-closure class.
3. Neither gives you a focusable, labelable node per parcel.

But SVG shapes are not real buttons either, and the house rule is explicit: every control is
a real button or a labelled input, never `div` + `role` + `tabIndex`. 144 buttons in a grid
is nothing for the DOM, gives correct focus and activation behaviour for free, and needs no
`onKeyDown` of its own because a `<button>` already answers Enter and Space. Land-use fill
patterns are CSS `repeating-linear-gradient`, so colour is never the only channel.

One trap survives the change and is worth recording for anyone who adds a chart later:
**SVG presentation attributes such as `stroke=` and `fill=` cannot take `var()` any more than
canvas can**, so palette values used in attributes must be literal hex resolved at render time.

Roads are drawn as positioned bars between parcel centres. That layer is decorative only:
the network is read out per parcel in each button's `aria-label` and edited from the
inspector, so nothing in the overlay is the sole carrier of any information.

A 3D massing view through the shared bay viewer is a plausible phase 3 addition and is
explicitly **out of v1 scope**. If it is ever built, it must be registered `static: true`
when idle so it does not burn a 60fps render loop on a view nobody is looking at.

---

## 8. Exports & The Plan Memo

Mirrors the `gisStudio` evidence-report pattern.

- **Plan memo, standalone accessible HTML.** Brief, plan map as inline SVG, parcel table,
  constraint report with margins, Assumption Lab comparison if run, and the student's
  written rationale. All interpolated text HTML-escaped. Anonymization setting honored.
  Browser print covers PDF, so this deliberately does not go through the PDF pipeline.
- **Plan JSON. BUILT, both directions.** Full plan state, versioned. Import is
  **merge-only**: it starts from the named town's baseline and lays the imported choices on
  top, keeping only keys it recognises, so a plan file can never introduce terrain, a land
  use, or an edge kind this build does not know. It reports what it skipped rather than
  failing silently, never throws on malformed input, and lands on the undo stack so an
  import is one press away from being reversed.
- **Class CSV (teacher). BUILT.** One row per plan: code, town, hard and soft counts, new
  homes, farmland and preserve converted, homes in the floodplain, park access, capital cost,
  whether the Assumption Lab was run, `memo_present`, the move budget if any, and a
  met/missed column per requirement of that town. **Free-text memo content is excluded**,
  since student writing can contain names, matching the UDL Walkthrough research-export
  posture, and a test asserts that prose planted in a memo never appears in the output. Codes
  are CSV-escaped, and the file carries a UTF-8 BOM so a spreadsheet opens it correctly.

---

## 9. Class View (the teacher panel)

> **BUILT**, as the `Class view` tab. Two things the original specification below got
> wrong are corrected in §20.

- Class constraint-satisfaction grid: which hard requirements the class as a whole found
  hardest to meet.
- **Trade-off distribution:** where students accepted farmland conversion versus flood
  exposure versus budget overrun. This is the discussion-starter and the most valuable
  screen in the tool.
- Assumption Lab usage rate, and among students who ran it, how many named a robust
  conclusion in the memo.
- Signals gated at n ≥ 3 with n shown, matching the UDL Walkthrough convention.
- Copy states plainly: *"This tool reports whether a plan meets stated constraints. It does
  not evaluate whether a plan is good. There is no answer key."*

---

## 10. State, Data Shapes & Known Traps

```js
// Plan state is PURE DATA. No functions, ever.
{
  v: 1,
  scenarioId: 'riverbend',
  parcels: { A1: 'housing_mid', A2: 'park', /* ... */ },
  edges: [ { from: 'C7', to: 'C8', kind: 'local' } ],
  assumptionSetId: 'published_high',
  memo: { bindingConstraint: 'runoff', tradeoff: '...', text: '...' },
  predictions: [ { at: 14, indicator: 'impervious', guess: 'up', actual: 'up' } ]
}
```

- **No functions in state.** Constraint checks, indicator formulas, and validators live in a
  module-scope registry keyed by string id; state stores only the id. Functions placed in
  state are stripped by serialization, and the resulting failure is silent, which has bitten
  the number line and fractions tools.
- **Versioned saves with a migration path** from day one, following the Arc City precedent.
- **localStorage keys** `allo_citylab_{plans,scenarios,settings}_v1`. Local only, no egress,
  consistent with the FERPA posture.
- **Derived values are computed, never stored.** The scorecard is a pure function of
  `(plan, scenario, assumptionSet)`. Nothing about it is cached in state.
- **Hoisting:** anything derived from the parcel table must be built after it, not before.
- **Any tool-state read inside an event handler uses the updater form.**

---

## 11. Testing & Gates

Pure seams are exposed on `window.__alloCityLabPure` (and repeated on the tool's `models`
key), following the `stem_tool_geologyexplorer.js` pattern: the suite evaluates the module
source with `new Function(...)` against a stubbed `window.StemLab` and reads the hook, so no
React is needed to test the model.

As built these live in **one file, `tests/city_lab_core.test.js`, 30 green**, rather than the
seven files the first draft proposed. One file per invariant would have meant seven copies of
the same fixture builders, and the fixtures are the part most likely to drift.

| Describe block | Invariant |
|---|---|
| registration and shape | Registers exactly one id; the river is never an assignable land use; all three terrain maps agree at 144 parcels |
| **tier separation** | **Rendered indicator ids ∩ `CONTESTED_IDS` = ∅**, on the rendered list and on the scorecard object itself. Also asserts `CONTESTED_IDS` is non-empty so the guard cannot pass vacuously |
| determinism | Same `(plan, set)` yields an identical scorecard; reports never mutate the plan; every edit returns a new plan |
| **the assumption tiers are real** | Flipping the set moves at least one Tier 2 indicator and **zero** Tier 1 indicators, checked across all three reference plans. This is the test that proves the tier split is a structure and not a label |
| the scenario admits more than one answer | Three materially different plans each satisfy every hard constraint; their costs diverge by more than 5%; they span both banks; the brief carries no key matching `solution|answer|optimal|best` |
| low density fails on arithmetic | Dry buildable land times low density is less than the target, under every assumption set |
| walk distance is network distance | An unconnected adjacent parcel is unreachable rather than nearby; homes no road reaches do not count; any edge touching the river costs a bridge |
| floodplain accounting | Existing floodplain homes are grandfathered and reported separately; new ones count against the requirement |
| serialization | Round-trips exactly; a recursive walk finds no function anywhere in plan state; the plan carries `v: 1` |
| deploy mirror | `desktop/web-app/public/stem_lab/stem_tool_citylab.js` matches root byte for byte |

### 11.1 The render suite

`tests/city_lab_render.test.js`, 22 green. Real React 18 from
`desktop/web-app/node_modules`, driven through `renderToStaticMarkup`. It covers what the
model suite structurally cannot: that the panel renders at all, that every tab body renders
without throwing, and that the markup holds its accessibility and integrity promises.

Two mechanics are worth knowing before editing it. Tabs are internal state, so the suite
**swaps `React.useState`** to return a chosen initial value for the first `'design'`-valued
state, which selects the tab under test. And several assertions **seed a built-out plan into
`localStorage`** first: on the untouched baseline the capital cost is `$0` and the runoff
ratio is `100%` under every assumption set, so nothing moves, and the delta formatting these
tests exist to guard never runs. An early version of the suite passed for exactly that
reason, which is its own small lesson about vacuous green.

### 11.2 The interaction suite

`tests/city_lab_interaction.test.js`, 25 green. Mounts the panel for real with
`react-dom/client` + `act` in jsdom and drives it with DOM events, so effects run, state
advances, focus moves and `localStorage` is actually written. This is the only suite that can
see any of that.

It covers: pointer selection and the inspector following it; arrow keys moving focus *and*
selection together; edge clamping at all four borders; Home/End; digit keys assigning land
use in palette order (including `0` meaning the tenth, not the zeroth); `G`; `?`; undo and
redo restoring real state, including reaching back past a reset; the two-step reset arming
and cancelling; persistence surviving a close and reopen; a corrupt stored plan not crashing
the open; announcements carrying the delta rather than the action; and the table select
editing the same plan the map edits.

Two notes for anyone extending it. `act()` is required around every event or React batches
the update out from under the assertion. And **unmount before remounting** to test
persistence: two live copies put duplicate element ids in the document, which is not a state
the app can reach and makes the assertion test the harness instead of the tool.

**Focus indication is the platform default, on purpose.** The parcel buttons never set
`outline`, so the browser's own focus ring shows. Selection is drawn with `box-shadow`
instead, so the two stack rather than replace each other. A test asserts no parcel suppresses
its outline, and the ring was confirmed visible in Chromium against the real CSS bundle.

**Still owed:** live browser smoke in Canvas, and hand-translated i18n content.

Repo-wide sweeps this tool must not regress: the canvas `var()` color scanner, the component
identity scanners, the free-vars gate, the STEM tile catalog gate, the mirror drift check,
and the mojibake scanner. Author the file ASCII-clean and it stays out of the mojibake
backlog rather than adding to it.

---

## 12. Wiring Checklist

A plugin-only STEM tool needs **three** registrations, and this repo has been bitten once at
each:

1. Catalog tile in `_allStemTools` in `stem_lab/stem_lab_module.js`. Missing means the tool
   is unopenable, which is exactly how `gisStudio` shipped invisible. **No apostrophes in
   comments inside `_allStemTools`**, since the catalog gate tracks quote state while
   scanning and an unpaired one blinds it.
2. `_pluginOnlyTools`. Missing means the tile opens blank.
3. The file listed in `stemToolModules` in `AlloFlowANTI.txt`. Missing means it never
   registers.

Then `cp stem_lab/stem_tool_citylab.js desktop/web-app/public/stem_lab/` after **every**
edit. `tests/stem_tool_reachability.test.js` checks all three registrations.

Before touching `stem_lab/` at all: `git status --short -- stem_lab/ | wc -l`, since other
sessions share this tree.

**i18n:** ui_strings entries hand-translated only, never delegated. Note that `ui_strings`
overrides prose, so a string changed only in the module will appear not to change.

---

## 13. Phasing

**Phase 1 (v1). BUILT, uncommitted, browser smoke owed.** Riverbend scenario. Tier 1
indicators complete; Tier 2 is runoff, capital cost and population. Constraint report with
margins. Table twin that is fully editable. Assumption Lab with three published-range sets
(central, conservative, optimistic). Predict-then-place. Plan memo as standalone accessible
HTML, plus plan JSON export. Versioned localStorage save under `allo_citylab_plan_v1`.

The Assumption Lab was **not deferrable**. Shipping the scorecard without it means shipping
bare numbers with no epistemic frame, which is the exact failure mode this design exists to
avoid.

Deliberately left out of v1 and worth knowing about: transit stops, the teacher panel, class
comparison, i18n content, and any render-level test.

**Phase 2.** Trip generation and mode-share modeling with its contested-rate-table caveat
surfaced in the panel. Two more scenarios covering a different geography, ideally one
coastal and one arid, so water is not always the binding constraint. Teacher panel and class
comparison.

**Phase 3.** Historical case-study reading layer, redlining and urban renewal as documented
record. Story-map style export. Optional 3D massing view through the shared bay viewer.

---

## 14. Open Questions for Aaron

1. **Grade band.** Written toward the King Middle 8th-grade pilot. Should it stretch up to
   high school ETS1 work, and if so does the runoff model need a second tier of rigor?
2. **Framing.** Science and engineering, or civics and geography? It genuinely fits both,
   and the catalog has no social studies chip today. Adding one is a catalog-wide decision.
3. **The historical equity layer.** Redlining and urban renewal are documented history, not
   contested science, so they clear the integrity bar. Are they in scope for the pilot
   audience, and does the pilot team want to be the ones to introduce them?
4. **"No score" versus the gradebook.** The design deliberately produces no numeric score.
   Teachers who want a gradebook number will ask. Is "constraints met: 4 of 4 hard, 1 of 2
   soft, memo submitted" an acceptable answer, or does the pilot need something else?
5. **Scenario authorship.** Riverbend is fictional, which avoids misrepresenting a real
   town's actual constraints. Is a fictional town the right call, or is there more value in
   a real Maine geography with real terrain data through the `gisStudio` import path?

---

## 15. Relationship to Existing Tools

| Tool | Overlap | Boundary |
|---|---|---|
| `gisStudio` | Spatial analysis, choropleths, evidence report | GIS Studio analyzes a place that exists. City Planning Lab designs one that does not. A shared GeoJSON import path is a plausible phase 3 link |
| `archStudio` | Built form | Architecture Studio is one building. City Planning Lab never goes below the parcel |
| `bridgeLab` | Design under constraint, engineering trade-offs | Closest sibling in *structure*. Bridge Lab has one right physics; City Planning Lab deliberately has none |
| `stewardshipHub` | Environmental decision-making by region | Stewardship runs authored campaign scenarios over time. City Planning Lab is a frozen spatial design problem |
| `economicsLab` | Budget, policy trade-offs | The bond constraint is the only economics here. No markets, no prices |
| `geoSandbox` | Area and geometry | Geometry Sandbox is abstract shape work; here area is always land |

---

## 16. What rendering it actually caught

The panel passed 30 model tests and 15 render tests before anyone looked at it. Then it was
rendered server-side against the real compiled Tailwind bundle and screenshotted. That pass
found five defects, none of which any assertion had noticed. Recording them because the
pattern is the point, not the individual bugs.

1. **The road overlay made the map unreadable.** Roads are drawn centre to centre, and the
   land-use code was centred in the parcel, so the two sat on top of each other. The existing
   main street across row 6 rendered as a heavy near-black bar straight through eleven
   parcel labels, in both themes. Fixed by moving the code to the parcel's top-left corner
   and giving roads a cartographic casing (light core, dark outline) that reads on every
   land-use fill.
2. **`$-7420000`.** `fmtMoney` had no negative branch, so a negative delta fell past both
   magnitude thresholds and printed raw. Invisible until the Assumption Lab had a plan
   whose cost actually differed between the two sets.
3. **A ratio delta rendered as a level.** "Runoff versus today" reads `124% of today`, and
   its change was being formatted the same way, producing `-7% of today` for what is a fall
   of 7 percentage *points*. A different and wrong claim.
4. **The change column colour-coded deltas green and orange**, which ranks the two assumption
   sets as better and worse. The tool states two screens away that it does not judge whether
   a plan is good, and the direction of "better" is not even the same for cost as it is for
   park land. Now neutral.
5. **The parcel table had no park-access column**, while the map marked homes with no park
   inside five minutes with a star. That silently demoted the table from a peer path to a
   summary, which is exactly the failure §6 exists to prevent.

Every one of the five is now guarded by a test in `city_lab_render.test.js`.

**The transferable lesson:** four of the five were presentation defects in code whose model
was provably correct, and the fifth was an accessibility parity gap. A model suite cannot see
any of them. Rendering is cheap here (`react-dom/server` plus the shipped CSS bundle plus
Playwright, no dev server and no app boot), so there is no good reason for a STEM Lab panel
to reach a browser without someone having looked at a picture of it first.

---

## 17. What driving it caught

§16 recorded what *rendering* the panel found. Mounting it and actually using it found three
more, and these are more serious than the presentation defects: two are behavioural and one
is an accessibility regression that the render suite had structurally no way to see.

1. **Keyboard focus was invisible.** The parcel buttons set `outline: none` on every
   unselected parcel, which suppresses the browser's focus ring. Tabbing across the grid
   showed nothing at all. The bug hid behind the arrow-key path, because arrow keys move
   selection along with focus and selection had its own visible treatment, so every manual
   check looked fine. Fixed by never setting `outline` and drawing selection with
   `box-shadow`, so the platform ring and the selection ring stack instead of one replacing
   the other. Confirmed visible in Chromium against the shipped CSS.
2. **Green infrastructure could be bought where it does nothing.** The guard was
   `use.natural`, and a park is not natural in that sense, so a student could put a
   $250k/ha overlay on parkland. The credit is floored at the open-field coefficient, which
   parkland already sits at, so it changed no number whatsoever: the tool would have billed
   the bond for a no-op and shown no benefit anywhere. Now gated on whether the coefficient
   can actually fall (`canGreenInfra`), the button explains itself when it cannot, and a
   rezone clears any overlay that has become pointless.
3. **A CSS shorthand that could wipe the map.** The parcel style set the `background`
   shorthand alongside `backgroundImage` and `backgroundSize`. The shorthand resets
   `background-image`, so on a re-render React could reapply it after the pattern and blank
   every land-use pattern, leaving colour as the only channel. React warns about this mix
   and the warning was right. Now `backgroundColor`.

**The transferable lesson**, and it is a different one from §16: all three are invisible to
both a model suite and a markup suite, because all three are about what happens on the
*second* render or on a path a static snapshot never takes. Defect 1 in particular is the
shape worth remembering: a real accessibility bug fully concealed by a second input path
that happened to work. Mounting with `react-dom/client` and firing real events costs about
350 lines and no browser, and it is the only thing in the stack that can see any of this.

---

## 18. The second town, and what it was for

Phase 2 called for a second geography "so water is not always the binding constraint." That
was the stated reason. The real reason was to test a claim §2.2 had been making since the
first draft: that scenario values are **data, not constants baked into logic**. A claim like
that is free to write and only becomes true when something depends on it.

It was not true. Terrain, the brief, the road network, the core parcel and the requirement
checks were all module-level constants, and `constraintReport` was a hardcoded sequence of
six `push` calls with the requirement ids written into the control flow.

### What changed

- **`SCENARIOS`**, a registry holding everything that makes a town a town: terrain maps, the
  road it already has, its core parcel, its brief, its numbers, and the ids of the
  requirements it is judged against. Adding a third town means adding an entry and nothing
  else, which is now asserted rather than asserted-about.
- **`CHECKS`**, a module-scope registry of requirement checks keyed by string id. A scenario
  stores only ids. This is the same discipline the plan follows for the same reason: no
  functions anywhere that has to survive serialization. Each check returns its own `unit`
  and whether its target is a floor, so the constraint list renders a new town's
  requirements correctly without the UI knowing what any of them mean.
- **`useLabel`**, so a scenario can rename a land use. Open field is *desert scrub* in Mesa
  Hollow, and calling it a field there would be a small lie in a tool whose entire argument
  is about not telling those.
- **`visibleIndicatorIds`**, so a town without a water problem does not display water
  indicators. `renderedIndicatorIds()` deliberately stays the **union across all scenarios**,
  because the contested-tier guard must not be narrowed by which town happens to be open.

### Mesa Hollow

A desert town of 96 homes on a short main street, an aquifer with a fixed safe yield of
1,400 m³/day, and 23 hectares of irrigated fields along a flash-flood wash. The brief wants
600 more homes.

The arithmetic is the lesson. The fields draw 920 m³/day, existing homes 69, and 600 new
homes another 432. That is 1,421 against a yield of 1,400 **before a single park is
watered**. The town cannot have the homes and keep every field, and no amount of design
skill changes that: the student has to decide how much irrigated land to retire and defend
it in the memo. The soft target asks them to keep at least 12 hectares, so the hard
constraint and the soft one pull in opposite directions on purpose.

This also gave the codebase its first case of `req_farm_min` next to `req_farm_max`. In a
river town the worry is losing farmland to houses; in a desert town the farms are drinking
what the houses need. Same indicator, opposite direction, and neither is a property of the
tool.

**The water model is Tier 2**, with the honest caveat that matters most in this scenario
stated in the panel: safe yield is itself an estimate, it varies between wet and dry decades,
and the model says nothing about **who holds the water rights**. Who is entitled to the water
is a legal and political question, not an arithmetic one, and the tool does not answer it.

**Mesa Hollow flips a hard requirement in the Assumption Lab, and Riverbend never does.** The
reference plan meets every requirement under central and optimistic assumptions and **fails
the water constraint under conservative ones**, because per-capita water demand is exactly
the sort of number nobody has pinned down. That is a sharper version of the lesson than
Riverbend can teach, and it is asserted by a test rather than left to luck.

### What building it caught

1. **Four strings still said Riverbend** while Mesa Hollow was on screen: the map panel
   title, the map caption naming "the mapped 100-year floodplain" where Mesa has a wash, the
   inspector prose, and the footer. Only visible by rendering the second town.
2. **Protected land was not protected.** The palette table has described preserve as land
   that cannot be built on since the first draft, and the code let a student rezone it for
   free. It was reported as `preserveConvertedHa` and judged by nothing, and an indicator
   nobody is measured against reads as a statistic rather than a cost. Found because the
   first Mesa Hollow fixture quietly bulldozed five hectares of protected desert and passed.
   `req_preserve` is now a target in both towns, deliberately soft so the trade-off stays
   available and has to be argued for rather than taken silently.

---

## 19. Auditing the doc against the code

Twice now a real defect has been found by noticing that this document promised something the
module did not do: green infrastructure billed for a no-op that the palette table implied was
impossible, and protected land the palette table called unbuildable that was in fact free to
bulldoze. That is a pattern, not a coincidence, so the whole doc was read against the code
looking for the same shape.

Five promises had nothing behind them. Three are now built, two are marked **NOT BUILT** in
place rather than left to read as shipped.

### Built

1. **Plan JSON import** (§8). Merge-only, so a file cannot introduce terrain, an unknown land
   use, or an edge kind this build does not know. It reports what it skipped, never throws on
   malformed input, and lands on the undo stack. Tested against empty strings, truncated
   JSON, arrays, a wrong version, an unknown town, a file trying to pave the river, and a
   file carrying a green-infrastructure overlay onto parkland that cannot use one.

2. **Straight-line access shown beside network access** (§2.3). The doc had promised the tool
   "can show both and let a student see the gap where a river has no bridge," and only the
   network figure existed. Both are Tier 1 now, sitting next to each other. On a plan with
   homes on the far bank of an unbridged river the two read **89% and 0%**, which is the
   entire lesson in two numbers: straight-line distance is how a planning dashboard reports
   access that residents do not have.

   The suite asserts the mathematical invariant rather than one example: **crow-flies access
   can never be lower than network access**, because a walking route is at least as long as
   the straight line. If that ever inverts, one of the two is computing the wrong thing.

3. **Predict-then-place now reveals** (§4.1). It also had a real bug. The prompt stored the
   runoff coefficient as it stood *after* the six edits and compared the student's guess
   against that, so the very movement being predicted had already been folded into its own
   baseline and the question could never be answered. It now holds a checkpoint from the last
   resolved prediction, reveals the actual direction and both values, and stays explicitly
   unscored. A prediction a student never gets to check is not a prediction.

### Not built, and now saying so

4. **Teacher panel and class CSV** (§8, §9). The largest remaining gap.
5. **Move-budget mode** (§4.1). Cheaper than it was, since the scenario registry from §18 is
   the natural home for the budget number.

**The lesson worth keeping:** a design doc drifts in one direction. It accumulates things
that were decided and then not done, and every one of them reads exactly like a thing that
was done. Grepping the doc's own promises against the module is a ten-minute job that has now
produced four real defects across two passes. It is worth repeating before this ships, not
after.

---

## 20. The class view, and two things the spec had wrong

§9 was written before anything was built, and building it surfaced two places where the
specification asked for something the tool should not do.

**1. "How many named a robust conclusion in the memo."** That cannot be detected from free
text honestly. Any implementation would be keyword-matching a student's prose and reporting
the result as a finding, which is the same class of error the whole tool exists to avoid: a
soft inference rendered as a hard number. It is not implemented and not claimed.

What is reported instead is a fact rather than an inference: **who ran the Assumption Lab at
all**, recorded on the plan when the student presses the button. Alongside it, the
distribution of which constraint each student named as binding, which is honest to count
because it is a structured select rather than prose.

**2. Aggregating the memo.** The class view never reads memo text, and the CSV never carries
it. Only `memo_present` and the binding-constraint choice leave. Student writing can contain
names, and a teacher-facing aggregate is exactly where that leaks. A test plants a name and
a street address in a memo and asserts neither reaches the summary object or the CSV.

### How it works

A teacher loads exported plan JSON files. **Nothing is uploaded**, and the set is held in
React state only, never in `localStorage`: persisting it would leave a class set sitting on a
shared classroom machine, which is a worse default than losing it on refresh. Files are keyed
by filename, which the teacher controls.

Plans for a different town are counted and set aside with a message rather than silently
folded in, because a Mesa Hollow plan judged against Riverbend's brief would produce numbers
that look real and mean nothing.

Distribution signals are **withheld below n = 3**, and n is shown either way. The wording
says why: with fewer than three plans a distribution is a description of individuals.

The screen states its own limits in place: it reports whether a plan meets stated
constraints, it does not evaluate whether a plan is good, it does not rank students, and
there is no answer key. A test asserts the summary object carries no `score`, `rank` or
`best` key, so the stance is structural rather than a promise in copy.

### The move budget

45 edits, from the town as it stands today. Three details that took a second pass:

- **Every edit path is gated**, not just land use. Roads and green infrastructure spend from
  the same budget, or the anti-fishing gate has a hole in it the size of the road tool.
- **A no-op costs nothing.** Setting a parcel to the use it already has, or rebuilding a road
  that already exists, returns the plan unchanged and unspent. Charging for that would punish
  a student for checking what something is.
- **Undo refunds.** The plan carries its own edit count, so restoring a previous plan
  restores the move with it. The budget cannot be farmed by undoing, and it cannot be lost to
  a mis-click either.

---

## 21. Harborlight, where the constraint is time

The first two towns ask whether a plan works. Harborlight asks whether it **still** works.

The board wants 700 homes kept out of the storm surge today **and** out of the reach it is
planned to have by 2050. The higher ground is a narrow diagonal band in the north-west, and
the existing harbour town sits low, as harbour towns do.

### The mechanic

The safe area is not an authored map. It is derived:

```
inFutureSurge(parcel) = elevation <= surgeBaseElevation + planningSeaRiseM
```

`surgeBaseElevation` is a property of the place (1.45 m). **`planningSeaRiseM` is an
assumption-set parameter**: 0.3 m optimistic, 0.6 m central, 0.9 m conservative.

That one line is the most consequential thing in the tool. Everywhere else, changing the
assumption set changes a number. Here it changes **which parcels a student is allowed to
build on**. The safe area runs 73 parcels under the smallest allowance, 45 under the middle
one, and 21 under the largest.

Two plans housing the same 720 families, one on the high ground and one pushed downhill, both
meet every requirement under central assumptions. Under conservative assumptions the second
puts **180 homes inside the 2050 reach** and fails a hard requirement. Robustness stops being
an abstraction about numbers and becomes a question about where the houses are.

### Framing, which matters more here than anywhere else

The allowance is stated throughout as **what the board asked you to plan for, not a
prediction**. The panel says so in as many words: this tool does not forecast sea level, does
not tell you which allowance is correct, and has no opinion about it. What it can show you is
which parts of your plan depend on the answer.

That is the honest position and it is also the more useful one. A tool that picked a number
would be teaching students to trust a forecast. This one teaches them to design so the
forecast matters less, which is what coastal planners actually try to do.

The honest caveat shipped beside the model is blunter than the others: real coastal work
models the surge itself, the shape of the shore, and what the salt marsh absorbs. Flat ground
at an elevation is a starting point, not a coastal engineering study.

### Two implementation notes

- **Elevation needed its own scale.** The inland towns use 3 m bands, which would make every
  parcel identical to a half-metre question. Scenarios now carry `elevBaseM` and `elevStepM`;
  Harborlight uses 0.2 m and 0.3 m steps. Anyone adding a coastal scenario must do the same.
- **Today's surge reach is authored AND derivable**, which is two sources of truth for one
  fact. A test asserts the authored `floodMap` matches `elevation <= surgeBaseElevation` for
  every parcel, so they cannot drift apart.

### The salt marsh

`req_preserve` carries real weight in this town rather than being a general principle: a salt
marsh absorbs surge, so building on it makes the rest of the plan worse in a way the model
does not capture. That limitation is stated rather than modelled, because modelling it
properly is coastal engineering and pretending otherwise would be the exact failure this
whole document exists to prevent.

---

## 22. The other half of Tier 3

Section 3 excludes rents, displacement, jobs, property values, crime and school quality from
the scorecard, and promises they reappear as discussion "naming the disagreement and the
sides". For a long while only the first half of that was true. The tool said those questions
belonged in the discussion and then provided no discussion, which makes an exclusion look
like avoidance rather than a position.

The `Discussion` tab is the other half. Each town gets its own questions plus four shared
ones, and the scorecard's "deliberately not modelled" block now links straight to it.

### The rules these were written under

Anything added here later has to keep them, and tests enforce four of the five:

1. **At least two positions per question**, each held by people who have thought about it.
2. **Each side gets its reasoning**, not a caricature. A test rejects a side whose argument is
   under sixty characters, which is how the thin ones got found.
3. **No side is marked correct.** A test asserts no `correct`, `right`, `answer`, `preferred`,
   `best` or `recommended` key exists anywhere in the structure, so the stance is structural
   rather than editorial.
4. **Every question says what the tool did**, which is almost always "counted something and
   then stopped". This is the part that makes the tab honest rather than decorative.
5. **No statistics and no cited studies.** These are questions, not evidence summaries, and a
   fabricated citation in a tool that lectures about epistemic honesty would be indefensible.
   A test rejects percentages and phrases like "research shows".

### What writing them caught

**Displacement was named as excluded and then never discussed.** The scorecard listed it among
the quantities it refuses to print, and not one prompt mentioned it. It now has its own
shared question, and a test asserts that every quantity the scorecard excludes is touched
somewhere in the discussion. Excluding a topic and then never raising it is not a neutral
choice; it is a quieter version of the thing the tier was designed to prevent.

The sharpest line in the whole set came out of writing that one: **the tool counts dwellings,
not households, and cannot tell you who is in them before or after.** That is a real and
precise statement of the model's limit, and it is more useful than any number the tool could
have printed instead.

### One thing that is not in scope here

§3 also lists documented case studies (redlining, urban renewal, the Dutch and Japanese
zoning contrasts) as a reading layer. That remains **phase 3 and unbuilt**, and it is a
pedagogical decision for the pilot team rather than a technical one. The discussion prompts
deliberately do not stand in for it: they raise present-tense questions, not history.

---

## 23. Visual pass

Three changes, each answering something the panel could not show before.

### The height view

Harborlight's whole question is which ground is high enough, and a land-use map answers that
nowhere. A student could only learn a parcel's elevation by clicking it, one at a time, on
the town where elevation decides everything.

The board now has two views: **Land use** and **Height**. Height paints a hypsometric tint
(the map convention: low ground dark and cool, high ground pale and warm) with the land-use
codes still on every parcel and the bay keeping its own colour. The narrow band of buildable
high ground becomes visible at a glance, and the flood and 2050 rings still read on top of
it, so risk and height are legible together.

They are separate **views** rather than one overloaded fill because stacking height onto
land-use colour would have wrecked both. Text colour flips to dark on the pale end of the
ramp so the codes stay readable. Nothing is lost to a screen reader: every parcel already
read out its own use and elevation, and switching view announces what changed.

### The scale bar

A hectare is an abstraction until you can see how far 100 m is. One parcel wide, labelled
"100 m, one parcel, one hectare". Small, and it makes the hand-checkable arithmetic that §2.1
rests on feel like it is about a place.

### Slack bars, and the mistake in the first version

Each requirement now carries a bar showing **how much room is left before it fails**. This is
what lets a student see which constraint is binding, which is the core loop and the first
question the memo asks.

The first implementation showed *how much of the allowance had been used*, and a screenshot
caught the problem: a full bar meant "target met" on an at-least target and "almost out of
room" on an at-most limit. **The same picture meant opposite things on rows sitting one apart.**
It now reports slack, which means the same thing everywhere: full is comfortable, empty is on
the edge, and a marker appears when a requirement has been passed. A ratio is measured
against the allowed *increase* rather than the whole number, so 123% against a 125% ceiling
correctly shows as nearly out of room instead of looking like plenty.

**What the bars deliberately do not do is name the binding constraint.** The memo asks the
student to identify it; a label saying "this one is tightest" would answer the question the
assignment exists to ask. Showing the slack lets them see it. Saying it out loud would do the
seeing for them. A test greps the source for that label to keep a future contributor from
adding it as a kindness.
