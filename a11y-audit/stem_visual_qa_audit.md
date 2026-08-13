# STEM Visual QA Audit

Generated: 2026-08-13T05:29:47.397Z

## Scope

- Registered STEM tools: 144
- STEM tool files: 141
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
| Any source/public/build drift | 9 |
| Monitored file drift | 8 |

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
| build-drift | `stem_tool_astronomy.js` | yes | source `2B915A37D3D0`, public `2B915A37D3D0`, build `8F08CECA8107` |
| source-public-drift | `stem_tool_ecosystem.js` | yes | source `CB948283C736`, public `208357F2C3E7`, build `F27BE379E416` |
| build-drift | `stem_tool_galaxy.js` | yes | source `56D0A5F35341`, public `56D0A5F35341`, build `FF039FC784F4` |
| build-drift | `stem_tool_geologyexplorer.js` | yes | source `0FB9F50901D3`, public `0FB9F50901D3`, build `99C6927163FD` |
| build-drift | `stem_tool_moonmission.js` | yes | source `812B8EF67B9E`, public `812B8EF67B9E`, build `4D752143DB89` |
| build-drift | `stem_tool_raptorhunt.js` | yes | source `2F0F4F4C8FE9`, public `2F0F4F4C8FE9`, build `E4D08B3F6666` |
| build-drift | `stem_tool_solarsystem.js` | yes | source `A01148E88451`, public `A01148E88451`, build `44828D3ED1FA` |
| build-drift | `stem_tool_treelab.js` | no | source `31355BFD5CDD`, public `31355BFD5CDD`, build `72B702662144` |
| build-drift | `stem_tool_watercycle.js` | yes | source `311A5EB3A235`, public `311A5EB3A235`, build `350241B0F7D1` |

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, or source/public drift. A monitored file that differs only from `desktop/web-app/build/` is an advisory, not a failure: that directory is gitignored build output, so a stale copy means the desktop build has not been re-run, not that anything ships stale.
