import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const TEST_PATH = 'tests/watercycle_groundwater_lens.test.js';
const BASELINE_PATH = 'reports/watercycle-steward-history/browser-tested-runtime.js';
const BASELINE_SHA = 'ed26499bf0435d1c613eb7d619e2537bc66ae06798382090ddb262cb20d6a29a';
// Earlier Journey diagram enhancements are frozen in the accepted prior runtime.
// Only these four exact drawing anchors use that reference; all others keep the original.
const REVIEWED_DIAGRAM_PATH = 'reports/watercycle-land-cutaway/candidate-runtime.js';
const REVIEWED_DIAGRAM_SHA = '3931756397bb4943e201fe8b7761dc9d83facac7421d013d9ddb6d0e7db6c875';
const REVIEWED_DIAGRAM_ANCHORS = ['canvasRef', 'drawFlowChevrons2d', 'drawMatterEnergyEvidence2d', 'drawPhysicalTimeGlyph2d'];
const PRESERVED = [
  'WCExploreNotebook', 'WCJourneyChapters', 'WCCheckInvestigation', 'WCProcessCompare',
  'wcLandResponse', 'estimateWcLandIndices', 'estimateWcRouteShares',
  'evaporationIndex', 'wcBaselineEvaporationIndex', 'wcCurrentSnapshot', 'wcComparisonDeltas',
  'WATER_CYCLE_PRESETS', 'WATER_CYCLE_PREDICTIONS', 'getWcInteractionBaseline',
  'adjustClimate', 'adjustLand', 'resetClimate', 'resetLandScenario',
  'captureWcScenarioBaseline', 'restoreWcScenarioBaseline', 'clearWcScenarioBaseline',
  'saveWcObservation', 'replayWcObservation', 'recordWcPrediction', 'resetWcPrediction',
  'canvasRef', 'journey3dRef', 'onWcKey', 'setJourneyReplayProgress', 'resumeLiveJourney',
  'chooseJourneyPath', 'journeyReplaySegmentAt', 'syncWcWalkthroughStage',
  'toggleWcWalkthrough', 'stepWcWalkthrough', 'toggleWc2dPlayback', 'handleWc2dKey',
  'handleJourney3dKey', 'handleJourney3dSceneClick', 'controlJourneyCamera', 'beginWcQuickJourney',
  'MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'STAGE_HYDROLOGIC_TIME_TRACE',
  'JOURNEY_HYDROLOGIC_TIME_TRACE', 'drawFlowChevrons2d', 'drawPhysicalTimeGlyph2d',
  'drawMatterEnergyEvidence2d', 'checkWaterCycleChallenges', 'studyVocab', 'selectStage',
  'wcQuizBank', 'wcQuizQuestion', 'startWcCheckInvestigation', 'returnWcCheckInvestigation',
  'updateWcCheckReflection', 'saveWcCheckReflection', 'closeWcCheckInvestigation',
  'renderWcCheckProcess', 'renderWcCheckPores', 'renderWcCheckAction',
  'renderWcCheckInvestigation', 'renderWcCheckHistory',
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

// Reviewed visual exception: retain every byte of the canvas outside this
// decorative block, and permit only local calculations and canvas paint calls.
function reviewedPoreDecoration(block) {
  const tree = parse(block, { ecmaVersion: 'latest' });
  const locals = new Set();
  walkNodes(tree, node => {
    if (node.type === 'VariableDeclarator') {
      if (node.id.type !== 'Identifier') throw new Error('Pore decoration has a nonlocal binding');
      locals.add(node.id.name);
    }
  });
  const reads = new Set(['ctx', 'cW', 'cH', 'soilTop2d', 'waterTable2d', 'isDark', 'dpr', 'Math']);
  const paints = new Set(['beginPath', 'arc', 'fill', 'save', 'clip', 'fillRect', 'restore']);
  function visit(node, parent, key) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier') {
      const property = parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed;
      if (!property && !locals.has(node.name) && !reads.has(node.name)) throw new Error('Pore decoration reads non-drawing state: ' + node.name);
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'NewExpression', 'AwaitExpression', 'YieldExpression', 'ReturnStatement', 'ThrowStatement', 'WithStatement', 'ImportExpression', 'ThisExpression', 'Super'].includes(node.type) || node.type === 'UnaryExpression' && node.operator === 'delete') throw new Error('Pore decoration contains a non-paint operation');
    if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && ['ctx', 'Math'].includes(node.object.name)) {
      if (node.computed || !(node.object.name === 'ctx' ? paints.has(node.property.name) || node.property.name === 'fillStyle' : node.property.name === 'PI')) throw new Error('Pore decoration accesses a non-paint resource');
    }
    if (node.type === 'CallExpression') {
      const call = node.callee;
      if (call.type !== 'MemberExpression' || call.computed || call.object.type !== 'Identifier' ||
          !(call.object.name === 'ctx' && paints.has(call.property.name))) throw new Error('Pore decoration calls a non-paint operation');
    }
    if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
      const target = node.left || node.argument;
      const local = target.type === 'Identifier' && locals.has(target.name);
      const paint = target.type === 'MemberExpression' && !target.computed && target.object.type === 'Identifier' &&
        target.object.name === 'ctx' && ['fillStyle'].includes(target.property.name);
      if (!local && !paint) throw new Error('Pore decoration writes non-drawing state');
    }
    for (const [childKey, value] of Object.entries(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node, childKey));
      else if (value && typeof value === 'object') visit(value, node, childKey);
    }
  }
  visit(tree, null, '');
}
function normalizeReviewedCanvas(value) {
  const current = '// Groundwater pore illustration: begin.';
  const legacy = '// Pore spaces.';
  const finish = '// Groundwater pore illustration: end.';
  const parent = '// Parent material:';
  const marker = value.includes(current) ? current : legacy;
  const start = value.indexOf(marker), end = value.indexOf(parent, start);
  if (start < 0 || end <= start || value.indexOf(marker, start + marker.length) !== -1 || value.indexOf(parent, end + parent.length) !== -1) throw new Error('Missing or duplicate reviewed pore boundary');
  if (marker === current) {
    const close = value.indexOf(finish, start);
    if (close <= start || close > end || value.indexOf(finish, close + finish.length) !== -1 || value.slice(close + finish.length, end).trim()) throw new Error('Pore decoration boundary includes other canvas code');
  }
  reviewedPoreDecoration(value.slice(start, end));
  return value.slice(0, start) + '// Reviewed groundwater pore decoration.\n                ' + value.slice(end);
}
function normalizeReviewedCheckPores(value) {
  if (sha(value) === '01c29df93cf3cbccb62e6f3190d079d2fb8b6ecd0697c3b9f84a98360f166fb5') return 'Reviewed groundwater Check adapter';
  const body = parse(value, { ecmaVersion: 'latest' }).body;
  const fn = body[0], statement = fn && fn.body && fn.body.body[0];
  const call = statement && statement.argument;
  if (body.length !== 1 || fn.type !== 'FunctionDeclaration' || fn.id.name !== 'renderWcCheckPores' || fn.params.length || fn.async || fn.generator ||
      fn.body.body.length !== 1 || statement.type !== 'ReturnStatement' || !call || call.type !== 'CallExpression' ||
      call.callee.type !== 'Identifier' || call.callee.name !== 'renderWcGroundwaterLens' || call.arguments.length !== 1 ||
      call.arguments[0].type !== 'Literal' || call.arguments[0].value !== 'check') throw new Error('Check pores must be only the reviewed unscored adapter');
  return 'Reviewed groundwater Check adapter';
}
function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!PRESERVED.includes(name)) return;
    if (result[name]) throw new Error('Non-unique production anchor: ' + name);
    const value = normalized.slice(node.start, node.end);
    result[name] = name === 'canvasRef' ? normalizeReviewedCanvas(value) : name === 'renderWcCheckPores' ? normalizeReviewedCheckPores(value) : value;
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
export const waterCycleGroundwaterLensVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED,
  productionNodes, scoredNodes, normalizeReviewedCanvas, normalizeReviewedCheckPores, reviewedPoreDecoration,
};

