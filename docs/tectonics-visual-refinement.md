# Tectonics visual refinement

The main draggable cross-section now uses rock strata, mineral texture, shaded mountain faces, softer plate outlines, and a clearer geological palette. The selected plate receives a steady rim and a high-contrast name chip.

On narrow screens, all seven plates keep numbered markers with a wrapping identification key below the scene. Boundary captions become compact, the initial drag hint yields to the active boundary, and the depth ruler, scale-break note, and convection annotations have separate reading space. Sea level and the solid inner core have stronger text contrast.

Canvas resizing scales existing horizontal positions and particle locations without restarting the experiment. Plate thicknesses, the 0-400 km depth mapping, boundary classification, event scoring, and simulation controls retain their existing model.

## Validation

- 211 checks passed across the eight tectonics regression test files.
- The real Chromium browser harness passed desktop/phone resize checks, normalized plate-position and width preservation, unchanged event counters on resize, all seven bounded phone labels, selected-key state, keyboard movement after resizing, and label visibility.
- Captured light/dark desktop and phone scenes, selected plates, a divergent boundary, and a continental collision under reduced-motion preferences. Reviewed phone label spacing visually.
- Source, web public copy, and the existing ignored local build artifact were synchronized. JavaScript syntax and scoped whitespace checks passed.

Run the browser review from the repository root:

```sh
node dev-tools/tectonics_scene_visual_qa.cjs
```

Images and the browser result are written to `scratch/tectonics-visual-review/`. The harness uses local React, Three.js, Playwright Chromium, and the existing cached stylesheet; it does not need a hosted page.
