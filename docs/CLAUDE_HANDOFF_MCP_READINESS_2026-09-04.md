# Claude handoff: AlloFlow MCP readiness and document-accessibility card

Prepared 2026-09-04 for the user's requested quota-saving handoff.
Workspace: C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated

## Read this first

The user asked to stop at a logical point and hand the work to Claude. Stop expanding scope; finish the verification/release-readiness pass described below. The new source identifies itself as **v0.10.0**, but the last built installer is still **v0.9.0**. The new changes are **not yet a release candidate**. Final focused run: **36/41 tests passed**; the remaining five were one keyless RPC timeout and four newly added test-harness failures (the harness fixes are saved but not rerun). Nothing was published, installed into the user's real Claude client, committed, or sent to colleagues in this pass.

The worktree contains a very large amount of unrelated pre-existing and concurrent work. Do not reset, revert, clean, or format broadly. Do not replace the existing AGENT_HANDOFF.md: it belongs to broader project work. Inspect current files before editing; ui_strings.js in particular changed during this task. No applicable AGENTS.md was found earlier. No subagents were used.

## User intent and accepted direction

Improve the local AlloFlow remediation MCP so the keyless path, batches, recovery, verification, and whole-document audio are easy to use with minimal supervision. Keep both accessible narration (structure announced) and natural narration (continuous listening). Support multilingual Piper alongside English Kokoro. The user next asked whether it is ready for Title II colleagues and whether its verifiers are comprehensive and gold standard. We recommended a supervised pilot, with explicit verifier coverage and no automated compliance certification claims. The user authorized those refinements and requested renaming the app's PDF-only remediation card because the app supports more document types.

Keyless means the active MCP client's model answers document-derived requests. It does not mean semantic remediation is model-free or that document content stays off the client's model provider. Local TTS inference may download public dependencies/models. Deterministic checks do not need a Gemini key. Never ask the user to paste keys into chat.

## Already completed before this readiness pass (v0.9.0)

- 41 MCP tools; keyless agent bridge for one file or a non-recursive folder, atomic batches of model replies, saved-run discovery and recovery.
- Optional complete-document WAV/MP3, HTML with native audio controls, synchronized read-along EPUB.
- Kokoro English and configured Piper languages, language-tagged blocks/inline phrases, accessible and natural modes. Accessible announcement labels cover en/es/fr/de/pt/it; other configured languages support natural mode.
- Local narration preflight, source/content coverage gates, complete-output hash verification, incremental unchanged-clip reuse across edits/reordering.
- Prior evidence: docs/MCP_CONTENT_COVERAGE_INCREMENTAL_2026-09-04.md and scratch/mcp-incremental-live/verification.json.
- Prior live English Kokoro + Spanish Piper experiment: edit one paragraph reused 2 clips/generated 1; reorder reused all 3/generated 0. WAV was 24 kHz mono and 6.210125 seconds in that small fixture. Completed-output reuse required no browser.
- Prior v0.9 regression evidence: 108 distinct tests had passing results across initial run and isolated reruns. Initial combined run was 104/108; four timeouts plus an initialize case passed unchanged in a focused rerun. Do not present this as a clean v0.10 run.
- Existing installer: desktop/dist/mcpb/alloflow-remediation.mcpb, v0.9.0, 27,443,628 bytes, last built approximately 2026-09-04 23:35 UTC. Recheck before sharing.

## Changes implemented in this pass

### PDF evidence and delivery gate

New desktop/mcp/remediation_verification.cjs normalizes independent PDF/UA evidence, requiring the emitted PDF's SHA-256, byte length, ua1 profile, recognized veraPDF validator, explicit compliance boolean and nonnegative failure counts. Missing, mismatched or incomplete evidence is unavailable, not a pass. Failed or contradictory evidence requires review.

