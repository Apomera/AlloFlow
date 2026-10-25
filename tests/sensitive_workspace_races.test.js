import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic passphrase';
const active = [];
function barrier() {
  let entered, release;
  const paused = new Promise(resolve => { entered = resolve; });
  const resumed = new Promise(resolve => { release = resolve; });
  return { paused, release, async wait() { entered(); await resumed; } };
}
function fixture(extra = {}) {
  const repository = { revision: 0, store: null,
    async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(expected, next) { if (expected !== this.revision) return false; this.store = clone(next); this.revision++; return true; } };
  const values = new Map();
  const localStorage = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)), removeItem: key => values.delete(String(key)) };
  const service = SW.createService({ repository, localStorage, vaultModule: Vault, crypto: Crypto,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000, ...extra });
  active.push(service); return { service, repository, localStorage };
}
async function ready(h) {
  await h.service.setup(PASSWORD);
  const key = h.service.getStatus().setupRecoveryCode;
  await h.service.exportBackup();
  await h.service.finishSetup({ recoveryInput: key, backupSaved: true });
  return key;
}
afterEach(() => { active.splice(0).forEach(service => service.dispose()); });

describe('protected workspace cancellation barriers', () => {
  it('cannot replace unsaved unlocked work by starting a second unlock or recovery', async () => {
    const h = fixture(); const key = await ready(h);
    const session = h.service.getSession('report-writer');
    session.storage.setItem('allo_rw_draft', 'latest unsaved synthetic draft');
    await expect(h.service.unlock(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_LOCK_REQUIRED' });
    await expect(h.service.recover(key, 'another synthetic passphrase')).rejects.toMatchObject({ code: 'PROTECTED_LOCK_REQUIRED' });
    expect(session.storage.getItem('allo_rw_draft')).toBe('latest unsaved synthetic draft');
    expect(h.service.getStatus().pending).toBe(1);
  });
  it('cannot redirect a cancelled in-memory setup commit into durable storage', async () => {
    const gate = barrier();
    let intercept = true;
    const crypto = { ...Crypto, async encryptRecord(...args) {
      if (intercept) { intercept = false; await gate.wait(); }
      return Crypto.encryptRecord(...args);
    } };
    const h = fixture({ crypto });
    h.localStorage.setItem('allo_rw_draft', 'preserved synthetic draft');
    const pending = h.service.setup(PASSWORD).then(value => ({ value }), error => ({ error }));
    await gate.paused;
    await h.service.lock('setup-cancel');
    gate.release();
    const result = await pending;
    expect(result.error).toBeTruthy();
    expect(h.repository.store).toBeNull();
    expect(h.service.getStatus().phase).toBe('new');
    expect(h.localStorage.getItem('allo_rw_draft')).toBe('preserved synthetic draft');
  });

  it('does not announce a completed unlock after lock wins during status hydration', async () => {
    const gate = barrier();
    let intercept = false;
    const vaultModule = { ...Vault, createRecoveryVaultController(options) {
      const controller = Vault.createRecoveryVaultController(options);
      const original = controller.getStatus.bind(controller);
      controller.getStatus = async () => { if (intercept) { intercept = false; await gate.wait(); } return original(); };
      return controller;
    } };
    const h = fixture({ vaultModule }); await ready(h); await h.service.lock();
    intercept = true;
    const pending = h.service.unlock(PASSWORD).then(value => ({ value }), error => ({ error }));
    await gate.paused;
    await h.service.lock('manual');
    gate.release();
    const result = await pending;
    expect(result.error).toBeTruthy();
    expect(h.service.getStatus().phase).toBe('locked');
    expect(() => h.service.getSession('behavior-lens')).toThrow();
  });

  it('does not re-enter ready after disposal during a pending encrypted lock save', async () => {
    const gate = barrier();
    const h = fixture(); await ready(h);
    const session = h.service.getSession('report-writer');
    session.registerFlush(async () => { session.storage.setItem('allo_rw_draft', 'latest synthetic draft'); await gate.wait(); });
    const pending = h.service.lock('manual').then(value => ({ value }), error => ({ error }));
    await gate.paused;
    h.service.dispose();
    gate.release();
    await pending;
    expect(h.service.getStatus().phase).not.toBe('ready');
    expect(() => h.service.getSession('report-writer')).toThrow();
  });

  it('keeps readable originals if setup is cancelled while its durable commit is pending', async () => {
    const gate = barrier();
    const h = fixture();
    h.localStorage.setItem('allo_rw_draft', 'synthetic original survives cancellation');
    await h.service.setup(PASSWORD);
    const key = h.service.getStatus().setupRecoveryCode;
    await h.service.exportBackup();
    const original = h.repository.compareAndSwap.bind(h.repository);
    let intercept = true;
    h.repository.compareAndSwap = async (...args) => {
      if (intercept) { intercept = false; await gate.wait(); }
      return original(...args);
    };
    const pending = h.service.finishSetup({ recoveryInput: key, backupSaved: true }).then(value => ({ value }), error => ({ error }));
    await gate.paused;
    await h.service.lock('setup-cancel');
    gate.release();
    const result = await pending;
    expect(result.error).toBeTruthy();
    expect(h.localStorage.getItem('allo_rw_draft')).toBe('synthetic original survives cancellation');
    expect(h.service.getStatus().phase).not.toBe('ready');
    expect(() => h.service.getSession('report-writer')).toThrow();
  });

  it('cannot persist a recovery-key rotation from a cancelled staged setup', async () => {
    const gate = barrier();
    let intercept = false;
    const crypto = { ...Crypto, async wrapVaultKey(...args) {
      if (intercept) { intercept = false; await gate.wait(); }
      return Crypto.wrapVaultKey(...args);
    } };
    const h = fixture({ crypto });
    await h.service.setup(PASSWORD);
    intercept = true;
    const pending = h.service.renewRecovery().then(value => ({ value }), error => ({ error }));
    await gate.paused;
    await h.service.lock('setup-cancel');
    gate.release();
    const result = await pending;
    expect(result.error).toBeTruthy();
    expect(h.repository.store).toBeNull();
    expect(h.service.getStatus().phase).toBe('new');
    expect(h.service.getStatus().setupRecoveryCode).toBe('');
  });

  it('revokes ordinary facade access when the application context changes to learner mode', async () => {
    let learner = false;
    const h = fixture({ getContext: () => ({ learner, isCanvas: false }) }); await ready(h);
    const session = h.service.getSession('report-writer');
    session.storage.setItem('allo_rw_draft', 'synthetic protected note');
    await h.service.flush();
    learner = true;
    expect(h.service.isSession(session)).toBe(false);
    expect(() => session.storage.getItem('allo_rw_draft')).toThrow();
    expect(() => session.storage.setItem('allo_rw_draft', 'unexpected learner edit')).toThrow();
    learner = false;
    expect(session.storage.getItem('allo_rw_draft')).toBe('synthetic protected note');
  });

  it('does not trust mutable display properties as capability generation or feature authority', async () => {
    const h = fixture(); await ready(h);
    const old = h.service.getSession('report-writer');
    try { old.feature = 'dynamic-assessment'; } catch (_) {}
    expect(h.service.isSession(old, 'dynamic-assessment')).toBe(false);
    await h.service.lock(); await h.service.unlock(PASSWORD);
    const current = h.service.getSession('report-writer');
    try { old._generation = current._generation; old.feature = 'report-writer'; } catch (_) {}
    expect(h.service.isSession(old, 'report-writer')).toBe(false);
    expect(() => old.storage.getItem('allo_rw_draft')).toThrow();
    expect(h.service.isSession(current, 'report-writer')).toBe(true);
  });
});
