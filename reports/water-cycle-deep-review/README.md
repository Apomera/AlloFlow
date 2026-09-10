# Water Cycle: simulation, visual design, and learning review

The strongest next step is a complementary **Water Worlds sandbox**: a persistent, editable watershed where changes in weather, ground cover, and water storage produce visible, measurable consequences. Preserve the current guided experiences as approachable ways into that world. The central improvement is to connect learner actions, physical processes, visual changes, and recorded evidence through a shared model.

The current tool is substantially more developed than a conventional animated cycle diagram. It already offers a system map, a guided 3D journey, a playable water-parcel experience, a precipitation laboratory, and a stewardship campaign. Its next advance should deepen causal interaction and coherence across those experiences. Adding another large set of disconnected controls would make its educational value harder to discover.

This report distinguishes observations of the current implementation from recommendations. Technical findings refer to the local source reviewed on September 8, 2026. Proposed benefits are design hypotheses requiring learner evaluation; automated checks do not establish classroom effectiveness.

## 1. Current strengths and the central constraint

| Existing experience | What is already valuable | Most useful next refinement |
|---|---|---|
| Explore: system map and droplet journey | Multiple representations, visible matter/energy cues, grade-specific explanations, land-condition comparisons, route choices, and time/storage explanations | Make scene changes and recorded quantities reflect a persistent water budget; use clearer visual separation between physical water and explanatory overlays |
| Be the Water | Temperature profiles, condensation-nucleus encounters, buoyancy, collision growth, virga, wind, landing surfaces, navigation assistance, live transition receipts, and replayable challenges | Preserve the sense of embodiment while distinguishing an individual tracer, a cloud droplet, and an air parcel; let observers investigate without needing flight skill |
| Storm Lab | Vertical temperature structure, precipitation distinctions, storm development, 2D/3D representations, environmental controls, and observation records | Connect precipitation reaching the surface to rainfall depth, duration, and watershed storage; align the pilot's phase vocabulary with this stronger precipitation model |
| Steward | Ten-year decisions, seeded events, constrained resources, feedback rules, and reflection | Add a physical experiment alongside social decisions, with separate hydrologic measurements and civic/ecological judgments |
| Storm-to-stream investigation | Prediction, urban baseline, one-variable land-cover comparison, fair-test restoration, immutable observations, explanation, and evidence export | Generalize this strong structure into learner-authored experiments with explicit starting conditions and repeatable weather |

These are implemented features, not suggestions to rebuild. The existing investigation documentation explicitly identifies its boundaries: storm intensity is an index, runoff and infiltration are independent indices, infiltration is not automatically recharge, and the stewardship campaign is separate.[^L1]

The land-response kernel illustrates the limitation precisely. It computes weighted scores from rainfall, saturation, cover, slope, and permeability. At the default settings, its rounded outputs are 47 for runoff tendency and 55 for infiltration opportunity. Their sum of 102 is valid for two independent indices, but those numbers cannot become a water-allocation chart or a physical runoff fraction. Likewise, choosing soil in the pilot eventually advances through groundwater and collected water; it does not resolve competition between soil storage, evaporation, root uptake, recharge, and lateral flow.[^L2]

This is the architectural opportunity: introduce an evolving state that retains water between events. A second storm should encounter the soil moisture left by the first. A dry spell should change that initial condition. A wetland should have finite capacity, and an overflowing wetland should send water somewhere observable.

## 2. Science refinements to make before expanding

**Correct the explanation of rising-air cooling.** The middle-school condensation description says rising air cools at approximately 6.5°C/km and calls this the environmental lapse rate. The pilot itself distinguishes environmental, dry-parcel, and moist-parcel rates. The text should make the same distinction: the surrounding atmosphere has a temperature profile; an unsaturated rising parcel expands and cools at approximately the dry adiabatic rate; after saturation, latent heat changes that rate. Use a small paired graph with “air around us” and “rising parcel” rather than another paragraph of terminology.[^L3][^1]

**Resolve rain-to-snow labeling in the pilot.** `wcPilotNextForm` can turn rain into `snow` when it crosses the model's freezing altitude. Freezing a liquid raindrop does not automatically create a snow crystal. Align this with Storm Lab's distinctions among liquid rain, ice pellets, freezing rain, and snow. In an introductory model, an honest generic frozen-particle representation would be preferable to an incorrect snowflake identity. An advanced model should track thermal exposure and phase history.[^L4][^2]

