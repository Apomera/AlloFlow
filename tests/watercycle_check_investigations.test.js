import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { loadTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const BASELINE_PATH = 'reports/watercycle-check-investigations/baseline-runtime.js';
const BASELINE_SHA = '384eca9416719d616d50623847aa6fdabec346106967153f678cd76ee508be6c';
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
export const waterCycleCheckVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA,
  preservedNames: PRESERVED, deltaAssignments: DELTA_ASSIGNMENTS,
  productionNodes, scoredNodes,
};

const source = readFileSync(SOURCE_PATH, 'utf8');
waterCycleCheckVerification.testedSourceSha = createHash('sha256').update(source).digest('hex');
const baselineBytes = readFileSync(BASELINE_PATH);
let cfg, nodes, originalNodes, helper;
let frames = [];
const fixtures = [];
function clone(value) { return JSON.parse(JSON.stringify(value)); }
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
function treeText(tree) {
  if (Array.isArray(tree)) return tree.map(treeText).join(' ').trim();
  if (tree == null || typeof tree === 'boolean') return '';
  if (React.isValidElement(tree)) return treeText(tree.props.children);
  return String(tree);
}
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
function session(overrides = {}, options = {}) {
  const initial = freeze({ ...clone(PROTECTED_STATE), wcMode: 'explorer', wcSection: 'check', ...overrides });
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
        const ctx = makeCtx({ toolData: store.toolData, gradeLevel: '11th Grade',
          awardXP, addToast: toast, announceToSR: announce, celebrate, ...options }, store);
        const Comp = () => { tree = cfg.render(ctx); return tree; };
        container.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
        if (!store.dirty) break;
      }
      return api;
    },
    element(predicate) {
      const found = treeElements(tree).filter(node => predicate(node.props, node));
      expect(found, 'matching production element').toHaveLength(1); return found[0];
    },
    click(predicate) {
      const element = api.element(predicate);
      expect(element.props.disabled).not.toBe(true);
      expect(typeof element.props.onClick).toBe('function');
      element.props.onClick({ preventDefault() {}, stopPropagation() {} });
      api.render(); return api;
    },
    change(predicate, value) {
      const element = api.element(predicate);
      expect(typeof element.props.onChange).toBe('function');
      element.props.onChange({ target: { value } });
      api.render(); return api;
    },
    focusFrames() {
      vi.runOnlyPendingTimers();
      for (let pass = 0; frames.length && pass < 12; pass++) { const pending = frames; frames = []; pending.forEach(callback => callback()); }
      return api;
    },
    buttons() { return treeElements(tree).filter(node => node.type === 'button').map(node => ({ ...node.props, text: treeText(node) })); },
  };
  return api.render();
}
function unchanged(s, keys = Object.keys(PROTECTED_STATE)) {
  keys.forEach(key => expect(s.data[key], key).toEqual(s.initial[key]));
  expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
}

beforeAll(() => {
  console.info('[WaterCycleCheckVerification] sourceSha256=' + waterCycleCheckVerification.testedSourceSha);
  nodes = productionNodes(source, ['WCCheckInvestigation']);
  originalNodes = productionNodes(baselineBytes.toString('utf8'));
  [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => {
    if (!nodes[name] || !originalNodes[name]) throw new Error('Missing production anchor: ' + name);
  });
  helper = new Function('var ' + nodes.WCCheckInvestigation + '; return WCCheckInvestigation;')();
  resetStemLab(); cfg = loadTool(SOURCE_PATH, 'waterCycle');
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function() {};
}, 60000);
beforeEach(() => {
  vi.useFakeTimers(); frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
});
afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove()); frames = [];
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Water Cycle Check investigation preservation', () => {
  it('preserves model, condition, baseline, notebook, export, stage and existing comparison implementations', () => {
    expect(createHash('sha256').update(baselineBytes).digest('hex')).toBe(BASELINE_SHA);
    [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => expect(nodes[name], name).toBe(originalNodes[name]));
  });
  it('preserves the original first-answer score, attempt, streak and reward statements', () => {
    const original = scoredNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(original).sort()).toEqual(['myth', 'quiz']);
    expect(scoredNodes(source)).toEqual(original);
  });
  it('ships identical source and public Check investigation implementations', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});

