# Beehive tool improvement analysis

Reviewed September 4, 2026.

The strongest next step is to make the existing simulation easier to investigate, explain, and use across learner needs. The tool already has substantial content and mechanics. Its largest opportunities are coherence, scientific clarity, meaningful feedback, and access to the same learning goals through different interaction methods.

This review examined the current Beehive source, its model equations, instructional content, interfaces, and existing tests. Five selected suites passed: **138 tests across model logic, reproducibility, science integrity, accessibility, and causal handoffs**. Interactive browser tools could not initialize in this session, so layout and visual recommendations are based on source inspection. This is not a completed visual, screen-reader, mobile, or WCAG conformance audit. Application code was not changed.

**What is already worth preserving**

The simulator includes Beekeeper, Colony Network, and Drone Flight perspectives; 18 science views grouped into four pathways; 3D hive inspection; live management previews and causal feedback; seasonal dynamics, starvation, pollen limitation, disease pressure, and winterization; and links to Companion Planting.

It also includes missions, grade-sensitive notebook prompts, evidence capture, teacher resources, lesson plans, standards references, seeded daily runs, saved comparisons, prediction checking, management-choice audits, and pre-run plan registration. Accessibility work includes keyboard navigation, visible focus, canvas descriptions and alternative controls, pause controls, reduced motion, forced-colors styling, and large targets for many important actions.

These are foundations to improve and connect. A new notebook, another large topic menu, or a replacement accessibility layer would duplicate work already present.

**Priority and sequencing**

| Priority | Improvement | Main benefit | Relative effort |
|---|---|---|---|
| P0 | Correct contradictory guidance and unsupported science claims | Learners can trust feedback and explanations | Small–medium |
| P0 | Distinguish modeled indices from measured quantities and probabilities | Prevents false precision and misleading transfer | Small–medium |
| P1 | Turn one existing scenario into a complete guided investigation | Makes learning outcomes and evidence visible | Medium |
| P1 | Offer an untimed, step-controlled route through the same learning goals | Broadens participation beyond fast visual interaction | Medium |
| P1 | Make the existing stage-first layout the guided default; simplify surrounding information | Reduces competing demands on attention | Medium |
| P1 | Reward evidence, revision, and appropriate decisions | Aligns engagement with learning | Small–medium |
| P2 | Add developmental cohorts, consistent time units, and explicit food processing | Enables deeper causal investigations | Large |
| P2 | Separate environmental randomness and add repeated trials | Improves experimental validity and uncertainty reasoning | Medium–large |
| P3 | Expand landscape ecology and native-pollinator interactions | Connects colony management to ecosystem outcomes | Large |

Effort estimates indicate relative scope, not delivery commitments.

**1. Pedagogy: connect existing features into a learning sequence**

The tool already offers Observe–Decide–Act–Explain, contextual coaching, and prediction/evidence/explanation fields. The opportunity is to make those features operate as a coherent investigation with a visible purpose and a meaningful finish.

Start with three learner-facing choices: “Explore a hive,” “Investigate a question,” and “Take a challenge.” Preserve open exploration. In a guided investigation, reveal controls and explanations when they become relevant, with advanced details available on demand.

Use four recurring outcomes: explain a biological mechanism; make a testable prediction; interpret evidence; and revise or transfer an explanation. Topic visits should continue to represent exploration, while demonstrated understanding should be tracked separately.

For example, extend the existing dearth mechanic into “Why are honey stores falling while bees are still flying?” The learner predicts a change, observes a baseline, selects one intervention, compares matched checkpoints, and explains the balance of incoming food and consumption. Finish with a different colony or season to check whether the explanation transfers.

Grade adaptation currently changes notebook writing support. Extend it to default information density, vocabulary, task length, and mathematical representations. Let learners choose supports independently of grade: an older learner may need simplified language while still reasoning about a complex model.

Keep the notebook’s existing evidence capture and experiment audits. Add a concise teacher-review rubric: testable claim, relevant evidence, plausible mechanism, and recognition of uncertainty. Allow typed, spoken, diagrammatic, and selected-evidence responses to meet the same objective; assess scientific reasoning separately from writing mechanics.

