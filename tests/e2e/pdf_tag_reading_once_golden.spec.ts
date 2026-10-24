// Tagged PDF: every paragraph is read ONCE, with its full text (2026-10-16).
//
// Measured on real school documents before this fix: a 543-word letter made a screen reader hear
// 1,175 words, because Stage 4 gave each text object the text of ONE pdf.js item (truncated
// replacement text), could not link paragraphs that one text object drew together or that a
// word split across two text objects, and so left the raw page text in the page Sects, read
// again after the remediated text. This spec rebuilds those patterns in a generated PDF, runs the
// REAL createTaggedPdf in Chromium (offline, MCP vendor bundle), and reads the result the way a
// screen reader does: a structure element with /ActualText is read as that text; otherwise each
// MCID it owns is read as the page text pdf.js finds inside it.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');

const html = (reworded: string) => `<!DOCTYPE html><html lang="en"><head><title>Letter</title></head><body><main>
<h1>Letter to families</h1>
<p>June 14, 2016</p>
<p>Dear Colleagues:</p>
<p>We are pleased to offer full day care this fall to all families.</p>
<p>Because students cannot attend school in person, sabemos how much families rely on it.</p>
<p>The district will decide in 2021.</p>
<p>${reworded}</p>
<p>Xavier Botana</p>
</main></body></html>`;

async function boot(page) {
  await page.route('https://alloflow.test/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/vendor/')) return route.fulfill({ body: fs.readFileSync(path.join(VENDOR, u.pathname.slice(8))), contentType: 'application/javascript' });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
  });
  await page.goto('https://alloflow.test/boot');
  for (const f of ['pdfjs.min.js', 'pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js']) await page.addScriptTag({ path: path.join(VENDOR, f) });
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) await page.addScriptTag({ path: path.join(ROOT, f) });
  await page.evaluate(() => { (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://alloflow.test/vendor/pdf.worker.min.js'; });
}

// Tag the generated fixture with the given HTML; return what a screen reader reads.
async function tagAndRead(page, accessibleHtml: string) {
  return page.evaluate(async (accessibleHtml) => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber } = W.PDFLib;
    // ── fixture: the real-world drawing patterns ──
    const doc = await PDFDocument.create();
    const pg = doc.addPage([612, 792]);
    const ctx = doc.context;
    const font = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Encoding: 'WinAnsiEncoding' }));
    pg.node.set(PDFName.of('Resources'), ctx.obj({ Font: ctx.obj({ F1: font }) }));
    const stream = [
      'BT /F1 14 Tf 72 730 Td (Letter to families) Tj ET',
      // three paragraphs drawn by ONE text object
      'BT /F1 11 Tf 72 700 Td (June 14, 2016) Tj 0 -16 Td (Dear Colleagues:) Tj 0 -16 Td (We are pleased to offer full day care this fall to all families.) Tj ET',
      // one word split across two text objects on the same line
      'BT /F1 11 Tf 72 630 Td (Because students cannot attend school in person, sab) Tj ET',
      'BT /F1 11 Tf 323.6 630 Td (emos how much families rely on it.) Tj ET',
      // a font change in mid-line (the "bold word" case)
      'BT /F1 11 Tf 72 600 Td (The ) Tj /F1 11 Tf (district) Tj ( will decide in 2021.) Tj ET',
      'BT /F1 11 Tf 72 570 Td (We have used about two thirds of the 10.5 million dollars in relief we received.) Tj ET',
      // a SHORT line split mid-word (too short for the near-match pass: only exact matching links it)
      'BT /F1 11 Tf 72 540 Td (Xavier Bot) Tj ET',
      'BT /F1 11 Tf 125.2 540 Td (ana) Tj ET',
    ].join('\n');
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(stream)));
    const src = await doc.save();

    const p = W.AlloModules.createDocPipeline({ callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Letter', state: {} });
    const tagged = await p.createTaggedPdf(src, { accessibleHtml, isScanned: false }, { title: 'Letter', lang: 'en', modDate: '2026-10-16T00:00:00Z' });
    const bytes = tagged.bytes || tagged;

    // ── read it like a screen reader ──
    const out = await PDFDocument.load(bytes);
    const oc = out.context;
    const pageIdx = new Map(out.getPages().map((x, i) => [String(x.ref), i]));
    const pdf = await W.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const mc = new Map();
    for (let pi = 0; pi < pdf.numPages; pi++) {
      const tc = await (await pdf.getPage(pi + 1)).getTextContent({ includeMarkedContent: true });
      const stack: any[] = [];
      for (const it of tc.items as any[]) {
        if (it.type === 'beginMarkedContentProps' || it.type === 'beginMarkedContent') { const m = /_mc(\d+)$/.exec(it.id || ''); stack.push(m ? Number(m[1]) : null); continue; }
        if (it.type === 'endMarkedContent') { stack.pop(); continue; }
        let id = null; for (let k = stack.length - 1; k >= 0; k--) if (stack[k] != null) { id = stack[k]; break; }
        if (id != null) mc.set(pi + ':' + id, (mc.get(pi + ':' + id) || '') + (it.str || ''));
      }
    }
    const look = (v) => { try { return oc.lookup(v) || v; } catch (_) { return v; } };
    const dec = (v) => (v == null ? '' : typeof v.decodeText === 'function' ? v.decodeText() : String(v));
    const below = (n, pi) => {
      n = look(n);
      if (n instanceof PDFNumber) return mc.get(pi + ':' + n.asNumber()) || '';
      if (!(n instanceof PDFDict)) return '';
      if (String(n.get(PDFName.of('Type')) || '') === '/MCR') { const g = n.get(PDFName.of('Pg')); return mc.get((g ? pageIdx.get(String(g)) : pi) + ':' + n.get(PDFName.of('MCID')).asNumber()) || ''; }
      const K = n.get(PDFName.of('K')); if (K == null) return '';
      const kids = look(K) instanceof PDFArray ? look(K).asArray() : [K];
      return kids.map((k) => below(k, pi)).join(' ');
    };
    const reads: any[] = [];
    const visit = (n, pi) => {
      n = look(n);
      if (n instanceof PDFNumber || (n instanceof PDFDict && String(n.get(PDFName.of('Type')) || '') === '/MCR')) { reads.push({ text: below(n, pi), linked: true }); return; }
      if (!(n instanceof PDFDict)) return;
      const at = n.get(PDFName.of('ActualText'));
      if (at != null) { const b = below(n, pi); reads.push({ role: String(n.get(PDFName.of('S'))), text: dec(at), content: b, linked: b.trim().length > 0 }); return; }
      const K = n.get(PDFName.of('K')); if (K == null) return;
      const kids = look(K) instanceof PDFArray ? look(K).asArray() : [K];
      for (const k of kids) visit(k, pi);
    };
    const root = look(out.catalog.get(PDFName.of('StructTreeRoot')));
    const K = root.get(PDFName.of('K'));
    (look(K) instanceof PDFArray ? look(K).asArray() : [K]).forEach((k) => visit(k, 0));
    return reads.filter((r) => r.text && r.text.trim());
  }, accessibleHtml);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const PARAS = ['letter to families', 'june 14, 2016', 'dear colleagues:', 'we are pleased to offer full day care this fall to all families.',
  'because students cannot attend school in person, sabemos how much families rely on it.', 'the district will decide in 2021.', 'xavier botana'];

