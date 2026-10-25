import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic test passphrase';
const live = [];
class Store {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(String(key)) ?? null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}
function fixture(extra = {}) {
  const repository = { revision: 0, store: null,
    async read() { return { revision: this.revision, store: copy(this.store) }; },
    async compareAndSwap(expected, next) { if (expected !== this.revision) return false; this.store = copy(next); this.revision++; return true; } };
  const localStorage = new Store(), sessionStorage = new Store();
  const service = SW.createService({ repository, localStorage, sessionStorage, vaultModule: Vault, crypto: Crypto,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000, confirmExport: () => true, ...extra });
  live.push(service); return { repository, localStorage, sessionStorage, service };
}
async function prepare(service) { await service.setup(PASSWORD); const key = service.getStatus().setupRecoveryCode; const backup = await service.exportBackup(); return { key, backup }; }
function mirrorFixture(value) {
  return { value: copy(value), casCalls: 0, async read() { return copy(this.value); }, async compareAndSwap(current, next) {
    this.casCalls++;
    if (JSON.stringify(current) !== JSON.stringify(this.value)) return false;
    this.value = { ...copy(next), revision: Number(this.value?.revision || 0) + 1 }; return true;
  } };
}
afterEach(() => { live.splice(0).forEach(service => service.dispose()); });

describe('persistent clinical storage adapters', () => {
  it('rejects memory, disconnected, and uninitialized storage before invoking the repository', async () => {
    for (const status of [{ backend: 'memory', connected: true }, { backend: 'direct', connected: false }, {}]) {
      let calls = 0;
      const raw = { async read() { calls++; }, async compareAndSwap() { calls++; } };
      const repository = SW.createDurableRepository({ status: () => status }, { createDeviceRepository: () => raw });
      await expect(repository.read()).rejects.toMatchObject({ code: 'PROTECTED_STORAGE_NOT_DURABLE' });
      await expect(repository.compareAndSwap(0, {})).rejects.toMatchObject({ code: 'PROTECTED_STORAGE_NOT_DURABLE' });
      expect(calls).toBe(0);
    }
  });

  it('uses unqueued clinical storage and checks durability again after reads and commits', async () => {
    let status = { backend: 'direct', connected: true }, config;
    const raw = { async read() { status = { backend: 'memory', connected: true }; return { revision: 0, store: null }; }, async compareAndSwap() { status = { backend: 'bridge-iframe', connected: false }; return true; } };
    const repository = SW.createDurableRepository({ status: () => status }, { createDeviceRepository(storage, options) { config = options; return raw; } });
    expect(config).toEqual({ namespace: 'protected_clinical_records', key: 'store_v1', queue: false });
    await expect(repository.read()).rejects.toMatchObject({ code: 'PROTECTED_STORAGE_NOT_DURABLE' });
    status = { backend: 'bridge-popup', connected: true };
    await expect(repository.compareAndSwap(0, {})).rejects.toMatchObject({ code: 'PROTECTED_STORAGE_NOT_DURABLE' });
  });

  it('selects atomic expectations for absent, revisionless, and revisioned preference backups', async () => {
    const calls = [];
    const storage = { status: () => ({ backend: 'direct', connected: true }), async get() { return null; }, async compareAndSwap(...args) { calls.push(args); return { applied: true }; } };
    const mirror = SW.createLegacyMirror(storage);
    for (const current of [null, { allo_rw_draft: 'synthetic legacy' }, { revision: 4, allo_rw_draft: 'synthetic legacy' }]) await expect(mirror.compareAndSwap(current, { theme: 'dark' })).resolves.toBe(true);
    expect(calls.map(call => call[2])).toEqual([{ mode: 'absent' }, { mode: 'value', value: { allo_rw_draft: 'synthetic legacy' } }, 4]);
    expect(calls.every(call => call[0] === 'ls_prefs' && call[1] === 'all' && call[4].queue === false)).toBe(true);
  });

  it('does not clean readable originals after the primary commit falls back to memory', async () => {
    const raw = { revision: 0, store: null, async read() { return { revision: this.revision, store: copy(this.store) }; }, async compareAndSwap(expected, next) { this.store = copy(next); this.revision++; status = { backend: 'memory', connected: true }; return true; } };
    let status = { backend: 'direct', connected: true };
    const repository = SW.createDurableRepository({ status: () => status }, { createDeviceRepository: () => raw });
    const h = fixture({ repository }); h.localStorage.setItem('allo_rw_draft', 'only readable synthetic original');
    const { key } = await prepare(h.service);
    await expect(h.service.finishSetup({ recoveryInput: key, backupSaved: true })).rejects.toMatchObject({ code: 'PROTECTED_STORAGE_NOT_DURABLE' });
    expect(h.localStorage.getItem('allo_rw_draft')).toBe('only readable synthetic original');
    expect(h.service.getStatus().phase).toBe('setup');
  });
});

