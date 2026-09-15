// Historical baseline reproduction only. Requires the recorded pre-fix source below.
// Current source intentionally removes this generated control; it cannot replay this before-state test.
// static-replace-before.json is immutable evidence and must not be overwritten during fixed-source checks.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'doc_pipeline_source.jsx');
const inputPath = path.join(__dirname, 'continuation-replayed-candidate.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const html = fs.readFileSync(inputPath, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const expectedHistoricalSourceSha256 = '7b6391a04185b9f0da51430fd5041d97ec6623d8aef443182c5f97695fe24a2a';
if (hash(source) !== expectedHistoricalSourceSha256) {
  throw new Error('Historical baseline requires pre-fix doc_pipeline_source.jsx SHA256 ' + expectedHistoricalSourceSha256 + '. Current source is different; use static-replace-before.json for recorded baseline facts and the current Chromium report for fixed behavior.');
}
const start = source.indexOf('var _ALLO_MAX_IMPORTED_HTML_CHARS =');
const end = source.indexOf('// Sanitize only model-authored body markup', start);
if (start < 0 || end <= start) throw new Error('Sanitizer source boundaries missing');
const consoleMessages = [];
const vc = new VirtualConsole();
vc.on('jsdomError', error => consoleMessages.push(error.message));
const parser = new JSDOM('', { runScripts: 'outside-only', virtualConsole: vc });
const sanitize = new Function('DOMParser', source.slice(start, end) + '\nreturn _alloSanitizeRemediationHtml;')(parser.window.DOMParser);
const original = new JSDOM(html, { virtualConsole: vc });
const cleanHtml = sanitize(html);
const clean = new JSDOM(cleanHtml, { runScripts: 'dangerously', virtualConsole: vc });
const beforeInput = original.window.document.querySelector('input[type="file"]');
const afterInput = clean.window.document.querySelector('input[type="file"]');
if (!beforeInput || !afterInput) throw new Error('Baseline generated input missing');
const beforeImage = clean.window.document.querySelector('figure img').getAttribute('src');
let fileReaderCalls = 0;
clean.window.FileReader = function () { fileReaderCalls++; };
Object.defineProperty(afterInput, 'files', { value: [new clean.window.File(['test'], 'test.png', { type: 'image/png' })] });
afterInput.dispatchEvent(new clean.window.Event('change', { bubbles: true }));
const result = {
  evidenceClass: 'Historical baseline isolated-DOM reproduction of the production export sanitizer; not a live MCP verdict, real-browser rendering result, or human acceptance.',
  capturedAt: new Date().toISOString(),
  sourcePath: 'doc_pipeline_source.jsx',
  sourceSha256: hash(source),
  candidatePath: 'reports/mcp-calibration-2026-09-12/continuation-replayed-candidate.html',
  candidateSha256: hash(html),
  sanitizer: '_alloSanitizeRemediationHtml',
  method: 'Extract the actual sanitizer and CSS helpers from the captured source; sanitize candidate; assign a test File to the retained generated input; dispatch change while spying on FileReader; compare image source.',
  beforeInputCount: original.window.document.querySelectorAll('input[type="file"]').length,
  afterInputCount: clean.window.document.querySelectorAll('input[type="file"]').length,
  beforeChangeHandlerPresent: !!beforeInput.getAttribute('onchange'),
  afterChangeHandler: afterInput.getAttribute('onchange'),
  visibleLabel: afterInput.parentElement.textContent.trim(),
  fileReaderCalls,
  imageSourceUnchanged: beforeImage === clean.window.document.querySelector('figure img').getAttribute('src'),
  remainingCropButtons: Array.from(clean.window.document.querySelectorAll('button')).filter(button => button.textContent.trim() === 'Adjust Crop').length,
  runtimeLimitations: ['jsdom cannot establish real-browser visual layout or native file-picker behavior; this verifies event-handler removal and resulting image-update behavior.'],
  consoleMessages
};
const output = process.argv[2];
if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(result, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
original.window.close(); clean.window.close(); parser.window.close();
