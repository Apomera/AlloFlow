import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const testPath = 'tests/watercycle_storm_navigator.test.js';
const loadedAt = new Date().toISOString();
const testBytes = readFileSync(testPath);
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const stages = [
  { key: 'developing', label: 'Developing', time: 16 },
  { key: 'mature', label: 'Mature', time: 52 },
  { key: 'weakening', label: 'Weakening', time: 86 },
];
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function named(source, name, initializer = false) {
  if (!source.declarations) {
    const declarations = new Map(), pending = [source.ast];
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== 'object') continue;
      if ((node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id?.name) {
        const key = node.id.name + ':' + (node.type === 'VariableDeclarator');
        if (!declarations.has(key)) declarations.set(key, []);
        declarations.get(key).push(node);
      }
      Object.values(node).forEach(value => {
        if (Array.isArray(value)) pending.push(...value);
        else if (value && typeof value === 'object') pending.push(value);
      });
    }
    source.declarations = declarations;
  }
  const found = source.declarations.get(name + ':' + initializer) || [];
  if (found.length !== 1) throw new Error(`Expected one actual ${name} in ${source.path}; found ${found.length}`);
  const node = initializer ? found[0].init : found[0];
  return source.text.slice(node.start, node.end);
}
function loadKernel(source) {
  const element = () => ({ style: {}, appendChild() {}, setAttribute() {} });
  const window = {};
  runInNewContext(source.text, { window,
    document: { head: element(), body: element(), createElement: element, getElementById: () => null },
    console, Math, Date, Object, Array, Number, String, Boolean, JSON, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
  }, { filename: source.path, timeout: 10000 });
  if (!window.WaterCyclePrecipitationKernel) throw new Error('Missing actual scientific kernel');
  return window.WaterCyclePrecipitationKernel;
}
const shipped = paths.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  const source = { path, bytes, text, ast: parse(text, { ecmaVersion: 'latest' }) };
  const kernel = loadKernel(source);
  const moments = runInNewContext('(' + named(source, 'WCStormMoments', true) + ')', {
    wcPrecipSetupSnapshot: kernel.setupSnapshot, computeWcPrecipitationModel: kernel.compute,
  });
  return { source, kernel, moments };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_NAVIGATOR_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_NAVIGATOR_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: shipped.map(({ source }) => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: testPath, sha256: sha(testBytes), bytes: testBytes.length },
  }, null, 2) + '\n');
});
const h = (tag, props, ...children) => ({ tag, props: props || {},
  children: children.flat(Infinity).filter(child => child !== null && child !== undefined && typeof child !== 'boolean') });
function nodes(tree, predicate) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object' || !node.tag) return;
    if (predicate(node)) found.push(node);
    node.children.forEach(visit);
  }
  visit(tree); return found;
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
const button = (tree, label) => one(tree, node => node.tag === 'button' && text(node).replace(/^[←→]\s*|\s*[←→]$/g, '') === label);
const stageChoices = tree => nodes(tree, node => node.tag === 'button' && /^Show (Developing|Mature|Weakening) stage at model position /.test(node.props['aria-label'] || ''));
const stageChoice = (tree, stage) => one(tree, node => node.tag === 'button' && node.props['aria-label'] === `Show ${stage.label} stage at model position ${stage.time}`);

