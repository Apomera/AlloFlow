import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';

const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
let sourceAst;
const parsedSource = () => sourceAst || (sourceAst = parse(source, { sourceType: 'script', plugins: ['jsx'] }));
function between(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing actual document-runtime source boundary: ' + start);
  return source.slice(a, b);
}
const helper = source.includes('function _configureTrustedDocumentScript(')
  ? between('  function _configureTrustedDocumentScript(', '  const _waitForGlobal =') : '';
const shared = between('  const _waitForGlobal =', '  // ── ensurePdfLibLoaded');
const purifier = between('  var _domPurifyPromise =', '  };  // Allowed semantic HTML') + '\n  };';
const ace = between('  const _ACE_CDN_URLS =', '  const runEqualAccessAudit =');

function harness({ approved = [], missing = false, alwaysDeny = false, readyKind } = {}) {
  const scripts = [], calls = [], ready = { value: false };
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute() {}, remove() {} }),
    head: { appendChild(script) {
      scripts.push({ src: script.src, integrity: script.integrity, crossOrigin: script.crossOrigin });
      if (approved.includes(script.src)) {
        ready.value = true;
        if (readyKind === 'purifier') window.DOMPurify = { sanitize() {} };
        if (readyKind === 'ace') window.ace = { Checker: function () {} };
        if (script.onload) queueMicrotask(() => script.onload());
      } else if (script.onerror) queueMicrotask(() => script.onerror());
    } },
  };
  const window = {};
  if (!missing) window.__alloConfigureTrustedScript = (script, url) => {
    calls.push(url);
    if (alwaysDeny || !approved.includes(url)) throw new Error('Synthetic unapproved script');
    script.integrity = 'sha384-synthetic-reviewed-digest';
    script.crossOrigin = 'anonymous';
    script.src = url;
    return script;
  };
  const context = vm.createContext({ window, document, Promise, Date, setTimeout, clearTimeout,
    setInterval, clearInterval, queueMicrotask, warnLog() {} });
  vm.runInContext('var _docPipelinePdfWorkerAsset=null,_docPipelinePdfWorkerPending=null;\n' + helper + shared + purifier + ace
    + '\nthis.load=_loadCdnScript;this.purify=_ensureDOMPurify;this.ace=_ensureAce;this.makeTess=_createVerifiedTesseractWorker;', context);
  return { context, window, scripts, calls, ready };
}

describe('actual document private classic loaders', () => {
  it('sets trusted integrity before shared-loader insertion', async () => {
    const url = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    const f = harness({ approved: [url] });
    await expect(f.context.load('pdflib', [url], () => f.ready.value, { timeout: 5 })).resolves.toBe(true);
    expect(f.calls).toEqual([url]);
    expect(f.scripts).toEqual([{ src: url, integrity: 'sha384-synthetic-reviewed-digest', crossOrigin: 'anonymous' }]);
  });

  it.each([{}, { missing: true }])('does not insert shared scripts when approval is unavailable: %j', async options => {
    const f = harness(options);
    await expect(f.context.load('unknown', ['https://unapproved.example/code.js'], () => false, { timeout: 5 })).resolves.toBe(false);
    expect(f.scripts).toHaveLength(0);
  });

  it('skips a denied mirror and preserves approved fallback behavior', async () => {
    const approved = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
    const denied = 'https://unapproved.example/pako.js';
    const f = harness({ approved: [approved] });
    await expect(f.context.load('pako', [denied, approved], () => f.ready.value, { timeout: 5 })).resolves.toBe(true);
    expect(f.calls).toEqual([denied, approved]);
    expect(f.scripts.map(value => value.src)).toEqual([approved]);
    expect(f.scripts[0].integrity).toBe('sha384-synthetic-reviewed-digest');
  });

  it('keeps DOMPurify unavailable without inserting a denied sanitizer', async () => {
    const f = harness({ alwaysDeny: true });
    await expect(f.context.purify()).resolves.toBeNull();
    expect(f.calls).toHaveLength(4);
    expect(f.scripts).toHaveLength(0);
  });

  it('keeps the IBM ACE failure path honest without an unsigned fallback', async () => {
    const f = harness({ alwaysDeny: true });
    await expect(f.context.ace()).rejects.toThrow('Failed to load IBM Equal Access');
    expect(f.calls).toHaveLength(3);
    expect(f.scripts).toHaveLength(0);
  });
});

