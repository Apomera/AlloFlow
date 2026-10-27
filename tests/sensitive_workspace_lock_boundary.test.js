import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const PASSWORD = 'synthetic locking passphrase';
const services = [];

function barrier() {
  let entered, release;
  const paused = new Promise(resolve => { entered = resolve; });
  const resumed = new Promise(resolve => { release = resolve; });
  return { paused, release, async wait() { entered(); await resumed; } };
}
function fixture(kind) {
  let revoked = false;
  const repository = { revision: 0, store: null,
    async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(expected, next) {
      if (expected !== this.revision) return false;
      this.store = clone(next); this.revision++; return true;
    }
  };
  const options = { repository, crypto: Crypto, vaultModule: Vault,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 60000,
    getContext: () => ({ learner: kind === 'learner' && revoked, isCanvas: kind === 'canvas-policy' }),
    getPolicy: () => ({ version: 1, allowCanvasRecords: !revoked, allowExternalAi: [] })
  };
  const service = SW.createService(options); services.push(service);
  return { service, repository, revoke() { revoked = true; }, allow() { revoked = false; } };
}
async function ready(service) {
  await service.setup(PASSWORD);
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
}
function attempt(fn) { try { return { value: fn() }; } catch (error) { return { code: error.code }; } }
afterEach(() => { services.splice(0).forEach(service => service.dispose()); });

