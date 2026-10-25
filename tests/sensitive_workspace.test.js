import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
const PASSWORD = 'a test passphrase';
class Repo {
  constructor() { this.store = null; this.revision = 0; this.fail = false; }
  async read() { return { store: copy(this.store), revision: this.revision }; }
  async compareAndSwap(expected, next) {
    if (this.fail) throw new Error('synthetic quota failure');
    if (expected !== this.revision) return false;
    this.store = copy(next); this.revision++; return true;
  }
}
class Store {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); this.failRemove = false; }
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(k) { return this.values.get(String(k)) ?? null; }
  setItem(k, v) { this.values.set(String(k), String(v)); }
  removeItem(k) { if (this.failRemove) throw new Error('synthetic removal failure'); this.values.delete(String(k)); }
}
const live = [];
function harness(extra = {}) {
  const repository = extra.repository || new Repo();
  const localStorage = extra.localStorage || new Store();
  const sessionStorage = extra.sessionStorage || new Store();
  const service = SW.createService({ repository, localStorage, sessionStorage, vaultModule: Vault,
    crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false,
    saveDelayMs: 60000, confirmExport: () => true, ...extra });
  live.push(service); return { service, repository, localStorage, sessionStorage };
}
async function setup(h) {
  await h.service.init(); await h.service.setup(PASSWORD, 0);
  const code = h.service.getStatus().setupRecoveryCode;
  const backup = await h.service.exportBackup();
  await h.service.finishSetup({ recoveryInput: code, backupSaved: true });
  return { code, backup };
}
afterEach(() => { live.splice(0).forEach(s => s.dispose()); });

