# Black hole lab: fragment moments

## What changed

Select a debris fragment to see its own timeline. The expandable **Fragment moments** section lists breakup, inward and outward radial turns, and horizon crossing or observation end. Each button shows its percentage of the full playback. Previous and Next move between these moments, and the current moment has a violet highlight.

With the scene focused, PageUp and PageDown jump to the previous or next fragment moment. Every jump pauses at the model's exact event time. The first and last moments have clear navigation boundaries, and the keyboard keeps the page in place at those boundaries.

Matching dots appear on the violet distance curve. The curve includes a sample at every detected moment, so its markers and the scene use the same radius and time. Click a dot or tap within 22 CSS pixels to pause there. Markers keep a round, 10 px size across chart widths; the center and selected playback markers also compensate for chart scaling.

Replay preserves the chosen fragment and its timeline while returning to the start. Reset clears the selection and moments. Switching between object and light-bending views preserves the experiment. The fragment controls are available in the object view.

## Event interpretation

The timeline uses the existing nonrotating Schwarzschild geodesic model. Radial velocity changing from inward to outward marks a local closest approach; the reverse marks a local farthest point. An eccentric orbit can have several such moments. Release with zero radial velocity, a zero touch without a direction change, and small circular-orbit numerical noise do not produce false turning points.

Turning times are interpolated between the stored RK4 samples. Horizon crossings use the existing exact capture time, including parcels already inside the horizon at breakup. The timeline ends at capture when it occurs within the observation; otherwise it ends at the observation limit. An observation end is not a prediction that a fragment survives forever.

Object dimensions, deformation, breakup offsets, and playback time remain illustrative. This pass adds navigation and visual consistency; it does not add material or fluid dynamics.

## Verification

- 97 passing checks: 49 physics, 12 optics, 6 modes, 20 readability, and 10 layout.
- Turning points checked against exact-zero mock samples and a real eccentric geodesic. Circular motion and zero touches checked for false events.
- Immediate capture, observation clipping, exact crossing, and strict previous/next boundaries checked.
- Browser checks cover paused jumps, matching curve samples, keyboard navigation, mouse markers, phone touch snapping, replay, reset, view switching, and cleanup.
- Desktop and phone layouts checked at 1440, 390, and 320 px, including round marker sizing and right-to-left layout.
- Existing picking, motion, distance chart, launch planning, comparison, and follow-camera browser regressions pass.
- Source and desktop mirror match. Eleven new labels match both UI registries and the flat English catalog.
- The existing local preview serves the updated source. Changes remain uncommitted.

## Try it

Refresh [the local preview](http://127.0.0.1:60416/). Release an object, select a fragment, then open **Fragment moments**. Use the buttons, chart dots, or PageUp/PageDown with the scene focused. For repeated radial turns, try a star released at 8 horizon radii with sideways motion 1 and initial radial velocity -0.1.

## Evidence

- [Automated checks](galaxy-tests.json)
- [Fragment moment browser checks](moment-browser-results.json)
- [Picking regression](regression/picking-browser-results.json)
- [Motion regression](regression/motion-browser-results.json)
- [Distance regression](regression/distance-results.json)
- [Follow camera regression](regression/follow-results.json)
- [Launch planning regression](regression/planning-results.json)
- [Desktop controls](moment-controls-1440.png)
- [Phone chart](moment-chart-320.png)
- [Phone controls](moment-controls-320.png)
- [Right-to-left controls](moments-rtl-320.png)
- [Validation summary](validation-summary.json)
