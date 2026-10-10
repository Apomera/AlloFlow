'use strict';
// Report-only reconciliation. No production or Git-index mutations.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const root = path.resolve(__dirname, '../..'), sha = b => crypto.createHash('sha256').update(b).digest('hex'), norm = s => s.replace(/\r\n/g, '\n');
const receiptPath = path.join(__dirname, 'candidate.json'), initialPath = path.join(__dirname, 'initial.json');
const receipt = JSON.parse(fs.readFileSync(receiptPath)), initial = JSON.parse(fs.readFileSync(initialPath)), operations = JSON.parse(fs.readFileSync(path.join(__dirname, 'operations.json')));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const rawHosts = hosts.map(file => fs.readFileSync(path.join(root, file)));
assert.ok(rawHosts.every(raw => raw.equals(rawHosts[0])), 'Current host mirrors exact');
for (const item of receipt.files.filter(x => !hosts.includes(x.file))) assert.equal(sha(fs.readFileSync(path.join(root, item.file))), item.candidateSha256, 'Unchanged owned input: ' + item.file);
const expected = fs.readFileSync(path.join(__dirname, 'candidate/AlloFlowANTI.txt'));
const scrub = text => norm(text)
  .replace(/\?v=[0-9a-f]{6,64}/g, '?v=CONTENT_PIN')
  .replace(/var pluginCdnVersion = '[0-9a-f]{6,64}';/g, "var pluginCdnVersion = 'CONTENT_PIN';")
  .replace("'ai_backend_module.js?v=' + pluginCdnVersion", "'ai_backend_module.js?v=CONTENT_PIN'")
  .replace(/[ \t]+$/gm, '');
assert.equal(scrub(rawHosts[0].toString()), scrub(expected.toString()), 'Only URL/content pins and trailing whitespace may differ');
const beforeLines = norm(expected.toString()).split('\n'), afterLines = norm(rawHosts[0].toString()).split('\n');
assert.equal(beforeLines.length, afterLines.length);
const changes = beforeLines.flatMap((before, i) => before !== afterLines[i] ? [{ line: i + 1, before, after: afterLines[i] }] : []);
assert.ok(changes.every(x => x.line >= 14018 && x.line <= 14902), 'Foreign edits confined to existing CDN boot loader');
assert.ok(changes.length > 0);
const archive = path.join(__dirname, 'before-foreign-pin-reconciliation'); assert.ok(!fs.existsSync(archive)); fs.mkdirSync(archive);
for (const file of ['initial.json', 'candidate.json', 'final-consistency.json']) fs.copyFileSync(path.join(__dirname, file), path.join(archive, file));
let reversed = norm(rawHosts[0].toString());
for (const op of operations.filter(x => x.file === 'AlloFlowANTI.txt').reverse()) {
  assert.equal(reversed.split(op.after).length - 1, 1, op.scope); reversed = reversed.replace(op.after, op.before);
}
for (const file of hosts) {
  for (const phase of ['before', 'candidate']) {
    const src = path.join(__dirname, phase, file), dest = path.join(archive, phase, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest);
  }
  const preimage = Buffer.from(initial.files.find(x => x.file === file).crlf ? reversed.replace(/\n/g, '\r\n') : reversed);
  fs.writeFileSync(path.join(__dirname, 'before', file), preimage);
  fs.writeFileSync(path.join(__dirname, 'candidate', file), rawHosts[0]);
  const record = receipt.files.find(x => x.file === file); record.beforeSha256 = sha(preimage); record.candidateSha256 = sha(rawHosts[0]); record.bytes = rawHosts[0].length;
  initial.files.find(x => x.file === file).sha256 = sha(preimage);
}
receipt.foreignPinsPreserved = true;
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n'); fs.writeFileSync(initialPath, JSON.stringify(initial, null, 2) + '\n');
const result = { completedAt: new Date().toISOString(), productionWrites: 0, changedHostLines: changes.length, changes, previousCandidateSha256: sha(expected), currentHostSha256: sha(rawHosts[0]), normalizedSourceEqual: true, currentHead: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim() };
fs.writeFileSync(path.join(__dirname, 'foreign-pin-reconciliation.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: true, productionWrites: 0, changedHostLines: changes.length }));
