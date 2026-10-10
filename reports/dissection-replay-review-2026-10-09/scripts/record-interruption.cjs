const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const dir = path.join(repo, 'reports/dissection-replay-review-2026-10-09/browser-5');
const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
try { process.kill(run.pid, 0); throw Error('Pinned browser process is still alive'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
const hashes = Object.fromEntries(Object.keys(run.startHashes).map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')]));
if (JSON.stringify(hashes) !== JSON.stringify(run.startHashes)) throw Error('Inputs changed after interrupted run');
const result = { at: new Date().toISOString(), reason: 'Desktop session refreshed during browser verification. Unified exec session and pinned browser process are gone; reporter has no final result or exit receipt.',
  pinnedProcessAlive: false, completedCasesVisibleInLog: 3, finalResultAvailable: false, completionEvidence: false, hashesAtRecovery: hashes };
fs.writeFileSync(path.join(dir, 'interruption.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ interruptionRecorded: true, inputsStillMatch: true }));
