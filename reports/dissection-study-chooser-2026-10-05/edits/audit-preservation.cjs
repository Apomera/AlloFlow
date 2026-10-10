const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const cp = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-study-chooser-2026-10-05');
const scratch = __dirname;
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const before = json(path.join(report, 'workspace-before.json'));
const checks = [];
const add = (name, passed, detail) => checks.push({ name, passed, detail });
const git = args => cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trimEnd();
function inverse(name, relative, receiptName, baselineName) {
  const bytes = fs.readFileSync(path.join(repo, relative));
  const receipt = json(path.join(report, 'edits', receiptName));
  const baseline = zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits', baselineName)));
  let restored = bytes.toString('utf8');
  const edits = [];
  for (let i = receipt.edits.length - 1; i >= 0; i--) {
    const edit = receipt.edits[i];
    const matches = restored.split(edit.after).length - 1;
    const expected = edit.occurrences || 1;
    if (matches !== expected) throw new Error(name + ': inverse edit ' + i + ' found ' + matches + ', expected ' + expected);
    restored = restored.split(edit.after).join(edit.before);
    edits.push({ name: edit.name || 'edit-' + i, matches });
  }
  const recovered = Buffer.from(restored, 'utf8');
  const detail = { file: relative, currentSha256: hash(bytes), receiptCurrentSha256: receipt.afterSha256,
    recoveredSha256: hash(recovered), baselineSha256: hash(baseline), receiptBaselineSha256: receipt.beforeSha256,
    recoveredBytes: recovered.length, baselineBytes: baseline.length, edits };
  add(name, hash(bytes) === receipt.afterSha256 && hash(baseline) === receipt.beforeSha256 && recovered.equals(baseline), detail);
  return bytes;
}
const canonical = inverse('Source exact inverse recovery', 'stem_lab/stem_tool_dissection.js', 'renderer-edits.json', 'renderer-baseline.js.gz');
const mirror = fs.readFileSync(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
add('Canonical/public mirror equality', canonical.equals(mirror), { canonicalSha256: hash(canonical), mirrorSha256: hash(mirror) });
const unit = inverse('Unit exact inverse recovery', 'tests/dissection_lab_improvements.test.js', 'unit-edits.json', 'unit-baseline.js.gz');
add('Unit baseline matches workspace receipt', json(path.join(report, 'edits/unit-edits.json')).beforeSha256 === before.unitBeforeSha256, { beforeSha256: before.unitBeforeSha256 });
const expectedInputs = {
  'stem_lab/stem_tool_dissection.js': '72c75cc596b0ee7307b7b7549fcd34e02cefdf9cdfb00f445bb21a26cc2dfeed',
  'tests/dissection_lab_improvements.test.js': 'f43f0a739eacc816fe11ddf96037205795b783f8dc47c59091e4e5249829130c',
  'tests/e2e/dissection-study-chooser.spec.ts': '7941e1e85ac47ec7005ac1cf529f488f7173a39079a4b811e7d3a04b8e46031e',
};
const currentInputHashes = Object.fromEntries(Object.keys(expectedInputs).map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));
add('Final requested input pins', Object.keys(expectedInputs).every(file => currentInputHashes[file] === expectedInputs[file]), currentInputHashes);
const browserReceipt = json(path.join(report, 'edits/browser-creation-receipt.json'));
const browserHash = currentInputHashes['tests/e2e/dissection-study-chooser.spec.ts'];
const browserReceiptHash = browserReceipt.sha256 || browserReceipt.afterSha256 || browserReceipt.fixtureSha256;
const finalCreationReceipt = json(path.join(scratch, 'creation-receipt.json'));
add('Final browser creation receipt hash', browserHash === finalCreationReceipt.sha256, { actual: browserHash, expected: finalCreationReceipt.sha256, original: browserReceiptHash });
const browserCorrections = fs.readdirSync(scratch).filter(name => /^browser-.*-edits\.json$/.test(name))
  .map(name => ({ ...json(path.join(scratch, name)), receiptFile: name }));
