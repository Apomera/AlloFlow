# Physics simulator: learning, accessibility and workflow review

Reviewed September 27, 2026. Scope: `stem_lab/stem_tool_physics.js`, the tool landing page, September 20 clarity notes, unit accessibility tests, and browser behavior/contrast tests. No application source was changed. No AGENTS.md was found by a hidden-file search excluding dependencies, Git and reports.

## Confirmed findings

### 1. Drag graphs explain the wrong physical model — high priority

The motion graphs read the last simulated trail (3043–3083), including drag. Their horizontal graph accessible name nevertheless says “a flat line” (3098), and the visible notes assert constant horizontal velocity (3108), a straight vertical-velocity line (3123), and independent horizontal/vertical motion (3127). The quadratic drag model couples the components through speed and produces decaying horizontal velocity. The introductory guide repeats unqualified constant-Vx/no-horizontal-force language at 3224 and 3230.

**Verified:** a read-only Node VM component probe supplied a drag trail with Vx 20, 16, 13 m/s. Rendering retained the flat-line accessible name and all three notes. A local browser flight with drag also produced a visibly decreasing Vx line beside the constant-Vx note; see `mobile-graphs-320.png`.

**Improve:** describe the captured flight using `lastTrail.drag`; show “Vx decreases because drag opposes horizontal motion,” explain that vertical acceleration also includes drag, and identify the ideal-model assumptions in the guide and quiz (3566). Keep the existing no-drag disclaimer for the range-angle chart (3200–3203). Test both flight models and changing the current drag toggle after a flight.

### 2. Keyboard and demo paths bypass mission locks — high priority

Target Mode disables the relevant slider using `targetConstraint` (2806–2818). Canvas arrow handlers change angle and velocity unconditionally (2517–2523). The Symmetry Demo can also change angle (2740) during a fixed-angle round. The mission still advertises the original locked value (3361–3365), and hit scoring checks landing distance without validating the launch constraint (330–355).

**Verified:** with angle locked at 45 degrees, the rendered angle slider was disabled, but invoking the canvas ArrowUp handler changed the angle to 50 degrees. A focused Playwright check of the local preview independently reproduced this using a real ArrowUp keypress; the constraint remained `{ type: 'fixedAngle', value: 45 }`.

**Improve:** centralize parameter updates and launch validation, so keyboard controls, sliders, demos and loaded state honor the same mission constraints. Announce a locked parameter when a keyboard user attempts to change it. Preserve gravity adjustment where intentionally permitted: the present mission indicator explicitly invites adjusting gravity (3364–3365).

### 3. The symmetry demo promises a result it does not establish — high priority

The demo leaves air drag enabled if it was enabled and always emits “Same range!” (2737–2745). Its final parenthetical says “without drag,” but the flights just shown can use drag and land at different ranges. It schedules its second launch and conclusion using initial wall-clock estimates rather than actual landing events (2738–2749). Changing speed, pausing or interacting during the demo can break that sequence.

**Improve:** make the demonstrated assumption explicit; either run an ideal-model comparison with clearly identified settings or compare the actual measured results and teach the asymmetry with drag. Sequence on completed-flight IDs, offer cancellation, and restore only state owned by the demo. Existing browser coverage exercises only drag off at normal speed.

### 4. The discovery panel is a separate calculator with unclear boundaries — medium priority

“Gravity-angle discovery” creates its own `gravityHunt` state (3700), defaults to velocity 30 m/s while the main simulator defaults to 25, and its sliders only update that separate state (3751–3753). It computes ideal range independently of main air drag (3703–3707). The explanation calls its controls “the simulator” without clarifying why the cannon and trajectories do not change (3728–3730).

Also, the outcome ratio R/(v²/g) equals sin(2θ): its optimal/reasonable/suboptimal marker cannot change when gravity or speed alone changes, although those are presented as three discovery controls. Numeric range does change, so the panel still supports numeric inquiry, but its stated three-state outcome cannot support all the suggested comparisons.

**Improve:** connect investigation controls to the main experiment and measured run log, or label the panel as a separate ideal-model calculator with an explicit Apply to simulator action. Separate angle efficiency from absolute range. Let a learner select evidence from their actual runs when explaining a claim.

### 5. Exported run identity diverges from the screen — medium priority

