# Balance reading breakdown - September 12, 2026

The analytical-balance activity now includes **Explain the balance reading**, an optional panel beneath the weighing controls. It follows the current pan load and helps students distinguish physical mass from the stored tare offset and net display.

## What students see

Three signed bars share a fixed scale from -2.5 g to 4.5 g:

- **Gross on pan** represents the boat and sample currently on the pan.
- **Tare deduction** represents the stored tare as a negative deduction, with a hatched fill.
- **Net display** represents gross minus tare, on the appropriate side of zero.

Each row includes its exact model mass, and all rows share the same zero position. The bar scale stays fixed when the boat is removed or the sample changes. Small values retain their actual proportional width; no artificial minimum width exaggerates them. Readable numerical values remain available when a very small segment is difficult to see.

The panel shows both equations: gross minus tare equals net, and on-pan boat mass plus sample mass equals gross. For a 0.5000 g sample, these read **2.8456 g - 2.3456 g = 0.5000 g** and **2.3456 g + 0.5000 g = 2.8456 g**.

Guidance updates for an empty pan, an untared boat, a tared empty boat, a loaded boat, and a removed boat. Removing a tared boat produces **0.0000 g - 2.3456 g = -2.3456 g**. The explanation identifies this as a negative display offset, not negative physical sample mass. Any sample retained in the boat off the pan is reported separately. Returning the loaded boat restores its on-pan reading.

## Records and controls

The breakdown always uses the current pan load, including when a saved weighing record has become stale. It does not replace a saved mass with the target or silently update a record. Existing actions, gates, mass resolution, target band, 2 g sample limit, and record behavior remain unchanged.

Opening or closing the explanation changes only the view. Its button uses `aria-expanded` and references the mounted panel. Escape from the disclosure closes the explanation and keeps focus on its button without closing the equipment guide. Returning to the activity starts with the explanation closed while retaining weighing progress.

The open-shield note explicitly distinguishes explanatory model values from a recordable reading. The existing sticky balance readout and action controls remain available. The bars preserve their visual fills in forced-colors mode, while the surrounding text, borders, and controls use the user's palette. Signs, values, row labels, and the written explanation provide alternatives to color.

These are arithmetic teaching diagrams, not new physical balance dynamics. The existing model still assumes immediate stability when the shield closes. See the [weighing-practice notes](titration-weighing-practice-2026-09-09.md) for the workflow, procedural references, and limitations.

## Verification

**215 tests passed across 15 suites**, with **11 English-coverage and focus checks passing again** after the final markup and wording corrections. Reports: `titration-weighing-breakdown-final-tests.json` and `titration-weighing-breakdown-ui-checks.json`.

**24 scoped browser accessibility/layout scans passed** with no scoped axe violations, horizontal overflow, or page errors. Desktop, phone, and forced-colors screenshots were visually inspected. The sticky reading remained visible at the weighing controls. Source syntax, exact source/public equality, all 432 unique equipment-helper English keys, and scoped whitespace checks passed. An initial definition-list nesting issue was corrected before the final browser run.

The new unit suite covers untared versus tared mass, loaded and removed boats, preservation of the off-pan sample, fixed signed geometry across the supported range, current versus stale records, model stability, immutable inputs, and malformed saved state. Zero tare deductions are normalized to zero rather than negative zero.

The browser harness uses the actual widget and weighing controls. It checks disclosure state, tare and recording gates, additions, exact equations, bar positions, stale records, removal and return, negative readings with closed and open shields, forced colors, keyboard activation, Escape focus, retained progress, maximum and tiny samples, malformed data, and unchanged live chemistry. Accessibility and layout scans cover 1200 px and 320 px.

Run `node reports/chemistry-refinement-2026-09-06/titration-weighing-breakdown-browser.cjs`. Its reports and screenshots use the `titration-weighing-breakdown-*` prefix. Vitest uses `--pool=threads --maxWorkers=1`.

There are **13 new English strings**. Other-language translations remain pending. These are local changes, with no deployment or physical-device classroom trial included.
