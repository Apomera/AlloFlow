# Galaxy: reference graph and release comparison

Date: 2026-10-01

A kept black-hole experiment now appears as a dashed reference in the distance graph. A live comparison table shows the release inputs, center outcome, and closest modeled center distance for both runs.

## Changes

- Both center curves start at release together and use the current experiment’s elapsed model time and playback window.
- The graph uses one distance scale for the current center, surviving debris, the selected fragment, and the reference. Adding or clearing a reference updates the curves, cursor positions, and fragment-moment markers together.
- A reference curve ends at its own modeled endpoint. After that, its marker disappears and the readout reports horizon capture or the end of its modeled interval. Scrubbing backward restores the marker.
- The reference has a dashed line and hollow marker; the selected fragment retains its solid line and filled marker.
- The comparison table highlights changed object, black-hole mass mode, start radius, sideways motion, radial push, and release angle. It updates during launch editing and treats 180° and -180° as the same direction.
- Keeping or clearing a comparison preserves the current time, selected debris, and camera view. Existing persistence rebuilds the reference after reopening.
- Keyboard scrubbing exposes both center readouts through the graph’s accessible value. The table has column and row headers.
- Both source copies match, and 17 new English labels are synchronized in the shared registries and Galaxy catalog. Other locales use the existing fallback.

## Verification

- 523 tests passed across all 19 Galaxy test files, including 22 new comparison tests.
- New browser checks passed live table editing, shared-clock sampling, exact reference endpoints, selected-debris and moment-marker coordinates on the shared scale, camera/time preservation, optical view switching, JSON remounting, and cleanup.
- Existing notebook, distance-graph, and fragment-moment browser checks passed with no browser errors.
- Desktop at 1440 px, phones at 390 and 320 px, and RTL layouts passed overflow and geometry checks. Screenshots were visually reviewed.
- Source and QA scripts passed syntax checks. The scoped diff passed whitespace checks.

## Model scope

The comparison uses the existing nonrotating Schwarzschild center paths and normalized horizon-radius units. Playback remains model time. Tidal deformation remains illustrative; the center outcome and individual debris paths are distinct.

## Review files

- [Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/validation-summary.json)
- [Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/galaxy-tests.json)
- [Comparison browser checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/browser-results.json)
- [Desktop graph](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/comparison-graph-1440.png)
- [Phone comparison table](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/comparison-table-320.png)
- [Phone graph in RTL](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-comparison-2026-10-01/comparison-graph-320-rtl.png)
- [Comparison model source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_galaxy.js:276)
- [Local preview](http://127.0.0.1:53693/): choose Black holes, keep a path, change the launch, and release.

Changes remain uncommitted.