describe('document verified worker adapters', () => {
  it('uses the verified PDF worker lease, ignores ambient worker URLs and shares the lease', async () => {
    const f = harness(), calls = [];
    f.window.pdfjsLib = { GlobalWorkerOptions: {} };
    f.window.__alloflowRuntimeAssets = { pdfjsWorker: 'https://unapproved.example/worker.js' };
    f.window.__alloGetVerifiedRuntimeAsset = async (...args) => { calls.push(args); return { url: 'blob:verified-pdf', revoke() {} }; };
    vm.runInContext(between('  const ensurePdfJsLoaded =', '  // OOM guard:') + '\nthis.ensurePdf=ensurePdfJsLoaded;', f.context);
    await Promise.all([f.context.ensurePdf(), f.context.ensurePdf()]);
    expect(calls).toEqual([['pdfjs', 'worker']]);
    expect(f.window.pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('blob:verified-pdf');
  });

  it('rejects missing or non-blob PDF runtime approval without assigning a raw fallback', async () => {
    const f = harness(); let revoked = 0;
    f.window.pdfjsLib = { GlobalWorkerOptions: {} };
    vm.runInContext(between('  const ensurePdfJsLoaded =', '  // OOM guard:') + '\nthis.ensurePdf=ensurePdfJsLoaded;', f.context);
    await expect(f.context.ensurePdf()).rejects.toThrow('Verified document runtime is unavailable');
    f.window.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'https://unapproved.example/worker.js', revoke() { revoked++; } });
    await expect(f.context.ensurePdf()).rejects.toThrow('invalid asset');
    expect(revoked).toBe(1);
    expect(f.window.pdfjsLib.GlobalWorkerOptions.workerSrc).toBeUndefined();
  });

  it('pins Tesseract worker options and releases the graph only after termination', async () => {
    const f = harness(), calls = []; let revoked = 0, terminated = 0;
    f.window.__alloGetVerifiedRuntimeAsset = async (...args) => { calls.push(args); return { url: 'blob:verified-tess', revoke() { revoked++; } }; };
    f.window.Tesseract = { createWorker: async (...args) => { calls.push(args); return { terminate: async () => { terminated++; } }; } };
    const worker = await f.context.makeTess('fra');
    expect(calls[0]).toEqual(['tesseract', 'worker']);
    expect(calls[1]).toEqual(['fra', 1, { workerPath: 'blob:verified-tess', workerBlobURL: false }]);
    expect(revoked).toBe(0);
    await worker.terminate(); await worker.terminate();
    expect(terminated).toBe(2); expect(revoked).toBe(1);
  });

  it('releases a failed Tesseract boot and never falls back to default worker options', async () => {
    const f = harness(); let revoked = 0, calls = 0;
    f.window.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'blob:verified-tess', revoke() { revoked++; } });
    f.window.Tesseract = { createWorker: async (...args) => { calls++; expect(args[2].workerBlobURL).toBe(false); throw new Error('synthetic boot failure'); } };
    await expect(f.context.makeTess('eng')).rejects.toThrow('synthetic boot failure');
    expect(revoked).toBe(1); expect(calls).toBe(1);
    delete f.window.__alloGetVerifiedRuntimeAsset;
    await expect(f.context.makeTess('eng')).rejects.toThrow('unavailable');
    expect(calls).toBe(1);
  });

  it('uses verified options in both the shared and fresh-spawn OCR retry paths', async () => {
    const f = harness(), calls = []; let revoked = 0;
    f.window.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'blob:verified-tess', revoke() { revoked++; } });
    f.window.Tesseract = { createWorker: async (...args) => {
      calls.push(args);
      if (calls.length === 1) throw new Error('retry shared boot');
      return { recognize: async () => ({ data: { text: 'synthetic recognized text' } }), terminate: async () => {} };
    } };
    f.context._withTimeout = value => Promise.resolve(value);
    vm.runInContext(between('  const _OCR_RECOGNIZE_TIMEOUT_FIRST_MS =', '  // M14 (audit 2026-07-26)') + '\nthis.recognize=_ocrRecognize;', f.context);
    await expect(f.context.recognize({}, 'eng', 'synthetic')).resolves.toEqual({ data: { text: 'synthetic recognized text' } });
    expect(calls).toHaveLength(2); expect(revoked).toBe(2);
    for (const args of calls) expect(args.slice(1)).toEqual([1, { workerPath: 'blob:verified-tess', workerBlobURL: false }]);
  });

  it('terminates a shared worker that finishes booting after its caller timed out', async () => {
    const f = harness(); let complete, terminated = 0, revoked = 0;
    f.window.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'blob:verified-tess', revoke() { revoked++; } });
    f.window.Tesseract = { createWorker: () => new Promise(resolve => { complete = resolve; }) };
    f.context._withTimeout = promise => { promise.catch(() => {}); return Promise.reject(new Error('synthetic timeout')); };
    vm.runInContext(between('  const _OCR_RECOGNIZE_TIMEOUT_FIRST_MS =', '  // M14 (audit 2026-07-26)') + '\nthis.shared=_ocrSharedRecognize;', f.context);
    await expect(f.context.shared({}, 'eng', 'synthetic')).rejects.toThrow('synthetic timeout');
    for (let i = 0; i < 8 && !complete; i++) await Promise.resolve();
    expect(complete).toBeTypeOf('function');
    complete({ terminate: async () => { terminated++; } });
    for (let i = 0; i < 12; i++) await Promise.resolve();
    expect(terminated).toBe(1); expect(revoked).toBe(1);
  });
});

