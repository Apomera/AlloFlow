# Motion and energy graph navigation

The horizontal velocity, vertical velocity, and energy charts can now be focused and operated directly with a keyboard. Each chart exposes the actual recorded time, sample number, and measured values as an accessible slider. Merely focusing a chart leaves playback alone. Selecting a point pauses playback and synchronizes the canvas marker, chart readings, energy budget, and data table.

| Key | Action |
| --- | --- |
| Right / Up | Next recorded point |
| Left / Down | Previous recorded point |
| Page Up / Page Down | Move ten recorded points forward / backward |
| Home / End | First / last recorded point |
| Enter / Space | Inspect the current point |

The handler reads the current selection when each key arrives, including several events before React rerenders. Navigation uses every original observation, including exact apex and shortened impact samples. The drawing still uses representative points and includes the selected sample. Browser shortcuts with Control, Alt, or Meta pass through.

Selected motion points now have solid vertical and horizontal guides, an outlined ring, and a center dot. The recorded apex keeps its dashed guide. The energy chart uses a solid cursor with a contrasting outline over the stacked bands. Visible keys explain the guide meanings; focused charts have a 3px outline with a 3px offset.

The range prediction remains a static image. Unsupported older recordings retain static motion charts and their spoken explanations. A flight with one observation exposes that actual point without drawing an energy timeline from invented data.

## Measurement preservation

`source-before-graphs.js` preserves the starting source. The numerical source before `window.StemLab.registerTool('physics',` is identical after normalizing line endings. Source and desktop mirror are compared byte for byte. The existing sample-selection path handles pausing and inspection; this change preserves the recorded motion, captured parameters, run history, and CSV output.

- Starting source: `862666ca23a82fa5d15b73917b011fa9eb157554ac3d76302a4cb4d4a051abe0`
- Validated source and desktop mirror: `757ec62cdb8a924e9834991dcb13ccc2eb2ac9181344df4a6665ba5c8dd79715`
- `validated-source.js` preserves the tested source and is compared byte for byte during verification.

## Validation

Final results and source hashes are recorded in `verification.json`. The browser run uses Chromium, one worker, no retries, the existing test budgets, and local React harnesses. The report configuration turns off trace and video recording; native SVG geometry, actual keyboard input, and saved PNG pixel checks remain enabled.

| Check | Final result |
| --- | --- |
| Physics numerical, saved-state, and learning tests | 356 passed in 21 files |
| New direct graph keyboard and visual cases | 3 passed |
| Shared analysis workspace | 4 passed |
| Graph landmarks and representative curves | 5 passed |
| Energy behavior and themes | 9 passed across the two runs described below |
| Unique browser cases | All 21 passed in their final runs; no automatic retries |
| Positive visual captures | 12 PNGs with native geometry and saved pixel witnesses |
| Source syntax, mirror identity, numerical prefix, and scoped diff checks | Passed |

Manually reviewed `motion-default-1100.png`, `motion-dark-320.png`, and `energy-contrast-320.png`. Selected points, the solid and dashed guide keys, focus outlines, wrapped readings, and axis labels remain readable. An independent source review found no blocking defect. The new spec is included in the physics CI workflow.

The new three-case spec checks all keys, rapid events, Tab order, focus retention, vacuum and drag histories, changed controls, exact short-flight apex and impact, live playback, single samples, modified keys, and unsupported records. Its visual case checks 1100px, 375px, and 320px viewports in default, dark, and contrast themes, with 12 motion and energy captures. Saved images are decoded by the browser spec to verify the focus outline and three positions on each solid selection line.

`verify-results.cjs` verifies complete test outcomes, no retries, source identity, native geometry and saved pixel-witness records, and hashes the positive PNGs. It does not independently decode the PNGs.

### Preserved attempts

`unit-before-description-fix.log` records 354 passed and two failed tests. The initial static-chart fallback replaced its motion explanation with a short title. The fallback now retains the recorded motion explanation in its accessible label and references the visible description. The existing assertions and numerical tests were preserved.

`browser-results.json`, `browser.log`, and `browser-artifacts/` preserve the first browser run: 18 passed and three energy theme tests failed. The old contrast assertion checked the cursor foreground alone against every band color. The new cursor has an outline, so the updated assertion checks outline-to-band contrast, foreground-to-outline contrast, equal geometry, drawing order, solid strokes, and outline width. Its original 3:1 threshold and the existing circle-to-band checks remain. Production source was unchanged during this update. The three affected tests then passed in `energy-theme-results.json` and `energy-theme.log`; those final outcomes supersede the three failures. Successful tests were not repeated.

The verification script keeps both browser runs visible, requires the last result for each of the 21 unique cases to pass, and checks the final test hashes. Failed screenshots are excluded from positive visual totals.

Changes remain uncommitted.
