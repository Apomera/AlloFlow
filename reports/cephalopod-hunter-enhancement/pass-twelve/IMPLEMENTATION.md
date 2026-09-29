# Cephalopod Hunter: rooted vegetation pass

Completed 2026-09-29 after the user requested continued environment and model improvements. This builds on the [eye and water checkpoint](../pass-eleven/IMPLEMENTATION.md). Both passes are committed together as `ea4f1d845` with all normal repository hooks passing.

## Visible changes

Seagrass now has tapered, curved blades with a shallow folded center and restrained color variation. Kelp has a sinuous tapered outline and rough olive shading that responds to scene lighting. The 80 grass clusters (seven instanced blades each) and 25 kelp strands retain their existing horizontal locations, heights, phases, camouflage metadata and all 525 seeded construction draws.

Plants now rotate around their bases. Kelp roots stay fixed; grass roots can move vertically by at most 0.0288 within the existing small cluster footprint. Kelp also respects reduced motion. Geometry and instance buffers remain static during sway. There are no new plant meshes, draw calls, textures, lights or shadow casters. The new folds add 14,440 submitted triangles across the full existing plant population; this is a visual-quality tradeoff, not an FPS claim. See [plant notes](plant-notes.md).

## Validation

Six plant unit cases passed on their first run. They exercise production geometry, normal/triangle validity, deterministic variation, construction RNG/layout, instanced resting heights, root anchoring and pause/reduced-motion behavior. Together with pass eleven this covers 128 distinct unit cases.

Two new browser cases exercise low and balanced quality: actual submitted shader compilation/linking, instancing, counts, stable buffers, root transforms, shallow-reef floor attachment, normal sway, inspection, reduced motion, resumed movement and disposal. Both passed after video/trace recording was disabled, with unchanged functional assertions and timeout, one worker and no automatic retries. Together with pass eleven there are eight distinct passing browser scenarios.

The initial two browser cases remain recorded as failures. Low completed all 3,450 expectations including disposal before context teardown timed out. Balanced completed 3,445 expectations, including reduced-motion freeze, then timed out during final resume before its final five assertions. Driver logs recorded command-buffer creation failure and ReadPixels stalls. No plant assertion mismatch was reported. Initial duration: 779626.6449999999ms; successful recovery: 134896.823ms. Raw JSON and logs are retained locally; [validation-summary.json](validation-summary.json) preserves the outcomes.

Six final views cover ordinary desktop/phone field study, cuttlefish inspection and two diagnostic plant closeups. The diagnostic captures reuse the same seeded plants and camera poses without changing geometry, material, light or visibility. The first final-mode identity guard failed before coordinates were retained; its cause is unconfirmed. A subsequent instrumented run exactly matched construction/current XZ and camera poses for grass 35 and kelp 1, with zero browser errors and no production correction. See the notes for the fixture's simulation-time and presentation limits.

Final views: [reef](commonOcto-reef.png), [phone](reef-phone.png), [cuttlefish and vegetation](cuttlefish-plants.png), [grass detail](grass-detail.png), [kelp detail](kelp-detail.png). Normal capture: node reports/cephalopod-hunter-enhancement/pass-twelve/visual-review.cjs. Diagnostic capture: node reports/cephalopod-hunter-enhancement/pass-twelve/plant-detail-review.cjs, using the tracked camera fixture.

## Source ownership and commit status

All four runtime copies match SHA-256 a1c99a7b4eb58d5e648838ab537f95f047bd1f1f0e3e1c1f2287a7d59e4a905f. The prepared combined source candidate is 1dbfea07e5bab171be86eb58cc3c0a5708ff6dca7eca0470786782d4d4e3ab62; its difference is exactly the twelve pre-existing screen-reader translation wrappers per tracked file, which remain preserved outside this work's staging. No shared host, handoff, translations or unrelated modules were edited.

The normal commit hook initially stopped on unrelated drift between content_engine_source.jsx and desktop/web-app/src/content_engine_source.jsx. The twelve other hook commands passed at that checkpoint. Automatic approval review rejected a proposed hook bypass without explicit authorization; no bypass or hook/configuration change occurred. The unrelated drift subsequently cleared externally, and the complete 40-file change committed normally as `ea4f1d845` with the full original hook enabled and passing. Only the twelve pre-existing translation wrappers per tracked runtime file remain outside this commit. No deployment is included.
