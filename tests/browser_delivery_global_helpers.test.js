import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const policySource = fs.readFileSync('browser_delivery_policy.js', 'utf8');
const optionalPolicySource = fs.readFileSync('optional_browser_delivery_policy.js', 'utf8');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const fixtureBytes = Buffer.from('window.__reviewedHelperFixture = true;\n');
const integrity = 'sha384-' + createHash('sha384').update(fixtureBytes).digest('base64');
const names = ['qrcode.js', 'allo_device_storage_module.js', 'allo_crypto_module.js', 'vendor/lz-string-1.4.4.min.js', 'vendor/idb-keyval-6.2.0.umd.min.js'];

function harness(hostFile, { href = 'https://alloflow.example/app/', missingQr = false } = {}) {
  const host = fs.readFileSync(hostFile, 'utf8');
  const slice = (start, end) => {
    const first = host.indexOf(start), last = host.indexOf(end, first);
    if (first < 0 || last < first) throw new Error('Actual global helper anchors moved');
    return host.slice(first, last);
  };
  const storage = slice('const _alloLoadScriptGlobal =', '// ── Mailbox config:');
  const qr = slice('function _loadAlloQrLibrary()', 'async function _makeAlloQrSvg');
  const scripts = [], timers = new Map();
  const window = { location: new URL(href) };
  let sequence = 0;
  const document = {
    createElement() {
      const script = { dataset: {} };
      Object.defineProperty(script, 'src', {
        get() { return this.url; },
        set(value) { this.url = value; this.atSrc = { integrity: this.integrity, crossOrigin: this.crossOrigin, referrerPolicy: this.referrerPolicy }; },
      });
      return script;
    },
    head: {
      appendChild(script) { scripts.push(script); script.parentNode = this; },
      removeChild(script) { script.parentNode = null; },
    },
  };
  const manifest = {
    schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null, allowDesktopRemoteFallback: false,
    assets: Object.fromEntries(names.filter(name => !missingQr || name !== 'qrcode.js').map(name => [name, { integrity, bytes: fixtureBytes.length }])),
  };
  const optionalManifest = { schemaVersion: 1, libraries: Object.fromEntries([
    ['lz-string', 'vendor/lz-string-1.4.4.min.js', 'https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js'],
    ['idb-keyval', 'vendor/idb-keyval-6.2.0.umd.min.js', 'https://cdn.jsdelivr.net/npm/idb-keyval@6.2.0/dist/umd.js'],
  ].map(([key, asset, url]) => [key, { asset, integrity, bytes: fixtureBytes.length, mirrors: [{ url, integrity, bytes: fixtureBytes.length }] }])) };
  const context = vm.createContext({
    URL, window, document,
    setTimeout(callback) { const id = ++sequence; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    _alloShareHostIsNotStudentReachable: () => false,
  });
  vm.runInContext(policySource + '\n' + optionalPolicySource + '\nconst _alloBrowserDeliveryManifest=' + JSON.stringify(manifest) + ';\n'
    + 'const _alloOptionalBrowserDeliveryManifest=' + JSON.stringify(optionalManifest) + ';\nwindow.__alloConfigureTrustedScript=_alloConfigureTrustedBrowserScript;\n'
    + 'const ALLO_STORAGE_SCRIPT_TIMEOUT_MS=100; const ALLO_QR_SCRIPT_TIMEOUT_MS=100;\n' + storage + '\n' + qr
    + '\nthis.loadStorage=_alloLoadScriptGlobal; this.loadQr=_loadAlloQrLibrary; this.configure=_alloConfigureBrowserDeliveryScript;', context);
  return { window, scripts, timers, ...context };
}

describe.each(hosts)('first-party global helper delivery: %s', (host) => {
  it('configures storage SRI before append, deduplicates, and settles normally', async () => {
    const f = harness(host);
    const options = { cacheKey: 'device-storage' };
    const first = f.loadStorage('https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=reviewed', () => f.window.storage, options);
    expect(f.loadStorage('https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=reviewed', () => f.window.storage, options)).toBe(first);
    expect(f.scripts).toHaveLength(1);
    expect(f.scripts[0].atSrc).toEqual({ integrity, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' });
    f.window.storage = { ready: true };
    f.scripts[0].onload();
    await expect(first).resolves.toBe(f.window.storage);
    expect(f.timers.size).toBe(0);
  });

  it.each(['https://alloflow-cdn.pages.dev/unreviewed_module.js', 'https://evil.example/allo_crypto_module.js', 'https://alloflow-cdn.pages.dev/vendor/unreviewed.js'])('rejects unknown storage URL before append or timer: %s', async (url) => {
    const f = harness(host);
    await expect(f.loadStorage(url, () => null, { cacheKey: 'unknown' })).rejects.toThrow(/Browser delivery policy/);
    expect(f.scripts).toHaveLength(0);
    expect(f.timers.size).toBe(0);
    expect(f.window.__alloStorageDependencyPromises.unknown).toBeUndefined();
  });

  it('keeps Desktop/device storage and dev helpers on bundled reviewed bytes', async () => {
    for (const href of ['http://127.0.0.1:8123/app/', 'http://localhost:3000/', 'http://[::1]:8123/app/', 'http://[::1]:3000/']) {
      const f = harness(host, { href });
      const loading = f.loadStorage('https://alloflow-cdn.pages.dev/allo_crypto_module.js?v=security', () => f.window.crypto);
      expect(f.scripts[0].src).toBe(new URL('./allo_crypto_module.js?v=security', href).href);
      expect(f.scripts[0].integrity).toBe(integrity);
      f.window.crypto = {};
      f.scripts[0].onload();
      await loading;
      expect(() => f.configure({}, 'https://evil.example/allo_crypto_module.js')).toThrow();
    }
  });

  it('pins the exact third-party storage dependency and rejects mutable versions', async () => {
    const f = harness(host);
    const loading = f.loadStorage('https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js', () => f.window.vendor);
    expect(f.scripts[0].src).toBe('https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js');
    expect(f.scripts[0].atSrc).toEqual({ integrity, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' });
    f.window.vendor = {};
    f.scripts[0].onload();
    await loading;
    await expect(f.loadStorage('https://cdn.jsdelivr.net/npm/lz-string@latest/libs/lz-string.min.js', () => null)).rejects.toThrow(/reviewed manifest/);
    expect(f.scripts).toHaveLength(1);
  });

  it('rejects even the exact legacy vendor CDN on bundled Desktop, including IPv6', async () => {
    for (const href of ['http://127.0.0.1:8123/app/', 'http://[::1]:8123/app/']) {
      const f = harness(host, { href });
      await expect(f.loadStorage('https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js', () => null)).rejects.toThrow(/desktop remote/);
      expect(f.scripts).toHaveLength(0);
      expect(f.timers.size).toBe(0);
    }
  });

  it('hash-pins local and Cloudflare vendor copies rather than bypassing the manifest', async () => {
    const f = harness(host);
    const loading = f.loadStorage('https://alloflow-cdn.pages.dev/vendor/idb-keyval-6.2.0.umd.min.js', () => f.window.idb);
    expect(f.scripts[0].atSrc.integrity).toBe(integrity);
    f.window.idb = {};
    f.scripts[0].onload();
    await loading;
  });

  it('uses the same reviewed QR digest for normal load and network fallback', async () => {
    const f = harness(host);
    const loading = f.loadQr();
    expect(f.scripts[0].atSrc.integrity).toBe(integrity);
    expect(f.loadQr()).toBe(loading);
    f.scripts[0].onerror();
    expect(f.scripts).toHaveLength(2);
    expect(f.scripts[1].src).toBe('https://alloflow-cdn.pages.dev/qrcode.js');
    expect(f.scripts[1].atSrc.integrity).toBe(integrity);
    f.window.qrcode = () => {};
    f.scripts[1].onload();
    await expect(loading).resolves.toBe(f.window.qrcode);
    expect(f.timers.size).toBe(0);
  });

  it('rejects QR configuration failures without appending or arming a timer', async () => {
    const f = harness(host, { missingQr: true });
    await expect(f.loadQr()).rejects.toThrow(/QR library unavailable/);
    expect(f.scripts).toHaveLength(0);
    expect(f.timers.size).toBe(0);
  });
});
