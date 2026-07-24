# Claude handoff: remediation pipeline hardening

Date: 2026-07-23

## Why this handoff exists

The original regression was intermittent failure to open the remediation/audit modal after document upload, with a related concern that the first audit sometimes did not run. Several audit/fix passes followed. The latest pass was stopped at the user's request because the Codex quota was running low. The user then asked for one all-work commit through `deploy.sh`.

This was a heavily shared workspace. Before wrap-up there were 724 pending status entries spanning remediation work and many other completed agent projects. Do not reset or selectively discard files based only on this document. The deploy source commit made immediately after this handoff is the ownership boundary; inspect `git log -2 --stat` for the exact committed set.

## Remediation fixes completed in source

### Upload, modal, and initial audit lifecycle

- Hardened document-intake epochs, re-entry ownership, cancellation, and stale-completion rejection.
- Preserved the uploaded document long enough for the modal and initial audit lifecycle to start reliably.
- Added fail-honest fallback behavior when the initial audit cannot complete instead of silently presenting a clean result.
- Hardened batch intake and moved educator batch memory limits to device-adaptive budgets.

### Canonical audit and verification policy

- Canonical success now requires complete AI coverage plus usable Axe and Equal Access evidence.
- Missing finding counters, degraded/synthesized audits, partial AI chunk coverage, known AI issues, Axe violations, or Equal Access failures cannot become a verified success.
- Execution state and outcome state are separate. Static/tested-scope results are labeled `complete-for-tested-scope`, not generic success.
- Secondary remediation actions no longer force a score of 100 or reuse stale evidence.
- Additive verification fields are preserved through re-audit, binding, load, and export.
- Additional Sweep and Fix Remaining use exact-HTML compare-and-swap ownership and canonical three-engine re-audit.
- Equal Access failures participate in best-candidate selection and restoration.

### Evidence, delivery, caching, and performance

- Exact AI chunk coverage and usable Axe predicates gate promotion and clean/target stops.
- OCR text-layer completeness vetoes tagged/PDF-UA delivery claims when scanned pages, characters, or coverage are missing.
- Audit memoization uses SHA-256/exact-prompt keys and in-flight deduplication.
- Already-aborted ambient signals are not restored into new work.
- Persistent cache/checkpoint work is deadline-bounded; remediation retention defaults to 24 hours unless explicitly opted in.
- Cache eviction tracks approximate result bytes as well as entry count.
- OOXML processing has fail-closed declared-size, entry-count, ratio, and per-part inflation limits.
- DOMPurify loading can recover after a failed mirror chain instead of caching a permanent null result.
- Prompt-fence neutralization is round-trip safe for authored zero-width spaces.
- Tesseract is pinned to 5.1.1; mathml2omml is pinned to 0.5.0.

### Security and transport

- Gemini API keys were removed from request URLs and moved to `x-goog-api-key` headers across text, vision, image editing, model listing/health, audio, translation, and Imagen paths.
- Shared attachment transports add an untrusted-document boundary without double wrapping.
- Diagnostic filenames/prompts/API material are redacted.
- Print-PDF HTML is canonically sanitized before a popup is opened or written; the former weaker raw-HTML retry was removed.
- Preview/report/export sinks were substantially hardened and preview script execution was removed.
- Runtime dependency integrity checks now use Babel AST ownership and reject API keys in URLs, major-only tags, unversioned `+esm`, and unpinned remote executable resources.
- Exact direct dependencies were added for `@babel/parser@7.29.7` and `@babel/traverse@7.29.7`.

## Principal files changed for this pipeline pass

- `AlloFlowANTI.txt`
- `doc_pipeline_source.jsx`
- `view_pdf_audit_source.jsx`
- `verification_policy_source.jsx`
- `gemini_api_source.jsx`
- `misc_handlers_source.jsx`
- `view_educator_hub_modal_source.jsx`
- `dev-tools/check_pipeline_integrity.js`
- `package.json` and `package-lock.json`
- Remediation-focused tests under `tests/`, especially the `*_20260723.test.js` files.

