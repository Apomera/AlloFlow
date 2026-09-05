# Tree Life Lab: engagement and learning review

Reviewed September 4, 2026. Scope: local `stem_lab/stem_tool_treelab.js`, its existing tests, and a headless Chromium walkthrough using the repository's real React/WebGL harness and compiled application CSS. This is an expert review, not an observed student study or a check of the deployed application. No application code was changed.

## Assessment

The tool has a strong teaching foundation, but asks learners to interpret too much before they experience a clear, rewarding discovery. The main opportunity is to organize existing features around a short, coherent experiment. More panels or decorative detail would be lower priority than repairing the learning sequence and making cause and effect trustworthy.

Preserve the species-specific forms, explorable seasons, carbon budget, ring history, controlled A/B snapshots, accessible controls, reduced-motion support, and explanations after tree death. These are useful building blocks that already exist.

## Observed issues and recommended changes

### 1. Repair the first mission and progress tracking

Observed route: fresh oak → “Try a 3-year drought” → “Grow 10 years.” At age 11 the drought had ended, and “Change one thing” was incomplete again. `missionPanel()` derives completion from current drought status or whether condition fields exist, rather than a persistent record of the learner's action. A completed action can therefore become incomplete.

The third step says “Explain the evidence,” but “Start investigation” calls `beginExperiment()`, starts a fresh prediction from the current tree, and clears the last time-jump receipt. In K–2 the button is actually labeled “Tell what happened,” increasing the mismatch. Separately, the explanation step counts as complete as soon as the experiment reaches the explain phase, before an explanation is entered.

Change: use explicit milestones tied to actions and evidence. Offer an initial question, a prediction, one environmental change, a short run, an observed result, and an explanation of that same result. Keep free exploration available. Make milestone completion survive temporary weather ending. Count reflection only after an accessible response is submitted, without demanding a particular answer be correct.

Source anchors: `missionPanel()` around line 7230; `beginExperiment()` around 4953; `runLockedExperiment()` around 4994.

### 2. Put the tree and the result in the learner's first view

At 1365 × 900, the hero, setup, navigation, chapter introduction, and condition strip consumed enough height that the scene began near y=597. Much of the focal tree was below the bottom of the viewport. The consistent green visual language is attractive, but many bordered cards and small labels compete for attention.

Change: compact the header and chapter introduction; make the tree the largest visual element; put one current question, one primary action, and a brief result immediately beside it. Collapse the season field guide and deeper science into optional views. Retain full-screen controls as an exploration option.

Increase the prominence of the focal tree against background vegetation, add a ground/height reference, and offer a ghosted before/after silhouette. Keep zoom scale explicit so camera changes do not masquerade as growth. Use a selectable leaf close-up and schematic root view to explain mechanisms, rather than relying on more realistic scenery alone.

### 3. Keep current conditions distinct from historical feedback

After the first drought trial, current water had returned to 70%, stomata showed 100% open, and the live limiter was CO₂. The Cause → effect panel still said water had changed from 70% to 24%, labeled water “NOW LIMITING,” and described drooping leaves. That panel was retaining evidence of the earlier intervention, but its wording made it read as current state.

Change: timestamp and label intervention receipts (“When the drought began, age 1”), and place current status separately. Show a short timeline distinguishing the three drought years from the seven recovery years. Place the time-jump receipt directly beside the action/scene rather than after the allocation and plumbing panels.

Source anchors: `causeEffectPanel()` around 5608; `yearOutcomePanel()` placement around 8880.

### 4. Align the central science explanation with the equations

The UI says adding anything other than the limiting input will not help. However, `grossPhotosynthesis()` uses `min(light, CO₂) × temperature × water`; temperature and water multiply the whole rate. In a direct engine probe with oak, 50 m² leaf area, 22 °C, 80% light and 420 ppm CO₂, increasing water from 70% to 100% increased gross carbon from 9.554 to 13.649 kg C/year (42.9%), even though CO₂ remained the labeled limiter.

Change: describe a dominant constraint without claiming that all other changes have zero effect. For more advanced learners, show sensitivity to a defined change in each input and explicitly allow interacting constraints. Do not make the biology less credible just to fit a single-bottleneck slogan.

