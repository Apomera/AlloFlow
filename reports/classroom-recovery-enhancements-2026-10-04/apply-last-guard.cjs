const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'applied-followup.json')));
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-receipt.json')));
const target = path.join(__dirname, 'applied-return-guard.json');
if (fs.existsSync(target)) throw Error('Return guard already applied');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const check = spawnSync(process.execPath, [path.join(__dirname, 'verify-consistency.cjs'), 'candidate'], { cwd: root, encoding: 'utf8', timeout: 180000 });
if (check.status !== 0) throw Error(check.stderr || check.stdout);
for (const item of previous.files) if (sha(fs.readFileSync(path.join(root, item.file))) !== item.candidateSha256) throw Error('Concurrent change: ' + item.file);
for (const item of receipt.files) if (sha(fs.readFileSync(path.join(__dirname, 'candidate', item.file))) !== item.candidateSha256) throw Error('Candidate changed: ' + item.file);
for (const item of previous.files) {
  const archive = path.join(__dirname, 'before-return-guard', item.file); fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.writeFileSync(archive, fs.readFileSync(path.join(root, item.file)), { flag: 'wx' });
}
for (const file of ['candidate-receipt.json', 'operations.json']) fs.copyFileSync(path.join(__dirname, file), path.join(__dirname, 'return-guard-' + file), fs.constants.COPYFILE_EXCL);
for (const item of receipt.files) fs.writeFileSync(path.join(root, item.file), fs.readFileSync(path.join(__dirname, 'candidate', item.file)));
fs.writeFileSync(target, JSON.stringify({ appliedAt: new Date().toISOString(), files: receipt.files, previousFiles: previous.files, generatorInputs: receipt.generatorInputs, gitIndexTouched: false }, null, 2) + '\n');
console.log(JSON.stringify({ applied: receipt.files.length, pin: receipt.pin }));
