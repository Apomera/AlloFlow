const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib'), cp = require('child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-view-chooser-2026-10-06');
const prior = path.join(repo, 'reports/dissection-study-chooser-2026-10-05');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const baseline = readJson(path.join(report, 'workspace-before.json'));
const failures = [];
const verify = (condition, message) => { if (!condition) failures.push(message); return !!condition; };
function reverseReceipt(file, receiptFile, baselineFile, expectedHash) {
  const current = fs.readFileSync(path.join(repo, file));
  const receipt = readJson(path.join(report, 'edits', receiptFile));
  const currentHash = hash(current);
  const pinnedHashMatches = verify(currentHash === expectedHash, file + ': current hash differs from parent pin');
  const receiptHashMatches = verify(currentHash === receipt.afterSha256, file + ': receipt after hash differs');
  let inverse = current.toString('utf8');
  const edits = [];
  for (const [index, edit] of receipt.edits.slice().reverse().entries()) {
    const after = edit.after === undefined ? edit.new : edit.after;
    const before = edit.before === undefined ? edit.old : edit.before;
    const occurrences = inverse.split(after).length - 1;
    verify(occurrences === 1, file + ': inverse edit ' + index + ' has ' + occurrences + ' occurrences');
    if (occurrences === 1) inverse = inverse.replace(after, before);
    edits.push({name: edit.name || index, unique: occurrences === 1});
  }
  const recovered = Buffer.from(inverse, 'utf8');
  const original = zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits', baselineFile)));
  const recoveredHash = hash(recovered);
  return {
    file, currentHash, pinnedHashMatches, receiptHashMatches, edits,
    exactBaselineBytes: verify(recovered.equals(original), file + ': inverse differs from gzip baseline'),
    recoveredSha256: recoveredHash, gzipBaselineSha256: hash(original),
    receiptBeforeHashMatches: verify(recoveredHash === receipt.beforeSha256, file + ': inverse before hash differs'),
  };
}
const sourceHash = '6b5c426f6e2f4d0545dfccce713b0a0457547b5384e33fb911e09a296f071354';
const canonical = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'));
const mirror = fs.readFileSync(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
const source = reverseReceipt('stem_lab/stem_tool_dissection.js', 'renderer-edits.json', 'renderer-baseline.js.gz', sourceHash);
const unit = reverseReceipt('tests/dissection_lab_improvements.test.js', 'unit-edits.json', 'unit-baseline.js.gz', 'fa0e8392e9984aefa62658bbf9a7a68eb55bac19dced5ae294e13897c9ec35fb');
const browser = reverseReceipt('tests/e2e/dissection-view-chooser.spec.ts', 'browser-fixture-edits.json', 'browser-fixture-initial.ts.gz', '81f8f90725f510092b8a20468175be7862bda9d93c5afbb16a07240a5bb2c614');
const protectedFiles = Object.entries(baseline.unchanged).map(([file, expectedSha256]) => {
  const actualSha256 = hash(fs.readFileSync(path.join(repo, file)));
  return {file, expectedSha256, actualSha256, unchanged: verify(actualSha256 === expectedSha256, 'Protected input changed: ' + file)};
});
verify(protectedFiles.length === 8, 'Protected input count differs from eight');
const manifestBytes = fs.readFileSync(path.join(prior, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
verify(manifest.entries.length === 213, 'Prior Study manifest entry count differs from 213');
const priorReportEntries = manifest.entries.map((entry) => {
  const file = path.resolve(prior, entry.file);
  if (!file.startsWith(path.resolve(prior) + path.sep)) throw Error('Manifest path escapes prior report');
  const bytes = fs.readFileSync(file);
  const actualSha256 = hash(bytes);
  return {
    file: entry.file, expectedBytes: entry.bytes, actualBytes: bytes.length,
    expectedSha256: entry.sha256, actualSha256,
    unchanged: verify(bytes.length === entry.bytes && actualSha256 === entry.sha256, 'Prior Study report entry changed: ' + entry.file),
  };
});
const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding: 'utf8'}).trim();
const stagedPaths = cp.execFileSync('git', ['diff', '--cached', '--name-only'], {cwd: repo, encoding: 'utf8'}).trim();
const result = {
  scope: 'Independent read-only source, receipt, protected-input and prior-report preservation review',
  writes: 'Owned scratch helper and review JSON only', suitesRun: false,
  source, unit, browser,
  mirror: {sha256: hash(mirror), exactCanonicalBytes: verify(mirror.equals(canonical), 'Source mirror differs'), finalHashMatches: verify(hash(mirror) === sourceHash, 'Mirror hash differs from final pin')},
  protectedFiles, priorStudyReport: {manifestSha256: hash(manifestBytes), entries: priorReportEntries},
  git: {head, headUnchanged: verify(head === baseline.head, 'HEAD changed'), stagedPaths, stagedPathsUnchanged: verify(stagedPaths === baseline.stagedPaths, 'Staged paths changed')},
  failures, passed: failures.length === 0,
};
fs.writeFileSync(path.join(__dirname, 'view-preservation-review.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, exactSourceInverse: source.exactBaselineBytes, exactUnitInverse: unit.exactBaselineBytes, exactBrowserInverse: browser.exactBaselineBytes, sourceMirror: result.mirror.exactCanonicalBytes, protectedInputs: protectedFiles.length, preservedStudyEntries: priorReportEntries.length, headUnchanged: result.git.headUnchanged, stagedPathsUnchanged: result.git.stagedPathsUnchanged, failures}));
process.exitCode = result.passed ? 0 : 1;
