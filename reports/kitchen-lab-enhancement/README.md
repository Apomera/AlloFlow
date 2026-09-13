# Kitchen Lab: experience review and 3D skills studio

Reviewed and implemented September 12, 2026.

## What changed

Kitchen Lab now opens with a choice of learning paths and includes an integrated **3D Skills Studio**. Six untimed stations now contain twelve challenges connecting actions, observable consequences, reasoning checks, and transfer prompts. The existing safety lessons, knife references, cooking techniques, browning activities, recipe simulations, resources, and separate Life Skills kitchen remain available.

The studio is a local Three.js scene with orbit, zoom, station selection, close-up, reset, and keyboard camera controls. The learning controls operate the same state in 3D and text view. It needs no AI service, network model download, or new package dependency. The repository's bundled Three.js r128 assets are reused.

## Review findings and response

| Area | Finding in the existing experience | Implemented response |
| --- | --- | --- |
| Orientation | The initial page leads directly into dense safety content; learners must infer an entry point and learning sequence. | A Start here page offers foundations, deliberate practice, and recipe application, with a short educator guide. |
| Navigation | The section count omits the Browning Lab, and tab clicks award XP regardless of learning. | Corrected the section count and removed XP awards for navigating the tabs. |
| Cognitive load | Recipes combine instructions, heat, elapsed time, ingredients, and optional competition. | A separate untimed studio isolates one skill at a time. Time advances only through explicit actions in the heat station. |
| Observable practice | The existing separate 3D kitchen is primarily a safety-decision checklist and is not directly surfaced inside Kitchen Lab. | Added a Kitchen Lab studio with stateful objects: clean equipment, cut geometry, browning, probe placement, jug fill, and leftover storage. |
| Assessment validity | Opening sections, following prompts, and successful independent performance can be conflated. | Evidence distinguishes coached practice, independent demonstrations, supported completion, and reasoning needing review. Hints and corrections remain visible. |
| Food safety | Pan-seared chicken instructs removal at 155°F, treats 158°F as safe based on assumed carryover, and automatically advances below 165°F. Roast chicken accepts 160–164°F. | Both poultry recipes require a measured 165°F before successful safety evaluation; lower readings force an F. The studio also requires correct probe placement and a fresh internal reading. |
| Access | A spatial view alone would exclude learners using keyboards, screen readers, low-power devices, or reduced-motion settings. | Equivalent text actions, live feedback, semantic forms, no required dragging, no continuous animation, and a working fallback when WebGL is unavailable. |
| Reflection | A completion score alone does not show why a learner made a decision. | Every station requires a reasoning choice and offers a transfer reflection. Written responses are preserved for human review rather than auto-graded by keywords. |
| Continuity | A browser refresh or changing stations can interrupt practice. | Current station drafts, best independent demonstrations, and up to 60 archived attempts save in browser storage; interrupted attempts can be revisited. Unavailable storage is reported and export remains available. |

## Learning design

The sequence is **read the goal → act → observe → adjust → explain → transfer**. Practice mode shows a worked strategy. Demonstrate mode hides that strategy, permits an explicitly recorded hint, and locks the selected explanation on submission. Switching mode requires a fresh attempt once actions have begun, so coached work cannot simply be relabeled as an independent demonstration.

| Station | Observable evidence | Reasoning / transfer |
| --- | --- | --- |
| Safe workspace | Handwashing and clean, separate equipment before preparing vegetables | Explain transfer of raw juices; adapt to having one board. |
| Knife preparation | Secure board and claw grip before a uniform small dice | Connect piece size to cooking rate; choose a cut for stew. |
| Browning | Adjust surface moisture, spacing, and heat; plate before burning | Explain why a crowded pan delays browning; scale to a larger batch. |
| Temperature check | Probe thickest part away from bone, continue cooking, take a fresh reading, then serve | Separate appearance from temperature evidence; extend to a whole bird. |
| Recipe scaling | Measure 450 mL for six servings from a 150 mL/two-serving recipe | Use the same scale factor for other ingredients; calculate four servings. |
| Leftover storage | Use shallow containers, label, and refrigerate promptly; discard after excessive counter time | Adapt the time rule to hot weather and picnics. |

