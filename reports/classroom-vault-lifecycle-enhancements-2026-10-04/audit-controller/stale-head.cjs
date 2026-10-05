'use strict';
// A completed old repository read is delayed while this same controller
// accepts a different native-encrypted backup and its distinct data key.
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict'); const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..'); const output = process.argv[2] || 'head-baseline.json'; const modulePath = path.resolve(root, process.argv[3] || 'allo_device_vault_module.js');
const Vault = require(modulePath); const Crypto = require(path.join(root, 'allo_crypto_module.js')); const checks = [];
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
function check(name, actual, expected) { try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); } catch (_) { checks.push({ name, passed: false, actual, expected }); } }
function gate() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle(promise) { try { return { fulfilled: true, result: await promise }; } catch (error) { return { fulfilled: false, code: error.code }; } }
class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.hold = null; }
  async read() { const result = { revision: this.revision, store: copy(this.store) }; if (this.hold) { const hold = this.hold; this.hold = null; hold.entered.resolve(); await hold.release.promise; } return result; }
  async compareAndSwap(revision, next) { if (revision !== this.revision) return false; this.store = copy(next); this.revision += 1; return true; }
}
const plain = title => ({ version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', legacyMigrationComplete: true, snapshots: [{ version: 1, id: 'synthetic', title, savedAt: '2026-10-04T12:00:00.000Z', pinned: false, resourceCount: 1, workspace: { sourceTopic: title } }] });
const create = repo => Vault.createRecoveryVaultController({ repository: repo, crypto: Crypto, cryptoOptions: { iterations: 10000 } });
(async () => {
  const first = new Repo(plain('Synthetic A')); await create(first).enableProtection('old password');
  const second = new Repo(plain('Synthetic B')); const secondController = create(second); await secondController.enableProtection('new password'); const backup = await secondController.exportEncryptedBackup();
  const cases = [ ['readPlainStore', c => c.readPlainStore()], ['listSnapshots', c => c.listSnapshots({ decryptTitles: true })], ['restoreSnapshot', c => c.restoreSnapshot('synthetic')] ];
  for (const [name, invoke] of cases) {
    const repo = new Repo(first.store); const controller = create(repo); await controller.unlock('old password');
    const entered = gate(); const release = gate(); repo.hold = { entered, release };
    const obsolete = settle(invoke(controller)); await entered.promise;
    await controller.importEncryptedBackup(backup, 'new password', { replace: true });
    check(`${name}: newer accepted backup session starts unlocked`, (await controller.getStatus()).locked, false);
    release.resolve(); const result = await obsolete;
    check(`${name}: obsolete head cannot produce old plaintext`, result.fulfilled, false);
    check(`${name}: retired old-head failure uses locked contract`, result.code, 'VAULT_LOCKED');
    check(`${name}: old-head verification preserves new accepted key`, (await controller.getStatus()).locked, false);
    const read = await settle(controller.readPlainStore());
    check(`${name}: new accepted backup remains readable`, read.fulfilled, true);
    check(`${name}: current backup retains its own content`, read.fulfilled ? read.result.snapshots[0].title : '', 'Synthetic B');
  }
  const result = { scope: 'Actual controller/native Web Crypto; completed stale repository read versus accepted different-DEK backup; no browser/App or other-tab revocation.', passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, modulePath, sha256: createHash('sha256').update(fs.readFileSync(modulePath)).digest('hex'), checks };
  fs.writeFileSync(path.resolve(__dirname, output), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: result.passed, failed: result.failed, report: path.resolve(__dirname, output) }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
