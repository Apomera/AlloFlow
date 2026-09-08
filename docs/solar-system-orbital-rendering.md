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

## Underwater scenery pass

The ocean floor now uses smooth vertex normals, matte sand with tileable ripple detail, and a separate linear bump map. The reflectance texture uses sRGB encoding. Both maps are generated once. The flat additive caustic plane was removed: it intersected the uneven terrain and exposed large, jagged triangular boundaries.

An allocation-free triangle interpolation follows the existing seabed vertices, including the mesh's -25 vertical offset. This also works during initialization, when the previous raycast could see an unrotated world matrix. Coral bases, stones, kelp roots, and existing floor-anchored objects now use the rendered surface consistently. Terrain heights and the authored trench are unchanged.

Three shared coral geometries provide branching, fan-shaped, and mound silhouettes. Seeded clusters use 54 instances (30 on the low-power tier), plus 420 scattered stones (180 on low power), across four instanced meshes. Coral no longer carries decorative point lights. Kelp uses tapered, curved ribbons attached to the same rooted transform as its stalk; sway pivots around the base and is disabled by reduced motion. The scene's caption identifies the habitats, depths, and distances as a compressed illustration rather than a reconstruction of a real dive site.

The added and replaced scenery owns its geometry, materials, textures, and instance buffers explicitly. Teardown releases shared resources once. Real-WebGL coverage checks terrain contact against raycasts, finite vertices, unchanged buffers during movement, a descent toward the seabed, phone layout, reduced motion, and disposal.

## Sample survey gameplay

Rocky-world rovers and atmospheric probes can find up to three nearby authored sample markers within a 32-scene-unit radius. A terrain-following ribbon visualizes the rover survey; three orthogonal rings visualize the probe's survey volume. These are range indicators with illustrative animation timing, not a simulation of electromagnetic propagation or hidden-material detection. Reduced motion shows a stationary range outline and reveals contacts immediately. Surface geometry clips to the existing terrain bounds, and the same buffers are reused during a sweep.

The nearest contact is selected first. Next contact cycles available specimens; amber brackets identify the selected one, while cyan brackets mark other contacts. Guidance reports scene-model distance, direction relative to the camera heading, and relative height for atmospheric contacts. Collection uses the selected specimen when it is within the existing collection reach. Clearing the target restores nearest-specimen collection. Cancelling the collection preserves the specimen and its tracking target; completed collection uses the existing inventory and journal transaction.

Find samples performs the marker survey. G additionally retains the existing environment scan, predictions and evidence trail. Both share a five-second recharge based on elapsed time, so low frame rates do not extend the wait. Survey buffers and materials are explicitly released on teardown; no new sampling rewards or automatic vehicle movement are introduced.


### Orrery orbit rhythm

Selected worlds now have an orbit-plane diagram with twelve equal-time markers, two shaded T/12 sweeps (after perihelion and aphelion), and a live position marker. Both axes use the same distance scale; the Sun sits at the focus and eccentricity is preserved. Dense eccentric-anomaly samples keep the swept boundaries accurate even for Halley. Forward/back controls move one twelfth of the selected period from the live phase, pause the shared clock, and wrap within one cycle. The existing phase slider, comparison readings, and canvas use that same time.

The panel explains near-circular orbits, reports endpoint speeds, and links to NASA’s [Kepler laws explanation](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/). It identifies enlarged markers and the undated orbit-plane model. No new animation loop or decorative motion is introduced; the retained marker uses the existing throttled instrument updates. Geometry checks compare swept areas for circular through highly eccentric orbits; desktop and 320px browser checks cover keyboard stepping, landmark synchronization, playback, selection changes, and layout.


## Transfer rendezvous experiment

The Transfers section now models a circular, coplanar Sun-centered rendezvous instead of placing a stationary destination at the arrival point. The craft follows a half-ellipse using Kepler’s equation and both planets move with circular angular rates. Transfer duration and angular rates use the same gravitational parameter, so the planned departure phase brings the destination to the arrival endpoint. Inward routes rotate the ellipse and start at aphelion; outward routes start at perihelion. The same-planet case has no transfer duration or maneuvers.

Students can play a twelve-second illustration, pause, scrub, or jump to departure, midflight, and arrival. A launch-alignment offset changes the destination’s starting angle while retaining the transfer path, exposing the resulting separation at arrival. A dashed connector shows a miss; a static arrival ring marks positional rendezvous. Labels distinguish positional meeting from the velocity change still required to match the destination orbit. Reduced motion uses explicit slider/stage controls. The map uses the existing responsive CanvasPanel animation loop; no extra animation timer or GPU resource is introduced. Suspended-frame gaps do not advance playback, and changing the planet pair resets the local experiment.

The previous arrival-burn prose mixed heliocentric circularization with planetary capture. For this calculator’s Sun-centered circular-orbit model, both impulses increase speed on an outward transfer and both decrease speed on an inward transfer. Signed impulse values now retain that distinction while the budget reports magnitudes. The explanation explicitly excludes surface launch, planetary escape/capture, inclination changes, and corrections. See [Hohmann transfer derivation](https://orbital-mechanics.space/orbital-maneuvers/hohmann-transfer.html) and [NASA’s trajectory guide](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/). No dated ephemerides or actual launch windows are calculated.

Regression coverage checks all directed planet pairs, endpoint coincidence, correct impulse signs, a known Earth–Mars case, phase-offset separation, inward/outward geometry, same-planet handling, frame-rate independence, live playback, keyboard scrubbing, mobile layout, reduced motion, route resets, and existing transfer table semantics.