describe('document raster worker protocol', () => {
  function rasterHarness(fail = false) {
    const f = harness(), calls = [], messages = [], listeners = new Set(); let terminated = 0;
    const worker = {
      addEventListener: (_event, callback) => listeners.add(callback),
      removeEventListener: (_event, callback) => listeners.delete(callback),
      postMessage(message) {
        messages.push(message);
        if (message.t === 'init') queueMicrotask(() => { for (const callback of listeners) callback({ data: fail ? { t: 'init-error', message: 'synthetic malformed PDF' } : { t: 'ready' } }); });
      },
      terminate() { terminated++; },
    };
    f.window.__alloCreateVerifiedWorker = async (...args) => { calls.push(args); return worker; };
    f.context.Worker = function () { throw new Error('raw worker constructor used'); };
    f.context.OffscreenCanvas = function () {};
    f.context._withTimeout = value => Promise.resolve(value);
    vm.runInContext(between('  const _ALLO_RASTER_WORKER_MAX_BYTES =', '  const extractPdfTextTesseract =')
      + '\nthis.makeRaster=_alloCreateOcrRasterWorker;this.protocol=_alloOcrRasterWorkerSource;', f.context);
    return { ...f, calls, messages, terminated: () => terminated };
  }

  it('creates only the approved graph and sends data-only init messages', async () => {
    const f = rasterHarness(), controller = await f.context.makeRaster(new Uint8Array([1, 2, 3]));
    expect(f.calls).toHaveLength(1); expect(f.calls[0][0]).toBe('pdfjs-raster');
    expect(f.calls[0][1]).not.toMatch(/importScripts|https?:\/\//);
    expect(f.calls[0][2]).toEqual({ name: 'alloflow-pdfjs-raster' });
    expect(Object.keys(f.messages[0]).sort()).toEqual(['buf', 't']);
    expect(controller.healthy()).toBe(true);
    controller.destroy(); expect(f.terminated()).toBe(1);
  });

  it('terminates an initialized worker on protocol failure and refuses absent approval', async () => {
    const f = rasterHarness(true);
    await expect(f.context.makeRaster(new Uint8Array([1]))).resolves.toBeNull();
    expect(f.terminated()).toBe(1);
    delete f.window.__alloCreateVerifiedWorker;
    await expect(f.context.makeRaster(new Uint8Array([1]))).resolves.toBeNull();
    expect(f.calls).toHaveLength(1);
  });

  it('uses preloaded PDF code while ignoring injected init URLs', async () => {
    const f = rasterHarness(), posts = [], inputs = [];
    const pdfjsLib = { GlobalWorkerOptions: {}, getDocument: options => { inputs.push(options); return { promise: Promise.resolve({ numPages: 2 }) }; } };
    const self = { pdfjsWorker: { WorkerMessageHandler: {} }, __alloRuntimeAssets: { worker: 'blob:verified-pdf' }, postMessage: message => posts.push(message) };
    const context = vm.createContext({ self, pdfjsLib, Uint8Array });
    vm.runInContext(f.context.protocol(), context);
    self.onmessage({ data: { t: 'init', buf: new Uint8Array([1]).buffer, urls: ['https://unapproved.example/code.js'], workerUrls: ['https://unapproved.example/worker.js'] } });
    await Promise.resolve();
    expect(inputs).toHaveLength(1); expect(posts).toEqual([{ t: 'ready', pages: 2 }]);
    expect(inputs[0].isEvalSupported).toBe(false);
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('blob:verified-pdf');
  });
});

it('disables PDF.js dynamic evaluation at every document call site', () => {
  const ast = parsedSource(), calls = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression'
        && node.callee.property?.name === 'getDocument') calls.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  expect(calls.length).toBeGreaterThanOrEqual(9);
  for (const call of calls) {
    expect(call.arguments[0]?.type).toBe('ObjectExpression');
    const setting = call.arguments[0].properties.find(property => property.key?.name === 'isEvalSupported');
    expect(setting?.value.type).toBe('BooleanLiteral');
    expect(setting.value.value).toBe(false);
  }
});

