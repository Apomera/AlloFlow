# Pass 37 rock geometry candidate

This directory contains a proposal for the root executor. No repository files, fixtures, tests, browser state, server, or GPU were changed or executed by this agent.

## Visual intent

The current radial sine deformation retains almost spherical silhouettes. The candidate reuses each 24 by 16 sphere and cuts broad, tilted weathering faces into three proportions selected by `ri % 3`: a chipped block, a lower stratified shelf, and an asymmetric wedge. A shallow, tilted layer field changes the remaining shoulders between those faces. The phase combines the already accepted rock index and radius; nearby rocks do not all show the same layers or clipped sides.

The visible benefit should be several readable silhouette families, flatter weathering faces, and shallow stepped shoulders. The geometry is static. Its existing mineral shader, tint, roughness, and shadow policy continue to shade the new normals without new programs or resources.

## Exact integration guard

`proposal.cjs` exports one literal `before` / `after` replacement. Require exactly one occurrence of `before` in the LF-normalized accepted source before changing it. The supplied accepted source SHA is the pass36 SHA from the parent. The replacement begins at `var rocks = [];` and ends at the old normal recomputation; its opening position, size, and clear-center random call sites are copied literally. Tint, transform, mesh creation, metadata, scene insertion, and actor collection remain outside the replacement.

The helper is deliberately inside the rock spawn region. Existing CPU constructions that extract that region therefore receive the actual helper rather than a separate test-only implementation.

## Formula review

Let `n=(x,y,z)` be the original sphere direction, and rotate its horizontal coordinates to `(u,v)` using a phase from the existing index and radius. The layer coordinate is `bed=y+0.18u-0.08v`. A sine with 6.6, 7.3, or 8.0 radians per normalized unit creates about two to three shallow beds across a rock. The remapped sine `layer/sqrt(0.36+layer^2)` broadens the shoulders without a discontinuity. The layer amplitude is 0.038 radius; the two broad erosion terms contribute at most 0.038 radius combined.

The uncut profile lies between approximately 0.8994 and 1.0406 times the original radius. Positive plane denominators clip the top and bottom at distinct distances; the other two denominators clip rotated side directions. Every cut yields a strictly positive radial factor. The smallest continuous factor is the shelf's top cut, `0.68/sqrt(1+0.18^2+0.08^2)`, approximately 0.6672. Float32 rounding warrants a 0.66 radius lower QA tolerance. A strictly positive factor at every sampled direction preserves triangle winding and the sphere's star-shaped topology; there is no radial collapse or cap inversion.

The final radial factor is also the minimum of the old production deformation and all new terms. Each changed vertex is thus on its accepted ray and no farther from the origin than before. The existing theoretical radius bound of 1.14 times `rs` is retained, and actual transformed bounds cannot expand under the unchanged linear rotation and scale. The small seam/pole snapping removes only the original floating-point trigonometric residuals at coincident points.

The old minimum radius was 0.86 times `rs`; this proposal lowers a clipped face to approximately 0.667 times `rs`. That is the intended shape change, not a replacement of `rs`. The mesh's radius parameter, `rs*1.2` substrate envelope, scale, rotation, and `rs*0.35` terrain-relative center remain the accepted values. The clipped forms still have a substantial buried toe at that center height. The existing footprint helper measures the changed actual vertices, so coral blocking, plant groves, and cover calculations still use a meaningful footprint. Settlement positions may resolve differently where the actual footprint changes; the deterministic placement algorithms and RNG stream remain intact.

## Seam, poles, and normal review

The source SphereGeometry has 17 rows of 25 vertices, including 24/0 duplicate columns, and 425 total vertices. The proposal copies each duplicate meridian position exactly and collapses each pole's floating-point residuals to one coincident position. No indices, attributes, arrays, or counts are replaced.

The existing normal array becomes an accumulator for triangle cross products. A logical vertex mapping merges the closing meridian with column zero, the top fan with vertex zero, and the bottom fan with vertex 400. Each triangle contributes its unnormalized face cross product, giving the same area weighting used by Three's standard normal calculation. Shared accumulators are normalized once, then copied back to duplicates. Coincident seam/pole vertices therefore receive exactly equal normals, including the unused duplicate pole endpoints, instead of the separated fans produced by the old `computeVertexNormals()` call.

Normal uploading is marked once during construction, matching the old normal recomputation. There is no per-frame mutation, normal buffer allocation, new attribute, or new renderable.

## Existing checks reviewed

- `cephalopodlab_rock_surface.test.js`: retains 425 position vertices, 2160 index entries, seeded draw count and sequence, 44 meshes for its seed, transform values, substrate metadata, colors, materials, and shader/fallback assignments.
- `cephalopodlab_reef_placement.test.js`: retains the production rotated/scaled vertex footprint helper and settlement algorithms. Changed geometry remains suitable for their measured extents.
- `cephalopodlab_habitat_composition.test.js`: retains its frozen fixture and RNG oracle. Its protected rock spawn source hash needs a new exact literal reversal for this one approved geometry replacement, applied before the existing rock shadow reversal. Restoring `after` to `before` must recover the previous rock bytes before hashing; do not relax the fixture, protected region list, frozen hash, or random-line comparison.

Root QA should independently measure positive radial factors, old per-vertex extent containment, outward triangle winding, unit finite normals, exact seam/pole position and normal equality, and unchanged normal/index/attribute ownership. Compare near-rock natural views for silhouette legibility and buried contact. These checks were proposed but not executed here, per the assigned root-only execution constraint.
