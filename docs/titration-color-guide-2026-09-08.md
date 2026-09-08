# Titration observation guide and surface cues — September 8, 2026

The flask close-up now pairs the apparatus with a color guide. The full apparatus retains the live curve, and the burette close-up retains the reading lens. The existing side-panel button changes its name with the selected view and remains keyboard accessible.

The guide samples the existing indicator color function, including its alpha channel, rather than duplicating color or endpoint calculations. A white backing makes the colorless reference visible. Ordinary indicators show their transition bracket and three reference values; universal indicator shows the full pH spectrum. Reference pH values retain two-decimal precision when needed, such as methyl orange's 3.75 midpoint.

Permanganate has a separate guide based on the existing redox color function. Its horizontal axis is added volume, its current readout is potential in volts, and the equivalence marker comes from the preset's calculated volume. The references show the start, equivalence, and 0.1 mL beyond equivalence. The guide reuses the existing observation status; it adds no new endpoint detection.

Three surface rings expand and fade briefly when a drop lands in the 3D or 2D flask. Their geometry stays within the liquid surface. Idle scenes, empty flasks, and burette close-ups do not show ripples. Live motion respects the lab and system reduced-motion settings. The existing static addition inspector holds a fixed ripple pose without advancing time or changing experiment data. These are illustrative cues, not a fluid-dynamics model.

No assets, packages, or network dependencies were added. The source and public copy are kept identical. New English fallback strings are included in the titration catalog; translations remain follow-up work.

Verification evidence is saved under `reports/chemistry-refinement-2026-09-06/titration-color-*`.
## Validation

- 98 distinct targeted tests passed: immersive geometry (48), chemistry (24), visual motion (15), and internationalization coverage (11). The initial motion fork failed to start; its isolated worker-thread rerun passed all 15 tests. The final outlined ripple geometry was then rechecked with all 48 immersive tests passing.
- Real Chromium verification passed all four indicator palettes plus universal indicator, current-color updates after additions, exact redox units and reference volumes, keyboard show/hide, fixed static-inspector poses, finite 2D ripples, reduced motion, WebGL context loss, and clean unmount.
- All 12 final WCAG axe scans passed: acid/base and redox, 3D and 2D, at 1200, 360, and 320 pixel widths. No horizontal overflow or page errors were observed.
- Desktop and mobile screenshots were visually inspected. Dark outlines improve the ripple and equivalence-marker visibility over pale colors.
- Final JavaScript syntax, scoped Git whitespace checks, and byte-for-byte source/public parity passed.

The browser harness uses a local fixture with the real widget, host module, React, Three.js, and compiled application styles. These results cover the component; they are not a deployed-platform or physical-device audit. No deployment was performed.
