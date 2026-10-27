import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const view = fs.readFileSync('view_pdf_audit_source.jsx', 'utf8');
const lumen = fs.readFileSync('stem_lab/stem_tool_lumen.js', 'utf8');
function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing actual PDF boundary: ' + start);
  return source.slice(a, b);
}
const popupLoader = between(view, '                            function _ensurePdfjs()', '                            function _paneStatus');
const popupUtilities = between(view, '                            function _b64ToBytes(', '                            function _ensurePdfjs()');
const lumenLoader = between(lumen, '  var _pdfJsLoadPromise = null;', '  var _mammothLoadPromise = null;');
const lumenExtractor = between(lumen, '  function extractPdfText(', '  function extractDocxText(');

function harness(kind, { missing = false, deny = false, workerUrl = 'blob:verified-worker', ambient = false, failScript = false, assetGate, holdScript = false, version = '3.11.174' } = {}) {
  const scripts = [], requests = [], releases = [], revoked = [], events = {}, blobs = new Map();
  const pdfjs = { version, GlobalWorkerOptions: {} };
  const foreignPdfjs = { version: '4.0.379', GlobalWorkerOptions: {} };
  const broker = {};
  if (!missing) {
    broker.__alloFetchTrustedScriptText = async (url, key) => {
      requests.push(['text', url, key]);
      if (deny) throw new Error('Synthetic integrity failure');
      return '/* synthetic verified PDF.js bytes */';
    };
    broker.__alloGetVerifiedRuntimeAsset = async (graph, binding) => {
      requests.push(['asset', graph, binding]);
      if (deny) throw new Error('Synthetic integrity failure');
      if (assetGate) await assetGate;
      return { url: workerUrl, revoke() { releases.push(workerUrl); } };
    };
    broker.__alloConfigureTrustedScript = (script, url) => {
      requests.push(['script', url]);
      if (deny) throw new Error('Synthetic integrity failure');
      script.integrity = 'sha384-synthetic-reviewed'; script.crossOrigin = 'anonymous'; script.src = url;
      return script;
    };
  }
  const window = {
    ...broker, opener: broker, addEventListener(name, callback) { events[name] = callback; },
    removeEventListener(name, callback) { if (events[name] === callback) delete events[name]; },
    dispatchEvent(event) { events[event.type]?.(event); },
    setTimeout() { return 1; }, clearTimeout() {},
  };
  if (ambient) window.pdfjsLib = foreignPdfjs;
  const document = {
    createElement() { return { remove() {}, setAttribute() {} }; },
    head: { appendChild(script) {
      scripts.push({ src: script.src, textContent: script.textContent, integrity: script.integrity, crossOrigin: script.crossOrigin });
      if (holdScript) return;
      queueMicrotask(() => {
        if (failScript) { script.onerror?.(); return; }
        window.pdfjsLib = pdfjs;
        if (script.type === 'module') window.dispatchEvent({ type: 'pdfjs-loaded' });
        script.onload?.();
      });
    } },
  };
  let sequence = 0;
  const URL = {
    createObjectURL(blob) { const url = 'blob:popup-code-' + ++sequence; blobs.set(url, blob); return url; },
    revokeObjectURL(url) { revoked.push(url); blobs.delete(url); },
  };
  const context = vm.createContext({ window, document, URL, Blob, Promise, Uint8Array,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, Event: function (type) { this.type = type; } });
  vm.runInContext(kind === 'popup'
    ? 'var _pdfjsLibReady=null;\n' + popupLoader + '\nthis.load=_ensurePdfjs;'
    : lumenLoader + lumenExtractor + '\nthis.load=lazyLoadPdfJs;this.extract=extractPdfText;', context);
  return { context, window, scripts, requests, releases, revoked, events, blobs, pdfjs, foreignPdfjs };
}

