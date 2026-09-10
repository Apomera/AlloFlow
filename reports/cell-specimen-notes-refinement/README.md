# Cell simulator specimen notes refinement

Observation notes now show a compact cell-type and movement overview. The full control, mission, and learning guide appears in Play mode, along with its mission-focus anatomy highlights.

Anatomy rows are now cards with separate headings, readable descriptions, inset structure icons, and a consistent Show in live dish action. Actions align at the bottom of desktop cards. The section includes a structure count and a short navigation hint. Cards form two columns on desktop and a single column on phones, with reduced-motion styling and existing keyboard navigation preserved.

## Verification

- Three final specimen browser checks passed: observation at 1200px and 320px, and play at 390px.
- Three popup regression checks passed, including persistent observation explanations and automatic play dismissal. The phone close-target assertion now tolerates floating-point rounding far below a pixel.
- Browser checks cover mode-specific content, mission highlights, text hierarchy, target dimensions, horizontal overflow, keyboard activation, and focus transfer to the dish.
- Desktop observation, narrow-phone observation, and phone play screenshots were visually inspected.
- All 15 focused unit tests passed across the final run and two isolated retries. The retries used thread workers and a 30-second test timeout after the loaded workstation caused a five-second test timeout and a fork-worker startup timeout.
- JavaScript syntax and diff whitespace checks passed. Source and desktop copies match byte for byte.

## Previews

- [Desktop observation notes](notes-observe-1200.png)
- [Phone observation notes](notes-observe-320.png)
- [Phone play notes](notes-play-390.png)

Logs: browser.log, phone-final.log, notes-final.log, unit-final.log, and unit-retry.log. The longer mission regression documented in the previous explanation pass was not rerun in this presentation-focused pass.
