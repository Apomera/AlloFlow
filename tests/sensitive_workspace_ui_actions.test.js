import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const PASSWORD = 'synthetic UI restore passphrase';
const roots = [], services = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const delay = () => new Promise(resolve => setTimeout(resolve, 5));
async function untilUi(predicate) { for (let i = 0; i < 400; i++) { if (predicate()) return; await React.act(delay); } throw new Error('synthetic rendered UI transition timeout'); }
function serviceFixture() {
  const repository = { store: null, revision: 0, async read() { return { store: clone(this.store), revision: this.revision }; }, async compareAndSwap(expected, store) { if (expected !== this.revision) return false; this.store = clone(store); this.revision++; return true; } };
  const service = SW.createService({ repository, vaultModule: Vault, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, getContext: () => ({ learner: false, isCanvas: true }), getPolicy: () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: [] }) });
  services.push(service); return { service, repository };
}
async function mount(service) {
  const node = document.createElement('div'); document.body.appendChild(node); const root = createRoot(node); const entry = { root, node, unmounted: false }; roots.push(entry);
  const render = owner => React.createElement(SW.Boundary, { React, service: owner, feature: 'report-writer' }, () => React.createElement('p', null, 'SYNTHETIC RESTORED WORKSPACE'));
  await React.act(async () => { root.render(render(service)); });
  return { node, render: owner => React.act(async () => root.render(render(owner))), unmount: () => React.act(async () => { entry.unmounted = true; root.unmount(); }) };
}
async function type(input, value) { await React.act(async () => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
let backup;
beforeAll(async () => {
  const donor = serviceFixture().service;
  await donor.setup(PASSWORD); const recoveryInput = donor.getStatus().setupRecoveryCode;
  await donor.exportBackup(); await donor.finishSetup({ recoveryInput, backupSaved: true });
  donor.getSession('report-writer').storage.setItem('allo_rw_draft', 'SYNTHETIC RESTORED RECORD');
  backup = await donor.exportBackup(); donor.dispose(); services.splice(services.indexOf(donor), 1);
});
afterEach(async () => { for (const { root, node, unmounted } of roots.splice(0)) { if (!unmounted) await React.act(async () => root.unmount()); node.remove(); } services.splice(0).forEach(service => service.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function button(node, label) { return Array.from(node.querySelectorAll('button')).find(button => button.textContent === label); }
function backupPassword(node) { return Array.from(node.querySelectorAll('label')).find(node => node.textContent.startsWith('Backup password')).querySelector('input'); }
async function choose(node, textPromise) {
  const input = node.querySelector('input[type="file"]'), file = { size: JSON.stringify(backup).length, text: vi.fn(() => textPromise) };
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await React.act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  return file;
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

describe('actual protected restore UI pending file read', () => {
  it.each(['current', 'external-lock', 'replace-service', 'replace-and-return', 'unmount'])('does not revive a restore after %s', async change => {
    const original = serviceFixture(), view = await mount(original.service);
    const restore = vi.spyOn(original.service, 'restore');
    const input = Array.from(view.node.querySelectorAll('label')).find(node => node.textContent.startsWith('Backup password')).querySelector('input');
    await type(input, PASSWORD);
    let release;
    const pendingText = new Promise(resolve => { release = resolve; });
    const file = { size: JSON.stringify(backup).length, text: vi.fn(() => pendingText) };
    const chooser = view.node.querySelector('input[type="file"]');
    Object.defineProperty(chooser, 'files', { configurable: true, value: [file] });
    await React.act(async () => chooser.dispatchEvent(new Event('change', { bubbles: true })));
    expect(file.text).toHaveBeenCalledOnce(); expect(restore).not.toHaveBeenCalled();
    const before = original.service.getStatus().epoch;
    if (change === 'external-lock') { await React.act(async () => original.service.lock('synthetic-external-lock')); expect(original.service.getStatus().epoch).toBeGreaterThan(before); }
    if (change === 'replace-service' || change === 'replace-and-return') await view.render(serviceFixture().service);
    if (change === 'replace-and-return') await view.render(original.service);
    if (change === 'unmount') await view.unmount();
    await React.act(async () => { release(JSON.stringify(backup)); await pendingText; });
    if (change === 'current') {
      await untilUi(() => original.service.getStatus().phase === 'ready');
      expect(restore).toHaveBeenCalledOnce();
      expect(original.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC RESTORED RECORD');
    } else {
      if (restore.mock.calls.length) await untilUi(() => original.service.getStatus().phase === 'ready');
      expect(restore).not.toHaveBeenCalled();
      expect(original.repository.store).toBeNull();
      expect(original.service.getStatus().phase).toBe('new');
    }
  });

  it('preserves the current secret for correction after a failed own restore', async () => {
    const h = serviceFixture(), view = await mount(h.service);
    await type(backupPassword(view.node), 'synthetic wrong password');
    await choose(view.node, Promise.resolve(JSON.stringify(backup)));
    await untilUi(() => !view.node.querySelector('input[type="file"]').disabled && view.node.querySelector('[role="alert"]'));
    expect(backupPassword(view.node).value).toBe('synthetic wrong password'); expect(h.repository.store).toBeNull();
    await type(backupPassword(view.node), PASSWORD);
    await choose(view.node, Promise.resolve(JSON.stringify(backup)));
    await untilUi(() => h.service.getStatus().phase === 'ready');
    expect(h.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC RESTORED RECORD');
  });

  it.each(['resolve', 'reject'])('does not change a replacement view\'s busy, secret or error state when an old read %ss', async outcome => {
    const a = serviceFixture(), b = serviceFixture(), view = await mount(a.service), oldRead = deferred(), currentRead = deferred();
    await type(backupPassword(view.node), PASSWORD); await choose(view.node, oldRead.promise);
    await view.render(b.service); await type(backupPassword(view.node), PASSWORD); await choose(view.node, currentRead.promise);
    expect(view.node.querySelector('input[type="file"]').disabled).toBe(true);
    await React.act(async () => { if (outcome === 'resolve') oldRead.resolve(JSON.stringify(backup)); else oldRead.reject(new Error('synthetic previous read failure')); await delay(); });
    expect(view.node.querySelector('input[type="file"]').disabled).toBe(true);
    expect(backupPassword(view.node).value).toBe(PASSWORD); expect(view.node.querySelector('[role="alert"]')).toBeNull();
    expect(a.repository.store).toBeNull();
    await React.act(async () => currentRead.resolve(JSON.stringify(backup)));
    await untilUi(() => b.service.getStatus().phase === 'ready');
    expect(b.service.getSession('report-writer').storage.getItem('allo_rw_draft')).toBe('SYNTHETIC RESTORED RECORD');
  });

  it('conceals the old service and blocks fresh actions while a replacement initializes', async () => {
    const a = serviceFixture(), b = serviceFixture(); await a.service.restore(backup, PASSWORD, false);
    const view = await mount(a.service), initialized = deferred(), actualInit = b.service.init;
    const oldExport = vi.spyOn(a.service, 'exportBackup');
    vi.spyOn(b.service, 'init').mockImplementation(async () => { await initialized.promise; return actualInit(); });
    expect(view.node.textContent).toContain('SYNTHETIC RESTORED WORKSPACE');
    await view.render(b.service);
    expect(view.node.textContent).not.toContain('SYNTHETIC RESTORED WORKSPACE');
    expect(button(view.node, 'Encrypted saved-records backup')).toBeUndefined();
    expect(view.node.querySelector('input[type="file"]')).toBeNull();
    expect(oldExport).not.toHaveBeenCalled();
    await React.act(async () => initialized.resolve());
    expect(view.node.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('does not expose an old owner while switching to an unresolved default service', async () => {
    const a = serviceFixture(); await a.service.restore(backup, PASSWORD, false);
    const view = await mount(a.service);
    const oldExport = vi.spyOn(a.service, 'exportBackup');
    // Missing default-loader support leaves the new owner unresolved. Old
    // records and actions must stay unavailable even when props.service is absent.
    await view.render(undefined);
    expect(view.node.textContent).not.toContain('SYNTHETIC RESTORED WORKSPACE');
    expect(button(view.node, 'Encrypted saved-records backup')).toBeUndefined();
    expect(view.node.querySelector('input[type="file"]')).toBeNull();
    expect(oldExport).not.toHaveBeenCalled();
  });
});

describe('encrypted backup UI completion belongs to its original view', () => {
  it.each(['current', 'external-lock', 'replace-service', 'unmount'])('only delivers a still-current locked backup after %s', async change => {
    const h = serviceFixture(); await h.service.restore(backup, PASSWORD, false); await h.service.lock();
    const view = await mount(h.service), completed = deferred(), actualExport = h.service.exportBackup;
    vi.spyOn(h.service, 'exportBackup').mockImplementation(async () => { const value = await actualExport(); await completed.promise; return value; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:synthetic-encrypted-backup'; } static revokeObjectURL() {} });
    await React.act(async () => button(view.node, 'Export encrypted backup while locked').click());
    if (change === 'external-lock') await React.act(async () => h.service.lock('synthetic-external-lock'));
    if (change === 'replace-service') await view.render(serviceFixture().service);
    if (change === 'unmount') await view.unmount();
    await React.act(async () => { completed.resolve(); await delay(); });
    expect(click).toHaveBeenCalledTimes(change === 'current' ? 1 : 0);
  });

  it('does not download a setup backup approved before a recovery-key rotation', async () => {
    const h = serviceFixture(); await h.service.setup(PASSWORD); const view = await mount(h.service), completed = deferred(), actualExport = h.service.exportBackup;
    const exported = deferred();
    vi.spyOn(h.service, 'exportBackup').mockImplementation(async () => { const value = await actualExport(); exported.resolve(); await completed.promise; return value; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:synthetic-encrypted-backup'; } static revokeObjectURL() {} });
    await React.act(async () => { button(view.node, 'Download verified encrypted backup').click(); await exported.promise; });
    const epoch = h.service.getStatus().epoch;
    await React.act(async () => h.service.renewRecovery()); expect(h.service.getStatus().epoch).toBe(epoch);
    await React.act(async () => { completed.resolve(); await delay(); });
    expect(click).not.toHaveBeenCalled();
  });
});
