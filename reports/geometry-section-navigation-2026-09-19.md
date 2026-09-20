# Geometry Sandbox — sculpt section navigation

Sculpt editing now opens one inspector section at a time. The active Size, Move, Rotate, Arrange, or Material shortcut is highlighted, and shortcuts remain pinned while scrolling. Name & group participates in the same section behavior through its heading.

The active section is stored as a workspace preference and survives part changes, Project/Edit navigation, and reload. Clicking an open heading can close all sections. Unknown saved preferences fall back to Size. Section navigation does not alter geometry or undo/redo history.

Jumping to a section focuses its heading and scrolls it clear of the pinned shortcuts. Phone layouts also account for the pinned canvas.

The saved preview page was updated to the current app stylesheet, `main.1fb7b97e.css`, after the first browser run exposed its outdated stylesheet reference.

## Verification

- 47 tests passed across the new section-navigation suite, sculpt editor, and sculpt materials.
- Browser checks passed at 1440, 390, and 320 pixels: exclusive opening, active shortcuts, keyboard Enter/Space operation, focus and scroll clearance, saved preferences after reload, and unchanged geometry/history/camera.
- No page errors, failed requests, or horizontal overflow in the final browser run.
- Desktop and narrow-phone screenshots visually reviewed.
- JavaScript syntax and scoped whitespace checks passed. Main source and public mirror match SHA-256 `5D030CF03327859EE8A24CD238D4919DFCA3F98CD36AF3F622F8D3707BB66554`.

Browser results and screenshots are in `scratch/geometry-section-navigation-2026-09-19/`.

This pass covers browser sculpt editing; no headset testing was performed.
