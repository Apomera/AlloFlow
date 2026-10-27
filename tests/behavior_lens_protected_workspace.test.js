import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
import { attachRequestControlsFixture } from './helpers/protected_request_controls_fixture.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync('behavior_lens_module.js', 'utf8').replace(/\r\n/g, '\n');
const abort = () => Object.assign(new Error('Protected session changed.'), { name: 'AbortError' });
let host, root, protection;
const tick = () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });

// The fixture implements the public session contract. It starts locked and
// requires an explicit UI action; actual encryption/recovery belongs to the
// shared service's tests. No fixture writes clinical values to browser storage.
function protectedService() {
  const values = new Map([
    ['bl_onboarded', '1'], ['bl_student_roster', JSON.stringify([{ id: 'sealed', name: 'Sealed Otter' }])]
  ]);
  const callbacks = new Set();
  let unlocked = false, flushing = false, epoch = 1, notify = () => {};
  const checkStorage = () => { if (!unlocked && !flushing) throw abort(); };
  const storage = {
    getItem: vi.fn(key => { checkStorage(); return values.get(String(key)) ?? null; }),
    setItem: vi.fn((key, value) => { checkStorage(); values.set(String(key), String(value)); }),
    removeItem: vi.fn(key => { checkStorage(); values.delete(String(key)); }),
    key: index => { checkStorage(); return [...values.keys()][index] ?? null; },
    clear: () => { checkStorage(); values.clear(); },
    get length() { checkStorage(); return values.size; }
  };
  const session = {
    storage, sessionStorage: storage,
    captureEpoch: () => epoch,
    isCurrent: captured => unlocked && captured === epoch,
    assertCurrent: captured => { if (!unlocked || captured !== epoch) throw abort(); },
    assertCanTransmit: vi.fn(() => { throw new Error('AI provider approval is required.'); }),
    assertCanExport: vi.fn(),
    flush: vi.fn(async () => {}),
    registerFlush: callback => { callbacks.add(callback); return () => callbacks.delete(callback); }
  };
  attachRequestControlsFixture(session);
  const api = {
    session, values, callbacks,
    unlock() { unlocked = true; epoch += 1; notify(); },
    expire() { epoch += 1; },
    async lock() {
      epoch += 1; unlocked = false; flushing = true;
      try { for (const callback of callbacks) await callback({ reason: 'lock', forLock: true }); await session.flush(); }
      finally { flushing = false; notify(); }
    },
    Boundary({ feature, children }) {
      const [, render] = React.useState(0);
      React.useEffect(() => { notify = () => render(value => value + 1); return () => { notify = () => {}; }; }, []);
      expect(feature).toBe('behavior-lens');
      return unlocked ? children(session) : React.createElement('section', { 'data-test-protected-gate': true },
        React.createElement('p', null, 'Synthetic preview'),
        React.createElement('button', { onClick: () => api.unlock() }, 'Unlock test workspace'));
    }
  };
  return api;
}

async function mount(overrides = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ isTeacherMode: true, ...overrides }))));
  await tick();
}
async function unlock() {
  await React.act(async () => host.querySelector('button').click()); await tick();
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  protection = protectedService();
  window.AlloModules.SensitiveWorkspace = protection;
  delete window.AlloModules.BehaviorLens;
  new Function(source)();
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); host = null; root = null;
  vi.restoreAllMocks();
  delete window.__alloLazySensitiveWorkspace;
});

