# Project palette enhancements — September 30, 2026

Thread Kit now includes an editable project palette. Select a numbered swatch, enter a three- or six-digit hex color, use the native color picker, move colors left or right, add the active drawing color, or remove a swatch. Palettes hold up to eight colors. Other labs can start with an editable gray swatch. Editing the palette leaves the current artwork unchanged until a transfer is selected.

Thirty-step palette undo/redo supports buttons and Ctrl/Cmd+Z, Shift+Z, and Y while focus is in Thread Kit. Text fields retain their native undo behavior. Invalid hex drafts never enter the palette, and Escape restores the saved value. Removing the final swatch moves focus to Add color and remains undoable. History and drafts reset when the learner, project, or externally captured palette changes. Palette history does not undo the project's contrast goal.

The old Thread Kit sanitizer and shared brush controls rounded HSL channels to integers. Both now retain fractional channels, so carefully entered RGB colors survive reuse. Display labels remain short. Invalid channel types and non-finite values are rejected; numeric strings from legacy data remain supported. Existing palette and project storage schemas are unchanged.

Apply the selected color to Color Wheel, either Mixer input, Watercolor pigment, Pixel Art, Symmetry, Spirograph, Generative Art, Spin Art, or String Art. Existing whole-palette transfers to Pixel Art, Gradient, and Contrast remain available. Download the ordered palette as a CSS file containing `--palette-1` through `--palette-8`. Project workflow storage preserves fractional colors, and Pixel Art study snapshots retain an applied custom palette.

Palette colors use opaque HSL values; Gradient stop opacity is not carried through Thread Kit. Palette undo is session history rather than a persisted edit log. This pass does not alter Watercolor's paint simulation or Pixel Art's existing expanded grid.

## Validation

- **173 tests passed across 14 files** in the broader scoped run, including 20 new cases for palette editing and precision after storage/reload. Coverage includes shared Thread Kit workflows, Color Wheel, Mixer, Gradient, Pixel Art, saved studies, learner hydration, learning boundaries, accessible labels, announcements, and malformed saved state. See [regression results](palette-regression-results.json).
- The focused precision/storage run passed all 21 cases in two files. The earlier 42-case run caught a test assertion targeting a nonexistent study field; the corrected regression verifies the actual Pixel Art study payload.
- Actual Chromium checks passed at 1440 × 1000 and 390 × 844 with **zero page errors**. Tests covered keyboard undo/redo, invalid drafts, exact Gradient round trips, both Mixer inputs, Watercolor pigment selection, final-swatch deletion/focus recovery, and an actual CSS download. See [browser results](palette-browser-results.json).
- A painted pixel using `#123456` exported as exactly RGBA `[18, 52, 86, 255]`. The existing red cell stayed unchanged, and empty sprite cells remained transparent. The native sprite measured 16 × 16 pixels.
- Desktop and phone screenshots were visually reviewed. Phone controls met the 44-pixel minimum and fit without horizontal page or dialog overflow.
- JavaScript syntax, pinned Spectral source/license verification, source/public parity, and scoped whitespace checks passed. A diff against the full pre-pass working copy confirmed that source changes were confined to palette normalization, shared color controls, and Thread Kit editing.

Previews: [desktop palette editor](palette-desktop-editor.png), [phone palette editor](palette-phone-editor.png), [downloaded CSS](palette-browser-export.css), and [native pixel sprite](palette-pixel-sprite.png).

Implementation: `stem_lab/stem_tool_artstudio.js` and its identical served copy at `desktop/web-app/public/stem_lab/stem_tool_artstudio.js`. Browser checks: `dev-tools/artstudio_palette_qa.cjs`. See [validation metadata](palette-validation.json). No full repository suite or deployment was performed. All changes remain local and uncommitted, as requested.
