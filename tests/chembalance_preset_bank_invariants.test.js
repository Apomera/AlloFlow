// chemBalance preset-bank invariants — machine-verifies the chemistry of every
// balancing-drill preset instead of trusting hand review. Each preset's displayed
// equation is re-balanced by the tool's own deterministic balancer (exact rational
// Gaussian elimination, window.__alloChemPure.balanceEquation) and must reproduce
// the preset's target coefficients exactly — which also proves the target is in
// lowest terms. The atoms map (which drives the in-tab balance check and the atom
// dot visualization) is independently cross-checked against parseSpecies so a
// typo'd atom column can't silently disagree with the formula. The 12-per-slot
// stepper cap (the +/- coefficient buttons clamp at 12) is asserted so no preset
// can ever be unsolvable in the UI.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

function toAsciiEquation(eq) {
  return String(eq).replace(/[₀-₉]/g, function (ch) {
    return String(SUBSCRIPTS.indexOf(ch));
  });
}

function compoundsOf(eq) {
  const sides = String(eq).split('→');
  const left = sides[0].split('+').map(function (s) { return s.trim(); });
  const right = (sides[1] || '').split('+').map(function (s) { return s.trim(); }).filter(Boolean);
  return { left, right, all: left.concat(right) };
}

let chem;
let presets;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
  chem = window.__alloChemPure;
  presets = chem.BALANCE_PRESETS;
});

describe('chemBalance — preset bank invariants', () => {
  it('exposes the preset bank with unique names and valid tiers', () => {
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThanOrEqual(26);
    const names = presets.map(function (p) { return p.name; });
    expect(new Set(names).size).toBe(names.length);
    for (const p of presets) {
      expect(['beginner', 'intermediate', 'advanced']).toContain(p.tier);
      expect(typeof p.hint).toBe('string');
      expect(p.hint.length).toBeGreaterThan(0);
    }
  });

  it('keeps every tier chip populated (>= 4 presets per tier)', () => {
    for (const tier of ['beginner', 'intermediate', 'advanced']) {
      const count = presets.filter(function (p) { return p.tier === tier; }).length;
      expect(count, tier).toBeGreaterThanOrEqual(4);
    }
  });

  it('rtype classifications are valid and the drill covers all five textbook types', () => {
    const VALID = ['synthesis', 'decomposition', 'single', 'double', 'combustion'];
    const seen = new Set();
    for (const p of presets) {
      if (p.rtype === undefined) continue; // photosynthesis + Ostwald: honestly unlabeled
      expect(VALID, p.name).toContain(p.rtype);
      seen.add(p.rtype);
    }
    for (const t of VALID) expect([...seen], 'missing coverage for ' + t).toContain(t);
    // the tool defines combustion as hydrocarbon + O2 → CO2 + H2O; hold labeled presets to it
    for (const p of presets) {
      if (p.rtype !== 'combustion') continue;
      const eq = toAsciiEquation(p.eq);
      expect(eq, p.name).toMatch(/O2/);
      expect(eq, p.name).toMatch(/CO2/);
      expect(eq, p.name).toMatch(/H2O/);
    }
  });

  it('every target coefficient fits the 12-cap stepper and is a positive integer', () => {
    for (const p of presets) {
      for (const c of p.target) {
        expect(Number.isInteger(c), p.name).toBe(true);
        expect(c, p.name).toBeGreaterThanOrEqual(1);
        expect(c, p.name).toBeLessThanOrEqual(12);
      }
    }
  });

  it('the deterministic balancer reproduces every target exactly (balanced AND lowest terms)', () => {
    for (const p of presets) {
      const r = chem.balanceEquation(toAsciiEquation(p.eq));
      expect(r.ok, p.name + ': ' + (r.error || '')).toBe(true);
      expect(r.coefficients, p.name).toEqual(p.target);
    }
  });

  it('atoms map matches the parsed formulas compound-by-compound', () => {
    for (const p of presets) {
      const comps = compoundsOf(p.eq).all;
      const elements = Object.keys(p.atoms);
      expect(p.target.length, p.name).toBe(comps.length);
      comps.forEach(function (compound, i) {
        const parsed = chem.parseSpecies(toAsciiEquation(compound));
        expect(parsed.ok, p.name + ' / ' + compound).toBe(true);
        // every element the formula contains must be tracked, with the right count
        for (const el of Object.keys(parsed.elems)) {
          expect(elements, p.name + ' missing element ' + el).toContain(el);
          expect(p.atoms[el][i], p.name + ' ' + el + '@' + i).toBe(parsed.elems[el]);
        }
        // and the map must not claim atoms the formula doesn't have
        for (const el of elements) {
          expect(p.atoms[el].length, p.name + ' ' + el + ' column count').toBe(comps.length);
          if (!(el in parsed.elems)) expect(p.atoms[el][i], p.name + ' phantom ' + el + '@' + i).toBe(0);
        }
      });
    }
  });
});