it('pins every actual private classic-loader URL in the reviewed document catalog', () => {
  const manifest = JSON.parse(fs.readFileSync('document_runtime_integrity.json', 'utf8'));
  const allowed = new Set(Object.values(manifest.assets).flatMap(record => [...(record.aliases || []), ...record.mirrors.map(mirror => mirror.url)]));
  const urls = new Set(), arrays = new Set(['_AXE_CDN_URLS', '_DOMPURIFY_CDN_URLS', '_ACE_CDN_URLS']);
  const add = node => {
    expect(node?.type).toBe('ArrayExpression');
    for (const element of node.elements) { expect(element.type).toBe('StringLiteral'); urls.add(element.value); }
  };
  const visit = (node, owner) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.init?.type === 'ArrowFunctionExpression') owner = node.id.name;
    if (node.type === 'VariableDeclarator' && (arrays.has(node.id.name)
        || node.id.name === 'urls' && ['_ensureTemml', '_lazyLoadSheetJS'].includes(owner))) add(node.init);
    if (node.type === 'CallExpression' && node.callee?.name === '_loadCdnScript') add(node.arguments[1]);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, owner));
      else if (value && typeof value === 'object') visit(value, owner);
    }
  };
  visit(parsedSource());
  expect(urls.size).toBeGreaterThanOrEqual(36);
  for (const url of urls) expect(allowed.has(url), url).toBe(true);
});

