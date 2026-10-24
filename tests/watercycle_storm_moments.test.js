import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const TEST_PATH = 'tests/watercycle_storm_moments.test.js';
// Freeze reference re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words): later
// published passes (585a61ba2, 79e3e5eae) changed preserved declarations on purpose. The original
// pass baseline remains at reports/watercycle-storm-moments/baseline-runtime.js.
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
  'stormExperiment', 'stormSavedPairs', 'stormVariables', 'setStormExperiment',
  'stormExperimentFocus', 'pinStormSetup', 'startStormExperiment', 'restoreStormControls',
  'saveStormComparison', 'downloadStormComparison', 'stormComparisonLabel',
  'stormComparisonValue', 'renderStormSetup', 'renderStormExperiment', 'setPrecipControl',
  'setPrecipViewMode', 'setPrecipCameraFocus', 'applyPrecipPreset', 'resetPrecipLab',
  'logPrecipObservation', 'openPrecipitationIn3d', 'precipCanvasRef', 'precip3dRef',
  'scheduleStormLifecycleTick', 'canvasRef', 'journey3dRef', 'onWcKey',
  'setJourneyReplayProgress', 'resumeLiveJourney', 'chooseJourneyPath',
  'journeyReplaySegmentAt', 'handleJourney3dKey', 'handleJourney3dSceneClick',
  'controlJourneyCamera', 'beginWcQuickJourney', 'wcLandResponse', 'estimateWcLandIndices',
  'estimateWcRouteShares', 'WCGroundwaterLens', 'WC_GROUNDWATER_LENS_STYLE',
  'renderWcGroundwaterLens', 'renderWcCheckPores', 'WCJourneyChapters', 'renderWcJourneyChapters',
  'WCCloudEvidence', 'renderCloudFieldGuide', 'WCExploreNotebook', 'WCCheckInvestigation',
  'WCProcessCompare', 'MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE',
  'STAGE_HYDROLOGIC_TIME_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE', 'checkWaterCycleChallenges',
  'studyVocab', 'selectStage', 'wcQuizBank', 'wcQuizQuestion',
];
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
function freeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value); Object.values(value).forEach(item => freeze(item, seen)); Object.freeze(value);
  }
  return value;
}
function walkNodes(tree, visit) {
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
// The prior groundwater runtime already contains the reviewed illustration and
// adapter. The range workspace adds one renderer call; exclude exactly that
// additive line while preserving every prior byte of the experiment body.
function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!PRESERVED.includes(name)) return;
    if (result[name]) throw new Error('Non-unique production anchor: ' + name);
    const declaration = normalized.slice(node.start, node.end);
    result[name] = name === 'renderStormExperiment'
      ? declaration.replace('\n                renderStormRange(),', '')
      : declaration;
  });
  return result;
}
function scoredNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type) || node.body.type !== 'BlockStatement') return;
    const locals = node.body.body.filter(statement => statement.type === 'VariableDeclaration').flatMap(statement => statement.declarations.map(declaration => declaration.id.name));
    const kind = locals.includes('newStreak') && locals.includes('nextQuizCorrectCount') ? 'quiz' : locals.includes('nextMythsDone') ? 'myth' : '';
    if (!kind) return;
    if (result[kind]) throw new Error('Non-unique scored callback: ' + kind);
    result[kind] = node.body.body.filter(statement => {
      const value = normalized.slice(statement.start, statement.end);
      return /\b(newStreak|newAttempts|nextQuizCorrectCount|nextMythsDone|nextState)\b/.test(value) ||
        statement.type === 'IfStatement' && /awardStemXP/.test(value) ||
        statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' && statement.expression.callee.name === 'updMulti';
    }).map(statement => normalized.slice(statement.start, statement.end)).join('\n');
  });
  return result;
}
function timelineNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = [];
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) return;
    let direct = false;
    function visit(child) {
      if (!child || typeof child !== 'object') return;
      if (child !== node && ['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration'].includes(child.type)) return;
      if (child.type === 'CallExpression' && child.callee.type === 'Identifier' && child.callee.name === 'setStormLifecycleTime') direct = true;
      for (const value of Object.values(child)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(node);
    if (direct) result.push(normalized.slice(node.start, node.end));
  });
  return result.sort();
}
function kernelExport(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = [];
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const left = node.type === 'AssignmentExpression' && node.left;
    if (left && left.type === 'MemberExpression' && !left.computed && left.object.name === 'window' && left.property.name === 'WaterCyclePrecipitationKernel') result.push(normalized.slice(node.start, node.end));
  });
  if (result.length !== 1) throw new Error('Missing or duplicate scientific kernel export');
  // These two additive exports expose the separately tested sweep. Their exact
  // names and targets are allowed; all prior export bytes still compare below.
  return result[0]
    .replace('\n    sweepInputs: WC_PRECIP_SWEEP_INPUTS,', '')
    .replace('\n    sweep: wcPrecipSweep,', '');
}
export const waterCycleStormMomentsVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED,
  productionNodes, scoredNodes, timelineNodes, kernelExport,
};

