# Aquarium visual upgrade — September 7, 2026

The aquarium opens in an interactive 3D view built from the active tank's residents, plants, habitat layout, equipment, and simulation state. The illustrated view remains available from the same display. Hospital residents stay outside the main tank. The live display and habitat studio share one scene-state bridge.

## Appearance and exploration

The glass vessel has a plinth, edge reflections, textured substrate, depth backdrop, caustic lighting, shaped foliage, and organic wood and stone geometry. Resident shapes, colors, fins, and motion use species metadata and stable individual IDs. Editable names cannot change anatomy. All stocked residents remain represented; larger communities simplify geometry instead of hiding animals.

The native Customize 3D view disclosure saves substrate appearance, backdrop, detail level, viewing exposure, animal emphasis, and equipment visibility. A separate saved learning overlay exposes shelter, territory, flow, light, habitat fit, and ecological interactions. Reset appearance leaves the selected overlay, camera, simulation clock, stock, water, and observation baseline intact. The botanical backdrop is decorative artwork, not additional living stock.

Front, perspective, overhead, and side cameras support pointer drag, zoom buttons, arrow keys, plus/minus, and Home reset. Picking and the keyboard inspector use the same actual residents and habitat objects. Anatomy, habitat arrangement, and equipment care are reachable from the display. The studio now routes plant and equipment picking as well.

## Simulation detail in the scene

The pure buildAquariumSceneDynamics bridge derives rendering inputs from the current model; the renderer never advances the ecosystem.

- Installed devices follow the equipment catalog. A level-zero filter is a real sponge filter; level-zero heaters and pumps are absent; level-zero room light supports the model daylight branch without drawing an invented fixture. Condition and faults control effective output. Failed devices remain visible. Hiding hardware is a presentation choice and does not stop its modeled output.
- Bubble output follows the modeled air pump. Algae film follows the 0–100 algae index and responds to cleaning. Dissolved oxygen and dissolved nitrogen compounds remain numerical readings; water clarity and bubbles are not chemical measurements.
- Plant geometry uses growth form and biomass relative to its catalog maximum. Explicit zero biomass has no 3D foliage and a neutral, inspectable marker in the illustrated view. The illustrated fallback no longer adds unstocked plants or corals.
- Hunger, stress, recorded vitality, and current habitat assignments inform modest illustrative movement. Eligible schooling groups contain only actual conspecific residents. Grounded and sessile animals retain their appropriate movement constraints.
- Feed actions emit a structured event with unique sequence, tick, food type, target, scope, and the IDs whose hunger actually decreased. Only those recipients respond. Hospital feeds do not appear in the display tank. Saved events are marked seen when a renderer mounts, preventing replay on reload or view switches. Live-feed reports now use actual hunger changes and include omnivore responses.
- Biological daylight requires the model schedule, light switch, and positive equipment output. A failed or exhausted light no longer permits the low-light or photosynthetic-stock branch to produce oxygen. Viewing exposure and tint remain cosmetic.

Simulation in view shows oxygen, algae, model light status, aeration, and the latest feeding action next to the aquarium. Its expandable legend includes the other chemistry readings, hardware condition, and overlay meanings. The resident inspector exposes hunger, stress, last modeled vitality and limiting factor, recorded illness, and time in tank. Missing vitality remains distinct from a recorded zero. Plant inspection shows biomass and biological-light availability. These readings remain available with motion paused, reduced motion enabled, or the illustrated view selected.

## Accuracy boundaries and rendering

Geometry is an illustrative display, not a physical scale model: active stock metadata does not provide complete compatible physical lengths, tank dimensions, or individual life-stage records. No biological age is inferred from admission time. No pregnancy, diagnostic lesion, universal hypoxia response, or universal sleep behavior is inferred from appearance. Habitat-fit colors describe habitat fit, not health. Flow and interaction overlays are qualitative teaching aids rather than measured currents or nutrient fluxes. See the [state and scientific review](aquarium-simulation-visual-model.md) for field semantics, primary sources, and model assumptions.

Visual motion has its own pause control and never changes the model clock. Paused, reduced-motion, and hidden views stop idle rendering; camera, material, selection, and model changes can still request a frame. Lightweight, balanced, and high detail cap pixel ratio at 1, 1.5, and 2, respectively, and use approximate moving-frame intervals of 42, 32, and 22 milliseconds. The renderer uses the repository's bundled Three.js r128 and code-generated assets.

Loading consumes the latest props even if library loading was delayed. When WebGL fails or loses context, the illustrated tank and native care controls remain available with a retry action. Renderer disposal releases geometry, materials, textures, observers, controls, and event listeners.

## Verification

**102 targeted tests pass:** 55 existing runtime/learning checks, nine live-view component checks, 16 renderer checks, nine pure scene-bridge checks, seven actual light/illness/fallback runtime checks, and six actual feeding-handler checks. The final source and desktop mirror are byte-identical, both pass syntax checks, and the scoped diff check is clean. See the [final test report](../.codex-artifacts/aquarium-visual-qa/deep-final-tests.json).

Real WebGL checks pass at 1440px and 390px, including phone reduced motion. They verify persistence, camera and baseline preservation, actual upgrade/wear/failure/repair output, algae cleaning, biological versus cosmetic lighting, zero/growing biomass, individual health records, accepted feeding and no replay, picking, bounds, pause, and context-loss recovery. Paused samples produce zero idle draws; there are no observed console errors or page overflow. Final-source desktop/phone samples additionally check distinct taxonomy forms and explicit locomotion. A bounded desktop check verifies room-light output affects the actual scene light.

See the [verified browser report and preview directory](../.codex-artifacts/aquarium-visual-qa/model-v2-verified/report.json). Its provenance distinguishes the completed model checks from final-source previews; historical harness expectation mismatches are retained separately. These checks use a local full-tool host with bundled WebGL assets and do not exercise every surrounding production-host integration or validate every biological coefficient.

Reproduce the focused browser model checks with:

```sh
node dev-tools/aquarium_visual_qa.cjs --label model-v2-current --model-v2
```

Run the six aquarium Vitest files named above with one worker. The relevant sources are in tests/aquarium_runtime.test.js, tests/aquarium_visual_viewport.test.js, tests/aquarium_renderer_visuals.test.js, tests/aquarium_scene_bridge.test.js, tests/aquarium_scene_simulation_link.test.js, and tests/aquarium_feeding_visual_events.test.js.
