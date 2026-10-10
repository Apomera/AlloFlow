/* Browser/export acceptance checks for the shared word presenter. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
// The Windows sandbox redirects LOCALAPPDATA, while installed browser binaries
// may live in the normal user cache. Respect an explicitly configured cache.
const browserCache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.platform === 'win32' && fs.existsSync(browserCache)) process.env.PLAYWRIGHT_BROWSERS_PATH = browserCache;
const { chromium } = require('playwright');
const JSZip = require('jszip');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/word-practice-2026-10-09');
fs.mkdirSync(out, { recursive: true });
if (process.platform === 'win32') {
  const browserTemp = path.join(root, '.tmp/word-practice-browser'); fs.mkdirSync(browserTemp, { recursive: true });
  process.env.TEMP = browserTemp; process.env.TMP = browserTemp; process.env.TMPDIR = browserTemp;
}
// A brief synthetic PCM tone tests media packaging without external services.
function tone() {
  const bytes = Buffer.alloc(44 + 4800 * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24); bytes.writeUInt32LE(48000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  for (let n = 0; n < 4800; n++) bytes.writeInt16LE(Math.round(Math.sin(n * 2 * Math.PI * 440 / 24000) * 1000), 44 + n * 2);
  return 'data:audio/wav;base64,' + bytes.toString('base64');
}
const fixture = { title: 'Our weekly words', language: 'en', words: [
  { word: 'ship', definition: 'A large boat.', example: 'The ship is in the bay.', translations: { Spanish: 'barco' }, wordAudio: tone(), phonemes: ['sh', 'i', 'p'].map(label => ({ label, audio: tone() })), activityItems: { read_sentence: { sentence: 'The ship is in the bay.', before: 'The ', after: ' is in the bay.', options: ['rain', 'ship', 'light'] } } },
  { word: 'rain', definition: 'Water that falls from clouds.', wordAudio: tone(), phonemes: ['r', 'ai', 'n'].map(label => ({ label, audio: tone() })) },
  { word: 'light', definition: 'What lets us see.' }, { word: 'through' }, { word: 'together' }
] };
const routes = new Map([
  ['/word_practice_module.js', path.join(root, 'word_practice_module.js')],
  ['/pptx.js', path.join(root, 'desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js')]
]);
const server = http.createServer((req, res) => {
  const route = (req.url || '').split('?')[0];
  if (route === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word practice QA</title></head><body><button id="launch">Present &amp; Export</button><script src="/word_practice_module.js"></script><script src="/pptx.js"></script><script>window.fixture=' + JSON.stringify(fixture) + ';document.querySelector("#launch").onclick=()=>window.AlloModules.WordPractice.open(window.fixture)</script></body></html>');
    return;
  }
  if (routes.has(route)) { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(routes.get(route))); return; }
  res.writeHead(404); res.end();
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, downloadsPath: path.join(out, 'downloads') });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const report = { checks: [] };
  try {
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.getByRole('button', { name: 'Present & Export', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: path.join(out, 'setup-desktop.png'), fullPage: true });
    report.controls = await page.locator('button').allTextContents();
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(() => axe.run(document.querySelector('[role="dialog"]'), { rules: { 'color-contrast': { enabled: true } } }));
    report.accessibility = accessibility.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    assert.deepEqual(report.accessibility, [], 'setup should pass automated accessibility checks');
    await page.setViewportSize({ width: 320, height: 812 });
    await page.screenshot({ path: path.join(out, 'setup-phone.png'), fullPage: true });
    report.phoneOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(report.phoneOverflow, false, 'setup should fit a narrow phone');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await page.getByRole('button', { name: 'Add to review', exact: true }).click();
    const markedWord = await page.locator('.awp-word').innerText();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Start review (1)', exact: true }).click();
    assert.equal(await page.locator('.awp-word').innerText(), markedWord);
    assert.equal(await page.locator('.awp-progress').innerText(), 'Card 1 of 1');
    await page.getByRole('button', { name: 'New round', exact: true }).click();
    assert.equal(await page.locator('.awp-progress').innerText(), 'Card 1 of 15');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.awp-progress').innerText(), 'Card 2 of 15');
    await page.screenshot({ path: path.join(out, 'presenter-desktop.png'), fullPage: true });
    report.checks.push('Live presentation supports keyboard navigation and a focused review round.');
    await page.getByRole('button', { name: 'Back to setup', exact: true }).click();
    await page.getByLabel('Practice activity', { exact: true }).selectOption('sentence');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Hear word', exact: true }).count(), 0, 'sentence answer audio is withheld');
    await page.getByRole('button', { name: 'rain', exact: true }).click();
    assert.match(await page.locator('.awp-feedback').innerText(), /Try another word/);
    await page.getByRole('button', { name: 'ship', exact: true }).click();
    assert.match(await page.locator('.awp-feedback').innerText(), /completes the sentence/);
    assert.equal(await page.getByRole('button', { name: 'Hear word', exact: true }).count(), 1);
    await page.screenshot({ path: path.join(out, 'sentence-activity.png'), fullPage: true });
    const playerAccessibility = await page.evaluate(() => axe.run(document.querySelector('[role="dialog"]')));
    report.playerAccessibility = playerAccessibility.violations.map(v => ({ id: v.id, impact: v.impact }));
    assert.deepEqual(report.playerAccessibility, []);
    await page.getByRole('button', { name: 'Back to setup', exact: true }).click();
    await page.getByLabel('Practice activity', { exact: true }).selectOption('popup');
    await page.getByLabel('Words (one per line)', { exact: true }).fill('x'.repeat(120) + '\nship\nrain');
    await page.getByLabel('Shuffle each repetition', { exact: true }).uncheck();
    await page.getByLabel('Repetitions per word', { exact: true }).fill('1');
    await page.getByLabel('Pacing', { exact: true }).selectOption('timed');
    await page.getByLabel('Seconds per card', { exact: true }).fill('1');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 812 });
    assert.equal(await page.evaluate(() => { const stage = document.querySelector('.awp-stage'); return stage.scrollWidth > stage.clientWidth + 1; }), false, 'long word fits the phone card');
    await page.screenshot({ path: path.join(out, 'presenter-phone-long-word.png'), fullPage: true });
    await page.getByRole('button', { name: 'Start timer', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.awp-progress').textContent === 'Card 2 of 3');
    await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.awp-progress').innerText(), 'Card 2 of 3');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'launch');
    report.checks.push('Timed pacing pauses correctly; long words fit at 320px; closing restores focus.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Present & Export', exact: true }).click();
    const htmlDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download HTML', exact: true }).click();
    await (await htmlDownload).saveAs(path.join(out, 'download-button.html'));
    const pptxDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PowerPoint', exact: true }).click();
    await (await pptxDownload).saveAs(path.join(out, 'download-button.pptx'));
    report.checks.push('Both visible download buttons deliver files.');
    // Validate standalone exports directly as well as the visible download controls.
    const html = await page.evaluate(() => {
      const pack = AlloWordPracticeCore.normalizeInput(window.fixture);
      return AlloModules.WordPractice.buildHtml(pack, { repetitions: 2, shuffle: false, mode: 'blend', includeAudio: true });
    });
    fs.writeFileSync(path.join(out, 'practice.html'), html);
    assert.ok(!/<script[^>]+src=/i.test(html), 'HTML export must embed its runtime');
    report.checks.push('Standalone HTML embeds its runtime.');
    const base64 = await page.evaluate(async () => {
      const pack = AlloWordPracticeCore.normalizeInput(window.fixture);
      const options = AlloWordPracticeCore.normalizeOptions({ repetitions: 2, mode: 'blend', varyPosition: true, varySize: true });
      const pptx = await AlloWordPracticeMedia.buildPptx(pack, options, AlloWordPracticeCore.createSequence(pack, options), {});
      return pptx.write({ outputType: 'base64' });
    });
    const pptxBytes = Buffer.from(base64, 'base64'); fs.writeFileSync(path.join(out, 'practice.pptx'), pptxBytes);
    const zip = await JSZip.loadAsync(pptxBytes);
    report.pptx = { slides: Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length, media: Object.keys(zip.files).filter(name => /^ppt\/media\//.test(name) && !zip.files[name].dir).length };
    assert.ok(report.pptx.slides >= 10); assert.ok(report.pptx.media >= 2, 'PPTX should contain actual audio files');
    const relationships = await Promise.all(Object.keys(zip.files).filter(name => name.endsWith('.rels')).map(name => zip.files[name].async('string')));
    assert.ok(!relationships.some(xml => /TargetMode="External"[^>]*audio|audio[^>]*TargetMode="External"/.test(xml)), 'audio must be embedded rather than linked');
    report.checks.push('PowerPoint has all repeated words and embedded audio.');
    // Use a real, stable Word Sounds recording. A live MediaRecorder fixture
    // can have no samples when a heavily loaded test host delays its start.
    const recordedWebm = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'audio_bank/phonemes.json'), 'utf8'))).find(value => typeof value === 'string' && value.startsWith('data:audio/webm;base64,'));
    assert.ok(recordedWebm, 'the Word Sounds bank supplies a WebM conversion fixture');
    const converted = await page.evaluate(async data => {
      const pack = AlloWordPracticeCore.normalizeInput({ words: [{ word: 'Audio conversion test', wordAudio: data }] });
      const options = AlloWordPracticeCore.normalizeOptions({ repetitions: 1 });
      const pptx = await AlloWordPracticeMedia.buildPptx(pack, options, AlloWordPracticeCore.createSequence(pack, options), {});
      return { base64: await pptx.write({ outputType: 'base64' }), warnings: pptx.wordPracticeWarnings || [] };
    }, recordedWebm);
    const convertedZip = await JSZip.loadAsync(Buffer.from(converted.base64, 'base64'));
    const convertedMedia = Object.keys(convertedZip.files).filter(name => /^ppt\/media\//.test(name) && !convertedZip.files[name].dir);
    const convertedBuffers = await Promise.all(convertedMedia.map(name => convertedZip.files[name].async('nodebuffer')));
    assert.ok(convertedBuffers.some(bytes => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE'), 'WebM audio must be converted to PowerPoint-compatible WAV: ' + JSON.stringify(converted.warnings));
    report.checks.push('Existing Word Sounds WebM audio converts to embedded WAV for PowerPoint.');
    const sentenceBase64 = await page.evaluate(async () => {
      const pack = AlloWordPracticeCore.normalizeInput(window.fixture);
      const options = AlloWordPracticeCore.normalizeOptions({ repetitions: 1, mode: 'sentence', includeAudio: false });
      const pptx = await AlloWordPracticeMedia.buildPptx(pack, options, AlloWordPracticeCore.createSequence(pack, options), {});
      return pptx.write({ outputType: 'base64' });
    });
    const sentenceZip = await JSZip.loadAsync(Buffer.from(sentenceBase64, 'base64'));
    const sentenceSlides = await Promise.all(Object.keys(sentenceZip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).map(name => sentenceZip.files[name].async('string')));
    assert.ok(sentenceSlides.some(xml => xml.includes('____') && xml.includes('rain')), 'sentence export retains the prepared blank and choices');
    assert.ok(sentenceSlides.some(xml => xml.includes('ship') && !xml.includes('____')), 'sentence export has an answer slide');
    assert.equal(Object.keys(sentenceZip.files).filter(name => /^ppt\/media\//.test(name) && !sentenceZip.files[name].dir).length, 0, 'audio disabled should exclude media');
    report.checks.push('Prepared sentence activities export as prompt and answer slides.');
    const offlineContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
    const offline = await offlineContext.newPage();
    offline.on('pageerror', error => errors.push('offline: ' + error.message));
    const externalRequests = []; offline.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await offline.addInitScript(() => {
      const OriginalAudio = window.Audio; window.finishedClips = 0;
      window.Audio = function (...args) { const clip = new OriginalAudio(...args); clip.addEventListener('ended', () => window.finishedClips++); return clip; };
    });
    await offline.goto(pathToFileURL(path.join(out, 'practice.html')).href);
    await offline.getByRole('button', { name: 'Show word', exact: true }).click();
    assert.equal(await offline.locator('.awp-word').innerText(), 'ship');
    await offline.getByRole('button', { name: 'Hear sounds', exact: true }).click();
    await offline.waitForFunction(() => window.finishedClips === 3);
    await offline.getByRole('button', { name: 'Hear word', exact: true }).click();
    await offline.waitForFunction(() => window.finishedClips === 4);
    await offline.keyboard.press('ArrowRight');
    assert.equal(await offline.locator('.awp-progress').innerText(), 'Card 2 of 10');
    await offline.screenshot({ path: path.join(out, 'offline-html.png'), fullPage: true });
    report.offlineControls = await offline.locator('button').allTextContents();
    report.offlineText = (await offline.locator('body').innerText()).slice(0, 3000);
    assert.deepEqual(externalRequests, []);
    report.checks.push('Offline HTML plays real embedded word/sound clips, navigates, and makes no network requests.');
    await offlineContext.close();
    report.errors = errors;
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