The main MCP now retains validator provenance and applies this evidence before writing its final remediation report. A generated PDF without a passing independent check receives a collision-safe -tagged-review-required.pdf filename, a review verdict, deliveryStatus=review-required, reviewRequired=true, verificationChecks.pdfUa, and deliveryReviewReasons. HTML's previous verificationState is preserved separately as htmlVerificationState. A PDF pass does not erase upstream review findings. A missing main verdict also requires review. PDF artifact labeling points readers to the verification report.

The helper has focused unit tests in tests/mcp_verification_readiness.test.js. Protocol cases were added to tests/mcp_keyless_workflow.test.js for pass/fail/error/not-run, including actual file rename and report status. A test typo using files.reportJson was corrected to the real files.report after the current run had already started; rerun those cases after seeing the current report. These protocol fixtures mock the driver/validator; they test orchestration, not actual PDF/UA accuracy.

### HTML verifier coverage

The headless driver now loads the shared accessibility_evidence_module.js before verification_policy_module.js; it is also included in package/narration asset lists and engine fingerprints.

- audit_html now runs AI + axe + IBM Equal Access, catches engine failures independently, uses the app's canonical verification policy, and returns per-engine checks, counts, errors, execution/outcome/verification states and scope.
- audit_two_engines remains the model-free axe + IBM path, with the same explicit per-engine status contract.
- The shared auditChecks helper distinguishes passed, failed, partial, unavailable, not-run and review-required. Unknown review counts do not become zero.
- Schemas/tool descriptions were updated. A real-browser check of these newly combined paths remains to be run.

### Independent EPUB verification

New files:

- desktop/mcp/remediation_epub_validation.cjs
- desktop/mcp/remediation_ace_worker.cjs
- desktop/mcp/runtime/package.json and package-lock.json
- desktop/mcp/vendor/epubcheck/ distribution (JAR, lib, licenses and notices)
- tests/mcp_epub_validation.test.js

The full runtime pins Playwright 1.60.0 and @daisy/ace-cli 1.4.6; Node.js >=20. The official EPUBCheck 5.3.0 distribution was copied from the already installed local C:\Users\cabba\.alloflow-tools\epubcheck-5.3.0. The vendor manifest now has 59 hashed files. Notices were updated. Runtime dependencies were installed in desktop/mcp/runtime/node_modules with npm scripts disabled; no separate Electron/Chrome download was requested. Root package.json/lock were not changed for these dependencies.

EPUB validation takes a private snapshot, hashes it, runs EPUBCheck via local Java and Ace via Node with the existing Playwright Chromium executable, copies JSON evidence reports into the output directory, and verifies the original EPUB still matches the snapshot. Results distinguish checks that failed, were unavailable, were skipped or passed. A passing outcome is complete-for-tested-scope, with humanReviewRequired=true. Missing Java/Chromium is surfaced, not silently passed. Cancellation is bounded; the Ace worker closes its Puppeteer runner on IPC cancellation. Private temporary reports/snapshots are cleaned only within the call's own created directory. Public raw reports can contain document snippets; privacy docs still need this addition.

Actual Ace JSON uses assertions arrays and earl:outcome values pass/fail. The parser was corrected from an initial assumption of prefixed values and now accepts both. It rejects empty/malformed reports and contradictory failed exit codes. EPUBCheck's severity counts, not just exit 0, determine the result. New parser, cancellation and timeout tests were added.

Integration:

- export_alt_format for EPUB now attaches independent EPUBCheck/Ace evidence and raw report paths.
- Read-along EPUB generation does likewise and closes the TTS browser context before starting Java/Ace to reduce memory pressure.
- Narration result review status propagates to its remediation and folder summaries; batches can have outcome completed_with_review and reviewFiles.
- Completion fingerprints include validator implementation/runtime hashes. Reuse validates report artifacts; if a claimed passing/failing/review check has no corresponding raw report role, reuse is rejected.
- remediation_capabilities.narration.epubVerification and document_narration_preflight.epubVerification expose installed runtimes and Java/Node readiness. This is dependency readiness, not a test of every model or document.

