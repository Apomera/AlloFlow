import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const TEST_PATH = 'tests/watercycle_thermal_layer_inspector.test.js';
// Freeze reference re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words): later
// published passes (585a61ba2, 79e3e5eae) changed preserved declarations on purpose. The original
// pass baseline remains at reports/watercycle-thermal-layer-inspector/baseline-runtime.js.
const BASELINE_PATH = 'reports/watercycle-freeze-reference/accepted-runtime.js';
const BASELINE_SHA = '9498b1556f44b12bcb562e7507beccfcfc211fdcf721c4615892ad3c197de84d';
const PRESERVED = [
  'wcPrecipClamp', 'advanceWcStormWeather', 'WC_PRECIP_DEFAULTS', 'WC_PRECIP_PRESETS',
  'normalizeWcPrecipConfig', 'wcPrecipTemperatureAt', 'buildWcPrecipThermalStructure',
  'buildWcStormLifecycle', 'buildWcThunderModel', 'evaluateWcThunderEstimate',
  'buildWcStormAnatomy', 'computeWcPrecipitationModel', 'wcPrecipPhaseAtTransitions',
  'wcPrecipPhaseFromModel', 'wcPrecipPhaseAt', 'WC_PRECIP_EXPERIMENT_INPUTS',
  'wcPrecipSetupSnapshot', 'wcPrecipExperimentValue', 'wcPrecipExperiment',
  'stormStageStops', 'stormAccumulationKeys', 'setStormLifecycleTime', 'setIQ',
  'setStormExperiment', 'pinStormSetup', 'startStormExperiment', 'restoreStormControls',
  'saveStormComparison', 'downloadStormComparison', 'renderStormExperiment',
  'setPrecipControl', 'setPrecipViewMode', 'setPrecipCameraFocus', 'applyPrecipPreset',
  'resetPrecipLab', 'logPrecipObservation', 'openPrecipitationIn3d',
  'precipCanvasRef', 'precip3dRef', 'scheduleStormLifecycleTick', 'canvasRef', 'journey3dRef',
  'setJourneyReplayProgress', 'resumeLiveJourney', 'chooseJourneyPath',
  'WCStormMoments', 'WC_STORM_MOMENTS_STYLE', 'renderStormMoments',
  'WCGroundwaterLens', 'WC_GROUNDWATER_LENS_STYLE', 'renderWcGroundwaterLens', 'renderWcCheckPores',
  'WCJourneyChapters', 'renderWcJourneyChapters', 'WCCloudEvidence', 'WCExploreNotebook',
  'WCCheckInvestigation', 'WCProcessCompare', 'MATTER_ENERGY_TRACE',
  'JOURNEY_MATTER_ENERGY_TRACE', 'wcQuizBank', 'wcQuizQuestion', 'checkWaterCycleChallenges',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
function freeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value); Object.values(value).forEach(item => freeze(item, seen)); Object.freeze(value);
  }
  return value;
}
function walk(tree, visit) {
  const pending = [tree];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    visit(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
}
function exactDeclarations(text, names = PRESERVED) {
  const normalized = text.replace(/\r\n/g, '\n'), result = {};
  walk(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!names.includes(name)) return;
    if (result[name]) throw new Error('Duplicate preservation anchor: ' + name);
    result[name] = normalized.slice(node.start, node.end);
  });
  return result;
}
function kernelAssignment(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = [];
  walk(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const left = node.type === 'AssignmentExpression' && node.left;
    if (left && left.type === 'MemberExpression' && !left.computed && left.object.name === 'window' && left.property.name === 'WaterCyclePrecipitationKernel') result.push(normalized.slice(node.start, node.end));
  });
  if (result.length !== 1) throw new Error('Missing or duplicate public scientific kernel');
  return result[0];
}
const loadedAt = new Date().toISOString();
const sources = [SOURCE_PATH, MIRROR_PATH].map(path => ({ path, bytes: readFileSync(path), text: readFileSync(path, 'utf8') }));
const baselineBytes = readFileSync(BASELINE_PATH);
const loadedTestBytes = readFileSync(TEST_PATH);
afterAll(() => {
  if (process.env.WATER_CYCLE_THERMAL_LAYER_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_THERMAL_LAYER_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTestBytes), bytes: loadedTestBytes.length },
    loadedBaseline: { path: BASELINE_PATH, sha256: sha(baselineBytes), bytes: baselineBytes.length },
  }, null, 2) + '\n');
});
function loadRuntime(source) {
  const element = () => ({ style: {}, appendChild() {}, setAttribute() {} }), window = {};
  runInNewContext(source.text, { window,
    document: { head: element(), body: element(), createElement: element, getElementById: () => null },
    console, Math, Date, Object, Array, Number, String, Boolean, JSON, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
  }, { filename: source.path, timeout: 10000 });
  const kernel = window.WaterCyclePrecipitationKernel;
  if (!kernel) throw new Error('Missing actual public precipitation kernel');
  const declarations = exactDeclarations(source.text, ['wcPrecipClamp', 'wcPrecipPhaseAtTransitions', 'wcPrecipPhaseFromModel']);
  const phaseFromModel = runInNewContext(Object.values(declarations).join('\n') + '\nwcPrecipPhaseFromModel;', {}, { timeout: 1000 });
  let initializer;
  walk(parse(source.text, { ecmaVersion: 'latest' }), node => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'WCThermalLayerInspector') {
      if (initializer) throw new Error('Duplicate actual thermal helper');
      initializer = source.text.slice(node.init.start, node.init.end);
    }
  });
  if (!initializer) throw new Error('Missing actual WCThermalLayerInspector');
  const helper = runInNewContext('(' + initializer + ')', {
    wcPrecipSetupSnapshot: kernel.setupSnapshot, wcPrecipPhaseFromModel: phaseFromModel,
  }, { filename: source.path + ':thermal-inspector', timeout: 1000 });
  if (typeof window.WaterCycleAirProfile !== 'function') throw new Error('Missing actual public air profile helper');
  return { source, kernel, helper, airProfile: window.WaterCycleAirProfile };
}
const shipped = sources.map(loadRuntime);
const eachRuntime = callback => shipped.forEach(({ helper, kernel, source }) => callback(helper, kernel, source));
function configFor(kernel, phase) {
  if (phase === 'rain') return kernel.presets.gentleRain;
  if (phase === 'snow') return kernel.presets.mountainSnow;
  if (phase === 'freezing-rain') return kernel.presets.freezingRain;
  if (phase === 'hail') return kernel.presets.hailstorm;
  if (phase === 'virga') return kernel.presets.virga;
  if (phase === 'sleet') return { tempC: -10, midLevelTempC: 1, surfaceTempC: -4, moisture: 90, updraft: 70, cloudDepth: 9, lowLevelHumidity: 85, terrain: 'plains', wind: 10 };
  if (phase === 'mix') return { tempC: -10, midLevelTempC: -3, surfaceTempC: 2, moisture: 90, updraft: 70, cloudDepth: 9, lowLevelHumidity: 85, terrain: 'plains', wind: 10 };
  return { moisture: 0, cloudDepth: 1, updraft: 0, wind: 0, terrain: 'plains', tempC: 12, surfaceTempC: 20, lowLevelHumidity: 85 };
}
const categoryFor = code => ({ snow: 'solid', sleet: 'solid', hail: 'solid', rain: 'liquid', 'freezing-rain': 'liquid', mix: 'mixed', virga: 'virga', clear: 'none' })[code];
function contextFor(helper, kernel, phase = 'rain', patch = {}) { return helper.build(kernel.compute({ ...configFor(kernel, phase), ...patch })); }
function accepted(helper, context, node = 'middle') {
  const selected = helper.select({}, context, node);
  return helper.answer(selected, context, context.nodes.find(row => row.id === node).category);
}
function renderedNodes(tree, predicate) {
  const result = [];
  function visit(node) {
    if (!node || typeof node !== 'object' || !node.tag) return;
    if (predicate(node)) result.push(node);
    node.children.forEach(visit);
  }
  visit(tree); return result;
}
function renderedNode(tree, predicate) {
  const nodes = renderedNodes(tree, predicate);
  if (nodes.length !== 1) throw new Error('Expected one rendered node; found ' + nodes.length);
  return nodes[0];
}
function renderedText(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree && typeof tree === 'object' ? tree.children.map(renderedText).join(' ') : '';
}
// Evaluate the shipped renderer and its own callbacks. The adapter records HTML;
// native browser focus and layout are checked independently by browser QA.
const rendererDeclarations = new WeakMap();
function rendererHarness(runtime, initial = {}) {
  let state = freeze({
    precipHunt: { ...runtime.kernel.presets.summerStorm, stormTime: 27, stormAutoPlay: false,
      viewMode: '2d', paused: true, hypothesis: 'My prediction.', log: [{ note: 'Keep the observation.' }],
      experiment: { saved: [{ explanation: 'Keep the explanation.' }], setupA: { moisture: 65 } } },
    wcStormMoments: { metric: 'runoff', answer: 'split' }, wcGroundwaterLens: { view: 'saturated' },
    journeyPaused: true, journeyProgress: 0.35, compareBaseline: { climSolar: 1 },
    observations: [{ explanation: 'Keep evidence.' }], wcProcessCompare: { notes: { 'evaporation|transpiration': 'Keep writing.' } },
    quizCorrectCount: 3, quizAttempts: 5, mythsDone: ['vapor'], reward: { xp: 120 },
    unrelated: { nested: ['Keep all state.'] }, ...initial,
  });
  if (!rendererDeclarations.has(runtime.source)) rendererDeclarations.set(runtime.source,
    exactDeclarations(runtime.source.text, ['renderThermalLayerInspector', 'WC_THERMAL_LAYER_INSPECTOR_STYLE']));
  const declarations = rendererDeclarations.get(runtime.source);
  if (!declarations.renderThermalLayerInspector || !declarations.WC_THERMAL_LAYER_INSPECTOR_STYLE) throw new Error('Missing actual thermal renderer or styles');
  const style = runInNewContext('var ' + declarations.WC_THERMAL_LAYER_INSPECTOR_STYLE + '; WC_THERMAL_LAYER_INSPECTOR_STYLE;', {}, { timeout: 1000 });
  const calls = [], focus = [];
  function render() {
    return runInNewContext('(' + declarations.renderThermalLayerInspector + ')()', {
      h: (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }),
      d: state, precipModel: runtime.kernel.compute(state.precipHunt), WCThermalLayerInspector: runtime.helper,
      wcPrecipAirProfile: runtime.airProfile,
      WC_THERMAL_LAYER_INSPECTOR_STYLE: style, isDark: false, isContrast: false,
      upd: (key, value) => { calls.push({ key, value }); state = freeze({ ...state, [key]: value }); },
      focusWcComparisonTarget: id => focus.push(id),
      setIQ: () => { throw new Error('Inspector changed the live precipitation controls'); },
      setStormLifecycleTime: () => { throw new Error('Inspector moved the live timeline'); },
      awardStemXP: () => { throw new Error('Inspector changed rewards'); },
      // The shipped renderer reads copy through the tool's __alloT(key, fallback) wrapper.
      __alloT: (_key, fallback) => fallback,
    }, { filename: runtime.source.path + ':thermal-renderer', timeout: 1000 });
  }
  return {
    state: () => state, calls, focus, render,
    replace: patch => { state = freeze({ ...state, ...patch }); },
    click: (attribute, value) => {
      const node = renderedNode(render(), item => item.props[attribute] === value);
      expect(node.tag).toBe('button'); expect(node.props.type).toBe('button'); node.props.onClick();
    },
  };
}
function withoutInspector(state) { const copy = plain(state); delete copy.wcThermalLayerInspector; return copy; }

