/* Native Chromium acceptance of the unchanged production recording editor.
 * Local audio fixtures test editing/playback mechanics, not pronunciation. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const parentDirectory = path.resolve(__dirname, '..');
const defaultRepo = fs.existsSync(path.join(parentDirectory, 'word_sounds_core.js')) ? parentDirectory : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const repo = process.env.WORD_SOUNDS_REPO || defaultRepo;
const out = process.env.WORD_SOUNDS_QA_OUT || path.join(repo, 'reports/word-sounds-review-state-2026-10-09/browser');
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
const moduleSource = 'const React = window.React;\n' + core + '\nconst WS_CORE = createWordSoundsCore();\n' + editorSource + '\nwindow.__editor = WordSoundsSyllableRecordingEditor; window.__core = WS_CORE; window.__library = createWordSoundsReviewedLibrary(WS_CORE, window.indexedDB); window.__readRecording = readWordSoundsSyllableRecording; window.__encodeWav = encodeWordSoundsSyllableWav;';
const cssPath = path.join(repo, 'app/static/css/main.3f49a8fc.css');
assert.ok(fs.existsSync(cssPath), 'local production CSS present');
const routes = {
  '/react.js': [path.join(repo, 'desktop/web-app/node_modules/react/umd/react.development.js'), 'application/javascript'],
  '/react-dom.js': [path.join(repo, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'), 'application/javascript'],
  '/host.css': [cssPath, 'text/css'], '/fixture.wav': [fixture, 'audio/wav'],
};
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syllable review state acceptance</title><link rel="stylesheet" href="/host.css"><style>body{font-family:system-ui;margin:16px}main{max-width:960px;margin:0 auto}h1{font-size:1.25rem;margin-bottom:16px}</style></head><body><main><h1>Syllable recording review</h1><div id="root"></div></main></body></html>';
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
const editor = () => page.locator('#qa-editor');
const count = () => editor().getByLabel('Number of syllables', { exact: false });
const saveButton = () => editor().getByRole('button', { name: 'Save reviewed syllables', exact: true });
const previewButton = () => editor().getByRole('button', { name: 'Preview syllables in order', exact: true });
const review = () => editor().getByRole('checkbox', { name: /I listened to the sequence/ });
const labels = () => editor().locator('input[placeholder="Written hint"]').evaluateAll(nodes => nodes.map(node => node.value));
const hint = number => editor().getByLabel('Syllable ' + number + ' label', { exact: false });
const summary = () => page.locator('#qa-editor > summary').innerText();
const guidance = () => previewButton().evaluate(button => document.getElementById(button.getAttribute('aria-describedby'))?.textContent);
async function idle() {
  await page.waitForFunction(() => {
    const select = document.querySelector('#qa-editor select'); return select && !select.disabled;
  }, null, { timeout: 30000 });
}
async function waitText(pattern) { await editor().getByText(pattern).first().waitFor({ state: 'visible' }); }
async function mount({ initial = 'two', word = 'sunset', language = 'en-US', secondEditor = false, seedLibrary = false } = {}) {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js']) await page.addScriptTag({ url });
  await page.evaluate(() => {
    const q = window.__qa = { writes: [], attempts: 0, failSave: false, audios: [], events: [], overlaps: [], decodeCalls: 0 };
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
    const prototype = window.BaseAudioContext.prototype, nativeDecode = prototype.decodeAudioData;
    prototype.decodeAudioData = function (...args) { q.decodeCalls++; return nativeDecode.apply(this, args); };
  });
  await page.addScriptTag({ url: '/editor.js' });
  await page.evaluate(async ({ initial, word, language, secondEditor, seedLibrary }) => {
    const q = window.__qa;
    const first = await window.__readRecording(new Blob([await (await fetch('/fixture.wav')).arrayBuffer()], { type: 'audio/wav' }));
    const sampleRate = 24000, samples = new Float32Array(sampleRate * 0.2);
    for (let i = 0; i < samples.length; i++) samples[i] = 0.1 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
    const second = await window.__readRecording(new Blob([window.__encodeWav([samples], sampleRate)], { type: 'audio/wav' }));
    q.assets = [first, second];
    const create = (syllables, revision) => window.__core.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en-US', revision,
      syllables, assets: syllables.map((_, index) => q.assets[index % 2]), reviewed: true });
    q.two = create(['sun', 'set'], 100); q.four = create(['sun', 'set', 'hidden three', 'hidden four'], 101);
    q.libraryTask = create(['library first', 'library second'], 102);
    if (!q.two || !q.four || !q.libraryTask) throw Error('Reviewed fixtures did not validate');
    const existing = await window.__library.load('sunset', 'en-US');
    if (existing.token) await window.__library.remove('sunset', 'en-US', { expectedToken: existing.token });
    if (seedLibrary) await window.__library.save('sunset', 'en-US', q.libraryTask, { expectedToken: null });
    const board = initial === 'empty' ? null : initial === 'invalid' ? { ...q.two, syllables: ['tampered', 'set'] } : q[initial];
    function Host() {
      const [props, setProps] = window.React.useState({ word, language, board });
      q.props = props; q.updateProps = next => setProps(previous => ({ ...previous, ...next }));
      const onSave = task => {
        q.attempts++;
        if (q.failSave) throw Error('Intentional host apply failure');
        q.writes.push(task); setProps(previous => ({ ...previous, board: task }));
      };
      return window.React.createElement(window.React.Fragment, null,
        window.React.createElement(window.__editor, { ...props, id: 'qa-editor', onSave }),
        secondEditor ? window.React.createElement(window.__editor, { ...props, id: 'qa-secondary', onSave }) : null);
    }
    q.root = window.ReactDOM.createRoot(document.getElementById('root'));
    q.root.render(window.React.createElement(Host));
  }, { initial, word, language, secondEditor, seedLibrary });
  await page.locator('#qa-editor > summary').click();
  await editor().getByText('Reuse reviewed recordings', { exact: true }).click();
  await idle();
}
async function previewAndConfirm() {
  const before = await page.evaluate(() => ({ events: window.__qa.events.length, audios: window.__qa.audios.length }));
  await previewButton().click(); await idle();
  const state = await page.evaluate(before => ({ events: window.__qa.events.slice(before.events),
    sources: window.__qa.audios.slice(before.audios).map(audio => audio.src), overlaps: window.__qa.overlaps }), before);
  const starts = state.events.filter(event => event.type === 'playing'), ends = state.events.filter(event => event.type === 'ended');
  assert.equal(starts.length, 2); assert.equal(ends.length, 2);
  assert.ok(ends[0].at < starts[1].at, 'the second clip starts only after the first finishes');
  assert.deepEqual(state.overlaps, []);
  assert.match(await guidance(), /Confirm that you listened/);
  assert.equal(await saveButton().isDisabled(), true);
  await review().check();
  assert.equal(await guidance(), 'Ready to save reviewed syllables.');
  assert.equal(await saveButton().isDisabled(), false);
  return { events: state.events, sourceHashes: state.sources.map(hash) };
}
async function run() {
  global.gc?.();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, timeout: 120000 });
  context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    externalRequests.push(route.request().url()); return route.abort();
  });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));

  await mount();
  assert.match(await summary(), /— saved in lesson$/);
  assert.match(await guidance(), /The lesson already has this reviewed set/);
  await hint(1).fill('changed'); assert.match(await summary(), /— unsaved changes$/);
  await hint(1).fill('sun'); assert.match(await summary(), /— saved in lesson$/);
  await editor().getByRole('button', { name: 'Clean up syllable 1', exact: true }).click(); await idle();
  assert.match(await summary(), /— unsaved changes$/);
  await editor().getByRole('button', { name: 'Undo cleanup syllable 1', exact: true }).click();
  assert.match(await summary(), /— saved in lesson$/);
  pass('saved state follows displayed labels and actual audio; undoing the changes restores saved status');

  await mount({ initial: 'empty' });
  assert.match(await summary(), /— not saved$/);
  assert.equal(await guidance(), 'Add labels for syllables 1, 2. Add recordings for syllables 1, 2.');
  assert.equal(await previewButton().isDisabled(), true); assert.equal(await saveButton().isDisabled(), true);
  await hint(1).fill('sun'); await hint(2).fill('set');
  assert.equal(await guidance(), 'Add recordings for syllables 1, 2.');
  await editor().getByLabel('Upload syllable 1', { exact: false }).setInputFiles(fixture); await idle();
  assert.equal(await guidance(), 'Add recordings for syllable 2.');
  const secondBytes = await page.evaluate(() => window.__qa.assets[1].base64);
  await editor().getByLabel('Upload syllable 2', { exact: false }).setInputFiles({ name: 'second.wav', mimeType: 'audio/wav', buffer: Buffer.from(secondBytes, 'base64') }); await idle();
  assert.equal(await guidance(), 'Preview the full sequence before saving.');
  report.guidedPreview = await previewAndConfirm();
  const expectedSources = await page.evaluate(() => window.__qa.assets.map(asset => 'data:' + asset.mime + ';base64,' + asset.base64));
  assert.deepEqual(report.guidedPreview.sourceHashes, expectedSources.map(hash));
  await saveButton().click(); await page.waitForFunction(() => window.__qa.writes.length === 1);
  assert.match(await summary(), /— saved in lesson$/);
  assert.equal(await page.evaluate(() => window.__qa.decodeCalls), 4, 'fixture and both uploaded files use native decoding');
  pass('guidance names missing inputs, then full preview, confirmation and ready; native clips play in source order before save');

  await mount({ initial: 'four' });
  await count().selectOption('2'); await hint(1).fill('my draft');
  report.retryPreview = await previewAndConfirm();
  await page.evaluate(() => { window.__qa.failSave = true; });
  await saveButton().click(); await waitText(/The recordings could not be applied to this lesson/);
  assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
  assert.deepEqual(await labels(), ['my draft', 'set']);
  await count().selectOption('4'); assert.deepEqual(await labels(), ['my draft', 'set', 'hidden three', 'hidden four']);
  await count().selectOption('2'); await previewAndConfirm();
  await page.evaluate(() => { window.__qa.failSave = false; });
  await saveButton().click(); await page.waitForFunction(() => window.__qa.writes.length === 1);
  assert.match(await summary(), /— saved in lesson$/);
  await count().selectOption('4'); assert.deepEqual(await labels(), ['my draft', 'set', '', '']);
  pass('a thrown lesson save keeps visible and hidden drafts; a reviewed retry succeeds and clears the hidden extras');

  await mount(); await hint(1).fill('library draft');
  await editor().getByRole('checkbox', { name: /Also save or replace this word in my local library/ }).check(); await idle();
  await previewAndConfirm(); await page.evaluate(() => { window.__qa.failSave = true; });
  await saveButton().click(); await waitText(/The recordings were saved in the local library, but could not be applied/); await idle();
  const partial = await page.evaluate(async () => {
    const q = window.__qa, stored = await window.__library.load('sunset', 'en-US');
    return { labels: stored.task.syllables, token: stored.token, attempts: q.attempts, writes: q.writes.length };
  });
  assert.deepEqual(partial.labels, ['library draft', 'set']); assert.ok(partial.token);
  assert.equal(partial.attempts, 1); assert.equal(partial.writes, 0);
  assert.deepEqual(await labels(), ['library draft', 'set']); assert.match(await summary(), /— unsaved changes$/);
  await page.evaluate(() => { window.__qa.failSave = false; });
  await saveButton().click(); await page.waitForFunction(() => window.__qa.writes.length === 1); await idle();
  await waitText('Reviewed recordings saved with this lesson and in the local library.');
  const retried = await page.evaluate(async () => ({ stored: (await window.__library.load('sunset', 'en-US')).task.syllables, attempts: window.__qa.attempts }));
  assert.deepEqual(retried.stored, ['library draft', 'set']); assert.equal(retried.attempts, 2);
  pass('real IndexedDB success plus a rejected lesson apply is reported truthfully; retry uses the fresh library token without conflict');

  await mount({ initial: 'four', seedLibrary: true });
  await count().selectOption('2'); await hint(1).fill('keep my draft');
  await page.evaluate(() => { window.__qa.failSave = true; });
  await editor().getByRole('button', { name: 'Use saved recordings in this lesson', exact: true }).click();
  await waitText(/The saved recordings could not be applied to this lesson/);
  assert.deepEqual(await labels(), ['keep my draft', 'set']); assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
  await count().selectOption('4'); assert.deepEqual(await labels(), ['keep my draft', 'set', 'hidden three', 'hidden four']);
  await count().selectOption('2'); await page.evaluate(() => { window.__qa.failSave = false; });
  await editor().getByRole('button', { name: 'Use saved recordings in this lesson', exact: true }).click();
  await page.waitForFunction(() => window.__qa.writes.length === 1);
  assert.deepEqual(await labels(), ['library first', 'library second']); assert.match(await summary(), /— saved in lesson$/);
  await count().selectOption('4'); assert.deepEqual(await labels(), ['library first', 'library second', '', '']);
  pass('failed library reuse preserves the current visible and hidden draft; retry replaces it only after lesson acceptance');

  for (const props of [{ word: 'cupcake' }, { language: 'es' }, { initial: 'invalid' }]) {
    await mount(props); assert.match(await summary(), /— not saved$/);
    assert.equal(await editor().getByRole('button', { name: 'Download saved recording set', exact: true }).isDisabled(), true);
    assert.deepEqual(await labels(), ['', '']);
  }
  pass('wrong-word, wrong-language, and invalid reviewed boards are not presented as saved recordings');

  await mount({ secondEditor: true }); await page.locator('#qa-secondary > summary').click();
  const descriptions = await page.evaluate(() => ['qa-editor', 'qa-secondary'].map(id => {
    const owner = document.getElementById(id), buttons = [...owner.querySelectorAll('button')];
    const preview = buttons.find(node => node.textContent === 'Preview syllables in order');
    const save = buttons.find(node => node.textContent === 'Save reviewed syllables');
    const describedBy = preview.getAttribute('aria-describedby'), paragraph = document.getElementById(describedBy);
    return { id: describedBy, saveId: save.getAttribute('aria-describedby'), inOwnEditor: owner.contains(paragraph), text: paragraph?.textContent };
  }));
  assert.notEqual(descriptions[0].id, descriptions[1].id);
  for (const description of descriptions) { assert.ok(description.id); assert.equal(description.saveId, description.id); assert.equal(description.inOwnEditor, true); assert.match(description.text, /already has this reviewed set/); }
  report.descriptions = descriptions;
  pass('two editors each connect Preview and Save to their own unique readiness description');

  await mount({ initial: 'empty' }); report.layouts = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('#qa-editor *')].filter(node => {
        if (!node.getClientRects().length) return false;
        const rect = node.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1;
      }).map(node => ({ tag: node.tagName, text: node.textContent?.slice(0, 100), right: node.getBoundingClientRect().right })),
    }));
    await page.screenshot({ path: path.join(out, 'review-state-editor-' + width + '.png'), fullPage: true });
    report.layouts.push(layout);
    assert.ok(layout.documentWidth <= width, 'no document horizontal overflow at ' + width);
    assert.deepEqual(layout.overflow, [], 'editor controls fit at ' + width);
  }
  pass('saved status and missing-step guidance fit 390 px and 1280 px viewports with local production CSS');
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
}
run().catch(async error => {
  process.exitCode = 1; report.error = error.stack || String(error); console.error(report.error);
  if (page && !page.isClosed()) {
    report.text = await page.locator('body').innerText().catch(() => '');
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  }
}).finally(async () => {
  if (browser) await browser.close(); server.close();
  report.hashes = { core: hash(core), runtime: hash(runtime), extractedEditor: hash(editorSource), css: hash(fs.readFileSync(cssPath)), wav: hash(fs.readFileSync(fixture)) };
  report.limits = 'Actual React, production core/library/editor source, local production CSS, native IndexedDB, native audio decoding and playback. A supplied WAV and one generated tone test source order and review behavior, not pronunciation quality. Lesson callbacks are controlled to throw before accepting data. Isolated editor only; no physical microphone, speech generation, full-host layout, or cloud delivery.';
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
});
