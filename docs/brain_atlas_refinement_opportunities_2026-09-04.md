# Brain Atlas refinement opportunities

Review date: September 4, 2026. Scope: current working-tree implementation, default desktop and phone browser captures, a collapsed-overview dark detail capture, and the existing learning and quiz handlers. This is an analysis pass; application behavior was not changed.

## Main finding

The strongest next improvement is to help learners reach the brain, understand the selected structure, and use that understanding in a short activity. The tool already contains substantial anatomy, simulation, comparison, and accessibility work. Its first screen gives navigation and progress summaries more space than the learning object, while the beginner reading and practice experiences still inherit advanced content.

## Evidence and limits

The repository's `dev-tools/stem_tool_shot.cjs` harness was adapted into `scratch/brainatlas-review-2026-09-04/capture.cjs`. It uses the shared STEM host, local React, cached Tailwind CSS, and extracted theme palette.

| Capture | Viewport | Atlas container starts | Document width |
| --- | --- | --- | --- |
| Default desktop | 1280 × 900 | 946 px from top | 1280 px |
| Default phone | 390 × 900 | 1549 px from top | 390 px |
| Collapsed overview, selected region, dark | 1280 × 900 | 523 px from top | 1280 px |

The first two captures show navigation rather than the brain in the initial viewport. Overview collapse makes a substantial difference. The measured route copy and top-bar subtitle are 10 px; mission copy and route titles are 12 px. Four progress cards stretch vertically alongside the overview and leave substantial empty space. The phone capture has no document-wide horizontal overflow, but navigation consumes most of the first two screen heights. The directory has its own 460 px vertical scrolling region.

The harness does not load the full translation dictionary or real icon components. Translation keys and an empty back-icon slot in these captures are harness limitations, not confirmed production defects. Font wrapping and exact offsets should be rechecked in the full app. Counts of elements with layout boxes include horizontally clipped carousel items, so they must not be interpreted as counts of simultaneously visible choices. This was not a complete WCAG audit, a classroom usability study, or a live 3D/WebGL review. The findings about 3D practice below come from its handlers and markup.

## Prioritized opportunities

### 1. Put the brain in the first screen — high value, small-to-medium effort

**Observed:** Default overview, mode actions, category choices, learning-path carousel, large metrics, diagram library, and orientation explanation precede the atlas. The screenshot contains repeated orientation descriptions and several competing navigation systems.

**Refinement:** Make the default workspace compact: one title and orientation row, a small view selector, the diagram/model, and a contextual detail area. Keep the fuller library and overview behind an explicit disclosure. Replace the four tall metrics with a compact progress line. Retain the existing jump controls.

**Acceptance:** At common laptop sizes, the brain itself—not just its frame title—is visible before scrolling. On a phone, the compact entry offers a visible model preview or a single obvious action that reaches it. Expanded browsing remains available and remembers the user's choice.

**Code anchors:** `overviewCollapsed`, `brainatlas-mission-inner`, `brainatlas-metric-grid`, `brainatlas-view-panel`.

### 2. Make “Open diagram” complete the navigation — high value, small effort

**Observed:** Learning-path buttons set the view and reset selection/search but do not invoke the existing scroll/focus helpers. A learner can choose a route while the changed diagram remains below the viewport. The selected-region directory and detail panel also rely heavily on page position; directory buttons set state, while the back action clears selection.

**Refinement:** A deliberate “Open diagram” action should reveal and focus the diagram's heading. A region selection should produce a clearly visible selected-state cue and a reachable “Read about this region” action. Restore focus to the originating directory entry when returning. Use an adjacent detail panel at wide sizes; evaluate an inline expandable card on phones. Avoid automatically moving focus on hover or every canvas selection.

**Acceptance:** Complete choose-path → select-region → read → return with keyboard and touch without losing the learning context. Respect reduced motion and avoid focus hidden beneath sticky chrome.

**Code anchors:** `GUIDED_ROUTES.map`, `scrollToBrainAtlasSection`, `scrollToBrainAtlasDetail`, `brainatlas-region-list`, `brainatlas-detail-close`.

### 3. Increase reading comfort and simplify visual hierarchy — high value, medium effort

**Observed:** Many labels and supporting instructions use 9–10 px text; the route titles and mission prose use 12 px. Several adjacent elements combine uppercase labels, heavy weights, colored borders, gradients, and badges.

**Refinement:** Establish a small type scale: approximately 14–16 px for explanatory text and 12–14 px for compact controls, with adjustable reading size. Reserve uppercase for occasional short category labels. Use accent color primarily for selected anatomy, active mode, and meaningful feedback. Make other surfaces quieter. Prefer fewer visible controls to reducing their text size.

**Acceptance:** Verify the revised scale at 390 px and 320 CSS px, with zoom, dark and contrast themes, long translations, and keyboard focus. Preserve horizontal scrolling for diagrams when genuinely needed, while prose and ordinary controls reflow. Evaluate touch target size and spacing separately from font size; small text alone is not a WCAG failure.

