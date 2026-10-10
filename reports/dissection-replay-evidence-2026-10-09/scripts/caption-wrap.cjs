const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-evidence-2026-10-09');
const sourcePath = path.join(repo, 'stem_lab/stem_tool_dissection.js');
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
let source = fs.readFileSync(sourcePath, 'utf8');
const record = JSON.parse(fs.readFileSync(path.join(report, 'edits/source-edits.json'), 'utf8'));
if (hash(source) !== record.after) throw Error('Source drift');
function edit(before, after) {
  if (source.split(before).length !== 2) throw Error('Nonunique edit');
  source = source.replace(before, after); record.edits.push({ before, after });
}
edit('var replayLabelWidth = Math.min(W - 28, Math.max(180,', 'var replayLabelWidth = Math.min(canvasDisplayWidth < 480 ? W * 0.48 : W - 28, Math.max(180,');
edit('                  replayLabelWidth, replayLabelHeight, sharedHudReservations);', `                  replayLabelWidth, replayLabelHeight, sharedHudReservations.concat(canvas._guidanceBoxes.map(function (box) {
                    return { x: box.x, y: box.y, width: box.width, height: box.height, priority: 8 };
                  })));`);
new (require('node:vm').Script)(source);
fs.writeFileSync(sourcePath, source);
fs.writeFileSync(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'), source);
record.after = hash(source);
fs.writeFileSync(path.join(report, 'edits/source-edits.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ source: record.after, edits: record.edits.length }));
