// Pets Lab — Pet Picker scoring.
//
// The picker is a recommendation engine a family could actually act on, so
// its safety-relevant rules have to be REACHABLE, not merely present.
//
// Regression this locks in (2026-07-28): the picker asked a single yes/no
// "kids under 10 in household" and then hardcoded `kidAge: pickKids ? 6 : 99`.
// Its scoring asks the age question at TWO thresholds — under 8 (House Rabbit
// Society) and under 5 (CDC: no reptiles) — so the pinned 6 made the CDC rule
// literally unreachable. A household with a 3-year-old was shown a beginner
// reptile with no caution, while the tool's own Zoonoses module states the
// guidance outright. The fix asks for an age band.
//
// Tests drive the REAL fit() functions lifted out of the source, so they
// cannot drift from the shipped scoring.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

/** Lift the `candidates` array (of {id, fit(o)}) out of renderPicker. */
function extractCandidates() {
  const start = SRC.indexOf('var candidates = [', SRC.indexOf('function renderPicker'));
  const open = SRC.indexOf('[', start);
  let depth = 0, i = open;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(open, i) + ')');
}

/** Lift the age-band table. */
function extractBands() {
  const start = SRC.indexOf('var PICK_KID_BANDS = [');
  const open = SRC.indexOf('[', start);
  let depth = 0, i = open;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(open, i) + ')');
}

function extractNamedFunction(name) {
  const start = SRC.indexOf('function ' + name + '(');
  const open = SRC.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(start, i) + ')');
}

const CANDIDATES = extractCandidates();
const BANDS = extractBands();
const pickerReasonCues = extractNamedFunction('pickerReasonCues');
const byId = (id) => CANDIDATES.find((c) => c.id === id);
const band = (id) => BANDS.find((b) => b.id === id);

function opts(over = {}) {
  return Object.assign({
    housing: 'house', kids: false, kidAge: 99, allergies: false,
    hours: 8, budget: 'medium', experience: 'some',
  }, over);
}
/** Build the inputs the view builds, from an age-band id. */
function withKids(bandId, over = {}) {
  const b = band(bandId);
  return opts(Object.assign({ kids: b.id !== 'none', kidAge: b.age }, over));
}

describe('Pet Picker — age bands make the safety rules reachable', () => {
  it('offers a band below each threshold the scoring tests', () => {
    // Scoring asks `kidAge < 5` and `kidAge < 8`; a band must exist that
    // satisfies each, or the rule is decoration.
    expect(BANDS.some((b) => b.id !== 'none' && b.age < 5)).toBe(true);
    expect(BANDS.some((b) => b.id !== 'none' && b.age < 8)).toBe(true);
    expect(BANDS.find((b) => b.id === 'none').age).toBeGreaterThanOrEqual(18);
  });

  it('penalises reptiles for a household with a child under 5 (CDC)', () => {
    const reptile = byId('reptile-beginner');
    expect(reptile, 'beginner reptile candidate is missing').toBeTruthy();
    const under5 = reptile.fit(withKids('under5'));
    const older = reptile.fit(withKids('10plus'));
    expect(under5, 'the CDC under-5 reptile rule never fires').toBeLessThan(older);
  });

  it('penalises rabbits for young children (House Rabbit Society)', () => {
    const rabbit = byId('rabbit-pair');
    const under5 = rabbit.fit(withKids('under5'));
    const school = rabbit.fit(withKids('5to9'));
    const older = rabbit.fit(withKids('10plus'));
    expect(under5).toBeLessThan(older);
    expect(school).toBeLessThan(older);
  });

  // The old boolean's fixed age of 6 is exactly what made the CDC rule dead.
  it('no longer pins every household with children to a single age', () => {
    expect(SRC).not.toMatch(/kidAge: pickKids \? 6 : 99/);
    expect(SRC).toMatch(/kidAge: kidBand\.age/);
  });

  it('a toddler household never ranks a reptile top', () => {
    const inputs = withKids('under5');
    const ranked = CANDIDATES
      .map((c) => ({ id: c.id, score: c.fit(inputs) }))
      .sort((a, b) => b.score - a.score);
    expect(ranked[0].id).not.toBe('reptile-beginner');
  });

  it('applies the CDC under-5 rodent caution instead of rewarding guinea pigs', () => {
    const guinea = byId('guinea-pair');
    expect(guinea.fit(withKids('under5')))
      .toBeLessThan(guinea.fit(withKids('10plus')));

    const restrictiveProfiles = [
      withKids('under5'),
      withKids('under5', { housing: 'apartment', allergies: true, budget: 'low', experience: 'first' }),
      withKids('under5', { housing: 'rural', hours: 14, budget: 'high', experience: 'lots' }),
    ];
    for (const inputs of restrictiveProfiles) {
      const ranked = CANDIDATES
        .map((candidate) => ({ id: candidate.id, score: candidate.fit(inputs) }))
        .sort((a, b) => b.score - a.score);
      expect(['guinea-pair', 'reptile-beginner']).not.toContain(ranked[0].id);
    }
  });
});