### Real EPUB defect findings and shared exporter fixes

A real run of the new validators against the previous v0.9 sample at scratch/mcp-incremental-live/edited-accessible-readalong-4.epub found:

- EPUBCheck passed with zero warnings.
- Ace found three issues: OPF package missing xml:lang, navigation XHTML missing lang, and table-of-contents nav missing role=doc-toc.

Evidence is in scratch/mcp-v010-epub-validation/: verification.json and the raw *-epubcheck.json / *-ace.json reports. The aggregate verification.json came from BEFORE the Ace parser fix and says unsupported outcome/unavailable; the raw Ace report contains real failures. Do not describe that sample as passing Ace.

view_pdf_audit_source.jsx now fixes those attributes in both basic EPUB and media-overlay paths. Generated English navigation labels have explicit lang=en when the source language differs. The accessibility-summary metadata was softened to avoid overstating content quality. The OPF helpers are shared with narration.

_build_view_pdf_audit_module.js successfully rebuilt root/public view_pdf_audit_module.js and document_narration_text_module.js. A new EPUB made with these rebuilt helpers has NOT yet been independently validated. That is a high-priority next check. Reuse the old audio files to avoid downloading/synthesizing models just to test EPUB packaging, or make a small fresh read-along fixture with cached clips.

### App card and wording

The actual educator-hub card in view_educator_hub_modal_source.jsx now uses:

- Title: Document accessibility
- Description: Improve PDFs, Word documents, slides, spreadsheets, images, and web content. Review accessibility checks and export accessible formats.

New educator_hub.document_accessibility_title / document_accessibility_desc keys were added in ui_strings.js. Existing internal card IDs/old translation keys remain for compatibility; new keys fall back to English until translated. The view-last-audit tooltip now refers to documents.

Removed specific UI claims of an official compliance verdict and score thresholds being a WCAG AA pass. PDF/UA wording now describes machine-verifiable checks. Some legacy PAC 2024 mentions remain; do not mass-replace unrelated copy.

_build_view_educator_hub_modal_module.js successfully rebuilt the module. ui_strings.js was copied to desktop/web-app/public. Both affected build scripts now replace generated files atomically using task-owned temporary files after OneDrive interrupted a direct generated-file write. No broad app build was run.

## Tests and current stopping point

An earlier targeted v0.10 run passed all 11 verification-readiness tests, but 2 of 4 keyless workflow tests hit their 20-second RPC timeout under heavy load (13/15 total). Do not assume every failure is environmental.

A newer focused run was launched with:

    node node_modules/vitest/vitest.mjs run tests/mcp_epub_validation.test.js tests/mcp_verification_readiness.test.js tests/mcp_keyless_workflow.test.js tests/mcp_narration_preflight.test.js tests/mcp_narration_recovery.test.js tests/educator_hub_modal_runtime_a11y.test.js tests/educator_hub_role_scope.test.js --maxWorkers=1 --reporter=json --outputFile=scratch/mcp-v010-focused-tests.json

Read that JSON and the final status note below before rerunning anything. Do not repeat successful suites without a reason. The added PDF protocol cases use files.report, corrected during the run; failures referencing an undefined report path need that targeted rerun.

No v0.10 full release CI, rebuilt installer, isolated install or new real read-along validation has been completed. Manual screen-reader/keyboard/reading-order/content-fidelity review and a representative colleague pilot are pending. Do not say all verifiers are gold standard or that any automated score certifies Title II/WCAG conformance.

## Remaining work in order

