# Tectonic plate lab: idle rewards and learning review

## Findings and changes

The existing automatic-drift path already excluded XP, but it still played earthquake and eruption audio repeatedly and scheduled achievement checks. The separate boundary simulator also played audio for its automatically generated earthquakes.

- Automatic events now update the model silently, without awarding XP, completing missions, or scheduling achievement checks.
- Pointer and touch releases require actual displacement. Keyboard gestures consume their movement once; clamped keys, repeated releases, selection, and detached canvases cannot replay a reward.
- Boundary events use the same current geometry as the drawing. Event totals update atomically, including a gesture that affects two neighbouring boundaries.
- Achievement notifications run after React commits the completed achievement. A receipt prevents duplicate notices; saved achievements do not replay on reopening.
- Missions track boundaries the student made, separately from boundaries merely observed during drift.

## Visual and teaching improvements

- The seven numbered plate labels are now selection buttons, with a visible selected state and keyboard movement support.
- The diagram identifies manual control or automatic observation. Its opening instruction remains readable until a boundary appears.
- A model note explains that the blocks represent portions of plates and that the arrangement, spacing, and motion are simplified.
- Each boundary explanation includes a predict, observe, explain prompt, also available through read-aloud.
- The explanations clarify water-assisted melting above a subducting slab, continental shortening and underthrusting, and stretching and thinning during continental rifting. New text is registered for translation.

Science references: [USGS on mantle melting](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma), [USGS on Himalayan underthrusting](https://www.usgs.gov/publications/seismicity-earth-1900-2010-himalaya-and-vicinity), [USGS on continental rifting](https://pubs.usgs.gov/publication/70015744), and [USGS on plates beneath continents and oceans](https://www.usgs.gov/special-topics/subduction-zone-science/science/introduction-subduction-zones-amazing-events).

## Verification

- 399 focused unit checks across ten tectonics, science, accessibility, and layout suites passed. Slow filesystem reads required rerunning two mirror checks with a 30-second timeout.
- Eleven Chromium checks passed with real React 18 development and StrictMode. The harness advances animation frames explicitly while retaining real canvas drawing, DOM events, state updates, timers, and audio-node creation.
- In the drift case, four earthquakes and four eruptions produced zero XP, achievement notices, mission credit, or sound starts. Real keyboard and pointer gestures still earned rewards.
- Repeated clicks, touch taps, releases, blur, blocked movement, rerenders, resizing, and restored achievements did not replay rewards.
- The unchanged source saved before this work reproduced 20 automatic audio starts. Three stationary clicks and three stationary taps each generated three additional XP awards.
- Desktop and 390-pixel phone captures were reviewed in light and dark themes. The existing scene harness also passed resize, label, selection, boundary, and keyboard checks after the final instruction-contrast adjustment.
- Source and deployment copies match. JavaScript syntax and the whitespace delta from the saved starting source passed.

Run the browser checks from the repository root:

```powershell
node dev-tools/tectonics_idle_reward_qa.cjs
node dev-tools/tectonics_scene_visual_qa.cjs
```

Browser results and screenshots are saved in `scratch/tectonics-idle-review/` and `scratch/tectonics-visual-review/`. The idle-reward report records the tested source hash. All eleven checks were rerun successfully after the 3D clarity refinement. The harness waits for a deliberate gesture's committed achievement notices and audio tail before testing stationary input, so deferred first-time notices cannot be mistaken for replayed rewards.
