# Physics: reopen original flight recordings

Completed flights now keep their original observations across reopening the simulator. The flight picker shows whether the selected recording is kept, its original point count, and its duration. Reopened recordings can be inspected through the shared Motion, Forces, Energy, and Data workspace.

## Behavior

- Keeps up to five recent completed recordings through the existing host autosave.
- Preserves every original time, position, and velocity value, captured launch settings, exact recorded apex, model version, prediction, and mission context. CSV precision is unchanged.
- Restores a stationary canvas with the recorded landing and apex markers. Initial loading and later host hydration both work. Restoration does not launch another projectile or replay rewards.
- Clear Log removes experiment rows and keeps recordings. Clear Trails removes recordings and the last-flight display. A deferred landing cannot put cleared evidence back or award a cleared target hit.
- Two short flights that land before React refreshes the screen receive distinct completed run IDs. Interrupted flights do not consume an ID.
- Invalid, incomplete, or unsupported-model recordings are rejected as whole records. Existing summary rows remain available; no trace is reconstructed from a summary.

The storage envelope is version 1. It keeps whole recordings within a 600 KiB serialized budget, with at most 4,096 points per recording. Very long flights can reduce the number retained. Records are validated and deeply frozen; restoration creates fresh runtime point objects. The numerical integrator is unchanged.

## Verified results

- **343 unit tests passed**, across 20 files. Includes 19 recording validation and round-trip checks, plus 3 tests through the actual host autosave helpers: delayed write, disposal flush, and retry after a failed storage write.
- **65 browser tests passed**, with one Chromium worker and no retries: 6 new recording cases and 59 affected regressions.
- **9 visual configurations passed**: 1,100, 375, and 320 pixels in light, dark, and high-contrast themes. No page or flight-details overflow; minimum text size 12 px; controls at least 44 × 44 px. Measured minimum text contrast was 5.20:1, 6.79:1, and 19.56:1 respectively. The flight picker retained keyboard focus.
- Full original vacuum and drag traces, apex selections, captured force/energy readings, and exported CSV remain equal after JSON persistence and remounting with different current controls.
- Source and desktop mirror match SHA-256 `21ec879803dee6927c065237c6f4882f7ba77f6c8b0d3307e0b84795073063e6`.

The browser tests use the repository's local React harness, real canvas controller, and compiled app stylesheet. Tests drive actual launches and original recorded samples. Host-save checks use fake timers/storage around the actual save helper. These checks do not exercise a deployed site or a browser profile whose local storage is already full.

The initial unit run exposed a partial-trail timestamp rendering crash; the display now omits duration until the timestamp exists. Final results below include that correction and the consecutive-flight ID fix.

## Reproduce

Run from the repository root in PowerShell, sequentially:

```powershell
npx vitest run tests/physics_ --maxWorkers=1 --pool=forks --reporter=default --reporter=json --outputFile=reports/physics-recorded-flights-2026-10-02/unit-results.json

$env:PLAYWRIGHT_JSON_OUTPUT_FILE='reports/physics-recorded-flights-2026-10-02/browser-results.json'
npx playwright test tests/e2e/physics-recorded-flights.spec.ts --workers=1 --retries=0 --reporter=list,json --output=reports/physics-recorded-flights-2026-10-02/browser-artifacts

$env:PLAYWRIGHT_JSON_OUTPUT_FILE='reports/physics-recorded-flights-2026-10-02/regression-browser-results.json'
npx playwright test tests/e2e/72-physics-lab-behaviour.spec.ts tests/e2e/physics-flight-integrity.spec.ts tests/e2e/physics-model-comparison.spec.ts tests/e2e/physics-flight-history.spec.ts tests/e2e/physics-analysis-workspace.spec.ts tests/e2e/physics-apex-inspection.spec.ts tests/e2e/physics-energy-visuals.spec.ts tests/e2e/physics-force-clarity.spec.ts tests/e2e/physics-investigation-evidence.spec.ts --workers=1 --retries=0 --reporter=list,json --output=reports/physics-recorded-flights-2026-10-02/regression-browser-artifacts

node reports/physics-recorded-flights-2026-10-02/verify-recordings.cjs
```

The verifier checks the saved results, screenshots, physics translation additions, source/mirror identity, and committed host autosave block. It records dependency hashes in [verification.json](verification.json). The physics CI workflow includes the new browser suite.

## Screenshots

| Theme | Desktop | 375 px | 320 px |
| --- | --- | --- | --- |
| Light | [Open](recordings-default-1100.png) | [Open](recordings-default-375.png) | [Open](recordings-default-320.png) |
| Dark | [Open](recordings-dark-1100.png) | [Open](recordings-dark-375.png) | [Open](recordings-dark-320.png) |
| High contrast | [Open](recordings-contrast-1100.png) | [Open](recordings-contrast-375.png) | [Open](recordings-contrast-320.png) |