// Execute the shipped renderer, scientific kernel, state adapter and callbacks.
// The h adapter only records native element structure for semantic assertions.
function harness(runtime, patch = {}, options = {}) {
  const { source, kernel, moments } = runtime;
  let state = freeze({ ...kernel.presets.summerStorm, stormTime: 52, stormAutoPlay: true,
    viewMode: '3d', cameraFocus: 'immersive', lightningStudyStep: 'pressure-wave',
    paused: true, soundEnabled: false, thunderEstimateKm: 4.5, thunderEstimateChecked: true,
    notes: { evidence: ['Retain the observation.'] }, hypothesis: 'Retain the prediction.',
    experiment: { saved: [{ explanation: 'Retain the reasoning.' }] }, ...patch });
  const patches = [], updates = [], announcements = [];
  const stormStageStops = freeze(runInNewContext('(' + named(source, 'stormStageStops', true) + ')'));
  const wcPrecipClamp = runInNewContext('(' + named(source, 'wcPrecipClamp') + ')');
  const style = runInNewContext('(' + named(source, 'WC_STORM_NAVIGATOR_STYLE', true) + ')');
  function render() {
    const precipModel = freeze(kernel.compute(state)), precipConfig = precipModel.config;
    const beforeModel = plain(precipModel), beforeConfig = plain(precipConfig);
    const context = {
      h, precipModel, precipConfig, stormStageStops, wcPrecipClamp, WCStormMoments: moments,
      WC_STORM_NAVIGATOR_STYLE: style,
      precipMotionReduced: !!options.reducedMotion,
      isDark: options.theme === 'dark', isContrast: options.theme === 'contrast',
      iq: state, normalizeWcPrecipConfig: kernel.normalize,
      upd(key, value) { updates.push({ key, value: plain(value) }); state = freeze(value); },
      announceToSR(message) { announcements.push(message); },
      t: (_key, fallback) => fallback, __alloT: (_key, fallback) => fallback,
    };
    const setIQ = runInNewContext('(' + named(source, 'setIQ') + ')', context);
    context.setIQ = patch => { patches.push(plain(patch)); setIQ(patch); };
    context.setStormLifecycleTime = runInNewContext('(' + named(source, 'setStormLifecycleTime') + ')', context);
    const result = runInNewContext('(' + named(source, 'renderStormLifecycleNavigator') + ')', context)();
    expect(plain(precipModel)).toEqual(beforeModel);
    expect(plain(precipConfig)).toEqual(beforeConfig);
    return result;
  }
  return { render, patches, updates, announcements, state: () => state,
    clickStage(stage) { stageChoice(render(), stage).props.onClick(); },
    click(label) { button(render(), label).props.onClick(); },
  };
}

describe('Storm navigator: shipped runtime contract', () => {
  it('parses both full runtimes and keeps the source and desktop mirror identical', () => {
    expect(shipped[0].source.bytes.equals(shipped[1].source.bytes)).toBe(true);
    shipped.forEach(({ source }) => expect(named(source, 'renderStormLifecycleNavigator')).toBeTruthy());
  });
});

