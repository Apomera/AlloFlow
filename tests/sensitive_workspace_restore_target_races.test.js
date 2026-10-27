import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic restore passphrase';
const services = [];

function repository(useValueTokens = false) {
  function token(repo) { return useValueTokens ? repo.store == null ? { mode: 'absent' } : { mode: 'value', value: clone(repo.store) } : repo.revision; }
  return { revision: 0, store: null,
    async read() { return { revision: token(this), store: clone(this.store) }; },
    async compareAndSwap(expected, next) {
      if (JSON.stringify(expected) !== JSON.stringify(token(this))) return false;
      this.store = clone(next); this.revision++; return true;
    }
  };
}
function service(repo, vaultModule = Vault) {
  const result = SW.createService({ repository: repo, vaultModule, crypto: Crypto,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000 });
  services.push(result); return result;
}
async function ready(value) {
  await value.setup(PASSWORD);
  const recoveryInput = value.getStatus().setupRecoveryCode;
  await value.exportBackup(); await value.finishSetup({ recoveryInput, backupSaved: true });
}
async function erase(value) {
  return value.deleteClinicalRecords(await value.prepareDeletion(), {
    phrase: 'DELETE PROTECTED RECORDS', password: PASSWORD,
    retentionApproved: true, holdsReviewed: true, otherClinicalWindowsClosed: true
  });
}
function pausedVerifier() {
  let entered, release, created = 0;
  const paused = new Promise(resolve => { entered = resolve; });
  const resumed = new Promise(resolve => { release = resolve; });
  return { paused, release, vault: { ...Vault, createRecoveryVaultController(options) {
    const controller = Vault.createRecoveryVaultController(options);
    // Controller 1 belongs to the destination; controller 2 verifies the backup
    // in isolated memory before any import reaches the connected repository.
    if (++created === 2) {
      const original = controller.readPlainStore.bind(controller);
      controller.readPlainStore = async (...args) => {
        const plain = await original(...args);
        entered(); await resumed; return plain;
      };
    }
    return controller;
  } } };
}
async function sourceBackup() {
  const source = service(repository()); await ready(source);
  source.getSession('report-writer').storage.setItem('allo_rw_draft', 'SYNTHETIC BACKUP RECORD');
  await source.flush(); return source.exportBackup();
}

afterEach(() => { services.splice(0).forEach(value => value.dispose()); });

