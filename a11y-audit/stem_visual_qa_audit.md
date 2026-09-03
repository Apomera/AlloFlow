# STEM Visual QA Audit

Generated: 2026-09-03T05:05:20.272Z

## Scope

- Registered STEM tools: 149
- STEM tool files: 147
- Monitored student-facing visual markers: 75

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 75 |
| Marker failures | 0 |
| Monitored first-screen findings | 2 |
| High-confidence monitored errors | 0 |
| Source/public drift | 1 |
| Any source/public/build drift | 7 |
| Monitored file drift | 4 |

## Visual Marker Coverage

| Status | Tool | Marker | Notes |
| --- | --- | --- | --- |
| pass | `opticsLab` | `data-opticslab-focus` | Rendered |
| pass | `microbiology` | `data-microbiology-focus` | Rendered |
| pass | `ecosystem` | `data-ecosystem-field-brief` | Rendered |
| pass | `epidemicSim` | `data-epidemic-triage` | Rendered |
| pass | `renewablesLab` | `data-renewables-launch-panel` | Rendered |
| pass | `climateExplorer` | `data-climate-mission-panel` | Rendered |
| pass | `bridgeLab` | `data-bridgelab-design-brief` | Rendered |
| pass | `nutritionLab` | `data-nutrition-practice-path` | Rendered |
| pass | `bakingScience` | `data-baking-kitchen-bench` | Rendered |
| pass | `cellularLab` | `data-cellularlab-focus-panel` | Rendered |
| pass | `companionPlanting` | `data-companion-workspace-stage` | Rendered |
| pass | `dnaLab` | `data-dna-mission` | Rendered |
| pass | `alphaFoldExplorer` | `data-alphafold-mission` | Rendered |
| pass | `swimLab` | `data-swimlab-readiness` | Rendered |
| pass | `firstResponse` | `data-firstresponse-readiness` | Rendered |
| pass | `stewardshipHub` | `data-stewardship-mission` | Rendered |
| pass | `spaceColony` | `data-spacecolony-life-support` | Rendered |
| pass | `fireEcology` | `data-fireecology-mission` | Rendered |
| pass | `behaviorLab` | `data-behaviorlab-mission` | Rendered |
| pass | `beehive` | `data-beehive-command` | Rendered |
| pass | `migration` | `data-migration-mission` | Rendered |
| pass | `petsLab` | `data-petslab-mission` | Rendered |
| pass | `cell` | `data-cell-mission` | Rendered |
| pass | `evoLab` | `data-evolab-command` | Rendered |
| pass | `dinoLab` | `data-dinolab-command` | Rendered |
| pass | `aquacultureLab` | `data-aquaculture-command` | Rendered |
| pass | `musicSynth` | `data-music-command` | Rendered |
| pass | `molecule` | `data-molecule-command` | Rendered |
| pass | `printingPress` | `data-printingpress-command` | Rendered |
| pass | `fisherLab` | `data-fisherlab-command` | Rendered |
| pass | `raptorHunt` | `data-raptorhunt-command` | Rendered |
| pass | `flightSim` | `data-flightsim-briefing` | Rendered |
| pass | `atcTower` | `data-atctower-command` | Rendered |
| pass | `echoTrainer` | `data-echotrainer-briefing` | Rendered |
| pass | `brainAtlas` | `data-brainatlas-mission` | Rendered |
| pass | `anatomy` | `data-anatomy-mission` | Rendered |
| pass | `birdLab` | `data-birdlab-field-station` | Rendered |
| pass | `waterCycle` | `data-watercycle-focus` | Rendered |
| pass | `playlab` | `data-playlab-gameplan` | Rendered |
| pass | `plateTectonics` | `data-pt-sim-focus` | Rendered |
| pass | `astronomy` | `data-astronomy-command` | Rendered |
| pass | `geologyExplorer` | `data-geology-command` | Rendered |
| pass | `rockCycle` | `data-rockcycle-command` | Rendered |
| pass | `aquarium` | `data-aquarium-focus-panel` | Rendered |
| pass | `moonMission` | `data-moonmission-control` | Rendered |
| pass | `solarSystem` | `data-solarsystem-command-center` | Rendered |
| pass | `bikeLab` | `data-bikelab-ride-focus` | Rendered |
| pass | `throwlab` | `data-throwlab-run-focus` | Rendered |
| pass | `echolocation` | `data-echolocation-run-focus` | Rendered |
| pass | `skatelab` | `data-skatelab-run-focus` | Rendered |
| pass | `probability` | `data-probability-command` | Rendered |
| pass | `statsLab` | `data-statslab-command` | Rendered |
| pass | `funcGrapher` | `data-funcgrapher-command` | Rendered |
| pass | `calculus` | `data-calculus-command` | Rendered |
| pass | `physics` | `data-physics-command` | Rendered |
| pass | `unitConvert` | `data-unitconvert-command` | Rendered |
| pass | `punnett` | `data-punnett-cross-focus` | Rendered |
| pass | `circuit` | `data-circuit-bench` | Rendered |
| pass | `chemBalance` | `data-chembalance-command` | Rendered |
| pass | `titrationLab` | `data-titration-command` | Rendered |
| pass | `areamodel` | `data-areamodel-focus` | Rendered |
| pass | `coordinate` | `data-coordinate-command` | Rendered |
| pass | `protractor` | `data-protractor-command` | Rendered |
| pass | `volume` | `data-volume-command` | Rendered |
| pass | `base10` | `data-manipulatives-command` | Rendered |
| pass | `multtable` | `data-multtable-command` | Rendered |
| pass | `inequality` | `data-inequality-command` | Rendered |
| pass | `numberline` | `data-numberline-focus` | Rendered |
| pass | `moneyMath` | `data-moneymath-focus` | Rendered |
| pass | `logicLab` | `data-logiclab-focus` | Rendered |
| pass | `fractions` | `data-fraction-focus` | Rendered |
| pass | `galaxy` | `data-galaxy-canvas` | Rendered |
| pass | `semiconductor` | `data-semiconductor-command` | Rendered |
| pass | `wave` | `data-wave-canvas` | Rendered |
| pass | `heatLab` | `data-heat-lab` | Rendered |

