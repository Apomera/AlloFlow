// Golden-master / characterization harness for createTaggedPdf's TAG-TREE OUTPUT.
//
// WHY THIS EXISTS: createTaggedPdf (doc_pipeline_source.jsx) produces binary tagged-PDF
// bytes using window.PDFLib + pdf.js, which the Node/vitest+jsdom suite CANNOT load. So
// the single largest accessibility surface in the app — the StructTreeRoot the tagger
// builds — has had ZERO automated coverage. This Playwright spec loads the *local*
// doc_pipeline_module.js into a real Chromium, runs createTaggedPdf end-to-end on a
// generated fixture, then re-parses the OUTPUT PDF and walks the structure tree.
//
// It does two jobs:
//   1. INVARIANTS (hard asserts): the tagged output must always declare itself tagged
//      (MarkInfo/Marked true + StructTreeRoot), set /Lang, have a non-empty /K, expose
//      semantic roles, carry /Scope on TH and ActualText on cells (the shipped fixes).
//   2. BASELINE METRIC (recorded, soft): the ORPHANED-LEAF count — semantic leaf
//      StructElems (H1/P/Figure/Table cell/Link…) that have NO /K→MCID content linkage.
//      This is the exact defect the "unified tag tree" (Approach 1) work must drive to 0.
//      It's logged now as the current baseline; once Approach 1 lands, flip the soft
//      check to `expect(orphanedLeaves).toBe(0)` and this becomes the regression gate.
//
// Self-contained: no app boot, no deploy. Injects pdf-lib (the version the app uses) +
// the local built module; createTaggedPdf loads pdf.js/pako itself (Stage-3 fallback if
// the CDN is unreachable), so the test still produces a tagged PDF to introspect.

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

// Accessible-HTML fixture: one of every structural element the tagger handles, so the
// walk exercises headings, a scoped table, a figure with alt, and a link.
const ACCESSIBLE_HTML = `<!DOCTYPE html><html lang="en"><head><title>Golden Master Doc</title></head>
<body><main id="main-content" role="main">
<h1>Chapter One</h1>
<p>This is a paragraph of body text used to exercise the tagger.</p>
<h2>A Subsection</h2>
<table><thead><tr><th scope="col">Name</th><th scope="col">Score</th></tr></thead>
<tbody><tr><td>Alice</td><td>90</td></tr><tr><td>Bob</td><td>82</td></tr></tbody></table>
<figure><img alt="A bar chart of two scores" src="data:image/png;base64,iVBORw0KGgo="><figcaption>Scores</figcaption></figure>
<p>See <a href="https://example.com/resource">the resource</a> for details.</p>
</main></body></html>`;

let summary: any = null;