test.describe('tagged PDF reads each paragraph once', () => {
  test('exact and lightly reworded paragraphs each link to their page text', async ({ page }) => {
    await boot(page);
    const reads = await tagAndRead(page, html('We used about two thirds of the 10.5 million dollars of relief we received.'));
    const spoken = reads.map((r) => norm(r.text));
    for (const p of PARAS) expect(spoken.filter((s) => s === p), 'read exactly once: ' + p).toHaveLength(1);
    expect(spoken.filter((s) => s.includes('two thirds'))).toEqual(['we used about two thirds of the 10.5 million dollars of relief we received.']);
    // every read item is linked to page content (no orphaned replacement text, no raw text read again)
    expect(reads.filter((r) => r.role && !r.linked).map((r) => r.text)).toEqual([]);
    // no replacement text that covers only part of the content it replaces
    expect(reads.filter((r) => r.content && norm(r.text).split(' ').length < 0.6 * norm(r.content).split(' ').length)).toEqual([]);
  });

  test('a changed number never links: the paragraph stays unlinked for review', async ({ page }) => {
    await boot(page);
    // Identical wording except the number, so only the number guard keeps it from linking.
    const reads = await tagAndRead(page, html('We have used about two thirds of the 12.5 million dollars in relief we received.'));
    const changed = reads.find((r) => norm(r.text).includes('12.5 million'));
    expect(changed && changed.linked).toBe(false);
    // and the printed sentence is still available to a screen reader (as page text), not dropped
    expect(reads.some((r) => norm(r.text).includes('10.5 million'))).toBe(true);
  });
});