CAST’s guidance supports learner choice, graduated support, varied expression, useful feedback, reflection, and transfer. The proposed lesson structure is a design recommendation based on those principles, not a claim of proven effectiveness for this tool. [CAST UDL Guidelines](https://udlguidelines.cast.org/)

**2. Scientific integrity: fix misleading teaching before adding complexity**

Several concrete issues deserve attention:

- **Drone coaching contradicts the model.** The low-energy mission at source line 24341 recommends skimming a glowing bloom. The model and nearby explanation correctly say route markers never restore energy. Another mission goal still refers to a “nectar training layer.” Generate guidance from the same mechanic definitions used by the simulation.
- **The honey-species quiz is incorrect.** At line 5426, it claims only seven Apis species make storable honey. Stingless bees also store honey. Replace the numeric trivia question with a distinction among honey bees, stingless bees, and solitary bees. [Australian Museum: Stingless Bee](https://australian.museum/learn/animals/insects/stingless-bee/)
- **Some percentages imply evidence the model does not provide.** “Disease Risk” is described as an outbreak probability, but the daily step uses a threshold plus a separate random trigger. “Morale” is a composite game value. Label these as modeled pressure/stress indices, or implement and validate an actual probability with an explicit time horizon.
- **Varroa needs a clear denominator.** A 0–100 simulation pressure scale must be visibly distinguished from a sampled infestation rate. Model thresholds should be labeled as scenario rules.
- **Food stores are conflated.** Nectar income is added directly to honey, and feeding sugar syrup raises “honey.” Distinguish incoming nectar, carbohydrate feed, and harvestable honey, or clearly state the simplified equivalence.
- **The model boundary needs to be visible at decisions.** Colony Network already explains that queens do not command workers and that combat/building are abstractions. However, its mission still centers on reducing a rival hive to zero. A default ecological scenario focused on survival, shared forage, and worker allocation would reinforce the stated learning goal more consistently.

Create a shared content record for important claims: explanation, source, review date, applicable context, simplified wording, and every place it appears. The passing science tests check selected strings and behaviors; they do not establish the accuracy of the entire field guide and quiz bank.

**3. Simulation depth: add mechanisms learners can investigate**

The daily model is a useful aggregate resource/population model. Increase depth where it changes the kinds of questions learners can answer.

**Development and labor.** Brood currently emerges as a fixed fraction of the pooled total each day. A 21-day lookback approximates the season of laying, but does not track actual age cohorts. Add eggs, larvae, pupae, and adult cohorts with caste-specific development. Then add a limited set of worker roles, such as nursing, foraging, and cooling, with delayed transitions.

This would let learners observe a consequence such as reduced brood care today leading to fewer future adults, and eventually fewer foragers. Show those lags in a timeline.

**A consistent clock.** Seasons cycle every 30 simulation days and a “full year” is 120 days, while biological quantities use daily rates and approximately real developmental durations. Choose an explicit time contract. One option is biological days with classroom controls that advance several days quickly; another is clearly labeled seasonal steps with consistently scaled rates. Document the interpretation in saves and comparisons.

**Food and energy.** Make nectar collection, processing, water removal, carbohydrate consumption, and storage distinct where the investigation needs them. Display a resource budget that reconciles initial stores, incoming food, consumption, losses, harvest, and final stores. Explain any intentionally simplified conversion.

**Weather and landscape.** Extend broad site and habitat modifiers into a small number of flower patches with distance, bloom period, nectar/pollen availability, and depletion. Model multi-day weather conditions and water availability. Introduce native-pollinator outcomes so a healthy managed hive is one ecological result among several.

**Parasites and observation.** Separate mites associated with adults from mites reproducing in brood, and represent the delay between pressure, damaged brood, and adult losses. An advanced inspection mode can show estimates with uncertainty while an explanatory view reveals the underlying state.

BEEHAVE offers a useful scientific reference for how developmental stages, nurse availability, forage patches, and multiple stressors can connect. Its structure can inform this educational model; importing its full complexity would need a separate evaluation. [BEEHAVE model description](https://beehave-model.net/)

**4. Experiments: build on the strong comparison system**

The existing daily seed, checkpoint matching, plan registration, and management audits are unusually useful. Preserve them.

The random generator is shared across state-dependent branches. Crowding and disease conditions can change how many random draws are consumed. Consequently, equal seeds do not necessarily mean identical later weather/event realizations after an intervention changes state.

For a controlled comparison, generate the external weather sequence independently by seed and day. Give endogenous processes, such as disease and swarming, separate random streams. Explain when differing outcomes are part of the causal pathway being investigated.

Add a teacher-configurable repeated-trials mode with paired seeds, a distribution of outcomes, and the proportion of runs supporting a prediction. Label this as variability within the model; it is not a validated real-world confidence interval. Separate stochastic variability from uncertainty about the model’s assumptions.

Keep the existing event-free forecast labeled as such. If probabilistic forecasts are added, make the distinction between the biological trend and possible event outcomes visible.

The code already states that Queen and Drone run separate real-time simulations. Carryover explanations should continue to identify exactly what transfers between modes. Do not imply that the daily colony seed reproduces all three experiences.

**5. Accessibility: test equivalent learning, beyond labeled controls**

The existing supports are substantial. The next question is whether a learner can complete the same scientific investigation without relying on continuous motion, quick reactions, precise pointing, or dense reading.

Add an untimed investigation mode for Drone Flight, with selectable maneuvers and discrete advancement, alongside the live-flight option. Let Colony Network advance one decision cycle at a time. Keep access supports separate from scientific difficulty and challenge scoring.

Offer a visible calm preset that starts with sound disabled, limited motion, stable information placement, and fewer simultaneous indicators. Sound currently defaults to enabled. Preserve users’ explicit preferences.

Ensure each science view provides the relationships conveyed by its canvas: entities, changes, relevant quantities, spatial relationships, and a means to query them. The current tests verify descriptions and controls, but a description’s presence cannot establish equivalent understanding.

Many critical controls are already 44–58 pixels high. Extend comfortably sized targets consistently where useful; the global 24-pixel minimum is a floor. The 44-by-44 target criterion is WCAG’s enhanced AAA target-size criterion, not the universal AA minimum. [W3C: Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)

The source lifts many 10/11-pixel DOM styles to approximately 12/13 pixels. Prefer larger instructional body text, adjustable density, and limited uppercase microcopy. Check canvas labels separately from DOM text.

Run real-browser checks with the actual stylesheet, at narrow widths and high zoom, with keyboard, touch, forced colors, reduced motion, and a screen reader. The selected axe suite disables color contrast, region, and scrollable-region-focusable rules. Its pass does not cover those checks.

**6. Engagement: reward inquiry and stewardship**

“Mite Slayer” currently rewards three treatments; other badges reward action counts or opening inspection layers. These can support orientation, but they should not imply competence.

Add achievements for an appropriate decision supported by evidence, a useful non-intervention, a revised prediction, a controlled comparison, and an explanation transferred to a new scenario. Avoid rewarding treatment frequency independently of need.

Use short, replayable investigations with meaningful alternatives. After a poor outcome, preserve the record and offer a checkpoint retry with one changed assumption. Build on the existing collapse diagnosis and flight replay.

Support small-group roles such as observer, modeler, decision-maker, and evidence reporter. These can work through a shared device and exported evidence without requiring networked multiplayer.

Make ecological success multidimensional: colony condition, food reserve, resource cost, pollination, and habitat outcomes. Explain tradeoffs instead of collapsing every decision into one score.

**7. Visuals: make important relationships easier to see**

These recommendations need a visual pass before implementation. The source shows substantial use of gradients, accents, uppercase labels, dense status cards, multiple dashboards, and parallel 2D/3D representations.

Use the existing stage-first option as the starting layout for a guided investigation. Place one current question above the scene, a few task-relevant indicators beside it, and the next action within easy reach. Keep the wider dashboard and field guide available through progressive disclosure.

Define consistent visual meanings across modes: food/resources, health, environmental conditions, and warnings. Pair color with labels, shapes, or patterns. Reserve motion for a process the learner is investigating or a meaningful change.

Add a selectable causal overlay. Selecting falling honey stores could highlight reduced forage input, continuing consumption, and reserve depletion, with the same sequence available as structured text.

Use small annotated trend charts and shared time cursors to connect actions, delays, and outcomes. Extend the existing flight replay and comparison evidence rather than adding another unrelated dashboard.

Offer a simple schematic for explanation and the detailed scene for inspection. Make each rendered bee’s meaning explicit when the scene represents a much larger population. Maintain alternate controls and readable descriptions in both representations.

**A practical first release**

Build one complete “Why are stores falling?” investigation from the existing Beekeeper model:

1. Show one question, a paused scene, and the relevant stores/input/consumption indicators.
2. Collect a prediction using chosen response supports.
3. Run a baseline and capture evidence with the existing notebook.
4. Apply one planned intervention and compare matched checkpoints.
5. Highlight the causal explanation in the scene, text, and a trend chart.
6. Ask for a revised explanation and a prediction for a new situation.

Alongside that lesson, correct the contradictory Drone guidance and honey-species quiz; clarify modeled metrics; revise the treatment-count badge; and verify the full task with keyboard, screen reader, touch, zoom, and reduced motion.

Evaluate the release through observed task completion and explanations: can learners locate their next action, distinguish incoming food from remaining stores, make a fair comparison, and transfer their explanation? Record where different interaction methods block the task. A small pilot can identify usability problems; it should not be presented as proof of learning efficacy.

**Engineering support for the roadmap**

The main module exceeds 28,000 lines and combines scientific content, equations, interaction, canvas drawing, and 3D scenes. Incrementally separate the content registry, daily model, real-time models, evidence/notebook functions, and visual components as those areas are changed. Preserve the current registration interface, model-version metadata, save migrations, and deployment mirror process.

Prioritize tests that establish conservation, delayed effects, valid units, deterministic reproduction, and independent environmental scenarios. Pair these with full-task accessibility checks and expert review of scientific claims. String-presence tests remain useful for regressions but cannot substitute for those forms of validation.

**Source locations used in this review**

- [Daily model and parameters](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:2636>)
- [Experiment comparison and prediction logic](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:3138>)
- [Topic pathways and accessibility preferences](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:5266>)
- [Badges and quiz](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:5382>)
- [Missions and conflicting Drone guidance](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:24315>)
- [Notebook scaffolds](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_beehive.js:24561>)
- [Accessibility test configuration](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/beehive_wcag_a11y.test.js:126>)

Validation command: `npx vitest run tests/beehive_logic.test.js tests/beehive_reproducibility.test.js tests/beehive_science_integrity.test.js tests/beehive_wcag_a11y.test.js tests/beehive_causal_chain.test.js --maxWorkers=1 --reporter=dot`.
Result: 5 files passed, 138 tests passed, reported duration 92.08 seconds.

