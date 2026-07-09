# STEM Visual QA Audit

> **Generated audit snapshot (2026-07-09):** This report captures one harness run from the generated timestamp below. Rerun the relevant visual QA harness before treating pass/fail counts, drift status, or monitored-marker coverage as current.

Generated: 2026-07-08T21:20:53.613Z

## Scope

- Registered STEM tools: 121
- STEM tool files: 118
- Monitored student-facing visual markers: 49

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 49 |
| Marker failures | 0 |
| Monitored first-screen findings | 13 |
| High-confidence monitored errors | 0 |
| Source/public drift | 0 |
| Any source/public/build drift | 4 |
| Monitored file drift | 1 |

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
| pass | `aquarium` | `data-aquarium-focus-panel` | Rendered |
| pass | `moonMission` | `data-moonmission-control` | Rendered |
| pass | `solarSystem` | `data-solarsystem-command-center` | Rendered |
| pass | `bikeLab` | `data-bikelab-ride-focus` | Rendered |
| pass | `throwlab` | `data-throwlab-run-focus` | Rendered |
| pass | `echolocation` | `data-echolocation-run-focus` | Rendered |
| pass | `skatelab` | `data-skatelab-run-focus` | Rendered |
| pass | `probability` | `data-probability-command` | Rendered |
| pass | `punnett` | `data-punnett-cross-focus` | Rendered |
| pass | `circuit` | `data-circuit-bench` | Rendered |
| pass | `chemBalance` | `data-chembalance-command` | Rendered |
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
| warning | `canvas-name` | 1 | `climateExplorer` |
| notice | `horizontal-overflow-risk` | 9 | `opticsLab`, `renewablesLab`, `cellularLab`, `dinoLab`, `printingPress`, `birdLab`, `playlab`, `bikeLab`, `echolocation` |

## Sync Drift

| Status | File | Monitored | Hashes |
| --- | --- | --- | --- |
| build-drift | `stem_tool_alphafold.js` | no | source `961AACABFC3D`, public `961AACABFC3D`, build `null` |
| build-drift | `stem_tool_brainatlas.js` | yes | source `8A97BC41F8C3`, public `8A97BC41F8C3`, build `D113D7E77AB6` |
| build-drift | `stem_tool_geosandbox.js` | no | source `CEC58F724169`, public `CEC58F724169`, build `5A99A0628A2B` |
| build-drift | `stem_tool_roadready.js` | no | source `666A3DD3954B`, public `666A3DD3954B`, build `91D37DAEE248` |

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, source/public drift, or drift in monitored source/public/build triplets.
