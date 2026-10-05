'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate.json')));
assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-consistency.json'))).passed, true);
assert.ok(!fs.existsSync(path.join(__dirname, 'applied.json')), 'Only apply once');
// Check every preimage before any production write. Never reset shared files.
for (const item of receipt.files) {
  assert.equal(sha(fs.readFileSync(path.join(root, item.file))), item.beforeSha256, 'Live preimage: ' + item.file);
  assert.equal(sha(fs.readFileSync(path.join(__dirname, 'candidate', item.file))), item.candidateSha256, 'Candidate: ' + item.file);
}
for (const item of receipt.files.filter(x => x.changed)) {
  const target = path.join(root, item.file), temp = target + '.vault-lifecycle-tmp';
  assert.ok(!fs.existsSync(temp)); fs.writeFileSync(temp, fs.readFileSync(path.join(__dirname, 'candidate', item.file))); fs.renameSync(temp, target);
}
fs.writeFileSync(path.join(__dirname, 'applied.json'), JSON.stringify({ appliedAt: new Date().toISOString(), files: receipt.files.filter(x => x.changed) }, null, 2) + '\n');
console.log(JSON.stringify({ applied: receipt.files.filter(x => x.changed).length }));
