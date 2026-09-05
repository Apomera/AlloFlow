# Basic math STEM tools: UI, UX, and pedagogy review

Reviewed September 4, 2026. Review only; no application changes or deployment.

The tools already offer substantial instructional depth. The highest-value next step is to improve the accuracy and usefulness of the models, shorten the route into an activity, and make practice feedback more actionable. Additional decorative graphics would be a lower priority.

## Scope and evidence

Covered all 10 tools listed under **Math Fundamentals** in `stem_lab/stem_lab_module.js`, plus the adjacent **Area & Perimeter Lab**. Advanced algebra, calculus, geometry worlds, and statistics are outside this review.

- Rendered 69 states, including default views and selected primary modes, in an isolated Chromium harness with the local tool modules, React runtime, English strings, cached utility CSS, and STEM palette.
- Captured desktop views at 1280 × 900 and phone views at 375 × 812 for all 11 tools. Inspected all desktop captures and the Number Line, Multiplication Table, and Money Math phone captures.
- None of those 69 renders emitted a page error. All 11 default phone views had a document width of 375 pixels without horizontal page overflow. This does not establish that their controls are comfortably sized or that every subview is accessible.
- Exercised clock adjustment, ratio question navigation, and an incorrect number-line submission. The number-line check used an injected rounding problem to isolate feedback behavior; its range was not generated through the normal challenge flow.
- Reviewed source for teaching models, numerical display, and feedback. Existing WCAG suites were inspected as background, not rerun or treated as fresh accessibility certification.
- This is a component review, not an end-to-end test of the deployed app. The harness stubs AI, speech, navigation, rewards, and persistence. Dark/high-contrast themes, every nested Fraction Lab/Manipulatives activity, and actual assistive-technology use need separate validation.

Evidence: [render inventory](../scratch/basic-math-review-2026-09-04/inventory.json), [interaction results](../scratch/basic-math-review-2026-09-04/interactions.json), and [reproducible capture script](../scratch/basic-math-review-2026-09-04/review.cjs). Screenshot files use each tool's filename plus `-desktop.png` or `-mobile.png` in the same folder.

## Fix first: confirmed accuracy and clarity problems

### 1. Unit Converter: equal quantities appear as unequal lengths

The default conversion is **1 mm = 0.1 cm**, but the visual comparison shows the first bar at roughly one-third of the second bar's length. The bar code uses a reciprocal unit factor and clamps the result, rather than representing the converted quantities on a shared scale. It also exposes these arbitrary widths as progressbar percentages.

**Change:** draw one physical length with two aligned rulers or two equal-length bars with differently spaced unit divisions. Caption it “Same length; different units.” If an additional graphic compares the size of *one unit*, label it explicitly as **1 mm versus 1 cm** and preserve the actual scale.

**Verify:** 10 mm and 1 cm occupy identical physical lengths; 1 m and 100 cm do too. Zero should not look like a positive quantity. A text alternative should explain quantity equality rather than announce a normalized progress percentage.

Source: `stem_lab/stem_tool_unitconvert.js:1239–1259`. [Screenshot](../scratch/basic-math-review-2026-09-04/unitconvert-desktop.png).

### 2. Time & Schedule: hour-adjustment labels are wrong

The clock shows **−60 hr / +60 hr**, but the handlers subtract/add 60 **minutes**. Clicking “+60 hr” changed 8:25 AM to 9:25 AM in the browser.

**Change:** label these buttons “−1 hr / +1 hr,” or consistently use “−60 min / +60 min.” The visual and accessible labels must match the action.

**Verify:** forward/backward changes across noon and midnight, including 11:25 AM → 12:25 PM.

Source: `stem_lab/stem_tool_timeschedule.js:594–599`. [Screenshot](../scratch/basic-math-review-2026-09-04/timeschedule-desktop.png).

### 3. Fraction Lab: rounding is presented as exact equivalence

The starting fraction, **3/8**, displays **0.375** and **38%** without an approximation marker. Other views explicitly join rounded decimals/percentages with equals signs. This can teach an incorrect equivalence.

**Change:** show `3/8 = 0.375 = 37.5%`. For repeating expansions, use an exact repeating representation or a clearly marked approximation such as `≈ 33.3%`. Apply one consistent formatter across the main model, CRA, examples, data, and probability views.

**Verify:** 1/2, 3/8, 1/3, 2/3, and fractions greater than one; exact and approximate readouts must agree with their symbols and text alternatives.

Source: `stem_lab/stem_tool_fractions.js:3034`, `:3099`, `:4035`, `:7576`. [Screenshot](../scratch/basic-math-review-2026-09-04/fractions-desktop.png).

