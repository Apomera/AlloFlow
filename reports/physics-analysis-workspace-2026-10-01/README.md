# Physics analysis workspace

October 1, 2026

## What changed

Recorded flight analysis now uses one workspace with a shared flight chooser, captured launch settings, phase, timeline, and Motion, Forces, Energy, and Data views. This brings the graphs and measurements together and removes duplicate time controls.

- Motion combines position, velocity, phase explanations, and recorded velocity graphs.
- Forces shows gravity, air drag, net force, and acceleration for the same moment.
- Energy combines the recorded budget and energy timeline.
- Data keeps the recorded table and full-resolution CSV export together.
- One sample-index slider and Launch, Apex, and Impact shortcuts use the original timestamps, including the exact recorded apex. Previous and Next move one original observation at a time.
- Tabs support arrow keys, Home, End, automatic activation, and visible focus. Inactive panels remain mounted and are hidden from keyboard navigation.
- The phase stays visible in the shared header. Live playback leaves the polite status empty; an explicit selection announces the selected run, sample, time, and phase.
- The flight chooser keeps its identity and focus when inspection opens. Table selections focus the shared timeline, and opening Data activates it before scrolling to the table.
- A one-pixel endpoint target accounts for native click rounding on scaled motion and energy graphs. Tapping Launch or Impact selects the exact endpoint even when the final interval is shorter than a normal tick; interior taps retain nearest-observation selection.
- Current-settings range predictions remain below the recorded workspace. Canvas energy display remains a separate display control.

The root physics source and desktop mirror are identical. The physics engine, captured observations, and CSV precision are preserved.

## Verification

- Units: **321 tests passed** in 18 files. Command: `npx vitest run tests/physics_ --maxWorkers=1 --pool=threads`.
- Local browsers: **120 tests passed** across the 19-file physics workflow, using one worker and no retries. The final full run passed 119 cases; one worker exited before the historical-flight workspace case began (0 ms). That case passed in an isolated rerun on the unchanged final source. All 120 unique cases are verified, including the four new workspace cases and migrated controls, sample, history, apex, force, energy, graph, clarity, and CSV checks.
- Visual and evidence audit: **11 configurations**, 22 actual flights, 99 recorded-point selections, 121 complete CSV comparisons, and 40 PNGs. Two baseline configurations and nine final configurations cover default, dark, and contrast at 1100, 375, and 320 pixels.

The audit compares both real vacuum and drag flights against commit `76c5b3d4390956df10fd2e05f29acea45da2a808`. It checks the complete body, trail points, trail metadata, apex, run log, and last-flight record. Each CSV comparison checks every original number and captured launch setting. Force components are independently recomputed from the original observations.

Every final view passed these checks:

- One timeline, one active tab and panel, correct tab relationships, and one tab stop.
- Stable canvas, launch controller, selected trail, slider, and all four panel elements.
- Text at least 12.00 px and controls at least 52.25 × 44.00 px.
- Minimum measured text contrast: default 5.20, dark 6.37, contrast 15.30. Required thresholds: 4.5 for default/dark and 7 for contrast.
- No page, workspace, or active-panel overflow; no force-card clipping or page errors.

The final audit verifies unchanged source, mirror, auditor, disk fixture dependencies, and the full physics translation namespace. Its shared STEM host fixture is the immutable Git blob from commit `b097cca6b51a7d185daccb5e3a9b32d917e530f8`, verified by hash before and after the run. This keeps the audit reproducible while other tools are edited in the shared checkout. The browser regressions exercise the working application host.

## Evidence

- [Structured results](workspace-results.json)
- [Reproducible auditor](verify-workspace.cjs): `node reports/physics-analysis-workspace-2026-10-01/verify-workspace.cjs`
- [Desktop Motion](analysis-final-default-1100-motion.png)
- [Desktop Forces](analysis-final-default-1100-forces.png)
- [Desktop Energy](analysis-final-default-1100-energy.png)
- [Phone Data](analysis-final-default-320-data.png)

Final source SHA-256: `db7d379cb2e43ac0778b88b8d72070587a5a85d1576d6458369767520009c8ed`.
Auditor SHA-256: `b569d0aa3f3782dbd734688154c48c3a8757ba1804afe702ef888c230395bd08`.

The workflow now includes the workspace regression spec. The local commit is scoped to physics files and the physics namespace in both English catalogs.
