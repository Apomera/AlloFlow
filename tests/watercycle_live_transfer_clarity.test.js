import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';
import { renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const TEST_PATH = 'tests/watercycle_live_transfer_clarity.test.js';
// Freeze reference re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words): later
// published passes (585a61ba2, 79e3e5eae) changed preserved declarations on purpose. The original
// pass baseline remains at reports/watercycle-live-transfer-clarity/baseline-runtime.js.
const BASELINE_PATH = 'reports/watercycle-freeze-reference/accepted-runtime.js';
const BASELINE_SHA = '9498b1556f44b12bcb562e7507beccfcfc211fdcf721c4615892ad3c197de84d';
const AUTHORIZED_CANVAS_PRESENTATION = ['drawMatterEnergyEvidence2d', 'drawFlowChevrons2d', 'drawPhysicalTimeGlyph2d'];
const PRESERVED = [
  'STAGES', 'STAGE_CUES', 'STAGE_FLOW', 'currentStageLabel', 'currentStageCue',
  'MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'STAGE_HYDROLOGIC_TIME_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE',
  'wcLandResponse', 'estimateWcLandIndices', 'estimateWcRouteShares', 'journeyActiveStageMap', 'resolvedStageId', 'setJourneyReplayProgress', 'resumeLiveJourney',
  'chooseJourneyPath', 'beginWcQuickJourney', 'journeyReplaySegmentAt', 'onWcKey', 'canvasRef', 'journey3dRef',
  'WCJourneyChapters', 'renderWcJourneyChapters', 'WCProcessCompare', 'renderWcProcessComparison',
  'WCGroundwaterLens', 'WC_GROUNDWATER_LENS_STYLE', 'renderWcGroundwaterLens', 'renderWcCheckPores',
  'WCStormMoments', 'WC_STORM_MOMENTS_STYLE', 'renderStormMoments',
  'WCThermalLayerInspector', 'WC_THERMAL_LAYER_INSPECTOR_STYLE', 'renderThermalLayerInspector',
  'normalizeWcPrecipConfig', 'buildWcPrecipThermalStructure', 'buildWcStormLifecycle', 'computeWcPrecipitationModel',
  'wcPrecipPhaseAtTransitions', 'wcPrecipPhaseFromModel', 'wcPrecipPhaseAt',
  'WCCloudEvidence', 'WCExploreNotebook', 'WCCheckInvestigation', 'WCStewardHistory',
  'wcQuizBank', 'wcQuizQuestion', 'checkWaterCycleChallenges', 'studyVocab',
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
function declarations(text, names = PRESERVED) {
  const normalized = text.replace(/\r\n/g, '\n'), result = {};
  walk(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!names.includes(name)) return;
    if (result[name]) throw new Error('Duplicate actual preservation anchor: ' + name);
    result[name] = normalized.slice(node.start, node.end);
  });
  return result;
}
function scoredBodies(text) {
  const normalized = text.replace(/\r\n/g, '\n'), result = {};
  walk(parse(normalized, { ecmaVersion: 'latest' }), node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type) || node.body.type !== 'BlockStatement') return;
    const locals = node.body.body.filter(statement => statement.type === 'VariableDeclaration').flatMap(statement => statement.declarations.map(item => item.id.name));
    const kind = locals.includes('newStreak') && locals.includes('nextQuizCorrectCount') ? 'quiz' : locals.includes('nextMythsDone') ? 'myth' : '';
    if (!kind) return;
    if (result[kind]) throw new Error('Duplicate scored body: ' + kind);
    result[kind] = node.body.body.filter(statement => {
      const value = normalized.slice(statement.start, statement.end);
      return /\b(newStreak|newAttempts|nextQuizCorrectCount|nextMythsDone|nextState)\b/.test(value) ||
        statement.type === 'IfStatement' && /awardStemXP/.test(value) ||
        statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' && statement.expression.callee.name === 'updMulti';
    }).map(statement => normalized.slice(statement.start, statement.end)).join('\n');
  });
  return result;
}
function restorePriorCanvasPresentation(declaration, currentHelpers, priorHelpers) {
  let restored = declaration;
  AUTHORIZED_CANVAS_PRESENTATION.forEach(name => {
    if (!currentHelpers[name] || !priorHelpers[name]) throw new Error('Missing authorized canvas presentation boundary: ' + name);
    if (restored.split(currentHelpers[name]).length !== 2) throw new Error('Nonunique canvas presentation boundary: ' + name);
    restored = restored.replace(currentHelpers[name], priorHelpers[name]);
  });
  return restored;
}
const loadedAt = new Date().toISOString();
const sources = [SOURCE_PATH, MIRROR_PATH].map(path => {
  const bytes = readFileSync(path); return { path, bytes, text: bytes.toString('utf8') };
});
const baselineBytes = readFileSync(BASELINE_PATH), loadedTestBytes = readFileSync(TEST_PATH);
afterAll(() => {
  if (process.env.WATER_CYCLE_LIVE_TRANSFER_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_LIVE_TRANSFER_LOADED_REPORT, JSON.stringify({
    pid: process.pid, loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTestBytes), bytes: loadedTestBytes.length },
    loadedBaseline: { path: BASELINE_PATH, sha256: sha(baselineBytes), bytes: baselineBytes.length },
  }, null, 2) + '\n');
});
function readTraces(text) {
  const names = ['MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'STAGE_HYDROLOGIC_TIME_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE', 'STAGE_CUES', 'STAGES'];
  const extracted = declarations(text, names);
  if (Object.keys(extracted).length !== names.length) throw new Error('Missing actual authored trace');
  const program = names.map(name => 'var ' + extracted[name] + ';').join('\n') + '\n({stage:MATTER_ENERGY_TRACE,journey:JOURNEY_MATTER_ENERGY_TRACE,stageTime:STAGE_HYDROLOGIC_TIME_TRACE,journeyTime:JOURNEY_HYDROLOGIC_TIME_TRACE,cues:STAGE_CUES,definitions:STAGES});';
  return plain(runInNewContext(program, { t: (_key, fallback) => fallback }, { timeout: 1000 }));
}
const priorTraces = readTraces(baselineBytes.toString('utf8'));
const PREVIEWS = ['evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration'];
const JOURNEY_STATES = ['ocean', 'evaporating', 'condensing', 'precipitating', 'ground_choice', 'river_runoff', 'infiltrating', 'aquifer_flow', 'plant_absorb', 'transpiring', 'complete'];
const PREVIEW_LABELS = { evaporation: 'Evaporation', condensation: 'Condensation', precipitation: 'Precipitation', collection: 'Collection', transpiration: 'Transpiration', infiltration: 'Infiltration' };
const ACTIVE_EXPECTATIONS = {
  ocean: { label: 'Ocean storage', kind: 'storage', cueTerms: ['remains', 'ocean store'] },
  evaporating: { label: 'Evaporation', kind: 'transfer', cueTerms: ['Surface liquid', 'invisible water vapor'] },
  condensing: { label: 'Cloud formation', kind: 'transfer', cueTerms: ['cloud droplets', 'ice by deposition', 'tiny particles'] },
  precipitating: { label: 'Precipitation', kind: 'transfer', cueTerms: ['Cloud water or ice', 'falls toward land', 'gravity'] },
  ground_choice: { label: 'Land pathway choice', kind: 'choice', cueTerms: ['Choose a route', 'next transfer has not started'] },
  river_runoff: { label: 'Surface runoff', kind: 'transfer', cueTerms: ['Liquid', 'terrain', 'river, estuary and ocean'] },
  infiltrating: { label: 'Infiltration and soil storage', kind: 'transfer', cueTerms: ['soil pore spaces', 'does not establish groundwater recharge'] },
  aquifer_flow: { label: 'Groundwater flow and discharge', kind: 'transfer', cueTerms: ['selected groundwater path', 'connected pores', 'surface water or ocean discharge'] },
  plant_absorb: { label: 'Root uptake and xylem transport', kind: 'transfer', cueTerms: ['enters roots', 'xylem as liquid', 'Leaf evaporation is a later step'] },
  transpiring: { label: 'Transpiration', kind: 'transfer', cueTerms: ['evaporates at leaf surfaces', 'invisible water vapor'] },
  complete: { label: 'Ocean storage after return', kind: 'storage', cueTerms: ['back in ocean storage', 'new loop'] },
};
// Explicit expectations for the authored phase phrases, independent of the classifier.
const PHASE_SYMBOLS = {
  'Liquid water': 'liquid', 'Water vapor': 'vapor', 'Liquid droplets or ice': 'liquid-or-solid',
  'Cloud water or ice': 'liquid-or-solid', 'Falling liquid or solid water': 'liquid-or-solid',
  'Liquid or solid water': 'liquid-or-solid', 'Stored liquid water or ice': 'liquid-or-solid',
  'Liquid plant water': 'liquid', 'Liquid surface water': 'liquid', 'Liquid soil pore water': 'liquid',
  'Stored liquid water': 'liquid', 'Liquid groundwater': 'liquid', 'Liquid soil water': 'liquid',
  'Solid ice': 'solid', 'Ice': 'solid',
};
function readPresentation(text) {
  const extracted = declarations(text, ['WCLiveTransferStory', 'ltWaterSymbol']);
  if (Object.keys(extracted).length !== 2) throw new Error('Missing live-transfer presentation helper');
  return runInNewContext('var ' + extracted.WCLiveTransferStory + ';\n' + extracted.ltWaterSymbol + '\n({story:WCLiveTransferStory,symbol:ltWaterSymbol});', {
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  }, { timeout: 1000 });
}
const presentations = sources.map(source => readPresentation(source.text));
const compiledRuntimeFactories = new WeakMap();
function loadActualRuntime(source) {
  resetStemLab();
  let factory = compiledRuntimeFactories.get(source);
  if (!factory) {
    factory = new Function(source.text);
    compiledRuntimeFactories.set(source, factory);
  }
  factory();
  if (!window.StemLab?._registry.waterCycle) throw new Error('Actual runtime did not register: ' + source.path);
}
function recordCanvasHelpers(text) {
  const extracted = declarations(text, AUTHORIZED_CANVAS_PRESENTATION), operations = [], arrows = [], labels = [];
  const ctx = new Proxy({}, {
    get: (_target, name) => (...args) => { operations.push({ name, args }); },
    set: (target, name, value) => { target[name] = value; return true; },
  });
  const canvasEl = { dataset: {} };
  const helpers = runInNewContext(Object.values(extracted).join('\n') +
    '\n({evidence:drawMatterEnergyEvidence2d,flow:drawFlowChevrons2d,time:drawPhysicalTimeGlyph2d});', {
    ctx, canvasEl, cW: 600, cH: 400, dpr: 1, tick: 40, wcMotionReduced: true,
    evidenceArrow2d: (...args) => arrows.push(args),
    evidenceLabel2d: (...args) => labels.push(args),
  }, { timeout: 1000 });
  return { helpers, operations, arrows, labels, canvasEl };
}
function renderCurrent(source, patch) {
  const state = freeze({
    wcMode: 'explore', journeyView: '2d', activeStage: 'evaporation', journeyActive: true,
    journeyState: 'aquifer_flow', journeyPaused: true, journeyProgress: 0.35, journeySpeed: 1,
    climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55, landSaturation: 45,
    landPermeability: 'medium', landSlope: 'moderate', landCover: 'forest',
    wcCompareBaseline: { climSolar: 1, climTemp: 15, climWind: 1 },
    wcExperimentLog: [{ key: 'keep-evidence', notes: 'Retain the saved observation.' }],
    wcProcessCompare: { notes: { 'evaporation|transpiration': 'Retain explanation.' } },
    precipHunt: { experiment: { prediction: 'Retain storm prediction.', saved: [{ explanation: 'Retain storm reasoning.' }] } },
    wcThermalLayerInspector: { node: 'middle', answer: 'liquid' }, wcGroundwaterLens: { view: 'saturated' },
    quizAttempts: 5, quizCorrectCount: 3, mythsDone: ['vapor'], xp: 120,
    unrelated: { nested: ['Retain all values.'] }, ...patch,
  });
  const before = JSON.stringify(state);
  loadActualRuntime(source);
  const html = renderTool('waterCycle', { _threeLoaded: true, waterCycle: state });
  expect(JSON.stringify(state)).toBe(before);
  const host = document.createElement('div'); host.innerHTML = html;
  return { host, html, state };
}
function rowByLabel(host, label) {
  const rows = [...host.querySelectorAll('.wc-data-table tbody tr')].filter(row => row.querySelector('th')?.textContent === label);
  if (rows.length !== 1) throw new Error('Missing or duplicate Data row: ' + label);
  return rows[0].querySelector('td');
}
function assertPresentation(host, record, matter, previewDescriptions) {
  const focus = host.querySelectorAll('[data-lt-process]'); expect(focus).toHaveLength(1);
  expect(focus[0].getAttribute('data-lt-process')).toBe(record.id);
  for (const location of ['focus', 'data']) {
    const labels = host.querySelectorAll('[data-lt-label="' + location + '"]'); expect(labels).toHaveLength(1);
    expect(labels[0].textContent.trim()).toBe(record.label);
  }
  for (const location of ['summary', 'story', 'data']) {
    const cues = host.querySelectorAll('[data-lt-cue="' + location + '"]'); expect(cues).toHaveLength(1);
    if (location === 'summary' && !record.active) expect(previewDescriptions).toContain(cues[0].textContent.trim());
    else expect(cues[0].textContent.trim()).toBe(record.cue);
  }
  expect(rowByLabel(host, 'Current process').textContent).toContain(record.label);
  expect(rowByLabel(host, 'Current process').textContent).toContain(record.cue);
  expect(host.querySelector('#wcDataViewStatus').textContent).toContain(record.label + '.');
  const canvasDetail = record.kind === 'storage' ? 'Water remains in ' + matter.source + '.'
    : record.kind === 'choice' ? 'Water is at ' + matter.source + '; the next pathway awaits your choice.'
      : 'Water path from ' + matter.source + ' to ' + matter.destination + '.';
  expect(host.querySelector('#wcCanvas').getAttribute('aria-label')).toBe('Water cycle animation showing ' + record.label + '. ' + canvasDetail);
  expect(host.querySelector('.wc-science-story').getAttribute('aria-label')).toBe('Science story for ' + record.label);

  const figures = host.querySelectorAll('.wc-live-water-transfer'); expect(figures).toHaveLength(1);
  const figure = figures[0];
  expect(figure.getAttribute('data-lt-kind')).toBe(record.kind);
  expect(figure.getAttribute('data-lt-state')).toBe(record.id);
  expect(figure.getAttribute('aria-labelledby')).toBe('wcLiveWaterTitle');
  expect(figure.querySelector('#wcLiveWaterTitle')).not.toBeNull();
  const sides = record.kind === 'storage' ? ['from'] : ['from', 'to'];
  expect(figure.querySelectorAll('[data-lt-water-side]')).toHaveLength(sides.length);
  sides.forEach(side => {
    const nodes = figure.querySelectorAll('[data-lt-water-side="' + side + '"]'); expect(nodes).toHaveLength(1);
    const phase = matter[side === 'from' ? 'phaseFrom' : 'phaseTo'];
    const place = matter[side === 'from' ? 'source' : 'destination'];
    const role = record.kind === 'storage' ? 'Store' : side === 'from' ? 'From' : record.kind === 'choice' ? 'Next pathway' : 'To';
    expect(nodes[0].querySelector('.wc-lt-node-role').textContent).toBe(role);
    expect(nodes[0].querySelector('[data-lt-phase="' + side + '"]').textContent).toBe(phase);
    expect(nodes[0].querySelector('[data-lt-place="' + side + '"]').textContent).toBe(place);
    expect(PHASE_SYMBOLS[phase], 'Unspecified authored phase: ' + phase).toBeTruthy();
    const symbol = nodes[0].querySelector('[data-lt-water-symbol]'); expect(symbol).not.toBeNull();
    expect(symbol.getAttribute('data-lt-water-symbol')).toBe(PHASE_SYMBOLS[phase]);
    expect(symbol.getAttribute('aria-hidden')).toBe('true');
    expect(symbol.getAttribute('focusable')).toBe('false');
  });
  const waterArrows = figure.querySelectorAll('[data-lt-water-arrow]');
  expect(waterArrows).toHaveLength(record.kind === 'transfer' ? 1 : 0);
  if (record.kind === 'transfer') expect(waterArrows[0].getAttribute('data-lt-water-arrow')).toBe('from-to');
  if (record.kind === 'storage') {
    expect(figure.querySelector('[data-lt-phase="to"]')).toBeNull();
    expect(figure.textContent).toContain('Water remains in storage');
  }
  if (record.kind === 'choice') expect(figure.textContent).toContain('Awaiting choice');
  if (matter.phaseFrom.includes('vapor') || matter.phaseTo.includes('vapor')) {
    expect(figure.textContent).toContain('Water vapor is invisible');
    expect(figure.textContent).toContain('schematic gas symbol');
  }
  if (matter.phaseFrom.includes(' or ') || matter.phaseTo.includes(' or ')) {
    expect(figure.textContent).toContain('stated possibilities');
    expect(figure.textContent).toContain('do not imply that every particle changes state');
  }

  const heatPaths = host.querySelectorAll('.wc-live-heat-path'); expect(heatPaths).toHaveLength(1);
  const heat = heatPaths[0], directions = { absorbed: 'into-water', released: 'out-of-water', none: 'not-required' };
  expect(heat.getAttribute('data-lt-energy')).toBe(matter.energyTransfer);
  expect(heat.getAttribute('data-lt-heat-direction')).toBe(directions[matter.energyTransfer]);
  expect(heat.textContent).toContain(matter.energyLabel);
  const heatArrows = heat.querySelectorAll('[data-lt-heat-arrow]');
  expect(heatArrows).toHaveLength(matter.energyTransfer === 'none' ? 0 : 1);
  if (matter.energyTransfer === 'none') {
    expect(heat.textContent).toContain('No latent heat transfer is required');
    expect(heat.textContent).toContain('warm or cool');
  } else {
    const absorbed = matter.energyTransfer === 'absorbed';
    expect(heatArrows[0].getAttribute('data-lt-heat-arrow')).toBe(absorbed ? 'right' : 'left');
    expect(heatArrows[0].querySelector('path').getAttribute('d')).toBe(absorbed ? 'M8 14h68M65 4l11 10-11 10' : 'M76 14H8M19 4L8 14l11 10');
    expect(heat.querySelector('[role="group"]').getAttribute('aria-label')).toBe(absorbed ? 'Latent heat flows from surroundings into water' : 'Latent heat flows from water to surrounding air');
  }
  expect([...host.querySelectorAll('#wcMatterEnergySummary dt')].map(item => item.textContent)).toContain('Energy');
  expect([...host.querySelectorAll('.wc-science-story-step > span')].map(item => item.textContent.trim())).toEqual(['Cause', 'Water state', 'Look for']);
  const chainValues = [...host.querySelectorAll('.wc-science-story-step > strong')].map(item => item.textContent);
  expect(chainValues).toEqual([matter.driver, matter.phaseFrom + ' \u2192 ' + matter.phaseTo, record.cue]);
}

describe('Live transfer clarity: preserved authored model and state', () => {
  it('pins the prior thermal runtime and current source/public parity', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA); expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves all authored traces, model equations, routes, playback, prior helper bodies and live scene engines', () => {
    const baseline = declarations(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual([...PRESERVED].sort());
    const priorHelpers = declarations(baselineBytes.toString('utf8'), AUTHORIZED_CANVAS_PRESENTATION);
    sources.forEach(source => {
      const current = declarations(source.text), currentHelpers = declarations(source.text, AUTHORIZED_CANVAS_PRESENTATION);
      current.canvasRef = restorePriorCanvasPresentation(current.canvasRef, currentHelpers, priorHelpers);
      expect(current, source.path).toEqual(baseline);
    });
  });
  it('preserves first-answer quiz and myth counters and reward writes', () => {
    const baseline = scoredBodies(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual(['myth', 'quiz']);
    sources.forEach(source => expect(scoredBodies(source.text), source.path).toEqual(baseline));
  });
  it('returns fresh frozen records and safely falls back for unknown active states', () => {
    presentations.forEach(({ story }) => {
      const ocean = story.describe(true, 'ocean', 'transpiration', 'Poisoned preview', 'Poisoned preview cue');
      expect(Object.keys(ocean).sort()).toEqual(['active', 'cue', 'id', 'kind', 'label']);
      expect(Object.isFrozen(ocean)).toBe(true);
      for (const state of [undefined, null, 'missing', '__proto__', 'constructor', { toString: () => 'condensing' }]) {
        expect(plain(story.describe(true, state, 'transpiration', 'Poisoned preview', 'Poisoned preview cue'))).toEqual(plain(ocean));
      }
      expect(story.describe(true, 'ocean', 'evaporation', '', '')).not.toBe(ocean);
    });
  });
  it('uses distinct schematic symbols for vapor, ice, liquid and every authored alternative phase', () => {
    presentations.forEach(({ symbol }) => {
      Object.entries(PHASE_SYMBOLS).forEach(([phase, expected]) => {
        const rendered = symbol(phase);
        expect(rendered.type).toBe('svg');
        expect(rendered.props['data-lt-water-symbol'], phase).toBe(expected);
        expect(rendered.props['aria-hidden']).toBe(true);
        expect(rendered.props.focusable).toBe('false');
        const marks = [];
        walk(rendered, node => { if (node.type === 'path') marks.push(node.props.className); });
        if (expected === 'liquid-or-solid') expect(marks.sort()).toEqual(['wc-lt-drop', 'wc-lt-ice']);
        else if (expected === 'liquid') expect(marks).toEqual(['wc-lt-drop']);
        else if (expected === 'solid') expect(marks).toEqual(['wc-lt-ice']);
        else expect(marks).toEqual([]);
      });
    });
  });
  it.each(JOURNEY_STATES)('shows the actual %s transfer, symbols, heat direction and qualitative time without changing learner state', journeyState => {
    sources.forEach((source, index) => {
      const { host } = renderCurrent(source, { journeyState }), matter = priorTraces.journey[journeyState], time = priorTraces.journeyTime[journeyState];
      const expected = ACTIVE_EXPECTATIONS[journeyState], story = presentations[index].story;
      const record = story.describe(true, journeyState, 'evaporation', 'Poisoned preview', 'Poisoned preview cue');
      expect(Object.isFrozen(record)).toBe(true);
      expect(record.id).toBe(journeyState); expect(record.label).toBe(expected.label);
      expect(record.kind).toBe(expected.kind); expect(record.active).toBe(true);
      expected.cueTerms.forEach(term => expect(record.cue).toContain(term));
      expect(plain(story.describe(true, journeyState, 'transpiration', 'Another preview', 'Another preview cue'))).toEqual(plain(record));
      assertPresentation(host, record, matter);
      const summary = host.querySelector('#wcMatterEnergySummary'); expect(summary).not.toBeNull();
      for (const text of [matter.phaseFrom, matter.phaseTo, matter.energyLabel, matter.driver, time.roleLabel, time.label, time.caveat]) expect(summary.textContent).toContain(text);
      const data = rowByLabel(host, 'Matter and energy');
      for (const text of [matter.phaseFrom, matter.phaseTo, matter.energyLabel, matter.driver]) expect(data.textContent).toContain(text);
      const dataTime = rowByLabel(host, 'Physical time');
      for (const text of [time.roleLabel, time.label, time.caveat]) expect(dataTime.textContent).toContain(text);
      expect(dataTime.textContent).toContain('Animation is compressed');
    });
    // Two full SSR renders of the 3.4 MB tool per case: ~5 s under CPU contention (CI timed out at 5 s).
  }, 30_000);
  it.each(PREVIEWS)('keeps inactive %s preview identity, figures and time distinct from a stored active journey state', activeStage => {
    sources.forEach((source, index) => {
      const { host } = renderCurrent(source, { journeyActive: false, activeStage }), matter = priorTraces.stage[activeStage], time = priorTraces.stageTime[activeStage];
      const record = presentations[index].story.describe(false, 'aquifer_flow', activeStage, PREVIEW_LABELS[activeStage], priorTraces.cues[activeStage]);
      expect(Object.isFrozen(record)).toBe(true);
      expect(plain(record)).toEqual({ id: activeStage, label: PREVIEW_LABELS[activeStage], cue: priorTraces.cues[activeStage], kind: 'transfer', active: false });
      const priorStage = priorTraces.definitions.find(stage => stage.id === activeStage);
      expect(priorStage.label).toBe(PREVIEW_LABELS[activeStage]);
      assertPresentation(host, record, matter, Object.values(priorStage.desc));
      const summary = host.querySelector('#wcMatterEnergySummary'); expect(summary).not.toBeNull();
      for (const text of [matter.phaseFrom, matter.phaseTo, matter.energyLabel, matter.driver, time.roleLabel, time.label, time.caveat]) expect(summary.textContent).toContain(text);
      expect(rowByLabel(host, 'Current process').textContent).not.toContain('Aquifer flow');
    });
  }, 30_000);
});

describe('Live transfer clarity: actual 2D draw operations', () => {
  it.each(['ocean', 'complete'])('draws %s as stored liquid without a gravity or transfer arrow', journeyState => {
    sources.forEach(source => {
      const { helpers, labels, arrows, operations, canvasEl } = recordCanvasHelpers(source.text);
      helpers.evidence('collection', journeyState, { timeRole: 'storage', timeRank: 4, transpiration: 1 });
      expect(labels.map(args => args[0])).toEqual(['LIQUID WATER IN OCEAN STORAGE']);
      expect(arrows).toHaveLength(0);
      expect(canvasEl.dataset.timeLensVisual).toBe('storage-rings');
      expect(canvasEl.dataset.matterEvidenceCue).toBe('ocean-storage');
      operations.length = 0;
      helpers.flow('collection', journeyState);
      expect(operations.filter(operation => ['fill', 'rotate', 'translate'].includes(operation.name))).toHaveLength(0);
      expect(canvasEl.dataset.flowCue).toBe('ocean-storage-no-transfer');
    });
  });
  it('draws a landed parcel waiting for a pathway and a nondirectional fork at its land position', () => {
    sources.forEach(source => {
      const { helpers, labels, arrows, operations, canvasEl } = recordCanvasHelpers(source.text);
      helpers.evidence('precipitation', 'ground_choice', { timeRole: 'choice', timeRank: 0, transpiration: 1 });
      expect(labels.map(args => args[0])).toEqual(['ON LAND — CHOOSE A PATH']);
      expect(arrows).toHaveLength(0);
      expect(canvasEl.dataset.timeLensVisual).toBe('choice-fork');
      expect(canvasEl.dataset.matterEvidenceCue).toBe('land-pathway-choice');
      const linePoints = operations.filter(operation => operation.name === 'lineTo').map(operation => operation.args);
      [[204, 248], [194, 239], [214, 239]].forEach(([x, y]) => {
        expect(linePoints.some(point => Math.abs(point[0] - x) < 1e-6 && Math.abs(point[1] - y) < 1e-6)).toBe(true);
      });
      operations.length = 0;
      helpers.flow('precipitation', 'ground_choice');
      expect(operations.filter(operation => ['fill', 'rotate', 'translate'].includes(operation.name))).toHaveLength(0);
      expect(canvasEl.dataset.flowCue).toBe('land-choice-no-transfer');
    });
  });
  it.each(['idle', 'precipitating'])('retains downward gravity evidence and directional flow for %s precipitation', journeyState => {
    sources.forEach(source => {
      const { helpers, labels, arrows, operations, canvasEl } = recordCanvasHelpers(source.text);
      helpers.evidence('precipitation', journeyState, { timeRole: 'transfer', timeRank: 1, transpiration: 1 });
      expect(labels.map(args => args[0])).toEqual(['GRAVITY — FALLING TRANSPORT']);
      expect(arrows).toHaveLength(1);
      expect(arrows[0][0]).toBe(arrows[0][2]);
      expect(arrows[0][3]).toBeGreaterThan(arrows[0][1]);
      operations.length = 0;
      helpers.flow('precipitation', journeyState);
      expect(operations.filter(operation => operation.name === 'fill')).toHaveLength(3);
      const rotations = operations.filter(operation => operation.name === 'rotate').map(operation => operation.args[0]);
      expect(rotations).toHaveLength(3);
      rotations.forEach(angle => { expect(angle).toBeGreaterThan(0); expect(angle).toBeLessThan(Math.PI); });
      expect(canvasEl.dataset.flowCue).toBe('precipitation-directional-chevrons');
    });
  });
});

export const waterCycleLiveTransferVerification = { baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED, authorizedCanvasPresentation: AUTHORIZED_CANVAS_PRESENTATION, declarations, scoredBodies };
