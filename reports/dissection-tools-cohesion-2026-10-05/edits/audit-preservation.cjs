const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-tools-cohesion-2026-10-05');
const previousReport = path.join(repo, 'reports/dissection-capture-clarity-2026-10-05');
const output = path.join(__dirname, 'tools-preservation-review.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const reportRead = relative => fs.readFileSync(path.join(report, relative));
const json = relative => JSON.parse(reportRead(relative));
const git = args => execFileSync('git', ['--no-optional-locks', ...args], {
  cwd: repo, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
});
const findings = [];
const check = (name, passed, detail) => {
  if (!passed) findings.push({ name, detail });
  return { passed, ...detail };
};
const files = {
  canonical: 'stem_lab/stem_tool_dissection.js',
  mirror: 'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
  unit: 'tests/dissection_lab_improvements.test.js',
  browser: 'tests/e2e/dissection-tools-cohesion.spec.ts'
};
const expected = {
  source: 'e7fb104c826f70b0af9478fab307cc8015bf7e42813749d3ec74f6b1254110b1',
  unit: 'c76e7143e72284ad3d71ad731eaa9498007441f2d4c31d3baa8f95163f3d006f'
};
const startedAt = new Date().toISOString();
const inputBytes = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const inputReceipts = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, {
  file, bytes: inputBytes[key].length, sha256: sha(inputBytes[key])
}]));
const ownership = check('Current canonical, public mirror, and unit match requested hashes',
  inputReceipts.canonical.sha256 === expected.source &&
  inputReceipts.mirror.sha256 === expected.source &&
  inputBytes.canonical.equals(inputBytes.mirror) &&
  inputReceipts.unit.sha256 === expected.unit,
  { expected, inputs: inputReceipts, sourceMirrorBytesEqual: inputBytes.canonical.equals(inputBytes.mirror) });

function reverseEdits(receiptFile, baselineFile, currentBytes) {
  const receiptBytes = reportRead(receiptFile);
  const receipt = JSON.parse(receiptBytes);
  const compressed = reportRead(baselineFile);
  const baseline = zlib.gunzipSync(compressed);
  let candidate = currentBytes.toString('utf8');
  const edits = [];
  for (const edit of receipt.edits.slice().reverse()) {
    const expectedOccurrences = edit.occurrences || 1;
    const actualOccurrences = candidate.split(edit.after).length - 1;
    const passed = actualOccurrences === expectedOccurrences;
    check('Inverse edit occurrence count', passed, {
      receiptFile, name: edit.name, expectedOccurrences, actualOccurrences
    });
    edits.push({ name: edit.name, expectedOccurrences, actualOccurrences, passed });
    if (!passed) break;
    candidate = candidate.split(edit.after).join(edit.before);
  }
  const reconstructed = Buffer.from(candidate, 'utf8');
  const baselineSha256 = sha(baseline);
  const currentSha256 = sha(currentBytes);
  const reconstructedSha256 = sha(reconstructed);
  return check('Inverse edits reconstruct exact gzip baseline',
    edits.length === receipt.edits.length && edits.every(e => e.passed) &&
    reconstructed.equals(baseline) && receipt.beforeSha256 === baselineSha256 &&
    receipt.afterSha256 === currentSha256,
    {
      receiptFile, receiptSha256: sha(receiptBytes), baselineFile,
      compressedBytes: compressed.length, compressedSha256: sha(compressed),
      baselineBytes: baseline.length, baselineSha256,
      currentBytes: currentBytes.length, currentSha256,
      receiptBeforeSha256: receipt.beforeSha256, receiptAfterSha256: receipt.afterSha256,
      reconstructedBytes: reconstructed.length, reconstructedSha256,
      exactBytesEqual: reconstructed.equals(baseline), edits
    });
}
const sourceReversal = reverseEdits('edits/renderer-edits.json', 'edits/renderer-baseline.js.gz', inputBytes.canonical);
const unitReversal = reverseEdits('edits/unit-edits.json', 'edits/unit-baseline.js.gz', inputBytes.unit);
const workspaceBytes = reportRead('workspace-before.json');
const workspace = JSON.parse(workspaceBytes);
const unchangedInputs = Object.entries(workspace.unchanged).map(([file, expectedSha256]) => {
  const bytes = read(file);
  return check('Protected workspace input unchanged', sha(bytes) === expectedSha256,
    { file, bytes: bytes.length, expectedSha256, sha256: sha(bytes) });
});
const manifestPath = path.join(previousReport, 'manifest.json');
const previousManifestBytes = fs.readFileSync(manifestPath);
const previousManifest = JSON.parse(previousManifestBytes);
const previousEntries = previousManifest.entries.map(entry => {
  const resolved = path.resolve(previousReport, entry.file);
  const pathWithinReport = resolved.startsWith(path.resolve(previousReport) + path.sep);
  if (!pathWithinReport || !fs.existsSync(resolved)) {
    return check('Previous capture report entry preserved', false, {
      file: entry.file, expectedBytes: entry.bytes, expectedSha256: entry.sha256,
      pathWithinReport, exists: fs.existsSync(resolved)
    });
  }
  const bytes = fs.readFileSync(resolved);
  return check('Previous capture report entry preserved', bytes.length === entry.bytes && sha(bytes) === entry.sha256,
    { file: entry.file, expectedBytes: entry.bytes, bytes: bytes.length,
      expectedSha256: entry.sha256, sha256: sha(bytes) });
});
const previousReportPreservation = check('All 411 previous capture report entries preserved',
  previousEntries.length === 411 && previousEntries.every(entry => entry.passed), {
    report: path.relative(repo, previousReport).replace(/\\/g, '/'),
    algorithm: previousManifest.algorithm, expectedCount: 411, entryCount: previousEntries.length,
    manifestBytes: previousManifestBytes.length, manifestSha256: sha(previousManifestBytes),
    totalBytes: previousEntries.reduce((total, entry) => total + (entry.bytes || 0), 0),
    matchedEntries: previousEntries.filter(entry => entry.passed).length,
    entries: previousEntries
  });
