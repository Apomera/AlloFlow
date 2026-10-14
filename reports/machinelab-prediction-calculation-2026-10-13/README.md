# Machine Lab: calculate the predicted value

An optional **Calculate the value too** checkbox adds numerical practice to all 24 existing prediction routes across the six stations. Learners predict half/same/double, then calculate the hypothetical input power in watts or input energy in joules. The comparison stays hidden until both responses are checked correctly, or the learner explicitly requests the explanation.

The numeric field has a quantity/unit label, a stated 1% relative tolerance, positive finite decimal validation, separate live feedback and Enter-to-check with an IME composition guard. The unit stays visible alongside the entry. Rounded displays do not replace the full-precision answer target. Invalid and incorrect entries do not reveal the result.

Worked-value provenance is retained when the learner previously saw the comparison in plain prediction mode, views an explanation, disables calculation mode to see the result, or edits an answer after successful comparison. Clear prediction and a new challenge clear both responses and viewed status while retaining calculation mode. A changed physical setup clears the signature-bound numeric draft. Numeric handlers read the latest state and ignore stale station, scenario, setup, view and disabled-mode callbacks.

Only the existing prediction helper region changes. Replacing that region with its version from `3594d5c4f` reproduces the previous source exactly, and `predictionModel()` remains byte-identical. Physical calculations, ordinary skill practice, grade gates, saved records and exports are unchanged. Canonical/public SHA-256: `a870651502478d2885948b0c08f2065cbebefcf135241efb4c8da6ec0837f5ee`.

All **144 selected tests pass across five files and 14 native groups**: 117 unchanged existing cases plus 27 focused tests. Existing coverage includes prediction arithmetic/lifecycle, power calculations and saved records, accessibility and localization. Focused tests exercise independent SI arithmetic across all 24 numeric routes, exact relative tolerance boundaries, very small and large values, minutes, response order, malformed input, callback freshness and provenance. All native child and wrapper exits were observed as zero; no failed native attempts occurred.

Native browser QA passes **742 checks across all 24 numeric routes and four scenarios**, including actual checkbox/radio keyboard interaction, Enter checks, pending-result hiding, viewed-answer provenance and saved-work preservation. Root and the browser reviewer independently inspected the four final screenshots: pending desktop, checked desktop, dark phone energy and forced-colors phone load. The numeric fields stay inside the panel and viewport; labels, help, feedback, equations and patterned comparisons remain readable. Source/mirror, native receipts, harnesses, logs and screenshots are bound by SHA-256 in `verify-evidence.cjs` and summarized in `validation-summary.json`.

Run from the repository root; each native runner requires a fresh output directory:

```powershell
node reports/machinelab-prediction-calculation-2026-10-13/verify-scope.cjs
node reports/machinelab-prediction-calculation-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-prediction-calculation-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-prediction-calculation-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-prediction-calculation-2026-10-13/verify-evidence.cjs
```

This is targeted validation, not the complete repository suite. Browser runs use local React/THREE with Chromium software WebGL; forced colors is emulated. No physical assistive technology, deployed host build, push or deployment is included.
