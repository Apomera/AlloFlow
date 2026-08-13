import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const FAST = { iterations: 10000 };
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));

class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.reject = 0; this.barrier = null; }
  holdReads(count) {
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    this.barrier = { count, promise, release };
  }
  async read() {
    const result = { revision: this.revision, store: copy(this.store) };
    const barrier = this.barrier;
    if (barrier && --barrier.count === 0) { this.barrier = null; barrier.release(); }
    if (barrier) await barrier.promise;
    return result;
  }
  async compareAndSwap(revision, next) {
    if (this.reject > 0) { this.reject--; return false; }
    if (revision !== this.revision) return false;
    this.store = copy(next); this.revision++; return true;
  }
  tamper(fn) { const next = copy(this.store); fn(next); this.store = next; this.revision++; }
}

const snap = (id, title, savedAt = '2026-08-12T10:00:00.000Z') => ({
  version: 1, id, title, savedAt, resourceCount: 1, pinned: false, approximateBytes: 321,
  workspace: { sourceTopic: 'private-' + title, history: [{ id: 'r-' + id, content: 'secret-' + title }] }
});
const store = (snapshots = []) => ({
  version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard',
  legacyMigrationComplete: true, removedSnapshotIds: {}, snapshots
});
const open = (repo, options = {}) => Vault.createRecoveryVaultController({
  repository: repo, crypto: options.crypto || Crypto, cryptoOptions: FAST,
  maxCasRetries: options.retries || 4,
  now: () => new Date('2026-08-12T12:00:00.000Z')
});

describe('AlloDeviceVault migration and locked lifecycle', () => {
  it('encrypts atomically without content sentinels and reloads locked', async () => {
    const sentinel = 'CONFIDENTIAL_SENTINEL_TITLE';
    const repo = new Repo(store([snap('workspace-a', sentinel)]));
    const vault = open(repo);
    await expect(vault.enableProtection('correct horse battery')).resolves.toMatchObject({ migratedSnapshots: 1 });
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    expect(repo.store.snapshots).toBeUndefined();
    const persisted = JSON.stringify(repo.store);
    expect(persisted).not.toContain(sentinel);
    expect(persisted).not.toContain('secret-');
    expect(persisted).not.toContain('correct horse battery');
    expect((await vault.restoreSnapshot('workspace-a')).title).toBe(sentinel);

    const reload = open(repo);
    await expect(reload.getStatus()).resolves.toMatchObject({ enabled: true, locked: true });
    await expect(reload.listSnapshots()).resolves.toEqual([
      expect.objectContaining({ id: 'workspace-a', title: 'Encrypted workspace', locked: true })
    ]);
    await expect(reload.restoreSnapshot('workspace-a')).rejects.toMatchObject({ code: 'VAULT_LOCKED' });
    await expect(reload.upsertSnapshot(snap('workspace-b', 'no fallback')))
      .rejects.toMatchObject({ code: 'VAULT_LOCKED' });
  });

  it('leaves plaintext untouched when encryption or CAS migration fails', async () => {
    const original = store([snap('a', 'first'), snap('b', 'second')]);
    const repo = new Repo(original);
    let calls = 0;
    const failing = { ...Crypto, async encryptRecord(...args) {
      if (++calls === 3) throw new Error('injected encryption failure');
      return Crypto.encryptRecord(...args);
    } };
    await expect(open(repo, { crypto: failing }).enableProtection('pw')).rejects.toThrow(/injected/);
    expect(repo.store).toEqual(original);
    expect(repo.revision).toBe(0);
    repo.reject = 2;
    await expect(open(repo, { retries: 2 }).enableProtection('pw')).rejects.toMatchObject({ code: 'VAULT_CONFLICT' });
    expect(repo.store).toEqual(original);
    expect(repo.revision).toBe(0);
  });
});

describe('AlloDeviceVault authentication and locked-safe operations', () => {
  it('rejects wrong passwords, ciphertext tampering, and record/AAD swaps', async () => {
    const repo = new Repo(store([
      snap('a', 'alpha', '2026-08-12T10:00:00.000Z'),
      snap('b', 'beta', '2026-08-12T11:00:00.000Z')
    ]));
    await open(repo).enableProtection('right');
    await expect(open(repo).unlock('wrong')).rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });

    const swappedRepo = new Repo(repo.store);
    swappedRepo.tamper(v => { [v.records[0].payload, v.records[1].payload] = [v.records[1].payload, v.records[0].payload]; });
    const swapped = open(swappedRepo); await swapped.unlock('right');
    await expect(swapped.restoreSnapshot(swappedRepo.store.records[0].id))
      .rejects.toMatchObject({ code: 'VAULT_RECORD_CORRUPT' });

    const tamperedRepo = new Repo(repo.store);
    tamperedRepo.tamper(v => {
      const bytes = Buffer.from(v.records[0].payload.ct, 'base64'); bytes[0] ^= 255;
      v.records[0].payload.ct = bytes.toString('base64');
    });
    const tampered = open(tamperedRepo); await tampered.unlock('right');
    await expect(tampered.restoreSnapshot(tamperedRepo.store.records[0].id))
      .rejects.toMatchObject({ code: 'VAULT_RECORD_CORRUPT' });
  });

  it('lists, pins, deletes, changes policy, and exports while locked', async () => {
    const sentinel = 'LOCKED_EXPORT_MUST_HIDE_THIS';
    const repo = new Repo(store([snap('a', sentinel), snap('b', 'delete')]));
    const vault = open(repo); await vault.enableProtection('pw'); vault.lock();
    await vault.setPinned('a', true);
    await vault.setPolicy('compact', 'compact');
    await vault.deleteSnapshot('b');
    expect(await vault.listSnapshots()).toEqual([
      expect.objectContaining({ id: 'a', pinned: true, title: 'Encrypted workspace', locked: true })
    ]);
    expect(repo.store.retentionPolicy).toBe('compact');
    expect(repo.store.removedSnapshotIds.b).toBe('2026-08-12T12:00:00.000Z');
    const backup = await vault.exportEncryptedBackup();
    expect(backup.kind).toBe(Vault.BACKUP_KIND);
    expect(JSON.stringify(backup)).not.toContain(sentinel);
  });
});