describe('Thermal layer inspector: real resolved thermal evidence', () => {
  it.each(['rain', 'snow', 'sleet', 'freezing-rain', 'hail', 'mix', 'virga', 'clear'])('copies actual %s nodes and compares particle cues with the independent public phase kernel', phase => {
    eachRuntime((helper, kernel) => {
      const model = freeze(kernel.compute(configFor(kernel, phase))), before = JSON.stringify(model), context = helper.build(model);
      expect(model.visualType).toBe(phase); expect(context).not.toBeNull();
      expect(context.nodes.map(row => row.id)).toEqual(['cloud', 'middle', 'surface']);
      expect(context.nodes.map(row => row.label)).toEqual(['Cloud base', 'Middle air', 'Near surface']);
      expect(context.nodes.map(row => row.progress)).toEqual([0, 0.55, 1]);
      context.nodes.forEach((row, index) => {
        expect(row.temperatureC).toBe(model.thermalLayers.temperaturePoints[index].temperatureC);
        expect(row.particleCode).toBe(kernel.phaseAt(model.config, row.progress));
        expect(row.category).toBe(categoryFor(row.particleCode));
      });
      expect(plain(context.crossings)).toEqual(plain(model.thermalLayers.crossings));
      expect(context.phasePathLabel).toBe(model.thermalLayers.phasePathLabel); expect(context.reachesGround).toBe(model.reachesGround);
      expect(JSON.stringify(model)).toBe(before);
    });
  });
  it('keeps ice pellets and supercooled liquid distinct at the same below-freezing surface', () => {
    eachRuntime((helper, kernel) => {
      const pellets = contextFor(helper, kernel, 'sleet'), glaze = contextFor(helper, kernel, 'freezing-rain');
      expect(pellets.nodes[2].temperatureC).toBeLessThan(0); expect(glaze.nodes[2].temperatureC).toBeLessThan(0);
      expect(pellets.nodes[2].category).toBe('solid'); expect(glaze.nodes[2].category).toBe('liquid');
      expect(glaze.nodes[2].particleLabel).toBe('Supercooled liquid drop');
      expect(glaze.nodes[2].detail).toContain('surface ice is a separate contact outcome');
    });
  });
  it('labels a warm-air freezing-rain transition cue as liquid without claiming supercooling there', () => {
    eachRuntime((helper, kernel) => {
      const model = kernel.compute({ ...configFor(kernel, 'rain'), tempC: 0.1, midLevelTempC: 0.1, surfaceTempC: -1 });
      const context = helper.build(model), middle = context.nodes[1];
      expect(model.visualType).toBe('freezing-rain'); expect(kernel.phaseAt(model.config, 0.55)).toBe('freezing-rain');
      expect(middle.temperatureC).toBeGreaterThan(0); expect(middle.category).toBe('liquid');
      expect(middle.particleLabel).toBe('Liquid before surface contact');
    });
  });
  it.each([[0, '0 \u00B0C'], [1e-8, '1e-8 \u00B0C'], [-1e-8, '-1e-8 \u00B0C'], [0.0009998, '0.001 \u00B0C'], [-0.0009998, '-0.001 \u00B0C'], [12.345, '12.3 \u00B0C']])('preserves the sign and nonzero meaning of raw temperature %s', (temperature, text) => {
    eachRuntime((helper, kernel) => {
      const row = contextFor(helper, kernel, 'rain', { midLevelTempC: temperature }).nodes[1];
      expect(row.temperatureC).toBe(temperature); expect(row.temperatureText).toBe(text);
      if (temperature !== 0) expect(Number(row.temperatureText.replace(' \u00B0C', ''))).not.toBe(0);
    });
  });
  it('returns deeply frozen copied factory data and detached editable catalogs', () => {
    eachRuntime((helper, kernel) => {
      const model = kernel.compute(configFor(kernel, 'sleet')), context = helper.build(model);
      [context, context.setup, context.nodes, context.crossings, ...context.nodes, ...context.crossings].forEach(item => expect(Object.isFrozen(item)).toBe(true));
      model.thermalLayers.temperaturePoints[0].temperatureC = 15; model.thermalLayers.crossings[0].progress = 0.2;
      expect(context.nodes[0].temperatureC).toBe(-10); expect(context.crossings[0].progress).not.toBe(0.2);
      const nodes = helper.nodes(), choices = helper.choices(); nodes[0].id = 'bad'; choices[0].label = 'bad';
      expect(helper.nodes()[0].id).toBe('cloud'); expect(helper.choices()[0].label).toBe('Solid ice');
    });
  });
  it('rejects missing, nonfinite, inconsistent and inherited model readings rather than inventing a zero', () => {
    eachRuntime((helper, kernel) => {
      const original = kernel.compute(configFor(kernel, 'rain'));
      const malformed = [null, [], {}, Object.create(original), { ...original, config: null }, { ...original, thermalLayers: null }];
      for (const value of [null, NaN, Infinity, '0']) {
        const model = plain(original); model.thermalLayers.temperaturePoints[1].temperatureC = value; malformed.push(model);
      }
      const missing = plain(original); delete missing.config.midLevelTempC; malformed.push(missing);
      const wrongPosition = plain(original); wrongPosition.thermalLayers.temperaturePoints[1].progress = 0.5; malformed.push(wrongPosition);
      const wrongTemp = plain(original); wrongTemp.thermalLayers.temperaturePoints[1].temperatureC += 1; malformed.push(wrongTemp);
      const wrongCrossing = plain(original); wrongCrossing.thermalLayers.crossings = [{ kind: 'freeze', progress: 0.55 }]; malformed.push(wrongCrossing);
      malformed.forEach(model => expect(helper.build(model)).toBeNull());
    });
  });
});

