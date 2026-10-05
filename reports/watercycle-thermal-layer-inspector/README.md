# Thermal layer inspector

Storm's temperature profile now has an **Inspect the falling particle** disclosure. Learners can select cloud base, middle air or near surface, compare air temperature with the modeled particle cue, and try an optional unscored description check. The selected point and particle symbol have matching readable text. Surface arrival and freezing on contact have their own explanation.

## Model and science review

The inspector reads the existing model's temperature points at relative positions 0, 0.55 and 1, its clamped 0°C crossings, and `wcPrecipPhaseFromModel`. It does not infer particle phase from local air temperature. These positions and transition bands are schematic; they do not measure altitude, fall time or energy.

Freezing rain remains liquid before surface contact. Its label says **supercooled** only when the selected air temperature is below 0°C; the existing model's illustrative transition band can begin before the exact crossing. Sleet is solid ice before reaching the surface. These distinctions agree with the [NWS explanation of sleet and freezing rain](https://www.weather.gov/iwx/sleetvsfreezingrain). Below-freezing air can also contain liquid droplets, as described in the [NWS discussion of wintry precipitation](https://www.weather.gov/arx/why_wintrymix).

Virga is an evaporation cue without an invented liquid or ice state; the [NWS definition](https://marine.weather.gov/glossary.php?word=VIRGA) describes precipitation that evaporates before reaching the ground. Clear conditions have no sustained falling particle. Hail is solid ice, with an explicit note that the sketch does not trace repeated updraft growth.

Selections and practice answers use only `wcThermalLayerInspector` metadata. Their identity includes the full canonical physical setup with storm time fixed at 52, so autoplay does not erase accepted feedback. A physical setup or selected-level change invalidates the old answer. No scores or rewards are added.

## Verification

- **34 focused tests and 146 tests in five unchanged regression suites pass**: 180 distinct final tests, with no failed, pending or todo cases. The regression selection covers precipitation, sleet versus freezing rain, Storm experiments, immersion and the prior Storm moments feature.
- Final browser: **1,208 passing checks**, **169 native actions**, **37 captures**, and **37 scoped accessibility audits** with no violations, incomplete results, page errors or console errors.
- Eight display contexts: desktop, 320px and 390px phones, a narrow host panel, dark, app contrast, and forced colors on phone and dark layouts. Measured inspector text is at least **13px**, text contrast at least **7.31:1**, and controls at least **44px** high.
- All eight actual model types were inspected at all three levels. Additional checks cover zero and tiny temperatures, transition bands, two crossings, malformed metadata, keyboard focus, feedback retention, original weather/timeline edits, paused 2D and genuine 3D resources, learner state, awards and pixels.
- The uncommitted starting runtime is pinned at `d68b832b…`. Whole-source token comparison preserves **356,218 prior tokens** after removing only the new helper/style/renderer/append and reverting the two chart labels from COLD AIR/WARM AIR to their prior text.

The failed preflight remains saved with its own runtime, harness and three captures. Its axis label needed an explicit group role; the final candidate resolves that finding. Baseline SVG contrast incompletes remain recorded as baseline observations. A draft unit fixture expected freezing rain from a setup that the unchanged kernel classifies as sleet; its 33/34 run and exact executed test are retained in `diagnostic-unit-fixture-24984`. Correcting the fixture required no production change. Headline counts use only the final successful runs.

All three owned browser runs closed before the sequential final tests. Native absence checks confirm closure of **12** failed and final test processes, including the recorded workers. Final main/public/frozen/served runtime bytes match `d07dee1e…` (3,119,260 bytes).

## Saved evidence

`artifact-summary.json` pins the current main/public runtime, frozen browser runtime and harness, actual test files and loaded receipts, regression fixtures, documentation, screenshots, process closure and preview receipt. `verification-summary.json` records the independent checks performed by `verify.cjs`.

```powershell
node reports/watercycle-thermal-layer-inspector/verify.cjs --read-only
```

The verifier reads saved files and checks their hashes and raw receipt fields. It starts no browser, tests or server. Omit `--read-only` to refresh only this report's verification summary. The learner preview at <http://127.0.0.1:8770/> remains available; its server is separate from the closed QA resources. These enhancements remain uncommitted.