const loadedAt = new Date().toISOString();
const sources = [SOURCE_PATH, MIRROR_PATH].map(path => ({ path, bytes: readFileSync(path), text: readFileSync(path, 'utf8') }));
const baselineBytes = readFileSync(BASELINE_PATH);
const loadedTestBytes = readFileSync(TEST_PATH);
afterAll(() => {
  if (process.env.WATER_CYCLE_STORM_MOMENTS_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_STORM_MOMENTS_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTestBytes), bytes: loadedTestBytes.length },
  }, null, 2) + '\n');
});
const sourceTrees = new WeakMap();
const sourceInitializers = new WeakMap();
const sourceRenderers = new WeakMap();
function sourceTree(source) {
  if (!sourceTrees.has(source)) sourceTrees.set(source, parse(source.text, { ecmaVersion: 'latest' }));
  return sourceTrees.get(source);
}
function initializer(source, name) {
  if (!sourceInitializers.has(source)) sourceInitializers.set(source, new Map());
  const cached = sourceInitializers.get(source);
  if (cached.has(name)) return cached.get(name);
  let result;
  walkNodes(sourceTree(source), node => {
    if (node.type !== 'VariableDeclarator' || !node.id || node.id.name !== name) return;
    if (result) throw new Error('Duplicate actual helper: ' + name);
    result = source.text.slice(node.init.start, node.init.end);
  });
  if (!result) throw new Error('Missing actual ' + name + ' in ' + source.path);
  cached.set(name, result);
  return result;
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
function loadHelper(source, kernel, compute = kernel.compute) {
  return runInNewContext('(' + initializer(source, 'WCStormMoments') + ')', {
    wcPrecipSetupSnapshot: kernel.setupSnapshot, computeWcPrecipitationModel: compute,
  }, { filename: source.path + ':storm-moments', timeout: 1000 });
}
const shipped = sources.map(source => {
  const kernel = loadKernel(source);
  return { source, kernel, helper: loadHelper(source, kernel) };
});
function each(callback) { shipped.forEach(({ helper, kernel, source }) => callback(helper, kernel, source)); }
const STAGES = ['developing', 'mature', 'weakening'];
const TIMES = [16, 52, 86];
const METRICS = ['snow', 'glaze', 'hail', 'puddling', 'runoff'];
const CHOICES = ['split', 'both_lower', 'no_activity_drop'];
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
function resign(context) {
  context.signature = JSON.stringify({ version: 1, question: 'mature-to-weakening', setup: context.setup, rows: context.rows });
  return context;
}
function withReadings(context, matureActivity, weakeningActivity, matureGround, weakeningGround, metric = 'puddling') {
  const changed = plain(context);
  changed.rows[1].intensity = matureActivity; changed.rows[2].intensity = weakeningActivity;
  changed.rows[1].accumulation[metric] = matureGround; changed.rows[2].accumulation[metric] = weakeningGround;
  return freeze(resign(changed));
}
function rendererSource(source) {
  if (sourceRenderers.has(source)) return sourceRenderers.get(source);
  let result;
  walkNodes(sourceTree(source), node => {
    if (node.type !== 'FunctionDeclaration' || node.id.name !== 'renderStormMoments') return;
    if (result) throw new Error('Duplicate actual Storm moments renderer');
    result = source.text.slice(node.start, node.end);
  });
  if (!result) throw new Error('Missing actual Storm moments renderer');
  sourceRenderers.set(source, result);
  return result;
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
  const result = renderedNodes(tree, predicate);
  if (result.length !== 1) throw new Error('Expected one actual rendered node; found ' + result.length);
  return result[0];
}
function renderedText(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree && typeof tree === 'object' ? tree.children.map(renderedText).join(' ').replace(/\s+/g, ' ').trim() : '';
}
// Execute the shipped renderer and its real callbacks. This small h adapter
// records the HTML tree; native focus, layout and input behavior have separate
// browser coverage. It never substitutes the scientific kernel or choice logic.
function rendererHarness(shippedRuntime, initial = {}, helper = shippedRuntime.helper) {
  const { source, kernel } = shippedRuntime;
  let state = freeze({
    precipHunt: { ...kernel.presets.summerStorm, stormTime: 27, stormAutoPlay: false, viewMode: '2d',
      paused: true, log: [{ notes: 'Retain observation.' }], hypothesis: 'My hypothesis.',
      experiment: { setupA: { moisture: 65 }, saved: [{ explanation: 'Retain reasoning.' }] } },
    wcGroundwaterLens: { view: 'saturated', answer: 'pores' }, wcJourney: { route: 'land' },
    notes: { evidence: 'Retain notebook.' }, quizAttempts: 5, quizCorrectCount: 3, mythsDone: ['vapor'],
    reward: { xp: 120 }, theme: 'dark', unrelated: { nested: ['Keep all state.'] }, ...initial,
  });
  const calls = [], focusCalls = [];
  const h = (tag, props, ...children) => ({ tag, props: props || {},
    children: children.flat(Infinity).filter(child => child !== undefined && child !== null && typeof child !== 'boolean') });
  const style = runInNewContext('(' + initializer(source, 'WC_STORM_MOMENTS_STYLE') + ')');
  function render() {
    const fn = runInNewContext('(' + rendererSource(source) + ')', {
      h, d: state, precipConfig: kernel.normalize(state.precipHunt), WCStormMoments: helper,
      WC_STORM_MOMENTS_STYLE: style, isDark: state.theme === 'dark', isContrast: false,
      upd(key, value) { calls.push({ key, value }); state = freeze({ ...state, [key]: value }); },
      focusWcComparisonTarget(id) { focusCalls.push(id); },
      // The shipped renderer reads copy through the tool's __alloT(key, fallback) wrapper.
      __alloT: (_key, fallback) => fallback,
    }, { filename: source.path + ':actual-storm-renderer', timeout: 1000 });
    return fn();
  }
  return { render, calls, focusCalls, state: () => state,
    replace(patch) { state = freeze({ ...state, ...patch }); },
    click(field, value) { renderedNode(render(), node => node.tag === 'button' && node.props[field] === value).props.onClick(); },
    metric(value) { renderedNode(render(), node => node.tag === 'select' && node.props.id === 'wcStormMomentMetric').props.onChange({ target: { value } }); },
  };
}
function withoutStormChoices(state) {
  const value = { ...state }; delete value.wcStormMoments; return plain(value);
}

describe('Storm moments: actual fixed scientific evidence', () => {
  it('extracts the actual bounded helper from both shipped runtimes', () => {
    each(helper => expect(Object.keys(helper).sort()).toEqual(['answer', 'build', 'choices', 'compare', 'currentCopy', 'metrics', 'read', 'selectMetric', 'selectStage', 'stages']));
  });
  it('returns detached catalogs with stable stage positions, response tracks and exhaustive choices', () => {
    each(helper => {
      const stages = helper.stages(), metrics = helper.metrics(), choices = helper.choices();
      expect(Array.from(stages, item => item.id)).toEqual(STAGES); expect(Array.from(stages, item => item.time)).toEqual(TIMES);
      expect(Array.from(metrics, item => item.id)).toEqual(METRICS); expect(Array.from(choices, item => item.id)).toEqual(CHOICES);
      stages[0].time = 99; metrics[0].id = 'water_budget'; choices[0].id = 'always_split';
      expect(helper.stages()[0].time).toBe(16); expect(helper.metrics()[0].id).toBe('snow'); expect(helper.choices()[0].id).toBe('split');
    });
  });
  it.each([
    ['rain', 'puddling'], ['snow', 'snow'], ['sleet', 'snow'], ['freezing-rain', 'glaze'],
    ['hail', 'hail'], ['mix', 'snow'], ['virga', 'runoff'], ['clear', 'runoff'],
  ])('derives every %s row from the unchanged actual kernel and defaults to %s', (phase, defaultMetric) => {
    each((helper, kernel) => {
      const input = freeze({ ...configFor(kernel, phase), stormTime: 4, notes: { evidence: 'Keep this.' } });
      const before = JSON.stringify(input), context = helper.build(input);
      expect(context.defaultMetric).toBe(defaultMetric); expect(context.setup.stormTime).toBe(52);
      expect(Array.from(context.rows, row => row.id)).toEqual(STAGES);
      context.rows.forEach((row, position) => {
        const model = kernel.compute({ ...context.setup, stormTime: TIMES[position] });
        expect(row.time).toBe(TIMES[position]); expect(row.visualType).toBe(phase);
        expect(row.intensity).toBe(Math.round(model.relativeIntensity));
        expect(row.phaseLabel).toBe(model.phaseLabel); expect(row.reachesGround).toBe(model.reachesGround === true);
        expect(row.lightningEligible).toBe(model.lightningEligible === true);
        METRICS.forEach(metric => expect(row.accumulation[metric]).toBe(Math.round(model.lifecycle.accumulation[metric])));
      });
      expect(JSON.stringify(input)).toBe(before); expect(helper.read(null, context).result).toBe('waiting');
    });
  });
  it('exposes the actual summer-storm fall and ground indices without treating them as water-budget shares', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm);
      expect(Array.from(context.rows, row => row.intensity)).toEqual([38, 64, 41]);
      expect(Array.from(context.rows, row => row.accumulation.puddling)).toEqual([4, 24, 43]);
      expect(Array.from(context.rows, row => row.accumulation.runoff)).toEqual([3, 17, 32]);
      expect(plain(helper.compare(context, 'puddling'))).toEqual({ matureIntensity: 64, weakeningIntensity: 41, matureGround: 24, weakeningGround: 43, correct: 'split' });
    });
  });
  it.each(['virga', 'clear'])('does not invent surface water for the %s setup', phase => {
    each((helper, kernel) => {
      const context = helper.build(configFor(kernel, phase));
      context.rows.forEach(row => {
        expect(row.reachesGround).toBe(false); METRICS.forEach(metric => expect(row.accumulation[metric]).toBe(0));
      });
      if (phase === 'virga') expect(context.rows[1].intensity).toBeGreaterThan(0);
      else expect(context.rows[1].intensity).toBe(0);
      const compared = helper.compare(context, 'runoff');
      expect(compared.correct).toBe(phase === 'virga' ? 'split' : 'no_activity_drop');
    });
  });
  it('freezes the canonical setup, every snapshot and the detached evidence context', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm);
      expect(Object.isFrozen(context)).toBe(true); expect(Object.isFrozen(context.setup)).toBe(true);
      expect(Object.isFrozen(context.rows)).toBe(true);
      context.rows.forEach(row => { expect(Object.isFrozen(row)).toBe(true); expect(Object.isFrozen(row.accumulation)).toBe(true); });
      expect(() => { context.rows[1].intensity = 0; }).toThrow();
      expect(() => { context.setup.moisture = 0; }).toThrow();
    });
  });
  it('ignores live time, playback, display, sound and writing when binding a fixed comparison', () => {
    each((helper, kernel) => {
      const base = { ...kernel.presets.summerStorm, stormTime: 0 };
      const other = { ...base, stormTime: 100, stormAutoPlay: true, paused: true, viewMode: '3d', cameraFocus: 'immersive',
        soundEnabled: true, theme: 'dark', environment: 'beach', hypothesis: 'My hypothesis.', explanation: 'My reasoning.',
        log: [{ stormTime: 99 }], experiment: { setupA: { stormTime: 10 }, saved: [{ notes: 'Retain.' }] } };
      expect(helper.build(other).signature).toBe(helper.build(base).signature);
      expect(helper.build(other).setup).not.toHaveProperty('hypothesis');
      expect(helper.build(other).setup).not.toHaveProperty('stormAutoPlay');
    });
  });
  it('retains the normalized resolved middle temperature and binds changed thermal evidence', () => {
    each(helper => {
      const context = helper.build({ tempC: -10, surfaceTempC: 10 });
      expect(context.setup.midLevelTempC).toBe(1);
      expect(helper.build({ ...context.setup, stormTime: 91 }).signature).toBe(context.signature);
      const changed = helper.build({ ...context.setup, surfaceTempC: 20 });
      expect(changed.setup.midLevelTempC).toBe(1); expect(changed.signature).not.toBe(context.signature);
      expect(context.signature).toBe(JSON.stringify({ version: 1, question: 'mature-to-weakening', setup: context.setup, rows: context.rows }));
    });
  });
});

