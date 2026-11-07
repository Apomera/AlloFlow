// (2026-11-06) Tagging reads each page once through a marked-up throwaway copy. A page lost there silently got coarse
// blocks, its leaves stayed unlinked and the tagged PDF was withheld, though a rerun gave a good one. A slow, hung or
// failed read now gets one more try, a stuck read costs a bounded wait, and a timeout is reported so the report can
// say a rerun may help. Faults are injected into the real pdf.js only for the throwaway copy (it holds "/AlloSeg").
// Long waits are scaled down 10x only while that copy is open; the real createTaggedPdf runs in Chromium.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

type Plan = { [key: string]: string[] }; // 'doc' or a page number -> what each attempt does, in order

async function run(page, plan: Plan) {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  const r = await page.evaluate(async (plan: Plan) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const LINES = [['Study timelines', 'The first page has this sentence about the plan.'], ['Next steps', 'The second page has this sentence about the follow up.']];
    LINES.forEach((ls) => { const p = src.addPage([612, 792]); ls.forEach((t, i) => p.drawText(t, { x: 72, y: 720 - i * 40, size: i ? 11 : 18, font })); });
    const html = '<!doctype html><html lang="en"><head><title>Plan</title></head><body><main><h1>Study timelines</h1><p>The first page has this sentence about the plan.</p><h2>Next steps</h2><p>The second page has this sentence about the follow up.</p></main></body></html>';

    const realTimeout = window.setTimeout.bind(window);
    const sleep = (ms: number) => new Promise((res) => realTimeout(res, ms));
    let open = 0;
    (window as any).setTimeout = (fn: any, ms: number, ...a: any[]) => realTimeout(fn, open > 0 && ms >= 15000 ? ms / 10 : ms, ...a);
    const never = () => new Promise(() => {});
    const act = async (what: string | undefined, go: () => Promise<any>) => {
      if (what === 'hang') return never();
      if (what === 'fail') throw new Error('injected pdf.js failure');
      if (what === 'slow') await sleep(4000); // past the 3 s first wait of a page, inside the 12 s second wait
      if (what === 'slowdoc') await sleep(8000); // past the 6 s first wait of the document
      return go();
    };
    const attempts: any = {};
    const real = W.pdfjsLib.getDocument.bind(W.pdfjsLib);
    const copy = { getDocument: real };
    Object.defineProperty(W, 'pdfjsLib', { configurable: true, value: new Proxy(W.pdfjsLib, { get: (t, k) => (k === 'getDocument' ? (o: any) => copy.getDocument(o) : (t as any)[k]) }) });
    copy.getDocument = (o: any) => {
      const task = real(o);
      const isCopy = o && o.data && new TextDecoder('latin1').decode(o.data).includes('/AlloSeg');
      if (!isCopy) return task;
      open++;
      if ((plan.doc || [])[0] === 'hang') realTimeout(() => { open--; }, 18500); // never opens, so never destroyed: 6 s + 12 s
      const wrap = (doc: any) => new Proxy(doc, { get(t, k) {
        if (k === 'destroy') return () => { open--; return t.destroy(); };
        if (k !== 'getPage') { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }
        return async (n: number) => {
          const pg = await t.getPage(n);
          return new Proxy(pg, { get(tp, kp) {
            if (kp !== 'getTextContent') { const v = tp[kp]; return typeof v === 'function' ? v.bind(tp) : v; }
            return (args: any) => { const i = attempts[n] = (attempts[n] || 0) + 1; return act((plan[n] || [])[i - 1], () => tp.getTextContent(args)); };
          } });
        };
      } });
      return { promise: act((plan.doc || [])[0], () => task.promise).then(wrap, (e) => { open--; throw e; }) };
    };

    const started = performance.now();
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Plan', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Plan' });
    const ms = performance.now() - started;
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const leaves: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K')); const at = n.get(PDFName.of('ActualText'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      if (at) leaves.push({ text: at.decodeText(), linked: kids.map(look).some((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID'))) });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return { ms, attempts, leaves, slow: tagged.summary && tagged.summary.segmentProbeSlowPages, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule) };
  }, plan);
  return { ...r, probe: logs.filter((l) => l.includes('[Stage4-Probe]')) };
}