describe('protected clinical record storage', () => {
  it('stages setup and independently verifies backup/recovery before touching originals', async () => {
    const h = harness({ localStorage: new Store({ bl_student_roster: '["Synthetic private learner"]', unrelated: 'leave this source' }), sessionStorage: new Store({ behaviorLens_observation_draft_v1_1: 'synthetic observation' }) });
    await h.service.init();
    await h.service.setup(PASSWORD, 0);
    expect(h.repository.store).toBeNull();
    expect(h.localStorage.getItem('bl_student_roster')).toContain('Synthetic private learner');
    expect(() => h.service.getSession('behavior-lens')).toThrow();
    const code = h.service.getStatus().setupRecoveryCode;
    await expect(h.service.finishSetup({ recoveryInput: code, backupSaved: true })).rejects.toMatchObject({ code: 'PROTECTED_BACKUP_REQUIRED' });
    const backup = await h.service.exportBackup();
    expect(JSON.stringify(backup)).not.toContain('Synthetic private learner');
    expect(JSON.stringify(backup)).not.toContain(code);
    await expect(h.service.finishSetup({ recoveryInput: 'wrong', backupSaved: true })).rejects.toMatchObject({ code: 'PROTECTED_RECOVERY_CONFIRM_REQUIRED' });
    await expect(h.service.finishSetup({ recoveryInput: code, backupSaved: false })).rejects.toMatchObject({ code: 'PROTECTED_RECOVERY_CONFIRM_REQUIRED' });
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });
    expect(h.localStorage.getItem('bl_student_roster')).toBeNull();
    expect(h.sessionStorage.length).toBe(0);
    expect(h.localStorage.getItem('unrelated')).toBe('leave this source');
    expect(JSON.stringify(h.repository.store)).not.toMatch(/Synthetic private learner|synthetic observation|bl_student_roster/);
    const s = h.service.getSession('behavior-lens');
    expect(s.storage.getItem('bl_student_roster')).toContain('Synthetic private learner');
    expect(s.sessionStorage.getItem('behaviorLens_observation_draft_v1_1')).toBe('synthetic observation');
    expect(SW.isSession(s, 'behavior-lens')).toBe(true);
    expect(SW.isSession({ ...s })).toBe(false);
  });

  it('cancels incomplete setup without leaving a password-locked store', async () => {
    const h = harness({ localStorage: new Store({ allo_rw_draft: 'synthetic old draft' }) });
    await h.service.setup(PASSWORD);
    await h.service.lock('setup-cancel');
    expect(h.service.getStatus().phase).toBe('new');
    expect(h.repository.store).toBeNull();
    expect(h.localStorage.getItem('allo_rw_draft')).toBe('synthetic old draft');
    await h.service.setup('a different passphrase');
    const code = h.service.getStatus().setupRecoveryCode;
    await h.service.exportBackup();
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('synthetic old draft');
  });

  it('preserves legacy changes made after the backup instead of overwriting them', async () => {
    const h = harness({ localStorage: new Store({ alloflow_dynamic_assessment_v1: 'original' }) });
    await h.service.setup(PASSWORD);
    const code = h.service.getStatus().setupRecoveryCode;
    await h.service.exportBackup();
    h.localStorage.setItem('alloflow_dynamic_assessment_v1', 'newer work from an older window');
    await expect(h.service.finishSetup({ recoveryInput: code, backupSaved: true })).rejects.toMatchObject({ code: 'PROTECTED_LEGACY_CONFLICT' });
    expect(h.repository.store).toBeNull();
    expect(h.localStorage.getItem('alloflow_dynamic_assessment_v1')).toBe('newer work from an older window');
  });

  it('keeps originals and staged work when initial encrypted storage is full', async () => {
    const h = harness({ localStorage: new Store({ bl_student_roster: 'legacy work' }) });
    await h.service.setup(PASSWORD); const code = h.service.getStatus().setupRecoveryCode; await h.service.exportBackup();
    h.repository.fail = true;
    await expect(h.service.finishSetup({ recoveryInput: code, backupSaved: true })).rejects.toThrow();
    expect(h.localStorage.getItem('bl_student_roster')).toBe('legacy work');
    expect(h.repository.store).toBeNull();
    h.repository.fail = false;
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });
    expect(h.service.getStatus().phase).toBe('ready');
  });

  it('does not enable real records if readable-copy cleanup fails', async () => {
    const h = harness({ localStorage: new Store({ bl_student_roster: 'legacy work' }) });
    await h.service.setup(PASSWORD); const code = h.service.getStatus().setupRecoveryCode; await h.service.exportBackup();
    h.localStorage.failRemove = true;
    await expect(h.service.finishSetup({ recoveryInput: code, backupSaved: true })).rejects.toThrow();
    expect(h.service.getStatus().phase).toBe('setup');
    expect(h.localStorage.getItem('bl_student_roster')).toBe('legacy work');
    expect(JSON.stringify(h.repository.store)).not.toContain('legacy work');
    h.localStorage.failRemove = false;
    await h.service.exportBackup();
    await h.service.finishSetup({ recoveryInput: code, backupSaved: true });
    expect(h.service.getStatus().phase).toBe('ready');
  });

  it('keeps namespaces isolated and revokes cached facades on lock', async () => {
    const h = harness(); await setup(h);
    const bl = h.service.getSession('behavior-lens'), rw = h.service.getSession('report-writer');
    bl.storage.setItem('same', 'private behavior value');
    rw.storage.setItem('same', 'private report value');
    await h.service.flush();
    expect(bl.storage.getItem('same')).toBe('private behavior value');
    expect(rw.storage.getItem('same')).toBe('private report value');
    const epoch = bl.captureEpoch(); await h.service.lock();
    expect(bl.isCurrent(epoch)).toBe(false);
    expect(SW.isSession(bl)).toBe(false);
    expect(() => bl.storage.getItem('same')).toThrow();
    await expect(h.service.unlock('wrong-password')).rejects.toThrow();
    expect(h.service.getStatus().phase).toBe('locked');
    await h.service.unlock(PASSWORD);
    expect(h.service.getSession('behavior-lens').storage.getItem('same')).toBe('private behavior value');
    expect(() => bl.storage.getItem('same')).toThrow();
  });

  it('invalidates operations before flush but permits the registered final save', async () => {
    const h = harness(); await setup(h); const s = h.service.getSession('report-writer'), oldEpoch = s.captureEpoch();
    let resume; const pause = new Promise(r => { resume = r; });
    s.registerFlush(async () => {
      expect(s.isCurrent(oldEpoch)).toBe(false);
      expect(SW.isSession(s)).toBe(false);
      s.storage.setItem('allo_rw_draft', 'latest debounced draft');
      await pause;
    });
    const closing = h.service.lock();
    expect(h.service.getStatus().phase).toBe('locking');
    expect(() => s.assertCanTransmit('ai')).toThrow();
    const secondClose = h.service.lock();
    resume(); await Promise.all([closing, secondClose]);
    expect(h.service.getStatus().phase).toBe('locked');
    await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('latest debounced draft');
  });

  it('keeps work unlocked on save failure and can retry without loss', async () => {
    const h = harness(); await setup(h); const s = h.service.getSession('report-writer'), oldEpoch = s.captureEpoch();
    s.storage.setItem('allo_rw_draft', 'unsaved synthetic report'); h.repository.fail = true;
    await expect(h.service.lock()).rejects.toMatchObject({ code: 'PROTECTED_SAVE_FAILED' });
    expect(h.service.getStatus().phase).toBe('ready');
    expect(s.storage.getItem('allo_rw_draft')).toBe('unsaved synthetic report');
    expect(s.isCurrent(oldEpoch)).toBe(false);
    expect(JSON.stringify(h.repository.store)).not.toContain('unsaved synthetic report');
    h.repository.fail = false; await h.service.lock(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('unsaved synthetic report');
  });

  it('blocks lock and incomplete backups when a module reports unsaved session-only work', async () => {
    const h = harness(); await setup(h); const s = h.service.getSession('report-writer');
    const stop = s.registerFlush(() => { const e = new Error('Save the session-only draft before locking.'); e.code = 'PROTECTED_UNSAVED_SESSION'; throw e; });
    await expect(h.service.exportBackup()).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    await expect(h.service.lock()).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(h.service.getStatus().phase).toBe('ready'); stop(); await h.service.lock();
  });

  it('backs up the latest registered draft and restores independently with the offline key', async () => {
    const h = harness(); const { code } = await setup(h); const s = h.service.getSession('report-writer');
    s.registerFlush(() => { s.storage.setItem('allo_rw_draft', 'current synthetic report'); });
    const backup = await h.service.exportBackup();
    expect(JSON.stringify(backup)).not.toContain('current synthetic report');
    const destination = harness();
    await destination.service.restore(backup, code, true, 'a replacement passphrase');
    expect(destination.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('current synthetic report');
    await destination.service.lock();
    await expect(destination.service.unlock(PASSWORD)).rejects.toThrow();
    await destination.service.unlock('a replacement passphrase');
  });

  it('rejects wrong, damaged, foreign, or replacement restores without changing saved work', async () => {
    const h = harness(); await setup(h); const backup = await h.service.exportBackup();
    const destination = harness();
    await expect(destination.service.restore(backup, 'wrong', false)).rejects.toThrow();
    expect(destination.repository.store).toBeNull();
    const damaged = copy(backup); damaged.vaultBackup.vault.records[0].payload.ct = 'AAAA';
    await expect(destination.service.restore(damaged, PASSWORD, false)).rejects.toThrow();
    expect(destination.repository.store).toBeNull();
    await expect(destination.service.restore(backup.vaultBackup, PASSWORD, false)).rejects.toMatchObject({ code: 'PROTECTED_BACKUP_INVALID' });
    await expect(h.service.restore(backup, PASSWORD, false)).rejects.toMatchObject({ code: 'PROTECTED_RESTORE_WOULD_REPLACE' });
  });

  it('keeps conflicting edits from separate windows recoverable', async () => {
    const first = harness(); await setup(first);
    const second = harness({ repository: first.repository }); await second.service.init(); await second.service.unlock(PASSWORD);
    const a = first.service.getSession('behavior-lens'), b = second.service.getSession('behavior-lens');
    a.storage.setItem('bl_student_roster', 'first window work'); b.storage.setItem('bl_student_roster', 'second window work');
    await first.service.flush();
    await expect(second.service.flush()).rejects.toMatchObject({ code: 'PROTECTED_CONFLICT' });
    expect(b.storage.getItem('bl_student_roster')).toBe('second window work');
    const reader = harness({ repository: first.repository }); await reader.service.init(); await reader.service.unlock(PASSWORD);
    expect(reader.service.getSession('behavior-lens').storage.getItem('bl_student_roster')).toBe('first window work');
  });

  it('merges edits to different encrypted feature buckets across windows', async () => {
    const first = harness(); await setup(first);
    const second = harness({ repository: first.repository }); await second.service.init(); await second.service.unlock(PASSWORD);
    first.service.getSession('behavior-lens').storage.setItem('bl_student_roster', 'behavior work');
    second.service.getSession('report-writer').storage.setItem('allo_rw_draft', 'report work');
    await Promise.all([first.service.flush(), second.service.flush()]);
    const reader = harness({ repository: first.repository }); await reader.service.init(); await reader.service.unlock(PASSWORD);
    expect(reader.service.getSession('behavior-lens').storage.getItem('bl_student_roster')).toBe('behavior work');
    expect(reader.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('report work');
  });

  it('defaults real-record AI off and restricts opt-in to the approved feature', async () => {
    let p; const h = harness({ getPolicy: () => p }); await setup(h);
    const bl = h.service.getSession('behavior-lens'), rw = h.service.getSession('report-writer');
    expect(() => bl.assertCanTransmit('ai')).toThrow(/disabled/);
    p = { version: 1, allowExternalAi: ['behavior-lens'] };
    expect(() => bl.assertCanTransmit('ai')).not.toThrow();
    expect(() => rw.assertCanTransmit('ai')).toThrow();
    p = { version: 2, allowExternalAi: ['behavior-lens'] };
    expect(() => bl.assertCanTransmit('ai')).toThrow();
  });

  it('blocks student contexts and unapproved Canvas record setup', async () => {
    const learner = harness({ getContext: () => ({ learner: true }) });
    await expect(learner.service.setup(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_CONTEXT_BLOCKED' });
    const canvas = harness({ getContext: () => ({ isCanvas: true }) });
    await expect(canvas.service.setup(PASSWORD)).rejects.toMatchObject({ code: 'PROTECTED_CANVAS_NOT_APPROVED' });
    expect(canvas.repository.store).toBeNull();
    const approved = harness({ getContext: () => ({ isCanvas: true }), policy: { version: 1, allowCanvasRecords: true } });
    await setup(approved); expect(approved.service.getStatus().phase).toBe('ready');
  });

  it('clears protected transfers on lock and requires explicit readable-export consent', async () => {
    let allowed = false; const h = harness({ confirmExport: () => allowed }); await setup(h);
    const da = h.service.getSession('dynamic-assessment'), rw = h.service.getSession('report-writer');
    da.transfer('report-writer', { private: 'synthetic intake' });
    expect(rw.consumeTransfer('dynamic-assessment')).toEqual({ private: 'synthetic intake' });
    expect(rw.consumeTransfer()).toBeNull();
    expect(() => rw.assertCanExport('json')).toThrow(); allowed = true;
    expect(() => rw.assertCanExport('json')).not.toThrow();
    da.transfer('report-writer', { private: 'another intake' }); await h.service.lock(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').consumeTransfer()).toBeNull();
  });
});