describe('Storm moments: displayed comparison choices', () => {
  it.each([
    ['activity lower / ground higher', 64, 41, 24, 43, 'split'],
    ['activity lower / ground equal', 64, 41, 0, 0, 'split'],
    ['both lower', 64, 41, 43, 24, 'both_lower'],
    ['activity equal / ground higher', 41, 41, 24, 43, 'no_activity_drop'],
    ['activity equal / ground lower', 41, 41, 43, 24, 'no_activity_drop'],
    ['activity higher / ground lower', 41, 64, 43, 24, 'no_activity_drop'],
    ['all zero', 0, 0, 0, 0, 'no_activity_drop'],
  ])('partitions the displayed evidence for %s', (_label, a, b, ga, gb, correct) => {
    each((helper, kernel) => {
      const context = withReadings(helper.build(kernel.presets.gentleRain), a, b, ga, gb);
      expect(helper.compare(context, 'puddling').correct).toBe(correct);
      CHOICES.forEach(id => {
        const record = helper.answer(null, context, id);
        expect(helper.read(record, context).result).toBe(id === correct ? 'supported' : 'retry');
      });
    });
  });
  it('rounds activity before comparing so hidden fractional changes cannot turn a displayed tie into a wrong answer', () => {
    shipped.forEach(({ source, kernel }) => {
      const helper = loadHelper(source, kernel, config => {
        const actual = kernel.compute(config);
        return { ...actual, relativeIntensity: config.stormTime === 52 ? 50.4 : config.stormTime === 86 ? 50.1 : 30.1 };
      });
      const context = helper.build(kernel.presets.gentleRain);
      expect(Array.from(context.rows, row => row.intensity)).toEqual([30, 50, 50]);
      expect(helper.compare(context, 'puddling').correct).toBe('no_activity_drop');
    });
  });
  it('uses separately rounded response readings when a raw rise is displayed as no change', () => {
    shipped.forEach(({ source, kernel }) => {
      const helper = loadHelper(source, kernel, config => {
        const actual = kernel.compute(config), mature = config.stormTime === 52, weakening = config.stormTime === 86;
        return { ...actual, relativeIntensity: mature ? 40.6 : weakening ? 40.4 : 20,
          lifecycle: { ...actual.lifecycle, accumulation: { ...actual.lifecycle.accumulation, puddling: mature ? 5.4 : weakening ? 5.49 : 0 } } };
      });
      const context = helper.build(kernel.presets.gentleRain);
      expect(plain(helper.compare(context, 'puddling'))).toEqual({ matureIntensity: 41, weakeningIntensity: 40, matureGround: 5, weakeningGround: 5, correct: 'split' });
    });
  });
  it.each(['mature intensity', 'weakening intensity', 'mature ground', 'weakening ground'])('marks missing %s unavailable instead of inventing zero', endpoint => {
    each((helper, kernel) => {
      const values = [64, 41, 24, 43]; values[['mature intensity', 'weakening intensity', 'mature ground', 'weakening ground'].indexOf(endpoint)] = null;
      const context = withReadings(helper.build(kernel.presets.gentleRain), ...values);
      expect(helper.compare(context, 'puddling')).toBeNull();
      expect(helper.read(null, context)).toMatchObject({ result: 'unavailable', answer: '' });
      expect(helper.read(helper.answer(null, context, 'split'), context)).toMatchObject({ result: 'unavailable', answer: '' });
    });
  });
  it('normalizes invalid model readings to explicit null before displaying any comparison', () => {
    shipped.forEach(({ source, kernel }) => {
      for (const reading of [undefined, '45', NaN, Infinity, -1, 100.4]) {
        const helper = loadHelper(source, kernel, config => {
          const actual = kernel.compute(config);
          return { ...actual, relativeIntensity: reading,
            lifecycle: { ...actual.lifecycle, accumulation: { ...actual.lifecycle.accumulation, puddling: reading } } };
        });
        const context = helper.build(kernel.presets.gentleRain);
        context.rows.forEach(row => { expect(row.intensity).toBeNull(); expect(row.accumulation.puddling).toBeNull(); });
        expect(helper.read(null, context).result).toBe('unavailable');
      }
    });
  });
});

