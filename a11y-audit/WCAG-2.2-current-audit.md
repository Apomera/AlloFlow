# AlloFlow WCAG 2.2 A/AA Current Audit

**Updated:** September 19, 2026 (America/New_York)

**Product:** AlloFlow v1.6 web metadata; local working tree

**Status:** Additional keyboard and ARIA issues repaired; product-wide verification incomplete.

See the [September 19 follow-up](../reports/wcag-audit-2026-09-19/README.md) and [current VPAT](../VPAT-2.5-WCAG-AlloFlow.md).

- The [History contrast/reflow follow-up](../reports/wcag-audit-2026-09-19/history-contrast/README.md) fixes placeholder, secondary-label and dark Save contrast, plus mobile new-unit and resource-title clipping. Six theme-state axe samples and six mobile bounds/spacing samples pass; 17 targeted regression assertions pass. This uses a live component fixture; icons and complete workflows remain outside scope.
- Closed the Create-tab loading finding INV-01 in a [fresh local sidebar preview](../reports/wcag-audit-2026-09-19/sidebar-followup/README.md): stable labelled panels, complete tab-key behavior, visible translated names, History count contrast/status semantics, and menu target/focus checks. The catalog grid now prevents inner clipping at 320px and enlarged text spacing. Eight browser interaction/layout checks and five sidebar axe/reflow states pass; 34 distinct regression assertions pass across scoped runs. Gradient contrast and screen-reader checks remain open.
- Repaired keyboard access to Architecture Studio statistics, Circuit Builder schematic and Fire Ecology wide charts. Native scrolling passes for all three regions, including sequential focus, actual arrow-key movement and Tab exit; a separate focused run passes all three search states. Full-page timeout results are retained in the report.
- Fixed the sidebar tool-count badge contrast under enlarged text spacing; the ready workspace passes desktop and mobile probes. Eighteen sidebar accessibility/catalog assertions pass.
- Repaired Raptor Hunt search ARIA in empty, matching and no-match states; improved decorative quick-start number contrast. Twelve distinct overview focus-profile cases pass across the targeted retests.
- Corrected themed math fixtures to match the production host. Nine theme cases plus one light-state control pass; Number Line required no product change. The earlier Titration titrate failure also passes on current code.
- Earlier fixes remain covered by 38 passing assertions across six files and nine current initial-page browser states with no axe A/AA violations. Incomplete rules and unloaded catalog content remain explicit limitations.
- The prior 6,926-test run (6,826 passed, 97 failed, 3 pending) and 49 source-scan candidates are **September 12 historical evidence**, not fresh v1.6 results. Broad runs interrupted this week are not counted as passes.

The [September 12 audit](../reports/wcag-audit-2026-09-12/README.md), [triage](../reports/wcag-audit-2026-09-12/regression-triage.md), and [archived v1.5 VPAT](../docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md) remain available.

Full conformance is not established. Continue the [manual test plan](../docs/accessibility-manual-test-plan.md), including screen-reader, native browser zoom, complete live/authenticated workflows, media alternatives and generated-output checks. Other unresolved fixture/product diagnostics remain open; INV-01 is repaired in the current local source and preview.
