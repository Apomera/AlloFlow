# Perception Lab: responsive comparison details

A/B comparison results and changed settings now adapt to the available width. Wide workspaces retain an aligned table, while narrow workspaces group each measure into a card with explicit Study A and Study B labels above the values. Result metrics, condition names, units, and directional differences remain readable with enlarged text and long labels.

The tables preserve their header relationships and reading order for assistive technology. Numerical results retain left-to-right isolation in right-to-left interfaces. This change does not alter measurements, stored studies, recording, or exported reports.

## Verification

- **18 focused native Chromium groups passed**, covering A/B result values and changed settings, semantic table headers, narrow and wide layouts, enlarged text, long labels, themes, forced colors, right-to-left text, and accessibility.
- **3 existing study-plot smoke workflows passed**, one for each matching experiment. This pass totals **21 browser groups**. The full study-plot suite was not rerun.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **577 English catalog entries** agree; no catalog entries changed in this pass.
- **10 screenshots and 10 accessibility audits** document responsive layouts, enlarged text, long labels, themes, forced colors, and right-to-left text. Every audit reported no violations.
- The existing comparison DOM test now reads the dedicated value element so visible compact-layout labels do not affect its numerical expectations. Its syntax check passed. The Vitest/jsdom DOM suite remains unexecuted because its worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `9f074c7fff26b8ec9ac78732af7ae762dffa90a3b3e00e1d191ca50413402b2e`.

## Evidence

- [Desktop comparison details](browser/pair-details-1600-16.png)
- [Phone comparison details](browser/pair-details-390-16.png)
- [Phone at 200% text](browser/pair-details-320-32.png)
- [Long labels at 200% text](browser/pair-details-long-320-200.png)
- [Dark comparison details](browser/pair-details-dark.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](pair-details-evidence-manifest.json)
- [Focused native results](browser/pair-details-browser-results.json)
- [Three matching-experiment study-plot smoke regressions](study-plot-smoke-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_pair_details_qa.cjs)
- [Pure validator](validate-perception-pair-details.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-pair-details/validate-perception-pair-details.cjs`. The included baseline is the preceding active-study progress version.

No staging or commit was performed. All changes remain uncommitted.
