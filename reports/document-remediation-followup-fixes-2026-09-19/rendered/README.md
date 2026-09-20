# Rendered selected-option fallback fix

Selected-choice checkpoints now use a nonempty native option label, falling back to option text for an empty label. The existing NFC and whitespace normalization remains in place. A changed effective choice is rejected; adding or removing an empty label, canonical text spelling, and an unchanged explicit label remain accepted.

Before the fix, the new native regression failed because Warm becoming Cold returned passed, despite the Chromium accessibility tree exposing the changed option name. See [before.json](before.json) and its retained browser artifacts.

After the fix, all 29 tests in rendered_fidelity_content_regressions.spec.ts passed with one Chromium worker, zero retries, zero skips, and zero flaky results. Seven new cases cover the original failure, benign empty-label addition/removal, canonical accents and whitespace, duplicate submitted values, explicit-label precedence, and export acceptance. The integration test verifies that rendered fidelity is the sole failing artifact check and binds its candidate hash to the exported artifact. See [after.json](after.json) and [summary.json](summary.json).

Command: npx playwright test tests/e2e/rendered_fidelity_content_regressions.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line,json --output=reports/document-remediation-followup-fixes-2026-09-19/rendered/after-artifacts

This evidence covers the requested selected-choice checkpoints in local Chromium. It does not establish whole-document preservation, live-model quality, deployed behavior, or human screen-reader acceptance.
