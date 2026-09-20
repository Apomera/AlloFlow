# Lesson script export and history — September 19, 2026

- Unfinished draft text can be copied, downloaded or printed even when field lengths or timings prevent saving. Draft exports are clearly labeled UNSAVED DRAFT — not validated, preserve the current field text, and do not update the saved version. Download filenames have a -draft suffix. These are human-readable text copies, not an importable recovery format.
- Full scripts have a dedicated print view including teacher notes and references. Saved versions still pass through the existing validated formatter. Print HTML escapes all content and disconnects the opener; blocked popups produce an actionable message while retaining the draft.
- Version choices show scope and duration alongside the title. Edited versions also show their last edit timestamp.

Validation: 104 tests passed across four affected suites. Coverage includes incomplete draft copy/download, unchanged saved-script validation, reference and note inclusion, markup escaping, blocked popups, draft retention, download URL cleanup, and version metadata.

Real Chromium checks passed at 1280 and 320 px, including actual draft downloads and rendering both saved and unfinished print documents. Print requests were intercepted during automation to avoid opening a system printer dialog; document content, opener isolation, accessibility and layout were checked. No browser errors, horizontal overflow or axe violations in the checked views. Desktop saved-print and phone draft-print screenshots were visually reviewed. Script-view module and public mirror rebuilt.

Nothing deployed. Live AI/TTS generation remains unverified pending a reachable configured app session.