**Basis:** [W3C reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### 4. Give “Plain view” genuinely plain explanations — high value, medium effort

**Observed:** Plain/Advanced is already implemented. However, takeaway cards call `brainAtlasShortText` on existing function, conditions, and damage text. Shortening technical text to 116 characters changes length rather than reading difficulty. Even the introductory takeaways emphasize conditions and damage.

**Refinement:** Add authored fields for a big idea, an everyday example, and one important connection. Begin with the lateral-view regions. Preserve advanced anatomy and clinical information in the existing Advanced view. Define specialist vocabulary in an optional glossary. Keep essential explanations available without AI.

**Acceptance:** A learner can explain a region's contribution using the plain card without first understanding clinical abbreviations. The content retains the distinction between a region's contribution and the wider network. Science review is required for newly authored explanations; this review did not validate new neuroscience claims.

**Code anchors:** `detailMode`, `brainatlas-detail-takeaways`, `brainAtlasShortText(sel.fn, 116)`, `Explain at my level`.

### 5. Align quiz prompts, answer methods, and the skill being practiced — high value, medium effort

**Observed:** The standard Brain Quiz selects from all regions with a `damage` field, asks what happens when the named region is damaged, and chooses distractors across that global pool. Saved-set 3D practice names the target and offers an accessible answer list containing that same name. The latter offers a useful navigation alternative, but selecting matching text does not demonstrate the same spatial knowledge as locating anatomy on the model. The recent first-try summary should therefore be interpreted as activity performance, not mastery.

**Refinement:** Offer explicit practice goals: locate anatomy, connect function to structure, and interpret a case. Keep beginner questions within a studied view or saved set; offer broader mixed practice deliberately. Use plausible distractors and feedback explaining the difference between them. Design equivalent accessible questions around nonvisual location descriptions or functional clues, depending on the learning goal. Preserve accessible controls and avoid requiring typed anatomical spelling.

**Acceptance:** Every question has an explicit learning target. Answer labels do not merely repeat the prompt when retrieval is intended. Results distinguish input/activity type, hints, and retries without claiming diagnostic or mastery meaning. Both interaction methods support a meaningful way to demonstrate the intended skill.

**Code anchors:** `quizPool`, `brainQuizOpts`, `brain3DSavedQuizTarget`, `Accessible saved structure answers`, `BRAIN_3D_CHALLENGE_POOL`.

### 6. Turn one learning path into a short guided lesson — high value, medium effort

**Observed:** The 16 learning-path cards are currently view shortcuts. The tool also has valuable teacher prompts and richer pathway controls, but choosing a path does not itself provide a lesson sequence.

**Refinement:** Pilot one route with four brief stages: notice → predict → inspect → explain. For example, ask a learner to locate a feature, choose a prediction, inspect the relevant representation, and explain which clue changed or supported the prediction. Use optional sentence starters and a small checkpoint at the end. Avoid requiring long written responses just to navigate.

**Acceptance:** One route has a clear objective, an observable learner action, explanatory feedback, and a completion state. Its progress resumes after leaving the view. Teachers can skip or adapt the scaffolds.

**Basis:** [IES guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) supports retrieval practice and explanatory questions; [CAST UDL guidance](https://udlguidelines.cast.org/) supports graduated practice assistance and multiple ways to communicate. The proposed route is a design hypothesis informed by those principles, not an evaluated intervention.

### 7. Connect 2D, 3D, and explanation around one selection — medium-to-high value, medium effort

**Opportunity:** The tool already has model-to-region mapping, guide cards, comparison, camera presets, and pathway playback. A consistent “you are here” cue could help learners understand how these representations relate.

**Refinement:** Preserve the selected structure across representation changes whenever mapping exists. Show orientation and hemisphere consistently. Offer “Show this in 2D/3D” from the learning card, with an explicit explanation when no direct counterpart exists. Ensure selection uses labels or outlines as well as color. Build this around the existing mapping rather than duplicating anatomical data.

**Acceptance:** Inspect representative cortical, deep, and unmatched model structures in a real WebGL session; verify switching does not silently lose context or imply that schematic geometry is anatomically exact. This is a follow-up test target, not a confirmed broken mapping.

### 8. Make progress useful for the next learning decision — medium value, medium effort

**Observed:** Overview metrics emphasize visited views, current targets, quiz score, and selection. These describe activity. The new saved-set finish/retry flow provides a better place to offer a learning next step.

**Refinement:** Show visited, practiced, and explained as distinct states. Let a learner revisit a missed concept with a relevant plain-language card and then retry. Add an optional confidence check and a short “What helped?” reflection after a round. Keep these as learning aids rather than a new grading system.

**Acceptance:** Seeing a view does not count as demonstrating understanding. Restarting or changing a set does not inflate progress. Reflections are optional and persist through the existing project state; avoid adding new external storage or analytics solely for this feature.

## Suggested implementation sequence

1. Compact default workspace, compact metrics, larger supporting text, and route scroll/focus behavior.
2. Authored plain-language cards for one orientation plus a function-focused practice mode.
3. One complete guided lesson with equivalent accessible prompts and meaningful completion feedback.
4. Validate selection continuity in live 2D/3D use, then extend the pattern to other routes.

Keep existing science disclaimers, reduced-motion behavior, diagram text alternatives, Plain/Advanced switching, theme support, model loading recovery, and saved-set retry behavior. Evaluate the first slice before adding another navigation layer or another large content catalog.

## Verification for the next implementation pass

Use the current Brain Atlas regression suites, then add behavior checks only for the changed workflows. Browser checks should cover desktop and phone, long text, keyboard selection and focus return, reduced motion, 200% zoom/320 CSS px reflow, dark/contrast themes, and the relevant 3D loading states. A short observed learner/teacher walkthrough should test whether users can find the diagram, explain one structure, and complete a practice round without assistance.