describe('Thermal layer inspector: unscored context and metadata', () => {
  it('offers only the five authored material or availability descriptions', () => eachRuntime(helper => {
    expect(helper.choices().map(choice => choice.id)).toEqual(['solid', 'liquid', 'mixed', 'virga', 'none']);
    expect(helper.choices().map(choice => choice.label)).toEqual(['Solid ice', 'Liquid water', 'Mixture of ice and liquid', 'Evaporation aloft', 'No sustained falling particle']);
  }));
  it('supports actual cue categories and marks other valid choices for reconsideration', () => {
    eachRuntime((helper, kernel) => {
      for (const phase of ['rain', 'snow', 'sleet', 'freezing-rain', 'hail', 'mix', 'virga', 'clear']) {
        const context = contextFor(helper, kernel, phase);
        for (const row of context.nodes) {
          for (const choice of helper.choices()) {
            const state = helper.answer(helper.select({}, context, row.id), context, choice.id);
            expect(helper.read(state, context).result).toBe(choice.id === row.category ? 'supported' : 'retry');
          }
        }
      }
    });
  });
  it('preserves feedback for the same node and clears it for a different node', () => {
    eachRuntime((helper, kernel) => {
      const context = contextFor(helper, kernel), saved = freeze(accepted(helper, context));
      expect(helper.read(helper.select(saved, context, 'middle'), context).result).toBe('supported');
      expect(helper.read(helper.select(saved, context, 'surface'), context).result).toBe('waiting');
      expect(helper.select(saved, context, 'unknown')).toEqual(saved);
    });
  });
  it('preserves feedback while the live timeline, view, audio and notes change', () => {
    eachRuntime((helper, kernel) => {
      const context = contextFor(helper, kernel, 'sleet', { stormTime: 16 }), saved = accepted(helper, context);
      for (const stormTime of [0, 52, 86, 100]) {
        const other = contextFor(helper, kernel, 'sleet', { stormTime, viewMode: '3d', audio: true, paused: false, notes: 'Keep writing.' });
        expect(other.signature).toBe(context.signature); expect(helper.read(saved, other).result).toBe('supported');
      }
    });
  });
  it('clears stale feedback for resolved temperature or other model-setting changes while retaining the chosen node', () => {
    eachRuntime((helper, kernel) => {
      const context = contextFor(helper, kernel, 'sleet'), saved = accepted(helper, context, 'surface');
      for (const patch of [{ midLevelTempC: 2 }, { moisture: 50 }, { wind: 20 }]) {
        const other = contextFor(helper, kernel, 'sleet', patch), state = helper.read(saved, other);
        expect(other.signature).not.toBe(context.signature); expect(state.node).toBe('surface'); expect(state.answer).toBe('');
      }
    });
  });
  it('binds answers to the full authored node identity rather than trusting a saved result or unknown node', () => {
    eachRuntime((helper, kernel) => {
      const context = contextFor(helper, kernel), saved = accepted(helper, context), inherited = Object.create(saved), cycle = {};
      cycle.self = cycle;
      const malformed = [[], null, inherited, cycle,
        { ...saved, version: 2 }, { ...saved, identity: 'old' }, { ...saved, answer: 'water' },
        { ...saved, node: 'unknown' }, { ...saved, node: undefined }, { ...saved, node: 'cloud' }];
      malformed.forEach(raw => expect(helper.read(raw, context).answer).toBe(''));
      const fresh = helper.answer({ ...saved, extra: cycle, result: 'retry' }, context, 'solid');
      expect(Object.keys(fresh)).toEqual(['version', 'node', 'identity', 'answer']); expect(fresh.answer).toBe('solid');
    });
  });
  it('rejects invalid or cyclic contexts and never writes model or incoming metadata', () => {
    eachRuntime((helper, kernel) => {
      const context = contextFor(helper, kernel), altered = plain(context); altered.nodes[1].category = 'solid';
      const duplicate = plain(context); duplicate.nodes[0] = duplicate.nodes[1];
      const cycle = plain(context); cycle.setup.extra = cycle;
      for (const invalid of [null, [], Object.create(context), altered, duplicate, cycle]) {
        expect(helper.read({}, invalid)).toBeNull(); expect(helper.select({}, invalid, 'cloud')).toEqual({}); expect(helper.answer({}, invalid, 'solid')).toEqual({});
      }
      const raw = freeze(accepted(helper, context)), before = JSON.stringify(raw);
      expect(helper.select(raw, context, 'surface')).not.toBe(raw); expect(helper.answer(raw, context, 'solid')).not.toBe(raw);
      expect(JSON.stringify(raw)).toBe(before);
    });
  });
});

