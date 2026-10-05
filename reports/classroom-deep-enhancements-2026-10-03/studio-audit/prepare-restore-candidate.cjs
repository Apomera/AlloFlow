'use strict';

// Report-local preparation only. This helper never writes production files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const expectedPreimage = '3e9f72bf73832605fc68993f7eb5be663b14a0a696240ec39950bba1b66c7cb5';
const canonicalPath = path.join(root, 'studio_response_module.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/studio_response_module.js');
const original = fs.readFileSync(canonicalPath), mirror = fs.readFileSync(mirrorPath);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(original), expectedPreimage, 'Current canonical must match the reviewed preimage');
assert.equal(hash(mirror), expectedPreimage, 'Current public runtime must match the same preimage');
assert.ok(original.equals(mirror), 'Current canonical/public parity');
const text = original.toString('utf8'), eol = text.includes('\r\n') ? '\r\n' : '\n';
if (eol === '\r\n') assert.ok(!text.replace(/\r\n/g, '').includes('\n'), 'Uniform CRLF source');
assert.ok(!text.replace(/\r\n/g, '').includes('\r'), 'No lone CR source line ending');
const normalized = text.replace(/\r\n/g, '\n');
const operations = [
  {
    name: 'attempt-owner-ref-and-cleanup',
    before: `    const backupInput = React.useRef(null);
    const mounted = React.useRef(true);
    React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);`,
    after: `    const backupInput = React.useRef(null);
    const restoreAttemptOwner = React.useRef(null);
    const mounted = React.useRef(true);
    React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; restoreAttemptOwner.current = null; }; }, []);`,
  },
  {
    name: 'newest-restore-attempt-owns-work-and-feedback',
    before: `    const restore = async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const startingResource = resource.id, startingResponse = current.current.response, startingIdentity = current.current.identity;
      try {
        if (file.size > maxBackupBytes) throw new Error('Backup too large');
        const data = readBackup(resource, JSON.parse(await file.text()), startingResponse);
        if (!mounted.current || current.current.identity !== startingIdentity || current.current.resource.id !== startingResource || current.current.isTeacherMode) return;
        if (current.current.response !== startingResponse) throw new Error('Work changed during restore');
        current.current.onResponseChange(startingResource, data);
        setBackupMessage(tr('backup_restored', 'Backup restored to this workspace. Check the save status before leaving.'));
      } catch (_) { if (mounted.current) setBackupMessage(tr('backup_invalid', 'Choose a text backup downloaded from this resource. Your current work has not changed.')); }
    };`,
    after: `    const restore = async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      // A newer selection owns completion even when its file is invalid.
      const attempt = {};
      restoreAttemptOwner.current = attempt;
      const startingResource = resource.id, startingResponse = current.current.response, startingIdentity = current.current.identity;
      const isCurrentAttempt = () => mounted.current && restoreAttemptOwner.current === attempt
        && current.current.identity === startingIdentity && current.current.resource.id === startingResource && !current.current.isTeacherMode;
      try {
        if (file.size > maxBackupBytes) throw new Error('Backup too large');
        const serialized = await file.text();
        if (!isCurrentAttempt()) return;
        const data = readBackup(resource, JSON.parse(serialized), startingResponse);
        if (current.current.response !== startingResponse) throw new Error('Work changed during restore');
        current.current.onResponseChange(startingResource, data);
        if (isCurrentAttempt()) setBackupMessage(tr('backup_restored', 'Backup restored to this workspace. Check the save status before leaving.'));
      } catch (_) { if (isCurrentAttempt()) setBackupMessage(tr('backup_invalid', 'Choose a text backup downloaded from this resource. Your current work has not changed.')); }
    };`,
  },
];
let candidate = normalized;
for (const operation of operations) {
  assert.equal(candidate.split(operation.before).length, 2, 'Unique before anchor: ' + operation.name);
  candidate = candidate.replace(operation.before, operation.after);
  assert.equal(candidate.split(operation.after).length, 2, 'Unique after anchor: ' + operation.name);
}
let reversed = candidate;
for (const operation of [...operations].reverse()) reversed = reversed.replace(operation.after, operation.before);
assert.equal(reversed, normalized, 'Every non-owned source byte remains recoverable');
const candidateBytes = Buffer.from(candidate.replace(/\n/g, eol), 'utf8');
assert.ok(Buffer.from(reversed.replace(/\n/g, eol), 'utf8').equals(original), 'Exact byte reversal');
new vm.Script(candidateBytes.toString('utf8'), { filename: 'report-local/studio_response_module.js' });

const beforePath = path.join(__dirname, 'source-before/studio_response_module.js');
const candidatePath = path.join(__dirname, 'candidate/studio_response_module.js');
const operationsPath = path.join(__dirname, 'restore-operations.json');
const receiptPath = path.join(__dirname, 'prepare-receipt.json');
for (const output of [beforePath, candidatePath, operationsPath, receiptPath]) assert.ok(!fs.existsSync(output), 'Refuse to overwrite prepared output: ' + output);
fs.mkdirSync(path.dirname(beforePath), { recursive: true });
fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
fs.writeFileSync(beforePath, original, { flag: 'wx' });
fs.writeFileSync(candidatePath, candidateBytes, { flag: 'wx' });
fs.writeFileSync(operationsPath, JSON.stringify(operations, null, 2) + '\n', { flag: 'wx' });
const receipt = {
  mode: 'report-local-prepare-only', preparedAt: new Date().toISOString(), canonicalPath, mirrorPath,
  originalSha256: hash(original), candidateSha256: hash(candidateBytes),
  sourceEol: eol === '\r\n' ? 'CRLF' : 'LF', canonicalPublicExact: true,
  substitutions: operations.length, uniqueBeforeAfterAnchors: true, reverseExact: true,
  syntaxParsedWithoutExecution: true, beforePath, candidatePath, operationsPath,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