describe('verified migration of the Canvas preferences mirror', () => {
  it('encrypts every differing version and exposes the browser-local version as the current record', async () => {
    const mirror = mirrorFixture({ revision: 2, allo_rw_draft: 'older mirrored synthetic draft', theme: 'dark' });
    const h = fixture({ legacyMirror: mirror });
    h.localStorage.setItem('allo_rw_draft', 'current local synthetic draft');
    h.sessionStorage.setItem('allo_rw_draft', 'session synthetic draft');
    const { key, backup } = await prepare(h.service);
    expect(mirror.value.allo_rw_draft).toBe('older mirrored synthetic draft');
    expect(JSON.stringify(backup)).not.toMatch(/current local synthetic draft|session synthetic draft|older mirrored synthetic draft/);
    await h.service.finishSetup({ recoveryInput: key, backupSaved: true });
    const session = h.service.getSession('report-writer');
    expect(session.storage.getItem('allo_rw_draft')).toBe('current local synthetic draft');
    const archives = session.getPreservedCopies();
    expect(archives).toHaveLength(2);
    expect(archives.map(archive => session.exportPreservedCopy(archive.storedKey).value)).toEqual(['session synthetic draft', 'older mirrored synthetic draft']);
    expect(h.localStorage.getItem('allo_rw_draft')).toBeNull();
    expect(h.sessionStorage.getItem('allo_rw_draft')).toBeNull();
    expect(mirror.value.allo_rw_draft).toBeUndefined();
    expect(mirror.value.theme).toBe('dark');
    await h.service.lock(); await h.service.recover(key, 'new synthetic passphrase');
    expect(h.service.getSession('report-writer').getPreservedCopies()).toHaveLength(2);
  });

  it('retries a conflicting mirror cleanup without overwriting unrelated new preferences', async () => {
    const mirror = mirrorFixture({ revision: 1, bl_student_roster: 'synthetic mirrored roster', theme: 'light' });
    const cas = mirror.compareAndSwap.bind(mirror);
    mirror.compareAndSwap = async (current, next) => {
      if (!mirror.casCalls) { mirror.casCalls++; mirror.value = { ...mirror.value, revision: 2, theme: 'dark', newPreference: 'preserve' }; return false; }
      return cas(current, next);
    };
    const h = fixture({ legacyMirror: mirror }); const { key } = await prepare(h.service);
    await h.service.finishSetup({ recoveryInput: key, backupSaved: true });
    expect(mirror.casCalls).toBe(2);
    expect(mirror.value).toMatchObject({ theme: 'dark', newPreference: 'preserve' });
    expect(mirror.value.bl_student_roster).toBeUndefined();
    expect(h.service.getSession('behavior-lens').storage.getItem('bl_student_roster')).toBe('synthetic mirrored roster');
  });

  it('preserves a newer clinical mirror value when an older window races cleanup', async () => {
    const mirror = mirrorFixture({ revision: 1, allo_rw_draft: 'original synthetic draft' });
    mirror.compareAndSwap = async () => { mirror.casCalls++; mirror.value = { revision: 2, allo_rw_draft: 'newer synthetic work' }; return false; };
    const h = fixture({ legacyMirror: mirror }); h.localStorage.setItem('allo_rw_draft', 'original synthetic draft');
    const { key } = await prepare(h.service);
    await expect(h.service.finishSetup({ recoveryInput: key, backupSaved: true })).rejects.toMatchObject({ code: 'PROTECTED_LEGACY_CONFLICT' });
    expect(mirror.value.allo_rw_draft).toBe('newer synthetic work');
    expect(h.localStorage.getItem('allo_rw_draft')).toBe('original synthetic draft');
    expect(h.service.getStatus().phase).toBe('setup');
    expect(JSON.stringify(h.repository.store)).not.toContain('original synthetic draft');
  });

  it('refuses backup restore when the mirror holds the only legacy clinical copy', async () => {
    const original = fixture(); const { key, backup } = await prepare(original.service);
    const mirror = mirrorFixture({ allo_rw_draft: 'only mirrored synthetic draft' });
    const destination = fixture({ legacyMirror: mirror });
    await expect(destination.service.restore(backup, key, true, 'new synthetic passphrase')).rejects.toMatchObject({ code: 'PROTECTED_RESTORE_WOULD_REPLACE' });
    expect(destination.repository.store).toBeNull();
    expect(mirror.value.allo_rw_draft).toBe('only mirrored synthetic draft');
  });
});
