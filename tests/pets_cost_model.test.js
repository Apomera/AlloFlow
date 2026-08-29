// Pets Lab — Lifetime Cost calculator.
//
// Regression this locks in (2026-07-28): the year slider runs 1..30, but a
// guinea pig pair lives ~6 years and a large dog ~11. The panel labelled the
// total "Lifetime cost" at every slider position, so 30 years of guinea pigs —
// about five successive pairs — was reported as one animal's lifetime. It also
// charged the first-year setup exactly once, when each new animal brings its
// own.
//
// The money gap was small and sometimes negative (guinea pigs cost more to
// keep than to acquire), so the defect that mattered was the WORD, not the
// arithmetic. These tests pin both, and pin that the multi-animal reality is
// stated rather than left for the student to infer from a lifespan printed
// elsewhere on the page.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

function extractProfiles() {
  const i = SRC.indexOf('var profiles = {');
  const o = SRC.indexOf('{', i);
  let d = 0, j = o;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}') { d--; if (!d) { j++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(o, j) + ')');
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = SRC.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}`);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < SRC.length; end++) {
    if (SRC[end] === '{') depth += 1;
    else if (SRC[end] === '}') {
      depth -= 1;
      if (depth === 0) { end += 1; break; }
    }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(start, end) + ')');
}

const PROFILES = extractProfiles();
const IDS = Object.keys(PROFILES);

/** Mirrors the shipped calculation. */
function model(p, years) {
  const animals = Math.max(1, Math.ceil(years / (p.lifespan || years)));
  const multiGen = animals > 1;
  const cost = multiGen
    ? (animals * p.firstYear) + (p.annual * Math.max(0, years - animals))
    : p.firstYear + (p.annual * (years - 1));
  return { animals, multiGen, cost, perYear: cost / years };
}

describe('cost profiles are complete and sane', () => {
  it('every profile carries the fields the panel renders', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(6);
    for (const id of IDS) {
      const p = PROFILES[id];
      for (const f of ['firstYear', 'annual', 'emergencyFund', 'lifespan', 'timeDaily']) {
        expect(typeof p[f], id + ' is missing ' + f).toBe('number');
        expect(p[f], id + '.' + f + ' must be positive').toBeGreaterThan(0);
      }
    }
  });

  it('lifespans are plausible for the species named', () => {
    // Guards against a transposed digit turning a 6-year pet into 60.
    for (const id of IDS) {
      expect(PROFILES[id].lifespan).toBeGreaterThanOrEqual(3);
      expect(PROFILES[id].lifespan).toBeLessThanOrEqual(40);
    }
  });
});

describe('within one lifetime the figure is a true lifetime cost', () => {
  it('uses one first-year setup and never flags multiple animals', () => {
    for (const id of IDS) {
      const p = PROFILES[id];
      const r = model(p, p.lifespan);
      expect(r.animals, id + ' should be a single animal at its own lifespan').toBe(1);
      expect(r.multiGen).toBe(false);
      expect(r.cost).toBe(p.firstYear + p.annual * (p.lifespan - 1));
    }
  });

  it('a one-year span is just the first year', () => {
    for (const id of IDS) expect(model(PROFILES[id], 1).cost).toBe(PROFILES[id].firstYear);
  });
});

describe('beyond one lifetime the figure is named and priced correctly', () => {
  it('counts one first-year setup per successive animal', () => {
    for (const id of IDS) {
      const p = PROFILES[id];
      const years = p.lifespan * 3;
      const r = model(p, years);
      expect(r.animals).toBe(3);
      // Setup is paid three times, not once. (Note this does NOT always make
      // the total larger: a guinea pig pair costs more to keep per year than
      // to acquire, so replacing one is cheaper than another year of hay.
      // That inversion is real, so the assertion is exact rather than ">".)
      expect(r.cost).toBe(3 * p.firstYear + p.annual * (years - 3));
    }
  });

  it('charges setup once per animal, which is the whole correction', () => {
    for (const id of IDS) {
      const p = PROFILES[id];
      const years = p.lifespan * 2;
      const oldWay = p.firstYear + p.annual * (years - 1);
      const now = model(p, years).cost;
      expect(now - oldWay).toBe(p.firstYear - p.annual);
    }
  });

  it('the guinea pig case that exposed this is now multi-animal', () => {
    const gp = PROFILES['guinea-pair'];
    expect(gp, 'guinea-pair profile went missing').toBeTruthy();
    const r = model(gp, 30);
    expect(r.animals).toBeGreaterThanOrEqual(5);
    expect(r.multiGen).toBe(true);
  });

  it('labels projected dollars as a baseline instead of claiming a complete lifetime total', () => {
    expect(SRC).toContain("'Baseline planned cost'");
    expect(SRC).not.toMatch(/multiGen \? 'Cost over ' \+ costYears \+ ' yr' : 'Lifetime cost'/);
  });

  it('states the successive-animal reality instead of leaving it inferred', () => {
    expect(SRC).toMatch(/successive/);
    expect(SRC).toMatch(/first-year setups, not one/);
    // The loss point is the part a cost table cannot express on its own.
    expect(SRC).toMatch(/goodbye/);
  });

  it('the composition bar tracks the headline rather than diverging', () => {
    expect(SRC).toMatch(/var setup = p\.firstYear \* costAnimals;/);
    expect(SRC).toMatch(/var ongoing = p\.annual \* Math\.max\(0, costYears - costAnimals\);/);
    expect(SRC).toMatch(/var total = setup \+ ongoing \|\| 1;/);
    expect(SRC).not.toMatch(/var total = setup \+ ongoing \+ (?:reserve|p\.emergencyFund)/);
  });
});

describe('local research estimates stay bounded and species-scoped', () => {
  const normalize = extractFunction('normalizeCostEstimates');

  it('keeps only known species, known fields, and finite whole-dollar values', () => {
    expect(normalize({
      'cat-indoor': {
        firstYear: '2200.6',
        annual: -8,
        emergencyFund: 150000,
        privateNote: 'PRIVATE',
      },
      reptile: { annual: 475 },
      removedSpecies: { firstYear: 99999, annual: 99999, emergencyFund: 99999 },
    })).toEqual({
      'cat-indoor': { firstYear: 2201, annual: 0, emergencyFund: 100000 },
      reptile: { annual: 475 },
    });
  });

  it('rejects containers and non-finite values without manufacturing inputs', () => {
    expect(normalize(null)).toEqual({});
    expect(normalize([])).toEqual({});
    expect(normalize({
      'cat-indoor': ['PRIVATE'],
      'dog-large': {
        firstYear: Infinity,
        annual: 'not-a-number',
        emergencyFund: null,
      },
      'dog-small': { firstYear: true, annual: '', emergencyFund: {} },
    })).toEqual({});
  });

  it('persists the mode and sanitized estimate map through the shared snapshot path', () => {
    expect(SRC).toContain("'costSpecies', 'costYears', 'costMode', 'costEstimates'");
    expect(SRC).toContain("snapshot.costMode = snapshot.costMode === 'local' ? 'local' : 'illustrative'");
    expect(SRC).toContain('snapshot.costEstimates = normalizeCostEstimates(snapshot.costEstimates)');
    expect(SRC).toContain('var costEstimates = normalizeCostEstimates(d.costEstimates)');
  });
});

describe('per-year cost stays honest across the slider', () => {
  it('converges toward the species annual cost as the span grows', () => {
    // Setup amortises in whichever direction the species runs, so the only
    // universal truth is that the per-year figure approaches `annual`.
    for (const id of IDS) {
      const p = PROFILES[id];
      const near = Math.abs(model(p, p.lifespan).perYear - p.annual);
      const far = Math.abs(model(p, p.lifespan * 3).perYear - p.annual);
      expect(far, id + ' per-year drifts away from its annual cost').toBeLessThanOrEqual(near + 1e-9);
    }
  });

  it('moves monotonically toward the annual cost within one lifetime', () => {
    for (const id of IDS) {
      const p = PROFILES[id];
      // Which way it moves depends on whether acquiring costs more than keeping.
      const risesWithTime = p.annual > p.firstYear;
      let prev = model(p, 1).perYear;
      for (let y = 2; y <= p.lifespan; y++) {
        const cur = model(p, y).perYear;
        if (risesWithTime) expect(cur, id + ' y' + y).toBeGreaterThanOrEqual(prev - 1e-9);
        else expect(cur, id + ' y' + y).toBeLessThanOrEqual(prev + 1e-9);
        prev = cur;
      }
    }
  });

  it('keeps the species where keeping costs more than acquiring', () => {
    // Guinea pigs are the cheap-to-buy / dear-to-keep case, and it is a real
    // point the tool makes about "starter" pets. If a data edit ever flips it,
    // the direction assertions above quietly change meaning — so pin it.
    const gp = PROFILES['guinea-pair'];
    expect(gp.annual).toBeGreaterThan(gp.firstYear);
  });
});