1. Read current focused test results; fix actual issues. Confirm PDF review filenames and report provenance through MCP, parser/cancellation cases, narration preflight/cache behavior, and the educator card's existing accessibility/role tests.
2. Generate fresh text-only and read-along EPUBs using the rebuilt shared helpers, then run real EPUBCheck + Ace sequentially. Bind recorded results to hashes. The old sample's findings should be resolved, but require evidence before claiming it.
3. Exercise audit_html with AI/axe/IBM and model-free audit_two_engines through the real browser path; test an engine failure does not imply a pass. Inspect result schemas and counts. Confirm review status propagates for single files and both batch entry points.
4. Update stale documentation and the bundled skill. README_REMEDIATION.md still has a PDF-only heading, Node 18+, a two-engine audit_html description and structural-only EPUB language. The bundled SKILL.md still says headless PDFs and EPUB checking is not EPUBCheck. Update MCPB_RELEASE.md and PRIVACY.md for Node >=20, Java, independent EPUB evidence, raw reports, review statuses and limits. Keep the canonical skill ID/file path for compatibility. Skill validation: python C:/Users/cabba/.codex/skills/.system/skill-creator/scripts/quick_validate.py agent_skills/alloflow-pdf-remediation.
5. Write a short colleague pilot guide with setup, example prompts, public/synthetic document fixtures, source fidelity/reading order/tables/forms/language/audio/AT review, issue recording, and explicit automated-check scope. The right sharing claim is supervised pilot, not certified compliance.
6. Run required release checks and appropriate regressions (commands below), avoiding concurrent heavy browser/model processes.
7. Build v0.10 installer; verify extracted artifact dependencies, hashes and registry parity. Test an isolated extraction without NODE_PATH or checkout dependencies, fresh MCP state and a task-specific Chromium cache. Do not repurpose HOME/USERPROFILE. Record that testing on this computer is not a separate-machine test. Only share the new installer after these gates pass.

## Release/build details and useful commands

connector_version.cjs and the runtime package identify v0.10.0. build_mcpb.cjs now packages the three new server helpers, shared evidence module, EPUBCheck assets and locked Ace runtime. Its full build uses npm ci --omit=dev --ignore-scripts --no-audit --no-fund. The stage package name differs from the lock's root name; check whether npm ci accepts it and align deliberately if needed. verify_mcpb_artifact.cjs now requires both EPUB runtimes when --require-playwright is set. tests/desktop_mcp_runtime_build_drift.test.js copies the new helpers into its disposable fixtures.

    npm run verify:mcpb-ci
    node dev-tools/mcp_capability_inventory.cjs --assert-parity
    node desktop/mcp/verify_mcpb_artifact.cjs --require-playwright

The release CI currently includes durable jobs, residual hardening, runtime drift, completion-manifest race, batch boundary, pipeline parity, verifier packaging, MCP call CLI and release workflow tests. The additional prior narration/core regression suite is:

    node node_modules/vitest/vitest.mjs run tests/mcp_keyless_workflow.test.js tests/mcp_narration_preflight.test.js tests/mcp_remediation_stdio_smoke.test.js tests/desktop_mcp_runtime_build_drift.test.js tests/mcp_narration_languages.test.js tests/mcp_document_narration.test.js tests/mcp_agent_bridge_e2e.test.js tests/mcp_narration_recovery.test.js tests/view_pdf_audit_audio.test.js tests/mcp_content_coverage.test.js --maxWorkers=1

Before running node desktop/mcp/build_mcpb.cjs, verify the resolved desktop/dist/mcpb/staging and bundle paths stay inside this workspace's desktop/dist/mcpb and that package/staging directories are not reparse points: the build deletes its own staging directory. Do not remove unrelated caches or user files to reclaim disk space.

For live export tests, remediation_headless_driver.cjs exports createDriver and resolveChromium. driver.exportAltFormat({html,title,format:'epub'}) returns base64 zip bytes; driver.close() releases its browser. remediation_epub_validation.cjs exports validate(filePath,{stateDir,resolveChromium,claimPath,onLog,signal}), capabilities, fingerprint, parseEpubcheck, parseAce, run. The shared browser exports are AlloModules.AltFormatExports.epub/validateEpub and DocumentNarrationExports.smil/opf. The main export_alt_format MCP integration is preferable for confirming output ownership/review fields.

## Environment cautions

