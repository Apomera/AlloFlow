**Cephalopod Hunter 3D: deep review and enhancement plan**

Reviewed 26 September 2026 against the local working tree. This is an assessment and implementation roadmap; simulator source was not changed.

The simulator already has enough systems to become a compelling experience. Twelve playable species, continuous camouflage, three crab types, fish, clams, shelter carrying, dens, several predators, depth zones, day/night changes, landmarks, pearls, achievements, audio, and accessibility settings are present. The highest return comes from making those systems visually convincing, mechanically consistent, and understandable during play. My recommended direction is a compact underwater wildlife simulation in which observation and planning visibly improve survival.

The review covered the roughly 4,200-line 3D initializer, species data, lobby, HUD, persistence, existing tests, a live local WebGL scene, desktop and narrow viewport screenshots, targeted interaction probes, and selected biological references. Browser findings below distinguish ordinary input from controlled scene placement. The harness runs the real tool with a minimal host, rather than the complete deployed application. It does not reproduce every application stylesheet or classroom device. The root source and deployed public mirror had identical SHA-256 hashes at review time.

**What deserves attention first**

| Priority | Finding and evidence | Recommended correction |
|---|---|---|
| P1 | Rocks visibly split into disconnected triangles. The r128 icosahedron used here has 540 vertex entries representing only 92 unique positions; the code independently randomizes every entry. Coincident triangle corners separate. | Use position-based deterministic deformation so shared positions receive the same displacement, or construct suitably welded geometry. Preserve deliberate hard edges and UV seams. Recompute normals once after construction. |
| P1 | The octopus becomes a spiky lump at high camouflage. Papillae displacement reaches 0.18 on a body with radius 0.55, and applies even while resting on sand. Its eight arms are single cylinders. | Keep the mantle silhouette smooth; make papillae small and substrate-dependent. Improve arm curves, taper, webbing, and contact with the bottom. |
| P1 | Movement sticks after focus leaves the canvas. With W released while the search field had focus, the player moved another 2.25 scene units in about 0.9 seconds. | Clear held input on canvas blur, window blur, pause, and page visibility changes. Separate held actions from one-shot actions; ignore repeated Escape keydown events. |
| P1 | Pausing increases survival time. A paused run went from 7 to 10 seconds while hunger stayed unchanged. The paused HUD also changed its day label to Night because dayMix is computed only inside the active update block. | Use accumulated simulation time for survival, cooldowns, spawning, and run awards. Store the resolved day state. Freeze simulation time on pause and backgrounding. |
| P1 | Several interactions are effectively two-dimensional. In a controlled placement test, ascending from a den to y=4.51 still displayed “IN DEN — safe, regenerating,” with zero substrate camouflage. | Centralize distance, vertical overlap, line of sight, and shelter containment rules. Use actual den volumes, not infinite vertical columns. Audit prey catches and predator bites through the same interface. |
| P1 | Two controlled catches increased live score from 3 to 5 but saved huntsSuccessful stayed at 1. The animation callback repeatedly calculates an increment from its initial render's d object. | Use setCL(function(prior) { ... }) for cumulative updates, or maintain a run ledger committed once at completion. Also separate total catches from the currently misleading “Crabs caught” label. |
| P1 | Voluntary surfacing produced neither a run summary nor a leaderboard record. A detached WebGL context remained live after exit. | Route death, voluntary return, restart, and leaving the section through a single idempotent finish/cleanup path. Keep progression recording separate from disposal. |
| P1 for phone support | At a 390px viewport the canvas was 350 × 219px and its HUD was 340 × 258px. The minimap overlapped the HUD, bottom rows were clipped, and no touch movement controls existed. | Design a separate compact HUD and touch control layout. Give the game an appropriate minimum height, with safe areas and accessible action buttons. |
| P2 | Some species promises are not implemented. toolMaster and packStrike are defined as abilities but have no dedicated runtime branches. Carry penalties apply to Giant Pacific despite its card promising none. | Replace scattered species checks with a capability table consumed by both the rules and the interface. Test each advertised ability against observed behavior. |
| P2 | HUD HTML is replaced every animation frame. A one-second probe observed 20 replacements for 20 frames. Its entire container is a polite live status region. | Create persistent HUD elements, update changed values at a modest cadence, and announce significant events through a separate, throttled live region. |

