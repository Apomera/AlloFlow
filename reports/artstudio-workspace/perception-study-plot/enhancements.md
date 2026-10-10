# Perception Lab: responsive study comparison plot

Saved A/B study comparisons now use a responsive HTML/CSS plot. Text and trial dots stay readable on narrow screens and at larger text sizes. Both studies share one linear scale, with visible range, median, and reference markers.

The plot describes all six recorded values for assistive technology and uses a clear legend to explain its marks. Saved records, the experiment engine, measurements, and complete report exports are unchanged.

## Verification

- **28 focused native Chromium groups passed**, covering the shared scale and recorded values, label and marker geometry, narrow layouts, 200% text, longer translations, themes, accessibility, and complete report export.
- **30 existing native groups passed**: the saved-drawing frame checks (27) and the three matching-experiment comparison workflows (3). This pass totals **58 browser groups**. Only those three comparison workflows were replayed; this is not a claim that the full existing comparison suite passed.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, and measurements are unchanged. Source and desktop copies match, and all **568 English catalog entries** agree.
- **16 screenshots and 16 accessibility audits** cover phone, tablet, and desktop layouts, 200% text, longer translated labels, dark and contrast modes, forced colors, and RTL. Every audit reported no violations.
- The existing comparison runner and DOM assertions were updated for the responsive plot. The Vitest/jsdom DOM suite remains unexecuted because its worker stalls before collection; the native browser and pure-engine checks provide separate evidence.

Source SHA256: `d1bb7ea05c30ee1b68c35556ac5e55dd4ed0194a7b4a9c647d0b575cc9f6b873`.

## Evidence

- [Desktop comparison](browser/study-plot-1600-16.png)
- [Phone comparison](browser/study-plot-390-16.png)
- [Phone at 200% text](browser/study-plot-390-32.png)
- [Long translated labels](browser/study-plot-long-390.png)
- [Dark comparison](browser/study-plot-dark.png)
- [Complete exported report](browser/study-plot-complete-comparison-report.html)
- [Verification summary](verification.json)
- [Browser evidence manifest](study-plot-evidence-manifest.json)
- [Focused native results](browser/study-plot-browser-results.json)
- [Saved-drawing frame regression](recorded-frame-browser-results.json)
- [Three matching-experiment comparison regressions](comparison-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_study_plot_qa.cjs)
- [Updated existing comparison runner](../../../dev-tools/perception_lab_study_compare_qa.cjs)
- [Updated DOM assertions](../../../tests/perception_lab_study_comparison.test.js)
- [Pure validator](validate-perception-study-plot.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-study-plot/validate-perception-study-plot.cjs`. The included baseline is the preceding saved-drawing frame version.

No staging or commit was performed. All changes remain uncommitted.