### 4. Multiplication Table: simulated mastery can be confused with learner progress

The always-visible “Fact mastery discovery” panel sits alongside actual score/mastery features. Its “simulated accuracy” is computed as `min(100, factor × 10)`: choosing factor 8 produces 80% without answering any facts. Although small text identifies it as simulated, the prominent “Building / Mastered / Struggling” labels can still be read as feedback about the learner.

**Change:** move this threshold demonstration into a clearly labeled teacher/data inquiry activity, or replace it in student practice with observed per-fact evidence. Use “Not enough practice yet” before sufficient evidence exists. Keep actual mastery and hypothetical examples visibly distinct.

Source: `stem_lab/stem_tool_multtable.js:1678–1729`. [Screenshot](../scratch/basic-math-review-2026-09-04/multtable-desktop.png).

### 5. Ratio Lab: practice and the displayed model diverge

The initial paint problem asks for the missing quantity in a 3:5 ratio, while the visible table already supplies **12:20**. After clicking Next, the prompt asks to simplify **18:24**, but the model still shows **3:5** and its multiples. The independent workspace is useful for exploration, but its relationship to practice is unclear.

**Change:** provide a “Model this problem” action that loads the current quantities, units, and context. In practice, hide the requested unknown until the learner chooses a hint or solution; preserve a separate free-exploration option. Label the two columns “Blue paint (cups)” and “White paint (cups)” when appropriate.

**Verify:** advancing a problem either updates the model or clearly states that it is an independent workspace. A first practice attempt should not accidentally expose the requested answer.

Source: `stem_lab/stem_tool_ratios.js:605–657` and the challenge renderer around `:1207`. Reproduced in `interactions.json`.

### 6. Remove the unsupported universal three-second fluency claim

Fraction Lab's entry banner says Common Core fluency means recall in under three seconds. The cited Grade 3 fluency standard discusses strategies and knowing one-digit products from memory; it does not prescribe that universal cutoff. It is also a distracting frame for learning fraction magnitude.

**Change:** use “Build accurate, flexible strategies and become more fluent with practice.” Keep optional timed practice explicitly optional and distinct from conceptual understanding.

