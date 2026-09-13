# Solution-preparation addition preview — September 12, 2026

The 100 mL preparation activity now lets students preview the next model solvent addition before applying it. This supports comparing coarse and fine additions while approaching the flask's single calibration mark.

## Interaction and visuals

During filling, open **Preview the next addition**. The default selection is 0.05 mL, with a 1.00 mL alternative. Selecting a portion updates a dashed meniscus on the flask and enlarged neck, a predicted volume, and the remaining distance above or below the target expressed in model mL. The current liquid and current-volume readout stay in place for comparison.

At 99.95 mL, the fine addition previews 100.00 mL; the coarse addition previews 100.95 mL and warns that applying it would require restarting the preparation. **Apply previewed addition** performs the existing addition action. The preview then updates from the new actual volume, allowing repeated additions.

The two direct-addition buttons are replaced by the preview controls while the panel is open. Irrelevant disabled dissolution, transfer, alignment, and mixing controls are omitted during this compact filling view. Available alignment and mixing actions remain accessible. Closing the preview restores the original direct controls. Preview selection and disclosure state are local view preferences retained during the mounted activity; reopening the equipment component defaults to a closed preview with the fine portion selected.

The existing **Enlarge meniscus** control works with the overlay. A textual legend distinguishes the solid current meniscus from the dashed prediction. The same intentionally exaggerated near-mark geometry is used for both, and both model volumes and schematic boundaries are explained beside the controls.

## Error recovery and keyboard use

Applying an overshoot preserves the actual model volume and moves focus to its explanation. **Start over with this sample** appears beside the error; the next Tab reaches it. Restart keeps the copied sample mass, clears preparation progress, and focuses dissolution. This recovery also works after an overshoot through the original direct-addition buttons.

No further prediction or Apply control is shown once the flask is above the mark. The preview panel explains why restarting is needed. A prediction at exactly 100.00 mL still warns that either further addition would overshoot; intentional error exploration remains possible through the existing model.

Radio controls support arrow-key navigation. Escape from within the preview closes it and returns focus to its disclosure button. In the compact view, eye alignment moves focus to the next available action, and mixing moves focus to the prepared-solution record. The preview itself does not bypass eye alignment or mixing.

## Model boundaries

The forecast uses integer model volume units and the two existing permitted portions. It matches the actual next transition throughout the supported filling range. Previewing does not modify the preparation, transfer record, sample mass, live titration, or notebook. Applying an addition changes only the preparation through its existing transition function.

The flask still represents a single calibration mark. The model's volume readout and fixed 1.00 mL/0.05 mL additions are teaching aids. The diagram exaggerates differences near the mark and is not a quantitative height scale; real drop sizes vary. See [the original preparation notes](titration-preparation-practice-2026-09-09.md) for procedural references and the remaining simplifications.

## Verification

- **184 tests passed across 11 suites**, including eight new preview tests. Coverage checks all 202 combinations of supported pre-addition volumes and portion sizes, target crossing, unavailable or malformed state, immutable inputs, eye/mixing gates, and meniscus placement.
- **42 scoped browser accessibility/layout scans passed** at desktop 1200 px and phone 320 px: 16 preview scans and 26 existing preparation regression scans. No scoped axe violations, horizontal overflow, or page errors were reported. The preview fixture was rerun after the compact-control and keyboard-focus refinements.
- Browser checks exercise actual controls, radio keyboard operation, preview-only state preservation, enlarged views, applied volumes, completed results, overshoot focus and recovery, direct-addition recovery, forced-colors interaction, malformed source data, and unchanged live titration fields.
- Desktop and phone screenshots were visually inspected for target-reaching and overshooting previews, enlarged menisci, and recovery.
- Source syntax, byte-for-byte source/public parity, all 527 helper English keys, and exact catalog/fallback agreement for the 14 new English strings passed checks. Translations of the new strings remain pending.

Implementation: `stem_lab/stem_tool_titration.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_titration.js`. English catalog: `dev-tools/i18n/stem_titration_en.json`. New tests: `tests/titration_preparation_preview.test.js`.

Run `node reports/chemistry-refinement-2026-09-06/titration-preparation-preview-browser.cjs` for the new interaction and `titration-preparation-browser.cjs` in the same directory for the existing workflow. Reports and screenshots use the `titration-preparation-preview-*` prefix. Vitest uses `--pool=threads --maxWorkers=1`.

These changes are local and have not been deployed.