describe('private PDF execution boundaries', () => {
  it.each(['popup', 'lumen'])('%s refuses missing verification instead of loading unsigned code', async kind => {
    const f = harness(kind, { missing: true, ambient: true });
    await expect(f.context.load()).rejects.toThrow(/verified|verification/i);
    expect(f.scripts).toHaveLength(0);
  });

  it('Compare gets code and worker bytes through the opener broker before inserting a blob script', async () => {
    const f = harness('popup');
    await expect(f.context.load()).resolves.toBe(f.pdfjs);
    expect(f.requests).toEqual([
      ['text', 'https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js', 'pdfjs.main'],
      ['asset', 'pdfjs', 'worker'],
    ]);
    expect(f.scripts).toHaveLength(1);
    expect(f.scripts[0].src).toMatch(/^blob:/);
    expect(f.pdfjs.GlobalWorkerOptions.workerSrc).toBe('blob:verified-worker');
  });

  it('Lumen signs the reviewed 3.11 script before insertion and does not reuse an ambient 4.0 global', async () => {
    const f = harness('lumen', { ambient: true });
    const first = f.context.load(), second = f.context.load();
    expect(first).toBe(second);
    await expect(first).resolves.toBe(f.pdfjs);
    expect(f.requests).toEqual([['asset', 'pdfjs', 'worker'], ['script', 'https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js']]);
    expect(f.scripts).toEqual([{ src: 'https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js', integrity: 'sha384-synthetic-reviewed', crossOrigin: 'anonymous', textContent: undefined }]);
    expect(f.pdfjs.GlobalWorkerOptions.workerSrc).toBe('blob:verified-worker');
  });

  it.each(['popup', 'lumen'])('%s never inserts code when verified acquisition fails', async kind => {
    const f = harness(kind, { deny: true });
    await expect(f.context.load()).rejects.toThrow('Synthetic integrity failure');
    expect(f.scripts).toHaveLength(0);
  });

  it.each(['popup', 'lumen'])('%s rejects a non-blob worker and releases its lease', async kind => {
    const f = harness(kind, { workerUrl: 'https://unreviewed.example/worker.js' });
    await expect(f.context.load()).rejects.toThrow('Verified PDF worker is unavailable');
    expect(f.scripts).toHaveLength(0);
    expect(f.releases).toEqual(['https://unreviewed.example/worker.js']);
  });

  it.each(['popup', 'lumen'])('%s releases its worker when code fails or an unexpected version appears', async kind => {
    for (const options of [{ failScript: true }, { version: '4.0.379' }]) {
      const f = harness(kind, options);
      await expect(f.context.load()).rejects.toThrow(/Verified PDF renderer/);
      expect(f.releases).toEqual(['blob:verified-worker']);
      expect(f.events.pagehide).toBeUndefined();
      expect(f.blobs.size).toBe(0);
    }
  });

  it.each(['popup', 'lumen'])('%s releases once on pagehide and obtains a fresh lease when reopened', async kind => {
    const f = harness(kind);
    await f.context.load();
    f.events.pagehide();
    expect(f.releases).toEqual(['blob:verified-worker']);
    expect(f.events.pagehide).toBeUndefined();
    await f.context.load();
    expect(f.requests.filter(call => call[0] === 'asset')).toHaveLength(2);
    f.events.pagehide();
    expect(f.releases).toHaveLength(2);
  });

  it.each(['popup', 'lumen'])('%s cancellation during acquisition releases a late lease without inserting code', async kind => {
    let releaseGate;
    const gate = new Promise(resolve => { releaseGate = resolve; });
    const f = harness(kind, { assetGate: gate });
    const pending = f.context.load();
    for (let step = 0; step < 8; step++) await Promise.resolve();
    f.events.pagehide(); releaseGate();
    await expect(pending).rejects.toThrow(/closed/);
    expect(f.releases).toEqual(['blob:verified-worker']);
    expect(f.scripts).toHaveLength(0);
  });

  it.each(['popup', 'lumen'])('%s cancellation while the script is pending rejects and frees its lease', async kind => {
    const f = harness(kind, { holdScript: true });
    const pending = f.context.load();
    for (let step = 0; step < 12; step++) await Promise.resolve();
    expect(f.scripts).toHaveLength(1);
    f.events.pagehide();
    await expect(pending).rejects.toThrow(/closed/);
    expect(f.releases).toEqual(['blob:verified-worker']);
    expect(f.blobs.size).toBe(0);
  });

  it.each(['popup', 'lumen'])('%s late canceled acquisition cannot clear a replacement load cache', async kind => {
    let releaseGate;
    const f = harness(kind, { assetGate: new Promise(resolve => { releaseGate = resolve; }) });
    const old = f.context.load().catch(error => error);
    for (let step = 0; step < 8; step++) await Promise.resolve();
    f.events.pagehide();
    const broker = kind === 'popup' ? f.window.opener : f.window;
    broker.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'blob:replacement-worker', revoke() {} });
    const replacement = f.context.load();
    await replacement;
    releaseGate();
    expect((await old).message).toMatch(/closed/);
    expect(f.context.load()).toBe(replacement);
    expect(f.pdfjs.GlobalWorkerOptions.workerSrc).toBe('blob:replacement-worker');
  });

  it('Lumen refuses arbitrary library and worker URL overrides before acquisition', async () => {
    for (const args of [['https://unreviewed.example/main.js'], [undefined, 'https://unreviewed.example/worker.js']]) {
      const f = harness('lumen');
      await expect(f.context.load(...args)).rejects.toThrow(/overrides/);
      expect(f.requests).toHaveLength(0);
      expect(f.scripts).toHaveLength(0);
    }
  });

  it('Lumen passes eval=false to PDF parsing, preserves page text, and destroys the document', async () => {
    const f = harness('lumen');
    let options, destroyed = 0;
    const pdfjs = { getDocument(value) {
      options = value;
      return { promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: 'Reviewed' }, { str: 'PDF' }] }) }), destroy() { destroyed++; } }) };
    } };
    await expect(f.context.extract(pdfjs, new Uint8Array([37, 80, 68, 70]).buffer)).resolves.toEqual({ pages: [{ pageNum: 1, text: 'Reviewed PDF' }], notes: [] });
    expect(options.isEvalSupported).toBe(false);
    expect(Array.from(options.data)).toEqual([37, 80, 68, 70]);
    expect(destroyed).toBe(1);
  });

  it('Compare passes eval=false in the actual embedded renderer', async () => {
    const body = between(view, '                            function _renderPdfInto(', '                            if (_pdfRawB64)');
    let options;
    const pdfjs = { getDocument(value) { options = value; return { promise: Promise.resolve({ numPages: 0, destroy() {} }) }; } };
    const context = vm.createContext({ _cmpPdfDoc: null, document: { getElementById: () => ({ innerHTML: '' }) }, _cropCleanup() {},
      _paneStatus: () => ({ remove() {} }), _ensurePdfjs: async () => pdfjs, _b64ToBytes: () => new Uint8Array([37, 80, 68, 70]),
      _withTimeout: promise => promise, _renderFail() {}, Promise });
    vm.runInContext(body + '\n_renderPdfInto("synthetic","Original PDF");', context);
    for (let step = 0; step < 8; step++) await Promise.resolve();
    expect(options.isEvalSupported).toBe(false);
  });

  it('Compare owns its timeout helper in the popup and clears settled-operation timers', async () => {
    const scheduled = [], cleared = [];
    const context = vm.createContext({ Promise, Uint8Array, setTimeout(fn, ms) { scheduled.push({ fn, ms }); return scheduled.length; }, clearTimeout(id) { cleared.push(id); } });
    vm.runInContext(popupUtilities + '\nthis.bound=_withTimeout;', context);
    await expect(context.bound(Promise.resolve('ready'), 30000, 'Compare parse')).resolves.toBe('ready');
    expect(cleared).toEqual([1]);
    const pending = context.bound(new Promise(() => {}), 30000, 'Compare render');
    const rejected = expect(pending).rejects.toThrow('Timed out after 30000ms: Compare render');
    scheduled[1].fn(); await rejected;
    expect(cleared).toEqual([1, 2]);
  });
});
