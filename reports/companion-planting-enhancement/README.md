# Companion Planting Lab: controlled experiment bench

Open Companion Planting Lab and choose **Experiment bench**, or open the bench from Community Garden. A new setup copies the current garden; an empty garden offers a six-crop example. Experiments do not change planted crops, calendar, budget, or XP.

## What changed

- Two 4-by-4 layouts with keyboard-accessible swapping. Layout A is a snapshot; layout B preserves the same crops, counts, starting ages, health, and pests.
- Crop selection, 7/14/30-day comparisons, equal watering policies, predictions, and conclusions.
- Shared daily simulation for the live garden and controlled trials. The bench suppresses random events and random disease draws. Plot rotation history stays in place and its effect is explained.
- Responsive maturity, health, and pest charts; daily data tables; explicit model limitations and maturity-ceiling guidance.
- Six recent saved trials with reopening, progress persistence, snapshots, and CSV downloads containing setup, layouts, daily data, and learner writing. CSV output neutralizes spreadsheet formula prefixes.
- Editing setup invalidates its result; selecting plots or writing conclusions preserves it. Trials stop before annual clearing at year end.
- Structures no longer grow as crops or disappear at year rollover. An old event popup no longer produces fresh event evidence or repeated event activity on later days.

## Validation

- **91 targeted tests passed** across eight Companion Planting test files, including 11 new behavioral tests.
- Browser checks cover swaps via keyboard, model response, live-garden isolation, save/reopen, CSV download, serialized-state restoration, close/resume, and stale-result invalidation.
- Desktop, 390px, and 320px layouts reviewed. The two layout grids have matching row heights. Mobile charts use a separate viewBox for readable labels.
- No browser page errors or automated WCAG A/AA violations in the experiment bench. This is a scoped automated accessibility check, not a manual screen-reader certification.
- The source and desktop public copy are identical. No full application build or deployment was performed.

Run browser verification with `node dev-tools/companion_planting_experiment_qa.cjs`. Run the new behavior suite with `npx vitest run tests/companion_planting_experiment.test.js --maxWorkers=1`.

## Evidence

- [Desktop layouts](experiment-layout-desktop.png)
- [Desktop results](experiment-results-desktop.png)
- [320px layouts](experiment-layout-mobile-320.png)
- [320px results](experiment-results-mobile-320.png)
- [Browser results](browser-results.json)
- [Example trial CSV](companion-controlled-trial-corn.csv)

