# Dinosaur Lab: visual, pedagogical, and engagement review

Reviewed September 27, 2026. This is an analysis and proposed redesign, not an implementation change.

## Overall judgment

Dinosaur Lab has an unusually rich foundation for a browser learning tool: 362 prehistoric-animal entries, 18 sections, a procedural 3D station, 34 quiz questions, 51 glossary terms, fossil-evidence activities, comparison tools, and a downloadable field notebook. Its strongest idea is that paleontology involves interpreting incomplete evidence. Preserve that idea and make it the organizing principle of the experience.

The highest-value improvement is to connect the existing material into short, visually compelling investigations in which the learner makes and revises an explanation. Much of the current experience consists of choosing sections, reading cards, recognizing answers, or completing interface actions. Those activities can support learning, but the product sometimes labels their completion as evidence of stronger reasoning without actually eliciting that reasoning.

There are also confirmed content defects that should precede cosmetic work: the Bird Link list uses incidental words to infer feather evidence, and Ecosystems treats the placeholder formation “Various” as one real community. The 3D focus view has a visible light-theme contrast problem.

## What was inspected, and limits

- Opened the deployed [Dino Lab](https://alloflow-cdn.pages.dev/dino-lab) and inspected all 18 section outputs, controls, and activity structures.
- Compared the deployed Dinosaur Lab script with the local source. SHA-256 matched: `84633eb9ac22719194da3f322d1bfe79932174fb74f19b821becc91e527c1932`. Findings therefore apply to that deployed/local version.
- Visually inspected desktop entry, 3D entry, and focused 3D views; exercised scan actions and inspected feedback and accessibility descriptions.
- At a 390 × 844 emulated phone viewport, checked Explore, Dig, Timeline, Classify, Bird Link, Compare, and Notes for horizontal overflow and button dimensions. This was a DOM/reflow check, not a complete device or assistive-technology audit. A later screenshot request stalled; no claim of comprehensive phone screenshot verification is made.
- Read the main implementation and relevant tests. Ran 10 existing focused test files: **96 tests passed**. These cover science-integrity contracts, field guide, dig, evidence challenge, ecosystem time span, quiz integrity, color evidence, deep time, fossil coverage, and Anatomy Quest. Passing them does not establish scientific accuracy across the entire catalog or learning effectiveness.
- Created a reproducible [data inventory](./data-findings.json) with [audit-data.cjs](./audit-data.cjs). It reads the application source without modifying it.
- No classroom observation, student interviews, performance benchmark, full screen-reader trial, multilingual audit, exhaustive species fact-check, or longitudinal learning study was performed. Engagement and learning benefits below are design hypotheses to test.

## Strengths to preserve

1. **Evidence and uncertainty are already first-class ideas.** Species entries include “how we know” and uncertainty notes. Covering modes distinguish evidence-led, conservative, historical, and speculative interpretations, with source links for selected taxa.
2. **The notebook asks useful questions.** Question, evidence noticed, explanation, and remaining uncertainty are better foundations than a fact-collection worksheet. Notes are specimen-specific and exportable.
3. **Comparison is more careful than a dinosaur leaderboard.** Shared scales, geological age ranges, fossil-coverage notes, missing-speed handling, and cautions about co-occurrence are valuable.
4. **Accessibility has substantial existing work.** The lab includes keyboard tab navigation, named controls, live feedback, camera keyboard commands, motion controls, focus mode, and host narration controls. Sampled phone buttons were at least 44 pixels tall.
5. **Several activities already ask learners to commit before seeing feedback.** Sites, Anatomy, Records, classification, and the quiz offer a starting point for formative assessment.
6. **The 3D station can be the instructional centerpiece.** Scale references, anatomical layers, close-up studies, reconstruction alternatives, and the Explore → Scan → Assemble → Claim sequence provide enough infrastructure for strong investigations.

## Priority findings

### 1. Correct the Bird Link membership rule — immediate

**Observed:** “Meet the feathered dinosaurs” showed Dreadnoughtus, Eolambia, Tornieria, Mercuriceratops, and other surprising inclusions. The filter searches description/trait strings for `feather`, `plumage`, `quill`, `filament`, `fuzz`, or `wing`.

**Confirmed mechanism:** `wing` matches “growing,” “showing,” and “foreshadowing.” Ten entries are included by this incidental substring alone. Mercuriceratops also qualifies because its frill is described as wing-like. These matches do not establish feather evidence. Some affected taxa may independently merit discussion of inferred coverings; the prose match cannot make that scientific decision.

**Change:** Add explicit covering-evidence metadata: direct impressions, attachment evidence, inference from relatives, disputed interpretation, or unknown. Populate the list from that metadata and label the category on each entry. Keep direct evidence separate from broader bird-relationship examples. A word-boundary patch alone would still misclassify metaphorical “wing-like” features.

**Acceptance:** Dreadnoughtus and Mercuriceratops do not appear as feather-evidence examples due to these strings. Every included animal has a specific reason and source or an explicit inference label. Regression tests cover incidental words and metaphors.

Source: [Bird Link filter](../../stem_lab/stem_tool_dinolab.js#L13008); inventory: [data-findings.json](./data-findings.json).

### 2. Correct the ecosystem model — immediate

**Observed:** “Various (5)” appears among the selectable shared sites. The implementation groups records by the literal `formation` string. Its five animals span Asia and Europe and approximately 171–66 million years ago, yet the panel says the animals are found in the same formation. A time-span caveat cannot repair this grouping.

**Also observed:** The energy pyramid puts catalog species counts in its trophic tiers, uses fixed widths of 34%, 64%, and 100%, and concludes that the relative numbers of kinds fit an energy-pyramid prediction. The largest listed hunter by length becomes the displayed apex predator.

**Change:** Use validated formation identifiers and separate placeholders, multiple formations, and uncertain assignments. Require appropriate age/locality evidence for community claims. Separate catalog richness from abundance, biomass, and energy. Label an illustrative energy pyramid as schematic, or supply explicit hypothetical energy values with units. Do not infer apex status from length alone. Omnivores can occupy more than one trophic level.

For a useful activity model, HHMI has learners predict trophic relationships and construct a biomass pyramid using specified data; that is materially different from inferring energy relationships from a curated species list. [HHMI BioInteractive](https://www.biointeractive.org/classroom-resources/building-ecological-pyramids)

**Acceptance:** “Various” is unavailable as a single ecosystem. Changing catalog membership cannot silently change an asserted ecological fact. Every chart names its quantity, units or schematic status, and evidential limits.

Source: [ecosystem grouping and pyramid](../../stem_lab/stem_tool_dinolab.js#L13030).

### 3. Separate activity completion from reasoning quality — immediate wording, then instructional redesign

**Observed:** Clicking “Log Skull observation,” “Log Shoulder observation,” and “Log Hip observation” produces **“Claim strength 5/5 | CER ready.”** No learner-authored observation or explanation is required. The score is three logged anchors plus two automatically connected links. A separate checklist marks “Reasoning backed” when scanning is complete. In the same state, assembly is incomplete and the main Claim step remains locked.

The claim builder does offer useful worked examples, but it generates claim, evidence, and reasoning text. The assembly buttons also place the named piece into its corresponding location; they do not ask the learner to choose a socket or defend a placement. These are guided demonstrations, not independent evidence of mastery.

**Change now:** Rename the score to “Evidence route completed” or “Preparation progress.” Label generated explanations “Example explanation.” Reconcile readiness language with the actual workflow locks.

**Change next:** Before logging an anchor, ask the learner to identify a visible feature or select an observation. Before a claim is complete, require a relevant evidence selection and a short explanation or equivalent oral/visual response. Offer an optional example, then fade that support. Track visited, recorded, explained, and revised as different states.

**Acceptance:** Three clicks can complete a scan, but cannot earn a reasoning-quality label. A learner can describe the evidence used, distinguish a model from a fossil, and identify what remains uncertain.

Sources: [readiness calculation](../../stem_lab/stem_tool_dinolab.js#L11589), [scan and assembly handlers](../../stem_lab/stem_tool_dinolab.js#L11654), [generated claim/checklist](../../stem_lab/stem_tool_dinolab.js#L11965).

### 4. Fix focused-view contrast and simplify its first screen — immediate / near term

**Observed:** In the light theme, activating “Focus model” produced a black fullscreen background behind dark labels and selected controls. The exit button retained dark `rgb(15,23,42)` text over a translucent fill; its stage background was transparent. The model itself remained visible. This is a fullscreen/theme integration issue, not an argument against focus mode.

**Change:** Give the fullscreen stage an explicit theme-compatible surface, carry the correct text/control tokens into it, and test both native fullscreen and fallback focus presentation. Keep Exit, current task, and current selection legible in every theme.

**Also change:** Move the model above the majority of view options. The normal station begins with global chrome, 18 tabs, introductory text, species selection, workflow steps, five layer presets, coverings, environment, and label controls before the main specimen. Focus mode is useful, but the ordinary entry should also be inviting.

Source: [focus stage](../../stem_lab/stem_tool_dinolab.js#L12304).

## Visual design

### Put the specimen and the question first

The opening screen shows a large global header, tool-return row, 18-section navigation, mission panel, statistics, and filters before the animal cards. At an observed desktop CSS viewport of approximately 1441 × 891, the first card started around y=1016. At 390 × 844, it started around y=1329. These are session-specific measurements, but both illustrate the same hierarchy problem.

A better opening composition:

- A compact Dino Lab header with **Investigations**, **Explore**, and **My notebook**, plus an All sections menu.
- One prominent specimen/fossil image and a concrete question: “Could T. rex have met Stegosaurus?”
- One clear **Start investigation · about 10 minutes** action and a quieter free-exploration option.
- Three different entry points: time, fossil evidence, and living birds.
- Search visible; detailed catalog filters collapsed until requested.

Keep free exploration. The existing “Choose an investigation path” should become easier to find, and each route should retain a question, current step, and completion artifact. Currently the path buttons mainly navigate to a tab.

### Make pictures carry scientific information

Catalog cards currently reuse four broad group silhouettes. They are honestly labeled “group silhouette,” which is good, but a horned dinosaur, an armored dinosaur, and a duck-bill look alike at this level. On the first alphabetic page, unfamiliar names and repeated shapes give learners little visual reason to choose one.

Start with a curated set of 12–20 high-quality specimen cards. Show distinguishing structures, approximate scale, and a visible “fossil / reconstruction / group diagram” label. Keep the wider catalog searchable. Expand coverage based on actual use rather than treating identical thumbnail quality across 362 entries as a prerequisite.

Pair a reconstruction with a source-backed fossil photo or diagram wherever a lesson asks students to reason from evidence. A rendered skeleton proxy is not the original fossil. Clicking a skull should reveal the preserved feature, the interpretation, and its limitation together.

Use consistent anatomical views for comparison. For example, align skulls in the same orientation and scale where feasible; highlight one diagnostic difference. In the 3D station, open introductory investigations with the opaque Life view, then invite the learner to reveal bones and evidence. Keep the translucent technical view available for analysis.

### Reduce competing visual signals

The current interface combines strong purple/blue global branding, a dark green mission banner, pale panels, many emoji, colored pills, several progress systems, and extensive small supporting text. Each may work locally, but collectively they compete with the specimen.

Use a quieter neutral surface, one strong action color, and consistent evidence labels across sections. A period color should mean a period; an evidence status should have its own labeled convention. Pair color with words or patterns. Give primary explanatory text a comfortable base size; reserve the numerous authored 11–13.5px styles for secondary detail. Let the learner reveal advanced anatomy instead of showing every qualifier at once.

### Turn structural information into diagrams

- **Timeline:** Actual age-range bands for a small selected set, rather than a wall of species buttons. The current timeline renders 359 species buttons. Offer “Show all” separately.
- **Classify:** A branching cladogram with highlighted shared characters. The current nested cards should become a support view for the diagram.
- **Map:** A geographic map with labeled sites and a period control. The present “Map” uses continent tiles and counts; its warnings about sampling bias are valuable and should stay.
- **Anatomy:** Fossil images, tooth outlines, tracks, skin impressions, and sediment sections alongside short explanations. Emoji should cue categories, not serve as the evidence.
- **Compare:** Aligned silhouettes and a clear ratio statement alongside the existing charts. Use linear mass bars for an introductory view; explain logarithmic compression before using it in advanced work. Keep the existing log option.

## Pedagogical design

### Give each investigation an observable learning outcome

Three suitable core outcomes are:

1. Use fossil age and location evidence to evaluate whether two animals could have shared an environment.
2. Distinguish an observation, an inference, and an unresolved question.
3. Explain a relationship between anatomical evidence and a claim about an extinct animal or its relatives.

These provide a stronger spine than “open five cards” or “answer five questions.” Grade 3 NGSS already asks students to analyze fossil data to describe past organisms and environments; merely naming species does not satisfy that intent. [NGSS 3-LS4-1](https://www.nextgenscience.org/pe/3-ls4-1-biological-evolution-unity-and-diversity)

### Use a repeated but flexible investigation cycle

**Question → initial idea → inspect evidence → compare explanations → explain → revise → transfer.**

The student should know what they are trying to find out, what evidence they have, and what decision comes next. Preserve their initial idea so revision is visible. Allow access to the reference catalog at every stage.

Example: **Could T. rex have hunted Stegosaurus?**

1. Make a prediction, with an optional “not sure.”
2. Place their known age ranges on a shared timeline, using drag or keyboard selection.
3. Choose the evidence that rules out the encounter.
4. Complete an explanation: “Their known time ranges do not overlap because…”
5. Test transfer with another pair whose ranges do overlap: overlap makes an encounter possible in time, but does not establish shared habitat or direct interaction.

The existing Compare tools already supply much of this. The redesign needs a learner decision and feedback around them.

### Improve feedback and assessment

The 34-question quiz has explanations and more balanced answer positions than its original bank; retain those improvements. It is still predominantly recognition of names, facts, and terminology. Some distractors are implausible, and duplicate concepts recur without an explicit review schedule.

Create short concept-specific sets. After an incorrect answer, identify the misconception, point to a useful feature, and provide a fresh application rather than immediately repeating the same item. Use occasional confidence judgments to distinguish a guess from a confidently held misconception. Revisit key ideas later with a different specimen.

Example feedback: “You used body size. Size alone does not tell us whether an animal is a dinosaur. Compare the hip and limb features, then choose again.”

The IES practice guide supports pairing graphics with explanations, alternating worked examples and independent problems, retrieving key ideas, and asking explanatory questions. It provides a rationale for this design direction, not proof that a particular Dino Lab redesign will work. [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)

### Provide graduated support without lowering the scientific goal

Offer support presets that teachers or learners can change:

| Support | Presentation and response | Scientific expectation |
|---|---|---|
| Guided | Fewer specimens, short sentences, highlighted features, spoken directions, picture/evidence choices, sentence frames | Make a claim using a relevant observation |
| Standard | Compare multiple sources, record observations, explain in the notebook | Connect evidence to an explanation and name a limit |
| Extended | Conflicting estimates, incomplete specimens, alternative reconstructions, source evaluation | Weigh competing claims and explain uncertainty |

These could suit different ages, prior knowledge, language needs, and task familiarity. They should not be presented as fixed ability labels.

Build on existing keyboard, narration, and motion options. Add contextual definitions and pronunciation near unfamiliar terms. Support notebook responses through text, an annotated image/sketch, or a recorded/spoken explanation with an accessible text equivalent. Keep the same reasoning criteria across modes. CAST emphasizes meaningful goals, choice, appropriate challenge, varied representation and expression, and actionable feedback. [CAST UDL Guidelines](https://udlguidelines.cast.org/)

The current T. rex viewer description is approximately 732 words / 5,536 characters and is attached to the interactive viewer. Make the default description concise: animal, visible layers, current target, and controls. Put the detailed anatomical interpretation into navigable headings that can be opened on demand. Preserve detail while reducing the cost of entering the viewer.

## Engagement design

### Make the dig a process of investigation

The current Dig Site has 24 hidden cells, randomly distributed bone icons, six textual clues unlocked by bone counts, and **359 identification choices**. The full panel contains 384 buttons. There are no visible geological cues that make one unopened cell a more reasoned choice than another, and any species can be guessed before evidence is collected. The empty-state instruction also says “dig at least two cells” while the first clue is actually tied to one bone.

Redesign it around a small candidate set and discriminating evidence:

- Show a sediment layer or site context and three to six plausible candidates.
- Reveal a recognizable tooth, claw, track, or bone fragment rather than the same generic bone icon.
- Ask which candidate the evidence supports or rules out, and why.
- Let the learner decide whether more evidence is needed. Preserve uncertainty when the fragment cannot support species-level identification.
- Offer the complete catalog as an optional expert search mode.

Keyboard selection and button-based placement should remain available; realistic gestures are optional. Avoid making success depend on speed or precise motor control.

### Reward contributions to an explanation

The existing quest hooks reward opening five cards, completing a dig, answering five quiz questions, and selecting two comparison entries. Those are reasonable activity milestones but weak indicators of learning.

Add milestones such as “used two independent clues,” “revised an explanation,” “identified an unsupported claim,” and “explained a new specimen.” A notebook entry or museum label should be the lasting reward. Keep browsing counters optional; 0/362 can frame the catalog as a completion burden.

### Give learners an audience and a reason to return

- **Museum curator:** Build a three-specimen exhibit with labels that distinguish evidence from reconstruction.
- **Fossil detective:** Identify what can and cannot be inferred from an incomplete specimen.
- **Bird observer:** Compare a living bird feature with a fossil example.
- **Scientific debate:** Defend one reconstruction, inspect a second source, and revise the display label.

For pairs, assign observer and evidence-checker roles, then swap. These can work around one device and printed cards; live multiplayer is not required. Return visits can continue an unfinished investigation or revisit a concept with new evidence. Avoid adding streak pressure or a leaderboard before establishing a meaningful learning loop.

## Section-by-section direction

| Current section | Preserve | Most useful improvement |
|---|---|---|
| Explore | Search, filters, saved specimens, uncertainty | Show a specimen and a question immediately; curated entry set; richer thumbnails |
| Timeline | Proportional period duration, deep-time caveat | Selectable age-range bands; limit default species clutter |
| Deep Time | Calendar/clock analogy, rounded-age caveats | Predict positions before reveal; zoom between Earth, Mesozoic, and species scales |
| Sites | Formation context and “where would you dig?” choice | Pair a real locality image/map with age and rock evidence; verify formation/species associations |
| Map | Present-day labeling and sampling-bias explanation | Geographic site map linked to period and specimen filters |
| Ecosystems | Formation and diet connections | Repair grouping; construct explicitly supported or hypothetical food-web links |
| Compare | Shared axes, overlap warnings, coverage notes | Prediction before verdict; aligned silhouettes; learner explanation |
| 3D Field Station | Layers, close-ups, scales, covering alternatives | Model first; real evidence beside it; honest completion labels; learner-authored claims |
| Dig Site | Discovery and gradual clue release | Small candidate set, meaningful fragments, evidence-based elimination |
| Classify | Relationships and bird inclusion | Trait-based branching diagram, including exceptions to diet stereotypes |
| Bird Link | Birds are dinosaurs; multiple anatomical clues | Explicit evidence metadata; annotated living/fossil comparisons |
| Extinction | Multiple evidence lines and uncertainty | Evidence board comparing impact, consequences, and other stresses; causal explanation |
| Anatomy | Different fossils answer different questions | Actual specimen/trace visuals and novel inference tasks |
| Records | Caveats about incomplete skeletons | Ranges and methods; ask how a new estimate changes a claim |
| Quiz | Immediate explanations, stable scoring | Short concept sets, plausible distractors, transfer, delayed review |
| Field Notes | Four useful fields, specimen links, export | Pin evidence with source labels; alternate expression; preserve revisions |
| Glossary | Searchable 51-term reference | Contextual definitions, pronunciation, diagrams, return to task |
| Classroom | Printable cards and quiz answer key | Investigation plans, objectives, misconceptions, facilitation prompts, explanation rubric |

## A concrete first investigation to build

**“What can a fossil tell us about feathers?” — approximately 15 minutes, adjustable.**

1. **Notice (2 minutes):** Show an evidence-labeled reconstruction and a fossil detail. Ask which features can be supported directly.
2. **Predict (2 minutes):** Learner selects an initial claim about feather presence, distribution, or color. These are separate claims.
3. **Inspect (4 minutes):** Compare direct impressions or quill-knob evidence with a related animal. Use the 3D model to locate the structure; use the source-backed fossil to justify the inference.
4. **Explain (4 minutes):** Choose or attach one relevant evidence item, explain the connection, and state one uncertainty. Optional sentence frames and worked example.
5. **Transfer (3 minutes):** Show a different taxon with weaker evidence and ask whether the same conclusion is warranted.

The output is a small museum label: **claim, evidence, reasoning, uncertainty**, with a source attached. Success is the quality of the connection, not the amount of text or number of clicks.

## Recommended delivery sequence

| Order | Work | Relative scope | Review criterion |
|---|---|---|---|
| 1 | Bird Link metadata/filter, “Various” grouping, pyramid claims, claim-strength wording, fullscreen theme | Small to medium; metadata validation may be larger | No known false classifications or misleading progress labels; focus controls readable |
| 2 | Specimen-first entry, compact navigation, reduced default controls | Medium | First useful scientific object and action visible on laptop and phone without a long preliminary scroll |
| 3 | One complete investigation joining Explore/Compare or 3D/Notes | Medium | Learner predicts, cites evidence, explains, and applies the idea to a new case |
| 4 | Dig redesign, source-backed visual evidence, contextual glossary | Medium to large | Interactions depend on interpreting clues rather than repeated clicking or scanning hundreds of names |
| 5 | Additional investigations, alternate notebook responses, teacher resources | Larger, iterative | Benefits hold across prior knowledge, access needs, and classroom settings |

Avoid a wholesale rewrite or further species expansion as the first move. The existing catalog, notebook, model layers, and tests can support an incremental change. Keep the root and desktop public copies synchronized when implementation begins.

The main module is approximately 13,204 lines with data, renderers, model geometry, pedagogy, and inline styling together. For maintainability, gradually separate evidence metadata, activity definitions, shared UI, and 3D rendering after defining behavioral contracts. This is a supporting engineering step, not the primary learner-facing outcome.

## How to evaluate the redesign

Pilot the current and revised first investigation with representative learners and teachers. Treat the following as proposed targets and measures, not existing results:

- **Entry:** Can a learner start a meaningful evidence task within roughly one minute without adult navigation help?
- **Orientation:** Can they state the investigation question and identify the next useful action?
- **Explanation:** Score claim relevance, evidence relevance, reasoning connection, and uncertainty separately on a simple 0–2 rubric. Allow equivalent spoken/visual responses.
- **Transfer:** Use a new species pair or fossil at the end, then a short delayed check. Do not count memorizing the same answer as transfer.
- **Engagement:** Record voluntary continuation, purposeful revisiting, questions asked, and completed explanations. Session duration and card-opening counts are secondary.
- **Access:** Check keyboard completion, focus order, zoom, 320/390px reflow, native/fallback fullscreen in all themes, reduced motion, and concise screen-reader entry to the model. Test the actual task, not just isolated controls.
- **Content:** Add regression checks for evidence-category membership, placeholder formations, unsupported co-occurrence, quantity labels, and the distinction between preparation progress and reasoning quality. Require a source/review date for consequential scientific claims and uncertain numerical estimates.

## Verification record

Command used:

```text
node node_modules/vitest/vitest.mjs run tests/dinolab_science_integrity.test.js tests/dinolab_field_guide.test.js tests/dinolab_dig_site.test.js tests/dinolab_evidence_challenge.test.js tests/dinolab_ecosystem_span.test.js tests/dinolab_quiz_integrity.test.js tests/dinolab_colour_evidence.test.js tests/dinolab_deep_time_claims.test.js tests/dinolab_fossil_coverage.test.js tests/dinolab_anatomy_quest.test.js --maxWorkers=1 --reporter=dot
```

Result: 10 files passed, 96 tests passed, approximately 24.83 seconds reported by Vitest. Application files were not edited. Review materials were added only under this report directory.
