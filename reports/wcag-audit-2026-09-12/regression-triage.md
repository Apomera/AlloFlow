# Regression triage — September 12, 2026

The complete run covered **808 files / 6,926 tests: 6,826 passed, 97 failed, 3 skipped (reported as pending by JSON)**. Nineteen files contain failed assertions. This is a test result, not a compliance percentage or a count of 97 product defects.

| Initial diagnostic group | Failed assertions | Interpretation |
|---|---:|---|
| Opaque runner errors (STACK_TRACE_ERROR) | 34 | JSON does not retain the underlying cause. Many durations coincide with test limits; do not label every one a timeout or a WCAG defect without a rerun. |
| Cascading axe-busy errors | 24 | Nuclear Lab had an earlier unfinished run, then later cases failed with axe already running. These cases did not provide independent accessibility measurements. |
| Rendered fixture diagnostics | 23 | 16 contain contrast/mixed axe findings, 3 keyboard-scroll findings, and 4 focus/baseline warnings. Theme/host fidelity and actual tool readiness must be checked before assigning a release-level defect. |
| Source or DOM contract assertions | 16 | Includes expected source strings, generated URL hashes, formatting structure, and live-quiz focus expectations. Stale assertions and real regressions both remain possible. |

Categories are mutually exclusive initial triage, not a final defect adjudication. Full entries are in [regression-triage.json](regression-triage.json); complete messages remain in [failed-regressions.json](failed-regressions.json).

## Isolated retest

Four selected cases were rerun with one worker. **1 passed and 3 failed**; the other 224 cases in those files were filtered out, not additional failures. See [targeted results](targeted-retest.json) and [readable log](targeted-retest.log).

- Geometry World ready workspace **passed** in isolation. Its original opaque failure should not be treated as a confirmed WCAG issue; other opaque failures remain unresolved.
- Number Line contrast **failed again**. The fixture measures white text on #f8fafc at 1.04:1 and yellow at 1.02:1. Verify the actual high-contrast host background before billing this to the released tool.
- Titration lab titrate **failed again** with a contrast diagnostic. Verify current source/compiled stylesheet parity and inspect the measured controls in the real tool.
- Live-quiz initial focus **failed again** because the test expects Alpha while focus is on Minimize. Focusing a useful dialog action can be valid; this assertion difference alone does not prove a WCAG 2.4.3 failure. Review the complete focus lifecycle.

## Additional fixture follow-up

Prioritize measured contrast in Chemistry/Titration/Molecule, Number Line/Multiplication/Unit Converter, Cell Explorer and Anatomy; keyboard access to scrollable regions in Architecture Studio, Circuit Builder and Fire Ecology; Raptor Hunt input ARIA diagnostics; the Geometry Sandbox short-landscape focus/overlay warning; and SEL practiceJourneys baselines with zero measured controls. Empty or incompletely mounted fixtures are not accessibility passes. Three Coaster Lab focus cases were explicitly skipped across standard, forced-color and short-landscape profiles.

| Failed file | Assertions | Initial classification |
|---|---:|---|
| allobot_targets_smil_a11y.test.js | 2 | Source or DOM contract assertion |
| analysis_formatting_toolbar_a11y.test.js | 2 | Source or DOM contract assertion |
| chemistry_particle_wcag_browser.test.js | 8 | Contrast/mixed rendered diagnostics |
| export_preview_dialogs_a11y.test.js | 2 | Source or DOM contract assertion |
| foundational_math_wcag_browser.test.js | 3 | Contrast/mixed rendered diagnostics |
| funcgrapher_a11y.test.js | 1 | Source or DOM contract assertion |
| geometry_data_wcag_browser.test.js | 3 | Opaque runner error |
| life_science_wcag_browser.test.js | 13 | Opaque runner error; Contrast/mixed rendered diagnostics |
| nuclearlab_axe_a11y.test.js | 25 | Opaque runner error; Cascading axe-busy error |
| physical_science_wcag_browser.test.js | 10 | Opaque runner error |
| sel_focus_visibility_wcag_browser.test.js | 6 | Focus/baseline rendered diagnostics; Opaque runner error |
| solar_system_canvas_alternatives_a11y.test.js | 1 | Source or DOM contract assertion |
| stem_focus_visibility_wcag_browser.test.js | 13 | Contrast/mixed rendered diagnostics; Opaque runner error; Keyboard-scroll rendered diagnostics; Focus/baseline rendered diagnostics |
| stem_probability_accessibility.test.js | 1 | Source or DOM contract assertion |
| student_accessibility_contracts.test.js | 1 | Source or DOM contract assertion |
| ui_modals_runtime_a11y.test.js | 2 | Source or DOM contract assertion |
| view_renderers_wcag_a11y.test.js | 1 | Source or DOM contract assertion |
| view_sidebar_panels_wcag_a11y.test.js | 2 | Source or DOM contract assertion |
| watercycle_controls_a11y.test.js | 1 | Source or DOM contract assertion |

Reproduce the isolated run from the repository root:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/geometry_data_wcag_browser.test.js tests/foundational_math_wcag_browser.test.js tests/chemistry_particle_wcag_browser.test.js tests/ui_modals_runtime_a11y.test.js -t 'geometry world ready workspace|number line contrast|titration lab titrate|contains live-quiz focus' --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/wcag-audit-2026-09-12/targeted-retest.json
~~~
