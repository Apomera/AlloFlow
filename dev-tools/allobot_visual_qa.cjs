const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT, 'test-results', 'allobot-visual-qa');
const BASELINE = path.join(__dirname, 'allobot_visual_baseline.json');

function isStrictDescendant(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return !!relative && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function resolveOutput(value, forceOutside = false) {
  if (value == null) return DEFAULT_OUTPUT;
  if (!String(value).trim()) throw new Error('--output requires a non-empty path.');
  const resolved = path.resolve(String(value));
  if (resolved === ROOT || resolved === path.parse(resolved).root) {
    throw new Error('Refusing to use a repository or filesystem root as visual output: ' + resolved);
  }
  const testResults = path.join(ROOT, 'test-results');
  if (isStrictDescendant(ROOT, resolved) && !isStrictDescendant(testResults, resolved)) {
    throw new Error('Refusing to replace a repository directory outside test-results/: ' + resolved);
  }
  if (!isStrictDescendant(testResults, resolved) && !forceOutside) {
    throw new Error('Custom visual output must stay under test-results/. Add --force-output only for a reviewed external path.');
  }
  if (!isStrictDescendant(testResults, resolved) && !path.basename(resolved).toLowerCase().includes('allobot')) {
    throw new Error('Forced external output must use an AlloBot-specific directory name: ' + resolved);
  }
  return resolved;
}

const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const OUTPUT = resolveOutput(
  outputArg ? outputArg.slice('--output='.length) : undefined,
  process.argv.includes('--force-output'),
);
const MODULE = path.join(ROOT, 'allobot_module.js');
const ORIGIN = 'http://allobot-visual.local';

const SIZES = Object.freeze([
  Object.freeze({ id: '64px', label: 'Actual 64px', scale: 1, width: 64, stage: 192 }),
  Object.freeze({ id: '200pct', label: '200% (128px)', scale: 2, width: 128, stage: 320 }),
]);

const STATES = Object.freeze([
  Object.freeze({ id: 'light-idle', label: 'Light / idle', props: { theme: 'light', mood: 'idle' } }),
  Object.freeze({ id: 'light-happy', label: 'Light / happy', props: { theme: 'light', mood: 'happy' } }),
  Object.freeze({ id: 'light-thinking', label: 'Light / thinking', props: { theme: 'light', mood: 'thinking' } }),
  Object.freeze({ id: 'light-sad', label: 'Light / sad', props: { theme: 'light', mood: 'sad' } }),
  Object.freeze({ id: 'dark-idle', label: 'Dark / idle', props: { theme: 'dark', mood: 'idle' } }),
  Object.freeze({ id: 'contrast-idle', label: 'Contrast / idle', props: { theme: 'contrast', mood: 'idle' } }),
  Object.freeze({ id: 'light-listening', label: 'Light / listening', props: { theme: 'light', mood: 'idle', isListening: true } }),
  Object.freeze({ id: 'light-talking', label: 'Light / talking', props: { theme: 'light', mood: 'idle', soundEnabled: true }, setup: 'talking' }),
  Object.freeze({ id: 'light-sleeping', label: 'Light / sleeping', props: { theme: 'light', mood: 'idle' }, setup: 'sleeping', cores: 0 }),
  Object.freeze({ id: 'light-prop-gaze-left', label: 'Light / left prop gaze', props: { theme: 'light', mood: 'idle', accessory: 'microscope' }, positionX: 24, side: 'left' }),
  Object.freeze({ id: 'light-prop-gaze-right', label: 'Light / right prop gaze', props: { theme: 'light', mood: 'idle', accessory: 'microscope' }, positionX: 410, side: 'right' }),
  Object.freeze({ id: 'light-scholar-specs', label: 'Light / scholar specs', props: { theme: 'light', mood: 'idle', accessory: 'scholar-specs' }, eyeDetails: 'simplified' }),
  Object.freeze({ id: 'light-librarian-kit', label: 'Light / librarian kit', props: { theme: 'light', mood: 'idle', accessory: 'librarian-kit' }, eyeDetails: 'simplified' }),
]);

function matrix() {
  return STATES.flatMap((state) => SIZES.map((size) => Object.freeze({
    ...state, id: state.id + '--' + size.id, stateId: state.id, size,
  })));
}

function packageAsset(name, relative) {
  let pkg;
  try {
    pkg = require.resolve(name + '/package.json', {
      paths: [path.join(ROOT, 'desktop', 'web-app'), ROOT],
    });
  } catch (error) {
    throw new Error('Missing ' + name + ' for AlloBot visual QA. Run: npm run setup:allobot-visual', { cause: error });
  }
  return path.join(path.dirname(pkg), relative);
}

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function background(theme) {
  return theme === 'dark' ? '#0f172a' : theme === 'contrast' ? '#ffffff' : '#eef2ff';
}

async function createPage(browser, scenario) {
  const unexpectedRequests = [];
  const context = await browser.newContext({
    viewport: { width: 480, height: 480 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    reducedMotion: 'reduce',
    colorScheme: scenario.props.theme === 'dark' ? 'dark' : 'light',
  });
  await context.route('**/*', (route) => {
    const requestUrl = route.request().url();
    const expectedDocument = ORIGIN + '/' + scenario.id + '.html';
    if (requestUrl === expectedDocument && route.request().isNavigationRequest()) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main id="stage"><div id="root"></div></main></body></html>',
      });
    }
    unexpectedRequests.push(requestUrl);
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(() => {
    Date.now = () => 1787932800000;
    Math.random = () => 0.5;
    window.matchMedia = (query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; },
    });
    const StubUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
      this.rate = 1;
      this.volume = 1;
      this.lang = 'en-US';
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    };
    const speechStub = {
      speak(utterance) {
        queueMicrotask(() => {
          if (utterance.onstart) utterance.onstart();
        });
      },
      cancel() {},
      getVoices() { return []; },
      pause() {},
      resume() {},
      speaking: false,
      pending: false,
    };
    try {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: StubUtterance });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speechStub });
    } catch (_) {
      window.SpeechSynthesisUtterance = StubUtterance;
      window.speechSynthesis = speechStub;
    }
    window.IntersectionObserver = class IntersectionObserver {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }]); }
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
    };
  });
  const page = await context.newPage();
  await page.goto(ORIGIN + '/' + scenario.id + '.html', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ path: packageAsset('react', path.join('umd', 'react.production.min.js')) });
  await page.addScriptTag({ path: packageAsset('react-dom', path.join('umd', 'react-dom.production.min.js')) });
  await page.evaluate((options) => {
    document.documentElement.style.background = options.background;
    document.body.style.cssText = 'margin:0;overflow:hidden;background:' + options.background;
    const stage = document.getElementById('stage');
    stage.style.cssText = 'position:relative;width:' + options.stage + 'px;height:' + options.stage
      + 'px;overflow:hidden;background:' + options.background;
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
      + '#stage [data-help-key="bot_avatar"]{position:absolute!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;'
      + 'transform:translate(-50%,-50%) scale(' + options.scale + ')!important;transform-origin:center!important}'
      + '#stage .allobot-satellite-control,#stage .allobot-speech-bubble,#stage [data-allo-mic-meter]{visibility:hidden!important}';
    document.head.appendChild(style);
    localStorage.clear();
    if (Number.isFinite(options.positionX)) {
      localStorage.setItem('allo_bot_pos_v2', JSON.stringify({ x: options.positionX, y: 80 }));
    }
    window.AlloLanguageContext = React.createContext({ t: (key) => key });
    const NullIcon = () => null;
    window.AlloIcons = {
      Mic: NullIcon, MicOff: NullIcon, Volume2: NullIcon,
      VolumeX: NullIcon, Settings: NullIcon, X: NullIcon,
    };
    window.__alloShared = {
      safeGetItem: (key) => localStorage.getItem(key),
      safeSetItem: (key, value) => localStorage.setItem(key, value),
      warnLog() {},
      debugLog() {},
    };
    window.__alloIsGlobalMuted = () => false;
    window.__allobotVisualRef = React.createRef();
  }, {
    background: background(scenario.props.theme),
    stage: scenario.size.stage,
    scale: scenario.size.scale,
    positionX: scenario.positionX,
  });

  await page.addScriptTag({ path: MODULE });
  await page.evaluate((props) => {
    const stable = {
      ...props,
      disableAnimations: true,
      isIdleDisabled: true,
      hasSeenBotIntro: true,
      canPlayIntro: false,
      idleSleepMs: 2147483647,
      ref: window.__allobotVisualRef,
    };
    window.__allobotVisualRoot = ReactDOM.createRoot(document.getElementById('root'));
    window.__allobotVisualRoot.render(React.createElement(window.AlloModules.AlloBot, stable));
  }, scenario.props);
  await page.locator('[data-help-key="bot_avatar"] svg').waitFor({ state: 'attached' });

  if (scenario.setup === 'talking') {
    await page.waitForFunction(() => window.__allobotVisualRef.current);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => window.__allobotVisualRef.current.speak('Hello, learner!', false));
    await page.locator('[data-allobot-face-state="talking"]').waitFor({ state: 'attached' });
  } else if (scenario.setup === 'sleeping') {
    await page.evaluate(() => {
      const control = document.querySelector('button[title="bot.sleep_title"]');
      if (!control) throw new Error('AlloBot sleep control was not rendered');
      control.click();
    });
    await page.locator('[aria-label="bot.wake_title"]').waitFor({ state: 'attached' });
  }
  if (scenario.side) {
    await page.locator('[data-allobot-accessory-reflection="' + scenario.side + '"]').waitFor({ state: 'attached' });
  }
  if (scenario.eyeDetails) {
    await page.locator('[data-allobot-eye-details="' + scenario.eyeDetails + '"]').waitFor({ state: 'attached' });
  }
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return { context, page, unexpectedRequests };
}

