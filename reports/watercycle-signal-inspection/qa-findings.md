# Signal inspection browser verification

Final source/public SHA-256: `78d924001e4e1de6167aae3804405f976ade6d4809f4d9d06cd47816a6a967e8`.

The final full run passed **401/401 checks**, with **72 recorded DOM snapshots** and **16/16 clean scoped axe audits**. Eight configurations cover 320px and 1280px in light, dark, and forced colors; 390px in light; and 320px in dark with forced colors. There were no browser runtime errors. The tested source stayed unchanged and matched the public mirror. The report records `completed: true`, `successful: true`, `browserClosed: true`, and `serverClosed: true`.

The separate 320px geometry preflight passed 13/13 checks before the full run. It is preserved in `preflight-results.json`. Fourteen final captures show default Infiltration and manual Cloud inspection with the values table open. The original baseline source and six baseline captures remain preserved.

## Verified behavior

- Native place selection, manual selection persistence, and Follow tracking work.
- Standalone Infiltration identifies Land; active and replay mappings agree with the modeled step. The selector, description, readout, and focus chip distinguish stage focus from replay focus.
- All five locations' plotted coordinates agree with the table; each selected readout agrees with its table row.
- The solar slider's actual keyboard change updates the plotted and tabulated energy score.
- Inspecting places and opening the values table preserve the paused parcel and its progress, comparison writing, saved baseline, and experiment evidence.
- The selector has visible keyboard focus and a 44px target. The values table has a caption, row/column headers, and a 44px summary.
- Solid, dashed, and dotted series plus circle, square, and diamond legend shapes remain distinct in forced colors.
- Phone chart text is approximately 12px or larger, without label intersections, clipping, or horizontal page overflow. SVG text uses the system foreground in forced colors, including dark with forced colors.

## Preserved diagnostics and resulting corrections

The initial complete run is preserved as `results-initial.json`, with its captures in `diagnostics-initial/`. It exposed overlapping Surface/Air and Land/Return labels on phones and pale SVG text in forced colors. Centered labels, a larger right margin, and explicit `CanvasText` resolved those issues. Explicit system colors also aligned inherited HTML computed styles with the browser's system-painted text for the contrast audit.

The next complete run is preserved as `results-spacing-diagnostic.json`, with its captures in `diagnostics-before-corner-spacing/`. All 16 audits passed, but the lower-left axis 0 and Surface text bounds intersected. Increasing chart height to 208 and bottom padding to 50 retained the plot coordinates and added room below the axis. The final run confirms this intersection is gone.

## Measurement details

- SVG `getBBox()` is now measured after two animation frames. The initial report contains a few stale bounding boxes immediately after changing to Return, while the element attributes already reflect Return. This is a measurement timing artifact.
- Heading clearance now checks horizontal and vertical intersection with individual heading children. The original whole-heading box check falsely flagged the 390px marker even when the text occupies a different horizontal area.
- Final checks explicitly assess forced-color SVG text fill and truthful stage/replay wording.

No runtime or Git writes were made by this browser task. It used an owned ephemeral server and isolated Chromium, and did not interact with learner tabs or port 8770.
