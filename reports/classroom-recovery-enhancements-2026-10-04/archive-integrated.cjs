const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'applied.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const item of receipt.files) {
  const bytes = fs.readFileSync(path.join(root, item.file)); assert.equal(sha(bytes), item.candidateSha256, `Current integrated file: ${item.file}`);
  const target = path.join(__dirname, 'integrated-r2', item.file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
}
for (const file of ['applied.json', 'candidate-receipt.json', 'operations.json', 'current-run.json', 'restore-audit/current-results.json', 'assignment-audit/current-entry-results.json', 'assignment-audit/current-shelf-results.json', 'assignment-audit/current-host-boundary-results.json', 'vault-audit/combined-current-suite.json', 'vault-audit/combined-current-callers.json', 'vault-audit/combined-current-actions.json']) {
  const target = path.join(__dirname, 'integrated-r2-results', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(__dirname, file), target, fs.constants.COPYFILE_EXCL);
}
console.log('Archived integrated seven files and 203-check receipts before review fixes');
