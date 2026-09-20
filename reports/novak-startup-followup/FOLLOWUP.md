# Novak follow-up enhancements

Completed in the local working tree on September 19, 2026 (browser evidence recorded September 20 UTC).

## Changes

- Explicitly assigning an adapted reading now includes its exact matching original and the teacher's curated word supports. The selected reading remains the opening resource. Unrelated lesson/family resources are excluded, originals are deduplicated, and a deleted source is reconstructed from the captured snapshot rather than a newer revision.
- Quick Start uses the existing module loading gate: opening requests its module, registration replaces the loading card, failures offer Retry, and a late-installed host loader is discovered for a bounded period. Closing cancels waiting, and later registration cannot reopen the wizard. The loading surface retains its original overlay level. The background scheduling policy is unchanged.
- README and homepage onboarding begin with original reading and optional supports. Adapted companions are supplemental by default; Full Pack is optional and content review comes before sharing.

## Verification

- Combined final regression: **170 tests passed across 15 files**, including the nine original Novak suites, the new selected-assignment and loading-recovery suites, shared module/focus behavior, wizard rendering/accessibility, and background-pump regressions. See regression-results.json.
- The assignment tests run the actual host resolver, packet builder, privacy serializer, and hydration. Three regressions reproduced the missing original before the fix. The wider assignment/SharedActivity run passed 32 checks (overlaps the combined run).
- Seven before/after local Chromium scenarios verify the actual Quick Start adapter and gate with controlled module loading. Keyboard Close/Retry work, requests are deduplicated, and no browser page errors or external requests occur. See README.md and after-browser-results.json. This is a component lifecycle check, not a full-app performance benchmark.
- Existing promotion browser QA passed desktop and 1025/1024/390/320 widths, keyboard controls, clipboard fallback, tour clipping, serious/critical axe checks, and no-JavaScript behavior.
- Exact changed-region parity and Babel syntax checks passed for AlloFlowANTI.txt and both desktop source shells. See source-integrity.json. Scoped git diff --check passed.

## Existing failures and remaining limits

An adjacent startup_intake_reliability run had four failures because its harness searches for an inline handleFileUpload declaration that no longer exists at that marker. The same extraction produces ReferenceError on HEAD db76fd140165f99a42d566e4638af58eac470538; see intake-baseline.json. No unrelated tests were rewritten or disabled.

Live AI gloss quality, actual classroom/network round trips, manual screen-reader use, and community preserved-reading publication remain outside this follow-up. No whole-app startup speed claim is made. Sources are synchronized; no desktop installer/package or deployed site was rebuilt. Changes remain local and uncommitted alongside other active work.
