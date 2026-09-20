# Cell simulator keyboard anatomy previews

In Observation mode, a focused dish now supports arrow-key previews of visible anatomy. Left/Up and Right/Down wrap through structures; Home and End reach the first and last. Enter opens the previewed explanation. Escape first clears a preview, then retains the existing explanation-dismissal behavior.

Previews use the existing highlighted label, connector, and structure ring. They do not move the camera, replace the selected specimen, change the open explanation, or record anatomy progress. Enter uses the established activation path. Selected-label-only mode temporarily shows the previewed label and restores the selected label when the preview clears.

Pointer movement, focus leaving the canvas, hiding labels, and specimen changes clear previews. Modified shortcuts, form controls, and Play-mode movement keep their existing behavior. Guidance appears in the structure explorer and is linked to the canvas through aria-describedby. Keyboard shortcuts are also exposed through aria-keyshortcuts, with preview announcements sent through the existing screen-reader announcement path. No animation loop was added.

## Verification

- All 26 focused unit tests passed across the initial run and the lifecycle contract rerun. Two existing source assertions were updated for the paused redraw condition and keyboard-help description.
- All 12 browser scenarios passed across the initial run and focused rerun: two new keyboard workflows at 280/1200px and ten existing explorer, focused-label, and pointer/play scenarios.
- New checks cover wrapping, Home/End, explicit activation, two-stage Escape, unchanged camera/progress, blur, hidden labels, specimen changes, pointer handoff, modified shortcuts, and selected-label-only behavior.
- The enlarged-reading check now waits for its requested font size before taking layout measurements. Pointer handoff explicitly scrolls the canvas into view before using its coordinates.
- Desktop and narrow-phone preview screenshots and narrow-phone instructions were visually reviewed.
- JavaScript syntax and scoped whitespace checks passed. Source, desktop public, web build, and app build copies are byte-identical.

## Previews

- [Desktop preview](preview-1200.png)
- [Narrow-phone preview](preview-280.png)
- [Narrow-phone keyboard guidance](help-280.png)
- [Desktop explorer guidance](help-1200.png)

Logs: browser.log, browser-final.log, unit.log, and unit-final.log. No commit, push, or deployment performed.