**Make representation changes explicit.** The pilot moves between “cloud droplet” and “cloud parcel” after a small number of collisions. That is an instructional change of scale, not the literal transformation of one droplet into an entire cloud. Retain the engaging collision mechanic, but introduce a clearly labeled magnification or aggregation transition. A tracer can follow representative water through several storage pools while the air parcel remains a separate moving volume.[^L4]

**Bound the cloud-base rule.** The pilot only permits condensation above its lifting condensation level. That is useful for its rising-parcel scenario, but must not become a universal statement that condensation requires altitude. Fog, dew, and condensation on a cold surface offer excellent counterexamples. Add a ground-level “cold surface” investigation and describe the lifting condensation level as the cloud-base estimate for this ascent model.[^3]

**Replace guaranteed land journeys with competing pathways in the sandbox.** The guided journey can intentionally demonstrate soil → groundwater → stream. The sandbox should allow soil water to remain stored, evaporate, enter roots, drain laterally, or recharge deeper storage. Similarly, rain landing on vegetation initially represents interception; root uptake should draw from soil water. Soil entry and aquifer recharge need separate readings.[^L4][^4]

**Audit advanced explanations for implied precision.** The high-school evaporation text introduces Clausius–Clapeyron as if it governs evaporation itself. Reframe saturation vapor pressure as one relationship relevant to evaporation; actual flux also needs water availability, an energy supply, and vapor transport. Review global percentages and physical-time examples with an explicit source, denominator, and approximation label. The existing detailed science tests are valuable, but passing tests can preserve a teaching simplification just as readily as a physical fact.[^L3][^5]

## 3. Visual direction: make the landscape readable as evidence

The recommended art direction is a coherent, stylized scientific landscape with depth, material variation, and restrained atmosphere. Keep its approachable identity. Aim for a world in which a learner can identify what changed before opening a graph.

The current default map already distinguishes invisible vapor paths from water and shows a subsurface cutaway. Those are strong foundations. In the reviewed 3D overview, bright tracers, overlapping translucent cloud forms, and large direction lines compete for attention. The pilot's starting view makes the parcel conspicuous, but distant land areas are relatively small and provide limited immediate information about how the watershed is responding. These are observations from the captured states, not claims about every scene or camera angle.[^L5]

![Current system-map interface](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/water-cycle-deep-review/explorer-desktop.png>)

*Current local default interface. The scene is visible in the first desktop viewport; its process labels and ground cutaway are assets to preserve.*

![Current guided 3D landscape](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/water-cycle-deep-review/wc_journey_review.png>)

*Current guided-journey preview. The proposed refinement would reduce competition among clouds, route overlays, and the selected parcel.*

| Visual system | Proposed refinement | What learners should be able to infer |
|---|---|---|
| Terrain and shoreline | A continuous height field with coherent valleys, channel beds, depressions, and shoreline contact; shared geometry for appearance and flow | Why water follows one path and where it can accumulate |
| Surface water | Model-driven depth and wetted area; directionally aligned surface detail; modest reflection; contact ripples only where impacts occur | Whether a channel is rising, where flow is going, and which areas are inundated |
| Soil | Wetness darkening, a moving infiltration front in cutaway, visible unsaturated storage, and a separately labeled water table | Water entering soil is not the same event as water reaching groundwater |
| Clouds | Consistent lighting, readable bases, softened edges, and density linked to modeled condensate | Where cloud water forms and changes; visible cloud is liquid/ice, while vapor needs an explanatory overlay |
| Rain and snow | Spatial precipitation footprints and distinct trajectories; surface impacts tied to arriving water; snow storage that persists and later melts | Rain aloft may not reach the surface, and snowfall can delay runoff |
| Vegetation | Interception drips, soil/root overlays, restrained leaf motion, and slower vegetation response | Plants affect several pathways, and their effects have different timescales |
| Energy | A separate optional directional overlay with a consistent warm color; concise absorbed/released labels | Energy moves differently from water, including during phase changes |
| Comparison | Synchronized A/B views, a difference overlay, fixed color scales, and shared chart axes | Which areas and quantities changed under the same weather |
| Labels and instruments | Context-sensitive annotations, leader-line avoidance, readable minimum sizes, and a compact selected-location inspector | Which measurement belongs to which place and moment |

