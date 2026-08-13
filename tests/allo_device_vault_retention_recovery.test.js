import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const FAST = { iterations: 10000 };
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

class Repo {
  constructor(store) { this.store = clone(store); this.revision = 0; }
  async read() { return { revision: this.revision, store: clone(this.store) }; }
  async compareAndSwap(expected, next) {
    if (expected !== this.revision) return false;
    this.store = clone(next);
    this.revision += 1;
    return true;
  }
}

const savedAt = index => new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString();
const snapshot = (index, options = {}) => ({
  version: 1,
  id: 'workspace-' + index,
  title: 'Private workspace ' + index,
  savedAt: options.savedAt || savedAt(index),
  resourceCount: options.draft ? 0 : 1,
  pinned: options.pinned === true,
  approximateBytes: options.bytes || 1024,
  workspace: {
    sourceTopic: options.draft ? 'private draft' : '',
    history: options.draft ? [] : [{ id: 'resource-' + index, content: 'private content' }]
  }
});
const plainStore = snapshots => ({
  version: 1,
  retentionPolicy: 'standard',
  effectiveRetentionPolicy: 'standard',
  legacyMigrationComplete: true,
  removedSnapshotIds: {},
  snapshots
});
const open = repo => Vault.createRecoveryVaultController({
  repository: repo,
  crypto: Crypto,
  cryptoOptions: FAST,
  now: () => new Date('2026-08-12T12:00:00.000Z')
});

describe('encrypted recovery retention parity', () => {
  it('caps Standard migration at the 20 newest records without exposing plaintext', async () => {
    const repo = new Repo(plainStore(Array.from({ length: 22 }, (_, index) => snapshot(index))));
    const controller = open(repo);
    await controller.enableProtection('a strong local password');

    expect(repo.store.records).toHaveLength(20);
    expect(repo.store.records.map(record => record.id)).not.toContain('workspace-0');
    expect(repo.store.records.map(record => record.id)).not.toContain('workspace-1');
    expect(JSON.stringify(repo.store)).not.toContain('Private workspace');
  });

  it('applies Compact count, pin/newest protection, and old draft expiry using outer metadata', async () => {
    const records = Array.from({ length: 6 }, (_, index) => snapshot(index));
    records[0].pinned = true;
    const repo = new Repo(plainStore(records));
    const controller = open(repo);
    await controller.enableProtection('a strong local password');
    controller.lock();
    await controller.setPolicy('compact', 'compact');

    expect(repo.store.records.map(record => record.id)).toEqual([
      'workspace-5', 'workspace-4', 'workspace-3', 'workspace-0'
    ]);

    const draftRepo = new Repo(plainStore([
      snapshot(1, { draft: true, savedAt: '2026-07-01T00:00:00.000Z' }),
      snapshot(2, { savedAt: '2026-08-12T10:00:00.000Z' })
    ]));
    const drafts = open(draftRepo);
    await drafts.enableProtection('a strong local password');
    await drafts.setPolicy('compact', 'compact');
    expect(draftRepo.store.records.map(record => record.id)).toEqual(['workspace-2']);
  });
});

describe('optional recovery-key management and backups', () => {
  it('requires password reauthentication to remove the optional recovery wrapper', async () => {
    const repo = new Repo(plainStore([snapshot(1)]));
    const controller = open(repo);
    const setup = await controller.enableProtection('correct password', { createRecoveryKey: true });
    expect(setup.recoveryCode).toBeTruthy();

    await expect(controller.removeRecoveryKey('wrong password'))
      .rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });
    expect(repo.store.recoveryWrappedKey).toBeTruthy();
    await expect(controller.removeRecoveryKey('correct password')).resolves.toMatchObject({ removed: true });
    expect(repo.store.recoveryWrappedKey).toBeUndefined();
    controller.lock();
    await expect(controller.recoverWithKey(setup.recoveryCode, 'replacement password'))
      .rejects.toMatchObject({ code: 'VAULT_RECOVERY_NOT_ENABLED' });
  });

  it('restores an encrypted backup with its recovery key when the password is forgotten', async () => {
    const sourceRepo = new Repo(plainStore([snapshot(1)]));
    const source = open(sourceRepo);
    const setup = await source.enableProtection('forgotten password', { createRecoveryKey: true });
    const backup = await source.exportEncryptedBackup();

    const destinationRepo = new Repo(plainStore([]));
    const destination = open(destinationRepo);
    await expect(destination.importEncryptedBackup(backup, setup.recoveryCode, {
      replace: true,
      useRecoveryKey: true,
      newPassword: 'replacement password'
    })).resolves.toMatchObject({ imported: true, snapshotCount: 1 });
    await expect(destination.restoreSnapshot('workspace-1'))
      .resolves.toMatchObject({ title: 'Private workspace 1' });
    destination.lock();
    await expect(destination.unlock('replacement password')).resolves.toMatchObject({ unlocked: true });
  });
});
