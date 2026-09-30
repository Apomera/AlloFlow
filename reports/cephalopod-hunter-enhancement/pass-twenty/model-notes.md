# Pass twenty: a recognizable moray predator

The original moray is a tapered cylinder, a low-segment sphere and two yellow spheres. The new candidate gives those four existing mesh slots a slender curved body and tail, a continuous low median fin, shaped upper and lower jaws around a recessed mouth, small gill openings and bilateral iris/pupil surfaces. Its existing predator logic remains outside the edit.

## Anatomy references and limits

The [Monterey Bay Aquarium's California moray account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/california-moray) describes a long, slim fish with brown or green coloration and no pectoral fins, pelvic fins or gill covers. The model follows that general silhouette and omits those paired fins. The [Florida Museum's green moray profile](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/) documents connected dorsal, caudal and anal fins, small gill openings and conspicuous oral teeth. Those features guide the static surface treatment here.

The simulator's predator remains a generalized moray. The subdued olive colors and broad tone variation are illustrative; they are not a measured species pattern. In particular, the green moray reference describes essentially uniform coloration, so this model's faint vertex mottling must not be presented as a diagnostic green moray marking. The six small visible teeth indicate dentition rather than reproducing exact tooth rows or pharyngeal jaws. No reference images are bundled.

The pose is static. It does not animate body undulation, jaw ventilation, independent eyes, gill pumping or fin waves. The existing whole-group translation, yaw and idle bob remain responsible for movement. The fixed open mouth should not imply a new aggression signal: the aquarium reference explains that morays open and close their mouths during respiration.

## Protected source contracts

The candidate replaces the exact construction block from `var moray` through its two eyes, immediately before the existing home-placement comment. `createCLHuntMorayGeometry(T, kind, side)` is inserted with that block. Its `body`, `head` and bilateral `eye` outputs are authored in a shared root frame facing local +Z, then converted into the four original child frames. A second independent exact guard covers the single home-marker construction described below.

The direct children remain body at index 0 with X rotation π/2, head at index 1 with Z position 1.55 and Z scale 1.3, and eyes at indices 2–3 with X positions ±0.18, Y 0.15 and Z 1.7. Their names become `cl-moray-body`, `cl-moray-head` and `cl-moray-eye-0/1`. The helper may move surface vertices inside those preserved frames to shape the anatomy; it does not change the original object transforms.

All home coordinates, group placement, `userData`, scene attachment, detection, home selection, pursuit, bite thresholds/damage, camouflage and ink responses, cooldowns, returning behavior and animation code remain byte-identical outside this construction edit. The animal factory, completed grouper, prey, environment, UI and all existing translation wrappers are protected by the full-source reverse proof. The helper makes no direct random calls.

## Actual surface construction and evidence

Body and head use one deterministic 24-column longitudinal skin grid. Both reproduce the neck ring at root Z 1.22 exactly. Skin normals come from the same full triangle set and are transformed correctly into each child's local frame, avoiding a shading break between the separately owned meshes. The body narrows into a modest lateral curve and a closed pointed tail. Its low median fin is one thin closed volume running along the back, around the tail tip and forward along the underside; it is merged into the original body mesh and retains the standard opaque front-face material.

The first root-executed candidate passed the resource guard and five of six anatomy cases. Its fin's small underside panel at the dorsal-to-tail bend shared shading vertices with much larger curved side panels; one actual underside triangle consequently received opposing smoothed normals. The author refinement separates static shading vertices for the rim, base and end caps while keeping every skin point, fin surface, neck and attachment position unchanged. It adds 100 vertices and 3,600 raw attribute bytes, with no additional triangles, draws, materials or runtime work. Attachment checks read the actual `finRootVertexIndices` rather than interpreting the added shading duplicates as new path samples; their real-triangle distance requirement remains unchanged. Root owns the corrected candidate's validation.

The mouth opening is geometric. Removed cheek cells join the open snout, and the helper derives their actual oriented boundary loop. The recessed wall starts at those same boundary vertices, contracts behind the lip and ends at a dark back point. Upper and lower tooth groups are merged into the head's geometry. The lower front lip projects slightly beyond the upper edge.

Each gill opening removes a small real skin-grid cell at root Z 1.39–1.33. Its boundary attaches to an inset wall and a dark interior, rather than covering intact skin with a dark disk. Each eye's curved iris and pupil use intersections with the actual remaining cheek triangles, with small separate relief heights. There is no yellow eye sphere, detached highlight mesh or reflection shader.

