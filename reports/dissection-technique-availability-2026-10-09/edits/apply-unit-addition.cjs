const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const repo = path.resolve(__dirname, '../../..');
const file = path.join(repo, 'tests/dissection_lab_improvements.test.js');
const before = fs.readFileSync(file);
const archived = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'unit-before.js.gz')));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const expected = 'e295b98f338f39924c42bf7871ee7aa2ed6663210f14e2957522dbabd0c70a97';
if (hash(before) !== expected || !before.equals(archived)) throw new Error('Unit baseline differs');
const text = before.toString('utf8');
const newline = text.includes('\r\n') ? '\r\n' : '\n';
const insertionPoint = text.lastIndexOf(newline + '});');
if (insertionPoint < 0 || !/^\r?\n\}\);\s*$/.test(text.slice(insertionPoint))) throw new Error('Unexpected final describe closure');
const added = fs.readFileSync(path.join(__dirname, 'unit-addition.js'), 'utf8').replace(/\r?\n/g, newline);
const after = Buffer.from(text.slice(0, insertionPoint) + newline + added + text.slice(insertionPoint));
const inserted = Buffer.from(newline + added);
const byteOffset = Buffer.byteLength(text.slice(0, insertionPoint));
const reversed = Buffer.concat([after.subarray(0, byteOffset), after.subarray(byteOffset + inserted.length)]);
if (!reversed.equals(before)) throw new Error('Reversal differs from original');
fs.writeFileSync(file, after);
const receipt = {
  baseline: expected, current: hash(after), addition: hash(fs.readFileSync(path.join(__dirname, 'unit-addition.js'))),
  insertionByteOffset: byteOffset, insertedBytes: inserted.length, originalBytesPreserved: reversed.equals(archived),
  namedCases: 10, testsRun: false,
};
fs.writeFileSync(path.join(__dirname, 'unit-edit.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
