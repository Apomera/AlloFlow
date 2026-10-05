# Moon Mission: shared ballistic surface dust

Completed locally on October 4, 2026. Changes remain unstaged and uncommitted.

## What changed

The descent now uses one bounded, deterministic surface-dust simulation for both the 2D fallback and WebGL views. Emission follows actual engine output, remaining fuel, altitude and tilt in the existing fixed flight steps. Each grain retains its launch point in world metres as the lander drifts. Grains coast after engine cutoff, trace shallow arcs, fade individually and disappear when they return to the local surface.

The WebGL view draws short motion streaks with per-grain opacity and terrain depth occlusion. The phone view keeps shallow streaks readable with exaggerated vertical clearance. Camera changes, resize and WebGL context loss preserve the shared particle state. Pause and hidden time hold it; after contact, only a bounded visual settling clock advances, with the flight and landing receipt held.

Recorded frames omit airborne dust because the recorder has no measured grain history. Older saved landings create none. The existing model notes explain this limit and the illustrative emission settings. A scoped system-color correction keeps that disclosure readable in forced colors.

## Physics and limits

After launch, each grain follows `x = launchX + vx × age`, `z = launchZ + vz × age`, and `height = 0.02 + vy × age − 1.624 × age² / 2`, in SI units. Horizontal velocity is constant and vertical acceleration is −1.624 m/s². Surface return determines its lifetime. Rendering samples these trajectories without creating births or advancing the flight.

The shallow sheet follows the qualitative Apollo observations in [NASA's Apollo Video Photogrammetry Estimation of Plume Impingement Effects](https://ntrs.nasa.gov/citations/20130012063), which reports estimated ejection angles of 1–3 degrees. [NASA's Particle Ejection and Levitation Technology](https://ntrs.nasa.gov/citations/20090022233) describes ballistic motion in the lunar vacuum and estimates substantially faster ejecta from Surveyor III damage. This educational view chooses 15–40 m/s and 1–2.5 degrees to keep local motion visible; speeds, density, onset and appearance are illustrative. It is not a calibrated plume, erosion or landing-hazard model.

Dust returns to a flat local launch surface. WebGL adds the launch terrain height to both ends of each streak and uses normal depth occlusion; decorative terrain does not add collision physics. The existing local flight integrator and vehicle model are unchanged.

## Verification

- **242 unit checks passed in 15 files**, including 26 new dust checks. [Unit results](unit-final.json)
- **12 distinct Chromium workflows passed** in fresh processes, with one worker, zero retries and the original 180-second workflow limits. Dust checks cover real native flight controls, engine response, coasting, contact, replay, 320 px/reduced motion, pause/hidden time and actual WebGL context loss. Energy and vector regressions also passed. [Machine-readable results](verification.json)
- **10 scoped axe scans had zero violations**, covering the new model notes and the energy/vector instruments. This is a local scoped accessibility check.
- **11 final native dust captures were inspected and accepted.** [Visual review](visual-review.json)
- An independent probe inspected **193,437 particle states** across four pool capacities and 1,801 fixed steps each. Maximum specific-energy error was **1.14e−13 J/kg**; a finite-difference gravity check agreed within **1.34e−7 m/s²**. A paired descent remained exactly unchanged at all 215 steps through contact. [Numerical evidence](physics-probe.json)
- The actual WebGL buffers were compared with the shared measured grains. A paused-scene pixel comparison hid only the dust, rendered the same scene, read the existing context and restored it. This proved visible dust pixels; shader and page errors were empty. [WebGL evidence](browser-dust-isolated-4/dust/webgl-evidence.json)

The combined regression runner exited with an out-of-memory error after seven completed workflows. A later vector suite stalled amid a separate shell out-of-memory failure and was stopped. An isolated cutoff test then overshot the intended flight interval between automation calls; the new fixture now operates the real Pause button from the page animation loop and asserts both lower and upper elapsed-time bounds. Final workflows were completed in fresh processes with the particle assertions and limits retained. Earlier fixture and contrast failures, their corrections, native artifacts and failure traces are retained. [Attempt notes](attempt-notes.json)

These checks serve the working-tree module, local React/Three assets and the app stylesheet. They do not claim a full host build, deployed-app acceptance, physical hardware performance benchmark or assistive-technology audit.

## Previews

[Engine burning](browser-dust-isolated-1-corrected/dust/fallback-burning-dust.png) · [Coasting after cutoff](browser-dust-isolated-1-corrected/dust/fallback-after-engine-cutoff.png) · [WebGL landing view](browser-dust-isolated-4/dust/webgl-landing-view-dust.png) · [Phone](browser-dust-isolated-3/dust/phone-ballistic-dust.png) · [High-contrast notes](browser-dust-isolated-3/dust/phone-model-notes-forced.png) · [Context recovery](browser-dust-isolated-4/dust/context-loss-keeps-ballistic-dust.png)

## Preservation and repetition

The canonical module and public mirror are byte-identical: `2ada5eb685576b2573a29a99e03c7038dd7cdff7b7fa45dd95c23a8458d6e9bd` (1,389,480 bytes). Fifteen guarded integrations reverse exactly to accepted pass 22 source `711738efbb3fca5af72d26a4ae87862985ad5aa4b20690f58761eaf5fb3e393e`. Twenty-one earlier test files and the scoped Git index are unchanged. New test files remain unstaged. [Preservation evidence](preservation.json) · [This pass's source diff](pass23.diff) · [Integration map](integration-map.json)

New tests: `tests/moonmission_descent_dust.test.js` and `tests/e2e/moon-mission-descent-dust.spec.ts`. The scoped [Playwright config](playwright.config.ts) keeps video off and uses 100 ms protocol pacing. All browser runs use the existing installed Chromium. Final raw JSON reports and logs are listed in [verification.json](verification.json).

Repeat the independent numerical probe from the repository with `node reports/moon-mission-enhancement-pass23-2026-10-04/physics-probe.cjs`. Repeat the browser checks with the scoped config and `--project=chromium --workers=1 --retries=0`; use the dust, energy and vector spec files, each in a fresh process. On this Windows host, `PLAYWRIGHT_BROWSERS_PATH` points to the existing `C:\Users\cabba\AppData\Local\ms-playwright` installation. For small isolated runs, add `--grep` with the workflow name.

No staging, commit, push, deployment or full application build was performed.
