# Maine SLD state comparison enhancement — 2026-10-04

The State requirements workspace now has a six-topic participant comparison plan. Each topic can link to a primary saved reference, retain the participant’s wording and follow-up question, and explicitly record a source check. Saved source changes, lost review marks or source removal show that a check needs review without removing participant writing. Topic edits clear that topic’s recorded check. These prompts support discussion; they do not certify legal accuracy, currentness, complete legal coverage or eligibility.

## Participant behavior

- Topics cover criteria/process, language and assessment validity, intervention/observation, exclusionary considerations, need for special education, and forms/documentation/timelines.
- A source check requires a reviewed reference saved for the selected state and a nonblank comparison note. The linked excerpt remains available for inspection.
- Comparison writing autosaves in separate tab storage. Saved references and all state plans transfer together in the separate JSON download. The Maine fictional worksheet remains independent.
- If storage is unavailable, work remains in memory and can be downloaded. If previously stored reference data cannot be opened, writing a comparison does not overwrite those original bytes; explicit Save reference, Restore or Retry is required to resume saving.
- Source drafts still require Save reference and do not survive a reload or appear in backups until saved.

## Compatibility and limits

Workspace JSON is now version 2. Existing version 1 source backups and tab data migrate with their accepted source text and provenance preserved, source revision 1 and empty comparison topics. The same storage key is retained. Older versions of the activity cannot open version 2 backups; retain an earlier backup if using an older app. Restore replaces the coherent sources-and-plans bundle after confirmation; comparison checks are never merged into a different source set by matching identifiers alone.

Saved-source revisions come from actual stored changes, ignoring draft-supplied counters. Exact no-op saves preserve the revision. Removing a linked reference zeros the check baseline, so reusing that identifier cannot revive a former check. Comparison notes are limited to 2,000 characters, follow-up questions to 1,000, and the existing complete JSON size guard includes plans.

This pass adds no legal-rule text, automatic eligibility judgment, AI interpretation, search query or remote deployment. The existing public search proxy release limitation remains documented in the [previous workspace report](../maine-sld-state-requirements-workspace-2026-10-04/README.md).

## Validation

**39 distinct focused checks passed:** 21 Node checks (14 new comparison checks and 7 retained reference checks), plus 18 Chromium workflows (8 new comparison, 7 retained state workspace, 3 retained score/deep-link/federal-Maine workflows). Browser jobs used one worker, zero retries and the original 120-second test budget. Ten scoped axe artifacts contain zero violations. Root directly accepted eight populated actual-app captures at 1280 and 320 px, including writing, linked excerpts and forced colors.

- [Final verification](final-verification.json)
- [21 model checks](node-01.txt)
- [13 native browser workflows; first host failures retained](browser-01/results.json)
- [Interrupted-preview host attempt retained](browser-02/results.json)
- [Two corrected full-app workflows](browser-03/results.json)
- [Three retained activity workflows](browser-04/results.json)
- [Root visual review](root-visual-review.json)
- [Independent source and pixel review](independent-review.json)
- [Actual layout receipt and eight captures](actual-layout/receipt.json)
- [Baseline](baseline.json), [Core receipt](core-edit-receipt.json), [UI receipts](ui/ui-recovery-edit-receipt.json)
- [Frozen activity identity](frozen-activity.json), [scoped host pin receipt](integration/accepted/pin-verification.json), [static preview verification](integration/accepted/static-verification.json)
- [Guarded background restart](integration/accepted/restarts/restart.json)

The first browser attempt passed 13 native workflows but used a runner URL with a duplicate slash for two full-app tests. The second attempt used the corrected URL but found the managed preview had stopped after the tool environment changed. Both failures are preserved. A guarded hidden background restart retained the prior runtime receipt, stopped no process and used the same immutable source/module snapshot; the two unchanged full-app workflows then passed. The malformed-storage overwrite issue was caught in independent source review and corrected before final browser validation.

The original 38-case browser definitions and 7 state-workspace definitions remain byte-identical. This pass did not rerun the complete original 38-case matrix, a production app build, remote search with live credentials, or physical assistive-technology testing.

## Delivery

Local preview: http://127.0.0.1:65063/app/?tool=maine-sld-practice

Final activity module: `36955de0aef08c88a6ac2cae501019f34ad22558d2e5daeccc79e3ee46a90520` (265,375 bytes; pin `36955de0`), four exact runtime copies. Three current shared hosts match tested source `278543b8cbf467457a38d52034ffffa08918f4f12bceab5e1876e22e813f804f`; only their Maine loader version changed. The case source, Case Core/data, builder, document adapter and prior tests are preserved. Owned paths remain unstaged. No commit, push, deployment or full app build was performed.
