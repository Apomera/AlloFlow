# Reading the precipitation air column

The temperature diagram now shows where air crosses 0°C with exact marker positions, numbered callouts, and separate temperature readouts. It distinguishes full crossings, points that only touch 0°C, and whole sections at 0°C. Nearby markers have separated number badges connected to their true positions.

## Interaction and clarity

- The “Compare air with particle state” button opens the existing thermal inspector and focuses its summary.
- Chart summaries distinguish air temperature from modeled particle state. Schematic chamber bands are labeled as temperature cues.
- Precise signed readouts keep small positive and negative temperatures visible. Long values stack vertically on narrow screens.
- Larger axis labels and explicit high-contrast styling improve the diagram in light, dark, and forced-colors views.

The physical distinction follows the [National Weather Service explanation of winter precipitation](https://www.weather.gov/lmk/winter-precip): melting depends on the warm layer, and liquid drops can remain supercooled below freezing. The precipitation, thermal, lifecycle, and particle-phase model functions are unchanged in this update.

## Validation

- 11 unit tests passed against the installed source and mirror, covering exact crossing positions, zero-temperature cases, invalid input, immutability, and extreme finite values.
- 14 browser scenarios passed, including near-end and closely spaced crossings. Keyboard activation opens the inspector and arrow keys update the native slider and diagram.
- 11 screenshots checked at desktop and 320/390-pixel widths, including dark and forced-colors views. No horizontal overflow or browser errors.
- Both runtime copies match and parse. Three reversible deltas reconstruct the exact starting source, and independent review verified unchanged model functions.
- Local preview on port 8770 served the final source with HTTP 200.

The browser checks use the local fixture in 2D with reduced motion. They validate this diagram and its controls; this run does not re-audit the complete 3D renderer. Existing canvas/HUD numeric labels still round to whole degrees; normal temperature sliders use whole-degree steps, while this chart also supports fractional model inputs.

Source SHA-256: `9a31c9d2107ccaf74c578e3423958d5066915cd0dcd8b42b9fb5dc6442a56ed9`.

From the repository root:

```sh
node reports/watercycle-air-profile/verify.cjs
node node_modules/vitest/vitest.mjs run --config reports/watercycle-air-profile/vitest.config.mjs
node reports/watercycle-air-profile/capture.cjs 9a31c9d2107ccaf74c578e3423958d5066915cd0dcd8b42b9fb5dc6442a56ed9
```

The verifier checks saved evidence, source hashes, syntax, reversible deltas, and unchanged model functions. Browser reruns create a new timestamped evidence directory. No commit was created.