Give the scene three independently selectable lenses: **Water**, **Energy**, and **Below ground**. A default natural view should remain understandable without every lens enabled. Use outlines, patterns, arrow direction, and text alongside color. Retain a stable camera option and a high-contrast analysis view.

A particularly valuable visual interaction is a movable cross-section through a hillside and stream. On the surface the learner sees puddles, banks, and vegetation. In the section they see soil wetting, retained moisture, recharge, and exchange with the stream. A click at any point should connect the scene to its local measurements and a sentence explaining the current process.

Build excitement through events that reveal causes: a depression first fills and then spills; a stream continues flowing after rain stops; a dry layer consumes falling rain; snow delays the peak flow. Add optional sound for rain intensity and rising water, with equivalent visible information. Cinematic camera movement, thunder, flashing effects, and dense particles should remain optional.

For implementation, favor reusable materials, instancing, bounded particle pools, lower-cost cloud representations, and quality settings established on representative school devices. Physics must produce identical results at every graphics quality. Do not begin with expensive volumetric clouds or full fluid dynamics; first make terrain, water depth, wetness, labels, and flow direction consistent.

## 4. Water Worlds: the complementary open-ended simulation

**Recommended first experience:** open a small valley containing a stream, a permeable hillside, a paved area, and one shallow depression. The learner starts rain, sees where water accumulates, changes one area, then replays the identical storm. A “Follow this water” action connects a selected location to an appropriate parcel explanation.

The sandbox should invite meaningful actions:

- Paint a bounded area as permeable ground, vegetation, or paving, with keyboard and numeric alternatives.
- Change rainfall intensity and duration separately, or replay a recorded storm forcing.
- Change initial soil wetness and inspect the resulting response.
- Add or resize a simple retention basin and observe filling, overflow, and drainage.
- Place rain, soil-moisture, and stream gauges; move them without altering the water.
- Pause, step, accelerate time, save an initial state, branch an experiment, and compare runs.
- Follow a representative tracer, then return to the same map, time, and selected location.

Terrain sculpting is attractive, but should follow a working flow model. It introduces drainage changes, closed depressions, water displaced by edits, and new numerical failure cases. Start with a few validated terrains and surface-material editing. Introduce sculpting only when the simulation can conserve existing water through an edit and explain where displaced water goes.

**Open-endedness should include support.** Offer “Explore freely,” “Try a question,” and “Build a fair test” as different ways to enter the same model. Give immediate feedback and meaningful defaults, with optional hints. PhET's implicit-scaffolding framework supports designing guidance into controls, constraints, and feedback; its cited paper provides a design framework and case-study evidence, not proof that this particular water sandbox will improve learning.[^6]

Keep beginner experimentation one click away. Saving a prediction should support learning, while free exploration should not require filling out a worksheet. When a learner changes several inputs, preserve the run and label it exploratory. Offer to construct a controlled comparison instead of treating curiosity as an error.

### Model choice and physical scope

| Approach | Advantages | Main limitation | Recommendation |
|---|---|---|---|
| More procedural animation and indices | Fast extension of existing code | Limited conservation, storage, and emergent behavior | Use for explanations and previews |
| Connected storage compartments | Transparent, inexpensive, testable water accounting | Limited spatial detail | Build the conservation foundation here |
| Terrain grid plus soil/storage compartments | Visible drainage, local intervention, spatial rainfall, retained soil moisture | Requires stability controls and consistent terrain/data mapping | Target architecture for Water Worlds |
| Full 3D fluid and atmospheric solver | Rich detailed flow under suitable conditions | High computational and validation cost; complexity can obscure learning | Defer unless a specific learning question requires it |

The recommended engine is a **spatial, process-based teaching model**. Avoid presenting it as a fully resolved physical simulation or a calibrated flood forecast. Use conservation laws where appropriate and clearly documented approximations for unresolved processes. USACE's soil-moisture-accounting documentation offers a useful precedent for organizing stores and transfers, while also stressing calibration and distinguishing conceptual subsurface layers from aquifer hydraulics.[^7]

