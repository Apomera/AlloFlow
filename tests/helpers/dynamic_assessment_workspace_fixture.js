import { vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from '../setup.js';
import { attachRequestControlsFixture } from './protected_request_controls_fixture.js';

const require = createRequire(import.meta.url);
export async function createRealDaWorkspaceFixture(React, options = {}) {
  loadAlloModule('sensitive_workspace_module.js');
  const realApi = window.AlloModules.SensitiveWorkspace;
  const crypto = require('../../allo_crypto_module.js');
  let persisted = null, revision = 0;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const repository = {
    read: async () => ({ revision, store: clone(persisted) }),
    compareAndSwap: async (expected, next) => {
      if (expected !== revision) return false;
      persisted = clone(next); revision++; return true;
    },
  };
  const service = realApi.createService({
    repository, vaultModule: require('../../allo_device_vault_module.js'), crypto,
    cryptoOptions: { iterations: crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, saveDelayMs: 100000,
    localStorage: null, sessionStorage: null, getContext: () => ({ learner: false, isCanvas: false }),
    policy: { version: 1, allowExternalAi: ['dynamic-assessment'] }, confirmExport: () => true,
    ...options,
  });
  await service.init(); await service.setup('DA fixture protected passphrase', 0);
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const session = service.getSession('dynamic-assessment');
  function Boundary(props) {
    const held = React.useRef(null);
    const phase = service.getStatus().phase;
    if (phase === 'ready') held.current = props.children(session);
    if (phase === 'locking') return React.createElement('div', { inert: '' }, held.current);
    return phase === 'ready' ? held.current : React.createElement('div', null, 'Protected records locked.');
  }
  const api = { ...realApi, Boundary };
  return { api, realApi, session, service, repository, get persisted() { return clone(persisted); }, dispose: () => service.dispose() };
}

// Contract fixture only. Production sessions are created/validated by the
// shared workspace service; application props cannot mint this capability.
export function createDaWorkspaceFixture(React, options = {}) {
  const control = { ready: options.ready !== false, locking: false, epoch: 1, approved: options.approved !== false, exportAllowed: true };
  const entries = new Map(Object.entries(options.entries || {}));
  const callbacks = new Set();
  const transfers = new Map();
  const abort = () => Object.assign(new Error('Protected workspace operation is no longer current.'), { name: 'AbortError' });
  const storage = {
    getItem: vi.fn(key => entries.has(key) ? entries.get(key) : null),
    setItem: vi.fn((key, value) => {
      if (!/^alloflow_(dynamic_assessment_|da_)/.test(key)) throw new Error('Unowned clinical key');
      entries.set(key, String(value));
    }),
    removeItem: vi.fn(key => entries.delete(key)),
  };
  const session = {
    isProtected: true, storage, sessionStorage: storage,
    captureEpoch: () => control.epoch,
    isCurrent: epoch => control.ready && !control.locking && epoch === control.epoch,
    assertCurrent(epoch) { if (!this.isCurrent(epoch)) throw abort(); },
    assertCanTransmit: vi.fn(() => {
      session.assertCurrent(control.epoch);
      if (!control.approved) throw new Error('Deployment approval is required for clinical AI.');
    }),
    assertCanExport: vi.fn(() => {
      session.assertCurrent(control.epoch);
      if (!control.exportAllowed) throw abort();
    }),
    registerFlush: vi.fn(callback => { callbacks.add(callback); return () => callbacks.delete(callback); }),
    flush: vi.fn(async () => {}),
    transfer: vi.fn((target, payload) => { transfers.set(target, payload); return true; }),
    consumeTransfer: vi.fn(source => transfers.get(source) || null),
  };
  attachRequestControlsFixture(session);
  const genuine = new WeakSet([session]);
  function Boundary(props) {
    const held = React.useRef(null);
    if (control.ready && !control.locking) held.current = props.children(session);
    if (control.locking) return React.createElement('div', { inert: '', 'data-protected-locking': 'true' }, held.current);
    return control.ready ? held.current : React.createElement('div', { 'data-protected-locked': 'true' }, 'Unlock protected clinical workspace. Sample shapes only.');
  }
  const api = { Boundary, isSession: (value, feature) => genuine.has(value) && control.ready && !control.locking && (!feature || feature === 'dynamic-assessment') };
  return { api, session, control, entries, callbacks, transfers };
}
