# Cell comparison visual refinement

The comparison workspace now carries the same A/B identity markers from each organism selector through all seven evidence properties. Teal and violet accents, letter markers, and organism names work together so the two sides remain recognizable when rows stack on a phone or the pair is swapped.

- Organism cards present cell organization and typical size as labeled facts.
- Evidence rows separate the property heading, matching/different status, organism name, and description. Status badges include text and a symbol, not just color.
- Property filters show counts and announce how many properties are displayed. Empty filters provide a direct recovery button that returns keyboard focus to All properties.
- Cards and evidence rows switch to one column based on the panel's available width. Buttons, selectors, and search have 44px minimum heights, with visible keyboard focus.
- Existing comparison descriptions, pair-specific writing, search, and exported reports remain available.

## Validation

- Seven comparison model and integrated-rendering checks pass (`unit-final.log`). The initial file-parity check exceeded its 30-second timeout on this busy workspace; the complete suite passed with a larger timeout.
- Syntax check passes. All four active simulator copies have matching SHA-256 hashes.
- Four browser checks pass (`browser-final.log`): existing search, pair-specific drafts and downloads, plus 280px, 640px, and 1200px layouts. Checks cover consistent identity after swaps, counts and live filter results, keyboard recovery focus, 44px targets, enlarged text, and stacking inside a narrow desktop panel. No page errors were reported.
- Desktop workspace, phone cards, and enlarged phone evidence screenshots were visually reviewed. The first browser run exposed decorative text inside native labels; moving the markers beside the labels resolved it without weakening the assertions.

## Previews

- [Desktop workspace](workspace-1200.png)
- [Phone organism cards](pair-280.png)
- [Phone movement comparison](movement-280.png)
- [Phone comparison with enlarged text](movement-enlarged-280.png)
- [Desktop movement comparison](movement-1200.png)

No deployment or commit was performed.