describe('Pet Picker — scoring stays coherent', () => {
  it('every candidate returns a finite score for every band', () => {
    for (const b of BANDS) {
      for (const c of CANDIDATES) {
        const s = c.fit(withKids(b.id));
        expect(Number.isFinite(s), c.id + ' scored non-finite for band ' + b.id).toBe(true);
      }
    }
  });

  it('never compares against an undefined field', () => {
    // Reading a field the inputs object does not define yields undefined, and
    // `undefined < 5` is silently false — which is how the CDC rule died.
    const referenced = new Set();
    const fitSrc = SRC.slice(
      SRC.indexOf('var candidates = [', SRC.indexOf('function renderPicker')),
      SRC.indexOf('var scored = candidates.map'),
    );
    for (const m of fitSrc.matchAll(/\bo\.([a-zA-Z]+)/g)) referenced.add(m[1]);
    const provided = new Set(Object.keys(opts()));
    for (const field of referenced) {
      expect(provided.has(field), 'fit() reads o.' + field + ' but the inputs object never sets it').toBe(true);
    }
  });

  it('allergy households are steered away from the furriest options', () => {
    const withAllergy = opts({ allergies: true });
    const without = opts();
    for (const id of ['dog-large', 'dog-small', 'cat']) {
      expect(byId(id).fit(withAllergy)).toBeLessThan(byId(id).fit(without));
    }
    // ...and toward the one with no dander.
    expect(byId('reptile-beginner').fit(withAllergy))
      .toBeGreaterThan(byId('reptile-beginner').fit(without));
  });

  it('a long-alone-hours household is steered away from a large dog', () => {
    expect(byId('dog-large').fit(opts({ hours: 12 })))
      .toBeLessThan(byId('dog-large').fit(opts({ hours: 2 })));
    // A cat tolerates being alone — the two must not move together.
    expect(byId('cat').fit(opts({ hours: 12 })))
      .toBeGreaterThanOrEqual(byId('cat').fit(opts({ hours: 2 })));
  });

  it('keeps every visible score factor exactly aligned with the computed score', () => {
    const housings = ['apartment', 'house', 'rural'];
    const hours = [0, 4, 6, 8, 10, 14];
    const budgets = ['low', 'medium', 'high'];
    const experiences = ['first', 'some', 'lots'];
    for (const housing of housings) {
      for (const ageBand of BANDS) {
        for (const allergies of [false, true]) {
          for (const alone of hours) {
            for (const budget of budgets) {
              for (const experience of experiences) {
                const inputs = withKids(ageBand.id, {
                  housing,
                  allergies,
                  hours: alone,
                  budget,
                  experience,
                });
                for (const candidate of CANDIDATES) {
                  const score = candidate.fit(inputs);
                  const reasons = pickerReasonCues(candidate.id, inputs, score);
                  expect(
                    reasons[0]?.label,
                    candidate.id + ' fell back instead of explaining its score',
                  ).not.toBe('Current computed score');
                  expect(
                    reasons.reduce((sum, reason) => sum + reason.delta, 0),
                    candidate.id + ' reason total drifted from its score',
                  ).toBe(score);
                }
              }
            }
          }
        }
      }
    }
  });

  it('avoids size-based and child-tolerance shortcuts in learner guidance', () => {
    const candidateText = JSON.stringify(CANDIDATES);
    expect(candidateText).not.toMatch(/Good with kids when raised right/i);
    expect(candidateText).not.toMatch(/generally kid-tolerant/i);
    expect(candidateText).not.toMatch(/small dogs more first-time-owner friendly/i);
    expect(candidateText).toMatch(/adult caregiver/i);
    expect(candidateText).toMatch(/Children under 5 should avoid rodent contact/i);
  });
});

describe('Pet Picker — readiness and uncertainty are real outcomes', () => {
  it('persists only the four bounded readiness checks', () => {
    const persistSlice = SRC.slice(
      SRC.indexOf('var PETS_PERSIST_KEYS'),
      SRC.indexOf('var PETS_EVIDENCE_MODULE_LABELS'),
    );
    expect(persistSlice).toMatch(/'pickReadiness'/);
    expect(SRC).toMatch(/\['housing', 'caregiver', 'budget', 'backup'\]/);
    expect(SRC).toMatch(/snapshot\.pickReadiness = safePickReadiness/);
  });

  it('labels rankings as model output rather than adoption matches', () => {
    expect(SRC).toMatch(/Ranked comparison/);
    expect(SRC).toMatch(/not confidence or proof of suitability/);
    expect(SRC).toMatch(/MODEL LEADER/);
    expect(SRC).not.toMatch(/TOP MATCH|TIED TOP/);
  });

  it('makes waiting explicit until every readiness essential is confirmed', () => {
    expect(SRC).toMatch(/Pause before choosing/);
    expect(SRC).toMatch(/Waiting is the responsible outcome/);
    expect(SRC).toMatch(/Ready to research/);
    expect(SRC).toMatch(/still does not approve an adoption/);
  });
});
