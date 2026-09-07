# Kepler Colony — Centauri habitat integration

Updated 6 September 2026: Centauri is now the default setting for new Kepler Colony missions. Habitat Command is the primary view, with an animated system diagram, live campaign reserve forecasts, construction comparisons, and evidence-linked design notes saved to the science journal. Existing saved colonies retain their worlds. Solar System drone mode and Habitat Command offer navigation to each other.

The first integration uses the existing campaign game units and turn rules; it does not claim a calibrated habitat physics model. The detailed physical-model contract below remains a future development proposal. Centauri will grow inside Kepler Colony rather than become a separate tool.

The player arrives with a robotic expedition at a fictional rocky world in the Alpha Centauri system. Their first mission is to keep a small sealed research habitat operating through an energy shortage. Later missions ask whether a protected greenhouse, a larger settlement, or changes to the wider environment are supportable with the available resources.

Use a fictional planet with explicitly chosen conditions. Proxima Centauri belongs to the Alpha Centauri triple system, but Proxima b's atmosphere and surface conditions are not established. A habitable-zone orbit does not establish habitability. The star's flares make radiation and atmospheric escape useful investigation topics. [NASA system overview](https://science.nasa.gov/exoplanets/other-stars-other-worlds/our-nearest-celestial-neighbor-an-exotic-3-star-system/), [NASA flare observations](https://science.nasa.gov/universe/exoplanets/neighboring-stars-bad-behavior-large-and-frequent-flares/).

## Implemented 3D campaign view

Habitat Command now includes a Three.js colony diorama driven by the existing campaign state. Installed equipment appears at fixed engineering sites; operating equipment shows animated connections, and offline equipment stops its activity. Local trial beds illustrate changes in the campaign restoration score across turns. A turn-change readout reports the actual previous and current score. These visuals use game units and illustrative animation speeds; they do not calculate a planet's climate, atmosphere, radiation dose, or physical restoration timescale.

Overview, habitat, and engineering camera presets, keyboard-accessible rotation buttons, and a motion toggle support exploration without advancing the campaign. Reduced-motion preferences stop animated transitions. Rendering pauses offscreen, and scene resources are released when the tool closes. A collapsible 2D system diagram and the existing planning controls remain available if WebGL fails.

Six inspection cards connect solar arrays, water recovery, greenhouses, atmospheric processing, fusion, and shielding to primary scientific sources. Each card separates the underlying principle from resource constraints and speculative capabilities. Photovoltaics and water recovery have demonstrated engineering precedents; the compact fusion plant, planet-scale atmospheric processing, and luminous shielding field are explicitly limited or speculative. The field is not presented as protection against every radiation type or meteoroids.

Validation covers campaign-turn synchronization, installed versus operating equipment, camera controls without resource changes, reduced motion, phone sizing, offscreen rendering, scene disposal, WebGL fallback, and input normalization. The detailed physical model below remains proposed work.

## The first playable mission

A 15–20 minute investigation: establish a sealed outpost and keep its reserves stable for a simulated week. Pause time while the student plans. Provide three sites with different sunlight, access to ice, and shielding; show those tradeoffs before construction. No reflex or timed-reading requirements.

1. Scout with a rover. Survey sunlight and terrain, collect samples, and distinguish observations from scenario assumptions. New drone sampling gestures can carry over here.
2. Predict which resource will run out first. Choose power generation, battery capacity, water processing, and oxygen production within a fixed landed-mass budget.
3. Run one simulated day. Animated pipes, tank levels, battery charge, and heat flow all reflect the same numerical state. Click any reading to see its units, inputs, and calculation.
4. A scripted flare or power interruption tests the plan. Compare stored reserves, shielded locations, and reduced demand. Restart from the same seed to compare alternatives fairly.
5. Explain a design revision using a before/after graph. Success means a supported explanation and stable resource balances, including a justified decision that the current plan cannot work.

## Scientific basis and boundaries

| System | What the simulation should teach | Boundary shown to the learner |
|---|---|---|
| Power | Generation minus demand changes stored energy; batteries have capacity and losses. | Generator performance, sunlight, and landed equipment are scenario parameters. Interstellar transport is assumed. |
| Water | Recovery reduces losses; it does not create water. Track makeup supply, waste, and storage. | ISS recovery technology provides a real precedent, not proof of a fully self-sufficient colony. |
| Oxygen | Production consumes feedstock and energy; leaks and crew use draw down stores. | MOXIE demonstrated oxygen extraction from Martian CO2. It did not make Mars breathable. |
| Thermal control | Incoming heat, insulation, radiative losses, and equipment waste heat compete. | A small habitat energy balance is an educational approximation, not an exoplanet climate forecast. |
| Radiation | Exposure depends on the scenario's event, location, and shielding. | Use illustrative relative exposure initially; do not invent scientifically calibrated human dose or guaranteed magnetic protection. |
| Larger environmental changes | Material inventories, rates, escape, chemistry, and timescale matter together. | Planetary terraforming is speculative; feasibility cannot be inferred from a habitat success. |

MOXIE produced oxygen on Mars, providing a concrete technology demonstration for local resource use. [NASA MOXIE mission results](https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/).

NASA reported a 98% water-recovery milestone aboard the ISS, a useful comparison between high recycling efficiency and the remaining need to replace losses. [NASA water-recovery report](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/).

NASA-sponsored work found insufficient practically accessible CO2 for proposed Mars warming with present technology. This is a specific Mars result, not a proof about every alien planet; it demonstrates why inventory checks must come before a planet-wide transformation claim. [NASA terraforming assessment](https://www.nasa.gov/news-release/mars-terraforming-not-possible-using-present-day-technology/).

## Modeling contract

Start with a deterministic, separately testable resource engine. Use explicit hours, kW, kWh, kg, and kelvin. Every rate must have its unit and source or scenario label. Energy storage changes by (generation minus demand) × time, subject to charge/discharge limits; mass stores change by material inflows minus outflows. Track rejected energy, leaked gas, and discarded water rather than silently destroying an imbalance. If a resource reaches zero within a timestep, shorten the step or proportionally limit production, rather than producing free output by clamping a negative balance afterward.

Maintain three visible labels: observed fact, model assumption, and speculative technology. Planet parameters are assumptions unless supported by observations. Predictions, runs, evidence snapshots, and written revisions belong in a dedicated journal with independent save state. Keep the existing Solar System tool as the observation-training experience; connect it to Kepler Colony without treating a Solar System specimen as a material inventory on an alien world.

Validate conservation, zero-input cases, capacity limits, time-step convergence, reproducible events, and save/load before adding cinematic complexity. Use reduced-motion alternatives, keyboard and touch controls, non-color status labels, optional narration, and a readable table alongside graphs.

## Expansion after the habitat works

Add a sealed greenhouse with food, nutrient, water, light, and oxygen/carbon balances; then compare settlements of different sizes. An optional terraforming sandbox can explore albedo, atmospheric inventory, and long timescales with explicit uncertainty. Separate settlement time in hours/days from planetary change in years or longer. Do not award a single unexplained “habitability score,” portray trees as an instant atmosphere generator, or invent life detection from a mineral sample.

Suggested first build: one fictional site region, one rover, four linked resource systems, one event, and one evidence-based debrief. This is sufficient to test whether the engineering decisions feel engaging before committing to a whole planet simulation.
