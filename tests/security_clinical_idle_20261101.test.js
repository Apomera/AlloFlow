import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Workspace = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const PASSWORD = 'synthetic idle recovery passphrase';
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const services = [];

async function fixture() {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  let clock = Date.now(), failWrites = false;
  const repository = {
    revision: 0, store: null,
    async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(expected, next) {
      if (failWrites) throw new Error('synthetic storage interruption');
      if (expected !== this.revision) return false;
      this.store = clone(next); this.revision++; return true;
    }
  };
  const service = Workspace.createService({ repository, crypto: Crypto, vaultModule: Vault,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, saveDelayMs: 3600000,
    now: () => clock, getContext: () => ({ learner: false, isCanvas: false }) });
  services.push(service);
  await service.setup(PASSWORD, 5);
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  return { service, repository, fail(value) { failWrites = value; },
    async idle() { clock += 6 * 60000; await vi.advanceTimersByTimeAsync(15000); } };
}

afterEach(() => { services.splice(0).forEach(service => service.dispose()); vi.useRealTimers(); });

describe('clinical idle lock after recoverable failures', () => {
  it('resumes the configured idle lock after a failed autosave is successfully retried', async () => {
    const h = await fixture();
    const session = h.service.getSession('report-writer');
    session.storage.setItem('allo_rw_draft', 'SYNTHETIC PRESERVED DRAFT');
    h.fail(true);
    await expect(h.service.flush()).rejects.toMatchObject({ code: 'PROTECTED_SAVE_FAILED' });
    expect(h.service.getStatus()).toMatchObject({ phase: 'ready', idleMinutes: 5 });
    expect(session.storage.getItem('allo_rw_draft')).toBe('SYNTHETIC PRESERVED DRAFT');
    await h.idle();
    expect(h.service.getStatus().phase).toBe('ready');
    h.fail(false); await h.service.flush();
    await h.idle();
    expect(h.service.getStatus().phase).toBe('locked');
    await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC PRESERVED DRAFT');
  });

  it('resumes idle locking after a failed manual lock, successful retry, and password unlock', async () => {
    const h = await fixture();
    const session = h.service.getSession('report-writer');
    session.storage.setItem('allo_rw_draft', 'SYNTHETIC LATEST DRAFT');
    h.fail(true);
    await expect(h.service.lock('manual')).rejects.toThrow('remains unlocked');
    expect(session.storage.getItem('allo_rw_draft')).toBe('SYNTHETIC LATEST DRAFT');
    h.fail(false); await h.service.lock('manual'); await h.service.unlock(PASSWORD);
    expect(h.service.getStatus()).toMatchObject({ phase: 'ready', idleMinutes: 5, error: '' });
    await h.idle();
    expect(h.service.getStatus().phase).toBe('locked');
  });

  it('keeps a failing editor draft recoverable and resumes after its final-save callback succeeds', async () => {
    const h = await fixture();
    const session = h.service.getSession('report-writer');
    let failEditor = true;
    session.registerFlush(() => {
      session.storage.setItem('allo_rw_draft', 'SYNTHETIC EDITOR DRAFT');
      if (failEditor) throw Object.assign(new Error('synthetic editor failure'), { code: 'PROTECTED_UNSAVED_SESSION' });
    });
    await expect(h.service.lock('manual')).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(session.storage.getItem('allo_rw_draft')).toBe('SYNTHETIC EDITOR DRAFT');
    failEditor = false; await h.service.lock('manual'); await h.service.unlock(PASSWORD);
    await h.idle();
    expect(h.service.getStatus().phase).toBe('locked');
  });
});
