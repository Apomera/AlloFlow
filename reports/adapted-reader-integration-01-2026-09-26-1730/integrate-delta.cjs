'use strict';
// Reviewed source-only integration. Default: read-only strict applicability check.
// --apply preserves every input, detects concurrent edits, and updates exact mirrors.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parsePatch, applyPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const [label, patchFile] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label || '') || !patchFile) throw new Error('Usage: integrate-delta.cjs label patch-file [--apply]');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const patchText = fs.readFileSync(patchFile, 'utf8').replace(/\r\n/g, '\n');
const plans = [];
for (const patch of parsePatch(patchText)) {
  const target = patch.newFileName.replace(/^b\//, '');
  if (target === '/dev/null' || target.includes('..') || path.isAbsolute(target) || target.startsWith('.git/') || (target.endsWith('_module.js') && !target.startsWith('_build_') && target !== 'karaoke_audio_store_module.js')) throw new Error('Unapproved target: ' + target);
  const absolute = path.resolve(root, target);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Outside workspace: ' + target);
  const before = read(absolute);
  if (patch.oldFileName === '/dev/null' && before !== null) throw new Error('New-file collision: ' + target);
  const normalized = (before || '').replace(/\r\n/g, '\n');
  const applied = applyPatch(normalized, patch, { fuzzFactor: 0 });
  if (typeof applied !== 'string') throw new Error('Strict patch conflict: ' + target);
  const after = before && before.includes('\r\n') ? applied.replace(/\n/g, '\r\n') : applied;
  const mirrors = target === 'AlloFlowANTI.txt' ? ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'] : target === 'ui_strings.js' ? ['desktop/web-app/public/ui_strings.js'] : [];
  for (const mirror of mirrors) if (read(path.join(root, mirror)) !== before) throw new Error('Existing mirror drift: ' + mirror);
  plans.push({ target, targets: [target, ...mirrors], before, after });
}
if (!plans.length) throw new Error('No patches found');
const summary = plans.map(({ target, targets, before, after }) => ({ target, targets, before: before === null ? null : hash(before), after: hash(after), changed: before !== after }));
console.log(JSON.stringify({ label, patch: hash(patchText), apply: process.argv.includes('--apply'), plans: summary }, null, 2));
if (!process.argv.includes('--apply')) process.exit(0);
const backup = path.join(__dirname, 'deltas', label);
if (fs.existsSync(backup)) throw new Error('Integration label already exists: ' + label);
for (const plan of plans) for (const target of plan.targets) if (read(path.join(root, target)) !== plan.before) throw new Error('Concurrent edit: ' + target);
fs.mkdirSync(backup, { recursive: true });
fs.writeFileSync(path.join(backup, 'source.patch'), patchText, { flag: 'wx' });
for (const plan of plans) if (plan.before !== null) {
  const filename = path.join(backup, 'before', plan.target);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, plan.before, { flag: 'wx' });
}
for (const plan of plans) for (const target of plan.targets) {
  const filename = path.join(root, target);
  const temporary = filename + '.integration-01-' + process.pid + '.tmp';
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  try {
    fs.writeFileSync(temporary, plan.after, { flag: 'wx' });
    if (read(filename) !== plan.before) throw new Error('Concurrent edit during write: ' + target);
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
fs.writeFileSync(path.join(backup, 'record.json'), JSON.stringify({ at: new Date().toISOString(), label, patch: hash(patchText), plans: summary }, null, 2), { flag: 'wx' });
