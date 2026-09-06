# Claude handoff: Raptor Lab visuals and motion

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
Prepared: 2026-09-04. Second to sixth visual passes, four controls passes (seventh to tenth), a contrast audit (eleventh), a flight-school pass (twelfth), a science fix (thirteenth), a stoop physics fix (fourteenth), a glide aerodynamics fix (fifteenth), a thermal lift fix (sixteenth), and a pull-up load limit (seventeenth) followed through 2026-09-05 (see the sections named after them). Passes one to three were committed and deployed by another session; passes four to ten are uncommitted.

## Status at a glance

| Item | State |
|---|---|
| Implementation | Passes 1 to 3 are in commit `f238731dd` (2026-09-05 08:57, "Deploy everyone's work", made by another session from the shared tree). Passes 4 to 17 are uncommitted and mirrored; run `git diff --stat` for the current size. |
| Canonical vs desktop source | Byte-identical: 3,265,157 B, md5 `2b7ab955e200...` on both. |
| Syntax | `node --check stem_lab/stem_tool_raptorhunt.js` passes. |
| Unit tests | 132/132 in `scratch/raptor-flight-review/final-unit-results.json`. |
| Browser tests | 3/3 passed in Chromium (`tests/e2e/raptor-flight-continuity.spec.ts`). |
| Visual signoff | Done for eleven captures (wide peregrine, eagle lake, owl night, true night, tablet, narrow, phone, 8x close-up, lake from the air, crash-landing ground view, mid-stoop). See the pass sections. |
| Commit / deploy | Passes 1 to 3 deployed in `f238731dd`. Passes 4 to 17 not committed. Do not deploy unless the user asks. |

## Request and stopping point

The user asked for a substantial visual improvement to the Raptor Lab and a fix for sudden camera/bird jerks. The first session stopped for quota. A second session completed the screenshot review, fixed what the screenshots showed, and re-ran every suite. The remaining work is a commit by pathspec.

## Files to review

Sources (keep these two byte-identical; both are live):

- `stem_lab/stem_tool_raptorhunt.js`: canonical, served by the CDN.
- `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`: bundled desktop app mirror. A stale copy here loads silently and is used, so mirror every save.

Key anchors inside the canonical file (line numbers as of this handoff):

| Symbol | Line |
|---|---|
| Forced-colors block that used to swallow the narrow rules (now closed) | 353 |
| `initHuntSim(canvasEl, species, missionConfig, onUIState, qualitySetting)` | 10699 |
| Escarpment profile inside `terrainDisplacementAt` (`escarpmentEdge`) | 11001 |
| Sculpted cliff box ("Cliff face: strata ledges") | 11491 |
| `bodyPlumageTex` (tiled atlas for body, breast, head) | 11751 |
| `updateRaptorWingPose(pose, profile, elapsedMs, active, diving, resting, reduced, deltaSeconds)` | 11926 |
| Fog far formula `scene.fog.far = 720 + ...` (pinned by a test) | 12951 |
| Water clock `var tnow = motionNow / 1000;` | 15551 |

Tests and tooling:

- `tests/stem_raptorhunt_experience.test.js`: modified. Three source assertions now inspect the extracted wing-pose helper via `functionBody(init, 'updateRaptorWingPose')` instead of grepping the loop for `flightAnimationProfile.*`.
- `tests/e2e/raptor-flight-continuity.spec.ts`: new, untracked. Uses the shared `GlHarness` from `tests/e2e/helpers/stem_gl_harness.ts`, serial mode, 180 s timeout, `afterEach` destroy. Bloom is disabled through `window.AlloPostFXEnabled = false`. It is NOT listed in the `test:e2e:gl` npm script yet.
- `scratch/raptor-flight-review.cjs`: new, untracked. Deterministic screenshot/measurement harness. Arguments are `label species mission [stageWidth stageHeight quality stepsJson]` (defaults: `review`, `peregrine`, `freeFlight`, 1280, 850, `balanced`, none). Steps run before the measured frames: `{"key":"d","ms":2000}` holds a sim key, `{"cmd":"zoom"}` sends a sim command, `{"fly":1500}` just advances. The frame JSON is written before the screenshot so a slow capture never loses data.
- `scratch/raptor-strip-probe.cjs`: new, untracked. Mounts the tool at 420 px and prints the computed style of the telemetry strip plus which stylesheet rules mention it. This is what exposed the swallowed CSS block.
- `scratch/raptor-flight-review/`: `final.png` (wide peregrine), `lake.png` (bald eagle), `night.png` (great horned owl), `tablet.png` (700 px), `narrow.png` (420 px, low quality), `phone.png` (380 px, low quality), `closeup.png` (8x zoom on the peregrine, high quality), `lakeview.png` (bald eagle turned back over the lake), each with a matching `.json` frame dump. `before.png` and `after.png` are from the first session and are superseded. `final-unit-results.json` and `experience-unit-results.json` are the reports.
- `scratch/raptor-*.cjs`: one-shot edit and staging scripts. Not idempotent; see "Windows save/tool issues".
- `scratch/raptor-before-refine.js`, `scratch/raptor-desktop-before-refine.js`: pre-refinement backups of both sources (3,228,023 B each).

Ignore these two files. They are build outputs from Aug 31, not sources, and the build regenerates them:

- `desktop/app-build/stem_lab/stem_tool_raptorhunt.js`
- `desktop/web-app/build/stem_lab/stem_tool_raptorhunt.js`

## Git state and how to commit

Another session committed the shared tree at 08:57 on 2026-09-05 as `f238731dd` and deployed it. That swept in passes one to three of this work: both raptor sources, the experience test, the continuity spec, the package.json script line, and this handoff. So the current `git status` for our paths is only:

```
 M desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js
 M stem_lab/stem_tool_raptorhunt.js
 M tests/stem_raptorhunt_experience.test.js
 M tests/stem_raptorhunt_controls_contrast.test.js
 M CLAUDE_RAPTOR_LAB_HANDOFF.md
```

That diff is passes four to ten (cloud sprites, ground grain, opaque near mountains, peak and landmark proportions, sky haze band, night landmark colour, prey size floor, prey shadow pads, tree crown tint, sky-tinted speed lines, control presets, the key guide, per-action rebinding, the flight-school tie-in, and on-screen control cues).

The `scratch/` directory is gitignored (rule added in that same commit), so the harness and the probe exist only on this machine. If they should survive, move them to `dev-tools/` and commit them from there.

Commit passes four to seventeen by pathspec:

```
git add -- stem_lab/stem_tool_raptorhunt.js desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js tests/stem_raptorhunt_experience.test.js tests/stem_raptorhunt_controls_contrast.test.js CLAUDE_RAPTOR_LAB_HANDOFF.md
git commit -m "Raptor Lab: control presets, custom rebinding, guided key prompts; softer clouds, ground grain, broad peaks, sky haze, readable prey"
```

There were hundreds of unrelated dirty and untracked files before this task, and other sessions share this tree. Do not revert, stage, or synchronize the whole repository. Commit by explicit pathspec only:

```
git add -- stem_lab/stem_tool_raptorhunt.js desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js tests/stem_raptorhunt_experience.test.js tests/e2e/raptor-flight-continuity.spec.ts
git commit -m "Raptor Lab: smooth chase camera, motion clock, feather atlas, terrain detail"
```

The pre-commit hook inspects the whole tree, so it can fail on another session's drift. If it fails, unstage these files again rather than leaving them staged for someone else's commit to sweep up.

## Implemented motion fixes

1. The chase camera is transported by the bird's displacement before damping relative framing. Previously, damping a moving world-space target changed the apparent following distance with frame duration.
2. Chase distance and height ease between normal flight and diving.
3. Target assistance smooths and bounds the actual camera aim vector, not only its weight. The offset eases back toward zero when a target disappears.
4. Added a bounded, pause-aware `motionNow` clock (25 references). Most periodic bird, prey, atmosphere, and effect animation now follows simulated movement rather than elapsed wall time.
5. Added `updateRaptorWingPose`: cruise bursts have an eased envelope, and glide/flap/dive transitions are damped. Reduced motion and resting birds suppress flap oscillation.
6. Removed the instantaneous 1.5 m bird displacement on a catch.
7. Replaced the instantaneous 8 m takeoff displacement with 0.08 m clearance followed by actual climbing.
8. Perched and crashed birds retain their position instead of sliding under wind and the cruise accelerator.
9. `ResizeObserver` callbacks skip render-buffer resizing when dimensions did not change.
10. Snapshot diagnostics (`_rhSnapshot` on the canvas) now include motion time, bird/camera positions, wing pose, landed/crashed state, feather detail, and rendering counts.

## Second pass (2026-09-04 evening)

Each item below was found in a harness screenshot, fixed, and re-captured.

