# STEM Tool UI/UX Accessibility Audit

Generated: 2026-07-03T17:38:53.345Z

## Scope

- Registered STEM tools audited: 114
- Plugin files loaded: 111
- Shared shell coverage: 114/114 tools
- Light-background opt-outs: 0

## Summary

| Metric | Count |
| --- | ---: |
| Total findings | 123 |
| High-confidence errors | 0 |
| Tool-level warnings | 107 |
| Review notices | 16 |
| Tools with any finding | 60 |
| Tools with high-confidence errors | 0 |
| Tools with canvas surfaces | 34 |

## Top Findings

| Severity | Code | Findings | Tools | Example tools | Recommendation |
| --- | --- | ---: | ---: | --- | --- |
| warning | `canvas-focus` | 26 | 18 | anatomy, artStudio, beehive, brainAtlas, climateExplorer, codingPlayground, companionPlanting, epidemicSim, musicSynth, oratory, plateTectonics, rockCycle | If a canvas supports interaction, make it keyboard-focusable and expose keyboard alternatives. |
| warning | `tiny-text` | 16 | 16 | birdLab, cell, dissection, dnaLab, galaxy, inequality, molecule, moonMission, multtable, protractor, rockCycle, solarSystem | Avoid persistent 8px/9px instructional text; keep small labels at 10px+ with clear line height. |
| warning | `heading` | 15 | 15 | archStudio, astronomy, bridgeLab, cellularLab, cephalopodLab, funcGrapher, geoSandbox, geometryWorld, graphCalc, kitchenLab, lumen, microbiology | Start each tool with a semantic heading so screen-reader users can orient quickly. |
| warning | `canvas-name` | 15 | 12 | anatomy, climateExplorer, dissection, epidemicSim, graphCalc, musicSynth, plateTectonics, rockCycle, rocks, unitConvert, volume, waterCycle | Give each canvas a tool-specific role and aria-label, not only the host fallback. |
| warning | `inline-contrast` | 32 | 12 | algebraCAS, appLab, cell, cellularLab, companionPlanting, dataStudio, dnaLab, fireEcology, kitchenLab, llmLiteracy, typingPractice, waterCycle | Adjust inline foreground/background colors to meet at least 4.5:1 contrast for body text. |
| warning | `svg-name` | 3 | 3 | birdLab, molecule, printingPress | Mark decorative SVGs aria-hidden or give informative SVGs an aria-label/title. |
| notice | `metadata` | 13 | 13 | accessLens, archStudio, birdLab, codingPlayground, cyberDefense, dinoLab, evoLab, geologyExplorer, geometryWorld, nutritionLab, rockCycle, rocks | Fill in label, description, category, and aliases so discovery and context labels stay clear. |
| notice | `horizontal-overflow-risk` | 3 | 3 | birdLab, plateTectonics, playlab | Review fixed-width elements at 360px and 768px widths so panels and canvases do not overflow. |

## Recommended Next Passes

1. **Replace generic host fallback labels with tool-authored labels** - Canvas-heavy tools should emit role, aria-label, and keyboard focus metadata directly in their canvas props so narration is specific before after-mount repairs run.
2. **Standardize icon-only and symbolic controls** - Any button or role=button whose visible text is only an icon/symbol should carry an action-specific aria-label and, where useful, a title tooltip.
3. **Programmatically label sliders, selects, and text areas** - The science and simulation tools use many controls; each range/input/select needs a label that names the parameter and unit.
4. **Mobile-review fixed-width canvases and panels** - Fixed canvas and panel widths are expected in simulations, but tools with many fixed surfaces should be checked at phone widths for clipped controls and horizontal scrolling.
5. **Keep metadata complete** - Short descriptions, categories, and aliases improve catalog search, active-tool context, and teacher station-building workflows.

## Tool Inventory

