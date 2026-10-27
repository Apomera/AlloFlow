import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic backup passphrase';
const ORIGINAL = 'synthetic verified original';
const REPLACEMENT = 'synthetic unverified replacement';
const FAST = { iterations: Crypto.MIN_PBKDF2_ITERATIONS };
const services = [];

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

class Repo {
  constructor(store = null) { this.store = copy(store); this.revision = 0; this.writes = 0; this.beforeRead = null; }
  async read() {
    if (this.beforeRead) { const wait = this.beforeRead; this.beforeRead = null; await wait(); }
    return { store: copy(this.store), revision: this.revision };
  }
  async compareAndSwap(expected, next) {
    this.writes++;
    if (expected !== this.revision) return false;
    this.store = copy(next); this.revision++; return true;
  }
}

function snapshot(id, data) {
  return {
    id, kind: 'alloflow-clinical-record-bucket', version: 1,
    createdAt: '2026-10-26T00:00:00.000Z', savedAt: '2026-10-26T00:00:00.000Z',
    pinned: true, data,
  };
}

async function makeBackup(value, featureIds = SW.FEATURES) {
  const snapshots = [snapshot('clinical-setup', { version: 1, ready: true, idleMinutes: 0, migrationPlan: [], archives: [] }),
    ...featureIds.map(id => snapshot(id, id === 'report-writer' ? { allo_rw_draft: value } : {}))];
  const repository = new Repo({ version: 1, snapshots });
  const controller = Vault.createRecoveryVaultController({ repository, crypto: Crypto, cryptoOptions: FAST });
  try {
    await controller.enableProtection(PASSWORD, { createRecoveryKey: true });
    return { kind: SW.BACKUP_KIND, version: 1, vaultBackup: await controller.exportEncryptedBackup() };
  } finally { controller.lock(); }
}

function harness(options = {}) {
  const repository = options.repository || new Repo();
  const calls = { unwrap: 0, decrypt: 0 };
  const crypto = {
    ...Crypto,
    async unwrapVaultKey(...args) {
      calls.unwrap++;
      if (options.beforeUnwrap) await options.beforeUnwrap(calls.unwrap);
      return Crypto.unwrapVaultKey(...args);
    },
    async decryptRecord(...args) { calls.decrypt++; return Crypto.decryptRecord(...args); },
  };
  const service = SW.createService({ repository, vaultModule: Vault, crypto, cryptoOptions: FAST, lifecycle: false });
  services.push(service);
  return { service, repository, calls };
}

let originalBackup, replacementBackup, sparseBackup;
beforeAll(async () => {
  originalBackup = await makeBackup(ORIGINAL);
  replacementBackup = await makeBackup(REPLACEMENT, ['unexpected-record']);
  sparseBackup = await makeBackup(ORIGINAL, ['report-writer']);
});
afterEach(() => { services.splice(0).forEach(service => service.dispose()); });

describe('protected clinical backup validation before cryptography', () => {
  it('restores and reopens a real encrypted clinical backup without plaintext persistence', async () => {
    const h = harness();
    await expect(h.service.restore(copy(originalBackup), PASSWORD, false)).resolves.toMatchObject({ phase: 'ready' });
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe(ORIGINAL);
    expect(JSON.stringify(h.repository.store)).not.toContain(ORIGINAL);
    await h.service.lock('roundtrip');
    const reopened = harness({ repository: h.repository });
    await reopened.service.unlock(PASSWORD);
    expect(reopened.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe(ORIGINAL);
  });

  it('accepts historical backups that omit empty clinical feature buckets', async () => {
    const h = harness();
    await expect(h.service.restore(copy(sparseBackup), PASSWORD, false)).resolves.toMatchObject({ phase: 'ready' });
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe(ORIGINAL);
    expect(h.service.getSession('behavior-lens').storage.length).toBe(0);
    expect(h.service.getSession('dynamic-assessment').storage.length).toBe(0);
  });

  const invalidCases = [
    ['unknown record identifier', vault => { vault.records.find(r => r.id === 'report-writer').id = 'unexpected-record'; }],
    ['prototype record identifier', vault => { vault.records.find(r => r.id === 'report-writer').id = '__proto__'; }],
    ['constructor record identifier', vault => { vault.records.find(r => r.id === 'report-writer').id = 'constructor'; }],
    ['excess record count', vault => { vault.records.push(copy(vault.records[0])); }],
    ['duplicate clinical identifier', vault => { vault.records[1] = copy(vault.records[0]); }],
    ['missing setup record', vault => { vault.records = vault.records.filter(r => r.id !== 'clinical-setup'); }],
    ['empty record list', vault => { vault.records = []; }],
    ['non-array record list', vault => { vault.records = {}; }],
  ];
  it.each(invalidCases)('rejects %s before deriving keys, decrypting, or writing', async (_name, corrupt) => {
    const backup = copy(originalBackup); corrupt(backup.vaultBackup.vault);
    const h = harness();
    const error = await h.service.restore(backup, PASSWORD, false).then(() => null, value => value);
    expect({ crypto: h.calls, writes: h.repository.writes }).toEqual({ crypto: { unwrap: 0, decrypt: 0 }, writes: 0 });
    expect(['PROTECTED_BACKUP_INVALID', 'VAULT_STORE_INVALID']).toContain(error && error.code);
    expect(h.repository.store).toBeNull();
  });
});

describe('protected clinical restore input ownership', () => {
  it('detaches the selected backup before the first repository await', async () => {
    const backup = copy(originalBackup), entered = deferred(), release = deferred();
    const h = harness();
    h.repository.beforeRead = async () => { entered.resolve(); await release.promise; };
    const pending = h.service.restore(backup, PASSWORD, false).then(value => ({ value }), error => ({ error }));
    await entered.promise;
    backup.vaultBackup = copy(replacementBackup.vaultBackup);
    release.resolve();
    const outcome = await pending;
    expect(outcome.error).toBeUndefined();
    expect(outcome.value).toMatchObject({ phase: 'ready' });
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe(ORIGINAL);
    expect(h.repository.store.records.every(r => SW.FEATURES.concat('clinical-setup').includes(r.id))).toBe(true);
  });

  it('imports the same detached backup that verification authenticated despite caller mutation', async () => {
    const backup = copy(originalBackup), entered = deferred(), release = deferred();
    const h = harness({ beforeUnwrap: async count => { if (count === 1) { entered.resolve(); await release.promise; } } });
    const pending = h.service.restore(backup, PASSWORD, false).then(value => ({ value }), error => ({ error }));
    await entered.promise;
    // Verification already owns its encrypted clone. Mutating the caller's
    // later import input must not publish this valid but non-clinical vault.
    backup.vaultBackup = copy(replacementBackup.vaultBackup);
    release.resolve();
    const outcome = await pending;
    expect(h.repository.store && h.repository.store.records.some(r => r.id === 'unexpected-record')).toBe(false);
    expect(outcome.error).toBeUndefined();
    expect(outcome.value).toMatchObject({ phase: 'ready' });
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe(ORIGINAL);
  });
});
