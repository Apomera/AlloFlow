const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const candidatePath = path.join(__dirname, 'unit-next.js');
const receiptPath = path.join(__dirname, 'unit-edits.json');
const expectedCandidate = '3dd0b7306ccb79d313a21f6f8ce068b31dce8d8d50682314a3f9a8d151b6fede';
const expectedBaseline = 'e2468a2b7e90db503e29ca3ae5c4c4d29f663e2c61de2c875ea1a9116b3eaba1';
const candidateBytes = fs.readFileSync(candidatePath);
if (hash(candidateBytes) !== expectedCandidate) throw new Error('Candidate hash changed; refusing fixture correction.');
const candidate = candidateBytes.toString('utf8');
const previousReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
if (previousReceipt.beforeSha256 !== expectedBaseline || previousReceipt.afterSha256 !== expectedCandidate) throw new Error('Receipt does not match the expected baseline and candidate.');
function invert(text, edits) {
  for (const edit of [...edits].reverse()) {
    const offset = text.indexOf(edit.after);
    if (offset < 0 || text.indexOf(edit.after, offset + 1) >= 0) throw new Error('Inverse edit context missing or ambiguous.');
    text = text.slice(0, offset) + edit.before + text.slice(offset + edit.after.length);
  }
  return text;
}
const baseline = invert(candidate, previousReceipt.edits);
if (hash(Buffer.from(baseline)) !== expectedBaseline) throw new Error('Original cumulative receipt does not restore the exact baseline.');
const before = "['timed practical', { practicalMode: true }]";
const after = "['timed practical', { practicalMode: true, quizMode: true }]";
const offset = candidate.indexOf(before);
if (offset < 0 || candidate.indexOf(before, offset + 1) >= 0) throw new Error('Timed practical fixture missing or ambiguous.');
const next = candidate.slice(0, offset) + after + candidate.slice(offset + before.length);
if (next.replace(after, before) !== candidate) throw new Error('Correction changes more than the timed practical fixture.');
let replacedReceiptContexts = 0;
const cumulativeEdits = previousReceipt.edits.map((edit) => {
  const contextOffset = edit.after.indexOf(before);
  if (contextOffset < 0) return edit;
  if (edit.after.indexOf(before, contextOffset + 1) >= 0) throw new Error('Fixture ambiguous within cumulative context.');
  replacedReceiptContexts += 1;
  return { ...edit, after: edit.after.slice(0, contextOffset) + after + edit.after.slice(contextOffset + before.length) };
});
if (replacedReceiptContexts !== 1) throw new Error('Expected exactly one cumulative context correction.');
if (invert(next, cumulativeEdits) !== baseline) throw new Error('Corrected cumulative receipt does not restore the exact baseline.');
const nextHash = hash(Buffer.from(next));
const cumulativeReceipt = { ...previousReceipt, afterSha256: nextHash, edits: cumulativeEdits };
const correctionReceipt = { file: previousReceipt.file, beforeSha256: expectedCandidate, afterSha256: nextHash, edits: [{ before, after }], inverseVerified: true, cumulativeBaselineSha256: expectedBaseline, suiteExecuted: false, appliedToRepository: false };
fs.writeFileSync(path.join(__dirname, 'unit-practical-fixture-correction.json'), JSON.stringify(correctionReceipt, null, 2) + '\n');
fs.writeFileSync(candidatePath, next, 'utf8');
fs.writeFileSync(receiptPath, JSON.stringify(cumulativeReceipt, null, 2) + '\n');
console.log(JSON.stringify({ beforeSha256: expectedCandidate, afterSha256: nextHash, cumulativeBaselineSha256: expectedBaseline, inverseVerified: true, onlyTimedPracticalFixtureChanged: true, retainedCases: 21, suiteExecuted: false, appliedToRepository: false }, null, 2));