describe('Storm moments: canonical context validation', () => {
  it.each([
    ['missing', undefined], ['null', null], ['number', 1], ['string', 'context'], ['array', []],
    ['empty object', {}], ['BigInt', 2n],
  ])('rejects malformed context (%s) safely for reading and every mutation', (_label, context) => {
    each(helper => {
      expect(helper.read(null, context)).toBeNull(); expect(helper.compare(context, 'puddling')).toBeNull();
      expect(plain(helper.selectStage(null, context, 'mature'))).toEqual({});
      expect(plain(helper.selectMetric(null, context, 'runoff'))).toEqual({});
      expect(plain(helper.answer(null, context, 'split'))).toEqual({});
    });
  });
  it('rejects missing, duplicate, shuffled and mistimed fixed snapshots even with a rewritten signature', () => {
    each((helper, kernel) => {
      const original = helper.build(kernel.presets.gentleRain);
      const cases = [];
      let context = plain(original); context.rows.pop(); cases.push(context);
      context = plain(original); context.rows[2] = context.rows[1]; cases.push(context);
      context = plain(original); [context.rows[0], context.rows[1]] = [context.rows[1], context.rows[0]]; cases.push(context);
      context = plain(original); context.rows[1].time = 53; cases.push(context);
      context = plain(original); context.rows[2].label = 'Dissipating'; cases.push(context);
      cases.forEach(candidate => { resign(candidate); expect(helper.read(null, candidate)).toBeNull(); expect(helper.compare(candidate, 'puddling')).toBeNull(); });
    });
  });
  it('requires complete own integer-or-null readings and known row interpretation fields', () => {
    each((helper, kernel) => {
      const original = helper.build(kernel.presets.gentleRain);
      const candidates = [];
      for (const value of [undefined, '45', NaN, Infinity, -1, 101, 50.4]) {
        const candidate = plain(original); candidate.rows[1].intensity = value; candidates.push(candidate);
      }
      for (const metric of METRICS) { const candidate = plain(original); delete candidate.rows[1].accumulation[metric]; candidates.push(candidate); }
      for (const [field, value] of [['visualType', 'drizzle'], ['phaseLabel', null], ['reachesGround', 1], ['lightningEligible', 'false']]) {
        const candidate = plain(original); candidate.rows[1][field] = value; candidates.push(candidate);
      }
      candidates.forEach(candidate => { resign(candidate); expect(helper.read(null, candidate)).toBeNull(); });
      const validNull = plain(original); validNull.rows[0].intensity = null; resign(validNull);
      expect(helper.read(null, validNull).result).toBe('waiting');
    });
  });
  it('rejects inherited contexts, inherited row fields and arrays carrying named records', () => {
    each((helper, kernel) => {
      const original = helper.build(kernel.presets.gentleRain);
      expect(helper.read(null, Object.create(original))).toBeNull();
      for (const field of ['id', 'label', 'time', 'intensity', 'accumulation', 'visualType', 'phaseLabel', 'reachesGround', 'lightningEligible']) {
        const candidate = plain(original), values = candidate.rows[1];
        const row = Object.create({ [field]: values[field] }); delete values[field]; Object.assign(row, values); candidate.rows[1] = row;
        resign(candidate); expect(helper.read(null, candidate)).toBeNull();
      }
      const candidate = plain(original), array = []; Object.assign(array, candidate.rows[1]); candidate.rows[1] = array; resign(candidate);
      expect(helper.read(null, candidate)).toBeNull();
      const inheritedTrack = plain(original); inheritedTrack.rows[1].accumulation = Object.create(original.rows[1].accumulation); resign(inheritedTrack);
      expect(helper.read(null, inheritedTrack)).toBeNull();
    });
  });
  it('requires the complete serialized evidence, canonical normalized setup at52 and phase-derived default', () => {
    each((helper, kernel) => {
      const original = helper.build(kernel.presets.gentleRain), candidates = [];
      let context = plain(original); context.signature += 'suffix'; candidates.push(context);
      context = plain(original); context.rows[1].intensity += 1; candidates.push(context);
      context = plain(original); context.setup.stormTime = 16; resign(context); candidates.push(context);
      context = plain(original); context.setup.unknown = 'forged'; resign(context); candidates.push(context);
      context = plain(original); delete context.setup.midLevelTempC; resign(context); candidates.push(context);
      context = plain(original); context.defaultMetric = 'runoff'; candidates.push(context);
      context = plain(original); context.setup.moisture = 1000; resign(context); candidates.push(context);
      candidates.forEach(candidate => expect(helper.read(null, candidate)).toBeNull());
    });
  });
  it('rejects cyclic canonical rows or setup without throwing or traversing unrelated metadata', () => {
    each((helper, kernel) => {
      const candidate = plain(helper.build(kernel.presets.gentleRain)); candidate.setup.self = candidate.setup;
      expect(() => helper.read(null, candidate)).not.toThrow(); expect(helper.read(null, candidate)).toBeNull();
      const rows = plain(helper.build(kernel.presets.gentleRain)); rows.rows[1].self = rows.rows[1];
      expect(() => helper.compare(rows, 'puddling')).not.toThrow(); expect(helper.compare(rows, 'puddling')).toBeNull();
    });
  });
});