const loadedAt = new Date().toISOString();
const sources = [SOURCE_PATH, MIRROR_PATH].map(path => ({ path, bytes: readFileSync(path), text: readFileSync(path, 'utf8') }));
const baselineBytes = readFileSync(BASELINE_PATH);
const reviewedDiagramBytes = readFileSync(REVIEWED_DIAGRAM_PATH);
const loadedTestBytes = readFileSync(TEST_PATH);
afterAll(() => {
  if (process.env.WATER_CYCLE_GROUNDWATER_LENS_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_GROUNDWATER_LENS_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTestBytes), bytes: loadedTestBytes.length },
  }, null, 2) + '\n');
});
function loadHelper(source) {
  let initializer;
  walkNodes(parse(source.text, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'VariableDeclarator' || node.id.name !== 'WCGroundwaterLens') return;
    if (initializer) throw new Error('Duplicate actual groundwater lens');
    initializer = source.text.slice(node.init.start, node.init.end);
  });
  if (!initializer) throw new Error('Missing actual groundwater lens in ' + source.path);
  return runInNewContext('(' + initializer + ')', {}, { filename: source.path + ':groundwater-lens', timeout: 1000 });
}
const shipped = sources.map(source => ({ path: source.path, helper: loadHelper(source) }));
function each(callback) { shipped.forEach(({ helper, path }) => callback(helper, path)); }
const PARTS = ['soil', 'boundary', 'groundwater'];
const CHOICES = ['soil_storage', 'all_recharge', 'dry_soil'];
const EXPLORER_ID = 'groundwater-lens-v1';
function saved(part = 'soil', answer = 'soil_storage', identity = EXPLORER_ID, version = 1) { return { version, identity, part, answer }; }