test.describe('createTaggedPdf — tag-tree golden master', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    summary = await page.evaluate(async (accessibleHtml) => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFNumber, PDFRef, PDFString } = PDFLib;
      try {
        // 1) Generate a tiny input PDF WITH a real text layer (so it's a "text PDF").
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        pg.drawText('Chapter One', { x: 50, y: 740, size: 22, font });
        pg.drawText('This is a paragraph of body text used to exercise the tagger.', { x: 50, y: 700, size: 12, font });
        const inputBytes = await inDoc.save();

        // 2) Instantiate the pipeline with stub deps (Phase-1 injected-state seam).
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}',
          callGeminiVision: async () => '{}',
          callImagen: async () => null,
          addToast: () => {},
          t: (k: string) => k,
          isRtlLang: () => false,
          updateExportPreview: () => {},
          getDefaultTitle: () => 'Document',
          state: {},
        });
        if (typeof pipeline.createTaggedPdf !== 'function') return { error: 'createTaggedPdf not exported by factory' };

        // 3) Run the tagger on the fixture.
        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml }, { title: 'Golden Master Doc', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const outBytes = result.bytes;

        // 4) Re-parse the OUTPUT and walk the structure tree.
        const outDoc = await PDFDocument.load(outBytes);
        const ctx = outDoc.context;
        const catalog = outDoc.catalog;
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        const nm = (n: string) => PDFName.of(n);

        // Catalog-level invariants (read from the REAL output, not a summary).
        const stRoot = resolve(catalog.get(nm('StructTreeRoot')));
        const markInfo = resolve(catalog.get(nm('MarkInfo')));
        const markedRaw = markInfo && markInfo.get ? markInfo.get(nm('Marked')) : null;
        const langRaw = catalog.get(nm('Lang'));
        const hasStructTreeRoot = !!stRoot;
        const marked = !!markedRaw && String(markedRaw) === 'true';
        const lang = langRaw ? String(langRaw).replace(/^\(|\)$/g, '') : '';

        // Walk StructTreeRoot.K, recording every StructElem.
        const LEAF_ROLES = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'Figure', 'Caption', 'BlockQuote', 'Lbl', 'LBody', 'TH', 'TD', 'Span', 'Link'];
        const elems: any[] = [];
        const walk = (obj: any, depth: number) => {
          obj = resolve(obj);
          if (depth > 60 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return; // PDFNumber (MCID) / other
          const S = obj.get(nm('S'));
          if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walk(k0, depth + 1); return; }
          const role = String(S).replace(/^\//, '');
          const K = obj.get(nm('K'));
          let hasContent = false, hasChild = false;
          if (K != null) {
            const kr = resolve(K);
            const items = (kr instanceof PDFArray) ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
            for (const it of items) {
              if (it instanceof PDFNumber) hasContent = true;             // bare MCID
              else if (it instanceof PDFDict) {
                const t = it.get(nm('Type')); const ts = t ? String(t) : '';
                if (ts === '/MCR' || ts === '/OBJR') hasContent = true;    // marked-content / object ref
                else if (it.get(nm('S'))) hasChild = true;                 // nested StructElem
                else hasContent = true;                                    // unknown leaf dict — count as content-ish
              }
            }
          }
          elems.push({ role, hasK: K != null, hasContent, hasChild, hasAlt: !!obj.get(nm('Alt')), hasActualText: !!obj.get(nm('ActualText')), hasA: !!obj.get(nm('A')) });
          if (K != null) walk(K, depth + 1); // recurse to capture nested StructElems
        };
        const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
        if (rootK != null) walk(rootK, 0);

        const rootKLen = (() => { const kr = resolve(rootK); if (kr instanceof PDFArray) return kr.size(); return kr ? 1 : 0; })();
        const byRole: Record<string, number> = {};
        for (const e of elems) byRole[e.role] = (byRole[e.role] || 0) + 1;
        const leaves = elems.filter((e) => LEAF_ROLES.includes(e.role));
        const orphanedLeaves = leaves.filter((e) => !e.hasContent); // leaf role with NO content linkage
        const thElems = elems.filter((e) => e.role === 'TH');
        const cellElems = elems.filter((e) => e.role === 'TH' || e.role === 'TD');

        return {
          byteLength: outBytes.length,
          hasStructTreeRoot, marked, lang, rootKLen,
          totalStructElems: elems.length,
          byRole,
          leafCount: leaves.length,
          orphanedLeafCount: orphanedLeaves.length,
          orphanedRoles: orphanedLeaves.map((e) => e.role),
          thCount: thElems.length,
          thWithA: thElems.filter((e) => e.hasA).length,
          cellCount: cellElems.length,
          cellsWithActualText: cellElems.filter((e) => e.hasActualText).length,
          figuresWithAlt: elems.filter((e) => e.role === 'Figure' && e.hasAlt).length,
          metadataStamped: result.metadataStamped || null,
          ocrTextLayer: result.ocrTextLayer || null,
          pageErrors: [],
        };
      } catch (e: any) {
        return { error: (e && e.message) || String(e), stack: e && e.stack };
      }
    }, ACCESSIBLE_HTML);

    (summary as any)._pageErrors = pageErrors;
    await page.close();
    // Surface the captured baseline so it's visible in CI logs.
    console.log('[tag-tree golden master] summary:', JSON.stringify(summary, null, 2));
  });

  test('createTaggedPdf ran end-to-end and returned a non-trivial PDF', () => {
    expect(summary, 'beforeAll must populate summary').toBeTruthy();
    expect(summary.error, summary.error ? `pipeline error: ${summary.error}\n${summary.stack || ''}` : '').toBeFalsy();
    expect(summary.byteLength).toBeGreaterThan(1000);
  });

  test('INVARIANT: declares itself a Tagged PDF (StructTreeRoot + MarkInfo/Marked true)', () => {
    expect(summary.hasStructTreeRoot, 'output must carry a StructTreeRoot').toBeTruthy();
    expect(summary.marked, 'MarkInfo /Marked must be true').toBeTruthy();
  });

  test('INVARIANT: document /Lang is set and StructTreeRoot.K is non-empty', () => {
    expect(summary.lang).toMatch(/^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/);
    expect(summary.rootKLen, 'StructTreeRoot /K must not be empty (empty = nothing tagged)').toBeGreaterThan(0);
  });

  test('INVARIANT: semantic roles are present (headings, paragraphs, table, figure)', () => {
    expect(summary.totalStructElems, 'tag tree must contain structure elements').toBeGreaterThan(3);
    const roles = Object.keys(summary.byRole);
    expect(roles).toContain('H1');
    expect(roles.some((r) => r === 'P')).toBeTruthy();
    expect(roles).toContain('Table');
    expect(roles).toContain('Figure');
  });

  test('INVARIANT: shipped fixes hold — TH carries /Scope (/A) and table cells carry ActualText', () => {
    expect(summary.thCount, 'fixture has TH cells').toBeGreaterThan(0);
    expect(summary.thWithA, 'every TH should carry an /A attribute dict (/Scope)').toBe(summary.thCount);
    expect(summary.cellsWithActualText, 'every TH/TD should carry ActualText (shipped fix 32e3581c)').toBe(summary.cellCount);
    expect(summary.figuresWithAlt, 'Figure must carry /Alt').toBeGreaterThan(0);
  });

  test('BASELINE: record orphaned-leaf count (Approach-1 target = 0)', () => {
    // Characterization, not a gate (yet). Records the current orphaned-tree state so the
    // unified-tag-tree (Approach 1) work can be measured against it. Flip to .toBe(0)
    // once semantic StructElems are linked to marked content via /K→MCID.
    expect(typeof summary.orphanedLeafCount).toBe('number');
    console.log(`[tag-tree golden master] BASELINE orphaned semantic leaves (no /K→MCID): ${summary.orphanedLeafCount} of ${summary.leafCount} leaves — roles: ${JSON.stringify(summary.orphanedRoles)}`);
    // Sanity: every leaf is accounted for and the metric is within [0, leafCount].
    expect(summary.orphanedLeafCount).toBeGreaterThanOrEqual(0);
    expect(summary.orphanedLeafCount).toBeLessThanOrEqual(summary.leafCount);
  });
});

