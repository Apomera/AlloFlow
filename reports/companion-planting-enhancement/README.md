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