| Tool | Category | Shell | Buttons | Fields | Canvases | Errors | Warnings | Notices | Top issue codes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `a11yAuditor` Digital Accessibility Lab | coding | standard | 19 | 1 | 0 | 0 | 0 | 0 |  |
| `accessLens` Access Lens | general | standard | 8 | 1 | 0 | 0 | 0 | 1 | metadata x1 |
| `algebraCAS` algebraCAS | math | standard | 14 | 1 | 0 | 0 | 3 | 0 | inline-contrast x3 |
| `alloBotSage` AlloBot: Starbound Sage | Games | standard | 79 | 0 | 0 | 0 | 0 | 0 |  |
| `anatomy` Human Anatomy Explorer | science | standard | 66 | 1 | 1 | 0 | 2 | 0 | canvas-focus x1, canvas-name x1 |
| `appLab` AppLab | technology | standard | 26 | 7 | 0 | 0 | 1 | 0 | inline-contrast x1 |
| `aquacultureLab` AquacultureLab: Mussel Farm Sim | science | standard | 144 | 0 | 0 | 0 | 0 | 0 |  |
| `aquarium` Aquarium Lab | science | standard | 24 | 0 | 0 | 0 | 0 | 0 |  |
| `arccity` Arc City | strategy | standard | 23 | 0 | 0 | 0 | 0 | 0 |  |
| `archStudio` Architecture Studio | explore | standard | 83 | 2 | 0 | 0 | 1 | 1 | heading x1, metadata x1 |
| `areamodel` Area Model | math | standard | 18 | 3 | 0 | 0 | 0 | 0 |  |
| `artStudio` Art & Design Studio | creative | standard | 24 | 3 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `assessmentLiteracy` Assessment Literacy Lab | Literacy | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `astronomy` Night Sky & Astronomy | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `atcTower` ATC Tower | applied | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `autoRepair` Auto Repair Shop | life-skills | standard | 38 | 0 | 0 | 0 | 0 | 0 |  |
| `bakingScience` Baking Lab | science | standard | 16 | 0 | 0 | 0 | 0 | 0 |  |
| `base10` Math Manipulatives | math | standard | 51 | 1 | 0 | 0 | 0 | 0 |  |
| `beehive` Beehive Simulator | science | standard | 65 | 5 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `behaviorLab` Behavior Lab | science | standard | 24 | 5 | 0 | 0 | 0 | 0 |  |
| `bikeLab` BikeLab: Physics & Repair | life-skills | standard | 11 | 0 | 0 | 0 | 0 | 0 |  |
| `birdLab` BirdLab — I-Spy Ornithology | general | standard | 127 | 0 | 0 | 0 | 2 | 2 | horizontal-overflow-risk x1, metadata x1, svg-name x1, tiny-text x1 |
| `brainAtlas` Brain Atlas Explorer | science | standard | 31 | 1 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `bridgeLab` Bridge Engineering Lab | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `calculus` Calculus | math | standard | 29 | 9 | 0 | 0 | 0 | 0 |  |
| `cell` Cell Simulator | science | standard | 39 | 3 | 1 | 0 | 2 | 0 | inline-contrast x1, tiny-text x1 |
| `cellularLab` Cellular Automaton Lab | math | standard | 22 | 1 | 0 | 0 | 4 | 0 | inline-contrast x3, heading x1 |
| `cephalopodLab` Cephalopod Lab | science | standard | 17 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `chemBalance` Chemistry Lab | science | standard | 12 | 1 | 1 | 0 | 0 | 0 |  |
| `circuit` Circuit Builder | science | standard | 43 | 1 | 0 | 0 | 0 | 0 |  |
| `climateExplorer` Climate Explorer | science | standard | 39 | 0 | 2 | 0 | 2 | 0 | canvas-focus x1, canvas-name x1 |
| `codingPlayground` codingPlayground | creative | standard | 57 | 2 | 1 | 0 | 1 | 1 | canvas-focus x1, metadata x1 |
| `companionPlanting` Companion Planting Lab | science | standard | 20 | 0 | 1 | 0 | 3 | 0 | inline-contrast x2, canvas-focus x1 |
| `coordinate` Coordinate Grid | math | standard | 14 | 1 | 0 | 0 | 0 | 0 |  |
| `cyberDefense` Cyber Defense Lab | tech | standard | 20 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `dataPlot` Data Plotter | creative | standard | 31 | 10 | 0 | 0 | 0 | 0 |  |
| `dataStudio` Data Studio | creative | standard | 24 | 5 | 0 | 0 | 3 | 0 | inline-contrast x3 |
| `decomposer` Material Decomposer | science | standard | 30 | 0 | 0 | 0 | 0 | 0 |  |
| `dinoLab` Dino Lab | explore | standard | 406 | 1 | 0 | 0 | 0 | 1 | metadata x1 |
| `dissection` Virtual Dissection Lab | science | standard | 21 | 7 | 1 | 0 | 2 | 0 | canvas-name x1, tiny-text x1 |
| `dnaLab` DNA Lab | biology | standard | 103 | 0 | 1 | 0 | 4 | 0 | inline-contrast x3, tiny-text x1 |
| `echoTrainer` Echo Navigator | applied | standard | 28 | 5 | 1 | 0 | 0 | 0 |  |
| `echolocation` Echolocation Lab | science | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `economicsLab` Economics Lab | science | standard | 24 | 6 | 1 | 0 | 0 | 0 |  |
| `ecosystem` Ecosystem Simulator | science | standard | 33 | 8 | 1 | 0 | 0 | 0 |  |
| `epidemicSim` Epidemic Modeling Lab | Life Science | standard | 21 | 4 | 1 | 0 | 2 | 0 | canvas-focus x1, canvas-name x1 |
| `evoLab` EvoLab — Evolution | general | standard | 28 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `fireEcology` Fire Ecology & Indigenous Stewardship | science | standard | 29 | 1 | 0 | 0 | 2 | 0 | inline-contrast x2 |
| `firstResponse` First Response Lab | life-skills | standard | 1 | 0 | 0 | 0 | 0 | 0 |  |
| `fisherLab` FisherLab: Boating & Fishing Sim | science | standard | 24 | 0 | 0 | 0 | 0 | 0 |  |
| `flightSim` SkySchool | applied | standard | 48 | 2 | 0 | 0 | 0 | 0 |  |
| `forge` Tool Forge | coding | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `fractionViz` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `fractions` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `funcGrapher` Function Grapher | math | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `galaxy` Galaxy Explorer | science | standard | 30 | 2 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `gameStudio` Game Design Studio | creativity | standard | 34 | 3 | 0 | 0 | 0 | 0 |  |
| `geoQuiz` Geography Explorer | geo | standard | 12 | 2 | 0 | 0 | 0 | 0 |  |
| `geoSandbox` Geometry Sandbox | math | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `geologyExplorer` Geology Explorer | explore | standard | 23 | 1 | 0 | 0 | 0 | 1 | metadata x1 |
| `geometryProver` Geometry | math | standard | 17 | 0 | 0 | 0 | 0 | 0 |  |
| `geometryWorld` Geometry World | explore | standard | 0 | 0 | 0 | 0 | 1 | 1 | heading x1, metadata x1 |
| `graphCalc` graphCalc | math | standard | 26 | 7 | 1 | 0 | 2 | 0 | canvas-name x1, heading x1 |
| `inequality` Inequality Grapher | math | standard | 30 | 8 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `kitchenLab` Kitchen Lab | applied | standard | 8 | 1 | 0 | 0 | 2 | 0 | heading x1, inline-contrast x1 |
| `learningLab` Learning Lab | life-skills | standard | 22 | 0 | 0 | 0 | 0 | 0 |  |
| `lifeSkills` Life Skills Lab | Life Skills | standard | 15 | 5 | 0 | 0 | 0 | 0 |  |
| `llmLiteracy` AI Literacy Lab | technology | standard | 12 | 0 | 0 | 0 | 7 | 0 | inline-contrast x7 |
| `logicLab` Logic Lab | math | standard | 41 | 1 | 0 | 0 | 0 | 0 |  |
| `lumen` Lumen | data | standard | 22 | 7 | 0 | 0 | 1 | 0 | heading x1 |
| `microbiology` Microbiology Lab | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `migration` Migration & Wind Lab | science | standard | 10 | 6 | 1 | 0 | 0 | 0 |  |
| `molecule` Molecule Lab | science | standard | 103 | 1 | 0 | 0 | 2 | 0 | svg-name x1, tiny-text x1 |
| `moneyMath` Money Math | math | standard | 29 | 2 | 0 | 0 | 0 | 0 |  |
| `moonMission` Moon Mission | science | standard | 8 | 5 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `multtable` Multiplication Table | math | standard | 22 | 5 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `musicSynth` Music Synthesizer | creative | standard | 94 | 19 | 2 | 0 | 4 | 0 | canvas-focus x2, canvas-name x2 |
| `numberline` Number Line | math | standard | 21 | 5 | 0 | 0 | 0 | 0 |  |
| `nutritionLab` NutritionLab — Nutrition Science | general | standard | 19 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `opticsLab` Optics Lab | science | standard | 34 | 0 | 0 | 0 | 0 | 0 |  |
| `oratory` Oratory Lab | science | standard | 16 | 0 | 4 | 0 | 4 | 0 | canvas-focus x4 |
| `petsLab` Science of Pets Lab | life-earth-science | standard | 35 | 7 | 0 | 0 | 0 | 0 |  |
| `physics` Physics Simulator | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `plateTectonics` Plate Tectonics | science | standard | 22 | 5 | 6 | 0 | 7 | 1 | canvas-focus x4, canvas-name x3, horizontal-overflow-risk x1 |
| `playlab` PlayLab | science | standard | 31 | 5 | 1 | 0 | 0 | 1 | horizontal-overflow-risk x1 |
| `printingPress` PrintingPress | history-engineering | standard | 25 | 0 | 0 | 0 | 1 | 0 | svg-name x1 |
| `probability` Probability Lab | math | standard | 37 | 5 | 0 | 0 | 0 | 0 |  |
| `protractor` Angle Explorer | math | standard | 69 | 5 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `punnett` Punnett Square Lab | science | standard | 30 | 4 | 0 | 0 | 0 | 0 |  |
| `raptorHunt` Raptor Hunt: Predator Physics + Biology | science | standard | 48 | 1 | 0 | 0 | 0 | 0 |  |
| `renewablesLab` Renewables Lab | physics-chemistry | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `roadReady` RoadReady: Driver's Ed & Auto Science | life-skills | standard | 64 | 3 | 0 | 0 | 0 | 0 |  |
| `rockCycle` rockCycle | science | standard | 13 | 1 | 1 | 0 | 3 | 1 | canvas-focus x1, canvas-name x1, metadata x1, tiny-text x1 |
| `rocks` rocks | science | standard | 9 | 0 | 1 | 0 | 2 | 1 | canvas-focus x1, canvas-name x1, metadata x1 |
| `schoolBehaviorToolkit` School Behavior Toolkit | science | standard | 13 | 0 | 0 | 0 | 0 | 0 |  |
| `semiconductor` Semiconductor Lab | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `singing` Singing Lab | art | standard | 29 | 0 | 2 | 0 | 2 | 0 | canvas-focus x2 |
| `skatelab` SkateLab | science | standard | 58 | 10 | 1 | 0 | 0 | 0 |  |
| `solarSystem` Solar System Explorer | science | standard | 25 | 1 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `spaceColony` Kepler Colony | strategy | standard | 13 | 7 | 0 | 0 | 0 | 0 |  |
| `spaceExplorer` Space Explorer | Simulations | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `statsLab` Statistics Lab | math | standard | 20 | 0 | 0 | 0 | 0 | 0 |  |
| `stewardshipHub` Environmental Stewardship Campaigns | science | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `swimLab` SwimLab | life-skills | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `throwlab` ThrowLab | science | standard | 53 | 8 | 1 | 0 | 0 | 0 |  |
| `titrationLab` Titration Lab | science | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `typingPractice` Typing Practice | life-skills | standard | 25 | 0 | 0 | 0 | 5 | 0 | inline-contrast x5 |
| `unitConvert` Unit Converter | math | standard | 21 | 3 | 1 | 0 | 2 | 0 | canvas-focus x1, canvas-name x1 |
| `universe` Universe Explorer | science | standard | 54 | 4 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `volume` 3D Volume Explorer | math | standard | 26 | 11 | 1 | 0 | 3 | 0 | canvas-focus x1, canvas-name x1, tiny-text x1 |
| `waterCycle` Water Cycle | science | standard | 18 | 4 | 1 | 0 | 4 | 0 | canvas-focus x1, canvas-name x1, inline-contrast x1, tiny-text x1 |
| `wave` Wave Simulator | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | heading x1 |
| `weldLab` WeldLab — Welding & Metal Joining | general | standard | 26 | 0 | 0 | 0 | 1 | 1 | metadata x1, tiny-text x1 |
| `worldBuilder` WriteCraft | creative | standard | 14 | 10 | 0 | 0 | 1 | 0 | tiny-text x1 |

## Notes

- The audit renders the default first screen for every registered plugin tool. It does not click through every tab/state.
- Canvas and field findings are intentionally tool-level: the STEM host has fallback labeling, but tool-authored names are still more precise and resilient.
- Use `node dev-tools/check_stem_a11y.cjs --gate` if you want high-confidence errors to fail automation.