describe('Storm moments: immutable learner choices and full feedback identity', () => {
  it('defaults to mature and the phase-relevant response with an unanswered fixed question', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.mountainSnow), reading = helper.read(null, context);
      expect(reading).toMatchObject({ version: 1, stage: 'mature', metric: 'snow', answer: '', result: 'waiting' });
      expect(reading.identity).toBe(JSON.stringify([1, 'mature-to-weakening', context.signature, 'snow']));
    });
  });
  it.each(STAGES)('preserves accepted Mature-to-Weakening feedback while inspecting %s', stage => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = freeze(helper.answer(null, context, 'split'));
      const selected = helper.selectStage(original, context, stage);
      expect(helper.read(selected, context)).toMatchObject({ stage, answer: 'split', result: 'supported' });
      expect(selected).not.toBe(original); expect(original.stage).toBe('mature');
    });
  });
  it('preserves valid feedback when the selected response is explicitly selected again', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = freeze(helper.answer(null, context, 'split'));
      const selected = helper.selectMetric(original, context, 'puddling');
      expect(helper.read(selected, context)).toMatchObject({ answer: 'split', result: 'supported' });
      expect(selected).not.toBe(original); expect(original.answer).toBe('split');
    });
  });
  it.each(['snow', 'glaze', 'hail', 'runoff'])('clears feedback when the ground-response question changes to %s', metric => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = freeze(helper.answer(null, context, 'split'));
      const selected = helper.selectMetric(original, context, metric);
      expect(helper.read(selected, context)).toMatchObject({ metric, answer: '', result: 'waiting' });
      expect(selected.identity).not.toBe(original.identity); expect(original.metric).toBe('puddling');
    });
  });
  it('binds accepted feedback to every normalized setup and displayed row rather than a truncated prefix', () => {
    each((helper, kernel) => {
      const originalContext = helper.build(kernel.presets.summerStorm), record = freeze(helper.answer(null, originalContext, 'split'));
      const changed = helper.build({ ...originalContext.setup, stormDistanceKm: originalContext.setup.stormDistanceKm + 1 });
      expect(originalContext.signature.slice(0, 160)).toBe(changed.signature.slice(0, 160));
      expect(originalContext.signature).not.toBe(changed.signature);
      expect(helper.read(record, changed)).toMatchObject({ answer: '', result: 'waiting' });
      const differentEvidence = plain(originalContext); differentEvidence.rows[2].accumulation.runoff += 1; resign(differentEvidence);
      expect(helper.read(record, differentEvidence)).toMatchObject({ answer: '', result: 'waiting' });
      expect(record.identity).toContain(originalContext.signature.replace(/"/g, '\\"'));
    });
  });
  it('retains canonical inspection choices across changed setup while suppressing stale feedback', () => {
    each((helper, kernel) => {
      const first = helper.build(kernel.presets.gentleRain), next = helper.build(kernel.presets.mountainSnow);
      const saved = freeze(helper.selectStage(helper.answer(null, first, 'split'), first, 'weakening'));
      expect(helper.read(saved, next)).toMatchObject({ stage: 'weakening', metric: 'puddling', answer: '', result: 'waiting' });
      expect(saved.answer).toBe('split');
    });
  });
  it.each([['missing', undefined], ['null', null], ['zero', 0], ['string', '1'], ['old version', 2]])('rejects feedback from a foreign saved version (%s)', (_label, version) => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), saved = helper.answer(null, context, 'split'); saved.version = version;
      expect(helper.read(saved, context)).toMatchObject({ stage: 'mature', metric: 'puddling', answer: '', result: 'waiting' });
    });
  });
  it('requires a known saved metric and an own full string question identity before accepting any answer', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = helper.answer(null, context, 'split');
      for (const metric of [undefined, null, 'unknown', [], { toString() { throw new Error('Do not coerce'); } }]) {
        expect(helper.read({ ...original, metric }, context).result).toBe('waiting');
      }
      for (const identity of [undefined, null, 1, [], original.identity.slice(0, 160), JSON.stringify([1, 'foreign-question', context.signature, 'puddling'])]) {
        expect(helper.read({ ...original, identity }, context).result).toBe('waiting');
      }
    });
  });
  it('ignores inherited metadata fields and named properties on arrays', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = helper.answer(null, context, 'split');
      expect(helper.read(Object.create(original), context)).toMatchObject({ stage: 'mature', answer: '', result: 'waiting' });
      for (const field of ['version', 'metric', 'identity', 'answer']) {
        const rest = { ...original }, metadata = Object.create({ [field]: rest[field] }); delete rest[field]; Object.assign(metadata, rest);
        expect(helper.read(metadata, context).result).toBe('waiting');
      }
      const array = []; Object.assign(array, original);
      expect(helper.read(array, context).result).toBe('waiting');
    });
  });
  it('normalizes malformed, cyclic, BigInt and frozen bags without copying unknown live state', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), cyclic = {}; cyclic.stage = cyclic; cyclic.identity = cyclic; cyclic.unknown = cyclic;
      for (const metadata of [undefined, null, true, 1, 2n, 'saved', [], cyclic]) {
        let next; expect(() => { next = helper.selectStage(metadata, context, 'weakening'); }).not.toThrow();
        expect(Object.keys(next).sort()).toEqual(['answer', 'identity', 'metric', 'stage', 'version']);
        expect(helper.read(next, context)).toMatchObject({ stage: 'weakening', answer: '', result: 'waiting' });
      }
      const saved = freeze({ ...helper.answer(null, context, 'split'), notes: { evidence: 'Retain.' }, score: 99, stormTime: 12 });
      const before = JSON.stringify(saved), next = helper.selectMetric(saved, context, 'runoff');
      next.stage = 'changed'; expect(JSON.stringify(saved)).toBe(before);
      expect(Object.keys(next).sort()).toEqual(['answer', 'identity', 'metric', 'stage', 'version']);
    });
  });
  it('does not coerce unsupported choices or overwrite a supported answer with a foreign answer', () => {
    each((helper, kernel) => {
      const context = helper.build(kernel.presets.summerStorm), original = freeze(helper.answer(null, context, 'split'));
      const hostile = { toString() { throw new Error('Do not coerce'); } };
      for (const id of [undefined, null, true, 1, 'constructor', '__proto__', 'wrong', [], hostile]) {
        expect(helper.read(helper.selectStage(original, context, id), context).stage).toBe('mature');
        expect(helper.read(helper.selectMetric(original, context, id), context).result).toBe('supported');
        expect(helper.read(helper.answer(original, context, id), context)).toMatchObject({ answer: 'split', result: 'supported' });
      }
    });
  });
});

