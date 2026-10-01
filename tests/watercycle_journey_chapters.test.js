import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { loadTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const BASELINE_PATH = 'reports/watercycle-journey-chapters/baseline-runtime.js';
const BASELINE_SHA = '8e43450261e9faff3de64bdd8d4778ac0495f19a75c1fbe48a91ed66d6279dbb';
const PRESERVED = [
  'WCExploreNotebook', 'wcLandResponse', 'estimateWcLandIndices', 'estimateWcRouteShares',
  'evaporationIndex', 'wcBaselineEvaporationIndex', 'wcCurrentSnapshot', 'wcComparisonDeltas', 'formatWcDelta',
  'WATER_CYCLE_PRESETS', 'WATER_CYCLE_PREDICTIONS', 'getWcInteractionBaseline',
  'adjustClimate', 'adjustLand', 'resetClimate', 'resetLandScenario',
  'captureWcScenarioBaseline', 'restoreWcScenarioBaseline', 'clearWcScenarioBaseline',
  'isolateWcComparisonInput', 'saveWcObservation', 'replayWcObservation', 'recordWcPrediction', 'resetWcPrediction',
  'collectWcRemovedEntries', 'focusWcNotebookHeading', 'clearWcExperimentLog', 'removeWcObservation',
  'undoWcObservationRemoval', 'updateWcObservationNote', 'downloadWcExperimentLog',
  'WCProcessCompare', 'WCNextExperiment', 'wcQuizBank', 'wcQuizQuestion',
  'checkWaterCycleChallenges', 'studyVocab', 'selectStage',
];
PRESERVED.push(
  'canvasRef', 'journey3dRef', 'onWcKey', 'setJourneyReplayProgress', 'resumeLiveJourney', 'chooseJourneyPath',
  'journeyReplaySegmentAt', 'syncWcWalkthroughStage', 'toggleWcWalkthrough', 'stepWcWalkthrough', 'toggleWc2dPlayback',
  'handleWc2dKey', 'handleJourney3dKey', 'handleJourney3dSceneClick', 'controlJourneyCamera', 'beginWcQuickJourney',
  'MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'STAGE_HYDROLOGIC_TIME_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE',
  'WCCheckInvestigation', 'startWcCheckInvestigation', 'returnWcCheckInvestigation', 'updateWcCheckReflection',
  'saveWcCheckReflection', 'closeWcCheckInvestigation', 'renderWcCheckProcess', 'renderWcCheckPores',
  'renderWcCheckAction', 'renderWcCheckInvestigation', 'renderWcCheckHistory'
);
const DELTA_ASSIGNMENTS = ['wcRunoffDelta', 'wcInfiltrationDelta', 'wcEvaporationDelta'];

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
function productionNodes(text, extra = []) {
  const normalized = text.replace(/\r\n/g, '\n');
  const names = [...PRESERVED, ...extra];
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    let name = (node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && node.id.name;
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'Identifier' && DELTA_ASSIGNMENTS.includes(node.left.name)) name = node.left.name + ':assignment';
    if (names.includes(name) || DELTA_ASSIGNMENTS.some(delta => name === delta + ':assignment')) {
      if (result[name]) throw new Error('Non-unique production anchor: ' + name);
      result[name] = normalized.slice(node.start, node.end);
    }
  });
  return result;
}
// Pin the real first-answer reward/counter statements, while permitting a new
// focus handoff after an answer. Revision handlers are exercised separately.
function scoredNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type) || node.body.type !== 'BlockStatement') return;
    const localNames = node.body.body.filter(statement => statement.type === 'VariableDeclaration').flatMap(statement => statement.declarations.map(declaration => declaration.id.name));
    let kind;
    if (localNames.includes('newStreak') && localNames.includes('nextQuizCorrectCount')) kind = 'quiz';
    else if (localNames.includes('nextMythsDone')) kind = 'myth';
    else return;
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
export const waterCycleJourneyVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA,
  preservedNames: PRESERVED, deltaAssignments: DELTA_ASSIGNMENTS,
  productionNodes, scoredNodes,
};

const MODEL = {
  climSolar: 1.2, climTemp: 19, climWind: 1.4, landRainIntensity: 70, landSaturation: 60,
  landPermeability: 'high', landSlope: 'steep', landCover: 'forest',
};
const QUIZ = { q: 'What forms a visible cloud?', a: 'Tiny liquid droplets', opts: ['Invisible vapor', 'Tiny liquid droplets', 'Smoke'],
  answered: true, chosen: 'Invisible vapor', score: 2, concept: 'condensation', wrongFeedback: { 'Invisible vapor': 'Vapor is invisible; condensation produces droplets.' } };