const topLevel = git(['rev-parse', '--show-toplevel']).trim();
const stagedPaths = git(['diff', '--cached', '--name-only']);
const staging = check('Staged paths unchanged and repository identity verified',
  stagedPaths === workspace.stagedPaths && path.resolve(topLevel).toLowerCase() === path.resolve(repo).toLowerCase(),
  { topLevel, expectedStagedPaths: workspace.stagedPaths, currentStagedPaths: stagedPaths,
    workspaceBeforeSha256: sha(workspaceBytes) });
const stable = check('Audit inputs remained stable during verification',
  Object.entries(files).every(([key, file]) => inputBytes[key].equals(read(file))) &&
  workspaceBytes.equals(reportRead('workspace-before.json')) &&
  previousManifestBytes.equals(fs.readFileSync(manifestPath)),
  { ownedInputs: Object.values(files), workspaceBeforeUnchanged: workspaceBytes.equals(reportRead('workspace-before.json')),
    previousManifestUnchanged: previousManifestBytes.equals(fs.readFileSync(manifestPath)) });
const result = {
  startedAt, finishedAt: new Date().toISOString(),
  scope: 'Independent read-only preservation audit; exact inverse edit reconstruction, protected input hashes, previous capture report hashes, and read-only Git staging inspection.',
  repository: repo, currentReport: path.relative(repo, report).replace(/\\/g, '/'),
  passed: findings.length === 0, actionableIssues: findings,
  sourceWrites: false, repositoryWrites: false, suitesRun: false, browserActions: false,
  ownership, sourceReversal, unitReversal, unchangedInputs, previousReportPreservation, staging, stable
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  output, outputSha256: sha(fs.readFileSync(output)), passed: result.passed,
  actionableIssues: findings, currentHashes: inputReceipts,
  sourceInverseExact: sourceReversal.exactBytesEqual,
  unitInverseExact: unitReversal.exactBytesEqual,
  protectedInputsMatched: unchangedInputs.filter(entry => entry.passed).length,
  previousReportEntriesMatched: previousReportPreservation.matchedEntries,
  stagedPathsUnchanged: staging.passed
}));
process.exitCode = result.passed ? 0 : 1;
