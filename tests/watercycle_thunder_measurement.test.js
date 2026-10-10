import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const testPath = 'tests/watercycle_thunder_measurement.test.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString();
const testBytes = readFileSync(testPath);

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
const namedCache = new WeakMap();
function named(source, name, initializer = false) {
  if (!namedCache.has(source)) namedCache.set(source, new Map());
  const cache = namedCache.get(source), key = name + ':' + initializer;
  if (cache.has(key)) return cache.get(key);
  const found = [];
  walk(source.ast, node => {
    if (node.type === (initializer ? 'VariableDeclarator' : 'FunctionDeclaration') && node.id?.name === name) {
      const selected = initializer ? node.init : node;
      found.push(source.text.slice(selected.start, selected.end));
    }
  });
  if (found.length !== 1) throw new Error(`Expected one actual ${name} in ${source.path}; found ${found.length}`);
  cache.set(key, found[0]);
  return found[0];
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
const shipped = paths.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  const source = { path, bytes, text, ast: parse(text, { ecmaVersion: 'latest' }) };
  return { source, kernel: loadKernel(source) };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_THUNDER_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_THUNDER_LOADED_REPORT, JSON.stringify({
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

// This adapter executes the shipped renderer and callbacks against the actual
// scientific kernel. Browser coverage separately verifies focus and layout.
function harness(runtime, patch = {}, theme = 'light') {
  const { source, kernel } = runtime;
  let state = freeze({ ...kernel.presets.summerStorm, stormTime: 52, stormAutoPlay: true,
    stormDistanceKm: 6, thunderEstimateKm: 3, thunderEstimateChecked: false,
    paused: false, soundEnabled: false, lightningStudyStep: 'auto',
    hypothesis: 'Retain my prediction.', notes: { evidence: ['Keep my observation.'] },
    experiment: { saved: [{ explanation: 'Keep my reasoning.' }] }, ...patch });
  const patches = [], updates = [], announcements = [];
  const style = runInNewContext('(' + named(source, 'WC_THUNDER_MEASURE_STYLE', true) + ')');
  function render() {
    const precipConfig = freeze(kernel.normalize(state));
    const precipModel = freeze(kernel.compute(precipConfig));
    const beforeConfig = plain(precipConfig), beforeModel = plain(precipModel);
    const context = {
      h, precipConfig, precipModel, WC_THUNDER_MEASURE_STYLE: style,
      isDark: theme === 'dark', isContrast: theme === 'contrast',
      iq: state, normalizeWcPrecipConfig: kernel.normalize,
      upd(key, value) { updates.push({ key, value: plain(value) }); state = freeze(value); },
      announceToSR(message) { announcements.push(message); },
      t: (_key, fallback) => fallback,
    };
    const setIQ = runInNewContext('(' + named(source, 'setIQ') + ')', context);
    context.setIQ = patch => { patches.push(plain(patch)); setIQ(patch); };
    context.checkThunderEstimate = runInNewContext('(' + named(source, 'checkThunderEstimate') + ')', context);
    const result = runInNewContext('(' + named(source, 'renderThunderMeasurement') + ')', context)();
    expect(plain(precipConfig)).toEqual(beforeConfig);
    expect(plain(precipModel)).toEqual(beforeModel);
    return result;
  }
  return { render, patches, updates, announcements, state: () => state,
    patch(patch) {
      const setIQ = runInNewContext('(' + named(source, 'setIQ') + ')', {
        iq: state, precipConfig: kernel.normalize(state), normalizeWcPrecipConfig: kernel.normalize,
        upd(key, value) { updates.push({ key, value: plain(value) }); state = freeze(value); },
      });
      setIQ(patch);
    },
    change(value) { one(render(), node => node.props.id === 'wcPrecipThunderEstimate').props.onChange({ target: { value: String(value) } }); },
    check() { one(render(), node => node.tag === 'button' && /Check estimate/i.test(text(node))).props.onClick(); },
  };
}
const lane = (tree, name) => one(tree, node => node.props['data-tm-lane'] === name);
const bar = tree => one(tree, node => Object.hasOwn(node.props, 'data-tm-bar'));
const resultState = tree => one(tree, node => Object.hasOwn(node.props, 'data-thunder-measurement')).props['data-thunder-measurement'];

describe('Thunder measurement: shipped runtime contract', () => {
  it('parses both complete runtimes and keeps the desktop mirror identical', () => {
    expect(shipped[0].source.bytes.equals(shipped[1].source.bytes)).toBe(true);
    shipped.forEach(({ source }) => {
      expect(named(source, 'renderThunderMeasurement')).toContain('data-tm-lane');
      expect(named(source, 'WC_THUNDER_MEASURE_STYLE', true)).toBeTruthy();
    });
  });
});

for (const runtime of shipped) describe('Thunder measurement: ' + runtime.source.path, () => {
  it.each([[0.5, 0.5, 1.5], [20, 20, 58.3], [6, 6, 17.5]])('aligns an exact %s km estimate on the same rounded timing scale', (distance, estimate, expectedSeconds) => {
    const tree = harness(runtime, { stormDistanceKm: distance, thunderEstimateKm: estimate }).render();
    for (const name of ['modeled', 'estimate']) {
      const track = lane(tree, name);
      expect(Number(track.props['data-tm-seconds'])).toBe(expectedSeconds);
      expect(parseFloat(bar(track).props.style.width)).toBeCloseTo(expectedSeconds / 60 * 100, 10);
      expect(text(track)).toContain(expectedSeconds.toFixed(1));
    }
    expect(bar(lane(tree, 'estimate')).props.style.width).toBe(bar(lane(tree, 'modeled')).props.style.width);
  });

  it.each([[6, 0.5, 1.5, 'shorter'], [6, 20, 58.3, 'longer'], [0.5, 20, 58.3, 'longer'], [20, 0.5, 1.5, 'shorter']])('compares %s km with the %s km guess without rescaling either rail', (distance, estimate, expectedSeconds, relation) => {
    const tree = harness(runtime, { stormDistanceKm: distance, thunderEstimateKm: estimate }).render();
    const modeled = lane(tree, 'modeled'), guessed = lane(tree, 'estimate');
    const modeledSeconds = Math.round(distance / 0.343 * 10) / 10;
    expect(Number(modeled.props['data-tm-seconds'])).toBe(modeledSeconds);
    expect(Number(guessed.props['data-tm-seconds'])).toBe(expectedSeconds);
    expect(parseFloat(bar(modeled).props.style.width)).toBeCloseTo(modeledSeconds / 60 * 100, 10);
    expect(parseFloat(bar(guessed).props.style.width)).toBeCloseTo(expectedSeconds / 60 * 100, 10);
    expect(Number(guessed.props['data-tm-seconds']) < Number(modeled.props['data-tm-seconds'])).toBe(relation === 'shorter');
  });

  it('labels the generated interval as modeled and keeps time and distance units explicit', () => {
    const tree = harness(runtime).render(), copy = text(tree);
    expect(copy).toMatch(/Modeled delay/);
    expect(copy).not.toMatch(/Observed delay/i);
    expect(copy).toMatch(/0\.343/);
    expect(copy).toMatch(/km/);
    expect(copy).toMatch(/seconds|\bs\b/);
    expect(resultState(tree)).toBe('unsubmitted');
  });

  it('provides an explicitly labeled native range with meaningful distance bounds', () => {
    const tree = harness(runtime, { thunderEstimateKm: 4.5 }).render();
    const input = one(tree, node => node.props.id === 'wcPrecipThunderEstimate');
    expect(input.tag).toBe('input');
    expect(input.props).toMatchObject({ type: 'range', min: 0.5, max: 20, step: 0.5, value: 4.5 });
    expect(input.props['aria-valuetext']).toMatch(/4\.5.*kilometres/);
    expect(text(one(tree, node => node.tag === 'label' && node.props.htmlFor === input.props.id))).toMatch(/estimate/i);
  });

  it('changes only the distance answer and clears prior feedback while preserving setup and timing', () => {
    const state = harness(runtime, { thunderEstimateChecked: true });
    const before = plain(state.state());
    state.change(7.5);
    expect(state.patches).toEqual([{ thunderEstimateKm: 7.5, thunderEstimateChecked: false }]);
    expect(plain(state.state())).toEqual({ ...before, thunderEstimateKm: 7.5, thunderEstimateChecked: false });
    expect(resultState(state.render())).toBe('unsubmitted');
    expect(state.updates[0].key).toBe('precipHunt');
  });

  it.each([[6, 8], [0.5, 20], [20, 0.5]])('expires a saved answer when model distance changes from %s km to %s km', (beforeDistance, nextDistance) => {
    const state = harness(runtime, { stormDistanceKm: beforeDistance, thunderEstimateChecked: true });
    const before = plain(state.state());
    const patch = freeze({ stormDistanceKm: nextDistance });
    state.patch(patch);
    expect(plain(state.state())).toEqual({ ...before, stormDistanceKm: nextDistance, thunderEstimateChecked: false });
    expect(patch).toEqual({ stormDistanceKm: nextDistance });
    expect(resultState(state.render())).toBe('unsubmitted');
  });

  it.each([[6, 6], [20, 30], [0.5, -10]])('retains a saved answer when %s km and patched %s km normalize to the same distance', (beforeDistance, nextDistance) => {
    const state = harness(runtime, { stormDistanceKm: beforeDistance, thunderEstimateChecked: true });
    const before = plain(state.state());
    state.patch(freeze({ stormDistanceKm: nextDistance }));
    expect(plain(state.state())).toEqual({ ...before, stormDistanceKm: nextDistance });
    expect(state.state().thunderEstimateChecked).toBe(true);
  });

  it.each([
    { stormTime: 86 }, { paused: true }, { soundEnabled: true },
    { lightningStudyStep: 'wave' }, { moisture: 91 },
  ])('preserves the answer when an unrelated control changes: %j', patch => {
    const state = harness(runtime, { thunderEstimateChecked: true });
    const before = plain(state.state());
    state.patch(freeze(patch));
    expect(plain(state.state())).toEqual({ ...before, ...patch });
    expect(state.state().thunderEstimateChecked).toBe(true);
  });

  it.each([[6, 'close'], [5, 'near'], [0.5, 'recheck'], [20, 'recheck']])('checks a %s km guess with the actual kernel feedback band %s', (estimate, band) => {
    const state = harness(runtime, { stormDistanceKm: 6, thunderEstimateKm: estimate });
    const before = plain(state.state());
    state.check();
    expect(state.patches).toEqual([{ thunderEstimateChecked: true }]);
    expect(plain(state.state())).toEqual({ ...before, thunderEstimateChecked: true });
    const tree = state.render();
    expect(resultState(tree)).toBe(band);
    const status = one(tree, node => node.props.role === 'status');
    expect(status.props['aria-live']).toBe('polite');
    expect(status.props['aria-atomic']).toBe('true');
    const model = runtime.kernel.compute(state.state());
    if (model.thunderEstimate.errorKm) expect(text(status)).toContain(model.thunderEstimate.errorKm.toFixed(1));
    else expect(text(status)).toMatch(/matches the model distance/);
    expect(state.announcements).toHaveLength(0);
  });

  it('keeps the optional worked example in a native disclosure', () => {
    const tree = harness(runtime, { stormDistanceKm: 6 }).render();
    const details = one(tree, node => node.tag === 'details');
    expect(details.props.open).not.toBe(true);
    expect(one(details, node => node.tag === 'summary')).toBeTruthy();
    expect(text(details)).toContain('17.5');
    expect(text(details)).toContain('0.343');
    expect(text(details)).toContain('6.0');
  });

  it.each([[0.5, 'farther', 'nearer'], [20, 'nearer', 'farther away']])('gives a useful direction for a %s km guess', (estimate, direction, placement) => {
    const tree = harness(runtime, { stormDistanceKm: 6, thunderEstimateKm: estimate, thunderEstimateChecked: true }).render();
    const status = one(tree, node => node.props.role === 'status');
    expect(text(one(status, node => node.tag === 'h5'))).toBe('Try a ' + direction + ' distance');
    expect(text(status)).toContain(placement + ' than the model distance');
    expect(text(status)).toContain('0.6 km as close');
  });

  it('qualifies a sub-tenth error instead of claiming a zero-distance difference', () => {
    const tree = harness(runtime, { stormDistanceKm: 6.04, thunderEstimateKm: 6, thunderEstimateChecked: true }).render();
    const status = one(tree, node => node.props.role === 'status');
    expect(text(status)).toContain('matches the model distance at the displayed precision');
    expect(text(status)).not.toContain('0.0 km');
    expect(resultState(tree)).toBe('close');
  });

  it('exposes numbers as definition pairs while hiding decorative rails from assistive technology', () => {
    const tree = harness(runtime).render();
    for (const name of ['modeled', 'estimate']) {
      const track = lane(tree, name);
      const list = one(track, node => node.tag === 'dl');
      expect(list.children.map(node => node.tag)).toEqual(['dt', 'dd']);
      const rail = one(track, node => node.props.className === 'wc-tm-rail');
      expect(rail.props['aria-hidden']).toBe('true');
      expect(nodes(list, node => node === rail)).toHaveLength(0);
    }
    const figure = one(tree, node => node.tag === 'figure');
    expect(one(figure, node => node.props.id === figure.props['aria-labelledby']).tag).toBe('figcaption');
  });

  it('explains an unavailable interval and removes the measuring controls when there is no flash', () => {
    const tree = harness(runtime, { ...runtime.kernel.presets.gentleRain, moisture: 0, cloudDepth: 1, updraft: 0 }).render();
    expect(resultState(tree)).toBe('unavailable');
    expect(text(tree)).toMatch(/interval is not available/i);
    expect(text(tree)).toMatch(/interval/i);
    expect(nodes(tree, node => ['input', 'button', 'details'].includes(node.tag))).toHaveLength(0);
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-tm-lane'))).toHaveLength(0);
  });

  it.each(['light', 'dark', 'contrast'])('retains numeric meaning and controls in the %s theme', theme => {
    const tree = harness(runtime, { stormDistanceKm: 20, thunderEstimateKm: 0.5 }, theme).render();
    expect(Number(lane(tree, 'modeled').props['data-tm-seconds'])).toBe(58.3);
    expect(Number(lane(tree, 'estimate').props['data-tm-seconds'])).toBe(1.5);
    expect(one(tree, node => node.props.id === 'wcPrecipThunderEstimate').props.value).toBe(0.5);
  });
});
