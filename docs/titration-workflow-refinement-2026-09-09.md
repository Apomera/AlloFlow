# Titration preparation workflow refinement — September 9, 2026

The Equipment tab now summarizes progress across weighing, solid transfer, solution preparation, and volumetric pipetting. The overview shows current record values and offers a relevant continuation action. Pipetting defaults to a compact sequence with one technique action at a time.

## Preparation overview

The four existing stage buttons remain available, with a status of **Ready to start**, **Needs an earlier record**, **In progress**, **Recorded**, or **Needs attention**. The selected activity has a distinct border and an accessible current-step indication. A segmented progress bar reports how many activities have a current record; the count reflects each activity's own saved sample.

Completed cards display their actual recorded values: for example, 0.5000 g weighed, 0.4800 g delivered by dry transfer, a 4.800 g/L preparation, and a 25.00 mL aliquot. **Continue practice** prioritizes an activity needing attention, then existing unfinished work, then the next activity with an available source. It opens and focuses the relevant equipment detail. Once all four records are current, **Review aliquot record** opens the final result.

The overview explains specific recovery cases: a changed weighed sample, rinsing after a dry-transfer record, preparation above the calibration mark, and pipette blowout. Updating an earlier activity does not erase downstream copies. A later record that still uses a different or unavailable source remains valid for its own copied sample and is labeled **Using an earlier source record**. The count can decrease when a local record becomes invalid; it never silently treats an invalidated record as completed.

## Focused pipetting controls

Only the next enabled technique action appears by default. **Show all technique steps** is an accessible pressed-state toggle that reveals all seven actions, including disabled steps, for overview and review. It changes only the display and resets to compact mode when the practice component is reopened. Source loading, restart, diagram enlargement, equipment navigation, and the optional blowout exercise remain available in both views.

In compact mode, activating an action moves keyboard focus to the next enabled action. Recording moves focus to the resulting aliquot. Blowout moves focus to the explanation; the next Tab reaches **Start over with this solution**, which restores the copied source and focuses conditioning. The existing Escape return to the pipette equipment card is retained. The action gates, chemistry calculations, and saved practice models are unchanged.

## Verification

- **168 tests passed across nine Vitest suites**, including 12 progress-model tests. Coverage includes source eligibility, all four stages, stale records, copied sources, continuation priorities, overshoot, blowout, malformed saved state, and preservation of source data.
- **82 scoped browser accessibility/layout scans passed**, across 1200 px and 320 px layouts: 26 for the new workflow fixture, 30 for the pipetting regression, and 26 for the preparation regression. No scoped axe violations, horizontal overflow, or page errors were reported.
- The fixtures use the actual widget, React, and application styles. They exercise keyboard continuation, focus advancement through every pipetting step, optional full-step review, error recovery, forced-colors interaction, navigation, saved-source retention, corrupted state, and unchanged live titration fields.
- Desktop and phone screenshots were inspected for the initial overview, completed records, attention states, compact technique actions, final aliquot result, and error recovery.
- Source syntax, byte-for-byte source/public synchronization, all 335 current equipment-helper English keys, all 492 translation keys used by helpers across the file, and the 18 newly added English keys passed checks. Other-language translations remain pending.

## Files and reruns

Implementation: `stem_lab/stem_tool_titration.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_titration.js`. English strings: `dev-tools/i18n/stem_titration_en.json`. Progress-model tests: `tests/titration_preparation_progress.test.js`.

Browser harness: `node reports/chemistry-refinement-2026-09-06/titration-path-refinement-browser.cjs`. Run the existing `titration-aliquot-browser.cjs` and `titration-preparation-browser.cjs` in the same directory for workflow regressions. The older pipetting fixture explicitly enables the full step list when checking disabled-action gates; it checks navigation focus before clicking that toggle.

Reports use the `titration-path-refinement-*` prefix; screenshots use `titration-path-*`. Vitest uses `--pool=threads --maxWorkers=1`. The full scoped run is recorded in `titration-path-refinement-tests.json`.

This pass is local. No deployment or physical-device classroom trial is included. The equipment catalogue remains at 14 entries with nine illustrated walkthroughs. See [the pipetting implementation notes](titration-aliquot-practice-2026-09-09.md) for model boundaries and technique references.