describe('chemBalance — challenge-quiz bank invariants', () => {
  let bank;
  beforeAll(() => { bank = chem.CHALLENGE_QS; });

  it('exposes three tiers, each grown append-only past the original 8', () => {
    expect(Object.keys(bank).sort()).toEqual(['easy', 'hard', 'medium']);
    for (const tier of ['easy', 'medium', 'hard']) {
      expect(bank[tier].length, tier).toBeGreaterThanOrEqual(15);
    }
  });

  it('every question is well-formed with unique text and unique answers', () => {
    const allQs = [];
    for (const tier of ['easy', 'medium', 'hard']) {
      for (const item of bank[tier]) {
        expect(Array.isArray(item.a), item.q).toBe(true);
        expect(item.a.length, item.q).toBe(4);
        expect(new Set(item.a).size, item.q).toBe(4);
        expect(Number.isInteger(item.correct), item.q).toBe(true);
        expect(item.correct, item.q).toBeGreaterThanOrEqual(0);
        expect(item.correct, item.q).toBeLessThanOrEqual(3);
        expect(typeof item.explain, item.q).toBe('string');
        expect(item.explain.length, item.q).toBeGreaterThan(0);
        allQs.push(item.q);
      }
    }
    expect(new Set(allQs).size).toBe(allQs.length);
  });

  it('correct-answer positions are distributed (no position bias)', () => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (const tier of ['easy', 'medium', 'hard']) {
      const tierPositions = new Set();
      for (const item of bank[tier]) {
        counts[item.correct]++;
        tierPositions.add(item.correct);
        total++;
      }
      expect(tierPositions.size, tier + ' uses too few answer positions').toBeGreaterThanOrEqual(3);
    }
    for (let i = 0; i < 4; i++) {
      expect(counts[i] / total, 'position ' + i + ' share').toBeGreaterThanOrEqual(0.15);
      expect(counts[i] / total, 'position ' + i + ' share').toBeLessThanOrEqual(0.4);
    }
  });

  it('declared chemistry checks agree with the marked correct answer', () => {
    let executed = 0;
    for (const tier of ['easy', 'medium', 'hard']) {
      for (const item of bank[tier]) {
        if (!item.check) continue;
        const c = item.check;
        const marked = item.a[item.correct];
        if (c.kind === 'molarMass') {
          const stated = parseFloat(marked);
          expect(Number.isFinite(stated), item.q).toBe(true);
          expect(Math.abs(chem.parseFormula(c.formula).mass - stated), item.q).toBeLessThanOrEqual(c.tol);
        } else if (c.kind === 'atomTotal') {
          const elems = chem.parseFormula(c.formula).elems;
          const totalAtoms = Object.values(elems).reduce((s, n) => s + n, 0);
          expect(String(totalAtoms), item.q).toBe(marked);
        } else if (c.kind === 'atomCount') {
          const sp = chem.parseSpecies(c.species);
          expect(sp.ok, item.q).toBe(true);
          expect(String(sp.coef * (sp.elems[c.element] || 0)), item.q).toBe(marked);
        } else if (c.kind === 'balanceCoeff') {
          const r = chem.balanceEquation(c.eq);
          expect(r.ok, item.q).toBe(true);
          expect(String(r.coefficients[c.species]), item.q).toBe(marked);
        } else if (c.kind === 'balanceForm') {
          const r = chem.balanceEquation(c.eq);
          expect(r.ok, item.q).toBe(true);
          expect(toAsciiEquation(marked), item.q).toBe(r.balancedString);
        } else {
          throw new Error('unknown check kind ' + c.kind + ' on: ' + item.q);
        }
        executed++;
      }
    }
    expect(executed).toBeGreaterThanOrEqual(6);
  });
});

