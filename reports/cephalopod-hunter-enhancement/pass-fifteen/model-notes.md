# Nautilus shell — pass fifteen

The previous shell was a flattened sphere with 26 thin raised brown tubes. In the existing inspection image those tubes read as spokes or shell ribs. This pass replaces only the `if(nautilus)` shell construction block in `createCLHuntAnimal`.

The new external shell has a smooth bilateral envelope, a shallow center depression and restrained involute relief. A real lower/front opening connects to a thin unbanded lip and a recessed inner shell wall. Broad brown pigment bands are fixed to the ivory outer surface. There are no exposed chamber septa, animated colors, textures, new assets or per-frame shell buffer updates. The preserved generic nautilus head, hood detail and filament arrangement remain illustrative limitations; this pass does not claim a specimen reconstruction.

Primary references: the [Monterey Bay Aquarium chambered nautilus account and photographs](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/chambered-nautilus) show the external striped shell and hood-covered opening. [Smithsonian's primary research record on irregular shell formation](https://profiles.si.edu/display/sro_121043) distinguishes normally smooth wild shells from abnormal rough deposition in captivity. These support smooth shell and fixed pigment, not raised spoke geometry. Shape proportions and band arrangement here are illustrative, not measurements of a particular animal.

## Ownership and rendering cost

| Shell only | Previous | Candidate |
| --- | ---: | ---: |
| Meshes / geometries | 27 / 27 | 3 / 3 |
| Materials | 2 | 2 |
| Vertices | 3,139 | 2,550 |
| Triangles | 5,072 | 4,800 |
| Local bounds X / Y / Z | .64596 / 1.49400 / 1.48311 | .64707 / 1.43477 / 1.43089 |

Every axis stays within 5% of the previous shell envelope. Three independently owned static meshes are named `cl-shell-outer`, `cl-shell-lip`, and `cl-shell-interior` below the existing identity-transform `cl-shell` group. The outer material is `cl-nautilus-shell-material`, with cache key `cl-nautilus-shell-v15`; the lip and interior share `cl-nautilus-shell-inner-material`. Both are opaque standard materials with no maps. Existing traversal-based disposal owns all three geometries and both materials. The hidden mantle and all 90 filaments remain unchanged.

The outer shader adds one three-float varying, `clShellPos`, and no uniforms. It uses a fixed angular band expression rather than noise or clock inputs. The central angle is guarded against `atan(0,0)`. The band edge uses `fwidth(clShellWave)` only when the actual renderer reports WebGL2 or `OES_standard_derivatives`; unsupported/no-renderer contexts use a fixed soft edge. The bundled r128 standard/physical program already requests the supported derivative extension. Lip and interior use the unmodified standard shader, so pigment does not appear inside the opening. Linear color conversion is explicit.

## Geometry and preservation checks

The aperture plane has unit normal `(0, -.7, sqrt(.51))`, centered on `(0, .35, -.30)`, at local signed distance `.73 * .49`. The entire unchanged head is in front of that plane throughout 17 samples of the existing `[-.04, +.04]` shell rocking range. The measured minimum head clearance is .0245743 units; the regression requires more than .005. Side and front-quarter sightlines to both irises and pupils remain unobstructed by the shell at every sample. A ray through the mouth hits the far internal wall after more than 1.5 units; no disk seals the aperture. The lip's two boundary loops match the actual external/internal mesh vertices exactly.

The candidate audit compares all twelve actual bundled-Three rigs over four animation states. It protects complete geometry/material/shader records for the other eleven species and every non-shell nautilus mesh. All 48 comparisons passed. No dive RNG is called by the new geometry or shader construction. `cl-shell` anchoring and the external scene-loop rocking expression are unchanged; movement, depth, collision, feeding, labels, camera fitting, and translation wrappers are outside the patch.

Six focused CPU tests cover finite unit normals and triangle winding; bilateral geometry and welded lip boundaries; actual aperture ray and head/eye clearance; real bundled-shader injection and unsupported derivative fallback; stable buffers/material ownership; and the 48 protected rig states. The initial run exposed two test-harness assumptions (a non-exported tentacle field and whitespace in the source motion check), which were corrected. The final candidate, including the central-angle guard, passed 6/6 in `shell-unit-candidate.log`.

The four older anatomy/surface suites now exclude only descendants of `cl-shell` when checking nautilus parity. Their non-shell expected hashes were captured from the original sphere/tube source, and each old full-shell hash was verified before replacement. Every other expected species hash is unchanged. This is a narrow intentional baseline migration, not acceptance of unrelated anatomy changes.

## Integration and visual review

`apply-nautilus-shell.cjs --check` validates without changing production. The default command applies its single exact shell-block guard; the integrator synchronizes mirrors. `--candidate` writes an ignored candidate file only. The focused test can read that candidate with `CEPHALOPOD_MODEL_SOURCE`; its ordinary default reads the canonical source.

Integrated in all four runtime copies. All six shell CPU cases and the wider 61-case batch pass. Five serial browser cases pass without retries, including native low/balanced shell shader linking, phone fit, inspection, reduced motion, plant uploads and cleanup. Five final nautilus views were accepted from both sides and the opening, including phone framing. The smooth shell has painted bands and an unbanded recessed aperture; the preserved head remains readable. These checks do not establish temporal shimmer or FPS.

## Focused pigment refinement after image review

The integrated shell passed the root's 61 CPU and five native-browser cases. Independent comparison of `nautilus-three-quarter.png` and `nautilus-shell-side.png` with `initial-nautilus-three-quarter.png` confirmed that the raised spokes were gone and smooth highlights read as one shell. The unchanged head and eyes were unobstructed. However, nearly straight painted wedges fading at one common radius still created a pinwheel appearance, so the outer pigment received a further bounded refinement before visual acceptance.

`refine-shell-pigment.cjs` changes only the outer material's existing color-fragment statement. Its moderate curvature grows toward the inner shell; band width and inner termination vary smoothly with integer angular harmonics. A smaller pale center remains, with staggered pigment tips instead of a synchronized circular fade. The brown/ivory colors and contrast are unchanged. This is an illustrative interpretation of natural pigment irregularity, not a measured individual shell pattern. It adds four scalar sine evaluations to the outer fragment expression, with no fine noise, textures, uniforms, varyings, buffers, geometry or material changes. The original derivative filtering/fallback, finite center-angle guard and cache key remain exact. Lip and interior remain unbanded.

The refinement guard checks the exact integrated statement and cache identity, parses the candidate, and reverses the replacement to prove every original source byte is recovered. `--candidate` writes `pigment-candidate.generated.cjs` without editing production; `--check` only validates. The integrator can apply the default command and synchronize mirrors.

The focused shader unit now executes the actual scalar expressions to verify finite bounded pigment values, periodicity at the angular seam, a clear center, varied inner endpoints, and moderate curvature that vanishes at the outer edge. The same six-case suite also retains geometry, head/eye clearance, ownership and all protected-species checks. The first candidate run passed five cases but the unchanged 48-snapshot parity audit exceeded the default five-second timeout on a busy host; there was no failed geometry/hash assertion. That one expensive case now has an explicit 30-second timeout, with every assertion preserved. The serial rerun passed 6/6 in 4.16 seconds overall (`pigment-unit-candidate-retest.log`); the initial log is retained. After integration, both native low/balanced shell/plant cases passed again with the final pigment shader. Final lit screenshots from both sides and the front opening were accepted.