Source: `stem_lab/stem_tool_fractions.js:11352`. Reference: [Common Core 3.OA.C.7](https://www.thecorestandards.org/Math/Content/3/OA/C/7/).

## Improvements for every tool

| Tool | Strength to preserve | Recommended refinement |
|---|---|---|
| **Number Line** | Exploration, signed numbers, skip counting, and linked fraction/decimal representations. | Collapse the large overview and duplicate navigation after entry. On phones, put the actual editable line and marker controls first. Offer adaptive tick density and a zoomed interval rather than shrinking every tick label. Replace immediate answer disclosure with a visual hint and another attempt. |
| **Area Model** | Skip-count overlays, distributive partitioning, and partial products already connect procedures with pictures. | Remove the second miniature array from the permanent banner or make it a compact summary. Generate teaching captions from the current factors: the default partial-product view shows **23 × 14 = 322**, while its fixed introduction describes **23 × 47 = 1081**. Use consistent row/column language, linked highlighting of rectangle parts and equation terms, and direct number inputs alongside sliders. |
| **Arithmetic Strategy Studio** | Clear operation/mode structure, estimates, error analysis, and contextual remainder decisions. | Make the “concrete → visual → symbolic” progression tangible. Addition/subtraction currently show decomposition text and number chips; animate or step through exchanging ten ones for a ten. Division uses a solid bar with a remainder segment rather than visibly separate groups. Show countable groups and leftovers; distinguish sharing into a given number of groups from making groups of a given size. Use dimensionally meaningful partial-product rectangles for larger multiplication. |
| **Fraction Lab** | Coordinated pie/bar models, fraction wall, equivalence, and many application activities. | Correct approximation notation and the fluency claim first. Rename the lower “Practice” tab under **Learn** to “Build a fraction” so it is distinguishable from the upper **Practice** section. Give first-time learners a short path: build → compare → locate → operate. Keep supporting reference/history material in a secondary resource menu. |
| **Math Manipulatives** | Broad collection of concrete models and explicit regroup/ungroup operations. | Group the long horizontal tool collection by purpose: counting, place value, fractions, geometry, algebra, and teacher resources. Offer a first task such as “Build 14, then trade ten ones for one ten” while retaining a blank workspace option. Make an exchange visibly preserve the total and update the equation. Ensure later tools are discoverable without knowing that the tab strip scrolls. |
| **Multiplication Table** | Visual arrays, fact families, patterns, adaptive options, and a separate real mastery heatmap. | Separate the simulated mastery activity. On phones, prioritize one fact family and a large array, with the full 12 × 12 table available on demand. The current grid fits but is densely compressed. Keep untimed practice prominent; show strategy feedback such as `7 × 8 = 5 × 8 + 2 × 8`. Let learners control progression when they need time to read feedback. |
| **Ratios, Rates & Proportions** | Ratio tables, double number lines, unit rates, percent models, and staged hints. | Link the problem and model as described above. Add context/unit labels and linked scaling arrows so learners see what is being multiplied. Replace “Deterministic challenge” with “Try a problem.” |
| **Money Math** | Recognizable denomination illustrations, currency selection, counting board, and authentic shopping/change contexts. | On elementary entry, put coins and the counting board before the overview dashboard. The phone view requires substantial scrolling before the coins appear. Keep long-term finance and inquiry available through an expandable route. Add a short counting-on trail and a “Make the same total another way” prompt, with equivalent coin sets shown together. |
| **Unit Converter** | Dimensional cancellation, significant-figure options, and real-world references. | Fix the unequal bars first. Bring the conversion inputs above the large introduction on small screens. Add a brief prediction: “Will the number get larger or smaller?” before revealing the result; connect the explanation to unit size. Use an aligned ruler, grouped containers, or another quantity-specific model rather than generic bars for every category. |
| **Time & Schedule** | Analog/digital linkage, elapsed-time jumps, multiple schedule contexts, and retry practice. | Fix hour labels first. Add labeled minute markings and a subtle hour-hand movement cue as optional aids. Link schedule questions to an emphasized interval; let learners make a prediction before revealing elapsed-time jumps. Replace developer-oriented challenge copy with plain student directions. |
| **Area & Perimeter** | Same-scale rectangle comparisons, L-shape decomposition, and fixed-area investigation are strong foundations. | Offer an optional prediction mode before showing both formulas and totals. Animate or step through the boundary separately from revealing interior squares; preserve distinct labels and units. Add “Keep the area, change the perimeter” construction tasks and connect corresponding edges/tiles to equation terms. |

These are proposed refinements, not claims that every tool needs a redesign. Area & Perimeter and Time & Schedule already have comparatively clear activity structures.

## Shared design recommendations

**Keep one active question, one useful model, and its controls together.** The overview cards on Number Line and Money Math repeat navigation and push the activity far down the phone screen. Collapse these into a short title, a one-sentence instruction, and an optional overview. Retain useful orientation without requiring learners to pass through it on every visit.

**Make feedback describe a next action.** In the reproduced Number Line example, answering 30 to “Round 37 to the nearest 10” immediately displays “The correct answer is 40.” First highlight the bounding tens and midpoint, then ask which ten is closer. Provide an explicit solution button and a parallel retry problem. Record independent success separately from success after hints.

**Use visuals to express mathematical structure.** Stable units, equal wholes, countable groups, aligned scales, and linked equation terms matter more than additional illustrations. Every animated exchange should conserve quantity and have a reduced-motion, step-by-step equivalent. Every model should have a useful text alternative.

**Move implementation and teacher terminology out of student tasks.** “Deterministic set,” “discrete 3-state outcome,” and “no reveal — by design” are currently visible in several tools. Replace them with directions about what the learner should do. Keep curriculum codes, implementation notes, and assessment mechanics in teacher/help sections.

**Let the learner choose supports without losing the task.** Preserve the current quantities when toggling models, hints, or display modes. Use selectable assistance such as read-aloud, labels, number input, or a worked step. Avoid equating speed, opening a mode, or moving a slider with demonstrated understanding.

These design proposals apply the [IES elementary mathematics intervention guide](https://ies.ed.gov/ncee/wwc/practiceguide/26), which recommends systematic instruction and meaningful representations including number lines, and [CAST's action-oriented feedback guidance](https://udlguidelines.cast.org/engagement/effort-persistence/feedback/). Those sources support the instructional principles; they do not establish that the proposed interface changes have already improved outcomes in AlloFlow.

## Suggested implementation order

1. **Accuracy and interpretation:** conversion bars, clock labels, fraction approximation notation, simulated mastery placement, the fluency claim, and captions that contradict the active values.
2. **Entry and mobile usability:** compact overview panels, clear Fraction Lab navigation, grouped manipulatives, and a focused multiplication view. Validate that students can identify their first action without help.
3. **Instructional depth:** dynamic regrouping/grouping models, question-linked ratio representations, staged number-line feedback, and prediction-before-reveal options.

Validate the first group with targeted behavioral checks. For the second and third groups, include a brief observed learner/teacher walkthrough: can the learner find the action, explain what the picture represents, and use feedback to improve a second attempt? Automated render and accessibility checks cannot answer those questions alone.
