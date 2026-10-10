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
edit("if (detailedCanvasHud) sharedHudReservations.push({ x: W - 232, y: 10, width: 218, height: 58 * canvasHudScale, priority: 9 });", "if (detailedCanvasHud) sharedHudReservations.push({ id: 'procedure-handoff', x: W - 232, y: 10, width: 218, height: 58 * canvasHudScale, priority: 9 });");
edit('                  replayLabelWidth, replayLabelHeight, sharedHudReservations.concat(canvas._guidanceBoxes.map(function (box) {', `                  replayLabelWidth, replayLabelHeight, sharedHudReservations.filter(function (box) {
                    // Independent replay has no next-step card occupying this corner.
                    return box.id !== 'procedure-handoff' || (procedureMode === 'guided' && instrumentVisuals);
                  }).concat(canvas._guidanceBoxes.map(function (box) {`);
new (require('node:vm').Script)(source);
function writeSource(target) {
  const absolute = path.resolve(target), root = path.resolve(repo) + path.sep;
  if (!absolute.startsWith(root) || path.basename(absolute) !== 'stem_tool_dissection.js') throw Error('Invalid write target');
  const temporary = absolute + '.replay-caption.tmp';
  fs.writeFileSync(temporary, source);
  fs.renameSync(temporary, absolute);
}
writeSource(sourcePath);
writeSource(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
record.after = hash(source);
fs.writeFileSync(path.join(report, 'edits/source-edits.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ source: record.after, edits: record.edits.length }));
