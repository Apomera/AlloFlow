# Remediation results workflow - 2026-09-19

User-approved follow-up to the remediation UI and recovery improvements.

## Changes

- Verification is the first result card. Optional sweep/fix controls are grouped in an accessible native disclosure; their existing handlers and ownership guards remain in place.
- The primary action now follows the work remaining: incomplete verification, repair findings, human-review findings, static-source review, document-preservation warnings, or downloads. Focus moves to a stable destination and opens any enclosing disclosure.
- The verification card consumes the same canonical, HTML-bound evidence as the header. Complete-for-tested-scope is labelled Complete for static source, with a separate reminder to review live interactions. Edited or stale-bound results cannot retain an unsupported completion label.
- Preservation navigation opens the actual fidelity warnings, including restored results that have fidelity evidence without a matching expert-referral flag. String-form legacy notes remain readable.
- Export formats use a labelled group of native buttons. Forwarded downloads keep keyboard focus in the disclosure. The tagged PDF label names the format without implying PDF/UA verification, and retains the translated format name.

## Validation

- The existing 26 Chromium continuity scenarios passed in the initial broad run. Four final affected scenarios passed after fixture correction: owner/navigation continuity, static scope and changed HTML, contextual next actions, and keyboard export forwarding.
- The browser fixture now loads verification_policy_module.js. The initial two new-scenario failures exposed the missing policy fixture and an assertion that included a decorative arrow; those were corrected and rerun successfully.
- All 409 existing source buttons and data-help-key anchors are preserved. Root/public generated view modules match byte-for-byte. Pipeline integrity and JSX/host smoke checks passed.
- 94 focused unit tests passed. Five final scoped axe scans (four layouts/themes plus exports) found zero violations, with zero horizontal overflow and no page errors. The unit and visual/accessibility results are recorded in unit-tests.json and visual-check.json. Screenshots cover 1280px light, 320px light/contrast, 390px dark, plus phone exports.

## Scope

Updated view_pdf_audit_source.jsx, remediation_workspace_component.jsx, remediation_workspace.css, related workspace/browser tests, and generated view module mirrors. No provider calls, deployment or packaged build. Shared files include earlier uncommitted work; no broad commit was made.
