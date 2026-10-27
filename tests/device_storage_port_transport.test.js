import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('allo_device_storage_module.js', 'utf8');
const origin = 'https://storage.example';
const active = [];
afterEach(() => { for (const h of active.splice(0)) { h.api.disconnect(); h.dom.window.close(); } vi.restoreAllMocks(); });
const turn = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function fixture({ mode = 'popup', messageChannel = true, transferFails = false } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://school.example/app' });
  const win = dom.window, channels = [], timers = new Map(), intervals = new Map();
  let clockId = 0;
  win.setTimeout = (fn, delay) => { const id = ++clockId; timers.set(id, { fn, delay }); return id; };
  win.clearTimeout = id => timers.delete(id);
  win.setInterval = (fn, delay) => { const id = ++clockId; intervals.set(id, { fn, delay }); return id; };
  win.clearInterval = id => intervals.delete(id);
  const removeListener = vi.spyOn(win, 'removeEventListener');
  function port() {
    return { onmessage: null, onmessageerror: null, started: false, closed: false,
      postMessage: vi.fn(), start: vi.fn(function () { this.started = true; }),
      close: vi.fn(function () { this.closed = true; }) };
  }
  win.MessageChannel = messageChannel ? function () {
    this.port1 = port(); this.port2 = port(); channels.push(this);
  } : undefined;
  const posted = [];
  const capture = (...args) => {
    posted.push(args);
    if (args[0].type === 'allo-bridge-connect') {
      const channel = channels.at(-1);
      expect(channel.port1.started).toBe(true);
      expect(typeof channel.port1.onmessage).toBe('function');
      if (transferFails) throw new Error('synthetic transfer failure');
    }
  };
  const target = { closed: false, postMessage: vi.fn(capture), close: vi.fn(function () { this.closed = true; }) };
  win.open = vi.fn(() => target);
  const append = win.document.body.appendChild.bind(win.document.body);
  win.document.body.appendChild = element => {
    const result = append(element);
    if (element.tagName === 'IFRAME') element.contentWindow.postMessage = vi.fn(capture);
    return result;
  };
  win.eval(source);
  const api = win.alloDeviceStorage;
  api.init({ surface: 'canvas', mode, bridgeUrl: origin + '/storage_bridge.html' });
  const h = { dom, win, api, channels, timers, intervals, removeListener, posted,
    target: () => mode === 'iframe' ? win.document.querySelector('iframe')?.contentWindow : target,
    nonce: () => posted.find(([msg]) => msg.type === 'allo-bridge-hello')?.[0].nonce,
    receiveWindow(data, overrides = {}) {
      win.dispatchEvent(new win.MessageEvent('message', { source: h.target(), origin,
        data: { allo: 'ds2', nonce: h.nonce(), ...data }, ...overrides }));
    },
    receivePort(data) { const p = channels.at(-1)?.port1; p?.onmessage?.({ data: { allo: 'ds2', nonce: h.nonce(), ...data } }); },
    bind() { h.receiveWindow({ type: 'allo-bridge-port-required' }); },
    async ready() { const pending = api.connect(); h.bind(); h.receivePort({ type: 'allo-bridge-ready' }); await pending; },
    runTimer(delay) { const found = [...timers].find(([, value]) => value.delay === delay); expect(found).toBeTruthy(); timers.delete(found[0]); found[1].fn(); }
  };
  active.push(h); return h;
}

