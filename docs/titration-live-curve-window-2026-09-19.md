# Recent-volume close-up for the live curve - September 19, 2026

The **Live curve** alongside **Full apparatus** now includes **Enlarge recent volume range**. It starts in the existing full-volume view. Turn on the close-up to inspect small additions around the current reading without dispensing titrant or saving a notebook entry.

## How the window works

The horizontal window is 5 mL wide: it begins at 0-5 mL and then follows the current volume. At 24.9 mL, for example, it shows 19.9-24.9 mL. At 25.1 mL it shows 20.1-25.1 mL. A visible caption states the bounds and explains that only the volume axis changes. The vertical pH or potential scale and its ticks remain fixed.

The curve still ends at the exact current simulated reading. It never exposes future samples. Older history is removed from the left of the window; where an existing line segment crosses that boundary, its entry point is interpolated. This preserves the same sampled curve geometry without collapsing old values into a false vertical line at the left edge. Original samples are not changed. Resetting or moving backward shows only the current history again.

The dashed equivalence marker appears only when its volume is inside the displayed range, including either boundary. Outside that range, the text explicitly says the equivalence volume is outside the window while retaining its numerical value. Endpoint and equivalence guidance remains unchanged.

## Interaction and rendering

The native toggle works with Enter and Space, reports its pressed state, references the plot and the visible range description, and keeps keyboard focus. Enlarging the axis changes no experiment data or notebook records. Real additions move the window and its current point.

The close-up works beside both the 2D apparatus and 3D bench, including WebGL fallback. Toggling the graph scale keeps the current WebGL viewer instance. Hiding and reopening the curve restores its full-range default; a presentation change that remounts the curve can also restore that default. No zoom preference is saved into experiment data.

In Windows high-contrast mode, SVG labels and axes now use CanvasText, and the curve and current-point marker use LinkText. Visual review caught pale SVG labels against a white background; scoped system colors correct that contrast failure.

The plot's accessible description includes the window bounds. Its numerical caption, unchanged vertical ticks, current-point marker, and dashed equivalence line supplement color. No dependencies, network assets, or animation loops were added.

## 3D scene visibility fix

Browser regression testing exposed a separate existing renderer bug: an IntersectionObserver callback can contain several visibility transitions. The shared orbit viewer read the first transition, so a batch ending with an onscreen canvas could leave the scene paused with an older reading or camera close-up. The captured failure had a visible canvas, a pending flask-view update, and an offscreen-then-visible batch, while the viewer retained visible=false.

The observer now uses the latest entry for its single observed host. This also stops rendering when the latest transition is offscreen. Six focused tests cover batched resume/pause, single observations, empty batches, frame cancellation, and callbacks after disposal. Before the fix, the two batch tests failed and the other four passed. The shared module and desktop copy receive the same fix.

The older live-curve browser harness now explicitly centers the canvas and selects Full apparatus before testing the redox live curve; Flask close-up uses the color guide in the current interface.

## Verification

**122 tests passed across 6 suites**, including 10 new curve-window tests, 6 viewer-visibility tests, and the existing 3D bench, motion, tab-control accessibility, and focus checks. New coverage checks exact current values, boundary interpolation, future-point exclusion, reset/rewind, duplicate or invalid source samples, input immutability, short ranges, malformed axes, and English fallbacks. Window geometry is checked at 1,423 current volumes across the supported 12, 50, and 80 mL experiment ranges.

**33 targeted browser accessibility/layout scans passed overall.** The existing bench regression passed its 7 interaction groups and 9 scans at 1200, 360, and 320 pixels, including camera orbit, additions, reduced motion, refill, redox, view switching, and context-loss fallback. The new window contributed **24 scans** across 12 states at 1200 and 320 pixels, with no violations, overflow, missing ARIA references, or page errors.

Run [the new browser harness](../reports/chemistry-refinement-2026-09-06/titration-trace-window-browser.cjs) from the repository root. It uses actual additions, notebook saving, keyboard toggling, monitor visibility, 2D/3D selection, and WebGL fallback, plus direct restored-state fixtures for boundary and redox cases.

Normal-mode accessibility scans include automated color contrast. Forced-color scans omit that one axe rule because of its [documented forced-color limitation](https://github.com/dequelabs/axe-core/issues/3978); computed SVG colors are asserted against the active system palette, and rendered colors are reviewed visually instead. The desktop close-up and final 320-pixel forced-color plot were visually reviewed.

Source syntax, both source/public-copy pairs, scoped diff checks, and English fallback/catalog matching passed. See the [combined validation record](../reports/chemistry-refinement-2026-09-06/titration-trace-window-validation.json). There are **4 new English strings**; other-language translations remain pending. Changes are local and have not been deployed.
