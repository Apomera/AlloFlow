# STEM Tool UI/UX Accessibility Audit

Generated: 2026-09-03T00:03:21.592Z

## Scope

- Registered STEM tools audited: 149
- Plugin files loaded: 147
- Shared shell coverage: 149/149 tools
- Light-background opt-outs: 0

## Summary

| Metric | Count |
| --- | ---: |
| Total findings | 14 |
| High-confidence errors | 0 |
| Tool-level warnings | 14 |
| Review notices | 0 |
| Tools with any finding | 13 |
| Tools with high-confidence errors | 0 |
| Tools with canvas surfaces | 43 |

## Top Findings

| Severity | Code | Findings | Tools | Example tools | Recommendation |
| --- | --- | ---: | ---: | --- | --- |
| warning | `tiny-text` | 6 | 6 | artStudio, beehive, cityLab, dnaLab, moonMission, sourcebook | Avoid persistent 8px/9px instructional text; keep small labels at 10px+ with clear line height. |
| warning | `placeholder-render` | 3 | 3 | geoSandbox, geometryWorld, lawNavigator | The audit only saw a loading/gated screen. Give the harness what the tool waits on (host state, 3D loader, network stub) so the real first screen gets audited. |
| warning | `canvas-focus` | 2 | 2 | graphCalc, printLab | Make interactive canvases keyboard-focusable. For static output, use role=img, a meaningful name and description, plus data-a11y-static=true. |
| warning | `no-interactive-controls` | 2 | 2 | coasterLab, geoSandbox | Confirm the first screen really has no control. If it does, the audit is stuck on a placeholder and the tool is effectively unaudited. |
| warning | `svg-name` | 1 | 1 | magnetism | Mark decorative SVGs aria-hidden or give informative SVGs an aria-label/title. |

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
| `accessLens` Access Lens | accessibility | standard | 8 | 1 | 0 | 0 | 0 | 0 |  |
| `algebraCAS` Algebra Solver | math | standard | 15 | 1 | 0 | 0 | 0 | 0 |  |
| `alloBotSage` AlloBot: Starbound Sage | Games | standard | 79 | 0 | 0 | 0 | 0 | 0 |  |
| `alphaFoldExplorer` AlphaFold Explorer | science | standard | 5 | 0 | 0 | 0 | 0 | 0 |  |
| `anatomy` Human Anatomy Explorer | science | standard | 80 | 1 | 1 | 0 | 0 | 0 |  |
| `appLab` AppLab | technology | standard | 27 | 8 | 0 | 0 | 0 | 0 |  |
| `aquacultureLab` AquacultureLab: Mussel Farm Sim | science | standard | 182 | 6 | 0 | 0 | 0 | 0 |  |
| `aquarium` Aquarium Lab | science | standard | 28 | 0 | 0 | 0 | 0 | 0 |  |
| `arccity` Arc City | strategy | standard | 27 | 0 | 0 | 0 | 0 | 0 |  |
| `archStudio` Architecture Studio | engineering | standard | 95 | 2 | 1 | 0 | 0 | 0 |  |
| `areaPerimeter` Area & Perimeter Lab | math | standard | 8 | 2 | 0 | 0 | 0 | 0 |  |
| `areamodel` Area Model | math | standard | 18 | 3 | 0 | 0 | 0 | 0 |  |
| `arithmeticStudio` Arithmetic Strategy Studio | math | standard | 11 | 2 | 0 | 0 | 0 | 0 |  |
| `artStudio` Art & Design Studio | creative | standard | 12 | 0 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `assessmentLiteracy` Assessment Literacy Lab | Literacy | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `astronomy` Night Sky & Astronomy | science | standard | 18 | 1 | 0 | 0 | 0 | 0 |  |
| `atcTower` ATC Tower | applied | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `autoRepair` Auto Repair Shop | life-skills | standard | 49 | 0 | 0 | 0 | 0 | 0 |  |
| `bakingScience` Baking Lab | science | standard | 16 | 0 | 0 | 0 | 0 | 0 |  |
| `base10` Math Manipulatives | math | standard | 52 | 1 | 0 | 0 | 0 | 0 |  |
| `beehive` Beehive Simulator | science | standard | 111 | 26 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `behaviorLab` Behavior Lab | science | standard | 19 | 5 | 0 | 0 | 0 | 0 |  |
| `bikeLab` BikeLab: Physics & Repair | life-skills | standard | 11 | 0 | 0 | 0 | 0 | 0 |  |
| `birdLab` BirdLab — I-Spy Ornithology | science | standard | 127 | 1 | 0 | 0 | 0 | 0 |  |
| `brainAtlas` Brain Atlas Explorer | science | standard | 68 | 1 | 1 | 0 | 0 | 0 |  |
| `bridgeLab` Bridge Engineering Lab | science | standard | 25 | 9 | 0 | 0 | 0 | 0 |  |
| `calculus` Calculus | math | standard | 30 | 9 | 0 | 0 | 0 | 0 |  |
| `cell` Cell Simulator | science | standard | 41 | 3 | 1 | 0 | 0 | 0 |  |
| `cellAtlasLab` Cell Atlas Lab | biology | standard | 23 | 0 | 0 | 0 | 0 | 0 |  |
| `cellularLab` Cellular Automaton Lab | math | standard | 52 | 3 | 0 | 0 | 0 | 0 |  |
| `cephalopodLab` Cephalopod Lab | science | standard | 17 | 1 | 0 | 0 | 0 | 0 |  |
| `chemBalance` Chemistry Lab | science | standard | 16 | 1 | 0 | 0 | 0 | 0 |  |
| `circuit` Circuit Builder | science | standard | 44 | 1 | 0 | 0 | 0 | 0 |  |
| `circuitShelf` Circuit Shelf | engineering | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `cityLab` City Planning Lab | engineering | standard | 180 | 1 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `climateExplorer` Climate Explorer | science | standard | 40 | 0 | 2 | 0 | 0 | 0 |  |
| `coasterLab` Coaster Lab | science | standard | 0 | 0 | 0 | 0 | 1 | 0 | no-interactive-controls x1 |
| `codingPlayground` codingPlayground | creative | standard | 45 | 2 | 1 | 0 | 0 | 0 |  |
| `companionPlanting` Companion Planting Lab | science | standard | 20 | 0 | 1 | 0 | 0 | 0 |  |
| `consciousnessLab` Consciousness Theory Lab | science | standard | 31 | 0 | 0 | 0 | 0 | 0 |  |
| `coordinate` Coordinate Grid | math | standard | 15 | 3 | 0 | 0 | 0 | 0 |  |
| `cyberDefense` Cyber Defense Lab | technology | standard | 20 | 0 | 0 | 0 | 0 | 0 |  |
| `dataLab` Data Lab | data | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `dataPlot` Data Plotter | creative | standard | 30 | 10 | 0 | 0 | 0 | 0 |  |
| `dataStudio` Charts & Graphs | creative | standard | 36 | 22 | 0 | 0 | 0 | 0 |  |
| `decomposer` Material Decomposer | science | standard | 30 | 0 | 0 | 0 | 0 | 0 |  |
| `diagnosisEligibility` Diagnosis, Evaluation & School Eligibility | applied | standard | 13 | 30 | 0 | 0 | 0 | 0 |  |
| `dinoLab` Dino Lab | biology | standard | 408 | 1 | 0 | 0 | 0 | 0 |  |
| `dissection` Virtual Dissection Lab | science | standard | 77 | 11 | 1 | 0 | 0 | 0 |  |
| `dnaLab` DNA Lab | biology | standard | 99 | 4 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `echoTrainer` Echo Navigator | applied | standard | 28 | 5 | 1 | 0 | 0 | 0 |  |
| `echolocation` Echolocation Lab | science | standard | 8 | 0 | 0 | 0 | 0 | 0 |  |
| `economicsLab` Economics Lab | science | standard | 25 | 8 | 1 | 0 | 0 | 0 |  |
| `ecosystem` Ecosystem Simulator | science | standard | 47 | 13 | 1 | 0 | 0 | 0 |  |
| `epidemicSim` Epidemic Modeling Lab | Life Science | standard | 24 | 14 | 1 | 0 | 0 | 0 |  |
| `evoLab` EvoLab — Evolution | biology | standard | 28 | 0 | 0 | 0 | 0 | 0 |  |
| `fireEcology` Fire Ecology & Indigenous Stewardship | science | standard | 29 | 1 | 0 | 0 | 0 | 0 |  |
| `firstResponse` First Response Lab | life-skills | standard | 1 | 0 | 0 | 0 | 0 | 0 |  |
| `fisherLab` FisherLab: Boating & Fishing Sim | science | standard | 29 | 1 | 0 | 0 | 0 | 0 |  |
| `flightSim` SkySchool | applied | standard | 48 | 2 | 0 | 0 | 0 | 0 |  |
| `forge` Tool Forge | coding | standard | 5 | 9 | 0 | 0 | 0 | 0 |  |
| `fractionViz` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `fractions` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `freeForms` Free Forms | creative | standard | 14 | 0 | 0 | 0 | 0 | 0 |  |
| `funcGrapher` Function Grapher | math | standard | 47 | 9 | 1 | 0 | 0 | 0 |  |
| `galaxy` Galaxy Explorer | science | standard | 58 | 2 | 1 | 0 | 0 | 0 |  |
| `gameStudio` Game Design Studio | creativity | standard | 34 | 3 | 0 | 0 | 0 | 0 |  |
| `geoQuiz` Geography Explorer | geo | standard | 12 | 2 | 0 | 0 | 0 | 0 |  |
| `geoSandbox` Geometry Sandbox | math | standard | 0 | 0 | 0 | 0 | 2 | 0 | no-interactive-controls x1, placeholder-render x1 |
| `geologyExplorer` Geology Explorer | geology | standard | 50 | 2 | 0 | 0 | 0 | 0 |  |
| `geometryProver` Geometry | math | standard | 17 | 0 | 0 | 0 | 0 | 0 |  |
| `geometryWorld` Geometry World | math | standard | 1 | 0 | 0 | 0 | 1 | 0 | placeholder-render x1 |
| `gisStudio` GIS Studio | geo | standard | 28 | 15 | 0 | 0 | 0 | 0 |  |
| `graphCalc` Graphing Calculator | math | standard | 26 | 7 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `heatLab` Heat & Thermodynamics Lab | science | standard | 105 | 15 | 5 | 0 | 0 | 0 |  |
| `inequality` Inequality Grapher | math | standard | 30 | 8 | 0 | 0 | 0 | 0 |  |
| `kitchenLab` Kitchen Lab | applied | standard | 8 | 1 | 0 | 0 | 0 | 0 |  |
| `lawNavigator` Education Law Navigator | applied | standard | 1 | 0 | 0 | 0 | 1 | 0 | placeholder-render x1 |
| `learningLab` Learning Lab | life-skills | standard | 22 | 0 | 0 | 0 | 0 | 0 |  |
| `lifeSkills` Life Skills Lab | Life Skills | standard | 65 | 3 | 0 | 0 | 0 | 0 |  |
| `llmLiteracy` AI Literacy Lab | technology | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `logicLab` Logic Lab | math | standard | 41 | 1 | 0 | 0 | 0 | 0 |  |
| `lumen` Lumen | data | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `machineLab` Machine Lab | engineering | standard | 32 | 5 | 0 | 0 | 0 | 0 |  |
| `magnetism` Magnetism Lab | science | standard | 41 | 4 | 0 | 0 | 1 | 0 | svg-name x1 |
| `microbiology` Microbiology Lab | science | standard | 14 | 0 | 0 | 0 | 0 | 0 |  |
| `migration` Migration & Wind Lab | science | standard | 13 | 4 | 0 | 0 | 0 | 0 |  |
| `molecule` Molecule Lab | science | standard | 54 | 1 | 0 | 0 | 0 | 0 |  |
| `moleculeShelf` Molecule Shelf | chemistry | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `moneyMath` Money Math | math | standard | 29 | 2 | 0 | 0 | 0 | 0 |  |
| `moonMission` Moon Mission | science | standard | 10 | 5 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `multtable` Multiplication Table | math | standard | 22 | 5 | 0 | 0 | 0 | 0 |  |
| `musicSynth` Music Synthesizer | creative | standard | 97 | 22 | 2 | 0 | 0 | 0 |  |
| `nuclearLab` Nuclear & Radiation Lab | science | standard | 194 | 20 | 8 | 0 | 0 | 0 |  |
| `numberline` Number Line | math | standard | 21 | 5 | 0 | 0 | 0 | 0 |  |
| `nutritionLab` NutritionLab — Nutrition Science | biology | standard | 24 | 0 | 0 | 0 | 0 | 0 |  |
| `openBim` OpenBIM Companion | engineering | standard | 9 | 3 | 0 | 0 | 0 | 0 |  |
| `opticsLab` Optics Lab | science | standard | 35 | 0 | 0 | 0 | 0 | 0 |  |
| `oratory` Oratory Lab | science | standard | 16 | 0 | 4 | 0 | 0 | 0 |  |
| `organismId` Taxonomy Explorer | science | standard | 101 | 0 | 0 | 0 | 0 | 0 |  |
| `paperTrail` PaperTrail: Official Documents | applied | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `parentingLab` Science of Parenting Lab | science | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `particleLab3d` Particle Lab 3D | science | standard | 44 | 10 | 1 | 0 | 0 | 0 |  |
| `petsLab` Science of Pets Lab | life-earth-science | standard | 34 | 1 | 0 | 0 | 0 | 0 |  |
| `physics` Physics Simulator | science | standard | 36 | 10 | 1 | 0 | 0 | 0 |  |
| `plateTectonics` Plate Tectonics | science | standard | 35 | 5 | 6 | 0 | 0 | 0 |  |
| `playlab` PlayLab | science | standard | 31 | 5 | 1 | 0 | 0 | 0 |  |
| `printLab` Print Lab | engineering | standard | 17 | 4 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `printingPress` PrintingPress | history-engineering | standard | 25 | 0 | 0 | 0 | 0 | 0 |  |
| `probability` Probability Lab | math | standard | 39 | 5 | 0 | 0 | 0 | 0 |  |
| `protractor` Angle Explorer | math | standard | 69 | 5 | 0 | 0 | 0 | 0 |  |
| `punnett` Punnett Square Lab | science | standard | 26 | 2 | 0 | 0 | 0 | 0 |  |
| `raptorHunt` Raptor Hunt: Predator Physics + Biology | science | standard | 50 | 1 | 0 | 0 | 0 | 0 |  |
| `ratioLab` Ratios, Rates & Proportions Lab | math | standard | 11 | 4 | 0 | 0 | 0 | 0 |  |
| `renewablesLab` Renewables Lab | physics-chemistry | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `roadReady` RoadReady: Driver's Ed & Auto Science | life-skills | standard | 14 | 7 | 0 | 0 | 0 | 0 |  |
| `rockCycle` Rock Cycle | science | standard | 16 | 1 | 1 | 0 | 0 | 0 |  |
| `rocks` Rocks & Minerals Explorer | science | standard | 11 | 0 | 1 | 0 | 0 | 0 |  |
| `schoolBehaviorToolkit` School Behavior Toolkit | science | standard | 15 | 0 | 0 | 0 | 0 | 0 |  |
| `semiconductor` Semiconductor Lab | science | standard | 17 | 4 | 1 | 0 | 0 | 0 |  |
| `simShelf` Sim Shelf | science | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `singing` Singing Lab | art | standard | 29 | 0 | 2 | 0 | 0 | 0 |  |
| `skatelab` Skate Lab | science | standard | 13 | 21 | 1 | 0 | 0 | 0 |  |
| `solarSystem` Solar System Explorer | science | standard | 34 | 1 | 1 | 0 | 0 | 0 |  |
| `sourcebook` Sourcebook | creative | standard | 114 | 13 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `spaceColony` Kepler Colony | strategy | standard | 16 | 8 | 0 | 0 | 0 | 0 |  |
| `spaceExplorer` Space Explorer | Simulations | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `spaceStation` Space Station | science | standard | 30 | 0 | 1 | 0 | 0 | 0 |  |
| `statsLab` Statistics Lab | math | standard | 21 | 0 | 0 | 0 | 0 | 0 |  |
| `stewardshipHub` Environmental Stewardship Campaigns | science | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `swimLab` SwimLab | life-skills | standard | 13 | 0 | 0 | 0 | 0 | 0 |  |
| `throwlab` ThrowLab | science | standard | 57 | 8 | 1 | 0 | 0 | 0 |  |
| `timeSchedule` Time & Schedule Lab | math | standard | 13 | 2 | 0 | 0 | 0 | 0 |  |
| `timelineStudio` Timeline Studio | history | standard | 2 | 2 | 0 | 0 | 0 | 0 |  |
| `titrationLab` Titration Lab | science | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `trajectoryComputing` Trajectory Computing Lab | coding | standard | 11 | 5 | 0 | 0 | 0 | 0 |  |
| `treeLab` Tree Life Lab | Life Science | standard | 39 | 11 | 0 | 0 | 0 | 0 |  |
| `typingPractice` Typing Practice | life-skills | standard | 45 | 2 | 0 | 0 | 0 | 0 |  |
| `unitConvert` Unit Converter | math | standard | 22 | 4 | 1 | 0 | 0 | 0 |  |
| `universe` Universe Explorer | science | standard | 126 | 5 | 1 | 0 | 0 | 0 |  |
| `volume` 3D Volume Explorer | math | standard | 33 | 8 | 2 | 0 | 0 | 0 |  |
| `waterCycle` Water Cycle | science | standard | 40 | 6 | 1 | 0 | 0 | 0 |  |
| `wave` Wave Simulator | science | standard | 36 | 8 | 1 | 0 | 0 | 0 |  |
| `weatherSystems` Weather Systems & Forecasting | science | standard | 43 | 10 | 1 | 0 | 0 | 0 |  |
| `weldLab` WeldLab — Welding & Metal Joining | engineering | standard | 26 | 0 | 0 | 0 | 0 | 0 |  |
| `wheelAndFire` Wheel & Fire: Pottery Lab | creative | standard | 26 | 12 | 0 | 0 | 0 | 0 |  |
| `worldBuilder` WriteCraft | creative | standard | 14 | 10 | 0 | 0 | 0 | 0 |  |
| `zoomGallery` Zoom Gallery | creative | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |

## Notes

- The audit renders the default first screen for every registered plugin tool. It does not click through every tab/state.
- Tools that self-initialize state on first render are replayed (up to 5 passes) until state settles, so the real screen is audited instead of their "Loading..." placeholder.
- `placeholder-render` and `no-interactive-controls` mean the audit never reached the real UI. Treat those tools as unaudited, not as clean.
- Canvas and field findings are intentionally tool-level: the STEM host has fallback labeling, but tool-authored names are still more precise and resilient.
- Use `node dev-tools/check_stem_a11y.cjs --gate` if you want high-confidence errors to fail automation.