for (const runtime of shipped) describe('Storm navigator: ' + runtime.source.path, () => {
  it.each([[0, 'developing'], [31, 'developing'], [32, 'mature'], [72, 'mature'], [73, 'weakening'], [100, 'weakening']])(
    'selects the actual %s model boundary as %s', (stormTime, stageKey) => {
      const tree = harness(runtime, { stormTime }).render();
      const selected = stageChoices(tree).filter(node => node.props['aria-pressed'] === true);
      expect(selected).toHaveLength(1);
      expect(selected[0].props['aria-label']).toContain(stages.find(stage => stage.key === stageKey).label);
      expect(text(selected[0])).toContain('Current stage');
      expect(one(tree, node => node.props.id === 'wcPrecipStormTime').props.value).toBe(stormTime);
    });

  it('offers three ordered native stage choices with decorative illustrations and accessible names', () => {
    const tree = harness(runtime).render(), choices = stageChoices(tree);
    expect(choices).toHaveLength(3);
    expect(choices.map(node => node.props['aria-label'])).toEqual(stages.map(stage => `Show ${stage.label} stage at model position ${stage.time}`));
    choices.forEach((node, index) => {
      expect(node.props.type).toBe('button');
      expect(text(node)).toContain(stages[index].label);
      expect(text(one(node, child => child.props.id === node.props['aria-describedby']))).toBeTruthy();
      const svg = one(node, child => child.tag === 'svg');
      expect(svg.props['aria-hidden']).toBe('true');
      expect(svg.props.focusable).toBe('false');
    });
  });

  it.each(stages)('selects stage %s through the real time callback and preserves all other state', stage => {
    const state = harness(runtime), before = plain(state.state());
    state.clickStage(stage);
    expect(state.patches).toEqual([{ stormTime: stage.time, stormAutoPlay: false }]);
    expect(plain(state.state())).toEqual({ ...before, stormTime: stage.time, stormAutoPlay: false });
    expect(state.updates).toEqual([{ key: 'precipHunt', value: { ...before, stormTime: stage.time, stormAutoPlay: false } }]);
    expect(stageChoice(state.render(), stage).props['aria-pressed']).toBe(true);
  });

  it('keeps a labeled integer slider linked to the explanation of model position', () => {
    const tree = harness(runtime, { stormTime: 31 }).render();
    const slider = one(tree, node => node.props.id === 'wcPrecipStormTime');
    expect(slider.props).toMatchObject({ type: 'range', min: 0, max: 100, step: 1, value: 31, 'aria-describedby': 'wcStormPositionHelp' });
    expect(slider.props['aria-valuetext']).toContain('Developing');
    expect(slider.props['aria-valuetext']).toContain('31');
    expect(one(tree, node => node.tag === 'label' && node.props.htmlFor === slider.props.id)).toBeTruthy();
    const help = one(tree, node => node.props.id === 'wcStormPositionHelp');
    expect(text(help)).toMatch(/0.*100/);
    expect(text(help)).toMatch(/model|illustrative/i);
  });

  it('scrubs to the exact requested position and pauses lifecycle playback without changing saved work', () => {
    const state = harness(runtime), before = plain(state.state());
    one(state.render(), node => node.props.id === 'wcPrecipStormTime').props.onChange({ target: { value: '73' } });
    expect(state.patches).toEqual([{ stormTime: 73, stormAutoPlay: false }]);
    expect(plain(state.state())).toEqual({ ...before, stormTime: 73, stormAutoPlay: false });
    expect(stageChoice(state.render(), stages[2]).props['aria-pressed']).toBe(true);
  });

  it.each([[0, true, false], [52, false, false], [100, false, true]])('uses native endpoint disabling at position %s', (stormTime, backDisabled, forwardDisabled) => {
    const tree = harness(runtime, { stormTime }).render();
    expect(button(tree, 'Back 4').props.disabled).toBe(backDisabled);
    expect(button(tree, 'Forward 4').props.disabled).toBe(forwardDisabled);
  });

  it.each([[0, 'Forward 4', 4], [2, 'Back 4', 0], [98, 'Forward 4', 100], [100, 'Back 4', 96]])(
    'moves from %s via %s to bounded position %s', (stormTime, label, expectedTime) => {
      const state = harness(runtime, { stormTime }), before = plain(state.state());
      state.click(label);
      expect(state.patches).toEqual([{ stormTime: expectedTime, stormAutoPlay: false }]);
      expect(plain(state.state())).toEqual({ ...before, stormTime: expectedTime, stormAutoPlay: false });
    });

  it.each([[52, true, 'Pause time', 52, false], [52, false, 'Play storm', 52, true], [100, false, 'Replay storm', 0, true]])(
    'handles playback at %s with playing=%s using %s', (stormTime, stormAutoPlay, label, expectedTime, expectedPlay) => {
      const state = harness(runtime, { stormTime, stormAutoPlay }), before = plain(state.state());
      state.click(label);
      expect(state.patches).toEqual([{ stormTime: expectedTime, stormAutoPlay: expectedPlay }]);
      expect(plain(state.state())).toEqual({ ...before, stormTime: expectedTime, stormAutoPlay: expectedPlay });
    });

  it.each([52, 100])('keeps playback inactive with reduced motion at %s', stormTime => {
    const state = harness(runtime, { stormTime, stormAutoPlay: true }, { reducedMotion: true });
    const before = plain(state.state()), tree = state.render();
    const control = one(tree, node => node.tag === 'button' && node.props['aria-disabled'] === true);
    expect(control.props['aria-pressed']).toBe(false);
    control.props.onClick();
    expect(state.patches).toHaveLength(0);
    expect(plain(state.state())).toEqual(before);
  });

  it.each(stages)('keeps manual stage %s available with reduced motion', stage => {
    const state = harness(runtime, {}, { reducedMotion: true });
    state.clickStage(stage);
    expect(state.patches).toEqual([{ stormTime: stage.time, stormAutoPlay: false }]);
    expect(stageChoice(state.render(), stage).props['aria-pressed']).toBe(true);
  });

  it.each(['dark', 'contrast'])('retains names and selected state in the %s theme', theme => {
    const tree = harness(runtime, { stormTime: 86 }, { theme }).render();
    expect(stageChoices(tree)).toHaveLength(3);
    expect(stageChoice(tree, stages[2]).props['aria-pressed']).toBe(true);
  });

  it.each(['clear', 'virga'])('uses actual setup-specific copy for the %s model without changing state', setup => {
    const patch = setup === 'virga' ? runtime.kernel.presets.virga : { moisture: 0, cloudDepth: 1, updraft: 0 };
    const state = harness(runtime, { ...patch, stormTime: 52 }), before = plain(state.state());
    const tree = state.render(), model = runtime.kernel.compute(before);
    expect(text(tree)).toContain(runtime.moments.currentCopy(model));
    expect(plain(state.state())).toEqual(before);
    expect(state.patches).toHaveLength(0);
  });
});
