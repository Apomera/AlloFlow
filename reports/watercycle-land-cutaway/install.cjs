'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const baselineHash = 'f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086';
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'presentation-changes.json')));
const candidate = fs.readFileSync(path.join(__dirname, 'candidate-runtime.js'));
const baseline = fs.readFileSync(path.join(__dirname, 'baseline-runtime.js'));
const expected = process.argv[2];
const previous = process.argv[3] || baselineHash;
if (!/^[a-f0-9]{64}$/.test(previous)) throw Error("Invalid previous runtime hash");
if (expected !== manifest.sourceSha256 || hash(candidate) !== expected || hash(baseline) !== baselineHash || manifest.baselineSha256 !== baselineHash) throw Error('Reviewed source hashes changed');
let restored = candidate.toString('utf8');
for (const change of manifest.changes) restored = restored.replace(change.replacement, change.original);
if (!Buffer.from(restored).equals(baseline)) throw Error('Changes outside reviewed slices');
const files = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'].map(name => path.join(repo, name));
for (const file of files) if (hash(fs.readFileSync(file)) !== previous) throw Error('Live runtime changed: ' + file);
for (const file of files) {
  const temporary = file + '.land-cutaway-' + process.pid + '.tmp';
  fs.writeFileSync(temporary, candidate, { flag: 'wx' });
  if (hash(fs.readFileSync(file)) !== previous || hash(fs.readFileSync(temporary)) !== expected) throw Error('Runtime changed before replacement');
  fs.renameSync(temporary, file);
  if (hash(fs.readFileSync(file)) !== expected) throw Error('Runtime replacement differs');
}
console.log(JSON.stringify({ successful: true, sourceSha256: expected, files }));
