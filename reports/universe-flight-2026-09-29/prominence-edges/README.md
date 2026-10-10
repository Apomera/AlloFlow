# Stellar limb portrait and prominence edges

Enhancement 56 adds **Amber stellar limb** to the neighborhood's paused scenic viewpoints, in the main explorer and fullscreen Explore. The portrait keeps the existing 0.6 light-year viewing range and uses an 18° lens. Its line of sight is perpendicular to the first arch's source plane, so the curve is visible against space rather than nearly end-on. The target stays selected for inspection and camera orbit.

The existing static arches now use sixteen curve segments. Their endpoints, source frame, widths, heights, glow profile and brightness remain in use. At the largest supported projected star, the geometric chord approximation stays below 0.4 physical pixels. This bound excludes GPU mediump rounding; native reference images test the actual rendered result separately. Segment joints use the existing maximum-emission rule, which avoids stacking light from adjacent pieces.

The star and its arches now share the photosphere's antialiased coverage. An arch in front remains visible. A rear arch can shine through only the uncovered fraction of a pixel at the rim; fully covered pixels retain the original depth-based hiding rule. This replaces the previous abrupt switch at the mathematical circle boundary.

The portrait is a generated teaching view. Star surfaces and arches are fixed appearance models; the tool does not simulate plasma or magnetic fields. The pass retains source positions, sizes, colors, atlases, camera routes and relativistic calculations. Extra curve arithmetic runs only where enlarged stars already show arches. No uniforms, textures, buffers or programs are added.

## Evidence

The preserved `baseline-renderer.js`, `baseline-ui.js`, `baseline-manifest.json` and `patch.json` make the change reviewable. `projection-audit.json` checks the curve approximation, coverage rule and portrait geometry independently. Native comparisons include a zero-arch diagnostic and a denser curve reference. Browser workflows check the new portrait in both layouts. Final source, report and preview hashes are pinned in `verification.json`.

- The independent geometric audit covers 72 projected cases. The largest sixteen-segment chord bound is 0.3754 physical pixels, compared with 1.4979 for eight segments.
- Native verification passes five groups across 116 observations, 92 saved PNGs, 25 matched comparisons and six finer-curve references. Error against the 32-segment reference falls to 24.61–25.62% of the previous renderer's RMS error. Inner photospheres and zero-arch controls remain exact. All three point populations, two atlases and twelve authored camera snapshots retain their values.
- Seven full graphics lifecycles and one additional geometry-only lifecycle release their resources. Both orbital sweeps retain 21 samples; clipping stays below 0.00245% with no candidate increase. Native page and graphics errors remain zero.

### Capture recovery

The original capture worker was interrupted after 85 observations. The guarded resume verified and reused their saved hashes, captured the remaining 31 observations, and analyzed all saved pairs. `native-artifacts.json` records the original and current harness hashes and all 92 encoded PNG hashes. The resume record explicitly leaves the interrupted worker's disposal unrecorded; a fresh context verifies its geometry and resource lifecycle separately.

## Interface and regression verification

The 8 browser groups cover the normal and fullscreen vista, paused orbit controls, field-note restoration, Back, and the Detail lens on phone and short landscape layouts. 22 scoped audits report zero violations. Reduced motion, system colors and increased text spacing are included. The regression run reports 61 passing assertions in 6 files and zero failed assertions. The remaining 25 files encountered worker startup timeouts, and the run ended naturally with exit code 1. One worker shutdown timeout was also observed. The full regression suite remains unverified. No test expectations or project dependencies were changed. A separate diagnostic Node environment passes all 22 original physics assertions; it does not cover DOM behavior. The installed Vitest runner flags and failed attempts are recorded in `unit-suite-run.json`, `unit-validation.json`, `unit-suite-closeout.json` and the diagnostic reports. The raw unit report marks its reported assertions successful; the process exit, missing files and sealed closeout establish that the full suite is incomplete.

The focused palette comparison loads the saved 609 UI baseline and the actual installed 166 UI source. It verifies matching normal-theme pixels and all seven style/layout records. Explicit Canvas/CanvasText and ButtonFace/ButtonText colors produce zero scoped WCAG violations in system-color mode. The original contrast failure is retained with its measured paint diagnostics; contrast rules were kept enabled. Removing the exact 670-byte CSS insertion restores the independently audited pre-palette UI.

The twelve preview cards were rebuilt and checked. Their image hashes and authored poses remain identical to the preserved baseline; the manifest records the current renderer. Source and desktop mirrors match. The final verifier parses the seven relevant JavaScript files with V8, checks the scoped Git diff and empty scoped index, verifies served source hashes, and pins the reports and assets.

The native capture recovery preserves all 85 original observation keys and pixel hashes, matching each against both the original and resumed reports. The earlier capture harness has recorded hash continuity but no retained source snapshot. The current reproduction harness is retained and pinned. The interrupted original phase did not record resource disposal; cleanup claims apply to the seven completed lifecycles and one additional fresh geometry lifecycle.

## Reproduce

Run from the repository with Playwright and the installed Node dependencies available. Use a fresh output folder for the native proof to preserve these captures. `candidate-renderer.js` retains the exact checked source for later reproduction.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "C:/Users/cabba/AppData/Local/ms-playwright"
$env:UNIVERSE_PROMINENCE_BASELINE = "$PWD/reports/universe-flight-2026-09-29/prominence-edges/baseline-renderer.js"
$env:UNIVERSE_PROMINENCE_SOURCE = "$PWD/reports/universe-flight-2026-09-29/prominence-edges/candidate-renderer.js"
$env:UNIVERSE_PROMINENCE_REPORT = "$PWD/reports/universe-flight-recheck-56"
node dev-tools/universe_flight_prominence_edge_check.cjs
```

The browser workflow command is `node dev-tools/universe_flight_prominence_vista_check.cjs` with the local preview server running on port 3187. The regression command is `node reports/universe-flight-2026-09-29/prominence-edges/run-unit-suite.cjs --run`. Browser reruns write their configured report; preserve this evidence first.

Changes remain uncommitted.
