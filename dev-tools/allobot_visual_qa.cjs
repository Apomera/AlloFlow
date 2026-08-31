const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT, 'test-results', 'allobot-visual-qa');
const BASELINE = path.join(__dirname, 'allobot_visual_baseline.json');
const BASELINE_FORMAT_VERSION = 2;

const PAINT_PROPERTIES = Object.freeze({
  avatar: Object.freeze([
    'display', 'visibility', 'opacity', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'filter', 'transform', 'transform-origin',
  ]),
  body: Object.freeze(['display', 'visibility', 'opacity', 'filter', 'transform', 'transform-origin']),
  svg: Object.freeze(['display', 'visibility', 'opacity', 'filter', 'transform', 'transform-origin', 'fill', 'stroke', 'stroke-width']),
  chrome: Object.freeze([
    'display', 'visibility', 'opacity', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'background-color', 'color', 'border-top-color',
    'border-top-style', 'border-top-width', 'border-radius', 'box-shadow', 'filter',
    'transform', 'transform-origin',
  ]),
});

const VISIBLE_PAINT_PROPERTIES = Object.freeze([
  'display', 'visibility', 'opacity', 'position', 'z-index', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'box-sizing',
  'overflow-x', 'overflow-y', 'clip', 'clip-path', 'transform', 'transform-origin', 'filter',
  'backdrop-filter', 'mix-blend-mode', 'isolation',
  'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat',
  'border-top-color', 'border-top-style', 'border-top-width',
  'border-right-color', 'border-right-style', 'border-right-width',
  'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
  'border-left-color', 'border-left-style', 'border-left-width',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'outline-color', 'outline-style', 'outline-width', 'outline-offset',
  'color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-opacity', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'vector-effect', 'paint-order',
  'font-family', 'font-size', 'font-style', 'font-weight', 'line-height', 'letter-spacing',
  'text-decoration-color', 'text-decoration-line', 'text-shadow', 'white-space',
  'mask-image', 'mask-position', 'mask-size', 'shape-rendering',
]);

// These are the concrete values currently fed to `idleAnimation`, whose render
// contract is `animate-allo-${idleAnimation}`. Keep the producer alongside its
// value so a missing summon, ambient, or known imperative binding fails with an
// actionable message instead of silently becoming a no-op animation.
const RUNTIME_IDLE_ANIMATIONS = Object.freeze([
  Object.freeze({ name: 'wave', sources: Object.freeze(['ambient']) }),
  Object.freeze({ name: 'backflip', sources: Object.freeze(['ambient']) }),
  Object.freeze({ name: 'shrug', sources: Object.freeze(['ambient']) }),
  Object.freeze({ name: 'look-around', sources: Object.freeze(['ambient']) }),
  Object.freeze({ name: 'wave-hello', sources: Object.freeze(['summon', 'intro']) }),
  Object.freeze({ name: 'sympathetic-tilt', sources: Object.freeze(['imperative']) }),
]);

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
const scenarioArg = process.argv.find((arg) => arg.startsWith('--scenario='));
const OUTPUT = resolveOutput(
  outputArg ? outputArg.slice('--output='.length) : undefined,
  process.argv.includes('--force-output'),
);
const MODULE = path.join(ROOT, 'allobot_module.js');
const ORIGIN = 'http://allobot-visual.local';
const AVATAR_SVG_SELECTOR = '[data-help-key="bot_avatar"] svg[viewBox="0 0 100 100"]';

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
  Object.freeze({ id: 'light-chrome-top-right', label: 'Light / controls / top right', props: { theme: 'light', mood: 'idle', accessory: 'gear' }, chrome: 'hover', anchor: 'top-right' }),
  Object.freeze({ id: 'contrast-live-chrome-bottom-left', label: 'Contrast / live controls / bottom left', props: { theme: 'contrast', mood: 'idle', accessory: 'artist', isListening: true }, chrome: 'hover', anchor: 'bottom-left' }),
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

function selectScenarios(items, requestedId) {
  if (requestedId == null) return items;
  const id = String(requestedId).trim();
  if (!id) throw new Error('--scenario requires a non-empty scenario id.');
  const selected = items.filter((item) => item.id === id);
  if (!selected.length) throw new Error('Unknown AlloBot visual scenario: ' + id);
  return selected;
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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function extractRuntimeIdleAnimationNames(source) {
  const text = String(source || '');
  const names = [];
  const addStringLiterals = (value) => {
    const matcher = /['"]([-\w]+)['"]/g;
    let match;
    while ((match = matcher.exec(value))) names.push(match[1]);
  };
  const direct = /setIdleAnimation\(\s*['"]([-\w]+)['"]\s*\)/g;
  let match;
  while ((match = direct.exec(text))) names.push(match[1]);
  const selectedFromList = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]+)\][\s\S]{0,500}?const\s+([A-Za-z_$][\w$]*)\s*=\s*\1\[[^\]]+\][\s\S]{0,300}?setIdleAnimation\(\s*\3\s*\)/g;
  while ((match = selectedFromList.exec(text))) addStringLiterals(match[2]);
  return uniqueSorted(names);
}

