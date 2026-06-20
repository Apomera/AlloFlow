// P3 reconciliation: walk the ACTUAL StructTree of a tagged PDF (built by the real pipeline) to
// empirically check the static-analysis claims — (a) scanned pages multiply-claim MCID 0, and
// (b) the top-level structure is doubled (semantic tree + page Sect tree as siblings).
// Loads pdf-lib from CDN in headless Chromium (same pattern as the harnesses).
//   node dev-tools/demo/inspect_structtree.cjs [path-to.pdf]
const fs = require('fs');
const { chromium } = require('@playwright/test');
const PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDF = process.argv[2] || 'C:/tmp/scanned_tagged_out.pdf';

(async () => {
  if (!fs.existsSync(PDF)) { console.log('missing ' + PDF); process.exit(2); }
  const b64 = fs.readFileSync(PDF).toString('base64');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ url: PDFLIB });
  await page.waitForFunction(() => !!(window.PDFLib && window.PDFLib.PDFDocument), null, { timeout: 30000 });

  const out = await page.evaluate(async (b64) => {
    const { PDFDocument, PDFName, PDFNumber, PDFDict, PDFArray, PDFRef } = window.PDFLib;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const doc = await PDFDocument.load(bytes);
    const ctx = doc.context, cat = doc.catalog;
    const stRoot = cat.lookup(PDFName.of('StructTreeRoot'), PDFDict);
    if (!stRoot) return { error: 'no StructTreeRoot' };

    const pages = doc.getPages();
    const pageIdx = new Map();
    pages.forEach((p, i) => pageIdx.set(p.ref.toString(), i));

    const owners = {};          // "pgIdx:mcid" -> [roles]
    const topRoles = [];        // immediate children roles of StructTreeRoot
    let mcCount = 0;

    const deref = (v) => (v instanceof PDFRef ? ctx.lookup(v) : v);
    const sname = (d, k) => { const v = d.get(PDFName.of(k)); return v ? v.toString() : null; };
    const record = (pgRaw, mcidRaw, role) => {
      const m = deref(mcidRaw);
      let mcid = m instanceof PDFNumber ? m.asNumber() : (typeof mcidRaw === 'number' ? mcidRaw : null);
      if (mcid == null) return;
      let pg = (pgRaw instanceof PDFRef && pageIdx.has(pgRaw.toString())) ? pageIdx.get(pgRaw.toString()) : '?';
      const key = pg + ':' + mcid;
      (owners[key] = owners[key] || []).push(role || '?');
      mcCount++;
    };

    function walkElem(elem, inhPg, top) {
      elem = deref(elem);
      if (!(elem instanceof PDFDict)) return;
      const type = sname(elem, 'Type');
      if (type === '/OBJR') return;
      if (type === '/MCR') { record(elem.get(PDFName.of('Pg')) || inhPg, elem.get(PDFName.of('MCID')), '(MCR)'); return; }
      const role = sname(elem, 'S');
      if (top && role) topRoles.push(role);
      const pg = elem.get(PDFName.of('Pg')) || inhPg;
      walkK(elem.get(PDFName.of('K')), pg, role);
    }
    function walkK(k, pg, role) {
      if (k == null) return;
      k = deref(k);
      if (k instanceof PDFNumber) { record(pg, k, role); return; }
      if (k instanceof PDFArray) { k.asArray().forEach((e) => walkK(e, pg, role)); return; }
      if (k instanceof PDFDict) {
        const type = sname(k, 'Type');
        if (type === '/MCR') { record(k.get(PDFName.of('Pg')) || pg, k.get(PDFName.of('MCID')), role); return; }
        if (type === '/OBJR') return;
        walkElem(k, pg, false);
      }
    }

    const topK = deref(stRoot.get(PDFName.of('K')));
    if (topK instanceof PDFArray) topK.asArray().forEach((e) => walkElem(e, null, true));
    else walkElem(topK, null, true);

    let ptInfo = 'none';
    try { const pt = stRoot.lookup(PDFName.of('ParentTree'), PDFDict); const nums = pt && pt.lookup(PDFName.of('Nums'), PDFArray); if (nums) ptInfo = 'Nums entries: ' + (nums.asArray().length / 2); } catch (e) {}

    const dups = Object.entries(owners).filter(([k, v]) => v.length > 1).map(([k, v]) => ({ pageMcid: k, owners: v }));
    return { pages: pages.length, topRoles, distinctMC: Object.keys(owners).length, totalMCrefs: mcCount, multiplyClaimed: dups.length, dups: dups.slice(0, 25), parentTree: ptInfo };
  }, b64);

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
