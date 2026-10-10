const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = path.join(repo, 'tests/e2e/dissection-replay-review.spec.ts');
const report = path.join(repo, 'reports/dissection-replay-review-2026-10-09');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let source = fs.readFileSync(file, 'utf8');
if (hash(source) !== '45644a078bd24cbab1dab00c973b18baf6254a90f9a78602fae6f7a768a6eb1c') throw Error('Fixture drift');
const beforeHash = hash(source);
const edits = [
  { before: "const out = process.env.DISSECTION_REPLAY_REVIEW_OUTPUT || 'test-results/dissection-replay-review';", after: "const out = process.env.DISSECTION_REPLAY_REVIEW_OUTPUT || 'test-results/dissection-replay-review';\n// pauseAt fast-forwards to this target; the lead accommodates slow browser RPC delivery.\nconst clockPauseLeadMs = 60_000;" },
  { before: 'page.clock.pauseAt(new Date(epoch + 1000))', after: 'page.clock.pauseAt(new Date(epoch + clockPauseLeadMs))' },
  { before: 'page.clock.pauseAt(new Date(auditEndedAt + 100))', after: 'page.clock.pauseAt(new Date(auditEndedAt + clockPauseLeadMs))' }
];
for (const edit of edits) {
  if (source.split(edit.before).length !== 2) throw Error('Nonunique fixture edit');
  source = source.replace(edit.before, edit.after);
}
const temp = file + '.replay-review.tmp'; fs.writeFileSync(temp, source); fs.renameSync(temp, file);
fs.writeFileSync(path.join(report, 'edits/fixture-clock-edit.json'), JSON.stringify({ before: beforeHash, after: hash(source), edits, purpose: 'Avoid racing a resumed browser clock during RPC delay. Paused replay and all native lifecycle assertions stay intact.' }, null, 2) + '\n');
console.log(JSON.stringify({ fixture: hash(source), edits: edits.length }));
