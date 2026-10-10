import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const testPath = 'tests/watercycle_storm_ground_readings.test.js';
const testBytes = readFileSync(testPath), loadedAt = new Date().toISOString();
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const trackIds = ['snow', 'glaze', 'hail', 'puddling', 'runoff'];
const phaseIds = ['clear', 'virga', 'rain', 'snow', 'sleet', 'mix', 'freezing-rain', 'hail'];
const positions = [0, 52, 86, 100];
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
  const style = runInNewContext('(' + named(source, 'WC_STORM_GROUND_STYLE', true) + ')');
  return { source, kernel, moments, style };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_GROUND_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_GROUND_LOADED_REPORT, JSON.stringify({
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
const card = (tree, id) => one(tree, node => node.props['data-sg-track'] === id);
function setupFor(kernel, phase) {
  if (phase === 'rain') return kernel.presets.gentleRain;
  if (phase === 'snow') return kernel.presets.mountainSnow;
  if (phase === 'freezing-rain') return kernel.presets.freezingRain;
  if (phase === 'hail') return kernel.presets.hailstorm;
  if (phase === 'virga') return kernel.presets.virga;
  if (phase === 'sleet') return { tempC: -10, midLevelTempC: 1, surfaceTempC: -4, moisture: 90, updraft: 70, cloudDepth: 9, lowLevelHumidity: 85, terrain: 'plains', wind: 10 };
  if (phase === 'mix') return { tempC: -10, midLevelTempC: -3, surfaceTempC: 2, moisture: 90, updraft: 70, cloudDepth: 9, lowLevelHumidity: 85, terrain: 'plains', wind: 10 };
  return { moisture: 0, cloudDepth: 1, updraft: 0, wind: 0, terrain: 'plains', tempC: 12, surfaceTempC: 20, lowLevelHumidity: 85 };
}
function render(runtime, phase = 'rain', stormTime = 52, accumulationPatch) {
  const config = freeze({ ...setupFor(runtime.kernel, phase), stormTime,
    stormAutoPlay: true, viewMode: '3d', cameraFocus: 'immersive', lightningStudyStep: 'pressure-wave',
    paused: true, soundEnabled: false, notes: { evidence: ['Retain the observation.'] },
    hypothesis: 'Retain the prediction.', experiment: { saved: [{ explanation: 'Retain the reasoning.' }] } });
  const configBefore = plain(config);
  const computed = runtime.kernel.compute(config);
  const model = freeze(accumulationPatch ? { ...computed, lifecycle: { ...computed.lifecycle,
    accumulation: { ...computed.lifecycle.accumulation, ...accumulationPatch } } } : computed);
  const modelBefore = plain(model);
  const context = { h, precipModel: model, WCStormMoments: runtime.moments, WC_STORM_GROUND_STYLE: runtime.style };
  const tree = runInNewContext('(' + named(runtime.source, 'renderStormGroundReadings') + ')', context)();
  expect(plain(config)).toEqual(configBefore);
  expect(plain(model)).toEqual(modelBefore);
  if (accumulationPatch) Object.entries(accumulationPatch).forEach(([key, value]) => expect(model.lifecycle.accumulation[key]).toBe(value));
  return { tree, model, config };
}
function checkReading(tree, id, raw) {
  const current = card(tree, id), valid = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 100;
  const bars = nodes(current, node => node.props['data-sg-bar'] === id);
  const zeroMarkers = nodes(current, node => Object.hasOwn(node.props, 'data-sg-zero'));
  if (valid) {
    const value = Math.round(raw);
    expect(String(current.props['data-sg-value'])).toBe(String(value));
    expect(current.props['data-sg-state']).toBe(value === 0 ? 'zero' : 'available');
    expect(bars).toHaveLength(1);
    expect(bars[0].props.style.width).toBe(value + '%');
    expect(zeroMarkers).toHaveLength(value === 0 ? 1 : 0);
    expect(text(current)).toMatch(new RegExp('\\b' + value + '\\s*/\\s*100\\b'));
    expect(/\b\d+\s*\/\s*100\s*(%|mm|cm|m³)/.test(text(current))).toBe(false);
  } else {
    expect(current.props['data-sg-value']).toBe('unavailable');
    expect(current.props['data-sg-state']).toBe('unavailable');
    expect(bars).toHaveLength(0);
    expect(zeroMarkers).toHaveLength(0);
    expect(text(current)).toMatch(/unavailable|not available/i);
  }
}

describe('Storm ground readings: shipped runtime contract', () => {
  it('parses both full runtimes and keeps the source and desktop mirror identical', () => {
    expect(shipped[0].source.bytes.equals(shipped[1].source.bytes)).toBe(true);
    shipped.forEach(({ source }) => expect(named(source, 'renderStormGroundReadings')).toBeTruthy());
  });
});
for (const runtime of shipped) describe('Storm ground readings: ' + runtime.source.path, () => {
  it.each(phaseIds.flatMap(phase => positions.map(time => [phase, time])))('shows actual %s readings at model position %s', (phase, stormTime) => {
    const { tree, model } = render(runtime, phase, stormTime);
    expect(model.visualType).toBe(phase);
    expect(tree.props['data-sg-position']).toBe(stormTime);
    expect(nodes(tree, node => Object.hasOwn(node.props, 'data-sg-track')).map(node => node.props['data-sg-track'])).toEqual(trackIds);
    trackIds.forEach(id => checkReading(tree, id, model.lifecycle.accumulation[id]));
  });

  it.each([['null', null], ['undefined', undefined], ['NaN', NaN], ['Infinity', Infinity], ['negative infinity', -Infinity], ['negative', -1], ['over 100', 101], ['numeric string', '50']])(
    'keeps %s unavailable on each track without changing valid neighbors', (_label, value) => {
      for (const id of trackIds) {
        const { tree, model } = render(runtime, 'rain', 52, { [id]: value });
        trackIds.forEach(key => checkReading(tree, key, model.lifecycle.accumulation[key]));
      }
    });

  it.each([0.49, 0.5, 99.5, 100])('uses one rounded displayed value for labels, state and fill at %s', value => {
    const patch = Object.fromEntries(trackIds.map(id => [id, value]));
    const { tree } = render(runtime, 'rain', 52, patch);
    trackIds.forEach(id => checkReading(tree, id, value));
  });

  it('offers five unique native explanatory disclosures without state callbacks or extra controls', () => {
    const { tree } = render(runtime), metrics = runtime.moments.metrics();
    expect(metrics.map(metric => metric.id)).toEqual(trackIds);
    const summaries = trackIds.map(id => one(card(tree, id), node => node.tag === 'summary'));
    expect(summaries).toHaveLength(5);
    summaries.forEach((summary, index) => expect(text(summary).toLowerCase().startsWith('about ' + metrics[index].label.toLowerCase())).toBe(true));
    expect(new Set(summaries.map(text)).size).toBe(5);
    expect(nodes(tree, node => node.tag === 'details' && Object.hasOwn(node.props, 'data-sg-track'))).toHaveLength(5);
    expect(nodes(tree, node => ['button', 'input', 'select', 'textarea'].includes(node.tag))).toHaveLength(0);
    expect(nodes(tree, node => Object.entries(node.props).some(([key, value]) => /^on[A-Z]/.test(key) && typeof value === 'function'))).toHaveLength(0);
    nodes(tree, node => node.tag === 'details').forEach(node => expect(node.props.open).toBe(undefined));
  });

  it('uses the existing science catalog labels and decorative type symbols for all five tracks', () => {
    const { tree } = render(runtime);
    runtime.moments.metrics().forEach(metric => {
      const current = card(tree, metric.id);
      expect(current.tag).toBe('details');
      expect(nodes(current, node => node.tag === 'summary')).toHaveLength(1);
      expect(text(current)).toContain(metric.label);
      const svg = one(current, node => node.tag === 'svg' && node.props.className === 'wc-sg-symbol');
      expect(svg.props['aria-hidden']).toBe('true');
      expect(svg.props.focusable).toBe('false');
    });
  });

  it('identifies separate qualitative indices and the fixed-setup limits beside the actual readings', () => {
    const { tree } = render(runtime);
    const readableTree = { ...tree, children: tree.children.filter(node => !node || typeof node !== 'object' || node.tag !== 'style') };
    expect(text(readableTree)).toMatch(/qualitative/i);
    expect(text(readableTree)).toMatch(/each|separate/i);
    expect(text(readableTree)).toMatch(/same|fixed|current/i);
    expect(text(readableTree)).toMatch(/setup/i);
  });
});