Start with surface water, soil water, interception storage, simple delayed subsurface storage, and routed channel water. Add snow water equivalent next. Each location has elevation, area, soil capacity, infiltration parameters, and cover. Weather supplies precipitation and evaporative demand. Flow is governed by local state and terrain, rather than a preselected route outcome.

For each store, use the same bookkeeping rule:

`next storage = current storage + incoming volume − outgoing volume`

Across the whole modeled domain:

`change in total water = precipitation + boundary inflow − evapotranspiration − boundary outflow − explicitly exported water`

Transfers between stores cancel internally. The same infiltrated volume must leave surface storage and enter soil storage. Snowmelt must leave snow storage and enter surface water. Water retained at the end of the lesson remains accounted for. Use physical units internally, such as metres, seconds, and cubic metres, with student-facing millimetres, litres, and readable times where useful.

Prevent negative storage by limiting the combined outgoing transfers to available water. Route surface water using water-surface elevation and connectivity, with explicit treatment of depressions and outlets. Make infiltration depend on available surface water, material properties, and evolving soil state. Treat evaporation and transpiration as limited by both water availability and the adopted energy/demand approximation. Let delayed drainage sustain flow after rain stops.

The first version should use prescribed weather as a boundary condition. Evaporated water leaves the local domain; it should not automatically reappear as rain over the same valley. A later atmospheric layer can represent external moisture supply, advection, condensation, and precipitation with its own budget. A regional landscape is an open system even though Earth's water cycle connects globally.[^8]

Groundwater deserves particular care. A delayed storage bucket can teach retention and baseflow, but it cannot justify realistic pumping cones, groundwater maps, or site-specific well predictions. Add those only with an appropriate head/storage model and validation. Identify which subsurface picture is a schematic and which quantities the engine actually calculates.

### Connection to the current modes

Use a versioned experiment record containing initial state, terrain identity, model version, weather forcing, random seed where used, learner interventions, simulation time, measurements, and explanations. Views should read that record rather than invent their own quantities.

Explore supplies the system overview. Storm Lab supplies an explicitly specified storm, with physical rainfall settings added rather than silently converting its current 0–100 index into mm/hour. Be the Water can follow an observational tracer sampled from actual modeled transfers. Steward can launch physical trials of interventions while keeping social support, funding, and ecological judgments distinct from measured water volumes.

Retain the existing guided journey's authored progression. Label a guided demonstration, an exploratory run, and a controlled comparison according to what each actually supports. Earlier notebooks should remain readable with their original model version; old scores must never be relabeled as new physical measurements.

## 5. A learning progression that changes the task, not just the vocabulary

The tool already changes explanations and quizzes across K–2, 3–5, 6–8, and 9–12. Expand this into different representations, control sets, investigative goals, and forms of expression. Treat levels as adjustable supports rather than fixed judgments about a learner's ability.[^L3]

| Level | Learner question | Interaction and evidence | Successful reasoning |
|---|---|---|---|
| Notice, commonly K–2 | “Where did the puddle water go?” | Rain/sun controls; pauseable before/after pictures; point, speak, draw, or choose a picture | Water can change form and location; disappearance from view does not mean destruction |
| Explain, commonly grades 3–5 | “Why does water gather here?” | Two ground surfaces; simple flow arrows; a labeled storage picture and one comparison | Connect surface/soil/plant differences to observed pathways |
| Investigate, commonly grades 6–8 | “Why did this storm make more runoff?” | Same-weather replay; initial wetness; soil/stream gauges; water budget and explanatory model | Isolate a variable, connect matter and energy, use evidence, and recognize model limits |
| Model, commonly grades 9–12 | “Which design works under several storms, and why?” | Time-series data, parameter sensitivity, competing objectives, explicit uncertainty | Quantify tradeoffs, revise a model, and test whether a conclusion transfers |
| Extend, advanced learners | “Which assumptions change the conclusion?” | Alternative parameterizations, finer timesteps, documented reference data, optional equations | Distinguish numerical error, parameter uncertainty, and structural model limitations |

For upper elementary work, a relevant NGSS anchor is modeling interactions among Earth's systems in 5-ESS2-1. At middle school, MS-ESS2-4 explicitly connects multiple water pathways to solar energy and gravity; quantitative latent-heat calculations are outside its assessment boundary. At high school, HS-ESS3-4 fits evaluating and refining solutions to reduce human environmental impacts. HS-ESS2-5 is useful for selected water-property investigations, but the sandbox alone would not demonstrate its full performance expectation.[^9][^10][^11][^12]