describe('Water Cycle Check original first-answer behavior', () => {
  it('still scores a first quiz answer once and disables all original answer choices', () => {
    const s = session({ wcQuiz: { ...clone(QUIZ), answered: false, chosen: undefined }, wcStreak: 0 });
    s.click((props, node) => node.type === 'button' && treeText(node) === QUIZ.a);
    expect(s.data.wcQuiz.chosen).toBe(QUIZ.a);
    expect(s.data.wcQuiz.answered).toBe(true);
    expect(s.data.wcQuiz.score).toBe(3);
    expect(s.data.quizCorrectCount).toBe(3);
    expect(s.data.wcAttempts).toBe(5);
    expect(s.data.wcStreak).toBe(1);
    expect(s.awardXP).toHaveBeenCalledExactlyOnceWith('waterCycle', 5, 'Water Cycle quiz');
    QUIZ.opts.forEach(option => {
      const button = s.element((props, node) => node.type === 'button' && !!props['data-answer-state'] && treeText(node).startsWith(option));
      expect(button.props.disabled).toBe(true);
    });
  });

  it('still counts a first myth response once with the original correct-answer reward', () => {
    const s = session({ wcMyth: { ...clone(MYTH), answered: false, chosen: null } });
    s.click((props, node) => node.type === 'button' && treeText(node) === 'False');
    expect(s.data.wcMyth).toMatchObject({ answered: true, chosen: false });
    expect(s.data.wcMythsDone).toBe(4);
    expect(s.data.wcAttempts).toBe(4);
    expect(s.awardXP).toHaveBeenCalledExactlyOnceWith('waterCycle', 5, 'Water myth busted');
    expect(s.buttons().some(button => button.text === 'False')).toBe(false);
  });
});

const investigate = kind => props => props.id === (kind === 'myth' ? 'wcCheckInvestigateMyth' : 'wcCheckInvestigateQuiz');
const action = name => props => props['data-wc-check-action'] === name;
const observationField = props => props.id === 'wcCheckObservation';
function revisionRadios(s) {
  return Array.from(s.container.querySelectorAll('input[name="wcCheckRevisedAnswer"]'));
}
function chooseRevision(s, index = 0) {
  const radio = revisionRadios(s)[index];
  expect(radio, 'reconsideration option').toBeTruthy();
  return s.change(props => props.name === 'wcCheckRevisedAnswer' && String(props.value) === radio.value, radio.value);
}
function assertFieldReferences(container, field) {
  expect(field.id).not.toBe('');
  expect(container.querySelector('label[for="' + field.id + '"]')).not.toBeNull();
  const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  expect(ids.length, 'a usable field instruction').toBeGreaterThan(0);
  ids.forEach(id => {
    const matches = Array.from(container.querySelectorAll('[id]')).filter(node => node.id === id);
    expect(matches, id).toHaveLength(1); expect(matches[0].textContent.trim()).not.toBe('');
  });
}
const MYTHS = [
  { idx: 0, s: 'Rain falls when clouds get holes in them, like a leaky bucket.', t: false },
  { idx: 1, s: 'When a puddle dries up, its water is gone forever.', t: false },
  { idx: 2, s: 'The water you drank today may once have been drunk by a dinosaur.', t: true },
  { idx: 3, s: 'You can see water vapor.', t: false },
  { idx: 4, s: 'Clouds are made of water vapor.', t: false },
  { idx: 5, s: 'Water only evaporates when it is hot or boiling.', t: false },
  { idx: 6, s: 'Groundwater flows in big underground rivers and lakes.', t: false },
  { idx: 7, s: 'Saturation vapor pressure rises as air warms.', t: true },
  { idx: 8, s: 'Rain falls in the same place the water evaporated from.', t: false },
  { idx: 9, s: 'Transpiration from plants barely matters to the cycle.', t: false },
];
const CONCEPTS = ['evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration', 'sublimation', 'watershed', "Darcy's Law", 'latent heat', 'Clausius-Clapeyron', 'Bowen ratio', 'aquifer'];