describe('Water Cycle groundwater lens: bounded scientific catalog', () => {
  it('loads the actual bounded helper from both shipped runtimes', () => {
    each(helper => expect(Object.keys(helper).sort()).toEqual(['answer', 'choices', 'parts', 'read', 'select']));
  });
  it('returns fresh part definitions that cannot alter the scientific catalog', () => {
    each(helper => {
      const first = helper.parts();
      expect(Array.from(first, part => part.id)).toEqual(PARTS);
      first[0].title = 'Forged'; first[1].id = 'floor'; first.push({ id: 'lake' });
      expect(Array.from(helper.parts(), part => part.id)).toEqual(PARTS);
      expect(helper.parts()[0].title).toBe('Air and water share pore space');
      expect(helper.parts()[1].detail).toContain('capillary fringe');
      expect(helper.parts()[2].detail).toContain('connected pores and fractures');
    });
  });
  it('returns detached fixed interpretations with stable unscored answer identities', () => {
    each(helper => {
      const first = helper.choices(); expect(Array.from(first, choice => choice.id)).toEqual(CHOICES);
      first[0].id = 'all_recharge'; first[0].label = 'Forged'; first.splice(1);
      expect(Array.from(helper.choices(), choice => choice.id)).toEqual(CHOICES);
      expect(helper.choices()[0].label).toContain('recharge needs more evidence');
    });
  });
  it.each(['soil', 'boundary', 'groundwater'])('keeps %s inspection selectable without inventing a measurement', part => {
    each(helper => {
      const result = helper.select({}, 'explorer', part);
      expect(plain(helper.read(result, 'explorer'))).toEqual({ version: 1, identity: EXPLORER_ID, part, answer: '', result: 'waiting' });
      expect(Object.keys(result.explorer).sort()).toEqual(['answer', 'identity', 'part', 'version']);
    });
  });
});