Build a reusable cycle of **predict → change → observe → explain → revise**. Keep a distinction between recording an observation and demonstrating understanding. The existing investigation already handles this responsibly: predictions are not graded for correctness, and completion does not certify mastery.[^L1]

A useful teacher rubric has four independent dimensions: causal explanation, quality of comparison, use of evidence, and recognition of limitations. For example, “the forest bar was lower” is an observation; “with the same storm and initial soil wetness, this configuration stored more water in soil and produced a smaller stream peak” is a stronger evidence-based explanation. The exact explanation must match the measurements actually produced.

Add transfer questions outside the practiced setup. After the paving comparison, ask whether the learner expects the same result with saturated soil or a longer storm. This tests reasoning beyond memorizing a preferred land cover. Do not score one intervention as universally best: objectives, available space, water demand, and environmental conditions can conflict.

## 6. Engagement, accessibility, and classroom use

Create a small library of phenomenon-based invitations:

| Invitation | Discovery | Main model dependency |
|---|---|---|
| “The second storm” | Earlier weather changes later flood response | Persistent soil and surface storage |
| “Rain that never arrives” | Precipitation can evaporate before reaching the ground | Vertical humidity and falling-water loss |
| “The stream after the storm” | Stored water continues feeding a stream | Delayed subsurface discharge |
| “Two ways to protect the playground” | Different designs have different peak-flow and storage effects | Spatial routing, finite retention, repeatable forcing |
| “The missing snow” | Timing of melt matters as well as total precipitation | Snow storage and melt |
| “Where does the plant get its water?” | Interception, root uptake, and transpiration are distinct | Canopy and soil stores with uptake |

Support learner-authored questions beside these invitations. Reward noticing a surprising result, collecting usable evidence, revising a prediction, and explaining a limitation. Avoid requiring a fast lap, a dramatic flood, or a predetermined answer to earn access to the interesting science.

CAST UDL Guidelines 3.0 emphasizes agency, choice, relevance, joy/play, adjustable support, multiple representations, and varied ways to act and express learning. Apply those principles with specific alternatives: a stable overview camera, an observation mode, keyboard-accessible editing, selectable ground regions, a text event stream, accessible data tables, and diagram/audio responses alongside writing.[^13]

Reading support and conceptual depth should be separate settings. A high-school learner using read-aloud or simple text should retain advanced experiments. A young learner should be able to inspect a graph with support. Retain control over movement assistance, labels, pace, and learning pauses rather than bundling all support into one grade preset.

For reduced motion, stop camera drift and decorative movement while preserving access to simulation time through pause, step, and event summaries. CSS animation reduction alone cannot control all canvas/WebGL motion; acceptance checks should examine the actual scene. Offer independent audio and flashing-effect controls. Keep camera controls and core actions operable without precise dragging.

A lesson should fit several classroom patterns: a short teacher demonstration, a paired investigation with driver/observer roles, and a longer independent design challenge. Export the question, conditions, measurements, comparison, and explanation as one coherent notebook entry. Reuse the current evidence protections so later exploration does not rewrite a learner's earlier observation.

## 7. Implementation sequence and acceptance gates

These are relative priorities and effort judgments, not calendar estimates.

| Priority | Work package | Effort | Completion evidence |
|---|---|---|---|
| First | Repair the lapse-rate explanation and pilot precipitation identity; clarify scale and model boundaries | Small to medium | Reviewed text and transition behavior agree across views; targeted science tests updated to the intended scope |
| First | Specify shared quantities, units, experiment records, and the relation between guided and physical modes | Medium | A documented contract distinguishes indices, physical measurements, and illustrative time |
| Next | Build a pure conservation kernel with a small set of storage compartments | Medium | Analytic water-budget, nonnegative-storage, dry/wet, and timestep tests pass |
| Next | Deliver one spatial watershed, one editable cover property, gauges, and identical-storm replay | Large | A complete learner action produces a defensible visual change, chart, and saved comparison |
| Next | Unify terrain/material/label treatment and add a readable subsurface section | Medium to large | State-to-visual consistency checks and human visual review on desktop/tablet/phone |
| Then | Add level-specific investigation supports and teacher evidence review | Medium | Learners at different levels can complete and explain the same underlying phenomenon with suitable supports |
| Later | Add snowmelt, vegetation response, bounded terrain editing, and richer stewardship connections | Large | Each addition preserves conservation and demonstrates a distinct learning benefit |
| Defer | Full atmospheric coupling, detailed aquifer hydraulics, erosion morphology, pollutants, collaborative live worlds | Very large | Separate scientific scope and validation plan before each expansion |

