import { vi } from 'vitest';

// Business-workflow tests start after an educator has unlocked a synthetic,
// provider-approved workspace. Browser storage is only this fixture's backing
// map, so existing draft/import characterizations can keep their setup. The
// protected-workspace suite separately exercises the real crypto service and
// verifies that production never uses this backing store.
export function installReportWriterWorkspaceFixture(React, options = {}) {
  const callbacks = new Set();
  const abort = () => Object.assign(new Error('Fixture protected session changed.'), { name: 'AbortError' });
  const control = { ready: true, locking: false, epoch: 1, approved: true, exportAllowed: true };
  const check = () => { if (!control.ready && !control.locking) throw abort(); };
  const storage = {
    getItem(key) {
      check();
      const value = window.localStorage.getItem(key);
      // Older workflow tests intentionally cover the optional session-only
      // branch. Production defaults are covered by the actual-service suite.
      return value === null && key === 'allo_rw_persist_enabled' ? String(options.persist === true) : value;
    },
    setItem(key, value) { check(); window.localStorage.setItem(key, value); },
    removeItem(key) { check(); window.localStorage.removeItem(key); },
    key(index) { check(); return window.localStorage.key(index); },
    clear() { check(); window.localStorage.clear(); },
    get length() { check(); return window.localStorage.length; }
  };
  const session = {
    storage, sessionStorage: storage,
    captureEpoch: () => control.epoch,
    isCurrent: epoch => control.ready && !control.locking && epoch === control.epoch,
    assertCurrent(epoch) { if (!this.isCurrent(epoch)) throw abort(); },
    assertCanTransmit: vi.fn(() => { session.assertCurrent(control.epoch); if (!control.approved) throw new Error('Provider approval required.'); }),
    assertCanExport: vi.fn(() => { session.assertCurrent(control.epoch); if (!control.exportAllowed) throw abort(); }),
    registerFlush: vi.fn(fn => { callbacks.add(fn); return () => callbacks.delete(fn); }),
    flush: vi.fn(async () => {}),
    consumeTransfer: vi.fn(() => null),
  };
  const genuine = new WeakSet([session]);
  const api = {
    Boundary({ children }) { return children(session); },
    isSession(value, feature) { return genuine.has(value) && control.ready && !control.locking && (!feature || feature === 'report-writer'); },
    getSession: () => session,
  };
  window.AlloModules.SensitiveWorkspace = api;
  return { api, session, control, callbacks };
}