let restoredBrowser = fs.readFileSync(path.join(repo, 'tests/e2e/dissection-study-chooser.spec.ts'), 'utf8');
let restoredBrowserHash = browserHash;
const browserChain = [];
while (restoredBrowserHash !== browserReceiptHash) {
  const receipt = browserCorrections.find(item => (item.newSha256 || item.afterSha256) === restoredBrowserHash);
  if (!receipt) throw new Error('No browser correction receipt recovers ' + restoredBrowserHash);
  for (const edit of [...receipt.edits].reverse()) {
    const matches = restoredBrowser.split(edit.after).length - 1;
    if (matches !== (edit.occurrences || 1)) throw new Error('Browser correction inverse occurrence mismatch');
    restoredBrowser = restoredBrowser.split(edit.after).join(edit.before);
  }
  const recovered = hash(Buffer.from(restoredBrowser, 'utf8'));
  const expected = receipt.oldSha256 || receipt.beforeSha256;
  if (recovered !== expected) throw new Error('Browser correction inverse hash mismatch');
  browserChain.push({ receipt: receipt.receiptFile, fromSha256: restoredBrowserHash, toSha256: recovered });
  restoredBrowserHash = recovered;
  if (browserChain.length > browserCorrections.length) throw new Error('Browser receipt cycle');
}
add('Browser corrections recover original creation hash', restoredBrowserHash === browserReceiptHash, { recovered: restoredBrowserHash, original: browserReceiptHash, chain: browserChain });
const protectedInputs = Object.entries(before.unchanged).map(([file, expected]) => {
  const actual = hash(fs.readFileSync(path.join(repo, file)));
  return { file, expected, actual, passed: actual === expected };
});
add('Protected prior Dissection test inputs', protectedInputs.every(x => x.passed), { count: protectedInputs.length, inputs: protectedInputs });
const priorRoot = path.join(repo, 'reports/dissection-tools-cohesion-2026-10-05');
const priorManifest = json(path.join(priorRoot, 'manifest.json'));
const priorEntries = priorManifest.entries.map(entry => {
  try {
    const bytes = fs.readFileSync(path.join(priorRoot, entry.file));
    const actual = hash(bytes);
    return { file: entry.file, expectedSha256: entry.sha256, actualSha256: actual, bytes: bytes.length,
      passed: actual === entry.sha256 && bytes.length === entry.bytes };
  } catch (error) { return { file: entry.file, passed: false, error: error.message }; }
});
add('All previous Tools report manifest entries', priorEntries.length === 195 && priorEntries.every(x => x.passed), { count: priorEntries.length, entries: priorEntries });
const head = git(['rev-parse', 'HEAD']);
const stagedPaths = git(['diff', '--cached', '--name-only']);
add('HEAD unchanged', head === before.head, { before: before.head, current: head });
add('Staging unchanged', stagedPaths === before.stagedPaths, { before: before.stagedPaths, current: stagedPaths });
const status = git(['status', '--short', '--untracked-files=no']);
const testLines = value => value.split(/\r?\n/).filter(line => line.slice(3).startsWith('tests/')).sort();
const beforeTests = testLines(before.statusBefore);
const currentTests = testLines(status);
const statusAdded = currentTests.filter(line => !beforeTests.includes(line));
const statusRemoved = beforeTests.filter(line => !currentTests.includes(line));
const dissectionLines = values => values.filter(line => /tests\/(?:e2e\/)?dissection/.test(line));
add('Tracked Dissection test status unchanged', JSON.stringify(dissectionLines(beforeTests)) === JSON.stringify(dissectionLines(currentTests)), {
  before: dissectionLines(beforeTests), current: dissectionLines(currentTests),
  limitation: 'Status comparison detects additional tracked Dissection test changes. Exact byte preservation is independently checked for the six protected Dissection inputs and the full original scoped unit file.' });
const result = { reviewedAt: new Date().toISOString(), reviewer: 'study_preservation_review', readOnly: true,
  noSuitesRun: true, checks, passed: checks.every(x => x.passed),
  sourceAndUnitInverseVerified: checks.filter(check => /^(Source|Unit) exact inverse recovery$/.test(check.name)).every(check => check.passed),
  initialTaskInputPrefixes: { source: '72c75cc596', unit: 'f43f0a739', browser: '7673d8d528' },
  priorReportEntriesVerified: priorEntries.length, protectedInputCount: protectedInputs.length,
  sharedWorkspaceObservations: { trackedTestStatusAdded: statusAdded, trackedTestStatusRemoved: statusRemoved,
    interpretation: 'Six Universe test paths became tracked modifications during this pass. Their ownership was not established by the current handoff. The audit did not change them and does not claim whole-workspace byte stability.' } };
fs.writeFileSync(path.join(scratch, 'study-preservation-review.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, checks: checks.map(({ name, passed }) => ({ name, passed })), currentInputHashes, report: path.join(scratch, 'study-preservation-review.json') }));
if (!result.passed) process.exitCode = 1;
