# Perception Lab: active study progress

Active three-match studies now show a passive progress sequence beneath the results heading. Each step is labelled as recorded, current, or upcoming, helping participants see where they are and what comes next. The completed sequence distinguishes results waiting to be revealed from revealed results.

The progress display uses committed trial counts and does not show recorded measurements. It adds no controls or saved state. Experiment calculations, existing record and reveal actions, saved records, study comparisons, and exports remain unchanged.

Experiment figure captions also wrap within narrow viewports at 200% text, keeping long words inside the available width.

## Verification

- **21 focused native Chromium groups passed**, covering the three matching experiments, reveal boundaries, committed records, duplicate recording, partial-study ending, external notebook and profile changes, focused workspace transfer, saved-study review, guided repeats, responsive and enlarged-text layouts, translations, themes, RTL, and accessibility.
- **3 existing trial-ledger smoke workflows passed**, one for each matching experiment. This pass totals **24 browser groups**. The full trial-ledger suite was not rerun.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, and measurements are unchanged. Source and desktop copies match, and all **577 English catalog entries** agree.
- **10 screenshots and 10 accessibility audits** document narrow and wide layouts, 200% text, long labels, themes, forced colors, and RTL. Every audit reported no violations.
- The Vitest/jsdom DOM suite remains unexecuted because its worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `e1cd854e04d31aa3e04cc1d46631b3d9a2f48f774e8ce70e3c8605947af70c1c`.

## Evidence

- [Desktop study progress](browser/study-flow-1600-16.png)
- [Phone study progress](browser/study-flow-390-16.png)
- [Phone at 200% text](browser/study-flow-320-32.png)
- [Long labels at 200% text](browser/study-flow-long-320-200.png)
- [Dark study progress](browser/study-flow-dark.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](study-flow-evidence-manifest.json)
- [Focused native results](browser/study-flow-browser-results.json)
- [Three matching-experiment trial-ledger smoke regressions](trial-ledger-smoke-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_study_flow_qa.cjs)
- [Pure validator](validate-perception-study-flow.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-study-flow/validate-perception-study-flow.cjs`. The included baseline is the preceding responsive trial-ledger version.

No staging or commit was performed. All changes remain uncommitted.
