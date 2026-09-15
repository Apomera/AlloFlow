// EvoLab tells students precise odds. This file re-derives each of those numbers
// from the tool's OWN model and fails if the model drifts away from the text.
//
// Why this matters more than it looks. These are not decorative numbers — they are
// the answer key. "About one trial in four makes it" tells a student whether their
// three extinctions in a row mean they did something wrong or that they are seeing
// exactly what the model does. "It moved the odds of A winning from 50% to about
// 73%" is the CORRECT answer to a comprehension check. If someone retunes a survival
// curve or a dose response, every one of these sentences silently becomes a lie, and
// nothing else in the suite would notice: the tool still renders, still passes a11y,
// still round-trips its journal.
//
// The replicas below are ports of the tool's own step functions rather than calls
// into it, because the real ones are bound to refs, canvases and rAF. Each is pinned
// to the source by a structural assertion first: if the constant or the update rule
// it mirrors changes, the port test fails BEFORE the statistics are trusted. A
// replica nobody checks against the source is just a second opinion from the same
// mistake.
//
// Measured 2026-09-15; tolerances are wide enough for sampling noise at the trial
// counts used here, and tight enough to catch a real change in the model.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve('stem_lab/stem_tool_evolab.js'), 'utf8');

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function randNormal(mean, std) {
  const u = 1 - Math.random(), v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Genetic drift: "it moved the odds of A winning from 50% to about 73%"
//    (correct-answer feedback on the N × s check, for N = 10, s = 0.05, p0 = 0.5)
// ─────────────────────────────────────────────────────────────────────────────
describe('drift lab: the N x s check tells the truth about the odds', () => {
  it('the source still uses the update rule this replica mirrors', () => {
    // p = p(1+s) / (1+sp), then binomial sampling of 2N alleles.
    expect(SRC).toContain('p = (p * (1 + sel)) / (1 + sel * p);');
    expect(SRC).toContain('var alleles2N = Math.max(2, Math.round(2 * neOf(nNow)));');
    // And the claim itself is still the one being tested.
    expect(SRC).toContain('from 50% to about 73%');
    expect(SRC).toContain('With N = 10 and A favoured by 5%');
  });

  it('A fixes about 73% of the time at N = 10, s = 0.05', () => {
    const lineage = (n, gens, sel) => {
      let p = 0.5;
      for (let g = 0; g < gens; g++) {
        if (sel > 0) p = (p * (1 + sel)) / (1 + sel * p);
        const a2n = Math.max(2, Math.round(2 * n));
        let c = 0;
        for (let i = 0; i < a2n; i++) if (Math.random() < p) c++;
        p = c / a2n;
        if (p === 0 || p === 1) return p;
      }
      return p;
    };
    const T = 12000;
    let fixed = 0;
    for (let i = 0; i < T; i++) if (lineage(10, 400, 0.05) === 1) fixed++;
    const pct = 100 * fixed / T;
    // Kimura's u(p) with the 4Ns exponent gives 73.1%; the model measures ~72.5%.
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about 73%"`).toBeGreaterThan(69);
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about 73%"`).toBeLessThan(77);
  }, 30000);

  it('and without selection it is a coin flip, which the neighbouring card claims', () => {
    // "across many lineages about half fix at A and half lose it"
    expect(SRC).toContain('about half fix at A and half lose it');
    const lineage = (n, gens) => {
      let p = 0.5;
      for (let g = 0; g < gens; g++) {
        const a2n = Math.max(2, Math.round(2 * n));
        let c = 0;
        for (let i = 0; i < a2n; i++) if (Math.random() < p) c++;
        p = c / a2n;
        if (p === 0 || p === 1) return p;
      }
      return p;
    };
    const T = 8000;
    let fixed = 0;
    for (let i = 0; i < T; i++) if (lineage(10, 400) === 1) fixed++;
    const pct = 100 * fixed / T;
    expect(Math.abs(pct - 50), `measured ${pct.toFixed(1)}% fixation with s = 0`).toBeLessThan(3);
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Antibiotic lab: "at the default 2% start it works about four times in five"
//    and "with 2% resistant to each, double resistance is about 0.04%"
// ─────────────────────────────────────────────────────────────────────────────
describe('antibiotic lab: the combination-therapy numbers hold', () => {
  it('the source still uses the survival and seeding rules this replica mirrors', () => {
    expect(SRC).toContain("survival *= Math.max(0.02, 1 - dose * (1 - b.r));");
    expect(SRC).toContain("survival *= Math.max(0.02, 1 - dose * (1 - (b.rB == null ? 0.05 : b.rB)));");
    expect(SRC).toContain('var POP_CAP = 150;');
    // Defaults the claims are stated at.
    expect(SRC).toContain('useState(0.85), doseStrength');
    expect(SRC).toContain('useState(0.02), startRes');
    expect(SRC).toContain('four times in five');
  });

  it('double resistance in a fresh dish is ~0.04%, so usually none of 150', () => {
    // r and rB are drawn INDEPENDENTLY, which is what makes the product argument
    // the correct answer rather than a hand-wave.
    expect(SRC).toContain('// Resistance to drug B is drawn independently: double resistance is the product.');
    const startRes = 0.02;
    const T = 20000;
    let doubles = 0, dishesWithAny = 0;
    for (let d = 0; d < T; d++) {
      let n = 0;
      for (let i = 0; i < 150; i++) {
        const r = Math.random() < startRes ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1);
        const rB = Math.random() < startRes ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1);
        if (r >= 0.5 && rB >= 0.5) n++;
      }
      doubles += n;
      if (n > 0) dishesWithAny++;
    }
    const perDish = doubles / T;
    // 150 * 0.02 * 0.02 = 0.06 expected.
    expect(perDish, `mean double-resistant cells per dish = ${perDish.toFixed(3)}`).toBeGreaterThan(0.03);
    expect(perDish, `mean double-resistant cells per dish = ${perDish.toFixed(3)}`).toBeLessThan(0.10);
    // "none in a dish of 150" should be the usual case, not a coin flip.
    const noneRate = 100 * (1 - dishesWithAny / T);
    expect(noneRate, `dishes with none: ${noneRate.toFixed(1)}%`).toBeGreaterThan(88);
  }, 40000);

  it('"gone in five" succeeds about four times in five at the defaults', () => {
    const PLASMID_LOSS = 0.05;
    const step = (pop, dose, mut) => {
      const survivors = [];
      for (const b of pop) {
        let survival = 1;
        survival *= Math.max(0.02, 1 - dose * (1 - b.r));
        survival *= Math.max(0.02, 1 - dose * (1 - (b.rB == null ? 0.05 : b.rB)));
        if (Math.random() < survival) survivors.push(b);
      }
      const growthCap = Math.min(150, survivors.length + 8);
      const next = survivors.slice();
      let attempts = 0;
      while (next.length < growthCap && survivors.length > 0 && attempts < 500) {
        attempts++;
        const parent = survivors[Math.floor(Math.random() * survivors.length)];
        let newR = clamp(parent.r + randNormal(0, mut), 0, 1);
        if (parent.r >= 0.5 && Math.random() < PLASMID_LOSS) newR = clamp(randNormal(0.05, 0.03), 0, 1);
        const newRB = clamp((parent.rB == null ? 0.05 : parent.rB) + randNormal(0, mut), 0, 1);
        next.push({ r: newR, rB: newRB });
      }
      return next;
    };
    const trial = (startRes, dose, mut) => {
      let pop = [];
      for (let i = 0; i < 150; i++) {
        pop.push({
          r: Math.random() < startRes ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1),
          rB: Math.random() < startRes ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1)
        });
      }
      for (let t = 1; t <= 5; t++) { pop = step(pop, dose, mut); if (pop.length === 0) return true; }
      return false;
    };
    const T = 1500;
    let wins = 0;
    for (let i = 0; i < T; i++) if (trial(0.02, 0.85, 0.04)) wins++;
    const pct = 100 * wins / T;
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about four times in five"`).toBeGreaterThan(74);
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about four times in five"`).toBeLessThan(92);
  }, 60000);

  it('and the dose dial really does change the odds, as the text promises', () => {
    expect(SRC).toContain('the dose dial changes the odds');
    // A weak dose must be clearly worse than a strong one, or the sentence is empty.
    const quick = (dose) => {
      let wins = 0;
      for (let i = 0; i < 400; i++) {
        let pop = [];
        for (let k = 0; k < 150; k++) {
          pop.push({
            r: Math.random() < 0.02 ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1),
            rB: Math.random() < 0.02 ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1)
          });
        }
        let cleared = false;
        for (let t = 1; t <= 5 && !cleared; t++) {
          const sv = [];
          for (const b of pop) {
            let s2 = Math.max(0.02, 1 - dose * (1 - b.r)) * Math.max(0.02, 1 - dose * (1 - (b.rB == null ? 0.05 : b.rB)));
            if (Math.random() < s2) sv.push(b);
          }
          if (sv.length === 0) { cleared = true; break; }
          const cap = Math.min(150, sv.length + 8);
          const nx = sv.slice();
          let a = 0;
          while (nx.length < cap && sv.length > 0 && a < 500) {
            a++;
            const p = sv[Math.floor(Math.random() * sv.length)];
            nx.push({ r: clamp(p.r + randNormal(0, 0.04), 0, 1), rB: clamp((p.rB == null ? 0.05 : p.rB) + randNormal(0, 0.04), 0, 1) });
          }
          pop = nx;
        }
        if (cleared) wins++;
      }
      return 100 * wins / 400;
    };
    const weak = quick(0.5), strong = quick(0.95);
    expect(strong - weak, `dose 0.5 -> ${weak.toFixed(0)}%, dose 0.95 -> ${strong.toFixed(0)}%`).toBeGreaterThan(40);
  }, 60000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Climate lab: "At σ 0.02 about 0.03 per generation is the edge"
//    and Hard mode's "about one trial in four" at rate 0.040 with σ 0.02
// ─────────────────────────────────────────────────────────────────────────────
describe('climate lab: the warming-rate numbers hold', () => {
  it('the source still uses the survival curve and constants this replica mirrors', () => {
    expect(SRC).toContain('var survivalP = Math.exp(-Math.pow(d / 0.10, 2));');
    expect(SRC).toContain('var POP_CAP = 60;');
    expect(SRC).toContain('var EXTINCTION_THRESHOLD = 5;');
    expect(SRC).toContain('var TRIAL_START = 0.5, TRIAL_TARGET = 0.9;');
    expect(SRC).toContain('tolerance: clamp(randNormal(0.5, 0.08), 0, 1),');
    expect(SRC).toContain('about 0.03 per generation is the edge');
    expect(SRC).toContain('About one trial in four makes it');
  });

  const trial = (rate, mut) => {
    let pop = [];
    for (let i = 0; i < 60; i++) pop.push({ t: clamp(randNormal(0.5, 0.08), 0, 1) });
    let temp = 0.5;
    for (let g = 0; g < 5000; g++) {
      const sv = [];
      for (const c of pop) {
        const d = Math.abs(c.t - temp);
        if (Math.random() < Math.exp(-Math.pow(d / 0.10, 2))) sv.push(c);
      }
      if (sv.length < 5) return false;
      const nx = sv.slice();
      while (nx.length < 60) {
        const p = sv[Math.floor(Math.random() * sv.length)];
        nx.push({ t: clamp(p.t + randNormal(0, mut), 0, 1) });
      }
      pop = nx;
      temp = Math.min(0.9, temp + rate);
      if (temp >= 0.9 - 1e-9) return true;
    }
    return true;
  };
  const odds = (rate, mut, N) => {
    let s = 0;
    for (let i = 0; i < N; i++) if (trial(rate, mut)) s++;
    return 100 * s / N;
  };

  it('rate 0.03 at sigma 0.02 really is the edge (near a coin flip)', () => {
    const pct = odds(0.03, 0.02, 900);
    expect(pct, `measured ${pct.toFixed(1)}% survival; "the edge" should be near 50%`).toBeGreaterThan(35);
    expect(pct, `measured ${pct.toFixed(1)}% survival; "the edge" should be near 50%`).toBeLessThan(65);
  }, 60000);

  it('a gentle rate is survived and a fast one is not, so "the edge" means something', () => {
    const gentle = odds(0.01, 0.02, 400);
    const fast = odds(0.06, 0.02, 400);
    expect(gentle, `rate 0.01 survived ${gentle.toFixed(0)}%`).toBeGreaterThan(95);
    expect(fast, `rate 0.06 survived ${fast.toFixed(0)}%`).toBeLessThan(20);
  }, 60000);

  it('Hard mode: rate 0.040 at sigma 0.02 succeeds about one trial in four', () => {
    const pct = odds(0.04, 0.02, 900);
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about one trial in four"`).toBeGreaterThan(14);
    expect(pct, `measured ${pct.toFixed(1)}%, text says "about one trial in four"`).toBeLessThan(36);
  }, 60000);

  it('"raise sigma and the edge moves" — more offspring variation rescues the same rate', () => {
    const low = odds(0.03, 0.02, 400);
    const high = odds(0.03, 0.04, 400);
    expect(high - low, `sigma 0.02 -> ${low.toFixed(0)}%, sigma 0.04 -> ${high.toFixed(0)}%`).toBeGreaterThan(25);
  }, 60000);
});
