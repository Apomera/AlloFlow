// chemBalance: the live Arrhenius explorer, and battle answers that teach.
//
// WHY THIS FILE EXISTS
// Both additions sit in the render gate's blind spot. dev-tools/check_stem_render.cjs
// renders chemBalance in its DEFAULT state (its hub), so the Kinetics panel is never
// built there, and the battle feedback string is only produced after a click. A
// ReferenceError in either is invisible to that gate and to the render goldens.
//
// The maths assertions use PUBLISHED reference values (see each case), never the
// model's own output, so a sign flip or a kJ/J mix-up fails here instead of teaching
// a student the wrong chemistry.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function renderKinetics(data = {}) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool: 'kinetics', _everPicked: true, ...data },
  }));
}

describe('Arrhenius model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('exposes the model and the gas constant in J/(mol*K)', () => {
    expect(typeof pure.arrheniusK).toBe('function');
    expect(typeof pure.arrheniusFraction).toBe('function');
    expect(typeof pure.arrheniusRatio).toBe('function');
    // CODATA R = 8.314462618 J/(mol*K). Ea is quoted in kJ/mol, so the model
    // must convert; a bare 8.314 with kJ would be off by 1000x.
    expect(pure.ARRH_R).toBeCloseTo(8.314462618, 6);
  });

  it('k equals the pre-exponential factor when Ea is zero', () => {
    // exp(0) = 1, so k = A exactly. Catches a sign flip in the exponent.
    expect(pure.arrheniusK(0, 298.15)).toBeCloseTo(1e13, 0);
  });

  it('k falls as Ea rises and climbs as T rises', () => {
    const lowEa = pure.arrheniusK(30, 298.15);
    const highEa = pure.arrheniusK(90, 298.15);
    expect(highEa).toBeLessThan(lowEa);

    const cold = pure.arrheniusK(50, 273.15);
    const hot = pure.arrheniusK(50, 373.15);
    expect(hot).toBeGreaterThan(cold);
  });

  it('reproduces the textbook "roughly doubles per 10 C" case at Ea = 50 kJ/mol', () => {
    // Standard general-chemistry result: near Ea = 50 kJ/mol around room
    // temperature, a 10 C rise multiplies the rate by ~1.9-2.0.
    const r = pure.arrheniusRatio(50, 298.15, 308.15);
    expect(r).toBeGreaterThan(1.8);
    expect(r).toBeLessThan(2.1);
  });

  it('shows the rule of thumb FAILING away from Ea = 50 - the teaching point', () => {
    // Low barrier: much less than double.
    expect(pure.arrheniusRatio(20, 298.15, 308.15)).toBeLessThan(1.5);
    // High barrier: much more than double.
    expect(pure.arrheniusRatio(100, 298.15, 308.15)).toBeGreaterThan(3);
  });

  it('ratio is 1 for equal temperatures and inverts when they swap', () => {
    expect(pure.arrheniusRatio(50, 300, 300)).toBeCloseTo(1, 12);
    const up = pure.arrheniusRatio(50, 298.15, 308.15);
    const down = pure.arrheniusRatio(50, 308.15, 298.15);
    expect(up * down).toBeCloseTo(1, 10);
  });

  it('the Boltzmann fraction is a probability, and tiny for a real barrier', () => {
    const f = pure.arrheniusFraction(50, 298.15);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
    // exp(-50000/(8.3145*298.15)) ~ 1.7e-9
    expect(f).toBeLessThan(1e-8);
    expect(f).toBeGreaterThan(1e-10);
  });

  it('rejects impossible temperatures instead of returning a number', () => {
    expect(Number.isNaN(pure.arrheniusK(50, 0))).toBe(true);
    expect(Number.isNaN(pure.arrheniusK(50, -10))).toBe(true);
    expect(Number.isNaN(pure.arrheniusFraction(50, 0))).toBe(true);
    expect(Number.isNaN(pure.arrheniusRatio(50, 0, 300))).toBe(true);
  });
});

