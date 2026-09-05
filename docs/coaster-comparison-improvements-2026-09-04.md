# Coaster Lab comparison improvements — September 4, 2026

The Report tab's **Compare saved runs** panel now includes a distance inspector. After recording two guided attempts, select the pair and move **Inspect distance** to compare speed, vertical force, lateral force, and the later-minus-earlier difference. Arrow keys, Home, and End work with the slider; committed changes announce both sets of readings to screen readers.

The chart now labels its horizontal axis as recorded distance in meters. Previously the label incorrectly described the shared distance axis as normalized circuit position. Earlier runs use solid lines and later runs use dashed lines. Both use the existing theme colors.

Readings between compact telemetry samples are linearly interpolated estimates. Missing measurements produce gaps and “Not recorded” cells rather than artificial zeros. The inspector does not extrapolate past either recorded run. The same distance can refer to a different physical hill or turn after a track edit, which the panel explains. Exported teacher reports retain a static chart and readings at the selected inspector distance, without a nonfunctional slider. The evidence-quality section uses the selected run pair, and student conclusions are exported exactly as written, including an intentionally blank conclusion.

At phone widths, the toolbar scrolls horizontally and the Report tab receives more vertical room. Ride overlays remain within their own viewport so they cannot cover report measurements.

Canonical source and the desktop public mirror are synchronized. No production deployment was performed.

Verification:

- 270 focused unit/contract tests cover the existing coaster tool and the new comparison calculations and interaction behavior.
- Chromium integration coverage mounts the real Three.js tool, runs the simulation, and exercises saved-run selection, keyboard controls, numerical differences, and the phone layout.
- JavaScript syntax and targeted diff whitespace checks.

Tests: `tests/coaster_trace_comparison.test.js`, `tests/coaster_lab_tool.test.js`, `tests/coasterlab_dialog_a11y.test.js`, and `tests/e2e/coaster-trace-comparison.spec.ts`.

## Saved conclusions and report continuity

Conclusions save separately for each ordered pair of recorded runs. Switching pairs, reopening the tool, or transferring a lab packet restores the appropriate draft. Draft identities include the experiment signature, so removing old history does not move a conclusion onto a different experiment. Deliberately blank text is preserved. Drafts for runs no longer in the retained history are removed.

Storage is bounded to the 24 most recently edited comparisons and 6,000 characters per conclusion. Packet imports accept up to 524,288 JSON characters to accommodate the added draft records. Imported drafts are restricted to recorded run pairs and plain string values. Report HTML escapes user text.

If browser storage is unavailable, the editor preserves the draft for the current session and clearly tells the student to copy it or export a packet. It does not claim that the local save succeeded.

Additional regression coverage: tests/coaster_teacher_report.test.js. The Chromium workflow also verifies draft restoration, empty drafts, a downloaded report at the selected distance, packet export/import, reopening the tool, and unavailable browser storage.

## Finding and capturing evidence

The comparison chart now offers shortcuts to the largest absolute speed, vertical-force, and lateral-force differences. Each shortcut moves the distance cursor and updates the numerical table without moving keyboard focus away from the activated button. Missing shared data and equal traces produce disabled shortcuts with an explanation.

The search evaluates sample positions from both compact traces. Differences between linearly interpolated traces attain their maximum absolute value at these boundaries. Distances outside either recorded run and gaps in the measured variable are excluded. Ties choose the earliest point. The interface reminds learners that compact telemetry can miss brief peaks.

Add selected readings appends a measurement block to the existing conclusion. It names the attempts, distance, available paired measurements, units, and signed differences, together with the interpolation and track-position limitations. The action prevents exact duplicate blocks and does not truncate or replace student writing when the 6,000-character limit would be exceeded. The resulting draft uses the existing local-save, packet-transfer, and report-export workflow.

Regression coverage includes unequal sample grids, negative lateral-force differences, tied peaks, missing readings, disjoint track ranges, duplicate evidence, full conclusions, keyboard focus, and the complete saved/exported workflow.


## Visual presentation pass

The park now has three continuous, faceted terrain ridges instead of isolated cone mountains. The ridges stay centered on the editable world when the layout camera target moves. Their inner edge lies beyond the complete editable ground square. Geometry is deterministic, closed, and static (1,152 triangles total). Existing scene disposal handles the new resources, and FX Lite hides the scenery through its existing parent group.

Grass has a brighter procedural texture, foliage uses environment-specific colors, and each theme has its own ridge palette. Blueprint renders the ridges as wireframes. Theme selection now also updates the outer CSS root, correcting the mismatch between scene lighting and interface accent colors. Primary actions, panel cards, and selected tabs have clearer visual hierarchy.

