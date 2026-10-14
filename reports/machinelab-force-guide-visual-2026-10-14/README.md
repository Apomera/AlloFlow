# Machine Lab: force, speed and power guide

The guide now presents hand input and useful load output in clearly bounded sections. Larger values make each force, speed and power reading easier to scan. The power result has a stronger border and slightly larger type, while the worked force-times-speed equation occupies a prominent strip beneath its three quantities.

Solid and striped keys beside the section headings match the comparison bars. Paired tracks retain identical horizontal lengths and origins, separate scales for different units, and exact proportions without minimum-width inflation. The three metric cards stack at 600px. Text wraps and forced colors preserve patterns and boundaries.

Only `forceSpeedGuide()` presentation changed. Existing calculations, values, labels, equations, callbacks, practice, records and exports are preserved. Canonical and public copies match.

Baseline: `a94ee728a`. Reviewed source SHA-256: `30be14963a64009b84a5c4c4aff01c3ff5a73aacdd58e0b6515559fe5c85ee6c`.

## Verification

50 selected existing tests passed in four serial native processes: 14 force-guide cases, 28 accessibility checks and eight translation-hygiene checks. No new unit tests were added for this rendering pass.

1,258 native browser checks passed across 11 real React/THREE mounts and all six machine routes. Checks cover independent force, speed and power calculations at default and changed time/efficiency settings, exact proportional bars and paired track geometry, a lever below one mechanical advantage, invalid-input gating, and keyboard guide navigation that preserves the draft and saved records. The run also verifies 600px stacking, dark and forced-color 320px layouts, and doubled guide text. All 17 keyboard-focus checks passed.

The browser agent and root independently inspected all six screenshots: baseline, updated desktop, intermediate width, dark phone, forced-color phone and enlarged-text phone. No clipping or visual blockers were found. Native and observed wrapper exits were zero, and production source, mirror and harness hashes remained unchanged. No failed browser runs were produced.

Native results and both hash-bound screenshot reviews are recorded in the browser folder. The scope verifier proves the renderer is the only changed function; the evidence verifier binds test and browser receipts, dependencies, quantitative observations and reviewed screenshots to the frozen source. Run `node reports/machinelab-force-guide-visual-2026-10-14/verify-evidence.cjs` to verify the records and regenerate `validation-summary.json`.

This is a local change, without push or deployment. Chromium uses software WebGL. Forced colors are emulated; the enlarged-text case doubles computed font sizes in the guide rather than applying browser zoom. Screenshots crop the complete guide, and the tall enlarged-text image is resized by the image viewer.