The log deliberately retains stable `r.n` IDs on screen (2954), but CSV emits `i + 1` (2347). The log keeps only eight entries (458–463). After ten launches, on-screen runs 3–10 export as 1–8; after Clear log, the same mismatch occurs on the next run. Exported evidence can no longer be reliably matched to the annotated trajectory or a screenshot.

**Improve:** export `r.n` with an explicit fallback for old saved data. Distinguish an eight-row display window from preserved experiment history, or clearly show the retention limit and provide an export-before-clear workflow. Add a run-10 and clear/relaunch regression, since the current browser linkage test only checks runs 1–3.

### 6. Mission completion has an enabled dead end — medium priority

The last mission enables Next Round when all targets are destroyed, but its click handler advances only while `targetRound < TARGET_LEVELS.length` (3324–3331). There is no final completion state in that branch.

**Verified:** a rendered completed round 10 had `Next Round.disabled === false`; clicking it left round 10 unchanged.

**Improve:** replace the final next control with a completion summary, offer a review of the learner's successful launch settings and an explicit restart/end action. Test round 10 rather than only an ordinary round.

### 7. Nonvisual inspection stops short of the visual learning task — medium priority

Canvas narration covers initialization, launch and landing (558, 755, 1612), which appropriately avoids continuous announcements. Slider changes narrate values (2821), but canvas arrow changes do not (2517–2523). Force and energy overlays are drawn into canvas; there is no equivalent current force/energy readout or inspect command. The data table provides positions and velocities (3295–3303), but no force or energy values. The interface explicitly recommends explaining vectors/energy during flight (2247), so some learners cannot obtain the same evidence.

Quiz result paragraphs are not status regions and the answer handler has no explicit announcement (3578–3621), unlike the myth answer handler (3679). This warrants assistive-technology verification rather than assuming DOM text changes are announced.

**Improve:** add an on-demand “Read current flight” or accessible paused-state panel containing time, position, Vx/Vy, force components and KE/PE/energy lost. Announce values only on request or step, retain quiet live playback, announce keyboard parameter changes and quiz completion, and give SVG descriptions the actual model and useful value ranges.

## Confirmed mobile layout issue and remaining interaction checks

- **Confirmed:** the two motion charts always use two columns (3095). At a 375-pixel viewport, each 220-pixel-viewBox SVG is 130.5 pixels wide; its 8-pixel axis text is scaled to about 4.7 CSS pixels. At a 320-pixel viewport the SVG is 103 pixels wide and text scales to about 3.7 CSS pixels. Measured text bounding-box heights were 5 and 4 pixels. There was no page-level horizontal overflow. Stack charts on narrow screens and keep readable axis labels. Evidence: `learning-browser-results.json`, `mobile-graphs-375.png` and `mobile-graphs-320.png`; screenshots were visually inspected.
- CSS fill-frame mode has no Escape handler, modal focus containment or inert background in this tool (2393, 2454–2481, 2513–2537). Native fullscreen state also does not update the control label, which is based only on `physFsMode`. Verify actual host behavior before selecting a fix.
- Canvas reduced motion is sampled once (591–592) and merely slows the decorative tick to 20% (811). The host also has an in-app `.reduce-motion` setting (stem_lab_module.js 4795–4799). Verify in-app toggle behavior, then stop nonessential grass/cloud/particle animation when reduced motion is requested.

## Existing strengths and test limits

Preserve the controlled-variable comparisons and measured exponent inference (2285–2340), last-flight status region (2866), grade-aware concept cards and Show all, explicit reflection credit independent of estimate accuracy (2774), clear gravity/playback explanations, and quiet milestone narration.

The existing browser behavior suite covers forward drag, mass, real-time timing, pause, live-region mutation limits, recommendation actions, exponent inference, normal-speed ideal symmetry, and three-run identity. The contrast suite measures Last flight and Experiment log. The two accessibility unit suites verify source strings and mirror equality. These are useful checks, but they do not establish correct graph descriptions, consistent keyboard locks, final-round completion, phone graph readability, or screen-reader access to force/energy evidence.

The September 20 documents correctly state that their component browser checks are not a deployed-app audit. This review likewise distinguishes source/handler evidence from browser and assistive-technology verification still required.