const FIRST = 'The first page has this sentence about the plan.';
const SECOND = 'The second page has this sentence about the follow up.';
const allLinked = (r: any) => {
  expect(r.leaves.find((x: any) => x.text === FIRST)).toEqual({ text: FIRST, linked: true });
  expect(r.leaves.find((x: any) => x.text === SECOND)).toEqual({ text: SECOND, linked: true });
  expect(r.fails).toEqual([]);
};

test.describe('a page the segment probe could not read the first time', () => {
  test.setTimeout(180000);
  test.beforeEach(async ({ page }) => {
    await bootDocumentRuntime(page);
    for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
      await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
    }
  });

  test('no fault: one read per page, nothing reported as slow', async ({ page }) => {
    const r = await run(page, {});
    allLinked(r);
    expect(r.attempts).toEqual({ 1: 1, 2: 1 });
    expect(r.slow).toEqual([]);
    expect(r.probe).toEqual(['[Stage4-Probe] exact segment text for 2 page(s)']);
  });

  test('a slow read gets through on the second wait; the second attempt need not finish', async ({ page }) => {
    const r = await run(page, { 1: ['slow', 'hang'] });
    allLinked(r);
    expect(r.attempts[1]).toBe(2);
    expect(r.slow).toEqual([]);
    expect(r.probe.join('\n')).toMatch(/trying again for page\(s\) 1: Timeout after 30s/);
    expect(r.probe.join('\n')).toMatch(/exact segment text for 2 page/);
  });

  test('a read that hangs: a fresh attempt gets the page', async ({ page }) => {
    const r = await run(page, { 1: ['hang'] });
    allLinked(r);
    expect(r.slow).toEqual([]);
    expect(r.probe.join('\n')).toMatch(/exact segment text for 2 page/);
  });

  test('a read that fails outright: a fresh attempt gets the page', async ({ page }) => {
    const r = await run(page, { 2: ['fail'] });
    allLinked(r);
    expect(r.slow).toEqual([]);
    expect(r.probe.join('\n')).toMatch(/trying again for page\(s\) 2: injected pdf\.js failure/);
  });

  test('a page stuck on every attempt: the other page is kept, the wait is bounded, and it is reported as slow', async ({ page }) => {
    const r = await run(page, { 1: ['hang', 'hang'] });
    expect(r.slow).toEqual([1]);
    expect(r.probe.join('\n')).toMatch(/page 1 keeps coarse blocks: Timeout after 120s \(second wait\)/);
    expect(r.probe.join('\n')).toMatch(/exact segment text for 1 page/);
  });

  test('several stuck pages share one second wait', async ({ page }) => {
    const r = await run(page, { 1: ['hang', 'hang'], 2: ['hang', 'hang'] });
    expect(r.slow).toEqual([1, 2]);
    const waits = r.probe.filter((l: string) => /trying again/.test(l));
    expect(waits).toEqual([expect.stringMatching(/page\(s\) 1, 2:/)]);
  });

  test('a real failure on every attempt is not called slow: a rerun would not help', async ({ page }) => {
    const r = await run(page, { 1: ['fail', 'fail'] });
    expect(r.slow).toEqual([]);
    expect(r.probe.join('\n')).toMatch(/page 1 keeps coarse blocks: injected pdf\.js failure/);
  });

  test('a first attempt that fails while the fresh one hangs counts as slow', async ({ page }) => {
    const r = await run(page, { 1: ['fail', 'hang'] });
    expect(r.probe.join('\n')).toMatch(/page 1 keeps coarse blocks: Timeout after 120s/);
    expect(r.slow).toEqual([1]);
  });

  test('a copy slow to open gets the second wait, and every page is read', async ({ page }) => {
    const r = await run(page, { doc: ['slowdoc'] });
    allLinked(r);
    expect(r.probe.join('\n')).toMatch(/slow to open/);
    expect(r.probe.join('\n')).toMatch(/exact segment text for 2 page/);
    expect(r.slow).toEqual([]);
  });

  test('a copy that never opens: tagging carries on, reported as slow', async ({ page }) => {
    const r = await run(page, { doc: ['hang'] });
    expect(r.probe.join('\n')).toMatch(/slow to open/);
    expect(r.probe.join('\n')).toMatch(/unavailable, keeping item pairing: Timeout after 120s/);
    expect(r.slow).toEqual(['all']);
  });
});
