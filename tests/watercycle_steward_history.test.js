import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const TEST_PATH = 'tests/watercycle_steward_history.test.js';
const BASELINE_PATH = 'reports/watercycle-cloud-evidence/tested-runtime.js';
const BASELINE_SHA = '42eae634d0027b819ac0e5368801447780290c3d70e5da15aa402ff84d94314c';
const PRESERVED = [
  'MAINE_WATERSHED_COMPONENTS', 'STEWARD_TECHNIQUES', 'STEWARD_EVENTS',
  'STEWARD_FEEDBACK_RULES', 'STEWARD_CASCADE_HINTS', 'STEWARD_DIFFICULTIES',
  'wcWatershedCopy', 'localizeWatershedComponents', 'wcStewardCopy', 'applyStewardCopy',
  'defaultStewardState', 'watershedComponents', 'getWatershedComponent',
  'stewardRng', 'stewardClamp', 'startStewardCampaign', 'resetSteward',
  'applyStewardTech', 'endStewardYear', 'advanceFromStewardReview',
  'stewardCoachingTip', 'stewardYearDebrief', 'checkWaterCycleChallenges',
  'WATER_CYCLE_CHALLENGES',
];
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
function freeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    Object.values(value).forEach(item => freeze(item, seen));
    Object.freeze(value);
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
function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!PRESERVED.includes(name)) return;
    if (result[name]) throw new Error('Non-unique production anchor: ' + name);
    result[name] = normalized.slice(node.start, node.end);
  });
  return result;
}
export const waterCycleStewardHistoryVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA,
  preservedNames: PRESERVED, productionNodes,
};

const loadedAt = new Date().toISOString();
const sources = [SOURCE_PATH, MIRROR_PATH].map(path => ({ path, bytes: readFileSync(path), text: readFileSync(path, 'utf8') }));
const baselineBytes = readFileSync(BASELINE_PATH);
const loadedTestBytes = readFileSync(TEST_PATH);
afterAll(() => {
  if (process.env.WATER_CYCLE_STEWARD_HISTORY_LOADED_REPORT) {
    writeFileSync(process.env.WATER_CYCLE_STEWARD_HISTORY_LOADED_REPORT, JSON.stringify({
      loadedAt, completedAt: new Date().toISOString(),
      loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
      loadedTest: { path: TEST_PATH, sha256: sha(loadedTestBytes), bytes: loadedTestBytes.length },
    }, null, 2) + '\n');
  }
});
function loadHelper(source) {
  const initializers = {};
  walkNodes(parse(source.text, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'VariableDeclarator' || !node.id || !['WCStewardHistory', 'MAINE_WATERSHED_COMPONENTS'].includes(node.id.name)) return;
    if (initializers[node.id.name]) throw new Error('Duplicate Steward initializer');
    initializers[node.id.name] = source.text.slice(node.init.start, node.init.end);
  });
  if (Object.keys(initializers).length !== 2) throw new Error('Missing actual Steward helper or canonical components in ' + source.path);
  const api = runInNewContext('var WCStewardHistory = ' + initializers.WCStewardHistory + ';\n' +
    'var MAINE_WATERSHED_COMPONENTS = ' + initializers.MAINE_WATERSHED_COMPONENTS + ';\n' +
    '({ helper: WCStewardHistory, components: MAINE_WATERSHED_COMPONENTS });',
  {}, { filename: source.path + ':steward-history', timeout: 1000 });
  return { path: source.path, ...api };
}
const shipped = sources.map(loadHelper);
function each(callback) { shipped.forEach(({ path, helper, components }) => callback(helper, components, path)); }
const IDS = ['headwaterStreams', 'riverMainstem', 'floodplainWetlands', 'forestBuffer', 'agriculturalWatershed', 'suburbanEdges'];
const STEP_IDS = ['start', 'actions', 'drift', 'event', 'difficulty', 'cascade'];
const METRICS = ['quality', 'connectivity', 'support'];
function snapshot(components, value, selectedId = 'riverMainstem', metric = 'quality') {
  return components.map(component => ({ id: component.id, ...plain(component.defaultState),
    ...(component.id === selectedId ? { [metric]: value } : {}) }));
}
function record(components, year = 1, values = [40, 50, 48, 36, 30, 35], selectedId = 'riverMainstem', metric = 'quality') {
  return { year, event: 'Recorded storm', actions: [{ tech: 'Recorded action', hours: 4 }],
    yearStart: snapshot(components, values[0], selectedId, metric),
    pre: snapshot(components, values[1], selectedId, metric),
    stages: STEP_IDS.slice(1).map((id, index) => ({ id, components: snapshot(components, values[index + 1], selectedId, metric) })),
    post: snapshot(components, values[5], selectedId, metric) };
}
function describeRecord(helper, components, saved, selection = {}, seed = 'history-fixture') {
  return helper.describe([saved], selection, components, seed);
}
function answer(helper, components, log, choice, seed = 'history-fixture', selection = {}) {
  const initial = helper.describe(log, selection, components, seed);
  return helper.describe(log, { ...selection, identity: initial.identity, answer: choice }, components, seed);
}

