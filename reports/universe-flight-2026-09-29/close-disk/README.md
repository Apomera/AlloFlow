# Entering spiral disks

Enhancement 58 improves the transition from an exterior galaxy portrait into its stellar disk. The legacy spiral RGB map is flat; from some interior poses its eye-plane clipping produced two large gray triangles. The exact enhancement 57 pose reproduces that artifact, and the new full scene removes it while preserving the independently captured clean full scene.

## How the handoff works

Each non-elliptical galaxy has a source frame defined by its existing turn and tilt. The observer's height and radius in that frame control a smooth fade of the flat map. Within the luminous footprint, the flat map is fully suppressed within 0.012 galaxy radii of the plane and restored by 0.048 radii. These bounds are one and four vertical sigmas of the generated diffuse spiral records. Radial suppression applies through the map's existing luminous cutoff, 1.12 radii, and ends at its 1.22-radius axis extent. These are rendering bounds rather than measured galaxy parameters.

The existing six-float vertex layout carries a constant marker between 0 and 0.5. Within the flat spiral ranges, only those marker slots change; their XYZ and UV stay exact. Atlas data and resolved point records are unchanged. A flat spiral range is uploaded only when its Float32 marker changes, using the existing buffer. Existing projected elliptical, bulge and smooth disk ranges still update when the camera position changes. Looking around, changing the lens or exposure, restoring the same position and pausing do not upload new surfaces. No graphics resources are added.

The rounded bulge and smooth disk proxy keep their existing projection and nearby fade. Ellipticals and the neighborhood keep their existing behavior. The neighborhood's analytic sky band is not used as an entered-galaxy fallback.

## Validation

- An independent host audit checks 298,048 finite, bounded and symmetric source-frame cases and all 89 spiral ranges. Complete atlas bytes, point records, initial geometry, projection, physics, routes and proxy helpers match enhancement 57.
- Six native controls above or outside the handoff envelope are pixel exact, including DPR 2, an elliptical and the neighborhood. Three spiral styles, height and radial transitions, and actual beta 0.9 and 0.99 views are covered. The fast views use an aberrated chief-ray aim and contain visible emission.
- The exact legacy pose is replayed with both the flat surface alone and the full scene. The original isolated artifact image matches its saved PNG byte for byte. The candidate isolated view has no pixel above RGB 20; the candidate full scene matches the independent clean full-scene capture exactly.
- 39 distinct focused Vitest tests pass across physics, bulges and the new close-disk file. This uses a Node canvas/event shim. Real WebGL and real DOM checks are separate.
- Desktop, fullscreen and 320-pixel phone controls retain the paused pose and image. Six scoped accessibility audits pass. All twelve preview cards retain their authored poses and match the current renderer.

## Model limits and preserved attempts

This suppresses an invalid close-range exterior illustration. Its removed light is not redistributed. The handoff is not volumetric dust transfer, a conserved-light model or a physical photometry claim. The scene still uses procedural point populations and existing display RGB Doppler styling. The special-relativity functions and journey clocks are unchanged.

Both original native comparison drivers completed their image captures, then failed a metric assertion. The first expected a large change from a direct coplanar pose that was nearly pixel exact; height-transition images exercise the fade. The replay's second assertion used an incorrect dark-clear floor. Separate frozen offline analyses validate all 36 captured PNGs without new renders. The original failed checks, drivers and images remain under evidence. Unit startup and duplicate-module test-helper failures are also preserved, together with their fixes and passing assertion results.

[Host audit](evidence/audit-handoff.json) · [Native analysis](evidence/native-report/analysis.json) · [Artifact comparison](evidence/artifact-report/comparison.html) · [Focused tests](evidence/focused-unit/aggregate.json) · [Browser checks](vista-browser-check.json) · [Preview cards](previews/check.json)

Source and desktop mirrors are exact. Nothing was staged, committed or pushed.