PowerShell is the shell. The normal shell sandbox in this session failed in its ACL helper, so read/build/test calls used require_escalated with a concise justification; auto-review allowed them. No approval rejection occurred. apply_patch had also failed earlier; scoped Node scripts in single-quoted PowerShell here-strings were used, with atomic write + rename. Avoid shell interpolation of backticks and dollar expressions.

OneDrive intermittently returned UNKNOWN on writes, and an earlier turn saw ENOSPC. Atomic generated-file writes were added. Browser/JVM/model concurrency caused significant memory pressure and occasional test timeouts. Run heavy tasks sequentially and investigate failures; do not simply raise every timeout. Preserve temporary diagnostic evidence and do not wipe shared user model caches. Do not spawn agents unless the user explicitly asks.

## Standards context and primary sources

The Title II web/mobile technical requirement is WCAG 2.1 AA for covered content. Automated results and PDF/UA machine checks alone cannot establish full accessibility or legal compliance. Scores are internal signals, not percentages of conformance. Checks have different scopes; combining them improves evidence but does not replace human review.

- DOJ rule: https://www.ada.gov/resources/2024-03-08-web-rule/
- DOJ implementation guide: https://www.ada.gov/resources/web-rule-first-steps/
- W3C evaluation guidance: https://www.w3.org/WAI/test-evaluate/
- veraPDF scope: https://docs.verapdf.org/validation/
- axe-core: https://github.com/dequelabs/axe-core
- IBM verification guidance: https://www.ibm.com/able/toolkit/verify/automated/
- PAC: https://pac.pdf-accessibility.org/en
- EPUBCheck CLI: https://www.w3.org/publishing/epubcheck/docs/cli/
- Ace CLI: https://daisy.github.io/ace/docs/cli/
- Pinned Ace package: https://raw.githubusercontent.com/daisy/ace/v1.4.6/packages/ace-cli/package.json

Official sources were reviewed in this task; if discussing compliance dates, verify them again. We found an April 2026 interim extension to April 26, 2027/2028 based on entity size/category, so do not repeat outdated 2026/2027 dates from old project prose.

## Suggested starting instruction for Claude

Read this handoff and scratch/mcp-v010-focused-tests.json. Finish the current MCP v0.10 readiness pass without expanding scope or disturbing unrelated work. Verify PDF delivery gating and fresh EPUB outputs, update onboarding and bundled skill documentation, run release checks, and build a reviewed installer for a supervised Title II colleague pilot. Keep both narration styles. Do not publish or claim certification. Report unresolved human validation separately.

## Final stopping-point status

- All work launched in this pass has stopped; no build or test session is intentionally left running.
- Eight changed MCP runtime/build/verification files passed node --check.
- Existing installer confirmed: v0.9.0, 27,443,628 bytes, modified 2026-09-04T23:35:16.697Z. New v0.10 source has not been packaged.
- Focused run completed: **36 passed / 5 failed / 41 total**. Full evidence: scratch/mcp-v010-focused-tests.json.
- Passed suites: educator_hub_modal_runtime_a11y, educator_hub_role_scope, mcp_epub_validation, mcp_narration_preflight, mcp_narration_recovery, mcp_verification_readiness. The updated document card therefore passed the existing runtime accessibility and role checks.
- One existing keyless batch/restart case hit its 20-second RPC timeout with no stderr detail. Diagnose/rerun in isolation; no assumption that the timeout is harmless.
- Four new PDF delivery protocol cases reached completed runs, then failed in the TEST HARNESS: it treated a single result's files artifact object as a batch files array. Corrected to Array.isArray(done.result.files). Also corrected files.reportJson to the actual files.report. These test corrections are saved but NOT RERUN. The assertions after that harness line still need execution; do not count the cases as passing.
- Next cheapest action is the targeted keyless suite after reading the report; then real fresh EPUB validation. No further changes were started after the user's quota-saving stop request beyond collecting evidence, correcting the obvious harness errors, and writing this handoff.