describe('Water Cycle groundwater lens: question, identity and context', () => {
  it('defaults independent Explorer and Check contexts to soil with no answer', () => {
    each(helper => {
      expect(plain(helper.read(null, 'explorer', 'ignored'))).toEqual({ version: 1, identity: EXPLORER_ID, part: 'soil', answer: '', result: 'waiting' });
      expect(plain(helper.read(null, 'check', 'quiz-key'))).toEqual({ version: 1, identity: 'quiz-key', part: 'soil', answer: '', result: 'waiting' });
    });
  });
  it.each([['soil_storage', 'supported'], ['all_recharge', 'retry'], ['dry_soil', 'retry']])('recognizes %s as %s without a score or reward', (answer, result) => {
    each(helper => {
      const record = helper.answer({}, 'explorer', answer);
      expect(plain(helper.read(record, 'explorer'))).toMatchObject({ answer, result });
      expect(Object.keys(record).sort()).toEqual(['check', 'explorer']);
      expect(Object.keys(record.explorer).sort()).toEqual(['answer', 'identity', 'part', 'version']);
    });
  });
  it('binds Check answers to the full question identity including equal 160-character prefixes', () => {
    each(helper => {
      const prefix = 'q'.repeat(160), one = prefix + '-one', two = prefix + '-two';
      const record = helper.answer(helper.select({}, 'check', 'groundwater', one), 'check', 'soil_storage', one);
      expect(helper.read(record, 'check', one).result).toBe('supported');
      expect(plain(helper.read(record, 'check', two))).toMatchObject({ identity: two, part: 'groundwater', answer: '', result: 'waiting' });
      expect(record.check.identity).toBe(one);
    });
  });
  it('clears stale Check feedback while retaining the learner inspection choice', () => {
    each(helper => {
      const record = freeze({ check: saved('boundary', 'dry_soil', 'old-quiz') });
      expect(plain(helper.read(record, 'check', 'new-myth'))).toEqual({ version: 1, identity: 'new-myth', part: 'boundary', answer: '', result: 'waiting' });
      expect(record.check.answer).toBe('dry_soil');
    });
  });
  it('answers a changed Check question with its new identity and the retained part', () => {
    each(helper => {
      const record = freeze({ check: saved('boundary', 'soil_storage', 'old-key') });
      const next = helper.answer(record, 'check', 'all_recharge', 'new-key');
      expect(plain(helper.read(next, 'check', 'new-key'))).toEqual({ version: 1, identity: 'new-key', part: 'boundary', answer: 'all_recharge', result: 'retry' });
      expect(record.check.identity).toBe('old-key');
    });
  });
  it('does not reuse a Check answer in Explorer or an Explorer answer in Check', () => {
    each(helper => {
      const checkInExplorer = { explorer: saved('soil', 'soil_storage', 'question-key') };
      const explorerInCheck = { check: saved('soil', 'soil_storage') };
      expect(helper.read(checkInExplorer, 'explorer').result).toBe('waiting');
      expect(helper.read(explorerInCheck, 'check', 'question-key').result).toBe('waiting');
    });
  });
  it('ignores a supplied Explorer identity because its lesson has a fixed identity', () => {
    each(helper => {
      const record = helper.answer({}, 'explorer', 'soil_storage', 'foreign-question');
      expect(record.explorer.identity).toBe(EXPLORER_ID);
      expect(helper.read(record, 'explorer', 'different').result).toBe('supported');
    });
  });
  it.each([['missing', undefined], ['null', null], ['number', 1], ['object', {}], ['array', []], ['empty string', '']])('requires a nonempty string Check identity (%s)', (_label, identity) => {
    each(helper => {
      const record = helper.answer({}, 'check', 'soil_storage', identity);
      expect(helper.read(record, 'check', identity).result).toBe('waiting');
      expect(record.check.answer).toBe('');
    });
  });
  it.each([undefined, null, 0, '1', 2])('rejects feedback from saved version %s while retaining the part', version => {
    each(helper => {
      const record = { explorer: { version, identity: EXPLORER_ID, part: 'boundary', answer: 'soil_storage' } };
      expect(plain(helper.read(record, 'explorer'))).toMatchObject({ version: 1, part: 'boundary', answer: '', result: 'waiting' });
    });
  });
  it('clears feedback on every explicit part selection including the selected part', () => {
    each(helper => {
      const original = freeze({ explorer: saved('soil') });
      PARTS.forEach(part => {
        const next = helper.select(original, 'explorer', part);
        expect(plain(helper.read(next, 'explorer'))).toMatchObject({ part, answer: '', result: 'waiting' });
      });
      expect(original.explorer.answer).toBe('soil_storage');
    });
  });
  it('preserves the other context as a detached normalized copy', () => {
    each(helper => {
      const original = freeze({ explorer: saved('boundary', 'dry_soil'), check: saved('groundwater', 'all_recharge', 'question') });
      const changedExplorer = helper.select(original, 'explorer', 'soil');
      expect(plain(changedExplorer.check)).toEqual(plain(original.check)); expect(changedExplorer.check).not.toBe(original.check);
      const changedCheck = helper.answer(original, 'check', 'soil_storage', 'question');
      expect(plain(changedCheck.explorer)).toEqual(plain(original.explorer)); expect(changedCheck.explorer).not.toBe(original.explorer);
    });
  });
});