describe('Storm moments: qualified current-stage language', () => {
  it('qualifies mature lightning using actual setup eligibility rather than the stage name', () => {
    each((helper, kernel) => {
      const rain = kernel.compute({ ...kernel.presets.gentleRain, stormTime: 52 });
      const hail = kernel.compute({ ...kernel.presets.hailstorm, stormTime: 52 });
      expect(rain.lightningEligible).toBe(false); expect(helper.currentCopy(rain)).toContain('Lightning is unavailable');
      expect(hail.lightningEligible).toBe(true); expect(helper.currentCopy(hail)).toContain('supports modeled lightning');
      expect(helper.currentCopy({ lifecycle: { stageKey: 'mature' }, lightningEligible: 'true' })).toContain('Lightning is unavailable');
    });
  });
  it('describes developing and weakening positions as model illustrations without inventing measured timing', () => {
    each((helper, kernel) => {
      expect(helper.currentCopy(kernel.compute({ ...kernel.presets.summerStorm, stormTime: 16 }))).toContain('illustrates strengthening');
      expect(helper.currentCopy(kernel.compute({ ...kernel.presets.summerStorm, stormTime: 86 }))).toContain('earlier exposure');
      expect(helper.currentCopy(Object.create({ lifecycle: { stageKey: 'mature' }, lightningEligible: true }))).toBe('Choose a model position to inspect the sequence.');
    });
  });
});

describe('Storm moments: actual renderer and isolated learner callbacks', () => {
  it('renders optional native disclosures without writing any learner or live chamber state', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), original = harness.state(), first = harness.render(), second = harness.render();
      expect(first.tag).toBe('details'); expect(first.props).not.toHaveProperty('open');
      const question = renderedNode(first, node => node.tag === 'details' && node.props.className === 'wc-sm-question');
      expect(question.props).not.toHaveProperty('open'); expect(renderedText(question)).toContain('unscored');
      expect(first.props['data-sm-stage']).toBe('mature'); expect(second.props['data-sm-metric']).toBe('puddling');
      expect(harness.calls).toEqual([]); expect(harness.focusCalls).toEqual([]); expect(harness.state()).toBe(original);
    });
  });
  it.each(STAGES)('inspects %s through the actual callback while retaining every other state field', stage => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), original = harness.state(), before = withoutStormChoices(original);
      harness.click('data-sm-select', stage);
      expect(harness.calls).toHaveLength(1); expect(harness.calls[0].key).toBe('wcStormMoments');
      expect(harness.focusCalls).toEqual(['wcStormMomentDetailTitle']);
      expect(withoutStormChoices(harness.state())).toEqual(before); expect(harness.state().precipHunt).toBe(original.precipHunt);
      const tree = harness.render(); expect(tree.props['data-sm-stage']).toBe(stage);
      const pressed = renderedNodes(tree, node => node.tag === 'button' && node.props['data-sm-select'] && node.props['aria-pressed']);
      expect(pressed.map(node => node.props['data-sm-select'])).toEqual([stage]);
      const detail = renderedNode(tree, node => node.props.id === 'wcStormMomentDetailTitle');
      expect(detail.props.tabIndex).toBe(-1); expect(renderedText(detail)).toContain(String(TIMES[STAGES.indexOf(stage)]) + '/100');
    });
  });
  it.each(METRICS)('selects %s using the actual native select callback without changing live time or notes', metric => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), before = withoutStormChoices(harness.state()); harness.metric(metric);
      expect(harness.calls.map(call => call.key)).toEqual(['wcStormMoments']);
      expect(harness.focusCalls).toEqual([]);
      expect(withoutStormChoices(harness.state())).toEqual(before);
      const tree = harness.render(), selector = renderedNode(tree, node => node.tag === 'select');
      expect(selector.props.value).toBe(metric); expect(tree.props['data-sm-metric']).toBe(metric);
      expect(selector.children.map(node => node.props.value)).toEqual(METRICS);
      const context = runtime.helper.build(harness.state().precipHunt);
      context.rows.forEach(row => {
        const lane = renderedNode(tree, node => node.props['data-sm-lane'] === 'ground');
        const readout = renderedNode(lane, node => node.props['data-sm-readout'] === 'ground' && node.props['data-sm-stage'] === row.id);
        expect(readout.props['data-sm-value']).toBe(String(row.accumulation[metric]));
        expect(renderedText(readout)).toContain(row.accumulation[metric] + ' / 100');
      });
    });
  });
  it.each(CHOICES)('interprets %s through the shipped answer callback without changing rewards or scientific state', answer => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), before = withoutStormChoices(harness.state()); harness.click('data-sm-answer', answer);
      expect(harness.calls.map(call => call.key)).toEqual(['wcStormMoments']);
      expect(withoutStormChoices(harness.state())).toEqual(before); expect(harness.focusCalls).toEqual(['wcStormMomentFeedbackTitle']);
      const tree = harness.render(), feedback = renderedNode(tree, node => node.props['data-sm-result']);
      expect(feedback.props.role).toBe('status'); expect(feedback.props['data-sm-result']).toBe(answer === 'split' ? 'supported' : 'retry');
      expect(renderedText(feedback)).toContain('Falling activity drops from 64 to 41.');
      expect(renderedText(feedback)).toContain('puddling index rises from 24 to 43.');
    });
  });
  it('retains feedback after actual stage inspection and same-track selection, then clears it for a different track', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime); harness.click('data-sm-answer', 'split');
      harness.click('data-sm-select', 'developing'); harness.metric('puddling');
      expect(renderedNode(harness.render(), node => node.props['data-sm-result']).props['data-sm-result']).toBe('supported');
      harness.metric('runoff');
      const result = renderedNode(harness.render(), node => node.props['data-sm-result']);
      expect(result.props['data-sm-result']).toBe('waiting'); expect(renderedText(result)).not.toContain('Falling activity drops');
      expect(harness.state().precipHunt.stormTime).toBe(27);
    });
  });
  it('recomputes current setup evidence and suppresses stale renderer feedback without rewriting saved weather or metadata', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime); harness.click('data-sm-answer', 'split');
      const saved = harness.state().wcStormMoments;
      harness.replace({ precipHunt: { ...harness.state().precipHunt, ...runtime.kernel.presets.virga } });
      const current = harness.state(), count = harness.calls.length, tree = harness.render();
      expect(renderedNode(tree, node => node.props['data-sm-result']).props['data-sm-result']).toBe('waiting');
      expect(harness.state()).toBe(current); expect(harness.state().wcStormMoments).toBe(saved); expect(saved.answer).toBe('split');
      expect(harness.calls).toHaveLength(count);
      renderedNodes(tree, node => node.props['data-sm-readout'] === 'ground').forEach(node => expect(node.props['data-sm-value']).toBe('0'));
    });
  });
  it('keeps virga zero ground readings explicit in actual feedback rather than claiming accumulated surface water', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime, { precipHunt: { ...runtime.kernel.presets.virga, stormTime: 52 } });
      harness.click('data-sm-answer', 'split');
      const feedback = renderedNode(harness.render(), node => node.props['data-sm-result']);
      expect(feedback.props['data-sm-result']).toBe('supported');
      expect(renderedText(feedback)).toContain('Both runoff readings are 0. These rounded readings show no displayed change on this track.');
    });
  });
  it('disables native answer buttons and labels missing model values as unavailable', () => {
    shipped.forEach(runtime => {
      const helper = loadHelper(runtime.source, runtime.kernel, config => {
        const actual = runtime.kernel.compute(config); return { ...actual, relativeIntensity: null };
      });
      const harness = rendererHarness(runtime, {}, helper), tree = harness.render();
      expect(renderedNode(tree, node => node.props['data-sm-result']).props['data-sm-result']).toBe('unavailable');
      renderedNodes(tree, node => node.props['data-sm-answer']).forEach(node => expect(node.props.disabled).toBe(true));
      renderedNodes(tree, node => node.props['data-sm-readout'] === 'activity').forEach(node => {
        expect(node.props['data-sm-value']).toBe('unavailable'); expect(renderedText(node)).toContain('Unavailable');
      });
    });
  });
  it.each(['rain', 'snow', 'sleet', 'freezing-rain', 'hail', 'mix', 'virga', 'clear'])('shows actual %s phase, arrival and lightning evidence alongside hidden schematic icons', phase => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime, { precipHunt: { ...configFor(runtime.kernel, phase), stormTime: 91 } });
      const context = runtime.helper.build(harness.state().precipHunt);
      context.rows.forEach(row => {
        harness.click('data-sm-select', row.id);
        const tree = harness.render(), detail = renderedNode(tree, node => node.props.id === 'wcStormMomentDetail');
        const picture = renderedNode(tree, node => node.props['data-sm-picture']);
        expect(picture.props['data-sm-picture']).toBe(row.id);
        expect(picture.props['data-sm-phase']).toBe(phase); expect(picture.props['aria-hidden']).toBe(true);
        expect(picture.props.focusable).toBe('false'); expect(renderedText(detail)).toContain(row.phaseLabel);
        expect(renderedText(detail)).toContain(row.reachesGround ? 'Reaches the surface' : phase === 'virga' ? 'Evaporates aloft' : 'No surface precipitation');
        expect(renderedNodes(picture, node => node.props['data-sm-cue'] === 'lightning-available')).toHaveLength(row.lightningEligible ? 1 : 0);
      });
      const tree = harness.render();
      expect(renderedText(tree)).toContain('The icons are schematic.');
      expect(renderedText(tree)).toContain('do not record earlier weather edits');
      expect(renderedText(tree)).toContain('do not measure water depth, discharge or hazard');
    });
  });
});

