# Dissection Lab — visual evidence notebook

Saved frames now have readable, wrapped details, visible frame numbers, distinct comparison/download names, and complete capture times in UTC. The reference pane uses the same metadata. Missing or nonnumeric scores and invalid capture times show an explicit unavailable/not-recorded message; numeric zero remains valid and finite scores are clamped to 0–100. Raster downloads retain the recorded PNG, JPEG, or WebP format.

The notebook remembers its disclosure state independently of split comparison. Comparing a frame focuses its reference heading. Closing comparison returns focus to that frame's control and keeps the notebook open and the reference selected. Capture opens the new reference. Confirmed removal and clearing retain their existing safeguards and recover focus.

In Essentials, the saved-frame action now says “Open comparison in Advanced.” It opens the existing Advanced workspace and focuses the reference pane, preserving saved work and the selected lens. Closing comparison returns focus to the same frame's comparison control.

## Visual review

Screenshots use seeded records and thumbnails taken from the actual rendered specimen canvas. Both sides use the same setup. Phone and narrow layouts stack actions and comparison panes; larger text, high contrast, forced colors, and text spacing are covered.

| Layout | Evidence notebook | Reference pane |
| --- | --- | --- |
| phone | [Before](baseline/captures/before-phone-notebook.png) · [After](browser-final/captures/after-phone-notebook.png) | [Before](baseline/captures/before-phone-reference.png) · [After](browser-final/captures/after-phone-reference.png) |
| tablet | [Before](baseline/captures/before-tablet-notebook.png) · [After](browser-final/captures/after-tablet-notebook.png) | [Before](baseline/captures/before-tablet-reference.png) · [After](browser-final/captures/after-tablet-reference.png) |
| desktop | [Before](baseline/captures/before-desktop-notebook.png) · [After](browser-final/captures/after-desktop-notebook.png) | [Before](baseline/captures/before-desktop-reference.png) · [After](browser-final/captures/after-desktop-reference.png) |
| embedded medium | [Before](baseline/captures/before-embedded-medium-notebook.png) · [After](browser-final/captures/after-embedded-medium-notebook.png) | [Before](baseline/captures/before-embedded-medium-reference.png) · [After](browser-final/captures/after-embedded-medium-reference.png) |
| embedded large | [Before](baseline/captures/before-embedded-large-notebook.png) · [After](browser-final/captures/after-embedded-large-notebook.png) | [Before](baseline/captures/before-embedded-large-reference.png) · [After](browser-final/captures/after-embedded-large-reference.png) |
| forced colors | [Before](baseline/captures/before-forced-colors-notebook.png) · [After](browser-final/captures/after-forced-colors-notebook.png) | [Before](baseline/captures/before-forced-colors-reference.png) · [After](browser-final/captures/after-forced-colors-reference.png) |

## Verification

- **11 new browser checks and 1 existing full-notebook browser check passed.** Native Enter/Space, Tab, summary disclosure, confirmed/canceled removal and clearing, real capture, resizing, text spacing, the Essentials handoff, and byte-for-byte PNG/JPEG downloads are covered.
- **211 distinct unit checks passed** across the two scoped suites, including five new native React evidence cases. The existing full-lab accessibility check ran in a fresh worker; the remaining 210 checks ran separately, with every assertion retained. Unknown metadata, invalid calendar dates, nonnumeric scores, timestamp collisions, immutable frames, focus recovery, and the Essentials handoff are checked.
- All six scoped accessibility audits have **0 violations** and **0 incomplete results**. Final metadata is at least 14px (16px with larger text); control text is at least 16px (18px with larger text); controls are at least 48px in both dimensions. No measured text or controls clip or use ellipsis. Whole-lab axe retains its existing jsdom color-contrast exclusion; palette contrast assertions run separately.
- Delete confirmations have a visible white 3px inset focus ring on red in normal colors. High contrast and forced colors retain their dedicated outlines. [Removal focus](browser-final/captures/confirm-remove-focus.png) · [Clear focus](browser-final/captures/confirm-clear-focus.png).
- Workflow proofs preserve notes, confidence, identified/explored structures, procedure and assessment records, camera, pinned lens, annotations, and ruler points. Capture adds one 220×264 compressed JPEG without replacing earlier frames. Capacity management preserves all six frames.
- Both renderer copies parse and match. Exact edit reversals recover the previous uncommitted renderer and unit files; the new browser spec reverses to absence. [Validation summary](validation-summary.json) records tested input hashes, measurements, and run results.

Raw successful results: [Browser](browser-final/results.json) · [Units](unit-main-final/results.json) · [Full-lab accessibility](unit-axe-final/results.json) · [Full notebook](shelves/results.json). Earlier runs are preserved separately. One browser check mixed a pointer Close with keyboard navigation and changed transient canvas hover; the final keyboard check keeps every strict proof field. Native unit focus checks now commit the React update before awaiting its deferred focus callback; the stale optics source assertion uses the shared metadata helper. A thread worker failed to start and a full unit run stalled at the existing accessibility check; final unit runs use one fork worker with that check isolated. React act warnings are retained in the unit stderr logs.

No files were staged, committed, pushed, or deployed. Earlier dissection work and unrelated workspace changes were preserved.
