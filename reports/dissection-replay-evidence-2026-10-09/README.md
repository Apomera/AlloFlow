# Dissection Lab: replay evidence and readable captions

Completed locally on October 9, 2026 (test receipts use October 10 UTC). Changes remain uncommitted.

## Improvements

- Replay distinguishes saved paths, supported paths, and illustrative teaching paths. Earlier repeated actions cannot borrow the latest saved stroke, and scissors never borrows an incision path.
- Missing or invalid saved pressure displays **PRESSURE NOT RECORDED**. Missing instrument calibration displays **SETTING NOT RECORDED**. Zero remains a valid recorded value. Replay does not substitute current settings or invented display readings.
- Supported actions and legacy paths with unknown input do not receive a direct-input alignment verdict.
- Captions use responsive text, wrapping, and the existing canvas panel placement logic. They are painted after anatomy effects and avoid anatomy labels and visible HUD panels in the checked layouts. Independent replay can use the corner where the hidden next-step card would otherwise reserve space.
- A readable explanation beside Replay attempt is also its accessible description. Native keyboard activation, saved work, and replay expiration are preserved.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit cases | 14 passed, 0 failed | [unit-10](unit-10/run.json) |
| Native Chromium scenarios | 4 passed, 0 failed | [browser-9](browser-9/run.json) |
| Scoped axe scans | 0 violations in all four; 3 scans retain a contrast incomplete rule | [verification](verification.json) |
| Canonical/runtime bytes and syntax | Match; parse succeeds | [verification](verification.json) |
| Prior work preservation | 712 protected files unchanged; 35 source edits and the two existing unit wording changes reverse exactly to the baseline | [verification](verification.json) |

The browser cases cover a 320px legacy attempt, desktop saved path without pressure, 390px forced colors with saved 50% pressure, and a 320px embedded view using large text/high contrast with supported input. Checks exercise keyboard focus/activation, accessible description, 16/18px help, no control overflow, at least 12 CSS pixel replay text, caption bounds, zero overlap with every recorded anatomy guidance/HUD box, saved state preservation, and replay timer cleanup.

Final screenshots inspected: all four canvas captures plus desktop and embedded large-text controls in [browser-9/captures](browser-9/captures). Earlier captures document the refinement history.

The three axe incomplete rules concern text on a gradient background. Supplemental conservative source-color ratios are at least 9.80:1 for replay guidance, 9.65:1 for the existing technique note, and 19.88:1 for high-contrast guidance. See [contrast review](contrast-review.json); raw incompletes are retained.

## Run history and limits

- unit-1 (12 cases) and unit-5 (2 cases) passed the first implementation. unit-3 aborted with a V8 memory allocation failure and contributes no passing evidence. unit-6 passed before the final caption reservation correction.
- browser-2 failed because the fixture activated replay with its canvas off screen. The fixture now scrolls the canvas into view and waits for the native visibility observer before advancing its clock.
- browser-4 passed the initial assertions; visual review then identified an unreadable overlapping caption. browser-7 passed the initial geometry checks, but ordinary anatomy labels were not covered by those assertions. Both are superseded by stricter checks.
- browser-8 passed three scenarios and correctly detected the remaining large-text collision. browser-9 passes all four with that collision corrected. No product assertions were removed to obtain the pass.
- Two Windows file-open errors occurred during the final source write; an atomic save succeeded after validating the prior source hash. No unrelated files were removed.
- Pressure values represent saved simulation samples. Existing input normalization can supply simulated pressure; this pass does not establish hardware pressure fidelity.
- This is focused component/browser validation, not a full application build, screen-reader audit, or deployment check. Dense combinations beyond the tested layouts still rely on the existing best-fit placement algorithm.

## Reproducibility and ownership

Final source SHA256: `e3a88070afa77800d1be26612e69ad68d5949ee6322c588c49f2a3b192f5990d`.
Input hashes, exact edit records, compressed final sources/tests, runner scripts, raw test logs, and captures are retained here. Git HEAD advanced concurrently from `75bbb4026faa246655d17d4354b17e3dd1df09f9` to `3bc1e436017284c7ff6a10d0217323a97509c7f8`; the verifier found no commits affecting the owned source/test scope. The index remained empty. This task did not stage, commit, push, or deploy.