describe('Thermal layer inspector: exact preservation', () => {
  it('pins the prior uncommitted Storm runtime and exact source/public parity', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA); expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves existing calculations, live scenes, handlers, Storm moments, Groundwater and reward declarations exactly', () => {
    const original = exactDeclarations(baselineBytes.toString('utf8'));
    expect(Object.keys(original).sort()).toEqual([...PRESERVED].sort());
    sources.forEach(source => expect(exactDeclarations(source.text), source.path).toEqual(original));
  });
  it('preserves the complete public scientific kernel export', () => {
    const original = kernelAssignment(baselineBytes.toString('utf8'));
    sources.forEach(source => expect(kernelAssignment(source.text)).toBe(original));
  });
});

describe('Thermal layer inspector: shipped renderer and callbacks', () => {
  it('inspects every level with only inspector metadata writes and preserves all outer learner state', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), original = withoutInspector(harness.state());
      for (const id of ['cloud', 'surface', 'middle']) {
        harness.click('data-tl-select', id);
        expect(harness.state().wcThermalLayerInspector.node).toBe(id);
        expect(renderedNode(harness.render(), node => node.props['data-tl-detail'] === id).props['data-tl-phase'])
          .toBe(runtime.kernel.phaseAt(harness.state().precipHunt, id === 'cloud' ? 0 : id === 'middle' ? 0.55 : 1));
        expect(withoutInspector(harness.state())).toEqual(original);
        expect(harness.focus.at(-1)).toBe('wcThermalLayerDetailTitle');
      }
      expect(harness.calls.map(call => call.key)).toEqual(['wcThermalLayerInspector', 'wcThermalLayerInspector', 'wcThermalLayerInspector']);
    });
  });
  it('checks every actual native answer without scoring, notes, experiment or timeline changes', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), original = withoutInspector(harness.state());
      const code = runtime.kernel.phaseAt(harness.state().precipHunt, 0.55);
      for (const choice of ['solid', 'liquid', 'mixed', 'virga', 'none']) {
        harness.click('data-tl-answer', choice);
        const result = renderedNode(harness.render(), node => node.props['data-tl-result']);
        expect(result.props['data-tl-result']).toBe(choice === categoryFor(code) ? 'supported' : 'retry');
        expect(result.props.role).toBe('status'); expect(result.props['aria-atomic']).toBe(true);
        expect(harness.focus.at(-1)).toBe('wcThermalLayerFeedbackTitle');
        expect(withoutInspector(harness.state())).toEqual(original);
      }
      expect(harness.calls.every(call => call.key === 'wcThermalLayerInspector')).toBe(true);
    });
  });
  it('retains actual renderer feedback for the same level and clears it for another level', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime);
      const category = categoryFor(runtime.kernel.phaseAt(harness.state().precipHunt, 0.55));
      harness.click('data-tl-answer', category); harness.click('data-tl-select', 'middle');
      expect(renderedNode(harness.render(), node => node.props['data-tl-result']).props['data-tl-result']).toBe('supported');
      harness.click('data-tl-select', 'cloud');
      expect(renderedNode(harness.render(), node => node.props['data-tl-result']).props['data-tl-result']).toBe('waiting');
    });
  });
  it('renders changed weather evidence with stale feedback hidden and without rewriting saved metadata', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime);
      harness.click('data-tl-answer', categoryFor(runtime.kernel.phaseAt(harness.state().precipHunt, 0.55)));
      const saved = harness.state().wcThermalLayerInspector;
      harness.replace({ precipHunt: { ...harness.state().precipHunt, ...runtime.kernel.presets.virga } });
      const current = harness.state(), count = harness.calls.length, tree = harness.render();
      expect(renderedNode(tree, node => node.props['data-tl-result']).props['data-tl-result']).toBe('waiting');
      expect(renderedText(renderedNode(tree, node => node.props['data-tl-particle-reading']))).toBe('Evaporation aloft');
      expect(harness.state()).toBe(current); expect(harness.state().wcThermalLayerInspector).toBe(saved); expect(harness.calls).toHaveLength(count);
    });
  });
  it('keeps accepted renderer feedback while live playback advances through its positions', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime);
      harness.click('data-tl-answer', categoryFor(runtime.kernel.phaseAt(harness.state().precipHunt, 0.55)));
      for (const stormTime of [0, 52, 86, 100]) {
        harness.replace({ precipHunt: { ...harness.state().precipHunt, stormTime, stormAutoPlay: true } });
        const current = harness.state(), count = harness.calls.length;
        expect(renderedNode(harness.render(), node => node.props['data-tl-result']).props['data-tl-result']).toBe('supported');
        expect(harness.state()).toBe(current); expect(harness.calls).toHaveLength(count);
      }
    });
  });
  it('shows real cues, raw air readings and a separate surface outcome for all eight current phase types', () => {
    shipped.forEach(runtime => {
      for (const phase of ['rain', 'snow', 'sleet', 'freezing-rain', 'hail', 'mix', 'virga', 'clear']) {
        const harness = rendererHarness(runtime, { precipHunt: { ...configFor(runtime.kernel, phase), stormTime: 52 } });
        const model = runtime.kernel.compute(harness.state().precipHunt), tree = harness.render();
        for (const [index, id] of ['cloud', 'middle', 'surface'].entries()) {
          const button = renderedNode(tree, node => node.props['data-tl-select'] === id);
          expect(button.props['data-tl-temperature']).toBe(model.thermalLayers.temperaturePoints[index].temperatureC);
          expect(button.props['data-tl-phase']).toBe(runtime.kernel.phaseAt(model.config, [0, 0.55, 1][index]));
          expect(button.props['aria-controls']).toBe('wcThermalLayerDetail');
        }
        const surface = renderedNode(tree, node => node.props['data-tl-surface']);
        expect(surface.props['data-tl-surface']).toBe(phase); expect(surface.props['data-tl-reaches-ground']).toBe(String(model.reachesGround));
        expect(renderedText(tree)).toContain('not measured altitudes or fall times');
        expect(renderedText(tree)).toContain('Crossing 0°C does not guarantee an instantaneous change of state.');
        if (phase === 'freezing-rain') expect(renderedText(surface)).toContain('particle arrives as liquid');
        if (phase === 'virga') expect(renderedText(surface)).toContain('No precipitation arrives at the surface');
      }
    });
  });
});

