# Automatic homework and Learning Web enhancements

Completed September 30, 2026. Work began September 29. Changes remain uncommitted.

## Changes

- Automatic homework waits for the resource handler and all three reader helpers. A failed or stalled load retains the packet, and the existing loading notice can retry it.
- Late automatic opens are canceled after a workspace change, a replacement packet, unmount, or an explicit resource selection.
- Unsaved reading-support edits prompt once. Save and continue opens the requested homework; Keep editing retains it without a false failure warning. Obsolete confirmations cannot reopen an earlier packet.
- Learning Web uses the protected History opener, preserving the saved source and reading supports. Obsolete loading failures stay quiet after navigation.
- Student-entry recovery runs once and preserves homework that arrived before recovery finished. The startup history upgrade records the final array after both content and artifact-ID normalization. Automatic opening follows that specific upgrade and selects the normalized resource at its original delivery position.

The host, desktop source mirror, and App.jsx match. The warm synchronous restore handler retains its existing return contract. Module source and built artifacts were unchanged in this pass.

## Verification

- **245 passing checks** across 14 test files; one existing Canvas test remains skipped.
- **Five full local app workflows:** delayed reader helpers, failed load followed by Retry, navigation during loading, a 390-pixel phone viewport, and homework opened on a device with older cached work.
- **13 regression proofs:** isolated candidate files remove individual guards and must produce assertion failures. Syntax errors and timeouts do not count.
- **16 audit checks:** source syntax, three-host parity, eight module/public-mirror pairs, preservation of all 14 original homework regression bodies, additive validation selection, and stability of 53 verification inputs.

The browser runs use the real allo_pack fragment decoder, current host, built view modules, and compiled styles. Network delays and failures are injected through Playwright; service workers are blocked. No React state was injected. Page errors, unhandled rejections, and application crashes were checked.

This is local verification. Live classroom backend access and live AI generation were not exercised. Placeholder-backend and injected network-failure console messages are retained in the browser evidence.

## Evidence

- `final-targeted-tests.json` and `test-selection.json`: final unit results and exact selection.
- `full-app-results.json` and `homework-*-complete.png`: final browser results and screenshots.
- `regression-proofs.json` and `proof-*.json`: mutation proof results.
- `final-audit.json`: all 16 checks passed.
- `before.json`, `before/`, and `own-changes.patch`: working-tree preimages and this pass's patch.
- `completion.json`: final hash and verification totals.
- `post-report-check.json`: concurrent English translation-bank edits were retained; application code, History messages, and common messages stayed unchanged.

Verification scripts and preview builds are outside the repository in the task's `verification` directory. Early browser results exposed the recovery/normalization races; a full disk also interrupted an early preview run. The final five workflows passed after the fixes and rerun.
