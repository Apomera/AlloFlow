import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  loadTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const PREVIEWS = [
  ['evaporation', 'Evaporation', 'absorbed', 'Latent heat absorbed'],
  ['condensation', 'Condensation', 'released', 'Latent heat released to surrounding air'],
  ['precipitation', 'Precipitation', 'none', 'No required phase change during the fall'],
  ['collection', 'Collection', 'none', 'No required phase change during storage'],
  ['transpiration', 'Transpiration', 'absorbed', 'Latent heat absorbed at leaves'],
  ['infiltration', 'Infiltration', 'none', 'No phase change; infiltration is not automatically recharge'],
];
const JOURNEY = [
  ['ocean', 'none', 'No phase change during storage'],
  ['evaporating', 'absorbed', 'Latent heat absorbed'],
  ['condensing', 'released', 'Latent heat released to surrounding air'],
  ['precipitating', 'none', 'No required phase change during the fall'],
  ['ground_choice', 'none', 'No required phase change while choosing a route'],
  ['river_runoff', 'none', 'No phase change during surface flow'],
  ['infiltrating', 'none', 'No phase change; infiltration is not automatically recharge'],
  ['aquifer_flow', 'none', 'No phase change along this modeled return path'],
  ['plant_absorb', 'none', 'No phase change during root and xylem transport'],
  ['transpiring', 'absorbed', 'Latent heat absorbed at leaves'],
  ['complete', 'none', 'No phase change during storage'],
];
const BASE = {
  wcMode: 'explorer', wcSection: 'journey', journeyView: '2d', activeStage: 'evaporation',
  journeyActive: false, journeyState: 'aquifer_flow', journeyPaused: true, journeyReplayProgress: 0.42,
  journeyLoops: 3, journeyPaths: { runoff: 1, infiltrate: 2, plant: 1 }, journeyLastPath: 'infiltrate', journeySpeed: 0.5,
  stagesViewed: { collection: true, evaporation: true }, wc2dPaused: true,
  wcWalkthroughActive: false, wcWalkthroughIndex: 2,
  climSolar: 1.2, climTemp: 19, climWind: 1.4,
  landRainIntensity: 70, landSaturation: 60, landPermeability: 'high', landSlope: 'steep', landCover: 'forest',
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1, landSaturation: 40 }, wcScenarioPreset: 'custom',
  wcExperimentLog: [{ key: 'retained-observation', notes: { evidence: 'Keep observed evidence.', nextTest: 'Keep the next test.' } }],
  wcPrediction: 'evaporation', wcReplayedObservation: 'retained-observation',
  wcProcessCompare: { notes: { 'evaporation|transpiration': 'Keep the process explanation.' } },
  wcCheckReflections: { kept: { observation: 'Keep the Check explanation.' } },
  wcGroundwaterLens: {
    explorer: { version: 1, identity: 'groundwater-lens-v1', part: 'boundary', answer: 'soil_storage' },
    check: { version: 1, identity: 'retained-check-question', part: 'groundwater', answer: 'dry_soil' },
  },
  precipHunt: { experiment: { prediction: 'Keep the storm prediction.', saved: [{ explanation: 'Keep storm reasoning.' }] } },
  wcThermalLayerInspector: { node: 'middle', answer: 'liquid' },
  researchPoints: 25, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  wcQuiz: { q: 'Where can groundwater move?', a: 'Connected pores', opts: ['Connected pores', 'Empty lakes'], answered: true, chosen: 'Empty lakes', score: 2, concept: 'aquifer' },
  wcMyth: { idx: 6, s: 'Groundwater flows in big underground lakes.', t: false, answered: true, chosen: true },
  vocabWordsStudied: ['aquifer'],
  completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
  unrelated: { nested: ['Retain this other saved value.'] },
};
const fixtures = [];
const clone = value => JSON.parse(JSON.stringify(value));
let cfg;

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function treeElements(tree) {
  const result = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    result.push(node); visit(node.props.children);
  }
  visit(tree); return result;
}
function traceLiteral(source, name) {
  const marker = 'var ' + name + ' =';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('Missing authored catalog: ' + name);
  const start = source.indexOf('{', markerIndex + marker.length);
  let depth = 0, quote = '', escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('Unclosed authored catalog: ' + name);
}
const source = readFileSync(SOURCE_PATH, 'utf8');
const traces = clone(runInNewContext(
  'var MATTER_ENERGY_TRACE = ' + traceLiteral(source, 'MATTER_ENERGY_TRACE') + ';\n' +
  '({ stage: MATTER_ENERGY_TRACE, journey: ' + traceLiteral(source, 'JOURNEY_MATTER_ENERGY_TRACE') + ' });',
  {}, { timeout: 1000 },
));

