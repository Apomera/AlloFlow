'use strict';
// Real production controller/integration/Crypto, native Node Web Crypto. Delays
// hold completed crypto work; no key, ciphertext, or credential is reported.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const hash = require('node:crypto').createHash;
const root = path.resolve(__dirname, '../../..');
const argv = process.argv.slice(2);
const output = argv[0] || 'baseline.json';
const vaultPath = path.resolve(root, argv[1] || 'allo_device_vault_module.js');
const hostPath = path.resolve(root, argv[2] || 'AlloFlowANTI.txt');
const Crypto = require(path.join(root, 'allo_crypto_module.js'));
const Vault = require(vaultPath);
const Integration = require(path.join(root, 'allo_recovery_vault_integration_module.js'));
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const FAST = { iterations: 10000 };
const checks = [];
const observations = [];
function check(name, actual, expected) {
  try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, actual, expected }); }
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.commits = 0; }
  async read() { return { revision: this.revision, store: copy(this.store) }; }
  async compareAndSwap(revision, next) {
    if (revision !== this.revision) return false;
    this.store = copy(next); this.revision += 1; this.commits += 1; return true;
  }
}
const plain = () => ({ version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', legacyMigrationComplete: true, snapshots: [{ version: 1, id: 'private-work', title: 'Synthetic private workspace', savedAt: '2026-10-04T12:00:00.000Z', pinned: false, resourceCount: 1, workspace: { sourceTopic: 'Synthetic content' } }] });
function create(repo, crypto = Crypto) { return Vault.createRecoveryVaultController({ repository: repo, crypto, cryptoOptions: FAST, now: () => new Date('2026-10-04T12:01:00.000Z') }); }
function heldCrypto(method, select = () => true) {
  const entered = deferred(); const release = deferred(); let used = false;
  const crypto = { ...Crypto, async [method](...args) {
    if (used || !select(args)) return Crypto[method](...args);
    used = true;
    let result; let error;
    try { result = await Crypto[method](...args); } catch (caught) { error = caught; }
    entered.resolve(); await release.promise;
    if (error) throw error;
    return result;
  } };
  return { crypto, entered: entered.promise, release: release.resolve };
}
async function settle(promise) {
  try { const result = await promise; return { fulfilled: true, result }; }
  catch (error) { return { fulfilled: false, code: error.code || '', message: String(error.message || error) }; }
}
async function privateReadDenied(controller) { const result = await settle(controller.readPlainStore()); return !result.fulfilled && result.code === 'VAULT_LOCKED'; }

async function keyInstallRaces(encrypted, recoveryCode, backup) {
  const cases = [
    ['unlock', 'unwrapVaultKey', encrypted, controller => controller.unlock('old password')],
    ['recoverWithKey', 'unwrapVaultKey', encrypted, controller => controller.recoverWithKey(recoveryCode, 'new password')],
    ['changePassword', 'rewrapVaultKey', encrypted, controller => controller.changePassword('old password', 'new password')],
    ['removeRecoveryKey', 'unwrapVaultKey', encrypted, controller => controller.removeRecoveryKey('old password')],
    ['importEncryptedBackup', 'unwrapVaultKey', null, controller => controller.importEncryptedBackup(backup, 'old password', { replace: true })],
    ['enableProtection', 'createVaultKey', plain(), controller => controller.enableProtection('new password')],
  ];
  for (const [name, method, initial, invoke] of cases) {
    const repo = new Repo(initial); const hold = heldCrypto(method); const controller = create(repo, hold.crypto);
    const operation = settle(invoke(controller));
    await hold.entered;
    controller.lock();
    check(`${name}: synchronous lock takes effect`, controller._dek === null, true);
    hold.release(); const settled = await operation;
    const status = await controller.getStatus();
    check(`${name}: late completion leaves this controller locked`, status.locked, true);
    check(`${name}: later plaintext read remains denied`, await privateReadDenied(controller), true);
    observations.push({ name, outcome: settled.fulfilled ? 'fulfilled' : settled.code, commits: repo.commits, enabled: status.enabled, locked: status.locked });
    if (name !== 'unlock') {
      check(`${name}: storage operation reports its committed success`, settled.fulfilled, true);
      check(`${name}: lock does not roll back the accepted storage transaction`, repo.commits, 1);
    }
    // A distinct controller still authenticates durable changes, whatever the
    // chosen policy for cancelling a mutation before its persistence boundary.
    if (Vault.isVaultStore(repo.store)) {
      const fresh = create(repo);
      const password = ['recoverWithKey', 'changePassword', 'enableProtection'].includes(name) && repo.commits ? 'new password' : 'old password';
      check(`${name}: committed data remains readable with its current credential`, (await settle(fresh.unlock(password))).fulfilled, true);
    }
  }
  // Rotation obtains a key first, then blocks wrapping the replacement key.
  {
    const repo = new Repo(encrypted); const hold = heldCrypto('wrapVaultKey'); const controller = create(repo, hold.crypto);
    await controller.unlock('old password');
    const operation = settle(controller.rotateRecoveryKey(Crypto.generateRecoveryCode()));
    await hold.entered; controller.lock(); hold.release();
    const settled = await operation; const status = await controller.getStatus();
    check('rotateRecoveryKey: late completion leaves controller locked', status.locked, true);
    check('rotateRecoveryKey: later plaintext read remains denied', await privateReadDenied(controller), true);
    observations.push({ name: 'rotateRecoveryKey', outcome: settled.fulfilled ? 'fulfilled' : settled.code, commits: repo.commits, locked: status.locked });
    check('rotateRecoveryKey: storage operation reports its committed success', settled.fulfilled, true);
    check('rotateRecoveryKey: lock does not roll back accepted transaction', repo.commits, 1);
  }
  // Even the already-enabled branch must not start a new nested credential
  // operation after an explicit lock retires its original storage read.
  {
    const repo = new Repo(encrypted); const readEntered = deferred(); const releaseRead = deferred();
    const ordinaryRead = repo.read.bind(repo); let held = false;
    repo.read = async () => { const result = await ordinaryRead(); if (!held) { held = true; readEntered.resolve(); await releaseRead.promise; } return result; };
    const controller = create(repo); const operation = settle(controller.enableProtection('old password'));
    await readEntered.promise; controller.lock(); releaseRead.resolve(); const settled = await operation;
    check('enableProtection already-enabled: retired read cannot schedule fresh unlock', (await controller.getStatus()).locked, true);
    check('enableProtection already-enabled: no durable change', repo.commits, 0);
    observations.push({ name: 'enableProtection already-enabled', outcome: settled.fulfilled ? 'fulfilled' : settled.code });
  }
  // Successful key validation that was already in progress must report an
  // ordinary lock outcome rather than returning a now-null key into decryption.
  {
    const repo = new Repo(encrypted); const controller = create(repo); await controller.unlock('old password');
    const hold = heldCrypto('decryptRecord', args => args[2] === 'alloflow:workspace-recovery:store_v1:key-check'); controller.explicitCrypto = hold.crypto;
    const read = settle(controller.readPlainStore()); await hold.entered; controller.lock(); hold.release(); const result = await read;
    check('in-flight key validation: lock rejects obsolete plaintext read', result.fulfilled, false);
    check('in-flight key validation: retired read uses locked error contract', result.code, 'VAULT_LOCKED');
    check('in-flight key validation: controller stays locked', (await controller.getStatus()).locked, true);
  }
  // An obsolete failed key validation must not erase a newer accepted key.
  {
    const repo = new Repo(encrypted); const controller = create(repo); await controller.unlock('old password');
    const clean = copy(repo.store); const bytes = Buffer.from(repo.store.keyCheck.ct, 'base64'); bytes[0] ^= 255; repo.store.keyCheck.ct = bytes.toString('base64');
    const hold = heldCrypto('decryptRecord', args => args[2] === 'alloflow:workspace-recovery:store_v1:key-check'); controller.explicitCrypto = hold.crypto;
    const oldRead = settle(controller.readPlainStore()); await hold.entered;
    repo.store = clean; controller.lock(); await controller.unlock('old password');
    hold.release(); const result = await oldRead;
    check('obsolete validation failure: corrupted earlier read rejected', result.fulfilled, false);
    check('obsolete validation failure: accepted newer session preserved', (await controller.getStatus()).locked, false);
    check('obsolete validation failure: new session still reads saved content', (await settle(controller.readPlainStore())).fulfilled, true);
  }
  // No-wrapper branch also installs an authenticated key after an await.
  {
    const initial = copy(encrypted); delete initial.recoveryWrappedKey;
    const repo = new Repo(initial); const hold = heldCrypto('unwrapVaultKey'); const controller = create(repo, hold.crypto);
    const operation = settle(controller.removeRecoveryKey('old password'));
    await hold.entered; controller.lock(); hold.release(); await operation;
    check('removeRecoveryKey already-disabled: late completion stays locked', (await controller.getStatus()).locked, true);
    check('removeRecoveryKey already-disabled: no durable change', repo.commits, 0);
  }
  // A retired authentication failure must not null a later accepted unlock.
  {
    const repo = new Repo(encrypted); const hold = heldCrypto('unwrapVaultKey', args => args[1] === 'incorrect password'); const controller = create(repo, hold.crypto);
    const obsolete = settle(controller.unlock('incorrect password'));
    await hold.entered; controller.lock();
    await controller.unlock('old password');
    check('old failure: newer unlock succeeds before obsolete completion', (await controller.getStatus()).locked, false);
    hold.release(); await obsolete;
    check('old failure: obsolete error preserves accepted new key', (await controller.getStatus()).locked, false);
    check('old failure: accepted new session still reads saved content', (await settle(controller.readPlainStore())).fulfilled, true);
  }
  // Existing sequential controls.
  {
    const repo = new Repo(encrypted); const controller = create(repo);
    check('control: initial controller locked', (await controller.getStatus()).locked, true);
    check('control: ordinary bad password rejected', (await settle(controller.unlock('incorrect password'))).fulfilled, false);
    check('control: bad password remains locked', (await controller.getStatus()).locked, true);
    await controller.unlock('old password');
    check('control: ordinary unlock publishes key', (await controller.getStatus()).locked, false);
    check('control: ordinary unlocked read works', (await settle(controller.readPlainStore())).fulfilled, true);
    controller.lock();
    check('control: ordinary lock denies future plaintext', await privateReadDenied(controller), true);
    await controller.unlock('old password');
    check('control: later explicit unlock restores access', (await settle(controller.readPlainStore())).fulfilled, true);
  }
}

async function hostCreation(encrypted) {
  const host = fs.readFileSync(hostPath, 'utf8').replace(/\r\n/g, '\n');
  const begin = host.indexOf('  const getCanvasRecoveryVaultController =');
  const end = host.indexOf('  const emptyCanvasRecoveryVaultView =', begin);
  assert(begin >= 0 && end > begin);
  const body = host.slice(begin, end);
  const controllerRef = { current: null }; const initRef = { current: null };
  const deviceStorage = { async get() { return encrypted; }, async compareAndSwap() { return { applied: false }; } };
  let created = 0;
  const stack = { crypto: Crypto, vault: Vault, integration: { ...Integration, createController(...args) { created += 1; return Integration.createController(...args); } } };
  const bindings = {
    canvasRecoveryVaultControllerRef: controllerRef,
    canvasRecoveryVaultControllerInitRef: initRef,
    _alloGetCanvasDeviceStorage: async () => deviceStorage,
    _alloGetRecoveryVaultStack: async () => stack
  };
  function renderClosure() { return vm.runInNewContext(`(() => { ${body}; return getCanvasRecoveryVaultController; })()`, bindings); }
  const fromRenderA = renderClosure(); const fromRenderB = renderClosure();
  const [a, b] = await Promise.all([fromRenderA(), fromRenderB()]);
  check('host controller: concurrent first renders share one instance', a === b, true);
  check('host controller: concurrent first renders create exactly once', created, 1);
  check('host controller: every returned instance is current', a === controllerRef.current && b === controllerRef.current, true);
  check('host controller: sequential cached access remains stable', (await fromRenderA()) === controllerRef.current, true);
  check('host controller: concurrent getters initially locked', (await a.getStatus()).locked && (await b.getStatus()).locked, true);
  observations.push({ name: 'concurrent-host-getters', created, sameController: a === b });
  // A shared failing initialization releases its own latch for a genuine retry.
  controllerRef.current = null; initRef.current = null; created = 0;
  let stackCalls = 0; let failLoad = true;
  bindings._alloGetRecoveryVaultStack = async () => { stackCalls += 1; if (failLoad) throw new Error('Synthetic module unavailable'); return stack; };
  const failingA = renderClosure(); const failingB = renderClosure();
  const failures = await Promise.all([settle(failingA()), settle(failingB())]);
  check('host init failure: both waiting callers reject', failures.every(x => !x.fulfilled), true);
  check('host init failure: one shared loader attempt', stackCalls, 1);
  check('host init failure: no controller cached', controllerRef.current, null);
  check('host init failure: owning pending request released', initRef.current, null);
  failLoad = false; const retry = await renderClosure()();
  check('host init failure: subsequent retry creates controller', retry === controllerRef.current, true);
  check('host init failure: successful retry creates exactly once', created, 1);
  // An authoritative cached controller has precedence over the older load that
  // was already awaiting its dependencies.
  controllerRef.current = null; initRef.current = null;
  const existing = Integration.createController(deviceStorage, { vaultModule: Vault, crypto: Crypto });
  const entered = deferred(); const released = deferred();
  bindings._alloGetCanvasDeviceStorage = async () => { entered.resolve(); await released.promise; return deviceStorage; };
  const pending = renderClosure()(); await entered.promise;
  controllerRef.current = existing; released.resolve(); const result = await pending;
  check('host init: cached controller wins after dependency await', result === existing, true);
  check('host init: older dependency await does not overwrite cached owner', controllerRef.current === existing, true);
}

(async () => {
  const setup = new Repo(plain()); const seed = create(setup);
  const enabled = await seed.enableProtection('old password', { createRecoveryKey: true });
  const backup = await seed.exportEncryptedBackup();
  await keyInstallRaces(setup.store, enabled.recoveryCode, backup);
  await hostCreation(setup.store);
  const inputs = [vaultPath, hostPath, path.join(root, 'allo_crypto_module.js'), path.join(root, 'allo_recovery_vault_integration_module.js')].map(file => ({ path: file, sha256: hash('sha256').update(fs.readFileSync(file)).digest('hex') }));
  const result = { scope: 'Actual production Node controller/host getter with native Web Crypto; synthetic 10k crypto config; fixed render closures and stable refs; no browser or full App rendering.', passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, inputs, checks, observations };
  fs.writeFileSync(path.resolve(__dirname, output), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed, report: path.resolve(__dirname, output) }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