describe('Storm moments: aligned comparison signals', () => {
  it.each(METRICS)('aligns all three actual activity and %s readings without changing their scales', metric => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime); harness.metric(metric);
      const context = runtime.helper.build(harness.state().precipHunt), tree = harness.render();
      expect(renderedNodes(tree, node => node.props['data-sm-lane']).map(node => node.props['data-sm-lane'])).toEqual(['activity', 'ground']);
      ['activity', 'ground'].forEach(kind => {
        const lane = renderedNode(tree, node => node.props['data-sm-lane'] === kind);
        const columns = renderedNodes(lane, node => node.props['data-sm-readout'] === kind);
        expect(columns.map(node => node.props['data-sm-stage'])).toEqual(STAGES);
        columns.forEach((column, index) => {
          const row = context.rows[index], value = kind === 'activity' ? row.intensity : row.accumulation[metric];
          expect(column.props['data-sm-value']).toBe(String(value));
          expect(renderedText(column)).toContain(row.label); expect(renderedText(column)).toContain(value + ' / 100');
          const bar = renderedNode(lane, node => node.props['data-sm-bar'] === kind && node.props['data-sm-stage'] === row.id);
          expect(bar.props.style.height).toBe(value + '%');
        });
      });
      const scaleNote = renderedNode(tree, node => node.props.id === 'wcStormMomentScale');
      expect(renderedText(scaleNote)).toContain('Each track has its own qualitative 0–100 scale.');
      expect(renderedText(scaleNote)).toContain('equal numbers across tracks do not mean equal water amounts.');
    });
  });
  it.each(STAGES)('keeps the selected %s columns, native button and single scene in agreement', stage => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime), before = withoutStormChoices(harness.state());
      harness.click('data-sm-select', stage);
      const tree = harness.render(), context = runtime.helper.build(harness.state().precipHunt), row = context.rows[STAGES.indexOf(stage)];
      ['activity', 'ground'].forEach(kind => {
        const lane = renderedNode(tree, node => node.props['data-sm-lane'] === kind);
        const selected = renderedNodes(lane, node => node.props['data-sm-readout'] === kind && node.props['data-selected'] === 'true');
        expect(selected.map(node => node.props['data-sm-stage'])).toEqual([stage]);
      });
      const buttons = renderedNodes(tree, node => node.props['data-sm-select']);
      expect(buttons).toHaveLength(3);
      buttons.forEach(button => { expect(button.tag).toBe('button'); expect(button.props.type).toBe('button'); expect(button.props['aria-controls']).toBe('wcStormMomentDetail'); });
      expect(buttons.filter(button => button.props['aria-pressed']).map(button => button.props['data-sm-select'])).toEqual([stage]);
      expect(renderedNodes(tree, node => node.props['data-sm-picture']).map(node => node.props['data-sm-picture'])).toEqual([stage]);
      const detail = renderedNode(tree, node => node.props.id === 'wcStormMomentDetail');
      expect(renderedText(detail)).toContain(row.intensity + ' / 100');
      expect(renderedText(detail)).toContain(row.accumulation.puddling + ' / 100');
      expect(withoutStormChoices(harness.state())).toEqual(before); expect(harness.focusCalls.at(-1)).toBe('wcStormMomentDetailTitle');
    });
  });
  it.each(['clear', 'virga'])('renders zero %s ground readings as actual zero-height bars', phase => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime, { precipHunt: configFor(runtime.kernel, phase) }), tree = harness.render();
      const ground = renderedNode(tree, node => node.props['data-sm-lane'] === 'ground');
      const readouts = renderedNodes(ground, node => node.props['data-sm-readout'] === 'ground');
      expect(readouts).toHaveLength(3);
      readouts.forEach(node => { expect(node.props['data-sm-value']).toBe('0'); expect(renderedText(node)).toContain('0 / 100'); });
      const bars = renderedNodes(ground, node => node.props['data-sm-bar'] === 'ground');
      expect(bars).toHaveLength(3); bars.forEach(node => expect(node.props.style.height).toBe('0%'));
      if (phase === 'clear') renderedNodes(tree, node => node.props['data-sm-bar'] === 'activity').forEach(node => expect(node.props.style.height).toBe('0%'));
      else expect(renderedNodes(tree, node => node.props['data-sm-bar'] === 'activity').some(node => parseFloat(node.props.style.height) > 0)).toBe(true);
    });
  });
  it('keeps an inactive response track at zero when falling activity is positive', () => {
    shipped.forEach(runtime => {
      const harness = rendererHarness(runtime); harness.metric('snow');
      const tree = harness.render(), activity = renderedNodes(tree, node => node.props['data-sm-bar'] === 'activity');
      expect(activity).toHaveLength(3); activity.forEach(node => expect(parseFloat(node.props.style.height)).toBeGreaterThan(0));
      const ground = renderedNodes(tree, node => node.props['data-sm-bar'] === 'ground');
      expect(ground).toHaveLength(3); ground.forEach(node => expect(node.props.style.height).toBe('0%'));
    });
  });
  it('keeps missing evidence distinct from a measured zero and disables interpretation', () => {
    shipped.forEach(runtime => {
      const helper = loadHelper(runtime.source, runtime.kernel, config => {
        const actual = runtime.kernel.compute(config);
        if (config.stormTime !== 52) return actual;
        return { ...actual, relativeIntensity: null,
          lifecycle: { ...actual.lifecycle, accumulation: { ...actual.lifecycle.accumulation, puddling: null } } };
      });
      const harness = rendererHarness(runtime, {}, helper), tree = harness.render();
      ['activity', 'ground'].forEach(kind => {
        const lane = renderedNode(tree, node => node.props['data-sm-lane'] === kind);
        const middle = renderedNode(lane, node => node.props['data-sm-readout'] === kind && node.props['data-sm-stage'] === 'mature');
        expect(middle.props['data-sm-value']).toBe('unavailable'); expect(renderedText(middle)).toContain('Unavailable');
        expect(renderedNodes(lane, node => node.props['data-sm-bar'] === kind && node.props['data-sm-stage'] === 'mature')).toHaveLength(0);
        expect(renderedNodes(lane, node => node.props['data-sm-bar'] === kind)).toHaveLength(2);
      });
      expect(renderedNode(tree, node => node.props['data-sm-result']).props['data-sm-result']).toBe('unavailable');
      renderedNodes(tree, node => node.props['data-sm-answer']).forEach(button => expect(button.props.disabled).toBe(true));
      expect(harness.calls).toEqual([]);
    });
  });
});

