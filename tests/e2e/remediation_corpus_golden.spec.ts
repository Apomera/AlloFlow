// Remediation-pipeline E2E corpus (2026-07-02) — REAL PDF bytes in, scripted Gemini,
// structural assertions on what comes out. Fills the acknowledged gap (DECOUPLING_PLAN
// §L12: pdf.js/canvas can't run under vitest+jsdom — this is the Playwright vehicle).
//
// Self-contained like pdf_tag_tree_golden.spec.ts: about:blank + the LOCAL built
// doc_pipeline_module.js. Gemini is dependency-injected with a prompt-shape dispatcher
// (ai_path_golden.spec.ts pattern) that also RECORDS payload sizes — which is how this
// spec live-verifies the 2026-07-02 "document may be too large" fix:
//
//   THE PIPELINE PAGE NEVER INJECTS PDF-LIB. The audit of a >1.5MB fixture must
//   self-load it (ensurePdfLibLoaded) and slice — every Vision payload must be smaller
//   than the whole document. Before the fix, slicing silently disabled on fresh
//   sessions and the whole doc went inline (the error Aaron hit live).
//
// Also exercised: the Document Safety scan (A1) against a synthesized active-content
// PDF (OpenAction + page /AA + embedded file), extraction on real committed fixtures,
// and a full fixAndVerifyPdf run producing a tagged PDF that re-parses with the core
// tagged-output invariants.

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { TAGGED_PDF_INVARIANTS_JS, PAKO_CDN } from './_tagged_pdf_invariants';

const VERIFICATION_POLICY_PATH = path.resolve(__dirname, '../../verification_policy_module.js');
const RENDERER_MODULE_PATH = path.resolve(__dirname, '../../doc_builder_renderer_module.js');
const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const ASSET = (p: string) => path.resolve(__dirname, '../../test-assets', p);

test.describe.configure({ mode: 'serial' });
test.setTimeout(300000);

let page: any = null;
let fixtures: { textB64: string; bigB64: string; activeB64: string } | null = null;
let realSampleB64 = '';
let realScrambledB64 = '';