## Top First-Screen Findings

| Severity | Code | Count | Tools |
| --- | --- | ---: | --- |
| warning | `canvas-focus` | 1 | `titrationLab` |
| notice | `horizontal-overflow-risk` | 1 | `fireEcology` |

## Sync Drift

| Status | File | Monitored | Hashes |
| --- | --- | --- | --- |
| build-drift | `stem_tool_anatomy.js` | yes | source `95E9B45F7904`, public `95E9B45F7904`, build `2E4CCF858D38` |
| build-drift | `stem_tool_artstudio.js` | no | source `9189D26706B6`, public `9189D26706B6`, build `B672B9F067F3` |
| build-drift | `stem_tool_pets.js` | yes | source `DB196B642DD2`, public `DB196B642DD2`, build `D676FD2C9325` |
| build-drift | `stem_tool_rocks.js` | yes | source `F13DF6927665`, public `F13DF6927665`, build `B45E01B1CE05` |
| build-drift | `stem_tool_solarsystem.js` | yes | source `0337E93F8BB6`, public `0337E93F8BB6`, build `CCFBBBA22AA6` |
| build-drift | `stem_tool_sourcebook.js` | no | source `ACA4BA89CCC7`, public `ACA4BA89CCC7`, build `77614519DF2C` |
| source-public-drift | `stem_tool_spacestation.js` | no | source `584A6E2E26F8`, public `82917C84A363`, build `965EA474ED98` |

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, or source/public drift. A monitored file that differs only from `desktop/web-app/build/` is an advisory, not a failure: that directory is gitignored build output, so a stale copy means the desktop build has not been re-run, not that anything ships stale.
