# Pass thirteen environment: readable stone surfaces

Status: root integrated both guarded patches. The initial field was rejected for a repeating weave, then `refine-rock-surface.cjs` replaced only its exact shader helper. Root owns mirrors, the final unit/GPU checks and final visual review. This agent changed only the two guarded scripts, this note and `tests/cephalopodlab_rock_surface.test.js`.

## Finding

Reviewed `commonOcto-reef.png`, `cuttlefish-reef.png` and `kelp-detail.png` from pass twelve against the current canonical implementation. The foreground boulders occupy a substantial part of the reef views, but their rounded surfaces still read as smooth clay. Their existing color mottling is faint and somewhat regular. This is a distinct remaining material issue after the recent plant and particle work.

The new `initial-reef-rock-detail.png` confirms this at the actual seeded nearest rock: the green face has a regular grid-like grain, while the adjacent brown face remains very smooth. The camera retains the existing lights and fog. It is a useful matched view for evaluating restraint and removing that regular grain.

The first post-patch close-up, retained as `initial-periodic-reef-rock.png`, did not meet that aim: the lower green face displayed clearly regular bands and a woven appearance. Root and this agent rejected it. Passing shader/bounds checks did not establish visual quality.

The current `reefSurface(shader)` hook in `stem_lab/stem_tool_cephalopodlab.js` modulates only albedo with products of sine waves. It is shared by rock and coral materials. The fine pore term has no screen-space filtering; neither normals nor roughness receive surface detail. By contrast, the sand shader already has world-anchored ripples, normal shading and derivative filtering. Coral already has three procedural growth forms with rounded tips and vertex shading. Reworking the floor or coral again is lower priority than improving rock response to the existing light.

Source anchors: `reefSurface`, `rockMesh.material.onBeforeCompile=reefSurface`, `coral.material.onBeforeCompile=reefSurface`, `floor.material.onBeforeCompile`, `detectSubstrate` and `SUBSTRATE_COLORS`. These are more stable than line numbers across concurrent model edits.

## Implemented patch scope

`shadeCLHuntRockSurface` gives rocks their own material hook while retaining coral's exact current hook. The refinement replaces the sine phases with two smooth 3D value-noise samples, one coarse and one fine, offset in local rock coordinates. Each interpolates eight lattice corners with cubic weights. Sequential nonlinear axis mixing avoids the short diagonal repeats of a single linear XYZ residue. The same bounded fields vary albedo and effective roughness, with shallow surface-gradient normal detail so the existing light reveals texture.

Both scales fade according to their screen footprint in noise-cell units, using derivatives. Tangent normal slope remains capped at 0.12 (under 6.85 degrees of deflection), effective roughness at 0.86–0.98, and the color multiplier at 0.817–0.983. These are artistic tuning bounds, not measured geology. The original base color and roughness property remain unchanged. Final strength must be judged in matching close and ordinary gameplay views.

The bump basis uses view-space surface derivatives rather than an untransformed local normal, accounting for existing rotations and nonuniform scaling. Degenerate derivative frames retain the original normal. Raw fields are differentiated before applying footprint weights, avoiding undefined nested derivatives. WebGL2 or `OES_standard_derivatives` enables the hook and the stable cache key `cl-rock-surface-v1`; unsupported WebGL1 retains `reefSurface`. There is no time uniform, new animation, texture, geometry, light, render pass or draw call.

The bounded hash avoids a large sine/fract multiplier: integer intermediates remain below 2048 over actual rock inputs. Cost is two fixed noise evaluations, 16 corner hashes and 112 scalar modulo operations before compiler optimization; no octaves, trig calls or texture fetches. This is more arithmetic than the rejected sine field and requires the planned low/balanced GPU checks. No performance gain is claimed.

## Preservation boundaries

- Keep rock vertex/index/normal buffers, transforms, count, generated colors, material base color, roughness property and shadow meshes unchanged. The fragment shader may vary the effective roughness locally.
- Keep all spawn, recycling and terrain-grounding code, random draws, substrate tags/radii and reef footprint data unchanged. Do not add shader randomness that consumes the simulation RNG.
- Leave sand, caustics, coral, plants, particles and fog/light settings untouched. Keeping coral separate avoids excessive grain on thin branching tips.
- Cover/collision uses actual rock geometry, which this proposal does not change. `detectSubstrate` uses fixed `SUBSTRATE_COLORS` selected by XZ distances and radii, so material-only grain does not change camouflage.
- Existing inspection hiding/restoration must keep working with the same material instances. No new resource-disposal path is required beyond the renderer's normal shader-program ownership.

## Validation and remaining review

1. The initial guarded dry run passed against the actual bundled r128 shader chunks. Old and candidate construction produced the same 44 rocks and 354 seeded random draws, with identical complete position/normal/UV/index arrays, transforms, base colors, roughness properties, shadows and substrate metadata. Reversing only the helper insertion and material wiring restored every remaining source byte. The script repeats these checks at application and prints SHA-256 evidence.
2. Four focused units cover actual r128 hook transformation, production scalar GLSL hash/interpolation/field/filter response, bounded slope response, and WebGL2/derivative-WebGL1/fallback-WebGL1 construction. The revised checks include independent integer references, bounded intermediate arithmetic, continuity across lattice faces and rejection of short diagonal repeat vectors. A separate pre-integration execution of the actual candidate scalar functions passed: 75 distinct lattice values, 38/39/39 changed samples out of 41 for the three tested shifts, and maximum boundary difference 3.98e-10. Root will run the updated full unit file after refinement. Scalar checks do not substitute for vector shader execution or visual review.
3. The browser agent's low/balanced cases audit native submitted programs, compile/link success, the normal matrix, stable actual resources/buffers/metadata and teardown. Its rock assumptions were reviewed against the final script. Root owns execution. No distinct existing rock-cover browser case has been run or claimed; byte-identical gameplay source and construction comparisons establish the preservation boundary.
4. Root will compare ordinary reef and oblique near-rock captures with the same existing rock, camera, lights and fog. Review lit and shaded faces for restrained texture, no grid pattern, harsh cracks, sparkle or new dark seams. Still captures alone cannot establish temporal shimmer behavior.

The refinement dry run and root application passed against the current eye-plus-rock source and bundled r128 shader. Reversing its exact helper replacement restores every other source byte, including material wiring, the derivative fallback, geometry and all gameplay code. The rejected capture is preserved for comparison.

If matching captures do not show a useful improvement, reduce or reject the material change rather than expand into geometry, lighting or postprocessing. This pass complements the model-eye work without changing scene composition or game rules.

Final root review: the lattice-noise rock detail was accepted in the matching camera/identity fixture; the woven material was rejected and retained as local initial evidence. All four final material units and both low/balanced real-browser cases passed, including native shader compile/link, nonzero finite normal matrices, static resources and disposal. The normal phone and six model inspection captures were also accepted. Still images and these functional checks do not constitute a frame-rate or temporal-shimmer benchmark.
