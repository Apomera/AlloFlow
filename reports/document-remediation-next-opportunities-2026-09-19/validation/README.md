# Validation opportunity audit

This is analysis only. The probe writes review evidence in this directory; it does not change application code, permanent tests, manifests, or CI. No tests, package installations, browser sessions, or GitHub jobs were run. Vitest and Playwright were used only for test discovery. [Machine-readable evidence](results.json) includes source hashes and exact captured configuration; [probe](probe.cjs) reproduces the checks.

## 1. Install the dependencies required by the blocking remediation job

**Priority: high (CI setup failure).** The `remediation-preservation` job in `.github/workflows/verify.yml:51-65` installs root dependencies and Chromium, then calls `verify:remediation`. It never installs the separate desktop web-app dependencies. The root package has neither workspaces nor an installation lifecycle hook that installs that project, and the React/ReactDOM files are not tracked in Git.

Both files are mandatory identity inputs at `dev-tools/remediation_validation.json:91-92`. Selected tests also read them directly (`tests/e2e/remediation_continuity.spec.ts:14-15`; `tests/remediation_workspace.test.js:6`). Therefore a fresh checkout following the checked-in job reaches the missing-input preflight instead of running the suites. A developer machine with desktop dependencies already installed hides the omission.

The sparse-checkout reproduction runs the actual `snapshotInputs` and `executeValidation` preflight with those two paths absent. It reports `A required validation input is missing`, retains failed status, and invokes zero runners. [Preflight summary](missing-desktop-dependencies/summary.json). This is a local missing-path reproduction plus configuration audit, not an observed GitHub run or a full clean installation.

Minimal fix: install the desktop React 18 harness before validation, as the existing unit, Adventure, and Research jobs already do, and document that local prerequisite. Add a contract assertion for this job's dependency setup and verify the command from a fresh dependency environment. Keep the missing-input failure; it correctly detects the omission.

## 2. Carry migrated browser checks into the MCP calibration entry point

**Priority: medium (silent coverage loss).** `package.json:13` still lists deleted `tests/doc_pipeline_focus_wrap_browser.test.js` in `verify:mcp-calibration`. The command invokes only Vitest; it never runs the replacement `document_focus_wrap.spec.ts` or the crop checks moved into `document_static_crop_cleanup.spec.ts`.

Actual Vitest discovery using all 21 filename filters in the calibration script exits successfully and discovers only 20 files. It silently ignores the deleted focus file. [Unit discovery output](calibration-unit-discovery.txt). Playwright discovery confirms the two replacement browser suites contain 12 checks: nine focus/footnote checks and three crop-control checks. [Browser discovery output](migrated-browser-discovery.txt). The DOM-only `static_crop_cleanup.test.js` remains selected, so its three migrated browser checks are also absent from calibration despite its filename still resolving.

Minimal fix: remove the stale unit filename and include both replacement Playwright suites in `verify:mcp-calibration`, retaining an explicit failure policy and zero retries for these deterministic checks. Prefer a small maintained selection with existence checks so a future move cannot silently drop coverage. Add a command-contract regression covering both runners, every selected path's existence, and presence of the two migrated browser files. The shared `verify:remediation` command already includes them; this finding applies specifically to MCP calibration.