describe('document-bound device storage adapter', () => {
  it.each(['popup', 'iframe'])('exchanges %s storage data only over the transferred port', async mode => {
    const h = fixture({ mode }); await h.ready();
    expect(h.posted).toHaveLength(2);
    expect(h.posted[0][0]).toMatchObject({ allo: 'ds2', type: 'allo-bridge-hello', channel: mode, clientOrigin: 'https://school.example' });
    expect(h.posted[1]).toEqual([expect.objectContaining({ allo: 'ds2', type: 'allo-bridge-connect', channel: mode }), origin, [h.channels[0].port2]]);
    const pending = h.api.get('records', 'synthetic');
    const sent = h.channels[0].port1.postMessage.mock.calls.at(-1)[0];
    expect(sent).toMatchObject({ allo: 'ds2', op: 'get', ns: 'records', key: 'synthetic' });
    expect(h.posted).toHaveLength(2);
    h.receivePort({ id: sent.id, ok: true, value: 'synthetic record' });
    await expect(pending).resolves.toBe('synthetic record');
  });

  it('ignores window readiness, consent and responses before and after binding', async () => {
    const h = fixture(); let connected = false;
    const pending = h.api.connect().then(() => { connected = true; });
    h.receiveWindow({ type: 'allo-bridge-ready' });
    h.receiveWindow({ type: 'allo-bridge-consent-required' });
    await turn(); expect(connected).toBe(false); expect(h.channels).toHaveLength(0);
    h.bind(); h.receiveWindow({ type: 'allo-bridge-ready' }); await turn(); expect(connected).toBe(false);
    h.receivePort({ type: 'allo-bridge-ready' }); await pending;
    let resolved = false;
    const read = h.api.get('records', 'synthetic').then(value => { resolved = true; return value; });
    const sent = h.channels[0].port1.postMessage.mock.calls.at(-1)[0];
    h.receiveWindow({ id: sent.id, ok: true, value: 'forged window value' });
    h.receiveWindow({ type: 'allo-bridge-error', error: { code: 'forged' } });
    await turn(); expect(resolved).toBe(false); expect(h.api.status().connected).toBe(true);
    h.receivePort({ id: sent.id, ok: true, value: 'port value' }); await expect(read).resolves.toBe('port value');
  });

  it('validates source, origin and nonce before transferring exactly one port', async () => {
    const h = fixture(); const pending = h.api.connect();
    h.receiveWindow({ type: 'allo-bridge-port-required' }, { source: {} });
    h.receiveWindow({ type: 'allo-bridge-port-required' }, { origin: 'https://other.example' });
    h.receiveWindow({ type: 'allo-bridge-port-required', nonce: 'wrong' });
    expect(h.channels).toHaveLength(0);
    h.bind(); h.bind(); h.bind();
    expect(h.channels).toHaveLength(1); expect(h.intervals.size).toBe(0);
    expect(h.posted.filter(([msg]) => msg.type === 'allo-bridge-connect')).toHaveLength(1);
    h.receivePort({ type: 'allo-bridge-ready', nonce: 'wrong' }); expect(h.api.status().connected).toBe(false);
    h.receivePort({ type: 'allo-bridge-ready' }); await pending;
  });

  it('keeps iframe consent visible until the bound port grants readiness', async () => {
    const h = fixture({ mode: 'iframe' }); const pending = h.api.connect(); h.bind();
    const frame = h.win.document.querySelector('iframe');
    h.receiveWindow({ type: 'allo-bridge-consent-required' }); expect(frame.getAttribute('aria-hidden')).toBe('true');
    h.receivePort({ type: 'allo-bridge-consent-required' }); expect(frame.hasAttribute('aria-hidden')).toBe(false);
    expect([...h.timers.values()].some(value => value.delay === 120000)).toBe(true);
    h.receivePort({ type: 'allo-bridge-ready' }); await pending; expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(h.timers.size).toBe(0);
  });

  it('rejects unavailable MessageChannel without creating a bridge or choosing memory', async () => {
    const h = fixture({ messageChannel: false });
    await expect(h.api.connect()).rejects.toMatchObject({ code: 'allo/message-port-unavailable' });
    expect(h.win.open).not.toHaveBeenCalled(); expect(h.api.status()).toMatchObject({ backend: 'bridge-popup', connected: false });
  });

  it('closes both ports and rejects a failed transfer without window-data fallback', async () => {
    const h = fixture({ transferFails: true }); const pending = h.api.connect(); h.bind();
    await expect(pending).rejects.toMatchObject({ code: 'allo/storage-port-transfer-failed' });
    expect(h.channels[0].port1.closed).toBe(true); expect(h.channels[0].port2.closed).toBe(true);
    expect(h.timers.size + h.intervals.size).toBe(0);
    expect(h.api.status()).toMatchObject({ backend: 'bridge-popup', connected: false });
  });

  it.each(['pagehide', 'disconnect', 'messageerror', 'remote-disconnect'])('rejects pending work and closes both ports on %s', async reason => {
    const h = fixture(); await h.ready();
    const request = h.api.get('records', 'synthetic').then(value => ({ value }), error => ({ error }));
    if (reason === 'pagehide') h.win.dispatchEvent(new h.win.Event('pagehide'));
    else if (reason === 'disconnect') h.api.disconnect();
    else if (reason === 'remote-disconnect') h.receivePort({ type: 'allo-bridge-disconnected' });
    else h.channels[0].port1.onmessageerror();
    expect((await request).error).toBeTruthy(); expect(h.api.status().connected).toBe(false);
    expect(h.channels[0].port1.closed).toBe(true); expect(h.channels[0].port2.closed).toBe(true);
    expect(h.channels[0].port1.postMessage).toHaveBeenCalledWith({ allo: 'ds2', nonce: h.nonce(), type: 'allo-bridge-disconnect' });
    expect(h.channels[0].port1.onmessage).toBeNull(); expect(h.channels[0].port1.onmessageerror).toBeNull();
    expect(h.timers.size + h.intervals.size).toBe(0);
    expect(h.removeListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(h.removeListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });

  it('rejects pending connection on pagehide and accepts denial only over the port', async () => {
    const h = fixture(); const pending = h.api.connect().catch(error => error);
    h.bind(); h.receiveWindow({ type: 'allo-bridge-error', error: { code: 'allo/denied' } });
    h.win.dispatchEvent(new h.win.Event('pagehide'));
    expect(await pending).toMatchObject({ code: 'allo/storage-disconnected' });
    const other = fixture(); const connect = other.api.connect().catch(error => error); other.bind();
    other.receivePort({ type: 'allo-bridge-error', error: { code: 'allo/denied', message: 'Denied' } });
    expect(await connect).toMatchObject({ code: 'allo/denied' });
  });

  it.each(['iframe', 'popup'])('times out an old %s bridge with upgrade guidance instead of downgrading', async mode => {
    const h = fixture({ mode }); const pending = h.api.connect().catch(error => error);
    h.receiveWindow({ allo: 'ds1', type: 'allo-bridge-ready' }); h.runTimer(mode === 'iframe' ? 12000 : 120000);
    const error = await pending;
    expect(error.code).toBe('allo/bridge-timeout'); expect(error.message).toMatch(/update and reopen/i);
    expect(h.api.status()).toMatchObject({ backend: 'bridge-' + mode, connected: false });
    expect(h.channels).toHaveLength(0);
  });

  it('rejects explicit legacy upgrade errors only from the pinned bridge before binding', async () => {
    const h = fixture(); const pending = h.api.connect().catch(error => error);
    h.receiveWindow({ allo: 'ds1', type: 'allo-bridge-error', error: { code: 'allo/bridge-upgrade-required' } }, { origin: 'https://other.example' });
    expect(h.timers.size).toBe(1);
    h.receiveWindow({ allo: 'ds1', type: 'allo-bridge-error', error: { code: 'allo/bridge-upgrade-required' } });
    expect(await pending).toMatchObject({ code: 'allo/bridge-upgrade-required' });
  });

  it('closes a silent port after request timeout and rejects every pending request', async () => {
    const h = fixture(); await h.ready();
    const first = h.api.get('records', 'one').catch(error => error);
    const second = h.api.get('records', 'two').catch(error => error);
    h.runTimer(8000);
    expect(await first).toMatchObject({ code: 'allo/storage-timeout' });
    expect(await second).toMatchObject({ code: 'allo/storage-timeout' });
    expect(h.api.status().connected).toBe(false); expect(h.timers.size).toBe(0);
    expect(h.channels[0].port1.closed).toBe(true);
  });

  it('rejects port send failures without exposing the failed request in error text', async () => {
    const h = fixture(); await h.ready();
    h.channels[0].port1.postMessage.mockImplementation(() => { throw new Error('SYNTHETIC_PRIVATE_RECORD'); });
    const error = await h.api.set('records', 'synthetic', 'SYNTHETIC_PRIVATE_RECORD', { queue: false }).catch(value => value);
    expect(error.code).toBe('allo/storage-post-failed'); expect(error.message).not.toContain('SYNTHETIC_PRIVATE_RECORD');
    expect(h.api.status().connected).toBe(false); expect(h.channels[0].port1.closed).toBe(true);
  });
});
