# STEM Tool UI/UX Accessibility Audit

Generated: 2026-07-22T04:46:27.631Z

## Scope

- Registered STEM tools audited: 130
- Plugin files loaded: 128
- Shared shell coverage: 130/130 tools
- Light-background opt-outs: 0

## Summary

| Metric | Count |
| --- | ---: |
| Total findings | 40 |
| High-confidence errors | 0 |
| Tool-level warnings | 16 |
| Review notices | 24 |
| Tools with any finding | 35 |
| Tools with high-confidence errors | 0 |
| Tools with canvas surfaces | 36 |

## Load/Render Errors

- Load: `stem_tool_galaxy.js` - missing ) after argument list

## Top Findings

| Severity | Code | Findings | Tools | Example tools | Recommendation |
| --- | --- | ---: | ---: | --- | --- |
| warning | `tiny-text` | 12 | 12 | base10, calculus, coordinate, geologyExplorer, inequality, multtable, particleLab3d, plateTectonics, protractor, unitConvert, universe, volume | Avoid persistent 8px/9px instructional text; keep small labels at 10px+ with clear line height. |
| warning | `canvas-focus` | 2 | 2 | particleLab3d, skatelab | If a canvas supports interaction, make it keyboard-focusable and expose keyboard alternatives. |
| warning | `inline-contrast` | 1 | 1 | appLab | Adjust inline foreground/background colors to meet at least 4.5:1 contrast for body text. |
| warning | `svg-name` | 1 | 1 | birdLab | Mark decorative SVGs aria-hidden or give informative SVGs an aria-label/title. |
| notice | `metadata` | 19 | 19 | accessLens, archStudio, birdLab, circuitShelf, codingPlayground, cyberDefense, dataLab, dinoLab, evoLab, geologyExplorer, geometryWorld, moleculeShelf | Fill in label, description, category, and aliases so discovery and context labels stay clear. |
| notice | `horizontal-overflow-risk` | 5 | 5 | areaPerimeter, birdLab, brainAtlas, plateTectonics, playlab | Review fixed-width elements at 360px and 768px widths so panels and canvases do not overflow. |

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
| `algebraCAS` Algebra Solver | math | standard | 14 | 1 | 0 | 0 | 0 | 0 |  |
| `alloBotSage` AlloBot: Starbound Sage | Games | standard | 79 | 0 | 0 | 0 | 0 | 0 |  |
| `alphaFoldExplorer` AlphaFold Explorer | science | standard | 5 | 0 | 0 | 0 | 0 | 0 |  |
| `anatomy` Human Anatomy Explorer | science | standard | 79 | 1 | 1 | 0 | 0 | 0 |  |
| `appLab` AppLab | technology | standard | 26 | 7 | 0 | 0 | 1 | 0 | inline-contrast x1 |
| `aquacultureLab` AquacultureLab: Mussel Farm Sim | science | standard | 152 | 1 | 0 | 0 | 0 | 0 |  |
| `aquarium` Aquarium Lab | science | standard | 27 | 0 | 0 | 0 | 0 | 0 |  |
| `arccity` Arc City | strategy | standard | 23 | 0 | 0 | 0 | 0 | 0 |  |
| `archStudio` Architecture Studio | explore | standard | 83 | 2 | 0 | 0 | 0 | 1 | metadata x1 |
| `areaPerimeter` Area & Perimeter Lab | math | standard | 8 | 2 | 0 | 0 | 0 | 1 | horizontal-overflow-risk x1 |
| `areamodel` Area Model | math | standard | 18 | 3 | 0 | 0 | 0 | 0 |  |
| `arithmeticStudio` Arithmetic Strategy Studio | math | standard | 11 | 2 | 0 | 0 | 0 | 0 |  |
| `artStudio` Art & Design Studio | creative | standard | 24 | 3 | 1 | 0 | 0 | 0 |  |
| `assessmentLiteracy` Assessment Literacy Lab | Literacy | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `astronomy` Night Sky & Astronomy | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `atcTower` ATC Tower | applied | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `autoRepair` Auto Repair Shop | life-skills | standard | 38 | 0 | 0 | 0 | 0 | 0 |  |
| `bakingScience` Baking Lab | science | standard | 16 | 0 | 0 | 0 | 0 | 0 |  |
| `base10` Math Manipulatives | math | standard | 51 | 1 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `beehive` Beehive Simulator | science | standard | 74 | 5 | 1 | 0 | 0 | 0 |  |
| `behaviorLab` Behavior Lab | science | standard | 24 | 5 | 0 | 0 | 0 | 0 |  |
| `bikeLab` BikeLab: Physics & Repair | life-skills | standard | 11 | 0 | 0 | 0 | 0 | 0 |  |
| `birdLab` BirdLab — I-Spy Ornithology | general | standard | 127 | 1 | 0 | 0 | 1 | 2 | horizontal-overflow-risk x1, metadata x1, svg-name x1 |
| `brainAtlas` Brain Atlas Explorer | science | standard | 54 | 1 | 1 | 0 | 0 | 1 | horizontal-overflow-risk x1 |
| `bridgeLab` Bridge Engineering Lab | science | standard | 24 | 8 | 0 | 0 | 0 | 0 |  |
| `calculus` Calculus | math | standard | 29 | 9 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `cell` Cell Simulator | science | standard | 40 | 3 | 1 | 0 | 0 | 0 |  |
| `cellularLab` Cellular Automaton Lab | math | standard | 52 | 3 | 0 | 0 | 0 | 0 |  |
| `cephalopodLab` Cephalopod Lab | science | standard | 17 | 1 | 0 | 0 | 0 | 0 |  |
| `chemBalance` Chemistry Lab | science | standard | 12 | 1 | 1 | 0 | 0 | 0 |  |
| `circuit` Circuit Builder | science | standard | 44 | 1 | 0 | 0 | 0 | 0 |  |
| `circuitShelf` Circuit Shelf | general | standard | 2 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `climateExplorer` Climate Explorer | science | standard | 39 | 0 | 2 | 0 | 0 | 0 |  |
| `coasterLab` Coaster Lab | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `codingPlayground` codingPlayground | creative | standard | 57 | 2 | 1 | 0 | 0 | 1 | metadata x1 |
| `companionPlanting` Companion Planting Lab | science | standard | 20 | 0 | 1 | 0 | 0 | 0 |  |
| `coordinate` Coordinate Grid | math | standard | 14 | 1 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `cyberDefense` Cyber Defense Lab | tech | standard | 20 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `dataLab` Data Lab | general | standard | 2 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `dataPlot` Data Plotter | creative | standard | 31 | 10 | 0 | 0 | 0 | 0 |  |
| `dataStudio` Data Studio | creative | standard | 33 | 21 | 0 | 0 | 0 | 0 |  |
| `decomposer` Material Decomposer | science | standard | 30 | 0 | 0 | 0 | 0 | 0 |  |
| `dinoLab` Dino Lab | explore | standard | 408 | 1 | 0 | 0 | 0 | 1 | metadata x1 |
| `dissection` Virtual Dissection Lab | science | standard | 38 | 7 | 1 | 0 | 0 | 0 |  |
| `dnaLab` DNA Lab | biology | standard | 87 | 1 | 1 | 0 | 0 | 0 |  |
| `echoTrainer` Echo Navigator | applied | standard | 28 | 5 | 1 | 0 | 0 | 0 |  |
| `echolocation` Echolocation Lab | science | standard | 10 | 0 | 0 | 0 | 0 | 0 |  |
| `economicsLab` Economics Lab | science | standard | 25 | 8 | 1 | 0 | 0 | 0 |  |
| `ecosystem` Ecosystem Simulator | science | standard | 33 | 8 | 1 | 0 | 0 | 0 |  |
| `epidemicSim` Epidemic Modeling Lab | Life Science | standard | 21 | 4 | 1 | 0 | 0 | 0 |  |
| `evoLab` EvoLab — Evolution | general | standard | 28 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `fireEcology` Fire Ecology & Indigenous Stewardship | science | standard | 29 | 1 | 0 | 0 | 0 | 0 |  |
| `firstResponse` First Response Lab | life-skills | standard | 1 | 0 | 0 | 0 | 0 | 0 |  |
| `fisherLab` FisherLab: Boating & Fishing Sim | science | standard | 24 | 1 | 0 | 0 | 0 | 0 |  |
| `flightSim` SkySchool | applied | standard | 48 | 2 | 0 | 0 | 0 | 0 |  |
| `forge` Tool Forge | coding | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `fractionViz` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `fractions` Fraction Lab | math | standard | 41 | 2 | 1 | 0 | 0 | 0 |  |
| `freeForms` Free Forms | creative | standard | 14 | 0 | 0 | 0 | 0 | 0 |  |
| `funcGrapher` Function Grapher | math | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `gameStudio` Game Design Studio | creativity | standard | 34 | 3 | 0 | 0 | 0 | 0 |  |
| `geoQuiz` Geography Explorer | geo | standard | 12 | 2 | 0 | 0 | 0 | 0 |  |
| `geoSandbox` Geometry Sandbox | math | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `geologyExplorer` Geology Explorer | explore | standard | 23 | 1 | 0 | 0 | 1 | 1 | metadata x1, tiny-text x1 |
| `geometryProver` Geometry | math | standard | 17 | 0 | 0 | 0 | 0 | 0 |  |
| `geometryWorld` Geometry World | explore | standard | 0 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `graphCalc` graphCalc | math | standard | 26 | 7 | 1 | 0 | 0 | 0 |  |
| `inequality` Inequality Grapher | math | standard | 30 | 8 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `kitchenLab` Kitchen Lab | applied | standard | 8 | 1 | 0 | 0 | 0 | 0 |  |
| `learningLab` Learning Lab | life-skills | standard | 22 | 0 | 0 | 0 | 0 | 0 |  |
| `lifeSkills` Life Skills Lab | Life Skills | standard | 58 | 3 | 0 | 0 | 0 | 0 |  |
| `llmLiteracy` AI Literacy Lab | technology | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `logicLab` Logic Lab | math | standard | 41 | 1 | 0 | 0 | 0 | 0 |  |
| `lumen` Lumen | data | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `magnetism` Magnetism Lab | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `microbiology` Microbiology Lab | science | standard | 14 | 0 | 0 | 0 | 0 | 0 |  |
| `migration` Migration & Wind Lab | science | standard | 10 | 6 | 1 | 0 | 0 | 0 |  |
| `molecule` Molecule Lab | science | standard | 104 | 1 | 0 | 0 | 0 | 0 |  |
| `moleculeShelf` Molecule Shelf | general | standard | 2 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `moneyMath` Money Math | math | standard | 29 | 2 | 0 | 0 | 0 | 0 |  |
| `moonMission` Moon Mission | science | standard | 8 | 5 | 0 | 0 | 0 | 0 |  |
| `multtable` Multiplication Table | math | standard | 22 | 5 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `musicSynth` Music Synthesizer | creative | standard | 94 | 19 | 2 | 0 | 0 | 0 |  |
| `numberline` Number Line | math | standard | 21 | 5 | 0 | 0 | 0 | 0 |  |
| `nutritionLab` NutritionLab — Nutrition Science | general | standard | 19 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `opticsLab` Optics Lab | science | standard | 34 | 0 | 0 | 0 | 0 | 0 |  |
| `oratory` Oratory Lab | science | standard | 16 | 0 | 4 | 0 | 0 | 0 |  |
| `particleLab3d` Particle Lab 3D | science | standard | 42 | 9 | 1 | 0 | 2 | 0 | canvas-focus x1, tiny-text x1 |
| `petsLab` Science of Pets Lab | life-earth-science | standard | 35 | 7 | 0 | 0 | 0 | 0 |  |
| `physics` Physics Simulator | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `plateTectonics` Plate Tectonics | science | standard | 25 | 5 | 6 | 0 | 1 | 1 | horizontal-overflow-risk x1, tiny-text x1 |
| `playlab` PlayLab | science | standard | 31 | 5 | 1 | 0 | 0 | 1 | horizontal-overflow-risk x1 |
| `printingPress` PrintingPress | history-engineering | standard | 25 | 0 | 0 | 0 | 0 | 0 |  |
| `probability` Probability Lab | math | standard | 37 | 5 | 0 | 0 | 0 | 0 |  |
| `protractor` Angle Explorer | math | standard | 69 | 5 | 0 | 0 | 1 | 0 | tiny-text x1 |
| `punnett` Punnett Square Lab | science | standard | 26 | 2 | 0 | 0 | 0 | 0 |  |
| `raptorHunt` Raptor Hunt: Predator Physics + Biology | science | standard | 48 | 1 | 0 | 0 | 0 | 0 |  |
| `ratioLab` Ratios, Rates & Proportions Lab | math | standard | 8 | 4 | 0 | 0 | 0 | 0 |  |
| `renewablesLab` Renewables Lab | physics-chemistry | standard | 12 | 0 | 0 | 0 | 0 | 0 |  |
| `roadReady` RoadReady: Driver's Ed & Auto Science | life-skills | standard | 64 | 3 | 0 | 0 | 0 | 0 |  |
| `rockCycle` rockCycle | science | standard | 13 | 1 | 1 | 0 | 0 | 1 | metadata x1 |
| `rocks` rocks | science | standard | 9 | 0 | 1 | 0 | 0 | 1 | metadata x1 |
| `schoolBehaviorToolkit` School Behavior Toolkit | science | standard | 13 | 0 | 0 | 0 | 0 | 0 |  |
| `semiconductor` Semiconductor Lab | science | standard | 37 | 2 | 1 | 0 | 0 | 0 |  |
| `simShelf` Sim Shelf | general | standard | 2 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `singing` Singing Lab | art | standard | 29 | 0 | 2 | 0 | 0 | 0 |  |
| `skatelab` SkateLab | science | standard | 57 | 10 | 1 | 0 | 1 | 0 | canvas-focus x1 |
| `solarSystem` Solar System Explorer | science | standard | 25 | 1 | 1 | 0 | 0 | 0 |  |
| `spaceColony` Kepler Colony | strategy | standard | 16 | 8 | 0 | 0 | 0 | 0 |  |
| `spaceExplorer` Space Explorer | Simulations | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `spaceStation` Space Station | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `statsLab` Statistics Lab | math | standard | 21 | 0 | 0 | 0 | 0 | 0 |  |
| `stewardshipHub` Environmental Stewardship Campaigns | science | standard | 2 | 0 | 0 | 0 | 0 | 0 |  |
| `swimLab` SwimLab | life-skills | standard | 13 | 0 | 0 | 0 | 0 | 0 |  |
| `throwlab` ThrowLab | science | standard | 53 | 8 | 1 | 0 | 0 | 0 |  |
| `timeSchedule` Time & Schedule Lab | math | standard | 13 | 2 | 0 | 0 | 0 | 0 |  |
| `timelineStudio` Timeline Studio | general | standard | 2 | 2 | 0 | 0 | 0 | 1 | metadata x1 |
| `titrationLab` Titration Lab | science | standard | 9 | 0 | 0 | 0 | 0 | 0 |  |
| `typingPractice` Typing Practice | life-skills | standard | 25 | 0 | 0 | 0 | 0 | 0 |  |
| `unitConvert` Unit Converter | math | standard | 22 | 3 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `universe` Universe Explorer | science | standard | 78 | 4 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `volume` 3D Volume Explorer | math | standard | 28 | 11 | 1 | 0 | 1 | 0 | tiny-text x1 |
| `waterCycle` Water Cycle | science | standard | 30 | 6 | 1 | 0 | 0 | 0 |  |
| `wave` Wave Simulator | science | standard | 0 | 0 | 0 | 0 | 0 | 0 |  |
| `weatherSystems` Weather Systems & Forecasting | science | standard | 42 | 10 | 1 | 0 | 0 | 0 |  |
| `weldLab` WeldLab — Welding & Metal Joining | general | standard | 26 | 0 | 0 | 0 | 0 | 1 | metadata x1 |
| `worldBuilder` WriteCraft | creative | standard | 14 | 10 | 0 | 0 | 0 | 0 |  |
| `zoomGallery` Zoom Gallery | general | standard | 2 | 0 | 0 | 0 | 0 | 1 | metadata x1 |

## Notes

- The audit renders the default first screen for every registered plugin tool. It does not click through every tab/state.
- Canvas and field findings are intentionally tool-level: the STEM host has fallback labeling, but tool-authored names are still more precise and resilient.
- Use `node dev-tools/check_stem_a11y.cjs --gate` if you want high-confidence errors to fail automation.

