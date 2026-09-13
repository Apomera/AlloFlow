# AlloFlow WCAG 2.2 A/AA Current Audit

**Audit date:** September 12, 2026 (America/New_York)
**Product:** AlloFlow v1.5 web release metadata; current local working tree
**Status:** Five confirmed findings remediated and verified locally; incomplete product-wide verification.

See the [regression triage and isolated retest](../reports/wcag-audit-2026-09-12/regression-triage.md) for the distinction between runner errors, fixture diagnostics, and potential product defects.

## Current results

- **6926 tests: 6826 passed, 97 failed, 3 pending** in the accessibility regression run (808 selected test files).
- **616 source files** scanned; **49 non-exempt heuristic candidates**, not confirmed WCAG failures.
- **All five confirmed findings corrected locally:** Video Studio contrast and preflight semantics; catalog navigation target size; Quick Start hover contrast; loaded-workspace button names. The [remediation report](../reports/wcag-audit-2026-09-12/remediation/README.md) records 38/38 targeted tests passing, nine initial-page states passing axe/reflow, and the explicit workspace checks. The broad regression totals above remain the original baseline.
- A Create-tab ARIA reference was missing while its panel loaded, then resolved in a follow-up with the source panel ready; that loaded desktop probe had zero axe A/AA violations and retained incomplete checks.
- AI Backend Settings passed the sampled Enter/Tab/Escape/focus-return check.
- Initial chooser passed axe and document reflow at 1280/320px; narrow text-spacing probes also retained document width. These findings cover sampled states only.

See the [full dated audit and reproducible evidence](../reports/wcag-audit-2026-09-12/README.md), [current VPAT](../VPAT-2.5-WCAG-AlloFlow.md), and [manual accessibility test plan](../docs/accessibility-manual-test-plan.md). The [July 11 audit](../docs/accessibility/archive/AlloFlow-WCAG-2026-07-11.md) is archived as historical engineering evidence; its remediation statements are not fresh September results.

The current run does not establish complete WCAG 2.2 AA conformance. Screen-reader, browser-native zoom, authenticated and live processes, third-party integrations, generated exports and every tool/state still require verification. Viewport reflow is not a browser zoom test, and keyboard alternatives alone do not establish a single-pointer alternative for dragging.