function validateRuntimeAnimationProducers(source, contract = RUNTIME_IDLE_ANIMATIONS) {
  const emitted = extractRuntimeIdleAnimationNames(source);
  const contracted = new Set(contract.map((item) => item.name));
  const uncovered = emitted.filter((name) => !contracted.has(name));
  if (uncovered.length) {
    throw new Error('AlloBot emits idle animations missing from the visual CSS contract: ' + uncovered.join(', '));
  }
  const expectedStaticProducers = contract
    .filter((item) => item.sources.some((sourceName) => sourceName !== 'imperative'))
    .map((item) => item.name);
  const unresolved = expectedStaticProducers.filter((name) => !emitted.includes(name));
  if (unresolved.length) {
    throw new Error('AlloBot visual QA could not resolve declared runtime animation producers: ' + unresolved.join(', '));
  }
  return emitted;
}

function validateStylesheetSemantics(semantics) {
  if (!semantics || !Array.isArray(semantics.authoredKeyframes)
    || !Array.isArray(semantics.keyframes) || !Array.isArray(semantics.animationBindings)) {
    throw new Error('AlloBot stylesheet semantics were not collected completely.');
  }
  const authored = uniqueSorted(semantics.authoredKeyframes);
  const parsed = new Set(semantics.keyframes.map((rule) => rule && rule.name).filter(Boolean));
  const missingParsed = authored.filter((name) => !parsed.has(name));
  if (missingParsed.length) {
    throw new Error('AlloBot keyframes were authored but not parsed by Chromium: ' + missingParsed.join(', ')
      + '. Check the surrounding stylesheet for malformed or dropped CSS.');
  }
  const emptyKeyframes = semantics.keyframes
    .filter((rule) => !rule || !Array.isArray(rule.frames) || !rule.frames.length
      || rule.frames.some((frame) => !frame || !frame.declarations || !Object.keys(frame.declarations).length))
    .map((rule) => rule && rule.name ? rule.name : '<unnamed>');
  if (emptyKeyframes.length) {
    throw new Error('AlloBot keyframes parsed without usable frames: ' + uniqueSorted(emptyKeyframes).join(', '));
  }
  const references = uniqueSorted(semantics.animationBindings.flatMap((binding) => binding.animationNames || [])
    .filter((name) => name && !['none', 'initial', 'inherit', 'unset'].includes(name)));
  const missingReferences = references.filter((name) => !parsed.has(name));
  if (missingReferences.length) {
    throw new Error('AlloBot animation rules reference missing keyframes: ' + missingReferences.join(', '));
  }
  return true;
}

function validateRuntimeAnimationContract(semantics, contract = RUNTIME_IDLE_ANIMATIONS) {
  validateStylesheetSemantics(semantics);
  const bindings = semantics.animationBindings || [];
  const parsedKeyframes = new Set((semantics.keyframes || []).map((rule) => rule && rule.name).filter(Boolean));
  const summaries = [];
  const missing = [];
  for (const item of contract) {
    const className = 'animate-allo-' + item.name;
    const classToken = '.' + className;
    const matching = bindings.filter((binding) => String(binding.selector || '').split(',').some((selector) => {
      const branch = selector.trim();
      if (!branch.endsWith(classToken)) return false;
      const prefix = branch.slice(0, -classToken.length);
      return !prefix || /(?:\s|[>+~])$/.test(prefix);
    }));
    const animationNames = uniqueSorted(matching.flatMap((binding) => binding.animationNames || [])
      .filter((name) => name && name !== 'none' && parsedKeyframes.has(name)));
    if (!animationNames.length) {
      missing.push(className + ' (' + item.sources.join('/') + ')');
      continue;
    }
    summaries.push({
      name: item.name,
      className,
      sources: [...item.sources],
      animationNames,
    });
  }
  if (missing.length) {
    throw new Error('AlloBot runtime animation classes have no parsed animation binding: ' + missing.join(', '));
  }
  return summaries;
}

