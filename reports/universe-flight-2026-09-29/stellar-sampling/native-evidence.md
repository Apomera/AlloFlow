# Stellar surface sampling: native evidence

The candidate fades the illustrative fine granules when the local surface has too few screen pixels. It retains the original field in sufficiently resolved cores. These measurements describe display pixels in Chromium with SwiftShader; they do not measure physical granule sizes or stellar photometry.

## Sources and coverage

- Baseline renderer: `a8de9ef0c0dc7362dc1284917b106ff82072f3a6b4943d947a3c8de6354dadcf`.
- Candidate renderer: `604a7f50df297c5c1d9c9c3db3007e2425ba828eadc408d6006330dee8f91889`.
- A third diagnostic renderer sets only the baseline fine-granule coefficient to zero. It is used to measure the remaining fine contribution and is never installed.
- 93 capture observations, including 81 saved PNGs, cover the amber, blue and pale sources at 192px and 384px, representative Low/Auto/High settings, DPR 1 and 2, a forced 16px point cap, fixed source hemispheres, relativity and its rest comparison.
- The captures include unchanged unresolved-star, galaxy and cloud controls. Nine scenes each create and release two textures, two buffers and two programs. All native GL and page error checks pass.

## Observed results

At 192 CSS pixels and DPR 1, the candidate's fine residual RMS is 17.40% of the baseline for amber, 17.22% for blue and 16.47% for pale. This residual compares each rendered photosphere with the diagnostic that retains the coarse field and spots.

Every tested well-resolved core matches the baseline pixels exactly. Its mask requires the local sampling budget to exceed 100 device pixels, giving the 96px shader threshold a 4px precision margin. Every tested low-budget limb mask matches the coarse diagnostic exactly; its mask stays below 44px and inside the feather. Emission outside the photosphere feather also matches the baseline exactly. The 136px sprite has a 47.6px photosphere and matches the coarse diagnostic throughout its surface.

Across all 29 matched photosphere cases, mean display brightness ranges from 99.9823% to 100.0366% of the baseline. All 18 forced-cap portraits match their normal-cap counterparts exactly. Both atlases, all three point populations and all 12 authored scenic camera snapshots stay unchanged.

The 30-size sweeps retain smooth normalized display flux. The largest neighboring step near the existing point/quad handoff is 0.5867%; the neighborhoods around the two granule thresholds stay below 0.0144%. Paused captures repeat exactly.

The flux sweep subtracts the clear background and normalizes the isolated source's crop luminance by sprite area. Across the thirty baseline/refined pairs, that display-flux measure changes by at most 0.07377%. The earlier mean-brightness comparison uses the whole capture frame, which includes its dark background. Neither measure is a physical photometry calibration or a temporal-shimmer test.

The existing relativistic exposure stress case clips 2.8271% of the baseline frame to near-white. The candidate clips 2.8402%, an increase of 0.0131 percentage points. The accepted guards are the established 3% absolute bound and a maximum 0.1 percentage-point increase relative to the baseline.

## Verification record

`native-check-initial.json` preserves the original run, including its final 2.5% absolute clipping guard failure. That guard rejected the existing baseline stress portrait as well. The revised guard was checked offline against all original observations; every saved PNG's decoded pixel hash and statistics were also verified. `native-check.json` records the successful recheck, both harness hashes, the initial report hash and the measured bounds. No capture was rerendered to lower its exposure.

After the candidate is installed, run:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/universe_flight_stellar_sampling_check.cjs --recheck
```

Omit `--recheck` to generate a new native proof. `UNIVERSE_STELLAR_SAMPLING_SOURCE`, `UNIVERSE_STELLAR_SAMPLING_BASELINE`, `UNIVERSE_STELLAR_SAMPLING_STAGE` and `UNIVERSE_STELLAR_SAMPLING_REPORT` allow explicit source and evidence paths.
