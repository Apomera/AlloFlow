import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const FAST = { iterations: Crypto.MIN_PBKDF2_ITERATIONS };
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));

class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.reject = 0; }
  async read() { return { revision: this.revision, store: copy(this.store) }; }
  async compareAndSwap(revision, next) {
    if (this.reject > 0) { this.reject -= 1; return false; }
    if (revision !== this.revision) return false;
    this.store = copy(next);
    this.revision += 1;
    return true;
  }
  tamper(change) { const next = copy(this.store); change(next); this.store = next; this.revision += 1; }
}

const snap = (id, title) => ({
  version: 1,
  id,
  title,
  savedAt: '2026-08-12T10:00:00.000Z',
  resourceCount: 1,
  pinned: false,
  workspace: { sourceTopic: 'private-' + title, history: [{ id: 'r-' + id, content: 'secret-' + title }] }
});
const plainStore = snapshots => ({
  version: 1,
  retentionPolicy: 'standard',
  effectiveRetentionPolicy: 'standard',
  legacyMigrationComplete: true,
  removedSnapshotIds: {},
  snapshots: snapshots || []
});
const open = (repo, retries = 4) => Vault.createRecoveryVaultController({
  repository: repo,
  crypto: Crypto,
  cryptoOptions: FAST,
  maxCasRetries: retries,
  now: () => new Date('2026-08-12T12:00:00.000Z')
});

describe('AlloDeviceVault optional offline recovery key', () => {
  it('returns a one-time code and persists only encrypted wrappers', async () => {
    const sentinel = 'RECOVERY_MUST_NOT_LEAK_THIS_WORKSPACE';
    const repo = new Repo(plainStore([snap('a', sentinel)]));
    const vault = open(repo);
    const setup = await vault.enableProtection('original-password', { createRecoveryKey: true });

    expect(setup).toMatchObject({ enabled: true, recoveryEnabled: true });
    expect(Crypto.validateRecoveryCode(setup.recoveryCode)).toBe(true);
    expect(vault.confirmRecoveryCode(setup.recoveryCode, setup.recoveryCode.toLowerCase().replace(/-/g, ' '))).toBe(true);
    expect(vault.confirmRecoveryCode(setup.recoveryCode, Crypto.generateRecoveryCode())).toBe(false);
    const persisted = JSON.stringify(repo.store);
    expect(persisted).not.toContain(setup.recoveryCode);
    expect(persisted).not.toContain('original-password');
    expect(persisted).not.toContain(sentinel);
    expect(repo.store.recoveryWrappedKey).toBeTruthy();
    expect(repo.store).not.toHaveProperty('recoveryCode');
    expect(await vault.getStatus()).toMatchObject({ recoveryEnabled: true });
  });

  it('recovers by rewrapping only the DEK under a new password', async () => {
    const repo = new Repo(plainStore([snap('a', 'recoverable secret')]));
    const setupVault = open(repo);
    const { recoveryCode } = await setupVault.enableProtection('forgotten-password', { createRecoveryKey: true });
    const originalPayload = copy(repo.store.records[0].payload);
    const originalRecoveryWrapper = copy(repo.store.recoveryWrappedKey);
    setupVault.lock();

    const recovered = open(repo);
    await expect(recovered.recoverWithKey(recoveryCode, 'replacement-password'))
      .resolves.toEqual({ recovered: true, recoveryKeyRotated: false });
    expect(repo.store.records[0].payload).toEqual(originalPayload);
    expect(repo.store.recoveryWrappedKey).toEqual(originalRecoveryWrapper);
    recovered.lock();
    await expect(recovered.unlock('forgotten-password')).rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });
    await expect(recovered.unlock('replacement-password')).resolves.toMatchObject({ unlocked: true });
    expect((await recovered.restoreSnapshot('a')).title).toBe('recoverable secret');
  });

  it('fails closed for wrong or tampered recovery keys and rolls back conflicts', async () => {
    const repo = new Repo(plainStore([snap('a', 'rollback secret')]));
    const vault = open(repo, 2);
    const { recoveryCode } = await vault.enableProtection('old-password', { createRecoveryKey: true });
    vault.lock();
    const original = copy(repo.store);
    await expect(open(repo).recoverWithKey(Crypto.generateRecoveryCode(), 'new-password'))
      .rejects.toMatchObject({ code: 'VAULT_RECOVERY_KEY_OR_CORRUPT' });
    expect(repo.store).toEqual(original);

    const tamperedRepo = new Repo(original);
    tamperedRepo.tamper(next => {
      const bytes = Buffer.from(next.recoveryWrappedKey.ct, 'base64');
      bytes[0] ^= 1;
      next.recoveryWrappedKey.ct = bytes.toString('base64');
    });
    await expect(open(tamperedRepo).recoverWithKey(recoveryCode, 'new-password'))
      .rejects.toMatchObject({ code: 'VAULT_RECOVERY_KEY_OR_CORRUPT' });

    repo.reject = 2;
    await expect(open(repo, 2).recoverWithKey(recoveryCode, 'new-password'))
      .rejects.toMatchObject({ code: 'VAULT_CONFLICT' });
    expect(repo.store).toEqual(original);
  });

  it('keeps recovery optional and rotates only on an explicit unlocked action', async () => {
    const repo = new Repo(plainStore());
    const vault = open(repo);
    const setup = await vault.enableProtection('password');
    expect(setup.recoveryEnabled).toBe(false);
    expect(setup.recoveryCode).toBeNull();
    expect(repo.store).not.toHaveProperty('recoveryWrappedKey');
    await expect(open(repo).recoverWithKey(Crypto.generateRecoveryCode(), 'new-password'))
      .rejects.toMatchObject({ code: 'VAULT_RECOVERY_NOT_ENABLED' });

    const first = await vault.rotateRecoveryKey();
    const firstWrapper = copy(repo.store.recoveryWrappedKey);
    const second = await vault.rotateRecoveryKey();
    expect(Crypto.validateRecoveryCode(first.recoveryCode)).toBe(true);
    expect(second.recoveryCode).not.toBe(first.recoveryCode);
    expect(repo.store.recoveryWrappedKey).not.toEqual(firstWrapper);
    vault.lock();
    await expect(open(repo).recoverWithKey(first.recoveryCode, 'wrong-generation'))
      .rejects.toMatchObject({ code: 'VAULT_RECOVERY_KEY_OR_CORRUPT' });
    await expect(open(repo).recoverWithKey(second.recoveryCode, 'rotated-password'))
      .resolves.toMatchObject({ recovered: true });
  });
});