const MYTH = { idx: 5, s: 'Water only evaporates when it is hot or boiling.', t: false,
  why: 'Evaporation happens at every temperature.', tryIt: 'Try the temperature control.', answered: true, chosen: true };
const PROTECTED_STATE = {
  ...MODEL, wcScenarioBaseline: { ...MODEL, climTemp: 15 }, wcScenarioPreset: 'custom',
  wcPrediction: 'evaporation', wcReplayedObservation: 'saved-1',
  wcExperimentLog: [{ key: 'saved-1', label: 'Rain evidence', notes: { evidence: 'Keep recorded evidence.', nextTest: 'Change only sunlight.' } }],
  wcExperimentUndo: [{ index: 0, entry: { key: 'removed-1', label: 'Keep removed evidence.' } }],
  wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep my explanation.' } },
  wcInvestigation: { version: 1, step: 'predict', prediction: 'runoff', reason: 'Keep my reason.', reflection: 'Keep this investigation writing.', storm: null, baseline: null, comparison: null },
  activeStage: 'infiltration', stagesViewed: { infiltration: true }, journeyView: '3d',
  journeyActive: true, journeyPaused: true, journeyState: 'aquifer_flow', journeyReplayProgress: 0.42,
  journeyLoops: 3, journeyPaths: { infiltrate: 2 }, journeyLastPath: 'infiltrate', journeySpeed: 0.5,
  wcWalkthroughActive: true, wcWalkthroughIndex: 2, precipLab3dActive: true, wc2dPaused: true,
  researchPoints: 25, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  wcQuiz: QUIZ, wcMyth: MYTH, vocabWordsStudied: ['condensation'], completedChallenges: ['quiz_pass', 'complete_journey', 'myth_buster'],
};
const source = readFileSync(SOURCE_PATH, 'utf8');
const baselineBytes = readFileSync(BASELINE_PATH);
const sha = value => createHash('sha256').update(value).digest('hex');
waterCycleJourneyVerification.testedSourceSha = sha(source);
const CHAPTERS = ['ocean', 'vapor', 'cloud', 'precipitation', 'land', 'return'];
const LAND_STATES = ['ground_choice', 'river_runoff', 'infiltrating', 'aquifer_flow', 'plant_absorb', 'transpiring'];
const STATE_CHAPTERS = [
  ['ocean', 'ocean'], ['evaporating', 'vapor'], ['condensing', 'cloud'], ['precipitating', 'precipitation'],
  ...LAND_STATES.map(state => [state, 'land']), ['complete', 'return'],
];
let cfg, nodes, originalNodes, helper, matterTrace, timeTrace;
let frames = [];
const fixtures = [];
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
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
function protectedData(data) {
  return clone(Object.fromEntries(Object.entries(data).filter(([key]) => !['wcJourneyChapter', 'wcJourneyLandStep'].includes(key))));
}
function session(overrides = {}) {
  const initial = freeze({ ...clone(PROTECTED_STATE), wcMode: 'explorer', wcSection: 'journey',
    wcJourneyChapter: '', wcJourneyLandStep: 'ground_choice',
    wcCheckInvestigation: null, wcCheckReflections: { kept: { observation: 'Keep my Check writing.' } }, ...overrides });
  const store = newStore({ waterCycle: initial });
  const container = document.createElement('div'); document.body.append(container); fixtures.push(container);
  const awardXP = vi.fn(), toast = vi.fn(), announce = vi.fn(), celebrate = vi.fn();
  let tree;
  const api = {
    initial, store, container, awardXP, toast, announce, celebrate,
    get data() { return store.toolData.waterCycle; },
    render() {
      for (let pass = 0; pass < 5; pass++) {
        store.dirty = false;
        const ctx = makeCtx({ toolData: store.toolData, gradeLevel: '11th Grade', awardXP, addToast: toast, announceToSR: announce, celebrate }, store);
        const Comp = () => { tree = cfg.render(ctx); return tree; };
        container.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
        if (!store.dirty) break;
      }
      return api;
    },
    element(id) {
      const found = treeElements(tree).filter(node => node.props.id === id);
      expect(found, id).toHaveLength(1); return found[0];
    },
    click(id) {
      const element = api.element(id);
      expect(element.type, id).toBe('button');
      expect(element.props.type, id).toBe('button');
      expect(element.props.disabled, id).not.toBe(true);
      expect(typeof element.props.onClick, id).toBe('function');
      const before = protectedData(api.data);
      // SSR does not mount the animation refs. Watch the actual callback's DOM
      // writes before replacing its markup; the browser suite checks ref identity.
      const canvases = [...container.querySelectorAll('#wcCanvas, #wcJourney3d')].map(canvas => {
        canvas.dataset.journeyProgress = '0.42';
        const methods = ['_wcRestartJourney', '_wcSetJourneyProgress', '_onJourneyTransition', '_wcSyncReact', '_wcRedraw'];
        methods.forEach(name => { canvas[name] = vi.fn(); });
        return { canvas, dataset: { ...canvas.dataset }, methods };
      });
      element.props.onClick({ preventDefault() {}, stopPropagation() {} });
      expect(protectedData(api.data), id + ' preserves all non-chapter state').toEqual(before);
      canvases.forEach(({ canvas, dataset, methods }) => {
        expect({ ...canvas.dataset }, id + ' preserves canvas datasets').toEqual(dataset);
        methods.forEach(name => expect(canvas[name], id + ': ' + name).not.toHaveBeenCalled());
      });
      api.render().focusFrames();
      expect(document.activeElement.id).toBe('wcJourneyChapterTitle');
      expect(document.activeElement.tabIndex).toBe(-1);
      expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
      return api;
    },
    focusFrames() {
      vi.runOnlyPendingTimers();
      for (let pass = 0; frames.length && pass < 12; pass++) { const pending = frames; frames = []; pending.forEach(callback => callback()); }
      return api;
    },
    setState(patch) { store.toolData = { ...store.toolData, waterCycle: { ...api.data, ...patch } }; return api.render(); },
  };
  return api.render();
}
function describeChapter(data) { return helper.describe(data, matterTrace, timeTrace); }