describe('BehaviorLens protected clinical boundary', () => {
  it('does not mount, read legacy records, sign in, or call AI before explicit unlock', async () => {
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'legacy', name: 'LEGACY_PRIVATE_CANARY' }]));
    const rawRead = vi.spyOn(Storage.prototype, 'getItem');
    const rawWrite = vi.spyOn(Storage.prototype, 'setItem');
    const provider = vi.fn(); const signIn = vi.fn();
    window.__alloFirebase = { signInAnonymously: signIn, onAuthStateChanged: vi.fn() };
    await mount({ callGemini: provider, isCanvasEnv: false, firestore: {}, firebaseAuth: {} });
    expect(host.textContent).toContain('Synthetic preview');
    expect(host.textContent).not.toContain('LEGACY_PRIVATE_CANARY');
    expect(protection.session.storage.getItem).not.toHaveBeenCalled();
    expect(rawRead).not.toHaveBeenCalled(); expect(rawWrite).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled(); expect(signIn).not.toHaveBeenCalled();
    await unlock();
    expect(host.textContent).toContain('Sealed Otter');
    expect(host.textContent).not.toContain('LEGACY_PRIVATE_CANARY');
    expect(rawRead).not.toHaveBeenCalled(); expect(rawWrite).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('fails closed and retries when the shared protection module is unavailable', async () => {
    delete window.AlloModules.SensitiveWorkspace;
    window.__alloLazySensitiveWorkspace = vi.fn();
    const rawRead = vi.spyOn(Storage.prototype, 'getItem');
    await mount();
    expect(host.textContent).toContain('Preparing the protected clinical workspace');
    expect(host.querySelector('.bl-root')).toBeNull();
    expect(rawRead).not.toHaveBeenCalled();
    expect(window.__alloLazySensitiveWorkspace).toHaveBeenCalled();
  });

  it('imports other-tool references only after disclosure and keeps original copies', async () => {
    localStorage.setItem('students_data', '[{"name":"REFERENCE_PRIVATE_CANARY"}]');
    await mount({ dashboardData: [{ studentNickname: 'Imported Parrot', unrelated: 'UNNEEDED_PRIVATE_DETAIL' }] }); await unlock();
    expect(protection.values.has('students_data')).toBe(false);
    const button = [...host.querySelectorAll('button')].find(node => node.textContent === 'Import other-tool references');
    await React.act(async () => button.click());
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog.textContent).toContain('original copies remain outside');
    expect(protection.values.has('students_data')).toBe(false);
    await React.act(async () => [...dialog.querySelectorAll('button')].find(node => node.textContent === 'Import references').click());
    await tick();
    expect(protection.values.get('students_data')).toContain('REFERENCE_PRIVATE_CANARY');
    expect(JSON.parse(protection.values.get('bl_imported_dashboard_v1'))).toEqual([{ studentNickname: 'Imported Parrot' }]);
    expect(localStorage.getItem('students_data')).toContain('REFERENCE_PRIVATE_CANARY');
    expect(protection.session.flush).toHaveBeenCalled();
  });

  it('checks clipboard and print authorization and drops unlocked clinical UI on lock', async () => {
    const copy = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await mount(); await unlock();
    protection.session.assertCanExport.mockImplementation(() => { throw abort(); });
    expect(await window.AlloModules.BehaviorLensClipboard.blTryCopy('CLINICAL_EXPORT_CANARY')).toBe(false);
    expect(window.AlloModules.BehaviorLensPrint.blPrintPanel(host)).toBe(false);
    expect(copy).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled();
    protection.session.assertCanExport.mockImplementation(() => {});
    expect(await window.AlloModules.BehaviorLensClipboard.blTryCopy('Reviewed readable copy')).toBe(true);
    expect(copy).toHaveBeenCalledWith('Reviewed readable copy');
    expect(protection.callbacks.size).toBeGreaterThan(0);
    await React.act(async () => protection.lock());
    expect(host.querySelector('.bl-root')).toBeNull();
    expect(host.textContent).not.toContain('Sealed Otter');
    expect(protection.session.flush).toHaveBeenCalled();
  });

  it.each(['lock', 'unmount'])('cleans temporary print content on %s even without afterprint', async transition => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    await mount(); await unlock();
    const panel = document.createElement('section'); panel.setAttribute('data-bl-panel-content', '');
    panel.innerHTML = '<textarea>SYNTHETIC PRINT CLEANUP SENTINEL</textarea><button>Print</button>';
    host.querySelector('.bl-root').appendChild(panel);
    window.AlloModules.BehaviorLensPrint.blPrintPanel(panel.querySelector('button'));
    const copy = document.querySelector('[data-bl-print-copy]'); expect(copy.textContent).toBe('SYNTHETIC PRINT CLEANUP SENTINEL');
    if (transition === 'lock') await React.act(async () => { await protection.lock(); });
    else { await React.act(async () => root.unmount()); root = null; }
    expect(copy.textContent).toBe('');
    expect(document.querySelectorAll('[data-bl-print-copy],[data-bl-print-style],[data-bl-print-path],[data-bl-print-hide]')).toHaveLength(0);
  });

  it('keeps the module open on save failure and waits for durable flush before normal close', async () => {
    const close = vi.fn(); const addToast = vi.fn();
    await mount({ onClose: close, addToast }); await unlock();
    protection.session.flush.mockRejectedValueOnce(new Error('Encrypted storage is full'));
    await React.act(async () => host.querySelector('[aria-label="Close BehaviorLens"]').click());
    await tick();
    expect(close).not.toHaveBeenCalled();
    expect(host.querySelector('.bl-root')).not.toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('remains open'), 'error');
    let complete;
    protection.session.flush.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await React.act(async () => host.querySelector('[aria-label="Close BehaviorLens"]').click());
    expect(close).not.toHaveBeenCalled();
    await React.act(async () => { complete(); await Promise.resolve(); }); await tick();
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('BehaviorLens protected operation adapters', () => {
  it('mounts against the real encrypted service and restores only after the correct unlock', async () => {
    const Crypto = require(resolve('allo_crypto_module.js'));
    const Vault = require(resolve('allo_device_vault_module.js'));
    new Function(readFileSync('sensitive_workspace_module.js', 'utf8'))();
    const api = window.AlloModules.SensitiveWorkspace;
    let stored = null, revision = 0;
    const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
    const service = api.createService({
      repository: {
        async read() { return { store: clone(stored), revision }; },
        async compareAndSwap(expected, next) { if (expected !== revision) return false; stored = clone(next); revision += 1; return true; }
      },
      vaultModule: Vault, crypto: Crypto, cryptoOptions: { iterations: 10000 },
      localStorage, sessionStorage, lifecycle: false,
      getContext: () => ({ isCanvas: false, learner: false }),
      policy: { version: 1 }, confirmExport: () => true
    });
    localStorage.setItem('bl_onboarded', '1');
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'encrypted', name: 'ACTUAL_ENCRYPTED_CANARY' }]));
    try {
      await service.init();
      const setup = await service.setup('Test protected workspace password');
      await service.exportBackup();
      await service.finishSetup({ recoveryInput: setup.setupRecoveryCode, backupSaved: true });
      expect(JSON.stringify(stored)).not.toContain('ACTUAL_ENCRYPTED_CANARY');
      expect(localStorage.getItem('bl_student_roster')).toBeNull();
      window.AlloModules.SensitiveWorkspace = { ...api, Boundary: props => React.createElement(api.Boundary, { ...props, service }) };
      await mount(); await tick();
      expect(host.textContent).toContain('ACTUAL_ENCRYPTED_CANARY');
      await React.act(async () => service.lock('test'));
      expect(host.querySelector('.bl-root')).toBeNull();
      expect(host.textContent).not.toContain('ACTUAL_ENCRYPTED_CANARY');
      await expect(service.unlock('wrong password')).rejects.toBeTruthy();
      expect(host.querySelector('.bl-root')).toBeNull();
      await React.act(async () => service.unlock('Test protected workspace password'));
      await tick();
      expect(host.textContent).toContain('ACTUAL_ENCRYPTED_CANARY');
      expect(JSON.stringify(stored)).not.toContain('ACTUAL_ENCRYPTED_CANARY');
    } finally {
      if (root) { await React.act(async () => root.unmount()); root = null; }
      service.dispose();
    }
  });

  it('requires approved AI, preserves arguments, and rejects results from a previous epoch', async () => {
    const start = source.indexOf('    function useProtectedBehaviorLensTransport(');
    const end = source.indexOf('    function getBehaviorLensWorkspaceRuntime()', start);
    const useTransport = new Function('React', source.slice(start, end) + '\nreturn useProtectedBehaviorLensTransport;')({ useMemo: factory => factory() });
    protection.unlock();
    const provider = vi.fn(async (...args) => args[0]);
    const wrapped = useTransport(provider, protection.session);
    await expect(wrapped('private prompt')).rejects.toThrow('approval');
    expect(provider).not.toHaveBeenCalled();
    protection.session.assertCanTransmit.mockImplementation(() => {});
    const signal = new AbortController().signal;
    await expect(wrapped('reviewed prompt', false, true, signal)).resolves.toBe('reviewed prompt');
    expect(provider).toHaveBeenCalledWith('reviewed prompt', false, true, signal, undefined, undefined, undefined, undefined, { requestControls: { beforeRequest: expect.any(Function) } });
    let finish; provider.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = wrapped('old session'); protection.expire(); finish('STALE_PRIVATE_RESULT');
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const calls = provider.mock.calls.length;
    await expect(wrapped('old callback after another unlock')).rejects.toMatchObject({ name: 'AbortError' });
    expect(provider).toHaveBeenCalledTimes(calls);
  });

  it('suppresses an old file reader callback after the protected epoch changes', () => {
    const start = source.indexOf('    function blCreateProtectedReader()');
    const end = source.indexOf('    function blCancelProtectedReaders()', start);
    const active = new Set();
    class Reader extends window.EventTarget { abort() {} }
    const makeReader = new Function('blRequireProtectedSession', 'FileReader', 'blActiveReaders', source.slice(start, end) + '\nreturn blCreateProtectedReader;')(() => protection.session, Reader, active);
    protection.unlock();
    const reader = makeReader(); const onLoad = vi.fn(); reader.onload = onLoad; reader.addEventListener('load', onLoad);
    protection.expire(); reader.dispatchEvent(new window.Event('load'));
    expect(onLoad).not.toHaveBeenCalled();
    reader.dispatchEvent(new window.Event('loadend'));
    expect(active.size).toBe(0);
  });

  it('guards the actual download click and refuses a stale or declined export', () => {
    const start = source.indexOf('    function blCreateDownloadLink()');
    const end = source.indexOf('    function blOpenReadableWindow(', start);
    protection.unlock();
    const createLink = new Function('blRequireProtectedSession', 'document', source.slice(start, end) + '\nreturn blCreateDownloadLink;')(() => protection.session, document);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const declined = createLink();
    protection.session.assertCanExport.mockImplementation(() => { throw abort(); });
    expect(declined.click()).toBe(false); expect(click).not.toHaveBeenCalled();
    protection.session.assertCanExport.mockImplementation(() => {});
    const stale = createLink(); protection.expire();
    expect(stale.click()).toBe(false); expect(click).not.toHaveBeenCalled();
    createLink().click(); expect(click).toHaveBeenCalledOnce();
  });

  it('keeps a failed pending workspace available for retry and makes lock flush fail honestly', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    let fail = true; const persist = vi.fn(() => { if (fail) throw new Error('Storage rejected the write'); return true; });
    const scheduler = runtime.createWorkspacePersistenceScheduler({ persist, delayMs: 100000 });
    scheduler.schedule({ clinical: 'PENDING_PRIVATE_CANARY' });
    expect(() => runtime.flushWorkspacePersistence(scheduler, { reason: 'lock' })).toThrow('Storage rejected');
    expect(scheduler.hasPending()).toBe(true);
    fail = false;
    expect(runtime.flushWorkspacePersistence(scheduler, { reason: 'retry' })).toMatchObject({ ok: true, pendingCount: 0 });
    expect(persist.mock.calls[1][0]).toEqual({ clinical: 'PENDING_PRIVATE_CANARY' });
    scheduler.cancel();
  });
});
