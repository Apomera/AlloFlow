# AquacultureLab seasonal landmark enhancement

Completed locally on 2026-10-03. All changes remain unstaged and uncommitted. No push, deployment or full app/installer build.

## What changed

The seasonal explorer now has an optional native disclosure, **Find low, high and largest A/B gap**. It follows the selected monthly system or species measurement and shows the lowest B value, highest B value and largest absolute same-month B minus A difference. Each card names all tied months and inspects the earliest month with a separate native button. Keyboard focus moves to the updated month heading; **Record inspected result** keeps using the existing exact monthly capture workflow.

Lowest and highest values preserve the model's displayed precision. Gap magnitudes use signed B minus A rounded to two decimal places, matching the existing inspected difference display. Opposite-sign ties remain visible, and a zero displayed gap says A/B match at that precision without offering an arbitrary gap shortcut. Low and high describe measured values, not which design is best.

The pure helper reads the existing canonical twelve-month traces without simulating again or mutating inputs. Missing, nonnumeric, nonfinite and misaligned month values are excluded with explicit valid-month counts. No A, missing comparable data and different/missing model versions have distinct gap explanations while valid B extrema remain available. Species present on only one side are not assigned invented values. Shared water stays a system measurement while following an organism; fixed support retains reference-band stress but excludes crop biomass, survival and progress.

Navigation changes only the view. Scenario settings, writing, captured measurements, original saved investigations and parked work remain intact. The physiology, annual model and frozen measurement implementation are byte-preserved from the accepted evidence-save baseline; model version remains `2026.10-stock-feedback`.

## Validation

- **203 distinct cases in 16 files passed**: 183 existing regressions and 20 new landmark cases. Native results retained: [regressions](regression-tests.json), [new cases](new-tests.json), [unique-case accounting](resolved-tests.json). One worker, existing shorter limits unchanged, a 30-second default and no retries.
- **6 Chromium workflow groups passed**, covering desktop and phone widths, keyboard inspection, live metric/species changes, exact selected-month captures, unchanged evidence, missing/one-sided trajectories, shared water, fixed support, zero gaps, and model-version guards. [Native browser result](browser/results.json) · [Execution log](browser-execution.log).
- **13 scoped axe scans**, zero violations; 9 scans have color-contrast incomplete items that root and an independent reviewer manually accepted with source colors and normal/forced-color screenshots. These checks cover the changed disclosure and inspection, not certification of the complete application.
- Syntax, scoped whitespace, LF runtime parity, preserved model/capture code and an empty scoped Git index passed. [Verification metadata](verification.json).

The model-mismatch browser probe changes only the provenance label on an actual current-model run. It exercises the comparison guard and does not represent a historical simulation. Unit helper fixtures use synthetic traces to verify ties, invalid values and missing months; primary browser captures come from actual current-model traces.

## Preview and replay

- [edge-all-zero-gap-320-cards.png](browser/edge-all-zero-gap-320-cards.png)
- [edge-all-zero-gap-320.png](browser/edge-all-zero-gap-320.png)
- [edge-no-baseline-320-cards-forced-colors.png](browser/edge-no-baseline-320-cards-forced-colors.png)
- [edge-no-baseline-320-cards.png](browser/edge-no-baseline-320-cards.png)
- [edge-no-baseline-320-forced-colors.png](browser/edge-no-baseline-320-forced-colors.png)
- [edge-no-baseline-320.png](browser/edge-no-baseline-320.png)
- [edge-species-only-in-A-320-cards.png](browser/edge-species-only-in-A-320-cards.png)
- [edge-species-only-in-A-320.png](browser/edge-species-only-in-A-320.png)
- [edge-species-only-in-B-320-cards.png](browser/edge-species-only-in-B-320-cards.png)
- [edge-species-only-in-B-320.png](browser/edge-species-only-in-B-320.png)
- [sample-oxygen-landmarks-1280-cards.png](browser/sample-oxygen-landmarks-1280-cards.png)
- [sample-oxygen-landmarks-1280.png](browser/sample-oxygen-landmarks-1280.png)
- [sample-oxygen-landmarks-320-cards-forced-colors.png](browser/sample-oxygen-landmarks-320-cards-forced-colors.png)
- [sample-oxygen-landmarks-320-cards.png](browser/sample-oxygen-landmarks-320-cards.png)
- [sample-oxygen-landmarks-320-forced-colors.png](browser/sample-oxygen-landmarks-320-forced-colors.png)
- [sample-oxygen-landmarks-320.png](browser/sample-oxygen-landmarks-320.png)
- [sample-oxygen-landmarks-390-cards.png](browser/sample-oxygen-landmarks-390-cards.png)
- [sample-oxygen-landmarks-390.png](browser/sample-oxygen-landmarks-390.png)
- [sample-oyster-progress-320-cards-forced-colors.png](browser/sample-oyster-progress-320-cards-forced-colors.png)
- [sample-oyster-progress-320-cards.png](browser/sample-oyster-progress-320-cards.png)
- [sample-oyster-progress-320-forced-colors.png](browser/sample-oyster-progress-320-forced-colors.png)
- [sample-oyster-progress-320.png](browser/sample-oyster-progress-320.png)
- [sample-support-shared-oxygen-320-cards-forced-colors.png](browser/sample-support-shared-oxygen-320-cards-forced-colors.png)
- [sample-support-shared-oxygen-320-cards.png](browser/sample-support-shared-oxygen-320-cards.png)
- [sample-support-shared-oxygen-320-forced-colors.png](browser/sample-support-shared-oxygen-320-forced-colors.png)
- [sample-support-shared-oxygen-320.png](browser/sample-support-shared-oxygen-320.png)

Run the [portable QA harness](seasonal-landmarks-browser-qa.cjs) with the repo's installed Node/Playwright dependencies. Its default repo is this report's parent repository; optional `AQUACULTURE_REPO` and `AQUACULTURE_QA_OUT` override paths. The harness closes Chromium and its local HTTP server on completion.
