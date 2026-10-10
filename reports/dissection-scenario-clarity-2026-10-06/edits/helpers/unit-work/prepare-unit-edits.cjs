const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), zlib = require('zlib');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = 'tests/dissection_lab_improvements.test.js';
const repositoryUnit = fs.readFileSync(path.join(repo, file), 'utf8');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const expected = 'fa0e8392e9984aefa62658bbf9a7a68eb55bac19dced5ae294e13897c9ec35fb';
const before = sha(repositoryUnit) === expected ? repositoryUnit : zlib.gunzipSync(fs.readFileSync(path.join(repo, 'reports/dissection-scenario-clarity-2026-10-06/edits/unit-baseline.js.gz'))).toString('utf8');
if (sha(before) !== expected) throw Error('Unit baseline hash differs');
const rawFragment = fs.readFileSync(path.join(__dirname, 'scenario-unit-fragment.js'), 'utf8');
new vm.Script(rawFragment);
const eol = before.includes('\r\n') ? '\r\n' : '\n';
const fragment = rawFragment.replace(/\r?\n/g, eol);
const anchor = '  function studyChooserWorkProof';
const edits = [
  {name: 'Native mounted scenario session contracts', before: anchor, after: fragment + anchor},
  {name: 'Disambiguate existing four-minute scenario assertion', before: "    expect(timedHtml).toContain('Timed practical');", after: "    expect(timedHtml).toContain('4-minute technique challenge');"},
  {name: 'Describe native remaining time in the existing scenario assertion', before: "    expect(timedHtml).toContain('2:05 remaining');", after: "    expect(timedHtml).toContain('2 minutes 5 seconds remaining');"},
];
let next = before;
for (const edit of edits) {
  if (next.split(edit.before).length !== 2) throw Error('Edit anchor not unique: ' + edit.name);
  next = next.replace(edit.before, () => edit.after);
}
const esbuild = require(path.join(repo, 'node_modules/esbuild'));
esbuild.transformSync(next, {loader: 'js', format: 'esm'});
let inverse = next;
for (const edit of edits.slice().reverse()) {
  if (inverse.split(edit.after).length !== 2) throw Error('Inverse anchor not unique: ' + edit.name);
  inverse = inverse.replace(edit.after, () => edit.before);
}
if (inverse !== before) throw Error('Inverse differs from baseline bytes');
const receipt = {file, beforeSha256: expected, afterSha256: sha(next), edits, exactReversal: true, syntax: 'passed', repositoryWrites: false, suitesRun: false};
fs.writeFileSync(path.join(__dirname, 'unit-next.js'), next);
fs.writeFileSync(path.join(__dirname, 'unit-edits.json'), JSON.stringify(receipt, null, 2) + '\n');
const incrementalFile = path.join(__dirname, 'unit-incremental-baseline.js.gz');
if (fs.existsSync(incrementalFile)) {
  const incrementalBefore = zlib.gunzipSync(fs.readFileSync(incrementalFile)).toString('utf8');
  if (sha(incrementalBefore) !== '6f60ad34fc3150f394ac1302865550b74376399cbb7ddd284add571320a091f9') throw Error('Incremental baseline differs');
  let first = 0;
  while (first < Math.min(incrementalBefore.length, next.length) && incrementalBefore[first] === next[first]) first++;
  const start = incrementalBefore.lastIndexOf('\n', first - 1) + 1;
  let tail = 0;
  while (tail < Math.min(incrementalBefore.length - start, next.length - start) && incrementalBefore[incrementalBefore.length - 1 - tail] === next[next.length - 1 - tail]) tail++;
  const incrementalEdit = {name: 'Reject stale Cancel and Escape callbacks without dismissing the current review', before: incrementalBefore.slice(start, incrementalBefore.length - tail), after: next.slice(start, next.length - tail)};
  if (incrementalBefore.split(incrementalEdit.before).length !== 2 || next.split(incrementalEdit.after).length !== 2) throw Error('Incremental edit not unique');
  if (incrementalBefore.replace(incrementalEdit.before, () => incrementalEdit.after) !== next || next.replace(incrementalEdit.after, () => incrementalEdit.before) !== incrementalBefore) throw Error('Incremental byte reversal differs');
  fs.writeFileSync(path.join(__dirname, 'unit-incremental-edits.json'), JSON.stringify({file, beforeSha256: sha(incrementalBefore), afterSha256: sha(next), edits: [incrementalEdit], exactReversal: true, syntax: 'passed', repositoryWrites: false, suitesRun: false}, null, 2) + '\n');
}
console.log(JSON.stringify({file, beforeSha256: expected, afterSha256: receipt.afterSha256, exactReversal: true, syntax: 'passed', repositoryWrites: false, suitesRun: false}));
