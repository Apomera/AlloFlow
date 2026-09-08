'use strict';
// Report-only integration probe. All application code and libraries load from this repository.
// This exercises the actual exported coordinator, slide handler, Office builder, and PptxGenJS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'run'));
if (fs.existsSync(out)) throw new Error('Use a new output directory: ' + out);
fs.mkdirSync(out, { recursive: true });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const modulePaths = [
  'desktop/web-app/node_modules/react/umd/react.development.js',
  'desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js',
  'export_module.js', 'export_handlers_module.js', 'view_pdf_audit_module.js',
];
const mediaPath = 'allopacks/media/water_cycle_grade6/wc-img-cycle-diagram.png';
const media = fs.readFileSync(path.join(root, mediaPath));
const fixture = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Water cycle lesson</title></head><body><main>' +
  '<h1 id="lesson-title" contenteditable="true">Original classroom lesson</h1>' +
  '<p id="lesson-value" contenteditable="true">OLD_PREVIEW_VALUE_10</p>' +
  '<p>Equation check: <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>42</mn></math></p>' +
  '<ol><li>Observe the covered cup.</li><li>Record the number of droplets.</li></ol>' +
  '<h2>Observation table</h2><table><caption>Classroom observations</caption><tr><th scope="col">Measurement</th><th scope="col">Value</th></tr><tr><th scope="row">Droplets</th><td id="table-value" contenteditable="true">10</td></tr></table>' +
  '<h2>Water cycle diagram</h2><figure><img src="data:image/png;base64,' + media.toString('base64') + '" width="1024" height="1024" alt="Water cycle diagram showing evaporation, condensation, precipitation, and collection"><figcaption>Discuss the movement of water.</figcaption></figure>' +
  '<span class="a11y-inspect-badge">EDITOR_CHROME_MUST_NOT_EXPORT</span></main></body></html>';
