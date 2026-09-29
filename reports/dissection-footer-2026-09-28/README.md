# Dissection Lab: clearer canvas footer

September 28, 2026

## Changes

- Numbered-marker help appears below the canvas, with a **Browse structures** button that opens the matching numbered list and focuses its search field. Opening the list clears its filters while preserving observations and confidence ratings.
- The default preserved-heart view no longer shows a decorative rhythm strip. Enabling the living-function model shows an illustrative **MODEL TRACE** using the model's playback clock, pause setting, and reduced-motion preference.
- The trace stays fixed during specimen zoom, pan, and orientation changes. The scale card and layer label reserve space above the physiology displays. An active organ-system pathway uses the left display slot in place of the heart trace.
- Normal workspace guidance can wrap outside the canvas. Fullscreen keeps its canvas hint; assessment hides the marker guide and model trace.
- The source module and desktop copy match. The new labels are in both locale files.

## Visual review

Reviewed the phone layout at 390 px, with large text enabled, in dorsal and ventral views and at 2× zoom.

- [Preserved heart and structure guide](phone-preserved-heart.png)
- [Living model overview](phone-model-ventral-overview.png)
- [Dorsal view at 2× zoom](phone-model-dorsal.png)
- [Ventral view at 2× zoom](phone-model-ventral.png)

## Verification

JavaScript syntax, locale JSON parsing, source/mirror equality, and scoped whitespace checks pass.

The browser regression covers guide navigation, preservation of notes and confidence, panel separation in both orientations, zoom, assessment, playback, pause, and reduced motion. Playback uses a controlled 80 ms frame interval because the existing animation clock discards long gaps, and software rendering on this machine can exceed that threshold.

Four layout/navigation checks passed in `verified-browser-tests.log`. A later full rerun was stopped after browser setup and teardown timeouts; its incomplete output is retained in `final-browser-tests.log`.

The focused playback/pause/reduced-motion check and the existing Advanced/fullscreen regression both pass in `playback-fullscreen.log` (2 passed). This gives six passing browser checks across the focused runs.

The focused unit suite passes **109/109 checks** across `tests/dissection_canvas_loop.test.js` and `tests/dissection_workspace_bands.test.js`. Results are saved in [unit-results.json](unit-results.json).
