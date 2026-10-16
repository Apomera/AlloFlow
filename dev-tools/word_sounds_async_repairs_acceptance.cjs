// Native Chromium checks of the real review panel and extracted runtime image
// callbacks. The small host mirrors the production host's synchronous lifted
// updater; image providers are deterministic local fixtures, never cloud calls.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { transformSync } = require('@babel/core');
const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'reports/word-sounds-async-repairs-2026-10-16');
fs.mkdirSync(out, { recursive: true });
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const slice = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production extraction boundaries exist: ' + start);
  return source.slice(from, to);
};
const runtime = read('word_sounds_module.js'), core = read('word_sounds_core.js');
const panel = transformSync(read('misc_components_source.jsx'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'],
}).code;
const guards = slice(runtime, 'const reviewGenerationRef =', 'const handleRegenerateManipulationTask =');
const images = slice(runtime, 'const handleGenerateWordImage =', '      React.useEffect(() => {');
const fixture = `
const h = React.createElement;
window.__asset = label => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" rx="18" fill="#e0e7ff"/><text x="90" y="95" text-anchor="middle" font-family="sans-serif" font-size="18">' + label + '</text></svg>');
window.__row = (word, choices) => ({ id: 'row-' + word, word, phonemes: [word], ttsReady: true,
  image: __asset('saved ' + word), _decodingAssets: { bird: __asset('saved bird') },
  activityItems: { decoding: { choices: choices || [word] } } });
window.__mount = (rows, mode = 'immediate') => {
  window.__qaRoot?.unmount();
  window.__imageRequests = []; window.__pendingImages = []; window.__toasts = [];
  window.__imageMode = mode;
  function Host() {
    const [preloadedWords, setWords] = React.useState(rows);
    // AlloFlow's lifted setWsPreloadedWords evaluates updates against a live
    // ref before dispatching. Retain that ownership/commit behavior here.
    const latestWords = React.useRef(preloadedWords); latestWords.current = preloadedWords;
    const setWsPreloadedWords = update => {
      latestWords.current = typeof update === 'function' ? update(latestWords.current) : update;
      setWords(latestWords.current);
    };
    const setPreloadedWords = setWsPreloadedWords;
    const [generatingImageIndex, setGeneratingImageIndex] = React.useState(null);
    const [generatingImageSet, setGeneratingImageSet] = React.useState(new Set());
    const [showReviewPanel, setShowReviewPanel] = React.useState(true);
    const [reviewAuthoringSession, setOwner] = React.useState({});
    const isMountedRef = React.useRef(true), advanceEpochRef = React.useRef(0);
    React.useEffect(() => () => { isMountedRef.current = false; }, []);
    const runtimeIdentityKey = 'native-fixture-session', wordSoundsLanguage = 'en';
    const addToast = (...args) => window.__toasts.push(args), warnLog = () => {};
    const callImagen = async prompt => {
      const text = prompt.match(/"([^"\\n]+)"/)?.[1] || 'image';
      window.__imageRequests.push(text);
      if (window.__imageMode === 'failure') throw new Error('Fixture image failure');
      if (window.__imageMode === 'deferred') return new Promise((resolve, reject) => window.__pendingImages.push({ text, resolve, reject }));
      return __asset('generated ' + text);
    };
    const callGeminiImageEdit = callImagen;
    ${guards}
    ${images}
    window.__qa = { words: preloadedWords, replace: setWsPreloadedWords, generate: handleGenerateWordImage,
      refine: handleRefineWordImage, busy: [...generatingImageSet], pending: reviewGeneration.images.size,
      close: () => setShowReviewPanel(false), replaceOwner: () => setOwner({}) };
    if (!showReviewPanel) return h('p', { id: 'review-closed' }, 'Review closed');
    return h(window.WordSoundsReviewPanel, { preloadedWords, activitySequence: ['decoding'], t: () => '',
      onGenerateImage: handleGenerateWordImage, onRefineImage: handleRefineWordImage,
      generatingImageIndex, generatingImageSet, onReorderWords: setWsPreloadedWords,
      onStartActivity: () => {}, onClose: () => setShowReviewPanel(false), onBackToSetup: () => setShowReviewPanel(false) });
  }
  window.__qaRoot = ReactDOM.createRoot(document.getElementById('root'));
  window.__qaRoot.render(h(Host));
};
`;
const checks = [], errors = [], requests = [], externalRequests = [];
const report = { browser: 'Native Chromium', checks, errors, requests, externalRequests,
  scope: 'Production review panel JSX, core, and runtime image request guards/callbacks in a fixture host matching the synchronous lifted updater. Local image fixtures only; no cloud image quality or complete application assertion.',
  sourceHashes: Object.fromEntries(['word_sounds_core.js', 'word_sounds_module.js', 'misc_components_source.jsx'].map(file => [file,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')])) };
const routes = {
  '/react.js': ['desktop/web-app/node_modules/react/umd/react.development.js', 'application/javascript'],
  '/react-dom.js': ['desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'application/javascript'],
  '/host.css': ['app/static/css/' + fs.readdirSync(path.join(repo, 'app/static/css')).find(name => /^main\..+\.css$/.test(name)), 'text/css'],
};
const server = http.createServer((req, res) => {
  requests.push(req.url);
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word Sounds asynchronous repair acceptance</title><link rel="stylesheet" href="/host.css"><style>body{font:16px system-ui;background:#f8fafc;color:#172033}button,input{margin:2px}</style></head><body><div id="root"></div></body></html>');
  }
  if (pathname === '/core.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(core + '\nwindow.WS_CORE=createWordSoundsCore();'); }
  if (pathname === '/panel.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(`const Ban=()=>null,CheckCircle2=Ban,ChevronDown=Ban,ChevronLeft=Ban,ImageIcon=Ban,Play=Ban,RefreshCw=Ban,Send=Ban,Sparkles=Ban,Volume2=Ban;\n${panel}`);
  }
  if (pathname === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(fixture); }
  if (routes[pathname]) { const [file, type] = routes[pathname]; res.setHeader('Content-Type', type); return res.end(fs.readFileSync(path.join(repo, file))); }
  res.statusCode = 404; res.end();
});
let browser, page;
const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log('PASS ' + name); };
async function mount(kind, mode = 'immediate') {
  await page.evaluate(({ kind, mode }) => {
    const rows = kind === 'choices' ? [__row('cat', ['cat', 'dog', 'fish', 'dog'])]
      : kind === 'seven' ? ['cat', 'dog', 'fish', 'tree', 'sun', 'moon', 'apple'].map(word => __row(word))
      : [__row('cat'), __row('dog')];
    window.__mount(rows, mode);
  }, { kind, mode });
  await page.getByRole('dialog').waitFor();
  await page.waitForFunction(() => window.__qa && window.__qa.pending === 0);
}
async function startDeferred() {
  await page.evaluate(() => { window.__pendingResult = window.__qa.generate(0, 'cat'); });
  await page.waitForFunction(() => window.__pendingImages.length === 1);
}
async function finishDeferred(label = 'generated cat') {
  return page.evaluate(async label => {
    window.__pendingImages.shift().resolve(__asset(label));
    return await window.__pendingResult;
  }, label);
}
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true,
    executablePath: process.env.WORD_SOUNDS_CHROMIUM || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe', timeout: 60000 });
  report.browserVersion = browser.version();
  page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') || route.request().url().startsWith('data:') ? route.continue() : route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(() => { window.warnLog = () => {}; window.debugLog = () => {}; });
  for (const url of ['/react.js', '/react-dom.js', '/core.js', '/panel.js', '/fixture.js']) await page.addScriptTag({ url });

  await mount('choices');
  const imageGap = page.locator('[data-review-gap="images"]');
  assert.ok((await imageGap.innerText()).includes('pictures missing: 2'));
  await imageGap.getByRole('button', { name: /Generate pictures/ }).click();
  await imageGap.waitFor({ state: 'detached' });
  await page.waitForFunction(() => window.__qa.pending === 0 && window.__qa.busy.length === 0);
  const repaired = await page.evaluate(() => ({ requests: window.__imageRequests, word: window.__qa.words[0],
    original: __asset('saved cat'), originalBird: __asset('saved bird') }));
  assert.deepEqual(repaired.requests, ['dog', 'fish']);
  assert.equal(repaired.word.image, repaired.original);
  assert.equal(repaired.word._decodingAssets.bird, repaired.originalBird);
  assert.ok(repaired.word._decodingAssets.dog && repaired.word._decodingAssets.fish && repaired.word._packEdited);
  assert.ok((await page.getByRole('dialog').innerText()).includes('1 fixed'));
  await page.screenshot({ path: path.join(out, 'choice-images-repaired.png'), fullPage: true });
  pass('Generate pictures repairs only missing unique Read & Match choices, preserves existing target/choice art, and clears the real panel warning', { generatedChoices: repaired.requests });

  await mount('seven');
  const sequential = await page.evaluate(async () => {
    const result = [];
    for (let index = 0; index < 7; index++) {
      result.push(await window.__qa.generate(index, window.__qa.words[index].word));
      await new Promise(requestAnimationFrame);
    }
    return { result, requests: window.__imageRequests, busy: window.__qa.busy, pending: window.__qa.pending };
  });
  assert.deepEqual(sequential.result, Array(7).fill(true));
  assert.equal(sequential.requests.length, 7); assert.equal(sequential.pending, 0); assert.deepEqual(sequential.busy, []);
  pass('Seven sequential image generations complete and release their request slots', sequential);

  await mount('rows', 'deferred');
  await startDeferred();
  await page.evaluate(() => window.__qa.replace(words => [...words].reverse()));
  await page.waitForFunction(() => window.__qa.words[1].word === 'cat' && window.__qa.busy.includes(1));
  assert.equal(await finishDeferred(), true);
  await page.waitForFunction(() => window.__qa.pending === 0);
  const reordered = await page.evaluate(() => ({ rows: window.__qa.words, cat: __asset('generated cat'), dog: __asset('saved dog') }));
  assert.equal(reordered.rows[0].word, 'dog'); assert.equal(reordered.rows[0].image, reordered.dog);
  assert.equal(reordered.rows[1].word, 'cat'); assert.equal(reordered.rows[1].image, reordered.cat);
  pass('A pending image follows its original row through reordering and leaves the neighboring row unchanged');

  await mount('rows', 'deferred');
  await startDeferred();
  await page.evaluate(() => window.__qa.replace(words => words.map((word, index) => index ? word : { ...word, image: __asset('teacher edit') })));
  await page.waitForFunction(() => window.__qa.words[0].image === __asset('teacher edit'));
  assert.equal(await finishDeferred('stale result'), false);
  assert.equal(await page.evaluate(() => window.__qa.words[0].image === __asset('teacher edit')), true);
  pass('A late image cannot overwrite a teacher image edit made while generation was pending');

  await mount('rows', 'deferred');
  await startDeferred();
  await page.getByRole('button', { name: 'Back to Setup', exact: true }).click();
  await page.locator('#review-closed').waitFor();
  assert.equal(await finishDeferred('closed result'), false);
  assert.equal(await page.evaluate(() => window.__qa.words[0].image === __asset('saved cat')), true);
  pass('Closing the actual review panel cancels late image application and preserves saved art');

  await mount('choices', 'failure');
  await imageGap.getByRole('button', { name: /Generate pictures/ }).click();
  await page.getByText(/1 unchanged/).waitFor();
  assert.ok((await imageGap.innerText()).includes('pictures missing: 2'));
  const failed = await page.evaluate(() => ({ requests: window.__imageRequests, word: window.__qa.words[0],
    unchanged: window.__qa.words[0].image === __asset('saved cat'), pending: window.__qa.pending }));
  assert.deepEqual(failed.requests, ['dog']); assert.equal(failed.unchanged, true); assert.equal(failed.pending, 0);
  assert.equal(failed.word._decodingAssets.dog, undefined); assert.equal(failed.word._decodingAssets.fish, undefined);
  await page.screenshot({ path: path.join(out, 'choice-image-failure-keeps-art.png'), fullPage: true });
  pass('Failed choice generation preserves old assets, leaves an honest warning, and stops later requests');

  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  report.passed = true;
}
run().catch(async error => {
  report.passed = false; report.failure = error.stack; console.error(error);
  if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => {
  fs.writeFileSync(path.join(out, 'browser-acceptance.json'), JSON.stringify(report, null, 2));
  await browser?.close(); server.close();
});
