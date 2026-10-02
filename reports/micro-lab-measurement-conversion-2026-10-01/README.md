# Micro Lab: explicit microscope estimate conversion

October 1, 2026

## Changes

The microscope now shows the working estimate's equivalent size in micrometers and nanometers. A separate **Convert working estimate** button updates the number and unit together: for example, `1.001 µm` becomes `1001 nm`. The preview is unscored. Choosing a unit directly keeps its established behavior of retaining the entered number.

Conversion shifts the original decimal text, including scientific notation, to preserve its value and avoid binary multiplication artifacts. Both representations must satisfy the existing positive numeric bounds and the 32-character input limit. Invalid values, unsupported imported units, damaged draft types, hidden overlong text, and unrepresentable target values cannot convert.

The explicit action updates only the selected raw draft's `value` and `unit`. It preserves that draft's original calibration and metadata, current and previous checked results, other slides, unknown imported fields, and unrelated tool state. A working estimate from a different viewing setup can convert while retaining its original context; checking remains subject to the existing viewing and focus requirements.

The update reads the newest state and verifies the original draft, value, unit, context, calibration fields, selected activity, slide, method, magnification, and display zoom. Delayed actions cannot overwrite a replaced draft or a newer viewing setup. Unrelated later edits, including saved-result changes and focus changes, are kept.

These preservation guarantees cover the explicit conversion action. Existing typing, manual unit selection, checking, and saved-view controls retain their established behavior. Conversion creates no checked result and awards no XP.

## Validation

Final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), and [browser-results.json](browser-results.json).

- 794 unit checks across 24 files, including 29 new pure conversion checks and 42 mounted workflow checks.
- 56 Chromium scenarios, including 7 new conversion scenarios, with one worker and no retries or skipped cases.
- 1,895 source-used interface labels; no missing labels or changed fallbacks. Source and desktop runtime bytes, and both Micro Lab translation namespaces, match.
- Runner checks seal every test file and verify source and test hashes before and after execution. The summary and commit helper require those hashes to remain unchanged.
- Keyboard, 320-pixel phone, 2×/4× CSS zoom, literal imported notes, JSON reload, exact raw-state deltas, invalid import boundaries, and delayed update races.
- Visual review: [desktop](conversion-desktop.png), [phone](conversion-phone.png), [enlarged layout](conversion-zoom.png).

Earlier diagnostics are retained. The initial unit attempt timed out while starting a Vitest worker, before executing tests. The initial browser run passed six cases; its first case expected a different phrase for the unscored preview. The assertion was corrected to the implemented wording. The first consolidated unit run passed 793 checks; one older harness that extracts the microscope renderer needed its new callback dependency injected. Its original assertions are retained. These corrections required no product source changes. Final consolidated results supersede the initial attempts.

## Reproduce

From the repository root:

```powershell
node reports/micro-lab-measurement-conversion-2026-10-01/run-validation.cjs unit
node reports/micro-lab-measurement-conversion-2026-10-01/run-validation.cjs browser
node reports/micro-lab-measurement-conversion-2026-10-01/summarize-validation.cjs 794 56
```

The local commit helper owns only the two runtime files, three new test files, the updated microscope test harness, this report's top-level artifacts, and the seven new Micro Lab translation entries. It runs the installed pre-commit hook and preserves unrelated working changes and staging. Private drafts, browser traces, and commit receipts are excluded.
