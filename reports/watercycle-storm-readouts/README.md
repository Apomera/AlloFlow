# Storm Lab result and readouts

The result panel now has a larger phase label, a readable formation badge and clearer description and cause. Six metric cards use larger labels and values, including whole-word terrain descriptions. The grid follows its available visual-panel width: one column below 400 CSS pixels, two from 400 pixels, and three from 680 pixels. The readout theme follows the renderer's light, dark and contrast settings. High contrast uses yellow text on black cards; forced colors use system colors.

## Scope and checks

Source SHA256: e4fc1f8963506efd5d03dbab7cf4ce6204403f513899ff5fbedd225bbf57720c

A local theme attribute and one CSS append reconstruct the candidate from the existing Hydro Quest runtime at reports/watercycle-hydro-readability/candidate-runtime.js (6252fd6fd2ccfc1159a9df831ff6857dd1d09ca36e3179e279a8726a44974a4f). The two guarded presentation slices reverse exactly to that baseline, which is referenced in place. This report contains no runtime or UI-string copies. Model formulas, result text, input handlers, preset behavior and saved learner data are unchanged.

- 33 existing native tests passed: 24 precipitation regressions and nine controlled-experiment regressions. No failures or skips; native exit code 0. Tests, SSR helper, runner, minimal Node configuration and SSR setup are frozen. Shared translation-file hashes were inventoried in the receipt. These suites and the browser fixture use fallback labels and do not load those files, so later translation edits do not invalidate this focused evidence.
- 762 browser checks passed, with 16 recorded native preset and keyboard-range actions and nine scoped accessibility audits with zero violations.
- Nine final PNG captures and two matched baseline captures cover desktop themes, 320px and 390px phones, high contrast, forced colors, 150% CSS zoom, a narrow desktop host and a 660px tablet.
- All six presets and the two keyboard-range changes preserve the baseline model text and metric semantics. The retained-state checks compare learner work, experiment metadata, routes and awards across those controls.

Every captured view uses the native Mountain snow scenario. Preset and keyboard-control semantic parity is checked separately from those visual crops.

The QA serves the actual React module and uses its native controls. Screenshots crop the mounted result and metric DOM directly. The actual THREE constructor is retained while raster drawing is omitted; model and input handlers remain active. Crops contain no GPU canvas. Browser and local server both closed successfully. Text metrics check minimum fonts, whole words, label/card/panel containment and at least 4.5:1 contrast, with at least 7:1 in high contrast. Theme checks require black cards and yellow text in contrast mode and resolved dark card colors in dark mode. Earlier diagnostic runs remain in scratch and are excluded from these counts.

## Verify

Run node reports/watercycle-storm-readouts/verify.cjs. Add --snapshot-only after future source changes to verify archived evidence against the referenced frozen baseline. The verifier checks reconstruction, artifact hashes, 33 actual assertions, pinned inputs, native control semantics, the full visual matrix, clean scoped audits and all 11 PNG receipts.

All changes remain uncommitted.
