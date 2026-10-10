const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-review-2026-10-09');
const file = path.join(repo, 'stem_lab/stem_tool_dissection.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let source = fs.readFileSync(file, 'utf8');
const record = JSON.parse(fs.readFileSync(path.join(report, 'edits/source-edits.json'), 'utf8'));
if (hash(source) !== record.after) throw Error('Source drift');
const edits = [
  {
    before: '          var activeReplayPosition = procedureReplayPosition(activeProcedureReplay, Date.now());',
    after: '          var activeReplayPosition = procedureReplayPosition(activeProcedureReplay, Date.now());\n          // Keep focused controls mounted until the owned completion timer clears the review.\n          var replayReviewVisible = activeReplayPosition.active || activeReplayPosition.elapsed > 0;'
  },
  {
    before: '!d.quizMode && activeProcedureReplay && activeReplayPosition.active && React.createElement("section", { id: "diss-replay-review",',
    after: '!d.quizMode && activeProcedureReplay && replayReviewVisible && React.createElement("section", { id: "diss-replay-review",'
  }
];
for (const edit of edits) {
  if (source.split(edit.before).length !== 2) throw Error('Nonunique edit');
  source = source.replace(edit.before, edit.after);
  record.edits.push(edit);
}
new (require('node:vm').Script)(source);
for (const target of [file, path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js')]) {
  const temp = target + '.replay-review.tmp'; fs.writeFileSync(temp, source); fs.renameSync(temp, target);
}
record.after = hash(source);
fs.writeFileSync(path.join(report, 'edits/source-edits.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ source: record.after, edits: record.edits.length }));