describe('Water Cycle Check: bounded destinations and exact question identity', () => {
  it.each(MYTHS)('offers an explicit destination for myth $idx without changing its truth or answer', myth => {
    const question = freeze({ ...myth, why: 'Explanation', tryIt: 'Observe', answered: true, chosen: !myth.t });
    const original = JSON.stringify(question);
    const context = helper.createSession('myth', question);
    expect(context).toMatchObject({ kind: 'myth', phase: 'exploring', questionText: question.s });
    expect(context.key).toBe(helper.key('myth', question));
    expect(helper.get(context.destinationKey)).toBeTruthy();
    expect(helper.resolve('myth', question)).toBeTruthy();
    expect(JSON.stringify(question)).toBe(original);
  });

  it.each(CONCEPTS)('covers the authored or AI-supported concept %s without accepting arbitrary selectors', concept => {
    const question = freeze({ ...clone(QUIZ), concept });
    const context = helper.createSession('quiz', question);
    expect(context).toMatchObject({ kind: 'quiz', phase: 'exploring', questionText: question.q });
    const destination = helper.get(context.destinationKey);
    expect(destination).toBeTruthy();
    const patch = helper.navigation(destination);
    expect(patch).toMatchObject({ wcSection: destination.inputKey ? 'conditions' : 'check' });
    Object.keys(PROTECTED_STATE).forEach(key => expect(patch, key).not.toHaveProperty(key));
  });

  it('matches identity using question content, not just the myth index or concept', () => {
    const quizContext = helper.createSession('quiz', QUIZ);
    const mythContext = helper.createSession('myth', MYTH);
    expect(helper.isCurrent(quizContext, clone(QUIZ))).toBe(true);
    expect(helper.isCurrent(mythContext, clone(MYTH))).toBe(true);
    expect(helper.isCurrent(quizContext, { ...QUIZ, q: 'A replacement question with the same concept?' })).toBe(false);
    expect(helper.isCurrent(quizContext, { ...QUIZ, a: 'Smoke' })).toBe(false);
    expect(helper.isCurrent(mythContext, { ...MYTH, s: 'Different statement at the same index.' })).toBe(false);
    expect(helper.isCurrent(mythContext, { ...MYTH, t: true })).toBe(false);
  });

  it('requires an answered supported question and rejects forged destination and answer keys', () => {
    expect(helper.createSession('quiz', { ...QUIZ, answered: false })).toBeNull();
    expect(helper.createSession('myth', { ...MYTH, answered: false })).toBeNull();
    for (const key of ['__proto__', 'constructor', 'toString', 'invented', '', null, 5]) expect(helper.get(key)).toBeNull();
    const context = helper.createSession('quiz', QUIZ);
    for (const answer of ['invented', '__proto__', null, {}, 27]) expect(helper.allowedAnswer(context, answer)).toBe(false);
    expect(helper.allowedAnswer(context, QUIZ.a)).toBe(true);
  });

  it('returns detached destinations and navigation patches that callers cannot rewrite globally', () => {
    const context = helper.createSession('myth', MYTH);
    const first = helper.get(context.destinationKey), unchangedDestination = clone(first);
    first.label = 'Overwritten caller copy';
    expect(helper.get(context.destinationKey)).toEqual(unchangedDestination);
    const originalPatch = helper.navigation(helper.get(context.destinationKey));
    const patch = helper.navigation(helper.get(context.destinationKey));
    patch.journeyState = 'ocean'; patch.climTemp = 100;
    expect(helper.navigation(helper.get(context.destinationKey))).toEqual(originalPatch);
  });
});