describe('Water Cycle groundwater lens: safe saved metadata', () => {
  it('rejects invalid scopes for reading and copies metadata without writes for mutations', () => {
    each(helper => {
      const original = freeze({ explorer: saved('soil'), check: saved('groundwater', 'dry_soil', 'question') });
      for (const scope of [undefined, null, '', 'constructor', '__proto__', 'quiz', {}, []]) {
        expect(helper.read(original, scope, 'question')).toBeNull();
        expect(plain(helper.select(original, scope, 'soil', 'question'))).toEqual(plain(original));
        expect(plain(helper.answer(original, scope, 'soil_storage', 'question'))).toEqual(plain(original));
      }
    });
  });
  it('does not coerce unsupported part or answer values into canonical IDs', () => {
    each(helper => {
      const hostile = { toString() { throw new Error('Do not coerce saved choices'); } };
      const original = freeze({ explorer: saved('boundary') });
      for (const value of [undefined, null, true, 1, 'constructor', '__proto__', 'unknown', [], hostile]) {
        expect(helper.read(helper.select(original, 'explorer', value), 'explorer').part).toBe('boundary');
        expect(helper.read(helper.answer(original, 'explorer', value), 'explorer').answer).toBe('soil_storage');
        expect(helper.read({ explorer: { ...saved(), part: value } }, 'explorer').result).toBe('waiting');
        expect(helper.read({ explorer: { ...saved(), answer: value } }, 'explorer').result).toBe('waiting');
      }
    });
  });
  it('ignores inherited context records and inherited metadata fields', () => {
    each(helper => {
      expect(helper.read(Object.create({ explorer: saved('groundwater') }), 'explorer').part).toBe('soil');
      for (const field of ['part', 'answer', 'identity', 'version']) {
        const record = saved('boundary'); const inherited = Object.create({ [field]: record[field] }); delete record[field]; Object.assign(inherited, record);
        expect(helper.read({ explorer: inherited }, 'explorer').result).toBe('waiting');
      }
    });
  });
  it('rejects arrays carrying named contexts or named record properties', () => {
    each(helper => {
      const bag = []; bag.explorer = saved('groundwater');
      const record = []; Object.assign(record, saved('groundwater'));
      expect(helper.read(bag, 'explorer').part).toBe('soil');
      expect(helper.read({ explorer: record }, 'explorer').part).toBe('soil');
      expect(helper.read({ explorer: record }, 'explorer').result).toBe('waiting');
    });
  });
  it('normalizes malformed, cyclic and BigInt bags without traversing unknown state', () => {
    each(helper => {
      const cyclic = {}; cyclic.explorer = cyclic; cyclic.check = cyclic;
      for (const value of [undefined, null, true, 3, 2n, 'saved', [], cyclic]) {
        let copy;
        expect(() => { copy = helper.select(value, 'explorer', 'groundwater'); }).not.toThrow();
        expect(Object.keys(copy).sort()).toEqual(['check', 'explorer']);
        expect(helper.read(copy, 'explorer').part).toBe('groundwater');
        expect(helper.read(copy, 'check').result).toBe('waiting');
      }
    });
  });
  it('drops unknown properties and returns metadata without copying model, notes or rewards', () => {
    each(helper => {
      const model = freeze({ landSaturation: 60, wcQuiz: { score: 9 }, researchPoints: 25,
        explorer: { ...saved('boundary'), measurements: { recharge: 99 }, score: 100 },
        check: { ...saved('groundwater', 'dry_soil', 'question'), timer: 9 } });
      const next = helper.answer(model, 'explorer', 'soil_storage');
      expect(Object.keys(next).sort()).toEqual(['check', 'explorer']);
      [next.check, next.explorer].forEach(record => expect(Object.keys(record).sort()).toEqual(['answer', 'identity', 'part', 'version']));
      expect(model.landSaturation).toBe(60); expect(model.researchPoints).toBe(25); expect(model.wcQuiz.score).toBe(9);
    });
  });
  it('does not mutate deeply frozen metadata when reading, selecting or answering', () => {
    each(helper => {
      const original = freeze({ explorer: saved('boundary', 'dry_soil'), check: saved('groundwater', 'soil_storage', 'question') });
      const before = JSON.stringify(original);
      helper.read(original, 'check', 'question');
      const one = helper.select(original, 'check', 'soil', 'question'), two = helper.answer(original, 'explorer', 'all_recharge');
      one.explorer.part = 'changed'; two.check.identity = 'changed';
      expect(JSON.stringify(original)).toBe(before);
    });
  });
});

