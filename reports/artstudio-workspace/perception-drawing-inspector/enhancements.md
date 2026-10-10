# Perception Lab: drawing inspector

**Inspect drawing** adds Fit, 150%, 200%, and 300% views to the live drawing workspace. It gives small details more screen space in both the main and focused workspaces, while an inspection badge makes a cropped view clear.

## Shared magnification and navigation

- Current and reference drawings share the same zoom and viewing position in side-by-side, stacked, switch-view, and slide comparisons. The slide divider remains independently adjustable.
- **Pan drawing** enables mouse, pen, or touch dragging. Direction buttons and a center button offer precise alternatives. Focus a magnified drawing to use Arrow keys, Shift + Arrow for larger steps, Home to fit, and Escape to leave Pan mode.
- The view stays within the original drawing. Only the pointer that starts a gesture owns it. Resizing, scrolling the viewport, expanding, changing layout, or relocating the workspace cancels an affected drag safely; a fresh gesture works immediately afterward.
- Controls wrap for phones and enlarged text. Dark, contrast, and forced-color themes preserve the scientific drawing's original colors and white surface. A collapsed inspector keeps the ordinary workspace compact.

Visible guidance explains that magnification crops the surroundings and asks learners to return to Fit before judging their impression. Browser zoom and ordinary page scrolling remain available; drawing dragging requires the explicit Pan mode.

## View state and complete exports

Inspection is local view state. Current drawing edits, notes, reveal state, moiré motion, comparison layout, and workspace expansion preserve the camera. Changing the experiment, learner profile, activity, reference, or comparison mode restores the complete view. Repeated studies use Fit and lock the inspector until they end.

The transform belongs to an outer presentation layer. The original SVG tree, scene geometry, measurement visibility, and export reference remain intact. Saved experiment data, pins, and notebook records contain no inspector settings. SVG and 2400 × 1440 PNG exports keep the complete current drawing, including while the workspace is zoomed and panned.

## Verification

- **51 native Chromium inspector check groups passed** on the final source, with no page runtime errors. They cover all seven drawings, shared comparison geometry, keyboard navigation, native mouse/touch gestures, pointer ownership and cancellation, resize/scroll/expansion during a drag, view lifecycle, study locks, motion, exports, responsive layouts, RTL, and accessible themes.
- **43 existing slide-comparison browser groups passed** again on the same final source. Original scene trees, equal scale, hidden values, full exports, pointer interactions, and comparison behavior remain protected.
- **84 baseline scene/model/measurement combinations passed**. Engine API signatures, defaults, experiment metadata, and matching definitions are unchanged. Compilation, byte-identical source/desktop copies, and all **552 English/runtime catalog entries** passed.
- **26 regression cases** are saved in the inspector DOM suite. Its syntax check passed, as did the compatible slide-suite update. The DOM suites remain **unexecuted** because the installed Vitest/jsdom worker stalls before collection. Native browser and pure engine checks provide separate evidence; they do not stand in for the blocked suites.
- Scoped whitespace checks and an independent source review passed. Desktop, phone at 200% text, and dark-theme previews were visually inspected.

Source and desktop SHA256: `73bdf677e5db35de02d5b671fe3dd688ebb42b9dcddedc7be18a7d3e69f67a2e`.

## Evidence

- [Desktop inspection](browser/inspector-desktop.png)
- [Desktop controls](browser/inspector-desktop-controls.png)
- [Phone at 200% text](browser/inspector-phone-200.png)
- [Phone controls at 200% text](browser/inspector-phone-200-controls.png)
- [Dark theme](browser/inspector-dark.png)
- [Verification summary](verification.json)
- [Inspector browser results](browser/inspector-browser-results.json)
- [Slide comparison regression results](slide-regression-results.json)
- [Source, catalog, and baseline validation](regression-validation.json)
- [Native browser runner](../../../dev-tools/perception_lab_drawing_inspector_qa.cjs)
- [Regression suite](../../../tests/perception_lab_drawing_inspector.test.js)

Run the [pure validator](validate-perception-inspector.cjs) from the repository with `node reports/artstudio-workspace/perception-drawing-inspector/validate-perception-inspector.cjs`. It compares the current source with the included baseline and checks the desktop copy and catalogs.

All changes remain uncommitted. No staging or commit was performed.
