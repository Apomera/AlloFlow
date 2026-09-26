# Cephalopod Hunter enhancement — 26 September 2026

This implementation follows the approved deep review, with the largest visual effort concentrated on the animals. It is a substantial upgrade of the current procedural simulator. It does not introduce downloaded models or require a Three.js upgrade.

## What changed

- **Distinct animal rigs:** elongated Humboldt mantle and rear fins; broad cuttlefish mantle with rippling fin skirt; compact bobtail; webbing and feeding filaments for vampire squid; ear fins for dumbo; chambered-shell silhouette and 90 suckerless feelers for nautilus. Octopuses have eight curved, tapered arms with webbing. Squid/cuttlefish/bobtail have eight arms plus two clubbed feeding tentacles. Suckers are instanced; eyes include irises, pupils, and highlights. Skin has procedural mottling and restrained surface relief.
- **Rendering and environment:** corrected rock deformation and color variation, smoother rock surfaces, branching coral, tapered vegetation, contact shadows, color output/tone mapping, subtler caustics, and three camera views. The terrain is anchored in world space, including a shelf and continuous drop-off. The camera checks rocks to reduce occlusion.
- **A complete reef mission:** catch a crab, open a clam, and return to HOME. The starting area has accessible prey, a covered reef route, an exposed sand channel, and a nearby den. Dusk advances as the dive proceeds. Other modes offer free exploration or a field study with conserved health and energy.
- **Strategy:** keyboard/pointer target selection with a visible range ring; selected prey cannot silently be substituted with another catch. Predator awareness builds before a charge. Rocks obstruct sight and ink affects the sightline through its actual position. Losing sight ends pursuit. Camouflage affects prey flight, while carrying shelters imposes species-specific costs. Jetting uses a recovery threshold instead of flickering on nearly empty stamina.
- **Species behavior:** vampire squid collect drifting marine snow instead of catching live prey. Nautilus, vampire squid, and dumbo have no ink. Humboldt starts in midwater with nearby fish; deep species start beside the drop-off. Giant Pacific and coconut octopuses have different shelter-carrying costs. Blue warning rings use reflective materials.
- **Experience:** a simpler launch screen, collapsed long instructions, quality and seed controls, compact HUD, pause/help/view/observe buttons, touch movement/actions, settings that apply during the dive, brief achievement notices, and a saved end-of-dive summary with an event timeline and same-world replay.
- **Reliability:** pause uses simulation time; losing focus releases held input; catch totals use current state; den, prey, shelter and bite interactions check height; normal exit and unmount release the actual WebGL context; delayed effects cannot survive a disposed scene. Stable HUD nodes update at 8 Hz, with settings cached outside the frame loop.

The artwork is procedural and stylized. Anatomy and silhouettes are substantially more specific than the former shared sphere/cylinder construction; this is not a claim of photorealism or specimen-accurate proportions.

## Controls

W/S move, A/D turn, Q/Z rise and descend, Space + forward jets. T selects a target, E strikes, held E drills a nearby clam or gathers marine snow. I inks when supported; G picks up/drops a shelter. V cycles follow/side/tactical cameras; Escape pauses. Use Help / settings during a dive. A shallow animal must reach the drop-off before it can descend below the shelf; Explore depths provides a shortcut.

The mobile layout supplies the corresponding touch controls. Observe provides a narrated description of nearby prey, shelter, camouflage and danger. Field study still uses spatial movement; it is not a complete turn-based or nonvisual alternative.

## Validation

See `validation-summary.json` for final counts and scope. The browser tests use the actual module, React, Three.js r128 and real Chromium WebGL in the local harness. Context cleanup is asserted before the harness performs its own cleanup.

The first browser pass found a target-cycling defect, which was corrected: the first T press now locks the nearest prey instead of skipping it. It also exposed tests that relied on wall-clock delays despite the simulation clock, and a touch test that attempted to click below the viewport. Those scenarios were corrected and rerun. Earlier failing outputs remain local evidence; they are not presented as final passes.

Controlled gameplay tests position real prey/player objects to test catch rules, den height and mission completion. They exercise the normal controls and persistence, but do not establish natural encounter balance or a representative classroom frame rate. Screenshots are reviewed separately for appearance. No production deployment or installer build is part of this change.

## Remaining work from the longer roadmap

- Tune natural play sessions with students and benchmark low/high quality on agreed classroom hardware. The existing scene still has many individual objects; there is no proven 30/60 fps device guarantee.
- The seed repeats the initial world. Simulation is still frame-stepped, so this is not deterministic input replay. The event list records actual events, not an inferred causal explanation of player success.
- Expand predator investigation/search behavior, authored biome encounters, and species-specific prey handling. Current awareness and sight checks add tactics, but do not constitute a complete ecological model.
- Finish broader accessibility work: key rebinding, alternatives to held actions, a fully nonvisual/turn-based mode, and a full-app accessibility audit. New hunt-specific controls/text are English; locale catalog integration remains with the shared i18n owner.
- Longer-term art upgrades can add authored meshes/textures, richer substrate shading and a calibrated animation library. Multiplayer and a new rendering engine remain outside this release.

## Scope and handoff

Ownership is limited to `stem_lab/stem_tool_cephalopodlab.js`, its exact desktop mirrors, the focused Cephalopod tests, and this report directory. Shared host, catalog, generator and translation files are not part of this implementation. Status is recorded here to avoid rewriting the shared integration handoff during concurrent work.

Reference review: `reports/cephalopod-hunter-deep-review-2026-09-26/REVIEW.md`.

## Final verification and preview

Completed: **192/192 unit checks in 9 files; 19/19 distinct WebGL scenarios have passing latest results, with retries disabled.** The browser result is assembled from the main runs and targeted retests documented in `validation-summary.json`, rather than claiming one uninterrupted clean run. Final six-species screenshot capture reported no browser errors. Syntax and scoped whitespace checks passed. All four source/runtime copies have identical SHA-256 hashes.

To open the local preview from this checkout, run `node reports/cephalopod-hunter-enhancement/serve-preview.cjs` and visit the printed address. Append `?species=humboldtSquid&mode=observe` to inspect the squid immediately. V switches to side view. `visual-matrix.cjs` captures the six distinct body forms and a narrow layout against that server.

Status: implementation and focused validation complete. No deployment or installer build. Broader roadmap items above remain separate follow-up work.

![Updated Humboldt squid](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/humboldtSquid.png)

![Updated cuttlefish](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/cuttlefish.png)
