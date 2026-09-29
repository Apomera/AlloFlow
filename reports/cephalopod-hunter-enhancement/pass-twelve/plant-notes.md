# Pass twelve: curved rooted plants

The existing seagrass and kelp already had a longitudinal curve, but each ribbon had only two vertices across its width. This left them visibly flat and angular. Kelp also used unlit material, rotated around its middle, and continued moving when reduced motion was enabled.

`apply-plants.cjs` is an eight-guard patch for canonical source; `--check` evaluates it without writing. It compares actual old/new construction with bundled Three to verify the same 525 random draws, world XZ positions, yaw, heights, wind phases, counts and camouflage metadata. It preserves source line endings and unrelated source edits. Root owns integration and mirror synchronization.

## Shape and shading

The helper creates a static tapered ribbon with a shallow folded center vein, a curved centerline, and gentle twist. Variation comes from plant indices, never new random draws. Tips retain a small width to avoid degenerate triangles and normals. Final normals, bounding boxes and bounding spheres are computed after shaping.

- Seagrass keeps 80 instanced meshes with seven blades each. Each blade changes from 18 vertices/16 triangles to 33 vertices/40 triangles: ten longitudinal sections, three columns. The existing linear green palette receives restrained per-cluster and center-vein variation.
- Kelp keeps 25 meshes, with 57 vertices/72 triangles each instead of 34 vertices/32 triangles. Eighteen sections produce a broad, sinuous ribbon. Subdued olive vertex colors and rough StandardMaterial reveal the fold in scene lighting. The prior 0.85 opacity is preserved; depth writes are disabled to avoid translucent overlap occlusion. The final oblique closeup shows no visible transparency hole or overlap artifact.

Names `cl-seagrass` and `cl-kelp` make the live objects easy to inspect. No textures, lights, extra meshes, shadow casting or render passes are added. Grass keeps its existing instancing, `receiveShadow` setting and disabled object-level frustum culling. Kelp bounds cover the completed static geometry. Each mesh continues owning its geometry/material, using existing teardown.

The geometry adds 14,440 submitted triangles across the full existing scene: 13,440 for all instanced grass blades and 1,000 for kelp. Draw calls stay at 80 grass patches plus 25 kelp strands. Geometry and instance buffers remain static during wind animation.

## Basal pivot and motion

Geometry is authored from Y 0 to its original height. Grass keeps the seven instance XZ offsets, yaw and scale, removes the old height-compensating instance Y offset, and places its mesh at resting Y 0.05. Kelp's mesh rests at Y 0. These transforms preserve the exact previous world-space resting bases and top heights while moving the pivot to the base.

`groundOffset` captures the new basal resting Y, so terrain grounding and grass recycling continue through the same existing code. Grass camouflage sampling uses XZ proximity/count, and cover/collision use rocks; no gameplay consumer depends on the changed plant-center Y. Substrate tags and radii remain unchanged.

Wind rates, phase and ±0.12-radian angles are preserved. Kelp gains the same reduced-motion guard as grass. Both remain inside the existing pause/game-over update guard. Kelp basal centroids now remain fixed during sway. A grass cluster rotates around its basal center; individual root centroids within the unchanged 0.24-radius layout may vary in Y by at most 0.0288, independent of blade height. This replaces the previous height-proportional root motion without adding a new deformation system.

## Verification

The focused unit file `tests/cephalopodlab_plant_geometry.test.js` executes the integrated helper, actual construction blocks and actual sway blocks with the live loop's pause guard. Six cases check finite geometry and unit normals, nondegenerate tapered tips/folds, deterministic variation, all seeded layout contracts, unchanged instance distributions and resting heights, rooted sway bounds, pause/reduced-motion behavior and stable geometry buffers.

The geometry patch/check itself launches no browser. Real-scene capture review is recorded below; root coordinates separate browser checks for rendering, unchanged plant counts and metadata, live pause/reduced motion, root attachment and cleanup. Existing gameplay checks remain relevant because plant placement and camouflage inputs are preserved. Consult the validation summary for final browser outcomes; a screenshot is not a substitute for those behavior checks.

## Diagnostic capture review and reproducibility

`plant-detail-review.cjs` renders the actual seeded common-octopus field-study scene with the original materials, lighting, meshes and visibility. Its only view change is an explicitly diagnostic camera pose aimed at a nearby grass patch or kelp strand. No animal, plant, light or occluding mesh is moved, hidden or replaced. The two views expose roots, folded surfaces and an oblique translucent kelp overlap; they do not cover every back face or all possible overlapping strands.

Run `node reports/cephalopod-hunter-enhancement/pass-twelve/plant-detail-review.cjs` for the canonical after views. Normal mode reads the tracked `plant-detail-fixture.json`, so it works from a checkout without ignored initial result files or the old source snapshot. That small fixture retains exactly two plant identities, original positions and camera poses. Generating a new baseline with `--initial` requires the separately saved, ignored `baseline.generated.cjs`; successful initial generation updates the tracked fixture. Normal mode never rewrites it. Both modes retain the strict XZ identity guard.

The fixture sets `THREE.Clock.getDelta()` to zero before scene construction; it does not click Pause, and the render/update loop remains active. In the inspected source, `gameNow` starts at zero, `now` is assigned from `gameNow`, and both plant wind expressions use `now`. Thus their wind phase is simulation-time based, not wall-clock based. The recorded before/after rotations match exactly for these views. This fixture still does not establish pause, reduced-motion or moving-root behavior: the geometry units exercise anchoring over multiple sway angles, and separate browser cases exercise the real controls. Reusing the fixture in a future build with a different animation clock would require checking sampled wind poses again.

The first canonical capture attempt failed the strict plant identity guard before retaining actual coordinates. Its cause remains unknown. No production source correction was made in response. A subsequent canonical run passed the unchanged identity checks, produced both final images and reported zero page/console errors. Grass index 35 retained XZ `[7.466544164344668, -2.246687449514866]`; kelp index 1 retained XZ `[-8.431789581663907, -0.9466218296438456]`. Both match the baseline exactly, and the diagnostic's scene-add instrumentation confirms that their construction-time XZ and captured XZ are identical. The same camera position, target and field of view were reused for each before/after pair. The earlier failure is recorded as an unreproduced diagnostic failure, not evidence of a repaired source defect.

Reviewed `initial-grass-detail.png` against `grass-detail.png` and `initial-kelp-detail.png` against `kelp-detail.png`. The grass has finer taper, more legible folded shading and varied curved tips. Kelp reads as muted olive rather than a pale unlit strip. No cropping, transparency hole or detached kelp base is visible in the sampled final views. Root accepted the final images at the simulator's existing stylization. Both plant types remain simplified ribbons; grass's preserved 0.05-metre base clearance and absence of cast shadows are visible at this extreme closeup. No further visual correction was recommended.
