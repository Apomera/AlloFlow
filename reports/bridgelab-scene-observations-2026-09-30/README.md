# Bridge Lab scene observations — September 30, 2026

Students can save the earthquake scene they are looking at, then revisit the same paused moment and viewpoint from the earthquake notebook. The recorder captures reference trial A when A is displayed, and the current experiment B when B is displayed.

## Use the recorder

1. Open **Measurements → Record an observation** in the 3D or immersive scene. Opening it pauses playback.
2. Write what moved and explain where energy went. Editing the note also pauses playback.
3. Choose **Save scene observation**. The notebook receives the displayed model inputs, exact inspection time, separate observation note, and camera pose.
4. In the earthquake notebook, choose **Revisit scene observation** to restore its inputs, time, viewpoint, and note. Playback stays paused.
5. Open the earthquake evidence report to include the observation and recalculated results in the printable report.

Saving from A preserves B's physical settings, prediction, and explanation. It also preserves the static bridge design, comparison selection, existing trials, and unsupported stored records. The recorder clears only its own saved note draft. Its save confirmation is hidden while replay is running.

## Saved evidence and viewpoints

Scene observations use the existing four-trial notebook limit. Each is a normal bridge-seismic-v1 trial with optional bridge-scene-v1 context. The context records its source, deck or riverbank observer, immersive or structure view, position on the bridge, both observers' look angles, structure rotation, and zoom.

Saved cards and the report show the scene source, viewpoint, inspection time to three decimals, energy at that moment, and instantaneous power: input work, damping loss, and change in stored energy. The underlying time retains its full precision. Results are recalculated from the saved physical inputs rather than imported answers.

Camera values are validated separately from trial inputs. Invalid or unsupported camera metadata does not discard a valid earthquake trial. Captured and imported writing is bounded and rendered as text. The printable section contains no interactive form controls.

Revisiting moves keyboard focus to the scene after React commits the restored view. If graphics have failed, it focuses the 2D elevation and retains the saved pose for deliberate graphics recovery. Reduced motion keeps playback off while allowing explicit inspection and viewpoint selection.

The camera pose is relative to the current static bridge. This feature does not save a separate static bridge design. Earthquake evidence continues to use one assumed elastic vibration mode and the existing synthetic 16-second ground motion plus 8 seconds of free vibration.

## Validation

- **108 unit checks passed** across immersive interaction, seismic model, and printable static analysis.
- **28 distinct browser workflows passed** in their latest completed results. They cover desktop and phone recording, fullscreen layout, reference A, bank restoration, evidence reports, graphics loss, keyboard focus, reduced motion, comparison, energy transfer, and replay.
- JavaScript syntax, exact source mirror equality, and all **1,041 English fallback keys** were checked against both registries.
- Desktop and 320px scene recorder screenshots and the phone evidence report were visually inspected. The observation panel remains separate from the replay controls, and the note and save action are readable.

The initial browser run passed 27 of 28 workflows. Its riverbank test read a list immediately after a native disclosure was reopened. The failure screenshot already showed all three expected readings after the asynchronous toggle completed. The assertion now waits for the exact readings with Playwright's locator assertion. Five affected browser workflows passed in the focused follow-up; the verification script retains the original run and resolves results by workflow identity. A targeted unit follow-up also verifies that the paused save confirmation is hidden during replay. Counts above are distinct checks, not summed rerun totals.

## Artifacts

- unit-results.json and unit-followup-results.json
- browser-results.json and browser-followup-results.json
- source-verification.json and verify.cjs
- bridge-1000-scene-observation.png and bridge-320-scene-observation.png
- bridge-1000-scene-observation-report.png and bridge-320-scene-observation-report.png

Source: stem_lab/stem_tool_bridgelab.js and its desktop public mirror. English keys are synchronized in both ui_strings.js registries. Changes are local to the working tree.
