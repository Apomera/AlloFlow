# STEM Visual QA Audit

Generated: 2026-08-25T04:13:25.660Z

## Scope

- Registered STEM tools: 149
- STEM tool files: 146
- Monitored student-facing visual markers: 75

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 75 |
| Marker failures | 0 |
| Monitored first-screen findings | 2 |
| High-confidence monitored errors | 0 |
| Source/public drift | 8 |
| Any source/public/build drift | 19 |
| Monitored file drift | 10 |

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
| warning | `canvas-focus` | 2 | `epidemicSim`, `titrationLab` |

## Sync Drift

| Status | File | Monitored | Hashes |
| --- | --- | --- | --- |
| build-drift | `stem_tool_aquaculture.js` | yes | source `095B08148695`, public `095B08148695`, build `F88CB618870F` |
| source-public-drift | `stem_tool_artstudio.js` | no | source `63C71CB613F8`, public `9CF132BF9808`, build `9CF132BF9808` |
| build-drift | `stem_tool_autorepair.js` | no | source `2844BEDDCDC1`, public `2844BEDDCDC1`, build `0D1EDBCA410E` |
| source-public-drift | `stem_tool_beehive.js` | yes | source `71A758F7AF10`, public `89FF9801E896`, build `BD656AE88050` |
| build-drift | `stem_tool_cell.js` | yes | source `5F8BD79D8B08`, public `5F8BD79D8B08`, build `A52E6B1C880F` |
| build-drift | `stem_tool_evolab.js` | yes | source `8E9A119B9760`, public `8E9A119B9760`, build `A7C4F7B00B26` |
| build-drift | `stem_tool_fisherlab.js` | yes | source `8DE3CCE8B991`, public `8DE3CCE8B991`, build `24D7F2BD1EC4` |
| source-public-drift | `stem_tool_magnetism.js` | no | source `12699595FBD2`, public `40E1A6625FD0`, build `40E1A6625FD0` |
| source-public-drift | `stem_tool_nuclearlab.js` | no | source `7364199002BC`, public `A8E679925EFA`, build `A8E679925EFA` |
| build-drift | `stem_tool_pets.js` | yes | source `E5D1F382808B`, public `E5D1F382808B`, build `F517147DD2C6` |
| build-drift | `stem_tool_probability.js` | yes | source `0F11E499CD70`, public `0F11E499CD70`, build `447F8652E2CE` |
| build-drift | `stem_tool_roadready.js` | no | source `AB3EA35EB8D3`, public `AB3EA35EB8D3`, build `A4BEE2FD32F6` |
| source-public-drift | `stem_tool_rocks.js` | yes | source `231DFD36BD97`, public `710E91E8BF85`, build `710E91E8BF85` |
| source-public-drift | `stem_tool_solarsystem.js` | yes | source `9B2315C8CA80`, public `FC0E701CF106`, build `FC0E701CF106` |
| build-drift | `stem_tool_sourcebook.js` | no | source `581F0515A64C`, public `581F0515A64C`, build `31456EC2FA37` |
| build-drift | `stem_tool_spacestation.js` | no | source `263DF8736F62`, public `263DF8736F62`, build `4B9A91560403` |
| source-public-drift | `stem_tool_throwlab.js` | yes | source `7F81B43C022A`, public `5907F5019837`, build `5907F5019837` |
| source-public-drift | `stem_tool_trajectorycomputing.js` | no | source `8D0FED65694F`, public `5B140AB0FB80`, build `5B140AB0FB80` |
| build-drift | `stem_tool_treelab.js` | no | source `F1ECB9E7F646`, public `F1ECB9E7F646`, build `017AE468A3AE` |

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, or source/public drift. A monitored file that differs only from `desktop/web-app/build/` is an advisory, not a failure: that directory is gitignored build output, so a stale copy means the desktop build has not been re-run, not that anything ships stale.
