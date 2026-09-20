# Geometry Sandbox — sculpt shape chooser

The Parts panel now puts Add a shape before the existing part collection. Five shape cards use larger line previews, readable labels, and generous click targets. The chooser shows remaining capacity and explains how to make room when all 14 slots are used.

Adding a shape selects it, opens Edit → Size, and focuses the size-section heading. An empty project starts directly with the chosen primitive. The saved Keep adding shapes option stays in Parts for repeated additions. Each addition remains one undo step; changing the preference does not create history entries.

The former redundant empty-project starter was removed in favor of choosing a shape directly. New sculpture remains available from Project.

## Verification

- 53 tests passed across shape chooser, sculpt editor, section navigation, and dragging.
- Initial preservation assertions used incomplete fixtures. Fixtures were corrected to include normal part identity metadata and unused size slots; no geometry changes were needed. A drag test worker failed to start during the combined run; its isolated rerun passed.
- Final Chromium checks passed at 1440, 390, and 320 pixels: label fitting, control sizes of at least 44 × 44 pixels, horizontal reflow, add-to-Size focus, preserved existing parts, repeated additions, undo, preference persistence after reload, and keyboard activation.
- No browser page errors or failed requests in the final run. The preview server was restarted after it stopped before one verification attempt.
- Desktop and narrow-phone screenshots reviewed. Oversized labels inherited from an older palette style were corrected before final verification.
- JavaScript syntax and scoped whitespace checks passed. Source and public mirror match SHA-256 `FF2A5BDC5BBB3AEF6D2EFA6437687053996BA9D41DDC58B25708E5CBDEDE64B7`.

Browser results and screenshots: `scratch/geometry-shape-chooser-2026-09-19/`.

This pass covers browser sculpt creation, not headset operation.
