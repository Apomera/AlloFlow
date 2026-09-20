# Remediation pacing and workspace improvements — 19 September 2026

Implemented the approved review. Application changes remain in the working tree; no deployment or live AI calls were made.

## Controls and recovery

- **Advanced pipeline settings → AI connection & recovery → Extra request pacing** controls preventive request spacing and the rolling request-start limit. It defaults on in Canvas and off on a known direct-API host; legacy/unknown hosts preserve their previous policy. The batch intake also exposes this setting.
- Turning it off retains bounded concurrency, Retry-After, adaptive error backoff, cancellation, checkpoint/resume, and all verification requirements. Local AI retains serial pacing independently of the switch.
- The preference persists locally, is frozen at a safe run boundary, and travels through saved batch settings to both audit and remediation. Legacy saved batches retain their earlier pacing behavior. Results identify a saved off setting.
- A new document now clears the previous document's held-failure streak, pending hold probe and attempt duration. Existing guards still prevent resetting the gate underneath overlapping work.
- Queueing, preventive pacing and error recovery now have distinct progress messages. Known waits show an approximate next-request countdown. Ordinary queueing no longer claims a provider rate limit.
- The recovery allowance counts elapsed recovery waits once across concurrent requests, rather than summing scheduled cooldowns. Preventive waits and request queueing appear separately and do not consume this allowance. Resume starts a fresh allowance. Diagnostic bundles retain the legacy scheduled counters and add elapsed-wait evidence.

## Interface

- Advanced settings are grouped into Quality & effort, Scanned documents, and AI connection & recovery. Labels and help text are larger; score/pass descriptions avoid implying conformance guarantees. All four quality sliders, auto-continue and OCR controls remain available.
- Log is in the header toolbar, clear of phone controls.
- Partial results lead with **Retry missing verification**. Detailed evidence and review tools are folded into a disclosure, duplicate outcome/next-action text is removed, and the result border follows its actual review/ready state. Existing download, review and repair actions remain available.
- Contextual help describes the switch and the recovery allowance accurately.

## Validation

- The maintained browser continuity suite passed **23 tests**, with no failures or retries. It covers ownership, navigation, batch recovery, checkpoint health, keyboard review and narrow layouts.
- The additional UI validation passed **13 checks**, including mouse/keyboard toggling, batch locking, result navigation, and header/settings accessibility scans at 320, 390 and 1280 pixels in light, dark and high-contrast themes. No browser JavaScript errors occurred. Screenshots of the control and partial-result layouts were visually inspected.
- Host JSX parsing, pipeline integrity, scoped whitespace checks, and byte-for-byte web/desktop module and help-file parity passed.
- **257 unit cases passed across the final run and focused rerun.** The final run passed 256/257; one source-AST inspection exceeded its initial time allowance. Its full 18-test suite passed with a 30-second allowance. No application changes were needed for that rerun. Counts overlap; see `implementation-validation.json`, `final-tests.json`, and `progress-rerun.json`. The suite covers preference persistence, per-run freezing, batch checkpoint propagation, error protection with pacing off, hold-state reset, wait accounting, progress ownership and the existing controller regressions.

The browser scenarios use controlled fixtures. These checks establish local behavior and UI integrity; they do not establish the fastest pacing mode under live Canvas load. The default remains conservative in Canvas.

## Files and evidence

- Runtime: `doc_pipeline_source.jsx`, generated root/desktop pipeline modules.
- UI: `view_pdf_audit_source.jsx`, `remediation_workspace_component.jsx`, `remediation_workspace.css`, generated root/desktop view modules.
- Host state: `AlloFlowANTI.txt`, desktop `AlloFlowANTI.txt` and `App.jsx`.
- Tests: `tests/remediation_pacing_preference.test.js` plus focused existing batch, progress, workspace and continuity suites.
- Evidence: `final-tests.json`, `ui-validation.json`, `qa.cjs`, and `pacing-*-*.png` / `outcome-390-*.png` in this directory.

Pre-existing and concurrent changes in shared files were preserved.
