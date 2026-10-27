import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, realApi, mounted, service;
const password = 'Synthetic report workspace password';
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = URL.createObjectURL || (() => 'blob:synthetic-report');
  URL.revokeObjectURL = URL.revokeObjectURL || (() => {});
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('sensitive_workspace_module.js');
  loadAlloModule('report_writer_module.js');
  realApi = window.AlloModules.SensitiveWorkspace;
});
afterEach(async () => {
  if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.node.remove(); mounted = null; }
  service?.dispose(); service = null;
  window.AlloModules.SensitiveWorkspace = realApi;
  localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks();
});
const act = fn => React.act(async () => { await fn(); });
const click = node => act(() => { expect(node).toBeTruthy(); node.click(); });
const type = (node, value) => act(() => {
  expect(node).toBeTruthy();
  const proto = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});
const button = (node, text) => [...node.querySelectorAll('button')].find(b => b.textContent.trim() === text);

async function fixture({ ready = true, persist, ai = false } = {}) {
  let stored = null, revision = 0;
  const confirmExport = vi.fn(() => true);
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const crypto = require('../allo_crypto_module.js');
  service = realApi.createService({
    repository: { read: async () => ({ store: clone(stored), revision }), compareAndSwap: async (expected, next) => {
      if (expected !== revision) return false; stored = clone(next); revision++; return true;
    } }, vaultModule: require('../allo_device_vault_module.js'), crypto,
    cryptoOptions: { iterations: crypto.MIN_PBKDF2_ITERATIONS }, localStorage, sessionStorage,
    lifecycle: false, saveDelayMs: 100000, getContext: () => ({ learner: false, isCanvas: false }),
    policy: { version: 1, allowExternalAi: ai ? ['report-writer'] : [] }, confirmExport,
  });
  await service.init();
  if (ready) {
    await service.setup(password);
    const recoveryInput = service.getStatus().setupRecoveryCode;
    await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
    if (persist !== undefined) service.getSession('report-writer').storage.setItem('allo_rw_persist_enabled', String(persist));
  }
  window.AlloModules.SensitiveWorkspace = { ...realApi, Boundary: props => React.createElement(realApi.Boundary, { ...props, service }) };
  return { get stored() { return clone(stored); }, confirmExport, session: () => service.getSession('report-writer') };
}
async function mount(extra = {}) {
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); const transport = vi.fn(async () => '{}'); const addToast = vi.fn();
  const props = { onClose: vi.fn(), callGemini: transport, addToast, t: key => key,
    studentNickname: '', dashboardData: [], behaviorLensData: null, longitudinalData: null, ...extra };
  mounted = { node, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, props)));
  return { node, transport, addToast, props, steps: () => [...node.querySelectorAll('nav[aria-label="Report Writer steps"] button')] };
}

