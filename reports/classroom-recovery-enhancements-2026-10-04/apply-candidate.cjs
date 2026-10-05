const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-receipt.json')));
const appliedPath = path.join(__dirname, 'applied.json');
if (fs.existsSync(appliedPath)) throw Error('Already applied; refusing a repeat integration');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const verification = spawnSync(process.execPath, [path.join(__dirname, 'verify-consistency.cjs'), 'candidate'], { cwd: root, encoding: 'utf8', timeout: 180000 });
if (verification.status !== 0) throw Error(verification.stderr || verification.stdout || 'Candidate verification failed');
for (const item of receipt.files) {
  if (sha(fs.readFileSync(path.join(root, item.file))) !== item.beforeSha256) throw Error(`Concurrent change; refusing all writes: ${item.file}`);
  if (sha(fs.readFileSync(path.join(__dirname, 'candidate', item.file))) !== item.candidateSha256) throw Error(`Candidate changed: ${item.file}`);
}
// All preimages are checked before the first write. The preserved files permit exact recovery.
for (const item of receipt.files) fs.writeFileSync(path.join(root, item.file), fs.readFileSync(path.join(__dirname, 'candidate', item.file)));
fs.writeFileSync(appliedPath, JSON.stringify({ appliedAt: new Date().toISOString(), files: receipt.files, generatorInputs: receipt.generatorInputs, gitIndexTouched: false }, null, 2) + '\n');
console.log(JSON.stringify({ applied: receipt.files.length, pin: receipt.pin }));
