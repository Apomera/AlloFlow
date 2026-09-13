# Activity tracking browser QA

Verified the integrated local production core and builder with the native React interface, real Three.js rendering, and SwiftShader WebGL. Production source hashes are recorded in both JSON reports. No production code was modified for this QA.

## Results

- **45 desktop and responsive assertions passed.** Coverage includes explicit pinning; no automatic retargeting while browsing; tracking persistence across lesson reopening and actual tool unmount/remount; clearing on world changes; preserved player position, construction, scores, and reviewed work; disabled pressed state; stop-button focus; route markers; real compass pixels and mentor sprite state; reused sprite/texture identities; spoken location at four cardinal camera angles; and reachable controls at 390×844, 320×700, and 844×390.
- **9 isolated native-touch assertions passed.** Native taps through Home → Learn → Start and Track/Stop worked on a 390×844 coarse-pointer page. The journal fit the viewport, Track had a reachable 44px target, tracking updated the actual compass and mentor label, and both actions preserved position and learning state.
- Both runs recorded **zero JavaScript page errors and zero console errors**. No production defect was found.

The combined script completed all 45 desktop/responsive assertions, then timed out performing Start lesson in a second touch page while retaining the first WebGL world. Its `tracking-browser.json` therefore correctly retains an overall incomplete result. The remaining touch flow was rerun in a separate single-page browser and passed; see `tracking-touch-browser.json`. The evidence establishes 54 completed passing assertions across the two runs, not a single uninterrupted 54-check run.

## Visual inspection

The 320px journal screenshot has readable wrapped instructions, a visible close control, and a full-width Track button with no horizontal spill. The touch world screenshot shows the real tracked compass marker and touch construction controls. A first-entry Quick Tour remains visible in the touch capture; it does not block the journal Track/Stop flow. Mentor appearance and contrast were also separately checked by the ground-visual QA task.

## Reproduction and evidence

```powershell
node reports/geometry-world-guidance-2026-09-12/verify-activity-tracking.cjs
node reports/geometry-world-guidance-2026-09-12/verify-tracking-touch.cjs
```

- `tracking-browser.json`: 45 completed desktop/responsive assertions; final second-page setup timeout retained.
- `tracking-touch-browser.json`: isolated touch run, 9/9 passed.
- `tracking-journal-320x700.png`, `tracking-journal-390x844.png`, `tracking-journal-844x390.png`: responsive journal captures.
- `tracking-world-1440.png`, responsive `tracking-world-*.png`, and `tracked-guide-label.png`: real world and label captures.
- `tracking-touch-390.png`: native touch world capture.

The QA scripts reuse the existing local host fixture and load current production files. They do not patch missing functionality, substitute a mock renderer, or depend on proposed production patch scripts.
