const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-receipt.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pattern = /maine_sld_practice_module\.js\?v=[a-f0-9]+/g;
const changes = [];
for (const item of receipt.files) {
  const before = fs.readFileSync(path.join(__dirname, 'before', item.file));
  const current = fs.readFileSync(path.join(root, item.file));
  if (before.equals(current)) continue;
  assert.ok(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'].includes(item.file), 'Only the known concurrent host pin may change');
  const oldPins = before.toString().match(pattern), newPins = current.toString().match(pattern);
  assert.equal(oldPins?.length, 1); assert.equal(newPins?.length, 1);
  assert.equal(before.toString().replace(pattern, 'MAINE_PIN'), current.toString().replace(pattern, 'MAINE_PIN'), 'No other concurrent host change');
  changes.push({ file: item.file, beforeSha256: sha(before), currentSha256: sha(current), oldPin: oldPins[0], newPin: newPins[0] });
}
assert.equal(changes.length, 3, 'All three host mirrors must contain the same known pin update');
for (const item of receipt.files) {
  const archive = path.join(__dirname, 'before-r1', item.file);
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  fs.writeFileSync(archive, fs.readFileSync(path.join(__dirname, 'before', item.file)), { flag: 'wx' });
}
fs.copyFileSync(path.join(__dirname, 'candidate-receipt.json'), path.join(__dirname, 'candidate-r1-receipt.json'), fs.constants.COPYFILE_EXCL);
fs.copyFileSync(path.join(__dirname, 'operations.json'), path.join(__dirname, 'candidate-r1-operations.json'), fs.constants.COPYFILE_EXCL);
for (const item of changes) fs.writeFileSync(path.join(__dirname, 'before', item.file), fs.readFileSync(path.join(root, item.file)));
fs.writeFileSync(path.join(__dirname, 'concurrent-pin-rebase.json'), JSON.stringify({ updatedAt: new Date().toISOString(), changes, productionWritten: false, scope: 'Only the observed Maine loader version, all other bytes equal' }, null, 2) + '\n');
console.log(JSON.stringify({ preservedConcurrentHostPins: changes.length, newPin: changes[0].newPin }));
