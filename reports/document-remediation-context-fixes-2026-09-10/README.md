# Form context preservation and CI coverage

Implemented all four recommendations from the [September 10 review](../document-remediation-next-review-2026-09-10/README.md). Policy is now `20260910-1`; both shipping pipeline modules were rebuilt and verified byte-for-byte against a fresh source build.

## Changes

- Preserve effective `minlength` and `maxlength` for text-entry inputs and textareas. Numeric spelling changes remain valid, and attributes that do not affect an input type do not create false rejections.
- Preserve existing named fieldset ancestry in order. Group names resolve ARIA references/names before the first direct legend or title. Neutral wrappers, identifier changes, canonical Unicode equivalents, and adding missing group context remain supported.
- Use NFC within form semantic comparisons so superscripts/subscripts retain meaning in native labels, descendant alternatives, names, descriptions, reference relationships, and group names. Canonically equivalent accents remain interchangeable. The unrelated shared normalizer was not globally changed.
- Add `npm run verify:remediation` with one maintained suite manifest, used by a new blocking `remediation-preservation` CI job. The command checks required runners, complete suite execution, generated module parity, and passing results without skips or browser retries. CI retains reports on failure.

The manifest includes all 197 previously verified Chromium tests plus the new native form suite, together with the source and integration regressions. [Command documentation](../../docs/remediation-validation.md) explains local use and extending the selection.

## Validation

**576 distinct tests passed: 370 unit/integration tests across 18 files and 206 Chromium tests across 14 files.** The final complete command exited successfully, with zero skipped tests and zero browser retries. This retains the previous 521 checks and adds 55 checks: 43 source/form cases, three validation-command contracts, and nine native browser cases.

All eight original review fixtures are retained verbatim in permanent test data. Native browser checks now verify both strict candidate acceptance and the actual `aiFixChunked` function with model transport mocked. They confirm source fallback for harmful candidates and successful acceptance of valid controls. Measurements include actual typed responses, native minimum-length validity, and accessibility names/descriptions/group membership bound to DOM control identities.

The new source suite was first run before implementation: 28 harmful cases failed their intended rejection assertions and all 15 valid controls passed. After implementation, all 43 pass. The first combined browser run passed the existing 197 cases but exposed two new test-harness mistakes: flat CDP tree enumeration was mistaken for DOM order, and a tiny minlength fixture failed the document-marker precondition. Both tests were corrected without changing application logic. All nine native cases and the subsequent full run passed. Earlier reports remain available as development evidence; the final reports below are authoritative.

## Evidence

- [Verified summary](validation-summary.json)
- [Complete command summary](final-validation/summary.json)
- [Final unit and integration results](final-validation/unit.json)
- [Final Chromium results](final-validation/browser.json)
- [Implementation hashes](implementation-hashes.json)
- [Before-fix regression evidence](before.json)
- [Summary verification script](finalize.cjs)

`finalize.cjs` verifies implementation hashes, both report selections, original fixture identity, and shipping-module equality. No implementation changes occurred during final validation.

The CI workflow is configured but has not run on GitHub in this session. Required merge checks remain a branch-protection setting. Validation uses local synthetic fixtures and scripted model transport; no deployment, live-model calibration, or human screen-reader acceptance was performed.