Scene focus hides editing panels, instruments, track-node handles, and selection guides to expand the coaster view. The keyboard-accessible toolbar toggle restores the panels. Ride controls and learning dialogs remain available; hidden track handles cannot be picked by pointer input. Decorative motion continues to respect the existing reduced-motion and FX settings.

Validation: 274 unit tests passed (60-second per-test allowance for this heavily loaded machine). The dedicated Chromium visual workflow checks all four themes, terrain visibility in FX Lite, keyboard focus toggling, expanded canvas size, restored panels, and a phone viewport with reduced motion. Screenshots are under scratch/coaster-visual-final. Canonical and desktop source files are identical.


## Camera composition and inspection views

A compact view control group now provides Fit coaster, Top view, and Side view. Fitting centers the complete sampled track, including a margin for train and support geometry. It solves the perspective distance using all eight bounds corners, the current horizontal and vertical field of view, and space reserved for instruments and view controls. The top and side presets make the ground layout and relative hill heights easier to inspect.

The initial overview fits automatically. Fitted views continue to adapt to viewport changes, Scene focus, and track rebuilds. Pointer interaction or wheel zoom switches to manual framing; resize then preserves the chosen zoom. Fit coaster restores automatic framing. Zoom limits accommodate fitted views of larger designs instead of snapping back to the old 480-meter limit. Returning from onboard to an orbit view resets camera up before looking at the target, avoiding a briefly tilted overview.

View controls hide while a learning question, ride summary, or quick guide is open. They use native keyboard-operable buttons and immediate camera placement, with no new camera animation. Existing reduced-motion behavior is preserved.

Validation: 299 unit tests, including projection checks using the actual Three.js camera for five viewport aspect ratios, four angles, maximum-size bounds, translated bounds, flat geometry, and tiny designs. The Chromium camera workflow checks actual track projection, keyboard activation, viewport resizing, manual zoom preservation, returning from onboard, and dialog clearance. Screenshots are saved under scratch/coaster-camera-views.


## Track readability at a distance

Bold track is enabled by default and can be toggled from the view controls. In orbit views, rails use the environment's accent color and a bounded screen-space width adjustment. Heatmaps use a wider colored spine with neutral rails, preserving the existing predicted values and color mapping. The option affects rendering only; onboard, chase, scenic, and XR views use the natural materials. The saved preference is restored when the tool reopens.

The rail shader expands each tube cross-section around its original center, with a maximum sixfold expansion. Geometry centers are generated once when track meshes rebuild; toggling the option and zooming reuse those buffers. The new materials are registered for teardown even when inactive.

Section labels retain a 112-by-28 CSS-pixel footprint as the camera moves. Labels behind the camera, crossing the viewport edge, or overlapping an earlier feature label are hidden. The view control group wraps into two columns on small screens, and camera fitting reserves room for its actual height.

Coverage is in tests/coaster_track_readability.test.js and tests/e2e/coaster-track-readability.spec.ts, including label collisions, invalid projections, disposal of inactive materials, shader compilation, unchanged analysis, all themes and heatmaps, keyboard toggling, mobile layout, and preference restoration.

Final readability validation: 308 unit tests and both Chromium workflows passed. Shader compilation reported no errors, all theme and heatmap changes retained valid geometry, analysis was identical before and after presentation changes, and the saved style survived remounting. Screenshots: scratch/coaster-readability.


## Illustrated track-building palette

The five track pieces now have inline SVG diagrams with side/top-view labels, names, descriptions, and node costs. The diagrams remain legible before a node is selected; disabled cards use dashed borders and a clear selection note. Hovering or focusing an available card retains the existing actual-track ghost preview, while activation inserts the editable piece.

A native meter and text show used and remaining nodes. Each card's capacity is derived from the same geometry builder used for insertion. Pieces that exceed the remaining capacity are disabled individually, while smaller pieces remain available. The final insertion guard is retained, and unavailable pieces no longer generate ghost previews. Counts refresh after insertion, import, and Undo.

Coverage: tests/coaster_element_palette.test.js and tests/e2e/coaster-element-palette.spec.ts exercise actual node costs, exact-limit insertions, invalid capacity, keyboard previews, insertion/Undo, and a 76-node design with space for a drop but not a loop.

Palette validation: 284 unit tests passed, including all 13 new capacity tests. Two pre-existing files (coaster_visual_presentation.test.js and coaster_trace_comparison.test.js, 37 tests total) could not start their Vitest workers in either fork or thread mode. The dedicated Chromium palette workflow passed, covering all five keyboard previews, insertion, Undo, a phone viewport, and an exact 80-node insertion. The desktop card screenshot was visually reviewed; screenshots are under scratch/coaster-palette.
