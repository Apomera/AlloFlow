# Power-budget planning browser verification

The native Chromium run completed with exit code 0: **956 checks, 10 scenarios, five screenshots, and no errors**. The canonical source, public mirror, and exact source embedded in the native React/THREE page all matched SHA-256 `19b5d0f85931b68081c2e64cee39d26cbfc63d0b721704cecb2f747f18c7131c` before and after the run. The primary agent and browser author visually inspected all five screenshots.

`final.json` binds the successful `run-01/process.json` receipt by hash. That receipt includes the observed child exit, source hashes, harness snapshot, native results, screenshot dimensions and hashes, and both actual native text downloads. The generated native HTML embeds the full application and is omitted from the scoped commit; the reproduction command recreates it in a fresh directory.

Coverage includes all six stations; independent energy, load, movement, and efficiency calculations; all four new skills and units; append-only skill ordering; original version-1 and new version-2 record preservation; hints, reveal, keyboard checking, next-skill navigation, invalid drafts, fixed work-record exports, and minute conversion. It also checks unchanged capacity when mechanical advantage alone changes, unclamped 1000% efficiency requirements, and a barely-above-100% result in the metric, worked solution, fixed record, and native export.

Visual checks cover common energy scales, equal track widths, true zero origins, proportional subpixel bars, readable full questions, every selected skill and unit at 320 CSS pixels, keyboard focus, accessible names, dark mode, and forced colors. Screenshots show desktop planning, dark phone planning and practice, and forced-colors planning and practice. Forced colors is browser emulation, not a physical assistive technology session. This run exercises a local React/THREE host with software WebGL, not a deployed application build.

Reproduce with a new output directory:

```powershell
node reports/machinelab-power-planning-2026-10-12/browser/run-native.cjs reports/machinelab-power-planning-2026-10-12/browser/run-02
```

The wrapper refuses to overwrite an existing directory and snapshots the harness before launching the native child.
