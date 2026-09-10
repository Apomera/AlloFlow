# 3D cloud chamber refinement

The Storm Lab now renders a continuous, shaded cloud volume instead of relying on thin billboard layers. A deterministic 64³ density field stores cloud density and approximate sunlight attenuation in a 1 MiB texture atlas. Forty ray samples per fragment integrate transparency; the field is generated once per chamber and disposed with its renderer. This is an illustrative rendering field, not a new weather or fluid solver.

Moisture adjusts optical thickness, updraft adjusts upper growth while retaining the cloud base, and modeled storm intensity adjusts shading. The Inside cloud viewpoint reduces optical thickness and emphasizes enlarged teaching particles. Other viewpoints emphasize the whole cloud. Existing temperature, phase-change, lifecycle, precipitation and accumulation calculations remain unchanged.

The atmospheric backdrop now surrounds the scene without a rectangular edge. Sky color uses the correct texture encoding, cyan fill lighting is reduced, and ground/thermal overlays are softer. Superseded hidden cloud meshes were removed.

## Verification

- 59 existing regression tests pass across precipitation, immersion, sleet/freezing rain, 2D visual refinement and science suites. The existing cutaway-copy assertion was updated for the new explanation.
- `node dev-tools/watercycle_cloud_volume_qa.cjs` passes all six presets, transparent cutaway state, empty density boundaries, front/rear orbit captures, 390px layout, WCAG A/AA axe checks and exactly-once texture/material/geometry disposal. No JavaScript or shader errors were reported.
- `node dev-tools/watercycle_storm_immersion_qa.cjs` passes cold loading, movement, pointer look, weather easing, fullscreen, all three environments, lifecycle controls, reduced motion, phone accessibility, failed-load retry and WebGL context-loss recovery.
- Source and desktop public copy are byte-identical; syntax checks pass.

Screenshots in this directory include the original chamber, all six updated presets, the cloud and surface inspection views, oblique/rear views and the phone cutaway. Browser checks used Chromium with SwiftShader; this verifies rendering compatibility, not hardware GPU performance.

Run `node dev-tools/watercycle_cloud_volume_qa.cjs --serve` to open a local preview directly in the whole-cloud viewpoint.

## Follow-up refinement

The atlas now packs a second density/light field for an upper anvil into its previously unused channels, retaining the 1 MiB GPU allocation and 40 ray samples. Smaller secondary billows add silhouette detail. The upper layer shades the tower below, responds to wind direction, and follows the storm lifecycle independently of lightning visibility and teaching annotations. Density tapers at the volume boundary after wind deformation as well as in the atlas.

Inside-cloud transparency now eases alongside camera movement. Reduced motion still applies the inspection view immediately. Browser checks cover gentle-cloud versus strong-storm anvil eligibility, persistence during dissipation, unchanged structure when annotations toggle, atlas reuse, wind reversal, smooth and immediate cutaway modes, all six weather presets, orbit views, phone accessibility and resource disposal.
## Precipitation presentation refinement

Rain trails now taper toward their tails and follow the same wind displacement as the falling samples. Their leading endpoints stop at the drops rather than extending below the ground. Reused particle buffers carry size, rotation and opacity variation; snowflakes turn gently, and phase-specific particle textures, fog and tone mapping remain intact.

Liquid splash rings and crowns use selected falling-sample seeds and clocks, including wind displacement and the mountain rain-shadow filter. Hail, snow and virga do not create these liquid splash effects. The model still determines phase, reach and accumulation.

The motion-preference listener now refreshes control labels and click behavior using the latest tool state. Switching the operating system's reduced-motion preference no longer leaves a stale Static/Resume control. Browser checks include finite particle styling, varied sizes, trail limits and taper, snow animation/pause behavior, and phase-correct impacts.