# Native form submission preservation fixes

The strict acceptance gate now preserves effective textarea hard wrapping and column count when hard wrapping applies. Case-equivalent wrap spellings, numeric column spelling, missing/default columns, and soft-wrap width repairs remain accepted. Chromium's legacy physical hard-wrap spelling is covered.

For supported named controls, dirname presence/name and submitted direction are retained. Disabled, unnamed, reset/button, and unsupported controls remain repairable when the attribute is inert; the first-legend exception in a disabled fieldset stays protected. Direction is considered only when a companion field is present. Exact field names retain meaningful whitespace.

Native calibration found two extra distinctions: Chromium submits dirname="" as an empty-name field, and explicit/inherited uppercase RTL is retained as uppercase in the submitted companion value. These are payload changes, not equivalent repairs. Auto direction casing remains equivalent. The [first browser run](./browser.json) retains the two initially misclassified controls (59 passed, 2 failed); [direction calibration](./direction-calibration.json) records the native observations that corrected the implementation and fixtures.

The [HTML form-entry algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-entry-list) and [auto-directionality element definition](https://html.spec.whatwg.org/multipage/dom.html#auto-directionality-form-associated-elements) guided supported control selection. Native FormData tests additionally preserve the Chromium behaviors above.

## Verification

- [Initial unit evidence](./before.json): 22 harmful cases failed before the fix; 52 checks passed.
- [Final unit evidence](./unit-final.json): **147 passed** across the form-value, form-context, AI-gate, and build-parity suites.
- [Final browser evidence](./browser-final.json): **68 passed**, one worker, zero retries/skips; source, proposed, and retained output FormData are recorded in per-test artifacts.
- **48 new fixtures / 96 new checks:** 26 harmful changes rejected and 22 valid controls accepted in both the actual gate/mocked pipeline and native Chromium.
- All six original review source/candidate pairs remain verbatim. Both shipping modules were rebuilt and match; policy version is **20260920-1**.
- [Verified summary](./verified-summary.json) checks the input snapshot and final evidence. The declared six-file [input snapshot](./final-run-identity.json) was taken during the final browser run; the shared validation run provides broader before/after identity coverage.

Scope: local synthetic documents, transport mocked, native FormData without network submission. Wrapping assertions cover wrap/cols attributes; they do not claim CSS/font layout equivalence or cross-browser calibration. Full validation is reported separately by the parent run.
