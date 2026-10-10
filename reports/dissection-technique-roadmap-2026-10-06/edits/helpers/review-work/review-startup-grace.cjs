const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const reportRoot = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06');
const installedPath = path.join(repo, 'node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js');
const installed = fs.readFileSync(installedPath);
const archived = zlib.gunzipSync(fs.readFileSync(path.join(reportRoot, 'edits/vitest-startup-source.js.gz')));
const metadata = JSON.parse(fs.readFileSync(path.join(reportRoot, 'edits/vitest-startup-grace.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedPin = 'd991d80584acd5fc622aefce5f907feff6c531059165a05d75c66e3ed8697d79';
if (hash(installed) !== expectedPin || hash(archived) !== expectedPin || metadata.installedSha256 !== expectedPin) throw Error('Installed/archive/review pin mismatch');
const before = installed.toString('utf8');
const edits = [['const START_TIMEOUT = 6e4;', 'const START_TIMEOUT = 18e4;'], ['const WORKER_START_TIMEOUT = 9e4;', 'const WORKER_START_TIMEOUT = 21e4;']];
let after = before;
for (const [oldText, nextText] of edits) {
  if (after.split(oldText).length !== 2) throw Error('Startup declaration not unique');
  after = after.replace(oldText, () => nextText);
}
let inverse = after;
for (const [oldText, nextText] of edits.slice().reverse()) inverse = inverse.replace(nextText, () => oldText);
if (inverse !== before) throw Error('Startup inverse differs');
if (!after.includes('const STOP_TIMEOUT = 6e4;')) throw Error('Stop deadline changed');
const report = {
  reviewType: 'Read-only static review of test startup grace fallback',
  reviewedAtUtc: new Date().toISOString(),
  nodeRuntimeObserved: 'v24.11.1',
  installedSha256: hash(installed),
  archivedOriginalSha256: hash(archived),
  archiveByteEqualsInstalled: archived.equals(installed),
  plannedInMemorySha256: hash(after),
  independentlyVerifiedExactTwoEditInverse: inverse === before,
  scopeVerdict: 'Two startup deadline changes preserve installed files, explicit test deadlines, and the shutdown deadline.',
  startupHandshakeMs: [60000, 180000],
  poolStartupMs: [90000, 210000],
  unchangedShutdownMs: 60000,
  protectedTestDeadlines: { lifecycle: 15000, pointer: 60000, livingFunction: 60000 },
  nativeRendererSha256: hash(fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'))),
  protectedCanvasTestSha256: hash(fs.readFileSync(path.join(repo, 'tests/dissection_canvas_loop.test.js'))),
  guardRecommendationsForInitiallyReviewedHook: [
    { id: 'exact-module-target', finding: 'Initial hook matches any URL ending /cli-api.Cjt90eJu.js.', recommendation: 'Compare the resolved URL/path with the exact installed target.' },
    { id: 'archived-pin-and-loaded-pin', finding: 'Initial physicalPin is captured from whatever file is installed at process start; loaded source is not compared with that pin.', recommendation: 'Require both installed bytes and original loaded source to match the recorded expected SHA d991d80584acd5fc622aefce5f907feff6c531059165a05d75c66e3ed8697d79.' },
    { id: 'module-format-and-source', finding: 'Initial hook assumes source exists and has the expected module format.', recommendation: 'Fail closed unless loaded.format is module and loaded.source is non-null.' },
    { id: 'activation-and-after-pin', finding: 'Initial runner records application hashes but does not validate hook activation or the installed source after execution.', recommendation: 'Require a hook activation receipt for the actual parent Vitest PID, confirm original and transformed hashes, and record installed package hash after execution.' }
  ],
  assessment: 'The fallback is appropriate for diagnosing the observed precollection worker handshake failures once its target and pin guards are tightened. It does not relax assertions or test execution budgets. A test pass remains meaningful under the original explicit 15/60-second deadlines.',
  executionStatus: 'Reviewer did not load or execute the hook, run the grace runner, or run any suite.',
  reviewerWrites: 'Scratch review-work only; no repository, protected test, or installed package mutations.'
};
const out = path.join(__dirname, 'vitest-startup-grace-review.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: out, installedSha256: report.installedSha256, archivedOriginalSha256: report.archivedOriginalSha256, archiveByteEqualsInstalled: report.archiveByteEqualsInstalled, plannedInMemorySha256: report.plannedInMemorySha256, independentlyVerifiedExactTwoEditInverse: report.independentlyVerifiedExactTwoEditInverse }));
