import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const React = require(path.resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(path.resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const manifestHelper = require(path.resolve('dev-tools/build_browser_delivery_manifest.cjs'));

const PHASE46_FILES = [
  'allo_vr_module.js',
  'resource_read_aloud_module.js',
  'audio_banks_module.js',
  'studio_response_module.js',
  'view_pdf_validator_module.js',
];

const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha384(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

describe('Phase 46 — Mirrors & Canonical 3-Host SRI Integrity', () => {
  it('keeps all 5 Phase 46 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const parsedHosts = HOSTS.map((h) => manifestHelper.readEmbeddedManifest(fs.readFileSync(path.resolve(ROOT, h), 'utf8')));
    expect(parsedHosts.every(Boolean)).toBe(true);
    const releaseIds = new Set(parsedHosts.map((m) => m.releaseId));
    expect(releaseIds.size).toBe(1);

    for (const file of PHASE46_FILES) {
      const rootBuf = fs.readFileSync(path.resolve(ROOT, file));
      const rootIntegrity = sha384(rootBuf);
      for (const dir of MIRROR_DIRS) {
        const copyBuf = fs.readFileSync(path.resolve(ROOT, dir, file));
        expect(Buffer.compare(rootBuf, copyBuf), `${file} mirror mismatch in ${dir}`).toBe(0);
      }
      for (const m of parsedHosts) {
        expect(m.assets[file].bytes).toBe(rootBuf.length);
        expect(m.assets[file].integrity).toBe(rootIntegrity);
      }
    }
  });
});

describe('Phase 46 — allo_vr_module.js hardening', () => {
  const origXr = navigator.xr;
  afterEach(() => {
    Object.defineProperty(navigator, 'xr', { configurable: true, writable: true, value: origXr });
    delete window.AlloModules?.AlloVR;
  });

  function loadVR() {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.AlloVR;
    new Function(fs.readFileSync(path.resolve(ROOT, 'allo_vr_module.js'), 'utf8'))();
    return window.AlloModules.AlloVR;
  }

  it('freezes AlloVR and enable() handles, guards non-function callbacks, and cancels stale async support after unsubscribe', async () => {
    let resolveSupport;
    Object.defineProperty(navigator, 'xr', {
      configurable: true,
      writable: true,
      value: {
        isSessionSupported: () => new Promise((res) => { resolveSupport = res; }),
        addEventListener() {},
        removeEventListener() {},
      },
    });
    const VR = loadVR();
    expect(Object.isFrozen(VR)).toBe(true);
    expect(() => VR.isSupported(null)).not.toThrow();
    expect(() => VR.onSupportChange(null)()).not.toThrow();

    const seen = [];
    const off = VR.onSupportChange((ok) => seen.push(ok));
    off(); // unsubscribe BEFORE isSessionSupported resolves
    resolveSupport(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toEqual([]);
  });

  it('sanitizes unsafe opts.style in mountButton and normalizes invalid seat/bounds in enable()', async () => {
    Object.defineProperty(navigator, 'xr', {
      configurable: true,
      writable: true,
      value: {
        isSessionSupported: () => Promise.resolve(true),
        addEventListener() {},
        removeEventListener() {},
      },
    });
    const VR = loadVR();
    const container = document.createElement('div');
    const off = VR.mountButton(container, null, null, { style: 'background:url(javascript:alert(1));' });
    await Promise.resolve();
    await Promise.resolve();
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.style.cssText).not.toContain('javascript:');
    expect(() => btn.click()).not.toThrow();
    off();

    function Group() {
      this.children = [];
      this.scale = { setScalar() {} };
      this.position = { set() {} };
      this.rotation = { set() {} };
      this.add = function (o) { this.children.push(o); };
    }
    const h = VR.enable({
      THREE: { Group },
      renderer: { xr: {} },
      scene: { add() {} },
      camera: {},
      seat: { position: [NaN, Infinity, 'bad'], scale: -5, faceYaw: NaN, moveSpeed: 999 },
      bounds: { minX: NaN, maxX: 5, minZ: 0, maxZ: 10 },
    });
    expect(Object.isFrozen(h)).toBe(true);
    expect(() => h.destroy()).not.toThrow();
  });
});

describe('Phase 46 — resource_read_aloud_module.js hardening', () => {
  let root, host;
  beforeEach(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloModules = window.AlloModules || {};
    new Function(fs.readFileSync(path.resolve(ROOT, 'resource_read_aloud_module.js'), 'utf8'))();
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    host?.remove();
    host = null;
    delete window.__alloOfflineOnly;
    delete window.__alloAiUsable;
    delete window.__alloGetReadAloudAudioBridge;
  });

  it('freezes API, blocks prototype-key register() and deliveryLimits lookups, strips C0 controls, and fail-closes offline/throwing AI gate', () => {
    const api = window.AlloModules.ResourceReadAloud;
    expect(Object.isFrozen(api)).toBe(true);
    expect(() => api.register('__proto__', () => {})).toThrow();
    expect(() => api.register('constructor', () => {})).toThrow();
    expect(() => api.register('   ', () => {})).toThrow();

    api.register('phase46-test', (_res, add) => add('s1', 'Hello\u0000\u0007 world'));
    const resource = { id: 'p46', type: 'phase46-test', data: {} };
    expect(api.enumerate(resource)[0].text).toBe('Hello world');
    expect(api.portableAudio(resource, 'toString')).toBeNull();
    expect(api.portableAudio(resource, 'constructor')).toBeNull();

    // Offline-only gate disables Save TTS button
    window.__alloOfflineOnly = true;
    window.__alloGetReadAloudAudioBridge = () => ({ inspect: () => ({ status: 'missing' }) });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(api.Controls, { resource, canPrepare: true, allowRuntimeAi: true })));
    const saveBtn = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Save TTS');
    expect(saveBtn).toBeTruthy();
    expect(saveBtn.disabled).toBe(true);

    // Throwing __alloAiUsable also fails closed
    window.__alloOfflineOnly = false;
    window.__alloAiUsable = () => { throw new Error('gate exploded'); };
    act(() => root.render(React.createElement(api.Controls, { resource, canPrepare: true, allowRuntimeAi: true })));
    const saveBtn2 = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Save TTS');
    expect(saveBtn2.disabled).toBe(true);
  });
});

