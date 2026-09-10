# Geometry Sandbox — compact sculpt part switcher

The Edit panel now offers a direct part dropdown with adjacent Previous/Next arrows. It shows the selected part's color, position in the list, shape, group, and lock state. Boundary buttons disable at the first and last parts; a single-part sculpture disables both.

The visual list and search/filter controls remain under Browse parts, initially collapsed. Search controls appear directly inside that disclosure. A Filtered badge makes active browser filters visible when collapsed; quick switching still includes every part.

The Parts tab retains its full visual list. Existing selection behavior, geometry editing, material drafts, undo history, and camera framing are preserved.

## Verification

- 46 targeted tests passed: 33 sculpt editor tests, 7 material tests, and 6 new switcher tests. The combined run could not start the switcher test worker; the isolated switcher suite passed without errors.
- Chromium preview checks passed at 1440, 390, and 320 pixels, repeated after tightening the final layout. Covered dropdown selection, stepping and boundaries, locked-part metadata, search with Enter, switching beyond a filter, unchanged sculpture/history/camera, and responsive control bounds.
- Browser runs recorded no page errors or failed requests.
- Final desktop and narrow-phone screenshots reviewed.
- JavaScript syntax and scoped whitespace checks passed. Source and public mirror match: SHA-256 `7E359F255A9138C20D62C92140B0553D7180C264DB308AA3BC203A15335237B7`.

Screenshots and browser results: `scratch/geometry-part-switcher-2026-09-09/`.

This pass covers browser sculpt editing, not headset operation.
