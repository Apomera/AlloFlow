// scanned_tag_harness.cjs — headless tag → native-veraPDF closed loop for the SCANNED path.
//
// Generates an image-only "scanned" page + OCR word data, runs the REAL createTaggedPdf
// (Chromium + pdf-lib@1.17.1 + the local doc_pipeline_module.js) on it, writes the tagged
// bytes, and validates with native veraPDF (Java). Lets us iterate the scanned-tagging fix
// and prove §7.1/§7.21.4.1 ❌→✅ before it touches the live tagger.
//
//   node dev-tools/demo/scanned_tag_harness.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('@playwright/test');

const REPO = path.resolve(__dirname, '../..');
const MODULE_PATH = path.join(REPO, 'doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const JAR = 'C:/tmp/verapdf-cli.jar';
const OUT = 'C:/tmp/scanned_tagged_out.pdf';
const PAGES = parseInt(process.env.PAGES || '1', 10); // PAGES=8 to mirror a real multi-page scan

// minimal valid 1×1 white PNG — drawn to fill the page as the "scan"
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const ACCESSIBLE_HTML = `<!DOCTYPE html><html lang="en"><head><title>Scanned Tagging Test</title></head>
<body><main id="main-content" role="main">
<h1>Assessment Procedures</h1>
<p>A list of assessment procedures follows the Reason for Referral, identifying the measures selected.</p>
<h2>Background Information</h2>
<p>The Background Information section provides detailed elaboration of the Reason for Referral.</p>
<table><thead><tr><th scope="col">Reason for referral</th><th scope="col">Background information</th></tr></thead>
<tbody><tr><td>Louise rarely completes seatwork or homework</td><td>What are the consequences of not submitting work?</td></tr>
<tr><td>Tyrone dislikes school and pleads to stay home</td><td>How many absences has he had this year?</td></tr></tbody></table>
<p>Assessment data from secondary sources belong in Background Information.</p>
</main></body></html>`;

// OCR words (PDF points, origin TOP-LEFT) — a handful spanning the page, English (→ Helvetica path).
const LINES = [
  'Assessment Procedures',
  'A list of assessment procedures follows the Reason for Referral',
  'Background Information',
  'The Background Information section provides detailed elaboration',
  'Assessment data from secondary sources belong in Background Information',
];
const WORDS = [];
let yy = 90;
for (const ln of LINES) {
  let xx = 72;
  for (const wt of ln.split(' ')) {
    const w = wt.length * 6;
    WORDS.push({ x0: xx, y0: yy, x1: xx + w, y1: yy + 12, text: wt, c: 95 });
    xx += w + 4;
  }
  yy += 22;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  await page.goto('about:blank');
  await page.addScriptTag({ url: PDFLIB_CDN });
  await page.waitForFunction(() => !!(window.PDFLib && window.PDFLib.PDFDocument), null, { timeout: 30000 });
  await page.addScriptTag({ path: MODULE_PATH });
  await page.waitForFunction(() => !!(window.AlloModules && window.AlloModules.createDocPipeline), null, { timeout: 20000 });

  const result = await page.evaluate(async ({ html, words, png, pages }) => {
    const { PDFDocument } = window.PDFLib;
    const b2b64 = (bytes) => { let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(bin); };
    try {
      // 1) image-only "scanned" doc with N pages
      const src = await PDFDocument.create();
      const imgBytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      const img = await src.embedPng(imgBytes);
      const groundTruthPages = [];
      for (let _p = 1; _p <= pages; _p++) {
        const pg = src.addPage([612, 792]);
        pg.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
        groundTruthPages.push({ pageNum: _p, pageW: 612, pageH: 792, text: words.map((w) => w.text).join(' '), words: words });
      }
      const scannedBytes = await src.save();

      // 2) tag via the real pipeline (scanned path)
      const pipeline = window.AlloModules.createDocPipeline({
        callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
        addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
        getDefaultTitle: () => 'Document', state: {},
      });
      if (typeof pipeline.createTaggedPdf !== 'function') return { error: 'no createTaggedPdf export' };
      const fixResult = { isScanned: true, accessibleHtml: html, groundTruthPages: groundTruthPages };
      const res = await pipeline.createTaggedPdf(scannedBytes, fixResult, { title: 'Scanned Tagging Test', lang: 'en' });
      if (!res || !res.bytes) return { error: 'createTaggedPdf returned no bytes' };
      return { ok: true, b64: b2b64(res.bytes), selfCheck: (res.postExportValidator && res.postExportValidator.summary) || null };
    } catch (e) { return { error: String((e && (e.stack || e.message)) || e) }; }
  }, { html: ACCESSIBLE_HTML, words: WORDS, png: PNG_1x1, pages: PAGES });

  await browser.close();
  if (!result || result.error) { console.log('TAG ERROR:', result && result.error); if (errs.length) console.log('page errors:\n' + errs.slice(0, 5).join('\n')); process.exit(1); }
  fs.writeFileSync(OUT, Buffer.from(result.b64, 'base64'));
  console.log('✓ tagged PDF written: ' + OUT + ' (' + fs.statSync(OUT).size + ' bytes)');
  console.log('  self-check summary: ' + JSON.stringify(result.selfCheck));

  console.log('\n=== native veraPDF (PDF/UA-1) ===');
  try {
    // veraPDF CLI exits non-zero when the doc is NON-compliant — execSync throws, but the JSON is
    // still on stdout. Capture it from the error so a failing validation reports its rules.
    let json;
    try { json = execSync('java -jar "' + JAR + '" --flavour ua1 --format json "' + OUT + '"', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { json = (e && e.stdout) ? e.stdout.toString() : ''; }
    if (!json) { console.log('(no veraPDF output)'); return; }
    const j = JSON.parse(json);
    const vr = j.report.jobs[0].validationResult[0];
    const d = vr.details;
    console.log('compliant=' + vr.isCompliant + ' | passedRules=' + d.passedRules + ' failedRules=' + d.failedRules + ' failedChecks=' + d.failedChecks);
    for (const r of d.ruleSummaries) if (r.ruleStatus === 'FAILED') {
      const ch = (r.checks || [])[0] || {};
      console.log('  FAIL §' + r.clause + ' t' + r.testNumber + ' [' + r.failedChecks + ' checks] ' + r.description.slice(0, 64));
      if (ch.context) console.log('       ctx: ' + String(ch.context).slice(0, 90));
    }
    // ── Regression GATE ── A scanned doc tagged by createTaggedPdf MUST stay PDF/UA-1 compliant.
    // Exit non-zero on any failed rule so this can run as a pre-deploy guard against silently
    // re-breaking the scanned-tagging fix (image→/Artifact + embedded font + MCID-indexed ParentTree).
    // Run before deploying any createTaggedPdf change:  node dev-tools/demo/scanned_tag_harness.cjs
    if (d.failedRules === 0 && d.failedChecks === 0) {
      console.log('\n✅ GATE PASS — scanned tagged PDF is PDF/UA-1 compliant (0 failures, ' + d.passedRules + ' rules passed).');
      process.exit(0);
    }
    console.log('\n❌ GATE FAIL — scanned tagging REGRESSED: ' + d.failedRules + ' rule(s) / ' + d.failedChecks + ' check(s) failed (see above).');
    process.exit(1);
  } catch (e) { console.log('veraPDF run error: ' + String(e.message || e).slice(0, 300)); process.exit(2); }
})();