describe('AlloDeviceVault optimistic concurrency and tombstones', () => {
  it('retries conflicting encrypted upserts without losing either workspace', async () => {
    const repo = new Repo(store());
    const first = open(repo); await first.enableProtection('pw');
    const second = open(repo); await second.unlock('pw');
    repo.holdReads(2);
    await Promise.all([
      first.upsertSnapshot(snap('a', 'alpha', '2026-08-12T10:00:00.000Z')),
      second.upsertSnapshot(snap('b', 'beta', '2026-08-12T11:00:00.000Z'))
    ]);
    expect(repo.store.records.map(x => x.id).sort()).toEqual(['a', 'b']);
    expect((await first.restoreSnapshot('a')).title).toBe('alpha');
    expect((await second.restoreSnapshot('b')).title).toBe('beta');
  });

  it('does not resurrect a deleted identifier from a stale autosave', async () => {
    const repo = new Repo(store([snap('a', 'original')]));
    const eraser = open(repo); await eraser.enableProtection('pw');
    const stale = open(repo); await stale.unlock('pw');
    await eraser.deleteSnapshot('a');
    const result = await stale.upsertSnapshot(snap('a', 'stale', '2026-08-12T13:00:00.000Z'));
    expect(result).toMatchObject({ saved: false, reason: 'removed' });
    expect(repo.store.records).toHaveLength(0);
    expect(repo.store.removedSnapshotIds).toHaveProperty('a');
  });
});

describe('AlloDeviceVault rekey, disable, backup, and erase', () => {
  it('rewraps only the data key when the password changes', async () => {
    const repo = new Repo(store([snap('a', 'rekey sentinel')]));
    const vault = open(repo); await vault.enableProtection('old');
    const payload = copy(repo.store.records[0].payload);
    const keyCheck = copy(repo.store.keyCheck);
    await vault.changePassword('old', 'new');
    expect(repo.store.records[0].payload).toEqual(payload);
    expect(repo.store.keyCheck).toEqual(keyCheck);
    vault.lock();
    await expect(vault.unlock('old')).rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });
    await vault.unlock('new');
    expect((await vault.restoreSnapshot('a')).title).toBe('rekey sentinel');
  });

  it('rolls back failed disable, then atomically converts to plaintext', async () => {
    const repo = new Repo(store([snap('a', 'disable sentinel')]));
    const vault = open(repo, { retries: 2 }); await vault.enableProtection('pw');
    const encrypted = copy(repo.store); repo.reject = 2;
    await expect(vault.disableProtection()).rejects.toMatchObject({ code: 'VAULT_CONFLICT' });
    expect(repo.store).toEqual(encrypted);
    expect(Vault.isVaultStore(repo.store)).toBe(true);
    await expect(vault.disableProtection()).resolves.toMatchObject({ disabled: true, restoredSnapshots: 1 });
    expect(Vault.isVaultStore(repo.store)).toBe(false);
    expect(repo.store.snapshots[0].title).toBe('disable sentinel');
  });

  it('verifies encrypted backups before import and exports while locked', async () => {
    const sourceRepo = new Repo(store([snap('a', 'portable secret')]));
    const source = open(sourceRepo); await source.enableProtection('backup-pw'); source.lock();
    const backup = await source.exportEncryptedBackup();
    const targetRepo = new Repo(store()); const target = open(targetRepo);
    await expect(target.importEncryptedBackup(backup, 'wrong')).rejects.toMatchObject({ code: 'VAULT_PASSWORD_OR_CORRUPT' });
    expect(targetRepo.revision).toBe(0);
    await target.importEncryptedBackup(backup, 'backup-pw');
    expect((await target.restoreSnapshot('a')).title).toBe('portable secret');
  });

  it('erases protected work without requiring a password', async () => {
    const repo = new Repo(store([snap('a', 'erase secret')]));
    const vault = open(repo); await vault.enableProtection('forgotten'); vault.lock();
    await expect(vault.eraseAll()).resolves.toEqual({ erased: true });
    expect(repo.store).toEqual(Vault.emptyPlainStore());
  });
});
