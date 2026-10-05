# Micro Lab: preserve notebooks when resuming from Home

Started October 2, 2026; refined October 3, 2026.

## Changes

Home continuation buttons now carry an intended destination instead of saving an older notebook patch. The functional update checks the latest tab, route, selection, target owner and target fields before applying navigation.

- Mystery resume changes only the active case, its report view and the notice. Other cases, raw reports, unknown metadata and untouched long notes remain intact.
- Growth and Resistance resume change only the selected record. If an imported identifier needs repair, only the selected raw record receives its repaired ID; unsupported entries and other raw records remain intact.
- Resistance repairs sanitize comparison identifiers against the original saved evidence while preserving comparison metadata.
- New imports, replaced owners, changed selections, target edits, recovery replacements and changed continuation priorities reject queued requests. Later unrelated tool, activity, notebook and metadata changes are retained.
- Microscope, Gram and Quiz continuation routes also check their current destination before navigating.
- Delayed keyboard focus requires an accepted transition and current destination ownership. Imports and later actions cancel stale focus. React StrictMode and existing background culture/observed-slide saves remain supported.

Display normalization stays read-only. This change retains existing teaching rules, note limits, XP behavior and Home labels.

## Validation

The complete unit run passed **941 checks across 26 files**, including 76 new Home integrity cases. **All 70 distinct Chromium scenarios across 11 specs are verified**, including seven new Home integrity scenarios. Desktop, 320-pixel phone and 400% zoom screenshots were inspected.

The initial browser suite passed 69 scenarios. One existing annotation scenario timed out after 30 seconds while typing into the Growth explanation, before its value, focus or layout assertions ran. The exact same scenario passed on the unchanged source and test inputs in a separate targeted run (8.6 seconds for the scenario). Both raw reports and original runner phases are retained. `verify-browser.cjs` requires matching scenario ID, file, title and Chromium project, unchanged inputs and zero automatic retries before accepting that recovery. The summary records one initial failure and one recheck; it does not rewrite the failed suite as a passing run.

Canonical and desktop runtime SHA-256: `02560e3ccade76c6ca803b2bd785de774e4f85d3dcc08d0a1a502cc1eb5fe132`.

The first focused unit run passed 75 of 76 cases. Its remaining failure was a harness assumption that every queued update belonged to Home; imported Resistance also legitimately persists its current culture on mount. The harness now holds only the captured Home action, retaining the exact rejection and focus assertions. The passing consolidated run includes that correction. The failed focused receipt is retained.

## Reproduce

Run from the repository root:

```powershell
node reports/micro-lab-home-integrity-2026-10-02/run-validation.cjs unit
node reports/micro-lab-home-integrity-2026-10-02/run-validation.cjs browser
# When verifying the retained initial typing timeout:
node reports/micro-lab-home-integrity-2026-10-02/run-validation.cjs browser-recheck
node reports/micro-lab-home-integrity-2026-10-02/summarize-validation.cjs 941 70
```

The runners verify both runtime hashes and every test input before and after execution. Chromium uses one worker and zero automatic retries. Final summary gates require every distinct scenario, all 37 test-input hashes, matching translation namespaces and fallbacks, identical runtime mirrors and valid syntax. Scenario recovery is limited to the retained, exact typing timeout and its matching successful recheck.

## Local commit scope

The focused follow-up commit is based on the preceding verified Micro Lab commit `ca981c6e06161c81f9946202e9fa3078d9ea43ed`. It includes the canonical runtime, desktop mirror, two new regression files and this report's top-level validation artifacts. The helpers use a private Git index and a new local branch, preserving the shared checkout branch, complete real index and current staging. Translation registries are excluded.
