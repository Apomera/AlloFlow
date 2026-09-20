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

## Distinct tending effects and precise care scope — September 19

Watering now sends short streams into small soil splashes and ripples. Compost falls as varied crumbs, settles across the bed, and briefly outlines the treated soil. Weeding lifts small rooted sprigs that fade as they leave the ground. Effects move through the garden from back to front and render behind crop artwork, keeping plants, plot values, and inspection markers readable.

The care actions capture the affected plots when they run. Watering and composting treat the shared soil across all 16 beds, including empty beds. Weeding animates only planted plots whose pest value actually decreased, including structures when the existing simulation changes their pest value. A zero-change weed action or fully capped compost action clears the effect instead of implying an improvement. Watering keeps the existing saturation guard. Artwork does not add simulated growth, health, spending, or time.

Care effects begin on their first visible draw, so an action performed while the garden is offscreen can still be seen on returning. The existing canvas loop runs the 2.2-second sequence; no new timers or saved animation state are introduced. The effect cancels for reduced motion, a changed day, a different or cleared care receipt, a placement preview, or unmount. Weeding destinations are pruned if their crop is removed or replaced. Harvest animation retains its separate batch validation and timing.

Validation: **162 tests passed across nine suites**, including two new tests for exact weed scope, unchanged health/time/funds, whole-soil treatment, nutrient and moisture caps, and zero-change actions. The focused gameplay suite passed all 71 tests. The new browser suite checks actual care actions, deferred offscreen start and expiry, day and receipt changes, preview cancellation, reduced motion, changed crops, invalid and duplicate destinations, stable reduced-motion frames, distinct artwork, cache equivalence, balanced canvas state, mobile containment, accessibility, and cleanup. Desktop and phone watering scenes and a close-up comparison of all three effects were visually reviewed.

The harvest browser regression passes eligibility, produce flight, basket contents, restored saves, planning, reset cancellation, expiry, reduced motion, desktop, mobile, night, maximized layouts, and cleanup. Both final browser suites report no page errors or scoped accessibility violations. Source and desktop assets match; syntax and scoped diff-format checks pass.

- [Watering the garden](garden-care-water-1280.png)
- [Watering on a phone](garden-care-water-320.png)
- [Weeding affected plots](garden-care-weed-1280.png)
- [Adding compost](garden-care-compost-1280.png)
- [Tending artwork comparison](garden-care-motion-artwork.png)
- [Full regression results](tests-care-motion.log)
- [Focused gameplay results](tests-care-motion-focused.log)
- [Care animation verification](care-motion-results.json)
- [Harvest regression verification](browser-care-motion-harvest.log)

Run the focused browser checks with: node dev-tools/companion_planting_care_motion_qa.cjs.

## Clear harvest readiness and a garden-to-harvest route — September 19

Harvestable crops now carry gold check marks on their plot plaques, above foliage and night lighting. Healthy crops say Ready; crops with low health or high pest pressure retain their care values beside the check. Exact eligibility remains maturity at or beyond the crop's required days and health strictly above 20, excluding habitat structures. Static plot-number caching includes readiness so a newly ready or harvested bed cannot retain a duplicate or missing number.

The existing Natural-view guide now shows the ready count and provides Open Harvest view beside Open Care view when needed. Keyboard activation focuses the harvest inspection action, and closing crop details restores focus below the sticky navigation. The canvas description includes the harvestable count. Placement previews retain their own controls, and inspection and view changes preserve crops, time, moisture, and funds.

A fresh sequential day report can trigger a 1.5-second gold ring and small glints over plots that actually became ready. The cue uses the existing drawing loop and does not change simulated growth or health. Restored gardens, same-day reports, rewinds, skipped days, stale reports, and year resets remain quiet. Reduced motion, placement previews, other analytical views, the next day, lost readiness, crop replacement, and unmount clear or prune the cue. No animation state is saved with the garden.

Validation: **164 tests passed across nine suites**, including two new tests for exact readiness boundaries, care coexistence, habitat exclusion, preview suppression, and the inspection round trip with unchanged garden state. The new browser suite checks mixed and fully ready gardens at 320px, tag collision bounds, desktop and night scenes, keyboard focus, real next-day readiness, expiry, harvest and replanting, restored-state guards, malformed report entries, stable reduced-motion frames, cache equivalence, balanced canvas state, mobile containment, accessibility, and cleanup. Desktop, dense phone, nighttime phone, guide, and newly-ready previews were visually reviewed.

Existing care and harvest browser regressions also pass. All three browser suites report no page errors or scoped accessibility violations. Source and desktop assets match; syntax and scoped diff-format checks pass.

- [Ready crops in the garden](garden-ready-1280.png)
- [Phone garden](garden-ready-320.png)
- [All 16 beds ready on a phone](garden-ready-dense-320.png)
- [Nighttime phone garden](garden-ready-night-320.png)
- [Phone harvest and care guide](garden-ready-controls-320.png)
- [Newly ready crop](garden-newly-ready-1280.png)
- [Full regression results](tests-readiness.log)
- [Readiness browser verification](readiness-results.json)
- [Care regression verification](browser-readiness-health.log)
- [Harvest regression verification](browser-readiness-harvest.log)

Run the focused browser checks with: node dev-tools/companion_planting_readiness_qa.cjs.

## Illustrated bed navigator — September 19

