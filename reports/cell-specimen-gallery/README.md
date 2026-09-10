# Cell simulator specimen gallery

The organism chooser now includes still illustrations for all eleven models, drawn by the same geometry renderer as the live dish. Portraits use a fixed frame and a separate canvas context; the live camera, simulation clock, and organism state are not reassigned. Each portrait is cached on its canvas and adds no animation loop.

The gallery has clearer organism names, calmer card surfaces, a distinct selected state, and reduced-motion handling. On phone mission screens, small thumbnails preserve compact navigation. The observation gallery retains larger illustrations. The gallery identifies these as schematic illustrations that are not to scale.

Selected organism details now include a larger portrait, a prominent heading, a full-width description, clearer action buttons, a Field notes section, and more spacious anatomy rows. Desktop anatomy uses two columns; phone details stack. Observation details now say Specimen notes rather than Mission preview.

## Validation

- 21 unit tests passed across specimen visibility, renderer warnings, canvas lifecycle, and play tutorials.
- 3 gallery browser checks passed at 1200px, 390px, and 320px. All eleven portraits are rendered, distinct, and stable across selection changes. Selection, return focus, and page overflow checks passed.
- 3 existing anatomy browser checks passed after sharing the renderer.
- 5 learning and mobile browser regressions passed. The compact-chooser height regression initially exposed excess portrait height; smaller mission thumbnails fixed it and the full mobile interaction test passed again.
- 2 existing observation text-contrast checks passed.
- Syntax, diff whitespace, and source/desktop mirror checks passed.

Desktop gallery and phone detail screenshots were visually reviewed. Logs are in this directory; unit.log, browser.log, gallery-final.log, mobile-final.log, contrast.log, and preview-final.log contain validation evidence. The original regression.log records the initial height failure and the other four passing checks.

## Previews

- [Desktop gallery](gallery-observe-1200.png)
- [Phone gallery](gallery-observe-390.png)
- [Compact mission gallery](gallery-play-320.png)
- [Phone specimen details](detail-observe-390.png)