The first release candidate should answer one question exceptionally well: **How do ground cover and earlier rainfall change where the next storm's water goes?** A limited but coherent sandbox will reveal whether the design is useful before expensive scene and physics systems multiply.

Architecturally, the source is approximately 30,238 lines and 2.40 MB. Physics kernels, rendering, educational content, styles, campaign logic, and notebook code share the file. Pure exported kernels and behavioral tests already provide good extraction seams. Move new work into focused modules with explicit inputs/outputs, then migrate existing logic incrementally. Preserve the source/public mirror through the repository's release process.[^L6]

Use a fixed simulation step with explicit numerical stability controls; render from simulation snapshots and interpolate visually if needed. Pause should stop model time. Replaying identical initial conditions and forcing should reproduce measurements regardless of camera, graphics quality, or animation frame rate. Store a simulation version with records to make later changes interpretable.

Important test cases include a sealed basin, a sloped impermeable plane, dry versus saturated soil under identical rainfall, retained water after rain, a draining store with a known solution, overflow through a defined outlet, snowmelt conservation, and controlled timestep refinement. A completely sealed diagnostic domain should retain total water apart from numerical roundoff. An open-domain case must explicitly account for inputs and outputs. Set numerical error tolerances from these cases rather than choosing a cosmetic percentage.

Test visual truth separately: a visible puddle must correspond to surface storage; a dry channel must not show active flow; the map and tracer must agree on surface identity; chart and scene must use the same time. Test malformed saves, interrupted experiments, restore, and old notebooks. For accessibility, include keyboard-only completion, reduced-motion scene behavior, zoom, text equivalents, and mobile editing—not just automated rule checks.

Finally, evaluate with students and teachers. Measure whether learners can state what they changed, locate the evidence, distinguish storage from movement, and apply the explanation to a new scenario. Observe confusion and abandonment as well as engagement. Compare the current guided investigation with the sandbox plus supports; do not assume that more freedom or richer graphics automatically produces better understanding.

## 8. Verification and limits of this review

The local source and desktop-public copy had identical SHA-256 hashes during inspection. No application source was changed for this analysis.

Five existing targeted suites exercised pilot physics, science content, land response, the connected investigation, and precipitation. The initial run passed 75 of 76 tests; one precipitation server-render test exceeded its 5-second timeout. Rerunning that suite with a 30-second allowance passed all 24 tests. Thus all 76 distinct targeted tests passed across the initial run and rerun; the original timeout remains evidence of test/runtime cost, not a proven behavior defect.

The existing browser investigation script passed its complete workflow, fair-test rejection/restoration, immutable evidence, export, mode persistence, desktop scene placement, narrow-screen overflow checks at 320/390px, and the accessibility checks implemented by that script. Its structural whole-surface check excludes color contrast; investigation-panel checks include contrast. This is not a blanket accessibility certification.

Fresh local captures were reviewed for the default map, guided 3D overview, and pilot starting scene. The 3D harness checked for live WebGL. These harnesses do not reproduce every production-host condition, and this review did not exhaustively inspect all storm states, all translations, all graphics devices, or every saved-data path. No performance benchmark or learner study was conducted.

The recommendation is therefore concrete but bounded: strengthen the science explanations, create a shared water-accounting foundation, and validate one open-ended watershed investigation before expanding into a much larger environmental simulation.

## Sources and implementation references

