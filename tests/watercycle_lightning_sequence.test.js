import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const testPath = 'tests/watercycle_lightning_sequence.test.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString();
const testBytes = readFileSync(testPath);
const keys = ['auto', 'charge-separation', 'stepped-leader', 'upward-streamer', 'return-stroke', 'pressure-wave'];
const labels = ['Automatic sequence', 'Charge separation', 'Stepped leader', 'Upward streamer', 'Return stroke', 'Thunder wave'];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function walk(tree, visit) {
  const pending = [tree];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    visit(node);
    Object.values(node).forEach(value => {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    });
  }
}
function named(source, name, initializer = false) {
  const key = name + ':' + initializer;
  if (source.named.has(key)) return source.named.get(key);
  if (!source.declarations) {
    const declarations = { functions: [], names: new Map(), renderer: null };
    walk(source.ast, node => {
      if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) declarations.functions.push(node);
      if (node.type === 'FunctionDeclaration' && node.id?.name === 'renderLightningStudy') declarations.renderer = node;
      if ((node.type === 'VariableDeclarator' || node.type === 'FunctionDeclaration') && node.id?.name) {
        const declarationKey = node.id.name + ':' + (node.type === 'VariableDeclarator');
        if (!declarations.names.has(declarationKey)) declarations.names.set(declarationKey, []);
        declarations.names.get(declarationKey).push(node);
      }
    });
    source.declarations = declarations;
  }
  const { functions, renderer, names } = source.declarations;
  let found = names.get(key) || [];
  // Resolve repeated local names in the guide renderer's lexical scope.
  // The chamber has its own independent lightning state declarations.
  if (found.length > 1 && renderer) {
    const owner = node => functions.filter(scope => scope.start < node.start && scope.end > node.end)
      .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
    const rendererScope = owner(renderer);
    found = found.filter(candidate => owner(candidate) === rendererScope);
  }
  if (found.length !== 1) throw new Error(`Expected one actual ${name} in ${source.path}; found ${found.length}`);
  const selected = initializer ? found[0].init : found[0];
  const code = source.text.slice(selected.start, selected.end);
  source.named.set(key, code);
  return code;
}
function loadKernel(source) {
  const element = () => ({ style: {}, appendChild() {}, setAttribute() {} });
  const window = {};
  runInNewContext(source.text, { window,
    document: { head: element(), body: element(), createElement: element, getElementById: () => null },
    console, Math, Date, Object, Array, Number, String, Boolean, JSON, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
  }, { filename: source.path, timeout: 10000 });
  if (!window.WaterCyclePrecipitationKernel) throw new Error('Missing actual precipitation kernel');
  return window.WaterCyclePrecipitationKernel;
}
// Parse each shipped file and initialize its scientific kernel once.
const shipped = paths.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  const source = { path, bytes, text, ast: parse(text, { ecmaVersion: 'latest' }), named: new Map() };
  return { source, kernel: loadKernel(source) };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_LIGHTNING_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_LIGHTNING_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: shipped.map(({ source }) => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: testPath, sha256: sha(testBytes), bytes: testBytes.length },
  }, null, 2) + '\n');
});
function nodes(tree, predicate) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object' || !node.tag) return;
    if (predicate(node)) found.push(node);
    node.children.forEach(visit);
  }
  visit(tree);
  return found;
}
function one(tree, predicate) {
  const found = nodes(tree, predicate);
  if (found.length !== 1) throw new Error('Expected one actual rendered node; found ' + found.length);
  return found[0];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree && typeof tree === 'object' ? tree.children.map(text).join(' ').replace(/\s+/g, ' ').trim() : '';
}
const h = (tag, props, ...children) => ({ tag, props: props || {},
  children: children.flat(Infinity).filter(child => child !== null && child !== undefined && typeof child !== 'boolean') });
const choices = tree => nodes(tree, node => Object.hasOwn(node.props, 'data-lightning-study-choice'));
const choice = (tree, key) => one(tree, node => node.props['data-lightning-study-choice'] === key);

