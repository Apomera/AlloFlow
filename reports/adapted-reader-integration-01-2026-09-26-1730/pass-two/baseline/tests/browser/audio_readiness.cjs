// Local browser acceptance: real media decoding and the built reader/service.
// No server, live app, account, provider request, or persisted user data.
// Run from the repository root: node tests/browser/audio_readiness.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.argv[2] || path.join(root, 'reports/audio-readiness-browser.json'));
const report = { cases: [], browser: null, liveRequests: [] };

function wave(codec = 1) {
  const samples = 4000, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(codec, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(2000 * Math.sin(i * 2 * Math.PI * 220 / 8000)), 44 + i * 2);
  return bytes.toString('base64');
}
const damaged = Buffer.from(wave(), 'base64'); damaged.writeUInt32LE(0, 24); damaged.writeUInt32LE(0, 28);
const fixtures = { good: wave(), unsupported: wave(0xffff), damaged: damaged.toString('base64') };

(async () => {
  const runtime = esbuild.buildSync({ stdin: {
    contents: 'window.React = require("react"); window.ReactDOM = require("react-dom/client");',
    resolveDir: path.join(root, 'desktop/web-app'),
  }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
  report.browser = browser.version();
  const context = await browser.newContext();
  const errors = [];
  await context.route('**/*', route => {
    if (route.request().url() === 'https://audio-readiness.test/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Audio readiness fixture</title></head><body><main id="root"></main></body></html>' });
    report.liveRequests.push(route.request().url()); return route.abort();
  });
  let page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(8000);
  const review = () => page.locator('[data-review-state="audio"]');
  const recover = () => page.locator('[data-review-action="audio"]');
  async function check(name, run) {
    try { await run(); report.cases.push({ name, passed: true }); console.log('PASS ' + name); }
    catch (error) {
      const state = await page.evaluate(() => ({ mediaEvents: window.mediaEvents, review: document.querySelector('[data-review-state="audio"]')?.textContent, summary: window.bridge?.summary(window.sentences), notice: document.body.innerText.slice(-4000) }));
      report.cases.push({ name, passed: false, error: String(error.stack || error), state }); throw error;
    }
  }
  async function boot(payload = null, openTools = true) {
    await page.goto('https://audio-readiness.test/');
    // CDP's default userGesture=false keeps fixture initialization from
    // granting autoplay permission before the test's actual button click.
    const setupSession = await page.context().newCDPSession(page);
    const script = async expression => {
      const result = await setupSession.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: false });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const evaluate = (fn, args) => script('(' + fn.toString() + ')(' + JSON.stringify(args ?? null) + ')');
    await script(runtime);
    await evaluate(() => {
      window.AlloModules = {}; window.warnLog = window.debugLog = () => {};
      window.AlloIcons = new Proxy({}, { get: () => () => null });
      window.mediaEvents = [];
      // Observe native media elements. Neither play() nor decoding is mocked.
      window.Audio = new Proxy(window.Audio, { construct(NativeAudio, args) {
        const audio = new NativeAudio(...args);
        for (const type of ['playing', 'ended', 'error']) audio.addEventListener(type, () => {
          window.mediaEvents.push({ type, url: audio.src, code: audio.error?.code, time: audio.currentTime });
        });
        return audio;
      } });
    });
    for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'view_simplified_module.js']) {
      await script(fs.readFileSync(path.join(root, file), 'utf8'));
    }
    await evaluate(async ({ fixtures, payload }) => {
      window.fixtures = fixtures; window.synthCalls = 0;
      const KS = window.AlloModules.KaraokeAudioStore;
      const pure = window.AlloModules.PureHelpers, phase = window.AlloModules.PhaseNHelpers;
      const sentences = window.sentences = ['Plants need light.', 'Roots take in water.'];
      const resource = { id: 'audio-fixture', type: 'simplified', data: sentences.join(' '), config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } };
      const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 };
      KS.current = KS.createStore();
      window.bridge = window.AlloModules.createReadAloudLegacyBridge({
        getResource: () => resource, getStore: () => KS.current, getProfile: () => profile,
        enumerateResourceSegments: () => sentences.map((text, index) => ({ text, segmentId: 'sentence-' + index })),
        synthesize: async () => { window.synthCalls++; return { b64: fixtures.good, mime: 'audio/wav' }; },
      });
      if (payload) KS.current.hydrate(payload); else await bridge.prepare(sentences);
      window.__alloGetReadAloudAudioSummary = (...args) => bridge.summary(...args);
      window.__alloInspectReadAloudAudio = (...args) => bridge.inspect(...args);
      window.__alloQuarantineReadAloudAudio = (...args) => bridge.quarantine(...args);
      window.__alloPrepareReadAloud = (...args) => bridge.prepare(...args);
      const noop = () => {};
      const props = { ComplexityGauge: () => null, t: key => key === 'common.play' ? 'Play' : key,
        generatedContent: resource, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English',
        isTeacherMode: true, isEditingLeveledText: true, isZenMode: false, interactionMode: 'read', history: [],
        textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}),
        getSideBySideContent: () => null, handleSpeak: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
        renderFormattedText: value => value,
        formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
        SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [],
        setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
        handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop,
        handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop };
      window.renderReader = (extra = {}) => { Object.assign(props, extra); window.readerRoot.render(React.createElement(window.AlloModules.SimplifiedView, { ...props })); };
      window.readerRoot = ReactDOM.createRoot(document.getElementById('root')); window.renderReader();
      window.replaceFirst = (fixture, source = 'ai') => {
        const entry = Object.values(KS.current.serialize().entries).find(e => e.identity.spokenText === sentences[0]);
        return KS.current.put(entry.identity, fixtures[fixture], 'audio/wav', source, entry.synthesisProfile, { allowReplaceHuman: true });
      };
    }, { fixtures, payload });
    await setupSession.detach();
    if (openTools) {
      await expect(review()).toContainText('2 of 2');
      await page.locator('button[aria-controls^="allo-edit-audio-"]').click();
    }
  }
  async function preview() {
    await page.evaluate(() => { window.mediaEvents.length = 0; });
    await page.getByRole('button', { name: 'Play 1', exact: true }).click();
  }
  try {
    await boot();
    await check('native PCM preview reaches playing and ended', async () => {
      await preview();
      await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended' && event.time > 0));
      assert.ok(await page.evaluate(() => window.mediaEvents.some(event => event.type === 'playing')));
      await expect(review()).toContainText('Audio prepared');
    });
    await check('fresh document hydrates serialized clips and plays without synthesis', async () => {
      const saved = await page.evaluate(() => ({ payload: JSON.parse(JSON.stringify(window.AlloModules.KaraokeAudioStore.current.serialize())), url: bridge.inspect(sentences[0]).url }));
      await boot(saved.payload);
      assert.equal(await page.evaluate(() => window.synthCalls), 0);
      assert.notEqual(await page.evaluate(() => bridge.inspect(sentences[0]).url), saved.url);
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
    });
    await check('unsupported codec is quarantined after real decoder failure and preparation recovers', async () => {
      assert.ok(await page.evaluate(() => window.replaceFirst('unsupported')));
      await preview();
      await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'error'));
      await expect(review()).toContainText('1 of 2'); await expect(recover()).toBeVisible();
      assert.equal(await page.evaluate(() => bridge.inspect(sentences[0]).status), 'corrupt');
      await recover().click(); await expect(review()).toContainText('2 of 2');
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
    });
    await check('revoked blob fails native playback and keeps recovery available', async () => {
      await page.evaluate(() => { const url = window.replaceFirst('good'); URL.revokeObjectURL(url); });
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'error'));
      await expect(review()).toContainText('1 of 2'); await expect(recover()).toBeVisible();
      await recover().click(); await expect(review()).toContainText('2 of 2');
    });
    await check('damaged WAV passes container screening but native decoding rejects it and allows repair', async () => {
      assert.ok(await page.evaluate(() => window.replaceFirst('damaged')));
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'error'));
      await expect(review()).toContainText('1 of 2');
      assert.equal(await page.evaluate(() => bridge.inspect(sentences[0]).status), 'corrupt');
      await recover().click(); await expect(review()).toContainText('2 of 2');
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
    });
    await check('direct clear and delayed hydration update the mounted reader without host events', async () => {
      const payload = await page.evaluate(() => window.AlloModules.KaraokeAudioStore.current.serialize());
      await page.evaluate(() => window.AlloModules.KaraokeAudioStore.current.clear());
      await expect(review()).toContainText('0 of 2'); await expect(recover()).toBeVisible();
      await page.evaluate(payload => window.AlloModules.KaraokeAudioStore.current.hydrate(payload), payload);
      await expect(review()).toContainText('2 of 2');
    });
    await check('real MediaRecorder teacher take remains playable and survives synthesis setting changes', async () => {
      const recorded = await page.evaluate(async () => {
        const ctx = new AudioContext(), oscillator = ctx.createOscillator(), destination = ctx.createMediaStreamDestination();
        oscillator.connect(destination); await ctx.resume();
        const chunks = [], recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
        const blob = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Recorder did not finish')), 5000);
          recorder.ondataavailable = event => {
            if (event.data.size) chunks.push(event.data);
            if (chunks.reduce((total, chunk) => total + chunk.size, 0) > 1000 && recorder.state === 'recording') recorder.stop();
          };
          recorder.onerror = event => { clearTimeout(timer); reject(event.error || new Error('Recording failed')); };
          recorder.onstop = () => { clearTimeout(timer); resolve(new Blob(chunks, { type: recorder.mimeType })); };
          recorder.start(100); oscillator.start();
        }).finally(async () => { oscillator.stop(); destination.stream.getTracks().forEach(track => track.stop()); await ctx.close(); });
        const saved = await bridge.saveRecording(sentences[0], blob, 'human-teacher', 'reference');
        window.renderReader({ selectedVoice: 'Aoede', voiceSpeed: 0.8 });
        return { saved, mime: blob.type, size: blob.size };
      });
      report.recording = recorded;
      assert.equal(recorded.saved, true); assert.ok(recorded.size > 0);
      await expect(review()).toContainText('1 of 2'); // Teacher take is ready; old synthesized second sentence is stale.
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
      assert.equal(await page.evaluate(() => bridge.inspect(sentences[0]).source), 'human-teacher');
      const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.AlloModules.KaraokeAudioStore.current.serialize())));
      await boot(saved); assert.equal(await page.evaluate(() => window.synthCalls), 0);
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
    });
    await check('native autoplay denial preserves readiness and a trusted click can retry', async () => {
      await page.close();
      const policyContext = await browser.newContext();
      await policyContext.route('**/*', route => {
        if (route.request().url() === 'https://audio-readiness.test/') return route.fulfill({
          contentType: 'text/html', headers: { 'Permissions-Policy': 'autoplay=()' },
          body: '<!doctype html><html><head><title>Autoplay fixture</title></head><body><main id="root"></main></body></html>',
        });
        report.liveRequests.push(route.request().url()); return route.abort();
      });
      page = await policyContext.newPage(); page.setDefaultTimeout(8000);
      page.on('pageerror', error => errors.push(error.message));
      await boot(null, false);
      // Playwright's normal evaluate grants userGesture. Use an explicitly
      // untrusted script task to exercise Chromium's actual autoplay policy.
      const cdp = await policyContext.newCDPSession(page);
      const denied = await cdp.send('Runtime.evaluate', { expression: '(' + (async () => {
        const wait = predicate => new Promise((resolve, reject) => {
          const deadline = Date.now() + 8000;
          const poll = () => { if (predicate()) resolve(); else if (Date.now() >= deadline) reject(new Error('Autoplay fixture timed out')); else setTimeout(poll, 20); };
          poll();
        });
        await wait(() => document.querySelector('button[aria-controls^="allo-edit-audio-"]'));
        document.querySelector('button[aria-controls^="allo-edit-audio-"]').click();
        await wait(() => document.querySelector('button[aria-label="Play 1"]'));
        document.querySelector('button[aria-label="Play 1"]').click();
        await wait(() => document.body.textContent.includes('Audio playback was blocked. Press Play again.'));
        return { activation: navigator.userActivation.hasBeenActive, status: window.bridge.inspect(window.sentences[0]).status };
      }).toString() + ')()', userGesture: false, awaitPromise: true, returnByValue: true });
      assert.equal(denied.exceptionDetails, undefined, JSON.stringify(denied.exceptionDetails));
      assert.deepEqual(denied.result.value, { activation: false, status: 'ready' });
      await expect(page.getByText('Audio playback was blocked. Press Play again.', { exact: true })).toBeVisible();
      await expect(review()).toContainText('2 of 2');
      assert.equal(await page.evaluate(() => bridge.inspect(sentences[0]).status), 'ready');
      await preview(); await page.waitForFunction(() => window.mediaEvents.some(event => event.type === 'ended'));
      await cdp.detach();
      await policyContext.close();
    });
    assert.deepEqual(errors, []); assert.deepEqual(report.liveRequests, []);
    report.passed = true;
  } finally {
    report.pageErrors = errors;
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