describe('Water Cycle Steward history: actual saved evidence and selection', () => {
  it('extracts the actual helper and six canonical components from both shipped runtimes', () => {
    each((helper, components) => {
      expect(Object.keys(helper).sort()).toEqual(['describe', 'metrics', 'score', 'signed']);
      expect(Array.from(components, component => component.id)).toEqual(IDS);
      expect(components).toHaveLength(6);
    });
  });
  it('returns independent metric definitions with stable names, shapes and patterns', () => {
    each(helper => {
      expect(plain(helper.metrics()).map(({ key, label, shape, dash }) => ({ key, label, shape, dash }))).toEqual([
        { key: 'quality', label: 'Quality', shape: 'circle', dash: '' },
        { key: 'connectivity', label: 'Connectivity', shape: 'square', dash: '8 4' },
        { key: 'support', label: 'Community support', shape: 'diamond', dash: '2 4' },
      ]);
      const first = helper.metrics(); first[0].key = 'forged'; first.push({ key: 'volume' });
      expect(Array.from(helper.metrics(), item => item.key)).toEqual(METRICS);
    });
  });
  it('defaults to River Mainstem, quality and the latest unique saved year', () => {
    each((helper, components) => {
      const result = helper.describe([record(components, 3), record(components, 1)], null, components, 'seed');
      expect(result.component.id).toBe('riverMainstem');
      expect(result.metric.key).toBe('quality');
      expect(result.selected.year).toBe(3);
      expect(result.previous.year).toBe(1);
      expect(result.rows).toHaveLength(3);
    });
  });
  it('falls back to the first canonical component when River Mainstem is absent', () => {
    each((helper, components) => {
      const definitions = freeze([plain(components[0])]);
      const result = helper.describe([], { component: 'invented', metric: 'volume' }, definitions, 'seed');
      expect(result.component.id).toBe('headwaterStreams');
      expect(result.metric.key).toBe('quality');
    });
  });
  it('does not read scores for an empty component definition', () => {
    each(helper => {
      const saved = { year: 1, post: [{ id: '', quality: 80 }] };
      const result = helper.describe([saved], { component: '' }, [], 'seed');
      expect(result.component.id).toBe('');
      expect(result.selected.value).toBeNull();
      expect(result.complete).toBe(false);
    });
  });
  it.each(METRICS)('reads only the selected %s metric from saved component records', metric => {
    each((helper, components) => {
      const saved = record(components, 1, [10, 20, 23, 30, 40, 41], 'forestBuffer', metric);
      const result = describeRecord(helper, components, saved, { component: 'forestBuffer', metric });
      expect(result.component.id).toBe('forestBuffer'); expect(result.metric.key).toBe(metric);
      expect(result.selected.value).toBe(41);
      expect(Array.from(result.steps, step => step.value)).toEqual([10, 20, 23, 30, 40, 41]);
    });
  });
  it('accepts exact native year strings and selects the matching saved year', () => {
    each((helper, components) => {
      const log = [record(components, 1), record(components, 10)];
      expect(helper.describe(log, { year: '1' }, components, 'seed').selected.year).toBe(1);
      expect(helper.describe(log, { year: '10' }, components, 'seed').selected.year).toBe(10);
      for (const year of ['01', ' 1', '1.0', '11', 0, 2, null]) {
        expect(helper.describe(log, { year }, components, 'seed').selected.year).toBe(10);
      }
    });
  });
  it('ignores inherited and array-shaped selection fields', () => {
    each((helper, components) => {
      const log = [record(components, 1), record(components, 2)];
      for (const selection of [Object.create({ component: 'forestBuffer', metric: 'support', year: 1 }),
        Object.assign([], { component: 'forestBuffer', metric: 'support', year: 1 })]) {
        const result = helper.describe(log, selection, components, 'seed');
        expect(result.component.id).toBe('riverMainstem'); expect(result.metric.key).toBe('quality');
        expect(result.selected.year).toBe(2);
      }
    });
  });
  it('keeps valid zero scores and recorded zero differences', () => {
    each((helper, components) => {
      const log = [record(components, 1, [0, 0, 0, 0, 0, 0]), record(components, 2, [0, 0, 0, 0, 0, 0])];
      const result = helper.describe(log, {}, components, 'seed');
      expect(result.selected.value).toBe(0); expect(result.previous.value).toBe(0); expect(result.delta).toBe(0);
      expect(result.rows[1].change).toBe(0); expect(result.complete).toBe(true);
      expect(result.question.status).toBe('unchanged');
    });
  });
  it('makes missing year rows explicit and compares consecutive recorded endpoints across a gap', () => {
    each((helper, components) => {
      const result = helper.describe([record(components, 1), record(components, 3, [40, 50, 48, 36, 30, 39])], {}, components, 'seed');
      expect(plain(result.rows).map(row => [row.year, row.hasRecord, row.value, row.previousYear, row.change])).toEqual([
        [1, true, 35, null, null], [2, false, null, 1, null], [3, true, 39, 1, 4],
      ]);
      expect(result.previous.year).toBe(1); expect(result.delta).toBe(4);
    });
  });
  it('treats duplicate years as gaps and never chooses an arbitrary duplicate', () => {
    each((helper, components) => {
      const log = [record(components, 1), record(components, 2), record(components, 2, [70, 70, 70, 70, 70, 70])];
      const result = helper.describe(log, { year: 2 }, components, 'seed');
      expect(result.rows[1].hasRecord).toBe(false); expect(result.rows[1].value).toBeNull();
      expect(result.selected.year).toBe(1);
      expect(result.rows[1].event).toBe(''); expect(result.rows[1].actionsCount).toBeNull();
    });
  });
  it('does not skip a recorded but unknown previous value to manufacture a comparison', () => {
    each((helper, components) => {
      const middle = record(components, 2); middle.post = [];
      const result = helper.describe([record(components, 1), middle, record(components, 3)], {}, components, 'seed');
      expect(result.previous.year).toBe(2); expect(result.previous.value).toBeNull();
      expect(result.delta).toBeNull(); expect(result.rows[2].change).toBeNull();
    });
  });
  it('rejects invalid years and inherited or array-shaped records', () => {
    each((helper, components) => {
      const invalid = [0, -1, 1.5, 11, NaN, Infinity, '2', null, true].map(year => ({ ...record(components), year }));
      invalid.push(Object.create(record(components, 3)), Object.assign([], record(components, 4)));
      const result = helper.describe([...invalid, record(components, 2)], {}, components, 'seed');
      expect(result.rows).toHaveLength(2); expect(result.selected.year).toBe(2);
      expect(result.rows[0].hasRecord).toBe(false);
    });
  });
  it('returns an honest empty state for absent or non-array history', () => {
    each((helper, components) => {
      for (const log of [undefined, null, {}, 'history', []]) {
        const result = helper.describe(log, {}, components, 'seed');
        expect(result.rows).toHaveLength(0); expect(result.selected).toBeNull(); expect(result.previous).toBeNull();
        expect(result.delta).toBeNull(); expect(result.identity).toBe(''); expect(result.complete).toBe(false);
        expect(result.question.status).toBe('incomplete'); expect(result.result).toBe('waiting');
      }
    });
  });
  it('retains a bounded recorded event and distinguishes absent action evidence from no actions', () => {
    each((helper, components) => {
      const saved = record(components); saved.event = 'E'.repeat(161); saved.actions = [];
      const result = describeRecord(helper, components, saved);
      expect(result.selected.event).toBe('E'.repeat(160)); expect(result.selected.actionsCount).toBe(0);
      delete saved.actions; saved.event = { title: 'Do not coerce' };
      const absent = describeRecord(helper, components, saved);
      expect(absent.selected.actionsCount).toBeNull(); expect(absent.selected.event).toBe('');
    });
  });
  it('does not mutate frozen saved history, selection or canonical definitions', () => {
    each((helper, components) => {
      const definitions = freeze(plain(components));
      const log = freeze([record(definitions, 1), record(definitions, 2)]);
      const selection = freeze({ component: 'forestBuffer', metric: 'support', year: '1', answer: 'event', identity: 'old' });
      const before = JSON.stringify({ log, selection, definitions });
      const first = helper.describe(log, selection, definitions, 'seed');
      helper.describe(log, { component: 'riverMainstem', metric: 'quality' }, definitions, 'other-seed');
      expect(JSON.stringify({ log, selection, definitions })).toBe(before);
      expect(first.selected.year).toBe(1); expect(first.answer).toBe('');
    });
  });
});

