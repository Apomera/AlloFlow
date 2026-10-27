import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const PASSWORD = 'synthetic previous clinical password', NEW_PASSWORD = 'synthetic renewed clinical password';
const roots = [], services = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
async function until(predicate) { for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); } throw new Error('synthetic UI transition timeout'); }
async function untilUi(predicate) { for (let i = 0; i < 200; i++) { if (predicate()) return; await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); } throw new Error('synthetic rendered UI transition timeout'); }
async function fixture({ pendingSetup = false } = {}) {
  const repo = { store: null, revision: 0, async read() { return { store: clone(this.store), revision: this.revision }; }, async compareAndSwap(expected, store) { if (expected !== this.revision) return false; this.store = clone(store); this.revision++; return true; } };
  const service = SW.createService({ repository: repo, vaultModule: Vault, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, getContext: () => ({ learner: false, isCanvas: true }), getPolicy: () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: [] }) });
  services.push(service); await service.setup(PASSWORD);
  const recovery = service.getStatus().setupRecoveryCode;
  if (!pendingSetup) { await service.exportBackup(); await service.finishSetup({ recoveryInput: recovery, backupSaved: true }); await service.lock(); }
  const node = document.createElement('div'); document.body.appendChild(node); const root = createRoot(node); roots.push({ root, node });
  const render = owner => React.createElement('div', null, ...['report-writer', 'behavior-lens'].map(feature => React.createElement('div', { key: feature, 'data-feature': feature }, React.createElement(SW.Boundary, { React, service: owner, feature }, () => React.createElement('p', null, 'SYNTHETIC OPEN RECORD')))));
  await React.act(async () => { root.render(render(service)); });
  return { service, recovery, node, render: owner => React.act(async () => { root.render(render(owner)); }), first: () => node.querySelector('[data-feature="report-writer"]'), second: () => node.querySelector('[data-feature="behavior-lens"]') };
}
function button(node, label) { return Array.from(node.querySelectorAll('button')).find(button => button.textContent === label); }
async function type(input, value) { await React.act(async () => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function click(node, label, service, targetPhase) { await React.act(async () => { button(node, label).click(); if (targetPhase) await until(() => service.getStatus().phase === targetPhase); }); }
afterEach(async () => { for (const { root, node } of roots.splice(0)) await React.act(async () => { root.unmount(); node.remove(); }); services.splice(0).forEach(service => service.dispose()); });

describe('credential residue across another clinical boundary lock cycle', () => {
  it('does not repopulate an old password after another boundary unlocks and the service relocks', async () => {
    const h = await fixture();
    await type(h.first().querySelector('input[type="password"]'), PASSWORD);
    await type(h.second().querySelector('input[type="password"]'), PASSWORD);
    await click(h.second(), 'Unlock records', h.service, 'ready');
    await React.act(async () => { await h.service.lock('external-synthetic-lock'); });
    const residue = h.first().querySelector('input[type="password"]').value;
    await React.act(async () => { button(h.first(), 'Unlock records').click(); await new Promise(resolve => setTimeout(resolve, 100)); });
    const status = h.service.getStatus().phase;
    expect(residue).toBe(''); expect(status).toBe('locked');
  });
  it('does not repopulate an offline recovery key and replacement password after external locking', async () => {
    const h = await fixture();
    await click(h.first(), 'Forgot password? Use recovery key');
    await type(h.first().querySelector('input[type="text"]'), h.recovery);
    await type(h.first().querySelector('input[type="password"]'), NEW_PASSWORD);
    await type(h.second().querySelector('input[type="password"]'), PASSWORD);
    await click(h.second(), 'Unlock records', h.service, 'ready');
    await React.act(async () => { await h.service.lock('external-synthetic-lock'); });
    const keyResidue = h.first().querySelector('input[type="text"]')?.value || '';
    const passwordResidue = h.first().querySelector('input[type="password"]').value;
    await React.act(async () => { button(h.first(), 'Recover records').click(); await new Promise(resolve => setTimeout(resolve, 100)); });
    const status = h.service.getStatus().phase;
    expect(keyResidue).toBe(''); expect(passwordResidue).toBe(''); expect(status).toBe('locked');
  });

  it('clears a typed credential when an external lock advances the epoch without changing phase', async () => {
    const h = await fixture(); await type(h.first().querySelector('input[type="password"]'), PASSWORD);
    const epoch = h.service.getStatus().epoch;
    await React.act(async () => { await h.service.lock('another-window'); });
    expect(h.service.getStatus().phase).toBe('locked'); expect(h.service.getStatus().epoch).toBeGreaterThan(epoch);
    expect(h.first().querySelector('input[type="password"]').value).toBe('');
  });

  it('preserves same-context input and a failed own attempt, then permits correction without losing records', async () => {
    const h = await fixture(); await type(h.first().querySelector('input[type="password"]'), 'synthetic wrong password');
    await React.act(async () => { const detach = h.service.attachView(); detach(); });
    expect(h.first().querySelector('input[type="password"]').value).toBe('synthetic wrong password');
    await React.act(async () => { button(h.first(), 'Unlock records').click(); });
    await untilUi(() => h.first().querySelector('[role="alert"]') && !button(h.first(), 'Unlock records').disabled);
    expect(h.service.getStatus().phase).toBe('locked');
    expect(h.first().querySelector('input[type="password"]').value).toBe('synthetic wrong password');
    await type(h.first().querySelector('input[type="password"]'), PASSWORD);
    await click(h.first(), 'Unlock records', h.service, 'ready');
    await React.act(async () => { await h.service.lock('synthetic-manual'); });
    expect(h.first().querySelector('input[type="password"]').value).toBe('');
  });

  it('clears credentials when the service identity changes with matching phase and epoch', async () => {
    const a = await fixture(), b = await fixture();
    expect(a.service.getStatus().epoch).toBe(b.service.getStatus().epoch);
    await type(a.first().querySelector('input[type="password"]'), PASSWORD);
    await a.render(b.service);
    expect(a.first().querySelector('input[type="password"]').value).toBe('');
  });

  it('clears another view\'s old recovery confirmation when the setup key rotates without a phase or epoch change', async () => {
    const h = await fixture({ pendingSetup: true });
    await type(h.first().querySelector('input[type="text"]'), h.recovery);
    const epoch = h.service.getStatus().epoch;
    await React.act(async () => { await h.service.renewRecovery(); });
    expect(h.service.getStatus().phase).toBe('setup'); expect(h.service.getStatus().epoch).toBe(epoch);
    expect(h.service.getStatus().setupRecoveryCode).not.toBe(h.recovery);
    expect(h.first().querySelector('input[type="text"]').value).toBe('');
  });

  it('ignores initialization from a service whose observer was replaced', async () => {
    const a = await fixture(), b = await fixture();
    await React.act(async () => { await a.service.unlock(PASSWORD); });
    let release; const delayed = new Promise(resolve => { release = resolve; });
    const oldOwner = { ...a.service, async init() { await delayed; return a.service.init(); } };
    await a.render(oldOwner); await a.render(b.service);
    await type(a.first().querySelector('input[type="password"]'), 'synthetic current-service input');
    await React.act(async () => { release(); await delayed; });
    expect(a.first().textContent).not.toContain('SYNTHETIC OPEN RECORD');
    expect(a.first().querySelector('input[type="password"]').value).toBe('synthetic current-service input');
  });
});