async function render(browser, scenario) {
  const { context, page, unexpectedRequests } = await createPage(browser, scenario);
  try {
    const measurements = await page.locator('[data-help-key="bot_avatar"] svg').evaluate((svg) => {
      const rect = svg.getBoundingClientRect();
      const root = svg.closest('[data-help-key="bot_avatar"]');
      const shell = svg.querySelector('[data-allobot-shell]');
      const face = svg.querySelector('[data-allobot-face-state]');
      const mouth = svg.querySelector('[data-allobot-mouth]');
      const cue = svg.querySelector('[data-allobot-voice-cue]');
      const details = svg.querySelector('[data-allobot-eye-details]');
      return {
        width: rect.width,
        height: rect.height,
        theme: shell && shell.getAttribute('data-allobot-shell'),
        motionDisabled: !!(root && root.classList.contains('allobot-motion-disabled')),
        cores: svg.querySelectorAll('[data-allobot-eye-core]').length,
        sparkles: svg.querySelectorAll('[data-allobot-eye-sparkle]').length,
        face: face && face.getAttribute('data-allobot-face-state'),
        body: root && root.getAttribute('data-allobot-body-state'),
        avatarTop: root ? root.style.top : '',
        avatarRight: root ? root.style.right : '',
        avatarTransform: root ? root.style.transform : '',
        avatarOpacity: root ? root.style.opacity : '',
        avatarFilter: root ? root.style.filter : '',
        mouth: mouth && mouth.getAttribute('data-allobot-mouth'),
        voiceCue: cue && cue.getAttribute('data-allobot-voice-cue'),
        eyeTransform: details ? details.style.transform : '',
      };
    });
    const expected = scenario.size.width;
    if (Math.abs(measurements.width - expected) > 0.25 || Math.abs(measurements.height - expected) > 0.25) {
      throw new Error(scenario.id + ' rendered ' + measurements.width + 'x' + measurements.height
        + '; expected ' + expected + 'x' + expected);
    }
    if (measurements.theme !== scenario.props.theme) {
      throw new Error(scenario.id + ' rendered theme ' + measurements.theme);
    }
    if (!measurements.motionDisabled) throw new Error(scenario.id + ' did not disable motion');
    const expectedCores = Number.isInteger(scenario.cores) ? scenario.cores : 2;
    if (measurements.cores !== expectedCores) {
      throw new Error(scenario.id + ' rendered ' + measurements.cores + ' eye cores; expected ' + expectedCores);
    }
    if ((scenario.props.accessory === 'scholar-specs' || scenario.props.accessory === 'librarian-kit')
      && measurements.sparkles !== 0) {
      throw new Error(scenario.id + ' rendered duplicate sparkles beneath face lenses');
    }
    const expectedFace = scenario.setup === 'sleeping'
      ? 'sleeping'
      : scenario.setup === 'talking'
        ? 'talking'
        : scenario.props.isListening
          ? 'listening'
          : scenario.props.mood;
    if (measurements.face !== expectedFace) {
      throw new Error(scenario.id + ' rendered face state ' + measurements.face + '; expected ' + expectedFace);
    }
    if (scenario.setup === 'sleeping' && measurements.body !== 'sleeping') {
      throw new Error(scenario.id + ' did not render the sleeping body pose');
    }
    if (scenario.setup === 'talking' && (measurements.mouth !== 'talking' || measurements.voiceCue !== 'talking')) {
      throw new Error(scenario.id + ' did not render the talking mouth and outbound voice cue');
    }
    if (scenario.props.isListening && measurements.voiceCue !== 'listening') {
      throw new Error(scenario.id + ' did not render the inbound listening cue');
    }
    if (scenario.side) {
      const match = String(measurements.eyeTransform).match(/translate\(\s*(-?[\d.]+)px/);
      const gazeX = match ? Number(match[1]) : 0;
      if ((scenario.side === 'left' && gazeX >= 0) || (scenario.side === 'right' && gazeX <= 0)) {
        throw new Error(scenario.id + ' rendered the wrong prop gaze: ' + measurements.eyeTransform);
      }
    }
    if (unexpectedRequests.length) {
      throw new Error(scenario.id + ' attempted unexpected network requests: ' + [...new Set(unexpectedRequests)].join(', '));
    }
    // Baseline only what is visibly painted. Hidden speech, controls, a11y text,
    // and their CSS are intentionally outside this signature so nonvisual copy
    // or accessibility improvements do not create false visual regressions.
    const visualSignature = await page.locator('[data-help-key="bot_avatar"] svg').evaluate((svg) => svg.outerHTML);
    const domSha256 = digest(Buffer.from(visualSignature, 'utf8'));
    const png = await page.locator('#stage').screenshot({ animations: 'disabled', type: 'png' });
    return { png, measurements, domSha256 };
  } finally {
    await context.close();
  }
}

async function check(browser, scenarios) {
  const results = [];
  for (const scenario of scenarios) {
    const first = await render(browser, scenario);
    const second = await render(browser, scenario);
    const firstHash = digest(first.png);
    const secondHash = digest(second.png);
    if (firstHash !== secondHash) {
      throw new Error(scenario.id + ' is not deterministic (' + firstHash + ' != ' + secondHash + ')');
    }
    if (first.domSha256 !== second.domSha256) {
      throw new Error(scenario.id + ' has a non-deterministic DOM signature (' + first.domSha256 + ' != ' + second.domSha256 + ')');
    }
    results.push({ id: scenario.id, sha256: firstHash, domSha256: first.domSha256, measurements: first.measurements });
  }
  return results;
}

function baselinePayload(results) {
  return {
    formatVersion: 1,
    scenarioCount: results.length,
    scenarios: Object.fromEntries(results.map((result) => [result.id, {
      domSha256: result.domSha256,
      measurements: result.measurements,
    }])),
  };
}

async function assertBaseline(results) {
  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(BASELINE, 'utf8'));
  } catch (error) {
    throw new Error('AlloBot vector baseline is missing or invalid. Review captures, then run: npm run visual:allobot:update-baseline', { cause: error });
  }
  const actual = baselinePayload(results);
  const mismatches = [];
  if (baseline.formatVersion !== actual.formatVersion) mismatches.push('formatVersion');
  if (baseline.scenarioCount !== actual.scenarioCount) mismatches.push('scenarioCount');
  const expectedIds = Object.keys(actual.scenarios);
  const baselineIds = baseline.scenarios && typeof baseline.scenarios === 'object' ? Object.keys(baseline.scenarios) : [];
  for (const id of new Set([...expectedIds, ...baselineIds])) {
    if (JSON.stringify(baseline.scenarios && baseline.scenarios[id]) !== JSON.stringify(actual.scenarios[id])) mismatches.push(id);
  }
  if (mismatches.length) {
    throw new Error('AlloBot visual baseline changed for: ' + mismatches.join(', ')
      + '. Run npm run visual:allobot, review the contact sheet, then explicitly update the baseline if intended.');
  }
}