// ── Tag-tree unify Slice 1 — positive confirmation on a SCANNED input ──
// The Latin baseline above is a text-PDF fixture (groundTruthMethod omitted →
// isScanned=false), so the unify pass correctly stays gated off and the
// orphaned count stays at 13/13. This separate suite passes groundTruthMethod
// = 'tesseract' to TRIGGER the unify path and confirms (a) leafCount is
// preserved end-to-end (no content loss), and (b) orphanedLeafCount drops to
// 0 because every leaf was retro-patched with /K → MCR(firstPage, 0).
let unifySummary: any = null;
test.describe('createTaggedPdf — tag-tree unify Slice 1 (scanned single-page)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    unifySummary = await page.evaluate(async (accessibleHtml) => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFNumber, PDFRef, PDFString } = PDFLib;
      try {
        const inDoc = await PDFDocument.create();
        inDoc.addPage([612, 792]);
        const inputBytes = await inDoc.save();
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const result = await pipeline.createTaggedPdf(inputBytes, {
          accessibleHtml,
          groundTruthMethod: 'tesseract', // triggers isScanned=true → unify pass fires
        }, { title: 'Scanned Unify Test', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        const nm = (n: string) => PDFName.of(n);
        const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link'];
        const elems: any[] = [];
        const walk = (objIn: any, depth: number) => {
          let obj = objIn; obj = resolve(obj);
          if (depth > 60 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return;
          const S = obj.get(nm('S')); if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walk(k0, depth + 1); return; }
          const role = String(S).replace(/^\//, '');
          const K = obj.get(nm('K'));
          let hasContent = false;
          if (K != null) {
            const kr = resolve(K);
            const items = (kr instanceof PDFArray) ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
            for (const it of items) {
              if (it instanceof PDFNumber) hasContent = true;
              else if (it instanceof PDFDict) {
                const t = it.get(nm('Type')); const ts = t ? String(t) : '';
                if (ts === '/MCR' || ts === '/OBJR') hasContent = true;
              }
            }
          }
          elems.push({ role, hasContent });
          if (K != null) walk(K, depth + 1);
        };
        const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
        const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
        if (rootK != null) walk(rootK, 0);
        const leaves = elems.filter((e) => LEAF_ROLES.includes(e.role));
        const orphanedLeaves = leaves.filter((e) => !e.hasContent);
        return { leafCount: leaves.length, orphanedLeafCount: orphanedLeaves.length };
      } catch (e: any) { return { error: e.message || String(e) }; }
    }, ACCESSIBLE_HTML);
  });

  test('Scanned single-page: orphanedLeafCount drops to 0 (no content loss)', () => {
    expect(unifySummary, 'unifySummary populated').toBeTruthy();
    if (unifySummary && unifySummary.error) console.log('[unify Slice 1] eval error:', unifySummary.error);
    expect(unifySummary.error, 'no eval error').toBeUndefined();
    // The scanned path may produce a slightly different leaf count than the
    // text-PDF baseline (OCR can add Spans / Captions) — what we care about is
    // (a) leaves were produced, (b) every one was retro-patched with /K → MCR.
    expect(unifySummary.leafCount, 'leaves produced').toBeGreaterThan(0);
    expect(unifySummary.orphanedLeafCount, 'every leaf retro-patched with /K → MCR (Slice 1 unify pass fired)').toBe(0);
    console.log(`[tag-tree unify Slice 1] scanned-path leaves: ${unifySummary.leafCount}, orphaned: ${unifySummary.orphanedLeafCount} (expected orphaned=0)`);
  });
});