function stylesheetBaselinePayload(semantics) {
  validateStylesheetSemantics(semantics);
  const runtimeAnimations = validateRuntimeAnimationContract(semantics);
  const keyframes = [...semantics.keyframes].sort((a, b) => {
    const left = a.scope + '\u0000' + a.name;
    const right = b.scope + '\u0000' + b.name;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const animationBindings = [...semantics.animationBindings].sort((a, b) => {
    const left = a.scope + '\u0000' + a.selector;
    const right = b.scope + '\u0000' + b.selector;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return {
    authoredKeyframes: uniqueSorted(semantics.authoredKeyframes),
    parsedKeyframes: uniqueSorted(keyframes.map((rule) => rule.name)),
    keyframeRuleCount: keyframes.length,
    animationBindingCount: animationBindings.length,
    animationReferences: uniqueSorted(animationBindings.flatMap((binding) => binding.animationNames || [])
      .filter((name) => name && name !== 'none')),
    runtimeAnimations,
    keyframesSha256: digest(Buffer.from(JSON.stringify(keyframes), 'utf8')),
    animationBindingsSha256: digest(Buffer.from(JSON.stringify(animationBindings), 'utf8')),
  };
}

function stylesheetContractDigest(summary) {
  return digest(Buffer.from(JSON.stringify(summary), 'utf8'));
}

function stylesheetVariantsPayload(results) {
  const variants = new Map();
  for (const result of results) {
    const summary = stylesheetBaselinePayload(result.stylesheetSemantics);
    const signature = stylesheetContractDigest(summary);
    const existing = variants.get(signature);
    if (existing) existing.scenarioIds.push(result.id);
    else variants.set(signature, { scenarioIds: [result.id], ...summary });
  }
  return Object.fromEntries([...variants.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([signature, variant]) => [signature, {
      ...variant,
      scenarioIds: [...variant.scenarioIds].sort(),
    }]));
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
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error && error.message ? error.message : String(error)));
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
    const cornerInset = 14 + (8 * options.scale);
    const avatarPlacement = options.anchor === 'top-right'
      ? 'position:absolute!important;left:auto!important;top:' + cornerInset + 'px!important;right:' + cornerInset + 'px!important;bottom:auto!important;'
        + 'transform:scale(' + options.scale + ')!important;transform-origin:top right!important'
      : options.anchor === 'bottom-left'
        ? 'position:absolute!important;left:' + cornerInset + 'px!important;top:auto!important;right:auto!important;bottom:' + cornerInset + 'px!important;'
          + 'transform:scale(' + options.scale + ')!important;transform-origin:bottom left!important'
        : 'position:absolute!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;'
          + 'transform:translate(-50%,-50%) scale(' + options.scale + ')!important;transform-origin:center!important';
    const hiddenSelectors = [
      '#stage .allobot-speech-bubble',
      '#stage [data-allo-mic-meter]',
    ];
    if (!options.showChrome) hiddenSelectors.push('#stage .allobot-satellite-control');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
      + '#stage [data-help-key="bot_avatar"]{' + avatarPlacement + '}'
      + hiddenSelectors.join(',') + '{visibility:hidden!important}';
    document.head.appendChild(style);
    localStorage.clear();
    if (Number.isFinite(options.positionX)) {
      localStorage.setItem('allo_bot_pos_v2', JSON.stringify({ x: options.positionX, y: 80 }));
    }
    window.AlloLanguageContext = React.createContext({ t: (key) => key });
    const makeStubIcon = (paths) => ({ size = 12, strokeWidth = 2 }) => React.createElement(
      'svg',
      { width: size, height: size, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
      ...paths.map((d, index) => React.createElement('path', {
        key: index, d, stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
      })),
    );
    const MicIcon = makeStubIcon(['M4 5V3a2 2 0 014 0v2a2 2 0 01-4 0', 'M2.5 5a3.5 3.5 0 007 0', 'M6 8.5V11']);
    const MicOffIcon = makeStubIcon(['M4 4V3a2 2 0 013.8-.8', 'M3 7a3.5 3.5 0 005.5.8', 'M6 9v2', 'M2 2l8 8']);
    const VolumeIcon = makeStubIcon(['M2 5h2l2-2v6L4 7H2z', 'M8 4a3 3 0 010 4']);
    const VolumeOffIcon = makeStubIcon(['M2 5h2l2-2v6L4 7H2z', 'M8 4l3 4', 'M11 4L8 8']);
    const SettingsIcon = makeStubIcon(['M6 1v2M6 9v2M1 6h2M9 6h2', 'M6 4a2 2 0 100 4 2 2 0 000-4']);
    const CloseIcon = makeStubIcon(['M3 3l6 6', 'M9 3L3 9']);
    window.AlloIcons = {
      Mic: MicIcon, MicOff: MicOffIcon, Volume2: VolumeIcon,
      VolumeX: VolumeOffIcon, Settings: SettingsIcon, X: CloseIcon,
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
    anchor: scenario.anchor,
    showChrome: !!scenario.chrome,
  });

  await page.addScriptTag({ path: MODULE });
  await page.evaluate((options) => {
    const stable = {
      ...options.props,
      disableAnimations: true,
      isIdleDisabled: true,
      hasSeenBotIntro: true,
      canPlayIntro: false,
      idleSleepMs: 2147483647,
      ref: window.__allobotVisualRef,
    };
    if (options.showChrome) {
      stable.onVoiceSettingsClick = () => {};
      stable.onToggleMute = () => {};
      stable.onMicClick = () => {};
    }
    window.__allobotVisualRoot = ReactDOM.createRoot(document.getElementById('root'));
    window.__allobotVisualRoot.render(React.createElement(window.AlloModules.AlloBot, stable));
  }, { props: scenario.props, showChrome: !!scenario.chrome });
  try {
    await page.locator(AVATAR_SVG_SELECTOR).waitFor({ state: 'attached' });
  } catch (error) {
    if (pageErrors.length) {
      throw new Error(scenario.id + ' failed while mounting AlloBot: ' + [...new Set(pageErrors)].join(' | '), { cause: error });
    }
    throw error;
  }

  if (scenario.chrome === 'hover') {
    await page.locator('[data-help-key="bot_avatar"]').hover({ position: { x: 32, y: 32 } });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.allobot-satellite-control'))
      .every((control) => getComputedStyle(control).opacity === '1'));
  }

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
    await page.locator('[data-allobot-avatar-action="wake"][title="bot.wake_title"]').waitFor({ state: 'attached' });
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

async function collectStylesheetSemantics(page) {
  return page.evaluate(() => {
    const authoredKeyframes = [];
    const keyframes = [];
    const animationBindings = [];
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const declarations = (style, selectedProperties) => {
      const properties = selectedProperties || Array.from(style);
      return Object.fromEntries(properties.filter((property) => style.getPropertyValue(property)).sort()
        .map((property) => [property, normalize(style.getPropertyValue(property))
          + (style.getPropertyPriority(property) ? ' !important' : '')]));
    };
    const animationProperties = [
      'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function',
      'animation-iteration-count', 'animation-direction', 'animation-fill-mode',
      'animation-play-state', 'transform-box', 'transform-origin',
    ];
    const visit = (rules, scope) => {
      for (const rule of Array.from(rules || [])) {
        if (rule.type === CSSRule.KEYFRAMES_RULE) {
          keyframes.push({
            scope,
            name: rule.name,
            frames: Array.from(rule.cssRules || []).map((frame) => ({
              offset: normalize(frame.keyText),
              declarations: declarations(frame.style),
            })),
          });
          continue;
        }
        if (rule.type === CSSRule.STYLE_RULE) {
          const animationNames = normalize(rule.style.animationName).split(',')
            .map((name) => name.trim()).filter((name) => name && name !== 'none');
          if (animationNames.length) {
            animationBindings.push({
              scope,
              selector: normalize(rule.selectorText),
              animationNames,
              declarations: declarations(rule.style, animationProperties),
            });
          }
          continue;
        }
        if (rule.cssRules) {
          const group = rule.conditionText
            ? '@media ' + normalize(rule.conditionText)
            : normalize(String(rule.cssText || '').split('{', 1)[0]);
          visit(rule.cssRules, scope + ' > ' + group);
        }
      }
    };
    for (const style of Array.from(document.querySelectorAll('style'))) {
      const source = String(style.textContent || '').replace(/\/\*[\s\S]*?\*\//g, '');
      const matcher = /@(?:-\w+-)?keyframes\s+([-\w]+)/gi;
      let match;
      while ((match = matcher.exec(source))) authoredKeyframes.push(match[1]);
      if (style.sheet) visit(style.sheet.cssRules, 'root');
    }
    keyframes.sort((a, b) => {
      const left = a.scope + '\u0000' + a.name;
      const right = b.scope + '\u0000' + b.name;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    animationBindings.sort((a, b) => {
      const left = a.scope + '\u0000' + a.selector;
      const right = b.scope + '\u0000' + b.selector;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    return { authoredKeyframes: [...new Set(authoredKeyframes)].sort(), keyframes, animationBindings };
  });
}

async function collectComputedPaint(page, includeChrome) {
  return page.evaluate(({ propertyGroups, includeChrome: shouldIncludeChrome }) => {
    const read = (element, properties, pseudo) => {
      if (!element) return null;
      const style = getComputedStyle(element, pseudo || null);
      return Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)]));
    };
    const root = document.querySelector('[data-help-key="bot_avatar"]');
    const svg = root && root.querySelector('svg[viewBox="0 0 100 100"]');
    const paint = {
      avatar: read(root, propertyGroups.avatar),
      body: read(root && root.querySelector('[data-allobot-depth]'), propertyGroups.body),
      eyeCore: read(svg && svg.querySelector('[data-allobot-eye-core]'), propertyGroups.svg),
      mouth: read(svg && svg.querySelector('[data-allobot-mouth]'), propertyGroups.svg),
      accessory: read(svg && svg.querySelector('[data-allobot-accessories="true"]'), propertyGroups.svg),
    };
    if (shouldIncludeChrome) {
      const orbit = root && root.querySelector('.allobot-control-orbit');
      paint.orbit = read(orbit, propertyGroups.chrome);
      paint.orbitMarker = read(orbit, propertyGroups.chrome, '::before');
      paint.controls = Object.fromEntries(Array.from(root.querySelectorAll('.allobot-satellite-control'))
        .map((control) => [control.getAttribute('data-allobot-satellite-kind'), read(control, propertyGroups.chrome)])
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return paint;
  }, { propertyGroups: PAINT_PROPERTIES, includeChrome });
}

async function collectVisiblePaintTree(page) {
  return page.locator('[data-help-key="bot_avatar"]').evaluate((root, properties) => {
    const stage = document.getElementById('stage');
    const stageRect = stage.getBoundingClientRect();
    const records = [];
    const round = (value) => Math.round(value * 1000) / 1000;
    const read = (style) => Object.fromEntries(properties.map((property) => [
      property,
      style.getPropertyValue(property),
    ]));
    const recordPseudo = (element, path, pseudo, ancestorOpacity) => {
      const style = getComputedStyle(element, pseudo);
      const content = style.getPropertyValue('content');
      const ownOpacity = Number.parseFloat(style.opacity);
      const effectiveOpacity = ancestorOpacity * (Number.isFinite(ownOpacity) ? ownOpacity : 1);
      if (!content || content === 'none' || style.display === 'none'
        || style.visibility === 'hidden' || effectiveOpacity <= 0) return;
      records.push({ path: path + pseudo, tag: pseudo, content, styles: read(style) });
    };
    const visit = (element, path, ancestorLayoutVisible, ancestorOpacity) => {
      const style = getComputedStyle(element);
      const layoutVisible = ancestorLayoutVisible && style.display !== 'none';
      if (!layoutVisible) return;
      const ownOpacity = Number.parseFloat(style.opacity);
      const effectiveOpacity = ancestorOpacity * (Number.isFinite(ownOpacity) ? ownOpacity : 1);
      const painted = style.visibility !== 'hidden' && effectiveOpacity > 0;
      if (painted) {
        const rect = element.getBoundingClientRect();
        records.push({
          path,
          tag: element.tagName.toLowerCase(),
          rect: {
            left: round(rect.left - stageRect.left),
            top: round(rect.top - stageRect.top),
            width: round(rect.width),
            height: round(rect.height),
          },
          styles: read(style),
        });
        recordPseudo(element, path, '::before', effectiveOpacity);
        recordPseudo(element, path, '::after', effectiveOpacity);
      }
      Array.from(element.children).forEach((child, index) => {
        visit(child, path + '.' + index, layoutVisible, effectiveOpacity);
      });
    };
    visit(root, '0', true, 1);
    return records;
  }, VISIBLE_PAINT_PROPERTIES);
}

async function render(browser, scenario) {
  const { context, page, unexpectedRequests } = await createPage(browser, scenario);
  try {
    const measurements = await page.locator(AVATAR_SVG_SELECTOR).evaluate((svg) => {
      const rect = svg.getBoundingClientRect();
      const root = svg.closest('[data-help-key="bot_avatar"]');
      const rootRect = root.getBoundingClientRect();
      const stage = document.getElementById('stage');
      const stageRect = stage.getBoundingClientRect();
      const shell = svg.querySelector('[data-allobot-shell]');
      const face = svg.querySelector('[data-allobot-face-state]');
      const mouth = svg.querySelector('[data-allobot-mouth]');
      const cue = svg.querySelector('[data-allobot-voice-cue]');
      const details = svg.querySelector('[data-allobot-eye-details]');
      const accessory = svg.querySelector('[data-allobot-accessories="true"]');
      const accessoryRect = accessory && accessory.getBoundingClientRect();
      const avatarAction = root && root.querySelector('[data-allobot-avatar-action]');
      const avatarActionRect = avatarAction && avatarAction.getBoundingClientRect();
      const avatarActionStyle = avatarAction && getComputedStyle(avatarAction);
      const round = (value) => Math.round(value * 1000) / 1000;
      return {
        width: rect.width,
        height: rect.height,
        bounds: {
          left: round(rect.left - stageRect.left),
          top: round(rect.top - stageRect.top),
          rightGap: round(stageRect.right - rect.right),
          bottomGap: round(stageRect.bottom - rect.bottom),
        },
        rootBounds: {
          left: round(rootRect.left - stageRect.left),
          top: round(rootRect.top - stageRect.top),
          rightGap: round(stageRect.right - rootRect.right),
          bottomGap: round(stageRect.bottom - rootRect.bottom),
        },
        theme: shell && shell.getAttribute('data-allobot-shell'),
        motionDisabled: !!(root && root.classList.contains('allobot-motion-disabled')),
        chromeControls: root ? root.querySelectorAll('.allobot-satellite-control').length : 0,
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
        accessorySilhouette: accessory?.getAttribute('data-accessory-silhouette') || null,
        accessoryBounds: accessoryRect ? {
          left: round(accessoryRect.left - rect.left),
          top: round(accessoryRect.top - rect.top),
          rightGap: round(rect.right - accessoryRect.right),
          bottomGap: round(rect.bottom - accessoryRect.bottom),
          width: round(accessoryRect.width),
          height: round(accessoryRect.height),
        } : null,
        avatarAction: avatarActionRect && avatarActionStyle ? {
          kind: avatarAction.getAttribute('data-allobot-avatar-action'),
          bounds: {
            left: round(avatarActionRect.left - rootRect.left),
            top: round(avatarActionRect.top - rootRect.top),
            width: round(avatarActionRect.width),
            height: round(avatarActionRect.height),
          },
          appearance: avatarActionStyle.appearance,
          backgroundColor: avatarActionStyle.backgroundColor,
          borderWidths: [
            avatarActionStyle.borderTopWidth, avatarActionStyle.borderRightWidth,
            avatarActionStyle.borderBottomWidth, avatarActionStyle.borderLeftWidth,
          ],
          padding: [
            avatarActionStyle.paddingTop, avatarActionStyle.paddingRight,
            avatarActionStyle.paddingBottom, avatarActionStyle.paddingLeft,
          ],
        } : null,
      };
    });
    const stylesheetSemantics = await collectStylesheetSemantics(page);
    validateStylesheetSemantics(stylesheetSemantics);
    validateRuntimeAnimationContract(stylesheetSemantics);
    const computedPaint = await collectComputedPaint(page, !!scenario.chrome);
    const visiblePaintTree = await collectVisiblePaintTree(page);
    const paintTreeSha256 = digest(Buffer.from(JSON.stringify(visiblePaintTree), 'utf8'));
    const paintNodeCount = visiblePaintTree.length;
    const expected = scenario.size.width;
    if (Math.abs(measurements.width - expected) > 0.25 || Math.abs(measurements.height - expected) > 0.25) {
      throw new Error(scenario.id + ' rendered ' + measurements.width + 'x' + measurements.height
        + '; expected ' + expected + 'x' + expected);
    }
    if (measurements.theme !== scenario.props.theme) {
      throw new Error(scenario.id + ' rendered theme ' + measurements.theme);
    }
    if (!measurements.motionDisabled) throw new Error(scenario.id + ' did not disable motion');
    if (scenario.chrome && measurements.chromeControls !== 4) {
      throw new Error(scenario.id + ' rendered ' + measurements.chromeControls + ' chrome controls; expected 4');
    }
    const expectedCornerInset = 14 + (8 * scenario.size.scale);
    if (scenario.anchor === 'top-right'
      && (Math.abs(measurements.rootBounds.top - expectedCornerInset) > 0.25
        || Math.abs(measurements.rootBounds.rightGap - expectedCornerInset) > 0.25)) {
      throw new Error(scenario.id + ' missed its top-right visual anchor: ' + JSON.stringify(measurements.rootBounds));
    }
    if (scenario.anchor === 'bottom-left'
      && (Math.abs(measurements.rootBounds.left - expectedCornerInset) > 0.25
        || Math.abs(measurements.rootBounds.bottomGap - expectedCornerInset) > 0.25)) {
      throw new Error(scenario.id + ' missed its bottom-left visual anchor: ' + JSON.stringify(measurements.rootBounds));
    }
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
    if (scenario.setup === 'sleeping') {
      const action = measurements.avatarAction;
      const actionReset = action && action.kind === 'wake'
        && action.bounds.width >= expected - 0.25
        && action.bounds.height >= expected - 0.25
        && action.appearance === 'none'
        && action.backgroundColor === 'rgba(0, 0, 0, 0)'
        && action.borderWidths.every((value) => value === '0px')
        && action.padding.every((value) => value === '0px');
      if (!actionReset) {
        throw new Error(scenario.id + ' wake action lost its transparent full-avatar button reset: '
          + JSON.stringify(action));
      }
    }
    if (scenario.setup === 'talking' && (measurements.mouth !== 'talking' || measurements.voiceCue !== 'talking')) {
      throw new Error(scenario.id + ' did not render the talking mouth and outbound voice cue');
    }
    if (scenario.props.isListening && measurements.voiceCue !== 'listening') {
      throw new Error(scenario.id + ' did not render the inbound listening cue');
    }
    if (scenario.side) {
      const bounds = measurements.accessoryBounds;
      if (!bounds || bounds.left < -0.25 || bounds.top < -0.25
        || bounds.rightGap < -0.25 || bounds.bottomGap < -0.25
        || bounds.width < expected * 0.25 || bounds.height < expected * 0.6) {
        throw new Error(scenario.id + ' side accessory is clipped or unreadably small: ' + JSON.stringify(bounds));
      }
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
    const visualSignature = await page.locator(AVATAR_SVG_SELECTOR).evaluate((svg) => svg.outerHTML);
    const domSha256 = digest(Buffer.from(visualSignature, 'utf8'));
    const chromeSignature = scenario.chrome
      ? await page.locator('[data-help-key="bot_avatar"]').evaluate((root) => Array.from(root.querySelectorAll(
        '.allobot-control-orbit,.allobot-satellite-control',
      )).map((element) => element.outerHTML).join('\n'))
      : null;
    const chromeDomSha256 = chromeSignature == null ? null : digest(Buffer.from(chromeSignature, 'utf8'));
    const png = await page.locator('#stage').screenshot({ animations: 'disabled', type: 'png' });
    return {
      png,
      measurements,
      domSha256,
      chromeDomSha256,
      computedPaint,
      paintTreeSha256,
      paintNodeCount,
      stylesheetSemantics,
    };
  } finally {
    await context.close();
  }
}

async function check(browser, scenarios) {
  const results = [];
  for (const scenario of scenarios) {
    let first;
    let second;
    try {
      first = await render(browser, scenario);
      second = await render(browser, scenario);
    } catch (error) {
      throw new Error(scenario.id + ': ' + (error && error.message ? error.message : error), { cause: error });
    }
    const firstHash = digest(first.png);
    const secondHash = digest(second.png);
    if (firstHash !== secondHash) {
      throw new Error(scenario.id + ' is not deterministic (' + firstHash + ' != ' + secondHash + ')');
    }
    if (first.domSha256 !== second.domSha256) {
      throw new Error(scenario.id + ' has a non-deterministic DOM signature (' + first.domSha256 + ' != ' + second.domSha256 + ')');
    }
    if (first.chromeDomSha256 !== second.chromeDomSha256) {
      throw new Error(scenario.id + ' has a non-deterministic chrome DOM signature');
    }
    if (JSON.stringify(first.computedPaint) !== JSON.stringify(second.computedPaint)) {
      throw new Error(scenario.id + ' has non-deterministic computed paint');
    }
    if (first.paintTreeSha256 !== second.paintTreeSha256 || first.paintNodeCount !== second.paintNodeCount) {
      throw new Error(scenario.id + ' has a non-deterministic visible paint/layout tree');
    }
    if (JSON.stringify(first.stylesheetSemantics) !== JSON.stringify(second.stylesheetSemantics)) {
      throw new Error(scenario.id + ' has non-deterministic parsed stylesheet semantics');
    }
    results.push({
      id: scenario.id,
      sha256: firstHash,
      domSha256: first.domSha256,
      chromeDomSha256: first.chromeDomSha256,
      measurements: first.measurements,
      computedPaint: first.computedPaint,
      paintTreeSha256: first.paintTreeSha256,
      paintNodeCount: first.paintNodeCount,
      stylesheetSemantics: first.stylesheetSemantics,
    });
  }
  return results;
}

function baselinePayload(results) {
  const stylesheets = stylesheetVariantsPayload(results);
  return {
    formatVersion: BASELINE_FORMAT_VERSION,
    scenarioCount: results.length,
    stylesheets,
    scenarios: Object.fromEntries(results.map((result) => [result.id, {
      domSha256: result.domSha256,
      chromeDomSha256: result.chromeDomSha256,
      stylesheetSha256: stylesheetContractDigest(stylesheetBaselinePayload(result.stylesheetSemantics)),
      paintTreeSha256: result.paintTreeSha256,
      paintNodeCount: result.paintNodeCount,
      measurements: result.measurements,
      computedPaint: result.computedPaint,
    }])),
  };
}

async function assertBaseline(results, partial = false) {
  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(BASELINE, 'utf8'));
  } catch (error) {
    throw new Error('AlloBot visual/style baseline is missing or invalid. Review captures, then run: npm run visual:allobot:update-baseline', { cause: error });
  }
  const actual = baselinePayload(results);
  const mismatches = [];
  if (baseline.formatVersion !== actual.formatVersion) mismatches.push('formatVersion');
  if (!partial && baseline.scenarioCount !== actual.scenarioCount) mismatches.push('scenarioCount');
  if (!partial && JSON.stringify(baseline.stylesheets) !== JSON.stringify(actual.stylesheets)) mismatches.push('stylesheets');
  const expectedIds = Object.keys(actual.scenarios);
  const baselineIds = baseline.scenarios && typeof baseline.scenarios === 'object' ? Object.keys(baseline.scenarios) : [];
  const idsToCompare = partial ? expectedIds : [...new Set([...expectedIds, ...baselineIds])];
  for (const id of idsToCompare) {
    if (JSON.stringify(baseline.scenarios && baseline.scenarios[id]) !== JSON.stringify(actual.scenarios[id])) mismatches.push(id);
  }
  if (mismatches.length) {
    throw new Error('AlloBot visual and stylesheet baseline changed for: ' + mismatches.join(', ')
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
  const capturedStylesheets = [];
  try {
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      let result;
      try {
        result = await render(browser, scenario);
      } catch (error) {
        throw new Error(scenario.id + ': ' + (error && error.message ? error.message : error), { cause: error });
      }
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
        chromeDomSha256: result.chromeDomSha256,
        stylesheetSha256: stylesheetContractDigest(stylesheetBaselinePayload(result.stylesheetSemantics)),
        paintTreeSha256: result.paintTreeSha256,
        paintNodeCount: result.paintNodeCount,
        measurements: result.measurements,
        computedPaint: result.computedPaint,
      });
      capturedStylesheets.push({ id: scenario.id, stylesheetSemantics: result.stylesheetSemantics });
    }
    const report = {
      screenshotCount: entries.length,
      expectedScreenshotCount: scenarios.length,
      stylesheets: stylesheetVariantsPayload(capturedStylesheets),
      entries,
    };
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
    const cards = entries.map((entry) => '<article><h2>' + entry.label + ' / ' + entry.size
      + '</h2><img src="' + entry.file + '" alt="' + entry.label + ' at ' + entry.size
      + '"><code>' + entry.sha256.slice(0, 16) + '</code></article>').join('');
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AlloBot visual QA</title>'
      + '<style>body{margin:0;padding:24px;background:#e2e8f0;color:#0f172a;font-family:system-ui,sans-serif}'
      + 'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}'
      + 'article{overflow:hidden;border:1px solid #94a3b8;border-radius:12px;background:white}'
      + 'h2,code{display:block;margin:0;padding:9px 12px;font-size:.85rem}img{display:block;width:100%;height:260px;object-fit:contain;background:#cbd5e1}</style>'
      + '</head><body><h1>AlloBot visual QA</h1><p>Review at native size before updating the visual/style baseline.</p><main>'
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
  if (wantsUpdateBaseline && scenarioArg) {
    throw new Error('Refusing to replace the full AlloBot baseline from a filtered --scenario run.');
  }
  if (wantsCapture && scenarioArg && !outputArg) {
    throw new Error('Filtered AlloBot captures require a dedicated --output path so the full review sheet is preserved.');
  }
  validateRuntimeAnimationProducers(await fs.readFile(MODULE, 'utf8'));
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
  const scenarios = selectScenarios(matrix(), scenarioArg ? scenarioArg.slice('--scenario='.length) : undefined);
  try {
    if (wantsCheck || wantsUpdateBaseline) {
      const results = await check(browser, scenarios);
      if (wantsUpdateBaseline) {
        await updateBaseline(results);
        console.log('[AlloBot visual QA] Updated reviewed visual/style baseline for ' + results.length + ' scenarios.');
      } else {
        await assertBaseline(results, !!scenarioArg);
        console.log('[AlloBot visual QA] ' + results.length + ' scenarios match the reviewed visual/style baseline, including computed paint, and rendered twice with stable pixels.');
      }
    }
    if (wantsCapture) {
      const entries = await capture(browser, scenarios);
      console.log('[AlloBot visual QA] Captured ' + entries.length + ' scenarios in ' + OUTPUT);
      console.log('[AlloBot visual QA] Review index.html before updating the visual/style baseline.');
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

module.exports = {
  SIZES,
  STATES,
  ROOT,
  OUTPUT,
  DEFAULT_OUTPUT,
  BASELINE,
  BASELINE_FORMAT_VERSION,
  PAINT_PROPERTIES,
  VISIBLE_PAINT_PROPERTIES,
  RUNTIME_IDLE_ANIMATIONS,
  extractRuntimeIdleAnimationNames,
  matrix,
  selectScenarios,
  resolveOutput,
  baselinePayload,
  validateStylesheetSemantics,
  validateRuntimeAnimationContract,
  validateRuntimeAnimationProducers,
  stylesheetBaselinePayload,
};