describe('Storm moments: independent exact preservation', () => {
  it('excludes only one exact range-renderer addition while retaining surrounding bytes', () => {
    const addition = '\n                renderStormRange(),';
    // Use a real comma-separated call argument so the additive line remains
    // valid JavaScript in both the baseline and expanded declarations.
    const baseline = 'function renderStormExperiment() {\n  h(\n  keepOriginal());\n}';
    const shipped = baseline.replace('h(', 'h(' + addition);
    expect(productionNodes(shipped)).toEqual(productionNodes(baseline));
    expect(productionNodes(shipped.replace('keepOriginal', 'changedOriginal'))).not.toEqual(productionNodes(baseline));
    expect(productionNodes(shipped.replace(addition, addition + addition))).not.toEqual(productionNodes(baseline));
    expect(productionNodes(shipped.replace('renderStormRange()', 'renderSomethingElse()'))).not.toEqual(productionNodes(baseline));
  });
  it('excludes only the exact additive sweep exports while retaining prior export bytes', () => {
    const baseline = 'window.WaterCyclePrecipitationKernel = {\n    compute: computeWcPrecipitationModel\n};';
    const addition = '\n    sweepInputs: WC_PRECIP_SWEEP_INPUTS,\n    sweep: wcPrecipSweep,';
    const expanded = baseline.replace(' = {', ' = {' + addition);
    expect(kernelExport(expanded)).toBe(kernelExport(baseline));
    expect(kernelExport(expanded.replace('compute: computeWcPrecipitationModel', 'compute: changedModel'))).not.toBe(kernelExport(baseline));
    expect(kernelExport(expanded.replace('sweep: wcPrecipSweep', 'sweep: changedSweep'))).not.toBe(kernelExport(baseline));
    expect(kernelExport(expanded.replace(addition, addition + addition))).not.toBe(kernelExport(baseline));
  });
  it('pins the frozen prior groundwater runtime and exact source/public parity', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA); expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves every equation, storm experiment, saved-note handler, scene engine, reward bank and groundwater implementation byte', () => {
    const original = productionNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(original).sort()).toEqual([...PRESERVED].sort());
    sources.forEach(source => expect(productionNodes(source.text), source.path).toEqual(original));
  });
  it('preserves the exact scientific kernel export and all five existing live timeline callbacks', () => {
    const baseline = baselineBytes.toString('utf8'), callbacks = timelineNodes(baseline);
    expect(callbacks).toHaveLength(5);
    sources.forEach(source => { expect(kernelExport(source.text)).toBe(kernelExport(baseline)); expect(timelineNodes(source.text)).toEqual(callbacks); });
  });
  it('preserves original quiz and myth first-answer counters and rewards exactly', () => {
    const original = scoredNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(original).sort()).toEqual(['myth', 'quiz']);
    sources.forEach(source => expect(scoredNodes(source.text), source.path).toEqual(original));
  });
});
