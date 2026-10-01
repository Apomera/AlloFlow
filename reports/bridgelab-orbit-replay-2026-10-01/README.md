# Bridge Lab: immersive energy replay

October 1, 2026

## What changed

- Added a bright fading trail to the Energy orbit. It contains past motion from up to one natural period and ends at the exact replay frame. A direction cue follows the recent path, while faint background paths retain the full experiment.
- Added a stored-energy split bar: gold kinetic energy and blue elastic energy. The fractions use the energy stored at the current frame. The orbit radius continues to show its amount, so damping is visible without confusing energy composition with energy loss.
- Connected the trail and split to live replay, manual cycle inspection, selected A/B trial, labelled 2D view, saved scene restoration, and graphics fallback. Zero shaking leaves an empty bar and creates no recent trail or direction cue.
- This commit also includes the earlier pending Bridge Lab improvements: Focus scene layout, simultaneous A/B scene measurements, key-moment inspection, Force lens, Energy orbit, and saved force/energy evidence.

## Try it

1. Enable Earthquake experiment in Build and choose a 3D viewpoint.
2. Open Measurements or Scene tools, then expand Energy orbit.
3. Prepare the 5% / 20% comparison. Replay and pause the scene, then switch between A and B. The highlighted recent path and split follow the selected trial at the same time.
4. Inspect Next turning point: the bar becomes elastic. Inspect Next center crossing: it becomes kinetic. Save an observation to revisit the same frame and rebuild the same trail.

## Physics and display

For relative displacement u, relative velocity v, and natural angular frequency ω, the plot uses x = ωu and y = v. The stored relative modal energy per kg is (v² + ω²u²)/2. The kinetic fraction is v²/(v² + ω²u²); the elastic fraction is the complement. Zero stored energy gives zero fractions.

The trail window is 1/fn, the natural period of the selected response mode. It uses the existing 60 Hz recorded vertices and interpolated start/end frames, with a bounded number of vertices. The direction cue uses two past frames and is hidden when its motion is too small to read clearly. The window describes recent motion; it does not assert that one damped or forced cycle has exactly this duration.

The graph uses the existing illustrative elastic earthquake model and relative motion. Motion in the bridge scene remains magnified 10×. Static truss analysis and earthquake response use separate models. Between stored frames, linear motion interpolation can cause a small variation in the displayed undamped energy.

## Verification

- 273 distinct checks passed: 255 unit checks across all 16 Bridge Lab suites, plus 18 real-WebGL workflows.
- Checked exact trail endpoints, past-only chronology, bounded vertices, segment continuity, physical phase direction, energy fractions, immutable input samples, A/B clocks, saved restoration, zero shaking, reduced motion, fullscreen, graphics recovery, and scene resource reuse.
- Reviewed desktop, phone, landscape, and labelled 2D captures. Checked the complete graph fits below the sticky Focus drawer header and the drawer has no horizontal overflow.
- Verified JavaScript syntax, exact source/public mirrors, 1104 English fallbacks in both registries, and scoped Git whitespace checks.
- The first unit run passed 254 checks. Its direction test expected a cue even for motion too small to display; a resonant fixture made the physical direction test visible, and its targeted rerun passed. The verifier retains the latest completed result for each named check.

[Verification data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/source-verification.json) · [Verifier](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/verify.cjs)

Final source SHA-256: 8420b4feb94ff3681a5e904c113757184e187f4cf1e9f50c5d1479efaad14c18

## Screenshots

![Recent energy motion in the bridge scene](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/bridge-1000-recent-orbit.png)

[Phone replay](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/bridge-320-recent-orbit.png) · [Landscape zero shaking](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/bridge-844-orbit-zero.png) · [Labelled 2D energy split](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-orbit-replay-2026-10-01/bridge-1000-orbit-2d.png)

## Commit scope

The local commit includes Bridge Lab source and its public mirror, Bridge Lab tests, only the Bridge Lab object in the shared English registries, and this validation report. Other working changes stay outside the commit.