describe('Water Cycle Check: actual investigation and return handlers', () => {
  it.each(['quiz', 'myth'])('%s preserves every condition, baseline, notebook, paused-parcel and assessment field through navigation', kind => {
    const s = session();
    s.click(investigate(kind)).focusFrames();
    expect(s.data.wcCheckInvestigation).toMatchObject({ kind, phase: 'exploring' });
    expect(s.data.wcSection).toBe(kind === 'myth' ? 'conditions' : 'check');
    const panel = s.container.querySelector('[data-wc-check-investigation]');
    expect(panel).not.toBeNull(); expect(panel.dataset.kind).toBe(kind);
    expect(panel.textContent).toContain(kind === 'myth' ? MYTH.s : QUIZ.q);
    unchanged(s);
    s.click(action('return')).focusFrames();
    expect(s.data.wcSection).toBe('check');
    expect(s.data.wcCheckInvestigation).toMatchObject({ kind, phase: 'review' });
    expect(document.activeElement.id).toBe(kind === 'myth' ? 'wcMythQuestion' : 'wcQuizQuestion');
    unchanged(s);
  });

  it('opens the actual temperature input with its existing value and baseline intact', () => {
    const s = session(); s.click(investigate('myth')).focusFrames();
    expect(s.container.querySelector('#wc-climate-temperature')).not.toBeNull();
    expect(document.activeElement.id).toBe('wc-climate-temperature');
    expect(Number(document.activeElement.value)).toBe(MODEL.climTemp);
    expect(document.activeElement.closest('details').open).toBe(true);
    unchanged(s);
  });

  it('opens actual wind transport controls rather than falling back to sunlight', () => {
    const question = { ...MYTHS[8], answered: true, chosen: true, why: 'Vapor moves with air.', tryIt: 'Observe wind.' };
    const s = session({ wcMyth: question }); s.click(investigate('myth')).focusFrames();
    expect(document.activeElement.id).toBe('wc-climate-wind');
    expect(Number(document.activeElement.value)).toBe(MODEL.climWind);
    expect(s.container.querySelector('[data-wc-check-investigation]').textContent).toMatch(/transport|wind/i);
    unchanged(s);
  });

  it('renders process evidence without selecting a new journey stage or changing process-comparison writing', () => {
    const s = session(); s.click(investigate('quiz')).focusFrames();
    const panel = s.container.querySelector('[data-wc-check-investigation]');
    expect(panel.querySelector('svg')).not.toBeNull();
    expect(panel.textContent).toMatch(/condensation/i);
    expect(panel.textContent).toMatch(/liquid|droplet/i);
    expect(s.data.activeStage).toBe('infiltration');
    expect(s.data.journeyState).toBe('aquifer_flow');
    expect(s.data.wcProcessCompare).toEqual(s.initial.wcProcessCompare);
    unchanged(s);
  });

  it('returns stale contexts to a safe heading without replacing a newer question or its scores', () => {
    const s = session(); s.click(investigate('quiz'));
    const newer = { ...QUIZ, q: 'A different question already arrived?', a: 'Smoke', chosen: 'Smoke', score: 3 };
    s.store.toolData = { ...s.store.toolData, waterCycle: { ...s.data, wcQuiz: newer } };
    s.render().click(action('return')).focusFrames();
    expect(s.data.wcSection).toBe('check');
    expect(s.data.wcCheckInvestigation.phase).toBe('stale');
    expect(s.data.wcQuiz).toEqual(newer);
    expect(document.activeElement.id).toBe('wcCheckTitle');
    expect(s.container.querySelector('#wcCheckObservation')).not.toBeNull();
    expect(revisionRadios(s)).toHaveLength(0);
    expect(s.buttons().some(button => button['data-wc-check-action'] === 'save-reflection')).toBe(false);
    unchanged(s, Object.keys(PROTECTED_STATE).filter(key => key !== 'wcQuiz'));
  });
});

