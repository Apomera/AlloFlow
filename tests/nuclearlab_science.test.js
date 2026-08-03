import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Nuclear is a topic where students arrive with strong priors from both
// directions, so this suite checks two things that are usually left untested:
// that every figure matches its published source, and that the genuinely
// CONTESTED claims are still presented as contested. A tool that oversells
// nuclear and one that overstates its harm fail in the same way.

const SRC = fs.readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  expect(a, 'data table not found: ' + startMark).toBeGreaterThan(-1);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}

const ISOTOPES = table('var ISOTOPES = [');
const SHIELDS = table('var SHIELDS = [');
const DOSES = table('var DOSES = [');
const DEATHS = table('var DEATHS_TWH = [');
const CO2 = table('var CO2_KWH = [');
const BINDING = table('var BINDING = [');
const REACTIONS = table('var REACTIONS = [');
const CHAIN = table('var U238_CHAIN = [');
const ENRICH = table('var ENRICH_LEVELS = [');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
});

describe('Half-lives and decay', () => {
  it('matches the NNDC chart of nuclides', () => {
    const ref = { c14: 5730, cs137: 30.05, co60: 5.27, u238: 4.468e9, u235: 7.04e8, k40: 1.25e9, pu239: 24110, h3: 12.32 };
    for (const [id, hl] of Object.entries(ref)) {
      const x = ISOTOPES.find(i => i.id === id);
      expect(Math.abs(x.hl - hl) / hl, id).toBeLessThan(0.01);
    }
  });

  it('lists isotopes shortest half-life first', () => {
    for (let i = 1; i < ISOTOPES.length; i++) {
      expect(ISOTOPES[i].hl, ISOTOPES[i].sym || ISOTOPES[i].name).toBeGreaterThanOrEqual(ISOTOPES[i - 1].hl);
    }
  });

  it('inverts correctly for radiocarbon dating', () => {
    const age = f => 5730 * Math.log(100 / f) / Math.LN2;
    expect(age(50)).toBeCloseTo(5730, 0);
    expect(age(25)).toBeCloseTo(11460, 0);
    expect(age(1)).toBeGreaterThan(35000);
  });
});

describe('The uranium-238 decay series', () => {
  const massOf = sym => parseInt(sym.split('-')[1].replace(/[^0-9]/g, ''), 10);

  it('conserves mass number at every step', () => {
    for (let i = 0; i < CHAIN.length - 1; i++) {
      const drop = massOf(CHAIN[i].sym) - massOf(CHAIN[i + 1].sym);
      expect(drop, CHAIN[i].sym + ' -> ' + CHAIN[i + 1].sym).toBe(CHAIN[i].kind === 'alpha' ? 4 : 0);
    }
  });

  it('has eight alphas and six betas, ending at stable lead-206', () => {
    expect(CHAIN.filter(s => s.kind === 'alpha')).toHaveLength(8);
    expect(CHAIN.filter(s => s.kind === 'beta')).toHaveLength(6);
    expect(CHAIN.filter(s => s.kind === 'stable')).toHaveLength(1);
    expect(CHAIN[CHAIN.length - 1].sym).toBe('Pb-206');
    expect(massOf('U-238') - massOf('Pb-206')).toBe(8 * 4);
  });

  it('flags radon as the only gas, in the middle of the chain', () => {
    const gases = CHAIN.filter(s => s.gas);
    expect(gases).toHaveLength(1);
    expect(gases[0].sym).toBe('Rn-222');
    const i = CHAIN.findIndex(s => s.sym === 'Rn-222');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(CHAIN.length - 1);
  });

  it('explains that the daughters, not the radon, do most of the lung damage', () => {
    expect(SRC).toMatch(/sticks to lung tissue/i);
    expect(SRC).toMatch(/secular equilibrium/i);
  });
});