beforeAll(() => {
  console.info('[WaterCycleJourneyVerification] sourceSha256=' + waterCycleJourneyVerification.testedSourceSha);
  nodes = productionNodes(source, ['WCJourneyChapters']);
  originalNodes = productionNodes(baselineBytes.toString('utf8'));
  [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => {
    if (!nodes[name] || !originalNodes[name]) throw new Error('Missing preservation anchor: ' + name);
  });
  helper = new Function('var ' + nodes.WCJourneyChapters + '; return WCJourneyChapters;')();
  const traceNames = ['MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE'];
  const traces = new Function(traceNames.map(name => 'var ' + nodes[name] + ';').join('\n') + '\nreturn { matter: JOURNEY_MATTER_ENERGY_TRACE, time: JOURNEY_HYDROLOGIC_TIME_TRACE };')();
  matterTrace = freeze(traces.matter); timeTrace = freeze(traces.time);
  resetStemLab(); cfg = loadTool(SOURCE_PATH, 'waterCycle');
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function() {};
}, 120000);
beforeEach(() => {
  vi.useFakeTimers(); frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
});
afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove()); frames = [];
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Water Cycle chapter browser preservation', () => {
  it('preserves complete animation engines, route/replay handlers, models, notes and Check implementations', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => expect(sha(nodes[name]), name).toBe(sha(originalNodes[name])));
  });
  it('preserves the original first-answer score, counter and reward statements', () => {
    expect(scoredNodes(source)).toEqual(scoredNodes(baselineBytes.toString('utf8')));
  });
  it('ships byte-identical source and desktop chapter implementations', () => {
    expect(sha(readFileSync(MIRROR_PATH))).toBe(sha(readFileSync(SOURCE_PATH)));
  });
});

