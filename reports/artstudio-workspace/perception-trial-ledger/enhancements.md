# Perception Lab: responsive study trial ledger

Individual three-trial study results now use a full table at wider widths and labelled trial cards when space is tight. Each trial keeps its label and recorded values together, so results remain readable on narrow screens and at larger text sizes. The semantic table remains available to assistive technology, with explicit units and trial numbering.

The change preserves the experiment engine, saved records, study calculations, reveal boundaries, and original study report export.

## Verification

- **22 focused native Chromium groups passed**, covering all three matching experiments, trial labels and recorded values, reveal boundaries, study switching, responsive and enlarged-text layouts, translations, themes, RTL, accessibility, and original report export.
- **3 existing plot smoke workflows passed**, one for each matching experiment. This pass totals **25 browser groups**. The full existing comparison suite was not rerun.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, and measurements are unchanged. Source and desktop copies match, and all **570 English catalog entries** agree.
- **11 screenshots and 11 accessibility audits** cover phone, tablet, and desktop layouts, 200% text, long labels, dark and contrast themes, forced colors, and RTL. Every audit reported no violations.
- Existing DOM assertions remain compatible with the ledger. The Vitest/jsdom DOM suite remains unexecuted because its worker stalls before collection; the native browser and pure-engine checks provide separate evidence.

Source SHA256: `76e6095a48f09671c3c9fc80dac06c0c941c99630bc1f95a2660278866e2f9cb`.

## Evidence

- [Desktop trial ledger](browser/trial-ledger-1600-16.png)
- [Phone trial ledger](browser/trial-ledger-390-16.png)
- [Phone at 200% text](browser/trial-ledger-320-32.png)
- [Long labels at 200% text](browser/trial-ledger-long-320-200.png)
- [Dark trial ledger](browser/trial-ledger-dark.png)
- [Original exported study report](browser/trial-ledger-original-study-report.html)
- [Verification summary](verification.json)
- [Browser evidence manifest](trial-ledger-evidence-manifest.json)
- [Focused native results](browser/trial-ledger-browser-results.json)
- [Three matching-experiment plot smoke regressions](study-plot-smoke-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_trial_ledger_qa.cjs)
- [Pure validator](validate-perception-trial-ledger.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-trial-ledger/validate-perception-trial-ledger.cjs`. The included baseline is the preceding responsive study comparison plot version.

No staging or commit was performed. All changes remain uncommitted.