fs.writeFileSync(path.join(out, 'original-preview.html'), fixture, { flag: 'wx' });
let browser;
(async () => {
  const network = [], consoleMessages = [], pageErrors = [];
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => {
    if (route.request().url() === 'https://builder-artifact.test/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Local artifact probe</title></head><body><iframe id="preview" title="Synthetic editable lesson"></iframe></body></html>' });
    network.push(route.request().url()); return route.abort();
  });
  await page.goto('https://builder-artifact.test/');
  for (const file of modulePaths) await page.addScriptTag({ path: path.join(root, file) });
  await page.evaluate(html => {
    const doc = document.getElementById('preview').contentDocument;
    doc.open(); doc.write(html); doc.close();
  }, fixture);
  const frame = page.frameLocator('#preview');
  await frame.locator('#lesson-title').fill('LIVE_EDITED_LESSON');
  await frame.locator('#lesson-value').fill('LIVE_VALUE_42');
  await frame.locator('#table-value').fill('42');
  const liveHtml = await page.evaluate(() => '<!doctype html>' + document.getElementById('preview').contentDocument.documentElement.outerHTML);
  fs.writeFileSync(path.join(out, 'live-edited-preview.html'), liveHtml, { flag: 'wx' });
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  const routeResult = await page.evaluate(async () => {
    const toasts = [], closes = [], officeCalls = [], slideCalls = [];
    const noop = () => {};
    const oldHistory = [{ type: 'simplified', data: 'OLD_HISTORY_VALUE_10' }];
    const realOfficeBuild = window.AlloModules.AccessibleOfficeExport.build;
    window.AlloModules.AccessibleOfficeExport.build = async args => {
      const result = await realOfficeBuild(args);
      officeCalls.push({ format: args.format, title: args.title, hasCurrentValue: args.html.includes('LIVE_VALUE_42'), hasOldPreview: args.html.includes('OLD_PREVIEW_VALUE_10'), hasOldHistory: args.html.includes('OLD_HISTORY_VALUE_10'), hasEditorChrome: args.html.includes('EDITOR_CHROME_MUST_NOT_EXPORT'), counts: result.counts, message: result.message, blobBytes: result.blob.size });
      return result;
    };
    const handler = window.AlloModules.createExport({
      liveRef: { current: { history: oldHistory, sourceTopic: 'History source topic', gradeLevel: '6', addToast: (text, type) => toasts.push({ text, type }), t: key => key } },
      warnLog: noop, debugLog: noop, escapeXml: text => text, generateUUID: () => 'synthetic-id',
    });
    let fallbackCalls = 0;
    const succeeded = await window.AlloModules.ExportHandlers.executeExportFromPreview({
      _docPipeline: {}, addToast: (text, type) => toasts.push({ text, type }), t: key => key,
      exportPreviewMode: 'slides', exportPreviewRef: { current: document.getElementById('preview') },
      generateFullPackHTML: () => { fallbackCalls++; return '<p>OLD_HISTORY_VALUE_10</p>'; },
      getExportableHistory: () => oldHistory, getSkippedResources: () => [], sourceTopic: 'History source topic',
      studentResponses: {}, exportConfig: {}, history: oldHistory,
      setShowExportPreview: value => closes.push(value),
      handleExportSlides: options => { slideCalls.push({ hasLiveHtml: typeof options.liveHtml === 'string', title: options.liveTitle }); return handler.handleExportSlides(options); },
    });
    return { succeeded, fallbackCalls, officeCalls, slideCalls, toasts, closes, libraryVersion: new window.PptxGenJS().version };
  });
  assert.equal(routeResult.succeeded, true, JSON.stringify(routeResult));
  const download = await downloadPromise;
  const artifactPath = path.join(out, 'live-edited-education.pptx');
  await download.saveAs(artifactPath);
  assert.equal(await download.failure(), null);
  const bytes = fs.readFileSync(artifactPath), zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const names = Object.keys(zip.files);
  const slideNames = names.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
  const slides = await Promise.all(slideNames.map(async name => ({ name, xml: await zip.file(name).async('string') })));
  const allSlideXml = slides.map(slide => slide.xml).join('\n');
  const xmlParts = await Promise.all(names.filter(name => /\.(xml|rels)$/.test(name)).map(name => zip.file(name).async('string')));
  const allXml = xmlParts.join('\n');
  const mediaNames = names.filter(name => /^ppt\/media\/[^/]+$/.test(name));
  const mediaEntries = await Promise.all(mediaNames.map(async name => { const value = await zip.file(name).async('nodebuffer'); return { name, bytes: value.length, sha256: sha(value), exactSourceBytes: value.equals(media) }; }));
  const observations = {
    validZipWithCRC: true,
    slideCount: slides.length,
    editedHeading: allSlideXml.includes('LIVE_EDITED_LESSON'), editedValue: allSlideXml.includes('LIVE_VALUE_42'),
    oldPreviewAbsent: !allXml.includes('OLD_PREVIEW_VALUE_10'), oldHistoryAbsent: !allXml.includes('OLD_HISTORY_VALUE_10'), editorChromeAbsent: !allXml.includes('EDITOR_CHROME_MUST_NOT_EXPORT'),
    nativeTable: allSlideXml.includes('<a:tbl>'), correctedTableValue: /<a:t>42<\/a:t>/.test(allSlideXml),
    diagramDescription: allSlideXml.includes('Water cycle diagram showing evaporation, condensation, precipitation, and collection'),
    exactDiagramBytesEmbedded: mediaEntries.some(entry => entry.exactSourceBytes),
    equationTextRetained: allSlideXml.includes('Equation check: x=42'), nativeMathObject: /<(?:m:)?oMath\b/.test(allSlideXml),
  };
  const checks = {
    coordinatorSucceeded: routeResult.succeeded === true,
    noHistoryFallback: routeResult.fallbackCalls === 0,
    sharedOfficeBranchOnce: routeResult.officeCalls.length === 1 && routeResult.officeCalls[0].format === 'pptx',
    currentHtmlReceived: routeResult.officeCalls[0]?.hasCurrentValue === true && !routeResult.officeCalls[0]?.hasOldPreview && !routeResult.officeCalls[0]?.hasOldHistory,
    threeSlides: observations.slideCount === 3,
    currentValuesInArtifact: observations.editedHeading && observations.editedValue && observations.correctedTableValue,
    obsoleteContentAbsent: observations.oldPreviewAbsent && observations.oldHistoryAbsent && observations.editorChromeAbsent,
    tableAndDiagramRetained: observations.nativeTable && observations.diagramDescription && observations.exactDiagramBytesEmbedded,
    equationTextRetained: observations.equationTextRetained,
    noNetworkRequests: network.length === 0,
    noRuntimeErrors: pageErrors.length === 0,
  };
  const result = {
    schemaVersion: 1, capturedAt: new Date().toISOString(), scope: 'Actual browser download and OOXML evidence for synthetic current-HTML route. No destination application or human AT testing.',
    status: Object.values(checks).every(Boolean) ? 'passed' : 'failed', checks, observations,
    artifact: { path: artifactPath, suggestedFileName: download.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes) },
    route: 'ExportHandlers.executeExportFromPreview -> createExport().handleExportSlides -> AccessibleOfficeExport.build -> PptxGenJS 3.12.0',
    routeResult, browserVersion: browser.version(), jszipVersion: JSZip.version, blockedNetworkRequests: network, pageErrors, consoleMessages,
    modules: modulePaths.map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) })),
    sourceMedia: { path: mediaPath, bytes: media.length, sha256: sha(media) }, mediaEntries,
    limitations: ['Synthetic controlled coordinator host; does not drive the full Builder button UI.', 'OOXML inspection does not establish rendered layout or destination-application usability.', 'MathML equation is preserved as editable slide text x=42, not native mathematical structure.', 'No screen reader or human assistive-technology acceptance was run.'],
  };
  fs.mkdirSync(path.join(out, 'ooxml'));
  for (const slide of slides) fs.writeFileSync(path.join(out, 'ooxml', path.basename(slide.name)), slide.xml, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, checks, observations, artifact: result.artifact }, null, 2));
  assert.equal(result.status, 'passed', 'Artifact evidence failed; see results.json');
})().catch(error => { fs.writeFileSync(path.join(out, 'failure.txt'), error.stack + '\n'); console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