describe('Kinetics section — the live explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('builds both sliders with labels and a reset, not just static cards', () => {
    const el = renderKinetics();
    const ea = el.querySelector('#kin-ea');
    const temp = el.querySelector('#kin-temp');
    expect(ea).toBeTruthy();
    expect(temp).toBeTruthy();
    expect(ea.getAttribute('type')).toBe('range');
    expect(temp.getAttribute('type')).toBe('range');
    // Every slider needs a programmatic name and a spoken value.
    expect(ea.getAttribute('aria-label')).toBeTruthy();
    expect(ea.getAttribute('aria-valuetext')).toBeTruthy();
    expect(temp.getAttribute('aria-valuetext')).toBeTruthy();
    // The original static equation card must survive alongside the explorer.
    expect(el.textContent).toContain('Arrhenius');
  });

  it('keeps the static reference content that was already there', () => {
    const el = renderKinetics();
    expect(el.textContent).toContain('Rate Laws');
    expect(el.textContent).toContain('Factors Affecting Rate');
  });

  it('reports a near-double speed-up at the default Ea = 50 kJ/mol', () => {
    const el = renderKinetics();
    const txt = el.textContent;
    // Default state is Ea 50, 25 C -> x1.92
    expect(txt).toMatch(/×1\.9\d/);
    expect(txt).toContain('rule of thumb holds');
  });

  it('says the rule FAILS at a low barrier', () => {
    const el = renderKinetics({ kinetics: { eaKJ: 20, tempC: 25, catalyst: false } });
    expect(el.textContent).toContain('only a rough fit');
  });

  it('says high-Ea reactions are MORE temperature-sensitive', () => {
    const el = renderKinetics({ kinetics: { eaKJ: 120, tempC: 25, catalyst: false } });
    expect(el.textContent).toContain('More than double');
  });

  it('the catalyst lowers Ea and reports a speed-up at unchanged temperature', () => {
    const off = renderKinetics({ kinetics: { eaKJ: 80, tempC: 25, catalyst: false } });
    expect(off.textContent).not.toContain('Catalyst speed-up');

    const on = renderKinetics({ kinetics: { eaKJ: 80, tempC: 25, catalyst: true } });
    expect(on.textContent).toContain('Catalyst speed-up');
    // The note must say temperature is unchanged - the misconception guard.
    expect(on.textContent).toContain('Temperature is unchanged');

    // A label alone proves nothing: the NUMBERS must move. With the catalyst on,
    // the barrier really drops, so both k and the Boltzmann fraction must rise.
    // (Without this the "catalyst does nothing" mutation renders identically.)
    const kOf = (el) => el.querySelector('#kin-ea').getAttribute('aria-valuetext');
    expect(kOf(on)).toBe(kOf(off)); // the slider itself is unchanged...
    expect(on.textContent).not.toBe(off.textContent); // ...but the readouts are not

    const srOn = on.querySelector('[role="status"]').textContent;
    const srOff = off.querySelector('[role="status"]').textContent;
    // The announced Ea must be the LOWERED one, not the slider value.
    expect(srOn).toContain('55 kilojoules');
    expect(srOff).toContain('80 kilojoules');

    // And the speed-up must be a real factor greater than 1, shown as a grouped
    // integer a student can read ("24,000") rather than "2.40e+4".
    const m = on.textContent.match(/Catalyst speed-up[^×]*×([\d,.]+)/);
    expect(m).toBeTruthy();
    expect(Number(m[1].replace(/,/g, ''))).toBeGreaterThan(1);
    expect(m[1]).not.toMatch(/e\+/i);
  });

  it('states the Boltzmann fraction as odds, not an unreadable percentage', () => {
    // "1.74e-7 %" is true and useless to a student. The panel must express the
    // same number as "about 1 in N collisions".
    const el = renderKinetics();
    expect(el.textContent).toMatch(/about 1 in [\d,]+ collisions/);
    expect(el.textContent).not.toMatch(/e-\d+\s*%/);
  });

  it('announces the state to screen readers in one utterance', () => {
    const el = renderKinetics();
    const status = el.querySelector('[role="status"][aria-live="polite"]');
    expect(status).toBeTruthy();
    const t = status.textContent;
    expect(t).toContain('Activation energy');
    expect(t).toContain('degrees Celsius');
    expect(t).toContain('Rate constant');
  });

  it('survives an extreme slider combination without NaN leaking to the student', () => {
    const el = renderKinetics({ kinetics: { eaKJ: 150, tempC: -20, catalyst: true } });
    expect(el.textContent).not.toContain('NaN');
    expect(el.textContent).not.toContain('undefined');
  });
});

describe('Element Battle — a wrong answer explains itself', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('every battle question carries an explanation', () => {
    const bank = pure.BATTLE_QS;
    expect(Array.isArray(bank)).toBe(true);
    expect(bank.length).toBeGreaterThan(0);
    const missing = bank.filter((q) => !q.explain || !String(q.explain).trim());
    expect(missing.map((q) => q.q)).toEqual([]);
  });

  it('explanations give a reason, not a restatement of the option text', () => {
    for (const q of pure.BATTLE_QS) {
      const answer = String(q.a[q.correct]).trim().toLowerCase();
      const why = String(q.explain).trim().toLowerCase();
      // A bare echo of the correct option teaches nothing.
      expect(why).not.toBe(answer);
      expect(why.length).toBeGreaterThan(answer.length + 10);
    }
  });

  it('the battle handler appends the explanation to its feedback string', () => {
    // The handler runs on click, so no render reaches it. Pin the INVARIANT in
    // the source: the feedback variable must be extended with bq.explain after
    // the answer text is built. Matching on the assignment (not the exact
    // punctuation) survives a reworded separator but fails if the wiring is
    // deleted - which is the regression worth catching.
    const src = readFileSync(CHEMBALANCE, 'utf8');
    const wiring = /if \(bq\.explain\) fb \+=[^\n]*bq\.explain/;
    expect(src).toMatch(wiring);

    // And it must come after the answer is named, never instead of it.
    const idxAnswer = src.indexOf("' + bq.a[bq.correct]");
    const idxExplain = src.search(wiring);
    expect(idxAnswer).toBeGreaterThan(-1);
    expect(idxExplain).toBeGreaterThan(idxAnswer);
  });

  it('correct answers stay marked correct (the bank was not disturbed)', () => {
    for (const q of pure.BATTLE_QS) {
      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.a.length);
      expect(typeof q.dmg).toBe('number');
    }
  });
});
