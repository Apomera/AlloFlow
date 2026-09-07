# Raptor Lab UI and UX review

This pass improves discovery and navigation across the 99-activity lab. It preserves the existing simulation work and updates both canonical and desktop source copies.

## Findings and changes

| Finding | Implemented change |
| --- | --- |
| A tall introduction, stretched stat cards, and competing accent colors delay discovery. | A compact two-column field-station introduction, original raptor emblem, neutral surfaces, warm primary action, and appropriately sized profile cards. |
| Collection descriptions are small and nine strongly colored borders compete for attention. | Larger descriptions and headings, restrained borders, consistent spacing, and clear hover/focus feedback. |
| Phone collection browsing relies on sideways scrolling. | Visible, vertically arranged collection cards on narrow layouts. Container queries also handle narrow panels inside a wide desktop window. |
| Search exists only at the hub and matches titles alone. | Search is available in every section, matches activity titles and collection names/descriptions, trims whitespace, supports multiple search terms, and prioritizes title matches. |
| Search results provide little context and lack an explicit clear action. | Result cards show the collection, a live result count, an empty state, and a clear button. Enter opens the first result; Escape clears the query. |
| Search discards the collection context. | Clearing a search preserves the current collection. Opening a result updates navigation in one state change and focuses the destination heading. |
| The activity switcher is a flat list of 99 options. | Options are grouped into the nine collections. |
| Progress totals disagree: one counts the hub and obsolete saved IDs. | Both hub summaries count only valid content activities, using the same 99-activity denominator. |

## Validation

- Seven browser checks cover keyboard search, result focus, collection return paths, progress accuracy, 1280/768/390-pixel layouts, a 420-pixel embedded desktop panel, and system high-contrast controls.
- Three existing WebGL flight-continuity checks pass, including pause/resume, landing/takeoff, and reduced motion.
- Focused unit suites: 206 passed, two existing failures. The pre-edit source already lacks the literal English label expected by the flight setup assertion because it uses a translation helper. The pre-edit source also has 225 missing accessibility translation keys against a threshold of 175; this pass does not increase that count.
- Syntax and whitespace checks pass. Canonical and desktop source copies are byte-identical.
- Local captures are in `scratch/raptor-ui-final-1280.png`, `scratch/raptor-ui-final-768.png`, `scratch/raptor-ui-final-390.png`, and `scratch/raptor-ui-forced-colors.png`. Search captures use `scratch/raptor-ui-search-<width>.png`.

## Scope and remaining considerations

The visual review covers the shared discovery/navigation experience, with flight continuity verified through existing browser tests. It is not an individual visual certification of every activity. Five new copy strings use translation keys with English fallbacks; translated language-pack entries remain to be supplied. No deployment was performed.

Implementation: `stem_lab/stem_tool_raptorhunt.js` and its identical `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js` mirror. Browser regressions: `tests/e2e/raptor-lab-navigation.spec.ts`.
