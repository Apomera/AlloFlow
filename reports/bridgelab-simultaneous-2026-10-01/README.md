# Bridge Lab simultaneous earthquake responses — October 1, 2026

Students can see two earthquake responses together in the 3D scene, then save and reproduce that comparison with its bridge setup and viewpoint.

## Compare both responses

1. Enable the earthquake experiment and open a 3D, deck, or riverbank view.
2. Choose **Prepare 5% / 20% comparison**, or compare with a saved trial. Both responses are initially shown.
3. In **Measurements**, use **A · reference** or **B · current** to choose the solid bridge. The other response appears as a colored dashed outline.
4. Use **Show both responses** to toggle the outline and trails. A is pink and B is cyan. Both are sampled at the same inspection time and use the same displayed bridge shape and 10× displacement scale.
5. Fold **Measurements** to give the scene more space. Two compact rows retain the relative deck readings and identify the solid bridge and outline.

The paired display requires matching ground frequency and intensity. If those inputs differ, the toggle is disabled and the existing mismatch explanation remains visible. The preference is retained, so matching the ground motion restores the display. Identical or zero-input trials remain valid comparisons.

The trails show the deck edge over the previous second. They are resampled from model results when the inspection time changes, so scrubbing reproduces the same trail without accumulating animation history. The motion guide still provides resting rails. Energy and power panels follow the selected solid bridge.

## Save and restore the scene

Open **Measurements → Record an observation**, write a note, and choose **Save scene observation**. Opening or editing the recorder pauses playback. Saving adds a trial to the existing four-trial earthquake notebook and preserves the current experiment's prediction and explanation.

New observations also retain:

- The full static bridge inputs: span, height, panel count, truss style, material, member area, load mode, both load amounts, vehicle position, and bracing interval.
- The design name and notes.
- Both earthquake input sets when a comparison is active, the selected A/B response, and the exact shared inspection time.
- The viewpoint, walk position, observer angles, structure rotation, and zoom.
- Motion guide, scene energy, energy transfer, and simultaneous-display preferences.

Choose **Revisit scene observation** in the earthquake notebook to restore those values. The captured A reference is restored independently of later changes to the damping guide or saved-trial selection. The current experiment becomes the captured B, and the originally selected response is displayed. Playback stays paused, the observation note returns, and focus moves to the scene after the view is restored.

If graphics have failed, revisiting focuses the 2D elevation and retains the saved pose. Deliberately opening the recovered 3D view restores the comparison. Reduced motion keeps automatic replay disabled while allowing manual inspection.

Saved cards and the printable earthquake report include the bridge setup, design writing, both model inputs, and their recalculated relative motion at the saved time. The separate saved-trial comparison table continues to describe its selected notebook reference. Reports contain no interactive form controls.

## Model and imported evidence

The existing earthquake solver and static force calculations are unchanged. Earthquake trials still use one assumed elastic vibration mode, independently of the displayed static bridge design. The outline compares motion on that displayed shape; it does not calculate a second structural model or bridge damage. Ground, solid deck, and support transforms retain their existing frame mapping.

New optional metadata uses bridge-scene-design-v1, bridge-scene-display-v1, and bridge-scene-comparison-v1 under the existing bridge-scene-v1 context. Design and comparison inputs are validated and copied through explicit whitelists. Imported cached answers are recalculated, writing is bounded and rendered as text, and unrelated application fields are never restored from this metadata.

Older observations remain usable. A missing or invalid optional design keeps the current bridge and displays a clear explanation. Invalid optional comparison or display metadata does not discard an otherwise valid earthquake trial or camera pose.

## Validation

- **133 distinct unit checks passed** across immersive interaction, deformation geometry, the earthquake model, and printable static analysis.
- **31 distinct browser workflows passed** in their latest completed results, including desktop and 320px comparisons, fullscreen, snapshot restoration, graphics recovery, reduced motion, energy transfer, keyboard interaction, and replay.
- **164 distinct checks passed** in total. Reruns are resolved by test identity rather than added to the count.
- JavaScript syntax, identical source mirrors, and **1,058 English fallback keys** matching both registries were verified.
- Desktop and 320px expanded and compact scenes, and both complete observation reports, were visually inspected. The compact labels leave the scene visible, the expanded panel stays separate from replay controls, and the report includes the saved setup and both responses.

The comparison uses one outline, two fixed 31-point trail buffers, and shared marker geometry. Geometry tests verify reuse across repeated updates and toggles. Browser checks verify four geometry uploads on the first visible comparison, with stable geometry and texture counts afterward and no scene rebuild during replay or A/B selection.

The initial unit run passed 132 of 133 checks. The new restoration fixture named an unsupported aluminum material; it was corrected to the supported FRP composite, and the full restoration check passed in its targeted follow-up. Five affected interaction checks also passed after adding the compact labels. The initial browser run passed 29 of 31 workflows. Its two older motion-guide tests compared GPU counts before the new glyphs were first shown; they now check the four first-use uploads separately and resource stability afterward. Both passed in the focused follow-up. Original results are retained alongside the follow-ups.

## Artifacts

- unit-results.json, unit-followup-results.json, and unit-compact-results.json
- browser-results.json and browser-followup-results.json
- source-verification.json and verify.cjs
- bridge-1000-simultaneous-responses.png and bridge-320-simultaneous-responses.png
- bridge-1000-simultaneous-compact.png and bridge-320-simultaneous-compact.png
- bridge-1000-complete-scene-report.png and bridge-320-complete-scene-report.png

Source: stem_lab/stem_tool_bridgelab.js and its desktop public mirror. English fallbacks are synchronized in both ui_strings.js registries. Changes are local to the working tree.
