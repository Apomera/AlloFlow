import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const moduleSrc = readFileSync('allo_device_storage_module.js', 'utf8');
const bridgeSrc = readFileSync('storage_bridge.html', 'utf8');
const bridgeScript = bridgeSrc.slice(bridgeSrc.indexOf('<script>') + 8, bridgeSrc.lastIndexOf('</script>'));

const flush = async (win) => {
  await Promise.resolve();
  await new Promise((resolve) => win.setTimeout(resolve, 0));
};

let dom;
afterEach(() => {
  dom?.window?.close();
  dom = null;
  vi.restoreAllMocks();
});

describe('device storage bridge security contract', () => {
  it('pins adapter messages to origin, source, and nonce and fails closed without CSPRNG', () => {
    expect(moduleSrc).toContain('function parseBridgeUrl(value)');
    expect(moduleSrc).toContain("parsed.protocol === 'https:'");
    expect(moduleSrc).toContain("parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname)");
    expect(moduleSrc).toContain('event.source !== self.win || event.origin !== self.bridgeOrigin');
    expect(moduleSrc).toContain('isValidResponse(msg, self.nonce)');
    expect(moduleSrc).toContain('self.win.postMessage(msg, self.bridgeOrigin)');
    expect(moduleSrc).not.toContain('Math.random');
    expect(moduleSrc).not.toContain("self.win.postMessage(msg, '*')");
  });

  it('requires visible consent for cross-origin/opaque clients and never wildcard-fallbacks', () => {
    // 2026-08: the flat popup-only rejection became partition-scoped remembered
    // consent — a cross-origin/opaque client is authorized only by a human
    // approval recorded in the bridge's OWN partitioned storage, and the
    // consent record itself is fenced off the client op surface.
    expect(bridgeSrc).toContain("'allo-bridge-consent-required'");
    expect(bridgeSrc).toContain('RESERVED_NS_RE');
    expect(bridgeSrc).toContain("'allo/reserved-namespace'");
    expect(bridgeSrc).toContain('readConsent().then(');
    expect(bridgeSrc).toContain('id="btn-approve"');
    expect(bridgeSrc).toContain('event.source !== authorizedSource');
    expect(bridgeSrc).toContain('observedOrigin !== authorizedOrigin');
    expect(bridgeSrc).toContain("var targetOrigin = origin === 'null' ? '*' : origin;");
    expect(bridgeSrc).not.toContain("try { source.postMessage(payload, '*')");
    expect(bridgeSrc).toContain('nonce: nonce');

    const directCas = moduleSrc.slice(
      moduleSrc.indexOf("} else if (op === 'compareAndSwap') {"),
      moduleSrc.indexOf("} else if (op === 'mutateRecovery') {")
    );
    expect(directCas).toContain('store.get(k)');
    expect(directCas).toContain('store.put({');
    const bridgeCas = bridgeSrc.slice(
      bridgeSrc.indexOf('function kvCompareAndSwap('),
      bridgeSrc.indexOf('function kvGet(')
    );
    expect(bridgeCas).toContain("db.transaction(STORE, 'readwrite')");
    expect(bridgeCas).toContain('store.get(recKey(ns, key))');
    expect(bridgeCas).toContain('store.put({');

    const casLogic = (source) => source.slice(
      source.indexOf('  function isSafeRevision'),
      source.indexOf('  var RECOVERY_NAMESPACE')
    ).trim();
    expect(casLogic(bridgeSrc).replaceAll('casError', 'storageError')).toBe(casLogic(moduleSrc));
  });

  it('validates bridge URL policy and nonce-bound response envelopes at runtime', () => {
    dom = new JSDOM('<!doctype html><body></body>', {
      runScripts: 'outside-only',
      url: 'https://canvas.example/app',
    });
    dom.window.eval(moduleSrc);
    const internal = dom.window.alloDeviceStorage._internal;
    expect(internal.parseBridgeUrl('https://storage.example/bridge.html?q=1#old'))
      .toEqual({ href: 'https://storage.example/bridge.html?q=1', origin: 'https://storage.example' });
    expect(internal.parseBridgeUrl('http://127.0.0.1:8080/bridge.html').origin)
      .toBe('http://127.0.0.1:8080');
    expect(() => internal.parseBridgeUrl('http://attacker.example/bridge.html'))
      .toThrow(/must use HTTPS/i);
    expect(internal.isValidResponse({ allo: 'ds1', nonce: 'right', id: 'r1', ok: true }, 'right'))
      .toBe(true);
    expect(internal.isValidResponse({ allo: 'ds1', nonce: 'wrong', id: 'r1', ok: true }, 'right'))
      .toBe(false);
    expect(internal.buildEnvelope('right', 'r2', 'compareAndSwap', {
      ns: 'vault', key: 'workspace-a', expected: 2, nextValue: { ciphertext: 'v3' },
    })).toEqual({
      allo: 'ds1', nonce: 'right', id: 'r2', op: 'compareAndSwap',
      ns: 'vault', key: 'workspace-a', expected: 2, nextValue: { ciphertext: 'v3' },
    });
  });

  it('requires a click before authorizing an opaque popup and replies to null only with wildcard', async () => {
    const nonce = '0123456789abcdef0123456789abcdef';
    const client = { postMessage: vi.fn() };
    dom = new JSDOM(bridgeSrc.replace(/<script>[\s\S]*<\/script>/, ''), {
      runScripts: 'outside-only',
      url: `https://alloflow-cdn.pages.dev/storage_bridge.html#allo-ds=${nonce}`,
    });
    Object.defineProperty(dom.window, 'opener', { configurable: true, value: client });
    dom.window.eval(bridgeScript);

    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { allo: 'ds1', type: 'allo-bridge-hello', nonce, channel: 'popup' },
      origin: 'null',
      source: client,
    }));
    // The consent lookup is async; with no remembered grant the bridge shows
    // its own dialog and tells the client consent is pending (so an embedder
    // can reveal the frame) — but nothing is authorized yet.
    await flush(dom.window);
    expect(client.postMessage).toHaveBeenCalledTimes(1);
    expect(client.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      allo: 'ds1', type: 'allo-bridge-consent-required', nonce,
    }), '*');
    const approve = dom.window.document.getElementById('btn-approve');
    expect(approve.disabled).toBe(false);
    expect(dom.window.document.getElementById('approval-ui').hidden).toBe(false);

    approve.click();
    await flush(dom.window);
    expect(client.postMessage).toHaveBeenLastCalledWith({
      allo: 'ds1', type: 'allo-bridge-ready', nonce,
    }, '*');
  });

  it('rejects a hidden cross-origin iframe and auto-approves only exact same-origin clients', async () => {
    const nonce = 'fedcba9876543210fedcba9876543210';
    const iframeClient = { postMessage: vi.fn() };
    dom = new JSDOM(bridgeSrc.replace(/<script>[\s\S]*<\/script>/, ''), {
      runScripts: 'outside-only',
      url: `https://alloflow-cdn.pages.dev/storage_bridge.html#allo-ds=${nonce}`,
    });
    Object.defineProperty(dom.window, 'parent', { configurable: true, value: iframeClient });
    dom.window.eval(bridgeScript);
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { allo: 'ds1', type: 'allo-bridge-hello', nonce, channel: 'iframe' },
      origin: 'https://canvas.example',
      source: iframeClient,
    }));
    // 2026-08: a cross-origin iframe is no longer flatly rejected — with no
    // remembered grant the bridge renders its OWN approval dialog (which the
    // embedder can size but neither read nor click) and reports
    // consent-required; nothing is authorized until a human approves.
    await flush(dom.window);
    expect(iframeClient.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      allo: 'ds1', type: 'allo-bridge-consent-required', nonce,
    }), 'https://canvas.example');
    expect(dom.window.document.getElementById('approval-ui').hidden).toBe(false);

    dom.window.close();
    const sameOriginClient = { postMessage: vi.fn() };
    dom = new JSDOM(bridgeSrc.replace(/<script>[\s\S]*<\/script>/, ''), {
      runScripts: 'outside-only',
      url: `https://alloflow-cdn.pages.dev/storage_bridge.html#allo-ds=${nonce}`,
    });
    Object.defineProperty(dom.window, 'opener', { configurable: true, value: sameOriginClient });
    dom.window.eval(bridgeScript);
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { allo: 'ds1', type: 'allo-bridge-hello', nonce, channel: 'popup' },
      origin: 'https://alloflow-cdn.pages.dev',
      source: sameOriginClient,
    }));
    expect(sameOriginClient.postMessage).toHaveBeenCalledWith({
      allo: 'ds1', type: 'allo-bridge-ready', nonce,
    }, 'https://alloflow-cdn.pages.dev');
  });

  it('executes revision and legacy CAS without disclosing the conflicting value', async () => {
    dom = new JSDOM('<!doctype html><body></body>', {
      runScripts: 'outside-only',
      url: 'https://canvas.example/app',
    });
    dom.window.eval(moduleSrc);
    const api = dom.window.alloDeviceStorage;
    await api.useMemory();

    const created = await api.compareAndSwap('vault', 'workspace-a', 0, { ciphertext: 'v1' });
    expect(created).toMatchObject({ applied: true, revision: 1, value: { ciphertext: 'v1', revision: 1 } });

    const conflict = await api.compareAndSwap('vault', 'workspace-a', 0, { ciphertext: 'lost' });
    expect(conflict).toEqual({ applied: false, current: { exists: true, revision: 1 } });
    expect(JSON.stringify(conflict)).not.toContain('v1');

    const updated = await api.compareAndSwap('vault', 'workspace-a', { mode: 'revision', revision: 1 }, { ciphertext: 'v2' });
    expect(updated).toMatchObject({ applied: true, revision: 2, value: { ciphertext: 'v2', revision: 2 } });

    await api.set('vault', 'legacy', { version: 1, payload: 'legacy ciphertext' });
    const migrated = await api.compareAndSwap('vault', 'legacy', {
      mode: 'value', value: { version: 1, payload: 'legacy ciphertext' },
    }, { ciphertext: 'v2 envelope' });
    expect(migrated).toMatchObject({ applied: true, revision: 1 });
    expect(await api.get('vault', 'legacy')).toEqual({ ciphertext: 'v2 envelope', revision: 1 });
  });

  it('rejects disconnected CAS instead of queueing a conditional write', async () => {
    dom = new JSDOM('<!doctype html><body></body>', {
      runScripts: 'outside-only',
      url: 'https://canvas.example/app',
    });
    dom.window.eval(moduleSrc);
    const api = dom.window.alloDeviceStorage;
    api.init({ surface: 'canvas' });
    await expect(api.compareAndSwap('vault', 'workspace-a', 0, { ciphertext: 'x' }))
      .rejects.toMatchObject({ code: 'allo/storage-disconnected' });
    expect(api.status().queuedWrites).toBe(0);
  });
});
