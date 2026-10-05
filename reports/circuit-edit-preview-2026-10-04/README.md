Undo and Redo now offer a preview of the next setup they will restore. Students can open **Preview Undo and Redo** beneath **01 · Change the input**, compare the current and restored settings, and see how many steps are available. The disclosure starts closed.

The preview includes experiment switches and every changed normalized setting. Stored input, light and divider values are identified when they apply to another experiment. Numeric values retain the saved precision, including nearby fractional voltages. Empty history offers a short prompt to change an input or component and revisit the previous setup.

The existing history actions preserve saved readings, notes, explanations, lessons, references and probe selections. Opening the preview does not write circuit data. The disclosure remains open as its content updates after Undo, Redo or a new edit. Action descriptions use IDs local to each workbench. Numeric cells retain left-to-right order; translated phrases and English fallbacks choose their own text direction.

The final verification passed **65 tests across four files**, including **14 new cases** in [circuit_edit_preview.test.js](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_edit_preview.test.js>). Existing starter settings, lesson records and exact value entry tests also passed. Two local browser workflows exercise keyboard interaction, restored values, experiment switching, Redo invalidation and authored-work preservation.

Seven browser views were inspected at original resolution. Overflow checks passed at 320, 390 and 1280 pixels. Scoped axe checks found zero WCAG A/AA violations in the history toolbar and preview. Visual checks cover the initial guidance, one-step preview, two actions, system colors, focus and text direction.

| Preview | Image |
| --- | --- |
| Closed disclosure | [Desktop](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/desktop-collapsed.png>) |
| First experiment guidance | [Phone](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/phone-empty-history.png>) |
| One input change | [Desktop](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/desktop-edit-preview.png>) |
| Undo and Redo together | [Desktop](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/desktop-both-actions.png>) |
| Narrow layout | [320-pixel phone](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/small-phone-both-actions.png>) |
| System colors | [High contrast](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/forced-colors.png>) |
| Text direction | [Right-to-left](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/rtl-preview.png>) |

The initial browser fixture compared an absent lesson record with its normalized empty form; that check was corrected. High contrast review then caught the input heading’s fixed text color. Visual review caught English fallback word order and punctuation in a right-to-left layout. The earlier results are preserved in `initial-browser-check`, `before-heading-contrast-fix` and `before-text-direction-fix`.

[validate.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-edit-preview-2026-10-04/validate.cjs>) verifies the final source hash, source/mirror equality, syntax, tests, browser evidence, image hashes, scoped whitespace checks and an empty index for the affected paths. Reversing the recorded source edits recovers the preceding source byte for byte. Changes remain uncommitted.

The final source SHA-256 is `474dc434a0f710c365325ad66b9931b5bdd9398ad9a874ae885aed501fbea6d7`.