Source anchors: [rock construction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:11411), [mantle and arms](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:11517), [papillae](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:13838), [input](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:13146), [den containment](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:14652), [catch persistence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:15054), [HUD](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:15256).

The lifecycle issue is especially worth fixing early. The ref returns immediately on null. The animation loop stops when detached but does not invoke the cleanup routine. That routine contains the listener, audio, texture, geometry, and renderer disposal work. Pending respawn timeouts and asynchronous postprocessing setup also need a disposed/generation guard. The controlled probe confirms the disconnected context remains live; cumulative memory growth over many runs was not measured.

[Canvas lifecycle](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:11222) · [detachment check](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:13580) · [cleanup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_cephalopodlab.js:15447)

**A visual direction that would change the experience substantially**

Aim for stylized naturalism: a recognizable, expressive animal moving through a coherent reef, with sufficient contrast to read threats and prey. The current bright caustic patches, angular geometry, sparse vegetation, and large overlays compete for attention.

The player is the best place to invest visual effort. Give the octopus an identifiable mantle/head junction, lateral eyes, soft webbing, and eight tapered arms with a few curved segments each. Use a lightweight rig or procedural arm curves. Let selected arm tips plant on the terrain while others reach forward; compress and trail the arms during a jet; lead a strike with two or three arms before enveloping the prey. Restrict expensive contact solving to the nearby player. A full soft-body simulation is unnecessary for this level of fidelity.

Make camouflage visible as pattern and texture, not just whole-body RGB interpolation. Blend uniform, mottled, and disruptive patterns with a small procedural shader or masks. Sand should produce a relatively smooth surface; rubble can raise subtle papillae. Let students connect the visible change to concealment. Preserve the animal's silhouette when all effects are active and when reduced motion is enabled.

Rebuild the reef around composition. Create clusters of boulders, branching and plate coral, seagrass beds, sand channels, recognizable dens, and a few landmarks. Keep navigable routes clear. Reuse a small set of good meshes with variations in scale, orientation, and color. A carefully composed first reef is likely to add more perceived quality than an even larger collection of scattered objects.

Ground everything in the same terrain model. The current floor mesh follows the player while its height variation stays in local coordinates; entities do not sample a shared terrain surface. Descending can take the player below the reef plane. Use a deterministic world-space height function for floor rendering, object placement, arm contact, and collision. Provide a real reef slope or an explicit transition into open water before deeper zones.

Improve lighting after geometry and terrain. Add inexpensive contact shadows beneath animals and rocks, a controlled warm/cool palette, and consistent color handling. Make caustics follow receiving surfaces rather than intersecting the displaced floor as a flat overlay. Reduce their contrast so they do not compete with prey. Use depth-aware fog, suspended particles, restrained sun shafts, and stronger silhouettes to convey distance. Preserve visibility during night play through carefully placed light and accessible contrast settings.

