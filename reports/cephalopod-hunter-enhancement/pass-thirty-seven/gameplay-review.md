# Pass 37 rock gameplay review and bounded correction

Review basis: production source accepted by the parent at SHA `0f5b2eca6415965ba839d953db32c103b86aed829a313100a7de4a045daa880b`. This was a source review; no source execution, tests, browser, server, GPU, or repository writes occurred. The companion proposal and tests are task-local artifacts for root review and execution.

## Finding

The inward visual rock forms expose a real mismatch in the existing movement proxy. The production movement callback at line 16125 uses a circular radius `substrateRadius*0.62 + bodyScale*0.22`, which is `0.744*rs` plus the player's accepted clearance. Its height cutoff is the rock center plus `1.2*rs`. Neither value reads the changed vertices or actual footprint. The new clipped faces can be nearer the root than that radius, and low shelves can end well below the height cutoff. A player may therefore be pushed in visibly clear space beside or above a rock. The old rotated/scaled spheres already made this proxy approximate; deeper clipping increases the discrepancy. This is a moderate gameplay risk and justifies correcting movement before accepting the shapes.

For scale, the candidate's smallest local radial factor is approximately 0.667, and its existing Y scale may be 0.7. A rotated narrow face can therefore have a smaller horizontal extent than the old 0.744-radius core. The mismatch may be several tenths of a world unit on a large rock. That bound is a formula assessment, not a measured runtime frequency.

## Other systems

`rockBlocks` at line 15938 raycasts the actual rock meshes. Predator sight, pursuit blocking, prey awareness, and strike cover therefore see the changed triangles. No invisible cover rim is introduced by the retained substrate radius. This source path needs no change.

`createCLReefFootprint` at line 11275 measures the actual position vertices after the mesh rotation and scale, relative to the mesh root. Coral blockers and plant groves use that cached footprint after initial placement and again after streamed root translations. Shape changes alter their valid placements deterministically, while the footprint algorithm, resource ownership, and draw sequence remain appropriate. The proposal keeps this helper and its existing initialization byte exact.

`detectSubstrate` at line 14918 deliberately picks nearby rocks inside `rs*1.2` in XZ; its comment describes standing on or near a rock. It changes the skin target, while the substrate contribution to camouflage separately fades with distance from the terrain rest height. This pre-existing adjacency zone may be more generous beside a narrow shelf, but it does not create physical cover or a new camouflage bonus. Keeping its radius avoids broadening this bounded correction into game rule changes.

The squeeze animation remains a pre-existing proximity cue from two rock centers within 2.5 units. It is not the physical movement blocker.

## Player body semantics

The accepted movement proxy's horizontal body clearance is `bodyScale*0.22`. Retain that value. The new solver uses that clearance as the radius of a horizontal circle and as the vertical half-clearance for its broad height gate. It permits passage when the entire proxy is above `rootY+maxY` or below `rootY+minY`, including exact tangency.

`floorRestY` is an accepted terrain rest offset, `0.55` for most species and `0.77` for giant Pacific. It anchors ground movement and substrate matching; it is not the body collision radius and is not changed or repurposed. As before, logical `gameState.verticalY` supplies the collision height before visual jet lift/bobbing is applied. This correction does not attempt collision of every rendered arm, fin, or mantle vertex.

## Narrow implementation

`collision.proposal.cjs` contains three exact, uniquely guarded replacements:

1. Add two global helpers immediately before `createCLHuntAnimal`. Existing footprint and placement function bytes remain intact.
2. After the existing reef footprint initialization, build a parallel `rockCollisionFootprints` array. Mesh `userData` remains untouched, preserving the spawn metadata oracles.
3. Replace only the existing player rock movement callback with the cached circle/outline resolver, retaining `bodyScale*0.22`.

Construction transforms the existing position vertices by rotation and scale with zero translation, records actual min/max Y, and makes an Andrew monotone-chain convex hull of their XZ projection. It caches outward unit edge normals, segment vectors, squared lengths, and plane constants. All geometry reads and temporary points happen once. The rock order, rotations, scales, and shape are static; subsequent root X/Y/Z translations reuse the same relative cache.

During movement, vertical clearance returns immediately. A separating edge plane returns free movement. For a center outside the outline, the nearest point on finite edge segments distinguishes a straight-edge overlap from a corner overlap; the player is pushed only by the actual circle penetration. For a center inside the outline, the nearest outward edge provides a deterministic escape, including an exact-center case that the old `dist>0.001` condition skipped. The solver changes only X and Z and returns a boolean; it does not allocate arrays/vectors or read the geometry per frame. A one-billionth-unit separation prevents repeated rounding pushes at tangency.

## Practical bounds

The cached hull is the conservative projection of the entire rock over its actual vertical interval. It is not a triangle collision slice at the player's height. A tilted rock's broad projection can still block a position that is clear at one intermediate height. The requested approximation remains bounded by real rotated/scaled geometry and removes the old independent circular and height extents without adding per-frame mesh traversal.

Collision now follows the visible convex outline. On broad faces it can be stricter than the former 0.744-radius core, which allowed some mesh intersection; on clipped faces it can be less restrictive. The accepted player clearance, actor transforms, resources, substrate rules, cover raycasts, terrain rest, and RNG remain intact. Overlapping rock outlines retain the existing one-pass ordered resolution; this proposal does not introduce a new multi-contact physics loop.

Existing CPU tests reviewed cover post-collision floor classification (`cephalopodlab_fact_consistency`), altitude/grounding (`cephalopodlab_giant_grounding`), spawn resources and metadata (`rock_surface` and `reef_form_finish`), and actual footprint settlement (`reef_placement`, `habitat_composition`). Those do not independently prove the old circular movement callback's edge/corner or height behavior. The companion focused CPU proposal therefore exercises the production cache and resolver directly against geometric cases, ownership, translation, and no-traversal constraints. Root must execute it along with the retained reef/grounding/propulsion suites; tests were authored, not run, here.