function renderer(source, overrides = {}) {
  const initializers = {}, functions = {};
  walkNodes(parse(source.text, { ecmaVersion: 'latest' }), node => {
    if (node.type === 'VariableDeclarator' && ['WCGroundwaterLens', 'WCCheckInvestigation'].includes(node.id.name)) initializers[node.id.name] = source.text.slice(node.init.start, node.init.end);
    if (node.type === 'FunctionDeclaration' && node.id.name === 'renderWcGroundwaterLens') functions[node.id.name] = source.text.slice(node.start, node.end);
  });
  if (Object.keys(initializers).length !== 2 || Object.keys(functions).length !== 1) throw new Error('Missing actual renderer dependencies');
  const initial = freeze({ landSaturation: 65, climTemp: 21, journeyPaused: true, journeyReplayProgress: .42,
    researchPoints: 25, wcAttempts: 4, wcStreak: 2, wcQuiz: { score: 9 },
    wcExperimentLog: [{ notes: { evidence: 'Retain my evidence.' } }], wcGroundwaterLens: null,
    wcCheckInvestigation: null, ...overrides });
  const writes = [], focus = [];
  const context = { d: initial, isDark: false, isContrast: false, WC_GROUNDWATER_LENS_STYLE: '',
    React: { createElement(type, props, ...children) { return { type, props: props || {}, children }; } },
    upd(key, value) { writes.push(key); context.d = { ...context.d, [key]: value }; },
    focusWcComparisonTarget(id) { focus.push(id); } };
  const api = runInNewContext(Object.entries(initializers).map(([name, value]) => 'var ' + name + ' = ' + value + ';').join('\n') + '\n' + functions.renderWcGroundwaterLens + '\n({render:renderWcGroundwaterLens,check:WCCheckInvestigation});', context, { filename: source.path + ':groundwater-renderer', timeout: 1000 });
  function elements(scope) {
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) node.forEach(visit);
      else if (node && typeof node === 'object' && node.type) { nodes.push(node); visit(node.children); }
    }
    visit(api.render(scope)); return nodes;
  }
  function protectedState() { return Object.fromEntries(Object.entries(context.d).filter(([key]) => key !== 'wcGroundwaterLens')); }
  return { api, elements, initial, writes, focus, protectedState, get data() { return context.d; },
    set(patch) { context.d = freeze({ ...context.d, ...patch }); } };
}

