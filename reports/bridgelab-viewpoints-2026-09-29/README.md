# Bridge Lab: viewpoints and energy in the scene

## What changed

- **Three viewpoints:** Along the deck, River overlook, and Look back toward entrance. Selecting one pauses vehicle and earthquake playback, preserves experiment time and student notes, and focuses the scene for keyboard exploration. The selected button reflects the actual camera pose.
- **Energy beside the bridge:** Expand “Energy in this frame” to see kinetic, elastic, and dissipated energy while inspecting the 3D response. Numeric values accompany the colored bar. It uses the same fixed scale as the energy timeline, so changes in bar length represent changes in energy.
- **Clear event phases:** The readout distinguishes the 16-second shaking phase from the following 8 seconds of free vibration. Kinetic energy uses relative motion; dissipated energy is cumulative. Values come from the existing teaching model in J/kg.
- **More space for earthquake scenes:** Both the orbit and walkway views use a 480 px stage when the earthquake experiment is visible. The readout scrolls within a height limit when space is restricted, leaving replay controls accessible.
- **Fullscreen canvas fix:** A scoped Bridge Lab rule keeps the canvas at the height of its host. The shared shell's generic fullscreen rule previously set the canvas height to `auto`, which could leave a large blank area under the scene.

The energy disclosure starts closed. It has no live-region announcements during playback. Viewpoints work with reduced motion enabled, and selecting one does not animate the camera. Camera and readout changes reuse the current Three.js geometry.

The existing elastic earthquake model, synthetic input, response modes, and tenfold visual displacement scale retain their meanings. This pass changes how students inspect those results; it does not add a prediction of a real bridge's earthquake safety.

## Verification

**86 focused checks pass:** 74 unit checks across five files and 12 Chromium browser workflows.

Unit coverage includes physical energy balance, deformation geometry, camera lifecycle, preset focus and playback behavior, fixed energy proportions, zero-input handling, phase changes, and preserved student evidence.

Browser coverage includes 1000 px desktop and 320 px phone layouts, real camera direction changes, native disclosure keyboard controls, fixed energy scales, separation of scene controls, reduced motion, and WebGL failure recovery. Canvas checks compare both CSS dimensions and drawing-buffer dimensions with the stage in native fullscreen and the in-app fallback. They also verify normal sizing after exiting fullscreen. Desktop, phone, and fullscreen screenshots were reviewed.

Both Bridge Lab source copies match byte-for-byte. All 933 literal English fallback strings match both English registries. JavaScript parsing and scoped whitespace checks pass.

- [Unit results](unit-results.json)
- [Browser results](browser-results.json)
- [Source and coverage verification](source-verification.json)

Run the report verifier from the repository root:

    node reports/bridgelab-viewpoints-2026-09-29/verify.cjs

## Previews

- [Desktop viewpoints](bridge-1000-viewpoints.png) · [Phone viewpoints](bridge-320-viewpoints.png)
- [Desktop walkway with energy](bridge-1000-walkway-energy.png) · [Phone walkway with energy](bridge-320-walkway-energy.png)
- [River overlook](bridge-1000-river-energy.png) · [Looking toward the entrance](bridge-1000-entrance-energy.png)
- [Desktop fullscreen](bridge-1000-fullscreen-energy.png) · [Phone fullscreen](bridge-320-fullscreen-energy.png)
- [Phone orbit view](bridge-320-orbit-energy.png)