describe('Water Cycle Check: explanation, revised answer and non-duplicate rewards', () => {
  it.each(['quiz', 'myth'])('%s saves reconsideration separately while all first-attempt scores and rewards remain unchanged', kind => {
    const s = session(); s.click(investigate(kind)).click(action('return'));
    const key = s.data.wcCheckInvestigation.key;
    const observation = 'I traced the visible droplets and the invisible gas. ';
    const saveBefore = s.element(action('save-reflection'));
    expect(saveBefore.props.disabled).toBe(true);
    s.change(observationField, observation);
    chooseRevision(s, kind === 'myth' ? 1 : 1);
    s.click(action('save-reflection')).focusFrames();
    expect(s.data.wcCheckReflections[key]).toMatchObject({ observation, saved: true });
    expect(document.activeElement.id).toBe('wcCheckReflectionStatus');
    expect(s.container.querySelector('#wcCheckReflectionStatus').textContent).toMatch(/saved|recorded/i);
    unchanged(s);
    s.render();
    unchanged(s);
  });

  it('keeps natural whitespace and invalidates the saved marker when evidence is edited', () => {
    const s = session(); s.click(investigate('quiz')).click(action('return'));
    const key = s.data.wcCheckInvestigation.key;
    s.change(observationField, 'First observation. '); chooseRevision(s, 1); s.click(action('save-reflection'));
    expect(s.data.wcCheckReflections[key].saved).toBe(true);
    s.change(observationField, 'Revised evidence includes a trailing space. ');
    expect(s.data.wcCheckReflections[key].observation).toBe('Revised evidence includes a trailing space. ');
    expect(s.data.wcCheckReflections[key].saved).toBe(false);
    unchanged(s);
  });

  it('requires meaningful observation text and an offered revised answer', () => {
    const s = session(); s.click(investigate('quiz')).click(action('return'));
    const key = s.data.wcCheckInvestigation.key;
    s.change(observationField, '   '); chooseRevision(s, 0);
    expect(s.element(action('save-reflection')).props.disabled).toBe(true);
    s.change(observationField, 'Cloud droplets are liquid.');
    const records = freeze(clone(s.data.wcCheckReflections));
    const context = freeze(clone(s.data.wcCheckInvestigation));
    const invalid = helper.updateReview(context, records, 'revisedAnswer', 'invented answer');
    expect(invalid[key].revisedAnswer).not.toBe('invented answer');
    const noAnswer = { ...records, [key]: { ...records[key], revisedAnswer: null, saved: false } };
    const result = helper.saveReview(context, noAnswer);
    expect(result[key].saved).not.toBe(true);
    unchanged(s);
  });

  it('keeps a bounded, labeled observation field with unique explanatory references', () => {
    const s = session(); s.click(investigate('myth')).click(action('return'));
    const field = s.container.querySelector('#wcCheckObservation');
    expect(field.tagName).toBe('TEXTAREA'); expect(field.maxLength).toBe(1200);
    assertFieldReferences(s.container, field);
    const radios = revisionRadios(s); expect(radios).toHaveLength(2);
    radios.forEach(radio => expect(radio.closest('label')).not.toBeNull());
    s.change(observationField, 'x'.repeat(1300));
    expect(s.data.wcCheckReflections[s.data.wcCheckInvestigation.key].observation).toHaveLength(1200);
  });

  it('preserves saved or draft notes when a new question clears the active investigation', () => {
    const s = session(); s.click(investigate('quiz')).click(action('return'));
    const key = s.data.wcCheckInvestigation.key;
    s.change(observationField, 'My unfinished explanation survives a different question.');
    const draft = clone(s.data.wcCheckReflections[key]);
    s.click(action('new-quiz'));
    expect(s.data.wcCheckInvestigation).toBeNull();
    expect(s.data.wcCheckReflections[key]).toEqual(draft);
    const history = s.container.querySelector('[data-wc-check-history]');
    expect(history.tagName).toBe('DETAILS');
    expect(history.textContent).toContain(draft.observation);
    expect(history.querySelector('summary')).not.toBeNull();
    unchanged(s, Object.keys(PROTECTED_STATE).filter(name => name !== 'wcQuiz'));
  });

  it('keeps pending AI focus on the quiz heading and focuses the resolved question without losing notes or changing prior scores', async () => {
    const pendingUnanswered = session({ wcQuiz: { ...clone(QUIZ), answered: false, chosen: null }, aiQuizLoading: true });
    const oldChoices = Array.from(pendingUnanswered.container.querySelectorAll('[data-wc-check-quiz] button[data-answer-state]'));
    expect(oldChoices).toHaveLength(QUIZ.opts.length);
    oldChoices.forEach(choice => { expect(choice.dataset.answerState).toBe('ready'); expect(choice.disabled).toBe(true); });
    expect(pendingUnanswered.container.querySelector('#wcQuizInstructions').textContent).toMatch(/new question.*generated.*choices.*available.*ready/i);
    unchanged(pendingUnanswered);
    pendingUnanswered.container.remove();

    let resolveGemini;
    const pending = new Promise(resolve => { resolveGemini = resolve; });
    const callGemini = vi.fn(() => pending);
    const s = session({}, { callGemini });
    s.click(investigate('quiz')).click(action('return'));
    s.change(observationField, 'I will keep this explanation while a new question loads.');
    const reflections = clone(s.data.wcCheckReflections);
    s.focusFrames().click(action('new-ai')).focusFrames();

    expect(callGemini).toHaveBeenCalledExactlyOnceWith(expect.any(String), true, false, 0.7);
    expect(s.data.aiQuizLoading).toBe(true);
    expect(s.container.querySelector('#wcQuizInstructions').textContent).toMatch(/new question.*generated.*choices.*available.*ready/i);
    expect(s.element(action('new-ai')).props.disabled).toBe(true);
    expect(s.container.querySelector('[data-wc-check-quiz]').getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement.id).toBe('wcQuizTitle');
    expect(document.activeElement.tabIndex).toBe(-1);
    expect(s.data.wcCheckInvestigation).toBeNull();
    expect(s.data.wcCheckReflections).toEqual(reflections);
    unchanged(s);

    const generated = {
      question: 'Where is water stored in an aquifer?', correct: 'In connected pores and fractures',
      distractors: ['Only in underground rivers', 'Inside solid mineral crystals', 'Only in surface puddles'],
      concept: 'aquifer', wrongFeedback: { 'Only in underground rivers': 'Most groundwater occupies connected spaces in rock and sediment.' },
    };
    resolveGemini(JSON.stringify(generated));
    await pending;
    await Promise.resolve();
    s.render().focusFrames();

    expect(s.data.aiQuizLoading).toBe(false);
    expect(s.element(action('new-ai')).props.disabled).toBe(false);
    expect(s.container.querySelector('[data-wc-check-quiz]').getAttribute('aria-busy')).toBe('false');
    expect(s.data.wcQuiz).toMatchObject({ q: generated.question, a: generated.correct, answered: false, isAI: true, score: QUIZ.score });
    expect(s.data.wcQuiz.opts.slice().sort()).toEqual([generated.correct, ...generated.distractors].sort());
    Array.from(s.container.querySelectorAll('[data-wc-check-quiz] button[data-answer-state]')).forEach(choice => expect(choice.disabled).toBe(false));
    expect(document.activeElement.id).toBe('wcQuizQuestion');
    expect(document.activeElement.textContent).toBe(generated.question);
    expect(s.data.wcCheckInvestigation).toBeNull();
    expect(s.data.wcCheckReflections).toEqual(reflections);
    unchanged(s, Object.keys(PROTECTED_STATE).filter(name => name !== 'wcQuiz'));
  });

  it('retains existing notes when reopening the exact question and creates separate notes for a replacement question', () => {
    const s = session(); s.click(investigate('quiz')).click(action('return'));
    const firstKey = s.data.wcCheckInvestigation.key;
    s.change(observationField, 'This evidence belongs to the first question.');
    const originalRecord = clone(s.data.wcCheckReflections[firstKey]);
    s.click(action('close'));
    s.click(investigate('quiz')).click(action('return'));
    expect(s.data.wcCheckInvestigation.key).toBe(firstKey);
    expect(s.container.querySelector('#wcCheckObservation').value).toBe(originalRecord.observation);
    const replacement = { ...QUIZ, q: 'Another cloud question?' };
    s.store.toolData = { ...s.store.toolData, waterCycle: { ...s.data, wcQuiz: replacement, wcCheckInvestigation: null } };
    s.render().click(investigate('quiz')).click(action('return')).change(observationField, 'Separate evidence for the replacement.');
    expect(s.data.wcCheckInvestigation.key).not.toBe(firstKey);
    expect(s.data.wcCheckReflections[firstKey]).toEqual(originalRecord);
    unchanged(s, Object.keys(PROTECTED_STATE).filter(name => name !== 'wcQuiz'));
  });
});