describe('actual host and combined document dispatcher', () => {
  const graph = JSON.parse(fs.readFileSync('document_runtime_integrity.json', 'utf8'));
  const optional = JSON.parse(fs.readFileSync('browser_vendor_integrity.json', 'utf8'));
  const runtimeSource = fs.readFileSync('runtime_graph_delivery_policy.js', 'utf8');
  const hostSource = fs.readFileSync('runtime_graph_host.js', 'utf8');
  const optionalSource = fs.readFileSync('optional_browser_delivery_policy.js', 'utf8');
  const firstPartySource = fs.readFileSync('browser_delivery_policy.js', 'utf8');
  function actualHost(href) {
    const requests = [], target = { location: new URL(href), crypto: cryptoForTest, Blob, URL, AbortController, TextDecoder,
      Worker: function () { throw new Error('unexpected worker'); }, setTimeout, clearTimeout,
      btoa: value => Buffer.from(value, 'binary').toString('base64'),
      fetch: async value => {
        const url = new URL(value); requests.push(url.href);
        expect(url.origin).toBe(new URL(href).origin);
        const relative = url.pathname.replace(/^\/app\//, '');
        expect(relative.startsWith('runtime_assets/document/')).toBe(true);
        return new Response(fs.readFileSync(relative), { status: 200 });
      } };
    const context = vm.createContext({ window: target, URL, inputGraph: graph, inputOptional: optional });
    vm.runInContext(runtimeSource + '\n' + hostSource + '\n' + firstPartySource + '\n' + optionalSource
      + '\nconst _alloRuntimeGraphPolicy=_alloInstallRuntimeGraphHost(inputGraph,window);'
      + '\nconst _alloOptionalBrowserDeliveryManifest=inputOptional;'
      + '\nconst _alloBrowserDeliveryManifest={schemaVersion:1,releaseId:"' + 'a'.repeat(64) + '",fallbackCommit:null,allowDesktopRemoteFallback:false,assets:{"fixture_module.js":{bytes:1,integrity:"sha384-' + Buffer.alloc(48).toString('base64') + '"}}};'
      + '\nthis.configure=_alloConfigureTrustedBrowserScript;this.policy=_alloRuntimeGraphPolicy;', context);
    return { target, context, requests };
  }

  const cryptoForTest = { subtle: { digest: async (_algorithm, bytes) => {
    const digest = createHash('sha384').update(new Uint8Array(bytes)).digest();
    return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength);
  } } };

  it('installs immutable runtime API hooks and applies per-alias SRI before hosted src', () => {
    const f = actualHost('https://school.example/app/index.html');
    for (const name of ['__alloFetchTrustedScriptText', '__alloLoadVerifiedRuntime', '__alloDisposeVerifiedRuntime', '__alloGetVerifiedRuntimeAsset', '__alloCreateVerifiedWorker']) {
      expect(typeof f.target[name]).toBe('function'); expect(Object.getOwnPropertyDescriptor(f.target, name).writable).toBe(false);
    }
    const record = graph.assets['axe-core'], url = record.aliases[0], events = [], script = {};
    for (const name of ['integrity', 'crossOrigin', 'referrerPolicy', 'src']) Object.defineProperty(script, name, { set(value) { events.push([name, value]); } });
    f.context.configure(script, url, 'axe-core');
    expect(events.map(event => event[0])).toEqual(['integrity', 'crossOrigin', 'referrerPolicy', 'src']);
    expect(events[0][1]).toBe('sha384-' + Buffer.from(record.sha384, 'hex').toString('base64'));
    expect(events[3][1]).toBe(url); expect(f.requests).toEqual([]);
  });

  it('localizes only reviewed Desktop aliases/mirrors to exact owned local bytes', async () => {
    const f = actualHost('http://127.0.0.1:3333/app/index.html');
    for (const id of ['pdf-lib', 'pdfjs.main', 'pako', 'tesseract.main', 'fontkit', 'sheetjs.0.20.1', 'sheetjs.0.18.5', 'axe-core', 'dompurify', 'temml', 'ibm-ace', 'jszip', 'mammoth']) {
      const record = graph.assets[id], url = record.aliases?.[0] || record.mirrors[0].url, script = {};
      expect(f.context.policy.isApprovedUrl(url)).toBe(false);
      f.context.configure(script, url, id);
      expect(script.src).toBe('http://127.0.0.1:3333/app/' + record.path);
      expect(script.integrity).toBe('sha384-' + Buffer.from(record.sha384, 'hex').toString('base64'));
    }
    const text = await f.target.__alloFetchTrustedScriptText(graph.assets['axe-core'].aliases[0], 'axe-core');
    expect(text).toBe(fs.readFileSync(graph.assets['axe-core'].path, 'utf8'));
    expect(f.requests).toEqual(['http://127.0.0.1:3333/app/' + graph.assets['axe-core'].path]);
    const denied = {};
    expect(() => f.context.configure(denied, 'https://unapproved.example/axe.min.js', 'axe-core')).toThrow();
    expect(denied.src).toBeUndefined();
  });
});

