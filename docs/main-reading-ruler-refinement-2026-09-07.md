# Main Reading Ruler refinement — 2026-09-07

The main Reading Ruler now starts in the viewport center when enabled or restored from its existing saved preference. Its 100px reading window is clamped to the viewport and shrinks when the viewport is smaller. Body/document-root geometry never replaces a meaningful reading position, including on long pages and after modal removal.

Pointer movement, pointer presses, one-finger touch, and keyboard focus position the guide. Touch listeners are passive; ordinary scrolling, zoom gestures, field editing, and keyboard navigation keep their native behavior. Movement updates are coalesced once per animation frame. The ruler does not install global navigation shortcuts.

The mask temporarily pauses over headers, toolbars, and dialogs so their controls remain visible. It resumes on return to reading, panel removal, or hidden-dialog closure without requiring a mouse. A focused modal stays unmasked when the pointer moves over its backdrop. A mutation observer runs only while paused and is disconnected on resume, disable, and unmount; event listeners and queued frames are also cleaned up. The visual bands remain pointer-transparent and excluded from the accessibility tree.

## Scope and evidence

- Runtime edits: only the ruler initialization, input lifecycle, and band-render chunks in `AlloFlowANTI.txt`. The existing `allo_reading_ruler` preference and toggle remain intact.
- Dedicated suite: `tests/reading_ruler_input_lifecycle.test.js` extracts and renders the actual production state, handlers, persistence, and JSX rather than duplicating their implementation. **14/14 tests passed**.
- Regression batch: the dedicated ruler suite plus `tests/simplified_line_focus_keyboard.test.js` passed **20/20 tests across 2 files**, with zero failures. Results: `scratch/reading-ruler-input-results.json`; log: `scratch/reading-ruler-input-test.log`.
- Covered cases include persisted reload, long-page body/document-root geometry, movement coalescing and bounds, mouse fallback, passive single-touch/multitouch handling, focus tracking and native keys, header pause/reading resume, Student tools enable then close, modal removal and hidden closure, tiny viewport resizing, disable/unmount cleanup, and cancelled stale callbacks.

This bounded refinement does not add band-size settings or global shortcuts. Reading Library has a separate local ruler refinement in the parallel workstream. The parent task owns the final combined host build and mirrored app output. Validation here uses actual React handlers/components in jsdom; no live classroom or full-app browser assessment is claimed. No deployment or commit was performed.
