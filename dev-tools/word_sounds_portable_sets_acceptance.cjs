/* Native Chromium acceptance of the extracted, unchanged production recording
 * editor. No network speech service, microphone, full-host app, or audio mock. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = process.env.WORD_SOUNDS_REPO || path.resolve(__dirname, '..');
const out = process.env.WORD_SOUNDS_QA_OUT || path.join(repo, 'reports/word-sounds-portable-recordings-2026-10-09/browser');
const fixture = process.env.WORD_SOUNDS_QA_WAV || path.join(repo, 'reports/word-sounds-portable-recordings-2026-10-09/fixture.wav');
const { chromium } = require(require.resolve('playwright', { paths: [repo] }));
fs.mkdirSync(out, { recursive: true });
const core = fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8');
const runtime = fs.readFileSync(path.join(repo, 'word_sounds_module.js'), 'utf8');
const start = runtime.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
const endMarker = '// END WORD SOUNDS SYLLABLE RECORDING EDITOR';
const end = runtime.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, 'production editor markers present');
const editorSource = runtime.slice(start, end + endMarker.length);
const moduleSource = 'const React = window.React;\n' + core + '\nconst WS_CORE = createWordSoundsCore();\n' + editorSource + '\nwindow.__editor = WordSoundsSyllableRecordingEditor; window.__core = WS_CORE; window.__library = createWordSoundsReviewedLibrary(WS_CORE, window.indexedDB); window.__readRecording = readWordSoundsSyllableRecording;';
const cssPath = path.join(repo, 'app/static/css/main.3f49a8fc.css');
assert.ok(fs.existsSync(cssPath), 'local production CSS present');
const routes = {
  '/react.js': [path.join(repo, 'desktop/web-app/node_modules/react/umd/react.development.js'), 'application/javascript'],
  '/react-dom.js': [path.join(repo, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'), 'application/javascript'],
  '/host.css': [cssPath, 'text/css'],
  '/fixture.wav': [fixture, 'audio/wav'],
};
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portable syllable recording acceptance</title><link rel="stylesheet" href="/host.css"><style>body{font-family:system-ui;margin:16px}main{max-width:960px;margin:0 auto}h1{font-size:1.25rem;margin-bottom:16px}</style></head><body><main><h1>Syllable recording set</h1><div id="root"></div></main></body></html>';
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  if (pathname === '/editor.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(moduleSource); return; }
  const route = routes[pathname];
  if (route) { response.setHeader('Content-Type', route[1]); response.end(fs.readFileSync(route[0])); return; }
  response.statusCode = 404; response.end();
});
let browser, page, context;
const checks = [], errors = [], externalRequests = [];
const report = { checks, errors, externalRequests };
const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log('PASS ' + name); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function mount({ initial = null, fromStorage = false, createFixture = false } = {}) {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js']) await page.addScriptTag({ url });
  await page.evaluate(() => {
    const q = window.__qa = { writes: [], audios: [], events: [], overlaps: [], decodeCalls: 0 };
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args), id = q.audios.length;
      q.audios.push(audio);
      for (const type of ['playing', 'pause', 'ended', 'error']) audio.addEventListener(type, () => {
        q.events.push({ id, type, at: performance.now() });
        if (type === 'playing' && q.audios.some(other => other !== audio && !other.paused && !other.ended)) q.overlaps.push(id);
      });
      return audio;
    };
    window.Audio.prototype = NativeAudio.prototype;
    // Preserve the native decoder; count calls to prove stored decoded:true is
    // never sufficient to bypass checking the imported bytes.
    const prototype = window.BaseAudioContext.prototype;
    const nativeDecode = prototype.decodeAudioData;
    prototype.decodeAudioData = function (...args) { q.decodeCalls++; return nativeDecode.apply(this, args); };
  });
  await page.addScriptTag({ url: '/editor.js' });
  await page.evaluate(async ({ initial, fromStorage, createFixture }) => {
    const q = window.__qa;
    if (createFixture) {
      const response = await fetch('/fixture.wav');
      const asset = await window.__readRecording(new Blob([await response.arrayBuffer()], { type: 'audio/wav' }));
      initial = window.__core.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en-US', revision: 100, syllables: ['sun', 'set'], assets: [asset, { ...asset }], reviewed: true });
      initial.options = ['sunset', 'cupcake'];
      initial.unrelatedTeacherNote = 'This lesson-only note must not be exported';
      initial.audioUnits[0].asset.originalAsset = { ignored: true };
    }
    if (fromStorage) initial = JSON.parse(localStorage.getItem('qa-portable-lesson'));
    q.initial = initial;
    function Host() {
      const [board, setBoard] = window.React.useState(initial);
      q.board = board;
      return window.React.createElement(window.__editor, { word: 'sunset', language: 'en-US', board, id: 'qa-editor', onSave: task => {
        q.writes.push(task); localStorage.setItem('qa-portable-lesson', JSON.stringify(task)); setBoard(task);
      } });
    }
    q.root = window.ReactDOM.createRoot(document.getElementById('root'));
    q.root.render(window.React.createElement(Host));
  }, { initial, fromStorage, createFixture });
  await page.locator('#qa-editor > summary').click();
  await page.getByText('Reuse reviewed recordings', { exact: true }).click();
  await page.waitForFunction(() => {
    const input = [...document.querySelectorAll('#qa-editor input[type=file]')].find(node => node.accept.includes('json'));
    return input && !input.disabled;
  });
}
const editor = () => page.locator('#qa-editor');
const saveButton = () => editor().getByRole('button', { name: 'Save reviewed syllables', exact: true });
const importInput = () => editor().getByLabel('Import recording set', { exact: false });
const labels = () => editor().locator('input[placeholder="Written hint"]').evaluateAll(nodes => nodes.map(node => node.value));
async function importFile(envelope, name = 'recording-set.json') {
  const buffer = Buffer.isBuffer(envelope) ? envelope : Buffer.from(JSON.stringify(envelope));
  await importInput().setInputFiles({ name, mimeType: 'application/json', buffer });
  await page.waitForFunction(() => {
    const input = [...document.querySelectorAll('#qa-editor input[type=file]')].find(node => node.accept.includes('json'));
    return input && !input.disabled && ![...document.querySelectorAll('#qa-editor button')].some(button => button.textContent === 'Cancel audio check');
  }, null, { timeout: 30000 });
}
async function preview() {
  const before = await page.evaluate(() => window.__qa.events.length);
  await editor().getByRole('button', { name: 'Preview syllables in order', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('#qa-editor label')].some(label => label.textContent.includes('I listened to the sequence') && !label.querySelector('input').disabled), null, { timeout: 30000 });
  const state = await page.evaluate(before => ({ events: window.__qa.events.slice(before), overlaps: window.__qa.overlaps }), before);
  assert.deepEqual(state.overlaps, []);
  assert.equal(state.events.filter(event => event.type === 'playing').length, 2);
  assert.equal(state.events.filter(event => event.type === 'ended').length, 2);
  const starts = state.events.filter(event => event.type === 'playing'), ends = state.events.filter(event => event.type === 'ended');
  assert.ok(ends[0].at < starts[1].at, 'first syllable ends before the second starts');
  return state;
}
async function newContext() {
  if (context) await context.close();
  context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    externalRequests.push(route.request().url()); return route.abort();
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
}
async function run() {
  global.gc?.();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, timeout: 120000 });
  await newContext();
  await mount({ createFixture: true });
  const initial = await page.evaluate(() => window.__qa.initial);
  assert.ok(initial && initial.audioUnits.length === 2);
  await editor().getByLabel('Syllable 1 label', { exact: false }).fill('unsaved draft');
  const downloadPromise = page.waitForEvent('download');
  await editor().getByRole('button', { name: 'Download saved recording set', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = path.join(out, 'downloaded-recording-set.json');
  await download.saveAs(downloadPath);
  assert.equal(await download.failure(), null);
  const envelope = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
  assert.equal(envelope.format, 'alloflow.word-sounds-recordings');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.word, 'sunset');
  assert.equal(envelope.language, 'en-us');
  assert.deepEqual(envelope.task.syllables, ['sun', 'set']);
  assert.equal(envelope.task.options, undefined);
  assert.equal(envelope.task.unrelatedTeacherNote, undefined);
  assert.equal(envelope.task.audioUnits[0].asset.originalAsset, undefined);
  assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
  pass('native download contains the saved reviewed sequence and excludes unsaved edits and unrelated lesson data', { suggestedFilename: download.suggestedFilename(), bytes: fs.statSync(downloadPath).size });
  await newContext();
  await mount();
  assert.equal(await editor().getByRole('button', { name: 'Download saved recording set', exact: true }).isDisabled(), true);
  assert.deepEqual(labels && await labels(), ['', '']);
  const decodesBefore = await page.evaluate(() => window.__qa.decodeCalls);
  await importFile(envelope);
  assert.deepEqual(await labels(), ['sun', 'set']);
  assert.equal(await page.evaluate(() => window.__qa.decodeCalls), decodesBefore + 2);
  assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
  assert.equal(await saveButton().isDisabled(), true);
  assert.equal(await editor().getByRole('checkbox', { name: /I listened to the sequence/ }).isDisabled(), true);
  assert.equal(await page.evaluate(async () => (await window.__library.load('sunset', 'en-US')).task), null);
  pass('fresh browser import natively decodes both clips into drafts without saving the lesson or local library');
  report.preview = await preview();
  assert.equal(await saveButton().isDisabled(), true);
  await editor().getByRole('checkbox', { name: /I listened to the sequence/ }).check();
  assert.equal(await saveButton().isDisabled(), false);
  await saveButton().click();
  await page.waitForFunction(() => window.__qa.writes.length === 1);
  const saved = await page.evaluate(() => window.__qa.board);
  assert.deepEqual(saved.syllables, envelope.task.syllables);
  assert.deepEqual(saved.audioUnits.map(unit => unit.asset), envelope.task.audioUnits.map(unit => unit.asset));
  assert.equal(await page.evaluate(async () => (await window.__library.load('sunset', 'en-US')).task), null);
  pass('native ordered preview and fresh confirmation are required before the imported clips can be saved');
  await mount({ fromStorage: true });
  assert.deepEqual(await page.evaluate(() => window.__qa.board), saved);
  assert.deepEqual(await labels(), ['sun', 'set']);
  pass('explicit lesson save and reload preserve the imported audio bytes, order, labels, and review');
  for (const [name, field, value] of [['wrong word', 'word', 'milkshake'], ['wrong dialect', 'language', 'en-gb']]) {
    await importFile({ ...envelope, [field]: value });
    assert.deepEqual(await labels(), ['sun', 'set']);
    assert.deepEqual(await page.evaluate(() => window.__qa.board), saved);
    assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
    assert.equal(await saveButton().isDisabled(), true);
    const text = await editor().locator('[role=status]').last().innerText();
    assert.ok(text && !/imported|ready to review/i.test(text), name + ' must report an import failure');
    pass(name + ' recording set is rejected while previous clips and saved lesson remain intact', { status: text });
  }
  const brokenEnvelope = await page.evaluate(envelope => {
    const bytes = new Uint8Array(64); bytes.set(new TextEncoder().encode('RIFF'), 0); bytes.set(new TextEncoder().encode('WAVE'), 8);
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    const badAsset = { mime: 'audio/wav', base64: btoa(binary), durationSeconds: 1, decoded: true, source: 'teacher_recording' };
    const task = window.__core.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en-US', revision: 200, syllables: ['changed first', 'broken second'], assets: [envelope.task.audioUnits[0].asset, badAsset], reviewed: true });
    if (!task) throw Error('Broken fixture must pass the stored schema so native decoding is exercised');
    return { ...envelope, task };
  }, envelope);
  const corruptBefore = await page.evaluate(() => window.__qa.decodeCalls);
  await importFile(brokenEnvelope);
  assert.equal(await page.evaluate(() => window.__qa.decodeCalls), corruptBefore + 2);
  assert.deepEqual(await labels(), ['sun', 'set']);
  assert.deepEqual(await page.evaluate(() => window.__qa.board), saved);
  assert.match(await editor().locator('[role=status]').last().innerText(), /decode|recording|audio/i);
  pass('native failure on the second clip cannot partially replace the first clip even when stored metadata claims it was decoded');
  await importFile(Buffer.alloc(2 * 1024 * 1024 + 1, 32), 'oversized.json');
  assert.deepEqual(await labels(), ['sun', 'set']);
  assert.deepEqual(await page.evaluate(() => window.__qa.board), saved);
  assert.match(await editor().locator('[role=status]').last().innerText(), /size|large|MB|smaller|limit/i);
  pass('oversized recording set is rejected without changing existing clips');
  // A fresh native preview demonstrates retained draft assets still play, not
  // only that the saved board object survived an import error.
  await preview();
  const retained = await page.evaluate(() => window.__qa.audios.slice(-2).map(audio => audio.src));
  assert.deepEqual(retained, saved.audioUnits.map(unit => 'data:' + unit.asset.mime + ';base64,' + unit.asset.base64));
  pass('previous draft recordings still play correctly after all rejected imports');
  report.layouts = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('#qa-editor *')].filter(node => {
        if (!node.getClientRects().length) return false;
        const rect = node.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1;
      }).map(node => ({ tag: node.tagName, text: node.textContent?.slice(0, 100), right: node.getBoundingClientRect().right })),
    }));
    await page.screenshot({ path: path.join(out, 'portable-editor-' + width + '.png'), fullPage: true });
    report.layouts.push(layout);
    assert.ok(layout.documentWidth <= width, 'no document horizontal overflow at ' + width);
    assert.deepEqual(layout.overflow, [], 'editor controls fit at ' + width);
  }
  pass('editor controls fit 390 px and 1280 px viewports with local production CSS');
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
}
run().catch(async error => {
  process.exitCode = 1;
  report.error = error.stack || String(error);
  console.error(report.error);
  if (page && !page.isClosed()) {
    report.text = await page.locator('body').innerText().catch(() => '');
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  }
}).finally(async () => {
  if (browser) await browser.close();
  server.close();
  report.hashes = { core: hash(core), runtime: hash(runtime), extractedEditor: hash(editorSource), css: hash(fs.readFileSync(cssPath)), wav: hash(fs.readFileSync(fixture)) };
  report.limits = 'Actual React, production core/library/editor source, local production CSS, Chromium download, native audio decoding and playback. Two clips use the same supplied Kokoro WAV fixture; this checks transport/review/rejection behavior, not pronunciation quality. Isolated editor only; no physical microphone, speech generation, full-host layout, or cloud delivery.';
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
});