[^L1]: Local project, [Storm-to-stream investigation documentation](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/water-cycle-investigation.md>). Includes model boundaries and subsequent navigation, missions, comparison, and notebook refinements.
[^L2]: Local project, [land-response kernel](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:3908>) and [derived route shares](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:26945>). Default-index example calculated directly from this kernel.
[^L3]: Local project, [grade-band helper and explanations](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:11616>), [parcel temperature model](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:2789>), and [lapse-rate constants](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:2571>).
[^L4]: Local project, [phase transitions and land pathways](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:2890>), [pilot step](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:3076>), and [pilot behavioral tests](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/watercycle_pilot_kernel.test.js>).
[^L5]: Local captures generated with [3D scene harness](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/watercycle_3d_shots.mjs>) and [investigation browser QA](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/watercycle_investigation_qa.cjs>). See screenshots linked above and [pilot capture](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/water-cycle-deep-review/wc_piloting_review.png>).
[^L6]: Local project, [water-cycle source](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js>), [public mirror](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/desktop/web-app/public/stem_lab/stem_tool_watercycle.js>), [stewardship yearly updates](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:4672>), and [precipitation kernel](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_watercycle.js:2200>).
[^1]: NOAA National Weather Service, [Skew-T Parameters and Indices](https://www.weather.gov/source/zhu/ZHU_Training_Page/convective_parameters/skewt/skewtinfo.html), undated. Distinguishes environmental and parcel lapse rates; gives the dry adiabatic rate and notes variation in the moist rate.
[^2]: NOAA National Weather Service, [What is the Difference between Sleet, Freezing Rain, and Snow?](https://www.weather.gov/iwx/sleetvsfreezingrain), undated. Precipitation identity and thermal-path distinctions.
[^3]: NOAA National Weather Service, [Cloud Development](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm), undated. Used for fog, cloud droplets, condensation, and supercooled-liquid context.
[^4]: U.S. Geological Survey, [Infiltration and the Water Cycle](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle), Water Science School. Soil entry, storage, uptake, and recharge context.
[^5]: U.S. Geological Survey, [Evapotranspiration and the Water Cycle](https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle), Water Science School. Evaporation/transpiration controls and environmental context.
[^6]: Noah S. Podolefsky, Emily B. Moore, and Katherine K. Perkins, [Implicit scaffolding in interactive simulations: Design strategies to support multiple educational goals](https://arxiv.org/abs/1306.6544), 2013, revised 2014. [Full paper](https://arxiv.org/pdf/1306.6544). Used as a design framework, not a water-cycle intervention outcome study.
[^7]: U.S. Army Corps of Engineers, Hydrologic Engineering Center, [Soil Moisture Accounting Loss Model](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/canopy-surface-infiltration-and-runoff-volume/infiltration/soil-moisture-accounting-loss-model) and [Selecting a Loss Method](https://www.hec.usace.army.mil/confluence/hmsdocs/hmsum/4.14/subbasin-elements/selecting-a-loss-method?scroll-versions%3Aversion-name=4.13), HEC-HMS documentation. Conceptual storage/transfer organization, calibration needs, and subsurface-model boundaries. The proposed implementation is not HEC-HMS.
[^8]: U.S. Geological Survey, [Water cycle](https://www.usgs.gov/special-topics/water-science-school/water-cycle) and [Water Pools and Fluxes Data Tables](https://www.usgs.gov/water-science-school/science/water-pools-and-fluxes-data-tables), the latter published October 5, 2022. Storage, movement, human influence, and scale context.
[^9]: Next Generation Science Standards, [5-ESS2-1: Earth's Systems](https://www.nextgenscience.org/pe/5-ess2-1-earths-systems). Upper-elementary system-interaction and modeling anchor.
[^10]: Next Generation Science Standards, [MS-ESS2-4: Earth's Systems](https://www.nextgenscience.org/pe/ms-ess2-4-earths-systems). Water pathways, sunlight, gravity, modeling, and assessment boundary.
[^11]: Next Generation Science Standards, [HS-ESS3-4: Earth and Human Activity](https://www.nextgenscience.org/pe/hs-ess3-4-earth-and-human-activity). Environmental-solution evaluation and refinement.
[^12]: Next Generation Science Standards, [HS-ESS2-5: Earth's Systems](https://www.nextgenscience.org/pe/hs-ess2-5-earths-systems). Water properties and investigation scope.
[^13]: CAST, [Universal Design for Learning Guidelines 3.0](https://udlguidelines.cast.org/), 2024. Agency, engagement, representation, and action/expression framework. Specific interface proposals in this report are design recommendations.
