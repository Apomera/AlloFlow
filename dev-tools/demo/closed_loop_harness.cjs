// closed_loop_harness.cjs — PROVE the "remediate until veraPDF passes" closed loop.
//
// Demonstrates the sweep's #1 finding end-to-end: take a tagged PDF, validate with veraPDF,
// feed each failed rule into a TARGETED repair, re-validate, and loop until green (or a cap).
// To make a clean ❌→✅ demo it first DAMAGES the (passing) scanned fixture — removes a few
// catalog properties — then drives it back to compliant.
//
// Validate = native veraPDF (Java, fast). Repairs = pdf-lib in headless Chromium (matches the
// production path: pdf-lib is already loaded in Canvas; the same recipes run there). A production
// build would swap native veraPDF for the in-Canvas CheerpJ veraPDF + optionally PDFBox repairs.
//
//   node dev-tools/demo/closed_loop_harness.cjs [input.pdf]
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('@playwright/test');

const JAR = 'C:/tmp/verapdf-cli.jar';
const PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const BASE = process.argv[2] || 'C:/tmp/scanned_tagged_out.pdf'; // the passing scanned fixture
const WORK = 'C:/tmp/closed_loop_work.pdf';
const MAX_ITERS = 6;

function validate(path) {
  let json;
  try { json = execSync('java -jar "' + JAR + '" --flavour ua1 --format json "' + path + '"', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { json = (e && e.stdout) ? e.stdout.toString() : ''; }
  const d = JSON.parse(json).report.jobs[0].validationResult[0].details;
  return { failedRules: d.failedRules, passedRules: d.passedRules,
    failed: d.ruleSummaries.filter((r) => r.ruleStatus === 'FAILED').map((r) => ({ clause: r.clause, test: r.testNumber, desc: r.description })) };
}

(async () => {
  if (!fs.existsSync(BASE)) { console.log('Missing base PDF (' + BASE + ') — run scanned_tag_harness.cjs first.'); process.exit(2); }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ url: PDFLIB });
  await page.waitForFunction(() => !!(window.PDFLib && window.PDFLib.PDFDocument), null, { timeout: 30000 });

  const b64in = fs.readFileSync(BASE).toString('base64');

  // ── DAMAGE: strip a few catalog properties so we have real failures to drive to 0. ──
  const damaged = await page.evaluate(async (b64) => {
    const { PDFDocument, PDFName } = window.PDFLib;
    const doc = await PDFDocument.load(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    for (const k of ['ViewerPreferences', 'MarkInfo', 'Lang']) { try { doc.catalog.delete(PDFName.of(k)); } catch (_) {} }
    const out = await doc.save();
    let bin = ''; for (let i = 0; i < out.length; i += 8192) bin += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
    return btoa(bin);
  }, b64in);
  fs.writeFileSync(WORK, Buffer.from(damaged, 'base64'));
  console.log('Damaged the passing fixture (removed ViewerPreferences + MarkInfo + Lang).');

  // ── CLOSED LOOP ──
  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    const v = validate(WORK);
    console.log('\n[iter ' + iter + '] veraPDF → ' + v.failedRules + ' failed rule(s): ' + (v.failed.map((f) => '§' + f.clause + 't' + f.test).join(', ') || 'none'));
    if (v.failedRules === 0) { console.log('✅ CLOSED LOOP CONVERGED — doc is PDF/UA-1 compliant (' + v.passedRules + ' rules).'); break; }
    if (iter === MAX_ITERS) { console.log('⚠ hit iteration cap — remaining rules need richer repair recipes.'); break; }

    const b64work = fs.readFileSync(WORK).toString('base64');
    const res = await page.evaluate(async ({ b64, failures }) => {
      const { PDFDocument, PDFName, PDFBool, PDFString } = window.PDFLib;
      const doc = await PDFDocument.load(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      const cat = doc.catalog;
      const applied = [];
      const ensure = (key) => { let d = cat.lookup(PDFName.of(key)); if (!d || !d.set) { d = doc.context.obj({}); cat.set(PDFName.of(key), d); } return d; };
      for (const f of failures) {
        const id = '§' + f.clause + 't' + f.test;
        if (f.clause === '7.1' && f.test === 10) { ensure('ViewerPreferences').set(PDFName.of('DisplayDocTitle'), PDFBool.True); applied.push(id + ' DisplayDocTitle'); }
        else if (f.clause === '6.2' && f.test === 1) { ensure('MarkInfo').set(PDFName.of('Marked'), PDFBool.True); applied.push(id + ' MarkInfo/Marked'); }
        else if (f.clause === '7.2' || (f.clause === '3.1')) { if (!cat.lookup(PDFName.of('Lang'))) { cat.set(PDFName.of('Lang'), PDFString.of('en')); applied.push(id + ' /Lang'); } }
      }
      const out = await doc.save();
      let bin = ''; for (let i = 0; i < out.length; i += 8192) bin += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
      return { b64: btoa(bin), applied: [...new Set(applied)] };
    }, { b64: b64work, failures: v.failed });

    fs.writeFileSync(WORK, Buffer.from(res.b64, 'base64'));
    console.log('  repaired: ' + (res.applied.join('; ') || '(no recipe for these rules — stopping)'));
    if (!res.applied.length) break;
  }
  await browser.close();
})();
