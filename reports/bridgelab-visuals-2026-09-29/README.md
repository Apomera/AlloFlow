# Bridge Lab: a more detailed bridge setting

## Visual changes

- **Light and depth.** Hemisphere lighting, warm directional sunlight, soft shadow filtering, a brighter sky gradient, and distance haze make the bridge's shape easier to read. Truss and railing shadows fall across the walkway, roadway, and river.
- **A recognizable river valley.** Sloped banks, shoreline rocks, varied water color, fine surface highlights, tree clusters, and distant ridges replace the flat setting. The road corridor remains open through the hills.
- **Details at eye level.** Joint plates clarify member connections. Curbs, road edge markings, and pavement joints help students judge scale from the walkway. Plates follow the same exaggerated buckling geometry as their attached members.
- **Phone readability.** Camera instructions wrap inside the scene at narrow widths, and the controls remain usable with the richer background.
- **Stable scenery during investigation.** Placement is deterministic. The vegetation and hills belong to the ground group; the river stays a stationary visual reference. Camera movement and earthquake frames reuse the existing geometry.

These additions are visual context. They add no load, stiffness, mass, or cost to the teaching calculations. The existing force colors, buckling illustration, and tenfold earthquake displacement scale retain their meanings. The landscape and water are procedural geometry; no external image assets or continuously running scenery animation are required.

## Rendering and lifecycle

The 48 tree crowns and trunks use two instanced meshes. Water and shoreline highlights use a small number of batches. The shadow map is fixed at 1024 × 1024. The sunlight belongs to the scene model and releases its shadow targets when that model is disposed. The sky remains inside the camera's far plane across supported bridge sizes and both camera modes.

Browser checks rebuild several spans, return to the original design, and compare live GPU geometry and texture counts. They also check bounded render complexity, no application warnings or shader errors, camera changes without geometry rebuilds, phone layout, and existing WebGL loss recovery. The known SwiftShader screenshot readback diagnostic is excluded from the warning assertion.

## Verification

**89 distinct checks have passing final results:** 51 unit checks across four files and 38 Chromium browser workflows. The browser verifier uses the latest result for each workflow across the full run and focused rechecks. Both application source copies are byte-identical, all 923 literal English fallbacks match both registries, JavaScript parsing passes, and scoped whitespace checks pass.

Geometry checks include the 10 m and 80 m span limits, batched scenery, camera clipping, stationary water, connected moving supports, and unchanged force-color signs. Browser coverage includes all truss styles, design changes, saved evidence, earthquake investigations, desktop and phone views, and fullscreen/context-loss recovery. Repeated rebuilds retain the same shadow texture count and do not grow geometry allocations when returning to the original span. The sampled browser scenes stay below 650 draw calls and 40,000 triangles; this bounds scene complexity and is not a frame-rate benchmark on physical phones.

The final desktop, phone, walkway, and river previews were visually reviewed. The focused runs correct a camera-dependent test expectation and exclude the existing screenshot-readback diagnostic; application warnings and shader errors still fail the tests.

- [Unit results](unit-results.json)
- [Full browser run](browser-full-results.json) · [Focused visual rechecks](browser-results.json) · [Final phone check](browser-phone-results.json)
- [Verified source and distinct coverage](source-verification.json)

From the repository root, reproduce the source and result checks with:

    node reports/bridgelab-visuals-2026-09-29/verify.cjs

## Previews

- [Desktop walkway](bridge-1000-landscape-walkway.png) · [Phone walkway](bridge-320-landscape-walkway.png)
- [Desktop crossing](bridge-1000-landscape-orbit.png) · [Phone crossing](bridge-320-landscape-orbit.png)
- [Desktop river view](bridge-1000-landscape-river.png) · [Phone river view](bridge-320-landscape-river.png)
- [Earthquake from the deck](bridge-1000-on-deck-earthquake.png)
