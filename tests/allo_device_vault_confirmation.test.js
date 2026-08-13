import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));

class Repo {
  constructor(store) { this.store = copy(store); this.revision = 0; this.readCount = 0; }
  async read() { this.readCount += 1; return { revision: this.revision, store: copy(this.store) }; }
  async compareAndSwap(expected, next) {
    if (expected !== this.revision) return false;
    this.store = copy(next);
    this.revision += 1;
    return true;
  }
}

const snapshot = id => ({
  version: 1,
  id,
  title: 'Private ' + id,
  savedAt: '2026-08-12T10:00:00.000Z',
  resourceCount: 1,
  pinned: false,
  approximateBytes: 100,
  workspace: { history: [{ id: 'r-' + id, content: 'secret' }] }
});
const plain = snapshots => ({
  version: 1,
  retentionPolicy: 'standard',
  effectiveRetentionPolicy: 'standard',
  legacyMigrationComplete: true,
  removedSnapshotIds: {},
  snapshots
});
const controller = repo => Vault.createRecoveryVaultController({
  repository: repo,
  crypto: Crypto,
  cryptoOptions: { iterations: 10000 },
  now: () => new Date('2026-08-12T12:00:00.000Z')
});

describe('confirmed recovery-key contracts', () => {
  it('uses an already-confirmed setup key and never persists it', async () => {
    const code = Crypto.generateRecoveryCode();
    const repo = new Repo(plain([snapshot('a')]));
    const vault = controller(repo);
    const result = await vault.enableProtection('saved work password', {
      createRecoveryKey: true,
      recoveryCode: code
    });
    expect(result.recoveryCode).toBe(Crypto.normalizeRecoveryCode(code));
    expect(JSON.stringify(repo.store)).not.toContain(Crypto.normalizeRecoveryCode(code));
    vault.lock();
    await expect(vault.recoverWithKey(code, 'replacement password')).resolves.toMatchObject({ recovered: true });
  });

  it('hydrates all plaintext snapshots from one repository head', async () => {
    const repo = new Repo(plain([snapshot('a'), snapshot('b')]));
    const vault = controller(repo);
    await vault.enableProtection('saved work password');
    const before = repo.readCount;
    await expect(vault.readPlainStore()).resolves.toMatchObject({ snapshots: [{ id: 'a' }, { id: 'b' }] });
    expect(repo.readCount - before).toBe(1);
  });
});