describe('Water Cycle Steward history: missing evidence and exact annual stages', () => {
  it('derives all six saved stages and their adjacent signed changes in canonical order', () => {
    each((helper, components) => {
      const saved = record(components); saved.stages.reverse();
      const result = describeRecord(helper, components, saved);
      expect(Array.from(result.steps, step => step.id)).toEqual(STEP_IDS);
      expect(Array.from(result.steps, step => step.value)).toEqual([40, 50, 48, 36, 30, 35]);
      expect(Array.from(result.steps, step => step.delta)).toEqual([null, 10, -2, -12, -6, 5]);
      expect(Array.from(result.steps, step => step.displayedDelta)).toEqual([null, 10, -2, -12, -6, 5]);
      expect(result.steps.slice(1).reduce((sum, step) => sum + step.delta, 40)).toBe(35);
      expect(result.complete).toBe(true); expect(result.question.status).toBe('ready');
      expect(Array.from(result.question.winners)).toEqual(['event']); expect(result.question.largest).toBe(12);
    });
  });
  it('rejects unsupported score shapes and out-of-scale scores without coercion or clamping', () => {
    each((helper, components) => {
      const cyclic = {}; cyclic.self = cyclic;
      for (const value of [undefined, null, NaN, Infinity, -Infinity, -0.1, 100.1, '0', '55', true, false, {}, [], 1n, cyclic]) {
        const saved = record(components); saved.post.find(item => item.id === 'riverMainstem').quality = value;
        const result = describeRecord(helper, components, freeze(saved));
        expect(result.selected.value, typeof value).toBeNull();
        expect(result.complete).toBe(false); expect(result.question.status).toBe('incomplete');
        expect(result.question.winners).toHaveLength(0);
      }
    });
  });
  it('ignores inherited and array-shaped saved component metrics', () => {
    each((helper, components) => {
      for (const item of [Object.create({ id: 'riverMainstem', quality: 55 }),
        Object.assign(Object.create({ quality: 55 }), { id: 'riverMainstem' }),
        Object.assign([], { id: 'riverMainstem', quality: 55 })]) {
        const saved = record(components); saved.post = [item];
        expect(describeRecord(helper, components, saved).selected.value).toBeNull();
      }
    });
  });
  it('treats missing or duplicate selected component IDs as unknown', () => {
    each((helper, components) => {
      for (const post of [[], [{ id: 'unknown', quality: 99 }],
        [{ id: 'riverMainstem', quality: 1 }, { id: 'riverMainstem', quality: 99 }]]) {
        const saved = record(components); saved.post = post;
        const result = describeRecord(helper, components, saved);
        expect(result.selected.value).toBeNull(); expect(result.complete).toBe(false);
      }
    });
  });
  it('a missing start leaves the first change unknown while later known adjacent stages remain usable', () => {
    each((helper, components) => {
      const saved = record(components); delete saved.yearStart;
      const result = describeRecord(helper, components, saved);
      expect(Array.from(result.steps, step => step.delta)).toEqual([null, null, -2, -12, -6, 5]);
      expect(result.complete).toBe(false); expect(result.question.status).toBe('incomplete');
      expect(result.question.largest).toBeNull();
    });
  });
  it.each(['drift', 'event', 'difficulty', 'cascade'])('missing %s evidence breaks only adjacent deltas and disables the question', stageId => {
    each((helper, components) => {
      const saved = record(components); saved.stages = saved.stages.filter(stage => stage.id !== stageId);
      const result = describeRecord(helper, components, saved), index = STEP_IDS.indexOf(stageId);
      expect(result.steps[index].value).toBeNull(); expect(result.steps[index].delta).toBeNull();
      if (index < 5) expect(result.steps[index + 1].delta).toBeNull();
      expect(result.complete).toBe(false); expect(result.question.status).toBe('incomplete');
      expect(result.answer).toBe('');
    });
  });
  it('duplicate stage IDs cannot silently select the first or last snapshot', () => {
    each((helper, components) => {
      const saved = record(components); saved.stages.push(plain(saved.stages.find(stage => stage.id === 'event')));
      const result = describeRecord(helper, components, saved);
      expect(result.steps[3].value).toBeNull(); expect(result.steps[3].delta).toBeNull();
      expect(result.steps[4].delta).toBeNull(); expect(result.complete).toBe(false);
    });
  });
  it('does not read inherited or array-shaped annual stage snapshots', () => {
    each((helper, components) => {
      const original = record(components).stages.find(stage => stage.id === 'event');
      for (const replacement of [Object.create(original), Object.assign([], original),
        Object.assign(Object.create({ components: original.components }), { id: 'event' })]) {
        const saved = record(components); saved.stages = saved.stages.filter(stage => stage.id !== 'event').concat([replacement]);
        const result = describeRecord(helper, components, saved);
        expect(result.steps[3].value).toBeNull(); expect(result.steps[3].delta).toBeNull();
        expect(result.steps[4].delta).toBeNull(); expect(result.complete).toBe(false);
      }
    });
  });
  it('a duplicate selected component inside a stage leaves its value and both adjacent changes unknown', () => {
    each((helper, components) => {
      const saved = record(components), event = saved.stages.find(stage => stage.id === 'event');
      event.components.push({ id: 'riverMainstem', quality: 1 });
      const result = describeRecord(helper, components, saved);
      expect(result.steps[3].value).toBeNull(); expect(result.steps[3].delta).toBeNull();
      expect(result.steps[4].delta).toBeNull(); expect(result.question.status).toBe('incomplete');
    });
  });
  it('requires a unique recorded actions stage matching the separately saved pre-action endpoint', () => {
    each((helper, components) => {
      for (const kind of ['missing', 'duplicate', 'mismatch']) {
        const saved = record(components), actionStage = saved.stages.find(stage => stage.id === 'actions');
        if (kind === 'missing') saved.stages = saved.stages.filter(stage => stage.id !== 'actions');
        if (kind === 'duplicate') saved.stages.push(plain(actionStage));
        if (kind === 'mismatch') actionStage.components.find(item => item.id === 'riverMainstem').quality = 51;
        const result = describeRecord(helper, components, saved);
        expect(result.steps[1].value).toBe(50); expect(result.complete, kind).toBe(false);
        expect(result.question.status).toBe('incomplete');
      }
    });
  });
  it('requires cascade evidence to reconcile with the selected saved year endpoint', () => {
    each((helper, components) => {
      const saved = record(components); saved.post.find(item => item.id === 'riverMainstem').quality = 36;
      const result = describeRecord(helper, components, saved);
      expect(result.selected.value).toBe(36); expect(result.steps[5].value).toBe(35);
      expect(result.complete).toBe(false); expect(result.question.status).toBe('incomplete');
    });
  });
  it('preserves legacy post readings without inventing missing start, actions, or intermediate stages', () => {
    each((helper, components) => {
      const saved = { year: 1, post: snapshot(components, 72), event: 'Legacy event' };
      const result = describeRecord(helper, components, saved);
      expect(result.selected.value).toBe(72);
      expect(result.steps.every(step => step.value === null)).toBe(true);
      expect(result.complete).toBe(false); expect(result.question.status).toBe('incomplete');
    });
  });
});