describe('Phase 46 — audio_banks_module.js hardening', () => {
  it('blocks prototype pollution and inherited-property leaks on all 4 proxies and guards throwing getAudio', () => {
    const sandbox = {
      window: {
        AlloModules: {},
        addEventListener() {},
        getAudio(cat, key) {
          if (key === 'boom') throw new Error('audio fail');
          return `data:audio/webm;base64,${cat}_${key}`;
        },
      },
      console: { log() {}, warn() {} },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.resolve(ROOT, 'audio_banks_module.js'), 'utf8'), sandbox);

    const banks = sandbox.window.AlloModules.AudioBanks;
    expect(Object.isFrozen(banks)).toBe(true);
    expect(banks.LETTER_NAME_AUDIO.a).toBe('data:audio/webm;base64,letters_a');
    expect(banks.INSTRUCTION_AUDIO.counting).toBe('data:audio/webm;base64,instructions_counting');

    for (const name of ['LETTER_NAME_AUDIO', 'INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']) {
      const proxy = banks[name];
      for (const bad of ['__proto__', 'constructor', 'prototype', 'toString']) {
        expect(proxy[bad], `${name}[${bad}]`).toBeUndefined();
        expect(bad in proxy, `${bad} in ${name}`).toBe(false);
      }
      for (const bad of ['__proto__', 'constructor', 'prototype']) {
        expect(() => { proxy[bad] = 'pwned'; }).toThrow(TypeError);
        expect(() => Object.defineProperty(proxy, bad, { value: 'pwned' })).toThrow(TypeError);
      }
    }
    expect(({}).pwned).toBeUndefined();
  });
});

