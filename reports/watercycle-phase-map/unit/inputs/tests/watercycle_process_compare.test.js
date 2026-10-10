import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const IDS = ['evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration'];
const STATE_CHANGE = new Set(['evaporation', 'condensation', 'transpiration']);
const ABSORBS_VAPOR_ENERGY = new Set(['evaporation', 'transpiration']);
const PAIRS = IDS.flatMap(first => IDS.filter(second => second !== first).map(second => ({ first, second })));
let shipped;

function objectLiteral(source, marker) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error('Missing trace marker: ' + marker);
  const start = source.indexOf('{', markerAt + marker.length);
  let depth = 0, quote = '', escaped = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed trace literal');
}

function load(file) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('  var WCProcessCompare = (function() {');
  const end = source.indexOf('  // End process comparison helpers.', start);
  if (start < 0 || end < start) throw new Error('Missing process comparison helper in ' + file);
  const fragment = source.slice(start, end);
  const K = new Function(fragment + '\nreturn WCProcessCompare;')();
  const traces = new Function('return (' + objectLiteral(source, 'var MATTER_ENERGY_TRACE =') + ');')();
  return { file, source, fragment, K, traces };
}

function each(callback) { shipped.forEach(({ K, traces, file }) => callback(K, traces, file)); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function checked(K) {
  return K.transition(K.transition(K.normalize(), { type: 'answer', value: 'both' }), { type: 'check' });
}

beforeAll(() => { shipped = PATHS.map(load); });

describe('Water Cycle process comparison: canonical science', () => {
  // USGS defines condensation as vapor becoming liquid; precipitation is water
  // falling as liquid or solid. Infiltration can remain in shallow soil rather
  // than reaching an aquifer. These tests exercise those distinctions using the
  // actual teaching traces, rather than treating every arrow as a phase change.
  // https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle
  // https://www.usgs.gov/water-science-school/science/precipitation-and-water-cycle
  // https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle
  it('exposes exactly the six canonical processes in both shipped helpers', () => {
    each(K => expect(K.ids).toEqual(IDS));
  });

  it('does not let the exported ID list redefine valid processes', () => {
    shipped.forEach(({ fragment, traces }) => {
      const local = new Function(fragment + '\nreturn WCProcessCompare;')();
      local.ids.push('unknown');
      local.ids.splice(0, 1);
      expect(local.descriptor('unknown', traces)).toBeNull();
      expect(local.normalize({ first: 'unknown', second: 'condensation' }).first).toBe('evaporation');
      expect(local.descriptor('evaporation', traces)).not.toBeNull();
    });
  });

  for (const question of ['phase', 'energy']) {
    const truth = question === 'phase' ? STATE_CHANGE : ABSORBS_VAPOR_ENERGY;
    it.each(PAIRS)(`${question}: $first compared with $second`, ({ first, second }) => {
      const a = truth.has(first), b = truth.has(second);
      const expected = a ? (b ? 'both' : 'first') : (b ? 'second' : 'neither');
      each((K, traces) => expect(K.evaluate(first, second, question, traces)).toEqual({ expected, first: a, second: b }));
    });
  }

  it('preserves supplied source, driver, and latent heat evidence', () => {
    each((K, traces) => {
      for (const id of IDS) {
        const d = K.descriptor(id, traces);
        for (const key of ['phaseFrom', 'energyTransfer', 'energyLabel', 'driver', 'source']) expect(d[key]).toBe(traces[id][key]);
        expect(d.id).toBe(id);
        expect(d.stateChange).toBe(STATE_CHANGE.has(id));
        expect(d.absorbsVaporEnergy).toBe(ABSORBS_VAPOR_ENERGY.has(id));
      }
    });
  });

  it('scopes condensation to liquid droplets even when the scene trace mentions ice', () => {
    each((K, traces) => {
      const input = freeze({ ...traces, condensation: { ...traces.condensation, phaseTo: 'Liquid droplets or ice', destination: 'Cloud droplets or ice' } });
      const d = K.descriptor('condensation', input);
      expect(d.phaseTo).toBe('Liquid droplets');
      expect(d.destination).toBe('Cloud droplets');
      expect(d.energyTransfer).toBe('released');
      expect(input.condensation.phaseTo).toBe('Liquid droplets or ice');
    });
  });

  it('does not turn infiltration into automatic groundwater recharge', () => {
    each((K, traces) => {
      const input = freeze({ ...traces, infiltration: { ...traces.infiltration, phaseTo: 'Liquid in soil and aquifer', destination: 'Soil and aquifer' } });
      const d = K.descriptor('infiltration', input);
      expect(d.phaseTo).toBe('Liquid soil pore water');
      expect(d.destination).toBe('Soil pore water');
      expect(d.stateChange).toBe(false);
      expect(input.infiltration.destination).toBe('Soil and aquifer');
    });
  });

  it('uses explicit energy metadata rather than interpreting display wording', () => {
    each((K, traces) => {
      const input = { ...traces, evaporation: { ...traces.evaporation, energyLabel: 'Translated display text', phaseFrom: 'Translated source state', phaseTo: 'Translated destination state' } };
      expect(K.descriptor('evaporation', input)).toMatchObject({ stateChange: true, absorbsVaporEnergy: true });
    });
  });

  it('rejects unknown processes, repeated pairs, and unsupported questions', () => {
    each((K, traces) => {
      for (const [a, b, q] of [['unknown', 'evaporation', 'phase'], ['evaporation', 'unknown', 'phase'], ['evaporation', 'evaporation', 'phase'], ['evaporation', 'transpiration', 'volume']]) expect(K.evaluate(a, b, q, traces)).toBeNull();
      expect(K.descriptor('unknown', traces)).toBeNull();
    });
  });

  it('returns no classification for missing or malformed trace evidence', () => {
    each((K, traces) => {
      for (const value of [null, [], {}, { ...traces.evaporation, driver: '' }, { ...traces.evaporation, source: 7 }, { ...traces.evaporation, energyTransfer: 'unknown' }, { ...traces.evaporation, energyTransfer: 'Absorbed' }]) {
        const input = { ...traces, evaporation: value };
        expect(K.descriptor('evaporation', input)).toBeNull();
        expect(K.evaluate('evaporation', 'transpiration', 'phase', input)).toBeNull();
        expect(K.evaluate('evaporation', 'transpiration', 'energy', input)).toBeNull();
      }
      expect(K.evaluate('evaporation', 'transpiration', 'phase', null)).toBeNull();
      expect(K.descriptor('evaporation', Object.create(traces))).toBeNull();
    });
  });
});

describe('Water Cycle process comparison: safe learner state', () => {
  it('starts with a distinct evaporation/transpiration pair and no checked answer', () => {
    each(K => {
      const expected = { first: 'evaporation', second: 'transpiration', question: 'phase', answer: '', checked: false, notes: {} };
      for (const value of [undefined, null, [], 9, 'invalid', {}]) expect(K.normalize(value)).toEqual(expected);
    });
  });

  it('recovers unknown and identical pairs to valid distinct selections', () => {
    each(K => {
      for (const first of [...IDS, 'unknown', null]) for (const second of [...IDS, 'unknown', null]) {
        const next = K.normalize({ first, second });
        expect(IDS).toContain(next.first);
        expect(IDS).toContain(next.second);
        expect(next.first).not.toBe(next.second);
        if (IDS.includes(first)) expect(next.first).toBe(first);
        if (IDS.includes(first) && IDS.includes(second) && first !== second) expect(next.second).toBe(second);
      }
    });
  });

  it('keeps only supported questions and choices, and requires an answer before checked', () => {
    each(K => {
      expect(K.normalize({ first: 'evaporation', second: 'transpiration', question: 'energy', answer: 'first', checked: true })).toMatchObject({ question: 'energy', answer: 'first', checked: true });
      expect(K.normalize({ question: 'anything', answer: 'wrong', checked: true })).toMatchObject({ question: 'phase', answer: '', checked: false });
      expect(K.normalize({ checked: true })).toMatchObject({ answer: '', checked: false });
      expect(K.normalize({ first: 'evaporation', second: 'transpiration', question: 'phase', answer: 'both', checked: 'true' })).toMatchObject({ answer: 'both', checked: false });
    });
  });

  it('clears stale persisted feedback when repairing a pair or question', () => {
    each(K => {
      const valid = { first: 'evaporation', second: 'transpiration', question: 'phase', answer: 'both', checked: true, notes: { 'evaporation|transpiration': 'Keep my writing.' } };
      for (const patch of [{ first: 'unknown' }, { second: 'unknown' }, { second: 'evaporation' }, { question: 'volume' }, { first: undefined }, { question: undefined }]) {
        const next = K.normalize({ ...valid, ...patch });
        expect(next.answer).toBe('');
        expect(next.checked).toBe(false);
        expect(next.notes).toEqual(valid.notes);
        expect(IDS).toContain(next.first);
        expect(IDS).toContain(next.second);
        expect(next.first).not.toBe(next.second);
      }
      expect(valid).toMatchObject({ answer: 'both', checked: true });
    });
  });

  it('retains only bounded text notes for valid ordered distinct pairs', () => {
    each(K => {
      const input = freeze({ notes: { 'evaporation|transpiration': 'same phase', 'transpiration|evaporation': 'reverse order', 'condensation|precipitation': 'x'.repeat(900), 'evaporation|evaporation': 'invalid', 'unknown|condensation': 'invalid', 'infiltration|collection|extra': 'invalid', 'collection|infiltration': 7 } });
      const notes = K.normalize(input).notes;
      expect(Object.keys(notes).sort()).toEqual(['condensation|precipitation', 'evaporation|transpiration', 'transpiration|evaporation']);
      expect(notes['condensation|precipitation']).toHaveLength(800);
      expect(notes['evaporation|transpiration']).toBe('same phase');
      expect(input.notes['condensation|precipitation']).toHaveLength(900);
    });
  });

  it('pair changes clear an old answer and feedback while keeping the chosen question', () => {
    each(K => {
      const previous = freeze({ ...checked(K), question: 'energy', notes: { 'evaporation|transpiration': 'My first comparison.' } });
      const next = K.transition(previous, { type: 'pair', first: 'condensation', second: 'precipitation' });
      expect(next).toMatchObject({ first: 'condensation', second: 'precipitation', question: 'energy', answer: '', checked: false });
      expect(next.notes).toEqual(previous.notes);
      expect(previous.answer).toBe('both');
      expect(previous.checked).toBe(true);
    });
  });

  it('question changes clear the old answer and feedback without changing the pair', () => {
    each(K => {
      const previous = freeze(checked(K));
      const next = K.transition(previous, { type: 'question', value: 'energy' });
      expect(next).toMatchObject({ first: 'evaporation', second: 'transpiration', question: 'energy', answer: '', checked: false });
      expect(previous).toMatchObject({ question: 'phase', answer: 'both', checked: true });
    });
  });

  it('a revised answer needs another explicit check', () => {
    each(K => {
      const previous = freeze(checked(K));
      expect(K.transition(previous, { type: 'answer', value: 'neither' })).toMatchObject({ answer: 'neither', checked: false });
      expect(previous).toMatchObject({ answer: 'both', checked: true });
    });
  });

  it('checking records an explicit check for every valid choice without awarding correctness', () => {
    each(K => {
      expect(K.transition(K.normalize(), { type: 'check' }).checked).toBe(false);
      for (const answer of ['first', 'second', 'both', 'neither']) {
        const next = K.transition(K.transition(K.normalize(), { type: 'answer', value: answer }), { type: 'check' });
        expect(next.checked).toBe(true);
        expect(next.answer).toBe(answer);
        expect(Object.keys(next).sort()).toEqual(['answer', 'checked', 'first', 'notes', 'question', 'second']);
      }
    });
  });

  it('same pair, question, or answer actions preserve an already checked comparison', () => {
    each(K => {
      const previous = checked(K);
      for (const action of [{ type: 'pair', first: previous.first, second: previous.second }, { type: 'question', value: previous.question }, { type: 'answer', value: previous.answer }]) expect(K.transition(previous, action)).toEqual(previous);
    });
  });

  it('notes follow their ordered pair through switching and question changes', () => {
    each(K => {
      let next = K.transition(K.normalize(), { type: 'note', value: 'Both release vapor.' });
      next = K.transition(next, { type: 'pair', first: 'condensation', second: 'precipitation' });
      next = K.transition(next, { type: 'note', value: 'One changes state; one falls.' });
      next = K.transition(next, { type: 'question', value: 'energy' });
      expect(next.notes['condensation|precipitation']).toBe('One changes state; one falls.');
      next = K.transition(next, { type: 'pair', first: 'transpiration', second: 'evaporation' });
      next = K.transition(next, { type: 'note', value: 'Reverse order note.' });
      next = K.transition(next, { type: 'pair', first: 'evaporation', second: 'transpiration' });
      expect(next.notes).toEqual({ 'evaporation|transpiration': 'Both release vapor.', 'condensation|precipitation': 'One changes state; one falls.', 'transpiration|evaporation': 'Reverse order note.' });
    });
  });

  it('bounds edited notes and preserves checked feedback during writing', () => {
    each(K => {
      const previous = freeze(checked(K));
      const next = K.transition(previous, { type: 'note', value: 'x'.repeat(900) });
      expect(next.notes['evaporation|transpiration']).toHaveLength(800);
      expect(next.checked).toBe(true);
      expect(previous.notes).toEqual({});
      expect(K.transition(next, { type: 'note', value: null }).notes['evaporation|transpiration']).toBe('');
    });
  });

  it('unknown actions return detached valid state without changing existing evidence', () => {
    each(K => {
      const previous = freeze({ ...checked(K), notes: { 'evaporation|transpiration': 'Retain my reasoning.' } });
      for (const action of [undefined, null, { type: 'unknown' }]) {
        const next = K.transition(previous, action);
        expect(next).toEqual(previous);
        expect(next).not.toBe(previous);
        expect(next.notes).not.toBe(previous.notes);
      }
    });
  });

  it('normalization detaches notes from the supplied state', () => {
    each(K => {
      const previous = { notes: { 'evaporation|transpiration': 'Original' } };
      const next = K.normalize(previous);
      next.notes['evaporation|transpiration'] = 'Revised';
      expect(previous.notes['evaporation|transpiration']).toBe('Original');
    });
  });

  it('the public helper matches the source implementation', () => {
    expect(shipped[0].fragment).toBe(shipped[1].fragment);
  });
});