describe('Report Writer with the actual encrypted workspace', () => {
  it('keeps clinical hooks and prop access closed until the actual service is ready', async () => {
    localStorage.setItem('allo_rw_draft', 'LEGACY_REPORT_CANARY');
    await fixture({ ready: false });
    const clinicalReads = vi.fn(() => { throw new Error('Clinical props were read while locked'); });
    const props = { onClose() {} }; Object.defineProperty(props, 'studentNickname', { get: clinicalReads, enumerable: true });
    const node = document.createElement('div'); document.body.appendChild(node);
    const root = createRoot(node); mounted = { node, root };
    // Invoke the wrapper inside a React component so React's own prop-copying
    // does not read the getter before the protected boundary receives it.
    function Harness() { return window.AlloModules.ReportWriter(props); }
    await act(() => root.render(React.createElement(Harness)));
    expect(node.querySelector('#rw-dialog-surface')).toBeNull();
    expect(node.textContent).not.toContain('LEGACY_REPORT_CANARY');
    expect(clinicalReads).not.toHaveBeenCalled();
    expect(localStorage.getItem('allo_rw_draft')).toBe('LEGACY_REPORT_CANARY');
  });

  it('saves the latest draft during lock, keeps browser storage clear, and restores after unlock', async () => {
    const f = await fixture(); const ui = await mount();
    await type(ui.node.querySelector('input[aria-label="Student code name"]'), 'SEALED_REPORT_CANARY');
    await act(() => service.lock('test'));
    expect(ui.node.querySelector('#rw-dialog-surface')).toBeNull();
    expect(ui.node.textContent).not.toContain('SEALED_REPORT_CANARY');
    expect(JSON.stringify(f.stored)).not.toMatch(/SEALED_REPORT_CANARY|allo_rw_draft/);
    expect(localStorage.getItem('allo_rw_draft')).toBeNull();
    await expect(service.unlock('wrong password')).rejects.toBeTruthy();
    await act(() => service.unlock(password));
    expect(ui.node.querySelector('input[aria-label="Student code name"]').value).toBe('SEALED_REPORT_CANARY');
  });

  it('makes session-only draft lock and backup fail without losing the open draft', async () => {
    await fixture({ persist: false }); const ui = await mount();
    await type(ui.node.querySelector('input[aria-label="Student code name"]'), 'UNSAVED_SESSION_CANARY');
    let error; await act(async () => { try { await service.lock('test'); } catch (e) { error = e; } });
    expect(error).toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(service.getStatus().phase).toBe('ready');
    expect(ui.node.querySelector('input[aria-label="Student code name"]').value).toBe('UNSAVED_SESSION_CANARY');
    await expect(service.exportBackup()).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(ui.node.querySelector('input[aria-label="Student code name"]').value).toBe('UNSAVED_SESSION_CANARY');
  });

  it('keeps temporary source text on a failed lock and requires explicit backup scope consent', async () => {
    const f = await fixture(); const ui = await mount(); await click(ui.steps()[1]);
    await type(ui.node.querySelector('textarea[aria-label="Case document text"]'), 'TEMPORARY_SOURCE_CANARY');
    let error; await act(async () => { try { await service.lock('test'); } catch (e) { error = e; } });
    expect(error).toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(ui.node.querySelector('textarea[aria-label="Case document text"]').value).toBe('TEMPORARY_SOURCE_CANARY');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await expect(service.exportBackup()).rejects.toMatchObject({ code: 'PROTECTED_UNSAVED_SESSION' });
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Temporary source documents, paste previews and uncommitted imports are excluded'));
    confirm.mockReturnValue(true); await act(() => service.exportBackup());
    expect(ui.node.querySelector('textarea[aria-label="Case document text"]').value).toBe('TEMPORARY_SOURCE_CANARY');
    expect(JSON.stringify(f.stored)).not.toContain('TEMPORARY_SOURCE_CANARY');
    await click(button(ui.node, 'Review and discard temporary sources'));
    await click(button(ui.node.querySelector('[role="alertdialog"]'), 'Discard temporary sources'));
    await act(() => service.lock('test'));
    expect(ui.node.querySelector('#rw-dialog-surface')).toBeNull();
  });

  it('blocks clinical AI by default before opening a review or calling the provider', async () => {
    await fixture(); const ui = await mount();
    const demo = ui.node.querySelector('button[aria-label="Generate AI demo case"]');
    demo.closest('details').open = true; await click(demo);
    expect(ui.transport).not.toHaveBeenCalled();
    expect(ui.node.querySelector('[aria-label="Review what AI receives"]')).toBeNull();
    expect(ui.node.textContent).toContain('Clinical AI processing is disabled');
  });

  it('cancels an approved provider operation on lock and discards its late response', async () => {
    await fixture({ ai: true });
    let complete; const transport = vi.fn(() => new Promise(resolve => { complete = resolve; }));
    const ui = await mount({ callGemini: transport });
    const demo = ui.node.querySelector('button[aria-label="Generate AI demo case"]');
    demo.closest('details').open = true; await click(demo);
    const review = ui.node.querySelector('[aria-label="Review what AI receives"]');
    await click(review.querySelector('input[type="checkbox"]')); await click(button(review, 'Send reviewed copy'));
    expect(transport).toHaveBeenCalledTimes(1);
    const signal = transport.mock.calls[0][5]; expect(signal.aborted).toBe(false);
    await act(() => service.lock('test')); expect(signal.aborted).toBe(true);
    await act(() => complete(JSON.stringify({ label: 'STALE_PRIVATE_RESULT', scores: [], bgSections: {}, clinicalObs: {} })));
    expect(ui.node.textContent).not.toContain('STALE_PRIVATE_RESULT');
    await act(() => service.unlock(password));
    expect(ui.node.textContent).not.toContain('STALE_PRIVATE_RESULT');
  });

  it('keeps the actual session-only draft and close warning after a failed JSON handoff', async () => {
    await fixture({ persist: false }); const ui = await mount();
    await type(ui.node.querySelector('input[aria-label="Student code name"]'), 'SYNTHETIC_UNSAVED_OUTPUT');
    await click(ui.steps()[9]);
    const clickDownload = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Synthetic blocked download'); });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-report');
    await click(ui.node.querySelector('button[aria-label="Export as JSON"]'));
    expect(clickDownload).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:synthetic-report');
    expect(document.querySelector('a[href="blob:synthetic-report"]')).toBeNull();
    expect(ui.addToast).toHaveBeenCalledWith(expect.stringContaining('could not start'), 'error');
    const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    await click(ui.node.querySelector('#rw-dialog-surface > button'));
    expect(ui.props.onClose).not.toHaveBeenCalled(); expect(ui.node.querySelector('[role="alertdialog"]')).not.toBeNull();
    await click(button(ui.node.querySelector('[role="alertdialog"]'), 'Keep working'));
    await click(ui.steps()[0]);
    expect(ui.node.querySelector('input[aria-label="Student code name"]').value).toBe('SYNTHETIC_UNSAVED_OUTPUT');
  });

  it('requires readable-copy confirmation before creating a JSON browser copy', async () => {
    const f = await fixture(); const ui = await mount(); await click(ui.steps()[9]);
    const exported = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-report');
    f.confirmExport.mockReturnValue(false);
    const exportButton = ui.node.querySelector('button[aria-label="Export as JSON"]');
    await click(exportButton);
    expect(f.confirmExport).toHaveBeenCalledWith(expect.stringContaining('readable copy of protected clinical information'));
    expect(createUrl).not.toHaveBeenCalled();
    expect(exported).not.toHaveBeenCalled();
  });
});
