# Perception Lab: drawing overview navigator

The drawing inspector now includes a **Current drawing overview**. Its miniature shows the complete current drawing, with a two-tone outline marking the portion visible in the magnified workspace. This makes it easier to locate details and return to a particular part of a drawing.

## Navigation and presentation

- Select a point outside the outlined window to move there. Drag inside the window to move it without changing where you grabbed it. Movement stays within the drawing and updates both comparison views together.
- Focus the overview to use Arrow keys, or Shift + Arrow for larger steps. Enter or Space centers the view. Home fits the whole drawing and returns focus to the zoom selector; Escape cancels an active drag or Pan mode.
- The miniature follows current drawing changes and moiré motion. It is clearly labeled as the current drawing even when the main workspace is showing a reference.
- The overview appears when the inspector is open and magnified. It sits beside the direction buttons when space permits and wraps below or above them on narrow screens. Original drawing colors remain intact in dark, contrast, and forced-color themes.
- Mouse and touch checks cover pointer ownership and cancellation. Resizing, scrolling, expanding, closing the inspector, changing comparison layout, or relocating to the focused workspace safely ends an affected gesture.

The overview controls the existing local camera. It does not modify the experiment, pin, notebook, or saved observations. Repeated studies continue to use the complete drawing with inspection disabled. Hidden matching measurements stay hidden.

The miniature uses a separate decorative SVG. The original drawing's IDs, export reference, scene tree, and measurement visibility are unchanged. SVG and PNG exports continue to contain the complete current drawing rather than a crop or miniature.

## Verification

- **54 native Chromium overview check groups passed** (51 in the complete run and 3 supplemental interaction groups), with no page runtime errors. Checks cover all seven scenes, crop geometry, comparison layouts, pointer/touch and keyboard navigation, cancellation and lifecycle guards, exports, responsive layouts, accessible themes, and axe checks.
- **51 existing inspector browser groups passed again** on the same source, protecting shared zoom/pan, slide comparisons, study locks, exports, keyboard interactions, and responsive presentation.
- **84 baseline drawing/model/measurement combinations passed** with unchanged engine APIs, metadata, defaults, and matching definitions. Compilation, source/desktop parity, and all **556 English/runtime catalog entries** passed.
- **31 focused DOM regression cases** were added. Syntax and scoped whitespace checks passed. Formal DOM execution remains **unexecuted** because the installed Vitest/jsdom worker stalls before collection; the browser and pure-engine checks are independent evidence.
- An independent source review found no material issues. Desktop and enlarged-text phone previews were visually inspected.

Source and desktop SHA256: `8940a40b7cb8241ee6146c6edc57b0dbdf3c6a5b5e236f41c0630f508fbda529`.

## Evidence

- [Desktop controls](browser/overview-desktop-controls.png)
- [Desktop overview navigator](browser/overview-desktop-navigator.png)
- [Desktop drawing](browser/overview-desktop-drawing.png)
- [Phone controls at 200% text](browser/overview-phone-200-controls.png)
- [Phone overview navigator at 200% text](browser/overview-phone-200-navigator.png)
- [Phone drawing at 200% text](browser/overview-phone-200-drawing.png)
- [Verification summary](verification.json)
- [Overview browser results](browser/overview-browser-results.json)
- [Supplemental interaction results](browser/overview-additional-results.json)
- [Inspector regression results](inspector-regression-results.json)
- [Source, catalog, and baseline validation](regression-validation.json)
- [Native browser runner](../../../dev-tools/perception_lab_drawing_overview_qa.cjs)
- [DOM regression suite](../../../tests/perception_lab_drawing_overview.test.js)

Run the [pure validator](validate-perception-overview.cjs) with `node reports/artstudio-workspace/perception-drawing-overview/validate-perception-overview.cjs` from the repository. The included baseline is the preceding drawing-inspector version.

No staging or commit was performed. All changes remain uncommitted.
