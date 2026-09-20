# Graphing Calculator evidence inspection — 19 September 2026

The calculator now lets learners inspect the numerical evidence behind a zero or intersection candidate.

## What changed

- Choose a candidate and inspect values at its location and on both sides, using the scan step and one tenth of that step.
- For intersections, see both function values and their signed difference.
- Probe points stay within the search interval. Coincident points at boundaries or machine precision are disclosed. Non-finite values, complex values, exceptions, and overflowing differences are shown as unavailable rather than zero.
- Move the graph trace to the selected candidate using a keyboard-accessible action.
- Export a Markdown report with expressions, slider parameters, search interval, creation time, scan method, residuals, sampled overlap warnings, and the selected nearby-value inspection.
- Show the first function's invalid-evaluation count so real-domain gaps are visible.
- Hide the inspector and export after expressions, x bounds, or slider values change, until Analyze refreshes the evidence. Older stored analyses without input provenance prompt a fresh analysis.

The inspector describes numerical evidence. It does not claim that a sign pattern proves a root, continuity, or a complete set of solutions. Existing root-search logic and the earlier support-panel accessibility edits are preserved.

## Validation

32 tests passed across the new candidate-evidence suite and the existing graph engine and contrast suites. Coverage includes touching roots, crossing roots, intersections, boundary probes, exceptions, complex/non-finite values, difference overflow, machine precision, provenance, tracing, and stale results.

Real-browser workflows passed in light, dark, and high-contrast themes with the local math engine. These exercised touching-root analysis, parameter changes, domain gaps, sampled overlaps, keyboard tracing, and downloaded reports. The checked analysis panel had no automated accessibility violations or horizontal overflow at 375 and 320 pixels. Mobile screenshots were visually reviewed. Source/mirror parity, JavaScript syntax, and scoped diff checks passed.

Artifacts: `unit-results.json`, `browser-results.json`, `validation-summary.json`, the browser runner, screenshots, and exported example reports in this directory.

No deployment was performed. The sim, circuit, and molecule shelves remain outside this work.