describe('Binding energy', () => {
  it('matches AME2020 to 0.01 MeV', () => {
    const ref = { 'H-2': 1.112, 'He-4': 7.074, 'C-12': 7.680, 'Fe-56': 8.790, 'Ni-62': 8.795, 'U-235': 7.591, 'Pb-208': 7.867 };
    for (const [sym, be] of Object.entries(ref)) {
      expect(BINDING.find(b => b.sym === sym).be, sym).toBeCloseTo(be, 3);
    }
  });

  it('peaks at nickel-62, not iron-56, and says why iron is the famous answer', () => {
    const peak = BINDING.reduce((m, x) => (x.be > m.be ? x : m), BINDING[0]);
    expect(peak.sym).toBe('Ni-62');
    expect(peak.be).toBeGreaterThan(BINDING.find(b => b.sym === 'Fe-56').be);
    expect(SRC).toMatch(/most ABUNDANT end point/i);
  });

  it('derives the D-T energy from the curve rather than quoting it', () => {
    const be = s => BINDING.find(b => b.sym === s).be;
    const calc = be('He-4') * 4 - (be('H-2') * 2 + be('H-3') * 3);
    expect(calc).toBeCloseTo(17.6, 1);
    expect(REACTIONS.find(r => r.id === 'dt').mev).toBeCloseTo(17.6, 1);
  });

  it('counts all 44 nucleons when burning carbon', () => {
    // C + O2 -> CO2 involves 44 nucleons, not 1. Using 1 inflated both the
    // per-nucleon energy and the mass fraction by a factor of 44.
    const coal = REACTIONS.find(r => r.id === 'coal');
    expect(coal.outA).toBe(44);
    const massPct = r => (r.mev / (r.outA * 931.494)) * 100;
    expect(massPct(coal)).toBeLessThan(1e-7);
  });

  it('shows fusion beating fission per nucleon by about four to one', () => {
    const per = id => { const r = REACTIONS.find(x => x.id === id); return r.mev / r.outA; };
    expect(per('dt') / per('u235')).toBeGreaterThan(3.5);
    expect(per('dt') / per('u235')).toBeLessThan(4.5);
  });
});

describe('Shielding', () => {
  it('matches NIST XCOM attenuation coefficients at 1 MeV', () => {
    const ref = { lead: 0.771, concrete: 0.149, water: 0.0707, steel: 0.470 };
    for (const [id, mu] of Object.entries(ref)) {
      expect(Math.abs(SHIELDS.find(s => s.id === id).mu - mu) / mu, id).toBeLessThan(0.05);
    }
  });

  it('does not model alpha and beta with the exponential law, which would be wrong', () => {
    expect(SRC).toMatch(/range-limited, not exponential/);
  });

  it('gives lead a half-value layer near 0.9 cm', () => {
    expect(Math.LN2 / SHIELDS.find(s => s.id === 'lead').mu).toBeCloseTo(0.9, 1);
  });
});

describe('Dose', () => {
  it('is ordered smallest to largest and spans seven orders of magnitude', () => {
    for (let i = 1; i < DOSES.length; i++) expect(DOSES[i].mSv, DOSES[i].name).toBeGreaterThanOrEqual(DOSES[i - 1].mSv);
    expect(DOSES[DOSES.length - 1].mSv / DOSES[0].mSv).toBeGreaterThan(1e7);
  });

  it('matches UNSCEAR and ICRP reference figures', () => {
    const find = n => DOSES.find(x => x.name.includes(n));
    expect(find('background').mSv).toBeCloseTo(2.4, 1);
    expect(find('Chest X-ray').mSv).toBeCloseTo(0.1, 2);
    expect(find('abdomen').mSv).toBeCloseTo(10, 0);
    expect(find('radiation worker').mSv).toBeCloseTo(20, 0);
  });

  it('keeps the estimator consistent with the ladder', () => {
    const scans = table('var SCAN_TYPES = [');
    expect(scans.find(s => s.id === 'ctAbdo').v).toBe(DOSES.find(d => d.name.includes('abdomen')).mSv);
    expect(scans.find(s => s.id === 'chest').v).toBe(DOSES.find(d => d.name.includes('Chest X-ray')).mSv);
  });

  it('has cosmic dose double every 1500 m', () => {
    const cosmic = alt => 0.28 * Math.pow(2, alt / 1500);
    expect(cosmic(0)).toBeCloseTo(0.28, 2);
    expect(cosmic(1500)).toBeCloseTo(0.56, 2);
  });
});

