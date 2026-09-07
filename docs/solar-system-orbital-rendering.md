# Solar System orbital rendering

The 3D orbital view uses the campaign's existing planet positions, axial tilts, and compressed distances. The September 2026 visual update adds sun-facing atmospheric limbs, radial ringlet textures, planetary shadows on rings, Earth land/ocean roughness separation and filamentary clouds, and sphere-based solar limb shading.

Atmospheric shells depend on the view and Sun directions. Mercury has no atmospheric shell. Shell thicknesses, opacity, exposure, cloud patterns, and ringlet contrast are illustrative; this is not a radiative-transfer model or a live observation. NASA's [Earth atmosphere image](https://science.nasa.gov/earth/earth-observatory/the-top-of-the-atmosphere-7373/) illustrates the blue atmospheric limb.

The ring shader traces toward the scene Sun in each ring mesh's local space and tests intersection with the planet's sphere before its inherited transforms. Edge softness is illustrative, and the Sun is treated as a point source. This produces the planet's shadow on its rings; it does not calculate the rings' shadows on the planet. Saturn uses one ring system with open major gaps, removing the old overlapping textured layer. NASA's [Cassini shadow image](https://science.nasa.gov/photojournal/short-shadow/) shows how the ring shadow changes with illumination geometry.

Sunlit, Crescent, and Above Orbit controls change the observing camera without advancing time. Above Orbit is a view above the system's reference plane, not an alignment with every planet's spin pole. Focus framing accounts for the viewport's narrower field of view and the outer rings. Reduced-motion mode applies camera transitions immediately.

Textures are created once during scene initialization. Ring detail uses mipmapped strips instead of extra geometry. No additional shadow-map passes are used. Teardown disposes material maps and shader-uniform textures once, including shared resources. Browser coverage exercises real shader compilation, world selection, camera presets, phone layout, paused orbital positions, and texture disposal.

## Drone geology pass

Rocky drone scenes now use world-space color variation, slope-sensitive surface treatments, and distinct ochre, regolith, volcanic-rock, and ice palettes. A subset of Mars's existing boulders has stronger illustrative bedding. Fine bump relief is kept small enough to avoid coarse, block-like highlights. The terrain's vertex heights, slope queries, collectible identities, and rover collision model are unchanged.

A single instanced mesh adds 720 shallow surface fragments (320 on the existing low-power hardware tier). Placement and color are seeded. Fragments follow the same terrain-height sampler, remain static, and do not become new obstacles or samples. They receive existing shadows but do not add tiny-object shadow passes. Added materials and instance geometry are explicitly released at teardown.

The camera toolbar labels these surfaces as illustrations. Appearance alone does not determine mineral composition or establish past water. [NASA/JPL's Mars rock imagery](https://www.jpl.nasa.gov/news/mars-rover-views-spectacular-layered-rock-formations/) shows layered formations with different depositional histories. [NASA's Pluto mountain image](https://science.nasa.gov/photojournal/the-icy-mountains-of-pluto/) describes water-ice bedrock and the different roles of nitrogen and methane ice. These are visual references, not reconstructions of measured landing sites.

## Drone vehicle pass

Surface rovers now have a narrower chassis and solar deck, visible wheel grousers, rim and hub details, segmented photovoltaic cells, radiator strips, insulated instrument boxes, and stereo camera optics. Treads and hubs attach to each existing moving wheel. Local axle rotation is applied before the wheel's sideways orientation, preventing the wheels from wobbling as they roll. Terrain contacts, wheel radius, suspension travel, and driving forces retain their existing values.

The underwater ROV has open propeller ducts with mounting arms, protective skids, housing bands, and camera optics. A satin hull finish and a higher underwater bloom threshold preserve the painted hull and instrument detail. Propellers rotate in response to vehicle movement and remain still with reduced motion enabled. This is an illustrative motion cue, not a calibrated thrust or fluid-flow model. The atmospheric capsule has a lower heat shield, equatorial fittings, instrument ports, and thermal panels; these are original illustrative vehicles, not engineering reconstructions of a specific mission.

Manufactured details are merged once by material and moving parent to limit draw calls. The animation loop changes transforms without rebuilding vertex buffers. All added geometry and materials are released on scene teardown. Browser checks cover rolling axle orientation, moving propellers, reduced motion, shield placement, Pilot visibility, mobile framing, and one-time resource disposal. Actual Follow-view screenshots and separate neutral-lit model close-ups support visual review.
