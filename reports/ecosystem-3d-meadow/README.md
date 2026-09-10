# Ecosystem: optional 3D meadow

Open **Ecosystem → Food web → Show 3D meadow**.

The meadow renders the existing five-group food-web samples in Three.js. It does not run a second ecological model. Scene selection updates the food-web inspector and chart; both timeline sliders update the same saved cursor. The scene can display either the experiment or its unchanged baseline.

## Interaction and presentation

- Stylized plants, rabbits, meadow voles, red foxes, and barn owls; decorative trees and rocks.
- Select organisms by pointer, or use the labeled keyboard-accessible group buttons.
- Rotate, adjust camera distance, reset the camera, scrub time, or explicitly start and pause playback.
- The view starts paused. Reduced-motion preferences disable playback and movement; manual timeline inspection remains available.
- The optional scene loads Three.js through the existing host loader only when opened. It renders on changes rather than running an idle animation loop, caps pixel ratio at 1.5, and disposes GPU resources and event listeners when closed.
- WebGL initialization failure or context loss displays an explanation while retaining the diagram, numerical values, and comparison tools.

## Interpretation

Organism symbols represent approximate, capped abundance, not individual animals. Symbol density uses the same fixed per-species scaling in baseline and experiment. Zero biomass produces no symbols; any positive biomass keeps at least one. The displayed biomass values and comparison table are the quantitative reference.

Movement and habitat scenery do not affect feeding, capacity, or shelter. Actual spatial ecology (habitat patches, refuges, hunting ranges, and corridors) remains a separate future extension. All existing assumptions and sources in the Food web lab still apply.

## Visual review

- [Desktop meadow](desktop.png)
- [Mobile meadow](mobile.png)

## Verification

The browser checks cover shared numeric samples, extinction and backward scrubbing, baseline switching, camera rotation, keyboard selection, playback/pause, reduced motion, mobile sizing, reopening, unavailable WebGL, and graphics-context loss. The existing food-web workflow also passed after integration.

Test sources: `tests/e2e/ecosystem-3d-meadow.spec.ts`, `tests/e2e/ecosystem-foodweb.spec.ts`, and `tests/e2e/ecosystem-live-visuals.spec.ts`.

Validation passed: 91 unit tests across 22 ecosystem files; five distinct browser workflows across the 3D meadow, food-web lab, and live simulation. The final camera adjustment was rechecked with the three 3D workflows. Source syntax and scoped whitespace checks passed, and the source and desktop public copy have identical SHA-256 hashes.