Replaced the text-only plot buttons with miniature botanical beds. Each uses the existing vector artwork at its actual growth stage and health condition, including seeds, sprouts, mature crops, habitat structures, and empty soil. Numbered plaques retain the four-by-four plot order. Empty beds have a quiet plus marker; harvestable crops have gold check marks, and low-health or pest values remain visible beside readiness. Harvest, Care, and Companions views keep their existing numerical values and colors.

Staged plantings use the preview's own crop identity, translucent artwork, a dashed violet outline, and an explicit Preview label. They remain separate from planted crops and become zero-day seed portraits only after confirmation. Natural-view accessible names now include maturity, readiness, and local care information. Habitat structures are not presented as crops, and planting previews announce that confirmation is still needed.

Added a small pointer-hover lift while keeping the miniature canopies still. Manual and operating-system reduced motion suppress the lift. Full crop names, compact larger-text styling, spacious touch targets, and improved focus outlines work at 320px without changing the four-column layout. Arrow keys, Home/End, Enter, and return focus retain their existing behavior. Collapsing the navigator removes its extra portraits and buttons from the DOM.

Validation: **166 tests passed across nine suites**, including two new tests covering exact readiness and care boundaries, habitat exclusion, accessible descriptions, staged identity, unchanged funds before confirmation, and the transition to a planted seed. The focused browser suite verifies all 16 portraits, seed/sprout/leafing stages, plant condition, four-column geometry, targets larger than 44px, unclipped text, one keyboard tab stop, keyboard inspection and return, every analytical view, actual preview and confirmation, care updates, pointer movement, reduced motion, larger text, forced-color focus, mobile containment, accessibility, and collapse cleanup. Final desktop, phone, and enlarged-text previews were visually reviewed.

The existing gameplay browser regression also passes, including the naturally grown first harvest, mobile crop inspection, and garden views. Both browser suites report no page errors or scoped accessibility violations. Source and desktop assets match; syntax and scoped diff-format checks pass.

