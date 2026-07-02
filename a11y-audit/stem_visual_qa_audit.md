# STEM Visual QA Audit

Generated: 2026-07-02T18:16:47.601Z

## Scope

- Registered STEM tools: 113
- STEM tool files: 110
- Monitored student-facing visual markers: 28

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 28 |
| Marker failures | 0 |
| Monitored first-screen findings | 30 |
| High-confidence monitored errors | 0 |
| Source/public drift | 1 |
| Any source/public/build drift | 4 |
| Monitored file drift | 2 |

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
| pass | `fractions` | `data-fraction-focus` | Rendered |
| pass | `galaxy` | `data-galaxy-canvas` | Rendered |
| pass | `wave` | `data-wave-canvas` | Rendered |

## Top First-Screen Findings

| Severity | Code | Count | Tools |
| --- | --- | ---: | --- |
| warning | `canvas-focus` | 12 | `epidemicSim`, `climateExplorer`, `companionPlanting`, `brainAtlas`, `anatomy`, `waterCycle`, `plateTectonics`, `bikeLab`, `skatelab` |
| warning | `canvas-name` | 7 | `epidemicSim`, `anatomy`, `waterCycle`, `plateTectonics`, `skatelab` |
| warning | `heading` | 2 | `cellularLab`, `bikeLab` |
| notice | `horizontal-overflow-risk` | 9 | `opticsLab`, `renewablesLab`, `cellularLab`, `birdLab`, `playlab`, `bikeLab`, `throwlab`, `echolocation`, `skatelab` |

## Sync Drift

| Status | File | Monitored | Hashes |
| --- | --- | --- | --- |
| source-public-drift | `stem_tool_brainatlas.js` | yes | source `B11CEB0B53CE`, public `C6F8EE753C13`, build `C6F8EE753C13` |
| build-drift | `stem_tool_geosandbox.js` | no | source `4A9F496EE597`, public `4A9F496EE597`, build `A93770EF94D4` |
| build-drift | `stem_tool_rocks.js` | no | source `AAD3D827749D`, public `AAD3D827749D`, build `C4FA18E66992` |
| build-drift | `stem_tool_watercycle.js` | yes | source `E85421A360B0`, public `E85421A360B0`, build `8B9DB4731B22` |

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, source/public drift, or drift in monitored source/public/build triplets.
