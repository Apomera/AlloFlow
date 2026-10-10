const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'unit-edits.json'), 'utf8'));
const candidate = fs.readFileSync(path.join(__dirname, 'unit-next.js'));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
let inverse = candidate.toString('utf8');
for (const edit of [...receipt.edits].reverse()) {
  const offset = inverse.indexOf(edit.after);
  if (offset < 0 || inverse.indexOf(edit.after, offset + 1) >= 0) throw new Error('Inverse context is missing or ambiguous.');
  inverse = inverse.slice(0, offset) + edit.before + inverse.slice(offset + edit.after.length);
}
const live = fs.readFileSync('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/dissection_lab_improvements.test.js');
const result = {
  beforeSha256: receipt.beforeSha256,
  candidateSha256: hash(candidate),
  receiptMatchesCandidate: hash(candidate) === receipt.afterSha256,
  inverseMatchesBaseline: hash(Buffer.from(inverse)) === receipt.beforeSha256,
  liveMatchesBaseline: hash(live) === receipt.beforeSha256,
  legacyCaseCount: (candidate.toString('utf8').match(/it\('labels a legacy completed action/g) || []).length,
  reflectionCaseCount: (candidate.toString('utf8').match(/it\('follows the native reflection gate/g) || []).length,
  containsNativeSummaryClick: candidate.toString('utf8').includes("roadmap.querySelector('summary').click()"),
  suiteExecuted: false,
};
console.log(JSON.stringify(result, null, 2));
if (!result.receiptMatchesCandidate || !result.inverseMatchesBaseline || !result.liveMatchesBaseline) process.exitCode = 1;
