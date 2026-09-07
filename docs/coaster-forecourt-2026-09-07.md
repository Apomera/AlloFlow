# CoasterLab station forecourt — 2026-09-07

The station now has a ground-level forecourt with a paved approach, patterned paving, borders, two slatted benches, four planted beds, and four path lights. Dusk and neon scenes include soft light pools without adding point lights. Trees avoid the forecourt footprint.

A compact staircase connects the forecourt to the platform. Flights divide the total rise to stay within a fixed footprint, with switchback landings for higher stations. Treads, landings, and rails use three instanced mesh batches and rebuild only when station height changes.

The forecourt follows the station position and heading but stays at ground level. Station view includes the approach in its framing. FX Lite retains the paving and stairs while hiding decorative details; blueprint mode simplifies the palette and hides plants and light pools.

Validation:
- 277 unit tests passed across CoasterLab, visual presentation, camera framing, and station foundations.
- Chromium/Three.js browser test passed for all four themes, FX Lite, unchanged analysis, rotated layout import, a raised station, finite instance transforms, and phone framing.
- Desktop day/night views, a close detail crop, and the elevated phone view reviewed visually.
- Canonical and desktop JavaScript copies match; targeted git diff whitespace check passed.

Browser spec: `tests/e2e/coaster-forecourt.spec.ts`.
Screenshots: `scratch/coaster-forecourt-final/`.