describe('Phase 46 — studio_response_module.js hardening', () => {
  it('freezes API, neutralizes prototype section IDs, survives cycles, blocks control-char URLs, and uses prototype-safe backup parsing', () => {
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    new Function(fs.readFileSync(path.resolve(ROOT, 'studio_response_module.js'), 'utf8'))();
    const SR = window.AlloModules.StudioResponse;
    expect(Object.isFrozen(SR)).toBe(true);

    // Prototype section/bullet IDs neutralized
    const sections = SR.anchorSections({
      sections: [{ id: '__proto__', bullets: ['A'], bulletIds: ['constructor'] }],
    });
    expect(sections[0].id).toBe('id-__proto__');
    expect(sections[0].bulletIds[0]).toBe('id-constructor');

    // Cyclic object in applied challenge submission does not crash
    const cyclic = { claim: 'hello' };
    cyclic.self = cyclic;
    const res = { id: 'ac1', type: 'applied-challenge', data: {} };
    const sub = SR.toSubmission(res, {
      schemaVersion: 1,
      workspace: { response: 'ok' },
      evidenceLedger: [cyclic],
      sourceRecords: [
        { id: 'bad', url: 'https://example.org/a\r\nb' },
        { id: 'good', url: 'https://example.org/valid' },
      ],
    });
    expect(sub.data.sourceRecords).toHaveLength(1);
    expect(sub.data.sourceRecords[0].url).toBe('https://example.org/valid');

    // Null resource in readBackup throws cleanly
    expect(() => SR.readBackup(null, {})).toThrow();
    // Inherited prototype props do not masquerade as own fields in readBackup
    const protoBackup = {
      format: 'alloflow-studio-response',
      version: 1,
      resourceId: 'ac1',
      resourceType: 'applied-challenge',
      studio: Object.assign(Object.create({ coachHint: 12345 }), { schemaVersion: 1, workspace: { response: 'hi' } }),
    };
    expect(SR.readBackup(res, protoBackup).workspace.response).toBe('hi');
  });
});

describe('Phase 46 — view_pdf_validator_module.js hardening', () => {
  const PDFLib = require(path.resolve('desktop/mcp/vendor/pdf-lib.min.js'));
  function loadValidator() {
    const sandbox = { window: { PDFLib, AlloModules: {} }, console: { log() {} }, TextDecoder, Map, Set, WeakSet, Uint8Array, ArrayBuffer };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.resolve(ROOT, 'view_pdf_validator_module.js'), 'utf8'), sandbox);
    return sandbox.window.AlloModules.PdfValidator;
  }

  it('freezes API, guards invalid/empty/oversized bytes, and protects readingNotes from prototype roles and non-arrays', async () => {
    const V = loadValidator();
    expect(Object.isFrozen(V)).toBe(true);

    expect((await V.validateExportedPdfBytes(null)).summary.overall).toBe('ERROR');
    expect((await V.validateExportedPdfBytes(new Uint8Array(0))).summary.overall).toBe('ERROR');
    expect((await V.validateExportedPdfBytes({ byteLength: 101 * 1024 * 1024 })).summary.overall).toBe('ERROR');

    expect(V.readingNotes(null)).toEqual([]);
    expect(V.readingNotes('invalid')).toEqual([]);
    expect(V.readingNotes([
      null,
      { role: 'toString', page: 5, hasContent: true, actualText: 'u' },
      { role: 'constructor', page: 1, hasContent: true, actualText: '1' },
    ])).toEqual([]);
  });

  it('handles valid ArrayBuffer PDF input cleanly', async () => {
    const V = loadValidator();
    const doc = await PDFLib.PDFDocument.create();
    doc.addPage([612, 792]);
    const u8 = await doc.save();
    const report = await V.validateExportedPdfBytes(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    expect(report.byteLength).toBe(u8.byteLength);
    expect(report.pageCount).toBe(1);
    expect(Array.isArray(report.checks)).toBe(true);
  });
});
