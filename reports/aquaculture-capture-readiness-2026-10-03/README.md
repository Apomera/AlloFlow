# AquacultureLab capture readiness enhancement

Completed locally on 2026-10-03. All changes remain unstaged and uncommitted. No push, deployment or full app/installer build.

## What changed

Annual and inspected-month capture previews now name the selected source, show the exact A/B reading with its existing units and three-decimal captured difference display, and explain whether a new row is ready, already captured, unavailable, or blocked by the eight-reading capacity. The canonical capture and visible previews share a pure readiness helper.

**Review matching capture** opens native notebook disclosures and focuses the exact live reading heading. Live heading IDs are separate from saved archive copies, including an archived note with the same identifier. **Review notebook space** opens the existing notebook so the learner can save/export or deliberately remove a row. Review controls sit outside status announcements and have visible focus outlines, including forced colors.

Record keeps its existing protected behavior: matched readings are reviewed without adding a duplicate; a full notebook is reviewed without overwriting a row. Both checks are visible before a click. When neither A nor B has a numeric reading, the annual and monthly Record controls are disabled. A-only readings remain valid captures, and shared-water readings remain system measurements while following a species. Removal immediately refreshes the available space.

Matching compares every canonical source, value, unit, label, state, event, original A/B setting and model-version field, ignoring only capture identifier and date. Matching takes priority even in a full notebook. Equal displayed numbers from different settings, model versions, annual/monthly scopes or a newly added A are distinct. Invalid imported rows do not consume canonical capacity. Preview-only fixed metadata stays out of visible dates and stored captures; actual recording retains its normal identifier and timestamp.

Original measurements, learner writing, saved investigations and parked drafts remain intact. The annual physiology, model version and frozen measurement construction are byte-preserved from the accepted seasonal landmark baseline. Model version remains `2026.10-stock-feedback`.

## Validation

- **223 distinct tests across 17 files passed**: 203 existing regressions and 20 new readiness checks. Native [regression result](regression-tests.json), [new result](new-tests.json) and [unique-case accounting](resolved-tests.json) are retained. One worker, existing shorter limits unchanged, 30-second default, no automatic retries or recovery runs.
- **Six Chromium workflow groups passed** at 1280, 390 and 320 pixels: exact previews, keyboard review and live/archive ID separation, applicability and A-only/shared-water capture, provenance and newly added A, full capacity, duplicate precedence, removal/refill and complete work preservation. [Browser result](browser/results.json) · [Execution log](browser-execution.log).
- **22 scoped axe scans**, zero violations. 15 scans contain incomplete items reviewed manually with source colors and normal/forced-color screenshots by root and an independent reviewer. Scope is the changed capture controls and matching live heading, not certification of the full app.
- Syntax, scoped whitespace, exact LF source/public parity, unchanged model/capture construction and empty scoped Git index passed. [Verification metadata](verification.json).

Provenance edge fixtures change model labels or imported metadata on real current-model readings to verify matching boundaries; they are not historical model simulations. Primary preview and capture workflows use actual current-model annual summaries and monthly traces. Unit fixtures also use synthetic canonical notes to isolate validation and matching rules.

## Preview and replay

- [sample-annual-ready-1280-annual.png](browser/sample-annual-ready-1280-annual.png)
- [sample-month-ready-390-month.png](browser/sample-month-ready-390-month.png)
- [sample-captured-preview-320-month.png](browser/sample-captured-preview-320-month.png)
- [sample-full-notebook-320-month-forced-colors.png](browser/sample-full-notebook-320-month-forced-colors.png)

All normal/forced-color screenshots, captured-reading JSON and state probes are retained in [browser evidence](browser/results.json). The [portable harness](capture-readiness-browser-qa.cjs) resolves this report's parent repository by default; optional `AQUACULTURE_REPO` and `AQUACULTURE_QA_OUT` override paths. It uses the installed Node/Playwright dependencies and closes Chromium and its local HTTP server.
