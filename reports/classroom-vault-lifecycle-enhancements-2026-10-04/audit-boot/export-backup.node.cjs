'use strict';
// Full current source/runtime factories. No host globals are supplied to the
// extracted module; its documented host getter is the only controller route.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const label = process.argv[2] || 'current';
const files = {
  source: path.resolve(process.env.BACKUP_HANDLER_SOURCE || path.join(root, 'host_handlers_source.jsx')),
  runtime: path.resolve(process.env.BACKUP_HANDLER_RUNTIME || path.join(root, 'host_handlers_module.js')),
};
const raw = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]));
const checks = [];
function check(name, actual, expected) {
  try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, actual, expected, error: error.message }); }
}
async function scenario(mode, failure) {
  let source = raw[mode];
  if (label === 'candidate') {
    const token = 'const controller = await getCanvasRecoveryVaultController();';
    if (mode === 'source') { assert.equal(source.split(token).length, 2); source = source.replace(token, 'const controller = await __d.getCanvasRecoveryVaultController();'); }
    else {
      const token = 'const controller=await getCanvasRecoveryVaultController();';
      assert.equal(source.split(token).length, 2); source = source.replace(token, 'const controller=await __d.getCanvasRecoveryVaultController();');
    }
  }
  const state = { getter: 0, exports: 0, clicks: [], errors: [], blobs: [], timers: [], revoked: [] };
  const backup = { kind: 'allo-protected-recovery-backup', vault: { encrypted: true, records: ['opaque'] } };
  const controller = { async exportEncryptedBackup() { state.exports++; if (failure) throw Error('Device backup read failed'); return backup; } };
  const deps = { async getCanvasRecoveryVaultController() { state.getter++; return controller; }, setCanvasRecoveryError(value) { state.errors.push(value); } };
  const window = { React: {}, AlloModules: {} };
  const context = { window, Blob, Date, console, setTimeout(fn, delay) { state.timers.push({ fn, delay }); },
    document: { createElement(kind) { assert.equal(kind, 'a'); const link = { click() { state.clicks.push({ href: this.href, download: this.download }); } }; return link; } },
    URL: { createObjectURL(blob) { state.blobs.push(blob); return 'blob:export-control'; }, revokeObjectURL(url) { state.revoked.push(url); } },
  };
  vm.createContext(context);
  vm.runInContext(mode === 'source' ? source + '\nwindow.factory = createHostHandlers;' : source, context);
  const factory = mode === 'source' ? window.factory : window.AlloModules.HostHandlers;
  await factory(deps).exportCanvasRecoveryVaultBackup();
  const prefix = mode + ' ' + (failure ? 'failure' : 'success');
  check(prefix + ' resolves controller through host getter', state.getter, 1);
  check(prefix + ' invokes actual export method', state.exports, 1);
  if (failure) {
    check(prefix + ' surfaces controller failure', state.errors, ['Device backup read failed']);
    check(prefix + ' emits no download', state.clicks.length, 0);
  } else {
    check(prefix + ' emits no error', state.errors, []);
    check(prefix + ' downloads encrypted JSON once', state.clicks.length, 1);
    check(prefix + ' preserves encrypted backup payload', state.blobs[0] ? JSON.parse(await state.blobs[0].text()) : null, backup);
    check(prefix + ' uses dated JSON filename', state.clicks[0]?.download, 'AlloFlow-Protected-Recovery-' + new Date().toISOString().slice(0, 10) + '.json');
    check(prefix + ' schedules object URL cleanup', state.timers.map(row => row.delay), [5000]);
    state.timers.forEach(row => row.fn());
    check(prefix + ' revokes generated URL', state.revoked, ['blob:export-control']);
  }
}
(async () => {
  for (const mode of ['source', 'runtime']) for (const failure of [false, true]) await scenario(mode, failure);
  const result = { label, scope: 'Complete source and generated factories with mocked DOM/URL and native Node Blob; candidate is one exact in-memory getter qualification, no production writes',
    inputs: Object.fromEntries(Object.entries(files).map(([name, file]) => [name, { path: file, sha256: crypto.createHash('sha256').update(raw[name]).digest('hex') }])),
    total: checks.length, passed: checks.filter(row => row.passed).length, failed: checks.filter(row => !row.passed).length, checks };
  const out = path.resolve(process.env.BACKUP_RESULT || path.join(__dirname, 'export-backup-' + label + '.json'));
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ report: out, total: result.total, passed: result.passed, failed: result.failed }));
  if (result.failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 2; });
