/* Native Chromium acceptance of the unchanged production recording editor.
 * Local WAV fixtures exercise editing and playback mechanics, not pronunciation. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const parentDirectory = path.resolve(__dirname, '..');
const defaultRepo = fs.existsSync(path.join(parentDirectory, 'word_sounds_core.js')) ? parentDirectory : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const repo = process.env.WORD_SOUNDS_REPO || defaultRepo;
const out = process.env.WORD_SOUNDS_QA_OUT || path.join(repo, 'reports/word-sounds-draft-editing-2026-10-09/browser');
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
  '/host.css': [cssPath, 'text/css'],
  '/fixture.wav': [fixture, 'audio/wav'],
};
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syllable draft editing acceptance</title><link rel="stylesheet" href="/host.css"><style>body{font-family:system-ui;margin:16px}main{max-width:960px;margin:0 auto}h1{font-size:1.25rem;margin-bottom:16px}</style></head><body><main><h1>Syllable recording draft</h1><div id="root"></div></main></body></html>';
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
const review = () => editor().getByRole('checkbox', { name: /I listened to the sequence/ });
const labels = () => editor().locator('input[placeholder="Written hint"]').evaluateAll(nodes => nodes.map(node => node.value));
const hint = number => editor().getByLabel('Syllable ' + number + ' label', { exact: false });
const source = asset => 'data:' + asset.mime + ';base64,' + asset.base64;
async function idle() {
  await page.waitForFunction(() => {
    const select = document.querySelector('#qa-editor select');
    return select && !select.disabled;
  }, null, { timeout: 30000 });
}
async function mount() {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js']) await page.addScriptTag({ url });
  await page.evaluate(() => {
    const q = window.__qa = { writes: [], audios: [], events: [], overlaps: [] };
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
  });
  await page.addScriptTag({ url: '/editor.js' });
  await page.evaluate(async () => {
    const q = window.__qa;
    const fixtureBytes = await (await fetch('/fixture.wav')).arrayBuffer();
    const asset = await window.__readRecording(new Blob([fixtureBytes], { type: 'audio/wav' }));
    const assets = [asset];
    for (const frequency of [330, 440, 550]) {
      const sampleRate = 24000, samples = new Float32Array(sampleRate * 0.2);
      for (let i = 0; i < samples.length; i++) samples[i] = 0.1 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
      assets.push(await window.__readRecording(new Blob([window.__encodeWav([samples], sampleRate)], { type: 'audio/wav' })));
    }
    q.assets = assets;
    q.initial = window.__core.createReviewedSyllableTask({ targetWord: 'alligator', language: 'en-US', revision: 100, syllables: ['al', 'li', 'ga', 'tor'], assets, reviewed: true });
    q.two = window.__core.createReviewedSyllableTask({ targetWord: 'alligator', language: 'en-US', revision: 101, syllables: ['first', 'second'], assets: assets.slice(0, 2), reviewed: true });
    if (!q.initial || !q.two) throw Error('Reviewed editing fixtures did not validate');
    function Host() {
      const [props, setProps] = window.React.useState({ word: 'alligator', language: 'en-US', board: q.initial });
      q.props = props; q.updateProps = next => setProps(previous => ({ ...previous, ...next }));
      return window.React.createElement(window.__editor, { ...props, id: 'qa-editor', onSave: task => {
        q.writes.push(task); setProps(previous => ({ ...previous, board: task }));
      } });
    }
    q.root = window.ReactDOM.createRoot(document.getElementById('root'));
    q.root.render(window.React.createElement(Host));
  });
  await page.locator('#qa-editor > summary').click();
  await editor().getByText('Reuse reviewed recordings', { exact: true }).click();
  await idle();
}
async function play(buttonName, expectedSources) {
  const before = await page.evaluate(() => ({ events: window.__qa.events.length, audios: window.__qa.audios.length }));
  await editor().getByRole('button', { name: buttonName, exact: true }).click();
  await idle();
  const state = await page.evaluate(before => ({ events: window.__qa.events.slice(before.events), sources: window.__qa.audios.slice(before.audios).map(audio => audio.src), overlaps: window.__qa.overlaps }), before);
  assert.deepEqual(state.overlaps, []);
  assert.deepEqual(state.sources, expectedSources);
  const starts = state.events.filter(event => event.type === 'playing'), ends = state.events.filter(event => event.type === 'ended');
  assert.equal(starts.length, expectedSources.length, 'every expected clip started');
  assert.equal(ends.length, expectedSources.length, 'every expected clip ended');
  for (let index = 1; index < starts.length; index++) assert.ok(ends[index - 1].at < starts[index].at, 'clips play sequentially');
  return { events: state.events, sourceHashes: state.sources.map(hash) };
}
async function mustReviewAgain() {
  assert.equal(await review().isDisabled(), true);
  assert.equal(await review().isChecked(), false);
  assert.equal(await saveButton().isDisabled(), true);
}
async function hiddenFour() {
  await mount();
  await count().selectOption('2');
  assert.deepEqual(await labels(), ['al', 'li']);
  assert.equal(await editor().getByText(/Extra syllables are kept while you edit/).count(), 1);
}
async function expandedBlanks(firstTwo) {
  await count().selectOption('4');
  assert.deepEqual(await labels(), [...firstTwo, '', '']);
  assert.equal(await editor().getByRole('button', { name: 'Hear syllable 3', exact: true }).isDisabled(), true);
  assert.equal(await editor().getByRole('button', { name: 'Hear syllable 4', exact: true }).isDisabled(), true);
  assert.equal(await editor().getByText(/Extra syllables are kept while you edit/).count(), 0);
  await mustReviewAgain();
}
async function run() {
  global.gc?.();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, timeout: 120000 });
  context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    externalRequests.push(route.request().url()); return route.abort();
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await mount();
  const assets = await page.evaluate(() => window.__qa.assets);
  assert.equal(new Set(assets.map(asset => asset.base64)).size, 4, 'fixtures have distinct waveform bytes');
  assert.equal(await editor().getByRole('button', { name: 'Move syllable 1 earlier', exact: true }).isDisabled(), true);
  assert.equal(await editor().getByRole('button', { name: 'Move syllable 4 later', exact: true }).isDisabled(), true);
  await editor().getByRole('button', { name: 'Clean up syllable 3', exact: true }).click();
  await idle();
  assert.equal(await editor().getByRole('button', { name: 'Undo cleanup syllable 3', exact: true }).count(), 1);
  await editor().getByRole('button', { name: 'Hear syllable 3', exact: true }).click();
  await idle();
  const cleanedSource = await page.evaluate(() => window.__qa.audios.at(-1).src);
  assert.notEqual(cleanedSource, source(assets[2]), 'cleanup changes the quiet tone waveform');
  await count().selectOption('2');
  assert.equal(await editor().getByText(/Extra syllables are kept while you edit/).count(), 1);
  await mustReviewAgain();
  await count().selectOption('4');
  assert.deepEqual(await labels(), ['al', 'li', 'ga', 'tor']);
  assert.equal(await editor().getByRole('button', { name: 'Undo cleanup syllable 3', exact: true }).count(), 1);
  assert.equal(await editor().getByText(/Extra syllables are kept while you edit/).count(), 0);
  await play('Hear original syllable 3', [source(assets[2])]);
  await play('Hear syllable 3', [cleanedSource]);
  pass('reducing four syllables to two and restoring four recovers labels, checked clips, cleanup audio, and original undo audio');
  const moveEarlier = editor().getByRole('button', { name: 'Move syllable 3 earlier', exact: true });
  await moveEarlier.focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await labels(), ['al', 'ga', 'li', 'tor']);
  assert.equal(await hint(2).evaluate(node => document.activeElement === node), true);
  assert.equal(await editor().getByRole('button', { name: 'Undo cleanup syllable 2', exact: true }).count(), 1);
  await play('Hear original syllable 2', [source(assets[2])]);
  await play('Hear syllable 2', [cleanedSource]);
  await mustReviewAgain();
  pass('keyboard reordering moves label, cleanup, original audio, and focus together');
  report.fourPreview = await play('Preview syllables in order', [source(assets[0]), cleanedSource, source(assets[1]), source(assets[3])]);
  assert.equal(await review().isDisabled(), false);
  await review().check();
  assert.equal(await saveButton().isDisabled(), false);
  const moveLater = editor().getByRole('button', { name: 'Move syllable 2 later', exact: true });
  await moveLater.focus(); await page.keyboard.press('Space');
  assert.deepEqual(await labels(), ['al', 'li', 'ga', 'tor']);
  assert.equal(await hint(3).evaluate(node => document.activeElement === node), true);
  await mustReviewAgain();
  pass('four native clips play in reordered sequence without overlap, and another move requires a new review');
  await count().selectOption('2');
  report.twoPreview = await play('Preview syllables in order', assets.slice(0, 2).map(source));
  await review().check();
  assert.equal(await saveButton().isDisabled(), false);
  await count().selectOption('4');
  await mustReviewAgain();
  await count().selectOption('2');
  report.savedPreview = await play('Preview syllables in order', assets.slice(0, 2).map(source));
  await review().check();
  await saveButton().click();
  await page.waitForFunction(() => window.__qa.writes.length === 1);
  const saved = await page.evaluate(() => window.__qa.props.board);
  assert.deepEqual(saved.syllables, ['al', 'li']);
  assert.deepEqual(saved.audioUnits.map(unit => unit.asset), assets.slice(0, 2));
  await expandedBlanks(['al', 'li']);
  pass('count changes clear review; preview and save include only displayed clips, and saving clears hidden drafts');
  await hint(3).fill('unsaved draft');
  const downloadPromise = page.waitForEvent('download');
  await editor().getByRole('button', { name: 'Download saved recording set', exact: true }).click();
  const download = await downloadPromise;
  const downloadedPath = path.join(out, 'saved-two-recording-set.json');
  await download.saveAs(downloadedPath);
  assert.equal(await download.failure(), null);
  const envelope = JSON.parse(fs.readFileSync(downloadedPath, 'utf8'));
  assert.deepEqual(envelope.task.syllables, ['al', 'li']);
  assert.deepEqual(envelope.task.audioUnits.map(unit => unit.asset), assets.slice(0, 2));
  pass('download contains the saved two-clip set while an unfinished four-row draft remains in the editor');
  await hiddenFour();
  await editor().getByLabel('Import recording set', { exact: false }).setInputFiles({ name: 'two.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(envelope)) });
  await idle();
  await expandedBlanks(['al', 'li']);
  assert.equal(await page.evaluate(() => window.__qa.writes.length), 0);
  pass('successful portable import clears hidden extra clips without silently saving the draft');
  await hiddenFour();
  await page.evaluate(async () => {
    const q = window.__qa, existing = await window.__library.load('alligator', 'en-US');
    await window.__library.save('alligator', 'en-US', q.two, { expectedToken: existing.token });
  });
  await editor().getByRole('button', { name: 'Find saved recording', exact: true }).click();
  await editor().getByRole('button', { name: 'Use saved recordings in this lesson', exact: true }).waitFor();
  await editor().getByRole('button', { name: 'Use saved recordings in this lesson', exact: true }).click();
  await page.waitForFunction(() => window.__qa.writes.length === 1);
  await expandedBlanks(['first', 'second']);
  pass('applying reviewed library recordings clears hidden extra clips from the previous draft');
  await hiddenFour();
  await page.evaluate(() => window.__qa.updateProps({ board: window.__qa.two }));
  await page.waitForFunction(() => document.querySelector('#qa-editor input[placeholder="Written hint"]').value === 'first');
  await expandedBlanks(['first', 'second']);
  pass('replacing the saved board revision clears extra drafts from the previous revision');
  for (const [name, props] of [['word', { word: 'watermelon' }], ['language', { language: 'es' }]]) {
    await hiddenFour();
    await page.evaluate(props => window.__qa.updateProps(props), props);
    await page.waitForFunction(() => [...document.querySelectorAll('#qa-editor input[placeholder="Written hint"]')].every(input => !input.value));
    await expandedBlanks(['', '']);
    pass('changing the ' + name + ' clears extra drafts from the previous recording context');
  }
  await mount();
  await count().selectOption('2');
  report.layouts = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('#qa-editor *')].filter(node => {
        if (!node.getClientRects().length) return false;
        const rect = node.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1;
      }).map(node => ({ tag: node.tagName, text: node.textContent?.slice(0, 100), right: node.getBoundingClientRect().right })),
    }));
    await page.screenshot({ path: path.join(out, 'draft-editor-' + width + '.png'), fullPage: true });
    report.layouts.push(layout);
    assert.ok(layout.documentWidth <= width, 'no document horizontal overflow at ' + width);
    assert.deepEqual(layout.overflow, [], 'editor controls fit at ' + width);
  }
  pass('reorder controls and retained-syllable notice fit 390 px and 1280 px viewports with local production CSS');
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
  report.limits = 'Actual React, production core/library/editor source, local production CSS, Chromium download, native audio decoding and playback. Supplied WAV plus distinct generated tones test editing, source order, and review behavior, not pronunciation quality. Isolated editor only; no physical microphone, speech generation, full-host layout, or cloud delivery.';
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
});