describe('Water Cycle chapter catalog and scientific descriptions', () => {
  it('returns detached bounded catalogs that callers cannot change', () => {
    expect(helper.ids()).toEqual(CHAPTERS); expect(helper.landStates()).toEqual(LAND_STATES);
    helper.ids().push('invented'); helper.landStates().splice(0);
    expect(helper.ids()).toEqual(CHAPTERS); expect(helper.landStates()).toEqual(LAND_STATES);
  });
  it('rejects inherited keys, objects and unsupported saved selections without coercion', () => {
    const hostile = { toString() { throw new Error('must not coerce persisted objects'); } };
    for (const value of [undefined, null, 0, 'constructor', '__proto__', 'invented', hostile]) {
      expect(helper.normalizeChapter(value)).toBe(''); expect(helper.normalizeLandStep(value)).toBe('ground_choice');
    }
    CHAPTERS.forEach(id => expect(helper.normalizeChapter(id)).toBe(id));
    LAND_STATES.forEach(state => expect(helper.normalizeLandStep(state)).toBe(state));
  });
  it.each(STATE_CHAPTERS)('follows the actual %s parcel in the %s chapter', (state, id) => {
    const data = freeze({ journeyActive: true, journeyState: state, wcJourneyChapter: '', wcJourneyLandStep: 'ground_choice' });
    expect(helper.resolve(data)).toMatchObject({ id, index: CHAPTERS.indexOf(id), state, following: true, showLandSteps: id === 'land' });
  });
  it.each(CHAPTERS)('selects the %s chapter independently of a paused underground parcel', id => {
    const data = freeze({ journeyActive: true, journeyState: 'aquifer_flow', journeyPaused: true, journeyReplayProgress: 0.42, wcJourneyChapter: id, wcJourneyLandStep: 'plant_absorb' });
    const expectedState = { ocean: 'ocean', vapor: 'evaporating', cloud: 'condensing', precipitation: 'precipitating', land: 'plant_absorb', return: 'complete' }[id];
    expect(helper.resolve(data)).toMatchObject({ id, state: expectedState, following: false, showLandSteps: id === 'land' });
    expect(data.journeyState).toBe('aquifer_flow'); expect(data.journeyReplayProgress).toBe(0.42);
  });
  it('starts inactive or invalid remembered parcels in ocean storage without claiming a traveled route', () => {
    expect(helper.resolve({ journeyActive: false, journeyState: 'aquifer_flow' })).toMatchObject({ id: 'ocean', state: 'ocean', following: true });
    expect(helper.resolve({ journeyActive: true, journeyState: 'constructor', wcJourneyChapter: '__proto__' })).toMatchObject({ id: 'ocean', state: 'ocean' });
  });
  it('describes condensation as vapor becoming liquid droplets and separates deposition', () => {
    const result = describeChapter(freeze({ wcJourneyChapter: 'cloud' }));
    expect(result.phaseFrom).toMatch(/vapor/i); expect(result.phaseTo).toMatch(/liquid.*droplet/i);
    expect(result.phaseTo).not.toMatch(/ice/i); expect(result.destination).not.toMatch(/ice/i);
    expect(result.energyTransfer).toBe('released'); expect(result.note).toMatch(/deposition/i);
    expect(matterTrace.condensing.phaseTo).toBe('Liquid droplets or ice');
  });
  it.each([
    ['infiltrating', /soil.*pore/i, /not.*recharge/i],
    ['aquifer_flow', /groundwater/i, /years.*millennia/i],
    ['plant_absorb', /plant.*xylem/i, /no phase change/i],
    ['transpiring', /vapor/i, /absorbed/i],
  ])('keeps the %s substep scientifically distinct with time and energy limits', (state, content, limit) => {
    const data = freeze({ wcJourneyChapter: 'land', wcJourneyLandStep: state });
    const result = describeChapter(data);
    expect(result.state).toBe(state);
    expect([result.source, result.destination, result.phaseFrom, result.phaseTo].join(' ')).toMatch(content);
    expect([result.energyLabel, result.timeLabel, result.timeCaveat, result.note].join(' ')).toMatch(limit);
    expect(result.timeLabel).toBe(timeTrace[state].label); expect(result.timeCaveat).toBe(timeTrace[state].caveat);
    expect(result.question.trim().length).toBeGreaterThan(10);
    result.source = 'changed'; expect(describeChapter(data).source).not.toBe('changed');
  });
});

