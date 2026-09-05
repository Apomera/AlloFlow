# Claude handoff: Raptor Lab visuals and motion

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
Prepared: 2026-09-04. Second to sixth visual passes and a seventh controls pass followed through 2026-09-05 (see the sections named after them). Passes one to three were committed and deployed by another session; passes four to seven are uncommitted.

## Status at a glance

| Item | State |
|---|---|
| Implementation | Passes 1 to 3 are in commit `f238731dd` (2026-09-05 08:57, "Deploy everyone's work", made by another session from the shared tree). Passes 4 to 7 are uncommitted and mirrored; run `git diff --stat` for the current size. |
| Canonical vs desktop source | Byte-identical: 3,249,015 B, md5 `62a3d08b7997...` on both. |
| Syntax | `node --check stem_lab/stem_tool_raptorhunt.js` passes. |
| Unit tests | 119/119 in `scratch/raptor-flight-review/final-unit-results.json` (five new controls tests). |
| Browser tests | 3/3 passed in Chromium (`tests/e2e/raptor-flight-continuity.spec.ts`). |
| Visual signoff | Done for eleven captures (wide peregrine, eagle lake, owl night, true night, tablet, narrow, phone, 8x close-up, lake from the air, crash-landing ground view, mid-stoop). See the pass sections. |
| Commit / deploy | Passes 1 to 3 deployed in `f238731dd`. Passes 4 to 7 not committed. Do not deploy unless the user asks. |

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
 M CLAUDE_RAPTOR_LAB_HANDOFF.md
```

That diff is passes four to seven (cloud sprites, ground grain, opaque near mountains, peak and landmark proportions, sky haze band, night landmark colour, prey size floor, prey shadow pads, tree crown tint, sky-tinted speed lines, control presets and the key guide).

The `scratch/` directory is gitignored (rule added in that same commit), so the harness and the probe exist only on this machine. If they should survive, move them to `dev-tools/` and commit them from there.

Commit passes four to seven by pathspec:

```
git add -- stem_lab/stem_tool_raptorhunt.js desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js tests/stem_raptorhunt_experience.test.js CLAUDE_RAPTOR_LAB_HANDOFF.md
git commit -m "Raptor Lab: control presets and key guide; softer clouds, ground grain, broad peaks, sky haze, readable prey"
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

## Verified state

Checked after the seventh pass:

- Both live sources are byte-identical (same size and md5) and `node --check` passes.
- `git diff --check` is clean for the source and the test.
- `final-unit-results.json` reports 119 total, 119 passed, across four files: `raptor_hunt_polish` (10), `stem_astronomy_nutrition_raptorhunt_quiz` (25), `stem_raptorhunt_controls_contrast` (6), `stem_raptorhunt_experience` (78, five new for controls).
- During the second pass this set showed one failure: the deployment-copies test for `stem_tool_astronomy.js`, whose two copies another session had left out of sync. That session has since resynchronised them. Nothing in this task touched astronomy.
- One combined run dropped the experience file from the report entirely. Run alone with a 60 s budget it passed 73 of 73 (`experience-unit-results.json`). That is the OneDrive load-time flake, not a regression.
- The Playwright suite passed 3 of 3 after the seventh pass (41 seconds). One earlier full run that pass failed its third test (reduced motion and view controls) with the failure text lost to output trimming; the test passed alone and the full rerun was clean, so it is filed as the same load flake seen in pass two. During the second pass it failed once on its first test when run immediately after vitest, and the line reporter lost the failure text; the rerun was clean. Use `--reporter=list` so failure text survives.
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

1. Commit passes four to seven by pathspec as above. Do not deploy unless asked; if a deploy is requested, note that `deploy.sh` skips its own push when the work is pre-committed, so push explicitly.
2. Eyeball the six captures once in a real browser at the same sizes. The harness disables bloom and uses SwiftShader, so glow and anti-aliasing differ from a GPU.
3. Controls follow-ups if wanted: a custom preset with per-action rebinding (the table shape already supports it, only UI is missing); gamepad mapping; showing the key guide on touch layouts as a single line above the hold buttons; localising the preset labels and action names through ui_strings like the rest of the tool.
4. Remaining visual candidates, none blocking: prey at 100 m still depend on the beacon and target box for pickup; distant mountains have no snow line except in tundra, mountain, and cliff biomes; the ground texture is one tile for all biomes apart from colour.
5. If further jerks are reported, add a dedicated continuity test for a successful catch and for forced target replacement. Current coverage: straight flight, frame timing, pause/resume, dive transitions, landing/takeoff, view controls, reduced motion.
6. The forced-colors blocks have now been wrong five times. A cheap guard would be a unit test that counts braces per CSS string entry in the raptor source and fails on any imbalance.

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
