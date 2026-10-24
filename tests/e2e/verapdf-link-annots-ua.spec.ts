// Link and form-field annotations reach the tag tree with a real description (2026-10-17).
//
// Measured on real documents with veraPDF: every link in a Word-made PDF failed PDF/UA 7.18.1-2,
// 7.18.5-1 and 7.18.5-2, and 199 IRS Form 1040 widgets failed 7.18.4-1 and 7.18.1-3, because
//   - Stage 3b skipped any link that already had /StructParent ("respect source tagging"), but the
//     source tag tree is DISCARDED, so that key was stale: no Link element, no /Contents;
//   - Stages 3 and 3b read /Annots without resolving it, so a page whose /Annots is an INDIRECT
//     array was skipped entirely.
// This spec builds those patterns in a generated PDF, runs the REAL createTaggedPdf in Chromium
// (offline, MCP vendor bundle), checks the structure itself, then runs real veraPDF when Java exists.
import { test, expect } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');

function resolveJava(): string | null {
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { if (spawnSync(j, ['-version'], { encoding: 'utf8' }).status === 0) return j; } catch (_) { /* next */ }
  }
  return null;
}

test.describe.configure({ timeout: 240_000 });

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

test('form fields take their accessible name from the XFA template; form labels with blanks or boxes still link to page text', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFString, PDFArray, PDFDict, PDFRef, PDFNumber } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    pg.drawText('Tax-exempt interest . . . . . . . . 2a', { x: 72, y: 700, size: 12, font });
    pg.drawText('Filing jointly', { x: 72, y: 660, size: 12, font });
    // too short for the reworded-text pass: only the dot-leader / blank fold can link it
    pg.drawText('Wages . . . . . . . . . . . . 1a', { x: 72, y: 620, size: 12, font });
    // IRS-style names: no /TU on the fields, the accessible names live only in the XFA template
    const form = src.getForm();
    form.createTextField('topmostSubform[0].Page1[0].f1_01[0]').addToPage(pg, { x: 360, y: 695, width: 150, height: 18, font });
    form.createCheckBox('topmostSubform[0].Page1[0].c1_1[0]').addToPage(pg, { x: 360, y: 655, width: 14, height: 14 });
    const xml = '<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="topmostSubform"><subform name="Page1">'
      + '<field name="f1_01"><assist><toolTip>Tax-exempt interest, line 2a</toolTip></assist></field>'
      + '<field name="c1_1"><assist><speak disable="1">Check if filing jointly</speak></assist></field></subform></subform></template>';
    // pdf-lib strips XFA from any document whose form it has touched, so add it to a fresh load
    const withXfa = await PDFDocument.load(await src.save());
    const ctx = withXfa.context;
    ctx.lookup(withXfa.catalog.get(PDFName.of('AcroForm'))).set(PDFName.of('XFA'), ctx.obj([PDFString.of('template'), ctx.register(ctx.stream(xml))]));
    const srcBytes = await withXfa.save({ updateFieldAppearances: false });
    const reread = await PDFDocument.load(srcBytes);
    if (!reread.context.lookup(reread.catalog.get(PDFName.of('AcroForm'))).get(PDFName.of('XFA'))) throw new Error('fixture lost its XFA');
    const box = String.fromCharCode(0x2610);
    const html = '<!DOCTYPE html><html lang="en"><head><title>Form</title></head><body><main><h1>Form</h1>'
      + '<p>Tax-exempt interest: ________ 2a</p><p>' + box + ' Filing jointly</p><p>Wages: ________ 1a</p></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Form', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(srcBytes), { accessibleHtml: html }, { title: 'Form', lang: 'en' });
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const dec = (v: any) => (v && typeof v.decodeText === 'function' ? v.decodeText() : null);
    const tus = doc.getForm().getFields().map((f: any) => dec(f.acroField.dict.get(PDFName.of('TU'))));
    const alts: string[] = []; const leaves: any[] = [];
    const walk = (v: any) => {
      const n = look(v);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const S = String(n.get(PDFName.of('S')) || '');
      if (S === '/Form') alts.push(dec(n.get(PDFName.of('Alt'))));
      const at = dec(n.get(PDFName.of('ActualText')));
      const K = n.get(PDFName.of('K'));
      if (at != null) {
        const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
        leaves.push({ text: at, linked: kids.some((k: any) => { const d = look(k); return d instanceof PDFNumber || (d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/MCR'); }) });
      }
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return { tus, alts, leaves };
  });
  expect(res.tus).toEqual(['Tax-exempt interest, line 2a', 'Check if filing jointly']);
  expect(res.alts.sort()).toEqual(['Check if filing jointly', 'Tax-exempt interest, line 2a']);
  for (const want of ['Tax-exempt interest', 'Filing jointly', 'Wages']) {
    const leaf = res.leaves.find((l: any) => l.text.includes(want));
    expect(leaf, want).toBeTruthy();
    expect(leaf.linked, want + ' links to the page text despite the blank / box').toBe(true);
  }
});

test('a form field with no appearance gets one drawn in an EMBEDDED font (veraPDF 7.21.4.1)', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFDict, PDFRef, PDFArray } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const pg = src.addPage([612, 792]);
    pg.drawText('Your name', { x: 72, y: 700, size: 12, font });
    const tf = src.getForm().createTextField('applicant.name');
    tf.setText('Ada');
    tf.addToPage(pg, { x: 150, y: 695, width: 200, height: 18, font });
    // like IRS 1040's widget 680: no appearance stream, so whoever saves must draw one
    for (const w of tf.acroField.getWidgets()) w.dict.delete(PDFName.of('AP'));
    const srcBytes = await src.save({ updateFieldAppearances: false });
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Form', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(srcBytes), { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Form</title></head><body><main><p>Your name</p></main></body></html>' }, { title: 'Form', lang: 'en' });
    const doc = await PDFDocument.load(tagged.bytes || tagged); const c = doc.context;
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const fonts: any[] = [];
    for (const p of doc.getPages()) {
      const annots = look(p.node.get(PDFName.of('Annots')));
      for (const ar of (annots instanceof PDFArray ? annots.asArray() : [])) {
        const a = look(ar); if (String(a.get(PDFName.of('Subtype'))) !== '/Widget') continue;
        const ap = look(a.get(PDFName.of('AP'))); const n = ap ? look(ap.get(PDFName.of('N'))) : null;
        const res = n && n.dict ? look(n.dict.get(PDFName.of('Resources'))) : null;
        const fd = res ? look(res.get(PDFName.of('Font'))) : null;
        if (!(fd instanceof PDFDict)) { fonts.push({ hasAppearance: !!n, font: null }); continue; }
        for (const [, fr] of fd.entries()) {
          const f = look(fr); let desc = look(f.get(PDFName.of('FontDescriptor')));
          const dfs = look(f.get(PDFName.of('DescendantFonts')));
          if (!desc && dfs instanceof PDFArray) desc = look(look(dfs.get(0)).get(PDFName.of('FontDescriptor')));
          const embedded = !!(desc && (desc.get(PDFName.of('FontFile')) || desc.get(PDFName.of('FontFile2')) || desc.get(PDFName.of('FontFile3'))));
          fonts.push({ hasAppearance: true, font: String(f.get(PDFName.of('BaseFont'))), embedded });
        }
      }
    }
    return fonts;
  });
  expect(res.length, JSON.stringify(res)).toBeGreaterThan(0);
  for (const f of res) expect(f, JSON.stringify(res)).toMatchObject({ hasAppearance: true, embedded: true });
});