// Render the complete registered tool, retaining its real native callbacks.
// SSR leaves canvas refs unmounted; browser QA verifies the responsive layout.
function session(patch = {}) {
  const initial = freeze({ ...clone(BASE), ...patch });
  const store = newStore({ _threeLoaded: true, waterCycle: initial });
  const container = document.createElement('div'); document.body.append(container); fixtures.push(container);
  const writes = [], awardXP = vi.fn(), celebrate = vi.fn();
  let tree;
  function setToolData(updater) {
    const previous = store.toolData;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (next && next !== previous) {
      writes.push(Object.keys(next.waterCycle || {}).filter(key => next.waterCycle[key] !== previous.waterCycle?.[key]));
      store.toolData = next; store.dirty = true;
    }
  }
  const api = {
    initial, container, writes, awardXP, celebrate,
    get data() { return store.toolData.waterCycle; },
    get heat() {
      const found = container.querySelectorAll('.wc-live-heat-path');
      expect(found, 'actual live heat reading').toHaveLength(1); return found[0];
    },
    render() {
      for (let pass = 0; pass < 5; pass++) {
        store.dirty = false;
        const ctx = makeCtx({ toolData: store.toolData, setToolData, gradeLevel: '11th Grade', awardXP, celebrate }, store);
        const Comp = () => { tree = cfg.render(ctx); return tree; };
        container.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
        if (!store.dirty) break;
      }
      return api;
    },
    select(stageId) {
      const index = PREVIEWS.findIndex(item => item[0] === stageId);
      const prefix = 'Stage ' + (index + 1) + ': ' + PREVIEWS[index][1] + ' ';
      const found = treeElements(tree).filter(node => String(node.props['aria-label'] || '').startsWith(prefix));
      expect(found, 'original native stage selector for ' + stageId).toHaveLength(1);
      expect(found[0].type).toBe('button'); expect(typeof found[0].props.onClick).toBe('function');
      found[0].props.onClick({ preventDefault() {}, stopPropagation() {} });
      vi.advanceTimersByTime(60); return api.render();
    },
    resetTracking() { writes.length = 0; awardXP.mockClear(); celebrate.mockClear(); return api; },
    staticHeatElements() {
      const heat = treeElements(tree).find(node => node.props.className === 'wc-live-heat-path');
      expect(heat, 'actual heat React element').toBeTruthy(); return treeElements(heat);
    },
  };
  return api.render();
}
function withoutSelection(data, walkthrough = false) {
  return clone(Object.fromEntries(Object.entries(data).filter(([key]) =>
    !['activeStage', 'stagesViewed', ...(walkthrough ? ['wcWalkthroughIndex'] : [])].includes(key))));
}
function expectHeat(s, trace, energy, energyLabel) {
  expect(trace.energyTransfer).toBe(energy); expect(trace.energyLabel).toBe(energyLabel);
  const heat = s.heat;
  expect(heat.dataset.ltEnergy).toBe(energy);
  expect(heat.dataset.ltHeatDirection).toBe({ absorbed: 'into-water', released: 'out-of-water', none: 'not-required' }[energy]);
  expect(heat.querySelector('.wc-lt-heat-reading').textContent).toBe(energyLabel);
  const canvas = s.container.querySelector('#wcCanvas');
  expect(canvas.dataset.energyTransfer).toBe(energy);
  expect(canvas.dataset.waterPhaseFrom).toBe(trace.phaseFrom); expect(canvas.dataset.waterPhaseTo).toBe(trace.phaseTo);
  const matterRow = [...s.container.querySelectorAll('.wc-data-table tbody tr')].find(row => row.querySelector('th')?.textContent === 'Matter and energy');
  expect(matterRow.querySelector('td').textContent).toContain(energyLabel);
  expect(matterRow.querySelector('td').textContent).toContain(trace.driver);

  const actors = [...heat.querySelectorAll('[data-lt-heat-actor]')];
  const arrows = heat.querySelectorAll('[data-lt-heat-arrow]');
  if (energy === 'none') {
    expect(actors).toHaveLength(0); expect(arrows).toHaveLength(0);
    expect(heat.querySelector('.wc-lt-heat-direction')).toBeNull();
    expect(heat.querySelector('.wc-lt-heat-flow')).toBeNull();
    expect(heat.querySelector('.wc-lt-no-latent').textContent).toBe('No latent heat transfer is required by this process. Water can still move, warm or cool.');
  } else {
    const absorbed = energy === 'absorbed';
    expect(heat.querySelector('p.wc-lt-heat-direction strong').textContent).toBe(absorbed ? 'Heat enters water' : 'Heat leaves water');
    expect(heat.querySelector('.wc-lt-no-latent')).toBeNull();
    const flow = heat.querySelector('.wc-lt-heat-flow');
    expect(flow.getAttribute('role')).toBe('group');
    expect(flow.getAttribute('aria-label')).toBe(absorbed ? 'Latent heat flows from surroundings into water' : 'Latent heat flows from water to surrounding air');
    // Fixed physical order makes the arrow direction meaningful in every layout.
    expect(actors.map(actor => actor.dataset.ltHeatActor)).toEqual(['surroundings', 'water']);
    expect(actors.map(actor => actor.dataset.ltHeatRole)).toEqual(absorbed ? ['gives', 'receives'] : ['receives', 'gives']);
    expect([...flow.children].map(child => child.dataset.ltHeatActor || (child.classList.contains('wc-lt-heat-arrow') ? 'arrow' : 'other'))).toEqual(['surroundings', 'arrow', 'water']);
    for (const [index, actor] of actors.entries()) {
      const copy = actor.querySelector('.wc-lt-heat-actor-copy');
      expect(copy.querySelector('strong').textContent).toBe(index === 1 ? 'Water' : absorbed ? 'Surroundings' : 'Surrounding air');
      expect(copy.querySelector('small').textContent).toBe(actor.dataset.ltHeatRole === 'gives' ? 'Gives heat' : 'Receives heat');
      expect(actor.querySelector('i').getAttribute('aria-hidden')).toBe('true');
    }
    expect(arrows).toHaveLength(1);
    expect(arrows[0].dataset.ltHeatArrow).toBe(absorbed ? 'right' : 'left');
    expect(arrows[0].getAttribute('viewBox')).toBe('0 0 84 28');
    expect(arrows[0].querySelector('path').getAttribute('d')).toBe(absorbed ? 'M8 14h68M65 4l11 10-11 10' : 'M76 14H8M19 4L8 14l11 10');
    expect(arrows[0].getAttribute('aria-hidden')).toBe('true');
    expect(arrows[0].getAttribute('focusable')).toBe('false');
    expect(arrows[0].hasAttribute('tabindex')).toBe(false); expect(arrows[0].querySelector('text, title')).toBeNull();
  }
  expect(heat.querySelectorAll('button, input, select, textarea, [tabindex]')).toHaveLength(0);
  for (const node of s.staticHeatElements()) {
    for (const handler of ['onClick', 'onChange', 'onInput', 'onKeyDown', 'onPointerDown']) {
      expect(node.props[handler], 'heat presentation has no ' + handler).toBeUndefined();
    }
  }
}

