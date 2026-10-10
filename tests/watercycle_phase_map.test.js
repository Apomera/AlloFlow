import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_PATH = 'tests/watercycle_phase_map.test.js';
const IDS = ['melting', 'freezing', 'evaporation', 'condensation', 'sublimation', 'deposition'];
const EXPECTED = [
  ['melting', 'solid', 'liquid', 'absorbed', 'freezing'],
  ['freezing', 'liquid', 'solid', 'released', 'melting'],
  ['evaporation', 'liquid', 'gas', 'absorbed', 'condensation'],
  ['condensation', 'gas', 'liquid', 'released', 'evaporation'],
  ['sublimation', 'solid', 'gas', 'absorbed', 'deposition'],
  ['deposition', 'gas', 'solid', 'released', 'sublimation'],
];
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString();
const loadedTest = readFileSync(TEST_PATH);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
const sources = PATHS.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  let initializer = null, exported = null;
  walk(parse(text, { ecmaVersion: 'latest' }), node => {
    if (node.type === 'VariableDeclarator' && node.id?.name === 'WCPhaseChangeMap') {
      if (initializer) throw new Error('Duplicate actual phase map initializer: ' + path);
      initializer = text.slice(node.init.start, node.init.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
      node.left.object.name === 'window' && node.left.property.name === 'WaterCyclePhaseChangeMap' &&
      node.right.name === 'WCPhaseChangeMap') {
      if (exported) throw new Error('Duplicate actual phase map export: ' + path);
      exported = text.slice(node.start, node.end);
    }
  });
  if (!initializer || !exported) throw new Error('Missing actual phase map initializer/export: ' + path);
  const script = new Script('var WCPhaseChangeMap = ' + initializer + ';\n' + exported + ';\n({ helper:WCPhaseChangeMap, exported:window.WaterCyclePhaseChangeMap });', {
    filename: path + ':phase-map',
  });
  return { path, bytes, context: createContext({ window: {} }), script };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_PHASE_MAP_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_PHASE_MAP_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTest), bytes: loadedTest.length },
  }, null, 2) + '\n');
});
function each(callback) {
  sources.forEach(source => {
    const runtime = source.script.runInContext(source.context, { timeout: 30000 });
    callback(runtime.helper, runtime.exported, source);
  });
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const EMPTY = { selected: 'evaporation', answer: null, checked: false };

describe('Water Cycle phase map: physical meaning from both shipped runtimes', () => {
  it('loads and exports the actual helper from identical shipped files', () => {
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
    each((helper, exported) => {
      expect(exported).toBe(helper);
      expect(Array.from(helper.rows(), row => row.id)).toEqual(IDS);
    });
  });

  it.each(EXPECTED)('%s changes the right states and has the correct energy direction', (id, from, to, energy, reverse) => {
    each(helper => {
      const descriptor = helper.descriptor(id);
      expect(descriptor).toMatchObject({ id, from, to, energy, reverse });
      expect(descriptor.fromLabel).toBeTruthy(); expect(descriptor.toLabel).toBeTruthy();
      expect(descriptor.label).toBeTruthy(); expect(descriptor.description).toBeTruthy(); expect(descriptor.example).toBeTruthy();
      expect(plain(helper.rows().find(row => row.id === id))).toEqual(plain(descriptor));
    });
  });

  it('covers every directed transition between solid, liquid and gas exactly once', () => {
    each(helper => {
      const routes = Array.from(helper.rows(), row => row.from + '>' + row.to);
      expect(routes.slice().sort()).toEqual(['solid>liquid', 'liquid>solid', 'liquid>gas', 'gas>liquid', 'solid>gas', 'gas>solid'].sort());
      expect(new Set(routes).size).toBe(6);
    });
  });

  it('every reverse swaps states, reverses energy transfer and returns to the original phase change', () => {
    each(helper => {
      helper.rows().forEach(row => {
        const reverse = helper.descriptor(row.reverse);
        expect(reverse.from).toBe(row.to); expect(reverse.to).toBe(row.from);
        expect(reverse.energy).toBe(row.energy === 'absorbed' ? 'released' : 'absorbed');
        expect(reverse.reverse).toBe(row.id);
        const reversed = helper.transition({ selected: row.id, answer: row.energy, checked: true }, { type: 'reverse' });
        expect(plain(reversed)).toEqual({ selected: reverse.id, answer: null, checked: false });
        expect(plain(helper.transition(reversed, { type: 'reverse' }))).toEqual({ selected: row.id, answer: null, checked: false });
      });
    });
  });

  it('explains the direct ice/vapor routes and distinguishes deposition frost from liquid freezing', () => {
    each(helper => {
      expect(helper.descriptor('sublimation').description).toMatch(/directly.*skipping the liquid state/i);
      expect(helper.descriptor('deposition').description).toMatch(/directly.*skipping the liquid state/i);
      expect(helper.descriptor('deposition').example).toMatch(/frost directly/i);
      expect(helper.descriptor('deposition').example).toMatch(/liquid water is not freezing first/i);
      expect(helper.descriptor('freezing').description).toMatch(/Liquid water.*ice/i);
      expect(helper.descriptor('condensation').example).toMatch(/liquid droplets.*fog/i);
    });
  });

  it('returns independent rows and descriptors so a learner view cannot alter future science', () => {
    each(helper => {
      const expected = plain(helper.rows()), rows = helper.rows(), single = helper.descriptor('evaporation');
      rows[0].energy = 'invented'; rows[1].reverse = 'deposition'; rows.push({ id: 'fake' });
      single.from = 'solid'; single.example = 'changed';
      expect(plain(helper.rows())).toEqual(expected);
      expect(plain(helper.descriptor('evaporation'))).toEqual(expected.find(row => row.id === 'evaporation'));
    });
  });

  it('does not accept invented names or prototype keys as phase changes', () => {
    each(helper => {
      for (const id of [undefined, null, '', 'boiling', 'Evaporation', 'toString', 'constructor', '__proto__', 0, {}, ['melting']]) {
        expect(helper.descriptor(id)).toBeNull();
      }
    });
  });
});

describe('Water Cycle phase map: saved-state recovery and meaningful prediction choices', () => {
  it('preserves every valid phase, answer and completed prediction independently', () => {
    each(helper => {
      for (const selected of IDS) for (const answer of ['absorbed', 'released']) {
        const state = { selected, answer, checked: true };
        expect(plain(helper.normalize(state))).toEqual(state);
        expect(helper.normalize(state)).not.toBe(state);
      }
    });
  });

  it.each([
    ['missing', undefined], ['null', null], ['string', 'evaporation'], ['number', 3], ['array', []],
    ['empty object', {}], ['unknown phase', { selected: 'boiling', answer: 'released', checked: true }],
    ['prototype key', { selected: '__proto__', answer: 'released', checked: true }],
    ['case mismatch', { selected: 'Condensation', answer: 'released', checked: true }],
    ['answer without phase', { answer: 'released', checked: true }],
    ['inherited state', Object.create({ selected: 'freezing', answer: 'released', checked: true })],
  ])('recovers safely from %s without moving an old answer to the fallback phase', (_label, raw) => {
    each(helper => expect(plain(helper.normalize(raw))).toEqual(EMPTY));
  });

  it('requires a literal valid answer and a literal checked flag', () => {
    each(helper => {
      for (const answer of [undefined, null, '', 'absorbs', 'Absorbed', true, 1, {}, ['released']]) {
        expect(plain(helper.normalize({ selected: 'freezing', answer, checked: true }))).toEqual({ selected: 'freezing', answer: null, checked: false });
      }
      for (const checked of [undefined, null, false, 1, 'true', [], {}]) {
        expect(plain(helper.normalize({ selected: 'freezing', answer: 'released', checked }))).toEqual({ selected: 'freezing', answer: 'released', checked: false });
      }
    });
  });

  it('does not execute inherited or accessor fields while reading learner state', () => {
    each(helper => {
      let reads = 0;
      const state = { selected: 'condensation' };
      Object.defineProperties(state, { answer: { get() { reads++; throw new Error('saved answer accessor'); } }, checked: { get() { reads++; throw new Error('saved checked accessor'); } } });
      expect(plain(helper.normalize(state))).toEqual({ selected: 'condensation', answer: null, checked: false });
      const selectedAccessor = Object.defineProperty({}, 'selected', { get() { reads++; throw new Error('saved selected accessor'); } });
      expect(plain(helper.normalize(selectedAccessor))).toEqual(EMPTY);
      const inheritedAnswer = Object.assign(Object.create({ answer: 'released', checked: true }), { selected: 'freezing' });
      expect(plain(helper.normalize(inheritedAnswer))).toEqual({ selected: 'freezing', answer: null, checked: false });
      expect(reads).toBe(0);
    });
  });

  it('recovers from objects that refuse property inspection', () => {
    each(helper => {
      const malformed = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('unreadable state'); } });
      expect(plain(helper.normalize(malformed))).toEqual(EMPTY);
      expect(plain(helper.transition({ selected: 'melting', answer: 'released', checked: false }, malformed))).toEqual({ selected: 'melting', answer: 'released', checked: false });
      const revocable = Proxy.revocable({}, {}); revocable.revoke();
      expect(plain(helper.normalize(revocable.proxy))).toEqual(EMPTY);
      expect(plain(helper.transition({ selected: 'freezing', answer: null, checked: false }, revocable.proxy))).toEqual({ selected: 'freezing', answer: null, checked: false });
    });
  });

  it('supports an incorrect prediction, check, revision and recheck without awarding model outcomes', () => {
    each(helper => {
      let state = helper.normalize({ selected: 'condensation' });
      state = helper.transition(state, { type: 'check' });
      expect(plain(state)).toEqual({ selected: 'condensation', answer: null, checked: false });
      state = helper.transition(state, { type: 'answer', value: 'absorbed' });
      expect(plain(state)).toEqual({ selected: 'condensation', answer: 'absorbed', checked: false });
      state = helper.transition(state, { type: 'check' });
      expect(plain(state)).toEqual({ selected: 'condensation', answer: 'absorbed', checked: true });
      expect(state.answer).not.toBe(helper.descriptor(state.selected).energy);
      state = helper.transition(state, { type: 'answer', value: 'released' });
      expect(plain(state)).toEqual({ selected: 'condensation', answer: 'released', checked: false });
      state = helper.transition(state, { type: 'check' });
      expect(plain(state)).toEqual({ selected: 'condensation', answer: 'released', checked: true });
      expect(state.answer).toBe(helper.descriptor(state.selected).energy);
    });
  });

  it('resets a prediction when switching phase while preserving a same-phase selection', () => {
    each(helper => {
      const state = { selected: 'evaporation', answer: 'absorbed', checked: true };
      expect(plain(helper.transition(state, { type: 'select', id: 'evaporation' }))).toEqual(state);
      for (const id of IDS.filter(id => id !== state.selected)) {
        expect(plain(helper.transition(state, { type: 'select', id }))).toEqual({ selected: id, answer: null, checked: false });
      }
    });
  });

  it('ignores malformed actions, accessors and inherited action properties', () => {
    each(helper => {
      const state = { selected: 'deposition', answer: 'released', checked: true };
      let reads = 0;
      const accessor = Object.defineProperty({}, 'type', { get() { reads++; throw new Error('action accessor'); } });
      const selectAccessor = Object.defineProperty({ type: 'select' }, 'id', { get() { reads++; throw new Error('id accessor'); } });
      const answerAccessor = Object.defineProperty({ type: 'answer' }, 'value', { get() { reads++; throw new Error('answer accessor'); } });
      for (const action of [undefined, null, {}, [], 'reverse', { type: 'unknown' }, { type: 'select', id: 'toString' },
        { type: 'answer', value: 'yes' }, Object.create({ type: 'reverse' }),
        Object.assign(Object.create({ id: 'freezing' }), { type: 'select' }),
        accessor, selectAccessor, answerAccessor]) {
        expect(plain(helper.transition(state, action))).toEqual(state);
      }
      expect(reads).toBe(0);
    });
  });

  it('keeps scene settings, scores, notes, campaign budgets and learner work unchanged', () => {
    each(helper => {
      const raw = freeze({ selected: 'sublimation', answer: 'released', checked: true,
        temperature: 8, sunlight: 0.6, notes: ['Observed snow'], savedWork: { explanation: 'Snow can skip melting.' },
        campaign: { year: 2, hoursLeft: 9, scores: [40, 80] } });
      const before = JSON.stringify(raw);
      for (const action of [freeze({ type: 'select', id: 'melting' }), freeze({ type: 'reverse' }),
        freeze({ type: 'answer', value: 'absorbed' }), freeze({ type: 'check' })]) {
        const result = helper.transition(raw, action);
        expect(Object.keys(result).sort()).toEqual(['answer', 'checked', 'selected']);
        expect(result).not.toBe(raw);
      }
      expect(JSON.stringify(raw)).toBe(before);
    });
  });
});
