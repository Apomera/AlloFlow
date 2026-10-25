import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const policySource = fs.readFileSync('optional_browser_delivery_policy.js', 'utf8');
const loaderSource = fs.readFileSync('optional_browser_loader.js', 'utf8');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'];
const integrity = 'sha384-' + createHash('sha384').update('fixture').digest('base64');
function harness(host, href = 'https://school.example/') {
  const source = fs.readFileSync(host, 'utf8');
  const start = source.indexOf("if (typeof window !== 'undefined' && typeof document !== 'undefined') {");
  const end = source.indexOf('\nlet doc =', start);
  const scripts = [], events = [], timers = new Map(); let timerId = 0;
  const setTimeout = callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout = id => timers.delete(id);
  const window = { location: new URL(href), setTimeout, clearTimeout, dispatchEvent: event => events.push(event.type) };
  const document = { createElement: () => ({ dataset: {}, remove() {} }), head: { appendChild: script => scripts.push(script) } };
  const libraries = Object.fromEntries(['vexflow', 'jsonrepair', 'jszip', 'lamejs', 'pptxgenjs'].map(key => [key, { asset: `vendor/${key}.js`, integrity, bytes: 7,
    mirrors: [{ url: `https://cdn.jsdelivr.net/npm/${key}@1.2.3/index.js`, integrity, bytes: 7 }] }]));
  const context = vm.createContext({ URL, window, document, console: { warn() {} }, Promise, CustomEvent: class { constructor(type) { this.type = type; } } });
  vm.runInContext(policySource + '\n' + loaderSource + '\nconst _alloOptionalBrowserDeliveryId="fixture";\nconst _alloOptionalBrowserDeliveryManifest=' + JSON.stringify({ schemaVersion: 1, libraries }) + ';\n' + source.slice(start, end), context);
  return { window, document, scripts, events, timers, expire: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); } };
}
describe.each(hosts)('actual optional host routes: %s', host => {
  it('deduplicates concurrent loads and applies SRI to every fallback', async () => {
    const f = harness(host), ready = () => !!f.window.JSZip;
    const first = f.window.__alloLoadOptionalScript('jszip', undefined, ready);
    expect(f.window.__alloLoadOptionalScript('jszip', undefined, ready)).toBe(first);
    expect(f.scripts).toHaveLength(1); expect(f.scripts[0].integrity).toBe(integrity);
    f.scripts[0].onerror(); expect(f.scripts[1].integrity).toBe(integrity);
    f.window.JSZip = function () {}; f.scripts[1].onload();
    await expect(first).resolves.toBe(true); expect(f.timers.size).toBe(0);
  });
  it('rejects unknown keys and mis-keyed or mutable URLs without requests', async () => {
    const f = harness(host);
    for (const [key, urls] of [['unknown', ['https://evil.example/code.js']], ['jszip', ['https://cdn.jsdelivr.net/npm/vexflow@1.2.3/index.js']], ['jszip', ['https://cdn.jsdelivr.net/npm/jszip@latest/index.js']]]) {
      await expect(f.window.__alloLoadOptionalScript(key, urls, () => false)).resolves.toBe(false);
    }
    expect(f.scripts).toHaveLength(0); expect(f.timers.size).toBe(0);
  });
  it('allows explicit retry after every source has reached a terminal failure', async () => {
    const f = harness(host);
    const first = f.window.__alloEnsureJSZip();
    let index = 0; while (index < f.scripts.length) f.scripts[index++].onerror();
    await expect(first).resolves.toBe(false);
    const count = f.scripts.length, retry = f.window.__alloEnsureJSZip();
    expect(f.scripts).toHaveLength(count + 1);
    f.window.JSZip = function () {}; f.scripts.at(-1).onload(); await expect(retry).resolves.toBe(true);
  });
  it('settles a timeout without parallel retry and ignores a late completion outcome', async () => {
    const f = harness(host), ready = () => !!f.window.JSZip;
    const first = f.window.__alloLoadOptionalScript('jszip', undefined, ready, { timeoutMs: 100 });
    f.expire(); await expect(first).resolves.toBe(false);
    expect(f.window.__alloLoadOptionalScript('jszip', undefined, ready)).toBe(first); expect(f.scripts).toHaveLength(1);
    f.window.JSZip = function () {}; f.scripts[0].onload(); await expect(first).resolves.toBe(false);
    await expect(f.window.__alloEnsureJSZip()).resolves.toBe(true); expect(f.scripts).toHaveLength(1);
  });
  it('keeps missing Desktop optional libraries local, including IPv6', async () => {
    for (const href of ['http://127.0.0.1:8000/app/', 'http://[::1]:8000/app/']) {
      const f = harness(host, href), load = f.window.__alloEnsureJSZip();
      expect(f.scripts[0].src).toBe(new URL('./vendor/jszip.js', href).href);
      f.scripts[0].onerror(); await expect(load).resolves.toBe(false); expect(f.scripts).toHaveLength(1);
    }
  });
  it('announces VexFlow readiness once only after approved registration', async () => {
    const f = harness(host), first = f.window.__alloLazyVexFlow(), second = f.window.__alloLazyVexFlow();
    expect(f.scripts).toHaveLength(1); expect(f.events).toEqual([]); expect(f.scripts[0].integrity).toBe(integrity);
    expect(f.scripts[0].dataset.alloflowVexflow).toBe('5.0.0');
    f.window.VexFlow = { reviewed: true }; f.scripts[0].onload();
    await expect(first).resolves.toBe(true); await expect(second).resolves.toBe(true);
    expect(f.window.Vex.Flow).toBe(f.window.VexFlow); expect(f.events).toEqual(['alloflow:vexflow-ready']);
  });
  it('retains jsonrepair alias and Lame/Pptx readiness behavior', async () => {
    const f = harness(host);
    const repair = f.window.__alloEnsureJsonRepair(); f.window.JSONRepair = { jsonrepair() {} }; f.scripts.at(-1).onload(); await expect(repair).resolves.toBe(true);
    expect(f.window.jsonrepair).toBe(f.window.JSONRepair.jsonrepair);
    const lame = f.window.__alloEnsureLameJs(); f.window.lamejs = {}; f.scripts.at(-1).onload(); await expect(lame).resolves.toBe(true);
    const pptx = f.window.__alloEnsurePptxGen(); f.window.PptxGenJS = function () {}; f.scripts.at(-1).onload(); await expect(pptx).resolves.toBe(true);
  });
  it('settles DOM creation failures without requests, timers, or a stuck dedup slot', async () => {
    const f = harness(host); f.document.createElement = () => { throw new Error('document unavailable'); };
    await expect(f.window.__alloEnsureJSZip()).resolves.toBe(false);
    expect(f.scripts).toHaveLength(0); expect(f.timers.size).toBe(0);
  });
});