describe('verified axe source cache', () => {
  it.each([true, false])('uses only the verified-text API before inline caching: approved=%s', async approved => {
    const f = harness(), calls = []; let rawFetches = 0;
    f.window.axe = {};
    const text = '/* axe synthetic verified source */';
    f.window.__alloFetchTrustedScriptText = async (...args) => { calls.push(args); if (!approved) throw new Error('integrity mismatch'); return text; };
    f.context.fetch = async () => { rawFetches++; throw new Error('raw fetch forbidden'); };
    f.context._withTimeout = value => Promise.resolve(value);
    vm.runInContext(between('  var _axeSourceCache =', '  // ── DOMPurify (lazy-loaded)')
      + '\nthis.audit=runAxeAudit;this.cached=()=>_axeSourceCache;', f.context);
    await f.context.audit('<html lang="en"><title>Synthetic</title><body></body></html>');
    expect(rawFetches).toBe(0);
    expect(calls.length).toBe(approved ? 1 : 3);
    for (const args of calls) expect(args[1]).toBe('axe-core');
    expect(f.context.cached()).toBe(approved ? text : null);
  });
});

describe('staged document executable graph', () => {
  const manifest = JSON.parse(fs.readFileSync('document_runtime_integrity.json', 'utf8'));
  it('has exact bounded source hashes and graph references confined to owned assets', () => {
    expect(manifest.schemaVersion).toBe(1);
    for (const record of Object.values(manifest.assets)) {
      const bytes = fs.readFileSync(record.path);
      expect(bytes.length).toBe(record.bytes);
      expect(bytes.length).toBeLessThanOrEqual(16 * 1024 * 1024);
      expect(createHash('sha384').update(bytes).digest('hex')).toBe(record.sha384);
      expect(bytes.equals(fs.readFileSync('desktop/web-app/public/' + record.path))).toBe(true);
      if (record.kind === 'wasm') expect([...bytes.subarray(0, 4)]).toEqual([0, 97, 115, 109]);
      for (const id of record.dependencies || []) expect(Object.hasOwn(manifest.assets, id)).toBe(true);
    }
    for (const graph of Object.values(manifest.graphs)) {
      for (const id of [...graph.assets, ...(graph.scripts || []), ...Object.values(graph.bindings || {})]) expect(Object.hasOwn(manifest.assets, id)).toBe(true);
      for (const id of graph.assets) for (const dependency of manifest.assets[id].dependencies || []) expect(graph.assets).toContain(dependency);
    }
  });

  it.each(['lstm', 'simd-lstm'])('pins the actual WASM embedded in the %s core and contains no child script constructor', variant => {
    const core = fs.readFileSync(manifest.assets['tess.core-' + variant].path, 'utf8');
    const inline = core.match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/);
    expect(inline).not.toBeNull();
    const bytes = Buffer.from(inline[1], 'base64');
    expect(bytes.equals(fs.readFileSync(manifest.assets['tess.wasm-' + variant].path))).toBe(true);
    expect(core).not.toMatch(/importScripts\s*\(|new Worker\s*\(/);
  });

  it.each([true, false])('bootstraps only the selected verified core and worker: SIMD=%s', simd => {
    const imports = [], factoryOptions = [], self = { __alloRuntimeAssets: { lstmWasm: 'blob:lstm', simdLstmWasm: 'blob:simd' } };
    self.__alloRuntimeImportScripts = id => { imports.push(id); if (id.startsWith('tess.core-')) self.TesseractCore = options => { factoryOptions.push(options); return Promise.resolve({}); }; };
    const context = vm.createContext({ self, WebAssembly: { validate: () => simd }, Uint8Array });
    vm.runInContext(fs.readFileSync(manifest.assets['tess.bootstrap'].path, 'utf8'), context);
    expect(imports).toEqual([simd ? 'tess.core-simd-lstm' : 'tess.core-lstm', 'tess.worker']);
    self.TesseractCore({ wasmBinary: new Uint8Array([0]), locateFile: () => 'https://unapproved.example/core.wasm' });
    const options = factoryOptions[0];
    expect(options.wasmBinary).toBeUndefined();
    expect(options.locateFile(simd ? 'tesseract-core-simd-lstm.wasm' : 'tesseract-core-lstm.wasm')).toBe(simd ? 'blob:simd' : 'blob:lstm');
    expect(() => options.locateFile('unapproved.wasm')).toThrow('Unapproved');
  });
});
