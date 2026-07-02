# STEM Visual QA Audit

Generated: 2026-07-02T21:25:53.164Z

## Scope

- Registered STEM tools: 113
- STEM tool files: 110
- Monitored student-facing visual markers: 36

## Summary

| Metric | Count |
| --- | ---: |
| Load errors | 0 |
| Marker passes | 36 |
| Marker failures | 0 |
| Monitored first-screen findings | 37 |
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
| pass | `cell` | `data-cell-mission` | Rendered |
| pass | `evoLab` | `data-evolab-command` | Rendered |
| pass | `dinoLab` | `data-dinolab-command` | Rendered |
| pass | `aquacultureLab` | `data-aquaculture-command` | Rendered |
| pass | `musicSynth` | `data-music-command` | Rendered |
| pass | `molecule` | `data-molecule-command` | Rendered |
| pass | `printingPress` | `data-printingpress-command` | Rendered |
| pass | `fisherLab` | `data-fisherlab-command` | Rendered |
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
| warning | `canvas-focus` | 14 | `epidemicSim`, `climateExplorer`, `companionPlanting`, `musicSynth`, `brainAtlas`, `anatomy`, `waterCycle`, `plateTectonics`, `bikeLab`, `skatelab` |
| warning | `canvas-name` | 10 | `epidemicSim`, `climateExplorer`, `musicSynth`, `anatomy`, `waterCycle`, `plateTectonics`, `skatelab` |
| warning | `heading` | 2 | `cellularLab`, `bikeLab` |
| notice | `horizontal-overflow-risk` | 11 | `opticsLab`, `renewablesLab`, `cellularLab`, `dinoLab`, `printingPress`, `birdLab`, `playlab`, `bikeLab`, `throwlab`, `echolocation`, `skatelab` |

## Sync Drift

All source, public, and local build STEM tool copies match.

## Gate Policy

`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, source/public drift, or drift in monitored source/public/build triplets.
