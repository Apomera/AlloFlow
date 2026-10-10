import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import {
  loadTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const BASELINE_PATH = 'reports/watercycle-heat-actor-clarity/candidate-runtime.js';
const BASELINE_SHA = '12132650ea1f18152ac4bf1e07dfd1c4c9d1c9bc84501276904ada975ad3e244';
const LAND_STEPS = [
  ['ground_choice', 'Path choice', 'overview'],
  ['river_runoff', 'River runoff', 'surface'],
  ['infiltrating', 'Soil infiltration', 'soil'],
  ['aquifer_flow', 'Aquifer flow', 'soil'],
  ['plant_absorb', 'Plant uptake', 'plants'],
  ['transpiring', 'Transpiration', 'plants'],
];
const GROUPS = [
  ['surface', 'Surface water', 'Water moving across the land surface.', ['river_runoff']],
  ['soil', 'Soil and groundwater', 'Entering soil does not guarantee groundwater recharge.', ['infiltrating', 'aquifer_flow']],
  ['plants', 'Plants', 'Compare liquid uptake with vapor leaving leaves.', ['plant_absorb', 'transpiring']],
];
const PRESERVED = [
  'WCJourneyChapters', 'WCExploreNotebook', 'WCProcessCompare', 'checkWaterCycleChallenges',
  'wcProcessDiagram', 'wcJourneyChapterDiagram', 'focusWcJourneyChapter',
  'inspectWcJourneyChapter', 'inspectWcJourneyLandStep', 'followWcJourneyParcel',
  'MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE',
];
const BASE = {
  wcMode: 'explorer', wcSection: 'journey', journeyView: '2d',
  wcJourneyChapter: '', wcJourneyLandStep: 'ground_choice', activeStage: 'infiltration',
  journeyActive: true, journeyState: 'aquifer_flow', journeyPaused: true, journeyReplayProgress: null,
  journeyLoops: 3, journeyPaths: { runoff: 1, infiltrate: 2, plant: 1 }, journeyLastPath: 'infiltrate', journeySpeed: 0.5,
  stagesViewed: { infiltration: true }, wc2dPaused: true, wcWalkthroughActive: true, wcWalkthroughIndex: 2,
  climSolar: 1.2, climTemp: 19, climWind: 1.4,
  landRainIntensity: 70, landSaturation: 60, landPermeability: 'high', landSlope: 'steep', landCover: 'forest',
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1, landSaturation: 40 }, wcScenarioPreset: 'custom',
  wcExperimentLog: [{ key: 'saved-1', label: 'Rain evidence', notes: { evidence: 'Keep recorded evidence.', nextTest: 'Change only sunlight.' } }],
  wcExperimentUndo: [{ index: 0, entry: { key: 'removed-1', label: 'Keep removed evidence.' } }],
  wcPrediction: 'evaporation', wcReplayedObservation: 'saved-1',
  wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep my explanation.' } },
  wcInvestigation: { version: 1, step: 'predict', prediction: 'runoff', reason: 'Keep my reason.', reflection: 'Keep this investigation writing.', storm: null, baseline: null, comparison: null },
  wcCheckInvestigation: null, wcCheckReflections: { kept: { observation: 'Keep my Check writing.' } },
  wcGroundwaterLens: {
    explorer: { version: 1, identity: 'groundwater-lens-v1', part: 'boundary', answer: 'soil_storage' },
    check: { version: 1, identity: 'retained-check-question', part: 'groundwater', answer: 'dry_soil' },
  },
  precipHunt: { experiment: { prediction: 'Keep the storm prediction.', saved: [{ explanation: 'Keep storm reasoning.' }] } },
  wcThermalLayerInspector: { node: 'middle', answer: 'liquid' },
  researchPoints: 25, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  wcQuiz: { q: 'What forms a visible cloud?', a: 'Tiny liquid droplets', opts: ['Invisible vapor', 'Tiny liquid droplets'], answered: true, chosen: 'Invisible vapor', score: 2, concept: 'condensation' },
  wcMyth: { idx: 5, s: 'Water only evaporates when boiling.', t: false, answered: true, chosen: true },
  vocabWordsStudied: ['condensation'],
  completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
  unrelated: { nested: ['Keep this other saved value.'] },
};
const source = readFileSync(SOURCE_PATH, 'utf8');
const baselineBytes = readFileSync(BASELINE_PATH);
const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const fixtures = [];
let cfg, nodes, priorNodes, chapterHelper, matterTrace, timeTrace, frames = [];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function declarations(text) {
  const result = {}, pending = [parse(text, { ecmaVersion: 'latest' })];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id?.name;
    if (PRESERVED.includes(name)) {
      if (result[name]) throw new Error('Duplicate preservation declaration: ' + name);
      result[name] = text.slice(node.start, node.end);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  return result;
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
function protectedData(data) {
  return clone(Object.fromEntries(Object.entries(data).filter(([key]) =>
    !['wcJourneyChapter', 'wcJourneyLandStep'].includes(key))));
}
function before(first, second) {
  expect(first, 'first reading-order element').not.toBeNull(); expect(second, 'next reading-order element').not.toBeNull();
  expect(Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
}

// Complete registered-tool render and original native chapter callbacks.
// Canvas refs stay unmounted in SSR; observe callback writes before rerendering.
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
    get card() {
      const found = container.querySelectorAll('#wcJourneyChapterCard');
      expect(found, 'native selected chapter card').toHaveLength(1); return found[0];
    },
    get options() {
      const found = container.querySelectorAll('.wc-chapter-land-options');
      expect(found, 'native land inspection choices').toHaveLength(1); return found[0];
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
    click(id) {
      const found = treeElements(tree).filter(node => node.props.id === id);
      expect(found, 'original callback ' + id).toHaveLength(1);
      expect(found[0].type).toBe('button'); expect(found[0].props.type).toBe('button');
      expect(found[0].props.disabled).not.toBe(true); expect(typeof found[0].props.onClick).toBe('function');
      const protectedBefore = protectedData(api.data);
      const canvases = [...container.querySelectorAll('#wcCanvas, #wcJourney3d')].map(canvas => {
        canvas.dataset.journeyProgress = '0.42';
        const methods = ['_wcRestartJourney', '_wcSetJourneyProgress', '_onJourneyTransition', '_wcSyncReact', '_wcRedraw'];
        methods.forEach(name => { canvas[name] = vi.fn(); });
        return { canvas, dataset: { ...canvas.dataset }, methods };
      });
      found[0].props.onClick({ preventDefault() {}, stopPropagation() {} });
      expect(protectedData(api.data), id + ' preserves parcel and saved learning').toEqual(protectedBefore);
      for (const { canvas, dataset, methods } of canvases) {
        expect({ ...canvas.dataset }, id + ' preserves live canvas progress').toEqual(dataset);
        methods.forEach(name => expect(canvas[name], name).not.toHaveBeenCalled());
      }
      api.render();
      const heading = container.querySelector('#wcJourneyChapterTitle');
      heading.scrollIntoView = vi.fn();
      vi.runOnlyPendingTimers();
      for (let pass = 0; frames.length && pass < 12; pass++) {
        const pending = frames; frames = []; pending.forEach(callback => callback());
      }
      expect(document.activeElement).toBe(heading); expect(heading.tabIndex).toBe(-1);
      expect(heading.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
      expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
      return api;
    },
    resetTracking() { writes.length = 0; awardXP.mockClear(); celebrate.mockClear(); frames = []; return api; },
  };
  return api.render().resetTracking();
}
function expectChapterReading(s) {
  const described = chapterHelper.describe(s.data, matterTrace, timeTrace);
  expect(s.card.dataset.chapterId).toBe(described.id); expect(s.card.dataset.chapterState).toBe(described.state);
  expect(s.card.dataset.followingParcel).toBe(String(described.following));
  expect(s.card.querySelector('[data-chapter-source]').textContent).toBe(described.source);
  expect(s.card.querySelector('[data-chapter-destination]').textContent).toBe(described.destination);
  expect(s.card.querySelector('[data-chapter-phase-from]').textContent).toBe(described.phaseFrom);
  expect(s.card.querySelector('[data-chapter-phase-to]').textContent).toBe(described.phaseTo);
  expect(s.card.querySelector('.wc-chapter-energy').dataset.energyTransfer).toBe(described.energyTransfer);
  expect(s.card.querySelector('.wc-chapter-energy dd').textContent).toBe(described.energyLabel);
  expect(s.card.querySelector('.wc-chapter-question p').textContent).toBe(described.question);
  expect(s.card.querySelector('[data-chapter-note]').textContent).toContain(described.note);
}

beforeAll(() => {
  nodes = declarations(source); priorNodes = declarations(baselineBytes.toString('utf8'));
  chapterHelper = new Function('var ' + nodes.WCJourneyChapters + '; return WCJourneyChapters;')();
  const traceNames = ['MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE'];
  const traces = new Function(traceNames.map(name => 'var ' + nodes[name] + ';').join('\n') +
    '\nreturn { matter: JOURNEY_MATTER_ENERGY_TRACE, time: JOURNEY_HYDROLOGIC_TIME_TRACE };')();
  matterTrace = freeze(traces.matter); timeTrace = freeze(traces.time);
  resetStemLab(); cfg = loadTool(SOURCE_PATH, 'waterCycle');
}, 120000);
beforeEach(() => {
  vi.useFakeTimers(); frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
});
afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove()); frames = [];
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Water Cycle grouped land pathway inspection', () => {
  it('retains the prior catalogs, resolver, scientific diagrams, callbacks, rewards and notebook declarations', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    expect(Object.keys(nodes).sort()).toEqual([...PRESERVED].sort());
    expect(Object.keys(priorNodes).sort()).toEqual([...PRESERVED].sort());
    for (const name of PRESERVED) expect(nodes[name], name).toBe(priorNodes[name]);
    expect(sha(readFileSync(MIRROR_PATH))).toBe(sha(readFileSync(SOURCE_PATH)));
    expect(chapterHelper.landDefinitions()).toEqual(LAND_STEPS.map(([id, label]) => ({ id, label })));
  });

  it('places the original overview before three groups while retaining all six IDs, labels and reading order', () => {
    const s = session({ wcJourneyChapter: 'land' });
    const options = s.options;
    expect(options.getAttribute('role')).toBe('group');
    expect(options.getAttribute('aria-labelledby')).toBe('wcJourneyLandStepLabel');
    expect(s.card.querySelector('#wcJourneyLandStepLabel').textContent).toBe('Inspect a land step');
    const overview = options.querySelector('.wc-chapter-land-overview');
    expect(overview, 'native overview area').not.toBeNull();
    const overviewButton = overview.matches('button') ? overview : overview.querySelector('button');
    expect(overviewButton.id).toBe('wcJourneyLandStep-ground_choice');
    const routes = options.querySelector('.wc-chapter-land-routes'); before(overview, routes);
    expect([...routes.querySelectorAll('[data-land-pathway]')].map(group => group.dataset.landPathway)).toEqual(GROUPS.map(([id]) => id));
    const buttons = [...options.querySelectorAll('button')];
    expect(buttons.map(button => [button.id, button.textContent])).toEqual(LAND_STEPS.map(([id, label]) => ['wcJourneyLandStep-' + id, label]));
    for (const [index, button] of buttons.entries()) {
      expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe('wcJourneyChapterCard');
      expect(s.container.querySelectorAll('[id="' + button.id + '"]')).toHaveLength(1);
      if (index) before(buttons[index - 1], button);
    }
  });

  it('names each native group with its own heading and preserves clear scientific distinctions', () => {
    const s = session({ wcJourneyChapter: 'land' });
    for (const [id, name, cue, states] of GROUPS) {
      const group = s.options.querySelector('[data-land-pathway="' + id + '"]');
      const titleId = 'wcJourneyLandPathway-' + id + '-Title';
      const cueId = 'wcJourneyLandPathway-' + id + '-Cue';
      expect(group.getAttribute('role')).toBe('group'); expect(group.getAttribute('aria-labelledby')).toBe(titleId);
      expect(group.getAttribute('aria-describedby')).toBe(cueId);
      const title = group.querySelector('h6[id="' + titleId + '"]');
      expect(title.textContent).toBe(name); expect(s.container.querySelectorAll('[id="' + titleId + '"]')).toHaveLength(1);
      const cueElement = group.querySelector('p.wc-land-pathway-cue[id="' + cueId + '"]');
      expect(cueElement.textContent).toBe(cue); expect(s.container.querySelectorAll('[id="' + cueId + '"]')).toHaveLength(1);
      expect([...group.querySelectorAll('button')].map(button => button.id)).toEqual(states.map(state => 'wcJourneyLandStep-' + state));
      before(title, cueElement); before(cueElement, group.querySelector('button'));
    }
  });

  it('keeps each pathway icon decorative and outside the native selector content', () => {
    const s = session({ wcJourneyChapter: 'land' });
    const icons = [...s.options.querySelectorAll('svg[data-land-pathway-icon]')];
    expect(icons.map(icon => icon.dataset.landPathwayIcon)).toEqual(GROUPS.map(([id]) => id));
    for (const icon of icons) {
      expect(icon.closest('[data-land-pathway]').dataset.landPathway).toBe(icon.dataset.landPathwayIcon);
      expect(icon.getAttribute('aria-hidden')).toBe('true'); expect(icon.getAttribute('focusable')).toBe('false');
      expect(icon.hasAttribute('tabindex')).toBe(false); expect(icon.querySelector('text, title, a, [tabindex]')).toBeNull();
      expect(icon.closest('button')).toBeNull(); expect(icon.querySelector('path, circle, line, ellipse, rect, polyline')).not.toBeNull();
    }
    expect(s.options.querySelectorAll('svg')).toHaveLength(3);
  });

  it('shows independent inspections without arrows linking soil entry to an aquifer or joining groups', () => {
    const s = session({ wcJourneyChapter: 'land' });
    expect(s.options.querySelector('.wc-chapter-direction')).toBeNull();
    expect(s.options.textContent).not.toMatch(/[→↔↓⇒⟶]/);
    for (const shape of s.options.querySelectorAll('svg, path, line, polyline')) {
      expect(shape.closest('svg[data-land-pathway-icon]'), 'drawing belongs to an individual decorative icon').not.toBeNull();
    }
    const soil = s.options.querySelector('[data-land-pathway="soil"]');
    expect(soil.textContent).toContain('Entering soil does not guarantee groundwater recharge.');
    expect([...soil.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Soil infiltration', 'Aquifer flow']);
  });

  it.each(LAND_STEPS)('uses the original %s inspection callback and preserves the live parcel and saved learning', (state, _label, groupId) => {
    const s = session();
    const protectedBefore = protectedData(s.data);
    const expectedWrites = ['wcJourneyChapter'];
    if (s.data.wcJourneyLandStep !== state) expectedWrites.push('wcJourneyLandStep');
    s.click('wcJourneyLandStep-' + state);
    expect(s.writes).toEqual([expectedWrites]);
    expect(s.data.wcJourneyChapter).toBe('land'); expect(s.data.wcJourneyLandStep).toBe(state);
    expect(protectedData(s.data)).toEqual(protectedBefore); expectChapterReading(s);
    const pressed = [...s.options.querySelectorAll('button[aria-pressed="true"]')];
    expect(pressed).toHaveLength(1); expect(pressed[0].id).toBe('wcJourneyLandStep-' + state);
    expect(pressed[0].closest('[data-land-pathway]')?.dataset.landPathway || 'overview').toBe(groupId);
    const activeGroups = [...s.options.querySelectorAll('[data-land-pathway][data-active="true"]')];
    expect(activeGroups.map(group => group.dataset.landPathway)).toEqual(groupId === 'overview' ? [] : [groupId]);
    expect(s.options.querySelectorAll('.wc-land-pathway-active')).toHaveLength(activeGroups.length);
    for (const [id] of GROUPS) {
      const group = s.options.querySelector('[data-land-pathway="' + id + '"]');
      expect(group.dataset.active).toBe(String(id === groupId));
      expect(group.querySelector('.wc-land-pathway-active')?.textContent || '').toBe(id === groupId ? 'Inspecting this pathway' : '');
    }
    expect(s.card.dataset.followingParcel).toBe('false');
    expect(s.container.querySelector('#wcJourneyFollowParcel').getAttribute('aria-pressed')).toBe('false');
  });

  it.each([
    ['river_runoff', 'plant_absorb', /runoff/i],
    ['infiltrating', 'transpiring', /infiltrat|soil/i],
    ['transpiring', 'aquifer_flow', /transpiration/i],
  ])('keeps the current %s parcel badge accurate while inspecting %s in another group', (currentState, inspectedState, terms) => {
    const s = session({ journeyState: currentState, journeyReplayProgress: null });
    const badgeBefore = s.container.querySelector('[data-wc-chapter-parcel]').textContent;
    expect(badgeBefore).toMatch(/^Current parcel:/); expect(badgeBefore).toMatch(terms);
    s.click('wcJourneyLandStep-' + inspectedState);
    expect(s.container.querySelector('[data-wc-chapter-parcel]').textContent).toBe(badgeBefore);
    expect(s.data.journeyState).toBe(currentState); expect(s.card.dataset.chapterState).toBe(inspectedState);
    const current = s.container.querySelectorAll('.wc-timeline-step[data-current-parcel="true"]');
    expect(current).toHaveLength(1); expect(current[0].querySelector('button').id).toBe('wcJourneyChapter-land');
    expect(current[0].querySelector('.wc-chapter-current').textContent).toBe('Current parcel');
    expect(current[0].querySelector('button').getAttribute('aria-current')).toBe('step');
  });

  it.each([
    ['ready', { journeyActive: false, journeyState: 'idle', journeyPaused: false }, 'ocean', 'ocean', 'Journey ready:'],
    ['moving 2D', { journeyState: 'evaporating', journeyPaused: false }, 'vapor', 'evaporating', 'Current parcel:'],
    ['paused 3D', { journeyView: '3d', journeyState: 'aquifer_flow', journeyPaused: true }, 'land', 'aquifer_flow', 'Current parcel:'],
    ['scrubbed replay', { journeyState: 'aquifer_flow', journeyReplayProgress: 0.86 }, 'land', 'aquifer_flow', 'Replay parcel:'],
    ['land choice', { journeyState: 'ground_choice', journeyPaused: false }, 'land', 'ground_choice', 'Current parcel:'],
    ['completed loop', { journeyState: 'complete', journeyPaused: false }, 'return', 'complete', 'Current parcel:'],
  ])('follows the %s parcel again without choosing a route or clearing the remembered inspection', (_label, patch, chapter, state, prefix) => {
    const s = session({ wcJourneyChapter: 'land', ...patch });
    s.click('wcJourneyLandStep-plant_absorb');
    const protectedBefore = protectedData(s.data);
    s.resetTracking().click('wcJourneyFollowParcel');
    expect(s.writes).toEqual([['wcJourneyChapter']]);
    expect(s.data.wcJourneyChapter).toBe(''); expect(s.data.wcJourneyLandStep).toBe('plant_absorb');
    expect(protectedData(s.data)).toEqual(protectedBefore); expectChapterReading(s);
    expect(s.card.dataset.chapterId).toBe(chapter); expect(s.card.dataset.chapterState).toBe(state);
    expect(s.card.dataset.followingParcel).toBe('true');
    expect(s.container.querySelector('#wcJourneyFollowParcel').getAttribute('aria-pressed')).toBe('true');
    expect(s.container.querySelector('[data-wc-chapter-parcel]').textContent.startsWith(prefix)).toBe(true);
    if (chapter === 'land') {
      const pressed = s.options.querySelectorAll('button[aria-pressed="true"]');
      expect(pressed).toHaveLength(1); expect(pressed[0].id).toBe('wcJourneyLandStep-' + state);
      const groupId = LAND_STEPS.find(([id]) => id === state)[2];
      expect([...s.options.querySelectorAll('[data-land-pathway][data-active="true"]')].map(group => group.dataset.landPathway))
        .toEqual(groupId === 'overview' ? [] : [groupId]);
    } else expect(s.container.querySelector('.wc-chapter-land-options')).toBeNull();
  });
});
