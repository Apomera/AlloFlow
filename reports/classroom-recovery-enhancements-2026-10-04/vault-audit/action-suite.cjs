'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..'), label = process.argv[2] || 'current';
const sourcePath = process.env.VAULT_CALLER_SOURCE || path.join(root, 'host_handlers_source.jsx');
const modulePath = process.env.VAULT_CALLER_MODULE || path.join(root, 'host_handlers_module.js');
const host = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');
const start = host.indexOf('const ALLO_WORKSPACE_RECOVERY = (() => {'), end = host.indexOf('\n\nconst _alloGetCanvasDeviceStorage', start);
assert(start >= 0 && end > start);
const Recovery = new Function('window', host.slice(start, end) + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const source = fs.readFileSync(sourcePath, 'utf8'), generated = fs.readFileSync(modulePath, 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const store = title => Recovery.normalizeStore({ version: 1, snapshots: [{ version: 1, id: title, title, savedAt: new Date().toISOString(), workspace: { history: [], inputText: title } }] });
function harness(mode) {
  const state = { busy: null, error: '', dialogs: [], secrets: [], toasts: [], store: Recovery.emptyStore(), vault: { enabled: true, locked: true }, saveStatus: 'locked' };
  const refs = { canvasRecoveryVaultActionRequestRef: { current: null }, canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryVaultControllerRef: { current: null }, canvasRecoveryStoreRef: { current: state.store }, canvasRecoveryMutationInProgressRef: { current: false }, canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryWriteQueueRef: { current: Promise.resolve() } };
  const control = { credentials: async () => {}, read: async () => store('current'), get: async () => controller };
  const controller = { locked: true, async unlock(password) { await control.credentials(password); this.locked = false; }, async recoverWithKey(key) { await control.credentials(key); this.locked = false; }, async getStatus() { return { enabled: true, locked: this.locked, snapshotCount: 1 }; }, lock() { this.locked = true; } };
  refs.canvasRecoveryVaultControllerRef.current = controller;
  const window = { React: {}, AlloModules: {} };
  vm.runInNewContext(mode === 'source' ? source + '\nwindow.__factory = createHostHandlers;' : generated, { window, console: { log() {}, error() {} }, setTimeout, clearTimeout, Date, structuredClone });
  const create = mode === 'source' ? window.__factory : window.AlloModules.HostHandlers;
  const base = { ...refs, ALLO_WORKSPACE_RECOVERY: Recovery, canvasRecoveryDecisionMade: false, getCanvasRecoveryVaultController: () => control.get(), readUnlockedCanvasRecoveryVaultStore: () => control.read(), emptyCanvasRecoveryVaultView: () => Recovery.emptyStore(),
    setCanvasRecoveryBusyId: value => { state.busy = typeof value === 'function' ? value(state.busy) : value; }, setCanvasRecoveryError: value => { state.error = value; }, setCanvasRecoverySaveStatus: value => { state.saveStatus = value; }, setCanvasRecoveryDialogMode: value => { state.dialogs.push(value); }, clearCanvasRecoveryVaultSecrets: value => { state.secrets.push(value); }, setCanvasRecoveryStore: value => { state.store = value; }, setCanvasRecoveryStoreAuthoritative() {}, setCanvasRecoveryVaultState: value => { state.vault = value; }, setCanvasRecoveryVaultForm() {}, setCanvasRecoveryRevision() {}, addToast: (...args) => state.toasts.push(args), t: () => '' };
  function api(password = 'valid password') {
    const deps = { ...base, canvasRecoveryVaultState: { ...state.vault }, canvasRecoveryVaultForm: { password, recoveryInput: password, newPassword: 'new password long enough', confirmNewPassword: 'new password long enough' } }; let result;
    deps.syncCanvasRecoveryVaultState = (...args) => result.syncCanvasRecoveryVaultState(...args);
    deps.publishCanvasRecoveryVaultLockedState = (...args) => result.publishCanvasRecoveryVaultLockedState(...args);
    result = create(deps); return result;
  }
  return { state, refs, controller, control, api };
}
const cases = [];
const test = (name, run) => cases.push({ name, run });
test('older unlock completion preserves a newer pending unlock and its busy state', async mode => {
  const h = harness(mode), a = deferred(), b = deferred(); let reads = 0;
  h.control.read = () => (++reads === 1 ? a.promise : b.promise);
  const first = h.api('first').unlockCanvasRecoveryVault(); await flush(); assert.equal(reads, 1);
  const second = h.api('second').unlockCanvasRecoveryVault(); await flush(); assert.equal(reads, 2);
  const owner = h.refs.canvasRecoveryVaultActionRequestRef.current;
  a.resolve(store('old')); await first;
  assert.equal(h.state.busy, 'vault-unlock'); assert.equal(h.refs.canvasRecoveryVaultActionRequestRef.current, owner); assert.equal(h.state.store.snapshots.length, 0); assert.equal(h.state.dialogs.length, 0);
  b.resolve(store('new')); await second; assert.equal(h.state.store.snapshots[0].title, 'new'); assert.equal(h.state.busy, null);
});
test('new credential attempt retires an old plaintext read before credentials resolve', async mode => {
  const h = harness(mode), read = deferred(), credential = deferred();
  h.control.read = () => read.promise;
  const first = h.api('first').unlockCanvasRecoveryVault(); await flush();
  h.control.credentials = () => credential.promise;
  const second = h.api('second').unlockCanvasRecoveryVault(); await flush();
  read.resolve(store('old')); await first; assert.equal(h.state.store.snapshots.length, 0); assert.equal(h.state.busy, 'vault-unlock'); assert.equal(h.state.dialogs.length, 0);
  h.control.read = async () => store('new'); credential.resolve(); await second; assert.equal(h.state.store.snapshots[0].title, 'new');
});
test('older credential failure cannot erase newer unlock feedback', async mode => {
  const h = harness(mode), a = deferred(), b = deferred();
  h.control.credentials = password => password === 'first' ? a.promise : b.promise;
  const first = h.api('first').unlockCanvasRecoveryVault(); await flush(); const second = h.api('second').unlockCanvasRecoveryVault(); await flush();
  a.reject(Error('old credential failure')); await first; assert.equal(h.state.error, ''); assert.equal(h.state.secrets.length, 0); assert.equal(h.state.busy, 'vault-unlock');
  b.resolve(); await second; assert.equal(h.state.dialogs.at(-1), 'choice');
});
test('older recovery continuation cannot release a newer unlock', async mode => {
  const h = harness(mode), a = deferred(), b = deferred(); let reads = 0; h.control.read = () => (++reads === 1 ? a.promise : b.promise);
  const first = h.api('first').recoverCanvasRecoveryVault(); await flush(); const second = h.api('second').unlockCanvasRecoveryVault(); await flush();
  a.resolve(store('old')); await first; assert.equal(h.state.busy, 'vault-unlock'); assert.equal(h.state.toasts.length, 0); assert.equal(h.state.store.snapshots.length, 0);
  b.resolve(store('new')); await second; assert.equal(h.state.busy, null);
});
test('explicitly retired action keeps the replacement busy indicator and feedback', async mode => {
  const h = harness(mode), a = deferred(); h.control.read = () => a.promise;
  const first = h.api().unlockCanvasRecoveryVault(); await flush();
  h.refs.canvasRecoveryVaultActionRequestRef.current = null; h.refs.canvasRecoveryVaultSyncRequestRef.current = null; h.state.busy = 'replacement-owner'; h.state.error = 'replacement feedback';
  a.resolve(store('old')); await first; assert.equal(h.state.busy, 'replacement-owner'); assert.equal(h.state.error, 'replacement feedback'); assert.equal(h.state.dialogs.length, 0);
});
test('current credential error stays visible and releases its own busy state', async mode => {
  const h = harness(mode); h.control.credentials = async () => { throw Error('current failure'); }; await h.api().unlockCanvasRecoveryVault();
  assert.match(h.state.error, /password/); assert.equal(h.state.secrets.at(-1), 'unlock'); assert.equal(h.state.busy, null);
});
test('current plaintext-read failure locks the vault and preserves error feedback', async mode => {
  const h = harness(mode); h.control.read = async () => { throw Error('current read failure'); }; await h.api().unlockCanvasRecoveryVault();
  assert.equal(h.controller.locked, true); assert.equal(h.state.vault.locked, true); assert.equal(h.state.store.snapshots.length, 0); assert.match(h.state.error, /password/); assert.equal(h.state.busy, null);
});
test('current recovery success still publishes its own feedback', async mode => {
  const h = harness(mode); await h.api().recoverCanvasRecoveryVault(); assert.equal(h.state.store.snapshots[0].title, 'current'); assert.equal(h.state.toasts.length, 1); assert.equal(h.state.dialogs.at(-1), 'manage'); assert.equal(h.state.busy, null); assert.equal(h.state.error, '');
});
(async () => {
  const results = [];
  for (const mode of ['source', 'generated']) for (const item of cases) {
    try { await item.run(mode); results.push({ mode, name: item.name, passed: true }); }
    catch (error) { results.push({ mode, name: item.name, passed: false, error: error.stack }); }
  }
  const failed = results.filter(item => !item.passed), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const result = { label, completedAt: new Date().toISOString(), passed: failed.length === 0, total: results.length, failed: failed.length, sourcePath, modulePath, sourceSha256: hash(sourcePath), moduleSha256: hash(modulePath), modes: 'Complete actual editable and generated factories', controlledBoundaries: ['credential acknowledgement', 'plaintext read completion', 'explicit action retirement'], results };
  fs.writeFileSync(path.join(__dirname, label + '-actions.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ label, total: result.total, failed: result.failed, failedNames: failed.map(item => item.mode + ': ' + item.name) })); if (failed.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
