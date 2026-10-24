# Raptor vision, animal scale, and shared simulation infrastructure

Research and design review, 21 October 2026. This review accompanies the shared asset catalog pilot. It does not change Raptor Lab's visuals, behavior, scientific content, or learning activities. Code locations below were inspected during the pilot; named functions provide stable search anchors if line numbers move.

## Recommendation

Preserve Raptor Lab's current scale and camera policy during the catalog migration. Keep anatomical asset units separate from each tool's presentation choices. Explore realistic-size animals and a more convincing distance-vision experience in a separate, opt-in observation prototype before changing live flight.

Enlarging prey was a defensible usability choice for a flight game viewed on ordinary screens. It also distorts proportions against terrain and vegetation. Camera zoom can help, but cannot replace that enlargement without changing awareness and handling.

## Current implementation

All Raptor references are in [stem_tool_raptorhunt.js](../stem_lab/stem_tool_raptorhunt.js).

| Code anchor | Current behavior |
| --- | --- |
| Prey spawning, lines 19861–19863 | `size = max(.75, sizeM × boost)`, where boost is 13 below .10 m and otherwise 9. |
| `buildSharedWoodlandPrey`, line 19397 | Preserves legacy species-specific folded-length multipliers after creating the shared anatomy. Default bill-to-tail extents are approximately 2.70 scene units for dove, 2.50 for jay, and 4.52 for grouse. |
| Spawning and `applySharedWoodlandPreyPose` | Geometry determines ground clearance; `visualSize` also affects stride and contact blending. Changing the final size is therefore not isolated from movement. |
| `acuityFov`, line 21481 | Existing species ordering selects a zoom field of 38°–22°. Ordinary flight uses 70°, with additional dive effects. |
| `updateFlightCamera` | Chase and first-person views have separate offsets, terrain clearance, damping, and assistance. |
| `preyAtScreenPoint`, line 21896 | Pointer selection already keeps a minimum 26 px radius independently of the visible silhouette. |
| `RAPTOR_FOCUS_SCALE`, line 1276 | A bounded close approach slows flight to .4 time, described as a stand-in for fast temporal vision. |
| `RaptorVisualAngleStudy`, line 10015 | Teaches visual-angle geometry and explicitly applies no species visibility threshold or retinal simulation. |

Perspective magnification is `tan(oldFov / 2) / tan(newFov / 2)`. Existing zoom therefore magnifies approximately 2.03–3.60 times. Compensating for a ninefold reduction in target size from a 70° view would require about **8.90° FOV**; thirteenfold compensation requires **6.17°**. These calculations describe centered targets at unchanged distance, not animal visual acuity.

Such narrow views make navigation and surrounding threats harder to see. Moving the camera closer instead changes perspective, parallax, occlusion, and its relationship to the raptor's position.

## Keep four concepts separate

1. **World geometry:** anatomical size, terrain-relative position, feet, clearances, and real or modeled distances.
2. **Camera optics:** field of view, projection, camera location, and magnified inspection windows.
3. **Interaction assistance:** generous pointer targets, strike tolerance, target selection, and instructional markers.
4. **Perception model:** spatial resolution, contrast, illumination, temporal resolution, and gaze direction.

A larger hit target need not mean a larger animal. A magnified view does not mean a different physical distance. A sharper rendering does not establish a species' detection threshold. Future changes should preserve these distinctions in code and explanations.

The catalog should declare units, orientation, origin, representative dimensions, dimensional definitions, and provenance. Distinguish measured values, sourced representative ranges, authored approximations, and unknown values. Existing woodland models declare metres, ground at y=0, and +Z forward, while describing their poses and cadences as illustrative in [avian_woodland_birds.js](../stem_lab/avian_woodland_birds.js). Their authored `profile.sizeM` is not automatically a validated specimen measurement.

A normalized asset should retain its native proportions. A host can apply an explicit presentation scale and preserve legacy behavior. During this pilot, that means retaining Raptor's exact existing transformation rather than rounding it to a newly chosen multiplier. Biological measurements, presentation scale, and collision assistance should remain separate metadata or policies.

## What vision research supports

Some raptors have exceptional distance resolution, but a universal “four to eight times human vision” multiplier is not supported by these experiments.