The model also displays shade tolerance but does not use `shadeTol` in annual photosynthesis or growth. Root mass affects maintenance cost and visual root vigor, but does not improve water uptake in the annual engine, despite the text “roots buy water.” These are especially important mismatches because they can penalize a biologically sensible learner prediction.

Change: connect roots to a bounded water-access mechanism with a maintenance cost; connect shade traits to a defined light-response tradeoff. Until implemented, label these as descriptive traits or model omissions and avoid claiming that the corresponding strategy works in the simulation.

Source anchors: `grossPhotosynthesis()` around 282; `maintenanceRespiration()` around 305; `simulateYear()` around 543; shade profile around 11415.

### 5. Give younger learners a different interaction burden

K–2 changes terminology and hides some advanced controls, but still presents five allocation sliders, fractional kg C, m² canopy comparisons, surplus allocation, and the plumbing-capacity model. It also names CO₂ as the default limitation while hiding the CO₂ condition slider.

Change: provide a simple default experience with sunlight, water, a clearly labeled time advance, and visual “food made / food used / food saved” indicators. Reveal quantities and allocation when requested or at older levels. Accept a picture choice or short response as evidence; add oral response only if supported by the host. Avoid requiring writing just to keep exploring.

Use adaptive units: the first seedling displays maintenance as “0 kg C,” even though the model charges nonzero respiration. Grams, additional precision, or “less than 0.01 kg C” would preserve the lesson that living tissue has a cost.

### 6. Reward discoveries sooner

The first drought route moves the oak from 0.4 m to about 0.6 m over ten years. The long-term size goal is 18 m. Under default constant conditions and default allocation, a direct engine probe reached that height at age 101. That is a useful lifetime goal, but the first reward needs to happen much sooner.

Change: recognize meaningful discoveries: first ring, first controlled comparison, identifying recovery, explaining why more light did not help, and establishing a descendant. Store these in a compact field notebook with the learner's evidence. Reward testing and revising an idea, including a failed hypothesis. Prefer specific feedback over generic points or a “best tree” ranking.

Keep growth times scientifically labeled; improve perceived progress with a close-up, ring reveal, or before/after comparison rather than silently speeding the biological model. Consider an optional established-tree scenario for the first drought lesson, while preserving the seedling-to-maturity sandbox.

## Suggested first two minutes

1. Show an established tree with “What happens when rain stops?” and one clear start action.
2. Let the learner predict “more growth / less growth / about the same,” with an optional reason.
3. Run a short, explicitly dated drought. Pause at a visible stomatal or canopy response.
4. Reveal the new ring and a before/after carbon comparison beside the tree.
5. Ask the learner to choose evidence supporting their claim. Give specific feedback.
6. Offer “Bring back rain,” “Compare with the same tree without drought,” or “Explore freely.”

The controlled comparison must preserve the same initial tree, duration, and other settings. A recovery observation alone does not isolate drought effects from age and growth.

## Delivery order and validation

First: fix mission state, the explanation handoff, stale feedback labels, limiting-factor copy, and zero-rounded maintenance values. Second: simplify the first viewport and K–2 default, relocate the outcome receipt, and add short discovery milestones. Third: strengthen root/water and shade mechanisms, richer uncertainty, and any further visual fidelity.

Test the revised flow with representative learners. Observe whether they can find the first action without help, locate their changed input and its result, distinguish a drought from recovery, and support a claim with evidence. Check transfer with a new species or condition, not only repeated use of the same scenario. Measure first meaningful action, abandoned interactions, and successful evidence selection; longer time on page alone does not establish engagement or learning.

The browser walkthrough reported no captured JavaScript page errors. It covered initial Grades 6–8 and K–2 views, the suggested drought route, investigation entry, and a phone-width layout. It did not constitute a full accessibility, performance, or every-tab audit. Screenshots and reproducible probe scripts are under `.tmp/tree-review/`.

## Research informing the recommendations

- CAST, [Offer action-oriented feedback](https://udlguidelines.cast.org/engagement/effort-persistence/feedback/): feedback should be timely, specific, informative, and useful for the learner's next action.
- Moore, Podolefsky, and Perkins, [Implicit scaffolding in interactive simulations: Design strategies to support multiple educational goals](https://arxiv.org/abs/1306.6544): affordances, constraints, cues, and feedback can structure productive exploration without constant explicit instructions.

The proposed changes are design judgments informed by those principles and the observed implementation; their effects on student engagement require user testing.