Feedback explains consequences and recovery. For example, water-only hand rinsing does not meet the washing goal; a surface reading cannot verify chicken's center; refrigeration does not undo excessive counter time. A burned pan or unsafe leftovers require a fresh attempt instead of silently reversing the outcome.

### Suggested teaching sequence

1. Model one station, thinking aloud about the goal, evidence, and next action.
2. Let learners practice with the worked strategy. Invite prediction before advancing a heat step.
3. Start a fresh attempt in Demonstrate mode. Keep assistance available and record its use.
4. Review the notebook and explanation together. Ask the transfer question aloud, in writing, through signing, or using the learner's communication supports.
5. Observe an appropriately supervised real-kitchen demonstration before deciding that physical skill is established.

The browser's evidence report is a formative learning record, not a secure examination system. It does not establish knife dexterity, real handwashing duration, actual food safety, or physical cooking competence. Repeated scenarios can be remembered; instructors should vary the real-world transfer task. There is no identity verification, gradebook submission, teacher dashboard, or cloud synchronization in this change.

## Evidence and accessibility

The downloadable JSON includes station, challenge, mode, completion state, chosen explanation, reasoning result, hints, corrections, an optional prediction captured before acting, optional reflection, and action-by-action observations with simulated values. A readable text report provides the same narrative evidence for teacher review. Best independent demonstrations are retained separately from the rolling recent-attempt list. The visible portfolio distinguishes submitted work from archived incomplete attempts. Written transfer explanations are not automatically scored.

The text view is an equivalent interface, not a separate easier assessment. Actions and scoring are shared with the 3D view. Radio inputs, labels, headings, live status, visible focus, 44px minimum button heights, and a skip link support access. Rendering happens on interaction instead of an endless animation loop. The scene uses local geometry and releases GPU resources when the page is unloaded.

The current standalone studio is English-only. The Kitchen Lab entry points use the existing translation fallback convention, but full studio localization remains future work. This should be considered before assigning it to learners who require another language.

## Source basis

