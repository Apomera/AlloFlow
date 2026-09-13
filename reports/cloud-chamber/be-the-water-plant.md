# Be the Water: root-to-leaf visuals

The plant pathway now has six branching roots made from 72 instanced segments, a textured soil bed with 24 grains, an open stem sleeve, and five curved leaves with midribs and branching veins. A local window through surface meshes exposes the roots. The existing water route is narrower and blue, with smaller moving tracers. Leaf geometry fades close to the camera in Water view so it does not obstruct first-person navigation; Follow view keeps the full leaf surfaces.

This is an enlarged botanical illustration around the existing root-to-leaf teaching route. The open stem exposes that route; it does not represent a hollow stem. Leaf, root and grain dimensions are schematic. The transport kernel, pathway timing and teaching text remain unchanged.

Visual review also found that the canopy release offset kept settling during learning pauses. It now holds while paused or while the document is hidden. A restored transpiration checkpoint repositions the plant beneath the release point and restores its canopy offset instead of retaining a previous plant location.

## Verification

- All 117 pilot experience and kernel regression tests passed after the pause/restoration fix: `pilot-plant-regressions.json`.
- The final `dev-tools/watercycle_pilot_plant_qa.cjs` browser run passed with the near-camera leaf shader enabled. It covers finite geometry, the open stem, paused flow, both camera views, reduced motion, a real plant-to-transpiring transition, paused release position, restored plant placement, phase visibility, mobile overflow, active-notice accessibility, and shared material disposal.
- No page, WebGL or shader errors occurred in the final browser run.
- Root, stem, leaf and release captures were reviewed in `scratch/water-plant-review`. The first-person stem review led to the near-camera leaf fade.
- JavaScript syntax passed and canonical/desktop source hashes match.
- Existing local preview returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
