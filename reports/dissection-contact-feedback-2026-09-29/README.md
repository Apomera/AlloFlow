# Dissection Lab contact feedback

September 29, 2026

The instrument feedback card now uses larger text, wraps complete lines, and adjusts its height to the content. Its opaque background keeps the text clear over anatomy and supports high contrast.

Placement follows the measured bounds of anatomy labels and inspection captions. The card tries positions around the pointer, the canvas corners, and the edges of selected text. Selected anatomy captions take priority when space is crowded. A thin leader connects displaced feedback to the contact point.

The card stays within the canvas during zoom and mirrored views. Placement also accounts for the specimen title, orientation and scale panels, physiology display, and macro preview.

| Previous selected structure | Updated selected structure |
| --- | --- |
| [Feedback over the depth caption](before-ventral.png) | [Feedback beside clear anatomy text](desktop-ventral.png) |

- [390-pixel phone with large text](phone-390.png)
- [320-pixel phone with large text and high contrast](phone-320.png)
- [Dorsal view](desktop-dorsal.png)

The browser checks inspect actual painted text and card bounds, move the pointer near each canvas edge, verify caption clearance in both orientations, and confirm saved observations are preserved. Final verification is recorded in [final-browser-tests.log](final-browser-tests.log) and [unit-results.json](unit-results.json).

All 25 Chromium scenarios passed, including the existing label, marker, physiology, and system-key checks.

All 113 focused regression checks passed: 109 canvas/workspace checks and [four procedural checks](workflow-results.json). Both renderers pass JavaScript syntax checks and match byte for byte; both locale files parse successfully.

The commit includes the accumulated Dissection Lab clarity improvements. Shared locale files are staged with only the Dissection Lab entries.
