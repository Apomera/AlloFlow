from pathlib import Path
import json
out=Path('reports/graphcalc-evidence-2026-09-19')
unit=json.loads((out/'unit-results.json').read_text(encoding='utf-8-sig'))
browser=json.loads((out/'browser-results.json').read_text(encoding='utf-8-sig'))
assert unit['success'] and unit['numPassedTests']==32
assert len(browser)==3 and all(row['ok'] and not row['a11y'] and not row['errors'] and all(size['scroll']<=size['width'] for size in row['sizes']) for row in browser)
assert Path('stem_lab/stem_tool_graphcalc.js').read_bytes()==Path('desktop/web-app/public/stem_lab/stem_tool_graphcalc.js').read_bytes()
summary={'testsPassed':32,'browserThemesPassed':3,'browserScenarios':['touching root and intersection','keyboard trace','parameter change and stale results','real-domain gaps','sampled overlap','Markdown exports'],'checkedAnalysisAccessibilityViolations':0,'mobileWidths':[375,320],'sourceMirrorParity':True}
(out/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
(out/'README.md').write_text('''# Graphing Calculator evidence inspection — 19 September 2026

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
''',encoding='utf-8')
print(json.dumps(summary,indent=2))
