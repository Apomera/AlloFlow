'use strict';
// Actual source section and whole generated runtime factory, actual controller
// and native Web Crypto. Async gates hold real status/decrypted/head results.
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm'); const assert = require('node:assert/strict'); const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..'); const args = process.argv.slice(2);
const output = args[0] || 'sync-baseline.json';
const paths = { vault: path.resolve(root, args[1] || 'allo_device_vault_module.js'), source: path.resolve(root, args[2] || 'host_handlers_source.jsx'), runtime: path.resolve(root, args[3] || 'host_handlers_module.js'), host: path.resolve(root, args[4] || 'AlloFlowANTI.txt'), crypto: path.join(root, 'allo_crypto_module.js') };
const Vault = require(paths.vault); const Crypto = require(paths.crypto); const checks = [];
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
function check(name, actual, expected) { try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); } catch (_) { checks.push({ name, passed: false, actual, expected }); } }
function gate() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle(promise) { try { return { fulfilled: true, result: await promise }; } catch (error) { return { fulfilled: false, code: error.code }; } }
const host = fs.readFileSync(paths.host, 'utf8').replace(/\r\n/g, '\n'); const source = fs.readFileSync(paths.source, 'utf8').replace(/\r\n/g, '\n');
function section(text, begin, end) { const a = text.indexOf(begin); const b = text.indexOf(end, a); assert(a >= 0 && b > a); return text.slice(a, b); }
const recoverySection = section(host, 'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage');
const Recovery = new Function('window', recoverySection + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const syncSection = section(source, 'const syncCanvasRecoveryVaultState =', 'const enableCanvasRecoveryVault =');
const lockedSection = section(source, 'const publishCanvasRecoveryVaultLockedState =', 'const downloadCanvasRecoveryCode =');
class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.hold = null; }
  async read() { const result = { revision: this.revision, store: copy(this.store) }; if (this.hold) { const hold = this.hold; this.hold = null; hold.entered.resolve(); await hold.release.promise; } return result; }
  async compareAndSwap(revision, next) { if (revision !== this.revision) return false; this.store = copy(next); this.revision += 1; return true; }
}
const plain = title => ({ version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', legacyMigrationComplete: true, snapshots: [{ version: 1, id: 'synthetic', title, savedAt: '2026-10-04T12:00:00.000Z', pinned: false, resourceCount: 1, workspace: { sourceTopic: title } }] });
const create = repo => Vault.createRecoveryVaultController({ repository: repo, crypto: Crypto, cryptoOptions: { iterations: 10000 } });
function build(mode, controller) {
  const state = { store: Recovery.emptyStore(), vault: null, status: null, events: [], lockCalls: 0 };
  const originalLock = controller.lock.bind(controller); controller.lock = () => { state.lockCalls += 1; return originalLock(); };
  let handlers;
  const deps = {
    canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryVaultControllerRef: { current: controller }, canvasRecoveryStoreRef: { current: state.store },
    readUnlockedCanvasRecoveryVaultStore: async c => Recovery.normalizeStore(await c.readPlainStore()),
    emptyCanvasRecoveryVaultView: status => Recovery.normalizeStore({ version: Recovery.VERSION, retentionPolicy: status.retentionPolicy, effectiveRetentionPolicy: status.effectiveRetentionPolicy, legacyMigrationComplete: true, snapshots: [] }),
    setCanvasRecoveryStore: value => { state.store = value; state.events.push('store'); }, setCanvasRecoveryStoreAuthoritative: () => state.events.push('authoritative'),
    setCanvasRecoveryVaultState: value => { state.vault = value; state.events.push('vault'); }, setCanvasRecoverySaveStatus: value => { state.status = value; state.events.push('status'); },
    publishCanvasRecoveryVaultLockedState: status => handlers.publishCanvasRecoveryVaultLockedState(status)
  };
  if (mode === 'source') handlers = vm.runInNewContext(`(() => { ${syncSection}\n${lockedSection}\nreturn { syncCanvasRecoveryVaultState, publishCanvasRecoveryVaultLockedState }; })()`, { __d: deps });
  else {
    const window = { React: {}, AlloModules: {} };
    vm.runInNewContext(fs.readFileSync(paths.runtime, 'utf8'), { window, console: { log() {}, error() {} }, structuredClone, setTimeout, clearTimeout, Date, Buffer });
    handlers = window.AlloModules.HostHandlers(deps);
  }
  return { handlers, deps, state };
}
async function run(mode, encryptedA, backupB) {
  const named = label => `${mode}: ${label}`;
  // Old status success must be retired by a genuinely accepted password change.
  {
    const repo = new Repo(encryptedA); const controller = create(repo); await controller.unlock('old password'); const env = build(mode, controller);
    const entered = gate(); const release = gate(); const ordinary = controller.getStatus.bind(controller); let used = false;
    controller.getStatus = async () => { const result = await ordinary(); if (!used) { used = true; entered.resolve(); await release.promise; } return result; };
    const pending = settle(env.handlers.syncCanvasRecoveryVaultState(controller)); await entered.promise;
    await controller.changePassword('old password', 'new password'); release.resolve(); const result = await pending;
    check(named('old status after password change returns stale'), result.fulfilled && result.result.stale, true);
    check(named('old status after password change publishes nothing'), env.state.events.length, 0);
    check(named('old status after password change does not lock new session'), env.state.lockCalls, 0);
    check(named('password change leaves accepted session unlocked'), (await controller.getStatus()).locked, false);
    const fresh = create(repo); check(named('password change retained its durable new password'), (await settle(fresh.unlock('new password'))).fulfilled, true);
  }
  // Even a successfully decrypted old result must not publish over backup B.
  {
    const repo = new Repo(encryptedA); const controller = create(repo); await controller.unlock('old password'); const env = build(mode, controller);
    const entered = gate(); const release = gate(); const ordinary = env.deps.readUnlockedCanvasRecoveryVaultStore;
    env.deps.readUnlockedCanvasRecoveryVaultStore = async c => { const result = await ordinary(c); entered.resolve(); await release.promise; return result; };
    const pending = settle(env.handlers.syncCanvasRecoveryVaultState(controller)); await entered.promise;
    await controller.importEncryptedBackup(backupB, 'backup password', { replace: true }); release.resolve(); const result = await pending;
    check(named('old decrypted result after backup import returns stale'), result.fulfilled && result.result.stale, true);
    check(named('old decrypted result after backup import publishes nothing'), env.state.events.length, 0);
    check(named('old decrypted result does not lock imported session'), env.state.lockCalls, 0);
    check(named('imported session remains unlocked'), (await controller.getStatus()).locked, false);
    check(named('imported session retains current B content'), (await controller.readPlainStore()).snapshots[0].title, 'Synthetic B');
  }
  // An old actual repository head now throws VAULT_LOCKED. Sync must recognize
  // session retirement before its error path can lock the newer session.
  {
    const repo = new Repo(encryptedA); const controller = create(repo); await controller.unlock('old password'); const env = build(mode, controller);
    const entered = gate(); const release = gate(); const ordinary = controller.getStatus.bind(controller); let armed = false;
    controller.getStatus = async () => { const result = await ordinary(); if (!armed) { armed = true; repo.hold = { entered, release }; } return result; };
    const pending = settle(env.handlers.syncCanvasRecoveryVaultState(controller)); await entered.promise;
    await controller.importEncryptedBackup(backupB, 'backup password', { replace: true }); release.resolve(); const result = await pending;
    check(named('retired actual read error returns stale'), result.fulfilled && result.result.stale, true);
    check(named('retired actual read error publishes nothing'), env.state.events.length, 0);
    check(named('retired actual read error does not lock accepted session'), env.state.lockCalls, 0);
    check(named('retired actual read error preserves accepted new key'), (await controller.getStatus()).locked, false);
    check(named('new accepted B remains readable after retired error'), (await settle(controller.readPlainStore())).fulfilled, true);
  }
  // Current corruption still fails closed and surfaces its original error.
  {
    const repo = new Repo(encryptedA); const controller = create(repo); await controller.unlock('old password'); const env = build(mode, controller);
    const bytes = Buffer.from(repo.store.records[0].payload.ct, 'base64'); bytes[0] ^= 255; repo.store.records[0].payload.ct = bytes.toString('base64');
    const result = await settle(env.handlers.syncCanvasRecoveryVaultState(controller));
    check(named('current corruption still rejects'), result.fulfilled, false);
    check(named('current corruption retains actual controller error'), result.code, 'VAULT_RECORD_CORRUPT');
    check(named('current corruption locks once'), env.state.lockCalls, 1);
    check(named('current corruption publishes locked state'), env.state.vault?.locked, true);
    check(named('current corruption publishes empty plaintext view'), env.state.store.snapshots.length, 0);
    check(named('current corruption retains locked save status'), env.state.status, 'locked');
  }
  for (const legacy of [false, true]) {
    const repo = new Repo(encryptedA); const controller = create(repo); await controller.unlock('old password'); if (legacy) controller.getSessionGeneration = undefined; const env = build(mode, controller);
    const result = await settle(env.handlers.syncCanvasRecoveryVaultState(controller));
    check(named(`${legacy ? 'legacy no-generation compatibility' : 'normal current sync'} succeeds`), result.fulfilled && !result.result.stale, true);
    check(named(`${legacy ? 'legacy no-generation compatibility' : 'normal current sync'} publishes actual content`), env.state.store.snapshots[0]?.title, 'Synthetic A');
    check(named(`${legacy ? 'legacy no-generation compatibility' : 'normal current sync'} preserves unlocked state`), env.state.vault?.locked, false);
    check(named(`${legacy ? 'legacy no-generation compatibility' : 'normal current sync'} avoids lock`), env.state.lockCalls, 0);
  }
}
(async () => {
  const a = new Repo(plain('Synthetic A')); await create(a).enableProtection('old password');
  const b = new Repo(plain('Synthetic B')); const bController = create(b); await bController.enableProtection('backup password'); const backup = await bController.exportEncryptedBackup();
  for (const mode of ['source', 'runtime']) await run(mode, a.store, backup);
  const result = { scope: 'Actual source sync/locked handlers and complete generated factory; actual controller/native Web Crypto; fixed dependency objects plus stable refs; controlled status/decrypted/repository results; no browser or full App.', passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, inputs: Object.values(paths).map(file => ({ path: file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') })), checks };
  fs.writeFileSync(path.resolve(__dirname, output), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: result.passed, failed: result.failed, report: path.resolve(__dirname, output) }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
