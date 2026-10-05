'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const expected = '4bb912b9f1d00c1b54be26d29197f0c1bd9c1277161664d21842532f973f4bf3';
const run = (process.argv.find(arg => arg.startsWith('--run=')) || '--run=live').slice(6);
if (!/^[a-z0-9-]+$/.test(run)) throw Error('Invalid run name');
const output = path.join(__dirname, 'preview-' + run + '-results.json');
if (fs.existsSync(output)) throw Error('Choose a fresh run name');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const report = { url: 'http://127.0.0.1:8770/?mode=storm', pid: process.pid, startedAt: new Date().toISOString(), checks: [], errors: [], browserClosed: false, sourceSha256: expected };
let browser;
const check = (label, passed) => { report.checks.push({ label, passed: !!passed }); if (!passed) report.errors.push(label); };
(async () => { try {
  const local = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_watercycle.js'));
  check('Current runtime exact', sha(local) === expected);
  const response = await fetch('http://127.0.0.1:8770/stem_lab/stem_tool_watercycle.js', { signal: AbortSignal.timeout(10000) });
  const served = Buffer.from(await response.arrayBuffer());
  report.servedSha256 = sha(served); report.servedBytes = served.length;
  check('Preview serves exact current runtime', response.ok && report.servedSha256 === expected);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.addInitScript(() => {
    window.previewCaptionTexts = [];
    const proto = CanvasRenderingContext2D.prototype, original = proto.fillText;
    proto.fillText = function (...args) {
      if (String(new Error().stack).includes('drawPrecipCaption2d')) window.previewCaptionTexts.push({ text: String(args[0]), font: this.font, arguments: args.length });
      return Reflect.apply(original, this, args);
    };
  });
  const actualScriptResponse = page.waitForResponse(item => new URL(item.url()).pathname === '/stem_lab/stem_tool_watercycle.js');
  await page.goto(report.url, { waitUntil: 'load', timeout: 60000 });
  const actualScript = await actualScriptResponse;
  const loaded = await actualScript.body();
  report.loadedSha256 = sha(loaded); report.loadedBytes = loaded.length;
  check('Actual browser script response exact', actualScript.ok() && report.loadedSha256 === expected && loaded.length === local.length);
  await page.waitForFunction(() => !!document.getElementById('wcPrecipCanvas')?.dataset.precipitationType, { timeout: 30000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  report.scene = await page.evaluate(() => ({ data: JSON.parse(JSON.stringify(waterReviewData)), dataset: { ...document.getElementById('wcPrecipCanvas').dataset }, texts: previewCaptionTexts, sourceScripts: [...document.scripts].map(script => script.src).filter(Boolean) }));
  check('Actual preview mounted Storm 2D', report.scene.data.wcMode === 'precipHunt' && report.scene.dataset.precipitationView === '2d');
  check('Actual preview paints readable shared captions', report.scene.texts.length >= 7 && report.scene.texts.every(item => item.arguments === 3 && Number(/([\d.]+)px/.exec(item.font)?.[1]) >= 11));
  check('Actual preview preserves paused configuration', report.scene.data.precipHunt.paused === true);
  const capture = path.join(__dirname, 'preview-' + run + '-storm.png');
  await page.locator('#wcPrecipCanvas').screenshot({ path: capture, animations: 'disabled' });
  report.capture = { path: path.basename(capture), sha256: sha(fs.readFileSync(capture)), sourceSha256: expected };
} catch (error) { report.errors.push(error.stack || String(error)); } finally {
  if (browser) { await browser.close(); report.browserClosed = true; }
  report.resourcesClosed = true; report.completedAt = new Date().toISOString(); report.completed = true;
  report.successful = report.errors.length === 0;
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ successful: report.successful, checks: report.checks.length, errors: report.errors, browserClosed: report.browserClosed, output }));
  if (!report.successful) process.exitCode = 1;
} })();
