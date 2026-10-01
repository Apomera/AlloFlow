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

// ── Per-leaf MCID experiment (b0d24ae3 rebuilt, 2026-07-01) ──
// The construction the reverted b0d24ae3 attempt died for, rebuilt WITHOUT its two
// un-exonerated moves (early getPages(), build-time /K) behind
// fixResult._experimentPerLeafScanned. The Node harness
// (dev-tools/debug/tag_tree_live_harness.cjs) verified it at object AND
// content-stream level (zero loss; every MCR has a matching BDC; artifact split
// intact; no multi-claimed MCIDs). This block is the browser-side gate for the
// eventual default-ON flip: every text leaf must carry its OWN MCID (per-leaf
// granularity, not the shared-MCID-0 degeneracy), no MCID may be claimed by two
// elements, and nothing may be lost at save.
let perLeafScanSummary: any = null;
test.describe('createTaggedPdf — per-leaf MCID experiment (scanned)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    perLeafScanSummary = await page.evaluate(async (accessibleHtml) => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber, PDFRef } = PDFLib;
      try {
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        pg.drawRectangle({ x: 40, y: 40, width: 532, height: 712, borderWidth: 1 });
        const inputBytes = await inDoc.save({ useObjectStreams: false });
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const result = await pipeline.createTaggedPdf(inputBytes, {
          accessibleHtml,
          groundTruthMethod: 'tesseract',
          groundTruthPages: [{ pageNum: 1, text: 'Chapter One\nThis is a paragraph of body text used to exercise the tagger.\nA Subsection\nName Score Alice 90 Bob 82' }],
          _experimentPerLeafScanned: true,
        }, { title: 'Per-Leaf Experiment', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        const nm = (n: string) => PDFName.of(n);
        const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Formula','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link','Note'];
        // Walk: per-leaf orphan status + the (pageRef, MCID) claims for multi-claim detection.
        let leafCount = 0, orphanedLeafCount = 0;
        const mcidClaims: Record<string, number> = {};
        const mcids = new Set<number>();
        const walk = (objIn: any, depth: number) => {
          let obj = resolve(objIn);
          if (depth > 80 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return;
          const S = obj.get(nm('S'));
          if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walk(k0, depth + 1); return; }
          const role = String(S).replace(/^\//, '');
          const K = obj.get(nm('K'));
          let hasContent = false;
          if (K != null) {
            const kr = resolve(K);
            const items = kr instanceof PDFArray ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
            for (const it of items) {
              if (it instanceof PDFNumber) hasContent = true;
              else if (it instanceof PDFDict) {
                const t = it.get(nm('Type')); const ts = t ? String(t) : '';
                if (ts === '/MCR' || ts === '/OBJR') {
                  hasContent = true;
                  if (ts === '/MCR') {
                    const pgRef = it.get(nm('Pg')); const mc = it.get(nm('MCID'));
                    const key = String(pgRef) + ':' + String(mc);
                    mcidClaims[key] = (mcidClaims[key] || 0) + 1;
                    mcids.add(Number(String(mc)));
                  }
                }
              }
            }
          }
          if (LEAF_ROLES.includes(role)) { leafCount++; if (!hasContent) orphanedLeafCount++; }
          if (K != null) walk(K, depth + 1);
        };
        const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
        if (stRoot && stRoot.get) walk(stRoot.get(nm('K')), 0);
        const multiClaimed = Object.values(mcidClaims).filter((c) => c > 1).length;
        // MCR→BDC verification (2026-07-01): "hasContent" above only proves an MCR EXISTS —
        // not that the marked-content sequence it references exists in the page stream. A
        // /K → MCR(page, MCID n) with no matching "<</MCID n>> BDC" is fake linkage (the
        // exact blind spot the Node harness + app round-trip now check). Decode the saved
        // pages' streams (pdf-lib's own decodePDFRawStream handles Flate) and verify every
        // claimed (page, MCID) pair appears in real content.
        const pagesOut = outDoc.getPages();
        const pageIdxByRef: Record<string, number> = {};
        pagesOut.forEach((p: any, i: number) => { pageIdxByRef[p.ref.toString()] = i; });
        const pageBodies = pagesOut.map((pg: any) => {
          let body = '';
          try {
            const cts = pg.node.get(nm('Contents'));
            const refs: any[] = [];
            if (cts && typeof cts.size === 'function') { for (let i = 0; i < cts.size(); i++) refs.push(cts.get(i)); }
            else if (cts) refs.push(cts);
            for (const r of refs) {
              const s: any = ctx.lookup(r);
              if (!s) continue;
              let bts: any = null;
              const filt = s.dict && s.dict.get && s.dict.get(nm('Filter'));
              try { bts = (filt && (PDFLib as any).decodePDFRawStream) ? (PDFLib as any).decodePDFRawStream(s).decode() : (s.getContents ? s.getContents() : s.contents); } catch (_) { bts = null; }
              if (bts) { let sb = ''; for (let bi = 0; bi < bts.length; bi++) sb += String.fromCharCode(bts[bi]); body += sb + '\n'; }
            }
          } catch (_) {}
          return body;
        });
        let mcrUnbacked = 0;
        for (const key of Object.keys(mcidClaims)) {
          const li = key.lastIndexOf(':');
          const pref = key.slice(0, li);
          const mc = Number(key.slice(li + 1));
          const pi = pageIdxByRef[pref];
          const body = (pi !== undefined) ? pageBodies[pi] : '';
          if (!new RegExp('<<\\s*\\/MCID\\s+' + mc + '\\s*>>\\s*BDC').test(body)) mcrUnbacked++;
        }
        return { leafCount, orphanedLeafCount, distinctMcids: mcids.size, multiClaimed, mcrTotal: Object.keys(mcidClaims).length, mcrUnbacked };
      } catch (e: any) { return { error: e.message || String(e) }; }
    }, ACCESSIBLE_HTML);
  });

  test('Per-leaf: no orphans, per-leaf MCID granularity, no multi-claimed MCIDs', () => {
    expect(perLeafScanSummary, 'perLeafScanSummary populated').toBeTruthy();
    if (perLeafScanSummary && perLeafScanSummary.error) console.log('[per-leaf experiment] eval error:', perLeafScanSummary.error);
    expect(perLeafScanSummary.error, 'no eval error').toBeUndefined();
    expect(perLeafScanSummary.leafCount, 'leaves produced').toBeGreaterThan(0);
    expect(perLeafScanSummary.orphanedLeafCount, 'every leaf content-linked').toBe(0);
    // The shared-MCID-0 approach would yield distinctMcids === 1; per-leaf must exceed it decisively.
    expect(perLeafScanSummary.distinctMcids, 'per-leaf MCID granularity (not shared MCID 0)').toBeGreaterThan(3);
    expect(perLeafScanSummary.multiClaimed, 'no MCID claimed by more than one element (ISO 32000 §14.7.4)').toBe(0);
    expect(perLeafScanSummary.mcrTotal, 'MCRs were actually stream-checked').toBeGreaterThan(0);
    expect(perLeafScanSummary.mcrUnbacked, 'every MCR resolves to a real BDC in page content (no fake linkage)').toBe(0);
    console.log(`[per-leaf experiment] leaves: ${perLeafScanSummary.leafCount}, orphaned: ${perLeafScanSummary.orphanedLeafCount}, distinct MCIDs: ${perLeafScanSummary.distinctMcids}, multi-claimed: ${perLeafScanSummary.multiClaimed}, MCRs stream-verified: ${perLeafScanSummary.mcrTotal - perLeafScanSummary.mcrUnbacked}/${perLeafScanSummary.mcrTotal}`);
  });
});