// This adapter executes shipped declarations, the renderer, and its callbacks.
// It does not reimplement the selected phase or scientific eligibility rules.
function harness(runtime, patch = {}, options = {}) {
  const { source, kernel } = runtime;
  let state = freeze({ ...kernel.presets.summerStorm, stormTime: 52, stormAutoPlay: true,
    showStormAnatomy: true, lightningStudyStep: 'auto', stormDistanceKm: 6,
    thunderEstimateKm: 4.5, thunderEstimateChecked: true, paused: false, soundEnabled: true,
    hypothesis: 'Retain my prediction.', notes: { evidence: ['Keep my observation.'] },
    experiment: { saved: [{ explanation: 'Keep my reasoning.' }] }, ...patch });
  const patches = [], updates = [], announcements = [], focused = [];
  const steps = freeze(plain(kernel.lightningStudySteps));
  const lookup = Object.fromEntries(steps.map(step => [step.key, step]));
  const style = runInNewContext('(' + named(source, 'WC_LIGHTNING_STUDY_STYLE', true) + ')');
  let lastContext;
  function render() {
    const precipModel = freeze(kernel.compute(state));
    const precipConfig = precipModel.config;
    const beforeConfig = plain(precipConfig), beforeModel = plain(precipModel);
    const context = {
      h, precipConfig, precipModel, WC_LIGHTNING_STUDY_STYLE: style,
      WC_LIGHTNING_STUDY_STEPS: steps, WC_LIGHTNING_STUDY_LOOKUP: lookup,
      isDark: options.theme === 'dark', isContrast: options.theme === 'contrast',
      precipMotionReduced: !!options.reducedMotion,
      iq: state, normalizeWcPrecipConfig: kernel.normalize,
      isWcLightningStudyStepAvailable: kernel.studyStepAvailable,
      upd(key, value) { updates.push({ key, value: plain(value) }); state = freeze(value); },
      announceToSR(message) { announcements.push(message); },
      focusLightningStudyTarget(destination) { focused.push(destination); },
      t: (_key, fallback) => fallback,
    };
    context.getWcLightningStudyStep = runInNewContext('(' + named(source, 'getWcLightningStudyStep') + ')', context);
    for (const name of ['activeLightningStudy', 'lightningStudyRequested', 'lightningStudyActive',
      'lightningStudyPhysicallyAvailable', 'lightningStudyAvailable', 'lightningStudyMode', 'lightningStudyCopy']) {
      context[name] = runInNewContext('(' + named(source, name, true) + ')', context);
    }
    const setIQ = runInNewContext('(' + named(source, 'setIQ') + ')', context);
    context.setIQ = patch => { patches.push(plain(patch)); setIQ(patch); };
    context.selectLightningStudyStep = runInNewContext('(' + named(source, 'selectLightningStudyStep') + ')', context);
    const result = runInNewContext('(' + named(source, 'renderLightningStudy') + ')', context)();
    expect(plain(precipConfig)).toEqual(beforeConfig);
    expect(plain(precipModel)).toEqual(beforeModel);
    lastContext = context;
    return result;
  }
  return { render, patches, updates, announcements, focused, state: () => state,
    select(key) { choice(render(), key).props.onClick(); },
    selectUnknown(key) { render(); lastContext.selectLightningStudyStep(key); },
  };
}

describe('Lightning sequence: shipped runtime contract', () => {
  it('parses both complete runtimes and keeps the desktop mirror identical', () => {
    expect(shipped[0].source.bytes.equals(shipped[1].source.bytes)).toBe(true);
    shipped.forEach(({ source }) => {
      expect(named(source, 'renderLightningStudy')).toContain('data-lightning-study-choice');
      expect(named(source, 'WC_LIGHTNING_STUDY_STYLE', true)).toBeTruthy();
    });
  });
});

