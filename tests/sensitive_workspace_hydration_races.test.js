import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic passphrase';
const NEW_PASSWORD = 'new synthetic passphrase';
const active = [];
function barrier() {
  let entered, release;
  const paused = new Promise(resolve => { entered = resolve; });
  const resumed = new Promise(resolve => { release = resolve; });
  return { paused, release, async wait() { entered(); await resumed; } };
}
function fixture() {
  const repository = { revision: 0, store: null,
    async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(expected, next) { if (expected !== this.revision) return false; this.store = clone(next); this.revision++; return true; } };
  const gate = barrier();
  let pausedMethod = null, serviceControllerCreated = false;
  const wrappedVault = { ...Vault, createRecoveryVaultController(options) {
    const controller = Vault.createRecoveryVaultController(options);
    // Backup verification creates a separate in-memory controller; only pause
    // the real service controller after it reads the connected primary store.
    if (serviceControllerCreated) return controller;
    serviceControllerCreated = true;
    for (const method of ['readPlainStore', 'getStatus']) {
      const original = controller[method].bind(controller);
      controller[method] = async (...args) => {
        if (pausedMethod === 'before-' + method) { pausedMethod = null; await gate.wait(); }
        const value = await original(...args);
        if (pausedMethod === method) { pausedMethod = null; await gate.wait(); }
        return value;
      };
    }
    return controller;
  } };
  const options = { repository, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000 };
  const first = SW.createService({ ...options, vaultModule: wrappedVault });
  const second = SW.createService({ ...options, vaultModule: Vault });
  active.push(first, second);
  return { first, second, repository, gate, pause(method) { pausedMethod = method; } };
}
async function setup(h) {
  await h.first.setup(PASSWORD);
  const recovery = h.first.getStatus().setupRecoveryCode;
  await h.first.exportBackup();
  await h.first.finishSetup({ recoveryInput: recovery, backupSaved: true });
  h.first.getSession('report-writer').storage.setItem('allo_rw_draft', 'older synthetic clinical draft');
  await h.first.flush();
  await h.first.lock();
  await h.second.unlock(PASSWORD);
  return recovery;
}
async function readSaved(repository) {
  const controller = Vault.createRecoveryVaultController({ repository, crypto: Crypto });
  try {
    const result = await controller.unlock(PASSWORD).catch(() => controller.unlock(NEW_PASSWORD));
    expect(result.unlocked).toBe(true);
    const plain = await controller.readPlainStore();
    return plain.snapshots.find(item => item.id === 'report-writer').data;
  } finally { controller.lock(); }
}
afterEach(() => { active.splice(0).forEach(service => service.dispose()); });