- [CAST UDL Guidelines](https://udlguidelines.cast.org/): learner choice, graduated support, accessible interaction, and actionable feedback informed the two learning modes and equivalent text controls. This is a design application, not a claim that this specific studio has demonstrated learning efficacy.
- [USDA safe minimum internal temperatures](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart): poultry minimum temperature and the corrections to existing chicken scoring.
- [USDA food thermometers](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-thermometers): appropriate placement and temperature evidence.
- [USDA leftovers and food safety](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety): prompt refrigeration, shallow containers, and the two-hour/one-hour consumer guidance.
- [FDA egg safety](https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety): pasteurization guidance; a familiar source is not a substitute for pasteurization.
- [Three.js renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) and [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html): current API concepts were checked alongside the project's actual bundled r128 implementation.

This is an educational review and implementation, not a comprehensive validation of every pre-existing food-science assertion. The legacy lessons still contain simplified temperature and browning models. The studio explicitly identifies its heating and browning behavior as illustrative, not a predictor of real cooking time.

## Verification and launch

For a standalone preview, run `node dev-tools/kitchen_studio_preview.cjs` and open its printed local URL. Open Kitchen Lab and choose **3D Skills Studio**, or serve the repository and open `/stem_lab/kitchen_studio/index.html`. Use the full-window link when the embedded view is too compact. The build copies the studio folder and shared Three.js runtime into `desktop/web-app/public`.

Run the focused tests:

```powershell
node node_modules/vitest/vitest.mjs run tests/kitchen_studio_engine.test.js tests/kitchen_studio_challenges.test.js tests/stem_kitchenlab_accessibility.test.js tests/kitchenlab_tabs_a11y.test.js tests/life_skills_kitchen_3d.test.js --maxWorkers=1
node dev-tools/kitchen_studio_qa.cjs
```

The browser harness checks all six stations, incorrect and corrected actions, keyboard activation, evidence download, reload persistence, missing 3D runtime, unavailable local storage, 320px and 390px layouts, automated accessibility, and launch through the real Kitchen Lab plugin. Results and screenshots are in this directory. Automated accessibility results supplement visual and keyboard checks; they do not replace user testing with assistive technology.

## Remaining priorities

- Test the sequence with learners and educators, including screen-reader and switch-input users; observe task completion, need for help, comprehension, and transfer.
- Broaden the current two-challenge-per-station bank and add more learner-created explanations to reduce memorized answers across repeated demonstrations.
- Extend scenarios to allergen cross-contact, multi-dish planning, and coordinated preparation after validating the six foundational tasks.
- Localize the full studio and add optional narration through the host's established language and audio system.
- Connect exported evidence to the existing teacher workflow after agreeing on the assessment and identity contract.
- Audit the remaining legacy scientific claims and recipe scoring against primary sources, especially quantitative heating, resting, and browning assumptions.

## Second refinement pass

The follow-up adds twelve distinct challenges, prospective predictions, live success criteria, a three-stage learning indicator, an independent-skill passport, scenario-aware saved work, and a readable evidence report. A close-up camera now follows station selection. Measurements, probe readings, and browning have prominent observation cards; soap bubbles, cut sizes, mushroom shapes, and the storage door make actions easier to see. Secondary attempt controls sit below the practice work. Submitted attempts collapse the disabled action and answer forms into a concise evidence review, with the selected explanation, prediction, and transfer reflection still visible.

| Station | New challenge | What must transfer |
| --- | --- | --- |
| Preparation | One board, two jobs | Wash and rinse equipment before sanitizing; wash hands before preparing vegetables. |
| Knife | Slow-cooked stew | Use the requested uniform large dice instead of repeating the small-dice sequence. |
| Heat | Take over a hot pan | Inspect the existing browning and manage the remaining cook. |
| Thermometer | Is more cooking needed? | Take a correctly positioned reading before assuming more heat is necessary. |
| Measurement | Sauce for four | Recalculate the target as 300 mL rather than repeating the 450 mL task. |
| Leftovers | After a hot picnic | Recognize when discarding is the correct outcome, instead of repeating a refrigeration routine. |

The shared-board scenario follows [USDA cutting-board guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/cutting-boards) and [USDA cleaning and sanitizing guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/washing-food-does-it-promote-food). It uses food-contact product instructions rather than prescribing a chemical mixture. The picnic scenario applies the existing USDA one-hour limit above 90°F.

The optional prediction locks after the first action so it remains a prospective record. Neither predictions nor transfer reflections are automatically scored. Demonstrate mode omits the computed measurement answer from the goal; requested hints remain available and are recorded. The passport counts independent demonstrations separately from submitted work, and distinguishes the two challenges for each skill. It is still formative evidence of simulated performance, not a secure certification.

Validation: **53 focused tests passed**. Chromium exercised all twelve tasks, readable and JSON downloads, persistence, previous-version migration, retained best evidence after history trimming, unavailable storage, missing 3D runtime, keyboard actions, and host integration. Six automated accessibility checks returned no violations, including selected-station hover, narrow-screen text, and alternate-challenge views. See qa-results.json and the updated screenshots.

## Third refinement pass: connected rehearsal

**Dinner for four** connects six fresh checkpoints: prepare safely, dice the carrots, scale sauce for four, brown mushrooms, check chicken, and store leftovers. Learners choose coaching or demonstration, pause into station practice, and resume the saved rehearsal. The 3D scene uses the rehearsal's own state; existing station drafts and badges cannot fill in its work. This remains an untimed sequence of decisions, not a continuous meal-timing or cooking-physics model.

Each checkpoint requires completed actions and a correct selected explanation before moving on. An incorrect explanation prompts a retry. Requested hints, corrections, and incorrect submitted explanations remain in earlier-attempt evidence, so a clean retry cannot make the entire rehearsal appear independent. Rehearsals are classified as coached, supported, or independent. Optional predictions and transfer responses remain available for human review and are not automatically graded.

The evidence panel suggests a next station task using unresolved explanations, opportunities to try independently, unproven foundations, and alternate situations. After all twelve independent challenges, it suggests the connected rehearsal. Completing the four-serving sauce checkpoint does not substitute for the six-serving foundation challenge. Recorded coached checkpoints contribute to submitted-evidence progress without awarding independent credit.

The current rehearsal and ten earlier rehearsals are saved alongside existing work. JSON and readable reports include checkpoint actions, selected explanations, predictions, reflections, and support history. On-screen review includes earlier checkpoint attempts; long action notebooks are built when opened. Saved rehearsal state is reconstructed from action logs, and completed checkpoints must match the required sequence and mode. Each rehearsal retains up to thirty earlier attempts; at the limit the learner starts a new rehearsal rather than silently losing support evidence. Local browser storage and exports remain formative records, not tamper-proof assessment records.

Validation: **66 tests across six focused suites passed**. Browser checks covered all twelve individual challenges plus two complete connected rehearsals (one retaining an earlier incorrect explanation and one independent), fresh state isolation, pause/resume, reload, coached mode restoration, lazy notebook review, both export formats, next-practice selection, mobile overflow, missing WebGL, blocked storage, and the real host integration. **Eight automated accessibility checks returned no violations**; this does not replace user testing with assistive technologies. No browser runtime errors were recorded. All five studio assets match their desktop public copies. Updated preview: `/stem_lab/kitchen_studio/index.html?edition=3`.

New review artifacts: `studio-rehearsal-desktop.png`, `studio-rehearsal-mobile.png`, `studio-rehearsal-completed.png`, `kitchen-rehearsal-evidence.json`, and `kitchen-rehearsal-report.txt`. These exports are synthetic QA examples, not learner records.

## Fourth refinement pass: observe, navigate, and replay

A compact task toolbar keeps the current skill and meal checkpoint visible. Its primary shortcut follows the attempt from actions to explanation to recorded results. Additional shortcuts reach the kitchen and meal plan. Focus targets have scroll clearance beneath the toolbar, and the keyboard skip link now follows the current phase instead of targeting actions that may be hidden after submission. The toolbar stops sticking on very short screens.

Live workspace observations now sit beside the action controls, reducing the need to scroll between the kitchen view and the decision. After submitting the current attempt, learners can open **Replay your decisions** and step through the starting conditions and each recorded action using Previous/Next or a keyboard-operable slider. Replay includes rejected decisions and their corrective feedback. The 3D scene and equivalent text show the selected historical state with a visible replay label; **Return to latest** restores the current kitchen. A prompt encourages learners to connect a change they observed to their explanation.

Replay reconstructs states from the attempt's actual scenario and action sequence. It does not change saved decisions, hints, selected explanations, reflections, completion, or scores. It closes when starting a fresh attempt, switching stations, or moving to another meal checkpoint. The current attempt's replay is available in both the individual station and connected rehearsal flows. Archived attempts remain reviewable in the evidence portfolio and exports.

Replay stepping is also available above the 3D scene, alongside Return to latest, so inspecting consecutive actions does not require repeated trips to the lower review panel. The observation beside the task is labeled Latest workspace to distinguish the recorded end state from a historical replay.

Validation: **75 focused tests across seven suites passed**. Browser verification covered the existing twelve challenges and rehearsal flows plus phase-aware shortcuts, keyboard skip navigation, live observations, read-only replay, rejected-action feedback, keyboard slider stepping, scene-side replay controls, return to the latest state, and clearing replay at rehearsal transitions. The 320px task heading remains below the sticky controls. **Ten automated accessibility checks returned no violations**, with no recorded browser runtime errors. The browser harness now waits for native details-toggle rendering before checking lazy notebooks and replay content. Updated artifacts include `studio-action-replay.png`, `studio-replay-mobile.png`, and `studio-task-focus-mobile.png`. Preview: `/stem_lab/kitchen_studio/index.html?edition=4`.

## Fifth refinement pass: coaching that follows the workspace

Practice coaching now responds to the actual task state across all twelve challenges. It identifies a useful next decision and explains why it fits the current conditions: washing before sanitizing, matching the recipe's cut size, managing remaining browning, gathering a fresh internal reading, removing an excess measurement, or discarding leftovers that exceeded the task's holding limit. It recognizes irreversible outcomes and offers a fresh attempt after burning or after disposal in the timely-storage challenge. Guidance is deterministic and local.

Demonstrate mode offers two explicit support levels: a thinking prompt, then a suggested next step with an explanation. Each level is recorded at the action position where it was requested. Reopening the same level at that position does not count again. Taking an action closes the hint so the next decision is again the learner's to make. Practice coaching does not accumulate requested-hint counts, and guided completion remains classified as coached.

Requested support appears in the result review, JSON evidence, and readable reports. Hint details survive reload and are reconstructed against the known task state. Prior-version hint counts remain intact even when detailed hint records were not available. Hint-only attempts are now archived when the learner starts over and included in pending exports. Visual replay remains separate from assessment and does not add support requests.

Two feedback defects were corrected: mixed cuts in the stew scenario now suggest uniform large dice, and a reused shared board prompts washing/rinsing/sanitizing instead of suggesting an unavailable board replacement. The action that burns mushrooms now counts as a correction, so a burned meal-checkpoint attempt followed by a successful retry cannot make the whole rehearsal appear independent.

Validation: **95 focused tests across eight suites passed**, including successful guidance through all twelve scenarios, excess-measurement recovery, fresh thermometer readings, irreversible outcomes, recipe-specific feedback, hint deduplication, restoration, and support classification. The complete browser run passed existing challenge, rehearsal, replay, and host integration checks plus adaptive guidance, keyboard focus after requesting a specific step, hint-only archival, reload persistence, JSON/readable support records, and mobile hint controls. **Twelve automated accessibility checks returned no violations** and no browser runtime errors were recorded. See `studio-specific-coaching.png`, `studio-coaching-mobile.png`, `kitchen-coaching-evidence.json`, and `kitchen-coaching-report.txt`; the exports are synthetic QA examples. Preview: `/stem_lab/kitchen_studio/index.html?edition=5`.

## Sixth enhancement: full-recipe 3D preparation

The broader Kitchen Lab already contains seven illustrated, time-based recipe simulators: scrambled eggs, French omelet, vegetable stir-fry, pan-seared chicken, sheet-pan vegetables, whole roast chicken, and pasta with pan sauce. The Skills Studio's six stations and Dinner for four rehearsal were decision checkpoints rather than continuous recipe cooking.

The new **Recipe kitchen** adds two complete, stylized 3D workflows: **Golden mushroom pasta** and **Tomato & garlic pasta**, each for **two or four servings**. A link connects it with the Skills Studio. Its saved cooks use a separate browser-storage key, preserving the existing studio's station and rehearsal work.

Learners wash and prepare produce, mince garlic, weigh pasta, choose a pan size, heat a filled pot and an oiled pan, add ingredients, stir, inspect a pasta sample, reserve cooking water, drain, loosen and combine the sauce, check the dish, turn off both burners, and plate. Both vessels advance on the same clock. Users can run at 5× or 15×, pause, or advance 30 simulated seconds. Playback starts paused after reload and stops on page hiding. Sampling and checking the final dish also pause playback for inspection.

The deterministic model includes gradual heating and cooling, a boiling-water cap, a temperature drop when cooler pasta is added, portion-dependent water heating, moisture evaporation, crowding, browning, tomato softening, pasta texture progression, and irreversible scorching. The model retains heat after burners are turned off. The 3D bench shows ingredients moving into the pot and pan, boiling bubbles, color changes, combined pasta, and a plated dish, with camera presets and a text alternative. A pot with no water shows no water-temperature reading.

The coefficients, temperatures, texture categories, and clock are **illustrative teaching parameters, not a calibrated thermal or food-safety model**. They do not establish real cooking times, recreate taste/touch/knife technique, or represent every kitchen hazard. The recipes are original educational scenarios. [Barilla's pasta workflow guidance](https://www.barilla.com/en-us/help-with/pasta-kitchen-tips/how-to-cook-pasta) informs using the actual packet, sampling, reserving cooking water, and finishing with sauce; [FDA produce guidance](https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-produce-safely) informs preparing washed produce with clean equipment. Neither source validates the simulation's numerical coefficients.

Learners may plate an imperfect dish and review it. Independent completion requires appropriate portions, a recent suitable pasta sample and finished texture, an unscorched sauce, a coating consistency, final inspection, both burners off, and two supported selected explanations without hints or corrections. Written predictions and reflections are recorded for human review. Current and ten earlier cooks can be downloaded with their complete action histories, outcomes, selected explanations, and reflections. Stored runs are reconstructed from valid actions; elapsed real time while away does not cook the food in the background.

Validation: **108 focused tests passed across nine suites**. The initial combined run passed 83 tests but one worker failed to start; the affected 25-test suite then passed independently with the thread pool. Recipe browser checks completed both recipes at both serving sizes through real controls, with all outcome criteria and independent evidence. They also covered pause/reload, hidden-page handling, archive/export, text view, small-screen layout, unavailable WebGL, blocked storage, and the link from the existing studio. See `recipe-qa-results.json`, `kitchen-recipe-evidence.json`, and `recipe-*.png`. Recipe report examples contain synthetic test work.

The final serving view has a closer camera, an unobstructed dish label, open pot geometry, and a completed layout that hides inactive preparation controls. Four recipe-specific automated accessibility checks returned no violations; no recipe browser runtime errors were recorded. All nine Studio/Recipe Kitchen assets match their desktop public copies. Local preview: `/stem_lab/kitchen_studio/recipe_lab.html`.

## Seventh refinement: monitor, observe, and review a full recipe

A compact stove monitor now sits beside the cooking controls. Learners can see both vessels, adjust either burner, open its controls and camera view, and run, pause, or advance the same shared clock without returning to the scene toolbar. Both sets of controls stay synchronized. The monitor reports observable conditions, including a boiling pot, an empty pot with its burner on, a drying sauce, darkening garlic, and retained pan heat. Pasta observations use the last actual sample and show its age; they do not reveal the model's current hidden texture. Demonstrate mode keeps procedural coaching behind an explicit, recorded hint.

The 3D scene adds a reserved-water jug whose fill follows the available inventory, steam that changes with the clock and vessel conditions, distinct burner heat colors, and a wooden stirring utensil. Stirring changes the utensil angle and redistributes the pan ingredients without advancing time. Garlic darkens visibly before the model records irreversible scorching. These remain stylized, deterministic teaching visuals rather than calibrated physical predictions.

After evidence submission, **What shaped your dish** pairs each of the five criteria with the observed outcome and a specific next practice. An expandable cooking sequence shows the accepted ingredient transfers, samples, reserved-water additions, combining, inspection, and plating at their simulated times. Archived submitted cooks offer the same review, and JSON reports include both findings and the sequence. The review does not change the attempt, hints, or assessment. Unrecorded attempts remain labeled as such in the archive.

Fixed two feedback and inventory issues: using every reserved splash no longer allows the learner to refill the jug from the pot beyond the recipe's original allowance; and coaching no longer asks learners to reweigh a portion that has already entered the pot. Garlic-only and oil-only pan states now receive specific descriptions.

Validation: **113 focused tests passed across nine suites** (18 full-recipe tests plus 95 existing Kitchen Lab/Studio tests). The browser harness completed both recipes at both serving sizes through actual controls, with all quality criteria and independent evidence, and verified monitor synchronization, navigation, playback, paused restoration, archive review, and enriched exports. Additional browser checks confirmed visible stirring without elapsed time, an observable developing problem before scorching, hint accounting in Demonstrate mode, and specific review for an imperfect dish. The test fixture seeds state before page initialization so the application's page-exit save does not overwrite it. Six automated accessibility checks returned no violations across the two recipe reports, including 320px monitor and imperfect-review screens; no browser runtime errors were recorded. Automated checks do not replace assistive-technology user testing.

See `recipe-qa-results.json`, `recipe-refinement-qa-results.json`, `recipe-developing-problem.png`, `recipe-monitor-mobile.png`, `recipe-imperfect-review-mobile.png`, and the before/after stir images. Reports and screenshots use synthetic test cooks. All four updated Recipe Kitchen assets match their desktop public copies. Local preview: `/stem_lab/kitchen_studio/recipe_lab.html?edition=2`.

## Eighth refinement: replay a completed recipe

Learners can now open **Replay this cook** from a recorded dish review or the cooking bench. Previous/Next buttons and a keyboard-operable slider traverse every recorded action, including corrections and shared-clock advances. A decision menu jumps directly to preparation, ingredient transfers, burner adjustments, samples, and finishing actions. The panel shows the simulated time, the action's actual observation, and changes in measured/modelled values. It does not expose an unsampled pasta texture.

The 3D scene and its text observations reconstruct the selected action from the original recipe, serving count, and action sequence. The finished-dish monitor is explicitly labeled while a historical scene is displayed. **Return to finished dish** restores the latest scene and keyboard focus. Replay is available after evidence submission, operates without changing the cook, scores, support counts, reflections, or report, and closes on a fresh cook or reload. Text view and the keyboard skip link support the same historical exploration. Archived cooks retain their existing written review; this visual replay applies to the current recorded cook.

The missing-3D browser check exposed a camera-script startup error. Recipe Kitchen now loads its camera controls only when the Three.js runtime exists, so the text fallback starts without that error. Visual review also corrected the pot water level and made the visible pasta follow the water surface inside the rim.

Validation: **121 tests passed across ten focused suites**, including eight replay tests that reconstruct every action of all four recipe/serving combinations, verify rejected decisions and observable changes, and check immutability and eligibility. The full browser recipe harness again completed all four workflows, verified monitor controls, archives, exports, pause/reload, narrow layouts, blocked storage, and the studio link. Replay browser checks covered keyboard End/Home/Arrow navigation, decision jumps, corrections, preserved JSON evidence, text view, focus, fresh-cook/reset behavior, and the unavailable-3D fallback. **Five automated accessibility checks returned no violations** across the full-recipe and replay harnesses; no runtime errors remained. These checks supplement rather than replace assistive-technology user testing.

Artifacts: `recipe-replay-qa-results.json`, `recipe-replay-pasta.png`, `recipe-replay-mobile.png`, and `kitchen-recipe-replayed-evidence.json` (synthetic learner work). The four modified recipe assets are mirrored to the desktop public directory. Preview: `/stem_lab/kitchen_studio/recipe_lab.html?edition=3`.

## Ninth refinement: interact directly with the cooking bench

The pot, sauce pan, preparation board, and serving plate are now selectable in 3D. Pointer selection uses the visible scene geometry; a movement threshold distinguishes a click/tap from orbiting the camera. A selected-workspace ring, text confirmation, and matching pressed-state buttons communicate the selection. A Prep camera preset complements the existing pot/pan/plate views. Workspace selection itself does not advance time, record a cooking action, or request coaching.

A compact action panel below the scene brings preparation, ingredient transfers, stirring, sampling, reserving water, draining, sauce adjustments, combining, and plating alongside the 3D view. Its burner control stays synchronized with both existing control sets. Weighing and pan-size choices remain available through **Open full controls**. The panel uses the same guarded recipe actions and outcome criteria as the original controls. Button and keyboard equivalents support the same operations in text view, where inactive camera controls are hidden.

After a one-time action becomes disabled, keyboard focus moves to the next available action; completing preparation leads to the full weighing controls. Selection feedback stays aligned when switching from the original station tabs and clears for a new cook. During replay, selected-object observations follow the historical state and cooking actions remain hidden; selecting cookware cannot modify saved evidence. Completed dishes link back to their review.

Validation: **26 recipe and replay model tests passed**. Browser checks selected all four 3D workspaces, distinguished an orbit drag from a click, completed a full independent mushroom-pasta cook through the new scene-side actions, synchronized burner controls, verified action guards and keyboard focus, exercised a touch tap, and checked 320px text-mode operation. The replay browser harness passed again with saved/exported evidence intact and the missing-3D fallback available. Four automated accessibility checks across the interaction and replay harnesses returned no violations; no runtime errors were recorded. An additional keyboard-only check confirmed that completing preparation leads to the full weighing controls. The three modified UI assets match the desktop public copies.

Artifacts: `recipe-interactivity-qa-results.json`, `recipe-interactive-pan.png`, and `recipe-interactive-mobile.png`. Screenshots use synthetic cooks. Preview: `/stem_lab/kitchen_studio/recipe_lab.html?edition=4`.