for (const runtime of shipped) describe('Lightning sequence: ' + runtime.source.path, () => {
  it.each(keys)('keeps six native choices with exactly one selected for %s', selected => {
    const tree = harness(runtime, { lightningStudyStep: selected }).render();
    const controls = choices(tree);
    expect(controls.map(node => node.props['data-lightning-study-choice'])).toEqual(keys);
    expect(controls.every(node => node.tag === 'button' && node.props.type === 'button')).toBe(true);
    expect(controls.filter(node => node.props['aria-pressed'] === true).map(node => node.props['data-lightning-study-choice'])).toEqual([selected]);
    controls.forEach((node, index) => expect(node.props['aria-label'] || text(node)).toContain(labels[index]));
    controls.slice(1).forEach((node, index) => expect(text(node)).toContain(labels[index + 1]));
  });

  it.each(keys)('selects %s without changing weather, timeline, audio, or learner evidence', key => {
    const state = harness(runtime, { lightningStudyStep: key === 'auto' ? 'return-stroke' : 'auto' });
    const before = plain(state.state());
    state.select(key);
    expect(state.patches).toEqual([{ lightningStudyStep: key }]);
    expect(plain(state.state())).toEqual({ ...before, lightningStudyStep: key });
    expect(state.updates).toEqual([{ key: 'precipHunt', value: { ...before, lightningStudyStep: key } }]);
    expect(choice(state.render(), key).props['aria-pressed']).toBe(true);
  });

  it.each(['missing-phase', '', null, '__proto__'])('normalizes invalid phase %s through the actual callback', key => {
    const state = harness(runtime, { lightningStudyStep: 'return-stroke' });
    const before = plain(state.state());
    state.selectUnknown(key);
    expect(state.patches).toEqual([{ lightningStudyStep: 'auto' }]);
    expect(plain(state.state())).toEqual({ ...before, lightningStudyStep: 'auto' });
  });

  it('keeps automatic playback separate from the five ordered study phases', () => {
    const tree = harness(runtime).render();
    const ordered = one(tree, node => node.tag === 'ol');
    expect(choices(ordered).map(node => node.props['data-lightning-study-choice'])).toEqual(keys.slice(1));
    expect(choices(ordered).some(node => node.props['data-lightning-study-choice'] === 'auto')).toBe(false);
  });

  it.each([[7.999, false], [8, true], [35, true]])('uses the actual charge threshold for index %s', (index, available) => {
    expect(runtime.kernel.studyStepAvailable({ lightningEligible: false, stormAnatomy: { chargeSeparation: { index } } }, 'charge-separation')).toBe(available);
  });

  it.each(keys.slice(2))('requires flash eligibility for %s even when charge separation exists', key => {
    const model = { stormAnatomy: { chargeSeparation: { index: 80 } }, lightningEligible: false };
    expect(runtime.kernel.studyStepAvailable(model, key)).toBe(false);
    expect(runtime.kernel.studyStepAvailable({ ...model, lightningEligible: true }, key)).toBe(true);
  });

  it.each(['light', 'dark', 'contrast'])('retains phase names and selection in the %s theme', theme => {
    const tree = harness(runtime, { lightningStudyStep: 'upward-streamer' }, { theme }).render();
    expect(choices(tree)).toHaveLength(6);
    expect(choice(tree, 'upward-streamer').props['aria-pressed']).toBe(true);
    expect(text(tree)).toContain('Upward streamer');
  });

  it.each([
    ['charge-separation', ['charge', 'ground-charge'], []],
    ['stepped-leader', ['charge', 'ground-charge', 'leader'], ['down']],
    ['upward-streamer', ['charge', 'ground-charge', 'leader', 'streamer'], ['up']],
    ['return-stroke', ['charge', 'ground-charge', 'return-stroke'], ['up']],
    ['pressure-wave', ['charge', 'ground-charge', 'heated-channel', 'pressure-wave'], ['outward-left', 'outward-right']],
  ])('draws the scientifically distinct %s structure and directions', (phase, features, directions) => {
    const tree = harness(runtime, { lightningStudyStep: phase }).render();
    expect(tree.props['data-ls-state']).toBe('guided');
    const figure = one(tree, node => node.props['data-ls-sketch'] === phase);
    expect(nodes(figure, node => Object.hasOwn(node.props, 'data-ls-feature')).map(node => node.props['data-ls-feature'])).toEqual(features);
    expect(nodes(figure, node => Object.hasOwn(node.props, 'data-ls-direction')).map(node => node.props['data-ls-direction'])).toEqual(directions);
    expect(text(one(figure, node => node.tag === 'figcaption'))).toMatch(/Simplified.*not to scale/);
    const svg = one(figure, node => node.tag === 'svg');
    expect(svg.props).toMatchObject({ role: 'img', focusable: 'false' });
    const descriptions = svg.props['aria-labelledby'].split(' ').map(id => one(svg, node => node.props.id === id));
    expect(descriptions.map(node => node.tag)).toEqual(['title', 'desc']);
    expect(descriptions.every(node => text(node).length > 10)).toBe(true);
    const status = one(tree, node => Object.hasOwn(node.props, 'data-ls-status'));
    expect(status.props).toMatchObject({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    expect(text(status)).toContain('Static and silent');
    expect(text(tree)).toContain('Find it in the chamber');
    expect(text(tree)).toContain('Study snapshots are static and silent.');
  });

  it('explains upward return-stroke propagation without implying the held bolt moves', () => {
    const tree = harness(runtime, { lightningStudyStep: 'return-stroke' }).render();
    expect(text(tree)).toMatch(/propagates upward/);
    expect(text(tree)).toMatch(/complete bolt still/);
  });

  it.each(keys.slice(1))('explains unavailable %s without drawing an active pathway', phase => {
    const tree = harness(runtime, { ...runtime.kernel.presets.gentleRain, stormTime: 0, moisture: 0, cloudDepth: 1, updraft: 0, lightningStudyStep: phase }).render();
    expect(tree.props['data-ls-state']).toBe('unavailable');
    expect(choice(tree, phase).props['aria-pressed']).toBe(true);
    expect(choice(tree, phase).props['data-ls-available']).toBe('false');
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-ls-sketch'))).toHaveLength(0);
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-ls-feature'))).toHaveLength(0);
    expect(nodes(tree, node => node.props['data-ls-action'] === 'chamber')).toHaveLength(0);
    expect(text(tree)).toContain('Why this frame is unavailable');
    expect(text(tree)).toContain(runtime.kernel.lightningStudySteps.find(step => step.key === phase).explanation);
    const hintId = choice(tree, phase).props['aria-describedby'];
    expect(text(one(tree, node => node.props.id === hintId))).toContain('not produced by this setup');
  });

  it('allows partial-cloud charge inspection while keeping flash phases unavailable', () => {
    const patch = { ...runtime.kernel.presets.hailstorm, stormTime: 26, lightningStudyStep: 'charge-separation' };
    const model = runtime.kernel.compute(patch);
    expect(runtime.kernel.studyStepAvailable(model, 'charge-separation')).toBe(true);
    expect(model.lightningEligible).toBe(false);
    const tree = harness(runtime, patch).render();
    expect(tree.props['data-ls-state']).toBe('guided');
    expect(choice(tree, 'charge-separation').props['data-ls-available']).toBe('true');
    keys.slice(2).forEach(key => expect(choice(tree, key).props['data-ls-available']).toBe('false'));
    expect(one(tree, node => node.props['data-ls-sketch'] === 'charge-separation')).toBeTruthy();
    const unavailable = harness(runtime, { ...patch, lightningStudyStep: 'return-stroke' }).render();
    expect(unavailable.props['data-ls-state']).toBe('unavailable');
    expect(text(unavailable)).toMatch(/Charges are separating/);
  });

  it('keeps ground neutral in an available weak-charge model frame', () => {
    let patch;
    for (let stormTime = 0; stormTime <= 100; stormTime++) {
      const candidate = { ...runtime.kernel.presets.hailstorm, stormTime, lightningStudyStep: 'charge-separation' };
      const model = runtime.kernel.compute(candidate);
      if (model.stormAnatomy.chargeSeparation.index >= 8 && model.stormAnatomy.chargeSeparation.index < 35) { patch = candidate; break; }
    }
    expect(patch).toBeTruthy();
    const model = runtime.kernel.compute(patch);
    expect(model.stormAnatomy.chargeSeparation.groundPolarity).not.toBe('positive induced charge');
    const tree = harness(runtime, patch).render();
    expect(tree.props['data-ls-state']).toBe('guided');
    expect(nodes(tree, node => node.props['data-ls-feature'] === 'charge')).toHaveLength(1);
    expect(nodes(tree, node => node.props['data-ls-feature'] === 'ground-charge')).toHaveLength(0);
    expect(text(one(tree, node => node.tag === 'desc'))).toMatch(/ground remains neutral/);
  });

  it.each([
    [{}, {}, 'running', /automatic flash-to-thunder timing/],
    [{ paused: true }, {}, 'paused', /chamber is paused.*Resume/],
    [{}, { reducedMotion: true }, 'reduced-motion', /Reduced motion shows a static pathway/],
    [{ paused: true }, { reducedMotion: true }, 'reduced-motion', /Reduced motion shows a static pathway/],
    [{ moisture: 0, cloudDepth: 1, updraft: 0 }, {}, 'no-flash', /does not complete a lightning flash/],
  ])('describes automatic mode %s %s as %s', (patch, options, expectedState, expectedCopy) => {
    const tree = harness(runtime, { ...patch, lightningStudyStep: 'auto' }, options).render();
    expect(tree.props['data-ls-state']).toBe(expectedState);
    expect(one(tree, node => Object.hasOwn(node.props, 'data-ls-status')).props['data-ls-status']).toBe(expectedState);
    expect(text(tree)).toMatch(expectedCopy);
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-ls-sketch'))).toHaveLength(0);
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-ls-feature'))).toHaveLength(0);
  });

  it('hands the selected phase to the chamber without changing any saved state', () => {
    const state = harness(runtime, { lightningStudyStep: 'pressure-wave' });
    const before = plain(state.state());
    const tree = state.render();
    one(tree, node => node.props['data-ls-action'] === 'chamber').props.onClick();
    expect(state.focused).toEqual(['chamber']);
    expect(state.patches).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
    expect(plain(state.state())).toEqual(before);
  });

  it('labels the 3D handoff with its Whole storm destination', () => {
    const tree = harness(runtime, { viewMode: '3d', cameraFocus: 'immersive', lightningStudyStep: 'pressure-wave' }).render();
    expect(text(one(tree, node => node.props['data-ls-action'] === 'chamber'))).toBe('Show phase in Whole storm');
  });

  it.each(['immersive', 'cloud', 'surface', 'storm'])('recenters the actual 3D camera from %s while preserving weather and learner evidence', cameraFocus => {
    const before = freeze({ ...runtime.kernel.presets.summerStorm, viewMode: '3d', cameraFocus,
      lightningStudyStep: 'pressure-wave', stormTime: 52, stormAutoPlay: false,
      paused: true, soundEnabled: false, notes: { evidence: ['Keep this observation.'] },
      hypothesis: 'Retain my prediction.' });
    let saved = before;
    const calls = [], patches = [], announcements = [];
    const canvas = {
      hasAttribute: () => true,
      focus(options) { calls.push(['focus', plain(options)]); },
      scrollIntoView(options) { calls.push(['scrollIntoView', plain(options)]); },
      _wcPrecip3dFocusCamera(value) { calls.push(['camera', value]); },
    };
    const context = {
      document: { querySelector: () => canvas }, precipConfig: freeze(runtime.kernel.normalize(before)),
      precip3dCanvasNode: canvas, iq: before, normalizeWcPrecipConfig: runtime.kernel.normalize,
      upd(key, value) { expect(key).toBe('precipHunt'); saved = freeze(value); },
      announceToSR(message) { announcements.push(message); },
    };
    const setIQ = runInNewContext('(' + named(runtime.source, 'setIQ') + ')', context);
    context.setIQ = patch => { patches.push(plain(patch)); setIQ(patch); };
    context.setPrecipCameraFocus = runInNewContext('(' + named(runtime.source, 'setPrecipCameraFocus') + ')', context);
    const focus = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')', context);
    expect(focus('chamber')).toBe(true);
    expect(patches).toEqual([{ cameraFocus: 'storm' }]);
    expect(plain(saved)).toEqual({ ...plain(before), cameraFocus: 'storm' });
    expect(calls).toEqual([
      ['camera', 'storm'], ['focus', { preventScroll: true }],
      ['scrollIntoView', { block: 'center', behavior: 'auto' }],
    ]);
    expect(announcements).toHaveLength(1);
    expect(announcements[0]).toContain('Whole storm viewpoint selected.');
  });

  it('keeps the 3D camera unchanged when the chamber target is missing', () => {
    const calls = [];
    const focus = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')', {
      document: { querySelector: () => null },
      precipConfig: freeze({ viewMode: '3d', cameraFocus: 'immersive' }),
      setPrecipCameraFocus(value) { calls.push(value); },
    });
    expect(focus('chamber')).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('finds the current chamber canvas on each handoff and preserves its existing tab order', () => {
    const calls = [], attributes = new Map([['tabindex', '0']]);
    const element = {
      hasAttribute(name) { return attributes.has(name); },
      setAttribute(name, value) { attributes.set(name, value); calls.push(['setAttribute', name, value]); },
      focus(options) { calls.push(['focus', plain(options)]); },
      scrollIntoView(options) { calls.push(['scrollIntoView', plain(options)]); },
    };
    let current = element;
    const document = {
      querySelector(selector) { calls.push(['querySelector', selector]); return current; },
      getElementById() { throw new Error('Chamber handoff must find its current canvas'); },
    };
    const focus = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')', {
      document, precipConfig: freeze({ viewMode: '2d', cameraFocus: 'immersive' }),
      setPrecipCameraFocus() { throw new Error('2D handoff must preserve the camera'); },
    });
    expect(focus('chamber')).toBe(true);
    expect(attributes.get('tabindex')).toBe('0');
    expect(calls).toEqual([
      ['querySelector', '.wc-precip-chamber canvas'], ['focus', { preventScroll: true }],
      ['scrollIntoView', { block: 'center', behavior: 'auto' }],
    ]);
    current = null;
    expect(focus('chamber')).toBe(false);
    expect(calls.at(-1)).toEqual(['querySelector', '.wc-precip-chamber canvas']);
  });

  it('returns focus to the guide and makes a non-focusable target programmatically focusable', () => {
    const calls = [], attributes = new Map();
    const document = {
      getElementById(id) { calls.push(['getElementById', id]); return {
        hasAttribute(name) { return attributes.has(name); },
        setAttribute(name, value) { attributes.set(name, value); calls.push(['setAttribute', name, value]); },
        focus(options) { calls.push(['focus', plain(options)]); },
        scrollIntoView(options) { calls.push(['scrollIntoView', plain(options)]); },
      }; },
      querySelector() { throw new Error('Guide handoff must find its heading'); },
    };
    const focus = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')', {
      document, precipConfig: freeze({ viewMode: '3d', cameraFocus: 'immersive' }),
      setPrecipCameraFocus() { throw new Error('Guide return must preserve the camera'); },
    });
    expect(focus('guide')).toBe(true);
    expect(attributes.get('tabindex')).toBe('-1');
    expect(calls).toEqual([
      ['getElementById', 'wcLightningStudyTitle'], ['setAttribute', 'tabindex', '-1'],
      ['focus', { preventScroll: true }], ['scrollIntoView', { block: 'center', behavior: 'auto' }],
    ]);
  });

  it('safely declines focus when no guide or document is available', () => {
    const missingGuide = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')', {
      document: { getElementById: () => null },
    });
    expect(missingGuide('guide')).toBe(false);
    const noDocument = runInNewContext('(' + named(runtime.source, 'focusLightningStudyTarget') + ')');
    expect(noDocument('chamber')).toBe(false);
  });
});
