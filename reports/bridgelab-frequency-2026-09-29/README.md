# Bridge Lab: investigate shaking frequency

## What changed

**Investigate shaking frequency** adds a complete experiment to the **Follow the energy** panel. Students predict which frequency will cause the largest response, run 57 tests from 0.20 to 3.00 Hz, then inspect a selected result in the bridge scene.

- Every test runs the existing 24-second response model with the same assumed mode, peak ground acceleration, and damping.
- A selectable curve shows either peak relative deck motion in centimetres or peak absolute deck acceleration in g. A dashed marker locates the assumed natural frequency. The vertical scale stays fixed while selecting points within one scan and measure.
- Pointer, touch, arrow keys, Page Up/Down, and Home/End select discrete tested frequencies. Previous/next buttons provide another way to navigate. A numerical card always shows both response measures.
- **Select largest response** finds the largest tested value for the current measure. **Inspect this frequency** applies that frequency, pauses at its largest sampled response, and brings the 3D or 2D view into focus. The existing notebook can save the inspected experiment and compare it with another trial.
- Scans run only on request and yield between tests. Progress and cancellation are available. Closing the panel, leaving the Build tab, disabling the experiment, hiding the document, or unmounting the lab cancels pending work.
- Changing the assumed mode, intensity, or damping hides a completed curve until a matching scan is available. Changing replay time, replay speed, the current shaking frequency, or the static design preserves the scan. Student notes are retained.
- Zero input produces a finite flat curve, an explicit explanation, and a disabled largest-response action. Deliberate inspection remains available with reduced motion and the labelled 2D view.

## Try it

1. Enable **Earthquake experiment**, then open **Investigate shaking frequency** under **Follow the energy**.
2. Predict which frequency will produce the largest response. Select **Run frequency scan**.
3. Select a point or choose **Select largest response**. Switch between displacement and acceleration to compare the two measures.
4. Choose **Inspect this frequency** to see the selected test at its peak. Save that experiment in the earthquake notebook.
5. Add damping and run another scan. Compare the peak values, then save and compare another trial using the existing notebook and timeline.

## Model scope

This is a frequency scan of a finite synthetic shaking packet through the existing elastic model with one degree of freedom. Each test includes 16 seconds of shaking and 8 seconds of free vibration. It is not a steady-state frequency response, a real-earthquake response spectrum, or a structural safety assessment. The largest tested value is limited by the 0.05 Hz test spacing and the packet's duration and shape. Holding peak acceleration fixed also changes the ground displacement as frequency changes.

Each point retains only its frequency, two full-event peaks, and two inspectable sample times. Full response histories are discarded after each calculation. The scene recalculates the selected experiment with the same model. Peak values use the existing integration resolution; inspection uses the largest stored sample for the chosen measure. Completed scans stay local to the mounted lab; saved notebook trials retain reproducible inputs and student writing.

The [FEMA structural dynamics notes](https://www.ce.memphis.edu/7119/pdfs/feam_notes/topic03-structuraldynamicsofsdofsystemsnotes.pdf) explain harmonic excitation, damping, transient response, and base excitation. The [existing model notes](../bridgelab-immersive-earthquake-2026-09-28/model-notes.md) describe the teaching model's assumptions.

In the captured intermediate-mode example with 0.12 g input and 5% damping, the largest tested relative motion is 18.302 cm at 1.10 Hz. With 20% damping, the largest tested acceleration is 0.317 g at 1.05 Hz, slightly below the assumed 1.10 Hz natural frequency. These are model outputs for the displayed packet and settings. The two measures and discrete tested peaks should be interpreted separately.

## Verification

**186 distinct checks passed:** 168 unit/interaction checks, one unchanged Bridge render snapshot, and 17 Chromium browser workflows. The final unit run completed all 22 selected files; 260 unrelated tests in shared files were intentionally excluded by the Bridge/viewer filter. Both source copies are byte-identical and all 923 literal English fallbacks match both registries. JavaScript parsing and scoped whitespace checks pass. Desktop and phone previews were visually reviewed.

New numerical checks compare compact scan points with the complete model, verify units and fixed input acceleration, distinguish frequency and damping effects, and cover zero-input curves and measure-specific maxima. Interaction checks cover explicit start, completion, cancellation, context changes, stale results, preserved student writing, keyboard selection, scene focus, saved evidence, and deliberate 2D inspection.

Browser coverage includes mouse and touch selection, keyboard bounds, both plotted measures, inspection without rebuilding scene geometry, saving a selected test, invalidating changed damping, rerunning with lower peaks, and reduced-motion 2D use. Existing immersive viewing, fullscreen recovery, replay, notebook comparison, and printing workflows also pass.

- [Final unit and snapshot results](regression-unit-results.json)
- [Final browser results](browser-final-results.json)
- [Source and coverage verification](source-verification.json)

Recheck the source copies, English fallbacks, and completed result coverage from the repository root:

    node reports/bridgelab-frequency-2026-09-29/verify.cjs

## Previews

- [Desktop motion scan](bridge-1000-frequency-motion.png) · [Phone motion scan](bridge-320-frequency-motion.png)
- [Desktop acceleration scan](bridge-1000-frequency-acceleration.png) · [Phone acceleration scan](bridge-320-frequency-acceleration.png)
- [Desktop inspection on the bridge](bridge-1000-frequency-inspection.png) · [Phone inspection on the bridge](bridge-320-frequency-inspection.png)
