# Sensitive AI requests and historical version access

October 24, 2026. Implementation follow-up to the school district readiness audit. Changes are local and require a coordinated build, release review, and deployment before they affect the published application or an existing Gemini Canvas copy.

## Sensitive AI review

Report Writer, BehaviorLens, and Dynamic Assessment now use a shared review boundary for their guarded AI requests. Each request presents the outgoing copy before transmission. Automatic removal covers entered names and common structured identifiers; the user can edit the text and explicitly remove additional names, school details, or other identifying content. When a separate search query is supplied, it receives its own editable review field. Editing the copy resets confirmation; newly detected identifiers trigger another review before sending. Each queued request requires its own review.

The original clinical records are not changed by this process. The gate does not save prompts, removal targets, or approvals in browser storage, send telemetry, or call a model. Missing privacy support blocks transmission. Cancel, abort, unmount, changed learner/case, and provider replacement are handled before dispatch. Existing safeguards against applying a response to the wrong case remain in place.

BehaviorLens retains its existing AI-off default and initial disclosure. Its final text boundary covers quick-fill, contextual profile/session-note prompts, family-safe prompts, analysis, and other child tools routed through the guarded callbacks. Its media callback now requires review of the accompanying text and explicit acknowledgment of the attachment. Faces, voices, and other media content are not anonymized.

Report Writer wraps its transport once, covering generation, extraction, verification, correction, and translation while preserving JSON mode, search settings, abort signals, code execution, and other provider arguments. Its app-generated translation date is restored locally from a fixed placeholder, rather than exempting clinical dates from removal. Cancel also stops subsequent passes in a cancelled operation.

Dynamic Assessment covers its direct text requests, generated glossary images, and instructions supplied to supplementary-resource generation. The delegated generator adds its own fixed instructions after the reviewed directive; this preview is not a claim that the entire downstream dispatcher prompt is displayed. The supplementary calls retain their isolated source context. Four manual supplementary pickers now explicitly use the reviewed provider rather than an ambient function.

The shared redactor also removes complete email addresses before substituting names, preventing a matched student name from leaving an address fragment such as `[Student]@school.example`. Generic role words remain intact in clinical instructions even when a code name is “Student A.” Scores, relative ages, durations, grade levels, evidence IDs, and original records are covered by regression checks.

## Historical application versions

The changelog retains release dates and notes. It no longer renders historical Canvas launch buttons from the release archive. One current-version link goes through the stable launcher, with guidance that older versions may lack current fixes. Release metadata and archived URLs remain in the source history for provenance.

This reduces promotion of unsupported builds. It does not revoke existing bookmarks/public Canvas links, patch historical embedded code, or certify the currently published version. Any retirement of previously shared Canvas copies requires separate action through the platform's sharing/publication controls.

## Verification and limits

Focused tests exercise exact reviewed text/query dispatch, no transmission before acceptance, cancellation, missing helpers, stale cases, provider changes, queue behavior, unchanged records, and provider argument preservation. Existing clinical generation and case-isolation suites were adapted to perform the actual review UI actions with synthetic records and stubbed providers; production code contains no testing bypass.

Validation results are reported per run rather than added together, because some suites overlap:

- Shared review and BehaviorLens/identifier regressions: 73 tests passed across eight suites on the final shared redactor; a separate family/connected-workflow/shared-review run passed 45 tests across three suites.
- Report Writer: 106 regressions passed before the final operation-cancellation refinement; afterward, all 18 boundary tests and 21 affected regression tests passed.
- Dynamic Assessment: 144 tests passed across seven suites, including direct and delegated routes, case/provider changes, optional-argument preservation, and the clinical isolation checks.
- Version history and stable launcher: 15 tests passed, including preservation of release history and removal of historical launch anchors.
- Syntax and scoped whitespace checks passed, and all four canonical/public module pairs and the changelog pair match byte-for-byte.

Native headless Edge checks used synthetic content and blocked external requests. Desktop and 375-pixel mobile previews were inspected. Initial focus, disabled sending before confirmation, keyboard focus wrapping, Escape cancellation, focus restoration, complete email removal, and mobile horizontal overflow checks passed. See [browser checks](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/sensitive-review-browser-checks.json), [desktop preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/sensitive-review-desktop.png), and [mobile preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/sensitive-review-mobile.png).

The new review interface currently uses English. Human review remains necessary: automatic removal can miss unlisted names, school details, and identifying context. Approval of one request does not authorize a later request or establish district permission to use a provider. PPS approval, Canvas/API contractual coverage, backend authorization, retention, and other audit findings remain separate requirements.

Before publishing, rebuild from the reviewed source, refresh the four affected module references using the release's verified commit, verify canonical/public mirrors and the exact release artifact, and test the authenticated PPS Canvas workflow. The commit-based cache-busting tool was not given an invented commit hash, and the shared application was not rebuilt over concurrent agents' work. Existing Canvas copies and live deployments were not modified by this work.
