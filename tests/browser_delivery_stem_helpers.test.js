import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const copies = ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js'];
const policySource = fs.readFileSync('browser_delivery_policy.js', 'utf8');
const optionalPolicySource = fs.readFileSync('optional_browser_delivery_policy.js', 'utf8');
const bytes = Buffer.from('window.__reviewedStemDependency = true;\n');
const integrity = 'sha384-' + createHash('sha384').update(bytes).digest('base64');
const assets = ['vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'stem_lab/stem_sim_assets.js', 'stem_lab/stem_sim_meadow.js'];
const threeMirrors = [
  ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'vendor/three-r128/three.min.js'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', 'vendor/three-r128/three.min.js'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', 'vendor/three-r128/OrbitControls.js'],
  ['https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js', 'vendor/three-r128/OrbitControls.js'],
];
const fxUrls = [
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js',
];

function harness(file, { href = 'https://alloflow.example/app/', dispatcher = true, approveFx = false } = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const section = (start, end) => {
    const first = source.indexOf(start), last = source.indexOf(end, first);
    if (first < 0 || last <= first) throw new Error('Actual STEM helper source anchors moved');
    return source.slice(first, last);
  };
  const config = section('    function _configureStemScript(', '    var _ORBIT_FX_URLS');
  const fx = section('    var _ORBIT_FX_URLS', '    function _orbitLowPower');
  const methods = section('        loadScriptResilient: function', '        // One AudioContext');
  const scripts = [], configured = [], timers = new Map();
  let timerSequence = 0;
  const location = new URL(href);
  const window = {
    location,
    setTimeout(callback) { const id = ++timerSequence; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    baseURI: href,
    getElementsByTagName: () => [{ src: new URL('stem_lab/stem_lab_module.js', href).href }],
    createElement() {
      const listeners = new Map();
      const script = {
        addEventListener(type, callback) { listeners.set(type, callback); },
        emit(type) { listeners.get(type)?.(); },
      };
      Object.defineProperty(script, 'src', {
        get() { return this.url; },
        set(value) { this.url = value; this.atSrc = { integrity: this.integrity, crossOrigin: this.crossOrigin, referrerPolicy: this.referrerPolicy }; },
      });
      return script;
    },
    head: {
      appendChild(script) { script.parentNode = this; scripts.push(script); },
      removeChild(script) { script.parentNode = null; },
    },
  };
  const manifest = {
    schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null, allowDesktopRemoteFallback: false,
    assets: Object.fromEntries(assets.map(name => [name, { integrity, bytes: bytes.length }])),
  };
  const optionalManifest = { schemaVersion: 1, libraries: {
    'three-core': { asset: assets[0], integrity, bytes: bytes.length,
      mirrors: threeMirrors.slice(0, 2).map(([url]) => ({ url, integrity, bytes: bytes.length })) },
    'three-orbit-controls': { asset: assets[1], integrity, bytes: bytes.length,
      mirrors: threeMirrors.slice(2).map(([url]) => ({ url, integrity, bytes: bytes.length })) },
  } };
  if (approveFx) fxUrls.forEach((url, index) => {
    optionalManifest.libraries['three-fx-' + index] = { asset: null, integrity: null, bytes: null, mirrors: [{ url, integrity, bytes: bytes.length }] };
  });
  const context = vm.createContext({ URL, window, document, console });
  vm.runInContext(policySource + '\n' + optionalPolicySource + '\nconst _alloBrowserDeliveryManifest=' + JSON.stringify(manifest) + ';\n'
    + 'const _alloOptionalBrowserDeliveryManifest=' + JSON.stringify(optionalManifest) + ';\n'
    + config + fx + '\nvar api={' + methods + '}; window.StemLab=api; this.api=api; this.loadFx=_loadOrbitFx; this.combinedConfigure=_alloConfigureTrustedBrowserScript;', context);
  const installDispatcher = () => {
    window.__alloConfigureTrustedScript = (script, url) => {
      configured.push(url);
      return context.combinedConfigure(script, url);
    };
  };
  if (dispatcher) installDispatcher();
  return { window, scripts, configured, timers, api: context.api, loadFx: context.loadFx, installDispatcher,
    fireTimer() { const [id, callback] = timers.entries().next().value; timers.delete(id); callback(); } };
}

describe.each(copies)('trusted STEM shared helpers: %s', (file) => {
  it('configures the primary and fallback before append and preserves shared pending loads', async () => {
    const f = harness(file);
    const options = { cacheKey: 'catalog', check: () => !!f.window.catalog };
    const urls = ['https://alloflow-cdn.pages.dev/stem_lab/stem_sim_assets.js?v=one', './stem_lab/stem_sim_assets.js?v=two'];
    const loading = f.api.loadScriptResilient(urls, options);
    expect(f.api.loadScriptResilient(urls, options)).toBe(loading);
    expect(f.scripts[0].atSrc).toEqual({ integrity, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' });
    f.scripts[0].emit('error');
    expect(f.scripts).toHaveLength(2);
    expect(f.scripts[1].atSrc.integrity).toBe(integrity);
    f.window.catalog = {};
    f.scripts[1].emit('load');
    await expect(loading).resolves.toBe(true);
    expect(f.configured).toEqual(urls);
    expect(f.timers.size).toBe(0);
  });

  it('does not execute or arm a timer for an unknown URL or missing trusted dispatcher, and retries after repair', async () => {
    const f = harness(file, { dispatcher: false });
    const urls = ['https://alloflow-cdn.pages.dev/stem_lab/stem_sim_assets.js'];
    await expect(f.api.loadScriptResilient(urls, { cacheKey: 'missing' })).rejects.toThrow(/library could not be loaded/);
    expect(f.scripts).toHaveLength(0);
    expect(f.timers.size).toBe(0);
    f.installDispatcher();
    await expect(f.api.loadScriptResilient(['https://evil.example/stem_sim_assets.js', 'https://cdn.jsdelivr.net/npm/three@latest/build/three.min.js'])).rejects.toThrow(/library could not be loaded/);
    expect(f.scripts).toHaveLength(0);
    const retry = f.api.loadScriptResilient(urls, { cacheKey: 'missing' });
    f.scripts[0].emit('load');
    await expect(retry).resolves.toBe(true);
  });

  it('retains global verification, timeout fallback, and ignores a late failed attempt', async () => {
    const f = harness(file);
    const urls = ['https://alloflow-cdn.pages.dev/stem_lab/stem_sim_assets.js', './stem_lab/stem_sim_assets.js'];
    const loading = f.api.loadScriptResilient(urls, { check: () => !!f.window.catalog });
    const first = f.scripts[0];
    f.fireTimer();
    expect(first.parentNode).toBeNull();
    expect(f.scripts).toHaveLength(2);
    first.emit('load');
    expect(f.scripts).toHaveLength(2);
    f.scripts[1].emit('load'); // Loaded code without its required global is a failure.
    await expect(loading).rejects.toThrow(/library could not be loaded/);
    const retry = f.api.loadScriptResilient(urls, { check: () => !!f.window.catalog });
    f.window.catalog = {};
    f.scripts[2].emit('load');
    await expect(retry).resolves.toBe(true);
    expect(f.timers.size).toBe(0);
  });

  it('preserves all four independent hosted Three mirrors with reviewed per-URL SRI', async () => {
    const f = harness(file);
    for (const [url] of threeMirrors) {
      const loading = f.api.loadScriptResilient([url]);
      const script = f.scripts.at(-1);
      expect(script.src).toBe(url);
      expect(script.atSrc.integrity).toBe(integrity);
      script.emit('load');
      await loading;
    }
  });

  it('uses a signed independent core and orbit mirror when the hosted local requests fail', async () => {
    const f = harness(file);
    const loading = f.api.ensureThree({ orbit: true, orbitRequired: true });
    f.scripts[0].emit('error');
    expect(f.scripts[1].src).toBe(threeMirrors[0][0]);
    f.window.THREE = {};
    f.scripts[1].emit('load');
    for (let index = 0; index < 8; index++) await Promise.resolve();
    f.scripts[2].emit('error');
    expect(f.scripts[3].src).toBe(threeMirrors[2][0]);
    f.window.THREE.OrbitControls = function () {};
    f.scripts[3].emit('load');
    await expect(loading).resolves.toBe(f.window.THREE);
    expect(f.scripts.every(script => script.atSrc.integrity === integrity)).toBe(true);
    expect(f.timers.size).toBe(0);
  });

  it('fails Desktop core loading entirely locally, including IPv6, without unsigned CDN fallback', async () => {
    for (const href of ['http://127.0.0.1:8123/app/', 'http://[::1]:8123/app/']) {
      const aliases = harness(file, { href });
      for (const [url, asset] of threeMirrors) {
        const loading = aliases.api.loadScriptResilient([url]);
        const script = aliases.scripts.at(-1);
        expect(script.src).toBe(new URL(asset, href).href);
        expect(script.atSrc.integrity).toBe(integrity);
        script.emit('load');
        await loading;
      }
      const f = harness(file, { href });
      const loading = f.api.ensureThree({ orbit: true });
      const outcome = loading.catch(error => error);
      for (let index = 0; index < 3; index++) {
        expect(new URL(f.scripts[index].src).origin).toBe(new URL(href).origin);
        expect(f.scripts[index].integrity).toBe(integrity);
        f.scripts[index].emit('error');
      }
      expect((await outcome).message).toMatch(/3D engine could not load/);
      expect(f.scripts).toHaveLength(3);
    }
  });

  it('configures every approved optional postprocessing script in dependency order', async () => {
    const f = harness(file, { approveFx: true });
    f.window.THREE = {};
    const loading = f.loadFx();
    for (let index = 0; index < fxUrls.length; index++) {
      const script = f.scripts[index];
      expect(script.src).toBe(fxUrls[index]);
      expect(script.atSrc.integrity).toBe(integrity);
      expect(script.async).toBe(false);
      if (index === fxUrls.length - 1) Object.assign(f.window.THREE, { EffectComposer() {}, RenderPass() {}, UnrealBloomPass() {} });
      script.onload();
    }
    await expect(loading).resolves.toBe(true);
    expect(f.configured).toEqual(fxUrls);
  });

  it('degrades optional FX without append when unsigned or on bundled Desktop', async () => {
    for (const settings of [{}, { dispatcher: false }, { href: 'http://[::1]:8123/app/', approveFx: true }]) {
      const f = harness(file, settings);
      f.window.THREE = {};
      await expect(f.loadFx()).resolves.toBe(false);
      expect(f.scripts).toHaveLength(0);
      expect(f.timers.size).toBe(0);
    }
  });
});
