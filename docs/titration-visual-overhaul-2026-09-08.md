# Titration bench and diagram visual pass — September 8, 2026

Reviewed the current bench in Chromium and preserved its recent backdrop, glass sheen, endpoint bloom, static addition inspector, live curve, notebook, and dilution view.

## 3D apparatus

The burette now has numbered 0–50 mL graduations and a gold reading guide in its close-up. Labels use texture-free line geometry, aligned to the same vertical mapping as the existing ticks. The guide follows the current fill reading independently of cumulative delivered volume. The scene also adds rubber clamp grips, screw details, a burette glass highlight, an inner flask lip, and a transverse valve body. The existing chemistry and liquid colors are retained.

## Reading lens

The burette close-up replaces its curve side panel with a magnified 3 mL window around the current reading. The window includes 0.1 mL ticks, a gold guide, explicit units, empty-burette handling, and the existing clear/dark-titrant reading convention. Its range remains within 0–50 mL. The lens explains that the current fill reading differs from cumulative volume after refills. The existing side-panel toggle controls the lens in this view and the live curve in the others.

## Large 2D apparatus

The 2D bench now includes a large SVG apparatus with a stand, burette, numbered scale, stopcock, glass flask, white tile, annotations, and responsive close-ups. Both liquid levels use the same numerical data as the 3D scene; the receiving flask uses the existing tapered-volume profile. The new diagram replaces the small legacy flask after mounting, including when WebGL fails. Additions, readout cards, the live curve/reading lens, and notebook remain available in 2D.

Finite drop and bloom cues are retained, restart on repeated additions, and respect both lab and system reduced-motion settings. SVG gradient and clipping IDs belong to each React instance. New assets are code-native; there are no additional libraries, fonts, images, or downloaded textures.

Source/public mirror: `stem_lab/stem_tool_titration.js` and `desktop/web-app/public/stem_lab/stem_tool_titration.js`. New English strings are registered in the titration catalog; other-language translations remain follow-up work. The legacy drawing remains available while the enhanced workspace is loading. No deployment changes.

Evidence is saved under `reports/chemistry-refinement-2026-09-06/titration-visual-*`, including a browser baseline capture, regression reports, the reproducible browser harness, and final screenshots.

## Validation

- All 297 distinct Titration tests pass across the main run and an isolated retry. The main run had one 30-second axe timeout followed by 12 non-reentrant axe errors; the contrast worker also failed to start. The isolated accessibility and contrast rerun passed all 53 tests. Both raw JSON reports are retained.
- Real Chromium/Three.js verification passed 18 WCAG axe scans: 1200, 360, and 320 pixel widths, both 3D and 2D, and all three apparatus close-ups. No horizontal overflow or page errors were found in those checks.
- Browser checks cover linked addition readings, cumulative volume versus refill readings, an empty burette, dark titrant, flask fill changes, finite drop/bloom motion, lab/system reduced motion, WebGL context loss, and clean unmount.
- Five final screenshots were visually inspected. A final 320-pixel check confirms that the burette unit label fits fully inside the close-up after adding top padding.
- JavaScript syntax, scoped Git whitespace checks, and byte-for-byte source/public parity pass.

The browser harness renders the real widget with its actual React, Three.js, host module, and compiled styles in a local fixture. This is component-level browser validation, not a deployed-platform or physical-device audit.