describe('Water Cycle groundwater lens: actual unscored renderer callbacks', () => {
  it.each(PARTS)('inspects %s through the real button, updates semantic state and preserves live simulation state', part => {
    sources.forEach(source => {
      const session = renderer(source, { wcGroundwaterLens: { explorer: saved('soil') } });
      const before = session.protectedState();
      const button = session.elements('explorer').filter(node => node.props['data-gw-select'] === part);
      expect(button).toHaveLength(1); expect(button[0].type).toBe('button'); expect(button[0].props.type).toBe('button');
      button[0].props.onClick();
      const tree = session.elements('explorer');
      expect(tree.find(node => node.props['data-gw-select'] === part).props['aria-pressed']).toBe(true);
      expect(tree.find(node => node.props['data-gw-pore-state']).props['data-gw-pore-state']).toBe(part);
      expect(tree.find(node => node.props['data-gw-result']).props['data-gw-result']).toBe('waiting');
      // Zone selection retains the native selector focus beside the diagrams.
      expect(session.focus).toEqual([]);
      expect(session.writes).toEqual(['wcGroundwaterLens']); expect(session.protectedState()).toEqual(before);
    });
  });
  it.each([['soil_storage', 'supported'], ['all_recharge', 'retry'], ['dry_soil', 'retry']])('uses the real %s answer callback to produce %s feedback without score writes', (answer, result) => {
    sources.forEach(source => {
      const session = renderer(source); const before = session.protectedState();
      const button = session.elements('explorer').filter(node => node.props['data-gw-answer'] === answer);
      expect(button).toHaveLength(1); expect(button[0].props.type).toBe('button'); button[0].props.onClick();
      const tree = session.elements('explorer');
      expect(tree.find(node => node.props['data-gw-answer'] === answer).props['aria-pressed']).toBe(true);
      expect(tree.find(node => node.props['data-gw-result']).props['data-gw-result']).toBe(result);
      expect(session.writes).toEqual(['wcGroundwaterLens']); expect(session.focus).toEqual(['wcGroundwater-explorer-FeedbackTitle']);
      expect(session.protectedState()).toEqual(before);
    });
  });
  it('binds actual Check rendering to the complete canonical normalized question key and isolates Explorer', () => {
    sources.forEach(source => {
      const session = renderer(source);
      const question = suffix => ({ q: 'q'.repeat(160) + suffix, a: 'Pores', opts: ['Pores', 'Lake'], chosen: 'Lake', answered: true, concept: 'aquifer' });
      const one = session.api.check.createSession('quiz', question('-one'));
      const two = session.api.check.createSession('quiz', question('-two'));
      session.set({ wcCheckInvestigation: one });
      session.elements('check').find(node => node.props['data-gw-select'] === 'boundary').props.onClick();
      session.elements('check').find(node => node.props['data-gw-answer'] === 'soil_storage').props.onClick();
      expect(session.data.wcGroundwaterLens.check.identity).toBe(one.key);
      expect(session.elements('check').find(node => node.props['data-gw-result']).props['data-gw-result']).toBe('supported');
      expect(session.elements('explorer').find(node => node.props['data-gw-result']).props['data-gw-result']).toBe('waiting');
      session.set({ wcCheckInvestigation: two });
      const tree = session.elements('check');
      expect(tree.find(node => node.props['data-gw-part']).props['data-gw-part']).toBe('boundary');
      expect(tree.find(node => node.props['data-gw-result']).props['data-gw-result']).toBe('waiting');
      expect(session.data.wcGroundwaterLens.check.identity).toBe(one.key);
    });
  });
  it('does not trust an invalid saved Check session key when recording new practice feedback', () => {
    sources.forEach(source => {
      const session = renderer(source, { wcCheckInvestigation: { kind: 'quiz', key: 'quiz:forged', questionText: 'Forged', choices: ['Yes', 'No'], originalAnswer: 'No', destinationKey: 'groundwater_pores' } });
      const before = session.protectedState();
      session.elements('check').find(node => node.props['data-gw-answer'] === 'soil_storage').props.onClick();
      expect(session.elements('check').find(node => node.props['data-gw-result']).props['data-gw-result']).toBe('waiting');
      expect(session.data.wcGroundwaterLens.check.answer).toBe('');
      expect(session.protectedState()).toEqual(before);
    });
  });
});

