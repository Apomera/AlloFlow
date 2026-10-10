const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const vm = require('vm');
const { execFileSync } = require('child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-plan-handoff-2026-10-09');
const read = rel => JSON.parse(fs.readFileSync(path.join(report, rel), 'utf8'));
const save = (rel, value) => fs.writeFileSync(path.join(report, rel), JSON.stringify(value, null, 2) + '\n');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim();
const sourcePath = 'stem_lab/stem_tool_dissection.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_dissection.js';
const browserPath = 'tests/e2e/dissection-checkpoint-clarity.spec.ts';
const baseline = read('baseline.json');
const sourceReceipt = read('edits/source-edits.json');
const browserReceipt = read('edits/browser-edits.json');
function verifyEdits(file, receipt, archive) {
  const bytes = fs.readFileSync(path.join(repo, file));
  assert(hash(bytes) === receipt.after, file + ': current hash drift');
  let text = bytes.toString('utf8');
  for (const edit of [...receipt.edits].reverse()) {
    assert(text.split(edit.after).length === 2, 'Nonunique reverse: ' + edit.name);
    text = text.replace(edit.after, edit.before);
  }
  const before = zlib.gunzipSync(fs.readFileSync(path.join(report, archive)));
  assert(Buffer.from(text).equals(before), file + ': exact inverse failed');
  assert(hash(before) === receipt.before, file + ': archived baseline drift');
  return { file, before: receipt.before, after: receipt.after, edits: receipt.edits.length, exactInverse: true };
}
const verifiedEdits = [verifyEdits(sourcePath, sourceReceipt, 'edits/source-before.js.gz'), verifyEdits(browserPath, browserReceipt, 'edits/browser-before.ts.gz')];
assert(hash(fs.readFileSync(path.join(repo, mirrorPath))) === sourceReceipt.after, 'Mirror differs');
new vm.Script(fs.readFileSync(path.join(repo, sourcePath), 'utf8'), { filename: sourcePath });
const changedProtected = Object.entries(baseline.protected).filter(([file, expected]) => hash(fs.readFileSync(path.join(repo, file))) !== expected).map(([file]) => file);
assert(changedProtected.length === 0, 'Protected files changed: ' + changedProtected.join(', '));
assert(git(['rev-parse', 'HEAD']) === baseline.head, 'HEAD changed');
assert(git(['diff', '--cached', '--name-status']) === baseline.staged, 'Shared index changed');
git(['diff', '--check', '--', sourcePath, mirrorPath, browserPath]);
assert(read('sequence-1.json').success === true, 'Before baseline not complete');
assert(read('sequence-3.json').success === true, 'Final sequence not complete');
const finalRuns = ['checkpoint-2', 'roadmap-3', 'unit-3'].map(label => {
  const receipt = read(label + '/run.json');
  assert(receipt.exitCode === 0 && receipt.end, label + ': incomplete run');
  assert(JSON.stringify(receipt.startHashes) === JSON.stringify(receipt.endHashes), label + ': in-run drift');
  for (const [file, expected] of Object.entries(receipt.endHashes)) assert(hash(fs.readFileSync(path.join(repo, file))) === expected, label + ': post-run drift');
  return { label, start: receipt.start, end: receipt.end, exitCode: receipt.exitCode, stableInputs: true };
});
const browsers = ['checkpoint-2', 'roadmap-3'].map(label => {
  const results = read(label + '/results.json');
  assert(results.errors.length === 0 && results.stats.unexpected === 0 && results.stats.flaky === 0 && results.stats.skipped === 0, label + ': browser failure');
  return { label, passed: results.stats.expected, failed: results.stats.unexpected, skipped: results.stats.skipped };
});
const unit = read('unit-3/results.json');
assert(unit.success && unit.numFailedTests === 0 && unit.numPassedTests === 13, 'Unit result mismatch');
assert(browsers.reduce((sum, run) => sum + run.passed, 0) === 18, 'Browser count mismatch');
const accessibility = read('accessibility-review.json');
assert(accessibility.acceptedReports === 15 && accessibility.violations === 0 && accessibility.unresolvedNodes === 0, 'Accessibility review incomplete');
save('interrupted-run-note.json', {
  recordedAt: new Date().toISOString(), sequence: 'sequence-2.json', completedJob: 'checkpoint-2',
  interruptedJob: 'roadmap-2', observed: 'Execution session disappeared; the recorded process was no longer present. Two tests had reported success in stdout, but no completed run receipt or results JSON was written.',
  counting: 'The incomplete roadmap-2 run is excluded from final test and accepted accessibility totals. Original files are retained unchanged. All three selected roadmap cases were rerun successfully in roadmap-3; unit checks completed in unit-3.'
});
save('verification.json', {
  at: new Date().toISOString(), sourceSyntax: 'passed', sourceMirrorEqual: true, verifiedEdits,
  protectedFileCount: Object.keys(baseline.protected).length, changedProtected,
  head: baseline.head, headUnchanged: true, stagingUnchanged: true, scopedWhitespace: 'passed', finalRuns
});
save('validation-summary.json', {
  browser: browsers, browserPassed: 18, baselineBrowserPassed: 2,
  unit: { passed: unit.numPassedTests, skipped: unit.numPendingTests, failed: unit.numFailedTests, selection: 'technique roadmap|completed technique checkpoint' },
  accessibility: { reports: accessibility.acceptedReports, violations: 0, manuallyReviewedGradientNodes: accessibility.reviewedNodes, unresolvedNodes: 0 },
  visualReview: ['checkpoint-2/captures/after-phone-confirmed-plan.png', 'checkpoint-2/captures/after-embedded-large-confirmed-plan.png', 'checkpoint-2/captures/after-forced-colors-confirmed-plan.png'],
  limits: ['Local Chromium harness serving working-tree source; no deployed-host check.', 'Targeted unit selection; 178 unselected tests were skipped.', 'Automated accessibility checks plus visual and contrast review; no assistive-technology user session.', 'No commit, push, deployment or full application build.']
});
const helpers = path.join(report, 'edits/helpers');
fs.mkdirSync(helpers, { recursive: true });
for (const name of fs.readdirSync(__dirname).filter(name => name.endsWith('.cjs'))) fs.copyFileSync(path.join(__dirname, name), path.join(helpers, name));
fs.writeFileSync(path.join(report, 'edits/browser-after.ts.gz'), zlib.gzipSync(fs.readFileSync(path.join(repo, browserPath))));
const readme = `# Dissection Lab: confirmed-plan handoff\n\nCompleted locally on October 9, 2026. Changes remain uncommitted.\n\n## What changed\n\nAfter a correct plan, keyboard focus now moves to **Demonstrate your plan**. The checkpoint keeps **Your confirmed plan** visible while the learner prepares the required instrument and demonstrates the action. Tab reaches **Prepare** next. Confirming an answer does not select an instrument or perform a specimen action.\n\nThe recap shows the learner's saved answer only when it matches the current technique's correct option. Older saves with missing, unknown or inconsistent choices retain the existing preparation guidance. Plan text uses 16px type, or 18px with large text enabled. High-contrast and forced-colors presentation remains readable.\n\n## Before and after\n\nBefore: confirming the plan focused the specimen canvas, and the preparation card did not retain the answer.\n\n![Before: preparation without the plan recap](before-1/captures/before-phone-perform.png)\n\nAfter: the focused preparation heading and confirmed response stay together above the explicit actions.\n\n![After: confirmed plan and explicit preparation actions](checkpoint-2/captures/after-phone-confirmed-plan.png)\n\n## Validation\n\n- **18 browser tests passed:** 15 checkpoint cases across five layouts, keyboard focus, Guided and assessment routes, saved-state recovery and technique transitions; three existing roadmap cases cover native actions, explanations, verification and Undo.\n- **13 targeted unit tests passed; 178 unselected tests skipped.** The existing unit fixture and roadmap browser fixture were unchanged. Two pre-change browser captures also passed.\n- **15 accepted axe audits detected zero violations.** Forty gradient-related incomplete nodes were checked manually against conservative palette bounds; the lowest ratio was 7.20:1. New confirmed-plan text on white measures 7.68:1. This is a scoped accessibility review, not a whole-app certification.\n- Phone, embedded large-text and forced-colors screenshots were inspected. The recap wraps without horizontal clipping and the preparation controls remain distinct.\n- Source/public copies match. Exact reversal verifies six source edits and eight browser-fixture edits against archived baselines. All **${Object.keys(baseline.protected).length} protected files**, HEAD and the shared staging area are unchanged. Source syntax and scoped whitespace checks pass.\n\nOne roadmap run was interrupted before its completion receipt. Its raw files remain available, and it is excluded from the totals above. The entire selected roadmap group then passed in a fresh run; see [interruption note](interrupted-run-note.json).\n\n## Evidence and scope\n\n[Validation summary](validation-summary.json) · [Accessibility review](accessibility-review.json) · [Preservation checks](verification.json) · [Checkpoint results](checkpoint-2/results.json) · [Roadmap results](roadmap-3/results.json) · [Unit results](unit-3/results.json)\n\nTests used a local Chromium harness serving the working-tree source. No full application build, deployed-host check or assistive-technology user session was performed. No files were staged, committed, pushed or deployed by this pass.\n\nThe browser runner sets DISSECTION_CHECKPOINT_OUTPUT to this report's capture directory. Historical accessible-name inputs remain in the September 30 report; reruns must set a fresh output directory to preserve that report.\n`;
fs.writeFileSync(path.join(report, 'README.md'), readme);
const handoffPath = path.join(repo, 'AGENT_HANDOFF.md');
const handoffBefore = fs.readFileSync(handoffPath, 'utf8');
const ownRow = '- 2026-10-09 | Codex Dissection plan handoff IN PROGRESS: owns canonical/public stem_lab/stem_tool_dissection.js, checkpoint browser fixture and reports/dissection-plan-handoff-2026-10-09. Keep confirmed plans visible during preparation and focus the preparation heading before explicit tool/canvas actions. Preserve learning/scoring/physical actions and saved work. No staging, commit, push or deployment.';
const doneRow = '- 2026-10-09 | Codex Dissection plan handoff COMPLETE LOCALLY; ownership RELEASED. Confirmed plans remain visible during preparation; keyboard focus moves to the preparation heading and Tab reaches Prepare. Missing or inconsistent saved choices retain native guidance. Source/public synchronized; 18 browser and 13 targeted unit tests pass, 15 accepted axe audits have zero violations with gradient checks manually resolved. All 531 protected files and shared index/HEAD preserved. Report reports/dissection-plan-handoff-2026-10-09/README.md records interrupted-run recovery and local validation limits. No staging, commit, push or deployment.';
assert(handoffBefore.split(ownRow).length === 2, 'Own handoff row is not unique');
const handoffAfter = handoffBefore.replace(ownRow, doneRow);
assert(handoffAfter.replace(doneRow, ownRow) === handoffBefore, 'Handoff scope mismatch');
fs.writeFileSync(handoffPath, handoffAfter);
save('edits/handoff-completion.json', { before: hash(handoffBefore), after: hash(handoffAfter), oldRow: ownRow, newRow: doneRow, otherContentPreserved: true });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
save('manifest.json', Object.fromEntries(walk(report).filter(file => path.basename(file) !== 'manifest.json').map(file => [path.relative(report, file).replaceAll('\\', '/'), hash(fs.readFileSync(file))])));
console.log(JSON.stringify({ complete: true, browserPassed: 18, unitPassed: 13, acceptedAudits: 15, protectedFiles: Object.keys(baseline.protected).length, source: sourceReceipt.after, report }, null, 2));
