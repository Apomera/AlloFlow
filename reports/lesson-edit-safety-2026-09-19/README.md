# Lesson edit safety and navigation — September 19, 2026

- Changed script drafts require an explicit Discard changes action. Keep editing receives initial focus, Escape cancels, and cancellation preserves the draft recovery copy. Further typing cancels an old confirmation. Unchanged drafts close directly, including an equivalent minute value entered again.
- A full-script step selector scrolls to and focuses a saved step heading or the first field of a draft step. Navigation preserves draft text.
- Source warnings name the affected resources by their recorded titles, with current title/ID fallbacks. Changed, unavailable, and duplicate-ID resources are distinguished. Steps no longer offer an ambiguous resource link. Long titles/IDs wrap at phone widths.

Validation: 98 tests passed across four affected suites, including confirmation focus/cancellation, recovery deletion only after confirmation, draft navigation, and ambiguous source links. Existing discard/recovery tests now include the explicit confirmation when text changed.

Real Chromium checks passed at 1280 and 320 px for full-script and spoken navigation, retained position, fullscreen lifecycle, Undo, edit feedback, safe discard focus, Escape cancellation, confirmed discard, and long source-warning layout. No browser errors, horizontal overflow, or axe violations in the checked views. The phone confirmation screenshot was visually inspected. Script-view module/public mirror rebuilt.

This remains local work; nothing deployed. The earlier live AI/TTS verification still awaits a reachable app/provider session.