- [Illustrated plot navigator](garden-plot-cards-1280.png)
- [Phone plot navigator](garden-plot-cards-320.png)
- [Planting preview in the navigator](garden-plot-preview-320.png)
- [Larger text on a phone](garden-plot-readable-320.png)
- [Full regression results](tests-plot-cards.log)
- [Focused browser verification](plot-cards-results.json)
- [Gameplay regression verification](browser-plot-cards-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_plot_cards_qa.cjs.
## Produce illustrations and complete harvest summaries — September 19

Harvest summaries now show gathered produce and cut bundles in the garden's existing muted botanical palette. The illustrations cover all 31 non-structure plant types, including corn ears, root vegetables, berries, leafy heads, herbs, and flowers. Rhubarb uses cut stalks and lavender uses distinct flower spikes. Artwork is decorative, with crop identity and counts available as text; the pictures do not represent a physical yield quantity.

Each crop row shows its recorded harvested count, points, and funds. The first four types remain immediately visible, while a native keyboard-accessible disclosure reveals every remaining type. The layout uses two columns on desktop and one column on phones, with a wrapping summary header and clear focus outlines. An open-bed note explains the next planting opportunity and clarifies that harvested perennials remain planted for another harvest. Existing replanting, keep-growing, history, dismissal, and reduced-motion behavior is preserved.

Missing values in older saved receipts explicitly say Value not recorded or Points not recorded. Invalid crop entries are filtered through the existing harvest validation helper. The same filtering fixes a hidden harvest-history crash caused by null entries. Reviewing, expanding, or dismissing a summary does not change crops, time, score, or funds.

Validation: **all 168 tests passed across nine suites across the initial run and rerun**. The initial run passed 165 tests and had three 5-second timeouts; rerunning those three suites passed all 126 tests with unchanged time limits. Two new tests cover exact per-crop amounts, all harvested types, perennial guidance, unchanged garden state, missing legacy values, and malformed entries.

The new browser suite verifies an actual 15-crop harvest across 14 types at desktop and 320px, exact recorded amounts, collapsed and expanded layouts, unclipped content, keyboard disclosure, reduced motion, focus handoff, annual replanting, a full perennial garden, legacy data, dismissal, and cleanup. Desktop and phone summaries and the complete artwork sheet were visually reviewed. The existing gameplay browser regression also passes, including the naturally grown first harvest on day 19, mobile crop inspection, garden views, and replanting. Both browser suites report no page errors or scoped accessibility violations.

Source and desktop assets match at SHA256 `51B19CD2BFF987AA437AA8AC00816ADF40520F582EC1AE345F6A436D0F2383CB`. Syntax and scoped diff-format checks pass.

- [Desktop harvest summary](harvest-receipt-1280.png)
- [Phone harvest summary](harvest-receipt-320.png)
- [All crop types on desktop](harvest-receipt-expanded-1280.png)
- [All crop types on a phone](harvest-receipt-expanded-320.png)
- [Older saved harvest on a phone](harvest-receipt-legacy-320.png)
- [Produce illustration sheet](harvest-produce-artwork.png)
- [Initial regression results](tests-harvest-receipt.log)
- [Passing rerun of timeout-affected suites](tests-harvest-receipt-rerun.log)
- [Harvest summary browser verification](harvest-receipt-results.json)
- [Gameplay browser regression](browser-harvest-receipt-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_harvest_receipt_qa.cjs.
## Illustrated starter layouts with a compact garden arrival — September 19

Empty gardens now offer Preview layout beside the starter selector. The expandable view shows all sixteen planned beds with botanical illustrations, numbered positions, visible empty beds, and an accessible description of the complete arrangement. Three Sisters, Pollinator Patch, Salad Garden, and Soil Builder each retain their existing recipe. A short purpose statement, separate crop and habitat counts, open-bed count, and expandable inventory make their contents easier to compare.

The preview and actual planting now share the same sixteen-bed model and rounded seed-cost calculation. Each preview shows the exact purchase price and remaining funds, or the additional amount needed. Prices are $5.50, $5.30, $3.80, and $2.40 respectively. Selecting or inspecting a starter does not spend funds or advance time. Mature illustrations are explicitly identified as a layout preview; planted crops still begin at zero growth. Winter includes a growth-pause note, and custom planting and free recovery seeds remain available under their existing conditions.

The preview is collapsed on arrival so the live garden stays visible in the initial desktop and phone view. Opening it focuses the preview; closing returns focus to its toggle. Planting transfers focus to Start growing below the sticky navigation. The preview uses a two-column desktop composition, a single-column phone layout, native inventory disclosure, controls at least 44px high, readable-text styling, and forced-color focus outlines. Its miniature plants stay still and add no animation loop.

Validation: **170 tests passed across nine suites**, including two new tests covering every illustrated recipe against the actual planted positions, unchanged state before purchase, exact charges, zero-day seedlings, insufficient funds, winter notes, and recovery. The focused starter run passed eight tests. The new browser suite verifies all four actual purchases, keyboard selection and inventory, opening and closing focus, post-plant focus, 320px containment, exact-budget purchases, custom-preview guards, larger text, reduced motion, forced colors, accessibility, and cleanup. Final desktop arrival and desktop/phone preview artwork were visually reviewed.

The existing gameplay browser regression passes its original initial-screen bounds and the natural first harvest on day 19, along with planting, care, crop inspection, harvest proceeds, replanting, and workspace continuity. Both browser suites report no page errors or scoped accessibility violations. Source and desktop assets match at SHA256 `E9DDFA7D43D2E644C7547A85667C8C1D945297360AAB046AFB004F8BC39D9F3A`; syntax and scoped diff-format checks pass.

- [Desktop starter preview](garden-starter-preview-1280.png)
- [Phone starter preview](garden-starter-preview-320.png)
- [Expanded phone inventory](garden-starter-inventory-320.png)
- [Larger text on a phone](garden-starter-readable-320.png)
- [Three Sisters layout](garden-starter-sisters-1280.png)
- [Pollinator Patch layout](garden-starter-pollinator-1280.png)
- [Soil Builder layout](garden-starter-soil-1280.png)
- [Compact garden arrival](gameplay-first-garden-desktop.png)
- [Full regression results](tests-starter-preview.log)
- [Focused starter results](tests-starter-preview-focused.log)
- [Starter browser verification](starter-preview-results.json)
- [Gameplay browser regression](browser-starter-preview-gameplay.log)

Run the focused browser checks with: node dev-tools/companion_planting_starter_preview_qa.cjs.
## Before-and-after portraits in the daily recap — September 19

Daily crop highlights now pair Before and Day end portraits, showing the recorded plant identity, maturity, health, and explicit harvest-readiness flag. The shared botanical art reflects the recorded growth stage and health on each side. Gold ready markers use the saved readiness flag rather than inferring harvestability from a rounded maturity percentage. Existing highlight priorities, expandable evidence, inspection actions, and replanting actions remain available.

Cleared annual beds visibly change from a crop to empty soil. Perennial carryover uses its actual recorded day-end stage, including the simulation's growth reset. Empty-to-planted beds begin with an empty portrait and show the recorded seed stage. A replacement crop is labeled Planting changed and uses each side's own identity instead of presenting the change as ordinary growth. Missing legacy stages use an explicit unknown-stage placeholder; missing health is labeled Health not recorded. Historical images remain unchanged after live watering, harvesting, or replacement because they read only the saved report.

Comparison cards use a compact paired illustration beside the explanation on desktop and place the two portraits above the explanation on small phones. Crop names, values, and state labels accompany decorative artwork. Larger-text and forced-color styles retain readable values and keyboard focus. Historical portraits stay still; the existing bounded recap entrance continues to respect both motion preferences. No timers or saved animation state were added.

Validation: **173 tests passed across nine suites**, including three new behavioral tests for actual seedling-stage changes, immutable saved portraits, annual clearing, perennial carryover, explicit empty beds, changed crop identities, missing legacy values, and readiness. The focused recap run passed eleven tests. The new browser suite verifies real daily and year-end reports, exact values, 320px containment, paired alignment, 44px controls, expandable evidence, focus handoff, tending and replacement isolation, live inspection, replanting, larger text, stationary artwork, forced colors, accessibility, and cleanup.

The existing recap browser regression also passes forecast alignment, both reduced-motion preferences, year transitions, preview protection, replanting, legacy reports, and serialized restoration. Both browser suites report no page errors or scoped accessibility violations. The phone daily recap, desktop year-end comparison, and legacy phone comparison were visually reviewed. Source and desktop assets match at SHA256 `75FF35C1E92FDF3CA18DD501B3C8AC5CD30493D3F9519B38711D8FD5B4D12A5C`; syntax and scoped diff-format checks pass.

- [Daily comparisons on desktop](garden-day-comparison-1280.png)
- [Daily comparisons on a phone](garden-day-comparison-320.png)
- [Expanded plot evidence](garden-day-comparison-expanded-320.png)
- [Year-end comparisons](garden-day-comparison-year-1280.png)
- [Year-end comparisons on a phone](garden-day-comparison-year-320.png)
- [Older saved report](garden-day-comparison-legacy-320.png)
- [Larger text on a phone](garden-day-comparison-readable-320.png)
- [Full regression results](tests-day-comparison.log)
- [Focused recap results](tests-day-comparison-focused.log)
- [Comparison browser verification](day-comparison-results.json)
- [Existing recap browser regression](browser-day-comparison-recap.log)

Run the focused browser checks with: node dev-tools/companion_planting_day_comparison_qa.cjs.
## Illustrated relationship evidence before planting — September 19

Planting previews now show illustrated relationship cards in place of small text badges. Every modeled neighbor has its plot number, crop name, current botanical portrait, helpful/conflict label, signed pair effect, and existing model explanation. Portraits use the actual neighboring crop's stage and health. The heading and evidence use the crop being previewed, even when a restored save has a different seed selected.

Conflicts appear first, ordered by effect magnitude and plot position; helpful pairs follow. The first two cards remain visible, and a native expandable list reveals the rest while naming any additional conflicts in its summary. A net pair effect summarizes these relationships separately from the broader growth estimate. The explanatory note identifies these values as simulation effects and acknowledges the other growth inputs. Neighbor selection, relationship values, seed pricing, and confirmation rules are unchanged.

Warm cream panels and crop portraits connect the preview to the garden. Cards use two columns on desktop and one on phones, with explicit text labels as well as color. The disclosure supports keyboard interaction, visible focus, and a minimum 44px target. Larger-text and forced-color layouts remain usable. Evidence portraits stay still; no timers or saved animation state were added. Browsing the evidence does not alter the staged planting, garden, funds, or day.

Validation: **175 tests passed across nine suites**, including two new behavioral tests covering conflict ordering, exact effects, current stage and health, staged crop identity, diagonal and corner neighbors, distant-bed exclusion, cancellation, and habitat previews. The new browser suite verifies all eight modeled neighbors, disclosure state, 320px containment, larger text, keyboard interaction, forced-color focus, stationary artwork, live neighbor changes, insufficient funds, and real confirmation with the exact seed charge.

The existing placement browser regression also passes preview-to-garden focus handoff, first-plant navigation, seed-stage confirmation, bounded planting animation, cancellation guards, reduced motion, night and habitat scenes, caches, and cleanup. Both browser suites report no page errors or scoped accessibility violations. The collapsed phone cards, expanded desktop cards, and larger-text phone cards were visually reviewed. Source and desktop assets match at SHA256 `19BDFBBD407F60F53C96B5E8845AD3AA313F94DBE6BF2CA34A33E6272ACAFCA8`; syntax and scoped diff-format checks pass.

- [Planting review on desktop](garden-planting-review-1280.png)
- [Planting review on a phone](garden-planting-review-320.png)
- [Expanded relationship cards on desktop](garden-preview-pairs-expanded-1280.png)
- [Collapsed relationship cards on a phone](garden-preview-pairs-320.png)
- [Expanded relationship cards on a phone](garden-preview-pairs-expanded-320.png)
- [Larger-text relationship cards](garden-preview-pairs-readable-320.png)
- [Full regression results](tests-preview-pairs.log)
- [Relationship browser verification](preview-pairs-results.json)
- [Existing placement browser regression](browser-preview-pairs-placement.log)

Run the focused browser checks with: node dev-tools/companion_planting_preview_pairs_qa.cjs.
## An illustrated growth journey in the crop inspector — September 19

The live crop inspector now includes a compact five-stage journey: Seed, Sprout, Leaves, Develop, and Mature. A warm gold card and explicit Now marker identify the current stage, earlier milestones have check marks, and later stages use muted illustrative portraits. The current portrait reads the inspected crop's actual growth and health; the other portraits are explicitly described as illustrations rather than saved history. Switching plots immediately updates identity, stage, and guidance.

The guide follows accumulated modeled growth rather than elapsed calendar days. It shows the next maturity threshold and explains winter dormancy. Maturity remains capped at 99% until the exact requirement is reached. A fully grown crop with health at or below 20 is labeled as needing health above 20 before harvest; readiness uses the shared harvest rule. Habitat structures and missing growth records do not receive a crop-stage journey. Annual harvest removes the cleared crop's inspector, while perennial harvest displays the actual saved regrowth stage.

The active portrait has a single 400ms arrival animation, with no repeating artwork animation or added timers. Both the operating-system and in-app reduced-motion preferences suppress it. A five-column strip fits at 320px, including larger-text mode. Semantic ordered stages, an explicit current-step label, and forced-color outlines preserve the meaning without relying on color. Garden simulation, seed costs, care effects, and harvest rules are unchanged.

Validation: **177 tests verified across nine suites**. The full run passed 176 tests; one pre-existing weed-feedback check hit its five-second timeout and passed unchanged on a focused rerun in 343ms. Two new behavioral tests cover live portraits, exact transitions, crop browsing, unchanged garden state, winter dormancy, full maturity, health-gated readiness, and habitat exclusion. The new browser suite checks the precise boundaries for all 31 crops and three structures, mobile and larger-text containment, keyboard browsing, accessibility, finite animation, both reduced-motion settings, real day progression, watering, annual harvest clearing, and perennial regrowth.

The existing selection browser regression passes desktop and phone focus round trips, persistent selection, bounded locate animation, night and maximized scenes, reduced motion, preview cancellation, and cleanup. Its stale preview fixture was corrected to use a known crop on an empty bed in planning mode; new assertions also verify that occupied-bed and missing-crop previews do not suppress selection. No production selection logic changed. Both browser suites report no page errors or scoped accessibility violations.

The full desktop inspector and larger-text phone journey were visually reviewed. Source and desktop assets match at SHA256 `FDC15342D5696FED7D5BED62F58EF265060F1FC3173820EDA76B191B7E934E4D`; syntax and scoped diff-format checks pass.

- [Crop inspector on desktop](garden-growth-inspector-1280.png)
- [Crop inspector on a phone](garden-growth-inspector-320.png)
- [Growth journey on desktop](garden-growth-journey-1280.png)
- [Growth journey on a phone](garden-growth-journey-320.png)
- [Larger-text growth journey](garden-growth-journey-readable-320.png)
- [Mature crop that needs care](garden-growth-mature-care-320.png)
- [Harvest-ready crop](garden-growth-ready-320.png)
- [Winter guidance](garden-growth-winter-320.png)
- [Full regression results](tests-growth-journey.log)
- [Unchanged timeout rerun](tests-growth-journey-rerun.log)
- [Focused growth tests](tests-growth-journey-focused.log)
- [Growth journey browser verification](growth-journey-results.json)
- [Selection browser regression](browser-growth-journey-selection.log)

Run the focused browser checks with: node dev-tools/companion_planting_growth_journey_qa.cjs.
## Contextual care inside the crop inspector — September 19

The crop inspector now includes a compact Care check with an illustrated tool, a specific recommendation, the action's garden-wide scope, and an exact before-and-after preview. Dry soil suggests watering, high plot pests suggest weeding, and low nitrogen suggests compost only for crops that consume nitrogen. After each action, the inspector updates to the next relevant need and shows the recorded garden-care result.

The new buttons reuse the existing water, weed, and compost actions. Moisture changes across the garden; weeding affects every planted plot; compost changes shared nitrogen, phosphorus, potassium, and organic matter. Health, maturity, funds, selection, and the day remain unchanged. The text distinguishes these immediate condition changes from crop recovery. Wet soil receives drainage guidance, and same-day compost reuse remains disabled with an explanation.

The check is available while growing and excludes habitat structures. Planning and staged previews do not expose these care actions. Nitrogen-fixing crops do not receive heavy-feeder advice, and older care receipts disappear when the day changes. Healthy crops receive a calm observation message or harvest guidance; low-health crops retain a recovery reminder with links already available below for companion and root inspection.

Keyboard activation returns focus to the updated care section so the next recommendation and recorded result remain in context. The card uses a full-width action button on phones, supports larger text and forced colors, and keeps its illustrations still. The existing garden care animations continue through the shared actions; no new timers or care rules were added.
Validation: **179 tests verified across nine suites**. The full run passed 177 tests; two existing preview/navigation checks exceeded their five-second limits. Both affected suites passed unchanged on a rerun (six tests). The two new behavior tests verify action sequencing, exact shared effects, unchanged crop health and maturity, preserved day and funds, compost reuse, planning and preview protection, habitat exclusion, drainage, and harvest guidance.

The new browser suite checks real keyboard-triggered water, weed, and compost actions, focus return to the updated care check, exact recorded effects, all 31 crops' nitrogen roles, three habitat structures, care thresholds, stale receipt removal, 320px and larger-text layouts, 44px buttons, forced-color focus, stationary evidence, and cleanup. The existing tending browser regression also passes shared action previews, bounded nutrient effects, receipts, time and budget preservation, day transitions, legacy saves, keyboard interaction, and both motion preferences. Both browser suites report no page errors or scoped accessibility violations.

The larger-text phone action card, full desktop inspector, and phone recovery/result state were visually reviewed. Source and desktop assets match at SHA256 `EC526B7DEEF57287F5FB6BF2CD6497360124415E11C88591CDB2DAE61F3D9389`; syntax and scoped diff-format checks pass.

- [Care inside the desktop inspector](garden-crop-care-inspector-1280.png)
- [Care inside the phone inspector](garden-crop-care-inspector-320.png)
- [Desktop care recommendation](garden-crop-care-1280.png)
- [Larger-text phone care card](garden-crop-care-readable-320.png)
- [After watering](garden-crop-care-after-water-320.png)
- [After weeding](garden-crop-care-after-weed-320.png)
- [After composting](garden-crop-care-after-compost-320.png)
- [Compost already used today](garden-crop-care-compost-used-320.png)
- [Drainage guidance](garden-crop-care-drain-320.png)
- [Full regression results](tests-crop-care.log)
- [Unchanged timing reruns](tests-crop-care-rerun.log)
- [Focused care tests](tests-crop-care-focused.log)
- [Inspector care browser verification](crop-care-results.json)
- [Existing tending browser regression](browser-crop-care-tending.log)

Run the focused browser checks with: node dev-tools/companion_planting_crop_care_qa.cjs.
## Live condition gauges behind crop care — September 19

The inspector's Care check now shows shared soil moisture, pests on the selected plot, and shared soil nitrogen together. Each compact gauge includes its current numeric reading, its scope, a text status, and a shaded model care range where applicable. Multiple needs remain visible even while the card recommends one action. Watering clears only the moisture warning; weeding and compost update their own readings while leaving unrelated needs visible.

Moisture uses the existing 30–90% care range, pests flag growth slowdown above 30, and nitrogen flags values below 15 only for crops with a negative nitrogen effect. Nitrogen-fixing and neutral crops receive a Not limiting this crop label without a misleading nitrogen care range. Missing, non-finite, or negative readings are explicitly Not recorded and do not create a zero-valued meter. Older numeric values above 100 remain intact, with the meter's maximum extended to contain them.

Gauges preserve exact numeric values for assistive technology, with scope and thresholds in their descriptions. Visible values follow the existing one-decimal formatting. Text warnings accompany amber styling, and forced-color mode retains range outlines. Value changes use a bounded 350ms transition; both in-app and operating-system reduced-motion preferences disable transitions. The layout remains three columns at 320px, including larger text. Existing care priorities, action effects, and harvest rules are unchanged; no new timers were added. Invalid measurements cannot drive a recommendation, while other known needs can still take priority. When measurements are missing and no known condition takes priority, the recommendation explicitly acknowledges incomplete data instead of reporting no urgent care signal.
Validation: **181 tests verified across nine suites**, including two new behavioral tests for simultaneous care needs, independent updates after real tending actions, exact boundaries, selected-crop nitrogen roles, and unknown readings. The initial full run passed five suites; 12 checks in three other suites exceeded the five-second limit, and the experiment worker failed to start. Gameplay and refinement reruns passed all 138 checks. Separate-process workers then passed all 14 persistence and experiment checks after thread-worker startup failures. These reruns used a command-only 30-second test limit; repository test settings and assertions were unchanged. Four focused care checks also passed after the final incomplete-data guard, including invalid values and preserving recommendations for other known needs.

The new browser suite verifies all three readings through real keyboard-triggered water, weed, and compost actions, unchanged health/maturity/day/funds, focus return, exact thresholds, all 31 crop nitrogen roles, three habitat exclusions, unknown and legacy-high readings, planning guards, 320px and larger-text containment, forced-color range outlines, and bounded transitions under both motion preferences. The existing crop-care browser regression also passes the action sequence, exact receipts, 44px controls, compost reuse, saturated soil, habitat exclusion, stale receipt removal, and cleanup. Both suites report no page errors or scoped accessibility violations. The reduced-motion check accounts for the application's global 0.01ms duration rule while explicitly verifying transition-property is none.

The full desktop inspector, larger-text phone readings, after-watering state, and final missing-pest-data state were visually reviewed. Source and desktop assets match at SHA256 `476567546AE4CB6D35DE98D90E879341C40F433E78FD07D6782AF15A9D472148`; syntax and scoped diff-format checks pass.

- [Desktop inspector with live readings](garden-care-readings-inspector-1280.png)
- [Phone inspector with live readings](garden-care-readings-inspector-320.png)
- [Care readings on desktop](garden-care-readings-1280.png)
- [Larger-text readings on a phone](garden-care-readings-readable-320.png)
- [Moisture resolved; other needs remain](garden-care-readings-after-water-320.png)
- [After weeding](garden-care-readings-after-weed-320.png)
- [After composting](garden-care-readings-after-compost-320.png)
- [Nitrogen-fixing crop](garden-care-readings-fixer-320.png)
- [Explicitly unknown pest reading](garden-care-readings-unknown-320.png)
- [Full regression results](tests-care-readings.log)
- [Gameplay and refinement rerun](tests-care-readings-rerun.log)
- [Persistence and experiment worker rerun](tests-care-readings-worker-rerun.log)
- [Final focused care verification](tests-care-readings-final-focused.log)
- [Gauge browser verification](care-readings-results.json)
- [Existing crop-care browser regression](browser-care-readings-crop-care.log)

Run the focused browser checks with: node dev-tools/companion_planting_care_readings_qa.cjs.

## Choose the next bed from the harvest summary — September 19

The harvest summary now includes an optional, initially collapsed map of the current 16-bed garden. Players can choose a specific open bed for their next planting while seeing the crops and habitat structures that remain in place. Current botanical portraits show regrowing perennials and the condition of standing crops. Numbered positions preserve the garden's four-column arrangement, and a count distinguishes available and planted beds.

Choosing a bed opens crop selection for that exact plot, clears the prior crop selection, and moves keyboard focus to the planting dock. Preview and confirmation still happen before seed funds are spent. Reading the map leaves the entire garden state unchanged; routing preserves funds, day, crops, harvest totals, history, and recorded rewards. Occupied beds cannot be selected, and both the map and quick-replant action protect a planting preview already in progress. Gardens filled with perennial crops retain the existing Keep growing action without an unnecessary chooser.

The map uses a native keyboard-operable disclosure, full crop and row/column labels for assistive technology, and controls at least 44px in both dimensions. It remains four columns at 320px with either text-size setting. Long crop labels use ellipses on narrow screens, with full names retained in hover titles and accessible labels; available beds keep a short, untruncated Open label. Focus remains visible in forced colors. A bounded 180ms hover transition gives available beds a small lift, and both operating-system and in-app reduced-motion preferences suppress it. Crop illustrations remain still. Action spacing keeps the existing quick-replant and history buttons distinct from the expanded map.

Validation: **95 tests passed across the affected gameplay and preview suites**, including two new behavioral tests for the live map, exact chosen-bed routing, preserved state and rewards, occupied-bed protection, and staged-preview protection. The full-perennial test also verifies that the chooser is absent. This pass ran the affected suites with separate-process workers and a command-only 30-second test limit; it did not rerun all companion-planting suites. Repository test settings remain unchanged.

The new browser suite passes an actual harvest, desktop and 320px layouts, standard and larger text, native disclosure and keyboard navigation, exact seed-cost confirmation, occupied and staged-preview guards, current occupancy changes, full perennial gardens, forced colors, both reduced-motion preferences, and cleanup. Previously seen reflection prompts are represented in the fixture so unrelated delayed prompts cannot mutate the baseline state. The existing harvest-summary browser regression also passes its receipt, history, disclosure, legacy-data, replanting, and perennial scenarios. Both browser suites report no page errors or scoped accessibility violations.

The final full desktop receipt and larger-text phone map were visually reviewed. Source and desktop assets match at SHA256 `8F850C74EECD4073B753C166A31DE3B59AD9208A64067515815112D61E54FC51`; syntax and scoped diff-format checks pass.

- [Full desktop harvest summary](harvest-replant-receipt-1280.png)
- [Full phone harvest summary](harvest-replant-receipt-320.png)
- [Desktop garden map](harvest-replant-map-1280.png)
- [Phone garden map](harvest-replant-map-320.png)
- [Larger-text phone map](harvest-replant-readable-320.png)
- [Initially collapsed summary](harvest-replant-collapsed-1280.png)
- [Planting preview protection](harvest-replant-preview-guard-320.png)
- [Gameplay and preview test results](tests-replant-picker.log)
- [Garden map browser verification](replant-picker-results.json)
- [Existing harvest-summary regression](browser-replant-picker-receipt.log)

Run the focused browser checks with: node dev-tools/companion_planting_replant_picker_qa.cjs.

## Illustrated companion effects inside the crop inspector — September 19

The crop inspector's companion section now shows each neighboring crop as a botanical portrait at its actual growth stage and health. Every relationship card includes the crop name, plot number, signed modeled growth effect, the existing explanation, a small three-by-three position marker, and an explicit Inspect crop action. The outlined center marks the selected crop; the filled square and direction label locate the neighbor. Full accessible labels include the crop, effect, explanation, direction, row, and column.

A compact contribution summary separates helpful and conflicting pair counts and their exact totals, alongside the existing net effect. For example, five helpful pairs contributing +58% and three conflicting pairs contributing -45% explain a +13% net result. Contributions update from the live grid. Existing conflict-first ordering remains intact; four cards show initially, and the native disclosure identifies any additional conflicts among hidden cards. Selecting a different crop resets the disclosure. Corners do not wrap across rows, unmodeled pairs stay absent, and habitat inspectors omit this crop-only section.

Cards remain two columns on desktop and one column on phones. Larger text covers explanations, plot labels, direction labels, action labels, and contribution counts. Color is supported by explicit support/conflict text and signed numbers. Keyboard focus is visible in forced colors, and all card/disclosure targets are at least 44px tall. Portraits use a bounded 180ms hover lift; operating-system and in-app reduced-motion preferences suppress it. Botanical stage animations remain disabled within these evidence cards. Inspecting a neighbor reuses the existing focus handoff and preserves plantings, funds, time, phase, and recorded harvest rewards.

Validation: **97 tests passed across the affected gameplay and preview suites**, including two new behavior tests for exact mixed contributions, all eight directions, current portrait stages and health, navigation state preservation, hidden conflict counts, live occupancy changes, corner adjacency, and absent/unmodeled/habitat selections. This pass ran the affected suites with separate-process workers and a command-only 30-second test limit; the full companion-planting test set was not rerun. Repository test settings remain unchanged.

The new browser suite passes desktop and 320px layouts, four/eight-card disclosure states, standard and larger text, current portraits, direction markers, exact values, keyboard inspection, return-to-crop disclosure reset, changing neighbors, all-conflict and corner gardens, empty pairs, habitat and invalid selections, forced colors, hover motion, both reduced-motion settings, and cleanup. The existing garden-selection browser regression also passes inspector return focus, selected-crop tracking, locate animation timing and cancellation, valid preview priority, phone/night/maximized views, and canvas cleanup. Both suites report no page errors or scoped accessibility violations.

The desktop cards, final larger-text phone section, and expanded desktop relationships were visually reviewed. Source and desktop assets match at SHA256 `528C5570D7388A95F8D3119453E6F2026EA05919174E6B2F5F1FBD02C3CDBA89`; syntax and scoped diff-format checks pass.

- [Desktop companion cards](garden-inspector-pairs-1280.png)
- [Full desktop crop inspector](garden-inspector-companions-1280.png)
- [Phone companion cards](garden-inspector-pairs-320.png)
- [Larger-text phone section](garden-inspector-pairs-readable-320.png)
- [All desktop relationships](garden-inspector-pairs-expanded-1280.png)
- [All phone relationships](garden-inspector-pairs-expanded-320.png)
- [Additional conflicts remain discoverable](garden-inspector-pairs-conflicts-320.png)
- [Gameplay and preview test results](tests-inspector-pairs.log)
- [Illustrated inspector browser verification](inspector-pairs-results.json)
- [Existing selection browser regression](browser-inspector-pairs-selection.log)

Run the focused browser checks with: node dev-tools/companion_planting_inspector_pairs_qa.cjs.

## Illustrated seasonal outlook in the garden controls — September 20

The main garden controls now include an initially collapsed Season outlook. Its summary names the next season and the exact number of simulated days until it starts. Opening the outlook reveals four original SVG landscapes in the living garden's palette: spring blossoms, summer sun and flowers, autumn foliage, and a bare winter tree with snow. The current season has a Now badge and an accessible current-step marker. A day-position bar connects the current day to the season's 30-day length.

The outlook explains the next transition using the existing simulation rules. Summer has faster growth and moisture loss; autumn slows both; winter pauses crop growth while annual beds remain planted until the year boundary. In winter, live counts separate annual beds that clear, perennial beds that remain, and retained habitat structures. The note explains the existing reduction of up to 10 accumulated growth days for perennials at the new year. Counts describe the current grid and update when its contents change. Empty gardens omit the outlook; habitat-only gardens show accurate zero-crop counts.

The disclosure is passive: opening it or reading through the seasonal information never changes garden state, spends funds, advances time, or cancels a staged planting preview. Four cards fit across desktop controls and form a two-column layout at 320px. Larger text includes seasonal descriptions, progress labels, and carryover counts. Current-season and keyboard-focus outlines remain visible in forced colors. The day-position bar transitions over 350ms, with both operating-system and in-app reduced-motion preferences suppressing the transition. Landscape art remains still, and no new animation loop or timer was added.

Validation: **100 tests passed across the affected gameplay and preview suites**, including three new behavior tests for all season boundaries, exact countdowns and day positions, actual year rollover, annual/perennial/habitat counts, staged-preview preservation, and empty or habitat-only gardens. The run used separate-process workers and a command-only 30-second test limit. Repository test settings were unchanged; the full companion-planting suite set was not rerun.

The new browser suite passes desktop and 320px layouts, native keyboard disclosure, unchanged saved state, all seasonal boundaries, larger text, forced colors, a 44px disclosure target, progress motion and both motion preferences, staged-preview protection, a real autumn-to-winter advance, and a real year transition with the existing perennial growth adjustment. The existing day-recap browser regression also passes immutable saved reports, forecast alignment, crop inspection, year-reset explanations, replanting from cleared beds, pending-preview protection, restored reports, and legacy missing data. Both browser suites report no page errors or scoped accessibility violations.

The full desktop controls and larger-text phone outlook were visually reviewed. Source and desktop assets match at SHA256 `5581D3180DBE01E703D05883BAE825D4189E984847712D7C9CE9F1F6E70C5D03`; syntax and scoped diff-format checks pass.

- [Desktop garden controls with outlook](garden-season-controls-1280.png)
- [Desktop season outlook](garden-season-outlook-1280.png)
- [Phone season outlook](garden-season-outlook-320.png)
- [Larger-text phone outlook](garden-season-readable-320.png)
- [Initially collapsed controls](garden-season-collapsed-1280.png)
- [Spring](garden-season-spring-320.png)
- [Summer](garden-season-summer-320.png)
- [Autumn](garden-season-autumn-320.png)
- [Winter before the year change](garden-season-winter-320.png)
- [After the actual year transition](garden-season-new-year-320.png)
- [Gameplay and preview results](tests-season-outlook.log)
- [Season outlook browser verification](season-outlook-results.json)
- [Existing day-recap regression](browser-season-outlook-day-recap.log)

Run the focused browser checks with: node dev-tools/companion_planting_season_outlook_qa.cjs.
## Illustrated planting life cycles — September 20

All 34 planting-dock seed packets now carry a compact Annual, Perennial, or Habitat label derived from the simulation's actual harvest rules. Exact trait searches for annual, perennial, and habitat select the matching modeled group. Searching preserves the chosen plot, staged preview, funds, time, and planted garden. Shelf guidance and accessible packet names explain that the classifications describe this lab.

An initially collapsed life-cycle disclosure in each planting preview illustrates the outcome before purchase. Annual crops lead to an open bed and a new paid planting; perennials stay planted, reset accumulated growth, and retain their health and pests. Habitat structures have one placement portrait and no harvest stage. The copy explains maturity and health eligibility, winter growth pauses, and the existing year-boundary rules. Selecting a different crop resets the disclosure. Static botanical portraits reuse the garden's artwork without introducing another animation loop.

Validation: **104 tests passed across the affected gameplay and preview suites**, including four new tests for trait search, unchanged staged state, annual clearing, perennial regrowth, purchase costs, habitat presentation, and blocked unaffordable purchases. The full companion-planting suite set was not rerun. Syntax and scoped diff-format checks pass.

The new lifecycle browser suite and existing seed-browser regression pass. Checks include all catalog classifications, desktop and 320px containment, larger text, native keyboard disclosure, forced colors, preserved state, unchanged purchase confirmation, and actual annual/perennial harvests. Both report no page errors or scoped accessibility violations. The caption contrast was improved after the audit. Lifecycle portraits remain static; the seed-browser regression also verifies both reduced-motion preferences. After screenshot capture, the lifecycle audit centers the disclosure in the viewport so the existing sticky navigation does not cover its target.

The desktop perennial panel, full larger-text phone preview, desktop seed shelf, and final phone habitat panel were visually reviewed. Source and desktop assets match at SHA256 `3B19B5AAA3295EF6DA5EA783B786B1F1598231C95426A6589BF3A5364CF47C77`.

- [Desktop perennial life cycle](garden-life-cycle-perennial-1280.png)
- [Complete desktop preview](garden-life-cycle-preview-1280.png)
- [Complete larger-text phone preview](garden-life-cycle-preview-320.png)
- [Phone perennial regrowth](garden-life-cycle-perennial-320.png)
- [Phone habitat structure](garden-life-cycle-habitat-320.png)
- [Labeled seed shelf](garden-life-cycle-seeds-1280.png)
- [Gameplay and preview tests](life-cycle-tests.log)
- [Lifecycle browser verification](life-cycle-results.json)
- [Existing seed-browser regression](browser-life-cycle-seeds.log)

Run the focused browser checks with: node dev-tools/companion_planting_life_cycle_qa.cjs.
