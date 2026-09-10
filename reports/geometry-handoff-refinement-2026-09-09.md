# Sculpt project handoff refinement — 2026-09-09

Project history now captures the recipe together with its saved-gallery association and document identity. Undoing or redoing a saved-project load restores the correct Save destination; returning to an unsaved project no longer leaves Save pointing at the last opened gallery entry. New, imported and generated projects start with a fresh save association.

Opening a saved sculpture, importing one or starting a new sculpture requests camera framing after the replacement scene is built. Undo/Redo across those project boundaries also reframes. Ordinary part edits preserve the current camera.

Added a Project status card showing Working copy or Saved to gallery, the sculpture title, and whether Save creates an entry or updates a named entry. Continue editing opens the inspector directly.

Source: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

- 49 tests passed across project handoff, saved gallery, editor and rapid-drag suites. Covered save destinations through load/Undo/Redo/New, unsaved-project restoration, working/saved state, and existing history behavior.
- Browser checks passed at 1440, 390 and 320 pixels wide. Verified complete framing of tall/wide saves and imports, save destinations through Undo/Redo, unchanged unrelated gallery saves, working/saved status, Continue editing, and camera stability during ordinary edits. No page errors or failed requests occurred.
- Visually inspected desktop and narrow-phone Project cards and framing.
- JavaScript syntax and scoped formatting checks passed; source/public hashes match.

Evidence: `scratch/geometry-handoff-refinement-2026-09-09/browser-results.json` and adjacent screenshots. Physical headset behavior was outside this browser editing pass.
