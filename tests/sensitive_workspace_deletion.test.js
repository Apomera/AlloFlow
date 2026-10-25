import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const PASSWORD = 'synthetic deletion passphrase';
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
class Repo {
  store = null; revision = 0; fail = false;
  async read() { return { store: copy(this.store), revision: this.revision }; }
  async compareAndSwap(expected, next) { if (this.fail) throw new Error('synthetic storage failure'); if (expected !== this.revision) return false; this.store = copy(next); this.revision++; return true; }
}
class Store {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(String(key)) ?? null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}
const live = [];
let React, createRoot;
const mounted = [];
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
function fixture(extra = {}) {
  const repository = extra.repository || new Repo(), localStorage = extra.localStorage || new Store(), sessionStorage = extra.sessionStorage || new Store();
  const service = SW.createService({ repository, localStorage, sessionStorage, vaultModule: Vault, crypto: Crypto,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000, ...extra });
  live.push(service); return { service, repository, localStorage, sessionStorage };
}
async function ready(h) { await h.service.setup(PASSWORD); const key = h.service.getStatus().setupRecoveryCode; await h.service.exportBackup(); await h.service.finishSetup({ recoveryInput: key, backupSaved: true }); return key; }
const confirm = extra => ({ phrase: 'DELETE PROTECTED RECORDS', password: PASSWORD, retentionApproved: true, holdsReviewed: true, otherClinicalWindowsClosed: true, ...extra });
afterEach(async () => { if (mounted.length) await React.act(async () => { mounted.splice(0).forEach(item => { item.root.unmount(); item.node.remove(); }); }); live.splice(0).forEach(service => service.dispose()); vi.restoreAllMocks(); });

