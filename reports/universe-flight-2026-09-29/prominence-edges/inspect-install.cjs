'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../../..'), prepared = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-prominence-edges';
const hash = value => crypto.createHash('sha256').update(value).digest('hex'), normalized = value => value.toString().replace(/\r\n/g, '\n');
const patch = JSON.parse(fs.readFileSync(path.join(prepared, 'patch.json'), 'utf8'));
const records = [];
for (const [file, expected] of [['universe_flight_scene.js', patch.rendererHash], ['stem_tool_universe.js', patch.uiHash]]) {
  const candidate = fs.readFileSync(path.join(prepared, file)); assert.equal(hash(candidate), expected);
  for (const prefix of ['stem_lab/', 'desktop/web-app/public/stem_lab/']) {
    const installed = fs.readFileSync(path.join(repo, prefix + file));
    const record = { path: prefix + file, candidateHash: expected, installedHash: hash(installed), bytesIdentical: installed.equals(candidate), normalizedIdentical: normalized(installed) === normalized(candidate) };
    records.push(record); assert.equal(record.normalizedIdentical, true, record.path + ' matches the prepared candidate after line-ending normalization');
  }
}
fs.writeFileSync(path.join(__dirname, 'install-inspection.json'), JSON.stringify({ completed: true, records }, null, 2) + '\n');
console.log(JSON.stringify({ completed: true, records }, null, 2));