describe('Comparative risk', () => {
  it('matches the Our World in Data compilation', () => {
    const v = n => DEATHS.find(x => x.name === n).v;
    expect(v('Coal')).toBeCloseTo(24.6, 1);
    expect(v('Nuclear')).toBeCloseTo(0.03, 2);
    expect(v('Coal') / v('Nuclear')).toBeGreaterThan(700);
  });

  it('matches IPCC AR5 lifecycle carbon medians', () => {
    const v = n => CO2.find(x => x.name === n).v;
    expect(v('Coal')).toBe(820);
    expect(v('Nuclear')).toBe(12);
    expect(v('Wind')).toBe(11);
  });

  it("states that nuclear's figure includes both major accidents", () => {
    expect(SRC).toMatch(/includes Chernobyl and Fukushima/i);
  });
});

describe('Honesty about contested and unfinished claims', () => {
  it('presents low-dose risk as disputed rather than settled', () => {
    expect(SRC).toMatch(/linear no-threshold/i);
    expect(SRC).toMatch(/disputed among radiation biologists/i);
  });

  it("gives Chernobyl's long-term projection as a contested range", () => {
    expect(SRC).toMatch(/several thousand to tens of thousands/i);
    expect(SRC).toMatch(/genuinely disputed/i);
  });

  it('reports Fukushima evacuation deaths alongside the radiation toll', () => {
    expect(SRC).toMatch(/No deaths from acute radiation/i);
    expect(SRC).toMatch(/2,200 deaths/);
  });

  it('does not oversell SMRs', () => {
    expect(SRC).toMatch(/almost none are operating commercially/i);
    expect(SRC).toMatch(/cancelled in 2023/);
    expect(SRC).toMatch(/\$58 to \$89/);
    expect(SRC).toMatch(/HTR-PM/);
  });

  it('gives the NIF result with the wall-plug energy that makes it not break-even', () => {
    expect(SRC).toMatch(/3\.15 MJ out for 2\.05 MJ/);
    expect(SRC).toMatch(/300 MJ/);
    expect(SRC).toMatch(/decades away/i);
  });

  it("names nuclear's real objections even though the charts favour it", () => {
    expect(SRC).toMatch(/do not settle the argument/i);
    expect(SRC).toMatch(/capital cost/i);
    expect(SRC).toMatch(/proliferation/i);
  });

  it('answers the bomb question with physics and publishes no design figures', () => {
    expect(SRC).toMatch(/cannot sustain a fast chain reaction at ANY mass or shape/i);
    expect(SRC).toMatch(/steam explosion/i);
    expect(SRC).not.toMatch(/bare sphere|critical mass of \d/i);
  });

  it('cites its sources', () => {
    for (const s of ['UNSCEAR', 'ICRP', 'IPCC', 'NIST', 'NNDC', 'Our World in Data', 'AME2020']) {
      expect(SRC, 'missing citation: ' + s).toContain(s);
    }
  });
});

describe('Enrichment ladder', () => {
  it('is ordered and includes the safeguards thresholds', () => {
    for (let i = 1; i < ENRICH.length; i++) expect(ENRICH[i].pct).toBeGreaterThan(ENRICH[i - 1].pct);
    expect(ENRICH.some(x => x.pct === 0.72)).toBe(true);
    expect(ENRICH.some(x => x.pct === 20)).toBe(true);
    expect(ENRICH.some(x => Math.abs(x.pct - 19.75) < 0.01)).toBe(true);
  });
});

describe('Nuclear lab renders', () => {
  it('renders without throwing and names its modules', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('Nuclear &amp; Radiation Lab');
    expect(html).toContain('Half-life');
    expect(html).toContain('Operate a reactor');
    expect(html).toContain('Binding energy per nucleon');
  });

  it('renders no React key warnings for its static card children', () => {
    const warnings = [];
    const original = console.error;
    console.error = (...args) => warnings.push(args.join(' '));
    try {
      renderTool('nuclearLab', {});
    } finally {
      console.error = original;
    }
    expect(warnings.filter(w => /unique "key" prop/.test(w))).toEqual([]);
  });
});