1. Water ripple phase now follows `motionNow`, so lake waves also hold still across a pause.
2. Tree foliage, trunks, far and near mountains, and snow caps now convert their authored colours to linear space. Before this, dark green 0x166534 rendered as mint-cyan and the slate mountains as pale blue, because the renderer outputs sRGB and those materials were the only ones left unconverted. Snow caps also moved from an unlit basic material to a lit flat-shaded one.
3. Fog far distance raised from 600 to 720 so the distant mountain ring keeps its facet shading instead of dissolving into the fog colour. The experience test pins this formula string and was updated.
4. Feather atlas vane edges softened (#646464 to #9c9c9c) and the body, breast, and head now sample a cloned, repeating copy of the atlas at 2.5 by 2 tiles. The bald eagle's white belly no longer reads as a checkerboard. Wing vanes keep the original one-to-one texture.
5. The straight-topped brown wall in the peregrine scene was not the cliff mesh. The cliff box spans z -100 to 100 and sits behind the spawn camera. The wall was a 35 m step in the terrain height function at x = -50. It is now an eased escarpment with a winding edge and ledges, and the box cliff itself gained strata, buttresses, a jagged skyline, and a linear-space colour.
6. A fifth malformed forced-colors block (line 353, the flight readout rules) was still missing its closing brace. Every rule after it in the CSS array, including all the 760 px and 430 px telemetry rules, was parsed inside that block and never applied. Closing it activated a lot of previously dead layout, which then needed the next item.
7. Narrow layouts: the telemetry strip now spans the stage at 760 px and below with shrinking metrics instead of clipping. The lock meters (aim and range) moved into the left column under the attitude row so they no longer overlap the relocated mission card. The altitude gauge dropped to 58 percent so the mission card clears its label. At 430 px the mission card is capped at 48 percent width so it clears the reticle. Wrapping the strip was tried and rejected because it stacked three rows tall.
8. The continuity spec was added to the `test:e2e:gl` npm script.

## Third pass (2026-09-05, early)

Driven by two views the earlier passes never looked at: the 8x zoom close-up of the bird and the lake seen from the air after turning the bird around.

1. Body plumage tiles finer (4 by 3) with a flatter atlas and a much weaker bump. At 8x the previous tiling read as a grid of bright dots.
2. Wings get their own tiled copy of the atlas instead of one atlas stretched over the whole wing, and the vane tint banding (0.78 to 1.17 every four feathers, which read as a keyboard) is now a gentle root-to-tip gradient. Vanes overlap their neighbours and start behind the leading edge, so the edge is no longer serrated.
3. Wing surface has camber: elbow raised, tip dropped, vanes follow the same arch. The gliding bird now shows the shallow M silhouette instead of a flat plank.
4. Tail bands are 6 mm stripes flush with the tail rather than 45 mm boxes.
5. Landmark materials converted to linear colour like everything else.
6. Lake: the ripple bump was a single harmonic sine repeated 22 times and produced a visible moire grid. It is now three non-harmonic terms at 13 repeats with half the bump. Water is a deeper blue-teal, slightly rougher, and 84 percent opaque so the sandy bed shows through as shallows near shore. The sun sheen is a radial-gradient glow instead of a hard-edged flat disc; its runtime opacity formula is test-pinned and unchanged.
7. The terrain hill noise (about 12 m amplitude) poked through the water plane all over the basin. Inside the lake radius the noise is now damped by the cube of the normalised distance and the rim drops at 0.32 m per metre, so the bed stays under the surface except for a thin shallow ring.

1. Cloud sprite texture: puffs were drawn past the edge of the 256 by 128 canvas, so every sprite had a hard rectangular edge where the gradient was clipped. Puffs now stay inside the canvas with a flatter base and a longer fade.
2. Ground grain: the speckle lightness spread doubled and the count rose to 4200, with a hint of hue jitter. The grey cliff-biome ground was a blank sheet when seen from 2 m after a crash landing.
3. Near mountains are opaque. Their 82 percent opacity read as glass under the 8x zoom.
4. Distant peaks are capped so no peak is taller than 0.82 of its width.
5. The needle spire in the peregrine scene was not a distant mountain (capping mountain height produced a pixel-identical capture). It was a "peaks" landmark cone, up to 60 m tall on a 6 to 14 m radius. Peak and rock landmarks now use a radius of 0.42 to 0.64 of their height; ice landmarks stay slimmer at 0.28.
6. A true-night capture (day phase 0.93 via the environment command) confirmed stars and moon render; nothing needed changing there.

## Fourth pass (2026-09-05)

- Reusable procedural feather atlas with vanes, barbs, and shafts on body, head, wings, and tail.
- Additional feather geometry batched into one draw per wing; quality tier scales the feather count.
- Authored bird material colors converted to linear lighting space for Three r128.
- Tail bands belong to the animated tail so they follow steering and spreading.
- Terrain vertex colors vary by biome, slope, height, and broad patches, with shoreline sand, fine grain, and bump detail.
- Tree crowns have multiple instanced layers.
- Quality-scaled instanced rocks and scrub.
- Sculpted mountain ridges and a more detailed cliff face.
- Lake bump texture and revised surface material.
- Closed four malformed `forced-colors` media blocks in the tool's embedded CSS. They had swallowed the following flight-instrument and responsive rules, so labels and instrument spacing now apply normally.

All new visual assets are procedural and local. No remote image dependencies were introduced.

## Fifth pass (2026-09-05)

The four candidates left open by the fourth pass.

1. Sky: the luminance gradient now carries a bright haze band just above the horizon (stops at 0.9 and 0.965) and the horizon line itself dims slightly. It is subtle by design because the same texture is tinted for every biome and time of day.
2. Night forest landmark: the accent colour was neon indigo, which rendered as a blue cone tree. It is now a muted moonlit conifer green.
3. Prey: the visual size floor rose from 0.6 m to 0.75 m and the size boosts from 8 and 12 to 9 and 13. This is visual only; catch logic uses the species size, not the display size.
4. Mid-stoop review: a genuine mid-stoop frame (tucked wings, radial speed lines, field of view widened to 86 degrees, target framed) looks right and needed no change. Getting that frame took three attempts, all harness problems, described under "Commands".

The experience test pinned the old zenith stop of the sky gradient and was updated to the new value.

## Sixth pass (2026-09-05)

1. Prey contact pads (the terrain-conforming shadow ellipse under each land prey) are darker (opacity 0.34, was 0.22) and a little wider. They were also still sized from the old 0.6 m display floor and now follow the 0.75 m floor, so the pad matches the mesh again.
2. Tree crowns carry a per-tree warm-to-cool tint on top of the existing brightness variation. Forests no longer read as one green.
3. Speed streaks during a stoop take the current fog colour blended 55 percent toward white each frame instead of pure white. They now sit in the scene at dusk and at night instead of glowing.
4. Adding random draws to tree placement shifts the global random sequence, so prey spawn positions differ from earlier captures. Tests do not pin positions.

## Seventh pass: configurable controls and key guide (2026-09-05)

The user asked for an easy way to configure controls with a few presets, a guided mode that shows which key to press for the current action, and raised the idea of a brief tutorial. A four-step tutorial ("Flight school" coach card) already existed with a Replay button in Settings, so it was kept and its copy now follows the active preset.

What was built:

1. **Control presets.** A module-level table `RAPTOR_CONTROL_SCHEMES` maps physical keys (lower-cased `event.key`) to actions. Four presets: Classic (WASD, Q/E, Shift, Space, F, plus arrows as aliases), Arrow keys + Enter (arrows, PgUp/PgDn, Enter strikes), Left-hand mouse (IJKL, U/O, Enter or H strikes), Simple (arrows only: left/right turn, down dives, up pulls up, Space strikes, no pitch or trim). Every preset binds P/Esc pause, V camera, Z zoom, T assist, M sound.
2. **The sim keeps its canonical key tokens** (`RAPTOR_ACTION_KEYS`: a, d, w, s, q, e, shift, space, f). `normalizedKey` maps through the preset, and `onKeyDown` ignores any key the preset does not bind, so presets are exclusive. On-screen hold buttons still send canonical tokens, so they work under every preset.
3. **Preference plumbing.** `rh.controlScheme` and `rh.keyGuideEnabled` live in tool state like `graphicsQuality`. The canvas carries `data-raptor-control-scheme` and `data-raptor-key-guide` so a fresh sim starts on the saved preset, and two effects push `_rhCommand('controls', {scheme})` and `_rhCommand('keyGuide', {enabled})` into a running sim when they change.
4. **Key guide (guided mode).** A row of key chips at the bottom centre of the flight view (`.rh-flight-key-guide`) shows the keys that matter for the current phase: scanning shows turn, pitch, trim, and assist; align shows turn, pitch, and dive; stoop shows hold-dive and pull up; close and ready show strike; landed or crashed shows take off; paused shows resume. The primary action is highlighted amber. It re-renders only when the prompt set changes and is hidden below 760 px, where touch users have the labelled hold buttons. Toggle in Settings ("Key guide on/off"), default on.
5. **Settings additions.** A Controls select for the preset, the key guide toggle, and a two-column binding list (`.rh-flight-keymap`) for the selected preset, all inside the existing Settings disclosure.
6. **Preset-aware copy.** The stoop cue ("STOOP - hold Shift"), the announcements, the landed and crash messages ("SPACE to take off"), the hold-button labels, the aria-label and aria-keyshortcuts of the canvas, the "Controls and science" help lines, and the tutorial steps all read their key names from the active preset.

Two traps worth knowing:

- The React component body and `initHuntSim` are both indented six spaces but live in different parent functions. A shared table placed next to `initHuntSim` was undefined at render time and crashed every mount test with "Cannot read properties of undefined". Shared helpers must go at module level (two-space indentation, next to `rhShuffle`).
- The experience test pinned the literal aria-keyshortcuts string; it now pins the dynamic expression.

Screenshots: `guide.png` (Classic preset, align phase: Shift hold to stoop, Space pull up, A/D turn, P pause) and `guidesimple.png` (Simple preset: arrow glyphs, stoop cue reads "hold" with the down arrow).

## Eighth pass: custom rebinding (2026-09-05)

1. **Custom preset.** The Controls select gained "Custom (rebind each key)". The custom map lives in `rh.customControlKeys` (physical key to action) and is validated by `raptorCustomScheme`, which drops unknown actions and over-long keys and falls back to Classic if nothing survives, so a corrupt saved map cannot bind garbage.
2. **Seeding.** "Start from" buttons copy any built-in preset into the custom map.
3. **Rebinding.** Each of the fourteen actions is a button showing its current key caps. Click one to arm it (amber ring, status line reads "Press a key for Strike. Esc cancels."), then press the key. The key loses any previous action and the action keeps only that key. Esc cancels. The listener is a capturing window keydown that only exists while an action is armed.
4. **Plumbing.** All module helpers accept a scheme object as well as a preset id. The canvas carries `data-raptor-control-keys` (JSON) when the preset is custom, so a fresh sim starts on the custom map, and the controls effect sends `{scheme, keys}` to a running sim.
5. **Verified in a browser**: `scratch/raptor-settings-shot.cjs` mounts the tool with the custom preset, opens Settings, arms Strike, presses G (via `RAPTOR_REBIND_KEY=g`), and reads back the Strike button label and the canvas key map. Screenshot: `settings.png`.

## Ninth pass: flight school drives the guided prompts (2026-09-05)

The tutorial was reported as "already exists" in the seventh pass without anyone looking at it. This pass captured it running for the first time and then connected it to the key guide.

1. **The tutorial renders correctly.** A four-step "Flight school" coach card sits bottom-left: step counter, "Try it now", title, copy, Back from step two, and Skip. It advances when the learner performs the step, not on a Next button. Its copy already follows the active preset. Screenshot: `tutorial.png`.
2. **The key guide now follows the tutorial step while flight school runs**, instead of the flight phase. Step one shows the turn keys marked primary ("A/D Turn the bird") next to the coach card that says the same thing; the strike step shows "F Strike when ready" and "Shift Close the distance". After the tutorial finishes, the guide reverts to phase-based prompts. Screenshots: `tutorial.png` and `tutorialstrike.png`.
3. **The key guide hides by pointer type, not window width.** It was hidden below 760 px, which also hid it from a narrow desktop window that has a keyboard. The rule is now `@media(pointer:coarse),(max-width:520px)`.
4. **Unbound essentials warn.** A custom map missing any of turn left, turn right, dive, pull up, strike, or pause shows a `role="alert"` warning in Settings naming the missing actions. The map is still saved; the panel just says the flight cannot proceed without them.

The trap worth carrying forward, and it is the second instance of the same class: the effect that pushes `_rhCommand('tutorialSignal', ...)` is declared above the effect that calls `initHuntSim`, so on mount it runs before `_rhCommand` exists and the command is silently dropped. The first capture showed phase chips instead of tutorial chips. Any state a fresh sim needs must also ride the canvas dataset (`data-raptor-tutorial-signal`, alongside `data-raptor-control-scheme` and `data-raptor-control-keys`); commands only cover live changes to a running sim.

## Tenth pass: the guided prompts reach the on-screen controls (2026-09-05)

The key chips are keyboard-only by design and are hidden on coarse pointers, which left touch users with no phase cue at all. This pass sends the same prompt to the buttons everyone can see.

1. **Guide rows carry their action names**, so one computation feeds both surfaces.
2. **`refreshKeyGuide` publishes `controlCues`** through `notifyUI`: an action-to-strength map, primary for the action the phase calls for and secondary for the supporting ones.
3. **The on-screen controls wear the cue.** Hold buttons and the strike button take `data-raptor-cue`, styled as a static amber ring for primary and a cyan ring for secondary. No opacity animation, so reduced motion needs no special case and the buttons never fade. A disabled strike button is never cued.
4. **Guided mode is now one switch.** The Settings toggle governs the chips and the button rings together; turning it off clears both.
5. **The strike button no longer hard-codes F.** Its label, accessible name, and shortcut hint come from the active preset, the last hard-coded key in the flight UI.

Verified in a browser: a scan-phase capture rings both altitude trim buttons in cyan, and a stoop-phase probe reports Dive as primary and Pull up as secondary. Screenshot: `cues.png`.

Two traps for the next session:

- The tool has **two** CSS string arrays that share the same terminator (`].join('')` followed by `appendChild(st)`). The flight stylesheet is the second one, preceded by the `rh-flight-mission-meter` entry. Anchor on that neighbouring entry, never on the terminator.
- A batch replace script that validates anchors and calls `writeFileSync` at the end writes **nothing** when a later anchor fails. After such a failure the file is untouched, so re-run the whole script rather than assuming the earlier edits landed.

Specificity note: `.rh-flight-btn[data-raptor-cue="primary"]` is (0,2,0) and beats `.rh-flight-btn-primary` at (0,1,0), so the cue needs no `!important` and no ordering assumption.

## Eleventh pass: contrast audit of the new controls UI (2026-09-05)

The controls work added a lot of new colour (key chips, key caps, the rebind panel, the warning, the cue rings) without anyone checking it against the contrast rules this tool already has a test file for. This pass measured it. **Nothing needed fixing**, and the measurement is now a gate.

Every element passes AA with a wide margin. The tightest is the key chip label at 12.13:1 over a white sky, against a 4.5:1 requirement. The probe is `scratch/raptor-contrast-probe.cjs`; it mounts the tool, forces a primary cue, opens the rebind panel, and reports twelve elements including two pre-existing telemetry rows as a baseline.

**The probe was wrong on its first run and it looked convincing.** It reported identical numbers for a white sky and a black ground, which is impossible for a translucent overlay. The cause: it walked CSS ancestors to find a background, and found the flight stage's opaque background, which sits **behind** the WebGL canvas rather than in front of it. Anything inside `[data-raptor-flight-stage]` overlays rendered pixels, so the climb must stop at the stage and composite only the element's own translucent layers over both extremes the scene can present. Corrected, the chip label moves from a flat 18.12:1 to 12.13:1 over a white sky and 18.24:1 over a black ground. This is the "own ground" overlay trap, applied to a 3D scene.

A second find, worth knowing before writing any contrast assertion in this repo: the house `relativeLuminance` helper in `tests/stem_raptorhunt_controls_contrast.test.js` slices two characters per channel, so a three-digit hex such as `#fff` produces `NaN` rather than an error. Expand shorthand before calling it.

Two gates were added to that file:

1. The chip panel colour is parsed from the source, composited over white and black, and the chip label and its amber primary variant must clear 4.5:1 against both. The key cap is checked against its own opaque ground.
2. The cue ring must stay a static ring: `box-shadow` present, no `animation` or `opacity` in the rule, and both ring colours must clear the 3:1 non-text requirement against the button face.

## Twelfth pass: flight school teaches raptor acuity, and the buttons finally count (2026-09-05)

The open visual item was "prey read as small blobs at 100 m". **That is not a defect.** Distant prey are meant to be small, exactly as they are for a real raptor, and the tool already ships the instrument that solves it: the acuity zoom narrows the field of view from 70 to 25 degrees behind the "RAPTOR ACUITY 8x" badge. Enlarging prey would have thrown away the tool's own science. The actual gap was that flight school never taught the zoom.

1. **A fifth tutorial step, "Look with raptor eyes"**, sits between altitude and target acquisition: see the prey, then align on it. Its copy names the zoom key from the active preset and explains why the view narrows, referring to the fovea. The step is satisfied only when zoom turns **on**, so toggling it off and on again cannot skip ahead, and the key guide shows the zoom key as the primary prompt while the step is live.

2. **A real bug surfaced while testing it.** `markTutorialSignal` was called from the keyboard handler and the canvas drag handler only. The on-screen hold buttons route through `_rhCommand('hold')`, which bypasses both, so **pressing the on-screen controls never advanced the tutorial**. A learner driving with the buttons, or any touch user who taps rather than drags, was stuck on step one with nothing but Skip. The hold branch now marks the same signals.

   The general lesson: progression gated on input must be marked at the shared sink, not inside one input handler. This tool has three input paths into the same simulation, namely keys, pointer drag, and commands from the on-screen buttons.

Screenshots: `tutorial.png` (step 3 of 5, with "Z Acuity zoom" as the primary prompt) and `acuity.png` (the zoomed view with the acuity vignette).

## Thirteenth pass: the acuity claim was wrong (2026-09-05)

Working on the acuity tutorial step surfaced a scientific integrity problem in code that predates this work.

**The zoom badge read "RAPTOR ACUITY 8x" for every species**, and a comment in the render loop said the zoom "simulates eagle ~8x acuity". The eight-times figure is popular-media arithmetic. Published measurements put raptor acuity nearer two to two and a half times human, with the highest credible estimates around three and a half. Reymond's work on the wedge-tailed eagle and the brown falcon is the usual reference.

Worse, the flat badge contradicted **this tool's own data**. Every species already carries a `visualAcuityX` value, ranging from 1.8 for the barred owl to 5.5 for the golden eagle. A kestrel and a golden eagle were advertising the same eye, which erases exactly the species difference the tool exists to teach.

Both the badge and the zoom now read the species.

**The first fix was wrong too, and a screenshot caught it.** Setting the zoomed field of view to 70 divided by the acuity value gave the golden eagle 13 degrees. The capture showed the bird filling the frame with almost no terrain visible, which is unflyable. An acuity ratio is not an angular magnification, so treating one as the other was a modelling error, not just a tuning miss.

The final mapping spreads the tool's relative ordering, 1.8 through 5.5, across a field of view from 38 down to 22 degrees. Against the unzoomed 70 degrees that is a magnification of 1.84x to 3.18x, which sits inside the published band while preserving every species' rank. Measured in a browser: barred owl 1.84x, kestrel 1.88x, peregrine 2.03x, golden eagle 3.18x.

The snapshot now reports `acuityX` and `acuityFov`, so any capture can prove which species is driving the zoom. A test also guards the species data itself: every `visualAcuityX` must stay inside the clamp the zoom assumes, and none may drift back toward eight.

## Fourteenth pass: the stoop ignored altitude (2026-09-05)

Auditing the acuity claim led to auditing the physics behind it, and the dive had the same shape of problem: a number that looked right on the readout but was produced by a model that taught the wrong lesson.

**The dive used a fixed exponential approach to terminal velocity**, with a time constant of one twelfth of a second. Traced in a browser, a peregrine reached 95 percent of its 242 mph stoop speed in **0.22 seconds after losing 4.4 metres of height**. Altitude was therefore irrelevant to speed, which directly contradicts this tool's own High Stoop mission, whose whole premise is dropping from 1000 metres to build velocity.

The dive branch now uses gravity limited by drag, the standard form for a body approaching terminal velocity:

    a = 9.81 * sin(dive angle) * (1 - (v / terminal)^2)

The dive angle comes from the bird's pitch, which is negative nose-down and reaches one radian when fully tucked. Level flight, climbing, and pull-up keep their original exponential approach to a target speed; only the dive changed. Gravity deliberately ignores exhaustion, because a tired bird still falls.

Measured in a browser after the change:

| Scenario | Result |
|---|---|
| Free flight, dive from 120 m | 45.7 mph to 74.5 mph over 1.8 s and 33 m of descent |
| High Stoop, dive from 1000 m | 182.7 mph after 11 s, still at 552 m altitude |

So the High Stoop mission's 180 mph requirement remains winnable with altitude to spare for the strike, while 242 mph stays out of reach. That is the honest outcome: the peregrine record was set from thousands of metres, not from a thousand.

The snapshot now reports `speedMph` and `speedMps`, which is what made the original defect visible and lets any future change be traced the same way.

## Fifteenth pass: the glide ignored every wing it was given (2026-09-05)

Third instance of the same defect class, and the clearest one. Every species ships a wing loading between 2.0 and 15.0 kilograms per square metre and an aspect ratio between 3.7 and 10.6. The glide used **a flat 1.5 metres per second of sink for all of them**. A Mississippi kite, which is a superb long-winged glider, sank exactly like a barred owl, which is a short broad-winged forest bird. The tool teaches this tradeoff in its own Flight Physics section while the simulation ignored both numbers.

Sink now comes from the species:

    sink = 1.5 * sqrt(wingLoading / 4.5) * (6 / aspectRatio), clamped to 0.6 to 3.0

Sink rises with the square root of wing loading, because a heavily loaded wing has to fly faster to hold itself up, and falls with aspect ratio, because long narrow wings shed less induced drag.

Measured in a browser:

| Species | Sink | Why |
|---|---|---|
| Mississippi kite | 0.76 m/s | Long light wings, the best glider in the set |
| Peregrine | 1.23 m/s | Loaded but high aspect ratio |
| Turkey vulture | 1.27 m/s | Light, a classic soarer |
| Barred owl | 1.70 m/s | Short broad wings |
| Harpy eagle | 2.93 m/s | Heavy forest ambush hunter, not a soarer |

Checked that this does not break play. A harpy eagle left to glide from the spawn **lands softly** after twelve seconds, recorded as landed rather than crashed, which is the correct lesson rather than a punishment; take-off is one key away. The Thermal Kettle mission still climbs, gaining altitude over six seconds with a red-tailed hawk.

**The pattern across the last three passes is worth stating plainly.** The acuity badge, the stoop acceleration, and the glide sink were all systems that advertised per-species data the simulation never actually read. When this tool ships a number per species, check whether the model consumes it. Two more remain unaudited and are listed under next checks.

## Sixteenth pass: thermals lifted twice as hard as any bird rides (2026-09-05)

The thermal gave `8 + quality * 12` metres per second, so between 8 and 20. Strong real thermal cores run 5 to 10 metres per second, and soaring birds themselves typically climb at 1 to 4. Twenty was roughly double anything a raptor works. It is now `5 + quality * 5`, a strong thermal on a good day, with a floor that keeps the mission fair in bad weather.

**Measuring this needed a technique worth recording, because the first attempt produced a convincing false negative.** The column is a 38 metre radius at a fixed point, and the bird **spawns 79 metres away, outside it**. Outside the column upward pitch is zeroed and the climb key is disabled for that mission, so a player who never finds the column simply sinks and lands. My first test held a turn for sixty seconds, which circled the bird away from the thermal and ended on the ground at half a metre. That looks exactly like a broken mission and is not one.

The correct recipe: fly straight for about five seconds to enter the column, then hold a turn. At roughly 20 metres per second with a yaw rate of 1.5 radians per second the bird circles in about 13 metres, which fits comfortably inside the column.

| Condition | Time to the 500 m goal | Limit |
|---|---|---|
| Before the change, good air | 50 s | 180 s |
| After the change, good air | 57 s | 180 s |
| After the change, heavy cloud (quality floor 0.1) | 125 s | 180 s |

So Ride the Thermal stays winnable in every weather while the headline number is no longer indefensible. The snapshot gained `thermalActive` and `thermalDistance`, which is what turned the false negative into a diagnosis.

**One constant was deliberately left alone.** The altitude trim climbs at a flat 8 metres per second for every species. Unlike acuity, the stoop, and the glide, there is no shipped per-species datum being ignored here; it is an explicit game affordance, labelled as trim in the interface. High Stoop also needs 1000 metres inside 180 seconds, so cutting it could break that mission. Changing it would be a pacing decision rather than a correction, and that is the user's call.

## Seventeenth pass: the pull-out ignored the G tolerance the tool teaches (2026-09-05)

Looking for more of the data-shipped-but-unused pattern turned up **orphan setters**, which is a defect class this codebase has seen before. Inside the simulation:

- `raptor.maxG = species.pullupG` is assigned and **read by nothing**.
- `raptor.stoopBonus = species.stoopDiveBonus` is assigned and **read by nothing**, despite the data comment calling it a "multiplier for sim".
- `eyeWeightPctBody` has zero references anywhere in the file.
- `talonForcePsi` and `visualFieldDeg` are used in teaching panels but never by the flight model.

The pull-out used a flat 1.5 radians per second of pitch rate at any speed, which is about 15 G at stoop speed. It is now limited by load, since in a curved pull-up the load factor is speed times pitch rate divided by g, so the fastest survivable rate is the tolerance times g divided by speed. The old rate stays as a ceiling, so slow-speed handling is untouched and only fast pull-outs are constrained.

**The honest result is that this changes very little today, and the reason is a compliment to the data.** Measured across all twenty species, birds with a low G tolerance also stoop slowly, so the cap binds for exactly one of them:

| Species | Tolerance | Stoop | Load at terminal under the old rate |
|---|---|---|---|
| Peregrine | 27 G | 242 mph | 16.5 G, never limited |
| Golden eagle | 22 G | 200 mph | 13.7 G, never limited |
| Osprey | 5 G | 80 mph | 5.5 G, **over its own limit** |
| Turkey vulture | 4 G | 50 mph | 3.4 G, never limited |

Only the osprey exceeded its own tolerance. The peregrine, the species actually built for the stoop, is never constrained, which is the right outcome.

So this is a correct guard with a small present effect. Its value is that the relationship now holds automatically: the test scans the shipped roster and asserts that no species is ever asked to carry more load than its own datum allows, so a future edit to a stoop speed or a tolerance cannot quietly break it. The snapshot gained `pullGLimit`, `pullPitchRate`, and `pullLoadFactor`.

**A measurement trap worth recording.** Sampling after a pull-up has already run shows a low speed, because pulling up also commands a slower target speed and the bird decelerates immediately. Press the key with a zero-duration step and read the first measured frames instead. Use the high-altitude mission too, or the bird reaches the ground before the pull-out can be observed.

## Eighteenth pass: the wind blew at a third of its own speed (2026-09-05)

The simulation moved the bird through the air mass at **30 percent** of the wind speed:

```js
var windPushX = Math.sin(weather.windDir) * effWindSpeed * 0.3 * dt;
```

The tool answers the same question twice elsewhere, and both times it answers it in full. The migration problem set says "ground speed = airspeed - headwind = 15 - 5 = 10 m/s", subtracting the whole headwind. The flight encyclopedia says "a red-tail facing a 30 mph wind can hold absolutely stationary in the air", which is kiting, and kiting requires the wind to be able to cancel the airspeed outright. A partial coupling in the simulation is a third derivation of a fact the tool had already settled, and it is the one that disagrees.

It also made the encyclopedia's own claim unreachable. Wind is clamped at 15 m/s with a gust peak of 1.4x, so the strongest air the simulation could ever produce was 21 m/s; at 30 percent that is 6.3 m/s, which cannot cancel the cruise of any of the twenty species. **Kiting was arithmetically impossible at every wind setting the tool can generate.**

A bird flies *in* the air, not through it, so the air carries it at wind speed. The drift is now full advection, and ground speed is derived once, beside the motion it describes:

```js
var groundVelX = (Math.sin(raptor.yaw) * horizSpeed) + windDriftX;
var groundVelZ = (-Math.cos(raptor.yaw) * horizSpeed) + windDriftZ;
raptor.groundSpeed = Math.sqrt((groundVelX * groundVelX) + (groundVelZ * groundVelZ));
raptor.windEffect = raptor.groundSpeed - horizSpeed;
```

Measured in a browser on a turkey vulture cruising at 10.95 m/s, with the wind set on the nose:

| Condition | Wind | Airspeed | Ground speed | Wind chip |
|---|---|---|---|---|
| Calm | 0 | 10.95 | 10.95 | `WIND N 0.0 m/s` |
| Headwind | 6.29 | 10.95 | 4.66 | `WIND N 6.0 m/s · GS 10 mph` |
| Wind set to match airspeed | 11.65 | 10.95 | **0.70** | `WIND N 10.9 m/s · GS 2 mph` |
| Tailwind | 6.29 | 10.95 | 17.24 | `WIND S 6.0 m/s · GS 39 mph` |

Every row is airspeed plus or minus the wind, and the third row is the encyclopedia's kiting claim, now demonstrable in the simulation the student is flying.

**Where the second number goes.** The Speed metric was renamed **Airspeed**, since two speeds are now on screen and the old label no longer said which one it meant. Ground speed rides on the wind chip, which already names the wind, and only appears when it differs from airspeed by at least 1.2 m/s, so calm air does not add a number that says nothing. The weather element's `aria-label` recites it too. The snapshot gained `groundSpeedMps`, `windEffectMps`, and `windDriftMps`.

**A test-suite finding, not a tool finding.** Adding five gates tipped the heaviest render test past the 5 s default timeout, reproducibly. The cause was not the new gates but `source()`, which re-read the 3.26 MB tool on every one of roughly a hundred calls. Memoising the read per file cut the four-file run from about 26 s to 13.7 s. The one remaining heavy test, which renders the whole tool twice, now carries an explicit 20 s timeout and a comment saying that it is a scheduling fact about this machine rather than a regression. No blanket timeout change was made.

## Nineteenth pass: the snow line, and three mountain systems that disagreed (2026-09-05)

Screenshots of four biomes, not code reading, started this one. The mountain skyline showed peaks that did not belong to the same world: some slate with white caps, one pure white, one flat brown cardboard cone. Tinting each system a diagnostic colour (magenta for the near landmarks, green for the horizon ring) proved there are **three separate peak generators**, and every one of them decided its own appearance.

**The snow caps were not attached to their peaks.** For a cone of radius R and height H, the radius where the top fraction f begins is exactly `R*f`, so a cap of `(R*f, H*f)` meets the surface all the way round, and centring it `H*(1-f)/2` above the peak's centre puts both apexes at one point. The shipped cap used an absolute `0.75 * mtHeight`. On a 100 m peak that floats the cap's apex **5 m above the summit** and hangs its rim **5 m clear of the silhouette** the whole way round.

There was a second, independent detachment. `sculptMountainGeometry` displaces vertices by `ridgeLevel * geometry.parameters.height * 0.13`, using **each mesh's own height**. A cap is 40 percent as tall as its peak, so it received 40 percent of the skew and its apex slid **7.7 m sideways** off a 100 m summit. The function now takes a `skewHeight`, so a cap is skewed by its parent.

**The snow line was a hand-typed list of three biomes.** It gave caps to the `cliff` biome at **+9 °C** and denied them to `boreal-forest` at **-4 °C** — the temperature ordering backwards — using temperatures the tool already ships in its weather model. Snow is now placed by the environmental lapse rate of 6.5 °C per 1000 m against that same table, which is also now a single module-level constant instead of an inline copy inside the weather block.

Because the line is an elevation rather than one fraction per biome, a peak's own height decides its cap:

| Biome | Mean °C | Snow line | Tallest peak (107 m) | Mid (75 m) | Near landmark (24 m) |
|---|---|---|---|---|---|
| Rainforest | 28 | 177 m | none | none | none |
| Grassland | 17 | 107 m | none | none | none |
| Forest night | 11 | 69 m | 0.35 | none | none |
| Cliff | 9 | 57 m | 0.47 | 0.24 | none |
| Mountain | 2 | 13 m | 0.88 | 0.83 | 0.47 |
| Boreal forest | -4 | below ground | 0.92 | 0.92 | 0.92 |
| Tundra | -10 | below ground | 0.92 | 0.92 | 0.92 |

Verified in the browser: the cliff biome capped **7 of its 8 peaks**, leaving the one that does not reach 57 m bare. That single uncapped peak is the whole point of the change.

**One number in this pass was wrong on the first attempt and the screenshots caught it.** The reference height was set to 116 m, read off `mtHeight = 44 + Math.random() * 72`. But the generator then clamps with `mtHeight = Math.min(mtHeight, mtWidth * 0.82)` and `mtWidth` tops out at 130, so the real ceiling is **106.6 m**. With the wrong reference the snow line sat too high and every temperate biome reported `snowCapCount: 0`. A test now pins the reference to the generator's own arithmetic, so editing the peak generator without moving the snow line fails.

**Two smaller repairs in the same area.** The horizon ring was painted from `bc.ground` while the distant range used a rock colour, and the two rings interleave at radius 410-480 and 435-550 — the same apparent distance. A boreal skyline showed a green mountain standing beside a grey one. Both now share one palette and one snow line. Separately, the near landmarks were the **only** smooth-shaded terrain in the scene, so the closest silhouette on screen resolved to one uniform colour under the hemisphere light; they are flat-shaded like every other peak now.

Seating the caps exactly on the surface made them coplanar with it, which z-fights, visible as stripes on the near peak. `polygonOffset` plus a 1.02 radius on the cap is the standard decal remedy and clears it.

Captures: `scratch/raptor-flight-review/biome-mountain.png` (before), `p-mtn6.png` (after), `p-cliff5.png` (partial snow line), `diag-tint.png` (the three systems, colour-coded).

## Twentieth pass: nothing cast a shadow, and the readability metric never looked (2026-09-06)

Two findings in the same area, and they turn out to be each other's answer.

**The scene had no shadow of any kind.** `castShadow`, shadow maps, blob shadows: zero occurrences. The bird therefore had no contact cue with the ground, and altitude could only be read as a number on the HUD.

**`raptorReadability` never looked at what the bird is seen against.** It is a self-illumination lift applied to the body, wings, tail and dorsal mark, and it was computed from daylight and cloud cover alone. Across six biomes it reported the identical value:

| Biome | Bird | Background | Contrast | Readability, before | after |
|---|---|---|---|---|---|
| Tundra, snowy owl | 0.955 | 0.896 | **0.059** | 0.0608 | 0.1523 |
| Night forest, great horned owl | 0.089 | 0.014 | **0.075** | 0.0608 | 0.1449 |
| Grassland, red-tail | 0.074 | 0.356 | 0.282 | 0.0608 | 0.0608 |
| Mountain, golden eagle | 0.046 | 0.374 | 0.328 | 0.0608 | 0.0608 |
| Cliff, peregrine | 0.052 | 0.476 | 0.424 | 0.0608 | 0.0608 |
| Rainforest, harpy eagle | 0.663 | 0.168 | 0.495 | 0.0608 | 0.0608 |

A white owl on white snow and a dark falcon against a bright sky were given exactly the same help. Readability now measures the bird's own plumage luminance against the ground it is over, washed toward haze as it climbs, and lifts only when that contrast is short. The two genuinely hard pairings the tool ships get roughly 2.5 times the lift; the four that were already readable are untouched.

**Why both were needed.** Self-illumination only works upward, so it cannot separate a white owl from white snow — there is no headroom. A shadow can. On a near-black night forest floor the reverse holds: nothing can darken that ground further, but the emissive lift works. Each mechanism covers the case the other cannot.

**Measuring the shadow honestly.** A first probe compared the shadow's pixels against a flanking control point and produced nonsense: `-33%` and `-112%` "darkening", because the flanks landed on trees and shaded slopes rather than comparable ground. The fix was to stop choosing a control and read a **radial luminance profile** outward from the shadow centre, where the shape itself is the evidence. On tundra:

```
radius px    0       5       10      16      24      34      46      60
luminance    0.530   0.540   0.535   0.539   0.557   0.599   0.709   0.777
```

A flat dark core out to about 16 px, then a steady rise to the rim: a disc with a soft penumbra, 31.8 percent darker at the centre. On grassland and night forest the profile is dominated by the terrain's own gradient, which is the expected result of laying a dark blob on already-dark ground and is why the emissive term carries those biomes.

**A dead parameter, caught by a diagnostic tint.** The shadow material was `MeshBasicMaterial({ map, color: 0x1f2937 })`, and the gradient was painted in black. `MeshBasicMaterial` multiplies `color` by `map.rgb`, so with a black map the colour could never tint anything — forcing it to pure red and full opacity still rendered black, which is what proved it. The gradient is painted in white now and the colour is a sky-lit blue-grey, because a pure black shadow reads as a hole in the terrain rather than a shadow on it.

The shadow sits on sampled terrain, is thrown away from the sun, spreads and fades with height as a penumbra does, and vanishes under heavy cloud. The low-sun case needed a clamp: the offset is `altitude * sunDir.xz / sunDir.y`, which diverges as the sun nears the horizon and would fling the shadow across the world at dawn, so it is limited to six times the bird's visual radius.

**Honest scope.** At normal cruise altitude the ground directly beneath the bird is outside the 70 degree frame, so the shadow is a low-level cue: landing, strikes, and terrain following. That is where judging height actually matters, but it is not a general readability aid, and the contrast term is what carries the rest.

Snapshot gained `shadowOpacity`, `shadowScale`, `shadowVisible`, `shadowNdcX`, `shadowNdcY`, `raptorBodyLuminance`, `raptorBackgroundLuminance`, and `raptorContrast`. Probe: `scratch/raptor-shadow-probe.cjs`.

## Twenty-first pass: the snow ground, and the limit that sets on it (2026-09-06)

The tundra screenshots had been reading as a blank white sheet since the shadow pass, so this one started by measuring rather than guessing. A probe samples the rendered ground band across six biomes and reports the spread of pixel luminance:

| Biome | Mean | Spread (p95 - p05) | Near-field variation |
|---|---|---|---|
| **Tundra** | 0.835 | **0.0236** | **1.5%** |
| Mountain | 0.136 | 0.0493 | 9.6% |
| Grassland | 0.180 | 0.0652 | 15.3% |
| Cliff | 0.330 | 0.2445 | 23.2% |
| Rainforest | 0.061 | 0.0624 | 39.0% |
| Boreal forest | 0.049 | 0.0394 | 53.1% |

Tundra was the flattest ground in the tool, at the brightest mean, by an order of magnitude in relative terms.

**The cause was a ternary branch.** Ground shading lerped toward an olive `meadowTint`, at `patch * 0.78` for every biome and `patch * 0.12` for tundra. The reduced factor was presumably there to stop the snow turning green, but twelve percent of an olive tint is neither snow-coloured nor strong enough to show relief. Snow reads by shadow, not by hue: a hollow in a snowfield is lit by sky alone, which is why its shadows are blue-grey. Tundra now lerps toward a sky-blue shadow tint at `(1 - patch) * 0.62`, and the measured spread went **0.0236 to 0.0570**, with ridges visible in the capture where there had been none. No other biome's numbers moved, which is the check that the change stayed in its own branch.

**Then two attempts failed, and both were removed rather than shipped.** Adding a slope term took the near field from 1.5% to 1.1%, worse, because the terrain nearest the camera is genuinely flat and the slope factor is near zero there. A higher-frequency drift wave, at a wavelength chosen to clear the 16.7 m Nyquist limit of the 800 m by 96 segment grid, took it from 1.5% to 1.6%, which is noise.

**Why neither worked, quantified.** The tundra ground renders at about 1.24 scene-linear, past the shoulder of the ACES tone curve. Evaluating the curve's local gain at each biome's own brightness:

| Biome | Scene-linear | ACES local gain | Relative |
|---|---|---|---|
| Tundra | 1.241 | 0.143 | **8%** |
| Cliff | 0.229 | 1.474 | 82% |
| Grassland | 0.130 | 1.797 | 100% |
| Rainforest | 0.066 | 1.580 | 88% |

Any variation added to the tundra vertex colours arrives on screen compressed roughly twelve-fold against what the same variation would achieve in any other biome. That is why the large blue-shadow change survived and the two small ones did not.

**Lowering the albedo is not the lever either.** Walking the snow colour from `#f1f5f9` down to a distinctly grey-blue `#b3c7da` only lifts the gain from 8% to 19% of grassland's, while the screen value barely moves, from 0.929 to 0.875, because the curve is so compressive up there. There is no number in this file that fixes the foreground; it would take a different tone curve or a darker ground than snow should be. Photographers meet the same wall when they expose for a snowfield.

So the pass ships one measured improvement, records the ceiling with the arithmetic behind it, and leaves nothing dead in the source. Tests pin the ACES assumption, so if the tone curve ever changes the finding gets re-measured rather than trusted. Probe: `scratch/raptor-terrain-relief.cjs`.

## Twenty-second pass: the CSS gate, and what it took to make it trustworthy (2026-09-06)

The tenth item in this file's own next-checks list has been sitting there for several passes: the forced-colors blocks have shipped unbalanced **five separate times**, and a cheap gate would catch it. This pass built that gate. Most of the work was making it not lie.

**Why the defect class matters.** An unbalanced CSS block fails silently. The browser discards the rest of the stylesheet, so the symptom is unrelated rules quietly not applying, with nothing in the console and nothing in any test.

**Four wrong versions before a right one.** Each was caught by checking the gate against files it should pass, which is the only way to tell a clean gate from a blind one.

1. A line regex that treated each quoted string as a self-contained rule. It reported 22 problems in the raptor file, all of them BibTeX entries: this tool carries its bibliography as plain strings, and `@book{carson1962, author = {...}}` is full of braces.
2. With BibTeX filtered out, the raptor file came back clean, and so did three deliberately broken copies. The gate was blind, and only looked clean because I read the summary line and not the report above it.
3. Fixed, it then reported problems in ten other STEM tools. Every one was a false positive. Tools assemble stylesheets differently, and a line-based reader cuts a run in the middle of a block and then reports both halves. Molecule splits one `@media` across four `+`-concatenated lines; birdlab puts a five-line comment between two array elements; forge interpolates `' + pageBg + '` into a declaration.
4. Rewritten token-based, it hung for minutes on a nested-quantifier regex that backtracks catastrophically on long gaps.

**What the working version does.** It scans the file as JavaScript, tracking string, template, comment and regex context, then joins string literals that are adjacent in the token stream, which is what the browser actually concatenates. Comments are blanked before gaps are measured, so a comment between two array elements does not split a run. Interpolated expressions are treated as opaque, so a ternary inside a declaration does not either.

**Calibration, which is the part that makes it worth having.** The unit tests do not merely assert the file is clean. They take the real source, inject each historical failure mode into it in memory, and assert the checker catches it:

| Injected defect | Caught |
|---|---|
| Dropped closing brace on the forced-colors block | yes |
| Stray extra closing brace | yes |
| `@media` prelude whose block never opens | yes |
| BibTeX braces (must NOT fire) | no false positive |

A fifth test asserts the checker still examined at least three runs, so if a future reformat makes the gate stop understanding the file, that shows up as a failure rather than as a green tick.

**A fleet result worth recording.** Pointed at all 147 tools in `stem_lab/`, the finished scanner reports **one** flag, in `stem_tool_applab.js`, and that one is a teaching data table showing students `@media (prefers-reduced-motion: reduce) { ... }` as example text. It is not a stylesheet. So **no STEM tool currently ships a structurally broken stylesheet** — a verified negative across the fleet, which is the first time that has been established.

The scanner is installed at `dev-tools/stem_css_structure_scan.cjs` rather than left in `scratch/`, because `scratch/` is gitignored. Run it over one file or over `stem_lab/stem_tool_*.js`.

**No tool source changed in this pass.** The raptor file is byte-identical to the twenty-first pass (md5 `817ed638bf6c`), so browser behaviour is unchanged and the Playwright suite was not re-run; there is nothing new for it to exercise.

## Twenty-third pass: mass cancelled out of the energy model (2026-09-06)

The recurring finding in this tool has been per-species data the simulation ships and then ignores. This is the fifth instance, and the most complete: the energy model used `massKg` in two places that cancelled each other exactly.

```js
var dailyCaloriesNeeded = Math.round(species.massKg * 120);   // budget, scales as M
var caloriesBurned = burnPerSecPerKg * species.massKg * dt;   // burn,   scales as M
```

Endurance is budget divided by burn rate, so `(120·M)/(r·M)` — **M disappears**. Every one of the 18 species had identical flight endurance, from a 0.12 kg kestrel to a 9.5 kg condor.

**The tool teaches the opposite, in its own words.** Its Kleiber problem states `BMR (kcal/day) ≈ 73 × m^0.75` and concludes: *"SMALLER birds need MORE energy per gram (allometric scaling) — a kestrel 'burns hotter' than an eagle relative to body mass. This is why small raptors must hunt more frequently."* The simulation made every raptor hunt at exactly the same frequency.

**The fix is the exponent.** Stored energy scales with body mass, but the rate of spending it scales as mass^0.75, so endurance scales as mass^0.25 — about a threefold spread across this roster.

**The anchor is where the real work was, and the first choice was wrong.** Normalising at 1 kg is the obvious move: it leaves a mid-roster bird untouched. Measured in a browser, that was not good enough:

| Model | Kestrel runs out of calories at |
|---|---|
| Original, mass^1.0 | 124 s |
| Kleiber anchored at 1 kg | **91 s** |
| Kleiber anchored at 0.12 kg | 124 s |

The kestrel was *already* starving 124 s into a free flight, inside the 180 s mission window — a pre-existing balance problem this pass did not create, confirmed by measuring the unmodified model. A mid-roster anchor would have made the most fragile species meaningfully less playable while fixing the physics. Anchoring on the lightest shipped mass holds the kestrel exactly where it was and gives every heavier bird more slack:

| Species | Runs out at, before | after |
|---|---|---|
| American kestrel, 0.12 kg | 124 s | 124 s |
| California condor, 9.5 kg | 124 s | **277 s** |

A 2.23x measured spread where there was none, and **no species is worse off than before**. That asymmetry is also the true statement: a condor soars for hours, a kestrel must hunt constantly.

**Gates.** The tests scan the shipped roster rather than pinning numbers. They prove the old model's cancellation algebraically, assert endurance is monotonic in mass across all 18 species, assert the roster spread equals the fourth root of the mass spread, and assert the anchor equals the lightest shipped mass — so adding a lighter species than the kestrel fails rather than silently squeezing it. One more asserts no species' metabolic mass exceeds its plain mass, which is what guarantees nothing regressed.

**Left alone deliberately.** Stamina burn is a flat 18/8/-25 for every species. Unlike calories there is no shipped per-species datum being ignored, so changing it would be a pacing decision rather than a correction. Same reasoning as the altitude trim in the sixteenth pass.

Snapshot gained `metabolicMass`, `caloriesMax`, `glideEnduranceSec`, `flapEnduranceSec`. Probe: `scratch/raptor-endurance-probe.cjs`, which steps frames until the energy readout first reads zero rather than asking whether the bird happened to survive a fixed window.

## Twenty-fourth pass: what a catch is worth, and three answers to it (2026-09-06)

Following the energy model into the catch resolution found the "+N kcal" a student sees on every successful strike, and it disagreed with the rest of the tool.

**Three inconsistent accounts of prey energy ship in this one file:**

1. The flight simulation: `sizeM^2.5 * 4`, then treated as kilograms of meat.
2. The prey species reference table, which gives real body masses: cottontail 800-1500 g, mallard 0.7-1.5 kg, meadow vole 40-60 g, rock pigeon 270-400 g.
3. The maths problems, which use round figures: vole 30 kcal, songbird 30 kcal, "1 prey item = 50 kcal avg".

They disagree with each other, but they agree on the direction. Measured against the eight prey the reference table actually names, the simulation was **4x to 13x too light on every single one**:

| Prey | Simulation | Reference table | Out by |
|---|---|---|---|
| Cottontail | 91 g | 800-1500 g | 12.7x |
| Mallard | 125 g | 0.7-1.5 kg | 8.8x |
| Eastern gray squirrel | 72 g | 400-700 g | 7.7x |
| Ground squirrel | 55 g | 100-600 g | 6.4x |
| Rock pigeon | 55 g | 270-400 g | 6.1x |
| Snowshoe hare | 290 g | 1-2 kg | 5.2x |
| Meadow vole | 10 g | 40-60 g | 5.0x |
| Mourning dove | 35 g | 120-160 g | 4.0x |

**The shape was never wrong; the scale was.** Fitting mass against `sizeM` in log space over those eight returns an exponent of **2.596** against the shipped 2.5, at R-squared 0.91 — so the exponent stays. The coefficient moves from 4 to **27.3**, which puts **six of the eight inside the reference table's own stated ranges, where none of them were before**.

**The edible fraction is now stated rather than hidden.** The coefficient yields body mass, and 1300 kcal/kg is a figure for meat, so the carcass waste has to appear somewhere. A raptor eats muscle and leaves bone, fur and feather, so the model now says `preyMassKg = preyBodyMassKg * 0.65` in the open instead of burying that ratio inside a constant that also happened to be eight times too small.

**What this does not settle, and I am not going to pretend it does.** After the fix a vole awards 42 kcal where the maths problems say 15-30. The residual gap traces to `sizeM` being a rendering size rather than a length or a mass: no single coefficient can reconcile a snake with a monkey, and deciding what "a songbird" weighs is a subject-matter question, not an arithmetic one. The pass calibrates to the most systematic of the three sources and records the other two.

**A limit on the verification.** The change is deterministic arithmetic on values I checked offline against the tool's own table, and the browser reports zero page errors with the new snapshot fields present. I could not land a scripted catch to confirm the number end to end: `canStrike` requires both range and an alignment dot of 0.7, and a bot that descends and steers by the target's screen offset did not converge in 150 s of simulated flight. That is a gap in the evidence, not a claim that it works.

Snapshot gained `lastCatchPreyBodyKg`, `lastCatchPreyMassKg`, `lastCatchCalories`, `lastCatchCapped`. Probe: `scratch/raptor-catch-probe.cjs`.

**Checked and found sound.** Prey behaviour is not another orphan: `behavior` drives the flee/wander branches, `speedMps` sets escape velocity, and `points` feeds the XP award. The 30 percent meal cap matches the tool's own worked problem exactly.

## Verified state

Checked after the twenty-fourth pass:

- Both live raptor sources are byte-identical (`cmp` clean) and `node --check` passes.
- 181 of 181 unit tests pass across all four raptor files, in one run.
- The Playwright suite passed 3 of 3 (1.0 minute).
- Browser probes report zero page errors. The endurance probe's kestrel figure is bit-identical to the pre-change measurement. The catch probe did NOT land a catch, so the prey-energy change is verified by arithmetic against the tool's own reference table rather than end to end; see the twenty-fourth pass.
- Browser captures across eight biomes report zero page errors, and the snapshot fields `snowLineHeight`, `biomeTempC`, `snowCapCount`, and `landmarkSnowCount` agree with the table above.
- The browser wind probe (`scratch/raptor-wind-probe.cjs`) reports zero page errors and ground speed matching airspeed plus or minus the wind in all four conditions.
- The deployment-copies test for `stem_tool_astronomy.js` failed intermittently through several passes whenever another session had that tool's canonical copy edited but not yet mirrored. It resolved on its own each time. Nothing in this task touches astronomy; check `cmp` on all three mirrors before assuming a raptor regression.
- One combined run dropped the experience file from the report entirely. Run alone with a 60 s budget it passed 73 of 73 (`experience-unit-results.json`). That is the OneDrive load-time flake, not a regression.
- Screenshot timeouts in the harness were contention, not hangs: eight foreign node processes were running on the machine at the time. The harness now allows 90 s per capture.
- The three Playwright tests are:
  1. holds chase framing steady through uneven frames and pauses without pose jumps
  2. keeps perched birds stationary and takes off without an eight-meter teleport
  3. retains a stable bird and working view controls with reduced motion
- Browser captures before and after the first visual pass reported no page or console errors.

History of earlier unit runs, for context only:

- First run after implementation: 113/114. The one failure was the old `flightAnimationProfile.flapRate` assertion, since updated.
- A run during Windows file synchronization: 102/114. Three failures were mirror equality (repaired). Nine were generic `STACK_TRACE_ERROR` reports. On this machine that signature is usually the 5 s default test budget colliding with OneDrive I/O, not a functional regression. The final run used a 30 s budget and a single worker and was clean.

## Commands

Unit (single worker, 30 s budget, JSON report):

```
npx vitest run tests/raptor_hunt_polish.test.js tests/stem_raptorhunt_experience.test.js tests/stem_raptorhunt_controls_contrast.test.js tests/stem_astronomy_nutrition_raptorhunt_quiz.test.js --maxWorkers=1 --testTimeout=30000 --reporter=json --outputFile=scratch/raptor-flight-review/final-unit-results.json
```

Browser continuity:

```
npx playwright test tests/e2e/raptor-flight-continuity.spec.ts --workers=1 --retries=0 --reporter=line
```

Screenshot harness (`label species mission [width height quality stepsJson frameCount]`):

```
node scratch/raptor-flight-review.cjs final
node scratch/raptor-flight-review.cjs lake baldEagle freeFlight
node scratch/raptor-flight-review.cjs night greatHorned freeFlight
node scratch/raptor-flight-review.cjs narrow goldenEagle freeFlight 420 700 low
node scratch/raptor-flight-review.cjs phone goldenEagle freeFlight 380 560 low
node scratch/raptor-flight-review.cjs closeup peregrine freeFlight 1280 850 high '[{"cmd":"zoom"},{"fly":800}]'
node scratch/raptor-flight-review.cjs lakeview baldEagle freeFlight 1280 850 balanced '[{"key":"e","ms":1500},{"key":"d","ms":2000},{"fly":1500}]'
node scratch/raptor-flight-review.cjs truenight greatHorned freeFlight 1280 850 balanced '[{"cmd":"environment","value":{"dayPhase":0.93,"cloudCover":0.1}},{"fly":1200}]'
node scratch/raptor-flight-review.cjs dive peregrine freeFlight 1280 850 balanced '[{"key":"e","ms":2500},{"key":"shift","ms":1400}]'
node scratch/raptor-flight-review.cjs stoop peregrine freeFlight 1280 850 balanced '[{"key":"a","ms":0,"keep":true},{"key":"e","ms":9000},{"key":"a","ms":0},{"key":"shift","ms":500,"keep":true}]' 30
RAPTOR_EXTRA='{"controlScheme":"simple"}' node scratch/raptor-flight-review.cjs guidesimple greatHorned freeFlight
```

`RAPTOR_EXTRA` is a JSON object merged into the tool state at mount, for preferences such as `controlScheme` or `keyGuideEnabled`.

Settings panel capture and rebind check:

```
node scratch/raptor-settings-shot.cjs settings custom
RAPTOR_REBIND_KEY=g node scratch/raptor-settings-shot.cjs rebound custom
```

Flight school captures:

```
RAPTOR_EXTRA='{"huntTutorialDismissed":false}' node scratch/raptor-flight-review.cjs tutorial peregrine freeFlight 1280 850 balanced '[{"key":"a","ms":600},{"key":"e","ms":600},{"fly":400}]'
RAPTOR_EXTRA='{"huntTutorialDismissed":false}' node scratch/raptor-flight-review.cjs acuity peregrine freeFlight 1280 850 balanced '[{"key":"a","ms":600},{"key":"e","ms":600},{"cmd":"zoom"},{"fly":500}]'
node scratch/raptor-flight-review.cjs acuity_goldenEagle goldenEagle freeFlight 1280 850 balanced '[{"cmd":"zoom"},{"fly":600}]'
node scratch/raptor-flight-review.cjs stooptrace peregrine freeFlight 1280 850 balanced '[{"key":"a","ms":0,"keep":true},{"key":"e","ms":9000},{"key":"a","ms":0},{"key":"shift","ms":0,"keep":true}]' 90
node scratch/raptor-flight-review.cjs highstoop peregrine highStoop 1280 850 balanced '[{"key":"shift","ms":11000,"keep":true}]' 40
node scratch/raptor-flight-review.cjs harpyglide harpyEagle freeFlight 900 600 low '[{"fly":12000}]' 20
node scratch/raptor-flight-review.cjs kettle_ride redTail thermalKettle 900 600 low '[{"fly":5000},{"key":"a","ms":45000,"keep":true}]' 40
RAPTOR_SKIP_SETTINGS=1 RAPTOR_SHOT_SELECTOR='.rh-flight-controls' node scratch/raptor-settings-shot.cjs cues classic
node scratch/raptor-contrast-probe.cjs
node scratch/raptor-flight-review.cjs tutorialstrike peregrine freeFlight 1280 850 balanced '[{"cmd":"tutorialSignal","value":{"signal":"strike"}},{"fly":400}]'
```

The settings panel is absolutely positioned, so screenshot `.rh-flight-settings-panel`, not the `details` element, or you get only the Settings button.

The harness's `maxScreenStep` printout was null for 100-frame runs during the sixth pass because a ternary bound tighter than the following `.map`. It is fixed; treat any earlier null as a harness bug, not a scene problem.

Step fields: `key` plus `ms` holds a sim key for that long and releases it; add `"keep":true` to leave it held (a later `{"key":"a","ms":0}` releases it). `cmd` with optional `value` sends a sim command. `fly` just advances. The trailing number is how many measured frames run after the steps (default 100, about 1.7 s).

Three traps met while chasing the stoop frame:

- A long straight climb flies the bird off the world edge, and the dive then ends in a "crash" at the boundary. Hold `a` with `keep` during the climb so it circles.
- The measured-frame count must be a separate argument to the page, not a property on the steps array. Arrays cross `page.evaluate` without extra properties, so the count silently fell back to 100 and a 90 m/s stoop from 119 m always hit the ground.
- The 90 m/s descent itself is correct (peregrine stoop maximum about 107 m/s at a pitch of one radian), so a crash after 100 frames is not a physics bug.

The `dive` command above ends in a crash landing, which is useful as a 2 m ground close-up. Use the `stoop` command for a mid-dive frame.

Turning without climbing first can put the bird into the ground during the hold, which ends the flight session and unmounts the stage. Climb with `e` before a long `d` or `a` hold.

Telemetry strip probe (computed style at 420 px):

```
node scratch/raptor-strip-probe.cjs
```

Scripts must live inside the repo to resolve Playwright. Running them from a temp directory fails with a module-not-found error.

Mirror check after any save:

```
cmp stem_lab/stem_tool_raptorhunt.js desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js && echo MIRROR OK
```


Harness caveats:

- It uses local React/Three assets, seeded randomness, and controlled `requestAnimationFrame` timestamps, and disables bloom.
- `before.png` and `after.png` are from the first session and superseded by the six named captures.
- New Three geometry allocations shift the global random sequence, so before/after target positions are not directly comparable.
- The continuity test disables target assistance for the frame-pacing measurement.
- Never run two Playwright suites at once on this machine. WebGL context limits and SwiftShader make the whole run 4x slower and produce random-looking timeouts.

## Suggested next checks (keep scope narrow)

1. Commit passes four to twenty-four by pathspec as above. Note that `dev-tools/stem_css_structure_scan.cjs` is a new file this work added. Do not deploy unless asked; if a deploy is requested, note that `deploy.sh` skips its own push when the work is pre-committed, so push explicitly.
2. Eyeball the six captures once in a real browser at the same sizes. The harness disables bloom and uses SwiftShader, so glow and anti-aliasing differ from a GPU.
3. Controls follow-ups if wanted: gamepad mapping, which this machine cannot verify headlessly, so it would ship untested; localising the preset labels, action names, and guide prompts through ui_strings. On localisation, note that the surrounding flight HUD strings (the target cue, the phase labels, the landing messages) are English literals too, so doing only the new strings would be a partial job. It belongs in one sweep across the flight HUD.
4. The wind now advects the bird fully (eighteenth pass), which makes the strongest gusts genuinely hard to fly against for the slowest species: at the 15 m/s clamp and the 1.4x gust peak, 21 m/s of air exceeds the maximum level speed of every species except the gyrfalcon. That is physically honest and matches the encyclopedia's own kiting claim, but if a student reports being unable to make headway, the knob to reconsider is the wind ceiling in the weather drift, not the coupling. Do not reintroduce a fractional multiplier on the drift; that is what the eighteenth pass removed.
5. Remaining visual candidates, none blocking: the ground texture is one tile for all biomes apart from colour. The tundra foreground is still flat, but the twenty-first pass shows that is a tone-curve ceiling rather than a tunable value, so do not spend another pass adding vertex variation there. Prey size is deliberately left alone, see the twelfth pass.
6. Two orphans remain deliberately unused: `stoopDiveBonus`, whose own comment calls it a simulation multiplier, and `eyeWeightPctBody`, which nothing references at all. Wiring the first would change dive balance and needs a design decision about what it should multiply; the second may simply be a teaching datum with no simulation meaning. Neither is a bug on its own, but both are worth a decision rather than being left ambiguous.
7. The altitude trim still climbs at a flat 8 metres per second for every species. See the sixteenth pass for why it was left alone; changing it is a pacing decision, not a correction.
8. One species datum is worth a second opinion from someone who knows the literature: the turkey vulture is listed at 3.5, level with the northern goshawk. Turkey vultures are famous for finding carrion by smell rather than by sharp distant vision, so that value looks generous. Nothing was changed, because changing a species datum is a science decision, not a rendering one.
9. The flight HUD is entirely English literals while the rest of the tool has 1411 `__alloT` calls. This is a scope boundary, not an oversight: `__alloT` is defined inside the React component and `initHuntSim` runs in a different parent function, so the sim cannot reach it. Localising the flight HUD means plumbing a translator into `initHuntSim` and updating the many tests that pin exact literal strings. It is one deliberate sweep, not a drive-by.
10. If further jerks are reported, add a dedicated continuity test for a successful catch and for forced target replacement. Current coverage: straight flight, frame timing, pause/resume, dive transitions, landing/takeoff, view controls, reduced motion.
11. Done in the twenty-second pass. If the same guard is ever wanted for another tool, use `dev-tools/stem_css_structure_scan.cjs` rather than writing a fresh line-based one; the reasons a line-based check cannot work here are recorded in that pass.

## Windows save/tool issues

The default shell and local image reader repeatedly failed with "apply deny-read ACLs"; shell work used the approved escalated execution path. Two automatic approval requests timed out and one retry succeeded. This was not an unsafe-action rejection.

Both raptor sources became memory-mapped by another process, so in-place writes and copies failed with "user-mapped section open." Atomic replacement worked:

1. Write the new contents to a staging file inside this workspace.
2. Resolve explicit source, staging, and backup paths.
3. Call `[System.IO.File]::Replace(staged, destination, backup)`.
4. Supply a real backup path. Passing `$null` produced a .NET "path is empty" error.
5. Verify canonical/desktop byte equality afterwards.

Related backups and staging scripts live in `scratch/raptor-*`. Do not rerun the edit scripts: their string replacements expect earlier source versions and are not idempotent. A second run against the current file will either no-op or corrupt it.

If a write ever leaves either source at 0 bytes, `node --check` still passes on an empty file. Restore from the mirror or from `scratch/raptor-before-refine.js`, never from a build directory.
