# Bridge Lab: find the moments that matter

## Explore the earthquake from inside the scene

The replay panel now offers five key moments: **Start at rest**, **Peak relative motion**, **Peak deck acceleration**, **Shaking ends**, and **Observation ends**. Selecting one pauses the earthquake and vehicle at that model frame. It preserves the observer, camera pose, experiment settings, and student writing.

The shortcuts follow the trial currently shown in the scene. In an A/B comparison, choosing A updates the available peak times; switching back to B keeps the shared clock. A peak label clears if that instant is not a peak of the newly selected trial. Students can compare both trials at one time, then deliberately jump to each trial's own peak.

The measurements panel explains the selected moment and shows either its motion/acceleration magnitude or stored energy. It distinguishes the end of shaking at 16 s from the end of observation at 24 s. The latter does not imply that all vibration has stopped.

## Small-screen and accessibility details

- Replay and speed share a compact row, leaving room for key moments on a phone.
- Moment navigation remains available with measurements folded and in fullscreen, including reduced-motion mode.
- The native select supports keyboard navigation. When the explanatory readout is present, the select references it through its accessible description.
- With zero ground acceleration, peak shortcuts are disabled and boundary frames explain the zero readings.
- Without damping, motion and acceleration can peak at the same frame. Both choices remain available, each with its own explanation.
- Nonzero readings below the displayed precision use **<0.01 cm** or **<0.001 g**.

## Model and implementation

The shortcuts use the existing response history and its stored 1/60-second peak frames. The shared model time retains the full sample value; displayed times are rounded to two decimals. The scene reuses the elastic teaching model and its 10× visual displacement. Static structural analysis is separate from this earthquake model.

The active moment is derived from the selected response and current time. Only the last deliberately chosen label is held locally to distinguish coincident moments; it cannot keep a stale label at a different time. Scrubbing away removes the explanation, and playback hides it.

## Verification

**97 distinct checks pass: 79 unit assertions and 18 Chromium workflows.** The browser run uses one worker and no retries. Screenshots were inspected at 1000 px and 320 px, including the embedded and fullscreen scenes.

Coverage includes exact peak selection, A/B time preservation, coincident undamped peaks, very small nonzero readings, zero shaking, keyboard navigation, folded measurements, reduced motion, observer switching, bounded scene resources, and recovery from WebGL loss in native and fallback fullscreen.

The second unit run exceeded the 30-second limit in the existing zero-input frequency scan. Its 57 other assertions passed. The same scan assertion passed on a targeted rerun with a 90-second limit (6.17 seconds of test execution). The verifier merges results by assertion identity, requires every final result to pass, and counts each assertion once. All original result files are retained below.

Both Bridge Lab source copies are identical. JavaScript parsing, scoped whitespace checks, and all 1,016 literal English fallbacks in both registries pass.

Run the artifact and source checks from the repository root:

    node reports/bridgelab-key-moments-2026-09-30/verify.cjs

- [Initial unit results](unit-results.json)
- [Final interaction run](unit-interaction-results.json)
- [Frequency-scan follow-up](unit-scan-followup.json)
- [Browser results](browser-results.json)
- [Source and coverage verification](source-verification.json)

## Previews

- [Desktop fullscreen](bridge-1000-key-moments-fullscreen.png)
- [Phone fullscreen](bridge-320-key-moments-fullscreen.png)
- [Desktop embedded scene](bridge-1000-key-moments-inline.png)
- [Phone embedded scene](bridge-320-key-moments-inline.png)
