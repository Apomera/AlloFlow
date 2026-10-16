// Native Chromium smoke test of the production syllable resolver and views.
// Extracted views retain their production source; only the small host is a fixture.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { transformSync } = require('@babel/core');
const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'reports/word-sounds-pronunciation-exit-2026-10-15');
fs.mkdirSync(out, { recursive: true });
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const setup = read('word_sounds_setup_source.jsx'), runtime = read('word_sounds_module.js'), core = read('word_sounds_core.js');
const slice = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Production extraction boundaries exist');
  return source.slice(a, b);
};
const views = transformSync(slice(setup, '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY', 'function buildWordPracticeSelection('), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'],
}).code + '\n' + slice(runtime, '// BEGIN WORD SOUNDS COUNT RESULTS', '// Maps each phoneme/letter') + '\n' + slice(runtime, 'const syllableCountWordKey =', '// BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE') + `
window.__views={WordSoundsSyllableCountReview,WordSoundsSyllableCountQueue,WordSoundsSyllableRecordingEditor,SyllableCountingView,WordSoundsCountResults,WordSoundsSyllableReviewDetails};`;
const hostSource = read('AlloFlowANTI.txt');
const hostCallbackStart = hostSource.indexOf('onShowReview={');
const hostCallbackEnd = hostSource.indexOf('\n              }}', hostCallbackStart);
const hostRuntimeSetter = hostSource.match(/setWsPreloadedWords: ([^\r\n]+),\r?\n(?:\s+reviewAuthoringSession: [^\r\n]+,\r?\n)?\s+wordSoundsActivity/);
assert.ok(hostCallbackStart >= 0 && hostCallbackEnd > hostCallbackStart && hostRuntimeSetter, 'Production host ownership boundaries exist');
const ownershipHost = `
window.__makeOwnershipFixture = (initialWords, asset) => {
  const {useRef, useEffect} = React;
  return function OwnershipFixture() {
    const [wsPreloadedWords, setWords] = React.useState(initialWords), [showSetup, setShowSetup] = React.useState(true);
    const reviews = useRef([]), generatedContent = {id:'mixed-review-browser-pack'}, isWordSoundsMode = true, wsActivitySequence = ['syllable_counting'];
    const wsDispatch = action => setWords(action.value);
    const setIsWordSoundsMode = () => {}, setWordSoundsActivity = () => {}, setWordSoundsAutoReview = () => {}, setActiveView = () => {};
    ${slice(hostSource, 'const wordSoundsSetupReviewEpoch =', 'const setWsActivitySequence =')}
    const handoff = ${hostSource.slice(hostCallbackStart + 'onShowReview={'.length, hostCallbackEnd) + '\n}'};
    const runtimeUpdate = ${hostRuntimeSetter[1]};
    window.__mixedHandoff = { words:wsPreloadedWords, session:wordSoundsSetupReviewSession, reviews:reviews.current };
    if (!showSetup) return React.createElement('section', {id:'mixed-review-host'},
      React.createElement('button', {onClick:() => runtimeUpdate(words => words.map(item => ({...item,
        activityItems:{...item.activityItems, syllable_counting:WS_CORE.createReviewedSyllableCount({targetWord:'apple', language:'en',
          count:3, revision:2, reviewed:true, audioContext:WS_CORE.createSyllableCountAudioContext({asset,language:'en'})})}})))}, 'Apply later apple correction'),
      React.createElement('button', {onClick:() => setShowSetup(true)}, 'Return to setup'));
    return React.createElement(window.AlloModules.WordSoundsGenerator, {
      syllableReviewSession:wordSoundsSetupReviewSession, glossaryTerms:[], preloadedWords:wsPreloadedWords,
      isTeacherMode:true, isProbeMode:true, probeActivity:'syllable_counting', wordSoundsLanguage:'en', selectedVoice:'af_heart', gradeLevel:'K', t:key=>key,
      callTTS:async () => 'data:' + asset.mime + ';base64,' + asset.base64, onClose:() => {}, onStartGame:() => {},
      onShowReview:words => { reviews.current.push(words); handoff(words); setShowSetup(false); },
    });
  };
};`;
function wavAsset(frequency = 220) {
  const rate = 16000, length = 3200, bytes = Buffer.alloc(44 + length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(length * 2, 40);
  for (let index = 0; index < length; index++) bytes.writeInt16LE(Math.round(4000 * Math.sin(index * 2 * Math.PI * frequency / rate)), 44 + index * 2);
  return { mime: 'audio/wav', base64: bytes.toString('base64'), decoded: true, durationSeconds: length / rate, source: 'teacher_recording' };
}
const audioAsset = wavAsset(), changedAudioAsset = wavAsset(330);
const requests = [], checks = [], errors = [], externalRequests = [];
const report = { browser: 'Native Chromium', checks, errors, externalRequests, requests,
  scope: 'Actual pronunciation file and production resolver, count review, recording editor, and counting view; fixture host, no cloud or pronunciation-quality assertion.',
  sourceHashes: Object.fromEntries(['word_sounds_core.js', 'word_sounds_pronunciations.js', 'word_sounds_setup_source.jsx', 'word_sounds_module.js', 'AlloFlowANTI.txt'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')])) };
const routes = {
  '/react.js': ['desktop/web-app/node_modules/react/umd/react.development.js', 'application/javascript'],
  '/react-dom.js': ['desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'application/javascript'],
  '/modules/word_sounds_pronunciations.js': ['word_sounds_pronunciations.js', 'application/javascript'],
  '/modules/setup.js': ['word_sounds_setup_module.js', 'application/javascript'],
  '/host.css': ['app/static/css/' + fs.readdirSync(path.join(repo, 'app/static/css')).find(name => /^main\..+\.css$/.test(name)), 'text/css'],
};
let failDictionaryRequests = 0;
const server = http.createServer((req, res) => {
  requests.push(req.url);
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/modules/word_sounds_pronunciations.js' && failDictionaryRequests > 0) { failDictionaryRequests--; res.statusCode = 503; return res.end('Intentional first-load failure'); }
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word Sounds syllable review acceptance</title><link rel="stylesheet" href="/host.css"><style>body{font:16px system-ui;background:#f8fafc;color:#172033;margin:24px}main{max-width:1100px;margin:auto}h1{font-size:26px;font-weight:800;margin:16px 0}h2{font-size:20px;font-weight:700;margin:8px 0}section{background:white;border:1px solid #cbd5e1;border-radius:16px;padding:20px;margin:16px 0}label{line-height:1.6}button,input,select{margin:4px}input[type=checkbox]{margin-top:5px}</style></head><body><main><h1>Word Sounds — syllable review</h1><div id="root"></div></main></body></html>');
  }
  if (pathname === '/modules/core.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(core + '\nwindow.WS_CORE=createWordSoundsCore();window.__secondCore=createWordSoundsCore();');
  }
  if (pathname === '/views.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(views); }
  if (pathname === '/ownership-host.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(ownershipHost); }
  if (routes[pathname]) { const [file, type] = routes[pathname]; res.setHeader('Content-Type', type); return res.end(fs.readFileSync(path.join(repo, file))); }
  res.statusCode = 404; res.end();
});
let browser, page;
const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log('PASS ' + name); };
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const executablePath = process.env.WORD_SOUNDS_CHROMIUM || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
  browser = await chromium.launch({ headless: true, executablePath, timeout: 60000 });
  report.browserVersion = browser.version();
  page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js', '/modules/core.js?v=acceptance']) await page.addScriptTag({ url });
  assert.equal(requests.some(value => value.includes('word_sounds_pronunciations.js')), false);
  const loaded = await page.evaluate(async () => {
    const results = await Promise.all([WS_CORE.loadSyllablePronunciations(), window.__secondCore.loadSyllablePronunciations()]);
    return { results, apple: WS_CORE.resolveSyllableCount('apple', { language: 'en' }), fire: WS_CORE.resolveSyllableCount('fire', { language: 'en' }), wordCount: window.AlloModules.WordSoundsPronunciations.wordCount };
  });
  assert.deepEqual(loaded.results, [true, true]);
  assert.equal(loaded.apple.count, 2); assert.equal(loaded.apple.supported, true);
  assert.equal(loaded.fire.supported, false); assert.deepEqual(loaded.fire.counts, [1, 2]);
  assert.equal(requests.filter(value => value.includes('word_sounds_pronunciations.js')).length, 1);
  assert.ok(requests.includes('/modules/word_sounds_pronunciations.js?v=acceptance'));
  pass('Concurrent core instances load one real pronunciation module relative to their script URL and retain the version query', loaded);
  await page.addScriptTag({ url: '/views.js' });
  await page.evaluate(({ audioAsset, changedAudioAsset }) => {
    const tr = (_key, fallback = '', params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll('{' + key + '}', String(value)), fallback);
    const h = React.createElement, { WordSoundsSyllableCountReview, WordSoundsSyllableRecordingEditor, SyllableCountingView } = window.__views;
    function Host() {
      const [review, setReview] = React.useState(null), [taps, setTaps] = React.useState(0), [grade, setGrade] = React.useState(''), [asset, setAsset] = React.useState(audioAsset);
      const [deliveredContext, setDeliveredContext] = React.useState(null), [playing, setPlaying] = React.useState(false);
      const audioContext = WS_CORE.createSyllableCountAudioContext({ asset, language: 'en' });
      const currentContext = React.useRef(audioContext.signature); currentContext.current = audioContext.signature;
      const resolution = WS_CORE.resolveSyllableCount('fire', { language: 'en', prepared: review, audioContext });
      const previewWord = async () => ({ source: 'data:' + asset.mime + ';base64,' + asset.base64, asset, audioContext });
      const playWord = () => {
        const signature = audioContext.signature;
        const clip = new Audio('data:' + asset.mime + ';base64,' + asset.base64);
        setPlaying(true); setDeliveredContext(null);
        clip.onended = () => { setPlaying(false); if (signature === currentContext.current) setDeliveredContext(signature); };
        clip.onerror = () => setPlaying(false);
        clip.play().catch(() => setPlaying(false));
      };
      window.__qa = { review, resolution, taps, grade, changeAudio: () => setAsset(changedAudioAsset) };
      return h(React.Fragment, null,
        h('section', { id: 'apple-review' }, h('h2', null, 'Dictionary-backed count'), h(WordSoundsSyllableCountReview, { word: 'apple', language: 'en', resolution: WS_CORE.resolveSyllableCount('apple', { language: 'en' }), onSave: () => {}, translate: tr })),
        h('section', { id: 'fire-review' }, h('h2', null, 'Pronunciation variant'), h(WordSoundsSyllableCountReview, { word: 'fire', language: 'en', resolution, audioContext, previewWord, onSave: setReview, translate: tr })),
        h('section', { id: 'runtime-count' }, h('h2', null, 'Student counting activity'), h(SyllableCountingView, { data: resolution, word: 'fire', tapCount: taps, onTap: () => setTaps(value => value + 1), onUndo: () => setTaps(value => Math.max(0, value - 1)), onReset: () => setTaps(0), onCheckAnswer: value => setGrade(value === resolution.count ? 'Correct' : 'Try again'), onPlayAudio: playWord, isAudioBusy: playing, canSubmit: deliveredContext === audioContext.signature, ts: () => '' }), h('p', { role: 'status' }, grade)),
        h('section', { id: 'recording' }, h('h2', null, 'Longer word recording template'), h(WordSoundsSyllableRecordingEditor, { word: 'responsibility', language: 'en', onSave: () => {}, translate: tr })));
    }
    window.__qaRoot = ReactDOM.createRoot(document.getElementById('root')); window.__qaRoot.render(h(Host));
  }, { audioAsset, changedAudioAsset });
  await page.locator('#apple-review').getByText('2 syllables · Pronunciation dictionary (US English)', { exact: true }).waitFor();
  assert.equal(await page.locator('#fire-review').getByRole('button', { name: 'Save reviewed count', exact: true }).isDisabled(), true);
  assert.equal(await page.locator('#runtime-count').getByRole('button', { name: 'Tap to count syllables', exact: true }).count(), 0);
  assert.ok((await page.locator('#fire-review').innerText()).includes('Pronunciations use 1 / 2 syllables'));
  await page.screenshot({ path: path.join(out, 'syllable-review-before.png'), fullPage: true });
  pass('Production setup review shows apple=2 and fire variants, while the student view blocks an unreviewed answer');
  await page.locator('#fire-review').getByRole('button', { name: 'Listen to whole word', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#fire-review input[type=checkbox]').disabled);
  await page.locator('#fire-review').getByRole('spinbutton').fill('1');
  await page.locator('#fire-review').getByRole('checkbox').check();
  await page.locator('#fire-review').getByRole('button', { name: 'Save reviewed count', exact: true }).click();
  await page.waitForFunction(() => window.__qa.resolution.supported && window.__qa.resolution.count === 1);
  const review = await page.evaluate(() => window.__qa.review);
  assert.equal(review.status, 'reviewed'); assert.equal(review.review.confirmed, true);
  const studentTap = page.locator('#runtime-count').getByRole('button', { name: 'Tap to count syllables', exact: true });
  const studentSubmit = await page.locator('#runtime-count').getByRole('button', { name: /check|submit/i }).elementHandle();
  await studentTap.focus();
  await page.keyboard.press('Space'); await page.keyboard.press('Space');
  await page.locator('#runtime-count').getByRole('button', { name: 'Undo last tap', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.ok((await page.locator('#runtime-count [role="status"][aria-live="polite"]').innerText()).includes('You tapped 1 time.'));
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Tap to count syllables');
  assert.equal(await studentSubmit.evaluate(button => button.isConnected), true);
  assert.ok((await page.locator('#runtime-count [role="status"][aria-live="polite"]').innerText()).includes('You tapped 0 times.'));
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#runtime-count').getByRole('button', { name: /check|submit/i }).isDisabled(), true);
  await page.locator('#runtime-count').getByRole('button', { name: /check|submit/i }).evaluate(button => button.click());
  assert.equal(await page.evaluate(() => window.__qa.grade), '');
  await page.locator('#runtime-count').getByRole('button', { name: /Hear the word again/ }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('#runtime-count button')].some(button => /Submit/.test(button.textContent) && !button.disabled));
  await page.locator('#runtime-count').getByRole('button', { name: /check|submit/i }).click();
  await page.waitForFunction(() => window.__qa.grade === 'Correct');
  await page.screenshot({ path: path.join(out, 'syllable-review-confirmed.png'), fullPage: true });
  pass('Teacher confirmation persists fire=1; the production counting view accepts one tap only after the native whole-word clip finishes', { review });
  pass('Native keyboard tapping and one-tap Undo update a polite count status, preserve Submit at zero, and return focus to the tap control');
  await page.evaluate(() => window.__qa.changeAudio());
  await page.waitForFunction(() => window.__qa.resolution.reason === 'count_audio_changed');
  assert.equal(await page.locator('#runtime-count').getByRole('button', { name: 'Tap to count syllables', exact: true }).count(), 0);
  assert.equal(await page.locator('#fire-review').getByRole('checkbox').isDisabled(), true);
  await page.screenshot({ path: path.join(out, 'syllable-audio-change-review.png'), fullPage: true });
  pass('Replacing the exact whole-word clip invalidates its count approval and removes student grading controls');
  await page.locator('#recording details > summary').first().click();
  const labels = page.locator('#recording input[maxlength="40"]');
  assert.equal(await labels.count(), 6);
  assert.deepEqual(await labels.evaluateAll(nodes => nodes.map(node => node.value)), ['re', 'spon', 'si', 'bil', 'i', 'ty']);
  assert.equal(await page.locator('#recording').getByRole('button', { name: 'Save reviewed syllables', exact: true }).isDisabled(), true);
  await page.locator('#recording').getByLabel('Number of syllables', { exact: false }).selectOption('8');
  assert.equal(await labels.count(), 8);
  assert.deepEqual(await labels.evaluateAll(nodes => nodes.map(node => node.value)), ['re', 'spon', 'si', 'bil', 'i', 'ty', '', '']);
  assert.equal(await page.locator('#recording').getByRole('button', { name: 'Save reviewed syllables', exact: true }).isDisabled(), true);
  await page.locator('#recording').screenshot({ path: path.join(out, 'syllable-recording-eight-slots.png') });
  pass('Production recording editor starts with six written hints, expands to eight slots, and keeps unrecorded templates unplayable');
  const persistence = await page.evaluate(async () => {
    const sampleRate = 16000, length = 1600, bytes = new ArrayBuffer(44 + length * 2), view = new DataView(bytes);
    const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * 2, true);
    for (let index = 0; index < length; index++) view.setInt16(44 + index * 2, Math.round(4000 * Math.sin(index * 2 * Math.PI * 220 / sampleRate)), true);
    const decoded = await new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(bytes.slice(0));
    const asset = { mime: 'audio/wav', base64: btoa(String.fromCharCode(...new Uint8Array(bytes))), decoded: true, durationSeconds: decoded.duration, source: 'teacher_recording' };
    const recorded = WS_CORE.createReviewedSyllableTask({ targetWord: 'testlongrecording', language: 'en', revision: 123, reviewed: true, syllables: Array.from({ length: 8 }, (_, index) => 'part' + index), assets: Array.from({ length: 8 }, () => asset) });
    const count = WS_CORE.resolveSyllableCount('testlongrecording', { language: 'en', recordedTask: recorded });
    const saved = JSON.parse(JSON.stringify(count));
    const audioContext = WS_CORE.createSyllableCountAudioContext({ language: 'en' });
    const approved = JSON.parse(JSON.stringify(WS_CORE.createReviewedSyllableCount({ targetWord: 'testlongrecording', language: 'en',
      count: 8, revision: 1, reviewed: true, audioContext })));
    return { count, restored: WS_CORE.resolveSyllableCount('testlongrecording', { language: 'en', prepared: saved }),
      explicitlyApproved: WS_CORE.resolveSyllableCount('testlongrecording', { language: 'en', prepared: approved, audioContext }), decodedSeconds: decoded.duration };
  });
  assert.equal(persistence.count.count, null); assert.deepEqual(persistence.count.counts, [8]);
  assert.equal(persistence.restored.supported, false); assert.equal(persistence.restored.reason, 'count_recording_review_required');
  assert.equal(persistence.explicitlyApproved.count, 8); assert.equal(persistence.explicitlyApproved.supported, true);
  assert.equal(persistence.explicitlyApproved.deliveryMode, 'teacher_spoken');
  pass('Eight decoded syllable clips remain an unreviewed count suggestion after serialization; an explicit spoken-delivery count approval survives a counting-only pack', persistence);
  await page.evaluate(asset => {
    const task = WS_CORE.createReviewedSyllableTask({ targetWord: 'banana', language: 'en-US', revision: 17, reviewed: true, syllables: ['ba', 'na', 'na'], assets: [asset, asset, asset] });
    task.version = 2; task.language = 'en';
    const evidence = JSON.stringify([task.targetWord, task.language, task.revision, task.syllables, task.audioUnits.map(unit => [unit.key, unit.text, unit.asset.mime, unit.asset.base64, unit.asset.durationSeconds])]);
    let a = 2166136261, b = 5381;
    for (let index = 0; index < evidence.length; index++) { a = Math.imul(a ^ evidence.charCodeAt(index), 16777619); b = Math.imul(b, 33) ^ evidence.charCodeAt(index); }
    task.review.signature = (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
    window.__legacy = { task, before: WS_CORE.resolveSyllableTask('banana', task, 'en-US') };
    window.__qaRoot.render(React.createElement('section', { id: 'legacy-editor' }, React.createElement(window.__views.WordSoundsSyllableRecordingEditor, {
      word: 'banana', language: 'en-US', board: task, onSave: value => { window.__legacy.saved = value; },
    })));
  }, audioAsset);
  await page.locator('#legacy-editor details > summary').first().click();
  assert.deepEqual(await page.locator('#legacy-editor input[maxlength="40"]').evaluateAll(nodes => nodes.map(node => node.value)), ['ba', 'na', 'na']);
  assert.equal(await page.locator('#legacy-editor').getByRole('button', { name: 'Hear syllable 1', exact: true }).isDisabled(), false);
  assert.equal(await page.locator('#legacy-editor').getByRole('button', { name: 'Save reviewed syllables', exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__legacy.before.supported), false);
  await page.locator('#legacy-editor').getByRole('button', { name: 'Preview syllables in order', exact: true }).click();
  const legacyConfirm = page.locator('#legacy-editor').getByRole('checkbox', { name: /I listened to the sequence/ });
  await legacyConfirm.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('#legacy-editor label')].some(label => label.textContent.includes('I listened to the sequence') && !label.querySelector('input').disabled));
  await legacyConfirm.check(); await page.locator('#legacy-editor').getByRole('button', { name: 'Save reviewed syllables', exact: true }).click();
  const migrated = await page.evaluate(() => ({ saved: window.__legacy.saved, usable: WS_CORE.resolveSyllableTask('banana', window.__legacy.saved, 'en-US').supported, otherLocale: WS_CORE.resolveSyllableTask('banana', window.__legacy.saved, 'en-GB').supported }));
  assert.equal(migrated.saved.version, 3); assert.equal(migrated.saved.language, 'en-us'); assert.equal(migrated.usable, true); assert.equal(migrated.otherLocale, false);
  assert.deepEqual(migrated.saved.audioUnits.map(unit => unit.asset.base64), [audioAsset.base64, audioAsset.base64, audioAsset.base64]);
  await page.screenshot({ path: path.join(out, 'legacy-recording-rechecked.png'), fullPage: true });
  pass('Legacy English clips recover as an unapproved draft and become a locale-specific v3 recording after native playback and fresh confirmation');

  // Load the entire generated Studio module to catch initialization and host
  // wiring failures that an extracted view cannot expose. Fail its first real
  // dictionary request, then exercise the visible retry and review queue.
  failDictionaryRequests = 1;
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const url of ['/react.js', '/react-dom.js']) await page.addScriptTag({ url });
  await page.evaluate(() => { window.AlloModules = {}; window.AlloLanguageContext = React.createContext({}); });
  await page.addScriptTag({ url: '/modules/setup.js?v=acceptance' });
  await page.evaluate(asset => {
    const preloaded = [
      { word: 'apple', targetWord: 'apple', phonemes: ['a'], _ttsAssets: { apple: asset, fire: asset } },
      { word: 'fire', targetWord: 'fire', phonemes: ['f'] },
    ];
    window.__studio = { preloaded, starts: [] };
    window.__studioRoot = ReactDOM.createRoot(document.getElementById('root'));
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      glossaryTerms: [], preloadedWords: preloaded, isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting',
      wordSoundsLanguage: 'en-US', selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      onClose: () => {}, onStartGame: (...args) => window.__studio.starts.push(args),
    }));
  }, audioAsset);
  await page.getByRole('button', { name: 'Retry pronunciation dictionary', exact: true }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Probe skill', exact: true }).inputValue(), 'syllable_counting');
  assert.equal(await page.getByRole('combobox', { name: 'Probe skill', exact: true }).locator('option:checked').innerText(), 'Syllable Counting');
  await page.getByRole('heading', { name: '📊 Syllable Counting Probe', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Retry pronunciation dictionary', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Needs attention only (1)', exact: true }).waitFor();
  assert.equal(await page.locator('button[aria-label="apple: selected"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('button[aria-label="fire: selected"][aria-pressed="true"]').count(), 1);
  await page.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
  const studioConfirm = page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll('label')].some(label => label.textContent.includes('I checked this spoken pronunciation') && !label.querySelector('input').disabled));
  await page.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('1');
  await studioConfirm.check();
  await page.getByRole('checkbox', { name: /Remember this approval on this device/ }).check();
  await page.getByRole('button', { name: 'Confirm and next', exact: true }).click();
  await page.getByText('No selected words need count review. Clear the filter to inspect any word.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-syllable-count-complete')), true);
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), false);
  assert.equal(await page.locator('button[aria-label="apple: selected"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('button[aria-label="fire: selected"][aria-pressed="true"]').count(), 1);
  const remembered = await page.evaluate(() => localStorage.getItem('allo.wordSounds.countReviews.v1'));
  assert.ok(remembered && JSON.parse(remembered)[0].audioContext.fingerprint);
  assert.equal(remembered.includes(audioAsset.base64), false);
  await page.screenshot({ path: path.join(out, 'studio-count-review-queue.png'), fullPage: true });
  pass('Actual generated Studio initializes, retries a failed dictionary load, confirms the attention queue, preserves word selection, and remembers only approval metadata');

  // Exercise the complete preparation action with an intentional live-teacher
  // pronunciation. A bank arrives during preparation; only prompts may be
  // packed, so the approved no-clip count must remain usable.
  await page.evaluate(asset => {
    window.__teacherLed = { starts: [], calls: [], bankCalls: 0 };
    window._CACHE_WORD_AUDIO_BANK = {};
    const source = 'data:' + asset.mime + ';base64,' + asset.base64;
    window.loadWordAudioBank = async () => { window.__teacherLed.bankCalls++; window._CACHE_WORD_AUDIO_BANK = { fire: source }; return window._CACHE_WORD_AUDIO_BANK; };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'teacher-led', glossaryTerms: [], preloadedWords: [{ word: 'fire', targetWord: 'fire', phonemes: ['f'] }],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-US', selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      callTTS: async text => { window.__teacherLed.calls.push(text); return source; },
      onClose: () => {}, onStartGame: (...args) => window.__teacherLed.starts.push(args),
    }));
  }, audioAsset);
  await page.getByRole('checkbox', { name: /Use my spoken pronunciation for now/ }).check();
  await page.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('1');
  await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).check();
  await page.getByRole('button', { name: 'Save reviewed count', exact: true }).click();
  await page.getByRole('button', { name: 'Start teacher-led activity', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-syllable-count-complete')), true);
  await page.screenshot({ path: path.join(out, 'studio-teacher-led-ready.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start teacher-led activity', exact: true }).click();
  await page.waitForFunction(() => window.__teacherLed.starts.length === 1);
  const teacherLed = await page.evaluate(() => window.__teacherLed);
  const teacherWord = teacherLed.starts[0][0][0];
  assert.equal(teacherLed.bankCalls, 1);
  assert.equal(teacherLed.calls.includes('fire'), false);
  assert.ok(teacherLed.calls.includes('How many syllables do you hear? Clap for each one'));
  assert.equal(teacherWord._ttsRequiredKeys.includes('fire'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(teacherWord._ttsAssets, 'fire'), false);
  assert.equal(teacherWord._ttsFailed, false);
  assert.equal(teacherWord.activityItems.syllable_counting.supported, true);
  assert.equal(teacherWord.activityItems.syllable_counting.count, 1);
  assert.equal(teacherWord.activityItems.syllable_counting.audioContext.fingerprint, null);
  assert.equal(teacherWord.activityItems.syllable_counting.deliveryMode, 'teacher_spoken');
  pass('Actual Studio prepares teacher-led counting without whole-word synthesis, preserves the signed count after bank arrival, and still prepares instructional audio', {
    requestedTexts: teacherLed.calls, requiredKeys: teacherWord._ttsRequiredKeys,
    count: teacherWord.activityItems.syllable_counting.count, deliveryMode: teacherWord.activityItems.syllable_counting.deliveryMode,
  });
  await page.evaluate(() => {
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'balanced-count-bank', glossaryTerms: [], preloadedWords: [],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-US',
      selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key, onClose: () => {}, onStartGame: () => {},
    }));
  });
  await page.getByRole('checkbox', { name: /Syllable counting word bank/ }).check();
  await page.waitForFunction(() => document.querySelectorAll('button[aria-pressed="true"][aria-label$=": selected"]').length === 10);
  const bankSelection = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="true"][aria-label$=": selected"]')].map(button => {
    const word = button.getAttribute('aria-label').replace(/: selected$/, '');
    const counts = [...new Set(window.AlloModules.WordSoundsPronunciations.lookup(word).map(stress => stress.length))];
    return { word, counts };
  }));
  assert.deepEqual([...new Set(bankSelection.flatMap(item => item.counts))].sort(), [2, 3, 4]);
  await page.locator('[data-help-key="ws_gen_syllable_max"]').fill('6');
  await page.locator('button[aria-label^="responsibility:"]').waitFor();
  await page.locator('[data-help-key="ws_gen_syllable_min"]').fill('5');
  await page.waitForFunction(() => document.querySelectorAll('button[aria-label$=": selected"],button[aria-label$=": not selected"]').length === 5);
  const longWords = await page.locator('button[aria-label$=": selected"],button[aria-label$=": not selected"]').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').replace(/: (?:not )?selected$/, '')));
  assert.deepEqual(longWords.sort(), ['communication', 'electricity', 'hippopotamus', 'imagination', 'responsibility']);
  await page.screenshot({ path: path.join(out, 'studio-longer-count-bank.png'), fullPage: true });
  pass('Actual Studio balances its initial ten counting words across two, three, and four syllables and exposes all five longer starter words with a five-to-six range', { bankSelection, longWords });
  await page.addScriptTag({ url: '/modules/core.js?v=conflict' });
  await page.evaluate(asset => {
    const context = WS_CORE.createSyllableCountAudioContext({ asset, language: 'en-US' });
    const count = WS_CORE.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 1, revision: 1, reviewed: true, audioContext: context });
    const recording = { ...WS_CORE.createReviewedSyllableTask({ targetWord: 'fire', language: 'en-US', syllables: ['fi', 're'], assets: [asset, asset], revision: 1, reviewed: true }), options: ['fire', 'sunset'], answer: 'fire' };
    const word = { word: 'fire', targetWord: 'fire', phonemes: ['f'], syllables: ['fi', 're'], _ttsAssets: { fire: asset }, activityItems: { syllable_counting: count, syllable_blending: recording } };
    window.__conflict = { original: word, starts: [] };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'count-recording-conflict', glossaryTerms: [], preloadedWords: [word],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-US',
      selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      callTTS: async () => 'data:' + asset.mime + ';base64,' + asset.base64,
      onClose: () => {}, onStartGame: (...args) => window.__conflict.starts.push(args),
    }));
  }, audioAsset);
  await page.getByText(/The reviewed count \(1\) differs from the recorded syllables \(2\)/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Inspect or repair the syllable recording', exact: true }).click();
  assert.ok(await page.evaluate(() => document.activeElement.tagName === 'SUMMARY' && document.activeElement.textContent.includes('Syllable recordings for')));
  await page.getByRole('button', { name: 'Close recording editor', exact: true }).click();
  const excludeRecording = async () => {
    assert.equal(await page.getByRole('button', { name: 'Use this count without the old syllable recording', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('label')].some(label => label.textContent.includes('I checked this spoken pronunciation') && !label.querySelector('input').disabled));
    await page.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('1');
    await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).check();
    await page.getByRole('button', { name: 'Use this count without the old syllable recording', exact: true }).click();
    await page.getByRole('button', { name: 'Undo for fire', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), false);
  };
  await excludeRecording();
  await page.getByRole('button', { name: 'Undo for fire', exact: true }).click();
  await page.getByText(/The reviewed count \(1\) differs from the recorded syllables \(2\)/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), true);
  await excludeRecording();
  await page.screenshot({ path: path.join(out, 'studio-recording-conflict-resolved.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start Activity', exact: true }).click();
  await page.waitForFunction(() => window.__conflict.starts.length === 1);
  const repaired = await page.evaluate(() => ({ original: window.__conflict.original, prepared: window.__conflict.starts[0][0][0] }));
  assert.equal(repaired.original.activityItems.syllable_blending.audioUnits.length, 2);
  assert.equal(repaired.prepared.activityItems.syllable_counting.count, 1);
  assert.equal(repaired.prepared.activityItems.syllable_counting.supported, true);
  assert.notEqual(repaired.prepared.activityItems.syllable_blending?.contentStatus, 'teacher_recorded');
  pass('Actual counting-only Studio opens and focuses conflicting recordings, requires a listened confirmation to exclude them, restores them with Undo, and prepares the corrected lesson without mutating original clips');
  await page.evaluate(asset => {
    localStorage.removeItem('allo.wordSounds.countReviews.v1');
    const recording = { ...WS_CORE.createReviewedSyllableTask({ targetWord: 'fire', language: 'en-US', syllables: ['fi', 're'],
      assets: [asset, asset], revision: 1, reviewed: true }), options: ['fire', 'sunset'], answer: 'fire' };
    const word = { word: 'fire', targetWord: 'fire', phonemes: ['f'], syllables: ['fi', 're'],
      _ttsAssets: { fire: asset }, activityItems: { syllable_blending: recording } };
    window.__recordingCount = { original: word, starts: [] };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'recording-needs-whole-word-review', glossaryTerms: [], preloadedWords: [word],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-US',
      selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      callTTS: async () => 'data:' + asset.mime + ';base64,' + asset.base64,
      onClose: () => {}, onStartGame: (...args) => window.__recordingCount.starts.push(args),
    }));
  }, audioAsset);
  await page.getByText('The syllable recording suggests 2 syllables. Check the whole-word pronunciation and confirm its count before starting.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Save reviewed count', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).isDisabled(), true);
  await page.screenshot({ path: path.join(out, 'studio-recording-count-unreviewed.png'), fullPage: true });
  await page.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
  await page.getByText('Word played. Enter the count you heard, then confirm.', { exact: true }).waitFor();
  await page.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('2');
  await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).check();
  await page.getByRole('button', { name: 'Save reviewed count', exact: true }).click();
  await page.getByText('No selected words need count review. Clear the filter to inspect any word.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start Activity', exact: true }).isDisabled(), false);
  await page.getByRole('button', { name: 'Start Activity', exact: true }).click();
  await page.waitForFunction(() => window.__recordingCount.starts.length === 1);
  const recordingReviewed = await page.evaluate(() => ({ prepared: window.__recordingCount.starts[0][0][0],
    recordingReady: WS_CORE.reviewedSyllableReady(window.__recordingCount.original.activityItems.syllable_blending) }));
  assert.equal(recordingReviewed.prepared.activityItems.syllable_counting.count, 2);
  assert.equal(recordingReviewed.prepared.activityItems.syllable_counting.source, 'teacher_review');
  assert.equal(recordingReviewed.prepared.activityItems.syllable_counting.supported, true);
  assert.ok(recordingReviewed.prepared.activityItems.syllable_counting.audioContext.fingerprint);
  assert.equal(recordingReviewed.recordingReady, true);
  pass('Actual Studio keeps reviewed syllable recordings separate from count approval, blocks Start until native whole-word playback and explicit confirmation, and prepares the confirmed answer');
  await page.addScriptTag({ url: '/views.js' });
  await page.evaluate(asset => {
    const h = React.createElement;
    const tr = (_key, fallback = '', params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll('{' + key + '}', String(value)), fallback);
    const context = WS_CORE.createSyllableCountAudioContext({ asset, language: 'en-US' });
    const count = WS_CORE.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 1, revision: 1, reviewed: true, audioContext: context });
    const recording = WS_CORE.createReviewedSyllableTask({ targetWord: 'fire', language: 'en-US', syllables: ['fi', 're'], assets: [asset, asset], revision: 1, reviewed: true });
    window.__draftPlayback = [];
    const NativeAudio = window.Audio;
    window.Audio = function(source) { const clip = new NativeAudio(source); window.__draftPlayback.push(clip); return clip; };
    window.__studioRoot.render(h('section', { id: 'draft-review' }, h(window.__views.WordSoundsSyllableCountQueue, {
      words: ['fire', 'family'], contextFor: () => context, recordedFor: word => word === 'fire' ? recording : undefined,
      resolveWord: word => WS_CORE.resolveSyllableCount(word, { language: 'en-US', audioContext: context, prepared: word === 'fire' ? count : undefined, recordedTask: word === 'fire' ? recording : undefined }),
      previewWord: async () => ({ source: 'data:' + asset.mime + ';base64,' + asset.base64, asset, audioContext: context }),
      translate: tr, onSave: () => {}, onSaveRecording: () => {},
    })));
  }, audioAsset);
  const drafts = page.locator('#draft-review');
  await drafts.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('3');
  await drafts.getByRole('button', { name: 'Next word', exact: true }).click();
  await drafts.getByRole('button', { name: 'Previous word', exact: true }).click();
  assert.equal(await drafts.getByRole('spinbutton', { name: 'Syllable count', exact: true }).inputValue(), '3');
  assert.equal(await drafts.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).isChecked(), false);
  await drafts.getByRole('button', { name: 'Inspect or repair the syllable recording', exact: true }).click();
  await drafts.locator('input[maxlength="40"]').first().fill('fye');
  await drafts.locator('input[type="file"][accept="audio/*"]').first().setInputFiles({ name: 'draft.wav', mimeType: 'audio/wav', buffer: Buffer.from(changedAudioAsset.base64, 'base64') });
  await drafts.getByText('Clip checked. Preview the full sequence before saving.', { exact: true }).waitFor();
  await drafts.getByRole('button', { name: 'Close recording editor', exact: true }).click();
  await drafts.getByRole('button', { name: 'Next word', exact: true }).click();
  await drafts.getByRole('button', { name: 'Previous word', exact: true }).click();
  await drafts.getByRole('button', { name: 'Inspect or repair the syllable recording', exact: true }).click();
  assert.equal(await drafts.locator('input[maxlength="40"]').first().inputValue(), 'fye');
  assert.equal(await drafts.getByRole('button', { name: 'Save reviewed syllables', exact: true }).isDisabled(), true);
  await drafts.getByRole('button', { name: 'Preview syllables in order', exact: true }).click();
  await drafts.getByText(/Preview complete\. Check that each clip/).waitFor();
  const restoredClip = await page.evaluate(() => window.__draftPlayback[0].src);
  assert.equal(restoredClip, 'data:audio/wav;base64,' + changedAudioAsset.base64);
  await drafts.getByRole('button', { name: 'Next word', exact: true }).click();
  assert.equal(await drafts.getByRole('button', { name: 'Close recording editor', exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.__draftPlayback.every(clip => clip.paused)), true);
  await drafts.getByRole('button', { name: 'Previous word', exact: true }).click();
  await drafts.getByRole('button', { name: 'Inspect or repair the syllable recording', exact: true }).click();
  assert.equal(await drafts.getByRole('checkbox', { name: /I listened to the sequence/ }).isDisabled(), true);
  await drafts.screenshot({ path: path.join(out, 'retained-review-drafts.png') });
  pass('Review queue retains numeric edits and natively decoded uploaded clips through navigation and close/reopen, hides the old editor, and requires a fresh listen before approval');
  await page.evaluate(asset => {
    const h = React.createElement, { WordSoundsSyllableReviewDetails: Details, WordSoundsSyllableCountReview: Review } = window.__views;
    const context = WS_CORE.createSyllableCountAudioContext({ asset, language: 'en-US' });
    let draft;
    window.__studioRoot.render(h(Details, { id: 'nested-runtime-review', title: 'Review syllables for fire' }, () => h(Review, {
      word: 'fire', language: 'en-US', audioContext: context, resolution: WS_CORE.resolveSyllableCount('fire', { language: 'en-US' }),
      draft, onDraftChange: next => { draft = next; }, translate: (_key, fallback) => fallback,
      previewWord: async () => ({ source: 'data:' + asset.mime + ';base64,' + asset.base64, asset, audioContext: context }), onSave: () => {},
    })));
  }, audioAsset);
  const nestedReview = page.locator('#nested-runtime-review');
  await nestedReview.locator('summary').click();
  await nestedReview.getByRole('spinbutton', { name: 'Syllable count', exact: true }).fill('3');
  await nestedReview.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
  await nestedReview.locator('summary').click();
  await page.waitForFunction(() => !document.querySelector('#nested-runtime-review input') && window.__draftPlayback.every(clip => clip.paused));
  await nestedReview.locator('summary').click();
  assert.equal(await nestedReview.getByRole('spinbutton', { name: 'Syllable count', exact: true }).inputValue(), '3');
  assert.equal(await nestedReview.getByRole('button', { name: 'Save reviewed count', exact: true }).isDisabled(), true);
  pass('Native nested review collapse stops playback and unmounts controls; reopening restores the draft without approval');
  await page.evaluate(() => {
    const h = React.createElement, Results = window.__views.WordSoundsCountResults;
    const results = [
      { activity: 'syllable_counting', word: 'banana', attempts: 2, countResponses: [
        { expectedCount: 3, submittedCount: 4, deliveryMode: 'recorded_audio' },
        { expectedCount: 3, submittedCount: 3, deliveryMode: 'recorded_audio' }] },
      { activity: 'syllable_counting', word: 'banana', attempts: 1, expectedCount: 3, submittedCount: 3, deliveryMode: 'teacher_spoken' },
      { activity: 'syllable_counting', word: 'fire', attempts: 1 },
    ];
    window.__studioRoot.render(h('div', { id: 'results-review' },
      h('div', { id: 'learner-results' }, h(Results, { results })),
      h(Results, { results, isParentMode: true })));
  });
  const resultsSection = page.getByRole('region', { name: 'Syllable counting details', exact: true });
  await resultsSection.waitFor();
  assert.equal(await resultsSection.getByRole('listitem').count(), 3);
  assert.ok((await resultsSection.innerText()).includes('Expected 3; submitted 4 → 3; 2 attempts; recorded audio'));
  assert.ok((await resultsSection.innerText()).includes('Item 2: banana'));
  assert.ok((await resultsSection.innerText()).includes('Count details were not recorded'));
  assert.equal(await page.locator('#learner-results').innerText(), '');
  await resultsSection.screenshot({ path: path.join(out, 'count-results.png') });
  pass('Adult result details preserve repeated words and retry order, distinguish delivery, handle legacy data, and stay hidden from learners');
  await page.evaluate(asset => {
    window.__unsavedStudio = { starts: [] };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'unsaved-count-choice', glossaryTerms: [],
      preloadedWords: [{ word: 'apple', targetWord: 'apple', phonemes: ['a'], ttsReady: true, _ttsAssets: { apple: asset } }],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-GB',
      selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      callTTS: async () => 'data:' + asset.mime + ';base64,' + asset.base64,
      onClose: () => {}, onStartGame: (...args) => window.__unsavedStudio.starts.push(args),
    }));
  }, audioAsset);
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  await page.getByText('2 syllables · Pronunciation dictionary (US English)', { exact: true }).first().waitFor();
  await page.getByText('The dictionary uses US English. Check this word against the pronunciation you are teaching.', { exact: true }).waitFor();
  const countInput = page.getByRole('spinbutton', { name: 'Syllable count', exact: true });
  await countInput.fill('3');
  await page.getByText('Unsaved count change', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start Activity', exact: true }).click();
  const unsavedNotice = page.locator('[data-syllable-unsaved-notice]');
  await unsavedNotice.waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-syllable-unsaved-notice')), true);
  assert.equal(await page.evaluate(() => window.__unsavedStudio.starts.length), 0);
  await unsavedNotice.getByRole('button', { name: 'Review edits', exact: true }).click();
  assert.equal(await countInput.inputValue(), '3');
  await countInput.fill('2');
  assert.equal(await page.getByText('Unsaved count change', { exact: true }).count(), 0);
  await countInput.fill('3');
  await page.getByRole('button', { name: 'Start Activity', exact: true }).click();
  await unsavedNotice.screenshot({ path: path.join(out, 'unsaved-syllable-start-choice.png') });
  await unsavedNotice.getByRole('button', { name: 'Use saved version', exact: true }).click();
  await page.waitForFunction(() => window.__unsavedStudio.starts.length === 1);
  assert.equal(await page.evaluate(() => window.__unsavedStudio.starts[0][0][0].activityItems.syllable_counting.count), 2);
  pass('Actual Studio labels US-English dictionary evidence and protects unfinished count edits with a focused review/use-saved choice; reverting is clean and Use saved prepares the original answer');
  await page.evaluate(asset => {
    window.__exitStudio = { closes: 0 };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'exit-draft-choice', glossaryTerms: [], preloadedWords: [{ word: 'apple', phonemes: ['a'], ttsReady: true, _ttsAssets: { apple: asset } }],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en',
      selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
      onClose: () => { window.__exitStudio.closes++; window.__studioRoot.render(null); }, onStartGame: () => {},
    }));
  }, audioAsset);
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  await countInput.fill('3');
  const closeSetup = page.getByRole('button', { name: 'Close Word Sounds setup', exact: true });
  await closeSetup.click();
  const exitNotice = page.getByRole('alertdialog', { name: 'Discard unfinished syllable edits?', exact: true });
  await exitNotice.waitFor();
  assert.equal(await page.evaluate(() => window.__exitStudio.closes), 0);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Keep editing');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Discard edits');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Keep editing');
  await page.keyboard.press('Escape');
  await exitNotice.waitFor({ state: 'hidden' });
  assert.equal(await closeSetup.evaluate(node => document.activeElement === node), true);
  assert.equal(await countInput.inputValue(), '3');
  await countInput.focus();
  await page.keyboard.press('Escape');
  await exitNotice.waitFor();
  await exitNotice.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert.equal(await countInput.evaluate(node => document.activeElement === node), true);
  await countInput.fill('2'); await closeSetup.click();
  await page.waitForFunction(() => window.__exitStudio.closes === 1);
  pass('Actual Studio protects dirty count edits on Close and Escape, traps confirmation focus, restores the editor, and closes directly after reverting');
  await page.evaluate(({ bank, selected }) => {
    window.__profileStudio = { requests: [] };
    window._CACHE_WORD_AUDIO_BANK = { apple: 'data:' + bank.mime + ';base64,' + bank.base64 };
    window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
      key: 'selected-pronunciation', glossaryTerms: [], preloadedWords: [{ word: 'apple', phonemes: ['a'] }],
      isTeacherMode: true, isProbeMode: true, probeActivity: 'syllable_counting', wordSoundsLanguage: 'en-GB',
      selectedVoice: 'bf_emma', gradeLevel: 'K', t: key => key,
      callTTS: async (word, voice, speed, options) => {
        window.__profileStudio.requests.push({ word, voice, language: options.language, force: options.force });
        options.onResolvedProfile({ provider: 'kokoro', resolvedVoice: 'bf_emma', language: 'en-GB' });
        return 'data:' + selected.mime + ';base64,' + selected.base64;
      }, onClose: () => {}, onStartGame: () => {},
    }));
  }, { bank: audioAsset, selected: changedAudioAsset });
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
  await page.getByText('Word played. Enter the count you heard, then confirm.', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__profileStudio.requests), [{ word: 'apple', voice: 'bf_emma', language: 'en-GB', force: true }]);
  assert.ok((await page.locator('[data-syllable-audio-profile]').innerText()).includes('bf_emma'));
  await page.locator('[data-syllable-audio-profile]').screenshot({ path: path.join(out, 'selected-pronunciation-profile.png') });
  pass('Actual Studio bypasses the cached US-English bank for British voice selection, explicitly requests that pronunciation, and shows its resolved audio profile');
  await page.evaluate(() => {
    window.__retainedStudio = { session: {}, closes: 0, reviews: [], words: [{ word: 'fire', targetWord: 'fire', phonemes: ['f'], definition: 'Keep this definition', activityItems: { decoding: { choices: ['fire', 'rain'], answer: 'fire' } } }] };
    window.__mountRetainedStudio = (fresh = false) => {
      const qa = window.__retainedStudio;
      window.__studioRoot.render(React.createElement(window.AlloModules.WordSoundsGenerator, {
        key: 'retained-' + (++qa.mounts || (qa.mounts = 1)), syllableReviewSession: fresh ? {} : qa.session,
        glossaryTerms: [], preloadedWords: qa.words, isTeacherMode: true, isProbeMode: true,
        probeActivity: 'syllable_counting', wordSoundsLanguage: 'en', selectedVoice: 'af_heart', gradeLevel: 'K', t: key => key,
        onClose: () => { qa.closes++; window.__studioRoot.render(null); }, onStartGame: () => {},
        onShowReview: words => { qa.reviews.push(words); window.__studioRoot.render(null); },
      }));
    };
    window._CACHE_WORD_AUDIO_BANK = {};
    window.__mountRetainedStudio();
  });
  await page.getByRole('checkbox', { name: /Use my spoken pronunciation for now/ }).check();
  await countInput.fill('1');
  await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).check();
  await page.getByRole('button', { name: 'Save reviewed count', exact: true }).click();
  await page.getByRole('button', { name: 'Start teacher-led activity', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close Word Sounds setup', exact: true }).click();
  await page.waitForFunction(() => window.__retainedStudio.closes === 1);
  await page.evaluate(() => window.__mountRetainedStudio());
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  assert.equal(await countInput.inputValue(), '1');
  await page.getByText('1 syllable · Teacher reviewed', { exact: true }).first().waitFor();
  assert.equal(await page.locator('button[aria-label="fire: selected"][aria-pressed="true"]').count(), 1);
  pass('Actual Studio retains the approved count and selected word across Close and remount in the same authoring session');
  await countInput.fill('2');
  await page.getByRole('button', { name: 'Review Words', exact: true }).click();
  await exitNotice.waitFor();
  assert.equal(await page.evaluate(() => window.__retainedStudio.reviews.length), 0);
  await exitNotice.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert.equal(await countInput.inputValue(), '2');
  await page.getByRole('button', { name: 'Review Words', exact: true }).click();
  await exitNotice.getByRole('button', { name: 'Discard edits', exact: true }).click();
  await page.waitForFunction(() => window.__retainedStudio.reviews.length === 1);
  const retained = await page.evaluate(() => ({ words: window.__retainedStudio.reviews[0], original: window.__retainedStudio.words }));
  assert.equal(retained.words[0].activityItems.syllable_counting.count, 1);
  assert.equal(retained.words[0].definition, 'Keep this definition');
  assert.deepEqual(retained.words[0].activityItems.decoding, { choices: ['fire', 'rain'], answer: 'fire' });
  assert.equal(retained.original[0].activityItems.syllable_counting, undefined);
  pass('Actual Studio Review Words protects unfinished drafts and hands off the approved count while preserving unrelated lesson content');
  await page.evaluate(() => window.__mountRetainedStudio(true));
  await page.getByRole('checkbox', { name: 'Needs attention only (1)', exact: true }).waitFor();
  assert.equal(await countInput.inputValue(), '');
  pass('A fresh authoring session does not inherit another session’s count approval');
  await page.addScriptTag({ url: '/ownership-host.js' });
  await page.evaluate(asset => {
    window._CACHE_WORD_AUDIO_BANK = {};
    const initialWords = [{word:'apple', targetWord:'apple', phonemes:['a'], definition:'Preserve the apple definition', _ttsAssets:{apple:asset,fire:asset}}];
    const Host = window.__makeOwnershipFixture(initialWords, asset);
    window.__studioRoot.render(React.createElement(Host));
  }, audioAsset);
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  const confirmWholeWord = async count => {
    await page.getByRole('button', { name: 'Listen to whole word', exact: true }).click();
    await page.getByText('Word played. Enter the count you heard, then confirm.', { exact: true }).waitFor();
    await countInput.fill(String(count));
    await page.getByRole('checkbox', { name: 'I checked this spoken pronunciation and confirm this syllable count.', exact: true }).check();
    await page.getByRole('button', { name: 'Save reviewed count', exact: true }).click();
  };
  await confirmWholeWord(2);
  if (!await page.getByRole('checkbox', { name: 'Custom Manual', exact: true }).isChecked()) await page.locator('[data-help-key="ws_gen_src_custom"]').click();
  await page.locator('#word-sounds-quick-add').fill('fire');
  await page.locator('#word-sounds-quick-add').press('Enter');
  const fireSelection = page.locator('button[aria-label^="fire:"][aria-pressed]');
  await fireSelection.waitFor();
  if (await fireSelection.getAttribute('aria-pressed') !== 'true') await fireSelection.click();
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  await confirmWholeWord(1);
  await page.getByRole('button', { name: 'Review Words', exact: true }).click();
  await page.locator('#mixed-review-host').waitFor();
  const mixed = await page.evaluate(() => ({words:window.__mixedHandoff.words, counts:window.__mixedHandoff.session.counts,
    selection:[...window.__mixedHandoff.session.selection]}));
  assert.deepEqual(mixed.words.map(item => item.word), ['apple']);
  assert.equal(mixed.words[0].activityItems.syllable_counting.count, 2);
  assert.equal(mixed.counts['en:apple'], undefined);
  assert.equal(mixed.counts['en:fire'].count, 1);
  assert.ok(mixed.selection.includes('fire'));
  await page.getByRole('button', { name: 'Apply later apple correction', exact: true }).click();
  await page.getByRole('button', { name: 'Return to setup', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Needs attention only (0)', exact: true }).uncheck();
  assert.equal(await countInput.inputValue(), '3');
  assert.equal(await page.locator('button[aria-label="fire: selected"][aria-pressed="true"]').count(), 1);
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  assert.equal(await countInput.inputValue(), '1');
  await page.screenshot({ path:path.join(out,'studio-mixed-handoff-retained.png'), fullPage:true });
  await page.getByRole('button', { name: 'Review Words', exact: true }).click();
  await page.waitForFunction(() => window.__mixedHandoff.reviews.length === 2);
  const finalMixed = await page.evaluate(() => ({words:window.__mixedHandoff.words, counts:window.__mixedHandoff.session.counts}));
  assert.equal(finalMixed.words[0].activityItems.syllable_counting.count, 3);
  assert.equal(finalMixed.words[0].definition, 'Preserve the apple definition');
  assert.equal(finalMixed.counts['en:fire'].count, 1);
  pass('Actual Studio and production host handoff retain a newly added word’s approval while committing the existing word, preserve it on return, and keep a later review-panel correction authoritative');
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  report.passed = true;
}
run().catch(async error => { report.passed = false; report.failure = error.stack; console.error(error); if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(out, 'browser-acceptance.json'), JSON.stringify(report, null, 2));
  await browser?.close(); server.close();
});
