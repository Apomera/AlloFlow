# Recovery fingerprint performance — September 19, 2026

The main app evaluated `_alloCanvasSelAuthoringFingerprint()` as a `useRef` argument on every render. That function serializes all SEL stations, tool data, and snapshots. React only uses the initial ref value, so later renders discarded the serialized result. This also happened outside Canvas and before a recovery decision.

The ref now starts with an empty string. The existing recovery observer already computes its baseline when enabled, before installing change listeners and its polling fallback. That baseline, all six change/restore events, the two-second poll, and workspace save contents remain unchanged. All three shell copies have the same fix.

## Browser evidence

The probe uses the actual capture, fingerprint, ref, and observer code in a minimal production React component. It compares the old initializer with the current one using **508,955 bytes** of synthetic SEL data in isolated Chromium at 4× CPU throttling. Poll callbacks are invoked explicitly for deterministic behavior checks.

| Scenario | Fingerprints during 100 unrelated renders, before → after | Median time for 100 updates, before → after |
| --- | ---: | ---: |
| Recovery inactive | 100 → 0 | 66.7 → 3.2 ms |
| Recovery active | 100 → 0 | 283.1 → 0.9 ms |

Each version has one warmup and three paired measured samples. The large difference between the two baseline timings reflects host/JIT variability; these are focused hook measurements, not app-wide latency or startup guarantees. The deterministic result is that unrelated renders no longer serialize this state.

An authoring change event still advances the revision once, and a later change detected only by polling advances it again. Inactive recovery remains inactive. Unmount removes the polling callback. Active mount initializes the fingerprint once rather than twice. Full evidence: [browser.json](browser.json).

## Validation

**41 distinct tests passed across two files; one existing test is skipped.** The corrected recovery suite passed all 34 enabled tests, and all seven new hook tests passed. Scoped whitespace checks passed.

New real-React hook tests cover inactive recovery, activation, 100 unrelated renders, all six change/restore events, duplicate-event suppression, polling, disable/re-enable, unmount cleanup, unserializable data, and three-shell parity.

The initial existing recovery suite found a stale source-inspection assertion: its reset lookup selected a multiline host forwarding wrapper rather than the reset implementation. Restoring the old fingerprint initializer in memory reproduced the same failure ([baseline-test.json](baseline-test.json)). The test now directly inspects the already-normalized handler implementation, retaining all its original assertions. Production reset behavior was not changed.

Initial results and the repaired-suite results are retained separately. No deployment, push, or installer was produced.

## Reproduce

```powershell
node dev-tools/recovery_fingerprint_performance.cjs
node node_modules/vitest/vitest.mjs run tests/recovery_fingerprint_performance.test.js tests/canvas_workspace_recovery.test.js --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
```

The fixture uses only synthetic data and makes no grading or recovery-storage requests.
