// Nuclear & Radiation Lab — the low-dose risk section.
//
// This is the one section in the tool whose subject is an open question, so it
// is the one most easily written badly in either direction. Two failure modes,
// and this suite exists to catch both:
//
//   Overselling the model. Multiplying a tiny individual dose by a huge
//   population produces a confident-looking body count, and ICRP — the body
//   that publishes the coefficient being multiplied — says in terms not to do
//   it. A section that prints that number without saying so is teaching a
//   misuse that shows up in real published claims from both directions.
//
//   Manufacturing balance. Presenting four models as four equal options would
//   be its own dishonesty: one of them is what every regulator on earth uses,
//   one has no coefficient at all, and the evidence is not symmetric between
//   them. The tests below check that the asymmetry survives.
//
// The arithmetic is checked against values computed by hand rather than
// against the implementation, so a change of formula fails here rather than
// quietly redefining what the section claims.

import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

function table(startMark) {
  const a = SRC.indexOf(startMark);
  expect(a, 'data table not found: ' + startMark).toBeGreaterThan(-1);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}

const MODELS = table('var RISK_MODELS = [');
const CASES = table('var COLLECTIVE_CASES = [');
const DOSES = table('var DOSES = [');

const byId = (list, id) => list.find((x) => x.id === id);

/** The section's two functions, lifted from source so the test runs the real code. */
function lift(name) {
  const a = SRC.indexOf('function ' + name + '(');
  expect(a, 'function not found: ' + name).toBeGreaterThan(-1);
  const b = SRC.indexOf('\n  }', a);
  const consts = 'var NK_BASE_CANCER = 0.25, NK_Z_ALPHA = 1.959964, NK_Z_BETA = 0.8416212;\n';
  return new Function(consts + SRC.slice(a, b + 4) + '\nreturn ' + name + ';')();
}
const nkProjected = lift('nkProjected');
const nkCohortNeeded = lift('nkCohortNeeded');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
});

