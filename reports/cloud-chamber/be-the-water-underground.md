# Be the Water: soil and groundwater cutaways

The soil journey now includes three textured layers, 66 instanced grains, softer pore-water markers, and a blue water-table edge. A 120-degree opening in the soil shell turns toward the camera while the parcel pathway stays fixed. A local shader window through the ocean and terrain prevents the surface from concealing the lower soil layers; the surrounding landscape remains visible. The window switches off outside soil and groundwater forms.

Groundwater now has 96 instanced rock grains around the selected route, a narrower translucent guide, and smaller flow tracers. Rock shape compensates for the route's length scaling, so a distant spring does not elongate each grain. Shared geometry and the existing rock texture limit additional resources. Materials retain ordinary depth occlusion.

These are illustrative cutaways: layer thicknesses, grain sizes, gaps, the highlighted route, and the water-table marker are schematic. They are not a pore-scale flow simulation or a measured geological cross-section. The physics kernel, transition rules, and existing teaching text are unchanged.

## Verification

- All 117 pilot experience and kernel regression tests passed; results are in `pilot-underground-regressions.json`.
- `dev-tools/watercycle_pilot_underground_qa.cjs` passed live browser checks for finite instanced geometry, paused flow, both camera views, camera-facing soil opening, reduced motion, actual soil-to-groundwater transition, phase visibility, mobile overflow, accessibility of the active notice, and shared geometry/texture disposal.
- No WebGL, shader, or page errors occurred in the browser checks.
- Soil and groundwater captures in both camera modes were visually reviewed in `scratch/water-underground-review`. This review identified and resolved surface occlusion of the soil layers and stretching of the aquifer grains.
- JavaScript syntax passed; canonical and desktop source copies have matching SHA-256 hashes.
- Existing local preview returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