test.describe('remediation corpus — real bytes, scripted model, structural truth', () => {
  test.beforeAll(async ({ browser }) => {
    // Real committed fixtures from disk (nothing loaded on-disk PDFs before this spec).
    realSampleB64 = fs.readFileSync(ASSET('multi-column-sample.pdf')).toString('base64');
    realScrambledB64 = fs.readFileSync(ASSET('multi-column-scrambled.pdf')).toString('base64');

    // Fixture-BUILDER page: pdf-lib injected HERE only. The pipeline page below stays
    // pdf-lib-free so the self-load fix is actually exercised.
    const builder = await browser.newPage();
    await builder.goto('about:blank');
    await builder.addScriptTag({ url: PDFLIB_CDN });
    await builder.waitForFunction(() => !!(window as any).PDFLib?.PDFDocument, null, { timeout: 30000 });
    fixtures = await builder.evaluate(async () => {
      const { PDFDocument, StandardFonts, PDFName, PDFString } = (window as any).PDFLib;
      const b64 = (bytes: Uint8Array) => {
        let bin = ''; const CH = 0x8000;
        for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)));
        return btoa(bin);
      };
      // 1) Clean 2-page text doc.
      const t = await PDFDocument.create();
      const font = await t.embedFont(StandardFonts.Helvetica);
      const p1 = t.addPage([612, 792]);
      p1.drawText('Photosynthesis Study Guide', { x: 50, y: 740, size: 22, font });
      p1.drawText('Plants convert light energy into chemical energy stored as glucose.', { x: 50, y: 700, size: 12, font });
      const p2 = t.addPage([612, 792]);
      p2.drawText('Review Questions', { x: 50, y: 740, size: 18, font });
      p2.drawText('Explain the role of chlorophyll in the light reactions.', { x: 50, y: 700, size: 12, font });
      const textBytes = await t.save();

      // 2) Big doc: 25 text pages + ~1.8MB attachment → crosses the audit slice-probe
      //    threshold (1500KB) AND the 20-page slice gate.
      const b = await PDFDocument.create();
      const bf = await b.embedFont(StandardFonts.Helvetica);
      for (let i = 1; i <= 25; i++) {
        const pg = b.addPage([612, 792]);
        pg.drawText('Section ' + i, { x: 50, y: 740, size: 18, font: bf });
        pg.drawText('Body text for section ' + i + ' with enough words to look like a real page.', { x: 50, y: 700, size: 11, font: bf });
      }
      const blob = new Uint8Array(1800000);
      for (let i = 0; i < blob.length; i++) blob[i] = (i * 31 + 7) & 0xff;
      await b.attach(blob, 'dataset.bin', { mimeType: 'application/octet-stream', description: 'inflates size + embedded-files finding' });
      const bigBytes = await b.save();

      // 3) Active-content doc: OpenAction(JS) + page /AA + embedded file.
      const a = await PDFDocument.create();
      const af = await a.embedFont(StandardFonts.Helvetica);
      const ap = a.addPage([612, 792]);
      ap.drawText('Innocent looking worksheet', { x: 50, y: 740, size: 14, font: af });
      const jsAction = a.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of("app.alert('hi')") });
      a.catalog.set(PDFName.of('OpenAction'), a.context.register(jsAction));
      ap.node.set(PDFName.of('AA'), a.context.obj({}));
      await a.attach(new Uint8Array([1, 2, 3, 4]), 'payload.bin', { mimeType: 'application/octet-stream' });
      const activeBytes = await a.save();

      return { textB64: b64(textBytes), bigB64: b64(bigBytes), activeB64: b64(activeBytes) };
    });
    await builder.close();

    // Pipeline page: LOCAL module only — NO pdf-lib injection (the point). pako + the invariant
    // checker are NOT pdf-lib: the checker runs only AFTER createTaggedPdf, whose ensurePdfLibLoaded
    // self-load (Item 0) is precisely what this page exercises — by then window.PDFLib exists.
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: VERIFICATION_POLICY_PATH });
    await page.addScriptTag({ path: RENDERER_MODULE_PATH });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.addScriptTag({ url: PAKO_CDN });
    await page.addScriptTag({ content: TAGGED_PDF_INVARIANTS_JS });
    await page.waitForFunction(() => !!(window as any).AlloModules?.VerificationPolicy && !!(window as any).AlloModules?.DocBuilderRenderer && !!(window as any).AlloModules?.createDocPipeline && !!(window as any).pako, null, { timeout: 20000 });
    await page.evaluate(() => {
      const w = window as any;
      w.__calls = [];
      const auditPdfJson = JSON.stringify({ score: 55, summary: 'scripted audit', confidence: 'high', documentLanguage: 'en', critical: [], serious: [{ issue: 'Images without alternative text', wcag: '1.1.1', location: 'page 1' }], moderate: [], minor: [], passes: ['document has a title'] });
      const auditHtmlJson = JSON.stringify({ score: 88, summary: 'scripted html audit', issues: [], passes: ['lang present'] });
      const dispatch = (prompt: string, payload?: string) => {
        if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return auditPdfJson;
        if (/accessibility auditor\. Audit this HTML/i.test(prompt)) return auditHtmlJson;
        // Structure extraction (the JSON pipeline — both single-pass and chunked prompts
        // end with this marker). w.__jsonRefusal simulates a refusal-shaped reply: valid
        // JSON, NOT a block array — the exact shape that once erased documents silently.
        if (/Return ONLY a JSON array/i.test(prompt)) {
          if (w.__jsonRefusal) return '{}';
          return JSON.stringify([
            { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
            { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
            { type: 'h2', text: 'Review Questions', id: 'review-questions' },
            { type: 'p', text: 'Explain the role of chlorophyll in the light reactions.' },
          ]);
        }
        if (/Extract ALL text content/i.test(prompt)) return '# Section\nScripted extraction body text.';
        if (/Transform|accessible HTML/i.test(prompt)) {
          if (w.__jsonRefusal) return 'I cannot process this document.'; // non-HTML → fails the fallback's structural validation
          return '<h1>Photosynthesis Study Guide</h1><p>Plants convert light energy into chemical energy.</p>';
        }
        return '{}';
      };
      const mk = (kind: string) => async (prompt: string, b64?: string, _mime?: string) => {
        w.__calls.push({ kind, payloadBytes: (b64 || '').length, head: String(prompt).slice(0, 60) });
        return dispatch(String(prompt), b64);
      };
      w.__pipeline = w.AlloModules.createDocPipeline({
        callGemini: mk('text'),
        callGeminiVision: mk('vision'),
        callImagen: async () => null,
        addToast: () => {},
        t: (k: string) => k,
        isRtlLang: () => false,
        updateExportPreview: () => {},
        getDefaultTitle: () => 'Document',
        state: {},
      });
    });
  });

  test.afterAll(async () => { if (page) await page.close(); });

  test('big-doc audit SELF-LOADS pdf-lib and slices — no whole-doc Vision payloads (the live-bug fix)', async () => {
    const out = await page.evaluate(async (bigB64: string) => {
      const w = window as any;
      const pdfLibBefore = !!w.PDFLib;
      w.__calls.length = 0;
      const audit = await w.__pipeline.runPdfAccessibilityAudit(bigB64, { skipUiUpdates: true, skipCache: true, fileName: 'big-fixture.pdf' });
      return {
        pdfLibBefore,
        pdfLibAfter: !!(w.PDFLib && w.PDFLib.PDFDocument),
        visionCalls: w.__calls.filter((c: any) => c.kind === 'vision').map((c: any) => c.payloadBytes),
        score: audit && audit.score,
        activeContent: audit && audit.activeContent,
        summary: String((audit && audit.summary) || ''),
      };
    }, fixtures!.bigB64);
    expect(out.pdfLibBefore).toBe(false);            // the page really started pdf-lib-free
    expect(out.pdfLibAfter).toBe(true);              // ensurePdfLibLoaded pulled it in
    expect(out.visionCalls.length).toBeGreaterThanOrEqual(2); // sliced fan-out, not one doomed call
    for (const bytes of out.visionCalls) {
      expect(bytes).toBeGreaterThan(0);
      expect(bytes).toBeLessThan(fixtures!.bigB64.length); // every payload < the whole document
    }
    expect(typeof out.score).toBe('number');
    // The attachment that inflated the fixture is real active content — A1 sees it.
    expect(out.activeContent && out.activeContent.any).toBe(true);
    expect(out.activeContent.findings.map((f: any) => f.type)).toContain('embedded-files');
  });

  test('Document Safety scan: active-content fixture reports all three classes; clean doc reports none', async () => {
    const out = await page.evaluate(async (fx: any) => {
      const w = window as any;
      const NS = w.PDFLib;
      const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c: string) => c.charCodeAt(0));
      const scan = w.AlloModules.createDocPipeline.scanActiveContent;
      const active = scan(await NS.PDFDocument.load(toBytes(fx.activeB64), { ignoreEncryption: true, updateMetadata: false }), NS);
      const clean = scan(await NS.PDFDocument.load(toBytes(fx.textB64), { ignoreEncryption: true, updateMetadata: false }), NS);
      return { active, clean };
    }, fixtures);
    expect(out.active.any).toBe(true);
    const types = out.active.findings.map((f: any) => f.type);
    expect(types).toContain('open-action');
    expect(types).toContain('embedded-files');
    expect(types).toContain('additional-actions');
    expect(out.clean.any).toBe(false);
    expect(out.clean.findings.length).toBe(0);
  });

  test('clean rebuilt tagged PDF contains no executable source actions or attachments', async () => {
    const out = await page.evaluate(async () => {
      const w = window as any;
      const NS = w.PDFLib;
      const generated = await w.__pipeline.createTypesetTaggedPdf({
        accessibleHtml: '<!doctype html><html lang="en"><head><title>Safe copy</title></head><body><h1>Safe copy</h1><p>Remediated classroom content.</p></body></html>',
      }, { title: 'Safe copy', lang: 'en', subject: 'Clean rebuild test' });
      const doc = await NS.PDFDocument.load(generated.bytes, { updateMetadata: false });
      const nm = (name: string) => NS.PDFName.of(name);
      const resolve = (obj: any) => obj && obj.constructor && obj.constructor.name === 'PDFRef' ? doc.context.lookup(obj) : obj;
      const names = resolve(doc.catalog.get(nm('Names')));
      const pageHasAA = doc.getPages().some((p: any) => !!p.node.get(nm('AA')));
      return {
        openAction: !!doc.catalog.get(nm('OpenAction')),
        catalogAA: !!doc.catalog.get(nm('AA')),
        pageAA: pageHasAA,
        javascriptTree: !!(names && names.get && names.get(nm('JavaScript'))),
        embeddedFilesTree: !!(names && names.get && names.get(nm('EmbeddedFiles'))),
        bytes: generated.bytes.length,
        roundTripOk: generated.roundTrip && generated.roundTrip.ok,
      };
    });
    expect(out.bytes).toBeGreaterThan(100);
    expect(out.roundTripOk).toBe(true);
    expect(out).toMatchObject({ openAction: false, catalogAA: false, pageAA: false, javascriptTree: false, embeddedFilesTree: false });
  });

  test('real committed fixtures audit end-to-end (multi-column sample + scrambled)', async () => {
    const out = await page.evaluate(async (fx: any) => {
      const w = window as any;
      const a1 = await w.__pipeline.runPdfAccessibilityAudit(fx.sample, { skipUiUpdates: true, skipCache: true, fileName: 'multi-column-sample.pdf' });
      const a2 = await w.__pipeline.runPdfAccessibilityAudit(fx.scrambled, { skipUiUpdates: true, skipCache: true, fileName: 'multi-column-scrambled.pdf' });
      return {
        s1: a1 && a1.score, hasText1: a1 && a1.hasSearchableText, pc1: a1 && a1.pageCount,
        s2: a2 && a2.score, ac1: a1 && a1.activeContent, ac2: a2 && a2.activeContent,
      };
    }, { sample: realSampleB64, scrambled: realScrambledB64 });
    expect(typeof out.s1).toBe('number');
    expect(out.s1).toBeGreaterThanOrEqual(0);
    expect(typeof out.s2).toBe('number');
    // Real docs, no synthetic active content:
    expect(out.ac1 && out.ac1.any).toBe(false);
    expect(out.ac2 && out.ac2.any).toBe(false);
  });

  test('full fixAndVerifyPdf run on the clean text doc → result fields + tagged output invariants', async () => {
    const out = await page.evaluate(async (textB64: string) => {
      const w = window as any;
      const audit = await w.__pipeline.runPdfAccessibilityAudit(textB64, { skipUiUpdates: true, skipCache: true, fileName: 'text-fixture.pdf' });
      const result = await w.__pipeline.fixAndVerifyPdf({
        base64: textB64,
        fileName: 'text-fixture.pdf',
        auditResult: audit,
        targetScore: 80,
        autoFixPasses: 1,
        polishPasses: 0,
        onProgress: () => {},
      });
      if (!result || !result.accessibleHtml) return { error: 'no accessibleHtml', keys: result ? Object.keys(result) : [] };
      const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c: string) => c.charCodeAt(0));
      const tagged = await w.__pipeline.createTaggedPdf(toBytes(textB64), result, { title: 'Text Fixture', lang: 'en' });
      const bytes = tagged && tagged.bytes ? tagged.bytes : tagged;
      const roundTrip = tagged && tagged.roundTrip;
      let invariants: any = null;
      if (bytes) {
        const NS = w.PDFLib;
        const outDoc = await NS.PDFDocument.load(bytes);
        const nm = (s: string) => NS.PDFName.of(s);
        const resolveRef = (o: any) => (o && o.constructor && o.constructor.name === 'PDFRef') ? outDoc.context.lookup(o) : o;
        const markInfo = resolveRef(outDoc.catalog.get(nm('MarkInfo')));
        // Full structural-invariant sweep (shared checker): dup MCID claims, dangling MCRs,
        // BDC/EMC balance, artifact-only StructParents. window.PDFLib exists here precisely
        // because ensurePdfLibLoaded self-loaded it during the run (the Item-0 fix under test).
        const sweep = await w.__alloTaggedPdfInvariants(bytes);
        invariants = {
          hasStructTreeRoot: !!resolveRef(outDoc.catalog.get(nm('StructTreeRoot'))),
          marked: markInfo && String(markInfo.get(nm('Marked'))) === 'true',
          lang: String(outDoc.catalog.get(nm('Lang')) || ''),
          sweepViolations: sweep.violations,
          sweepMcrCount: sweep.mcrCount,
        };
      }
      let taggedB64 = '';
      if (bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
        }
        taggedB64 = btoa(binary);
      }
      return {
        htmlLen: result.accessibleHtml.length,
        htmlHasSourceText: /Photosynthesis|light energy|chlorophyll/i.test(result.accessibleHtml),
        htmlHasHeading: /<h[1-3][\s>]/i.test(result.accessibleHtml),
        hasAltQualityKey: 'altQuality' in result,
        hasActiveContentKey: 'activeContent' in result,
        hasOcrAccuracyKey: 'ocrAccuracy' in result,
        afterScore: result.afterScore,
        invariants,
        roundTripOk: roundTrip && roundTrip.ok,
        tagTreeOrder: roundTrip && roundTrip.tagTreeOrder,
        tagTreeOrderCheck: roundTrip && (roundTrip.checks || []).find((c: any) => c.rule === 'Logical reading order follows saved StructTreeRoot /K'),
        taggedB64,
      };
    }, fixtures!.textB64);

    expect((out as any).error).toBeUndefined();
    expect(out.taggedB64, 'full remediation must return a nonempty PDF artifact').toMatch(/^JVBER/);

    // Persist this full remediation pair for the optional independent veraPDF
    // source-to-tagged clause-diff job. Artifact generation is part of the gate:
    // a missing pair must not let the external validator pass vacuously.
    const artDir = path.resolve(__dirname, 'artifacts');
    fs.mkdirSync(artDir, { recursive: true });
    fs.writeFileSync(path.join(artDir, 'remediation-e2e.source.pdf'), Buffer.from(fixtures!.textB64, 'base64'));
    fs.writeFileSync(path.join(artDir, 'remediation-e2e.tagged.pdf'), Buffer.from(out.taggedB64, 'base64'));

    expect(out.htmlLen).toBeGreaterThan(100);
    expect(out.htmlHasSourceText).toBe(true); // the document's own words survived remediation
    expect(out.htmlHasHeading).toBe(true); // the JSON pipeline rendered real heading structure
    expect(out.hasAltQualityKey).toBe(true);
    expect(out.hasActiveContentKey).toBe(true);
    expect(out.hasOcrAccuracyKey).toBe(true);
    expect(out.invariants).not.toBeNull();
    expect(out.invariants.hasStructTreeRoot).toBe(true);
    expect(out.invariants.marked).toBe(true);
    expect(out.invariants.lang).toContain('en');
    // This is the authoritative assistive-technology order: it comes from
    // re-parsing the SAVED PDF and walking StructTreeRoot /K, then comparing
    // every semantic leaf fingerprint with the HTML-derived expected order.
    expect(out.roundTripOk, 'the shipped bytes must pass all post-save checks').toBe(true);
    expect(out.tagTreeOrder, 'post-save verifier must report the saved tag-tree order').toBeTruthy();
    expect(out.tagTreeOrder.exact, JSON.stringify(out.tagTreeOrder)).toBe(true);
    expect(out.tagTreeOrder.expectedLeafCount).toBeGreaterThan(0);
    expect(out.tagTreeOrder.savedLeafCount).toBe(out.tagTreeOrder.expectedLeafCount);
    expect(out.tagTreeOrder.mismatchIndex).toBe(-1);
    expect(out.tagTreeOrderCheck && out.tagTreeOrderCheck.status).toBe('pass');
    // Shared structural-invariant sweep (2026-07-09): the full dup-claim/dangling-MCR/balance/
    // artifact-StructParents set, on a REAL end-to-end run's bytes.
    expect(out.invariants.sweepViolations, JSON.stringify(out.invariants.sweepViolations)).toEqual([]);
    expect(out.invariants.sweepMcrCount).toBeGreaterThan(0); // non-vacuous: the tree references content
  });

  test('refusal-shaped model output cannot erase the document — empty-body guard splices extracted text', async () => {
    // This corpus CAUGHT the defect this test pins (2026-07-02): a structure-extraction
    // reply of {} parsed as valid JSON, sailed through repair, rendered an empty body,
    // and shipped an all-boilerplate shell that still scored 98. Now: repairSingle
    // rejects non-block-arrays, the HTML fallback rejects non-HTML, and the empty-body
    // guard splices the deterministic extraction back in — disclosed, not silent.
    const out = await page.evaluate(async (textB64: string) => {
      const w = window as any;
      w.__jsonRefusal = true;
      try {
        const audit = await w.__pipeline.runPdfAccessibilityAudit(textB64, { skipUiUpdates: true, skipCache: true, fileName: 'text-fixture-refusal.pdf' });
        const result = await w.__pipeline.fixAndVerifyPdf({
          base64: textB64,
          fileName: 'text-fixture-refusal.pdf',
          auditResult: audit,
          targetScore: 80,
          autoFixPasses: 1,
          polishPasses: 0,
          onProgress: () => {},
        });
        return { html: result && result.accessibleHtml ? String(result.accessibleHtml) : '' };
      } finally {
        w.__jsonRefusal = false;
      }
    }, fixtures!.textB64);
    expect(out.html.length).toBeGreaterThan(100);
    // The document's own words survive even when every transform reply is refusal-shaped…
    expect(/Photosynthesis|light energy|chlorophyll/i.test(out.html)).toBe(true);
    // …and the plain-paragraph rendering is DISCLOSED, not silent.
    expect(out.html).toContain('Formatting notice');
  });
});
