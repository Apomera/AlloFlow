# Bridge Lab: watch from the riverbank

## Compare two observer positions

Choose **From the riverbank** in Stress Test for an eye-level view of the bridge from a small observation pad. Choose **On the bridge** to return to the walkway. A **Bank view / Deck view** button inside the scene makes the same switch in fullscreen.

- The riverbank camera moves with the simulated ground. Its aim also moves with the ground, so it does not automatically follow the deck.
- The deck camera moves with the deck. Each observer retains its own look direction, and the deck retains its walking position.
- Switching observers pauses playback at the same time. It preserves the selected A/B trial, experiment inputs, measurements, and student writing.
- On the bank, arrow keys look around and Home faces the bridge. Dragging and the labeled look controls also work. The bank view has no walking control.
- **Face the bridge**, **Look along the bank**, and **Reset viewpoint** provide deliberate camera presets. Reduced motion supports these controls and time stepping.

The bank pad moves with the ground; the optional dashed resting rails stay in world coordinates. The existing 10× scene displacement scale applies to both observers. Numeric displacements remain actual centimeters from the teaching model.

## A clearer immersive view

Select the **Measurements · motion 10×** heading to fold the readout away. The compact heading retains the time and selected A/B trial. Replay, scrubbing, fullscreen, viewpoint switching, and resting rails remain available. Folding the readout keeps explicitly started replay running; it does not start playback.

Reopening the readout restores the motion guide and energy section to their prior open or closed state. This gives narrow screens more space for the bridge without losing the experiment context.

A useful inspection sequence: pause at one moment, compare the readings, fold the panel, then switch observers. The numbers stay the same while the apparent motion changes with the camera's attachment to deck or ground.

## Implementation and checks

Both observers use one renderer and the same bridge geometry. Camera changes update pose without rebuilding the scene. The bank viewpoint is 1.65 m above the observation pad; its geometry and angle bounds are checked at 10 m, 30 m, and 80 m spans. A/B trials use the same selected observer. WebGL loss retains the 2D fallback and requires a deliberate choice before returning to 3D.

**110 focused checks pass: 86 unit checks and 24 Chromium workflows.** Coverage includes the camera attachment at different spans, independent observer controls, A/B readings, folded measurements, native and fallback fullscreen, 320-pixel layouts, reduced motion, saved evidence, and WebGL recovery. The final browser run uses one worker and no retries.

Resource checks render both observer positions before comparing repeated switches, accounting for geometry uploaded when it first becomes visible. Repeated switching does not grow geometry or texture counts, and camera changes do not rebuild the bridge. Both Bridge Lab source copies match, and all 999 literal English fallbacks match both registries.

Run from the repository root:

    node reports/bridgelab-bank-view-2026-09-30/verify.cjs

- [Unit results](unit-results.json)
- [Browser results](browser-results.json)
- [Source and coverage verification](source-verification.json)

## Previews

- [Riverbank, desktop](bridge-1000-bank-immersive.png)
- [Riverbank with measurements, desktop](bridge-1000-bank-a.png)
- [The same moment from the deck, desktop](bridge-1000-deck-a.png)
- [Riverbank, phone](bridge-320-bank-immersive.png)
- [Riverbank with measurements, phone](bridge-320-bank-a.png)
- [The same moment from the deck, phone](bridge-320-deck-a.png)