Generated root/public modules were stale when the investigation stopped. `deploy.sh` runs the production builder and should regenerate many of them, but verify every source/module pair after deployment rather than assuming complete coverage.

## Validation completed before wrap-up

- Host ownership/intake focused bundle: 22/22 passed.
- Adaptive memory budget: 3/3 passed.
- Verification transport plus host key transport: 16/16 passed.
- View canonical-actions: 8/8 passed before the final additive-policy edits.
- Evidence invariants: 16/16 passed before the newest OOXML/DOMPurify/print/prompt-fence additions.
- AST integrity policy: 3/3 passed.
- Pipeline integrity checker passed: 59 UI calls and 114 exports in each pipeline file at that checkpoint.
- `doc_pipeline_source.jsx` passed a final esbuild syntax check after its latest changes.
- Earlier reconciled legacy regression bundle: 67/67 passed.

Important: the final source state did not receive a complete post-edit test run before this handoff. Treat deploy gates as a build checkpoint, not proof that the remediation test matrix is fully green.

## Known unfinished work, in priority order

1. Rebuild and verify all six remediation artifacts/public mirrors: doc pipeline, PDF audit view, verification policy, Gemini API, misc handlers, and educator hub view. Confirm each loader cache-bust hash matches its generated file.
2. Re-run/update focused tests after the latest edits. Some older fixtures expect `complete` without finding counters; those expectations are obsolete under the fail-closed policy.
3. Finish view sink hardening: `_dlDaisy` still needs explicit `_viewSanitizeMarkupForExport`; inventory the two direct `downloadAccessiblePdf` calls and every remaining export/preview/report sink.
4. Add the extracted `_verifyCommittedCandidate` helper and an executable deferred stale-document/CAS transaction test. The ownership logic exists, but that final behavioral test was not applied.
5. Add a scoped `clearRemediationData()` API that deletes only PDF audit/remediation caches, batch checkpoints/results, and records in the dedicated `alloflow-chunk-progress` store. Serialize against in-flight writes; never call broad shared `storageDB.clear()`.
6. Add focused executable tests for the newest OOXML limits, DOMPurify retry, print sanitization, and zero-width-space prompt-fence round trip.
7. Consider collision-proofing authored literal `<<<ALLO_SECTION:...>>>` text. The internal Office marker remains a low-probability content-collision edge case.
8. Complete the residual security/performance review. The cutoff prevented full re-certification of all sink, archive, abort/deadline, memory-copy, and privacy-retention paths.

## Recommended first commands for Claude

```bash
git status --short
git log -2 --oneline --stat
node dev-tools/check_pipeline_integrity.js
npx vitest run tests/remediation_evidence_invariants_20260723.test.js tests/remediation_view_canonical_actions_20260723.test.js tests/remediation_verification_transport_20260723.test.js tests/remediation_host_key_transport_20260723.test.js tests/remediation_operation_ownership.test.js tests/remediation_intake_hardening.test.js tests/remediation_batch_memory_budget_20260723.test.js tests/pipeline_integrity_ast_url_policy_20260723.test.js --maxWorkers=1
npm run verify:pipeline
npm run verify:view-props
npm run verify:build
npm run verify:mirror
git diff --check
```

If generated modules are stale, run:

```bash
node _build_doc_pipeline_module.js
node _build_view_pdf_audit_module.js
node _build_verification_policy_module.js
node _build_gemini_api_module.js
node _build_misc_handlers_module.js
node _build_view_educator_hub_modal_module.js
```

Then update/verify cache-bust hashes in all three host copies and rerun the checks.

## Deployment/commit note

`deploy.sh` is not commit-only. It commits staged work, pushes `main`, runs the production build, builds the deploy app, may deploy configured Firebase hosting, makes a post-deploy hash-ref commit, pushes again, and mirrors to the backup remote. The user explicitly requested this workflow for the shared checkpoint. Transient `deploy_run*.log`, SkateLab logs, `sweep_out.txt`, and the accidental `System.Management.Automation.Internal.Host.InternalHost` file were intentionally excluded; source, tests, docs, generated assets, and other agent deliverables were included.
