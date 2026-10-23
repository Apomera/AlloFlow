import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
const source = readFileSync('stem_lab/raptor_distance_investigations.js', 'utf8');
function setup(ready = true) {
  const local = {};
  Function('window', source)(local);
  if (ready) {
    // Evidence may also arrive before its model in the parallel loader.
    Function('window', evidenceSource)(local);
    Function('window', modelSource)(local);
  }
  return { local, api: local.RaptorDistanceInvestigations };
}
const { api } = setup();
const starter = { version: 1, distance: 80, cycles: 8, contrast: 95, widthM: .30, wideFov: 20, detailFov: .75 };
const targets = {
  distance: { ...starter, distance: 160 },
  cycles: { ...starter, cycles: 16 },
  contrast: { ...starter, contrast: 25 }
};
const answers = { distance: 'smaller-higher', cycles: 'same-higher', contrast: 'same-same' };
const choices = ['smaller-higher', 'same-higher', 'same-same'];
const angle = distance => 2 * Math.asin(.15 / Math.hypot(distance, .15));

describe('Guided Raptor distance investigations', () => {
  it('registers only the frozen API, allows parallel dependency arrival and resolves dependencies at call time', () => {
    const { local, api: lazy } = setup(false);
    expect(Object.keys(local)).toEqual(['RaptorDistanceInvestigations']);
    expect(Object.isFrozen(lazy)).toBe(true);
    expect(Object.keys(lazy).sort()).toEqual(['check', 'explain', 'get', 'match', 'version']);
    expect(lazy.version).toBe(1);
    const unavailable = () => {
      expect(lazy.get('distance')).toBeNull(); expect(lazy.match('distance', starter, targets.distance)).toBe(false);
      expect(lazy.explain(starter, targets.distance)).toBeNull();
      expect(lazy.check('distance', starter, targets.distance, answers.distance)).toBeNull();
    };
    unavailable(); Function('window', evidenceSource)(local); unavailable();
    Function('window', modelSource)(local); expect(lazy.get('distance').reference).toEqual(starter);
    const model = local.RaptorDistanceModel, evidence = local.RaptorDistanceEvidence;
    for (const bad of [null, {}, { ...model, version: 2 }, { ...model, metrics: null }, { ...model, normalize: null }]) {
      local.RaptorDistanceModel = bad; unavailable();
    }
    local.RaptorDistanceModel = model;
    for (const bad of [null, {}, { ...evidence, version: 2 }, { ...evidence, snapshot: null }, { ...evidence, compare: null }]) {
      local.RaptorDistanceEvidence = bad; unavailable();
    }
    local.RaptorDistanceEvidence = evidence;
    expect(lazy.match('distance', starter, targets.distance)).toBe(true);
    Function('window', source)(local); expect(local.RaptorDistanceInvestigations).toBe(lazy);
  });

  it('defines three immediately usable investigations with the same complete starter and a single changed factor', () => {
    for (const id of ['distance', 'cycles', 'contrast']) {
      const definition = api.get(id);
      expect(Object.keys(definition).sort()).toEqual(['answer', 'choices', 'factor', 'id', 'question', 'reference', 'target', 'title']);
      expect(definition.id).toBe(id); expect(definition.factor).toBe(id);
      expect(definition.title.length).toBeGreaterThan(10); expect(definition.question.length).toBeGreaterThan(40);
      expect(definition.reference).toEqual(starter); expect(definition.target).toEqual(targets[id]);
      expect(['distance', 'cycles', 'contrast'].filter(key => definition.reference[key] !== definition.target[key])).toEqual([id]);
      expect(definition.choices.map(choice => choice.id)).toEqual(choices); expect(definition.answer).toBe(answers[id]);
      expect(definition.choices.every(choice => Object.keys(choice).sort().join(',') === 'id,text' && choice.text.length > 20)).toBe(true);
      expect(api.match(id, definition.reference, definition.target)).toBe(true);
    }
    // Independent geometry separates the two increasing-frequency lessons.
    expect(angle(targets.distance.distance)).toBeLessThan(angle(starter.distance));
    expect(targets.distance.cycles / angle(targets.distance.distance)).toBeGreaterThan(starter.cycles / angle(starter.distance));
    expect(angle(targets.cycles.distance)).toBe(angle(starter.distance));
    expect(targets.cycles.cycles / angle(targets.cycles.distance)).toBe(2 * starter.cycles / angle(starter.distance));
    expect(angle(targets.contrast.distance)).toBe(angle(starter.distance));
    expect(targets.contrast.cycles / angle(targets.contrast.distance)).toBe(starter.cycles / angle(starter.distance));
  });

  it('returns fresh copies of definitions, both condition sets and every answer choice', () => {
    const first = api.get('distance'), second = api.get('distance'), other = api.get('cycles');
    expect(first).not.toBe(second); expect(first.reference).not.toBe(first.target); expect(first.reference).not.toBe(other.reference);
    first.reference.distance = 300; first.target.cycles = 20; first.choices[0].text = 'changed'; first.choices.push({ id: 'extra', text: 'extra' });
    first.title = 'changed'; first.answer = 'extra';
    expect(second).toEqual(api.get('distance')); expect(second.reference).toEqual(starter); expect(second.target).toEqual(targets.distance);
    expect(second.choices).toHaveLength(3); expect(second.choices[0].text).not.toBe('changed'); expect(other.reference).toEqual(starter);
  });

  it('rejects unknown, coerced and inherited investigation identifiers', () => {
    for (const id of [undefined, null, true, 1, '', 'Distance', 'distance ', 'constructor', 'toString', '__proto__', {}, [], new String('distance')]) {
      expect(api.get(id)).toBeNull(); expect(api.match(id, starter, targets.distance)).toBe(false);
      expect(api.check(id, starter, targets.distance, 'smaller-higher')).toBeNull();
    }
  });

  it('matches only the exact ordered template pair and rejects manually diverged conditions', () => {
    for (const id of Object.keys(targets)) {
      expect(api.match(id, targets[id], starter)).toBe(false); expect(api.match(id, starter, starter)).toBe(false);
      for (const field of ['distance', 'cycles', 'contrast']) {
        const changedReference = { ...starter, [field]: starter[field] + 1 };
        const changedTarget = { ...targets[id], [field]: targets[id][field] + 1 };
        expect(api.match(id, changedReference, targets[id])).toBe(false);
        expect(api.match(id, starter, changedTarget)).toBe(false);
      }
      for (const other of Object.keys(targets).filter(other => other !== id)) expect(api.match(id, starter, targets[other])).toBe(false);
    }
    expect(api.match('distance', { ...starter, distance: 40 }, { ...starter, distance: 80 })).toBe(false);
    expect(api.match('cycles', { ...starter, cycles: 4 }, { ...starter, cycles: 8 })).toBe(false);
  });

  it('requires strict valid snapshots without fabricating missing or malformed conditions', () => {
    class Settings { constructor() { Object.assign(this, starter); } }
    const invalid = [undefined, null, [], {}, Object.create(starter), new Settings(), Object.assign([], starter),
      { ...starter, version: '1' }, { ...starter, version: 2 }, { ...starter, distance: '80' },
      { ...starter, distance: NaN }, { ...starter, cycles: Infinity }, { ...starter, contrast: 95.1 },
      { ...starter, distance: 39 }, { ...starter, cycles: 21 }, { ...starter, contrast: 101 },
      { ...starter, widthM: 30 }, { ...starter, wideFov: 40 }, { ...starter, detailFov: 1.5 }];
    for (const field of ['version', 'distance', 'cycles', 'contrast']) {
      const missing = { ...starter }; delete missing[field]; invalid.push(missing);
    }
    for (const value of invalid) {
      expect(api.match('distance', value, targets.distance)).toBe(false);
      expect(api.match('distance', starter, value)).toBe(false);
      expect(api.explain(value, starter)).toBeNull(); expect(api.explain(starter, value)).toBeNull();
      expect(api.check('distance', value, targets.distance, answers.distance)).toBeNull();
    }
    expect(api.match('distance', Object.assign(Object.create(null), starter), targets.distance)).toBe(true);
    expect(api.match('distance', { version: 1, distance: 80, cycles: 8, contrast: 95 }, targets.distance)).toBe(true);
  });

  it('explains distance changes in both directions without claiming exact inverse-angle scaling', () => {
    const farther = api.explain(starter, targets.distance), nearer = api.explain(targets.distance, starter);
    expect(farther.kind).toBe('single'); expect(farther.factor).toBe('distance');
    expect(farther.text).toContain('Distance increased from 80 m to 160 m');
    expect(farther.text).toContain('Angular span decreased and cycles per degree increased');
    expect(farther.text).toContain('nearly twice'); expect(farther.text).not.toContain('exactly');
    expect(nearer.text).toContain('Distance decreased from 160 m to 80 m');
    expect(nearer.text).toContain('Angular span increased and cycles per degree decreased');
    expect(nearer.text).toContain('nearly half'); expect(nearer.text).not.toContain('exactly');
    const general = api.explain(starter, { ...starter, distance: 120 });
    expect(general.text).toContain((100 * angle(120) / angle(80)).toFixed(1) + '%');
    expect(general.text).toContain((100 * angle(80) / angle(120)).toFixed(1) + '%');
    expect(general.text).toContain('approximately');
  });

  it('explains stripe-count changes using fixed angular span in both directions', () => {
    const more = api.explain(starter, targets.cycles), fewer = api.explain(targets.cycles, starter);
    expect(more).toMatchObject({ kind: 'single', factor: 'cycles' });
    expect(more.text).toContain('Stripe pairs increased from 8 to 16');
    expect(more.text).toContain('Angular span stayed the same, so cycles per degree increased');
    expect(more.text).toContain('doubles spatial frequency exactly');
    expect(fewer.text).toContain('Stripe pairs decreased from 16 to 8');
    expect(fewer.text).toContain('cycles per degree decreased'); expect(fewer.text).toContain('halves spatial frequency exactly');
    const general = api.explain(starter, { ...starter, cycles: 11 });
    expect(general.text).toContain('direct proportion'); expect(general.text).not.toContain('Doubling');
  });

  it('explains fading and brightening from the actual contrast direction, with unchanged geometry and reference band', () => {
    const cases = [[95, 25, 'decreased'], [10, 25, 'increased'], [25, 95, 'increased']];
    for (const [from, to, direction] of cases) {
      const result = api.explain({ ...starter, contrast: from }, { ...starter, contrast: to });
      expect(result).toMatchObject({ kind: 'single', factor: 'contrast' });
      expect(result.text).toContain(`Display contrast ${direction} from ${from}% to ${to}%`);
      expect(result.text).toContain('Angular span, cycles per degree and the selected reference band stayed the same');
      expect(result.text).toContain(`Input and filtered modulation both ${direction}`);
      expect(result.text).toContain((100 * to / from).toFixed(1) + '%');
      expect(result.text).toContain('does not predict animal detection');
    }
  });

  it('handles unchanged and multi-factor exploration honestly rather than borrowing a template explanation', () => {
    const same = api.explain(starter, starter);
    expect(same).toMatchObject({ kind: 'same', factor: null }); expect(same.text).toContain('no factor has changed');
    const changed = { ...starter, distance: 160, cycles: 16, contrast: 25 };
    const multiple = api.explain(starter, changed);
    expect(multiple).toMatchObject({ kind: 'multiple', factor: null }); expect(multiple.text).toContain('cannot isolate one cause');
    expect(multiple.text).toContain((100 * angle(160) / angle(80)).toFixed(1) + '%');
    expect(multiple.text).toContain((100 * (16 / angle(160)) / (8 / angle(80))).toFixed(1) + '%');
    expect(Object.keys(multiple).sort()).toEqual(['factor', 'kind', 'text']);
    expect(multiple).not.toHaveProperty('correct'); expect(multiple).not.toHaveProperty('detected');
  });

  it('checks the geometry reflection only for matched conditions and valid choices', () => {
    for (const id of Object.keys(targets)) {
      for (const answer of choices) {
        const result = api.check(id, starter, targets[id], answer);
        expect(result).toEqual({ correct: answer === answers[id], explanation: api.explain(starter, targets[id]).text });
      }
      for (const invalid of [undefined, null, '', true, 'constructor', 'toString', '__proto__', 'same', {}, [], new String(answers[id])]) {
        expect(api.check(id, starter, targets[id], invalid)).toBeNull();
      }
      expect(api.check(id, starter, { ...targets[id], contrast: targets[id].contrast + 1 }, answers[id])).toBeNull();
      expect(api.check(id, targets[id], starter, answers[id])).toBeNull();
      expect(api.check(id, starter, starter, answers[id])).toBeNull();
    }
  });

  it('does not mutate supplied settings or retain a learner answer between calls', () => {
    const reference = Object.freeze({ ...starter }), current = Object.freeze({ ...targets.distance });
    const before = JSON.stringify({ reference, current });
    const first = api.check('distance', reference, current, 'same-same'); first.correct = true; first.explanation = 'changed';
    expect(api.check('distance', reference, current, 'same-same').correct).toBe(false);
    expect(api.check('distance', reference, current, 'smaller-higher').correct).toBe(true);
    api.explain(reference, current); api.match('distance', reference, current);
    expect(JSON.stringify({ reference, current })).toBe(before);
    expect(api.get('distance').reference).toEqual(starter);
  });
});