describe('protected lock access boundary after context revocation', () => {
  it.each(['learner', 'canvas-policy'])('denies ordinary reads and writes during a pending %s lock while preserving the registered final save', async kind => {
    const h = fixture(kind); await ready(h.service);
    const session = h.service.getSession('report-writer');
    session.storage.setItem('allo_rw_draft', 'SYNTHETIC SAVED RECORD');
    await h.service.flush();
    const gate = barrier();
    session.registerFlush(async () => {
      session.storage.setItem('allo_rw_draft', 'SYNTHETIC REGISTERED FINAL DRAFT');
      await gate.wait();
    });
    h.revoke();
    const closing = h.service.lock('context-change');
    await gate.paused;
    let observed;
    try {
      expect(h.service.getStatus().phase).toBe('locking');
      expect(h.service.isSession(session)).toBe(false);
      expect(() => session.assertCanExport('json')).toThrow();
      expect(() => session.assertCanTransmit('ai')).toThrow();
      // These calls happen in the ordinary caller while the registered callback
      // is suspended; they are not part of the callback's final-save work.
      observed = {
        getItem: attempt(() => session.storage.getItem('allo_rw_draft')),
        key: attempt(() => session.storage.key(0)),
        length: attempt(() => session.storage.length),
        setItem: attempt(() => session.storage.setItem('allo_rw_draft', 'SYNTHETIC ORDINARY CALLER REPLACEMENT')),
        removeItem: attempt(() => session.storage.removeItem('allo_rw_missing')),
        clear: attempt(() => session.storage.clear())
      };
    } finally { gate.release(); await closing; }
    const expectedCode = kind === 'learner' ? 'PROTECTED_CONTEXT_BLOCKED' : 'PROTECTED_CANVAS_NOT_APPROVED';
    expect(Object.fromEntries(Object.entries(observed).map(([name, result]) => [name, Boolean(result.code)]))).toEqual({
      getItem: true, key: true, length: true, setItem: true, removeItem: true, clear: true
    });
    expect(Object.values(observed).every(result => ['PROTECTED_LOCKED', expectedCode].includes(result.code))).toBe(true);
    expect(h.service.getStatus().phase).toBe('locked');
    h.allow(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC REGISTERED FINAL DRAFT');
  });

  it('limits a registered final save to its own feature and clears permission before awaiting it', async () => {
    const h = fixture('learner'); await ready(h.service);
    const report = h.service.getSession('report-writer'), behavior = h.service.getSession('behavior-lens');
    behavior.storage.setItem('bl_draft', 'SYNTHETIC OTHER FEATURE'); await h.service.flush();
    const gate = barrier(); let foreign, resumed;
    report.registerFlush(async () => {
      report.storage.setItem('allo_rw_draft', 'SYNTHETIC OWN FINAL SAVE');
      foreign = attempt(() => behavior.storage.getItem('bl_draft'));
      await gate.wait();
      resumed = attempt(() => report.storage.setItem('allo_rw_draft', 'SYNTHETIC LATE REPLACEMENT'));
    });
    h.revoke(); const closing = h.service.lock('context-change');
    await gate.paused; gate.release(); await closing;
    expect(Boolean(foreign.code)).toBe(true);
    expect(Boolean(resumed.code)).toBe(true);
    h.allow(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC OWN FINAL SAVE');
    expect(h.service.getSession('behavior-lens').storage.getItem('bl_draft')).toBe('SYNTHETIC OTHER FEATURE');
  });

  it('does not lend final-save access to reentrant status subscribers', async () => {
    const h = fixture('learner'); await ready(h.service);
    const report = h.service.getSession('report-writer'), behavior = h.service.getSession('behavior-lens');
    const observed = [];
    h.service.subscribe(status => {
      if (status.phase === 'locking' && status.pending) observed.push({
        own: attempt(() => report.storage.getItem('allo_rw_draft')),
        foreign: attempt(() => behavior.storage.getItem('bl_draft')),
        write: attempt(() => report.storage.setItem('allo_rw_draft', 'SYNTHETIC REENTRANT REPLACEMENT'))
      });
    });
    report.registerFlush(() => { report.storage.setItem('allo_rw_draft', 'SYNTHETIC REGISTERED DRAFT'); });
    h.revoke(); await h.service.lock('context-change');
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.every(result => result.own.code && result.foreign.code && result.write.code)).toBe(true);
    h.allow(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC REGISTERED DRAFT');
  });

  it('clears synchronous staging permission after a callback throws and preserves the draft for an authorized retry', async () => {
    const h = fixture('learner'); await ready(h.service);
    const report = h.service.getSession('report-writer');
    const unregister = report.registerFlush(() => {
      report.storage.setItem('allo_rw_draft', 'SYNTHETIC DRAFT BEFORE FAILURE');
      throw Object.assign(new Error('synthetic final-save failure'), { code: 'SYNTHETIC_FLUSH_FAILURE' });
    });
    await expect(h.service.lock()).rejects.toMatchObject({ code: 'SYNTHETIC_FLUSH_FAILURE' });
    expect(report.storage.getItem('allo_rw_draft')).toBe('SYNTHETIC DRAFT BEFORE FAILURE');
    h.revoke(); expect(() => report.storage.getItem('allo_rw_draft')).toThrow();
    h.allow(); unregister(); await h.service.lock(); await h.service.unlock(PASSWORD);
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC DRAFT BEFORE FAILURE');
  });

  it.each([false, true])('hides the mounted editor while saving and preserves its latest draft (save failure: %s)', async failSave => {
    const React = require('../desktop/web-app/node_modules/react');
    const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
    const oldActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const h = fixture('learner'); await ready(h.service);
    const node = document.createElement('div'); document.body.appendChild(node);
    const root = createRoot(node), gate = barrier();
    let editorUnmounted = false, closing;
    function Editor({ session }) {
      React.useEffect(() => () => { editorUnmounted = true; }, []);
      React.useEffect(() => session.registerFlush(async () => {
        session.storage.setItem('allo_rw_draft', 'SYNTHETIC LATEST EDITOR DRAFT');
        await gate.wait();
      }), [session]);
      return React.createElement('textarea', { 'aria-label': 'Synthetic protected editor', defaultValue: 'SYNTHETIC VISIBLE STAFF CONTENT' });
    }
    try {
      await React.act(async () => { root.render(React.createElement(SW.Boundary, { React, service: h.service, feature: 'report-writer' }, session => React.createElement(Editor, { session }))); });
      const editor = node.querySelector('textarea'); expect(editor).toBeTruthy(); editor.focus();
      if (!failSave) h.revoke();
      const originalCas = h.repository.compareAndSwap.bind(h.repository);
      h.repository.compareAndSwap = async (...args) => { if (failSave) throw new Error('synthetic save unavailable'); return originalCas(...args); };
      await React.act(async () => { closing = h.service.lock('context-change').then(value => ({ value }), error => ({ error })); await gate.paused; });
      const visibility = { hidden: Boolean(editor.closest('[hidden]')), ariaHidden: Boolean(editor.closest('[aria-hidden="true"]')),
        mounted: node.contains(editor), unmounted: editorUnmounted, focused: document.activeElement === editor };
      await React.act(async () => { gate.release(); await closing; });
      expect(visibility).toEqual({ hidden: true, ariaHidden: true, mounted: true, unmounted: false, focused: false });
      if (failSave) {
        expect(h.service.getStatus().phase).toBe('ready');
        expect(node.querySelector('textarea')).toBe(editor);
        expect(editor.closest('[hidden]')).toBeNull();
        expect(editor.value).toBe('SYNTHETIC VISIBLE STAFF CONTENT');
        expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC LATEST EDITOR DRAFT');
        h.repository.compareAndSwap = originalCas;
        await React.act(async () => { await h.service.lock(); });
      }
      h.allow();
      await React.act(async () => { await h.service.unlock(PASSWORD); });
      expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC LATEST EDITOR DRAFT');
    } finally {
      gate.release(); if (closing) await closing;
      await React.act(async () => { root.unmount(); node.remove(); });
      globalThis.IS_REACT_ACT_ENVIRONMENT = oldActEnvironment;
    }
  });
});
