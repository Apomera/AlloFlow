# Dashboard layout opportunity

Frozen runtime SHA-256: `78d924001e4e1de6167aae3804405f976ade6d4809f4d9d06cd47816a6a967e8`.

The owned browser inspected the actual dashboard and opened Conditions labs at 320px and 1280px. Six DOM snapshots and eight screenshots completed without runtime errors. The owned browser and ephemeral server closed. No runtime or Git edits were made; older reports were left untouched.

## Recommended next pass

**Balance the desktop dashboard by grouping the selected-place readout with the storage summary and placing the expandable values table below both columns.** Keep the plot, legend, and native place selector together. Give the storage block a visible heading so learners can distinguish store comparisons from the selected place's three scores.

At 1280px, the five storage bars occupy 185.5px of height. The neighboring chart card occupies 682.2px when the values table is folded and 933.2px when it is open. This leaves a blank area approximately 398px wide and 496.7px or 747.7px tall beneath the bars. The open dashboard is 1133.1px tall. The layout consumes substantial space without adding evidence to the left column.

The storage block has an accessible list label, “Water storage comparisons,” but no visible group title. Its store values and the plot's place-based storage scores are independent teaching cues. Separate visible group titles would help learners identify which comparison they are reading.

The current DOM order is storage bars then chart. Phone CSS visually moves the chart before the bars. A restructured layout can use a consistent logical sequence: plot and inspection control, selected-place scores, storage comparisons, then the optional table.

## Useful acceptance checks

- Opening the values table expands a row below both desktop columns rather than increasing empty space beneath the storage bars.
- The desktop summary and plot columns remain reasonably balanced with the table folded or open.
- The phone visual sequence matches the DOM reading sequence and fits without horizontal scrolling.
- Storage and selected-place groups have visible, accessible headings.
- The native selector, exact readout, highlighted table row, line styles, and marker shapes retain their existing meaning.
- Inspection preserves paused parcel progress, writing, saved baseline, and observation evidence; displayed scores remain unchanged.

## Nearby Conditions UI

The Climate and Land labs are more balanced than the dashboard. Their native controls fit at 320px and 1280px, and the phone layouts have no horizontal page overflow. The land introduction and scientific caveat use 11px text; increasing those is a smaller follow-up opportunity. The dashboard's unused desktop column is the stronger candidate for this pass.

## Captures

- `dashboard-open-table-1280.png`: main desktop opportunity.
- `dashboard-folded-1280.png`: the gap is still present with the table folded.
- `dashboard-open-table-320.png` and `dashboard-folded-320.png`: current phone sequence.
- `climate-lab-1280.png` and `climate-lab-320.png`: nearby Climate controls.
- `land-lab-1280.png` and `land-lab-320.png`: nearby Land controls.

`baseline-results.json` preserves geometry, DOM order, labels, controls, and typography. `inspect.cjs` serves the saved `baseline-runtime.js`, keeping these captures reproducible after runtime edits.