describe('Water Cycle groundwater lens: independent simulation preservation', () => {
  it('pins the committed exact prior runtime and source/public parity', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves complete model, routes, physical-time traces and engines with exact reviewed 2D drawing anchors', () => {
    expect(sha(reviewedDiagramBytes)).toBe(REVIEWED_DIAGRAM_SHA);
    const original = productionNodes(baselineBytes.toString('utf8'));
    const reviewed = productionNodes(reviewedDiagramBytes.toString('utf8'));
    function rawDrawingAnchors(text) {
      const normalized = text.replace(/\r\n/g, '\n'), nodes = {};
      walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
        const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
        if (!REVIEWED_DIAGRAM_ANCHORS.includes(name)) return;
        if (nodes[name]) throw new Error('Non-unique raw drawing anchor: ' + name);
        nodes[name] = normalized.slice(node.start, node.end);
      });
      return nodes;
    }
    const rawReviewed = rawDrawingAnchors(reviewedDiagramBytes.toString('utf8'));
    expect(Object.keys(rawReviewed).sort()).toEqual([...REVIEWED_DIAGRAM_ANCHORS].sort());
    sources.forEach(source => expect(rawDrawingAnchors(source.text), source.path + ' raw drawing anchors').toEqual(rawReviewed));
    expect(Object.keys(original).sort()).toEqual([...PRESERVED].sort());
    expect(Object.keys(reviewed).sort()).toEqual([...PRESERVED].sort());
    // Require exactly the known earlier visual differences, then freeze each full anchor.
    expect(PRESERVED.filter(name => original[name] !== reviewed[name]).sort()).toEqual([...REVIEWED_DIAGRAM_ANCHORS].sort());
    REVIEWED_DIAGRAM_ANCHORS.forEach(name => { original[name] = reviewed[name]; });
    sources.forEach(source => expect(productionNodes(source.text), source.path).toEqual(original));
  });
  it('preserves exact original quiz and myth first-answer counters and rewards', () => {
    const original = scoredNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(original).sort()).toEqual(['myth', 'quiz']);
    sources.forEach(source => expect(scoredNodes(source.text), source.path).toEqual(original));
  });
  it('rejects state writes and arbitrary calls inside the reviewed decorative paint boundary', () => {
    expect(() => reviewedPoreDecoration('d.landSaturation = 100;')).toThrow();
    expect(() => reviewedPoreDecoration('state.recharge++;')).toThrow();
    expect(() => reviewedPoreDecoration('upd("wcGroundwaterLens", {});')).toThrow();
    expect(() => reviewedPoreDecoration('ctx.canvas.width = 999;')).toThrow();
    expect(() => reviewedPoreDecoration('delete ctx.canvas;')).toThrow();
    expect(() => reviewedPoreDecoration('ctx.beginPath(); ctx.fillStyle = "blue"; ctx.fill();')).not.toThrow();
  });
  it('detects changes outside the decorative block rather than excluding the 2D engine', () => {
    const original = productionNodes(sources[0].text).canvasRef;
    const changed = sources[0].text.replace('// Parent material:', '// Altered parent material:');
    expect(() => productionNodes(changed)).toThrow();
    expect(original).toContain('// Parent material:');
    expect(original).toContain('waterTable2d');
  });
  it('requires the new Check wrapper to be only the shared unscored renderer adapter', () => {
    expect(() => normalizeReviewedCheckPores("function renderWcCheckPores() { return renderWcGroundwaterLens('check'); }")).not.toThrow();
    for (const body of ["upd('score', 100); return renderWcGroundwaterLens('check');", "return renderWcGroundwaterLens('explorer');", "return renderWcGroundwaterLens('check', d);"]) {
      expect(() => normalizeReviewedCheckPores('function renderWcCheckPores() {' + body + '}')).toThrow();
    }
  });
});
