# Titration prediction and evidence diagram — September 19, 2026

Students can now compare their prediction, the setup's equivalence volume, and the saved color-change interval on a shared volume axis. During **Explain your conclusion**, open **Compare prediction with evidence**. The same diagram is included in **Review report**.

## Reading the diagram

- **P** is the saved prediction, shown as a diamond when it is on the displayed scale.
- **E** is the existing equivalence volume for the investigation, shown with a vertical marker.
- **A–B** contains the two saved observations, marked with a circle and square. The shaded span is their volume gap; it does not calculate an exact endpoint.

The default **Around color change** view extends three 0.1 mL increments on either side of the saved readings. **Full volume range** shows the broader range, including the prediction. Both use a proportional axis. On the full view, a 0.1 mL interval remains narrow instead of being artificially enlarged.

Values outside the close-up are represented by directional arrows and explicit text, with their actual numerical values still visible in the legend. Predictions at the same volume as equivalence remain distinct on separate rows. The legend and SVG accessible name carry all values without relying on color or symbol recognition.

## Continuity and reports

Range controls change only the diagram's local view. They do not move the volume slider, change saved observations, edit the conclusion, or replace the reviewed evidence pair. The diagram is an optional disclosure during explanation and appears directly in a completed report.

The downloaded HTML includes a static close-up generated from the same drawing helper as the interactive view. Download help now identifies that choice. The diagram works without external assets; labels are escaped and Unicode handling is shared with the existing report exporter. Print styles retain the diagram and its legend while the ordinary print button stays outside printed content.

This addition uses existing saved evidence and the activity's equivalence value. No titration chemistry calculations or grading rules were changed.

## Verification

**31 tests across four suites passed**, including eight new geometry/export tests. The complete guided workflow and report browser fixture passed **50 accessibility/layout scans** at 1200 and 320 pixels with no page errors. It exercises keyboard range switching, off-scale and boundary predictions, real notebook collection, saved-state isolation, actual HTML download/open, print controls and media, long student text, report invalidation, serialized remounting, the 3D bench, and WebGL fallback.

Desktop and phone diagrams and the print-media report were visually inspected. Forced-color scans ran the applicable axe rules and layout/ARIA checks; color-contrast was excluded in that mode because of axe's limitation. Physical devices, printer output, and PDF pagination were not manually tested.

Source and public copies match, syntax and scoped whitespace checks pass, and all 103 investigated English fallback occurrences match the catalog. Ten new diagram strings were registered and report download help was updated. Other-language translations remain pending. No dependencies were added and no deployment was performed.

- [Diagram preview](../reports/chemistry-refinement-2026-09-06/titration-volume-map-guide-closeup-1200.jpg)
- [Example report with diagram](../reports/chemistry-refinement-2026-09-06/alloflow-titration-investigation-with-diagram.html)
- [Validation record](../reports/chemistry-refinement-2026-09-06/titration-volume-map-validation.json)

Browser rerun: node reports/chemistry-refinement-2026-09-06/titration-volume-map-browser.cjs
