# Recorded energy visuals

The motion panel now includes an energy timeline for its recorded flight. Stacked bands show kinetic energy, gravitational potential energy, and energy transferred by drag. A matching budget bar and five numerical readings explain the selected moment.

## Behavior

- The chart uses each flight's captured mass, gravity, launch speed, height, drag model, and original samples. Changing current controls preserves that recorded energy view.
- Selecting an older retained flight switches the energy timeline alongside its canvas, velocity graphs, sample inspector, and data table.
- Tapping the timeline selects the nearest original observation and pauses playback. The existing time control supports keyboard selection through every recorded point.
- The filled bands use up to 80 representative samples plus the selected point. The launch and exact impact observations are included. Numerical readings keep full precision internally and display two decimal places in joules.
- Axes use joules or kilojoules to keep labels readable. Solid, horizontal, and diagonal patterns identify the three bands in all themes.
- A paused launch initially shows its single recorded energy budget. Stepping or resuming builds the timeline. The impact note explains that the final flight sample is at ground contact, before collision energy is redistributed.
- Unsupported recorded metadata displays an explanation. Original launch data is required to calculate an energy view.

Energy timelines use the simulator's retained flight trails. Up to five trails are available at a time. Axis labels are rounded for readability; the numerical readings provide the values in joules.

## Visual review

| View | Earlier motion panel | New energy timeline |
| --- | --- | --- |
| Desktop, 1100 px | [Before](energy-before-default-1100.png) | [After](energy-default-1100.png) |
| Phone, 320 px | [Before](energy-before-default-320.png) | [After](energy-default-320.png) |
| Dark phone, 320 px | | [After](energy-dark-320.png) |
| Contrast phone, 320 px | | [After](energy-contrast-320.png) |

The [visual results](energy-results.json) include nine combinations of theme and viewport width, exact selected readings, text contrast, screenshot links, and evidence hashes. The [baseline](energy-before-results.json) captures the earlier motion panel using the same two completed flights.

## Verification

- **179 unit checks passed** across 14 physics test files.
- **52 existing browser checks passed** in the full regression run. All **nine energy browser checks passed** after the final label spacing, marker contrast, and metadata fallback changes.
- **Nine final visual configurations passed:** 1100, 375, and 320 px in the default, dark, and contrast themes. Visible energy text was at least 12 px with contrast of at least 5.83:1. Cursor and boundary strokes had at least 5.0:1 contrast against each band color. There was no page overflow or browser error, and SVG label bounds were checked.
- The browser checks matched each band boundary to the original recorded velocity and height within 0.002 SVG units. Budget bar lengths matched their values within 0.05 px. The selected point was included in the plotted bands.
- The desktop and phone evidence hashes matched the earlier baseline exactly. Selecting a point and changing current controls preserved the original ball, samples, experiment log, and last-flight result.
- Source syntax, source/desktop parity, physics catalog parity, and existing English physics strings were checked. Eleven new physics labels and explanations were registered in both catalogs.

The final visual audit records source SHA-256 `1ab1c2db383b7b69fe35c9a1375e1ac705c2e7954f4c224800d7aa91230bea70`.

## Reproduce

Run from the repository root:

```powershell
node reports/physics-energy-visuals-2026-09-29/verify-energy.cjs
```

The audit completes a vacuum flight and a drag flight using the simulator controller, selects the highest recorded drag sample, changes the current launch controls, and checks the resulting energy view. It also verifies that the ball, recorded samples, experiment log, and last-flight result remain unchanged.

The [browser specifications](../../tests/e2e/physics-energy-visuals.spec.ts) verify the band geometry against the original motion samples, time selection, retained flights, a paused start, a short flight, unsupported metadata, fractional and maximum energies, and all three themes at 320 px. The full regression commands are in [the physics workflow](../../.github/workflows/physics.yml).