describe('protected hydration snapshot consistency', () => {
  it.each([
    ['unlock', 'readPlainStore'],
    ['unlock', 'getStatus'],
    ['recover', 'readPlainStore']
  ])('blocks %s when another window saves during %s', async (action, pausedMethod) => {
    const h = fixture(), recovery = await setup(h);
    h.pause(pausedMethod);
    const pending = (action === 'recover' ? h.first.recover(recovery, NEW_PASSWORD) : h.first.unlock(PASSWORD))
      .then(value => ({ value }), error => ({ error }));
    await h.gate.paused;
    try {
      h.second.getSession('report-writer').storage.setItem('allo_rw_draft', 'newer synthetic clinical draft');
      await h.second.flush();
    } finally { h.gate.release(); }
    const result = await pending;
    expect(result.error).toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect(h.first.getStatus().phase).toBe('locked');
    expect(() => h.first.getSession('report-writer')).toThrow();
    expect((await readSaved(h.repository)).allo_rw_draft).toBe('newer synthetic clinical draft');
    await h.first.unlock(action === 'recover' ? NEW_PASSWORD : PASSWORD);
    const records = h.first.getSession('report-writer').storage;
    expect(records.getItem('allo_rw_draft')).toBe('newer synthetic clinical draft');
    records.setItem('allo_rw_other', 'independent synthetic edit');
    await h.first.flush();
    expect(await readSaved(h.repository)).toMatchObject({ allo_rw_draft: 'newer synthetic clinical draft', allo_rw_other: 'independent synthetic edit' });
  });

  it('keeps rejecting stale saves made after a coherent unlock', async () => {
    const h = fixture(); await setup(h); await h.first.unlock(PASSWORD);
    h.second.getSession('report-writer').storage.setItem('allo_rw_draft', 'newer synthetic clinical draft');
    await h.second.flush();
    h.first.getSession('report-writer').storage.setItem('allo_rw_other', 'unsaved independent synthetic edit');
    await expect(h.first.flush()).rejects.toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect((await readSaved(h.repository)).allo_rw_draft).toBe('newer synthetic clinical draft');
    expect(h.first.getSession('report-writer').storage.getItem('allo_rw_other')).toBe('unsaved independent synthetic edit');
  });

  it('can reopen a committed restore after another window saves during hydration', async () => {
    const source = fixture(); await setup(source);
    const backup = await source.second.exportBackup();
    const h = fixture(); h.pause('readPlainStore');
    const pending = h.first.restore(backup, PASSWORD, false).then(value => ({ value }), error => ({ error }));
    await h.gate.paused;
    try {
      await h.second.unlock(PASSWORD);
      h.second.getSession('report-writer').storage.setItem('allo_rw_draft', 'newer restored synthetic draft');
      await h.second.flush();
    } finally { h.gate.release(); }
    const result = await pending;
    expect(result.error).toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect(h.first.getStatus()).toMatchObject({ enabled: true, phase: 'locked' });
    expect(() => h.first.getSession('report-writer')).toThrow();
    await h.first.unlock(PASSWORD);
    expect(h.first.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('newer restored synthetic draft');
  });

  it('reconciles a deletion committed before plaintext hydration completes', async () => {
    const h = fixture(); await setup(h); h.pause('before-readPlainStore');
    const pending = h.first.unlock(PASSWORD).then(value => ({ value }), error => ({ error }));
    await h.gate.paused;
    const deletedAt = new Date().toISOString();
    try {
      expect(await h.repository.compareAndSwap(h.repository.revision, {
        kind: 'alloflow-clinical-deletion-tombstone', version: 1, deletedAt
      })).toBe(true);
    } finally { h.gate.release(); }
    const result = await pending;
    expect(result.error).toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect(h.first.getStatus()).toMatchObject({ enabled: false, phase: 'new', deletedAt });
    expect(() => h.first.getSession('report-writer')).toThrow();
    expect(h.repository.store).toEqual({ kind: 'alloflow-clinical-deletion-tombstone', version: 1, deletedAt });
    await h.first.setup(NEW_PASSWORD);
    expect(h.first.getStatus()).toMatchObject({ phase: 'setup' });
    expect(h.first.getStatus().setupRecoveryCode).toBeTruthy();
    expect(h.repository.store.kind).toBe('alloflow-clinical-deletion-tombstone');
  });

  it('preserves the invalid-backup error and stored bytes when malformed decrypted records have not changed', async () => {
    const h = fixture(); await setup(h);
    const controller = Vault.createRecoveryVaultController({ repository: h.repository, crypto: Crypto });
    try {
      await controller.unlock(PASSWORD);
      const plain = await controller.readPlainStore();
      const metadata = plain.snapshots.find(item => item.id === 'clinical-setup');
      const currentSavedAt = h.repository.store.records.find(item => item.id === metadata.id).savedAt;
      metadata.savedAt = new Date(Date.parse(currentSavedAt) + 1000).toISOString();
      metadata.data.migrationPlan = 'synthetic invalid data';
      expect((await controller.upsertSnapshot(metadata)).saved).toBe(true);
    } finally { controller.lock(); }
    const before = clone(h.repository.store);
    await expect(h.first.unlock(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_BACKUP_INVALID' });
    expect(h.first.getStatus()).toMatchObject({ enabled: true, phase: 'locked' });
    expect(() => h.first.getSession('report-writer')).toThrow();
    expect(h.repository.store).toEqual(before);
  });
});
