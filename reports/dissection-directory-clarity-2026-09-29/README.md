# Dissection Lab directory clarity

September 30, 2026

Structure browsing now uses spaced cards with clearer names, numbered markers, note status, and separate visibility badges. Names use 15.2-pixel text, or 16 pixels in larger-text mode. Supporting text uses at least 14 pixels. Progress filters have larger controls, and the result count has its own visual group.

The visible search label matches its accessible name. A short keyboard hint explains how to enter and browse results.

## Interactions

- **Down arrow from search** focuses the first result.
- **Up and Down arrows** move between results. **Home and End** move to the first and last results.
- **Up from the first result** returns to search. **Escape from a result** clears search and filters and returns focus to search.
- **Enter** activates the focused result using the existing exposure checks. Hidden anatomy offers a recovery cue; navigation keys alone preserve inspection progress.
- An empty progress filter offers **Show matches in this layer**, which removes the filter and retains the search.
- An unsuccessful search offers **Show all structures in this layer**, which clears search and filters and returns focus to search.

Existing notes, confidence, verified identifications, scores, and layer preparation are preserved. Other-layer matches retain their existing access restrictions. The directory stays unavailable during assessment.

## Visual review

| Layout | Previous directory | Updated directory |
| --- | --- | --- |
| Phone, 320 pixels | [Before](before-phone.png) | [After](after-phone.png) |
| Tablet | [Before](before-tablet.png) | [After](after-tablet.png) |
| Narrow embedded lab, larger text and high contrast | [Before](before-embedded-large.png) | [After](after-embedded-large.png) |
| Desktop | [Before](before-desktop.png) | [After](after-desktop.png) |
| Forced colors | [Before](before-forced-colors.png) | [After](after-forced-colors.png) |

- [Keyboard focus](focus-phone.png)
- [Empty progress filter](empty-filter.png)
- [Unsuccessful search](empty-search.png)

Screenshots temporarily place the floating status bar in normal document flow so it does not overlap the captured component. This adjustment applies only during capture.

## Verification

All ten Chromium scenarios passed, with no retries or skipped scenarios. Five layouts passed automated accessibility checks. The remaining scenarios verify explicit activation, focus restoration, empty-state recovery, hidden-anatomy safeguards, assessment restrictions, and scrolling to the last result in a long list. Layout checks measure text size, control height, and overflow.

All 258 focused regression checks passed, including directory filtering, saved-evidence and reference behavior, workspace layout, and the renderer loop. The two renderer copies match and pass JavaScript syntax and scoped whitespace checks.

Results are recorded in [verification.json](verification.json), [browser-results.json](browser-results.json), and [unit-results.json](unit-results.json). The five original layouts are recorded in [baseline-results.json](baseline-results.json).

Changes remain uncommitted.
