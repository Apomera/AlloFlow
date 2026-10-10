const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const repo = path.resolve(__dirname, '../../..');
const file = path.join(repo, 'tests/dissection_lab_improvements.test.js');
const before = fs.readFileSync(file);
const archived = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'unit-before.js.gz')));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const expected = '08cb55c2f066d37e198a055ebb19518c325194994b41fd1e0afa1b3d552ee8da';
if (hash(before) !== expected || !before.equals(archived)) throw new Error('Unit baseline differs');
const text = before.toString('utf8');
const newline = text.includes('\r\n') ? '\r\n' : '\n';
const assertionBefore = "    expect(html).toContain('Prepare next');";
const assertionAfter = [
  "    const planningMonitorAction = guidedDocument.querySelector('.diss-stage__telemetry-prepare');",
  "    expect(planningMonitorAction.textContent).toBe('Review plan');",
  "    expect(planningMonitorAction.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');",
].join(newline);
if (text.split(assertionBefore).length !== 2) throw new Error('Obsolete assertion is not unique');
const revised = text.replace(assertionBefore, assertionAfter);
const insertionPoint = revised.lastIndexOf(newline + '});');
if (insertionPoint < 0 || !/^\r?\n\}\);\s*$/.test(revised.slice(insertionPoint))) throw new Error('Unexpected final describe closure');
const added = fs.readFileSync(path.join(__dirname, 'unit-addition.js'), 'utf8').replace(/\r?\n/g, newline);
const after = Buffer.from(revised.slice(0, insertionPoint) + newline + added + revised.slice(insertionPoint));
const inserted = Buffer.from(newline + added);
const byteOffset = Buffer.byteLength(revised.slice(0, insertionPoint));
const removed = Buffer.concat([after.subarray(0, byteOffset), after.subarray(byteOffset + inserted.length)]).toString('utf8');
if (removed.split(assertionAfter).length !== 2) throw new Error('Revised assertion is not unique');
const reversed = Buffer.from(removed.replace(assertionAfter, assertionBefore));
if (!reversed.equals(before)) throw new Error('Reversal differs from original');
fs.writeFileSync(file, after);
const receipt = {
  baseline: expected, current: hash(after), addition: hash(fs.readFileSync(path.join(__dirname, 'unit-addition.js'))),
  newline, assertionEdit: { before: assertionBefore, after: assertionAfter },
  insertionByteOffset: byteOffset, insertedBytes: inserted.length,
  originalBytesPreserved: reversed.equals(archived), namedCases: 10, testsRun: false,
};
fs.writeFileSync(path.join(__dirname, 'unit-edit.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
