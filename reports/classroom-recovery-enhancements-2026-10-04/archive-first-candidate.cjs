const fs = require('node:fs'), path = require('node:path');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-r1-receipt.json')));
for (const item of receipt.files) {
  const target = path.join(__dirname, 'candidate-r1', item.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'candidate', item.file), target, fs.constants.COPYFILE_EXCL);
}
for (const file of ['candidate-run.json', 'restore-audit/candidate-results.json', 'assignment-audit/candidate-entry-results.json', 'assignment-audit/candidate-shelf-results.json', 'vault-audit/combined-candidate-suite.json']) {
  const target = path.join(__dirname, 'candidate-r1-results', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, file), target, fs.constants.COPYFILE_EXCL);
}
console.log('Archived initial candidate and 123 passing check receipts');
