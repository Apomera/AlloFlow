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
    before: '          function stopProcedureReplay(restoreFocus, quiet) {',
    after: "          function returnProcedureReplayFocus(replay) {\n            var root = currentDissectionRootNode();\n            var techniquePanel = scopedDissectionQuery(root, '#diss-procedure-panel');\n            var targetId = techniquePanel && !techniquePanel.open ? 'diss-procedure-summary' : replay.returnFocusId || 'diss-replay-attempt';\n            focusDissectionTarget(targetId, null, root);\n          }\n          function stopProcedureReplay(restoreFocus, quiet) {"
  },
  {
    before: "            if (restoreFocus) focusDissectionTarget(replay.returnFocusId || 'diss-replay-attempt');",
    after: '            if (restoreFocus) returnProcedureReplayFocus(replay);'
  },
  {
    before: "              if (returnFocus) focusDissectionTarget(current.returnFocusId || 'diss-replay-attempt');",
    after: '              if (returnFocus) returnProcedureReplayFocus(current);'
  }
];
for (const edit of edits) {
  if (source.split(edit.before).length !== 2) throw Error('Nonunique edit');
  source = source.replace(edit.before, edit.after); record.edits.push(edit);
}
new (require('node:vm').Script)(source);
for (const target of [file, path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js')]) {
  const temp = target + '.replay-review.tmp'; fs.writeFileSync(temp, source); fs.renameSync(temp, target);
}
record.after = hash(source);
fs.writeFileSync(path.join(report, 'edits/source-edits.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ source: record.after, edits: record.edits.length }));
