const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = 'tests/dissection_canvas_loop.test.js';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const expected = 'b31bbe5cc07efe789e0b2262d12441366c3425966f2e804ad818513a6d22e5ca';
const baseline = fs.readFileSync(path.join(repo, file));
if (sha(baseline) !== expected) throw Error('Canvas assertion baseline hash changed');
const edits = [
  {before: "setProcedureFeedback\\('Timed practical expired\\.", after: "setProcedureFeedback\\('The 4-minute technique challenge expired\\."},
  {before: "cancelActiveCanvasGesture\\('Timed practical expired;", after: "cancelActiveCanvasGesture\\('The 4-minute technique challenge expired;"},
];
let next = baseline.toString();
for (const edit of edits) {
  if (next.split(edit.before).length !== 2) throw Error('Assertion prefix is not unique');
  next = next.replace(edit.before, () => edit.after);
}
let inverse = next;
for (const edit of edits.slice().reverse()) {
  if (inverse.split(edit.after).length !== 2) throw Error('Inverse assertion prefix is not unique');
  inverse = inverse.replace(edit.after, () => edit.before);
}
if (!Buffer.from(inverse).equals(baseline)) throw Error('Exact inverse bytes failed');
require(path.join(repo, 'node_modules/esbuild')).transformSync(next, {loader: 'js', format: 'esm'});
const receipt = {file, beforeSha256: sha(baseline), afterSha256: sha(next), edits, exactReversal: true, syntax: 'passed', assertionOnly: true, preserved: ['remaining === 0 guard', 'caution severity', 'cancelActiveCanvasGesture semantics', 'all other bytes'], repositoryWrites: false, suitesRun: false};
fs.writeFileSync(path.join(__dirname, 'canvas-loop-next.js'), next);
fs.writeFileSync(path.join(__dirname, 'canvas-loop-baseline.js.gz'), zlib.gzipSync(baseline));
fs.writeFileSync(path.join(__dirname, 'canvas-loop-edits.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