beforeAll(() => { resetStemLab(); cfg = loadTool(SOURCE_PATH, 'waterCycle'); }, 60000);
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 1);
});
afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove());
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Water Cycle live heat actor clarity', () => {
  it.each(PREVIEWS)('states the heat direction and roles for the %s preview', (stageId, _label, energy, energyLabel) => {
    const s = session({ journeyActive: false, activeStage: stageId });
    expectHeat(s, traces.stage[stageId], energy, energyLabel);
    expect(s.data).toEqual(s.initial); expect(s.writes).toEqual([]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
  });

  it.each(JOURNEY)('retains the authored journey heat semantics at %s despite a different preview stage', (state, energy, energyLabel) => {
    const s = session({ journeyActive: true, journeyState: state, activeStage: 'condensation' });
    expectHeat(s, traces.journey[state], energy, energyLabel);
    expect(s.data).toEqual(s.initial); expect(s.writes).toEqual([]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
  });

  it.each([false, true])('keeps original stage writes and saved state with walkthrough=%s', walkthrough => {
    const s = session({ wcWalkthroughActive: walkthrough }).resetTracking();
    const protectedState = withoutSelection(s.data, walkthrough);
    for (const [index, [stageId, _label, energy, energyLabel]] of PREVIEWS.entries()) {
      const expectedWrites = ['stagesViewed'];
      if (s.data.activeStage !== stageId) expectedWrites.unshift('activeStage');
      if (walkthrough && s.data.wcWalkthroughIndex !== index) expectedWrites.push('wcWalkthroughIndex');
      s.resetTracking(); s.select(stageId);
      expect(s.writes).toEqual([expectedWrites]);
      expect(s.data.activeStage).toBe(stageId); expect(s.data.stagesViewed[stageId]).toBe(true);
      if (walkthrough) expect(s.data.wcWalkthroughIndex).toBe(index);
      expect(withoutSelection(s.data, walkthrough)).toEqual(protectedState);
      expectHeat(s, traces.stage[stageId], energy, energyLabel);
      expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
    }
  });

  it('keeps live journey heat authoritative when a native preview selector is used', () => {
    const s = session({ journeyActive: true, journeyState: 'condensing' }).resetTracking();
    const protectedState = withoutSelection(s.data);
    s.select('infiltration');
    expect(s.writes).toEqual([['activeStage', 'stagesViewed']]);
    expect(s.data.activeStage).toBe('infiltration'); expect(s.data.stagesViewed.infiltration).toBe(true);
    expect(withoutSelection(s.data)).toEqual(protectedState);
    expectHeat(s, traces.journey.condensing, 'released', 'Latent heat released to surrounding air');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
  });
});
