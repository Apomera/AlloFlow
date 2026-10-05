const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const LOCAL = path.join(__dirname, 'guide-revision-validation');
const [attempt, MODULE, SOURCE] = process.argv.slice(2);
if (!/^natural-editor-probe-[0-9]+$/.test(attempt || '') || !/^[a-f0-9]{64}$/.test(MODULE || '') || !/^[a-f0-9]{64}$/.test(SOURCE || '')) throw Error('Explicit attempt and frozen SHA-256 identities required');
const OUT = path.join(LOCAL, attempt);
const SPEC = '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4';
const PRODUCER_MODULE = '0ceb5207851a88db30562486dd838e6efbf126cc0e8a7dee7ddc14340864af7c';
const CSS = 'b104c6faca4db538b15c97b19fb5176ffa02308a82f3a3c5e3df8d0c3537b163';
const HTML = '078937f26696db4b8fa0648f503db50f64a93d400418021b95f9c731c2d17b24';
const sha = body => crypto.createHash('sha256').update(body).digest('hex');
for (const [file, expected] of [['maine_sld_practice_module.js', MODULE], ['maine_sld_practice_source.jsx', SOURCE], ['tests/e2e/maine-sld-practice.spec.ts', SPEC]]) if (sha(fs.readFileSync(path.join(ROOT, file))) !== expected) throw Error('Freeze changed: ' + file);
if (fs.existsSync(OUT)) throw Error('Probe attempt already exists');
const producer = path.join(LOCAL, 'natural-editor-assets');
const assetIdentity = JSON.parse(fs.readFileSync(path.join(producer, 'asset-identity.json'), 'utf8'));
const candidate = JSON.parse(fs.readFileSync(path.join(LOCAL, 'module-five-01/browser/browser-candidate.json'), 'utf8'));
const html = fs.readFileSync(path.join(producer, 'host.html')), css = fs.readFileSync(path.join(producer, 'tailwind.css'));
if (candidate.moduleSha256 !== PRODUCER_MODULE || assetIdentity.moduleSha256 !== PRODUCER_MODULE || sha(html) !== HTML || sha(css) !== CSS || assetIdentity.responses['/__host'].sha256 !== HTML || assetIdentity.responses['/__tw.css'].sha256 !== CSS) throw Error('Retained producer asset binding changed');
fs.mkdirSync(OUT, {recursive: true});
fs.copyFileSync(__filename, path.join(OUT, 'capture-helper.cjs'));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/__host') { res.writeHead(200, {'content-type': 'text/html'}); res.end(html); return; }
  if (url.pathname === '/__tw.css') { res.writeHead(200, {'content-type': 'text/css'}); res.end(css); return; }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(path.resolve(ROOT) + path.sep)) { res.writeHead(403); res.end(); return; }
  try { res.writeHead(200, {'content-type': path.extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream'}); res.end(fs.readFileSync(file)); } catch { res.writeHead(404); res.end(); }
});
const measure = page => page.evaluate(() => {
  const main = document.querySelector('.msld-main'), writer = document.querySelector('[data-testid="q9-note"]'), button = document.querySelector('[data-testid="guide-return-q9"]');
  const rect = node => { const b = node.getBoundingClientRect(); return {top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height, width: b.width}; };
  const m = rect(main), w = rect(writer), r = rect(button);
  return {viewport: {width: innerWidth, height: innerHeight}, main: m, writer: w, returnButton: r, mainClientHeight: main.clientHeight, mainScrollTop: main.scrollTop, writerReturnSpanPx: Math.max(w.bottom, r.bottom) - Math.min(w.top, r.top), writerFullyVisible: w.top >= m.top && w.bottom <= m.bottom, returnFullyVisible: r.top >= m.top && r.bottom <= m.bottom, writerTopMarginPx: w.top - m.top, returnBottomMarginPx: m.bottom - r.bottom, activeControl: document.activeElement?.getAttribute('data-testid'), writerFocused: document.activeElement === writer, selectionStart: writer.selectionStart, selectionEnd: writer.selectionEnd, value: writer.value, manualReturnScroll: false, manualWriterFocus: false};
});
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
let browser;
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const {chromium} = require(path.join(ROOT, 'node_modules', '@playwright', 'test'));
    browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 844, height: 390}});
    await page.goto('http://127.0.0.1:' + server.address().port + '/__host?tool=maine-sld-practice&case=taylor');
    await page.evaluate(() => window.__mount('dark'));
    await page.getByTestId('step-debrief').click(); await page.getByTestId('reveal-debrief').click(); await page.getByTestId('revise-guide-q9').click();
    await settle(page);
    const before = await measure(page);
    await page.screenshot({path: path.join(OUT, 'taylor-q9-natural-source-focus-844x390-dark.png'), fullPage: false});
    const note = '  Participant taylor Q9 revised evidence.\n<mark data-guide-revision="literal">Keep this as text</mark>\nRemaining uncertainty is recorded here.  ';
    await page.getByTestId('q9-note').fill(note); await settle(page);
    const after = await measure(page);
    await page.screenshot({path: path.join(OUT, 'taylor-q9-natural-after-fill-844x390-dark.png'), fullPage: false});
    const append = ' Reviewed.';
    await page.keyboard.type(append); await settle(page);
    const typed = await measure(page);
    await page.screenshot({path: path.join(OUT, 'taylor-q9-natural-after-keyboard-844x390-dark.png'), fullPage: false});
    const checks = {naturalAfterFillBothFullyVisible: after.writerFullyVisible && after.returnFullyVisible && after.writerFocused, sevenPixelMargins: after.writerTopMarginPx >= 7 && after.returnBottomMarginPx >= 7, literalValuePreserved: after.value === note, selectionPreservedThroughFocusScroll: after.selectionStart === note.length && after.selectionEnd === note.length, keyboardAppendPreserved: typed.value === note + append && typed.selectionStart === note.length + append.length && typed.selectionEnd === note.length + append.length && typed.writerFocused, noAdditionalMainScrollWhileTyping: typed.mainScrollTop === after.mainScrollTop, afterKeyboardBothFullyVisible: typed.writerFullyVisible && typed.returnFullyVisible};
    const evidence = {moduleSha256: MODULE, sourceSha256: SOURCE, browserTestSha256: SPEC, producerModuleSha256: PRODUCER_MODULE, producerCssSha256: CSS, producerHtmlSha256: HTML, traceAssetIdentity: assetIdentity, producerCandidate: candidate, rawHtmlJsBodyMissingLimit: true, assetReuseScope: 'capture-only geometry probe; current served module/source guarded independently, prior trace stylesheet and HTML retained; trace JavaScript response body absent', probeHelperSha256: sha(fs.readFileSync(__filename)), noSuiteNoAxeNoCssCompilation: true, naturalSourceFocus: before, naturalAfterFill: after, naturalAfterKeyboard: typed, checks};
    fs.writeFileSync(path.join(OUT, 'capture-evidence.json'), JSON.stringify(evidence, null, 2));
    process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
    if (Object.values(checks).some(value => !value)) throw Error('Corrected natural editor probe did not satisfy all geometry/focus/selection checks');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1; });