The project uses Three.js r128. Audit its color-input, texture, and output-encoding behavior before applying modern examples; modern outputColorSpace instructions are not a drop-in patch for this version. If upgrading Three.js, make it a separate change with visual baselines. [Three.js color-management documentation](https://threejs.org/manual/pages/color-management.html)

The fixed follow camera also needs a quality pass: frame the intended route ahead of the player, avoid passing through rocks, and use frame-rate-independent damping. Offer stable follow and wider tactical views, recenter, sensitivity, and zoom. Use short contextual strike/escape emphasis only where it remains comfortable under the motion settings.

**Make strategy emerge from readable decisions**

The intended loop should be: observe → choose prey and route → approach under cover → commit to a strike → respond to danger → return and learn. Existing systems can support this once their rules align.

| Decision | Enhancement | Feedback the player needs |
|---|---|---|
| Which meal is worth pursuing? | Give prey distinct energy rewards, handling time, escape behavior, and habitats. Make the clam a predictable but exposed commitment; make fish require interception; make crabs reward patient approach. | Reward estimate, handling progress, target awareness, and a clear reason for a failed strike. |
| How should I approach? | Let cover, background match, movement, viewing angle, and distance influence detection. Introduce line-of-sight blocking and usable crevices. | A selected prey outline, a compact awareness cue, and optional teaching overlays showing exposure. |
| When should I jet? | Make bursts improve escape/interception but increase exposure and energy use. Give depletion and recovery a deliberate rhythm instead of tiny bursts at almost-empty stamina. | Clear burst readiness and recovery, with movement and sound matching the resource cost. |
| When should I ink? | Model the cloud as a spatial obstacle or distraction with predator-specific effects. An escape route should matter after release. | The cloud's position and duration, predator response, remaining charges, and a directional threat cue. |
| Which shelter should I use? | Make size, entrances, predator access, distance, and portability matter. Distinguish concealment from guaranteed protection. | Whether the animal is actually inside, what threat it protects against, and the cost of carrying it. |
| How do I escape a predator? | Use patrol, suspicion, investigation, pursuit, search, and disengagement states, with short-term memory of last known position. | Visible intent before an attack, an identifiable escape opportunity, and a legible loss-of-contact moment. |

At present, clicking triggers the nearest eligible catch rather than targeting the creature under the pointer. This makes a crosshair misleading. Add a predictable target selection rule with an outline, range indicator, and strike direction; preserve a keyboard-selectable target option and optional generous assistance. Rebind the action keys and document the existing E-to-pounce alternative, which is currently obscured by the clam-drilling instructions.

A strong first mission would be **“Dusk on the reef.”** Start near a recognizable den, obtain two different meals, and return before the reef becomes more dangerous. Put a short exposed route and a longer covered route between the den and food. Add an optional objective such as returning with one ink charge remaining. Use one roaming predator and one clearly marked ambush site. The mission should end successfully at the den and produce a short debrief; death should not be the only way to finish a recorded run.

Prototype that mission with Common Octopus first. Then use the same encounter to compare a cuttlefish's display and a coconut octopus's shelter transport. After those differences work, develop distinct open-water and deep-water scenarios. All twelve species currently share much of the same reef-hunting setup; different diets and movement should create different experiences.

Use a seeded map and encounter schedule for reproducible comparisons. Save the seed, species, assist settings, meaningful actions, energy gained/spent, and outcome. A replay or simple timeline can then answer “What changed when I tried a different approach?” Fixed scenario seeds also make classroom assignments and regression tests more useful.

**Improve the experience around the game**

The lobby currently requires substantial reading across controls, biology explanations, species cards, and settings. Put “Start guided reef dive” first, with a small species preview and one-sentence objective. Reveal controls as needed: move to cover, wait for camouflage, select prey, strike, escape, return. Pause danger while explaining the very first interaction. Keep a persistent help and pause button.

During play, prioritize health/energy, the active target, current danger, and the next objective. Show only the selected species' ability. Move detailed calorie arithmetic, depth data, and large lifetime totals into optional panels. Use shapes and labels as well as colors on the minimap. Offer “focus game” or fullscreen so the surrounding 98-section learning hub does not dominate the play session.

Achievements should not obscure the animal or an approaching threat. Show a brief, compact notification and save the cited explanation to a field journal. At a den or after the dive, surface one observation tied to the run: “Your approach across grass reduced detection; the final jet revealed you.” Keep the evidence alongside the interpretation. Existing counters alone do not support causal claims, so add an event log before generating such explanations.

Audio should reinforce the same information: directional predator alerts, distinct movement/capture/ink sounds, and an ambient bed with depth variation. Match every essential cue with a caption or visual signal. Avoid high-frequency bubble sounds becoming the dominant feedback.

The accessibility settings are a useful starting point, but their presence is not evidence of full accessibility. Provide complete keyboard actions, visible focus, a real pause/settings dialog, toggle alternatives to prolonged holds, live settings changes, scalable text throughout the HUD, touch controls, and a reduced-motion mode that covers the mantle, fins, flashes, camera, and environmental effects. Use a separate turn-based or narrated observation mode for users who cannot operate a continuous spatial action game. Assess the complete app separately before relying on its existing WCAG compliance text.

**Treat scientific fidelity as part of quality**

Use explicit species capabilities such as diet, habitat, ink availability, locomotion, shell constraints, and sensory defenses. Generate the relevant help text from those capabilities so interface descriptions cannot silently diverge from play.

Vampire squid should have a detritus-collection loop centered on feeding filaments and marine snow, rather than the shared crab/fish/clam hunting loop. This offers a genuinely different strategic experience: conserve energy, choose a productive water layer, gather food, and respond to rare threats. [MBARI's feeding research](https://www.mbari.org/news/mbari-researchers-discover-what-vampire-squids-eat-its-not-what-you-think/)

Blue-ringed warning displays should read as reflective iridescence. The current rendering comments call the effect bioluminescent; experimental work describes multilayer reflectors exposed by muscles. Keep an attractive warning animation while preserving that distinction in both visuals and teaching text. [Mäthger and colleagues, 2012](https://pubmed.ncbi.nlm.nih.gov/23053367/)

Mark health, energy points, cooldown seconds, hypnotic freezing, and the shared pressure-damage threshold as simulation simplifications. The universal 1000m damage threshold is selected from the scene's zone model, not established species-specific physiology. The HUD's “cal/s” risks implying a calibrated metabolic model. Use “energy” unless a documented conversion is supplied. Review diet, ink, depth tolerance, and anatomy per species before calling the experience biologically faithful.

Also reconcile the existing introduction with mechanics: its stated fish and clam energy rewards differ from the catch handlers, it promises stronger ink protection than the current model, and it describes every selected character as a common Pacific octopus. These are source consistency problems independent of further biological research.

**Performance and engineering priorities**

The tool script was about 2.13 MB uncompressed in the local network capture. A sampled starting scene contained 568 meshes, with counts varying by random generation. Mesh count is not draw-call count; the census render count also includes postprocessing passes and must not be reported as frames per second.

| Measurement | Observed result | Interpretation |
|---|---|---|
| Local harness LCP | 464 ms | Fast in this localhost trace; not a production or classroom benchmark. |
| Local harness CLS | 0.00 | Stable load in this trace. |
| Field data / INP | Not available / not measured | No claim about real-user responsiveness. |
| HUD replacement probe | 20 replacements during 20 frame callbacks in one second | Confirms redundant rebuilding, not a portable FPS measurement. |
| Mobile layout | HUD taller than canvas | Direct usability failure at the sampled width. |
| Exit context | Detached canvas, context still live | Cleanup failure reproduced in the minimal host. |

The trace estimated zero LCP/FCP savings for its render-blocking and cache suggestions. They are not the priority for this review. Optimize the sustained game loop and first-dive clarity.

Create stable HUD nodes, cache audio/pearl settings instead of reading storage in the active loop, pool temporary effects, and stop unnecessary rendering while paused. Batch repeated compatible grass, rock variants, coral, and small props; add distance-based detail and animation limits. Instancing reduces draw calls when geometry/materials can be shared, but measure the actual benefit in this scene. [Three.js InstancedMesh documentation](https://threejs.org/docs/pages/InstancedMesh.html)

Choose an explicit low/medium/high quality tier with device-pixel-ratio and bloom limits, then adapt conservatively to sustained frame-time measurements. Test the lowest target classroom machine before assigning budgets. Suggested acceptance targets are a stable 30fps on the agreed low-end device and 60fps on the reference desktop; these are proposed product targets, not current results.

Gradually extract pure simulation rules, species capabilities, terrain, input, rendering, and HUD/persistence from the monolithic initializer. A fixed simulation step and deterministic random generator will make movement, cooldowns, and predators testable without rendering. Keep Three.js r128 migration separate from gameplay improvements. Package postprocessing dependencies consistently with the existing resilient loader; its current six-script CDN chain can finish after the run has ended.

**A practical delivery sequence**

| Stage | Scope | Acceptance gate |
|---|---|---|
| 1 — Restore consistency | Input reset, simulation clock, counters, voluntary completion, teardown, vertical interactions, species/help mismatches, rock seams, restrained papillae. | Pausing grants no survival progress; releasing controls out of focus stops motion; two catches persist as two; normal exit shows a saved debrief and releases resources; above-den protection is gone. |
| 2 — One excellent reef mission | Player anatomy and movement, world-space terrain, clustered reef, camera collision, contact shadows, selective caustics, compact HUD, guided start. | A new user can identify the animal, prey, cover, and goal, catch food, and return to a den without reading the long guide. No visible mesh seams or terrain clipping. |
| 3 — Meaningful tactics | Targeted strikes, awareness and pursuit states, sight blocking, spatial ink, distinct prey handling, shelter tradeoffs. | The same seeded encounter supports at least two successful approaches whose tradeoffs can be explained from run evidence. |
| 4 — Reach and depth | Touch, keyboard/assist parity, narrated alternative, quality tiers, species-specific habitats, replay and teaching tools. | Complete dives on target input/device profiles; species claims match their mechanics; repeated runs remain stable. |

Keep multiplayer, a very large procedural ocean, expensive volumetric effects, and a full physics simulation out of the first enhancement release. Reconsider them after the first reef mission meets the above gates; their likely cost is high and their contribution to the current learning loop is uncertain.

**Validation and reproducibility**

The initial targeted unit run passed 172 of 172 tests across the existing root-tab, canvas-focus, fact-consistency, and hub-pedagogy suites. These checks are useful but do not validate the gameplay defects above. The existing WebGL suite passed 10 tests with 0 unexpected failures, 0 flaky tests, and retries disabled. Its elapsed duration was 230.7 seconds. [Full validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/validation-summary.json).

[Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/unit-tests.json) · [Browser observations](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/observations.json) · [Controlled observations](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/controlled-observations.json)

The ordinary browser review used real movement, pause, focus changes, and exit inputs. Its first den navigation attempt missed the entrance and is not proof of the height defect. The separate controlled review placed the player directly at a known den, then used Q to ascend; it also placed two existing live crabs at reachable positions before invoking the normal catch action. These experiments test rule consistency, not natural encounter balance.

Existing tests need stronger assertions. The movement test compares screenshots in an already animated scene, so a changing frame does not prove W caused movement. The surfacing test checks that the canvas disappears, rather than that its context is released. Add direct state/position assertions, a stationary control, context/resource checks before harness cleanup, height-range tests, pause/focus tests, repeated-catch persistence, and mission completion tests. Use seeded visual captures at day, dusk, night, reduced motion, and narrow widths.

To reproduce the artifact probes from the repository root, run `node reports/cephalopod-hunter-deep-review-2026-09-26/serve-review.cjs`, then run `browser-review.cjs` and `controlled-review.cjs` from that same report directory via their repository-relative paths. The server generates its harness bundle and records a local URL. Stop it after the review. The scripts require the already installed project dependencies.

**Screenshots of the current implementation**

Desktop scene: disconnected rock triangles, exaggerated mantle displacement, and a large achievement overlay are visible.

![Current reef scene](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/01-reef-original.png)

Narrow viewport: HUD and minimap overlap and the play area is obscured.

![Current narrow layout](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-deep-review-2026-09-26/04-mobile-original.png)