describe('reviewed deletion of the protected clinical device store', () => {
  it('requires unlocked real records and produces a count-only immutable whole-store review', async () => {
    const h = fixture(); await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_LOCKED' }); await ready(h);
    const old = h.service.getSession('behavior-lens'); old.storage.setItem('bl_private_case_name', 'SYNTHETIC PRIVATE LEARNER');
    old.transfer('report-writer', { name: 'SYNTHETIC INTAKE' });
    const plan = await h.service.prepareDeletion();
    expect(plan.scope).toBe('all-protected-clinical-records-on-this-device'); expect(plan.features).toHaveLength(3); expect(plan.pendingTransfers).toBe(1);
    expect(JSON.stringify(plan)).not.toMatch(/SYNTHETIC|bl_private_case_name/); expect(Object.isFrozen(plan)).toBe(true); expect(Object.isFrozen(plan.features[0])).toBe(true);
    expect(h.service.getStatus().phase).toBe('deletion-review'); expect(() => old.storage.getItem('bl_private_case_name')).toThrow();
    h.service.cancelDeletion(); expect(h.service.getSession('behavior-lens').storage.getItem('bl_private_case_name')).toBe('SYNTHETIC PRIVATE LEARNER');
  });

  it('stages the latest editor draft before review and blocks a session-only or temporary-source failure', async () => {
    const h = fixture(); await ready(h); const session = h.service.getSession('report-writer');
    session.registerFlush(({ forLock }) => { expect(forLock).toBe(true); session.storage.setItem('allo_rw_draft', 'latest synthetic draft'); });
    const plan = await h.service.prepareDeletion(); expect(plan.features.find(f => f.feature === 'report-writer').storedKeys).toBe(1);
    h.service.cancelDeletion(); const current = h.service.getSession('report-writer'); expect(current.storage.getItem('allo_rw_draft')).toBe('latest synthetic draft');
    current.registerFlush(() => { throw Object.assign(new Error('Preserve the temporary sources first.'), { code: 'PROTECTED_UNSAVED_SESSION' }); });
    await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' }); expect(h.service.getStatus().phase).toBe('ready');
    expect(current.storage.getItem('allo_rw_draft')).toBe('latest synthetic draft');
  });

  it('requires the exact phrase and all three operator acknowledgments before any deletion', async () => {
    const h = fixture(); await ready(h); const plan = await h.service.prepareDeletion(); const before = copy(h.repository.store);
    for (const overrides of [{ phrase: 'delete' }, { retentionApproved: false }, { holdsReviewed: false }, { otherClinicalWindowsClosed: false }]) {
      await expect(h.service.deleteClinicalRecords(plan, confirm(overrides))).rejects.toMatchObject({ code: 'PROTECTED_DELETION_CONFIRM_REQUIRED' });
      expect(h.repository.store).toEqual(before);
    }
  });

  it('rechecks the current password without deleting or losing access on a wrong password', async () => {
    const h = fixture(); await ready(h); h.service.getSession('dynamic-assessment').storage.setItem('alloflow_da_case', 'synthetic assessment');
    const plan = await h.service.prepareDeletion(); const before = copy(h.repository.store);
    await expect(h.service.deleteClinicalRecords(plan, confirm({ password: 'incorrect synthetic password' }))).rejects.toBeTruthy();
    expect(h.repository.store).toEqual(before); expect(h.service.getStatus().phase).toBe('deletion-review');
    h.service.cancelDeletion(); expect(h.service.getSession('dynamic-assessment').storage.getItem('alloflow_da_case')).toBe('synthetic assessment');
  });

  it('atomically replaces all encrypted buckets, archived copies and wrappers with a content-free tombstone', async () => {
    const h = fixture({ localStorage: new Store({ allo_rw_draft: 'current synthetic draft' }), sessionStorage: new Store({ allo_rw_draft: 'older synthetic draft' }) }); await ready(h);
    const old = h.service.getSession('report-writer'); expect(old.getPreservedCopies()).toHaveLength(1); old.transfer('behavior-lens', { private: 'pending synthetic transfer' });
    const plan = await h.service.prepareDeletion(), receipt = await h.service.deleteClinicalRecords(plan, confirm());
    expect(receipt.connectedStoreVerified).toBe(true); expect(receipt.backupsAndOtherCopiesExcluded).toBe(true);
    expect(h.repository.store).toEqual({ kind: 'alloflow-clinical-deletion-tombstone', version: 1, deletedAt: receipt.deletedAt });
    expect(JSON.stringify(h.repository.store)).not.toMatch(/wrappedKey|payload|records|draft|SYNTHETIC/);
    expect(h.service.getStatus().phase).toBe('new'); expect(() => old.storage.getItem('allo_rw_draft')).toThrow(); expect(() => h.service.getSession('report-writer')).toThrow();
  });

  it('keeps a failed CAS review and protected work available instead of claiming deletion', async () => {
    const h = fixture(); await ready(h); h.service.getSession('behavior-lens').storage.setItem('bl_case', 'preserve this synthetic work');
    const plan = await h.service.prepareDeletion(), before = copy(h.repository.store); h.repository.fail = true;
    await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toThrow(); expect(h.repository.store).toEqual(before); expect(h.service.getStatus().phase).toBe('deletion-unverified'); expect(() => h.service.cancelDeletion()).toThrow();
    h.repository.fail = false; expect(await h.service.reconcileDeletion()).toEqual({ reconciled: true, deleted: false }); h.service.cancelDeletion(); expect(h.service.getSession('behavior-lens').storage.getItem('bl_case')).toBe('preserve this synthetic work');
  });

  it('rejects cloned, cancelled and locked review capabilities', async () => {
    const h = fixture(); await ready(h); const plan = await h.service.prepareDeletion();
    await expect(h.service.deleteClinicalRecords(copy(plan), confirm())).rejects.toMatchObject({ code: 'PROTECTED_DELETION_REVIEW_REQUIRED' });
    h.service.cancelDeletion(); await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toMatchObject({ code: 'PROTECTED_DELETION_REVIEW_REQUIRED' });
    const next = await h.service.prepareDeletion(); await h.service.lock(); await expect(h.service.deleteClinicalRecords(next, confirm())).rejects.toMatchObject({ code: 'PROTECTED_DELETION_REVIEW_REQUIRED' });
  });

  it('rejects changes to any feature after review and preserves the other window’s saved work', async () => {
    const h = fixture(); await ready(h); const other = fixture({ repository: h.repository }); await other.service.init(); await other.service.unlock(PASSWORD);
    const plan = await h.service.prepareDeletion(); other.service.getSession('dynamic-assessment').storage.setItem('alloflow_da_case', 'newer synthetic work'); await other.service.flush();
    const before = copy(h.repository.store); await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toMatchObject({ code: 'PROTECTED_CONFLICT' }); expect(h.repository.store).toEqual(before); expect(() => h.service.cancelDeletion()).toThrow();
    await expect(h.service.reconcileDeletion()).rejects.toMatchObject({ code: 'PROTECTED_DELETION_STATE_CHANGED' }); expect(h.service.getStatus().phase).toBe('deletion-unverified');
    await h.service.lock(); await h.service.unlock(PASSWORD); expect(h.service.getSession('dynamic-assessment').storage.getItem('alloflow_da_case')).toBe('newer synthetic work');
  });

  it('prevents a stale unlocked window from resurrecting deleted data, including after a new setup', async () => {
    const h = fixture(); await ready(h); const other = fixture({ repository: h.repository }); await other.service.init(); await other.service.unlock(PASSWORD);
    const stale = other.service.getSession('behavior-lens'); stale.storage.setItem('bl_case', 'stale synthetic record');
    const plan = await h.service.prepareDeletion(); await h.service.deleteClinicalRecords(plan, confirm());
    await expect(other.service.flush()).rejects.toThrow(); expect(h.repository.store.kind).toBe('alloflow-clinical-deletion-tombstone');
    await ready(h); await expect(other.service.flush()).rejects.toThrow(); expect(h.service.getSession('behavior-lens').storage.getItem('bl_case')).toBeNull();
    const again = await h.service.prepareDeletion(); await h.service.deleteClinicalRecords(again, confirm()); await ready(h); expect(h.service.getStatus().phase).toBe('ready');
  });

  it('allows an explicit old-backup restore after deletion without pretending that backups were erased', async () => {
    const h = fixture(); await ready(h); h.service.getSession('report-writer').storage.setItem('allo_rw_draft', 'synthetic backed-up report'); const backup = await h.service.exportBackup();
    await h.service.deleteClinicalRecords(await h.service.prepareDeletion(), confirm());
    await h.service.restore(backup, PASSWORD, false); expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('synthetic backed-up report');
  });

  it.each([{ version: 1, legalHold: true }, { version: 1, allowManualDeletion: false }, null, { version: 2 }, { version: 1, legalHold: 'false' }, { version: 1, extra: true }])('blocks held or malformed retention policy %j', async retentionPolicy => {
    const h = fixture({ retentionPolicy }); await ready(h); await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_DELETION_HELD' }); expect(h.service.getStatus().phase).toBe('ready');
  });

  it('rechecks retention and learner context after review', async () => {
    let hold = false, learner = false; const h = fixture({ getRetentionPolicy: () => ({ version: 1, legalHold: hold }), getContext: () => ({ learner }) }); await ready(h); const plan = await h.service.prepareDeletion();
    hold = true; await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toMatchObject({ code: 'PROTECTED_DELETION_HELD' });
    hold = false; learner = true; await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toMatchObject({ code: 'PROTECTED_CONTEXT_BLOCKED' }); learner = false;
    h.service.cancelDeletion(); expect(h.service.getStatus().phase).toBe('ready');
  });

  it('preserves unreviewed legacy browser and Canvas preference copies', async () => {
    const mirror = { value: {}, async read() { return copy(this.value); }, async compareAndSwap() { throw new Error('Deletion must never rewrite unreviewed legacy data'); } };
    const h = fixture({ legacyMirror: mirror }); await ready(h);
    h.localStorage.setItem('bl_case', 'new raw work'); await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_DELETION_LEGACY_PRESENT' }); expect(h.localStorage.getItem('bl_case')).toBe('new raw work'); h.localStorage.removeItem('bl_case');
    const plan = await h.service.prepareDeletion(); mirror.value.allo_rw_draft = 'new mirrored work';
    await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toMatchObject({ code: 'PROTECTED_DELETION_LEGACY_PRESENT' }); expect(mirror.value.allo_rw_draft).toBe('new mirrored work');
    expect(Vault.isVaultStore(h.repository.store)).toBe(true);
  });

  it('waits for a pending deletion-review draft save before a concurrent role-change lock', async () => {
    const h = fixture(); await ready(h); const session = h.service.getSession('report-writer');
    let entered, release; const paused = new Promise(resolve => { entered = resolve; }), resumed = new Promise(resolve => { release = resolve; });
    session.registerFlush(async () => { session.storage.setItem('allo_rw_draft', 'latest staged synthetic draft'); entered(); await resumed; });
    const preparing = h.service.prepareDeletion(); await paused;
    let locked = false; const locking = h.service.lock('learner-transition').then(() => { locked = true; });
    await Promise.resolve(); expect(locked).toBe(false); release(); await preparing; await locking;
    expect(h.service.getStatus().phase).toBe('locked'); expect(() => session.storage.getItem('allo_rw_draft')).toThrow();
    await h.service.unlock(PASSWORD); expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('latest staged synthetic draft');
  });

  it('reports a late recreated readable copy without silently deleting that unreviewed work', async () => {
    const h = fixture(); await ready(h); const plan = await h.service.prepareDeletion(); const original = h.repository.compareAndSwap.bind(h.repository);
    h.repository.compareAndSwap = async (...args) => { const applied = await original(...args); if (applied) h.localStorage.setItem('bl_late_old_window_case', 'unreviewed old-window work'); return applied; };
    const receipt = await h.service.deleteClinicalRecords(plan, confirm());
    expect(receipt.connectedStoreVerified).toBe(true); expect(receipt.knownLegacyCopiesAbsent).toBe(false); expect(h.localStorage.getItem('bl_late_old_window_case')).toBe('unreviewed old-window work'); expect(h.service.getStatus().error).toContain('readable copies');
  });

  it('does not erase an unrecognized future record that was never included in the review', async () => {
    const h = fixture(); await ready(h);
    const other = Vault.createRecoveryVaultController({ repository: h.repository, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS } });
    await other.unlock(PASSWORD);
    await other.upsertSnapshot({ id: 'future-tool', kind: 'future-private-record', version: 1, title: 'Synthetic future record', createdAt: new Date().toISOString(), savedAt: new Date().toISOString(), pinned: true, data: { private: 'preserve this future data' } }); other.lock();
    const before = copy(h.repository.store); await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_CONFLICT' }); expect(h.repository.store).toEqual(before);
  });

  it('retains the paused work and reports uncertainty if the post-write verification becomes unavailable', async () => {
    const h = fixture(); await ready(h); h.service.getSession('report-writer').storage.setItem('allo_rw_draft', 'synthetic in-memory preserved copy'); const plan = await h.service.prepareDeletion();
    const original = h.repository.read.bind(h.repository); h.repository.read = async () => { const value = await original(); if (value.store?.kind === 'alloflow-clinical-deletion-tombstone') throw new Error('Synthetic disconnected verification'); return value; };
    await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toThrow(); expect(h.service.getStatus().phase).toBe('deletion-unverified'); expect(() => h.service.cancelDeletion()).toThrow(); expect(() => h.service.getSession('report-writer')).toThrow();
    expect(h.service.getStatus().deletedAt).toBeUndefined(); h.repository.read = original; const receipt = await h.service.reconcileDeletion(); expect(receipt.connectedStoreVerified).toBe(true); expect(h.service.getStatus().phase).toBe('new');
  });

  it('fences saving when CAS committed but its acknowledgment throws, then verifies the tombstone', async () => {
    const h = fixture(); await ready(h); const plan = await h.service.prepareDeletion(); const original = h.repository.compareAndSwap.bind(h.repository);
    h.repository.compareAndSwap = async (...args) => { await original(...args); throw new Error('Synthetic lost commit acknowledgment'); };
    await expect(h.service.deleteClinicalRecords(plan, confirm())).rejects.toThrow(); expect(h.service.getStatus().phase).toBe('deletion-unverified');
    expect(() => h.service.cancelDeletion()).toThrow(); await expect(h.service.prepareDeletion()).rejects.toMatchObject({ code: 'PROTECTED_LOCKED' });
    expect((await h.service.reconcileDeletion()).connectedStoreVerified).toBe(true); expect(h.repository.store.kind).toBe('alloflow-clinical-deletion-tombstone'); expect(h.service.getStatus().phase).toBe('new');
  });

  it('cancels a password verification safely when another action locks the review', async () => {
    let pause = false, entered, release; const paused = new Promise(resolve => { entered = resolve; }), resumed = new Promise(resolve => { release = resolve; });
    const crypto = { ...Crypto, async unwrapVaultKey(...args) { if (pause) { pause = false; entered(); await resumed; } return Crypto.unwrapVaultKey(...args); } };
    const h = fixture({ crypto }); await ready(h); const plan = await h.service.prepareDeletion(); const before = copy(h.repository.store); pause = true;
    const deleting = h.service.deleteClinicalRecords(plan, confirm()).then(value => ({ value }), error => ({ error })); await paused; await h.service.lock('learner-transition'); release();
    expect((await deleting).error.name).toBe('AbortError'); expect(h.repository.store).toEqual(before); expect(h.service.getStatus().phase).toBe('locked');
  });
});

