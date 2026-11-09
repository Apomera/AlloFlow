// A teacher who presses Deny on the device-storage prompt must not be asked again
// every time AlloFlow autosaves. The decline lasts for the visit; only an explicit
// "Open device storage" (connectWithApproval) asks again. Other failures still retry.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

const source = readFileSync('allo_device_storage_module.js', 'utf8');
const origin = 'https://storage.example';
const active = [];
afterEach(() => { for (const h of active.splice(0)) { h.api.disconnect(); h.dom.window.close(); } vi.restoreAllMocks(); });
const turn = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function fixture() {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://school.example/app' });
  const win = dom.window, channels = [], timers = new Map();
  let clockId = 0;
  win.setTimeout = (fn, delay) => { const id = ++clockId; timers.set(id, { fn, delay }); return id; };
  win.clearTimeout = id => timers.delete(id);
  win.setInterval = () => ++clockId;
  win.clearInterval = () => {};
  const port = () => ({ onmessage: null, onmessageerror: null, postMessage: vi.fn(), start: vi.fn(), close: vi.fn() });
  win.MessageChannel = function () { this.port1 = port(); this.port2 = port(); channels.push(this); };
  const posted = [];
  const append = win.document.body.appendChild.bind(win.document.body);
  win.document.body.appendChild = element => {
    const result = append(element);
    if (element.tagName === 'IFRAME') element.contentWindow.postMessage = vi.fn((...args) => posted.push(args));
    return result;
  };
  win.eval(source);
  const api = win.alloDeviceStorage;
  api.init({ surface: 'canvas', mode: 'iframe', bridgeUrl: origin + '/storage_bridge.html' });
  const hellos = () => posted.filter(([msg]) => msg.type === 'allo-bridge-hello');
  const h = {
    dom, win, api, channels, timers, hellos,
    frames: () => win.document.querySelectorAll('iframe').length,
    nonce: () => hellos().at(-1)?.[0].nonce,
    bind() {
      win.dispatchEvent(new win.MessageEvent('message', {
        source: win.document.querySelector('iframe').contentWindow, origin,
        data: { allo: 'ds2', nonce: h.nonce(), type: 'allo-bridge-port-required' }
      }));
    },
    receivePort(data) { channels.at(-1).port1.onmessage({ data: { allo: 'ds2', nonce: h.nonce(), ...data } }); },
    async deny() {
      const pending = api.connect().catch(error => error);
      h.bind();
      h.receivePort({ type: 'allo-bridge-consent-required' });
      h.receivePort({ type: 'allo-bridge-error', error: { code: 'allo/approval-denied', message: 'Device storage access was denied.' } });
      return pending;
    }
  };
  active.push(h);
  return h;
}

