# Pass twenty: moon-jelly anatomy and translucency

The earlier moon-jelly uses a sphere cap rotated by π, a single additive torus and six straight cylinders. Its actual crown points below the opening despite the source comment. This pass gives the five existing ambient actors a shallow upward bell, four horseshoe organs, folded oral arms and fine marginal tentacles. The accepted reef, cephalopod models and gameplay remain outside this guarded visual patch.

## Anatomy and appearance

`createCLHuntMoonJellyVisual(THREE,index)` creates the same eight mesh slots, each with its own geometry and material. The first is a shallow 48-sided dome with ten radial profiles, a soft eight-lobed outer scallop and rolled edge. Its highest central vertex is +0.25 Y. The final inner edge is a circle at radius 0.438, Y −0.024; it opens downward and provides a shared attachment boundary. Decoded milky blue/white colors lighten toward a pale lavender rim.

One combined mesh contains four distinct, capped horseshoe tubes in four quadrants, twelve narrow radial canals and a small central mouth. Each horseshoe opens inward and has a real gap rather than a closed torus. Its subdued pink tone appears through the bell. The canals end at actual inner-rim samples; mouth corners anchor four oral arms. This internal geometry occupies the old torus mesh slot.

Four folded ribbons with lightly frilled edges form the oral arms beneath the mouth. They have unequal lengths and deterministic, curved silhouettes; the existing phase records animate their rotation around an attached root. Two additional mesh slots contain twelve short, fine, curved tentacles each around the margin. These 24 tentacles are an illustrative selection, not an exact count for a particular specimen. Their triangular cross sections and cap centers remain part of the same static buffers.

The anatomical reference is the [Australian Museum's Moon Jelly profile](https://australian.museum/learn/animals/jellyfish/moon-jelly/), verified during this pass. It describes a transparent bell, four pink horseshoe reproductive organs around the mouth, feeding structures at the four mouth corners and tentacles around the bell edge. The rig is a generalized illustrated Aurelia jelly, not a specimen reconstruction or a full anatomical simulation.

## Material and transparency limits

All eight materials use ordinary alpha blending, depth testing and `depthWrite:false`. Bell and oral-arm materials are standard lit materials with vertex colors, zero metalness and restrained roughness. Anatomy and fine marginal tentacles use ordinary Basic materials with vertex colors. Materials are independently owned across all mesh slots and all five actors. No texture, custom shader, material uniform, light, refraction or postprocessing pass is added.

The opaque depth behavior of other scenery remains available, while transparent body parts can show through the bell. The former additive neon ring is removed. This remains an ordinary transparent mesh approximation: the renderer sorts meshes rather than providing volumetric gel scattering or perfect sorting of all translucent triangles. Above, below, side and overlapping views require visual review; resource counts alone cannot establish their quality. No claim of physical transmission, temporal shimmer suppression or FPS is made.

## Pulse, attachment and resource ownership

`updateCLHuntMoonJellyVisual(ud,pulse,now)` preserves the original radial displacement formula, including its 0.18 amplitude and existing crown/rim weight. It writes into the existing bell position array, accumulates normals from the actual deformed indexed triangles in the existing normal array and normalizes them numerically. It allocates no vectors, arrays, geometry, material or other resources during a frame. The position and normal attributes retain their identity and use dynamic buffer hints. A fixed box expanded by 0.091 and its conservative sphere are computed only during construction.

Other geometry buffers stay static. The shared circular inner lip scales by `1 + (pulse − 0.5) × 0.18 / hypot(0.438, 0.024)`. The internal anatomy uses that uniform scale, so all twelve canal endpoints remain on the actual moving rim. Each oral root follows its corresponding real mouth corner at the same scale, and its wave rotates about that root. The two marginal bundles scale in X/Z and shift Y to the same lip; their existing wave phases rotate them about Y. Every cap-center root remains on the lip circle. The actual 48-edge polygon differs from the circle by its measurable sagitta, about one thousandth of a scene unit at the largest pulse; the tentacle's small physical thickness covers that facet-scale difference.

Inspection metadata records dome/rim ranges, crown and rim indices, four gonad ranges, twelve canal tip pairs, four mouth corners and 24 actual tentacle root cap indices. It also records which mouth corner each oral root follows. These are construction-time records used to verify actual geometry rather than to drive gameplay.

The measured integrated budget is 1,721 vertices and 2,970 triangles per jelly, below the 2,500/3,500 ceiling: bell 481/912, anatomy 392/618, four oral arms 92/144 each and two marginal bundles 240/432 each. All eight slots have one independently owned material and geometry. Root must measure integrated raw buffers; the additional base-position snapshot is CPU state rather than another GPU geometry. Scene cleanup continues to traverse and dispose each mesh's own resources once. No resources are shared with a neighboring jelly.

## Preserved behavior and guards

`apply-jelly-finish.cjs` guards the exact original construction and the two existing visual update blocks, then proves that reversing those replacements recovers every original source byte, including line endings and independently integrated streamed-den work. It checks the spawn/phase RNG lines in their original order. The helper itself never consumes dive RNG.

All five actors and all six tentacle phase records remain. Each constructor executes the original 13 random draws in order: six strand phases, X/Z/Y spawn, pulse phase, drift angle/speed and vertical phase. The actor positions, pulse-phase advance, drift, bob, subtle thrust, wrap draws and all ambient-only rules remain unchanged. The visual helper runs at the original pulse update location; its new attachment transforms replace only obsolete cylinder orientation and anchoring. No player, prey, predator or mission code is changed.

Pause and inspection still stop the original simulation block, freezing both pulse buffers and strand transforms. Existing reduced motion continues animating the jellies: this pass explicitly preserves that baseline behavior, even though other decorative systems have their own reduction rules. This is not an accessibility behavior change.

## Author and review status

The author wrote only the guarded patch script and this note, reviewed the proposed CPU geometry/attachment oracles read-only, and verified the museum reference. The author did not execute the script, change any runtime or mirror, run CPU/browser tests, launch a GPU process or change Git state. Root owns candidate generation, measured budgets, integration, focused geometry and native checks, matching captures and final visual acceptance. The unit and browser test author owns their files. Final validation results must be recorded after root checks complete.

## Final integrated validation

Root integrated all three exact guarded stages. Final 69 focused CPU cases and eleven native Chromium scenarios passed with no retries, skips or flaky results. Candidate checks passed moray/home 7, moon jelly 6 and streamed shelter 4. Root and independent review accepted thirteen unobscured fixed-world desktop/phone captures with exact seeded state/camera/spawn agreement. Only the capture pause veil was hidden; actors and scenery remain.

Measured moray: 1164 vertices, 1856 triangles, 53040 raw geometry bytes. One stone home: 880 / 400 / 34080. Each moon jelly: 1721 / 2970 / 79776. Streamed den: 565 / 302 / 20120. Existing mesh/material counts remain. The original moray fin-normal failure and capture-fixture rejections are retained in local evidence; their corrections and limits are recorded in validation-summary.json. All four runtimes match and protected AI, ink timing, mission rules and other model regions remain exact.
