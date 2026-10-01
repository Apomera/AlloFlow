# Scale Explorer: proportional Solar System exploration

## Changes

- Replaced six identical, arbitrarily spaced markers with eight distinct planet markers and proportional orbital radii.
- Added illustrated surfaces, sunlight-facing shading, Saturn's rings, and a seeded asteroid belt.
- Added ten landmarks, readable names with leader lines, collision handling, an inner-system camera preset, and inspection up to 32×.
- Added an AU readout and a Sun-to-planet distance line for the selected world.
- Added journeys into the detailed Sun, Earth, and Jupiter scenes and back to the Milky Way.
- Deep views persist in the field notebook. Other specimens and the comparison studio retain their existing zoom limits.
- Close approaches ease by zoom ratio, honor reduced motion, and stop drawing when settled with ambience paused.
- Updated the source mirror and all four English string catalogs. The label audit confirms no conflicting atlas fallback strings.

## Scientific scope and references

The paths are circular and coplanar. Their radii use the J2000 semimajor axes in [NASA/JPL's planetary reference table](https://ssd.jpl.nasa.gov/planets/approx_pos.html). Neptune's reference radius normalizes to 0.5 model units; the atlas retains its approximate 9.0 × 10^12 metre width.

Planet longitudes are composed for readability. The Sun, planets, and belt particles are enlarged markers; their surfaces and colors are illustrative. Inspection changes the camera, while every orbit position and radius stays fixed.

The rocky and outer planet groupings follow [NASA's Solar System overview](https://science.nasa.gov/solar-system/solar-system-facts/). The belt is an illustrative population between Mars and Jupiter, following [NASA's asteroid overview](https://science.nasa.gov/solar-system/asteroids/).

## Verification

- **120 unit checks passed** across seven suites. See unit-results.json and unit-results.txt.
- **48 distinct browser scenarios passed** across the full run and focused rerun.
  - Full run: 45 passed, one microscopy timing assertion failed, two serial microscopy cases did not run.
  - The assertion read marker and canvas bounds at different moments during scrolling. It now waits for the exact rendered landmark and reads both rectangles in one synchronous layout snapshot, retaining the same two-pixel tolerance.
  - All three microscopy scenarios then passed. See browser-results.txt and microbiology-recheck.txt.
- Five new orbital scenarios verify the eight orbital ratios and unchanged geometry, 32× phone notebook restoration, shared-scale Sun comparison, actual WebGL 1 shaders, and smooth paused-camera settling.
- Reviewed desktop and 320-pixel phone screenshots, including the overview, all four inner planets, Earth, Saturn, the belt, and comparison view.
- JavaScript syntax and scoped whitespace checks passed.
- Root and desktop source match: SHA-256 b5f33a2791301b4b1689d99df237d7181d079b0a0d51fffb67c8288fb5822bb0.

## Preview

[Open the Solar System](http://127.0.0.1:54391/?tool=scaleExplorer&focus=solar-system&v=orbits).

Changes remain uncommitted, as requested. source-before.js records the source at the start of this enhancement for a focused local comparison.
