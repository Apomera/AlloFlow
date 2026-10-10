/* Native Chromium acceptance of production WordSoundsModal choice editing.
 * Audio is a local WAV fixture: playback/decode mechanics, not pronunciation. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const parentDirectory = path.resolve(__dirname, '..');
const repo = process.env.WORD_SOUNDS_REPO || (fs.existsSync(path.join(parentDirectory, 'word_sounds_core.js')) ? parentDirectory : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated');
const out = process.env.WORD_SOUNDS_QA_OUT || path.join(repo, 'reports/word-sounds-syllable-choice-continuity-2026-10-09/browser');
const fixture = process.env.WORD_SOUNDS_QA_WAV || path.join(repo, 'reports/word-sounds-portable-recordings-2026-10-09/fixture.wav');
const { chromium } = require(require.resolve('playwright', { paths: [repo] }));
fs.mkdirSync(out, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const coreSource = fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8');
const fixtureBytes = fs.readFileSync(fixture);
const fixtureSources = [0, 1, 2].map(index => {
  const bytes = Buffer.from(fixtureBytes);
  // Distinct valid WAV sources allow event attribution; only one PCM byte differs.
  if (index) bytes[bytes.length - 4] ^= index;
  return 'data:audio/wav;base64,' + bytes.toString('base64');
});
const stringsAll = JSON.parse(fs.readFileSync(path.join(repo, 'ui_strings.js'), 'utf8'));
const strings = { common: stringsAll.common, word_sounds: stringsAll.word_sounds };
const harness = fs.readFileSync(path.join(repo, 'tests/helpers/word_sounds_harness.js'), 'utf8');
const icons = harness.match(/const ICONS = \[[^;]+;/)[0];
const ambientInstall = harness.slice(harness.indexOf('function installAmbientGlobals()'), harness.indexOf('/**\n * Load WordSoundsModal'));
const base = harness.slice(harness.indexOf('const passthroughT'), harness.indexOf('function scrub(')).replace('export function baseProps', 'function baseProps');
const ambient = `const React=window.React;const noop=()=>{};${icons}\n${ambientInstall}\n${base}\ninstallAmbientGlobals();window.__baseProps=baseProps;window.AlloLanguageContext=React.createContext({});`;
const deliverySource = fs.readFileSync(path.join(repo, 'live_aac_source.jsx'), 'utf8');
const deliveryEnd = deliverySource.indexOf('// Mailbox media preparation is separate from the synchronous privacy serializer.');
assert.ok(deliveryEnd > deliverySource.indexOf('const _alloSerializeResourceForStudentPack ='), 'serializer prefix has a stable boundary');
const delivery = deliverySource.slice(0, deliveryEnd) + '\nwindow.__qaSerialize = _alloSerializeResourceForStudentPack;';
const css = path.join(repo, 'app/static/css/main.3f49a8fc.css');
const routes = {
  '/react.js': [path.join(repo, 'desktop/web-app/node_modules/react/umd/react.development.js'), 'application/javascript'],
  '/react-dom.js': [path.join(repo, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'), 'application/javascript'],
  '/pure.js': [path.join(repo, 'pure_helpers_module.js'), 'application/javascript'],
  '/misc.js': [path.join(repo, 'misc_components_module.js'), 'application/javascript'],
  '/readiness.js': [path.join(repo, 'word_sounds_readiness_contract.js'), 'application/javascript'],
  '/runtime.js': [path.join(repo, 'word_sounds_module.js'), 'application/javascript'],
  '/firestore.js': [path.join(repo, 'firestore_sync_module.js'), 'application/javascript'],
  '/host.css': [css, 'text/css'],
};
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syllable choice acceptance</title><link rel="stylesheet" href="/host.css"></head><body><button id="qa-start">Open lesson</button><div id="root"></div></body></html>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/core.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(coreSource + '\nwindow.__core=createWordSoundsCore();'); return; }
  if (pathname === '/delivery.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(delivery); return; }
  const route = routes[pathname];
  if (route) { res.setHeader('Content-Type', route[1]); res.end(fs.readFileSync(route[0])); return; }
  res.statusCode = 404; res.end();
});
let browser, context, page;
const checks = [], errors = [], externalRequests = [], cases = [];
const report = { checks, errors, externalRequests, cases };
const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log('PASS ' + name); };
const recordIdentity = task => ({ contentStatus: task.contentStatus, targetWord: task.targetWord, language: task.language, revision: task.revision, syllables: task.syllables, audioUnits: task.audioUnits, review: task.review });
const currentBoard = () => page.evaluate(() => window.__qa.current?.activityItems?.syllable_blending);
const preparedBoard = () => page.evaluate(() => window.__qa.preloaded[0]?.activityItems?.syllable_blending);
async function mount(config = {}) {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js']) await page.addScriptTag({ url });
  await page.addScriptTag({ content: ambient });
  await page.addScriptTag({ url: '/core.js' });
  await page.evaluate(async ({ fixtureSources, strings, config }) => {
    const q = window.__qa = { events: [], audios: [], overlaps: [], synthesis: [], gemini: [], writes: [] };
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args), id = q.audios.length;
      q.audios.push(audio);
      for (const type of ['playing', 'pause', 'ended', 'error']) audio.addEventListener(type, () => {
        const index = fixtureSources.indexOf(audio.currentSrc || audio.src);
        q.events.push({ id, type, index, at: performance.now() });
        if (type === 'playing' && q.audios.some(other => other !== audio && !other.paused && !other.ended)) q.overlaps.push(id);
      });
      return audio;
    };
    window.Audio.prototype = NativeAudio.prototype;
    const audioContext = new OfflineAudioContext(1, 1, 16000);
    const assets = [];
    for (const source of fixtureSources) {
      const bytes = Uint8Array.from(atob(source.split(',')[1]), ch => ch.charCodeAt(0));
      const decoded = await audioContext.decodeAudioData(bytes.buffer);
      assets.push({ mime: 'audio/wav', base64: source.split(',')[1], source: 'teacher_recording', decoded: true, durationSeconds: decoded.duration });
    }
    const target = config.target || 'sunset', language = config.language || 'English';
    const parts = config.parts || (target === 'banana' ? ['ba', 'na', 'na'] : ['sun', 'set']);
    const options = config.options || (target === 'banana' ? ['banana', 'tomato', 'potato', 'pajamas'] : ['cupcake', 'sunset', 'raindrop', 'milkshake']);
    let board = window.__core.createReviewedSyllableTask({ targetWord: config.boardTarget || target, language: config.boardLanguage || language, revision: 17, syllables: parts, assets: assets.slice(0, parts.length), reviewed: true });
    if (!board) throw Error('Fixture could not create a valid reviewed task');
    board = { ...board, options: config.malformed ? [target, target, 'forbidden-old'] : options, answer: board.targetWord };
    const vocabulary = [...new Set([target, ...options, 'raincoat', 'tomato', 'potato', 'pajamas', 'sunset', 'cupcake', 'raindrop', 'milkshake', ...(config.pool || [])])];
    const words = Object.fromEntries(vocabulary.map(word => [word, fixtureSources[0]]));
    window.__ALLO_INSTRUCTION_AUDIO = {};
    window.__ALLO_PHONEME_AUDIO_BANK = {};
    window._CACHE_WORD_AUDIO_BANK = words;
    window.loadWordAudioBank = async () => words;
    window.loadAudioBank = async () => {};
    const wholeAsset = { mime: 'audio/wav', base64: assets[0].base64, provenance: { version: 1, source: 'recorded_bank', provider: 'kokoro', resolvedVoice: 'af_heart', language } };
    const initial = config.resource?.data?.[0] || { word: target, targetWord: target, phonemes: ['b', 'a', 'n'], phonemeCount: 3, syllables: parts,
      _preparedActivities: ['syllable_blending'], _studentPackVersion: 2, _ttsRequiredKeys: [...options, target],
      activityItems: { syllable_blending: board }, _ttsAssets: Object.fromEntries(vocabulary.map(word => [word, wholeAsset])) };
    q.initial = initial; q.expectedAssets = assets; q.fixtureSources = fixtureSources;
    const poolItems = (config.pool || []).map(word => ({ word, targetWord: word, syllables: ['one', 'two'], phonemes: ['a'], _preparedActivities: ['syllable_blending'], _ttsAssets: { [word]: wholeAsset } }));
    const lookup = (key, params = {}) => {
      const [section, name] = key.split('.'); let value = strings[section]?.[name];
      if (typeof value !== 'string') return '';
      for (const [name, replacement] of Object.entries(params)) value = value.replaceAll('{' + name + '}', String(replacement));
      return value;
    };
    document.getElementById('qa-start').onclick = () => {
      function Host() {
        const [defaults] = React.useState(() => window.__baseProps('syllable_blending'));
        const [word, setWord] = React.useState(initial.word), [data, setData] = React.useState(initial);
        const [activity, setActivity] = React.useState('syllable_blending'), [feedback, setFeedback] = React.useState(null);
        const [preloaded, setPreloaded] = React.useState(config.resource?.data || [initial, ...poolItems]);
        const setWords = React.useCallback(update => setPreloaded(previous => { const next = typeof update === 'function' ? update(previous) : update; q.writes.push(next); return next; }), []);
        const synth = React.useCallback(async (text, voice, speed, opts = {}) => {
          q.synthesis.push({ text, voice, allowProviderFallback: opts.allowProviderFallback });
          opts.onResolvedProfile?.({ provider: 'kokoro', resolvedVoice: voice, language });
          return words[String(text).toLowerCase()] || fixtureSources[0];
        }, []);
        const gemini = React.useCallback(async () => { q.gemini.push(true); throw Error('Unexpected external generation'); }, []);
        const props = { ...defaults, t: lookup, getWordSoundsString: (_t, key, params) => lookup(key, params),
          currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord, wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
          wordSoundsActivity: activity, setWordSoundsActivity: setActivity, wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
          wsPreloadedWords: preloaded, setWsPreloadedWords: setWords, isTeacherMode: true, isProbeMode: false, isMinimized: false,
          initialShowReviewPanel: !!config.review, initialActivitySequence: ['syllable_blending'], selectedVoice: 'af_heart',
          wordSoundsLanguage: language, playInstructions: false, allowRuntimeAi: true, callTTS: synth, callGemini: gemini,
          callImagen: null, wordSoundsAudioLibrary: words };
        q.props = props; q.preloaded = preloaded; q.current = data;
        return React.createElement(window.AlloModules.WordSoundsModal, props);
      }
      q.root = ReactDOM.createRoot(document.getElementById('root')); q.root.render(React.createElement(Host));
    };
  }, { fixtureSources, strings, config });
  for (const url of ['/pure.js', '/misc.js', '/readiness.js', '/runtime.js']) await page.addScriptTag({ url });
  await page.locator('#qa-start').click();
}
async function editChoice(oldValue, newValue) {
  await page.locator('button[title="' + (strings.common.edit || 'Edit') + '"]').click();
  const options = page.getByRole('textbox', { name: strings.common.enter_opt || 'Edit option', exact: true });
  await options.first().waitFor();
  const values = await options.evaluateAll(nodes => nodes.map(node => node.value));
  assert.ok(values.includes(oldValue), 'editable board contains intended distractor');
  await options.nth(values.indexOf(oldValue)).fill(newValue);
  await options.nth(values.indexOf(oldValue)).press('Tab');
  await page.waitForFunction(value => window.__qa.preloaded[0]?.activityItems?.syllable_blending?.options?.includes(value), newValue);
  await page.locator('button[title="' + (strings.common.done || 'Done') + '"]').click();
  await page.getByRole('button', { name: newValue, exact: true }).waitFor();
}
async function previewSequence(count) {
  const play = page.getByRole('button', { name: /Play Syllables/i });
  await play.waitFor();
  await page.waitForFunction(() => window.__qa.audios.every(audio => audio.paused || audio.ended));
  // A disabled button can make Playwright wait through the tail of autoplay.
  // Record at the actual click, including any clip this action starts.
  await play.evaluate(button => button.addEventListener('click', () => {
    window.__qa.previewStart = window.__qa.events.length;
  }, { once: true, capture: true }));
  await play.click();
  const before = await page.evaluate(() => window.__qa.previewStart);
  await page.waitForFunction(({ before, count }) => window.__qa.events.slice(before).filter(event => event.type === 'ended' && event.index >= 0).length >= count, { before, count }, { timeout: 30000 });
  const events = await page.evaluate(before => window.__qa.events.slice(before), before);
  assert.deepEqual(events.filter(event => event.type === 'ended' && event.index >= 0).map(event => event.index), Array.from({ length: count }, (_, index) => index));
  assert.deepEqual(await page.evaluate(() => window.__qa.overlaps), []);
  return events;
}
async function serialize() {
  await page.addScriptTag({ url: '/firestore.js' }); await page.addScriptTag({ url: '/delivery.js' });
  return page.evaluate(() => {
    const q = window.__qa;
    const resource = window.AlloModules.WordSoundsReadiness.portable({ id: 'qa-syllable-choices', type: 'word-sounds', data: q.preloaded,
      wordSoundsLanguage: q.props.wordSoundsLanguage, lessonPlanSequence: ['syllable_blending'], sessionConfig: { wordSoundsLanguage: q.props.wordSoundsLanguage } });
    return window.__qaSerialize(resource, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
  });
}
async function openEditor() {
  await page.locator('[aria-controls="word-sounds-details-0"]').click();
  const editor = page.locator('#ws-syllables-0'); await editor.locator(':scope > summary').click(); return editor;
}
async function saveEditor(editor, upload = false, parts = ['sun', 'set']) {
  if (upload) {
    await editor.getByLabel('Number of syllables', { exact: false }).selectOption(String(parts.length));
    for (let index = 0; index < parts.length; index++) {
      await editor.getByLabel('Syllable ' + (index + 1) + ' label', { exact: false }).fill(parts[index]);
      await editor.getByLabel('Upload syllable ' + (index + 1), { exact: false }).setInputFiles({ name: 'syllable-' + index + '.wav', mimeType: 'audio/wav', buffer: Buffer.from(fixtureSources[index].split(',')[1], 'base64') });
      await page.waitForFunction(number => [...document.querySelectorAll('#ws-syllables-0 button')].some(button => button.textContent === 'Hear syllable ' + number && !button.disabled), index + 1);
    }
  }
  const before = (await preparedBoard())?.revision;
  await editor.getByRole('button', { name: 'Preview syllables in order', exact: true }).click();
  const confirmation = editor.getByRole('checkbox', { name: /I listened to the sequence/ });
  await page.waitForFunction(() => [...document.querySelectorAll('#ws-syllables-0 label')].some(label => label.textContent.includes('I listened to the sequence') && !label.querySelector('input').disabled), null, { timeout: 30000 });
  await confirmation.check(); await editor.getByRole('button', { name: 'Save reviewed syllables', exact: true }).click();
  await page.waitForFunction(before => { const task = window.__qa.preloaded[0]?.activityItems?.syllable_blending; return task?.contentStatus === 'teacher_recorded' && task.revision !== before; }, before);
  return preparedBoard();
}
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, timeout: 120000 });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^(?:data:|blob:|http:\/\/127\.0\.0\.1:)/.test(url)) return route.continue();
    externalRequests.push(url); return route.abort();
  });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  for (const [target, oldValue, newValue, count] of [['sunset', 'cupcake', 'raincoat', 2], ['banana', 'tomato', 'sunset', 3]]) {
    await mount({ target });
    await page.getByRole('button', { name: oldValue, exact: true }).waitFor({ timeout: 30000 });
    const before = await preparedBoard();
    await editChoice(oldValue, newValue);
    const edited = await preparedBoard();
    assert.deepEqual(recordIdentity(edited), recordIdentity(before));
    assert.deepEqual(recordIdentity(await currentBoard()), recordIdentity(before));
    assert.ok(edited.options.includes(target)); assert.ok(edited.options.includes(newValue)); assert.ok(!edited.options.includes(oldValue));
    assert.deepEqual((await currentBoard()).options, edited.options);
    assert.equal(await page.evaluate(() => window.__core.reviewedSyllableReady(window.__qa.current.activityItems.syllable_blending)), true);
    pass(target + ': teacher choice edit preserves exact reviewed recordings, revision, and signature in current and prepared words');
    const events = await previewSequence(count); cases.push({ target, beforeIdentity: { revision: before.revision, signature: before.review.signature }, editedOptions: edited.options, playback: events });
    if (target === 'sunset') {
      pass('choice-edited bank word plays the exact native reviewed clips sequentially without overlap');
      await page.screenshot({ path: path.join(out, 'syllable-choices-1280.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(out, 'syllable-choices-390.png'), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    const resource = await serialize();
    assert.deepEqual(resource.data[0].activityItems.syllable_blending, edited);
    fs.writeFileSync(path.join(out, target + '-student-pack.json'), JSON.stringify(resource, null, 2));
    await mount({ target, resource });
    await page.getByRole('button', { name: newValue, exact: true }).waitFor({ timeout: 30000 });
    assert.deepEqual(await preparedBoard(), edited); assert.deepEqual((await currentBoard()).options, edited.options);
    assert.deepEqual(recordIdentity(await currentBoard()), recordIdentity(before));
    await previewSequence(count);
    pass(target + ': actual student-pack serializer and fresh modal reload retain edited choices and playable reviewed clips');
  }
  await mount({ review: true });
  const beforeSave = await preparedBoard();
  const saved = await saveEditor(await openEditor());
  assert.deepEqual(saved.options, beforeSave.options); assert.ok(saved.revision > beforeSave.revision);
  assert.equal(await page.evaluate(() => window.__core.reviewedSyllableReady(window.__qa.preloaded[0].activityItems.syllable_blending)), true);
  pass('saving a newly reviewed recording revision preserves matching authored answer choices');
  const rejected = [];
  for (const config of [
    { malformed: true },
    { boardTarget: 'banana', options: ['banana', 'forbidden-old', 'other-old'] },
    { boardLanguage: 'es', options: ['sunset', 'forbidden-old', 'other-old'] },
  ]) {
    await mount({ review: true, ...config });
    const task = await saveEditor(await openEditor(), !config.malformed);
    assert.ok(task.options.includes('sunset')); assert.ok(!task.options.some(option => option.endsWith('-old')));
    assert.equal(task.targetWord, 'sunset'); assert.equal(task.language, 'en');
    rejected.push({ config, options: task.options });
  }
  cases.push({ rejected });
  pass('recording save rejects malformed, other-word, and other-language inherited choices');
  const spanishPool = ['tomate', 'paloma', 'camiseta'];
  await mount({ target: 'mariposa', language: 'es', parts: ['ma', 'ri', 'posa'], malformed: true, options: ['mariposa', ...spanishPool], pool: spanishPool, review: true });
  const spanishTask = await saveEditor(await openEditor(), false, ['ma', 'ri', 'posa']);
  assert.ok(spanishTask.options.length >= 2); assert.ok(spanishTask.options.every(option => ['mariposa', ...spanishPool].includes(option)));
  assert.equal(spanishTask.language, 'es'); assert.deepEqual(await page.evaluate(() => window.__qa.gemini), []);
  pass('non-English recorded word obtains replacement choices from the same lesson without English bank fillers');
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []); assert.equal(checks.length, 8);
}
run().catch(async error => {
  process.exitCode = 1; report.error = error.stack || String(error); console.error(report.error);
  if (page && !page.isClosed()) {
    report.text = await page.locator('body').innerText().catch(() => 'unavailable');
    report.state = await page.evaluate(() => ({ current: window.__qa?.current, preloaded: window.__qa?.preloaded, events: window.__qa?.events, synthesis: window.__qa?.synthesis, gemini: window.__qa?.gemini })).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  }
}).finally(async () => {
  if (browser) await browser.close(); server.close();
  report.hashes = Object.fromEntries(['word_sounds_core.js', 'word_sounds_module.js', 'word_sounds_setup_source.jsx', 'word_sounds_setup_module.js', 'word_sounds_readiness_contract.js', 'live_aac_source.jsx', 'firestore_sync_module.js', 'misc_components_module.js'].map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));
  report.limits = 'Actual WordSoundsModal, production recording editor, canonical core, native Chromium WAV decoding/playback, production CSS and production resource serialization. Host uses React state and local audio fixtures; any TTS calls receive fixture audio. This does not evaluate pronunciation, physical microphone capture, full Studio generation, cloud delivery, or the full production host.';
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
});
