'use strict';
// Additional independent tests of key-clear ownership and direct controller
// error policy. Root chooses the baseline or candidate module path.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const output = process.argv[2] || 'clear-baseline.json';
const modulePath = path.resolve(root, process.argv[3] || 'allo_device_vault_module.js');
const Vault = require(modulePath);
const Crypto = require(path.join(root, 'allo_crypto_module.js'));
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
const checks = [];
function check(name, actual, expected) { try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); } catch (_) { checks.push({ name, passed: false, actual, expected }); } }
function gate() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle(promise) { try { return { fulfilled: true, result: await promise }; } catch (error) { return { fulfilled: false, code: error.code }; } }
class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.commits = 0; this.hold = null; }
  async read() { return { revision: this.revision, store: copy(this.store) }; }
  async compareAndSwap(revision, next) {
    if (revision !== this.revision) return false;
    this.store = copy(next); this.revision += 1; this.commits += 1;
    if (this.hold) { const hold = this.hold; this.hold = null; hold.entered.resolve(); await hold.release.promise; }
    return true;
  }
}
const plain = () => ({ version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', legacyMigrationComplete: true, snapshots: [{ version: 1, id: 'synthetic', title: 'Synthetic', savedAt: '2026-10-04T12:00:00.000Z', pinned: false, resourceCount: 1, workspace: { sourceTopic: 'Synthetic' } }] });
const create = (repo, crypto = Crypto) => Vault.createRecoveryVaultController({ repository: repo, crypto, cryptoOptions: { iterations: 10000 } });
function heldCrypto(password) {
  const entered = gate(); const release = gate(); let used = false;
  return { entered, release, crypto: { ...Crypto, async unwrapVaultKey(...args) {
    if (used || args[1] !== password) return Crypto.unwrapVaultKey(...args);
    used = true; let result; let error;
    try { result = await Crypto.unwrapVaultKey(...args); } catch (caught) { error = caught; }
    entered.resolve(); await release.promise; if (error) throw error; return result;
  } } };
}
(async () => {
  const seedRepo = new Repo(plain()); await create(seedRepo).enableProtection('old password', { createRecoveryKey: true });
  for (const name of ['disableProtection', 'eraseAll']) {
    const repo = new Repo(seedRepo.store); const controller = create(repo); await controller.unlock('old password');
    const entered = gate(); const release = gate(); repo.hold = { entered, release };
    const obsolete = settle(name === 'disableProtection' ? controller.disableProtection('old password') : controller.eraseAll());
    await entered.promise;
    check(`${name}: accepted storage transaction completes before local key cleanup`, Vault.isVaultStore(repo.store), false);
    controller.lock(); await controller.enableProtection('new password');
    check(`${name}: later explicit protection authenticates fresh session`, (await controller.getStatus()).locked, false);
    release.resolve(); const result = await obsolete;
    check(`${name}: earlier accepted mutation reports durable success`, result.fulfilled, true);
    check(`${name}: obsolete null publication preserves fresh key`, (await controller.getStatus()).locked, false);
    check(`${name}: fresh session remains readable`, (await settle(controller.readPlainStore())).fulfilled, true);
    check(`${name}: both accepted durable transactions remain committed`, repo.commits, 2);
    check(`${name}: current persisted store stays protected`, Vault.isVaultStore(repo.store), true);
  }
  for (const name of ['changePassword', 'removeRecoveryKey']) {
    const repo = new Repo(seedRepo.store); const controller = create(repo); await controller.unlock('old password'); const before = JSON.stringify(repo.store);
    const result = await settle(name === 'changePassword' ? controller.changePassword('incorrect password', 'new password') : controller.removeRecoveryKey('incorrect password'));
    check(`${name}: current incorrect password still reports original error`, result.code, 'VAULT_PASSWORD_OR_CORRUPT');
    check(`${name}: existing accepted session remains unlocked on failed mutation`, (await controller.getStatus()).locked, false);
    check(`${name}: current failure preserves readable accepted session`, (await settle(controller.readPlainStore())).fulfilled, true);
    check(`${name}: failure preserves stored data exactly`, JSON.stringify(repo.store) === before, true);
  }
  {
    const repo = new Repo(seedRepo.store); const hold = heldCrypto('incorrect password'); const controller = create(repo, hold.crypto);
    const old = settle(controller.unlock('incorrect password')); await hold.entered.promise;
    await controller.unlock('old password'); hold.release.resolve(); await old;
    check('overlapping credential attempts: obsolete bad password preserves later accepted session', (await controller.getStatus()).locked, false);
    check('overlapping credential attempts: later accepted session remains readable', (await settle(controller.readPlainStore())).fulfilled, true);
  }
  {
    const repo = new Repo(seedRepo.store); const hold = heldCrypto('old password'); const controller = create(repo, hold.crypto);
    const old = settle(controller.unlock('old password')); await hold.entered.promise;
    const current = await settle(controller.unlock('incorrect password'));
    check('overlapping credentials: current bad password reports original error', current.code, 'VAULT_PASSWORD_OR_CORRUPT');
    hold.release.resolve(); const result = await old;
    check('overlapping credentials: old correct password is retired', result.code, 'VAULT_LOCKED');
    check('overlapping credentials: rejected current session stays locked', (await controller.getStatus()).locked, true);
  }
  const result = { scope: 'Actual controller/native Web Crypto; completed CAS and crypto gates; same-controller key ownership; no full App/browser or other-tab revocation.', passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, modulePath, sha256: createHash('sha256').update(fs.readFileSync(modulePath)).digest('hex'), checks };
  fs.writeFileSync(path.resolve(__dirname, output), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed, report: path.resolve(__dirname, output) }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