async function updateBaseline(results) {
  await fs.writeFile(BASELINE, JSON.stringify(baselinePayload(results), null, 2) + '\n', 'utf8');
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function replaceCaptureDirectory(staging, output) {
  const backup = output + '.previous-' + process.pid + '-' + Date.now();
  let movedExisting = false;
  let installed = false;
  try {
    if (await pathExists(output)) {
      await fs.rename(output, backup);
      movedExisting = true;
    }
    await fs.rename(staging, output);
    installed = true;
    if (movedExisting) await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (!installed && movedExisting && !(await pathExists(output)) && await pathExists(backup)) {
      await fs.rename(backup, output);
    }
    throw error;
  } finally {
    if (await pathExists(staging)) await fs.rm(staging, { recursive: true, force: true });
    if (installed && await pathExists(backup)) await fs.rm(backup, { recursive: true, force: true });
  }
}

async function capture(browser, scenarios) {
  const parent = path.dirname(OUTPUT);
  await fs.mkdir(parent, { recursive: true });
  const staging = await fs.mkdtemp(path.join(parent, '.' + path.basename(OUTPUT) + '-stage-'));
  const entries = [];
  try {
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      const result = await render(browser, scenario);
      const file = String(index + 1).padStart(2, '0') + '-' + scenario.id + '.png';
      await fs.writeFile(path.join(staging, file), result.png);
      entries.push({
        id: scenario.id,
        label: scenario.label,
        size: scenario.size.label,
        width: scenario.size.width,
        file,
        sha256: digest(result.png),
        domSha256: result.domSha256,
        measurements: result.measurements,
      });
    }
    const report = { screenshotCount: entries.length, expectedScreenshotCount: matrix().length, entries };
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
    const cards = entries.map((entry) => '<article><h2>' + entry.label + ' / ' + entry.size
      + '</h2><img src="' + entry.file + '" alt="' + entry.label + ' at ' + entry.size
      + '"><code>' + entry.sha256.slice(0, 16) + '</code></article>').join('');
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AlloBot visual QA</title>'
      + '<style>body{margin:0;padding:24px;background:#e2e8f0;color:#0f172a;font-family:system-ui,sans-serif}'
      + 'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}'
      + 'article{overflow:hidden;border:1px solid #94a3b8;border-radius:12px;background:white}'
      + 'h2,code{display:block;margin:0;padding:9px 12px;font-size:.85rem}img{display:block;width:100%;height:260px;object-fit:contain;background:#cbd5e1}</style>'
      + '</head><body><h1>AlloBot visual QA</h1><p>Review at native size before updating the vector baseline.</p><main>'
      + cards + '</main></body></html>\n';
    await fs.writeFile(path.join(staging, 'index.html'), html, 'utf8');
    await replaceCaptureDirectory(staging, OUTPUT);
    return entries;
  } catch (error) {
    if (await pathExists(staging)) await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const wantsCapture = process.argv.includes('--capture');
  const wantsUpdateBaseline = process.argv.includes('--update-baseline');
  const wantsCheck = process.argv.includes('--check') || (!wantsCapture && !wantsUpdateBaseline);
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    throw new Error('Playwright is required for AlloBot visual QA. Run: npm run setup:allobot-visual', { cause: error });
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    throw new Error('Unable to launch Playwright Chromium. Run: npm run setup:allobot-visual', { cause: error });
  }
  const scenarios = matrix();
  try {
    if (wantsCheck || wantsUpdateBaseline) {
      const results = await check(browser, scenarios);
      if (wantsUpdateBaseline) {
        await updateBaseline(results);
        console.log('[AlloBot visual QA] Updated reviewed vector baseline for ' + results.length + ' scenarios.');
      } else {
        await assertBaseline(results);
        console.log('[AlloBot visual QA] ' + results.length + ' scenarios match the reviewed vector baseline and rendered twice with stable pixels.');
      }
    }
    if (wantsCapture) {
      const entries = await capture(browser, scenarios);
      console.log('[AlloBot visual QA] Captured ' + entries.length + ' scenarios in ' + OUTPUT);
      console.log('[AlloBot visual QA] Review index.html before updating the vector baseline.');
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[AlloBot visual QA] ' + (error && error.stack ? error.stack : error));
    process.exitCode = 1;
  });
}

module.exports = { SIZES, STATES, ROOT, OUTPUT, DEFAULT_OUTPUT, BASELINE, matrix, resolveOutput, baselinePayload };
