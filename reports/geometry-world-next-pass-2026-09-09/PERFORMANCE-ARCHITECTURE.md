# Geometry World rendering and selection costs

The safest worthwhile rendering improvement was the faint ground-edge draw cost in Battery Saver. It is now implemented by the core owner and verified with actual Three.js and Chromium/WebGL. Student construction geometry remains independent and exact.

## Measured change

At the same pavilion camera and Saver settings, enabling the original ground edge children produces **1,514 draw calls**; the new behavior produces **912**. That is **602 fewer calls, or 39.8%**. Rendered triangle count is identical. This is a controlled edge-visibility comparison in the current source, not an estimate of frame-time improvement.

The 25 × 25 Sandbox floor owns 625 edge children; 602 contribute visible calls in this view. Battery Saver now hides those faint children. Student cube/slab/wedge outlines and targeting/measurement feedback remain available. Balanced and Detailed restore the same edge resources. Changing quality inside Studio does not reveal its hidden ground parents, and returning to Meadow or editing preserves the current graphics choice.

- Browser evidence: `saver-ground-edge-results.json`.
- Paired images: `saver-floor-edges-on.png`, `saver-floor-edges-off.png`.
- Focused actual-Three.js tests: `ground-edge-tests-final.json`; the initial incomplete run is retained separately as `ground-edge-tests.json`.
- Regression source: `tests/geometry_world_ground_edges.test.js`.

The browser asserts identical block geometry position/index buffers, edge position buffers, object/material/geometry identities, transforms, actual STL bytes, history, and the ground placement raycast through the controlled comparison and Studio roundtrip. The test fixture has 150 student blocks. No production source was edited by this audit agent; the landscape/core owner integrated the approved visibility hooks.

## Why this was safe

`addBlockEdges` creates a distinct `THREE.EdgesGeometry` and `THREE.LineSegments` child for every block. Its shared material uses opacity .045 for ground and .20 for builds. `placeBlock` already provides alternating ground color at .92 strength plus deterministic grass tint, so counting floor cells does not depend on the faint extra lines. The change only toggles tagged edge children under ground parents, at creation and quality-tier changes.

The floor and every construction cell remain in `engine.blocks`, with their original metadata, geometry, placement centers, materials, AO and collision identity. A hidden child inherits the parent's existing Studio and layer visibility behavior. No new scene-level representation or export exception is necessary.

## Architecture findings

| Area | Current evidence | Consequence |
|---|---|---|
| Block draws | `placeBlock` allocates a new shape geometry and mesh; `addBlockEdges` adds one line object per cell. | Opaque mesh and transparent edge submissions grow with cell count. |
| Materials | `getBlockMaterial` caches a template but returns `.clone()` for every block. Maps are shared. | The template cache saves texture generation; it does not make block material objects shared. |
| Geometry ownership | Vertex AO writes each geometry's color buffer; grass cube UVs are modified during placement; disposal traverses and owns each block's geometry. | Sharing the canonical geometry blindly would couple AO/UV state and break disposal ownership. |
| Mutable state | Per-cell material tint, protected-block emissive flashes, water opacity, pop scale, layer visibility and exact raycast object identity are live. | A blanket InstancedMesh conversion requires a deliberate rendering/proxy boundary and custom AO/visibility/picking support. |
| Quality | Saver removes shadows, bloom, natural-material normal/roughness maps, ambient motion and bevel strength; Balanced caps DPR1.5; Detailed caps DPR2 and enables bloom. | Saver now also reduces an important draw-submission cost. Shared surfaces stay visually useful without their detail maps. |
| Shadows | The sun casts a camera-following 60-unit shadow volume, 2048px desktop/1024px mobile. Every block can cast/receive; torch shadows are disabled. | Shadows are already absent in Saver. Static-shadow caching would need explicit movement, environment, visibility and caster invalidation. |
| Selection effects | Per-block glows and hidden-layer outlines add separate objects. Delayed glow lifecycle was independently assigned to the core owner for correction. | Avoid replacing measurement semantics with a rendering optimization; limit and correctly retire decorative work. |

The original source evidence was inspected around core `resolveGeometryRenderProfile`, `applyRenderQuality`, `getBlockMaterial`, `configureBlockFinish`, `addBlockEdges`, `refreshBlockAO`, `placeBlock`, `setLayerFocus`, and the final sun/render loop. Function names are given because the simultaneous lifecycle patch shifts line numbers.

## Next safe candidates

**Stop repeating a full selected measurement when nothing semantic changed.** The builder's 250ms refresh calls `selectionMeasurement` before its signature early-return. That is four full connected-component traversals and face aggregations per second even for an idle selection or Showcase. Its retained render fallback cache does not guard this interval. No CPU-time benchmark was run, so this is a confirmed call-frequency/allocation finding rather than a millisecond claim.

Use a UI-only cache keyed by engine identity, selected cells, and a semantic world revision that increments on every successful placement, removal, history replay, world replacement and relevant metadata edit. Record the cache key after normalization expands the selected component. `_blocksDirty` is unsuitable because raycasting consumes it, and `_historyRevision` only covers Undo/Redo. An interim all-block occupancy/shape/rotation/type/volume/layer fingerprint is safe if revision plumbing is deferred; a selected-cells-only signature would miss a new attached block. Keep deliberate print and Showcase actions freshly validated.

**Budget real torch lights separately from torch appearance.** Every torch adds a PointLight and glow sprite, with no count cap, including Saver. Disabling torch shadow maps does not remove their per-fragment lighting cost. A measured future pass could retain every emissive block/sprite while activating only a small set of nearby lights. This is separate from the completed ground-edge change.

**Consider batching ground edges only if a later profile needs it.** It can preserve the faint line styling in Balanced/Detail, but a scene-level batch must track individual ground visibility, Studio isolation, layer exploration, force-removal and lesson teardown. It should not be introduced as an unqualified whole-world instancing rewrite.