describe('Thermal layer inspector: exact air diagram', () => {
  const cases = [
    { name: 'warming near the cloud base', temperatures: [-0.1, 10, 10], crossings: [[0.55 * 0.1 / 10.1, 'warming']], touches: [], bands: [] },
    { name: 'warming near the surface', temperatures: [-10, -10, 0.1], crossings: [[0.55 + 0.45 * 10 / 10.1, 'warming']], touches: [], bands: [] },
    { name: 'two crossings close to the middle level', temperatures: [10, -0.000001, 10], crossings: [[0.55 * 10 / 10.000001, 'cooling'], [0.55 + 0.45 * 0.000001 / 10.000001, 'warming']], touches: [], bands: [] },
    { name: 'a warm tangent at the middle level', temperatures: [5, 0, 5], crossings: [], touches: [0.55], bands: [] },
    { name: 'a cold tangent at the middle level', temperatures: [-5, 0, -5], crossings: [], touches: [0.55], bands: [] },
    { name: 'one full crossing through an exact zero middle level', temperatures: [5, 0, -5], crossings: [[0.55, 'cooling']], touches: [], bands: [] },
    { name: 'a zero cloud endpoint', temperatures: [0, 5, 5], crossings: [], touches: [0], bands: [] },
    { name: 'a zero surface endpoint', temperatures: [5, 5, 0], crossings: [], touches: [1], bands: [] },
    { name: 'an upper zero span', temperatures: [0, 0, 5], crossings: [], touches: [], bands: [[0, 0.55]] },
    { name: 'a lower zero span', temperatures: [5, 0, 0], crossings: [], touches: [], bands: [[0.55, 1]] },
    { name: 'an entirely zero profile', temperatures: [0, 0, 0], crossings: [], touches: [], bands: [[0, 1]] },
    { name: 'a profile entirely above zero', temperatures: [5, 10, 15], crossings: [], touches: [], bands: [] },
  ];
  it.each(cases)('distinguishes $name from particle transition bands', ({ temperatures, crossings, touches, bands }) => {
    shipped.forEach(runtime => {
      const [tempC, midLevelTempC, surfaceTempC] = temperatures;
      const harness = rendererHarness(runtime, { precipHunt: { ...runtime.kernel.presets.gentleRain, tempC, midLevelTempC, surfaceTempC } });
      const before = plain(harness.state()), tree = harness.render();
      const cloud = renderedNode(tree, node => node.props['data-tl-point'] === 'cloud');
      const surface = renderedNode(tree, node => node.props['data-tl-point'] === 'surface');
      const plottedY = progress => cloud.props.cy + progress * (surface.props.cy - cloud.props.cy);
      const zeroX = renderedNode(tree, node => node.props['data-tl-boundary'] === 'zero').props.x1;
      const plottedCrossings = renderedNodes(tree, node => node.props['data-tl-crossing']);
      expect(plottedCrossings).toHaveLength(crossings.length);
      plottedCrossings.forEach((node, index) => {
        const [progress, direction] = crossings[index];
        expect(node.props['data-tl-progress']).toBeCloseTo(progress, 12);
        expect(node.props['data-tl-crossing']).toBe(direction);
        const line = renderedNode(node, child => child.tag === 'line');
        const mark = renderedNode(node, child => child.tag === 'rect');
        expect(line.props.y1).toBeCloseTo(plottedY(progress), 10);
        expect(line.props.y2).toBeCloseTo(plottedY(progress), 10);
        expect(mark.props.x + mark.props.width / 2).toBe(zeroX);
        expect(mark.props.y + mark.props.height / 2).toBeCloseTo(plottedY(progress), 10);
      });
      expect(renderedNodes(tree, node => Object.hasOwn(node.props, 'data-tl-touch')).map(node => node.props['data-tl-touch'])).toEqual(touches);
      const zeroBands = renderedNodes(tree, node => Object.hasOwn(node.props, 'data-tl-zero-band'));
      expect(zeroBands.map(node => [node.props['data-tl-zero-band'], node.props['data-tl-zero-end']])).toEqual(bands);
      zeroBands.forEach((node, index) => {
        expect(node.props.x1).toBe(zeroX); expect(node.props.x2).toBe(zeroX);
        expect(node.props.y1).toBeCloseTo(plottedY(bands[index][0]), 10);
        expect(node.props.y2).toBeCloseTo(plottedY(bands[index][1]), 10);
      });
      const context = runtime.helper.build(runtime.kernel.compute(harness.state().precipHunt));
      expect(renderedText(renderedNode(tree, node => node.props['data-tl-air-summary']))).toBe(runtime.airProfile(context.nodes).summary);
      if (temperatures.every(value => value === 0)) expect(renderedText(tree)).toContain('Air stays at 0°C throughout the profile.');
      expect(harness.state()).toEqual(before); expect(harness.calls).toEqual([]);
    });
  });
  it('keeps a warm zero touch separate from model transition bands and particle answers', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime, { precipHunt: { ...runtime.kernel.presets.gentleRain, tempC: 5, midLevelTempC: 0, surfaceTempC: 5 } });
      const model = runtime.kernel.compute(harness.state().precipHunt), context = runtime.helper.build(model);
      expect(context.crossings).toHaveLength(2);
      const middle = context.nodes[1];
      harness.click('data-tl-answer', middle.category);
      const tree = harness.render();
      expect(renderedNodes(tree, node => node.props['data-tl-crossing'])).toHaveLength(0);
      expect(renderedNodes(tree, node => Object.hasOwn(node.props, 'data-tl-touch'))).toHaveLength(1);
      expect(renderedNode(tree, node => node.props['data-tl-detail']).props['data-tl-phase']).toBe(middle.particleCode);
      expect(renderedNode(tree, node => node.props['data-tl-result']).props['data-tl-result']).toBe('supported');
      expect(plain(runtime.helper.build(model).crossings)).toEqual(plain(context.crossings));
    });
  });
  it('links each chosen level to its chart label, selected point, and readable selection', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), before = withoutInspector(harness.state());
      ['cloud', 'middle', 'surface'].forEach((id, index) => {
        harness.click('data-tl-select', id);
        const tree = harness.render(), letter = ['A', 'B', 'C'][index];
        const labels = renderedNodes(tree, node => node.props['data-tl-level-label']);
        expect(labels).toHaveLength(3);
        expect(labels.filter(node => node.props['data-selected'] === 'true').map(node => node.props['data-tl-level-label'])).toEqual([id]);
        expect(renderedText(labels[index])).toContain(letter);
        expect(renderedText(renderedNode(tree, node => node.props['data-tl-chart-selection'] === id))).toContain('Selected: ' + letter);
        expect(renderedNode(tree, node => node.props['data-tl-point'] === id).props['data-selected']).toBe('true');
        expect(renderedNode(tree, node => node.props['data-tl-select'] === id).props['aria-pressed']).toBe(true);
        expect(withoutInspector(harness.state())).toEqual(before);
        expect(harness.focus.at(-1)).toBe('wcThermalLayerDetailTitle');
      });
    });
  });
});

export const waterCycleThermalLayerVerification = { baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED, exactDeclarations, kernelAssignment };
