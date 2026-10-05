const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file)));
const specs = [
  ['Workspace restore, hydration and queued view', 'restore-audit/current-results.json'],
  ['QR Firebase, pack and hosted entry', 'assignment-audit/current-entry-results.json'],
  ['Saved homework Open boundary', 'assignment-audit/current-shelf-results.json'],
  ['Actual close, project-start and unmount boundaries', 'assignment-audit/current-host-boundary-results.json'],
  ['Vault synchronization and file selection', 'vault-audit/combined-current-suite.json'],
  ['All twelve vault sync callers', 'vault-audit/combined-current-callers.json'],
  ['Unlock and recovery action ownership', 'vault-audit/combined-current-actions.json'],
  ['Actual Return-to-Start support transition protection', 'current-return-transition.json'],
];
const checks = specs.map(([name, file]) => {
  const result = read(file), cases = result.results || result.cases;
  assert(Array.isArray(cases), file); assert(cases.every(test => test.passed === true || test.status === 'passed'), file);
  return { name, file, passed: cases.length };
});
const focusedTotal = checks.reduce((total, item) => total + item.passed, 0);
const regressions = read('existing-regressions-complete-summary.json');
assert(regressions.passed && regressions.stable && regressions.failedCases === 0 && regressions.pendingCases === 1 && regressions.knownSkipUnchanged);
const native = read('native-recovery.json'); assert(native.passed && native.pageErrors.length === 0 && native.cases.every(test => test.passed));
const consistency = read('current-consistency.json'); assert(consistency.passed);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const item of consistency.files) assert.equal(sha(fs.readFileSync(path.join(root, item.file))), item.candidateSha256, `Final current file: ${item.file}`);
for (const item of Object.values(native.inputs)) assert.equal(sha(fs.readFileSync(item.path)), item.sha256, `Native input: ${item.path}`);
const summary = { completedAt: new Date().toISOString(), passed: true, focusedTotal, existingRegressionPassed: regressions.passedCases, distinctPassedChecks: focusedTotal + regressions.passedCases, knownExistingSkip: regressions.skipped, nativeScenarios: native.cases.length, pageErrors: native.pageErrors, focused: checks, currentOwnedFilesStable: true, browserInputsStable: true, mirroredSourcesExact: true, generatedParityExact: true, modulePin: consistency.pin, productionFiles: consistency.files, gitIndexTouched: false, committed: false, deployed: false };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
const table = checks.map(item => `| ${item.name} | ${item.passed} | Passed |`).join('\n');
const markdown = `# Classroom recovery enhancements — 2026-10-04

Restoring or explicitly replacing a workspace now retires old learner-storage reads, unfinished QR entry, recovery-file selection, builder restoration and queued view opening. Old completions cannot republish work, overwrite the current selection, reopen a closed dialog or release a newer operation's busy indicator. Ordinary Canvas student-entry protection keeps the initial QR load alive while still clearing remembered teacher work and retiring device reads.

Vault synchronization checks both the current request/controller and fresh lock status before publishing decrypted work. Every sync caller respects a retired result. Unlock and recovery actions own their feedback and cleanup; explicit clears release their own busy state, and silent unmount performs ref-only retirement. File imports handle current read errors, synchronous FileReader failures, replacement selections and legacy handoff. Saved-homework Open retires the previous workspace before replacing it; the persistent homework library remains available.

The existing boot contract identified earlier organizer drift. Resource updates now use the original hot callback body, so persistence effects do not wait for the handler module. All three organizer edit markers run in their original moved handler bodies, with plain host shims. Return-to-Start keeps its reading-support transition guard inside its handler; allowed, cancelled and confirmed behavior is preserved. Two unused getters were removed; manifest, source getters and generated exports agree exactly.

## Verification

| Check group | Distinct cases | Result |
| --- | ---: | --- |
${table}
| Eight existing recovery, handler, Class Mailbox, transport and Studio suites | ${regressions.passedCases} | Passed |
| **Total** | **${summary.distinctPassedChecks}** | **Passed** |

One existing skipped LaunchPad gate question remains unchanged and is excluded from that total. Source/generated factory executions are separate recorded checks; candidate, baseline and final repeats are counted once. The initial 203-case before-source run recorded 88 passing controls and 115 failing preservation assertions. The additional boot-protection/busy-state checks retain five failing assertions and 49 passing controls against the intermediate integration. Six transition checks preserve current behavior. See [validation summary](validation-summary.json), [final focused run](current-run.json), [existing regressions](existing-regressions-complete.json) and [consistency record](current-consistency.json).

The [native Chromium workflow](native-recovery.json) passes ${native.cases.length} bounded scenarios using actual generated handlers, canonical recovery helpers and the vault controller with native FileReader, File/DataTransfer, IndexedDB and Web Crypto. It covers normal unlock/import, older selection after newer selection, actual close/workspace replacement during a pending read, and actual record decrypt/unlock completion after locking. Browser page errors are empty. Every captured browser input matches the final working files. The [scope record](native-recovery-scope.md) identifies the controlled loader/decrypt order, synthetic crypto configuration and injected active-workspace clear.

The sandboxed Vitest attempt collected zero cases because Windows denied temporary-cache renames. The same eight suites ran outside that sandbox with one fork and their existing 30-second test limit. The first completed run passed 158 cases and exposed two pre-existing extraction contracts. After organizer fixes, the next run passed 159 and identified the remaining Return-to-Start wrapper; all handler wrappers were then inspected together. The final run passes all ${regressions.passedCases} enabled cases. Assertions and worker constants were preserved. Initial report-runner path errors happened before collection; a missing new action-ref binding in the vault fixture was corrected without changing its 58 assertions. That incomplete run is retained separately and excluded from defect totals. Initial proposal/reversal guard failures wrote no production files.

## Preservation and scope

Seven production files changed: three canonical/desktop hosts, editable HostHandlers, two generated runtimes and the dependency manifest. The [original integration](applied.json), [review followup](applied-followup.json), [transition integration](applied-return-guard.json), [operations](operations.json) and preserved before/intermediate inputs retain exact hashes. Reversing all final source operations recovers both raw original preimages. Editable line endings are preserved. Only HostHandlers was generated; the module pin is \`${consistency.pin}\`. All three hosts and both runtime mirrors match byte for byte.

Concurrent Maine loader changes from 6ab45e2c to c5af6b18 and then fec6407e were retained after verifying all other host bytes matched. Both [initial](concurrent-pin-rebase.json) and [followup](concurrent-followup-pin-rebase.json) rebase receipts are preserved. The rejected submission-recipient prototype is excluded because the real host factory uses fixed per-render values; no recipient change was integrated. Earlier classroom, Studio, STEM, organizer and shared work remains intact. The shared Git index was never modified.

The native workflows cover bounded production closures and browser primitives, with controlled service completions. They do not claim full App-shell, hosted classroom services, remote Canvas bridge, WAN/TURN, physical audio or manual assistive-technology acceptance. Retirement prevents stale UI publication; it does not undo a vault transaction already committed. The repository-wide suite and full build were not run. Changes remain local and uncommitted, with no push or deployment.

Reproduce focused current checks with \`node reports/classroom-recovery-enhancements-2026-10-04/run-owned.cjs current\`, and source consistency with \`node reports/classroom-recovery-enhancements-2026-10-04/verify-consistency.cjs current\`. The native browser entry point is [native-recovery.cjs](native-recovery.cjs). Integration tools are guarded one-time operations and refuse repeated application.
`;
fs.writeFileSync(path.join(__dirname, 'README.md'), markdown);
console.log(JSON.stringify({ passed: true, checks: summary.distinctPassedChecks, focused: focusedTotal, native: native.cases.length, modulePin: consistency.pin }));