describe('Water Cycle Check: persisted and unfamiliar assessment state', () => {
  it('rejects malformed reflection history without crashing and detaches accepted choices', () => {
    const context = helper.createSession('myth', MYTH);
    let records = helper.updateReview(context, {}, 'observation', 'Water occupies connected spaces.');
    records = helper.updateReview(context, records, 'revisedAnswer', false);
    records = helper.saveReview(context, records);
    const valid = clone(records[context.key]);
    const malformed = { ...valid }; delete malformed.choices;
    const input = freeze({ missingChoices: malformed, invalidDestination: { ...valid, destinationKey: 'invented' }, invalidChoices: { ...valid, choices: ['true', 'false'] }, [context.key]: valid });
    const history = helper.history(input);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ observation: valid.observation, revisedAnswer: false, saved: true });
    expect(history[0].choices).not.toBe(valid.choices);
    history[0].choices.push('caller edit');
    expect(valid.choices).toEqual([true, false]);
  });

  it('ignores a malformed persisted investigation without changing protected learner state', () => {
    const context = { kind: 'quiz', key: 'quiz:invalid', questionText: 'Old record', originalAnswer: 'x', destinationKey: 'overview', phase: 'review' };
    const s = session({ wcCheckInvestigation: context });
    expect(s.container.querySelector('[data-wc-check-investigation]')).toBeNull();
    expect(s.container.querySelector('[data-wc-check]')).not.toBeNull();
    unchanged(s);
  });

  it.each(['unfamiliar AI concept', '__proto__', 'constructor'])('offers a bounded related overview for %s without rendering inherited vocabulary properties', concept => {
    const s = session({ wcQuiz: { ...clone(QUIZ), concept, isAI: true } });
    s.click(investigate('quiz'));
    expect(s.data.wcCheckInvestigation.destinationKey).toBe('overview');
    const panel = s.container.querySelector('[data-wc-check-investigation]');
    expect(panel.textContent).toMatch(/related process model|more information/i);
    unchanged(s);
  });

  it('renders empty quiz and myth states as named tasks with native start buttons', () => {
    const s = session({ wcQuiz: null, wcMyth: null });
    expect(s.container.querySelector('#wcCheckTitle').tagName).toBe('H3');
    expect(s.container.querySelector('#wcQuizTitle').tagName).toBe('H4');
    expect(s.container.querySelector('#wcMythTitle').tagName).toBe('H4');
    expect(s.element(action('new-quiz')).type).toBe('button');
    expect(s.element(action('new-myth')).type).toBe('button');
    expect(s.container.querySelector('[data-wc-check-action="investigate"]')).toBeNull();
  });
});