describe('verified cross-window deletion invalidation', () => {
  it('ignores forged messages, then clears cooperating-tab RAM without resaving after a matching durable deletion', async () => {
    const previous = window.BroadcastChannel;
    const channels = [];
    class Channel {
      constructor() { channels.push(this); }
      postMessage(data) { channels.filter(c => c !== this).forEach(c => { if (c.onmessage) c.onmessage({ data }); }); }
      close() { const i = channels.indexOf(this); if (i >= 0) channels.splice(i, 1); }
    }
    window.BroadcastChannel = Channel;
    try {
      const h = fixture({ lifecycle: true }); await ready(h); const other = fixture({ repository: h.repository, lifecycle: true }); await other.service.init(); await other.service.unlock(PASSWORD);
      const session = other.service.getSession('report-writer'); session.storage.setItem('allo_rw_draft', 'unsaved stale draft');
      channels[0].postMessage({ kind: 'deleted', marker: new Date().toISOString() }); await new Promise(r => setTimeout(r, 20));
      expect(session.storage.getItem('allo_rw_draft')).toBe('unsaved stale draft');
      await h.service.deleteClinicalRecords(await h.service.prepareDeletion(), confirm()); await new Promise(r => setTimeout(r, 40));
      expect(other.service.getStatus().phase).toBe('new'); expect(() => session.storage.getItem('allo_rw_draft')).toThrow(); expect(other.service.getStatus().pending).toBe(0); expect(h.repository.store.kind).toBe('alloflow-clinical-deletion-tombstone');
    } finally { window.BroadcastChannel = previous; }
  });
});

