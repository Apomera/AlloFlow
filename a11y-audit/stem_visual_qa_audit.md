# STEM Visual QA Audit

Generated: 2026-07-11T05:04:17.522Z

## Scope

- Registered STEM tools: 121
- STEM tool files: 118
- Monitored student-facing visual markers: 63

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 63 |
| Marker failures | 0 |
| Monitored first-screen findings | 12 |
| High-confidence monitored errors | 0 |
| Source/public drift | 0 |
| Any source/public/build drift | 0 |
| Monitored file drift | 0 |

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
| pass | `punnett` | `data-punnett-cross-focus` | Rendered |
| pass | `circuit` | `data-circuit-bench` | Rendered |
| pass | `chemBalance` | `data-chembalance-command` | Rendered |
| pass | `titrationLab` | `data-titration-command` | Rendered |
| pass | `areamodel` | `data-areamodel-focus` | Rendered |
| pass | `numberline` | `data-numberline-focus` | Rendered |
| pass | `moneyMath` | `data-moneymath-focus` | Rendered |
| pass | `logicLab` | `data-logiclab-focus` | Rendered |
| pass | `fractions` | `data-fraction-focus` | Rendered |
| pass | `galaxy` | `data-galaxy-canvas` | Rendered |
| pass | `semiconductor` | `data-semiconductor-command` | Rendered |
| pass | `wave` | `data-wave-canvas` | Rendered |

## Top First-Screen Findings

| Severity | Code | Count | Tools |
| --- | --- | ---: | --- |
| warning | `heading` | 2 | `cellularLab`, `bikeLab` |
| warning | `canvas-focus` | 1 | `bikeLab` |
| notice | `horizontal-overflow-risk` | 9 | `opticsLab`, `cellularLab`, `dinoLab`, `printingPress`, `birdLab`, `playlab`, `bikeLab`, `echolocation`, `statsLab` |

## Sync Drift

All source, public, and local build STEM tool copies match.

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, source/public drift, or drift in monitored source/public/build triplets.
