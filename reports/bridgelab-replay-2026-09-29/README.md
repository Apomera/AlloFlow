# Bridge Lab: immersive replay and energy timelines

## What changed

- **Replay from the bridge.** The 3D stage now contains play/pause, speed, and time controls. They remain usable in fullscreen and share the experiment clock with the controls above the scene.
- **Slow the observation.** Choose normal, half, or quarter speed. Playback speed changes viewing time without changing the response calculation, forces, peak results, or saved experiment inputs.
- **Follow energy through the event.** The new energy timeline stacks kinetic energy, elastic energy, and cumulative dissipation. A dashed white line shows net input work, making the energy balance visible. Band thickness represents each contribution.
- **Inspect directly.** Tap or drag either timeline to pause at a moment. Keyboard arrows step 0.05 seconds, Page Up/Down step one second, and Home/End select the endpoints. The scene, mechanism, numerical readings, and chart cursor stay synchronized.
- **Compare motion with energy.** Switch between energy and displacement histories while keeping the inspected time. The motion chart distinguishes ground and deck with dashed and solid lines. Both charts mark the end of shaking at 16 seconds and keep a fixed vertical scale within an experiment.
- **Read the direction of work.** Input power now identifies increasing input work, decreasing input work, or zero instantaneous input in the relative-motion model.
- **Recover from rendering failure.** If WebGL fails while the scene fills the screen, the lab exits native fullscreen or its fill-frame fallback, pauses motion, and moves focus to the labelled 2D view.

## Try it

1. In **Stress Test**, enable **Earthquake experiment** and choose **On the bridge**.
2. Set **Scene replay speed** to quarter speed. Enter fullscreen and select **Replay scene**.
3. Pause or move the scene's time slider to inspect a still frame.
4. In **Follow the energy → Replay the evidence**, inspect the energy chart near peak motion, then switch to **Motion over time**.
5. Inspect 16–24 seconds. Compare the remaining stored energy with cumulative dissipation. Record an explanation in the earthquake notebook.

## Model and implementation notes

The existing elastic, base-excited model is unchanged. These visualizations show one assumed vibration mode and do not predict the earthquake safety or damage of the static bridge design. See the [model notes](../bridgelab-immersive-earthquake-2026-09-28/model-notes.md).

The effective earthquake force in relative coordinates is minus mass times ground acceleration. Multiplying the model equation by relative velocity gives input power per modal mass as −a_ground × v_relative; its sign indicates the direction of work in that model. This follows from the equation in [FEMA 451B, Topic 3, slides 57–58](https://www.ce.memphis.edu/7119/pdfs/feam_notes/topic03-structuraldynamicsofsdofsystemsnotes.pdf). It is not an estimate of the total energy of a real bridge or earthquake.

Chart geometry uses the stored response samples and is cached by physical settings, response mode, and chart selection. Moving time only changes the cursor and readings. The areas share one scale, with each band's thickness proportional to its energy value. The net-work curve matches the sum within numerical integration error. Zero input uses a finite display scale. The scene continues to update transforms without rebuilding bridge geometry.

Replay still requires an explicit start. Restored state, hidden pages, reduced motion, leaving Stress Test, selecting 2D, and WebGL failure preserve the existing pause behavior. Manual timeline inspection remains available in 2D and under reduced motion.

## Verification

**162 distinct checks passed:** 149 unit/interaction checks, one unchanged Bridge render snapshot, and 12 Chromium browser workflows. The final unit run completed all 22 selected files. Unrelated tests in shared suites were intentionally filtered out.

New checks cover quarter-speed timing without rounding drift, changing speed during replay, shared scene controls, pointer and keyboard inspection, bounded endpoints, cache invalidation, zero input, energy-band thickness, common displacement scales, touch input at 320 px, and focus recovery from both fullscreen implementations after WebGL loss. Existing investigation, print, static-analysis, view-recovery, and reduced-motion workflows also pass.

Both source copies are identical. All 879 literal English fallbacks match both registries. JavaScript parsing and scoped whitespace checks pass. Desktop and phone previews were visually reviewed.

- [Final unit and snapshot results](regression-unit-results.json)
- [Final browser results](browser-final-results.json)
- [Source and coverage verification](source-verification.json)

Run the source/report consistency check from the repository root:

    node reports/bridgelab-replay-2026-09-29/verify.cjs

The browser tests use the working-tree harness. Their report-local configuration disables video recording and retains failure diagnostics. Set BRIDGE_REPORT_DIR to this report directory to keep captures separate from earlier reports.

## Previews

- [Desktop scene controls](bridge-1000-scene-replay.png) · [320 px scene controls](bridge-320-scene-replay.png)
- [Desktop energy timeline](bridge-1000-energy-timeline.png) · [320 px energy timeline](bridge-320-energy-timeline.png)
- [Desktop motion timeline](bridge-1000-motion-timeline.png) · [320 px motion timeline](bridge-320-motion-timeline.png)
