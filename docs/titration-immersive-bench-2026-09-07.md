# Titration Lab immersive experiment bench — September 7, 2026

The main Titrate experiment now has a connected, rotatable 3D lab bench. Existing 3D burette-reading and equipment-comparison stations are preserved.

## Behavior

- The apparatus includes a support stand and clamps, graduated burette, stopcock and tip, conical flask, white endpoint tile, and stir bar.
- Delivered volume drives the falling burette meniscus and rising flask liquid. Flask fill is mapped through a tapered-vessel volume integral rather than making height proportional to volume. Apparatus dimensions and capacity scaling remain illustrative.
- Flask color and transparency come directly from the current indicator or redox color function. The viewer never computes pH, endpoint, equivalence, or a grade. Redox readouts display cell potential instead of pH.
- Both the original addition controls and the bench's +0.1, +0.5, +1, and +5 mL controls call one handler. A brief falling-drop and stir-bar cue accompanies additions. It is not a literal drop counter or fluid-dynamics simulation.
- Front, side, rotate, zoom, and reset buttons provide alternatives to mouse dragging. The stage also supports arrow keys, +/−, and 0. Touch gestures retain vertical page scrolling.
- Both the lab's reduced-motion setting and system reduced-motion preference suppress the 3D animation, including changes to the system preference while mounted.
- The 2D diagram remains selectable. Loading, missing host support, or WebGL failure keeps the existing diagram and numerical controls usable. Switching views preserves experiment state; the ready 3D view replaces the redundant flat apparatus while retaining the titration curve below.
- Numerical readouts distinguish cumulative titrant volume from the current 50 mL burette reading. The polyprotic preset continues correctly across a refill.

The scene uses the project's bundled Three.js and shared makeOrbitViewer lifecycle. Each mounted experiment component owns its viewer, subscribes to status, and disposes it on exit. The shared renderer handles visibility, resizing, context failure, geometry/material cleanup, and demand-based rendering. The new scene creates no texture assets and uses no continuous idle animation.

## Verification

236 tests passed in the final titration regression run, including six new geometry tests. Coverage includes existing titration science, accessibility, robustness, translations, and lifecycle tests; new checks cover the tapered fill calculation, liquid colors/alpha, empty burette, cumulative-versus-fill reading, and finite animation.

The real Chromium WebGL workflow verifies:

- A measured addition raises the flask surface and lowers the meniscus.
- The flask's color changes with the existing chemistry state.
- Front, side, and keyboard orbit visibly change the rendered camera.
- 3D/2D switching preserves volume and disposes/recreates the renderer.
- System reduced motion prevents animation; ordinary addition animation finishes.
- Bench additions, polyprotic refill readings (75 mL delivered / 25 mL current fill), and redox potential remain connected to the experiment.
- Context loss restores the usable 2D apparatus.
- Three targeted axe scans at 1200, 360, and 320 pixels have no violations or panel overflow. No browser exceptions were recorded.

Desktop initial-solution, post-endpoint, and mobile captures were visually reviewed. A final mobile adjustment gives the pH/potential readout the full lower row and moves burette capacity into its label to keep values compact.

Evidence: `reports/chemistry-refinement-2026-09-06/titration-immersive-final-tests.json`, `titration-immersive-browser.cjs`, `titration-immersive-browser-results.json`, and the `titration-immersive-*.jpg` captures.

## Scope and follow-up

This is browser-based 3D, not a headset VR implementation. It does not simulate hands, physical pouring, calibrated glassware dimensions, or fluid dynamics. Verification used software WebGL; physical Chromebook/GPU testing remains useful before a classroom pilot.

New interface copy uses translation lookups with English fallbacks, and the English catalog includes the new labels. New translations still need review in the language packs; existing translated copy and the translation baseline were preserved.

Source and desktop public copies are synchronized. No deployment was performed.
