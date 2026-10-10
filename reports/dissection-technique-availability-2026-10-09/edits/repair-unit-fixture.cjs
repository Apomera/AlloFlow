const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const repo = path.resolve(__dirname, '../../..');
const file = path.join(repo, 'tests/dissection_lab_improvements.test.js');
const current = fs.readFileSync(file);
const original = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'unit-before.js.gz')));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'unit-edit.json'), 'utf8'));
if (hash(current) !== 'd3c28ebceded52a01816f1d0aca3150446cfc8cdef5dd0ce090341228fc81384') throw new Error('Unexpected current unit contents');
const reversedCurrent = Buffer.concat([current.subarray(0, receipt.insertionByteOffset), current.subarray(receipt.insertionByteOffset + receipt.insertedBytes)]);
if (!reversedCurrent.equals(original)) throw new Error('Current original bytes changed');
const text = original.toString('utf8');
const newline = text.includes('\r\n') ? '\r\n' : '\n';
const index = text.lastIndexOf(newline + '});');
const added = fs.readFileSync(path.join(__dirname, 'unit-addition.js'), 'utf8').replace(/\r?\n/g, newline);
const after = Buffer.from(text.slice(0, index) + newline + added + text.slice(index));
const inserted = Buffer.from(newline + added);
const offset = Buffer.byteLength(text.slice(0, index));
const reversed = Buffer.concat([after.subarray(0, offset), after.subarray(offset + inserted.length)]);
if (!reversed.equals(original)) throw new Error('Revised original bytes changed');
fs.writeFileSync(file, after);
const next = {
  baseline: hash(original), previous: hash(current), current: hash(after),
  addition: hash(fs.readFileSync(path.join(__dirname, 'unit-addition.js'))),
  insertionByteOffset: offset, insertedBytes: inserted.length, originalBytesPreserved: true,
  namedCases: 10, testsRunAfterCorrection: false,
  correction: 'Seed existing normalized tissue metadata in the final-reflection fixture; retain exact physical-state preservation checks and assert the reviewed accessible name.',
};
fs.writeFileSync(path.join(__dirname, 'unit-edit.json'), JSON.stringify(next, null, 2) + '\n');
console.log(JSON.stringify(next));
