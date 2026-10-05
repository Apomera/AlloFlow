const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'applied.json')));
const candidateReceipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-receipt.json')));
const pattern = /maine_sld_practice_module\.js\?v=[a-f0-9]+/g;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedLive = [], changes = [];
for (const item of previous.files) {
  const bytes = fs.readFileSync(path.join(root, item.file));
  const archived = fs.readFileSync(path.join(__dirname, 'integrated-r2', item.file));
  assert.equal(sha(archived), item.candidateSha256);
  if (!bytes.equals(archived)) {
    assert(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'].includes(item.file));
    assert.equal(archived.toString().replace(pattern, 'MAINE_PIN'), bytes.toString().replace(pattern, 'MAINE_PIN'));
    const oldPins = archived.toString().match(pattern), newPins = bytes.toString().match(pattern);
    assert.equal(oldPins.length, 1); assert.equal(newPins.length, 1);
    changes.push({ file: item.file, oldPin: oldPins[0], newPin: newPins[0], previousSha256: item.candidateSha256, currentSha256: sha(bytes) });
  }
  expectedLive.push({ file: item.file, sha256: sha(bytes) });
}
assert.equal(changes.length, 3);
assert(changes.every(item => item.oldPin === changes[0].oldPin && item.newPin === changes[0].newPin));
for (const file of ['candidate-receipt.json', 'candidate-run.json', 'candidate-consistency.json']) fs.copyFileSync(path.join(__dirname, file), path.join(__dirname, 'pre-followup-pin-' + file), fs.constants.COPYFILE_EXCL);
for (const item of changes) {
  for (const folder of ['before', 'candidate']) {
    const source = path.join(__dirname, folder, item.file), bytes = fs.readFileSync(source);
    assert.equal(bytes.toString().match(pattern)?.[0], item.oldPin);
    const archive = path.join(__dirname, 'pre-followup-pin', folder, item.file); fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.writeFileSync(archive, bytes, { flag: 'wx' });
    fs.writeFileSync(source, bytes.toString().replace(item.oldPin, item.newPin));
  }
  const record = candidateReceipt.files.find(record => record.file === item.file);
  record.beforeSha256 = sha(fs.readFileSync(path.join(__dirname, 'before', item.file)));
  record.candidateSha256 = sha(fs.readFileSync(path.join(__dirname, 'candidate', item.file)));
}
fs.writeFileSync(path.join(__dirname, 'candidate-receipt.json'), JSON.stringify(candidateReceipt, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'followup-preimages.json'), JSON.stringify(expectedLive, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'concurrent-followup-pin-rebase.json'), JSON.stringify({ updatedAt: new Date().toISOString(), changes, productionWritten: false, otherBytesExact: true }, null, 2) + '\n');
console.log(JSON.stringify({ preservedConcurrentHostPins: changes.length, newPin: changes[0].newPin }));