describe('clinical deletion review interface with real encryption', () => {
  function button(node, text) { return [...node.querySelectorAll('button')].find(item => item.textContent === text); }
  const click = node => React.act(async () => { expect(node).toBeTruthy(); node.click(); });
  const input = (node, value) => React.act(async () => {
    expect(node).toBeTruthy();
    Object.getOwnPropertyDescriptor(node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  async function until(predicate) { for (let i = 0; i < 100 && !predicate(); i++) await React.act(async () => { await new Promise(r => setTimeout(r, 20)); }); expect(predicate()).toBeTruthy(); }
  async function mount(h) {
    const node = document.createElement('div'); document.body.appendChild(node); const root = createRoot(node); mounted.push({ root, node });
    function Editor({ session }) {
      const [value, setValue] = React.useState(() => session.storage.getItem('allo_rw_draft') || '');
      const draft = React.useRef(value); draft.current = value;
      React.useEffect(() => session.registerFlush(() => { session.storage.setItem('allo_rw_draft', draft.current); }), [session]);
      return React.createElement('textarea', { 'aria-label': 'Synthetic report draft', value, onChange: event => setValue(event.target.value) });
    }
    await React.act(async () => { root.render(React.createElement(SW.Boundary, { React, service: h.service, feature: 'report-writer' }, session => React.createElement(Editor, { session }))); });
    await until(() => node.querySelector('textarea')); return node;
  }
  it('pauses the saved editor for review and returns focus and the latest draft when cancelled', async () => {
    const h = fixture(); await ready(h); const node = await mount(h);
    await input(node.querySelector('textarea'), 'SYNTHETIC PRIVATE REPORT DRAFT');
    await click(button(node, 'Review clinical-record deletion')); await until(() => h.service.getStatus().phase === 'deletion-review');
    expect(node.querySelector('textarea')).toBeNull(); expect(node.textContent).not.toContain('SYNTHETIC PRIVATE REPORT DRAFT'); expect(document.activeElement.tagName).toBe('H2');
    expect(node.textContent).toContain('does not select an individual student');
    await click(button(node, 'Cancel deletion and return to records')); await until(() => node.querySelector('textarea'));
    expect(node.querySelector('textarea').value).toBe('SYNTHETIC PRIVATE REPORT DRAFT'); expect(document.activeElement).toBe(button(node, 'Review clinical-record deletion'));
  });
  it('restores focus only after an asynchronous cancel action reenables the trigger, without stealing later editor focus', async () => {
    const h = fixture(); await ready(h); const node = await mount(h);
    await click(button(node, 'Review clinical-record deletion')); await until(() => h.service.getStatus().phase === 'deletion-review');
    const original = h.service.cancelDeletion; let finish;
    h.service.cancelDeletion = () => { original(); return new Promise(resolve => { finish = resolve; }); };
    await click(button(node, 'Cancel deletion and return to records')); await until(() => node.querySelector('textarea'));
    const trigger = button(node, 'Review clinical-record deletion');
    expect(trigger.disabled).toBe(true); expect(document.activeElement).not.toBe(trigger);
    await React.act(async () => { finish(); }); await until(() => !trigger.disabled && document.activeElement === trigger);
    const editor = node.querySelector('textarea'); editor.focus(); await input(editor, 'Synthetic edit after cancel');
    expect(document.activeElement).toBe(editor);
  });
  it('requires scoped confirmations and password through the actual review UI before clearing records', async () => {
    const h = fixture(); await ready(h); const node = await mount(h); await input(node.querySelector('textarea'), 'SYNTHETIC REPORT TO DELETE');
    await click(button(node, 'Review clinical-record deletion')); await until(() => h.service.getStatus().phase === 'deletion-review');
    const field = label => [...node.querySelectorAll('label')].find(item => item.textContent.includes(label))?.querySelector('input');
    for (const check of node.querySelectorAll('input[type=checkbox]')) await click(check);
    await input(field('Type DELETE PROTECTED RECORDS'), 'DELETE PROTECTED RECORDS'); await input(field('Re-enter the saved-records password'), PASSWORD);
    await click(button(node, 'Delete this device’s protected clinical records')); await until(() => h.service.getStatus().phase === 'new');
    expect(node.querySelector('textarea')).toBeNull(); expect(node.textContent).toContain('Protected clinical records were deleted from the connected device store'); expect(h.repository.store.kind).toBe('alloflow-clinical-deletion-tombstone');
  });
  it('offers reconciliation instead of a resume/cancel route when the delete acknowledgment is lost', async () => {
    const h = fixture(); await ready(h); const node = await mount(h); await input(node.querySelector('textarea'), 'SYNTHETIC ACKNOWLEDGMENT CASE');
    await click(button(node, 'Review clinical-record deletion')); await until(() => h.service.getStatus().phase === 'deletion-review');
    for (const check of node.querySelectorAll('input[type=checkbox]')) await click(check);
    const fields = node.querySelectorAll('input:not([type=checkbox])'); await input(fields[0], 'DELETE PROTECTED RECORDS'); await input(fields[1], PASSWORD);
    const original = h.repository.compareAndSwap.bind(h.repository); h.repository.compareAndSwap = async (...args) => { await original(...args); throw new Error('Synthetic lost acknowledgment'); };
    await click(button(node, 'Delete this device’s protected clinical records')); await until(() => h.service.getStatus().phase === 'deletion-unverified');
    expect(node.querySelector('textarea')).toBeNull(); expect(button(node, 'Cancel deletion and return to records')).toBeUndefined(); expect(document.activeElement.textContent).toBe('Deletion status is not verified');
    await click(button(node, 'Recheck connected storage')); await until(() => h.service.getStatus().phase === 'new'); expect(node.textContent).toContain('Protected clinical records were deleted');
  });
});
