# Cell simulator microscope controls

The microscope footer now presents labeled Zoom and Speed controls with aligned numerical readouts and consistent vector icons. Reset and play/pause buttons have 44px targets at desktop and phone sizes; phone sliders have 44px interaction height. Focus indicators use dark teal against the light control surfaces. The movement pad and prediction button remain above the footer.

Specimen details include a Live dish action. It centers the current player, or the selected specimen in observation mode, scrolls to the simulation, and restores keyboard focus to the canvas. It preserves pause and mission state.

## Verification

- 15 unit tests passed: canvas lifecycle, play tutorial contracts, and render warnings.
- 3 new browser tests passed at 1200px, 390px, and 320px: return-to-dish focus, arrow-key slider input, synchronized readouts, view reset, pause/resume, button sizing, and page overflow.
- 6 existing anatomy and petri visual browser tests passed, including label clearance and movement-pad/footer separation.
- 2 existing learning workflow browser regressions passed for live control feedback and the complete mobile play/inspection flow.
- JavaScript syntax and diff whitespace checks passed. Source and desktop public mirror are byte-identical.

## Previews

- [Desktop microscope](dish-1200.png)
- [Phone microscope](dish-390.png)
- [Narrow phone microscope](dish-320.png)
- [Specimen navigation](detail-actions-390.png)

Logs: unit.log, browser.log, regression.log. The dish is a schematic teaching model; screenshots show a randomized population paused for review.