The bench treats companion bonuses as teaching assumptions and distinguishes simulated results from field evidence. The in-product evidence link points to [University of Minnesota Extension's companion planting guidance](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/companion-planting-in-home-gardens), which discusses mechanisms and uneven evidence for specific pairings.
## Visual and animation enhancement

The experiment tiles now use original SVG plant illustrations with stems, leaf veins, flowers, fruit, trellises, root forms, and soil beds. The same artwork is used in the live map's growth stages and plant portraits. Corn has blade-shaped leaves; vines, flowers, root crops, shrubs, and support structures have distinct silhouettes. Placement, watering, and visitor animations are short and stop automatically.

Completed trials now include **Watch your trial grow**: a local replay with two landscape portraits, recorded maturity/health/pest values, a keyboard-accessible day slider, play/pause, previous/next day, and two playback speeds. Replay updates only its own component. It stops at the final day and pauses offscreen or when the browser becomes hidden. Both system and lab reduced-motion preferences preserve manual stepping and disable timed playback and transitions.

The isometric overview now reads current garden state without remounting. Its frame loop stops while hidden/offscreen or under reduced motion, responds to resize and preference changes, and removes listeners/observers when unmounted. Drawing and pointer hit-testing share responsive tile geometry so the full four-by-four bed fits a 320px screen.

Browser verification additionally covered all playback controls, system and lab motion preferences, static pixels under reduced motion, in-place day updates, offscreen suspension, unmount cleanup, and correct selection of plot 16 at 320px. No browser page errors or scoped automated accessibility violations were reported.

- [Growth replay on desktop](growth-replay-desktop.png)
- [Growth replay at 320px](growth-replay-mobile-320.png)
- [Updated garden overview](garden-overview-still.png)
- [Garden overview at 320px](garden-overview-mobile-320.png)
- [Live plot botanical illustration](garden-plot-botanical.png)

## Garden scene redesign

The main community garden is now a botanical landscape with individually raised timber beds, soil furrows and grain, a gravel apron, layered hills and orchard trees, stepping stones, a bench, and a watering can. Plants occupy the beds at a readable scale and use the field guide's authored vector artwork. The canvas paints the vectors directly, with cached paths and bounded artwork nodes. Crop rows render behind-to-front above the soil.

The scene responds to simulated maturity, moisture, health, watering, pest pressure, and harvest readiness. Growth changes ease over 650ms; stems sway gently, clouds drift, and pollinators visit planted habitat crops. Winter uses a cooler landscape and snow; the ambient day/night cycle retains stars and fireflies. Motion preferences continue to stop the frame loop, and reduced motion displays the current growth immediately.

Drawing and pointer coordinates now share both canvas dimensions and the actual center of each bed. Numbered plots, focus labels, and the existing relationship/placement evidence remain available. The normal scene adapts between 360px and 580px tall; fullscreen controls stay attached to the scene rather than being covered by the planting dock.

Validation: 91 tests passed across eight files. Browser checks cover all 16 plot centers at desktop and 320px, a dense garden, winter, fullscreen bounds, reduced-motion pixels, state updates, and unmount/offscreen cleanup. The older test that checked a renderer comment now checks the explicit garden scene contract. Source and desktop public files are synced; no deployment was performed.

Visual review also caught and corrected exponential-number parsing in flower transforms, and removed above-ground potato fruit and squash fruit from flowering cover-crop illustrations.

- [Fully planted garden](garden-full-desktop.png)
- [Fully planted garden at 320px](garden-full-mobile-320.png)
- [Winter garden](garden-winter-desktop.png)
- [Garden before this pass](garden-before-review.jpg)
- [Regression test run](tests-garden.log)



## Botanical and animation refinement — September 12

Refined the shared botanical illustrations with lavender spikes, rosemary needles, dill/yarrow flower clusters, borage stars, cucumber vines, pointed peppers, feathery carrot leaves, radish/onion shoulders, strawberry runners, clover leaflets, nasturtium leaves, buckwheat, and rhubarb. The changes appear in the isometric garden, plant cards, and trial replay.

Early growth now blends from an actual seedling into the developing plant. Mature flowers, fruit, and trellises stay hidden during the seedling stage. Structures retain their shape when the soil is dry. The garden's harvest-ready count now uses the same maturity and health conditions as the harvest action.

Ambient lighting fades smoothly through twilight, with a crescent moon and fading stars/fireflies at night. The sun and moon never appear together. Water droplets accelerate toward the soil and leave short expanding ripples; reduced motion still freezes the scene and shows the current growth immediately.

Validation: 91 regression tests passed. A focused browser check verifies seed/seedling/mature art, continuous lighting, growth endpoints, finite watering effects, reduced motion, and harvest eligibility. Desktop, phone, species-detail, and growth-stage screenshots were visually reviewed. The standard browser suite also covers every plot's pointer target, fullscreen, experiment playback, persistence, and accessibility checks.

- [Refined daytime garden](garden-refined-desktop.png)
- [Night garden](garden-refined-night.png)
- [Refined garden at 320px](garden-refined-mobile-320.png)
- [Crop detail sheet](botanical-species-detail.png)
- [Seed-to-maturity detail sheet](botanical-growth-stages.png)
- [Focused browser results](botanical-refinement-results.json)
- [Regression results](tests-refinement.log)

Run the focused checks with: node dev-tools/companion_planting_botanical_qa.cjs. These illustration stages are visual teaching aids; they do not change the simulated crop-growth rules.



## Garden gameplay and workspace refinement — September 12

The community garden now opens in a compact Garden workspace with one contextual primary action: plant a starter, start/resume growing, water dry soil, review an event, advance one day, or harvest mature crops. Care controls, funds, moisture, harvest totals, and progress toward the next mature crop remain together. Daily results update beside the action, with optional predictions and a fuller report below the scene.

The original experiment bench, teaching sequence, evidence records, soil tools, challenges, and accessible detailed map remain in the Learning workspace. Navigation stays reachable while scrolling. Existing saved focus-mode sessions reopen in their learning workspace; changing views preserves garden state and the canvas instance.

The full garden loop now supports:

- Four costed starter layouts, including exact-budget and insufficient-funds handling.
- Direct bed selection with pointer, touch, or a compact keyboard map; crop previews precede spending.
- One-click day progression, useful care feedback, and compost marked as used for the current day.
- Maturity progress that reaches 100% only when the crop is actually mature.
- Harvest rewards followed by replanting, including opening an empty bed while growing.
- Root inspection with keyboard focus returned to the selected crop.
- Explicit plant-removal confirmation, cancellation, and replacement in the same bed.
- Optional collapsed reflections and a first-harvest guide.
- Start/resume rewards that cannot be earned repeatedly by toggling planning.

Measured in the standalone browser fixture, the initial desktop page decreased from 9,083px to 1,145px; the garden starts at 454px instead of 3,793px. At 320px wide, the initial page is 1,249px tall and the garden starts at 723px, with no horizontal page overflow. A deterministic run of the salad starter reached its first harvest after 19 simulated days and earned funds through the actual harvest action.

Validation: **102 tests passed across nine suites**. The gameplay browser suite covers the natural first harvest, desktop/390px/320px layouts, view and canvas continuity, predictions, care, harvesting, replanting, pointer and keyboard bed selection, removal/cancellation, microscope focus, and serialized restoration. The experiment browser suite passes its playback, persistence, all-16-bed targeting, fullscreen, motion preference, offscreen, and cleanup checks. Scoped axe checks found no violations in the new controls or experiment bench. Botanical rendering and animation checks also passed.

A responsive-test race was corrected by waiting for both painted canvas dimensions; checking width alone could accept stale vertical coordinates during a resize. This adds a render-height diagnostic without changing the scene geometry. Source and desktop public assets are identical; no deployment was performed.

- [Desktop first garden](gameplay-first-garden-desktop.png)
- [Phone first garden](gameplay-first-garden-mobile-320.png)
- [First harvest through actual gameplay](gameplay-first-harvest-desktop.png)
- [Growing garden and day feedback](gameplay-growing-desktop.png)
- [Gameplay browser results](gameplay-results.json)
- [Regression results](tests-gameplay.log)

Run the new checks with: node dev-tools/companion_planting_gameplay_qa.cjs and npx vitest run tests/companion_planting_gameplay.test.js.


## Recovery and care guidance — September 12

Added a contextual care sequence that prioritizes dry soil, growth-limiting plot pests, and depleted nitrogen for heavy-feeding crops. Overwatering advice explains why watering should stop; winter guidance gives the spring countdown and explicitly explains that annuals clear while perennials persist at the year boundary.

The main action row now exposes undo for the latest paid planting before growth. It uses the existing refund and inquiry-invalidation logic, shows the exact refund, and returns focus to the result.

An empty garden with funds below the cheapest seed price can request a free community planting. This plants one radish in spring/summer or one strawberry perennial in autumn/winter, without changing funds, time, learning records, or awarding planting XP. Donated plants have no refund action. Choosing a perennial for late seasons avoids losing the recovery planting at the year change.

Validation: **108 tests pass across nine suites**. The extended gameplay browser suite passes recovery, preserved notes, undo/refund, care priorities, winter dormancy, spring growth, mobile containment, and the existing planting-to-harvest loop. The new care and recovery panels were visually reviewed. Source and desktop public assets are synced.

- [Recovery prompt](garden-recovery-desktop.png)
- [Winter guidance](garden-winter-guidance.png)
- [Care guidance at phone width](garden-care-guidance-mobile.png)
- [Regression run](tests-recovery.log)
- [Gameplay browser results](gameplay-results.json)


## Crop inspection and harvest feedback — September 12

The Garden workspace now places a botanical crop panel directly after the scene. It shows maturity, health, and pest-pressure meters with model thresholds, contextual care advice, and a large illustration of the selected crop. Habitat structures receive their own status instead of crop-growth or harvest controls.

The companion section uses the simulation's actual adjacent relationship records, including diagonal neighbors. It shows the combined modeled growth effect, puts conflicts first, explains each relationship, and lets the player select the neighbor. Lists longer than four relationships expand on demand. Previous/next controls wrap through occupied beds while retaining keyboard focus. Closing the panel returns to the garden or plot button. Moving away from a pending removal cancels it and restores the previous growth phase.

Harvesting now opens a focused summary with crop illustrations, points, funds earned, and a brief leaf animation. Players can open harvest history or move directly into a planting preview for an open bed. Full perennial gardens offer Keep growing. Dismissal, navigation, and the replanting handoff neither advance time nor spend or duplicate harvest rewards. Motion obeys both the operating system and in-lab preferences.

Validation: **116 tests pass across nine suites**, including eight new behavioral tests for crop thresholds, actual neighbor effects, navigation/removal cancellation, structures, rewards, and annual/perennial replanting. The gameplay browser suite passes desktop, 390px, and 320px views, keyboard focus, expandable relationships, actual harvest proceeds, and reduced-motion checks. The selected crop heading stays below the sticky navigation on a 320px screen (90.5px heading top versus 74px navigation bottom). Scoped axe checks report no violations in the crop panel, harvest summary, or existing Garden controls. The experiment browser suite also passes canvas targeting, workspace continuity, playback, motion preferences, and animation cleanup.

Desktop and phone visuals were reviewed. Source and desktop public assets are byte-identical, with syntax and scoped diff-format checks passing. The isolated mobile crop-panel screenshot temporarily makes the sticky navigation static for unobstructed capture; the full-page phone screenshot and focus-position assertion use the actual styling.

- [Garden inspection on desktop](garden-inspection-desktop.png)
- [Crop panel on desktop](garden-crop-panel-desktop.png)
- [Crop panel at phone width](garden-crop-panel-mobile-320.png)
- [Full garden inspection on a phone](garden-inspection-mobile-320.png)
- [Harvest summary on a phone](garden-harvest-summary-320.png)
- [Harvest summary on desktop](garden-harvest-summary-1280.png)
- [Regression results](tests-crop-panels.log)
- [Gameplay browser results](gameplay-results.json)
- [Experiment browser verification](browser-crop-panels-experiment.log)



## Garden views and live care feedback — September 12

Added Natural, Harvest, Care, and Companions controls directly beneath the living garden. The default view retains the botanical scene. The other views add softly animated bed outlines and numbered value plaques, using one shared model for the scene, inspection shortcuts, summaries, and keyboard plot buttons.

Harvest distinguishes ready crops, immature crops, and crops whose health prevents collection. Maturity labels stay below 100% until the crop actually reaches its maturity threshold, including hover labels and the compact plot navigator. Care displays health or the most urgent applicable alert, covering low health, pests, dry or overly wet soil, and depleted nitrogen for heavy feeders. Labels update immediately after care. Companion percentages use net effects from the actual eight neighboring beds, including diagonals, and exclude habitat structures from crop scoring.

Each view offers a shortcut to the relevant crop and an All plot values action for accessible text inspection. View selection preserves the planting preview, funds, day, crop data, and canvas instance, and survives serialized restoration. The controls fit phone and maximized views. Canvas transitions obey both reduced-motion preferences. Crop inspection now explains dry soil, wet soil, depleted nitrogen, and low health directly, so care-view alerts lead to useful advice.

Validation exposed a canvas visibility bug during rapid workspace or viewport changes: a batch could contain both hidden and visible intersection records, but the renderer used the first record and remained paused. The observer now uses the most recent record. A browser regression explicitly checks both hidden-to-visible and visible-to-hidden batches, and the complete playthrough passes after the fix.

Validation: **123 tests passed across nine suites**; the 32-test gameplay suite also passed after the final advice refinement. Seven new tests cover exact harvest eligibility, care priority and immediate updates, heavy feeders versus legumes, actual companion effects, preserved placement previews, saved views, and empty/habitat-only gardens. The extended browser suite verifies all three data views at desktop and 320px, canvas continuity, exact bed selection, full-screen fitting, keyboard text values, live care-to-inspection feedback, animation/reduced motion, and session restoration. Scoped axe checks report no violations in the garden-view controls, plot values, crop panel, or harvest summary. The experiment browser suite covers playback, targeting all 16 beds, motion preferences, offscreen pause/resume, and cleanup.

Desktop and phone visuals were reviewed. Source and desktop public assets are synced. Syntax and scoped diff-format checks pass.

- [Harvest view on desktop](garden-view-harvest-desktop.png)
- [Harvest view on a phone](garden-view-harvest-mobile-320.png)
- [Care view on a phone](garden-view-care-mobile-320.png)
- [Companion effects on a phone](garden-view-companions-mobile-320.png)
- [Care alert and crop advice](garden-care-inspection-mobile-320.png)
- [Regression results](tests-garden-views.log)
- [Final gameplay test run](tests-garden-views-focused.log)
- [Browser results](gameplay-results.json)
- [Experiment and animation checks](browser-garden-views-experiment.log)



## Visual daily recaps and season transitions — September 12

Replaced the compact one-line day result with an illustrated, softly animated recap. Growth, health, and moisture now have separate cards, with recorded before-and-after values where available. The two highest-priority crop highlights are visible immediately; additional highlights expand on demand. Newly harvestable crops, declining health, rising pests, growth, cleared beds, and perennial carryover link back to the relevant current garden plot.

New day snapshots record the completed year, year-reset state, exact maturity percentages, and before/after harvest eligibility. This identifies a real readiness transition even when an older rounded growth percentage would already have displayed 100%. The simulation and existing evidence fields retain their prior calculations.

At a season boundary, the recap distinguishes the completed day from the season that begins next. At the year reset, it displays cleared beds and carried-over perennial crops instead of misleading negative growth or population-average health changes. Habitat structures remain in place, matching the simulation. Reports with other crop-population changes avoid comparing unlike growth and health averages.

Review last day returns focus to the recap below sticky navigation. From the recap, players can inspect a matching current crop, choose a now-empty bed, or return to garden controls. Unconfirmed planting previews disable conflicting plot actions; the return button goes directly to the active preview confirmation. Recap values remain historical after care, and replacement crops are not mistaken for the original observation. Older reports remain readable without inventing missing values or inferring harvest readiness from rounded percentages.

Validation: **131 tests passed across nine suites**, including eight new behavioral tests for readiness, rollover, date labels, historical snapshots, legacy reports, prediction alignment, preview protection, and winter dormancy. The complete gameplay browser suite also passes. A focused recap browser suite verifies desktop and 320px layouts, focus visibility, expanded highlights, crop inspection, year transitions, replanting, serialized restoration, larger-text mode, both reduced-motion preferences, and accessibility. Scoped axe checks report no violations in the recap and associated garden controls.

Desktop and phone visuals were reviewed. Phone interaction checks use 320 × 844; isolated recap captures use a taller viewport to include the complete card, with sticky navigation temporarily made static for capture. Source and desktop public assets are identical, and syntax and scoped diff-format checks pass.

- [Daily recap on desktop](garden-day-recap-desktop.png)
- [Daily recap on a phone](garden-day-recap-mobile-320.png)
- [Year transition on desktop](garden-year-recap-desktop.png)
- [Year transition on a phone](garden-year-recap-mobile-320.png)
- [Regression results](tests-day-recap.log)
- [Recap browser results](day-recap-results.json)
- [Full gameplay verification](browser-day-recap-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_day_recap_qa.cjs.



## Garden atmosphere and material refinement — September 12

Refined the garden's surrounding landscape with soft cloud silhouettes, gently shaded hills, organic orchard crowns, and small meadow clusters. Orchard trees now carry spring blossoms, summer fruit, autumn foliage, and bare winter branches with snow. Sparse petals and leaves drift around the perimeter; tree and meadow movement use the existing motion clock and stop with either reduced-motion preference.

Raised beds now have shaded timber faces, corner screws, brighter rim bevels, recessed soil edges, frost detail, and stronger contact shadows. Gravel has a raised edge and stepping stones have more depth. The added meadow decoration stays outside the planting footprint. Crop scale and the isometric hit geometry are unchanged.

The nighttime tint is softer over the beds so crops remain visible. Two small path lanterns add warm pools of light. Sun and moon placement on narrow screens avoids the maximize button. The existing scene labels, crop inspection, planting preview, companion lines, and data-view plaques remain above their appropriate visual layers.

Static bed artwork is retained in one transparent canvas layer per garden. Moisture, watering, seasons, selection, placement, and view colors invalidate that layer; ambient wind reuses it. The layer resizes with the garden and releases its bitmap when the garden unmounts. A focused browser check compares retained rendering against fresh painting across nine state changes, preventing stale care or selection visuals.

Validation: **131 tests passed across nine suites**. Botanical browser checks pass for exact harvest counts, seedling artwork, growth easing, watering expiry, lighting continuity, and motion preferences. The experiment browser suite passes all 16 bed targets at desktop and 320px, maximized fitting, playback, saved-state restoration, offscreen pause/resume, and cleanup, with no scoped accessibility violations.

The focused atmosphere browser suite captures all four seasons, night, and an empty garden at desktop and 320px, plus the maximized view. It verifies distinct seasonal artwork, identical frames under reduced motion, animated scene changes, unchanged saved garden state, balanced canvas context, fresh cached bed rendering, and bitmap cleanup. Desktop, phone, seasonal, and night captures were visually reviewed. Source and desktop assets are synchronized.

- [Spring garden](garden-atmosphere-spring-1280.png)
- [Summer garden, maximized](garden-atmosphere-maximized.png)
- [Autumn on a phone](garden-atmosphere-autumn-320.png)
- [Winter on a phone](garden-atmosphere-winter-320.png)
- [Moonlight and path lanterns](garden-atmosphere-night-1280.png)
- [Night on a phone](garden-atmosphere-night-320.png)
- [Empty garden](garden-atmosphere-empty-1280.png)
- [Regression results](tests-atmosphere.log)
- [Visual and cache checks](atmosphere-results.json)
- [Botanical verification](browser-atmosphere-botanical.log)
- [Interaction and animation verification](browser-atmosphere-experiment.log)

Run the focused visual checks with: node dev-tools/companion_planting_atmosphere_qa.cjs.


## Illustrated seed packets and crop search — September 12

Replaced the Planting Dock's tiny emoji cards with botanical seed packets. Each packet shows the crop's illustrated mature form, readable name, base growth requirement, actual seed price, and modeled companion fit. Helpful and conflicting relationships retain text and symbols as well as color. Habitat structures have their own artwork treatment and label, and unaffordable choices explain that more funds are needed.

Added a case-insensitive search for plant names, families, and traits within the active category. Search preserves the current garden, funds, time, and staged placement. Empty results provide a reset that returns focus to the search input. Touch scrolling, browsing arrows, and native keyboard focus reveal the full shelf; changing the plot, category, or search returns the shelf to its beginning. Motion settings govern both packet transitions and arrow scrolling.

The planting preview now uses the same botanical portrait and a compact two-column header that fits phones. Confirmation still performs the actual purchase and planting. The chooser explains that base growth requirements differ from elapsed simulated days, with a separate winter reminder.

The full browser playthrough exposed a zero-width canvas during a workspace layout transition. The renderer now skips zero-sized surfaces and resumes when dimensions return. A regression test covers both zero width and zero height followed by visible rendering.

Validation: **133 tests pass across nine suites**, including two new behavioral tests for search and staged-preview preservation. The complete gameplay browser suite passes, from starter planting through a natural harvest and replanting, with no browser errors or scoped accessibility violations. The focused seed-browser checks pass at desktop and 320px for illustrations, searching, filtering, affordability, keyboard visibility, confirmation, winter guidance, larger text, and both reduced-motion preferences. The atmosphere suite passes zero-size recovery, seasonal rendering, retained-bed invalidation, and cleanup.

Desktop seed packets, phone seed packets, helper choices, and the final phone planting preview were visually reviewed. Source and desktop assets are synchronized; syntax and scoped diff-format checks pass.

- [Illustrated seed chooser](garden-seed-packets-1280.png)
- [Seed packets on a phone](garden-seed-packets-320.png)
- [Planting preview on a phone](garden-seed-preview-320.png)
- [Garden helper choices](garden-seed-helpers-320.png)
- [Regression results](tests-seed-packets.log)
- [Seed-browser results](seed-packet-results.json)
- [Full gameplay verification](browser-seed-packets-gameplay.log)
- [Canvas recovery verification](browser-seed-packets-atmosphere.log)

Run the focused browser checks with: node dev-tools/companion_planting_seed_qa.cjs.

## Illustrated crop watch and harvest follow-through — September 12

Added Crop watch beneath the garden during the growing phase. Three illustrated crop cards prioritize harvestable crops, crops whose health blocks harvest, and the most mature remaining crops. Botanical portraits, animated maturity rings, exact percentages, and distinct ready, care, growing, and winter-rest labels make the next useful action easier to find. The cards share the existing garden-lens calculations, so an immature crop never rounds up to 100%.

Each card opens its plot inspection; closing inspection returns keyboard focus to that card. All crop values opens the harvest view and accessible plot map without advancing time or changing funds or planting. Empty and habitat-only gardens hide Crop watch. After a harvest, annuals leave the watch and perennials visibly restart at zero growth. Winter labels explain the simulation's growth pause.

The layout uses three columns on desktop and compact stacked cards on phones, with larger-text, forced-colors, and both manual and system reduced-motion support. It replaces the old toolbar maturity strip, keeping the garden ahead of the new detail. Crop watch inspection follows the existing sticky-navigation focus behavior.

Fixed harvest history to record only crops actually eligible for collection. A mature crop at health 20 or below remains unharvested and no longer receives a false rotation-history entry when another crop is collected.

Validation: **137 tests passed across nine suites**, including four new crop-watch behavioral tests. The complete gameplay browser suite passes through planting, care, natural harvest, and replanting. Focused browser checks verify priority ordering, exact maturity and health boundaries, inspection and focus return, all-crop navigation, winter rest, post-harvest regrowth, blocked-crop history, empty gardens, larger text, and reduced motion. Desktop and 320px layouts have no horizontal overflow; scoped axe checks report no violations, and both browser runs report no errors.

Desktop, phone, winter, and post-harvest screenshots were visually reviewed. Source and desktop public assets are identical; scoped diff-format and QA syntax checks pass.

- [Crop watch on desktop](garden-crop-watch-1280.png)
- [Crop watch on a phone](garden-crop-watch-320.png)
- [Winter crop watch](garden-crop-watch-winter-320.png)
- [Post-harvest crop watch](garden-crop-watch-after-harvest-320.png)
- [Larger-text crop watch](garden-crop-watch-large-text-320.png)
- [Regression results](tests-crop-watch.log)
- [Focused browser results](crop-watch-results.json)
- [Full gameplay verification](browser-crop-watch-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_crop_watch_qa.cjs.

## Illustrated tending tools and immediate care feedback — September 12

Replaced the three plain care buttons with an illustrated tending tray immediately below the garden. The main garden action still prioritizes urgent care; removing the care buttons from the upper toolbar keeps the garden earlier in the page. Watering can, weeding tool, and compost pail illustrations pair with live moisture, highest plot pest pressure, and nitrogen readings. Soft meter transitions and tool movement follow both motion preferences.

Each action previews its resulting moisture, peak plot pests, or nitrogen value. Watering near saturation explains when the result will exceed the simulation's root-stress threshold. Disabled controls explain saturated soil, pest-free plots, or compost already used that day. The tray uses three columns on desktop and stacked controls on phones, including larger-text and forced-colors modes.

Water, weed, and compost actions now save their actual immediate before-and-after values alongside the existing care decision. The latest action displays an in-place receipt; advancing the day clears it through the existing care lifecycle. Legacy care records without measurements do not invent values. Weeding feedback explicitly uses plot pests, preserving the separate garden-wide pest population. Compost receipts show all three nutrients and organic matter, including capped gains. Toolbar feedback and notifications now report actual capped watering and compost gains as well.

Validation: **141 tests passed across nine suites**, including four new tests covering bounded watering, plot-pest scope, nutrient caps, day boundaries, repeated care, planning, and legacy records. The complete browser gameplay suite passes through planting, care, natural harvest, inspection, and replanting. Focused tending checks pass at 1280px and 320px for action previews, receipts, keyboard activation, larger text, both reduced-motion preferences, and state preservation. Both browser suites report no page errors; scoped axe checks report no accessibility violations.

Desktop, phone, garden context, action receipts, nutrient caps, larger text, and forced-colors captures were visually reviewed. Source and desktop public assets are identical; JavaScript syntax and scoped diff-format checks pass.

- [Garden and tending tray](garden-tending-context-1280.png)
- [Tending tools on desktop](garden-tending-tools-1280.png)
- [Tending tools on a phone](garden-tending-tools-320.png)
- [Immediate compost result](garden-tending-result-320.png)
- [Capped care gains](garden-tending-capped-1280.png)
- [Larger-text controls](garden-tending-large-text-320.png)
- [Forced-colors controls](garden-tending-forced-colors-320.png)
- [Regression results](tests-tending.log)
- [Focused browser results](tending-results.json)
- [Full gameplay verification](browser-tending-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_tending_qa.cjs.

## Harvest basket and crop collection animation — September 12

Added a shaded wicker basket at the edge of the garden, with woven sides, a curved handle, contact shadows, and produce from the most recent recorded harvest. Corn, roots, pods, fruit, leafy crops, herbs, and flowers have distinct harvested forms. The basket keeps the latest batch visible through replanting and saved-state restoration; its label and accessible canvas description identify this as the last harvest rather than a live inventory. Gardens without a recorded batch show an empty basket.

Harvesting now captures the actual eligible plot indices and crop IDs before updating the garden. Produce lifts from those beds along short, staggered arcs into the basket, with brief gold rings marking the source plots. Immature crops, crops at or below the harvest-health boundary, and habitat structures do not join the collection. Perennials reset for regrowth under the existing rules. No simulation, yield, income, or readiness calculations changed.

Collection ends within 2.2 seconds, cancels when the harvest record no longer matches, and releases its references on canvas cleanup. Reduced motion displays the finished basket immediately. Restoring a save or maximizing the garden does not replay an old collection. All artwork stays in the existing canvas and preserves plot hit geometry. Direct scene draws now update tile-width metadata together with the other geometry values, keeping resize measurements consistent.

Validation: **144 tests passed across nine suites**. Three new behavioral tests cover eligible plot capture, perennial reset, accessible basket summaries, replanting, cleared history, and legacy records. The focused harvest browser suite verifies a 13-crop collection with immature, low-health, and habitat plots excluded; animation expiry; still reduced-motion frames; reset cancellation; serialized restoration; unchanged garden state; balanced canvas context; and cleanup. Desktop, phone, night, and maximized views were visually reviewed.

The experiment browser suite also passes all 16 garden targets at desktop and 320px, resizing, saved trials, playback, keyboard navigation, manual and system reduced motion, offscreen pause, and unmount cleanup. Both browser suites report no page errors or scoped accessibility violations. Source and desktop public assets match; JavaScript syntax and scoped diff-format checks pass. One initial focused run exceeded the existing timeout while loading its first seed-search test; the focused rerun and full regression run passed at the unchanged timeout.

- [Harvest collection in the garden](garden-collecting-0-65-1280.png)
- [Filled harvest basket](garden-harvest-basket-1280.png)
- [Collection on a phone](garden-collecting-mobile-320.png)
- [Basket on a phone](garden-harvest-basket-320.png)
- [Moonlit harvest basket](garden-harvest-night-320.png)
- [Maximized phone garden](garden-harvest-maximized-320.png)
- [Regression results](tests-harvest-scene.log)
- [Harvest visual verification](harvest-scene-results.json)
- [Plot interaction and animation verification](browser-harvest-scene-experiment.log)

Run the focused browser checks with: node dev-tools/companion_planting_harvest_scene_qa.cjs.

## In-garden companion explorer and relationship paths — September 12

Added a neighborhood explorer to the Companions view beneath the garden. Players can choose a crop, compare its net modeled growth effect with individual neighboring pairs, and isolate a helpful or conflicting connection. The explorer uses the same eight-bed adjacency and relationship table as the existing garden view. Conflict pairs appear first; distant matching crops and unmodeled pairs do not contribute. Habitat-only gardens have no crop explorer, and active planting previews retain their own evidence without competing explorer controls.

Replaced straight relationship lines with softly curved paths, endpoint rings, and small moving highlights. Helpful links are solid; conflicts are dashed. Selecting one pair dims other paths while its value remains visible above foliage. The explored crop receives a distinct bed outline and a plot-number label in the scene header. Reduced motion keeps the connections still. Placement previews also use the refined path artwork while retaining their existing relationship data.

The selected pair has a plain-language explanation and a Show in garden shortcut. Inspect this crop opens the matching crop panel and returns focus to the explorer with its highlighted pair intact. Shared focus scrolling now accounts for the actual sticky-navigation height, preventing returned controls from sitting underneath it on phones. Selecting crops and pairs preserves planting, time, and funds; valid choices restore from saved state and missing neighbors automatically lose their highlights.

Validation: **148 tests passed across nine suites**, including four new neighborhood tests for adjacency, exact pair effects, state preservation, saved selections, missing neighbors, crop inspection, and preview protection. Focused browser checks verify desktop and 320px layouts, keyboard activation, inspection focus return, the garden shortcut, all eight adjacent beds, distant-crop exclusion, larger text, still reduced-motion frames, animated frames, balanced canvas context, maximized behavior, and cleanup. The relationship table was checked for duplicate undirected pairs.

The complete gameplay browser suite and experiment browser suite both pass, including natural harvest and replanting, all 16 canvas hit targets at desktop and 320px, playback, restored trials, resizing, motion preferences, offscreen pause, and unmount cleanup. All three browser runs report no page errors or scoped accessibility violations. Desktop, phone, and dense eight-neighbor screenshots were visually reviewed. Source and desktop public assets match; JavaScript syntax and scoped diff-format checks pass.

- [Highlighted companion pair](garden-neighborhood-1280.png)
- [Companion explorer on a phone](garden-neighborhood-320.png)
- [All neighborhood connections](garden-neighborhood-all-1280.png)
- [Eight neighbors with larger text](garden-neighborhood-eight-320.png)
- [Regression results](tests-neighborhood.log)
- [Focused browser verification](neighborhood-results.json)
- [Full gameplay verification](browser-neighborhood-gameplay.log)
- [Plot and experiment verification](browser-neighborhood-experiment.log)

Run the focused browser checks with: node dev-tools/companion_planting_neighborhood_qa.cjs.

## Soil materials and immediate tending feedback — September 12

The garden now shows branching cracks and lighter earth below 30% moisture, damp patches on watered beds, and small reflective pools at 90% moisture and above. Water-patch layouts vary between beds. Reflections move gently across saturated soil; winter uses still frost marks. The artwork derives from existing moisture and watered-plot values and does not change simulation rules, time, funds, or crop growth.

The scene footer now labels dry and saturated soil explicitly, uses larger text, and gives the next care step on desktop and phones. The accessible canvas description includes the same soil condition and guidance. Crop portraits, moisture summaries, and saturated-soil alerts now use the existing 90% watering cutoff consistently. The health penalty remains strictly above 90%; the dry-soil cue remains an early prompt below 30%.

Watering immediately removes dry cracks and the warning as moisture recovers. Advancing a day removes the saturated label when actual drainage takes the garden below the cutoff. Soil textures remain in the existing cached bed layer; reflections render independently. Reduced motion produces identical frames, and unmount cleanup releases the cached bitmap.

Validation: **151 tests passed across nine suites**, including three new tests for the moisture boundaries, immediate watering feedback without time or growth changes, and saturation clearing after a day. The focused gameplay run passed all 60 tests. The initial broader run hit three timeouts; the standalone rerun passed at the unchanged timeout. No product changes were needed for those timeouts.

The focused soil browser checks pass at 1280px and 320px, covering dry, moist, watered, saturated, night, winter, care-lens, and maximized scenes. They verify actual tending and drainage, unchanged saved state from painting, independent water-reflection motion, still reduced-motion frames, balanced canvas state, cache equivalence, and cleanup. The experiment browser suite also passes all 16 plot hit targets at desktop and 320px, saved trials, keyboard navigation, resizing, playback, motion preferences, offscreen pause, and cleanup. Both browser suites report no page errors or scoped accessibility violations. Desktop and phone screenshots were visually reviewed; source and desktop assets match, and JavaScript syntax and scoped diff-format checks pass.

- [Dry soil in the garden](garden-soil-dry-1280.png)
- [Saturated soil in the garden](garden-soil-saturated-1280.png)
- [After watering](garden-soil-after-care-1280.png)
- [Dry soil on a phone](garden-soil-dry-320.png)
- [Water reflections on a phone](garden-soil-saturated-320.png)
- [Moonlit soil](garden-soil-night-320.png)
- [Winter soil](garden-soil-winter-320.png)
- [Maximized garden](garden-soil-maximized-1280.png)
- [Full regression results](tests-soil-scene-rerun.log)
- [Focused browser verification](soil-scene-results.json)
- [Plot and experiment verification](browser-soil-experiment.log)

Run the focused browser checks with: node dev-tools/companion_planting_soil_scene_qa.cjs.

## Crop health artwork and care navigation — September 12

Crops now retain solid silhouettes as their health declines. Healthy foliage stays green, low-health foliage turns olive, and critical foliage becomes amber-brown with a lower, leaning posture and gentler sway. These appearances use the existing health boundaries of 40 and 20. Habitat structures keep their usual artwork. The shared botanical renderer carries the same condition into inspection portraits, crop-watch cards, companion portraits, day recaps, and recorded growth replay. Planting previews retain their separate translucent appearance.

Natural view now combines the plot number with a health percentage or Pests tag for crops that need attention. Tags sit above foliage and night lighting, and the cached soil layer omits the duplicate number plaque for those beds. The botanical cache includes the health band, so a saved health change at the same growth stage updates immediately. Both caches retain their existing bounds and cleanup behavior.

A compact guide in the existing garden-view controls explains the leaf colors and tags, with an Open Care view shortcut. It appears only when real crops have low health or pest pressure above 30, and stays out of active placement previews. Keyboard users can open the highest-priority inspection and return to its control below the sticky navigation. The accessible canvas description includes the affected crop count. Weeding clears a pest marker only when actual pressure falls to 30 or below; it does not imply that low-health crops recovered.

Validation: **155 tests passed across nine suites**, including four new tests for exact alert boundaries, habitat exclusions, Care inspection state preservation, truthful weeding feedback, and placement-preview protection. The focused gameplay run passed all 64 tests. The health browser suite verifies desktop and 320px layouts, keyboard entry and focus return, night and maximized scenes, matching health variants at unchanged growth, opaque portraits, unchanged habitat artwork, reduced-motion stability, cache equivalence, and cleanup. Desktop, phone, the care guide, and a health-portrait comparison were visually reviewed.

The experiment browser suite passes all 16 plot hit targets at desktop and 320px, saved trials, resizing, replay controls, motion preferences, offscreen pause, and unmount cleanup. The botanical browser suite passes seedling visibility, maturity readiness, growth easing, water-effect expiry, motion preferences, and day/night continuity. All browser runs report no page errors; the health and experiment suites report no scoped accessibility violations. Source and desktop assets match, and syntax and scoped diff-format checks pass.

- [Garden health cues](garden-health-1280.png)
- [Health cues on a phone](garden-health-320.png)
- [Maximized garden](garden-health-maximized-1280.png)
- [Healthy and stressed portraits](botanical-health-comparison.png)
- [Phone care guide](garden-health-guide-320.png)
- [Nighttime health cues](garden-health-night-320.png)
- [Full regression results](tests-health-scene.log)
- [Focused browser verification](health-scene-results.json)
- [Plot and experiment verification](browser-health-experiment.log)
- [Botanical regression verification](browser-health-botanical.log)

Run the focused browser checks with: node dev-tools/companion_planting_health_scene_qa.cjs.

## Persistent selection and garden-to-inspector navigation — September 12

The inspected bed now keeps a distinct set of cream corner markers while the pointer moves to another crop. Markers render above foliage and nighttime lighting, with a selected-plot label in the scene header. Hover details move above the planting area while an inspection is open, keeping the selected crop visible. Companion exploration uses the same corner artwork and retains its own exploration label. Active placement previews take priority over inspection decoration.

Added Show in garden to crop and habitat inspectors. It focuses the garden, clears the previous hover, and plays one expanding selection pulse. The pulse begins on drawing, ends after 850ms, shares the existing scene loop, and cancels for reduced motion, closed inspections, changed crops, placement previews, or unmount. The ordinary selection markers remain still.

The existing garden-view heading becomes a contextual button for returning to the selected crop details. It also exits maximized view before focusing the inspector. Browsing crops updates the button, header, and accessible canvas description; closing an inspection or removing a selected crop clears them. Locating and returning preserve garden time, budget, planting, and the selected crop's condition.

Validation: **158 tests passed across nine suites**, including three new selection tests for navigation without state changes, browsing and closing, restored habitat selections, invalid plots, and preview protection. The final gameplay rerun passed all 67 tests after checking the return action from maximized view. Focused browser checks pass at desktop and 320px for selection during hover, keyboard navigation to and from the inspector, large text, night, maximized mode, still reduced-motion frames, finite pulse behavior, cache equivalence, canvas state, and cleanup. Desktop, phone, hover, and larger-text control screenshots were visually reviewed.

The full gameplay browser suite passes natural harvest and replanting, crop inspection, care, garden views, and maximized controls. The experiment browser suite passes all 16 plot targets at desktop and 320px, saved trials, resizing, playback, motion preferences, offscreen pause, and cleanup. All three browser suites report no page errors or scoped accessibility violations. Source and desktop assets match; syntax and scoped diff-format checks pass.

- [Selected bed in the garden](garden-selected-1280.png)
- [Selected bed on a phone](garden-selected-320.png)
- [Hovering while inspecting](garden-selected-hover-320.png)
- [Selection in moonlight](garden-selected-night-320.png)
- [Return control with larger text](garden-selection-controls-320.png)
- [Maximized selected garden](garden-selected-maximized-1280.png)
- [Full regression results](tests-selection.log)
- [Final gameplay tests](tests-selection-final.log)
- [Focused browser verification](selection-results.json)
- [Full gameplay verification](browser-selection-gameplay.log)
- [Plot and experiment verification](browser-selection-experiment.log)

Run the focused browser checks with: node dev-tools/companion_planting_selection_qa.cjs.

## Flower visits and garden wildlife — September 12

Replaced the fixed bee orbits with blossom visits: insects pause at a flower, follow a curved flight, and settle at the next destination. Landing sites use the same growth, health, wilt, and sway transforms as the botanical artwork. Native flower positions cover sunflowers, lavender, umbels, borage, buckwheat, low-growing flowers, and the general flower portraits. Bees have translucent wings, striped bodies, legs, and antennae. Added warm-toned butterflies with folding wings, cream markings, and fine veins, and refined the ladybird illustration.

Decorative activity follows the saved garden. Flower destinations require pollinator crops at the authored flowering stage (55% growth) with health above 20; habitat structures and seeds are excluded. Bee illustrations scale with the beneficial population and are capped at three. One butterfly appears from population 18 with at least two flowering plots. A ladybird appears above population 10 near a living crop with foliage, preferring higher pest pressure. These are illustrative choices, not insect counts or new scientific observations; simulation rules and saved observations are unchanged.

Visitors fade with nightfall and remain absent during winter. Reduced motion keeps a still composition. The artwork uses the existing canvas loop with no additional timers or persistent visitor state. Plot geometry, selection, placement previews, care, and harvest interactions retain their existing behavior.

Validation: **158 tests passed across nine suites**. The new wildlife browser checks cover growth and health boundaries, invalid and zero populations, habitat exclusions, population caps, winter, pest-priority shelter, continuous departures and arrivals, blossom pauses, a single flower, empty destinations, stable reduced-motion frames, night, and state restoration. Desktop and 320px scenes preserve saved garden data, canvas transforms and opacity, and cache equivalence. Wildlife artwork, desktop, phone, and maximized previews were visually reviewed. The focused run measured a 5.7ms median and 9.9ms p95 scene paint time on this machine.

The experiment browser checks pass all 16 plot targets at desktop and 320px, saved trials, keyboard controls, resizing, replay, reduced motion, offscreen pause, and cleanup. The botanical browser checks pass exact crop readiness, growth easing, watering expiry, species stages, and day/night continuity. All three browser suites report no page errors; wildlife and experiment checks report no scoped accessibility violations. Source and desktop assets match, and syntax and scoped diff-format checks pass.

- [Garden wildlife](garden-wildlife-1280.png)
- [Wildlife on a phone](garden-wildlife-320.png)
- [Maximized garden](garden-wildlife-maximized-1280.png)
- [Visitor artwork](garden-wildlife-artwork.png)
- [Nighttime garden](garden-wildlife-night-320.png)
- [Winter garden](garden-wildlife-winter-320.png)
- [Full regression results](tests-wildlife.log)
- [Focused browser verification](wildlife-results.json)
- [Plot and experiment verification](browser-wildlife-experiment.log)
- [Botanical regression verification](browser-wildlife-botanical.log)

Run the focused browser checks with: node dev-tools/companion_planting_wildlife_qa.cjs.

## Planting previews and seed-settling feedback — September 12

Planting previews now have a dashed violet bed outline that stays visible through foliage and night lighting. A compact scene label names the crop and plot and distinguishes the future crop shape from its initial seed stage. Habitat previews use installation wording. The old floating Review placement label is suppressed so it does not cover the preview or neighboring crops. The preview uses its own staged crop identity, including restored states where the selected seed packet differs, and broad crops use their normal scene proportions. Invalid, occupied, or out-of-phase previews do not render.

Added See in garden to the simulation preview controls and a matching return-to-preview button in the existing garden-view controls. The return route also works before the first crop is planted and exits maximized view before focusing confirmation. Keyboard focus stays below the sticky navigation, and navigation preserves funds, time, and the staged placement. The canvas description announces which crop and plot are previewed and that confirmation is still required. Darkened the preview's model-estimate caption after the expanded accessibility check found insufficient contrast.

A successful confirmation returns Garden-view focus to the bed. Its seed descends into the soil, followed by a small ring and settling earth particles; structures use a modest installation scale change. The 1.4-second effect begins when the new planting first draws and uses the existing canvas loop. Same-crop replanting immediately resets cached visual growth to the fresh seed stage. Changed crops, removal, growth, day changes, another preview, reduced motion, and unmount cancel the effect. No simulated growth or extra spending comes from the animation.

Validation: **160 tests passed across nine suites**, including two new tests covering preview navigation, the first-plant route, maximized return, affordable confirmation, refused planting, and unchanged seed growth and garden time. The focused gameplay and preview run passed all 72 tests. An initial full-run load timeout passed on an isolated rerun without changing test timeouts.

The new placement browser suite passes desktop and 320px previews, keyboard round trips, night, larger text, habitat previews, saved identity, invalid-preview guards, exact seed-stage reset, descent and expiry, cancellation cases, a real animated confirmation, reduced motion, unchanged saved state, cache equivalence, balanced canvas state, accessibility, and cleanup. Desktop and phone previews, phone controls, and the soil-settling frame were visually reviewed.

The seed-browser suite passes filtering, search, preview preservation, affordability, confirmation, keyboard shelf navigation, winter guidance, and motion preferences. The experiment browser suite passes all 16 plot targets at desktop and 320px, saved trials, resizing, replay controls, offscreen pause, and cleanup. A canvas-click timeout in the parallel browser run passed when rerun alone. All three final browser runs report no page errors or scoped accessibility violations. Source and desktop assets match; syntax and scoped diff-format checks pass.

- [Planting preview in the garden](garden-placement-preview-1280.png)
- [Preview on a phone](garden-placement-preview-320.png)
- [Phone preview controls](garden-placement-controls-320.png)
- [Nighttime preview](garden-placement-night-320.png)
- [Habitat preview](garden-placement-habitat-320.png)
- [Seed descending](garden-seed-fall-1280.png)
- [Soil settling](garden-seed-settle-1280.png)
- [New planting](garden-seed-planted-1280.png)
- [Full regression results](tests-placement-scene.log)
- [Focused planting verification](placement-scene-results.json)
- [Seed-browser verification](browser-placement-seeds.log)
- [Plot and experiment verification](browser-placement-experiment.log)

Run the focused browser checks with: node dev-tools/companion_planting_placement_scene_qa.cjs.