// ── Tag-tree unify Slice 2 — multi-page scanned ──
// Slice 1 was gated to pages.length === 1. Slice 2 extends it to multi-page
// scanned PDFs via PROPORTIONAL distribution: leaves are assigned to pages in
// document order (first N/P leaves to page 0, next to page 1, etc). Each leaf
// gets /K → MCR(itsAssignedPage.ref, 0). HTML extraction processes pages in
// order so document-order ≈ page-order; this is degenerate but lets multi-page
// scanned docs pass PAC's "no orphaned" check without threading per-leaf page
// coordinates through _buildOutlineStructElems.
let unifyMultiSummary: any = null;
test.describe('createTaggedPdf — tag-tree unify Slice 2 (scanned multi-page)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    unifyMultiSummary = await page.evaluate(async (accessibleHtml) => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber, PDFRef } = PDFLib;
      try {
        // Build a 3-page input PDF (image-only — no text layer so isScanned would
        // normally be inferred at extraction time; we force isScanned via
        // groundTruthMethod below).
        const inDoc = await PDFDocument.create();
        inDoc.addPage([612, 792]);
        inDoc.addPage([612, 792]);
        inDoc.addPage([612, 792]);
        const inputBytes = await inDoc.save();
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const result = await pipeline.createTaggedPdf(inputBytes, {
          accessibleHtml,
          groundTruthMethod: 'tesseract', // triggers isScanned=true → unify pass
        }, { title: 'Multi-page Unify Test', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        const nm = (n: string) => PDFName.of(n);
        const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link'];
        const pageRefs: any[] = outDoc.getPages().map((p: any) => p.ref);
        const elems: any[] = [];
        const walk = (objIn: any, depth: number) => {
          let obj = resolve(objIn);
          if (depth > 60 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return;
          const S = obj.get(nm('S')); if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walk(k0, depth + 1); return; }
          const role = String(S).replace(/^\//, '');
          const K = obj.get(nm('K'));
          let hasContent = false; let mcrPageRef: any = null;
          if (K != null) {
            const kr = resolve(K);
            const items = (kr instanceof PDFArray) ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
            for (const it of items) {
              if (it instanceof PDFNumber) hasContent = true;
              else if (it instanceof PDFDict) {
                const t = it.get(nm('Type')); const ts = t ? String(t) : '';
                if (ts === '/MCR' || ts === '/OBJR') {
                  hasContent = true;
                  if (ts === '/MCR') mcrPageRef = it.get(nm('Pg'));
                }
              }
            }
          }
          elems.push({ role, hasContent, mcrPageRef: mcrPageRef ? String(mcrPageRef) : null });
          if (K != null) walk(K, depth + 1);
        };
        const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
        const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
        if (rootK != null) walk(rootK, 0);
        const leaves = elems.filter((e) => LEAF_ROLES.includes(e.role));
        const orphaned = leaves.filter((e) => !e.hasContent);
        // Page distribution: count which leaves reference which page
        const pageRefStrs = pageRefs.map((r: any) => String(r));
        const distribution: Record<string, number> = {};
        for (const l of leaves) {
          if (l.mcrPageRef) {
            const pageIdx = pageRefStrs.indexOf(l.mcrPageRef);
            const key = pageIdx >= 0 ? 'page_' + pageIdx : 'unknown';
            distribution[key] = (distribution[key] || 0) + 1;
          }
        }
        return {
          pageCount: outDoc.getPages().length,
          leafCount: leaves.length,
          orphanedLeafCount: orphaned.length,
          distribution,
        };
      } catch (e: any) { return { error: e.message || String(e) }; }
    }, ACCESSIBLE_HTML);
  });

  test('Scanned multi-page: orphanedLeafCount=0 AND leaves distributed across pages', () => {
    expect(unifyMultiSummary, 'unifyMultiSummary populated').toBeTruthy();
    if (unifyMultiSummary && unifyMultiSummary.error) console.log('[unify Slice 2] eval error:', unifyMultiSummary.error);
    expect(unifyMultiSummary.error, 'no eval error').toBeUndefined();
    expect(unifyMultiSummary.pageCount, '3-page input survives').toBe(3);
    expect(unifyMultiSummary.leafCount, 'leaves produced').toBeGreaterThan(0);
    expect(unifyMultiSummary.orphanedLeafCount, 'every leaf retro-patched').toBe(0);
    // Distribution sanity: leaves should reference >1 page (proves the multi-page
    // path actually distributed; if everything went to page 0, the heuristic
    // collapsed and we'd have shipped a Slice-1-disguised-as-Slice-2 bug).
    const pagesUsed = Object.keys(unifyMultiSummary.distribution).filter((k) => k.startsWith('page_')).length;
    expect(pagesUsed, 'leaves distributed across more than one page (proportional heuristic actually distributed)').toBeGreaterThan(1);
    console.log(`[tag-tree unify Slice 2] pages: ${unifyMultiSummary.pageCount}, leaves: ${unifyMultiSummary.leafCount}, orphaned: ${unifyMultiSummary.orphanedLeafCount}, distribution: ${JSON.stringify(unifyMultiSummary.distribution)}`);
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
    // Reading-order calibration pin (2026-07-13): a correctly tagged single-flow doc
    // must re-extract in near-source order. This is the clean side of the fail-tier
    // calibration — the <50% catastrophic tier folds into roundTrip.ok, so a false
    // fire here would break this assertion first.
    const _rtDiff = (ocrSummary.roundTrip as any).textDiff;
    if (_rtDiff && typeof _rtDiff.readingOrderRatio === 'number') {
      expect(_rtDiff.readingOrderRatio, 'clean fixture must re-extract in near-source order (calibration floor)').toBeGreaterThanOrEqual(90);
    }
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

// ── Stage 3b + UA-claim gate (2026-06-09) ──
// (a) Link annotations in the SOURCE PDF must be wrapped into the structure
//     tree (Link StructElem + OBJR + /StructParent) — previously they stayed
//     un-referenced, so tagging a link-bearing PDF INTRODUCED an "untagged
//     annotation" PDF/UA failure class in PAC/Acrobat.
// (b) The pdfuaid:part=1 XMP claim is now WITHHELD on the text-layer path
//     (the ActualText-only semantic tree would refute it) and still DECLARED
//     on the scanned/unify path where every leaf gets /K→MCR linkage.
let linkGateSummary: any = null;
test.describe('createTaggedPdf — link-annot tagging + UA-claim gate', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    linkGateSummary = await page.evaluate(async () => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFString } = PDFLib;
      try {
        // Fixture: one page with a text layer AND one real Link annotation.
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        pg.drawText('A page with a hyperlink', { x: 50, y: 740, size: 14, font });
        const ictx = inDoc.context;
        const action = ictx.obj({ Type: PDFName.of('Action'), S: PDFName.of('URI'), URI: PDFString.of('https://example.com/x') });
        const annot = ictx.obj({
          Type: PDFName.of('Annot'), Subtype: PDFName.of('Link'),
          Rect: ictx.obj([50, 735, 250, 755]), Border: ictx.obj([0, 0, 0]),
          A: action,
        });
        const annotRef = ictx.register(annot);
        pg.node.set(PDFName.of('Annots'), ictx.obj([annotRef]));
        const inputBytes = await inDoc.save();

        const mkPipeline = () => (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const html = '<!DOCTYPE html><html lang="en"><head><title>Link Fixture</title></head><body><main><h1>Doc</h1><p>Visit <a href="https://example.com/x">x</a>.</p></main></body></html>';

        const inspect = async (bytes: any) => {
          const outDoc = await PDFDocument.load(bytes);
          const ctx = outDoc.context;
          const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
          const nm = (n: string) => PDFName.of(n);
          const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
          let linkObjrCount = 0;
          let annotStructParent: number | null = null;
          const walk = (objIn: any, depth: number) => {
            const obj = resolve(objIn);
            if (depth > 60 || obj == null) return;
            if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
            if (!(obj instanceof PDFDict)) return;
            const S = obj.get(nm('S'));
            if (S && String(S) === '/Link') {
              const K = resolve(obj.get(nm('K')));
              const items = (K instanceof PDFArray) ? Array.from({ length: K.size() }, (_, i) => resolve(K.get(i))) : [K];
              for (const it of items) {
                if (it instanceof PDFDict && String(it.get(nm('Type')) || '') === '/OBJR') linkObjrCount++;
              }
            }
            const K2 = obj.get(nm('K'));
            if (K2 != null) walk(K2, depth + 1);
          };
          const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
          if (rootK != null) walk(rootK, 0);
          const pgOut = outDoc.getPages()[0];
          const annots: any = pgOut.node.get(nm('Annots'));
          if (annots && typeof annots.size === 'function') {
            for (let i = 0; i < annots.size(); i++) {
              const ad = resolve(annots.get(i));
              if (ad && String(ad.get(nm('Subtype')) || '') === '/Link') {
                const sp = ad.get(nm('StructParent'));
                if (sp != null) annotStructParent = Number(String(sp));
              }
            }
          }
          let xmp = '';
          try {
            const metaS: any = resolve(outDoc.catalog.get(nm('Metadata')));
            const contents = metaS && (metaS.contents || (metaS.getContents && metaS.getContents()));
            if (contents) xmp = new TextDecoder('utf-8').decode(contents);
          } catch (e) {}
          return { linkObjrCount, annotStructParent, hasUaClaim: xmp.indexOf('<pdfuaid:part>1</pdfuaid:part>') !== -1, xmpLen: xmp.length };
        };

        // Run 1: TEXT path (no groundTruthMethod) → links tagged, UA claim withheld.
        const r1 = await mkPipeline().createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'Link Gate Test', lang: 'en' });
        if (!r1 || !r1.bytes) return { error: 'run1 returned no bytes' };
        const text = await inspect(r1.bytes);
        const s1 = r1.summary || {};

        // Run 2: SCANNED path (groundTruthMethod tesseract) → UA claim declared.
        const r2 = await mkPipeline().createTaggedPdf(inputBytes, { accessibleHtml: html, groundTruthMethod: 'tesseract' }, { title: 'Link Gate Test', lang: 'en' });
        if (!r2 || !r2.bytes) return { error: 'run2 returned no bytes' };
        const scanned = await inspect(r2.bytes);

        const _b64 = (u8: Uint8Array) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000))); return btoa(s); };
        return {
          text, scanned, summaryLinkAnnotsTagged: (s1 as any).linkAnnotsTagged ?? null, roundTripOk: r1.roundTrip ? r1.roundTrip.ok !== false : null,
          artifactSourceB64: _b64(new Uint8Array(inputBytes)),
          artifactTaggedTextB64: _b64(new Uint8Array(r1.bytes)),
          artifactTaggedScannedB64: _b64(new Uint8Array(r2.bytes)),
        };
      } catch (err: any) { return { error: String((err && err.stack) || err) }; }
    });

    // Persist pairs for dev-tools/verapdf_diff.cjs (text path + scanned/unify path).
    try {
      if (linkGateSummary && linkGateSummary.artifactSourceB64) {
        const artDir = path.resolve(__dirname, 'artifacts');
        fs.mkdirSync(artDir, { recursive: true });
        fs.writeFileSync(path.join(artDir, 'linkannot-text.source.pdf'), Buffer.from(linkGateSummary.artifactSourceB64, 'base64'));
        fs.writeFileSync(path.join(artDir, 'linkannot-text.tagged.pdf'), Buffer.from(linkGateSummary.artifactTaggedTextB64, 'base64'));
        fs.writeFileSync(path.join(artDir, 'linkannot-scanned.source.pdf'), Buffer.from(linkGateSummary.artifactSourceB64, 'base64'));
        fs.writeFileSync(path.join(artDir, 'linkannot-scanned.tagged.pdf'), Buffer.from(linkGateSummary.artifactTaggedScannedB64, 'base64'));
      }
    } catch (e) { console.warn('[tag-tree golden] artifact write failed (non-fatal):', e); }
  });

  test('link annotation is wrapped: Link StructElem + OBJR + /StructParent', () => {
    expect(linkGateSummary && !linkGateSummary.error, 'evaluate error: ' + (linkGateSummary && linkGateSummary.error)).toBeTruthy();
    expect(linkGateSummary.text.linkObjrCount).toBeGreaterThanOrEqual(1);
    expect(linkGateSummary.text.annotStructParent).not.toBeNull();
    expect(linkGateSummary.summaryLinkAnnotsTagged).toBe(1);
  });

  test('round-trip still passes with Stage 3b additions', () => {
    expect(linkGateSummary.roundTripOk).not.toBe(false);
  });

  test('pdfuaid:part=1 withheld on the text path, declared on the scanned path', () => {
    expect(linkGateSummary.text.xmpLen).toBeGreaterThan(0);
    expect(linkGateSummary.text.hasUaClaim).toBe(false);
    expect(linkGateSummary.scanned.hasUaClaim).toBe(true);
  });
});

