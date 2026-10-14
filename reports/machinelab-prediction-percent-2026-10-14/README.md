# Machine Lab: percentage-change practice

**Predict the change** now offers two calculation targets: the new power/energy value, or its percentage change from the current setup. This adds percentage-change practice to all 24 station/scenario combinations across six machines.

The percentage target uses `(new − current) ÷ current × 100` with full-precision values. Learners can enter negative decreases, positive increases (including an explicit `+`), and zero for unchanged energy. Percentage answers allow an absolute error of 0.1 percentage points. The existing new-value target retains its positive-number requirement and 1% relative tolerance.

A worked result card emphasizes the signed percentage in large type, describes the direction in words, and shows both the absolute difference with units and the substituted percentage calculation. It appears only after the prediction and calculation are correct, or after a deliberate explanation reveal. Signed entry uses a text keyboard so minus is available on phones; the label and visible suffix specify percent.

Switching targets clears the number and its check. Previously exposed comparisons retain viewed-answer provenance. Numeric and target callbacks are guarded against the wrong rendered target, scenario or setup. Retry and Next retain the selected target while clearing answers; changing physical assumptions resets the signature-bound draft. Malformed restored targets clear the numeric draft/check, while legacy records without a target remain compatible with new-value mode.

Only prediction state, grading, updates and rendering changed. The physical prediction model, existing new-value grading branch, main calculation practice and saved-record handling are unchanged, verified against baseline `3c3deb314`. Canonical/public SHA-256: `63019f670d4a624220e36d4c3d1bf13e506f2d41f7bf76e49fb6b694a6884a06`.

Validation covers independently derived percentage answers across all 24 routes and reversed boundary cases, signed parsing, zero and rounding limits, target switching, stale callbacks, answer withholding and record isolation. Four native-browser previews cover pending work, a decrease, an increase in dark mode and unchanged energy in forced colors.

Final validation passed: 119 cases (28 new and 91 unchanged) across five test files and 17 serial native processes; browser run-02 passed 1,319 checks across all 24 routes, four visual scenarios and 16 keyboard-focus observations. Native child and wrapper exit codes were observed as zero. Both the browser agent and root directly inspected all four final screenshots.

After validation, one extra blank line at the end of the new test file was removed. The exact tested snapshot and original receipts are preserved; the evidence verifier proves that the current file differs by exactly that one trailing newline. No executable test or production bytes changed during final packaging.

Browser run-01 is preserved as a failed harness attempt. Its only failure assumed exactly one selected radio even when a fresh task was deliberately revealed without choosing an answer. One assertion was corrected to allow zero or one selection while requiring checked/selected agreement and exact selected/unselected border widths. The production source did not change; the failed receipt, original harness, exact correction and successful rerun are bound by the evidence verifier.

Run from the repository root, using fresh native-run output directories:

```powershell
node reports/machinelab-prediction-percent-2026-10-14/verify-scope.cjs
node reports/machinelab-prediction-percent-2026-10-14/run-tests.cjs <fresh-test-directory>
node reports/machinelab-prediction-percent-2026-10-14/browser/run-native.cjs <fresh-browser-directory> 63019f670d4a624220e36d4c3d1bf13e506f2d41f7bf76e49fb6b694a6884a06
node reports/machinelab-prediction-percent-2026-10-14/verify-evidence.cjs
```

Targeted validation uses local React/THREE and Chromium with software WebGL; forced colors is emulated. It does not exercise a deployed host or a physical assistive-technology session. No push or deployment is included.