describe('clinical restore destination identity', () => {
  it('preserves records created by another window while backup verification is paused', async () => {
    const backup = await sourceBackup(), repo = repository(), gate = pausedVerifier();
    const restoring = service(repo, gate.vault), other = service(repo);
    const pending = restoring.restore(backup, PASSWORD, false).then(value => ({ value }), error => ({ error }));
    await gate.paused;
    let current;
    try {
      await ready(other);
      other.getSession('report-writer').storage.setItem('allo_rw_draft', 'SYNTHETIC NEW PRIMARY RECORD');
      await other.flush(); current = await repo.read();
    } finally { gate.release(); }
    const result = await pending;
    expect(result.error).toBeDefined();
    expect(await repo.read()).toEqual(current);
    expect(restoring.getStatus()).toMatchObject({ phase: 'locked', enabled: true });
  });

  it.each([false, true])('preserves a later deletion without a cross-window notice (value tokens: %s)', async useValueTokens => {
    const backup = await sourceBackup(), repo = repository(useValueTokens), gate = pausedVerifier();
    const restoring = service(repo, gate.vault), other = service(repo);
    const pending = restoring.restore(backup, PASSWORD, false).then(value => ({ value }), error => ({ error }));
    await gate.paused;
    let deleted;
    try { await ready(other); await erase(other); deleted = await repo.read(); }
    finally { gate.release(); }
    const result = await pending;
    expect({ errorCode: result.error?.code, primaryKind: repo.store?.kind }).toEqual({
      errorCode: 'PROTECTED_CONFLICT', primaryKind: 'alloflow-clinical-deletion-tombstone'
    });
    expect(await repo.read()).toEqual(deleted);
    expect(restoring.getStatus()).toMatchObject({ phase: 'new', enabled: false, deletedAt: deleted.store.deletedAt });
    await restoring.restore(backup, PASSWORD, false);
    expect(restoring.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC BACKUP RECORD');
  });

  it.each([false, true])('keeps the original target revision through the final atomic import (value tokens: %s)', async useValueTokens => {
    const backup = await sourceBackup(), repo = repository(useValueTokens), other = service(repo);
    await ready(other); await erase(other);
    const restoring = service(repo), originalCas = repo.compareAndSwap.bind(repo);
    let intercept = true, deleted;
    repo.compareAndSwap = async (expected, next) => {
      if (intercept) {
        intercept = false;
        await ready(other); await erase(other); deleted = await repo.read();
      }
      return originalCas(expected, next);
    };
    await expect(restoring.restore(backup, PASSWORD, false)).rejects.toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect(await repo.read()).toEqual(deleted);
    expect(restoring.getStatus()).toMatchObject({ phase: 'new', enabled: false, deletedAt: deleted.store.deletedAt });
  });

  it('refuses restore while setup work and its recovery key are still staged', async () => {
    const backup = await sourceBackup(), repo = repository(), restoring = service(repo);
    await restoring.setup(PASSWORD);
    const recoveryInput = restoring.getStatus().setupRecoveryCode;
    await expect(restoring.restore(backup, PASSWORD, false)).rejects.toMatchObject({ code: 'PROTECTED_RESTORE_WOULD_REPLACE' });
    expect(restoring.getStatus()).toMatchObject({ phase: 'setup', setupRecoveryCode: recoveryInput });
    expect(repo.store).toBeNull();
    await restoring.exportBackup(); await restoring.finishSetup({ recoveryInput, backupSaved: true });
    expect(restoring.getStatus().phase).toBe('ready');
  });

  it.each([false, true])('reconciles an import that commits before losing its acknowledgement (read failure: %s)', async failReconciliation => {
    const backup = await sourceBackup(), repo = repository(), restoring = service(repo);
    const originalCas = repo.compareAndSwap.bind(repo), originalRead = repo.read.bind(repo);
    const lostAck = Object.assign(new Error('synthetic acknowledgement lost'), { code: 'SYNTHETIC_ACK_LOST' });
    let writes = 0, blockReads = false;
    repo.compareAndSwap = async (expected, next) => {
      writes++;
      const committed = await originalCas(expected, next);
      expect(committed).toBe(true);
      blockReads = failReconciliation;
      throw lostAck;
    };
    repo.read = async () => {
      if (blockReads) throw new Error('synthetic storage read unavailable');
      return originalRead();
    };
    await expect(restoring.restore(backup, PASSWORD, false)).rejects.toBe(lostAck);
    expect(writes).toBe(1);
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    expect(restoring.getStatus().phase).toBe(failReconciliation ? 'loading' : 'locked');
    blockReads = false;
    await restoring.unlock(PASSWORD);
    expect(restoring.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC BACKUP RECORD');
    expect(writes).toBe(1);
  });

  it.each([false, true])('locks and reconciles a committed restore when hydration cannot read (persistent: %s)', async persistent => {
    const backup = await sourceBackup(), repo = repository();
    let serviceController;
    const observingVault = { ...Vault, createRecoveryVaultController(options) {
      const controller = Vault.createRecoveryVaultController(options);
      if (!serviceController) serviceController = controller;
      return controller;
    } };
    const restoring = service(repo, observingVault);
    const originalCas = repo.compareAndSwap.bind(repo), originalRead = repo.read.bind(repo);
    const failedRead = Object.assign(new Error('synthetic post-commit hydration read failed'), { code: 'SYNTHETIC_READ_FAILED' });
    let writes = 0, readsToFail = 0;
    repo.compareAndSwap = async (expected, next) => {
      writes++;
      const committed = await originalCas(expected, next);
      expect(committed).toBe(true);
      readsToFail = persistent ? Infinity : 1;
      return committed;
    };
    repo.read = async () => { if (readsToFail > 0) { readsToFail--; throw failedRead; } return originalRead(); };
    await expect(restoring.restore(backup, PASSWORD, false)).rejects.toBe(failedRead);
    expect(writes).toBe(1);
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    const failedPhase = restoring.getStatus().phase;
    readsToFail = 0;
    expect({ phase: failedPhase, controllerLocked: (await serviceController.getStatus()).locked }).toEqual({
      phase: persistent ? 'loading' : 'locked', controllerLocked: true
    });
    expect(() => restoring.getSession('report-writer')).toThrow();
    await expect(serviceController.readPlainStore()).rejects.toMatchObject({ code: 'VAULT_LOCKED' });
    await restoring.init();
    expect(restoring.getStatus()).toMatchObject({ phase: 'locked', error: '' });
    await restoring.unlock(PASSWORD);
    expect(restoring.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC BACKUP RECORD');
    expect(writes).toBe(1);
  });

  it('lets staff recheck an uncertain restore without repeating the import', async () => {
    const React = require('../desktop/web-app/node_modules/react');
    const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
    const oldActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const backup = await sourceBackup(), repo = repository(), restoring = service(repo);
    const node = document.createElement('div'); document.body.appendChild(node);
    const root = createRoot(node);
    const originalCas = repo.compareAndSwap.bind(repo), originalRead = repo.read.bind(repo);
    let writes = 0, blockReads = false;
    try {
      await React.act(async () => { root.render(React.createElement(SW.Boundary, { React, service: restoring, feature: 'report-writer' })); });
      repo.compareAndSwap = async (expected, next) => {
        writes++; await originalCas(expected, next); blockReads = true;
        throw new Error('synthetic lost acknowledgement');
      };
      repo.read = async () => { if (blockReads) throw new Error('synthetic read unavailable'); return originalRead(); };
      await React.act(async () => { await expect(restoring.restore(backup, PASSWORD, false)).rejects.toThrow('synthetic lost acknowledgement'); });
      const retry = [...node.querySelectorAll('button')].find(button => button.textContent === 'Recheck protected storage');
      expect(retry).toBeTruthy();
      expect(node.textContent).not.toContain('Restore an encrypted backup into an empty workspace');
      blockReads = false;
      await React.act(async () => { retry.click(); });
      expect(node.textContent).toContain('Unlock protected records');
      expect(node.textContent).not.toContain('Recheck protected storage');
      expect(node.textContent).not.toContain('The restore outcome could not be checked');
      expect(writes).toBe(1);
    } finally {
      await React.act(async () => { root.unmount(); node.remove(); });
      globalThis.IS_REACT_ACT_ENVIRONMENT = oldActEnvironment;
    }
  });
});