describe('Water Cycle Check: canonical saved question provenance', () => {
  it.each(['questionText', 'originalAnswer', 'choices'])('rejects a saved session whose %s disagrees with its exact question key', field => {
    const context = helper.createSession('quiz', QUIZ);
    const forged = { ...clone(context), [field]: field === 'questionText' ? 'Different question text' : field === 'originalAnswer' ? QUIZ.a : ['Different choices', 'Another choice'] };
    expect(helper.normalizeSession(forged)).toBeNull();
    expect(helper.isCurrent(forged, QUIZ)).toBe(false);
    const records = freeze({});
    expect(helper.updateReview(forged, records, 'observation', 'Must not attach to another question')).toBe(records);
    expect(helper.saveReview(forged, records)).toBe(records);
    expect(helper.history({ [forged.key]: { ...forged, observation: 'A forged association', revisedAnswer: QUIZ.a, saved: true } })).toEqual([]);
  });

  it('rejects an answer object and does not grant a saved status to malformed imported reflection data', () => {
    const context = helper.createSession('quiz', QUIZ);
    const valid = helper.updateReview(context, {}, 'observation', 'This note must not imply a valid revised answer.');
    const hostile = freeze({ answer: QUIZ.a });
    expect(helper.allowedAnswer(context, hostile)).toBe(false);
    expect(helper.updateReview(context, valid, 'revisedAnswer', hostile)).toBe(valid);
    const bad = { ...valid[context.key], revisedAnswer: hostile, saved: true };
    const bogusSaved = { ...valid[context.key], revisedAnswer: QUIZ.a, saved: 'yes' };
    for (const record of [bad, bogusSaved]) {
      const imported = helper.history({ [context.key]: record });
      imported.forEach(entry => {
        expect(entry.saved).toBe(false);
        expect(entry.revisedAnswer == null || helper.allowedAnswer(context, entry.revisedAnswer)).toBe(true);
      });
      expect(record.saved).toBe(record === bad ? true : 'yes');
    }
  });
});
