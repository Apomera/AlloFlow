# Pass eighteen: crab prey silhouettes

The crabs retain the original low-detail body, six straight walking-leg cylinders, spherical eyes and blob claws. Hermits carry a sphere with three separate rings. This pass gives the existing actors a broad carapace, jointed tapered limbs, short eyestalks and open pincers; the carried shell has a body whorl, a recessed opening, a connected lip and a small tapered spire.

## Anatomy and illustrative limits

The [National Park Service's Dungeness crab account](https://home.nps.gov/articles/glba-dungeness-crabs.htm) describes four walking-leg pairs in addition to the pincers. The rock and red variants therefore show four pairs, with the additional pair merged into each existing last leg slot. [Singapore NParks' hermit identification](https://biodiversitysg.nparks.gov.sg/our-biodiversity/marine-invertebrates/marine-arthropods/hermit-crab/) identifies the long eyestalks and two front walking-leg pairs of hermits. The hermit variant shows two long pairs and smaller folded rear appendages. The [NPS striped hermit account](https://home.nps.gov/guis/learn/nature/hermitcrab.htm) explains their soft rear bodies, reduced rear legs and borrowed shells, and describes a species with equal-sized claws. This generalized model retains two comparably sized pincers.

These labels are gameplay variants, not identified crab species. The body outline, subtle lateral teeth, colors, proportions and shell relief are illustrative. The shell is a single fixed coiled form, without a species-specific gastropod identification or simulated shell growth, selection, chirality variation or withdrawal. No photographs or other remote assets are bundled.

The root-owned cephalopod animal factory is entirely protected. Its accepted eyes, shells, crowns, webbing, fins, suckers, camouflage shaders and animation remain unchanged. This model pass changes no prey strategy, targeting, reach, pursuit, capture, nutrition, score or shell-drop behavior.

## Static geometry contract

`createCLHuntCrabGeometry(T, kind, options)` is inserted immediately before the existing `spawnCrab` function. `kind` is `body`, `eye`, `leg`, `claw` or `shell`; options include `sm`, `type`, `side`, `row`, `piece` and `color`. The helper builds static indexed position, normal and color buffers in the crab's root frame, then converts those positions into each original child frame. All original translations, leg rotations, shell rotations and shell scale remain in the production spawn block.

The direct child contract remains body at index 0, eyes at 1–2, animated legs at 3–8, and claws at 9–10. Hermits retain four shell children at 11–14. The body, eyes, legs and claws now have descriptive `cl-crab-*` names. Hermit parts are named `cl-hermit-shell-outer`, `cl-hermit-shell-interior`, `cl-hermit-shell-lip` and `cl-hermit-shell-spire`.

Each geometry's `userData.clCrabParts` is an array of contiguous semantic indexed spans. Entries expose `name`, `vertexStart`, `vertexCount`, `indexStart`, `indexCount`, `triangleStart` and `triangleCount`. The companion `clCrabGeometry` records its kind, subtype, scale multiplier, side, row, shell piece, authored `crab-root` frame, original root anchor, rotations, scale and meaningful attachment/contact points. These points support checks against the actual mesh triangles; they do not constitute new gameplay collision volumes.

Body geometry has one carapace span. Eyes contain `eyestalk` and `pupil`. Leg slots contain a named walking-leg span, two walking spans in the final true-crab slot, or one `rear-support-appendage` for the shortened hermit slot. Claws contain `claw-forearm`, `claw-palm`, `fixed-finger` and `movable-finger`. Shell parts contain `shell-body-whorl`, `shell-recess`, `shell-aperture-lip` and `shell-spire`.

The six existing animated slots still receive the original sinusoidal vertical wiggle. The two merged legs in the final slot on each true crab therefore share a phase. This remains an illustrative gait rather than independent joint articulation or accurate sideways locomotion. The authored roots sit inside the carapace to support the retained vertical motion. Foot tips use a conservative shallow depth, with visual checks and triangle-based clearance verification still required against the actual scene.

## Materials and budget

The original eleven material allocations per rock/red crab and fifteen per hermit remain eleven and fifteen. Every mesh remains opaque with one material and one draw call. The eyes retain `MeshBasicMaterial`; body, legs, claws and shell retain `MeshStandardMaterial`. All use white material tint and linearized static vertex colors. The source `CRAB_TYPES` colors and gameplay configuration remain unchanged. Broad tone variation is encoded in geometry; there are no textures, custom shader hooks, uniforms, animated color layers, new random draws, dynamic buffer usage, geometry groups, extra lights or per-frame geometry allocations.

The planned topology is 813 vertices and 1,360 indexed triangles per true crab, and 1,308 vertices and 2,232 triangles per hermit. Estimated raw position/normal/color plus Uint16 index bytes are 37,428 and 60,480 respectively. Root must establish the executed counts before accepting these estimates. Stock geometry used approximately 399 vertices/368 triangles per true crab and 657/736 per hermit. This pass increases geometry detail while preserving draw and material counts; it does not establish an FPS or GPU-time improvement.

## Authoring guard and integration

`apply-crab-finish.cjs` stores the exact original visual block. It verifies unique source boundaries, inserts only the helper and replaces only that block, then reverses both edits and requires the entire source to match byte for byte. Independent clam edits can therefore remain outside the patch. It checks complete-module syntax and the protected animal factory. The generated candidate can be written with `--candidate`; `--check` produces an in-memory candidate and resource audit; default invocation applies the same guarded edit to canonical source. Root owns execution, production integration and mirror synchronization.

The guard includes finite attribute checks, unit normals, nondegenerate triangle areas, geometry bounds, absence of geometry groups and the approved vertex/triangle ceilings. Root-owned CPU tests verified actual attachment triangles, shell seams, pincer separation, animated grounding, immutable buffers, resource ownership and all original spawn randomness/metadata. Native low/balanced checks and fixed desktop/phone views also passed final review. The author prepared the guarded candidate; root performed integration and execution.

## Final integrated validation

46 distinct focused unit cases have passing evidence: 41 retained unchanged, plus all five clam cases refreshed after the final exterior-tone polish. Four distinct browser scenarios pass: two unchanged target/mission cases and two refreshed native low/balanced cases. No browser retries, skipped or flaky cases. Nine final fixed-camera images were reviewed by root and independent reviewers. All four runtime hashes match.

The initial clam suite produced four passes and one real rim-normal failure. Separating the valid rim shading vertices resolved every measured failing face while leaving physical surfaces, closure and hinge exact. Final valves each contain 526 vertices / 954 triangles; the pair uses 49,320 raw buffer bytes. The final color polish changes only two exterior vertex-tone strings. The opened camera was refreshed in both baseline and final; every other saved fixture field stayed exact. Sand hides part of the half-buried lower bowl, and the thin hinge is best read from the side. Complete resource measurements and source hashes are in validation-summary.json.