describe('device storage: a Deny is remembered for the visit', () => {
  it('does not open the prompt again when later saves call ready() or connect()', async () => {
    const h = fixture();
    expect(await h.deny()).toMatchObject({ code: 'allo/approval-denied' });
    expect(h.hellos()).toHaveLength(1);
    expect(h.frames()).toBe(0);

    await expect(h.api.ready()).rejects.toMatchObject({ code: 'allo/approval-denied' });
    await expect(h.api.connect()).rejects.toMatchObject({ code: 'allo/approval-denied' });
    expect(h.frames()).toBe(0);
    expect(h.hellos()).toHaveLength(1);
    expect(h.api.status()).toMatchObject({ declined: true, connected: false });
  });

  it('keeps queueing writes while declined so nothing typed is thrown away', async () => {
    const h = fixture();
    await h.deny();
    await expect(h.api.set('records', 'draft', 'kept in memory')).resolves.toEqual({ queued: true });
    expect(h.api.status().queuedWrites).toBe(1);
  });

  it('asks again only through connectWithApproval, and an approval clears the decline', async () => {
    const h = fixture();
    await h.deny();
    await h.api.set('records', 'draft', 'kept in memory');

    const approving = h.api.connectWithApproval();
    expect(h.frames()).toBe(1);
    expect(h.hellos()).toHaveLength(2);
    h.bind();
    h.receivePort({ type: 'allo-bridge-ready' });
    await turn();
    const flushed = h.channels.at(-1).port1.postMessage.mock.calls.map(([msg]) => msg).find(msg => msg.op === 'set');
    expect(flushed).toMatchObject({ ns: 'records', key: 'draft', value: 'kept in memory' });
    h.receivePort({ id: flushed.id, ok: true, value: null });
    await expect(approving).resolves.toMatchObject({ declined: false, connected: true, queuedWrites: 0 });
  });

  it('remembers a second Deny given after asking again', async () => {
    const h = fixture();
    await h.deny();
    const again = h.api.connectWithApproval().catch(error => error);
    h.bind();
    h.receivePort({ type: 'allo-bridge-error', error: { code: 'allo/approval-denied', message: 'Device storage access was denied.' } });
    expect(await again).toMatchObject({ code: 'allo/approval-denied' });
    await expect(h.api.ready()).rejects.toMatchObject({ code: 'allo/approval-denied' });
    expect(h.hellos()).toHaveLength(2);
  });

  it('treats a prompt left unanswered until it expires like a Deny', async () => {
    const h = fixture();
    const pending = h.api.connect().catch(error => error);
    h.bind();
    h.receivePort({ type: 'allo-bridge-consent-required' });
    const [id, timer] = [...h.timers].find(([, value]) => value.delay === 120000);
    h.timers.delete(id); timer.fn();
    expect(await pending).toMatchObject({ code: 'allo/consent-timeout' });
    expect(h.frames()).toBe(0);

    await expect(h.api.ready()).rejects.toMatchObject({ code: 'allo/consent-timeout', message: expect.stringContaining('Open device storage') });
    expect(h.frames()).toBe(0);
    expect(h.hellos()).toHaveLength(1);
    expect(h.api.status()).toMatchObject({ declined: true });
    await expect(h.api.set('records', 'draft', 'kept')).resolves.toEqual({ queued: true });

    h.api.connectWithApproval().catch(() => {});
    expect(h.frames()).toBe(1);
    expect(h.hellos()).toHaveLength(2);
  });

  it('still retries after failures that are not a Deny', async () => {
    const h = fixture();
    const pending = h.api.connect().catch(error => error);
    const [id, timer] = [...h.timers].find(([, value]) => value.delay === 12000);
    h.timers.delete(id); timer.fn();
    expect(await pending).toMatchObject({ code: 'allo/bridge-timeout' });
    h.api.connect().catch(() => {});
    expect(h.frames()).toBe(1);
    expect(h.hellos()).toHaveLength(2);
    expect(h.api.status()).toMatchObject({ declined: false });
  });
});

describe('recovery dialog after a Deny', () => {
  const dialogSource = readFileSync('view_canvas_recovery_dialog_source.jsx', 'utf8');
  it('offers "Open device storage" (asks again) instead of a retry that can no longer prompt', () => {
    expect(dialogSource).toContain("canvasRecoveryErrorCode === 'allo/approval-denied'");
    expect(dialogSource).toContain("canvasRecoveryErrorCode === 'allo/consent-timeout'");
    const errorBranch = dialogSource.slice(dialogSource.indexOf("canvasRecoveryDialogMode === 'error'"), dialogSource.indexOf("canvasRecoveryDialogMode === 'choice'"));
    expect(errorBranch).not.toContain("canvasRecoveryErrorCode === 'allo/approval-required'");
    expect(errorBranch.match(/needsStorageApproval/g)).toHaveLength(3);
  });
  it('ships the compiled dialog built from that source', () => {
    const { buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');
    const built = buildFirstWaveModule('CanvasRecoveryDialogView');
    for (const file of ['view_canvas_recovery_dialog_module.js', 'desktop/web-app/public/view_canvas_recovery_dialog_module.js']) {
      expect(readFileSync(file, 'utf8') === built, file).toBe(true);
    }
  });
  it('loads the changed adapter under a new cache-busting version', () => {
    const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(anti).toContain('allo_device_storage_module.js?v=' + createHash('sha256').update(source).digest('hex').slice(0, 12));
    expect(readFileSync('desktop/web-app/public/allo_device_storage_module.js', 'utf8') === source).toBe(true);
  });
});