describe('Water Cycle Steward history: displayed changes and evidence-bound feedback', () => {
  it('formats one decimal, preserves signs symmetrically and displays a rounded zero as zero', () => {
    each(helper => {
      expect(helper.score(50.04)).toBe('50'); expect(helper.score(50.06)).toBe('50.1');
      expect(helper.signed(0.05)).toBe('+0.1'); expect(helper.signed(-0.05)).toBe('-0.1');
      expect(helper.signed(0.049)).toBe('0'); expect(helper.signed(-0.049)).toBe('0');
      expect(helper.signed(-0)).toBe('0'); expect(helper.signed(12.34)).toBe('+12.3');
      for (const value of [null, undefined, NaN, Infinity, '5', {}, []]) {
        expect(helper.score(value)).toBe('Not recorded'); expect(helper.signed(value)).toBe('Not recorded');
      }
    });
  });
  it('rounds differences from raw saved values separately from displayed endpoint scores', () => {
    each((helper, components) => {
      const result = describeRecord(helper, components, record(components, 1, [50.04, 50.06, 50.06, 50.06, 50.06, 50.06]));
      expect(helper.score(result.steps[0].value)).toBe('50'); expect(helper.score(result.steps[1].value)).toBe('50.1');
      expect(result.steps[1].delta).toBeCloseTo(0.02, 10); expect(result.steps[1].displayedDelta).toBe(0);
      expect(helper.signed(result.steps[1].delta)).toBe('0');
      expect(result.complete).toBe(true); expect(result.question.status).toBe('unchanged');
      expect(result.question.winners).toHaveLength(0);
    });
  });
  it('uses absolute displayed changes and accepts every equally large positive or negative change', () => {
    each((helper, components) => {
      const log = [record(components, 1, [40, 50, 49, 39, 39, 39])];
      const initial = helper.describe(log, {}, components, 'seed');
      expect(Array.from(initial.question.winners)).toEqual(['actions', 'event']);
      expect(initial.question.largest).toBe(10);
      expect(answer(helper, components, log, 'actions', 'seed').result).toBe('supported');
      expect(answer(helper, components, log, 'event', 'seed').result).toBe('supported');
      expect(answer(helper, components, log, 'drift', 'seed').result).toBe('retry');
    });
  });
  it('honors ties in displayed precision even when raw magnitudes differ', () => {
    each((helper, components) => {
      const log = [record(components, 1, [40, 50.04, 50, 39.97, 39.97, 39.97])];
      const initial = helper.describe(log, {}, components, 'seed');
      expect(initial.steps[1].delta).not.toBe(Math.abs(initial.steps[3].delta));
      expect(initial.question.largest).toBe(10); expect(Array.from(initial.question.winners)).toEqual(['actions', 'event']);
      expect(answer(helper, components, log, 'event', 'seed').result).toBe('supported');
    });
  });
  it('returns waiting when all displayed changes round to zero, without a forced answer', () => {
    each((helper, components) => {
      const log = [record(components, 1, [50, 50.01, 50.02, 50.03, 50.04, 50.03])];
      const result = answer(helper, components, log, 'actions');
      expect(result.complete).toBe(true); expect(result.question.status).toBe('unchanged');
      expect(result.question.largest).toBe(0); expect(result.answer).toBe(''); expect(result.result).toBe('waiting');
    });
  });
  it('retains an evidence-matched wrong answer as retry and a winning answer as supported', () => {
    each((helper, components) => {
      const log = [record(components)];
      const right = answer(helper, components, log, 'event'), wrong = answer(helper, components, log, 'drift');
      expect(right.answer).toBe('event'); expect(right.result).toBe('supported');
      expect(wrong.answer).toBe('drift'); expect(wrong.result).toBe('retry');
    });
  });
  it('rejects foreign, start-stage, inherited and array-shaped answers', () => {
    each((helper, components) => {
      const log = [record(components)], initial = helper.describe(log, {}, components, 'seed');
      for (const choice of ['start', 'unknown', '__proto__', 'constructor', null, {}, []]) {
        const result = helper.describe(log, { identity: initial.identity, answer: choice }, components, 'seed');
        expect(result.answer).toBe(''); expect(result.result).toBe('waiting');
      }
      for (const selection of [Object.create({ identity: initial.identity, answer: 'event' }),
        Object.assign([], { identity: initial.identity, answer: 'event' })]) {
        expect(helper.describe(log, selection, components, 'seed').result).toBe('waiting');
      }
    });
  });
  it('binds feedback to the full campaign seed including different suffixes after 160 equal characters', () => {
    each((helper, components) => {
      const log = [record(components)], firstSeed = 'S'.repeat(160) + '-first', secondSeed = 'S'.repeat(160) + '-second';
      const initial = helper.describe(log, {}, components, firstSeed);
      const result = helper.describe(log, { identity: initial.identity, answer: 'event' }, components, secondSeed);
      expect(result.identity).not.toBe(initial.identity); expect(result.answer).toBe(''); expect(result.result).toBe('waiting');
      expect(JSON.parse(initial.identity)[0]).toBe(firstSeed);
    });
  });
  it('clears feedback when component, metric, selected year or campaign seed changes', () => {
    each((helper, components) => {
      const log = [record(components, 1), record(components, 2)];
      const initial = helper.describe(log, { year: 1 }, components, 'seed');
      for (const [selection, seed] of [
        [{ year: 1, component: 'forestBuffer' }, 'seed'], [{ year: 1, metric: 'support' }, 'seed'],
        [{ year: 2 }, 'seed'], [{ year: 1 }, 'other-seed'],
      ]) {
        const result = helper.describe(log, { ...selection, identity: initial.identity, answer: 'event' }, components, seed);
        expect(result.identity).not.toBe(initial.identity); expect(result.answer).toBe(''); expect(result.result).toBe('waiting');
      }
    });
  });
  it('binds feedback to raw values even when changed scores display identically', () => {
    each((helper, components) => {
      const saved = record(components, 1, [40.01, 50, 48, 36, 30, 35]), initial = describeRecord(helper, components, saved);
      const changed = plain(saved); changed.yearStart.find(item => item.id === 'riverMainstem').quality = 40.02;
      const result = describeRecord(helper, components, changed, { identity: initial.identity, answer: 'event' });
      expect(helper.score(initial.steps[0].value)).toBe(helper.score(result.steps[0].value));
      expect(result.identity).not.toBe(initial.identity); expect(result.result).toBe('waiting');
    });
  });
  it('clears feedback when stage consistency becomes incomplete or selected post evidence changes', () => {
    each((helper, components) => {
      const saved = record(components), initial = describeRecord(helper, components, saved);
      for (const kind of ['action-stage', 'post']) {
        const changed = plain(saved);
        const list = kind === 'action-stage' ? changed.stages.find(stage => stage.id === 'actions').components : changed.post;
        list.find(item => item.id === 'riverMainstem').quality += 0.01;
        const result = describeRecord(helper, components, changed, { identity: initial.identity, answer: 'event' });
        expect(result.identity).not.toBe(initial.identity); expect(result.complete).toBe(false);
        expect(result.answer).toBe(''); expect(result.result).toBe('waiting');
      }
    });
  });
});

describe('Water Cycle Steward history: original campaign authoring, engine and rewards', () => {
  it('pins the independently saved baseline and identical shipped runtime bytes', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves the exact six-component authoring, action effects, events, difficulties and feedback rules', () => {
    const baseline = productionNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual([...PRESERVED].sort());
    for (const source of sources) {
      const current = productionNodes(source.text);
      for (const name of PRESERVED.filter(name => /^MAINE_|^STEWARD_/.test(name))) expect(current[name], source.path + ': ' + name).toBe(baseline[name]);
    }
  });
  it('preserves the exact campaign handlers, seeded randomness, budgets, annual receipts and outcome rewards', () => {
    const baseline = productionNodes(baselineBytes.toString('utf8'));
    expect(baseline.advanceFromStewardReview).toContain('awardStemXP');
    expect(baseline.endStewardYear).toContain('yearLog: steward.yearLog.concat([snap])');
    for (const source of sources) expect(productionNodes(source.text), source.path).toEqual(baseline);
  });
});