`geometry.userData.clMorayParts` exposes contiguous semantic vertex/index spans and triangle ranges. Body parts are `body-skin` and `continuous-median-fin`; head parts are `head-skin`, `mouth-recess`, `gill-right`, `gill-left`, `upper-teeth` and `lower-teeth`; eye parts are `iris` and `pupil`.

`clMorayGeometry` records the authored root frame, original anchor, rotation and scale. It also exposes the actual ordered neck vertex indices and root points, mouth boundary vertex indices and points, mouth back point, gill boundary indices and points, fin-root vertex pairs and root points, iris/pupil center vertex indices, eye center, and tooth-root points. These landmarks support checks against the real triangles. They are not additional gameplay collision volumes.

## Resources, guard and pending validation

The candidate keeps four opaque meshes, four independently owned geometries and four independently owned materials. Body and head remain `MeshStandardMaterial` at roughness 0.7/0.65; the two eyes remain `MeshBasicMaterial`. White material tint multiplies static linearized vertex colors. The geometry is indexed position/normal/color only, with final boxes and spheres. There are no textures, shader hooks, uniforms, new lights, dynamic attribute usage, geometry groups or per-frame surface updates. The approved ceilings are 1,800 vertices and 2,800 triangles for the whole predator. Root must establish actual counts before reporting them; triangle count alone does not establish a speed or FPS result.

`apply-moray-finish.cjs` embeds the exact original moray and home-marker constructions. It requires both blocks to be unique, inserts only their helpers and candidate constructions, parses the complete candidate, and requires reversing both edits to restore every original byte. Disjoint streamed-den edits are tolerated. `--check` evaluates geometry guards in memory; `--candidate` also writes an ignored candidate file; default invocation applies the same guarded edit to canonical source. Root owns all execution and integration.

The script's resource guard checks finite attributes, unit normals, nondegenerate triangle areas, bounds, no geometry groups and total vertex/triangle ceilings. Root-owned validation must additionally check real neck seams and transformed normals, fin attachment and continuity, mouth/gill aperture sightlines, tooth clearance, eye seating, preserved transforms and predator state, static resources and disposal. Fresh fixed desktop/phone views and native browser validation remain pending at author handoff. No tests, browser work, guard execution, runtime writes or mirror updates were performed by this author.

## Moray home crevice

Baseline captures show the original home marker as a large smooth pipe ring beside the animal. The second visual guard replaces that torus with five deterministic angular stones merged into its one existing mesh. The stones form a low rear and side collar with an open front facing +Z. They reuse the unchanged accepted den-rock geometry helper, with fixed variants, mineral vertex colors and correctly transformed normals. No new scene obstacles, physics surfaces, random calls, marker positions or gameplay state are added.

The marker remains at `(morayHome.x, 0.15, morayHome.z)` with X rotation π/2. The one mesh is named `cl-moray-home`; its one standard material is `cl-moray-home-material` with white tint, vertex colors and roughness 0.9. The accepted `shadeCLHuntRockSurface` callback and `cl-rock-surface-v1` cache key are reused when derivatives are supported; the existing `reefSurface` fallback remains. This is reuse of the existing rock finish, with its additional fragment work, rather than a new shader system.

`clMorayHomeParts` records the five contiguous stone spans. `clMorayHomeGeometry` records the authored marker-root frame, original rotation, fixed stone placements and open direction. Planned separate cost is 880 vertices, 400 triangles and 34,080 raw PNC/index bytes, within the 1,200/1,600 ceilings. The original torus used 153 vertices and 256 triangles. These counts must be confirmed by root execution and do not justify a frame-rate claim. The core moray remains four mesh/material slots; the marker remains one additional scene mesh/material slot as before.

## Final integrated validation

Root integrated all three exact guarded stages. Final 69 focused CPU cases and eleven native Chromium scenarios passed with no retries, skips or flaky results. Candidate checks passed moray/home 7, moon jelly 6 and streamed shelter 4. Root and independent review accepted thirteen unobscured fixed-world desktop/phone captures with exact seeded state/camera/spawn agreement. Only the capture pause veil was hidden; actors and scenery remain.

Measured moray: 1164 vertices, 1856 triangles, 53040 raw geometry bytes. One stone home: 880 / 400 / 34080. Each moon jelly: 1721 / 2970 / 79776. Streamed den: 565 / 302 / 20120. Existing mesh/material counts remain. The original moray fin-normal failure and capture-fixture rejections are retained in local evidence; their corrections and limits are recorded in validation-summary.json. All four runtimes match and protected AI, ink timing, mission rules and other model regions remain exact.
