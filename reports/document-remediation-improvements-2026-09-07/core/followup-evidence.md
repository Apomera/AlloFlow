# Follow-up candidate evidence persistence

Implemented in `misc_handlers_source.jsx` and one callback-forwarding line in `doc_pipeline_source.jsx`.

- Auto-continue AI/Equal Access and axe lanes capture `onPassEvidence`, retain prior rejection records, and accumulate the total count.
- Records retain only pass/chunkId/phase/reason, are capped at100, and have bounded string lengths. Aggregate counts remain finite safe integers.
- Evidence is published before re-verification so a rejected proposal remains documented after a failed audit, a regressed round, or a throttle pause. The unchanged HTML keeps its prior proof through the host setter.
- Publication requires the same controller, run generation, HTML revision, and source HTML; late attempts cannot modify a newer result.
- The targeted axe fallback forwards the same callback into `aiFixChunked`.

Validation: `tests/auto_continue_candidate_evidence.test.js`:10 passed,0 failed. The test executes the actual source loop with injected services and verifies autosave, preservation, limits, and stale-run behavior. JSON evidence: `followup-evidence-tests.json`.

Builds are owned by root: `_build_misc_handlers_module.js` writes root and `desktop/web-app/public/misc_handlers_module.js`; `_build_doc_pipeline_module.js` refreshes the pipeline counterparts.

Reviewed all `aiFixChunked` source call sites. The unused public Tier3 helper remains unchanged. The independent Workbench local-agent fallback returns through a command API that projects only type/html/score/log and commits only changed HTML; retaining rejection-only Workbench metadata would require an additional command/result contract. This was reported to root and left outside this narrow follow-up.

Final read-only OCR review: physical-page union, bounded ambiguity retries, quota stop, and recovered-page truncation handling retain the intended safeguards. No additional introduced data-loss or false-ready concern identified.
