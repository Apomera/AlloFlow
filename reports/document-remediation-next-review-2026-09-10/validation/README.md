# Next validation improvements

Read-only review of policy `20260909-6`, 2026-09-10. No application or CI edits, real model calls, deployment, or human acceptance sessions. All seven implementation hashes still match the previous verified fix report. The inventory reuses previous passing counts; it is not a new execution of those tests.

## 1. Highest value: enforce the new browser suites in CI

The latest fix validation passed **197 Chromium tests in 13 suites**, but none of those suite names appears in any checked-in workflow. This includes all seven rendered/dependency suites and all six export acceptance suites listed in [inventory.json](inventory.json).

The blocking browser job at `.github/workflows/verify.yml:235-261` uses an explicit list of older goldens. It does not run the whole Playwright suite. The unit job at `verify.yml:94-121` cannot supply this coverage: `vitest.config.js:8` discovers only `tests/**/*.test.js`, whereas these browser suites are `.spec.ts`. The ordinary `test:e2e` script exists but is not used to run all browser tests in the checked-in workflow.

Consequently, the newly fixed Chromium accessibility identity, occurrence binding, dependency classification, and artifact stability behavior can regress while all currently selected checks still pass. This is a missing validation gate, not a new demonstrated content defect.

Recommended concrete change: create one named remediation validation command and a blocking CI job that runs these 13 local browser suites, the focused live-gate/unit suites, and generated module parity. Require Chromium to be available, forbid focused/skipped tests, run deterministic fixtures with zero retries, and retain failure evidence. Add a small test that ensures the maintained suite manifest is actually wired into the workflow; do not leave this list solely in a dated report. Local branch-protection settings were not inspected, so this review does not assert that any GitHub job is currently configured as a required status check.

## 2. Repair the narrower local pipeline test selector

`dev-tools/check_pipeline_tests.cjs:29-57` selects tests through broad filename substrings. Of the 324 unit tests in the latest validation, **242 tests in 13 suites are omitted**. For example, it misses `remediation_gate_regressions`, `remediation_semantic_fidelity`, `remediation_inline_math_option_groups`, `aifix_source_associations`, and `source_remediation_contract`.

This does not mean those unit tests are missing from the full eight-shard CI job: they are normal `.test.js` files and are not quarantined. It means the command described as the “Pipeline + Doc-Builder vitest gate” in `dev-tools/verify_all.cjs:275-277` provides substantially less relevant coverage than the latest local verification. The selector also returns success when Vitest is absent (`check_pipeline_tests.cjs:64-68`). A named remediation manifest would fix the omission and make a missing required runner an explicit setup failure.

`deploy.sh:214-218` currently runs a different `check_changed_tests.cjs` gate, not this whole pipeline selector. That changed-test runner uses Vitest's import graph (`check_changed_tests.cjs:90-94`), whereas several source-gate suites read their harness/source with `fs.readFileSync` (for example `tests/remediation_residual_live.test.js:5-6`). Whether every such suite is selected for a source-only change remains an additional verification item; this review did not run a changed-tree probe and does not claim a reproduced omission in that runner.

## 3. Follow-up acceptance work beyond synthetic gates

The independent veraPDF job still has `continue-on-error: true` at `.github/workflows/verify.yml:281`. Its own adjacent comments explicitly describe promotion after a successful installer run. Review actual runner history and stabilize that dependency before promoting it; local inspection alone does not establish its operational readiness. This is a known release-gate weakness, not evidence that a current PDF fails veraPDF.

Human calibration remains **zero observations** in `tests/fixtures/pdf_calibration/manifest.json`. The benchmark and fixture builder honestly scope their automated corpus as synthetic; `docs/document-export-at-acceptance.md` explicitly excludes representative scans, math, multilingual content, and meaningful figures from its initial acceptance packet. The next quality measurement should therefore bind privacy-safe representative exported artifacts to actual source judgments and screen-reader observations. That is complementary to the CI work and cannot be replaced by more scripted MCP self-tests.

## Reproduce this inventory

```powershell
node reports/document-remediation-next-review-2026-09-10/validation/inventory.cjs
```

The script only reads repository files and writes `inventory.json` beside itself. It records exact suite counts, local-selector membership, quarantine membership, and implementation identity.
