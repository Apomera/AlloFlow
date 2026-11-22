import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SRC_PATH = path.resolve(ROOT, 'doc_pipeline_source.jsx');
const MOD_PATH = path.resolve(ROOT, 'doc_pipeline_module.js');

const src = fs.readFileSync(SRC_PATH, 'utf8');
const mod = fs.readFileSync(MOD_PATH, 'utf8');

function sliceBetween(text, startAnchor, endAnchor) {
  const start = text.indexOf(startAnchor);
  expect(start, `start anchor: ${startAnchor}`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf(endAnchor, start + startAnchor.length);
  expect(end, `end anchor: ${endAnchor}`).toBeGreaterThan(start);
  return text.slice(start, end);
}

function loadCompiledPipelineFactory() {
  const win = {
    AlloModules: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  const ctx = vm.createContext({
    window: win,
    globalThis: win,
    self: win,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    Blob,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    AbortController,
    Promise,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    Error,
    Number,
    String,
    Boolean,
  });
  vm.runInContext(mod, ctx, { filename: 'doc_pipeline_module.js' });
  return { win, factory: win.AlloModules.createDocPipeline };
}

describe('Wave 10A — RemediationRunContext encapsulation', () => {
  let factory;

  beforeAll(() => {
    ({ factory } = loadCompiledPipelineFactory());
  });

  it('exposes RUN_CONTEXT_KEYS and lifecycle helpers as statics on createDocPipeline', () => {
    expect(typeof factory).toBe('function');
    expect(Array.isArray(factory.RUN_CONTEXT_KEYS)).toBe(true);
    expect(Object.isFrozen(factory.RUN_CONTEXT_KEYS)).toBe(true);
    expect(typeof factory.createRemediationRunContext).toBe('function');
    expect(typeof factory.resetRemediationRunContext).toBe('function');
    expect(typeof factory.snapshotRemediationRunContext).toBe('function');

    for (const key of [
      '__alloDetectedFolios',
      '__alloPageFurniture',
      '__alloFigureText',
      '__alloLegendReplacedTexts',
      '__alloImagePairingUncertain',
      '__alloOcrColumnReorders',
      '__alloOcrDupeCollapses',
      '__alloOcrVisionAlignments',
      '__alloStrippedEdgeLines',
      '__alloForceOcr',
      '__alloPayloadCuts',
      '__alloAuditStage',
      '__alloFontFallbackNotes',
      '__alloSourceLinkCount',
      '__alloSourceLinks',
      '__alloSourceFormFields',
      '__alloSourceTables',
      '__alloSourceTableGrids',
      '__lastGroundTruthCharCount',
      '__lastGroundTruthPageMap',
      '__lastGroundTruthDocKey',
      '__lastOcrTesseractText',
      '__lastOcrVisionText',
      '__lastOcrMethod',
      '__pdfPageCanvases',
      '__alloflowExtractedImages',
    ]) {
      expect(factory.RUN_CONTEXT_KEYS, `missing key ${key}`).toContain(key);
    }
  });

  it('isolates state across contexts and blocks prototype-pollution keys', () => {
    const ctxA = factory.createRemediationRunContext({ runId: 'run-a', docKey: 'doc-a' });
    const ctxB = factory.createRemediationRunContext({ runId: 'run-b', docKey: 'doc-b' });

    expect(ctxA.runId).toBe('run-a');
    expect(ctxB.runId).toBe('run-b');
    expect(Object.getPrototypeOf(ctxA.state)).toBeNull();
    expect(ctxA.get('__lastGroundTruthDocKey')).toBe('doc-a');
    expect(ctxB.get('__lastGroundTruthDocKey')).toBe('doc-b');

    ctxA.set('__alloDetectedFolios', ['Page 1', 'Page 2']);
    ctxA.set('__alloPageFurniture', { removed: ['Header'], numbers: ['1'] });
    ctxA.set('__proto__', { polluted: true });
    ctxA.set('constructor', 'bad');

    expect(ctxB.get('__alloDetectedFolios')).toEqual([]);
    expect(ctxB.get('__alloPageFurniture')).toBeNull();
    expect(({}).polluted).toBeUndefined();
    expect(ctxA.get('__proto__')).toBeUndefined();
    expect(ctxA.get('constructor')).toBeUndefined();
  });

  it('atomically clears all per-document keys on context + window while preserving preferences by default', () => {
    const fakeWin = {
      __pdfStyleSeed: 'editorial-serif',
      __pdfStylePreference: 'high-contrast',
      __pdfBrandMode: 'custom',
      __pdfBrandOverride: { primary: '#123456' },
      __alloDetectedFolios: ['p. 1', 'p. 2'],
      __alloPageFurniture: { removed: ['Running Head'], numbers: ['1', '2'] },
      __alloFigureText: [{ page: 1, text: 'Secret Chart Text' }],
      __alloLegendReplacedTexts: ['Legend A'],
      __alloImagePairingUncertain: { count: 2 },
      __alloOcrColumnReorders: [{ page: 1 }],
      __alloOcrDupeCollapses: [{ page: 1 }],
      __alloOcrVisionAlignments: [{ page: 1 }],
      __alloForceOcr: 'all',
      __alloPayloadCuts: { cutA: true },
      __alloAuditStage: 'auditing-chunk-3',
      __alloSourceLinkCount: 14,
      __alloSourceLinks: [{ url: 'https://example.edu' }],
      __alloSourceFormFields: { count: 3 },
      __alloFontFallbackNotes: [{ kind: 'fontkitUnavailable' }],
      __lastOcrTesseractText: 'Student Name Jane Doe SSN 123-45-6789',
      __lastOcrVisionText: 'Private vision text',
      __lastOcrMethod: 'tesseract+vision',
      __pdfPageCanvases: { 1: 'data:image/jpeg;base64,AAAA' },
      __alloflowExtractedImages: [{ id: 'img-1', dataUrl: 'data:image/png;base64,BBBB' }],
    };

    const ctx = factory.createRemediationRunContext({ runId: 'run-doc1', docKey: 'doc-1' });
    ctx.captureFromWindow(fakeWin);
    expect(ctx.get('__alloDetectedFolios')).toEqual(['p. 1', 'p. 2']);

    // Default reset: clears ALL per-document keys on both ctx and window, keeps preferences
    const summary = factory.resetRemediationRunContext(ctx, { window: fakeWin, docKey: 'doc-2' });
    expect(summary.preservedPrefs).toBe(true);
    expect(summary.docKey).toBe('doc-2');
    expect(summary.clearedCount).toBeGreaterThanOrEqual(factory.RUN_CONTEXT_KEYS.length);

    expect(fakeWin.__alloDetectedFolios).toEqual([]);
    expect(fakeWin.__alloPageFurniture).toBeNull();
    expect(fakeWin.__alloFigureText).toBeNull();
    expect(fakeWin.__alloLegendReplacedTexts).toEqual([]);
    expect(fakeWin.__alloImagePairingUncertain).toBeNull();
    expect(fakeWin.__alloOcrColumnReorders).toEqual([]);
    expect(fakeWin.__alloOcrDupeCollapses).toEqual([]);
    expect(fakeWin.__alloOcrVisionAlignments).toEqual([]);
    expect(fakeWin.__alloForceOcr).toBeNull();
    expect(fakeWin.__alloPayloadCuts).toBeNull();
    expect(fakeWin.__alloAuditStage).toBeNull();
    expect(fakeWin.__alloSourceLinkCount).toBe(0);
    expect(fakeWin.__alloSourceLinks).toBeNull();
    expect(fakeWin.__alloSourceFormFields).toBeNull();
    expect(fakeWin.__alloFontFallbackNotes).toEqual([]);
    expect(fakeWin.__lastOcrTesseractText).toBe('');
    expect(fakeWin.__lastOcrVisionText).toBe('');
    expect(fakeWin.__lastOcrMethod).toBeNull();
    expect(fakeWin.__pdfPageCanvases).toEqual({});
    expect(fakeWin.__alloflowExtractedImages).toEqual([]);
    expect(fakeWin.__lastGroundTruthDocKey).toBe('doc-2');

    // Context object was also cleared and does not share mutable arrays with fakeWin
    expect(ctx.get('__alloDetectedFolios')).toEqual([]);
    expect(ctx.get('__alloDetectedFolios')).not.toBe(fakeWin.__alloDetectedFolios);
    expect(ctx.get('__lastGroundTruthDocKey')).toBe('doc-2');

    // Session-level preferences survive when includePrefs is false/omitted
    expect(fakeWin.__pdfStyleSeed).toBe('editorial-serif');
    expect(fakeWin.__pdfStylePreference).toBe('high-contrast');
    expect(fakeWin.__pdfBrandMode).toBe('custom');
    expect(fakeWin.__pdfBrandOverride).toEqual({ primary: '#123456' });

    // preserveKeys keeps one-shot run-start flags when explicitly requested
    fakeWin.__alloForceOcr = 'all';
    fakeWin.__alloDetectedFolios = ['stale'];
    factory.resetRemediationRunContext(ctx, {
      window: fakeWin,
      preserveKeys: ['__alloForceOcr'],
    });
    expect(fakeWin.__alloForceOcr).toBe('all');
    expect(fakeWin.__alloDetectedFolios).toEqual([]);

    // includePrefs: true clears session preferences too
    const fullSummary = factory.resetRemediationRunContext(ctx, { window: fakeWin, includePrefs: true });
    expect(fullSummary.preservedPrefs).toBe(false);
    expect(fakeWin.__pdfStyleSeed).toBeNull();
    expect(fakeWin.__pdfStylePreference).toBeNull();
    expect(fakeWin.__pdfBrandMode).toBeNull();
    expect(fakeWin.__pdfBrandOverride).toBeNull();
  });

  it('produces JSON-safe diagnostic snapshots that scrub PII, raw OCR text, canvases, and huge HTML strings', () => {
    const ctx = factory.createRemediationRunContext({ runId: 'run-snap', docKey: 'doc-snap-hash' });
    const secretEmail = 'student.jane.doe@school.edu';
    const secretSsn = '123-45-6789';
    const hugeHtml = '<!DOCTYPE html><html><body><p>' + 'Confidential student essay '.repeat(30) + '</p></body></html>';

    ctx.set('__lastGroundTruthCharCount', 4200);
    ctx.set('__lastOcrMethod', 'tesseract+vision');
    ctx.set('__lastOcrTesseractText', `Student: ${secretEmail}, SSN: ${secretSsn}`);
    ctx.set('__lastGroundTruthPageMap', [{ pageNum: 1, text: `Private text ${secretEmail}` }]);
    ctx.set('__pdfPageCanvases', { 1: 'data:image/jpeg;base64,' + 'A'.repeat(2000) });
    ctx.set('__alloFigureText', [{ page: 1, text: 'Figure secret label' }]);
    ctx.set('__alloAuditStage', hugeHtml);
    ctx.set('customEmailField', `Contact ${secretEmail}`);
    ctx.set('__alloFontFallbackNotes', [
      {
        kind: 'unicodeFontUnavailable',
        stage: 'ocr-unicode-embed',
        script: 'arabic',
        fallback: 'Helvetica',
        message: 'Unicode font unavailable',
      },
    ]);

    const snap = ctx.snapshot();
    const serialized = JSON.stringify(snap);

    expect(snap.runId).toBe('run-snap');
    expect(snap.activeCount).toBeGreaterThanOrEqual(8);
    expect(snap.keys.__lastGroundTruthCharCount).toBe(4200);
    expect(snap.keys.__lastOcrMethod).toBe('tesseract+vision');
    expect(snap.keys.__lastOcrTesseractText).toEqual({
      redacted: true,
      type: 'string',
      length: `Student: ${secretEmail}, SSN: ${secretSsn}`.length,
    });
    expect(snap.keys.__lastGroundTruthPageMap).toEqual({ redacted: true, type: 'array', count: 1 });
    expect(snap.keys.__pdfPageCanvases).toEqual({ redacted: true, type: 'object', keyCount: 1 });
    expect(snap.keys.__alloAuditStage).toEqual({ redacted: true, type: 'string', length: hugeHtml.length });
    expect(snap.keys.customEmailField).toEqual({ redacted: true, type: 'string', length: `Contact ${secretEmail}`.length });
    expect(snap.keys.__alloFontFallbackNotes.count).toBe(1);
    expect(snap.keys.__alloFontFallbackNotes.notes[0].kind).toBe('unicodeFontUnavailable');

    // Zero raw PII, HTML, or base64 data-URLs anywhere in serialized snapshot
    expect(serialized).not.toContain(secretEmail);
    expect(serialized).not.toContain(secretSsn);
    expect(serialized).not.toContain('Confidential student essay');
    expect(serialized).not.toContain('data:image/jpeg');
    expect(serialized).not.toContain('Figure secret label');
  });

  it('wires _alloResetRemediationRunContext into fixAndVerifyPdf start-of-run reset block in both source and bundle', () => {
    for (const text of [src, mod]) {
      const resetBlock = sliceBetween(
        text,
        'Reset ground-truth state for this run via RemediationRunContext',
        'Force-OCR escape hatch'
      );
      expect(resetBlock).toContain('_alloCreateRemediationRunContext(');
      expect(resetBlock).toContain('_alloResetRemediationRunContext(_runContext');
      expect(resetBlock).toContain("preserveKeys: ['__alloForceOcr', '__alloPayloadCuts']");
      // Legacy pinned reset lines remain intact for backward compatibility
      expect(resetBlock).toContain('window.__lastOcrMethod = null;');
      expect(resetBlock).toContain('window.__pdfPageCanvases = {};');
    }
  });
});

describe('Wave 10A — First-party-first fontkit & font loaders + offline fallback disclosure', () => {
  it('lists the first-party fontkit asset URL before external CDNs at every fontkit loader call site', () => {
    const expectedFirstParty = 'https://alloflow-cdn.pages.dev/runtime_assets/document/fontkit-1.1.1/fontkit.umd.min.js';
    for (const text of [src, mod]) {
      const matches = [...text.matchAll(/_loadCdnScript\('fontkit',\s*\[([\s\S]*?)\]/g)];
      expect(matches.length).toBeGreaterThanOrEqual(2);
      for (const m of matches) {
        const urls = [...m[1].matchAll(/'([^']+)'/g)].map((u) => u[1]);
        expect(urls[0]).toBe(expectedFirstParty);
        const jsdelivrIdx = urls.findIndex((u) => u.includes('cdn.jsdelivr.net'));
        const unpkgIdx = urls.findIndex((u) => u.includes('unpkg.com'));
        expect(jsdelivrIdx).toBeGreaterThan(0);
        expect(unpkgIdx).toBeGreaterThan(jsdelivrIdx);
      }
    }
  });

  it('places first-party font candidates before external CDNs for Noto/CJK and Stage 7 substitute fonts, and rejects HTML fallback bytes', () => {
    const fontHelpers = sliceBetween(
      src,
      '// ── First-party-first font resilience helpers (Wave 10A) ─────────────────────',
      '// One verified PDF worker lease per loaded module'
    );
    const notoSection = sliceBetween(
      src,
      'const _ALLO_NOTO_URL =',
      'const _alloDetectScript ='
    );
    const stage7Sources = sliceBetween(
      src,
      'const _FONT_SOURCES = {',
      'const _fetchFontBytes ='
    );

    const sandbox = vm.createContext({ Uint8Array, Array, Object, String, Date, RegExp });
    vm.runInContext(
      `${fontHelpers}\n${notoSection}\n${stage7Sources}\n`
      + `this.looksLikeFont = _alloLooksLikeFontBytes;\n`
      + `this.notoUrls = _alloNotoFontCandidateUrls;\n`
      + `this.fontSources = _FONT_SOURCES;\n`,
      sandbox
    );

    // 1. Noto / CJK candidate ordering: relative vendor/fonts + alloflow-cdn BEFORE jsdelivr/fastly
    for (const [script, expectedFile] of [
      ['arabic', 'NotoSansArabic-Regular.ttf'],
      ['japanese', 'NotoSansJP-Regular.otf'],
      ['latinext', 'NotoSans-Regular.ttf'],
    ]) {
      const urls = sandbox.notoUrls(script, 'regular');
      expect(urls[0]).toBe(`vendor/fonts/noto/${expectedFile}`);
      expect(urls[1]).toBe(`https://alloflow-cdn.pages.dev/vendor/fonts/noto/${expectedFile}`);
      expect(urls.findIndex((u) => u.includes('cdn.jsdelivr.net'))).toBeGreaterThan(1);
      expect(urls.findIndex((u) => u.includes('fastly.jsdelivr.net'))).toBeGreaterThan(2);
    }

    // 2. Stage 7 substitute fonts ordering across all 4 families
    for (const [family, style, expectedFile] of [
      ['sans', 'reg', 'LiberationSans-Regular.ttf'],
      ['times', 'bold', 'Tinos_700Bold.ttf'],
      ['serif', 'italic', 'DejaVuSerif-Italic.ttf'],
      ['mono', 'italic', 'DejaVuSansMono-Oblique.ttf'],
    ]) {
      const urls = sandbox.fontSources[family].urls(style);
      expect(urls[0]).toBe(`vendor/fonts/substitutes/${expectedFile}`);
      expect(urls[1]).toBe(`https://alloflow-cdn.pages.dev/vendor/fonts/substitutes/${expectedFile}`);
      expect(urls.findIndex((u) => u.includes('cdn.jsdelivr.net'))).toBeGreaterThan(1);
      expect(urls.findIndex((u) => u.includes('unpkg.com'))).toBeGreaterThan(2);
    }

    // 3. Font-byte sniff guards against SPA 200 HTML fallback pages
    const validTtf = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0]);
    const validOtf = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0]);
    const htmlPage = new TextEncoder().encode('<!DOCTYPE html><html><body>Not found</body></html>');
    expect(sandbox.looksLikeFont(validTtf, 'font/ttf')).toBe(true);
    expect(sandbox.looksLikeFont(validOtf, 'font/otf')).toBe(true);
    expect(sandbox.looksLikeFont(htmlPage, 'text/html')).toBe(false);
    expect(sandbox.looksLikeFont(htmlPage, 'application/octet-stream')).toBe(false);
  });

  it('records explicit non-fatal fallback disclosure notes when fontkit, Noto Unicode, or Stage 7 fonts are blocked offline', async () => {
    const fontHelpers = sliceBetween(
      src,
      '// ── First-party-first font resilience helpers (Wave 10A) ─────────────────────',
      '// One verified PDF worker lease per loaded module'
    );
    const notoSection = sliceBetween(
      src,
      'const _ALLO_NOTO_URL =',
      'const _alloDetectScript ='
    );
    const unicodeLoaderBlock = sliceBetween(
      src,
      '    const _fontFallbackNotes = [];',
      '    // (2026-11-07) Noto Sans Hebrew has no ASCII digits'
    );
    const stage7FetchBlock = sliceBetween(
      src,
      '      const _FONT_SOURCES = {',
      '      // Collect candidate font dicts'
    );

    const attemptedScripts = [];
    const attemptedFetches = [];
    const fakeWin = {};

    // Case 1: fontkit blocked behind school firewall -> records fontkitUnavailable note (non-fatal)
    const sb1 = vm.createContext({
      window: fakeWin,
      AbortController,
      setTimeout,
      clearTimeout,
      Uint8Array,
      Set,
      Array,
      Object,
      String,
      Date,
      Error,
      Promise,
      warnLog() {},
      doc: { registerFontkit() {}, embedFont: async () => ({}) },
      _ocrDroppedChars: 0,
      _alloOcrIsPureSymbol: () => false,
      _loadCdnScript: async (label, urls) => {
        attemptedScripts.push({ label, urls });
        return false;
      },
      fetch: async (u) => {
        attemptedFetches.push(u);
        throw new Error('offline-blocked');
      },
    });
    vm.runInContext(
      `${fontHelpers}\n${notoSection}\n${unicodeLoaderBlock}\n${stage7FetchBlock}\n`
      + `this.ensureFontkit = _ensureFontkit;\n`
      + `this.getUnicodeFont = _getUnicodeFont;\n`
      + `this.fetchFontBytes = _fetchFontBytes;\n`
      + `this.notes = _fontFallbackNotes;\n`,
      sb1
    );

    expect(await sb1.getUnicodeFont('arabic')).toBeNull();
    expect(attemptedScripts[0].label).toBe('fontkit');
    expect(attemptedScripts[0].urls[0]).toBe(
      'https://alloflow-cdn.pages.dev/runtime_assets/document/fontkit-1.1.1/fontkit.umd.min.js'
    );
    expect(sb1.notes.some((n) => n.kind === 'fontkitUnavailable' && n.fallback === 'Helvetica')).toBe(true);
    expect(fakeWin.__alloFontFallbackNotes.some((n) => n.kind === 'fontkitUnavailable')).toBe(true);

    // Stage 7 substitute fetch blocked offline -> tries first-party URLs first, returns null, records disclosure
    expect(await sb1.fetchFontBytes('sans', 'reg')).toBeNull();
    expect(attemptedFetches[0]).toBe('vendor/fonts/substitutes/LiberationSans-Regular.ttf');
    expect(attemptedFetches[1]).toBe('https://alloflow-cdn.pages.dev/vendor/fonts/substitutes/LiberationSans-Regular.ttf');
    expect(sb1.notes.some((n) => n.kind === 'substituteFontUnavailable' && n.family === 'sans')).toBe(true);

    // Case 2: fontkit available, but Noto font mirrors all blocked / returning SPA HTML -> records unicodeFontUnavailable
    const fakeWin2 = { fontkit: { create() {} } };
    const notoAttempts = [];
    const sb2 = vm.createContext({
      window: fakeWin2,
      AbortController,
      setTimeout,
      clearTimeout,
      Uint8Array,
      Set,
      Array,
      Object,
      String,
      Date,
      Error,
      Promise,
      warnLog() {},
      doc: { registerFontkit() {}, embedFont: async () => ({}) },
      _ocrDroppedChars: 0,
      _alloOcrIsPureSymbol: () => false,
      _loadCdnScript: async () => true,
      fetch: async (u) => {
        notoAttempts.push(u);
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'text/html; charset=utf-8' },
          arrayBuffer: async () => new TextEncoder().encode('<!DOCTYPE html><html></html>').buffer,
        };
      },
    });
    vm.runInContext(
      `${fontHelpers}\n${notoSection}\n${unicodeLoaderBlock}\n`
      + `this.getUnicodeFont = _getUnicodeFont;\n`
      + `this.notes = _fontFallbackNotes;\n`,
      sb2
    );

    expect(await sb2.getUnicodeFont('arabic')).toBeNull();
    expect(notoAttempts[0]).toBe('vendor/fonts/noto/NotoSansArabic-Regular.ttf');
    expect(notoAttempts[1]).toBe('https://alloflow-cdn.pages.dev/vendor/fonts/noto/NotoSansArabic-Regular.ttf');
    expect(notoAttempts.length).toBe(4);
    expect(sb2.notes.some((n) => n.kind === 'unicodeFontUnavailable' && n.script === 'arabic' && n.fallback === 'Helvetica')).toBe(true);
    expect(fakeWin2.__alloFontFallbackNotes.some((n) => n.kind === 'unicodeFontUnavailable' && n.script === 'arabic')).toBe(true);

    // Verify createTaggedPdf surfaces fontFallbackNotes in self-check, roundTrip.warnings, and return payload
    expect(src).toContain("_addCheck('Fonts', 'Unicode / fallback font loading', 'warn'");
    expect(src).toContain('fontFallbackNotes: _fontFallbackNotes.slice()');
  });
});