test('links and form fields: description, Link/Form element with OBJR, fresh ParentTree keys; veraPDF 7.18.x clean', async ({ page }) => {
  await boot(page);

  const res = await page.evaluate(async () => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName, PDFString, PDFNumber, PDFArray, PDFDict, PDFRef } = W.PDFLib;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const p1 = src.addPage([612, 792]), p2 = src.addPage([612, 792]), p3 = src.addPage([612, 792]);
    const sz = 12, w = (s: string) => font.widthOfTextAtSize(s, sz);
    const line = (pg: any, y: number, text: string) => pg.drawText(text, { x: 72, y, size: sz, font });
    const rectOver = (y: number, before: string, word: string) => [72 + w(before), y - 3, 72 + w(before) + w(word), y + 10];
    line(p1, 700, 'Read the annual report here.');
    line(p1, 660, 'You can apply online today.');
    line(p1, 620, 'See note 1.');
    line(p2, 700, 'Note 1: details. Write to help@example.com for help.');
    line(p3, 700, 'Your name:');
    const ctx = src.context;
    const uri = (u: string) => ctx.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(u) });
    const link = (rect: number[], extra: any) => ctx.register(ctx.obj(Object.assign({ Type: 'Annot', Subtype: 'Link', Rect: rect, Border: [0, 0, 0] }, extra)));
    // stale /StructParent values a source tag tree left behind: 0 collides with OUR page key 0, 5 dangles
    const a1 = link(rectOver(700, 'Read the ', 'annual report'), { A: uri('https://example.com/report'), StructParent: PDFNumber.of(0) });
    const a2 = link(rectOver(660, 'You can ', 'apply online'), { A: uri('https://example.org/apply?ref=letter'), StructParent: PDFNumber.of(5) });
    const a3 = link(rectOver(620, 'See note ', '1'), { Dest: ctx.obj([p2.ref, PDFName.of('XYZ'), null, null, null]) });
    p1.node.set(PDFName.of('Annots'), ctx.register(ctx.obj([a1, a2, a3]))); // INDIRECT /Annots
    p2.node.set(PDFName.of('Annots'), ctx.obj([link(rectOver(700, 'Note 1: details. Write to ', 'help@example.com'), { A: uri('mailto:help@example.com') })]));
    const field = src.getForm().createTextField('applicant.name');
    field.addToPage(p3, { x: 150, y: 695, width: 200, height: 18, font });
    const p3Annots = p3.node.get(PDFName.of('Annots'));
    p3.node.set(PDFName.of('Annots'), ctx.register(ctx.lookup(p3Annots) || p3Annots)); // INDIRECT /Annots with a widget
    const srcBytes = await src.save();
    const html = '<!DOCTYPE html><html lang="en"><head><title>Links</title></head><body><main><h1>Links</h1>'
      + '<p>Read the <a href="https://example.com/report">annual report</a> here.</p><p>You can apply online today.</p><p>See note 1.</p>'
      + '<p>Note 1: details. Write to <a href="mailto:help@example.com">help@example.com</a> for help.</p>'
      + '<p><label>Your name: <input type="text" name="applicant.name"></label></p></main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Links', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(srcBytes), { accessibleHtml: html }, { title: 'Links', lang: 'en' });
    const bytes: Uint8Array = tagged.bytes || tagged;

    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
    const root = look(doc.catalog.get(PDFName.of('StructTreeRoot')));
    const pt = new Map();
    const nums = look(look(root.get(PDFName.of('ParentTree'))).get(PDFName.of('Nums')));
    for (let i = 0; i + 1 < nums.size(); i += 2) pt.set(look(nums.get(i)).asNumber(), nums.get(i + 1));
    const reach = new Set();
    const walk = (v: any) => { const n = look(v); if (n instanceof PDFArray) { n.asArray().forEach(walk); return; } if (!(n instanceof PDFDict)) return; if (v instanceof PDFRef) { if (reach.has(String(v))) return; reach.add(String(v)); } const K = n.get(PDFName.of('K')); if (K != null) walk(K); };
    walk(root.get(PDFName.of('K')));
    const pageKeys = new Set(doc.getPages().map((p: any) => p.node.get(PDFName.of('StructParents'))).filter((x: any) => x != null).map((x: any) => look(x).asNumber()));
    const annots: any[] = [];
    for (const pg of doc.getPages()) {
      const arr = look(pg.node.get(PDFName.of('Annots')));
      for (const ar of (arr ? arr.asArray() : [])) {
        const a = look(ar); const sub = String(a.get(PDFName.of('Subtype')));
        const ct = a.get(PDFName.of('Contents'));
        const sp = a.get(PDFName.of('StructParent')); const key = sp != null ? look(sp).asNumber() : null;
        const elRef = key != null ? pt.get(key) : null; const el = elRef ? look(elRef) : null;
        let objr = false; let role = '';
        if (el instanceof PDFDict) {
          role = String(el.get(PDFName.of('S')));
          const K = look(el.get(PDFName.of('K'))); const kids = K instanceof PDFArray ? K.asArray() : [K];
          objr = kids.some((k: any) => { const d = look(k); return d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/OBJR' && String(d.get(PDFName.of('Obj'))) === String(ar); });
        }
        annots.push({ sub, contents: ct ? ct.decodeText() : null, role, objr, reachable: !!elRef && reach.has(String(elRef)), collides: key != null && pageKeys.has(key) });
      }
    }
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as number[]);
    return { annots, linkAnnotsTagged: tagged.summary && tagged.summary.linkAnnotsTagged, b64: btoa(s) };
  });

  const links = res.annots.filter((a: any) => a.sub === '/Link');
  // the link's own words: the HTML anchor, else the words drawn under it; an internal link says where it goes
  expect(links.map((l: any) => l.contents)).toEqual(['annual report', 'apply online', '1 (go to page 2)', 'help@example.com']);
  expect(res.linkAnnotsTagged).toBe(4);
  for (const a of res.annots) {
    expect(a, JSON.stringify(a)).toMatchObject({ objr: true, reachable: true, collides: false });
    expect(a.role).toBe(a.sub === '/Link' ? '/Link' : '/Form');
  }
  expect(res.annots.filter((a: any) => a.sub === '/Widget')).toHaveLength(1);

  const java = resolveJava();
  test.skip(!java, 'No Java runtime available for veraPDF (structural checks above still ran)');
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-links-')), 'links.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(res.b64, 'base64'));
  let out = '';
  try {
    out = execFileSync(java!, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '50', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e: any) { out = String(e?.stdout || ''); if (!out) throw e; }
  const report = JSON.parse(out);
  const jobs = report?.report?.jobs || report?.jobs || [];
  const vr = Array.isArray(jobs[0]?.validationResult) ? jobs[0].validationResult[0] : jobs[0]?.validationResult;
  const details = vr?.details;
  const rules: any[] = details?.ruleSummaries || [];
  // a fully compliant file has no failed-rule summaries; anything else must report its rules
  expect(rules.length > 0 || vr?.compliant === true, 'veraPDF produced a verdict').toBe(true);
  const annotFails = rules.filter((r) => String(r.clause).startsWith('7.18') && Number(r.failedChecks) > 0)
    .map((r) => `${r.clause}-${r.testNumber} x${r.failedChecks}`);
  expect(annotFails, 'PDF/UA 7.18 (annotations) failures').toEqual([]);
});
