'use strict';
// Scoped handoff integration. Default is read-only; --apply writes only the
// listed source/host files after strict patch matching and concurrent-edit checks.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { applyPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const specs = [
  { target: 'view_simplified_source.jsx', patch: 'reports/lookup-recovery/reader-adapter.patch', label: 'track11-reader' },
  { target: 'AlloFlowANTI.txt', patch: 'reports/connected-delivery-track13/host-integration.patch', label: 'track13-host', mirrors: ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'] }
];
const plans = specs.map(spec => {
  const before = fs.readFileSync(path.join(root, spec.target), 'utf8');
  const patch = fs.readFileSync(path.join(root, spec.patch), 'utf8');
  const after = applyPatch(before.replace(/\r\n/g, '\n'), patch, { fuzzFactor: 0 });
  if (typeof after !== 'string' || after === before) throw new Error('Patch did not make a clean change: ' + spec.label);
  const targets = [spec.target, ...(spec.mirrors || [])];
  for (const target of targets) if (fs.readFileSync(path.join(root, target), 'utf8') !== before) throw new Error('Pre-existing host drift: ' + target);
  return { ...spec, before, after, patch, targets };
});
const summary = plans.map(plan => ({ label: plan.label, targets: plan.targets, before: hash(plan.before), after: hash(plan.after), patch: hash(plan.patch) }));
console.log(JSON.stringify({ apply: process.argv.includes('--apply'), plans: summary }, null, 2));
if (!process.argv.includes('--apply')) process.exit(0);
for (const plan of plans) for (const target of plan.targets) {
  if (fs.readFileSync(path.join(root, target), 'utf8') !== plan.before) throw new Error('Concurrent edit before integration: ' + target);
}
const backup = path.join(__dirname, 'before-reviewed-patches');
fs.mkdirSync(backup, { recursive: true });
for (const plan of plans) {
  fs.writeFileSync(path.join(backup, plan.label + '.before'), plan.before, { flag: 'wx' });
  fs.writeFileSync(path.join(backup, plan.label + '.patch'), plan.patch, { flag: 'wx' });
}
for (const plan of plans) for (const target of plan.targets) {
  const absolute = path.join(root, target);
  const temporary = absolute + '.integration-01-' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temporary, plan.after, { flag: 'wx' });
    if (fs.readFileSync(absolute, 'utf8') !== plan.before) throw new Error('Concurrent edit during integration: ' + target);
    fs.renameSync(temporary, absolute);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
fs.writeFileSync(path.join(__dirname, 'reviewed-patch-integration.json'), JSON.stringify({ at: new Date().toISOString(), plans: summary }, null, 2));
