# PDF export and output fixes

Implementation and both automated test phases are complete. The validator recorded a concurrent Git revision change, with all declared file hashes and tool versions unchanged.

## Changes

- The portable export fixture now allows 240 seconds, covering the renderer's 180-second limit and capability discovery. The two-fixture setup budget is derived from that limit.
- Fixture subprocess failures retain elapsed time, exit status, signal, timeout, both output streams and cleanup status. Timed-out or oversized processes stop their owned process tree. UTF-8 output is preserved.
- Teacher Memory Aid appendices retain saved mappings when a cue is customized or current connections are present. Such mappings are labeled for teacher review, with a reminder to check them against the current cue and facts. They remain absent from customized learner references and answer-free student worksheets. Mapping text is escaped.
- The generated document-suite theme CSS was refreshed through the existing generator, then AppStyles and DocPipeline were rebuilt with their individual builders. Surrounding styles were preserved, and both public mirrors match.
- Added subprocess regressions and export assertions to the maintained remediation selection. Added the relevant implementation and style inputs to its identity manifest.
- The full DOM export suite has a 60-second test allowance. An initial 30-second timeout was followed by a successful recheck; all assertions remain in place.

## Verification

- Initial two-suite reproduction: the missing teacher mapping and stale generated CSS failed their assertions. A separate source-scan test exceeded its default 5-second bound.
- The unchanged portable fixture command generated both tagged PDF fixtures successfully before the timeout changes.
- Focused checks: 71/72 passed; the quiz-response test exceeded its 30-second allowance. That test then passed on recheck.
- Five intentional mutations were rejected by their intended assertions: insufficient outer timeout, discarded stderr, disabled child-process cleanup, missing teacher mapping, and stale generated CSS. Mutations were applied only in isolated test processes; recorded shared source hashes stayed unchanged. The first harness attempt included archived tests and was rejected as proof. The corrected run restricts discovery to maintained tests.
- Full maintained unit selection: 43 files, 1,008 tests passed, exit 0.
- Full maintained browser selection: 26 files, 539 tests passed, exit 0, no retries or skipped cases. The previously blocked PDF acceptance suite completed successfully.
- Final identity comparison: zero changed declared inputs and no changed tool versions. Git HEAD changed from 6722a20d2166a6952af2ea59ab85f4c760577468 to aa51acfc2a4cc1d97313bd6e6dd440c5ec6e9919 during seven unrelated STEM/Life Skills commits. The strict validator therefore reported failed despite both test phases passing. Its original summary is retained unchanged. This is completed test evidence with a revision qualification, not a clean release-gate result.

The standard validator's selection and acceptance rules are used through its existing runner hook, with one worker for both phases. Exact arguments are recorded in validation-commands.json. Skipped, failed or retried cases remain disallowed.

## Evidence and recovery

Before-images and SHA-256 hashes are in before/ and before.json. Current reports are focused-unit.json, quiz-response-recheck.json, proof-all-r2.json, proof-results.json and validation/. The first rejected proof's raw report remains at proof-all.json. final-audit.json verifies both public mirrors and preserved surrounding styles. own-changes.patch compares existing files with their saved working-tree inputs; new files are copied under new-files/. These are recovery and review artifacts, not a commit pathspec.

No staging, commit, push, deployment or Git restoration was performed. The earlier unrelated regression inventory remains at C:/tmp/alloflow_dispatch/wave2/finish-triage.md. This work addresses the Memory Aid and generated-style findings from that inventory.