// ── Stage 4b: born-digital per-leaf unification via re-pointing (2026-06-09) ──
// Fixture where the PDF's drawn text EXACTLY matches the accessible HTML (the
// production situation — the HTML is generated from the PDF text). Stage 4 owns
// per-block MCIDs; Stage 4b must MOVE them onto the matching semantic leaves:
// H1 + P become content-linked (orphan count drops to 0 for this fixture), the
// ParentTree slots point at the leaves, and the round-trip stays clean.
let perLeafSummary: any = null;
test.describe('createTaggedPdf — Stage 4b per-leaf re-pointing (born-digital)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    perLeafSummary = await page.evaluate(async () => {
      const PDFLib = (window as any).PDFLib;
      const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFNumber } = PDFLib;
      try {
        const HEAD = 'Per Leaf Heading Example';
        // The paragraph is drawn as TWO separate text objects — the production
        // norm (Stage 4 segments per BT/ET, i.e. per line). The semantic leaf
        // must link BOTH blocks via run-concatenation (K = [MCR, MCR]).
        const BODY1 = 'This body paragraph matches the accessible html exactly';
        const BODY2 = 'and continues onto a second drawn line for the run test.';
        // Typographic-drift case: the PDF has straight ASCII quotes + spaced
        // hyphen; the HTML uses curly quotes + an em dash (what the AI rewrite
        // typically produces). The tolerant fold must still link it.
        const BODY3 = 'She said "hello" - twice as planned today.';
        const BODY3_HTML = 'She said “hello” — twice as planned today.';
        // Table cells (short-leaf tight-window path) + list items (marker-strip
        // path: the PDF line carries the bullet, the LBody leaf text doesn't).
        // Draw order mirrors the HTML's DOM order — the matcher is sequential.
        const CELLS = ['Name', 'Age', 'Ada', '36'];
        const LIST_SHORT = 'Apples';
        const LIST_LONG = 'Bananas grow fast in tropical heat.';
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        pg.drawText(HEAD, { x: 50, y: 740, size: 22, font });
        pg.drawText(BODY1, { x: 50, y: 700, size: 12, font });
        pg.drawText(BODY2, { x: 50, y: 684, size: 12, font });
        pg.drawText(BODY3, { x: 50, y: 660, size: 12, font });
        let cy = 630;
        for (const c of CELLS) { pg.drawText(c, { x: 50, y: cy, size: 12, font }); cy -= 16; }
        pg.drawText('• ' + LIST_SHORT, { x: 50, y: cy, size: 12, font }); cy -= 16;
        pg.drawText('• ' + LIST_LONG, { x: 50, y: cy, size: 12, font }); cy -= 16;
        // Stage 4c: one embedded image (1×1 red PNG) ↔ one HTML <img alt> —
        // count-exact, so the order-based figure matcher links it.
        const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const png = await inDoc.embedPng(Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0)));
        pg.drawImage(png, { x: 50, y: cy - 60, width: 80, height: 60 });
        const inputBytes = await inDoc.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const html = '<!DOCTYPE html><html lang="en"><head><title>Per Leaf Fixture</title></head><body><main>'
          + '<h1>' + HEAD + '</h1><p>' + BODY1 + ' ' + BODY2 + '</p><p>' + BODY3_HTML + '</p>'
          + '<table><tr><th scope="col">Name</th><th scope="col">Age</th></tr><tr><td>Ada</td><td>36</td></tr></table>'
          + '<ul><li>' + LIST_SHORT + '</li><li>' + LIST_LONG + '</li></ul>'
          + '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="A red square used to test figure linkage">'
          + '</main></body></html>';
        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'Per Leaf Test', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };

        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        const nm = (n: string) => PDFName.of(n);
        const LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link'];
        const elems: any[] = [];
        const walk = (objIn: any, depth: number) => {
          const obj = resolve(objIn);
          if (depth > 60 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return;
          const S = obj.get(nm('S'));
          if (!S) { const k0 = obj.get(nm('K')); if (k0 != null) walk(k0, depth + 1); return; }
          const role = String(S).replace(/^\//, '');
          const K = obj.get(nm('K'));
          let hasContent = false;
          let mcrCount = 0;
          if (K != null) {
            const kr = resolve(K);
            const items = (kr instanceof PDFArray) ? Array.from({ length: kr.size() }, (_, i) => resolve(kr.get(i))) : [kr];
            for (const it of items) {
              if (it instanceof PDFNumber) hasContent = true;
              else if (it instanceof PDFDict) {
                const ts = String(it.get(nm('Type')) || '');
                if (ts === '/MCR' || ts === '/OBJR') { hasContent = true; if (ts === '/MCR') mcrCount++; }
              }
            }
          }
          const at = obj.get(nm('ActualText'));
          // decodeText: non-ASCII ActualText (e.g. the '•' Lbl marker) reloads
          // as PDFHexString — String() would yield raw hex, defeating the
          // marker-exemption regex below.
          elems.push({ role, hasContent, mcrCount, actualText: at ? (typeof (at as any).decodeText === 'function' ? (at as any).decodeText() : String(at)) : '' });
          if (K != null) walk(K, depth + 1);
        };
        const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
        const rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
        if (rootK != null) walk(rootK, 0);
        const leaves = elems.filter((e) => LEAF_ROLES.includes(e.role));
        // Mirror the gate's pure-marker /Lbl exemption: the bullet glyph lives
        // in the same line-block the sibling LBody's MCR covers; one MCID maps
        // to one StructElem, so a marker-only Lbl can never independently link.
        // Quote chars included: standard-14 '•' round-trips as '"' through the
        // PDFString write→reload decode (same quirk the matcher's marker set
        // handles) — and this filter only applies to /Lbl roles.
        const orphaned = leaves.filter((e) => !e.hasContent && !(e.role === 'Lbl' && /^(["'•◦▪‣·*–-]|\d{1,3}[.)])$/.test((e.actualText || '').replace(/^[(/]|\)$/g, '').trim())));
        const h1 = elems.find((e) => e.role === 'H1');
        const p = elems.find((e) => e.role === 'P' && e.actualText.indexOf('matches the accessible') !== -1);
        const p2 = elems.find((e) => e.role === 'P' && e.actualText.indexOf('twice as planned') !== -1);
        // Evidence-based declaration: the XMP claim must appear on a FULLY
        // linked born-digital file (this fixture) — read it from the bytes.
        let xmp = '';
        try {
          const metaS: any = resolve(outDoc.catalog.get(nm('Metadata')));
          const contents = metaS && (metaS.contents || (metaS.getContents && metaS.getContents()));
          if (contents) xmp = new TextDecoder('utf-8').decode(contents);
        } catch (e) {}
        // Export the real bytes so dev-tools/verapdf_diff.cjs can run ISO-grade
        // PDF/UA validation on them (source vs tagged clause diff).
        const _b64 = (u8: Uint8Array) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000))); return btoa(s); };
        return {
          artifactSourceB64: _b64(new Uint8Array(inputBytes)),
          artifactTaggedB64: _b64(new Uint8Array(result.bytes)),
          perLeafLinked: (result.summary || {}).perLeafLinked ?? null,
          fontsRepaired: (result.summary || {}).fontsRepaired ?? null,
          leafCount: leaves.length,
          orphanedLeafCount: orphaned.length,
          orphanedRoles: orphaned.map((e) => e.role + ':' + JSON.stringify(e.actualText)),
          h1Linked: !!(h1 && h1.hasContent),
          pLinked: !!(p && p.hasContent),
          pMcrCount: p ? p.mcrCount : 0,
          thLinked: elems.filter((e) => e.role === 'TH' && e.hasContent).length,
          tdLinked: elems.filter((e) => e.role === 'TD' && e.hasContent).length,
          lbodyLinked: elems.filter((e) => e.role === 'LBody' && e.hasContent).length,
          figureLinked: elems.filter((e) => e.role === 'Figure' && e.hasContent).length,
          typographicDriftLinked: !!(p2 && p2.hasContent),
          hasUaClaim: xmp.indexOf('<pdfuaid:part>1</pdfuaid:part>') !== -1,
          uaRule: ((((result.pdfUa1Checks || {}).checks) || []).filter((c: any) => c.rule === 'PDF/UA-1 declared (XMP)').map((c: any) => c.status + ': ' + (c.message || c.detail)).join(' | ')) || '(rule missing)',
          xmpComment: (xmp.match(/<!--[^>]*-->/) || [''])[0],
          roundTripOk: result.roundTrip ? result.roundTrip.ok !== false : null,
          divergences: (result.roundTrip && result.roundTrip.divergences) || [],
          structLossCheck: ((result.roundTrip && result.roundTrip.checks) || []).filter((c: any) => c.rule === 'No structure lost at save').map((c: any) => c.status),
        };
      } catch (err: any) { return { error: String((err && err.stack) || err) }; }
    });

    // Persist source+tagged pairs for the veraPDF clause-diff harness
    // (dev-tools/verapdf_diff.cjs). Best-effort: artifact write failures must
    // never fail the golden assertions themselves.
    try {
      if (perLeafSummary && perLeafSummary.artifactSourceB64) {
        const artDir = path.resolve(__dirname, 'artifacts');
        fs.mkdirSync(artDir, { recursive: true });
        fs.writeFileSync(path.join(artDir, 'perleaf-borndigital.source.pdf'), Buffer.from(perLeafSummary.artifactSourceB64, 'base64'));
        fs.writeFileSync(path.join(artDir, 'perleaf-borndigital.tagged.pdf'), Buffer.from(perLeafSummary.artifactTaggedB64, 'base64'));
      }
    } catch (e) { console.warn('[tag-tree golden] artifact write failed (non-fatal):', e); }
  });

  test('Stage 4b re-points MCIDs onto matching semantic leaves', () => {
    expect(perLeafSummary && !perLeafSummary.error, 'evaluate error: ' + (perLeafSummary && perLeafSummary.error)).toBeTruthy();
    expect(perLeafSummary.perLeafLinked, 'summary.perLeafLinked — Stage 4 must have run and all three leaves matched').toBeGreaterThanOrEqual(3);
    expect(perLeafSummary.h1Linked, 'H1 semantic leaf must carry /K→MCR').toBe(true);
    expect(perLeafSummary.pLinked, 'P semantic leaf must carry /K→MCR').toBe(true);
  });

  test('typographic drift (curly quotes + em dash in HTML vs ASCII in PDF) still links', () => {
    expect(perLeafSummary.typographicDriftLinked).toBe(true);
  });

  test('born-digital orphaned-leaf count drops to 0 on a fully-matching fixture', () => {
    expect(perLeafSummary.orphanedLeafCount, 'orphaned roles: ' + JSON.stringify(perLeafSummary.orphanedRoles)).toBe(0);
  });

  test('run-concatenation: the two-line paragraph leaf carries BOTH MCRs', () => {
    expect(perLeafSummary.pMcrCount, 'P leaf /K must hold one MCR per drawn line').toBe(2);
  });

  test('table cells link via the short-leaf tight-window path (TH×2 + TD×2)', () => {
    expect(perLeafSummary.thLinked, 'TH leaves carrying /K→MCR').toBe(2);
    expect(perLeafSummary.tdLinked, 'TD leaves carrying /K→MCR (Ada, 36)').toBe(2);
  });

  test('list bodies link with the leading marker stripped (short + long item)', () => {
    expect(perLeafSummary.lbodyLinked, 'LBody leaves carrying /K→MCR').toBe(2);
  });

  test('Stage 4c: the figure links to its marked image draw (count-exact order match)', () => {
    expect(perLeafSummary.figureLinked, 'Figure leaves carrying /K→MCR').toBe(1);
  });

  test('evidence-based PDF/UA-1: claim DECLARED on a fully-linked born-digital file', () => {
    expect(perLeafSummary.hasUaClaim, 'self-check rule: ' + perLeafSummary.uaRule + ' || xmp comment: ' + perLeafSummary.xmpComment).toBe(true);
  });

  test('Stage 7: the non-embedded standard-14 Helvetica gets a substitute embedded', () => {
    expect(perLeafSummary.fontsRepaired, 'summary.fontsRepaired (fixture uses non-embedded Helvetica)').toBeGreaterThanOrEqual(1);
  });

  test('no content loss: round-trip clean, no divergences, structure-loss check passes', () => {
    expect(perLeafSummary.roundTripOk).not.toBe(false);
    expect(perLeafSummary.divergences).toEqual([]);
    expect(perLeafSummary.structLossCheck.includes('fail'), 'No structure lost at save must not fail').toBe(false);
  });
});