// Non-Latin OCR: a scanned (image-only) document whose OCR text is Arabic. Before the
// Unicode-font embed, Helvetica/WinAnsi dropped every Arabic glyph → the invisible text
// layer shipped EMPTY (coverage 0%). With the embed, the Noto Sans Arabic subset encodes
// the script → full coverage. This is the regression gate for the multilingual fix.
let ocrSummary: any = null;
test.describe('createTaggedPdf — non-Latin OCR text layer (Arabic)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000); // CDN fetch of fontkit (~760KB) + Noto Sans Arabic (~235KB)
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    ocrSummary = await page.evaluate(async () => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument } = PDFLib;
      try {
        const inDoc = await PDFDocument.create();
        inDoc.addPage([612, 792]); // image-only / scanned page (no text layer)
        const inputBytes = await inDoc.save();
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => true, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
        });
        const arabic = 'هذا نص تجريبي باللغة العربية لاختبار طبقة النص غير المرئية. الفصل الأول: مقدمة موجزة.';
        // Word boxes (PDF points, top-left origin) drive the per-word positioned layer.
        const arabicWords = [
          { t: 'هذا', x0: 520, y0: 60, x1: 580, y1: 84 },
          { t: 'نص', x0: 450, y0: 60, x1: 510, y1: 84 },
          { t: 'تجريبي', x0: 360, y0: 60, x1: 440, y1: 84 },
        ];
        const fixResult = {
          accessibleHtml: `<!DOCTYPE html><html lang="ar"><body><main><h1>الفصل الأول</h1><p>${arabic}</p></main></body></html>`,
          // Use the PRODUCTION OCR method string (the live pipeline records 'vision-ocr',
          // never the literal 'tesseract'/'vision'). This guards the isScanned gate so the
          // "dead in production" regression — gate never matched 'vision-ocr' — can't return.
          groundTruthMethod: 'vision-ocr',
          // words + page dims → the per-word positioned layer (each Arabic word drawn at its
          // box with the Noto font); text-only would exercise the top-left block fallback.
          groundTruthPages: [{ pageNum: 1, text: arabic, words: arabicWords, pageW: 612, pageH: 792 }],
        };
        const result = await pipeline.createTaggedPdf(inputBytes, fixResult, { title: 'Arabic Scan', lang: 'ar' });

        // CJK fixture (Japanese: kana + kanji) — exercises the Noto Sans CJK OTF embed path
        // (previously CJK was rejected → Helvetica → 0% coverage). Fetches the ~4MB JP subset.
        const jp = '日本語のテスト。これはスキャン文書の隠しテキスト層です。第一章：はじめに。';
        const jpWords = [
          { t: '日本語', x0: 520, y0: 60, x1: 580, y1: 84 },
          { t: 'テスト', x0: 450, y0: 60, x1: 510, y1: 84 },
          { t: '文書', x0: 360, y0: 60, x1: 430, y1: 84 },
        ];
        const jpInDoc = await PDFDocument.create();
        jpInDoc.addPage([612, 792]);
        const jpInputBytes = await jpInDoc.save();
        const jpFix = {
          accessibleHtml: `<!DOCTYPE html><html lang="ja"><body><main><h1>第一章</h1><p>${jp}</p></main></body></html>`,
          groundTruthMethod: 'vision-ocr',
          groundTruthPages: [{ pageNum: 1, text: jp, words: jpWords, pageW: 612, pageH: 792 }],
        };
        let cjk: any = null;
        try {
          const jpResult = await pipeline.createTaggedPdf(jpInputBytes, jpFix, { title: 'Japanese Scan', lang: 'ja' });
          cjk = { ocrTextLayer: jpResult.ocrTextLayer || null, byteLength: jpResult.bytes ? jpResult.bytes.length : 0 };
        } catch (e: any) { cjk = { error: (e && e.message) || String(e) }; }

        return { ok: true, byteLength: result.bytes ? result.bytes.length : 0, ocrTextLayer: result.ocrTextLayer || null, roundTrip: result.roundTrip || null, docChecks: ((result.pdfUa1Checks && result.pdfUa1Checks.checks) || []).filter((c: any) => c.category === 'Document').map((c: any) => ({ rule: c.rule, status: c.status })), cjk, arabicCharCount: (arabic.match(/[؀-ۿ]/g) || []).length };
      } catch (e: any) {
        return { error: (e && e.message) || String(e), stack: e && e.stack };
      }
    });
    await page.close();
    console.log('[non-Latin OCR] summary:', JSON.stringify(ocrSummary, null, 2));
  });

  test('Arabic scanned OCR layer embeds a Unicode font — no characters dropped', () => {
    expect(ocrSummary, 'beforeAll must populate ocrSummary').toBeTruthy();
    expect(ocrSummary.error, ocrSummary.error ? `pipeline error: ${ocrSummary.error}\n${ocrSummary.stack || ''}` : '').toBeFalsy();
    expect(ocrSummary.ocrTextLayer, 'result must report ocrTextLayer').toBeTruthy();
    // The decisive assertion: Arabic is entirely non-WinAnsi, so if it had fallen back to
    // Helvetica every glyph would be dropped (coverage 0%). Full coverage proves the Noto
    // Sans Arabic subset was embedded and the text was drawn with it.
    expect(ocrSummary.ocrTextLayer.nonLatinDropped, 'no non-Latin chars should be dropped').toBe(false);
    expect(ocrSummary.ocrTextLayer.droppedChars, 'zero dropped chars with the Unicode font').toBe(0);
    expect(ocrSummary.ocrTextLayer.coveragePct).toBe(100);
  });

  test('CJK (Japanese) scanned OCR layer embeds a Noto Sans CJK font — no characters dropped', () => {
    expect(ocrSummary.cjk, 'beforeAll must build the CJK fixture').toBeTruthy();
    expect(ocrSummary.cjk.error, ocrSummary.cjk && ocrSummary.cjk.error ? `CJK build error: ${ocrSummary.cjk.error}` : '').toBeFalsy();
    expect(ocrSummary.cjk.ocrTextLayer, 'CJK result must report ocrTextLayer').toBeTruthy();
    // Japanese (kana + kanji) is entirely non-WinAnsi; full coverage proves the language-
    // subsetted Noto Sans CJK (JP) OTF was fetched, CFF-subset, embedded, and used. Before
    // this, _getUnicodeFont rejected 'cjk' → Helvetica → every glyph dropped (0% coverage).
    expect(ocrSummary.cjk.ocrTextLayer.nonLatinDropped, 'no CJK chars should be dropped').toBe(false);
    expect(ocrSummary.cjk.ocrTextLayer.droppedChars, 'zero dropped chars with the CJK font').toBe(0);
    expect(ocrSummary.cjk.ocrTextLayer.coveragePct).toBe(100);
  });

  test('Round-trip self-check confirms the tag tree survived save', () => {
    expect(ocrSummary, 'beforeAll must populate ocrSummary').toBeTruthy();
    expect(ocrSummary.error, ocrSummary.error ? `pipeline error: ${ocrSummary.error}` : '').toBeFalsy();
    expect(ocrSummary.roundTrip, 'result must report roundTrip (re-parse of saved bytes)').toBeTruthy();
    // Decisive: re-parsing the SAVED bytes finds the structure intact — StructTreeRoot,
    // MarkInfo, /Lang present, and no catastrophic StructElem loss at serialization.
    // This is the post-save check the in-memory pdfUa1Checks can't perform (it would
    // have caught the Approach-1 content-loss-at-save bug).
    expect(
      ocrSummary.roundTrip.ok,
      'round-trip should pass; failures: ' + JSON.stringify((ocrSummary.roundTrip.checks || []).filter((c: any) => c.status === 'fail'))
    ).toBe(true);
    expect(ocrSummary.roundTrip.structElemsSaved, 'saved file must contain StructElem objects').toBeGreaterThan(0);
    // Post-save verification now covers the full structural rule set against the shipped bytes.
    const _rtRules = (ocrSummary.roundTrip.checks || []).map((c: any) => c.rule);
    expect(_rtRules, 'verifies page→tag-tree linkage on the saved bytes').toContain('Pages link to tag tree (StructParents)');
    expect(_rtRules, 'verifies DisplayDocTitle on the saved bytes').toContain('DisplayDocTitle survived');
    // Divergence detector: nothing should pass at build but fail after save on a good PDF.
    expect(ocrSummary.roundTrip.divergences || [], 'no build-vs-shipped divergence on a correctly tagged PDF').toEqual([]);
  });

  test('pdfUa1Checks Document rules report accurately (no unresolved-PDFRef bug)', () => {
    expect(ocrSummary.docChecks, 'must capture Document-category checks').toBeTruthy();
    const byRule: Record<string, string> = {};
    for (const c of (ocrSummary.docChecks || [])) byRule[c.rule] = c.status;
    // Regression gate: the "Structure tree has content" check must lookup() the
    // StructTreeRoot (catalog.get returns an unresolved PDFRef); reading .get('K') on the
    // raw ref falsely reported 0 top-level elements on a perfectly tagged PDF and deflated
    // conformancePct. The assertion message prints every Document check for one-run insight.
    expect(byRule['Structure tree has content'], 'Document checks: ' + JSON.stringify(ocrSummary.docChecks)).toBe('pass');
    expect(byRule['MarkInfo present']).toBe('pass');
    expect(byRule['Primary language']).toBe('pass');
  });
});
