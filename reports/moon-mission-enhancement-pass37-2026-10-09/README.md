# Moon Mission pass 37 — October 9, 2026

## Departure spacecraft and exhaust

The trans-lunar injection scene now uses the launch renderer's retained stage proportions: command module, service module, closed lunar module adapter, instrument unit and S-IVB with its single J-2 bell. The visible assembly is centered on the computed position, points along measured velocity and carries a separate velocity arrow ahead of its nose.

The fading, expanding exhaust starts at the renderer's actual nozzle exit. It follows finite positive thrust and switches off at every plan's cutoff. Constant thrust keeps the exhaust steady while falling mass increases acceleration. Plume dimensions and brightness are illustrative, as the model note explains.

Departure framing reserves horizontal room for the enlarged hardware, plume and arrow across the sampled path while retaining equal physical axes. The orbit view keeps its existing projection. Mobile orbit labels were simplified after visual inspection to avoid overlapping the lunar-distance ring. No flight integrator, burn plan, receipt or reward logic changed.

The retained configuration is supported by [NASA's Apollo 11 mission overview](https://www.nasa.gov/missions/apollo/apollo-11/apollo-11-mission-overview/) and [mission operations report](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/A11_MissionOpReport.pdf). The simulation's existing educational burn presets remain in place.

## Verification

- 33 focused unit cases in five files passed on the final source (unit-6). New coverage checks retained proportions, centering, rotations, invalid drawing inputs, thrust gates, constant-thrust appearance, cutoff, deterministic canvas calls and full glyph/plume/arrow bounds for all three plans at 204, 288, 500 and 984 px canvas widths.
- Three final Chromium workflows passed through the real Playwright API and GlHarness: stack rendering, historical cutoff/rewind/reload/plan/reward behavior, and hidden-tab playback. These are direct API runs, not Playwright CLI reporter results.
- Pixel comparisons verify that added exhaust is aft of the nozzle at four headings and disappears at cutoff. Phone/desktop captures cover both cameras at ignition, midburn and cutoff. One scoped WCAG axe scan reported zero violations.
- 16 accepted PNGs are retained. `results.json` lists them and the accepted attempts.
- Canonical/public runtime copies match: SHA-256 `cc5649b2caec2ecbec8c9bb18efa2a623a74b4ec4751ca199c07ac48f1024dea`, 1,449,675 bytes. Syntax and scoped diff checks pass. All 132 prior test files and the scoped index are preserved. Eleven guarded changes reverse to the exact pass36 baseline.

## Attempt history and limits

Unit-1 rejected an unsupported `--minWorkers` option before running tests. Unit-2 passed the initial 33 cases. Unit-3 and unit-4 were interrupted by tool-session resets; their recorded PIDs were confirmed inactive and evidence retained. Unit-5 caught a plume edge entering the lower scale area on the narrowest framing case. The close view was raised by 4% of canvas height; Unit-6 is the accepted final run with the strengthened framing cases. Browser stack-1 was similarly interrupted after pixel checks; stack-2 passed before the final label-spacing and narrow-canvas framing edits; stack-3 is the accepted final rendering run. No interrupted attempt is counted as passing.

This pass verifies the departure scene and focused regressions, not a full mission flight or a full application build. Everything remains uncommitted; no staging, push or deployment was performed.

## Reproduce

From the repository root, run `node --max-old-space-size=768 node_modules/vitest/vitest.mjs run tests/moonmission_tli_stack.test.js tests/moonmission_tli_visuals.test.js tests/moonmission_tli_physics.test.js tests/moonmission_tli_saved_state.test.js tests/moonmission_tli_window.test.js --pool=threads --maxWorkers=1 --testTimeout=30000`.

For each browser mode (`stack`, `lifecycle`, `visibility`), set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser cache and `MM_DESCENT_HUD_REPORT_DIR` to a fresh output directory, then run `node --max-old-space-size=512 reports/moon-mission-enhancement-pass37-2026-10-09/run-workflow.cjs MODE`. The retained runner redirects only historical screenshot output in memory and hashes its source/spec/helper inputs before and after execution.
