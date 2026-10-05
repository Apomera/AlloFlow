'use strict';

// Authoring helper only: reads current host bytes and writes a report-local
// candidate. The source input is never changed; all anchors must be unique.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const workspace = path.resolve(__dirname, '..', '..');
const input = path.resolve(workspace, process.argv[2] || 'AlloFlowANTI.txt');
const patchPath = path.join(__dirname, 'student-response-v2.patch.json');
const original = fs.readFileSync(input, 'utf8');
let source = original.replace(/\r\n/g, '\n');
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
for (const entry of patch.replacements) {
  assert.equal(source.split(entry.before).length - 1, 1, 'Missing/ambiguous current-source anchor: ' + entry.name);
  source = source.replace(entry.before, entry.after);
}
const output = path.join(__dirname, 'student-response-v2.candidate.txt');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(fs.readFileSync(input, 'utf8'), original, 'Host source changed while authoring candidate');
fs.writeFileSync(output, source);
const receipt = { source: input, sourceHash: sha(original), patchHash: sha(fs.readFileSync(patchPath)), candidate: output, candidateHash: sha(source), replacements: patch.replacements.map(entry => entry.name), productionChanged: false, testsExecuted: false };
fs.writeFileSync(path.join(__dirname, 'student-response-v2-candidate.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));


