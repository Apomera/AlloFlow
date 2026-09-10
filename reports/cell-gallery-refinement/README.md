# Cell simulator observation gallery refinement

Observation cards now show each model's cell type, movement, and anatomy structure count. These details stay visible on narrow phones; the compact mission-card behavior applies to Play mode.

Cards distinguish Selected, Observed, and Explore states. The gallery summary counts observed models from the known catalog, ignoring duplicate or unknown saved IDs. The existing observation tracking provides the state; no new storage format was added. Screen-reader descriptions include classification, movement, structure count, and whether the model was previously observed.

Observation cards use aligned footers, consistent spacing, and a clear selected treatment. Saved mission completion and recommendation styling applies only to Play cards.

## Verification

- 5 browser checks passed: new observation workflows at 1200px and 320px, plus existing illustrated-gallery checks at desktop, phone, and compact Play sizes.
- Checks cover all eleven portraits, persistent portrait rendering, visible phone details, observation counts and state changes, accessible descriptions, keyboard selection, return focus, and horizontal overflow.
- 15 unit tests passed for canvas lifecycle, tutorial contracts, and render warnings.
- Desktop and narrow-phone gallery screenshots were visually inspected.
- JavaScript syntax and diff whitespace checks passed; source and desktop mirror match byte for byte.

## Previews

- [Desktop gallery](gallery-1200.png)
- [Phone gallery](gallery-320.png)

Logs: browser.log and unit.log. The previously documented long mobile mission timing regression was not rerun in this gallery-focused pass.