describe('chemBalance — battle-quiz bank invariants', () => {
  let bank;
  beforeAll(() => { bank = chem.BATTLE_QS; });

  it('has grown to 20 well-formed questions with sane damage values', () => {
    expect(bank.length).toBeGreaterThanOrEqual(20);
    const allQs = [];
    for (const item of bank) {
      expect(item.a.length, item.q).toBe(4);
      expect(new Set(item.a).size, item.q).toBe(4);
      expect(item.correct, item.q).toBeGreaterThanOrEqual(0);
      expect(item.correct, item.q).toBeLessThanOrEqual(3);
      expect(item.dmg, item.q).toBeGreaterThanOrEqual(10);
      expect(item.dmg, item.q).toBeLessThanOrEqual(30);
      allQs.push(item.q);
    }
    expect(new Set(allQs).size).toBe(allQs.length);
  });

  it('correct-answer positions are distributed (the legacy bank never used position 3)', () => {
    const counts = [0, 0, 0, 0];
    for (const item of bank) counts[item.correct]++;
    for (let i = 0; i < 4; i++) {
      expect(counts[i] / bank.length, 'position ' + i + ' share').toBeGreaterThanOrEqual(0.15);
      expect(counts[i] / bank.length, 'position ' + i + ' share').toBeLessThanOrEqual(0.4);
    }
  });

  it('declared chemistry checks agree with the marked correct answer', () => {
    let executed = 0;
    for (const item of bank) {
      if (!item.check) continue;
      const c = item.check;
      const marked = item.a[item.correct];
      if (c.kind === 'molarMass') {
        const stated = parseFloat(marked);
        expect(Math.abs(chem.parseFormula(c.formula).mass - stated), item.q).toBeLessThanOrEqual(c.tol);
      } else if (c.kind === 'atomTotal') {
        const elems = chem.parseFormula(c.formula).elems;
        const totalAtoms = Object.values(elems).reduce((s, n) => s + n, 0);
        expect(String(totalAtoms), item.q).toBe(marked);
      } else if (c.kind === 'elementName') {
        expect(chem.ELEMENTS[c.symbol].n, item.q).toBe(marked);
      } else if (c.kind === 'elementSymbol') {
        expect(chem.ELEMENTS[marked] && chem.ELEMENTS[marked].n, item.q).toBe(c.name);
      } else if (c.kind === 'elementZ') {
        expect(chem.ELEMENTS[c.symbol].z, item.q).toBe(c.z);
        expect(chem.ELEMENTS[c.symbol].n, item.q).toBe(marked);
      } else {
        throw new Error('unknown check kind ' + c.kind + ' on: ' + item.q);
      }
      executed++;
    }
    expect(executed).toBeGreaterThanOrEqual(6);
  });
});

describe('chemBalance — safety scenario invariants', () => {
  let scenarios;
  beforeAll(() => { scenarios = chem.EMERGENCIES; });

  it('has grown append-only to 8 scenarios, each with exactly one correct option', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(8);
    for (const s of scenarios) {
      expect(['HIGH', 'MEDIUM', 'LOW'], s.title).toContain(s.urgency);
      expect(s.opts.length, s.title).toBe(4);
      expect(s.opts.filter(o => o.correct).length, s.title).toBe(1);
      expect(s.explain.length, s.title).toBeGreaterThan(0);
    }
    const titles = scenarios.map(s => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('correct options are not all parked at one position', () => {
    const positions = new Set();
    for (const s of scenarios) positions.add(s.opts.findIndex(o => o.correct));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it('every explanation defers to the teacher, responder, or local plan (never DIY cleanup)', () => {
    for (const s of scenarios) {
      const text = s.explain.toLowerCase();
      const defers = text.includes('teacher') || text.includes('responder') || text.includes('local plan')
        || text.includes('emergency plan') || text.includes('fire plan');
      expect(defers, s.title + ' explanation must route to an adult/plan').toBe(true);
    }
  });
});

describe('chemBalance — practice-next control renders', () => {
  it('the balance subtool offers the retry-weighted Practice next button', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
    const html = renderTool('chemBalance', { chemBalance: { subtool: 'balance', _activeCategory: 'core', _everPicked: true } });
    expect(html).toContain('Practice next');
  });

  it('the equation card shows name, tier, and reaction-type chip for the default preset', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
    const html = renderTool('chemBalance', { chemBalance: { subtool: 'balance', _activeCategory: 'core', _everPicked: true } });
    // default preset is Water Formation (beginner, synthesis)
    expect(html).toContain('Water Formation');
    expect(html).toContain('Beginner');
    expect(html).toContain('Synthesis (Combination)');
  });

  it('equation chips surface missed counts (retry loop is visible, with SR text)', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
    const html = renderTool('chemBalance', { chemBalance: {
      subtool: 'balance', _activeCategory: 'core', _everPicked: true,
      missedByName: { 'Table Salt': 2 },
    } });
    expect(html).toContain('↻2');
    expect(html).toContain('missed ×2');
  });
});