const PARCEL_CASES = [
  ['inactive', { journeyActive: false, journeyState: 'idle', journeyPaused: false, journeyReplayProgress: null }],
  ['moving 2D', { journeyView: '2d', journeyState: 'evaporating', journeyPaused: false, journeyReplayProgress: null }],
  ['paused 3D aquifer', { journeyView: '3d', journeyState: 'aquifer_flow', journeyPaused: true, journeyReplayProgress: null }],
  ['scrubbed replay', { journeyState: 'aquifer_flow', journeyPaused: true, journeyReplayProgress: 0.86 }],
  ['land choice', { journeyState: 'ground_choice', journeyPaused: false, journeyReplayProgress: null }],
  ['completed loop', { journeyState: 'complete', journeyPaused: false, journeyReplayProgress: null }],
];
describe('Water Cycle native chapter controls and actual callbacks', () => {
  it.each(PARCEL_CASES)('browses all six chapters with focus and without changing the %s parcel or any saved learning', (label, overrides) => {
    const s = session(overrides);
    for (const id of CHAPTERS) {
      const button = s.container.querySelector('#wcJourneyChapter-' + id);
      expect(button.tagName).toBe('BUTTON'); expect(button.textContent.trim()).not.toBe('');
      s.click('wcJourneyChapter-' + id);
      expect(s.data.wcJourneyChapter).toBe(id);
      expect(s.container.querySelector('#wcJourneyChapter-' + id).getAttribute('aria-pressed')).toBe('true');
      expect(s.container.querySelector('#wcJourneyChapterTitle').textContent.trim()).not.toBe('');
    }
  });
  it('inspects every land substep independently of the paused parcel and follows it again without choosing a route', () => {
    const s = session(); s.click('wcJourneyChapter-land');
    for (const state of LAND_STATES) {
      s.click('wcJourneyLandStep-' + state);
      expect(s.data.wcJourneyLandStep).toBe(state);
      expect(helper.resolve(s.data)).toMatchObject({ id: 'land', state, following: false });
      expect(s.container.querySelector('#wcJourneyLandStep-' + state).getAttribute('aria-pressed')).toBe('true');
    }
    s.click('wcJourneyFollowParcel');
    expect(s.data.wcJourneyChapter).toBe(''); expect(s.data.wcJourneyLandStep).toBe('transpiring');
    expect(helper.resolve(s.data)).toMatchObject({ id: 'land', state: 'aquifer_flow', following: true });
  });
  it('keeps a chosen chapter while the parcel advances and follows the current parcel only on request', () => {
    const s = session(); s.click('wcJourneyChapter-cloud');
    s.setState({ journeyState: 'precipitating', activeStage: 'precipitation' });
    expect(helper.resolve(s.data)).toMatchObject({ id: 'cloud', state: 'condensing', following: false });
    s.click('wcJourneyFollowParcel');
    expect(helper.resolve(s.data)).toMatchObject({ id: 'precipitation', state: 'precipitating', following: true });
  });
  it('renders invalid saved chapter keys safely without rewriting parcel state or learner writing', () => {
    const s = session({ wcJourneyChapter: 'constructor', wcJourneyLandStep: '__proto__' });
    expect(helper.resolve(s.data)).toMatchObject({ id: 'land', state: 'aquifer_flow', following: true });
    s.click('wcJourneyChapter-land');
    expect(helper.resolve(s.data)).toMatchObject({ state: 'ground_choice' });
    s.click('wcJourneyLandStep-aquifer_flow');
    expect(helper.resolve(s.data)).toMatchObject({ state: 'aquifer_flow' });
  });
  it('distinguishes live parcel labels from scrubbed replay positions', () => {
    const s = session({ journeyState: 'transpiring', journeyLastPath: 'plant', journeyReplayProgress: null });
    const liveHeader = s.container.querySelector('.wc-replay-head');
    expect(liveHeader.textContent).toMatch(/transpiration/i);
    expect(liveHeader.textContent).not.toMatch(/\d+%/);
    const liveReplayValueText = s.container.querySelector('#wcJourneyReplayScrub').getAttribute('aria-valuetext');
    expect(liveReplayValueText).toMatch(/replay/i);
    expect(liveReplayValueText).toMatch(/transpiration/i);
    s.setState({ journeyState: 'aquifer_flow', journeyLastPath: 'infiltrate', journeyReplayProgress: 0.86 });
    expect(s.container.querySelector('.wc-replay-head').textContent).toMatch(/86%/);
    expect(s.container.querySelector('.wc-replay-head').textContent).toMatch(/aquifer/i);
    expect(s.container.querySelector('#wcJourneyReplayScrub').value).toBe('86');
    s.setState({ journeyState: 'complete', journeyReplayProgress: 1, journeyLoops: 0 });
    expect(s.container.querySelector('[data-watercycle-journey]').textContent).not.toMatch(/Loop 1 recorded|\+25 XP|You completed the water cycle/i);
    s.setState({ journeyReplayProgress: null, journeyLoops: 3 });
    expect(s.container.querySelector('[data-watercycle-journey]').textContent).toMatch(/Loop 3 recorded.*\+25 XP/i);
  });
  it('does not mark other chapters completed merely because the parcel is later in the cycle', () => {
    const s = session({ journeyState: 'aquifer_flow', journeyLoops: 0, journeyReplayProgress: null });
    const chapterButtons = CHAPTERS.map(id => s.container.querySelector('#wcJourneyChapter-' + id));
    chapterButtons.forEach(button => expect([button.textContent, button.getAttribute('aria-label')].join(' ')).not.toMatch(/completed|upcoming|✓/i));
    expect(chapterButtons.filter(button => button.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(s.container.querySelector('#wcJourneyChapter-land').getAttribute('aria-current')).toBe('step');
    expect(s.container.querySelector('#wcJourneyChapter-land').getAttribute('aria-label')).toMatch(/current parcel/i);
    s.setState({ journeyReplayProgress: 0.86 });
    expect(s.container.querySelector('#wcJourneyChapter-land').getAttribute('aria-label')).toMatch(/replay parcel/i);
  });
});