- Wedge-tailed eagle behavioral acuity reached **132–143 cycles/degree** under favorable conditions and declined as luminance decreased. This is evidence for that species and experiment, not a measured bald- or golden-eagle parameter. [Reymond, 1985](https://www.sciencedirect.com/science/article/pii/0042698985902263)
- Harris's hawks achieved approximately **39.5–62.3 cycles/degree** in high-contrast achromatic measurements, comparable to the human range discussed by the researchers. Their red–green spatial resolution was higher than reported human values, but contrast sensitivity was lower. Increasing both sharpness and contrast everywhere would misrepresent those findings. [Potier, Mitkus & Kelber, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6125913/)
- Experiments comparing Harris's hawks and black kites demonstrate species differences in acuity, head movements, and visual fields; they caution against generalizing from the unusually acute wedge-tailed eagle. [Potier et al., 2016](https://journals.biologists.com/jeb/article/219/17/2639/15414/Visual-abilities-in-two-raptors-with-different)
- Observations of several raptors found more sideways viewing of distant objects, consistent with using the deeper fovea, and more frontal viewing nearby. This supports exploring scanning and attention as well as detail resolution. [Tucker, 2000](https://pubmed.ncbi.nlm.nih.gov/11076738/)
- Temporal resolution is separate: tested flicker-fusion frequencies reached at least **129 Hz in peregrines**, **102 Hz in saker falcons**, and **81 Hz in Harris's hawks**. These measurements do not establish literal subjective slow motion. [Potier et al., 2020](https://portal.research.lu.se/sv/publications/how-fast-can-raptors-see/)
- Glowing ultraviolet prey trails should not be presented as established biology. Ocular-transmission and urine-reflectance measurements found the proposed UV hunting cue unlikely to be reliable. [Lind et al., 2013](https://portal.research.lu.se/en/publications/ultraviolet-sensitivity-and-colour-vision-in-raptor-foraging/)

The existing vision table around lines 2311–2317 assigns red-tail 4×, bald eagle 5×, and golden eagle 5.5×. Related values appear elsewhere in the tool. Preserve gameplay during this pilot, but **do not promote those values into shared scientific catalog facts**. They warrant a separate evidence and content review.

## Proposed observation prototype

Build an opt-in, paused **Find the distant detail** activity using the same scene for both conditions:

- Hold animal dimensions, distance, camera field, lighting, and occlusion fixed.
- Compare a clearly sourced species-specific approximation of spatial detail with a stated reference condition. Keep uncertain parameters explicit.
- Provide matched magnified inspection panels alongside wide context, labeling magnification as a display aid. Both conditions need the same presentation magnification.
- Let learners change distance and contrast, predict which detail remains distinguishable, then inspect the result.
- Distinguish detecting an object, identifying an animal, and resolving a pattern. Laboratory grating thresholds do not supply universal prey-detection distances.
- Retain keyboard interaction and reduced-motion support. Avoid automatic target revelation through obstacles.

Screen pixels and the human viewer limit the demonstration. Extra biological resolution cannot appear merely by changing a label; rendering and filtering need sufficient samples per represented degree. Present the result as an explanatory model, not an exact subjective animal view or a human acuity test.

Use the existing visual-angle activity as a foundation. Validate projection, filtering, fixed conditions, and learning-state isolation before considering live-flight integration. A later realistic-scale flight trial should separately check contacts, strikes, visibility, camera clearance, and mobile handling.

## Shared assets and shared physics

The catalog is a **shared simulation-asset library**, one possible layer of an engine. It does not require a new game engine. Three.js already supplies rendering infrastructure; tools retain their scientific models and interactions.

Shared physics is feasible as optional, explicit modules. Suitable first candidates are pure functions for unit conversion, visual-angle projection, geometric intersections, deterministic numerical integration, or drag calculations where two consumers genuinely share assumptions.

Raptor Lab uses realtime flight, bounded frame deltas, focus time scaling, aerodynamic approximations, and tuned assistance. Ecology uses modeled time, RK4 population integration, and recorded illustrative movement. One global clock, force solver, random generator, or collision world would not preserve those meanings automatically.

Start with one mathematical helper and two compatible consumers; require unchanged numerical results and histories. State units, assumptions, integration method, and valid inputs. Asset providers may expose anchors and suggested collision shapes, but should not automatically impose mass, forces, behavior, or lesson rules. A physics migration deserves its own regression boundary rather than being bundled into this catalog pilot.