describe('the risk coefficients', () => {
  it('uses the ICRP 103 nominal coefficient for the regulatory model', () => {
    // ICRP Publication 103 (2007), Table 1: detriment-adjusted nominal risk
    // coefficient for cancer, whole population, 5.5 x 10^-2 per sievert.
    expect(byId(MODELS, 'icrp').coeff).toBeCloseTo(0.055, 4);
  });

  it('makes the no-discount reading exactly twice ICRP, because that is what it is', () => {
    // ICRP halves the atomic-bomb survivor slope with a dose and dose-rate
    // effectiveness factor of 2. Undoing that is a factor of two, not a new
    // measurement, and if the two ever drift apart the section is claiming
    // something its own explanation does not support.
    expect(byId(MODELS, 'direct').coeff).toBeCloseTo(2 * byId(MODELS, 'icrp').coeff, 10);
    expect(SRC).toMatch(/dose and dose-rate effectiveness factor of 2/i);
  });

  it('puts the threshold where the tool says measurement runs out, not somewhere new', () => {
    const threshold = byId(MODELS, 'threshold');
    expect(threshold.threshold).toBe(100);
    expect(threshold.threshold).toBe(DOSES.find((d) => d.name.includes('Lowest dose')).mSv);
  });

  it('gives hormesis NO coefficient rather than a small or negative one', () => {
    // The honest output. Inventing a number here — in either direction — would
    // be the section committing the exact error it is teaching against.
    expect(byId(MODELS, 'hormesis').coeff).toBeNull();
    expect(nkProjected(byId(MODELS, 'hormesis'), 1e6, 1)).toBeNull();
  });

  it('never lets a model imply lives saved', () => {
    for (const m of MODELS) {
      if (m.coeff == null) continue;
      expect(m.coeff, m.id + ' has a negative coefficient').toBeGreaterThan(0);
      expect(nkProjected(m, 1e6, 50), m.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the collective-dose arithmetic', () => {
  it('is people x sieverts each x coefficient, and nothing else', () => {
    const icrp = byId(MODELS, 'icrp');
    expect(nkProjected(icrp, 1e6, 1)).toBeCloseTo(55, 6);          // 1000 person-Sv
    expect(nkProjected(icrp, 100000, 60)).toBeCloseTo(330, 6);     // 6000 person-Sv
    expect(nkProjected(icrp, 1, 10)).toBeCloseTo(0.00055, 10);
  });

  it('returns zero below a threshold rather than scaling down to it', () => {
    const th = byId(MODELS, 'threshold');
    expect(nkProjected(th, 1e6, 99.9)).toBe(0);
    expect(nkProjected(th, 1e6, 100)).toBeCloseTo(5500, 6);
  });

  it('keeps the banana case consistent with the banana on the dose ladder', () => {
    // Two tables, one banana. The reductio only lands if its dose is the
    // ladder's figure times 365 rather than a number chosen to be shocking.
    const banana = byId(CASES, 'banana');
    const ladder = DOSES.find((d) => d.name.includes('banana')).mSv;
    expect(banana.mSv).toBeCloseTo(365 * ladder, 8);
    expect(banana.people).toBe(8e9);
  });

  it('keeps the CT case consistent with the CT on the dose ladder', () => {
    expect(byId(CASES, 'ct').mSv).toBe(DOSES.find((d) => d.name.includes('abdomen')).mSv);
  });

  it('produces the absurd answer it is there to produce', () => {
    // ~16,000 deaths a year from bananas, by arithmetic identical to the case
    // above it. If this ever stops being a large number the section loses the
    // point it is making.
    const n = nkProjected(byId(MODELS, 'icrp'), byId(CASES, 'banana').people, byId(CASES, 'banana').mSv);
    expect(n).toBeGreaterThan(10000);
    expect(SRC).toMatch(/your body holds potassium at a set point/i);
    expect(SRC).toMatch(/TWO independent reasons/);
  });

  it('spans from one identifiable person to the whole planet', () => {
    expect(Math.min(...CASES.map((c) => c.people))).toBe(1);
    expect(Math.max(...CASES.map((c) => c.people))).toBe(8e9);
    for (const c of CASES) {
      expect(c.mSv, c.id + ' has no dose').toBeGreaterThan(0);
      expect(c.people, c.id + ' has no people').toBeGreaterThanOrEqual(1);
    }
  });
});

describe('why the question does not resolve', () => {
  // Two-proportion sample size, 5% two-sided, 80% power, 25% baseline lifetime
  // cancer mortality. Hand-computed, not read back off the implementation.
  const hand = (mSv) => {
    const excess = (mSv / 1000) * 0.055;
    const p1 = 0.25;
    const p2 = p1 + excess;
    return (Math.pow(1.959964 + 0.8416212, 2) * (p1 * (1 - p1) + p2 * (1 - p2))) / Math.pow(excess, 2);
  };

  it('matches the hand calculation across three decades of dose', () => {
    for (const mSv of [100, 10, 1, 0.1]) {
      expect(nkCohortNeeded(mSv, 0.055) / hand(mSv), mSv + ' mSv').toBeCloseTo(1, 6);
    }
  });

  it('grows as the inverse square of the dose', () => {
    // The single fact the whole block exists to deliver. Not EXACTLY 100: the
    // variance term carries p2 = baseline + excess, so it drifts a little as
    // the excess grows, and the ratio comes out at 99.4 over the top decade
    // rather than 100. Asserting exact 1/d^2 would be asserting a formula the
    // section does not use, so the bound is 2%.
    for (const [lo, hi] of [[1, 10], [10, 100]]) {
      const ratio = nkCohortNeeded(lo, 0.055) / nkCohortNeeded(hi, 0.055);
      expect(ratio, `${lo} vs ${hi} mSv`).toBeGreaterThan(98);
      expect(ratio, `${lo} vs ${hi} mSv`).toBeLessThan(101);
    }
  });

  it('puts a 10 mSv study out of reach and a 1 mSv study far past it', () => {
    expect(nkCohortNeeded(10, 0.055)).toBeGreaterThan(5e6);
    expect(nkCohortNeeded(1, 0.055)).toBeGreaterThan(5e8);
  });

  it('reproduces the size of the study we actually have, which is the check on it', () => {
    // At 100 mSv the formula asks for about a hundred thousand people per
    // group. The atomic-bomb survivor cohort is roughly that, and 100 mSv is
    // exactly where this tool says the excess becomes measurable. A formula
    // that says the low-dose question is unanswerable should also predict
    // where the answerable part ended, and this one does.
    const n = nkCohortNeeded(100, 0.055);
    expect(n).toBeGreaterThan(5e4);
    expect(n).toBeLessThan(2e5);
    expect(SRC).toMatch(/That is not a coincidence/);
  });

  it('does not pretend the estimate is conservative in the flattering direction', () => {
    expect(SRC).toMatch(/The real requirement is larger/);
  });
});

describe('honesty in both directions', () => {
  it('states the ICRP caution against body counts from trivial doses', () => {
    expect(SRC).toMatch(/should be avoided/i);
    expect(SRC).toMatch(/the body that publishes the coefficient being used/i);
  });

  it('says which model regulators actually use, rather than presenting a level field', () => {
    expect(byId(MODELS, 'icrp').who).toMatch(/every national regulator/i);
    expect(byId(MODELS, 'threshold').who).toMatch(/No major body uses it/i);
    expect(byId(MODELS, 'hormesis').who).toMatch(/minority position/i);
  });

  it('gives the low-dose-rate evidence rather than leaving linearity as an assumption', () => {
    expect(SRC).toMatch(/INWORKS/);
    expect(SRC).toMatch(/300,000 nuclear workers/);
    expect(byId(MODELS, 'icrp').forIt).toMatch(/consistent with a straight line/i);
  });

  it('gives every model both a case for and a case against', () => {
    for (const m of MODELS) {
      expect(m.forIt, m.id + ' has no case for it').toBeTruthy();
      expect(m.against, m.id + ' has no case against it').toBeTruthy();
      expect(m.forIt.length, m.id + ' case-for is a token gesture').toBeGreaterThan(80);
      expect(m.against.length, m.id + ' case-against is a token gesture').toBeGreaterThan(80);
    }
  });

  it('refuses both of the confident conclusions', () => {
    expect(SRC).toMatch(/disputed among radiation biologists/i);
    expect(SRC).toMatch(/equally suspicious/i);
    expect(SRC).toMatch(/no threshold has ever been demonstrated/i);
  });

  it('explains the Chernobyl range instead of only flagging it as disputed', () => {
    expect(SRC).toMatch(/Neither side fabricated anything/);
    expect(SRC).toMatch(/They chose a different population/);
  });

  it('cites the sources the section actually leans on', () => {
    expect(SRC).toContain('ICRP Publication 103 (2007)');
    expect(SRC).toContain('INWORKS worker cohort, BMJ 2023');
    expect(SRC).toMatch(/sourceNote\(\['icrp103', 'inworks', 'unscear'\]\)/);
  });
});

describe('the section renders and can be worked', () => {
  it('is anchored, numbered and reachable', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('id="nksec-lowdose"');
    expect(html).toMatch(/12\. How risky is a small dose\?/);
    expect(html).toContain('Jump to How risky is a small dose?');
  });

  it('shows all four models at once, so the divergence is visible without clicking', () => {
    const html = renderTool('nuclearLab', {});
    for (const m of MODELS) expect(html, m.short + ' missing').toContain(m.short);
    expect(html).toMatch(/no defensible number/);
  });

  it('changes the projection when the model changes, with the exposure held fixed', () => {
    const a = renderTool('nuclearLab', { _nuclearLab: { ldCase: 'city', ldModel: 'icrp' } });
    const b = renderTool('nuclearLab', { _nuclearLab: { ldCase: 'city', ldModel: 'threshold' } });
    expect(a).toContain('1,000 person-sieverts');
    expect(b).toContain('1,000 person-sieverts');   // same physics
    expect(a).toMatch(/THE CASE FOR IT/);
    expect(a).toMatch(/THE CASE AGAINST IT/);
    expect(b).toMatch(/Threshold at 100 mSv/);
  });

  it('reaches all three verdicts, and keys them on the INDIVIDUAL dose', () => {
    // A three-tier verdict where no preset reaches the top tier would be a
    // tier the reader never meets. One case per tier, and note that the two
    // trivial-dose cases have the LARGEST populations — the verdict must not
    // be tracking population size, which is the confusion being taught.
    const tier = (id) => {
      const html = renderTool('nuclearLab', { _nuclearLab: { ldCase: id } });
      if (/Measured territory/.test(html)) return 'measured';
      if (/A planning quantity, not a body count/.test(html)) return 'planning';
      if (/Outside what the sum can support/.test(html)) return 'improper';
      return 'none';
    };
    expect(tier('liquidators')).toBe('measured');   // 120 mSv, 530,000 people
    expect(tier('crew')).toBe('planning');          // 60 mSv
    expect(tier('ct')).toBe('planning');            // 10 mSv, ONE person
    expect(tier('europe')).toBe('improper');        // 0.05 mSv, 500 million
    expect(tier('banana')).toBe('improper');        // 0.0365 mSv, 8 billion
  });

  it('reproduces the published Chernobyl projection for the group it fits', () => {
    // ~530,000 workers at ~120 mSv gives ~3,500 against the Chernobyl Forum's
    // ~4,000 for the most exposed groups. This is the section's own evidence
    // that the method works where the doses are real, which is what earns it
    // the right to show where it does not.
    const lq = byId(CASES, 'liquidators');
    const n = nkProjected(byId(MODELS, 'icrp'), lq.people, lq.mSv);
    expect(n).toBeGreaterThan(3000);
    expect(n).toBeLessThan(4500);
    expect(SRC).toMatch(/lands where the experts landed/);
  });

  it('reports a single person as a personal risk, not as a fraction of a death', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { ldCase: 'ct' } });
    expect(html).toMatch(/1 in 1,818/);
    expect(html).not.toMatch(/0\.00055 deaths/);
  });

  it('prints a dose you can multiply back to the total it shows', () => {
    // Regression. nkFmt finishes with toLocaleString, which silently caps at
    // three fraction digits: the banana case displayed "0.037 mSv" next to a
    // person-sievert total computed from 0.0365, so a reader who checked the
    // arithmetic on screen got 16,280 against the 16,060 printed beside it.
    // The headline is an equation; both sides of it have to be quotable.
    for (const c of CASES) {
      const html = renderTool('nuclearLab', { _nuclearLab: { ldCase: c.id } });
      const m = /([\d,.]+)(?: (million|billion))? (?:person|people) × ([\d.]+) mSv = ([\d,.]+) person-sieverts/.exec(html);
      expect(m, 'headline equation missing for ' + c.id).toBeTruthy();
      const scale = m[2] === 'billion' ? 1e9 : (m[2] === 'million' ? 1e6 : 1);
      const people = Number(m[1].replace(/,/g, '')) * scale;
      const shownDose = Number(m[3]);
      const shownTotal = Number(m[4].replace(/,/g, ''));
      expect(people, c.id + ' population rounded away from the data').toBe(c.people);
      expect(shownDose, c.id + ' dose is rounded away from the data').toBe(c.mSv);
      // and the two printed numbers really do produce the printed total
      expect((people * shownDose) / 1000, c.id + ' headline does not multiply out')
        .toBeCloseTo(shownTotal, Math.abs(shownTotal) > 100 ? -1 : 2);
    }
  });

  it('does not tell the reader the models agree where the panel shows them differing', () => {
    // The top-tier verdict originally said the models "largely agree" while
    // the table above it showed a factor of two. It now names the convergence
    // precisely, which is the actual insight.
    const html = renderTool('nuclearLab', { _nuclearLab: { ldCase: 'liquidators' } });
    expect(html).not.toMatch(/largely agree/);
    expect(html).toMatch(/agree wherever anyone can check them/);
  });

  it('carries the educational-use notice, like every other actionable model here', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: {} });
    const at = html.indexOf('id="nksec-lowdose"');
    const end = html.indexOf('id="nksec-detect"');
    expect(html.slice(at, end)).toContain('Educational model — not emergency or medical instructions');
  });

  it('has both quests wired to keys the section writes', () => {
    expect(SRC).toMatch(/pushOnce\('riskModelsTried', m\.id\)/);
    expect(SRC).toMatch(/pushOnce\('ldCasesTried', c\.id\)/);
  });
});
