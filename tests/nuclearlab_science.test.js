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

  // ── Neutrons ──────────────────────────────────────────────────────────
  // This branch used to run exp(-0.1·t) for water and concrete and exp(-0.02·t)
  // for everything else. Those coefficients were invented to make hydrogen win,
  // and they got the right teaching answer for the wrong reason: the real
  // fast-neutron removal cross-section of lead (0.118 cm⁻¹) is HIGHER than
  // water's (0.103), and steel's is higher still. A student who looked the
  // numbers up would have caught the tool out.
  //
  // Hydrogen wins on the second step, not the first, and that is now what the
  // section says: removing a neutron from the fast group is not stopping it,
  // and slowing one to thermal takes ~18 collisions with hydrogen against
  // ~1,900 with lead. Both halves are asserted here.
  describe('neutrons, where the folk rule and the numbers disagree', () => {
    const nkXi = (() => {
      const a = SRC.indexOf('function nkXi(');
      expect(a, 'nkXi not found').toBeGreaterThan(-1);
      const b = SRC.indexOf('\n  }', a);
      return new Function(SRC.slice(a, b + 4) + '\nreturn nkXi;')();
    })();
    const SPAN = Math.log(2e6 / 0.025);
    const collisions = (A) => SPAN / nkXi(A);
    const sh = (id) => SHIELDS.find((s) => s.id === id);

    it('derives the energy decrement from mass number, matching published xi', () => {
      // xi = 1 + a·ln a/(1-a). Reference values from any reactor-physics text.
      const ref = { 1: 1.0, 12: 0.158, 14: 0.136, 16: 0.120, 56: 0.0353, 207: 0.00961 };
      for (const [A, x] of Object.entries(ref)) {
        expect(nkXi(Number(A)), 'A=' + A).toBeCloseTo(x, 3);
      }
    });

    it('spans 2 MeV down to thermal, and says so in the source', () => {
      expect(SRC).toContain('Math.log(2e6 / 0.025)');
      expect(SPAN).toBeCloseTo(18.2, 1);
    });

    it('needs ~18 collisions on hydrogen and ~1,900 on lead', () => {
      expect(Math.round(collisions(1))).toBe(18);
      expect(Math.round(collisions(12))).toBeGreaterThan(100);   // graphite, ~115
      expect(Math.round(collisions(56))).toBeGreaterThan(450);   // iron, ~516
      expect(Math.round(collisions(207))).toBeGreaterThan(1800); // lead, ~1890
      expect(collisions(207) / collisions(1)).toBeGreaterThan(100);
    });

    it('uses published removal cross-sections, not invented ones', () => {
      const ref = { water: 0.103, concrete: 0.089, steel: 0.158, lead: 0.118 };
      for (const [id, v] of Object.entries(ref)) {
        expect(sh(id).sigR, id).toBeCloseTo(v, 3);
      }
      expect(sh('air').sigR, 'air should be effectively transparent').toBeLessThan(1e-3);
      // the fabricated coefficients are gone
      expect(SRC).not.toMatch(/Math\.exp\(-0\.1 \* thick\)/);
      expect(SRC).not.toMatch(/Math\.exp\(-0\.02 \* thick\)/);
    });

    it('lets lead and steel beat water per centimetre, because they do', () => {
      // The assertion the old model would have failed. If someone "corrects"
      // these back to make hydrogen win on removal, this is the tripwire.
      expect(sh('lead').sigR).toBeGreaterThan(sh('water').sigR);
      expect(sh('steel').sigR).toBeGreaterThan(sh('water').sigR);
      expect(sh('steel').sigR).toBeGreaterThan(sh('lead').sigR);
    });

    it('assigns each shield the nucleus that actually does the moderating', () => {
      expect(sh('water').modA).toBe(1);
      expect(sh('concrete').modA).toBe(1);
      expect(sh('steel').modA).toBe(56);
      expect(sh('lead').modA).toBe(207);
      for (const s of SHIELDS) expect(s.modName, s.id + ' has no named moderator').toBeTruthy();
    });

    it('no longer calls lead useless, and says what it actually fails at', () => {
      expect(SRC).not.toMatch(/nearly useless/i);
      expect(SRC).toMatch(/cannot slow them the rest of the way/i);
      // the two caveats that keep the removal figure honest
      expect(SRC).toMatch(/below about 1 MeV the inelastic scattering/i);
      expect(SRC).toMatch(/defined assuming hydrogen sits behind the shield/i);
    });

    it('follows the capture through to the gamma it produces', () => {
      expect(SRC).toMatch(/2\.2 MeV gamma/);
      expect(SRC).toMatch(/boron to capture them without a penetrating photon/i);
    });

    it('shows both steps, and the right verdict for each material', () => {
      const lead = renderTool('nuclearLab', { _nuclearLab: { radId: 'neutron', shieldId: 'lead', thick: 10 } });
      expect(lead).toMatch(/Step 1 · fast neutrons removed per cm/);
      expect(lead).toMatch(/Step 2 · collisions to slow one to thermal/);
      expect(lead).toMatch(/1,890 on lead/);
      expect(lead).toMatch(/is not a neutron shield/);

      const water = renderTool('nuclearLab', { _nuclearLab: { radId: 'neutron', shieldId: 'water', thick: 10 } });
      expect(water).toMatch(/18 collisions with hydrogen/);
      expect(water).toMatch(/This is what a neutron shield is for/);

      // 10 cm of lead removes MORE fast neutrons than 10 cm of water, and the
      // page must not hide that to protect the moral of the story.
      const pctOf = (html) => Number(/([\d.]+)% of the neutron gets through/.exec(html)[1]);
      expect(pctOf(lead)).toBeLessThan(pctOf(water));
    });
  });

  it('models alpha range differently in air and solid material', () => {
    const nearAir = renderTool('nuclearLab', {
      _nuclearLab: { radId: 'alpha', shieldId: 'air', thick: 0.1 },
    });
    const longAir = renderTool('nuclearLab', {
      _nuclearLab: { radId: 'alpha', shieldId: 'air', thick: 4 },
    });
    const thinLead = renderTool('nuclearLab', {
      _nuclearLab: { radId: 'alpha', shieldId: 'lead', thick: 0.1 },
    });

    expect(nearAir).toContain('100% of the alpha gets through 0.1 cm of air');
    expect(longAir).toContain('0% of the alpha gets through 4 cm of air');
    expect(thinLead).toContain('0% of the alpha gets through 0.1 cm of lead');
    expect(nearAir).toMatch(/eye|wound|inhaled|swallowed/i);
    expect(nearAir).not.toMatch(/danger is never external|harmless outside/i);
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

  it('keeps Fukushima health, compensation, and disaster-death categories separate', () => {
    expect(SRC).toMatch(/No deaths from acute radiation/i);
    expect(SRC).toMatch(/no adverse health effects among residents.{0,80}directly attributed/i);
    expect(SRC).toMatch(/2,350 disaster-related deaths/i);
    expect(SRC).toMatch(/award does not prove that radiation caused an individual cancer/i);
    expect(SRC).not.toMatch(/2,200 people died because of the Fukushima evacuation/i);
    expect(SRC).not.toMatch(/one from radiation/i);
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

  // The heading numbers are read off NK_SECTIONS, and the index labels each
  // jump button with its position in that list. When sections were inserted
  // during earlier passes nobody renumbered, and the tool shipped reading
  // 1,2,3,9,3,4,5,7,5,6,7,8,9,10 — two 3s, two 5s, two 7s, two 9s. Nothing
  // caught it because every number was individually a plausible string.
  it('numbers its sections 1..N with no duplicates or gaps', () => {
    const nums = [...SRC.matchAll(/heading\([^,]+, '[^']*?(\d+)\. /g)].map((m) => Number(m[1]));
    expect(nums.length).toBeGreaterThan(10);
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it('keeps the topic index in the same order as the sections it links to', () => {
    const registry = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);
    const dom = [...SRC.matchAll(/^        sec\('([a-z0-9]+)'/gm)].map((m) => m[1]).filter((id) => id !== 'next');
    expect(registry.length).toBe(20);
    // Not a set comparison — order IS the contract, because the index prints
    // each topic's position as its section number.
    expect(dom).toEqual(registry);
  });

  it('gives every indexed topic a reachable anchor and a jump button', () => {
    const html = renderTool('nuclearLab', {});
    const registry = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);
    registry.forEach((id) => expect(html, 'no anchor for ' + id).toContain('id="nksec-' + id + '"'));
    expect((html.match(/aria-label="Jump to /g) || []).length).toBe(registry.length);
    expect(html).toContain('aria-label="Nuclear lab topics"');
  });

  it('filters the index by search text without hiding the sections themselves', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { nkQuery: 'radon' } });
    const jumps = (html.match(/aria-label="Jump to /g) || []).length;
    expect(jumps).toBeGreaterThan(0);
    expect(jumps).toBeLessThan(14);
    // Filtering is navigation only: the content stays on the page, so a reader
    // who searched for one thing has not lost access to everything else.
    expect(html).toContain('id="nksec-halflife"');
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

// ── Detection ──────────────────────────────────────────────────────────────
// The tool quotes sieverts in six places and, until this section, never said
// how anybody measures one. Two claims here are easy to get subtly wrong and
// hard to notice: the source activities (which are computed, not quoted) and
// the counting statistics (where a plausible-looking formula can still be the
// wrong one). Both are checked against first principles rather than against
// the tool's own numbers.

const COUNT_SOURCES = table('var COUNT_SOURCES = [');
const GM_WINDOW = Number(/var GM_WINDOW_CM2 = ([\d.]+)/.exec(SRC)[1]);
const GM_BACKGROUND = Number(/var GM_BACKGROUND = ([\d.]+)/.exec(SRC)[1]);
const nkPoisson = new Function(
  'return ' + SRC.slice(SRC.indexOf('function nkPoisson'), SRC.indexOf('function nkClamp'))
)();

const netRate = (src, d) => src.gps * (GM_WINDOW / (4 * Math.PI * d * d)) * src.eff;
const srcById = (id) => COUNT_SOURCES.find((s) => s.id === id);

describe('Source activities', () => {
  // Natural potassium from the decay constant, not from a memorised figure.
  const K_SPECIFIC = (0.000117 * 6.02214e23 / 39.0983) * (Math.LN2 / (1.248e9 * 3.1557e7));

  it('derives potassium activity from the K-40 half-life', () => {
    expect(K_SPECIFIC).toBeGreaterThan(30);
    expect(K_SPECIFIC).toBeLessThan(33);
  });

  it('gets 1 kg of KCl right from its potassium mass fraction', () => {
    const kcl = srcById('kcl');
    const kMass = (39.0983 / 74.551) * 1000;          // g of K in 1 kg of KCl
    expect(Math.abs(kcl.bq - kMass * K_SPECIFIC) / kcl.bq).toBeLessThan(0.01);
    // Only 10.55% of K-40 decays emit the 1461 keV gamma. Using the activity
    // as the photon rate would overstate the count rate by a factor of ten.
    expect(Math.abs(kcl.gps - kcl.bq * 0.1055) / kcl.gps).toBeLessThan(0.02);
  });

  it('scales a banana to the same potassium chemistry', () => {
    const b = srcById('banana');
    expect(Math.abs(b.bq - 0.45 * K_SPECIFIC) / b.bq).toBeLessThan(0.05);
    expect(b.gps).toBeLessThan(b.bq);
  });

  it('separates activity from photon rate for the two check sources', () => {
    const cs = srcById('cs137'), co = srcById('co60');
    // Same becquerels...
    expect(cs.bq).toBe(co.bq);
    // ...and NOT the same photon rate: Cs-137 emits its gamma in 85.1% of
    // decays, Co-60 emits two. This pair is the whole point of the section,
    // so if these ever converge the lesson is gone.
    expect(Math.abs(cs.gps - cs.bq * 0.851) / cs.gps).toBeLessThan(0.01);
    expect(co.gps).toBeCloseTo(co.bq * 2, 0);
    expect(co.gps / cs.gps).toBeGreaterThan(2);
  });

  it('never lets a detector see more photons than the source emits', () => {
    COUNT_SOURCES.forEach((s) => {
      expect(s.gps, s.id).toBeLessThanOrEqual(s.bq * 2.001);
      expect(netRate(s, 3), s.id).toBeLessThan(Math.max(s.gps, 1e-9));
    });
  });
});

describe('Inverse square and counting statistics', () => {
  it('quarters the count rate for every doubling of distance', () => {
    const cs = srcById('cs137');
    [5, 10, 20].forEach((d) => {
      expect(netRate(cs, d) / netRate(cs, d * 2)).toBeCloseTo(4, 6);
    });
  });

  it('puts a school check source in a realistic range at arm length', () => {
    // A 37 kBq Cs-137 disc on a classroom GM tube reads on the order of
    // 100 counts a minute at 10 cm. Orders of magnitude either side would
    // mean the geometry or the efficiency is wrong.
    const cpm = netRate(srcById('cs137'), 10) * 60;
    expect(cpm).toBeGreaterThan(40);
    expect(cpm).toBeLessThan(300);
    expect(GM_BACKGROUND * 60).toBeGreaterThan(15);
    expect(GM_BACKGROUND * 60).toBeLessThan(40);
  });

  it('samples counts from a genuine Poisson distribution on both branches', () => {
    // Below 30 the tool uses Knuth's method, above it a normal approximation.
    // Both have to reproduce the defining property of Poisson: variance = mean.
    [4, 200].forEach((lam) => {
      const n = 20000;
      let sum = 0, sumsq = 0;
      for (let i = 0; i < n; i++) { const k = nkPoisson(lam); sum += k; sumsq += k * k; }
      const mean = sum / n;
      const varr = sumsq / n - mean * mean;
      expect(Math.abs(mean - lam) / lam, 'mean at lambda=' + lam).toBeLessThan(0.05);
      expect(Math.abs(varr - lam) / lam, 'variance at lambda=' + lam).toBeLessThan(0.15);
    });
    expect(nkPoisson(0)).toBe(0);
    expect(nkPoisson(-1)).toBe(0);
  });

  it('makes precision cost the SQUARE of the time, not the time', () => {
    const cs = srcById('cs137');
    const rel = (t) => {
      const g = (netRate(cs, 10) + GM_BACKGROUND) * t, b = GM_BACKGROUND * t;
      return Math.sqrt(g + b) / t / netRate(cs, 10);
    };
    // Four times the counting time buys half the uncertainty. If this ever
    // came out linear, the section's central claim would be false.
    expect(rel(10) / rel(40)).toBeCloseTo(2, 1);
    expect(rel(10)).toBeGreaterThan(0.2);    // a 10 s count is worthless
    expect(rel(600)).toBeLessThan(0.05);     // 10 minutes is defensible
  });

  it('refuses to call a KCl bag detectable at arm length, and allows it up close', () => {
    const kcl = srcById('kcl');
    const detects = (d, t) => {
      const net = netRate(kcl, d) * t, b = GM_BACKGROUND * t;
      return net > 2.33 * Math.sqrt(2 * b);        // Currie critical level
    };
    // The honest, awkward result: ten minutes at 10 cm still is not enough.
    expect(detects(10, 600)).toBe(false);
    // Tube against the bag for the same ten minutes, and it is there.
    expect(detects(3, 600)).toBe(true);
  });

  it('leaves the banana genuinely undetectable, as the dose ladder claims', () => {
    // The dose table calls the banana "a scale marker, not a real exposure".
    // If the detector could see one, those two sections would contradict.
    const b = srcById('banana');
    const net = netRate(b, 3) * 3600, bg = GM_BACKGROUND * 3600;
    expect(net).toBeLessThan(2.33 * Math.sqrt(2 * bg));
  });
});

describe('The detection section', () => {
  it('renders its controls and the three units it exists to separate', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('id="nksec-detect"');
    expect(html).toContain('Becquerel (Bq)');
    expect(html).toContain('Counts per second');
    expect(html).toContain('Millisievert (mSv)');
    expect(html).toContain('Take a count');
  });

  it('reports a stored measurement with its background and its uncertainty', () => {
    const html = renderTool('nuclearLab', {
      _nuclearLab: { cdSrc: 'cs137', cdDist: 10, cdTime: 600, cdRuns: [{ g: 1180, b: 260, t: 600, d: 10, s: 'cs137' }] }
    });
    expect(html).toContain('1,180 counts');       // gross
    expect(html).toContain('260 counts');         // background, counted not assumed
    expect(html).toContain('Net rate');
    expect(html).toContain('Uncertainty');
  });

  it('says a weak reading is not a detection instead of quoting it anyway', () => {
    const html = renderTool('nuclearLab', {
      _nuclearLab: { cdSrc: 'kcl', cdDist: 40, cdTime: 10, cdRuns: [{ g: 5, b: 4, t: 10, d: 40, s: 'kcl' }] }
    });
    expect(html).toContain('cannot claim a detection');
  });

  it('treats a negative net from background alone as noise, not as an error', () => {
    const html = renderTool('nuclearLab', {
      _nuclearLab: { cdSrc: 'none', cdTime: 10, cdRuns: [{ g: 3, b: 6, t: 10, d: 10, s: 'none' }] }
    });
    expect(html).toContain('NEGATIVE net is not an error');
  });

  it('keeps the warning that a microsievert-per-hour readout is a conversion, not a measurement', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('µSv/h');
    expect(html).toContain('662 keV');
  });
});

// ── Gray, sievert, and the body ────────────────────────────────────────────
// Two sections that exist to stop specific, common errors, so the tests are
// aimed at the errors rather than at the code: that a weighting factor table
// silently stops summing to one, and that an effective half-life gets quoted
// as whichever of its two inputs came to hand first.

const RAD_WEIGHTS = table('var RAD_WEIGHTS = [');
const TISSUE_WEIGHTS = table('var TISSUE_WEIGHTS = [');
const BIO_NUCLIDES = table('var BIO_NUCLIDES = [');
const bioById = (id) => BIO_NUCLIDES.find((n) => n.id === id);
const tEff = (n) => (n.tp * n.tb) / (n.tp + n.tb);
const DAY = 1, YEAR = 365.25;

describe('ICRP weighting factors', () => {
  it('sums the tissue weights to exactly 1.00', () => {
    // This is the defining property, not a coincidence: the weights apportion
    // whole-body detriment. A table that sums to 0.99 or 1.03 would make every
    // effective dose in the tool quietly wrong, and would look completely
    // normal on screen.
    const sum = TISSUE_WEIGHTS.reduce((a, x) => a + x.wt, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('matches ICRP 103 Table 3 tissue by tissue', () => {
    const ref = { marrow: 0.12, colon: 0.12, lung: 0.12, stomach: 0.12, breast: 0.12, remainder: 0.12,
      gonads: 0.08, bladder: 0.04, oesophagus: 0.04, liver: 0.04, thyroid: 0.04,
      bone: 0.01, brain: 0.01, salivary: 0.01, skin: 0.01 };
    expect(TISSUE_WEIGHTS).toHaveLength(Object.keys(ref).length);
    for (const [id, wt] of Object.entries(ref)) {
      expect(TISSUE_WEIGHTS.find((x) => x.id === id).wt, id).toBe(wt);
    }
  });

  it('matches ICRP 103 Table 2 radiation weights, with alpha at twenty', () => {
    const w = (id) => RAD_WEIGHTS.find((x) => x.id === id).wr;
    expect(w('gamma')).toBe(1);
    expect(w('beta')).toBe(1);       // NOT 2 — beta and gamma are weighted alike
    expect(w('proton')).toBe(2);
    expect(w('alpha')).toBe(20);
    expect(w('neutron')).toBe(20);   // the ~1 MeV peak of a continuous function
  });

  it('says out loud that the neutron factor is not a single number', () => {
    expect(RAD_WEIGHTS.find((x) => x.id === 'neutron').why).toMatch(/continuous function of energy/i);
  });

  it('keeps effective dose equal to equivalent dose for a whole-body exposure', () => {
    // If w_T sums to 1, irradiating everything must give E = H. This is the
    // arithmetic the section claims on screen.
    const sum = TISSUE_WEIGHTS.reduce((a, x) => a + x.wt, 0);
    const D = 3.7;
    expect(D * 20 * sum).toBeCloseTo(D * 20, 9);
  });
});

describe('Physical, biological and effective half-life', () => {
  it('adds the RATES, not the times', () => {
    // The error this guards against is T_eff = T_p + T_b, or the average of
    // the two. Both are wrong, and both give plausible-looking numbers.
    BIO_NUCLIDES.forEach((n) => {
      const t = tEff(n);
      expect(t, n.id).toBeLessThan(Math.min(n.tp, n.tb));       // shorter than EITHER
      expect(t, n.id).toBeGreaterThan(Math.min(n.tp, n.tb) / 2); // and never less than half
      expect(1 / t, n.id).toBeCloseTo(1 / n.tp + 1 / n.tb, 9);
    });
  });

  it('reproduces the published effective half-lives', () => {
    // These are the figures a nuclear medicine textbook prints. If the inputs
    // drift, these break.
    const ref = { tc99m: 4.81 / 24, i131: 7.29, h3: 9.98, cs137: 69.6, po210: 36.7 };
    for (const [id, days] of Object.entries(ref)) {
      expect(tEff(bioById(id)), id).toBeCloseTo(days, 1);
    }
    expect(tEff(bioById('sr90')) / YEAR).toBeCloseTo(11.1, 1);
    expect(tEff(bioById('pu239')) / YEAR).toBeCloseTo(49.9, 1);
  });

  it('makes the caesium point the section is built around', () => {
    // "Caesium-137 has a 30-year half-life" is true of soil and false of
    // people by a factor of about 160. Both numbers have to stay in the tool
    // for the correction to mean anything.
    const cs = bioById('cs137');
    expect(cs.tp / YEAR).toBeCloseTo(30.05, 1);
    expect(tEff(cs)).toBeLessThan(80 * DAY);
    expect(cs.tp / tEff(cs)).toBeGreaterThan(100);
    expect(SRC).toMatch(/two different clocks/i);
  });

  it('does not let biology rescue the bone seekers', () => {
    // Strontium, radium and plutonium are the counterexamples to "the body
    // just flushes it out". If any of these ever came out short, the section
    // would be telling a comforting lie.
    ['sr90', 'ra226', 'pu239'].forEach((id) => {
      expect(tEff(bioById(id)) / YEAR, id).toBeGreaterThan(10);
    });
  });

  it('keeps physical half-lives consistent with the isotope table above', () => {
    // The same nuclides appear in two tables in this file. They must agree.
    const pairs = { cs137: 30.05, i131: 8.02 / YEAR, h3: 12.32, k40: 1.25e9, pu239: 24110 };
    for (const [id, years] of Object.entries(pairs)) {
      const iso = ISOTOPES.find((i) => i.id === id);
      expect(Math.abs(bioById(id).tp / YEAR - iso.hl) / iso.hl, id).toBeLessThan(0.001);
    }
  });

  it('classifies which clock dominates by the RATIO, not by which is smaller', () => {
    // "The shorter one wins" holds for caesium (ratio 157) and fails for
    // strontium (ratio 1.6), where the effective half-life is nowhere near
    // either input. The verdict text branches on this, so the boundary cases
    // have to stay on the side the prose assumes.
    const ratio = (id) => { const n = bioById(id); return Math.max(n.tp, n.tb) / Math.min(n.tp, n.tb); };
    ['cs137', 'h3', 'k40', 'ra226', 'pu239'].forEach((id) => expect(ratio(id), id).toBeGreaterThan(8));
    ['tc99m', 'sr90', 'po210'].forEach((id) => expect(ratio(id), id).toBeLessThan(8));
    // And the "neither" cases must genuinely be far from both inputs.
    ['tc99m', 'sr90', 'po210'].forEach((id) => {
      const n = bioById(id);
      expect(1 - tEff(n) / Math.min(n.tp, n.tb), id).toBeGreaterThan(0.15);
    });
  });
});

describe('The two new sections render', () => {
  it('shows all three dose quantities and the arithmetic between them', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { wrId: 'alpha', wtId: 'whole', absorbedMGy: 2 } });
    expect(html).toContain('id="nksec-weighting"');
    expect(html).toContain('ABSORBED DOSE');
    expect(html).toContain('EQUIVALENT DOSE');
    expect(html).toContain('EFFECTIVE DOSE');
    expect(html).toContain('2 mGy');
    expect(html).toContain('40 mSv');       // 2 mGy alpha x 20
  });

  it('applies the tissue weight to a single-organ exposure', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { wrId: 'gamma', wtId: 'thyroid', absorbedMGy: 10 } });
    expect(html).toContain('10 mGy');
    expect(html).toContain('0.4 mSv');       // 10 x 1 x 0.04
  });

  it('carries the ICRP caveat that effective dose is not personal risk', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('What effective dose is NOT');
    expect(html).toMatch(/not a measure of harm to a particular person/i);
  });

  it('renders the body-burden section for every nuclide without leaking a bad number', () => {
    BIO_NUCLIDES.forEach((n) => {
      const html = renderTool('nuclearLab', { _nuclearLab: { bioId: n.id } });
      expect(html, n.id).toContain('id="nksec-biohalf"');
      expect(html, n.id).not.toMatch(/NaN|Infinity/);
      // Singular slip. The lookbehind matters: \b sits between "." and "1",
      // so a naive \b1 also fires on "30.1 years" and "24.1 days".
      expect(html, n.id).not.toMatch(/(?<![\d.])1 (days|years|hours)\b/);
    });
  });

  it('states what potassium iodide does and does not do', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toMatch(/not an anti-radiation pill/i);
    expect(html).toMatch(/nothing about caesium/i);
  });
});

// ── Time, distance, shielding ──────────────────────────────────────────────
// The dose rates in this section are DERIVED from each nuclide's decay scheme,
// not read off a table, so the derivation is what needs testing. Two mistakes
// cost about 20% each and neither shows up on screen: weighting the air
// coefficient by the mean photon energy instead of per line, and dropping the
// K X-rays. Both are pinned below against the published constants.

const MU_EN_AIR = table('var MU_EN_AIR = [');
const PROTECT_SOURCES = table('var PROTECT_SOURCES = [');
const DOSE_LIMITS = table('var DOSE_LIMITS = [');
const muEnAir = new Function(
  'MU_EN_AIR', 'return ' + SRC.slice(SRC.indexOf('function nkMuEnAir'), SRC.indexOf('// mSv per hour at 1 m'))
)(MU_EN_AIR);
const gammaConst = new Function(
  'nkMuEnAir', 'return ' + SRC.slice(SRC.indexOf('function nkGammaConst'), SRC.indexOf('// Integrate a source'))
)(muEnAir);
const decayHelpers = new Function(
  SRC.slice(SRC.indexOf('function nkIntegratedDose'), SRC.indexOf('// Energies in MeV, yields per decay')) +
  '\nreturn { nkIntegratedDose, nkTimeToDose };'
)();

// Classic specific gamma-ray constants, R*cm^2/(mCi*h), converted once:
// 1 mCi = 27.027 per GBq, 1 m = 100 cm, 1 R = 8.76 mGy in air.
const R_TO_MSVH = (27.027 / 10000) * 8.76;
const PUBLISHED = { 'Tc-99m': 0.78, 'I-131': 2.2, 'Cs-137': 3.3, 'Co-60': 13.2 };

describe('the air coefficient table', () => {
  it('covers the range the sources actually emit in', () => {
    const es = PROTECT_SOURCES.flatMap((s) => s.lines.map((l) => l[0]));
    expect(Math.min(...es)).toBeGreaterThanOrEqual(MU_EN_AIR[0][0]);
    expect(Math.max(...es)).toBeLessThanOrEqual(MU_EN_AIR[MU_EN_AIR.length - 1][0]);
  });

  it('reproduces NIST values at the tabulated points', () => {
    for (const [e, v] of MU_EN_AIR) expect(muEnAir(e), `${e} MeV`).toBeCloseTo(v, 6);
  });

  it('interpolates in LOG space, which matters by a factor of two at 15 keV', () => {
    // Between 10 keV (4.742) and 15 keV (1.334) the coefficient falls by 3.5x.
    // A straight line between them would read ~3.0 at 12.5 keV; the log fit
    // gives ~2.5, and NIST is ~2.4. Getting this wrong inflates every soft line.
    const mid = muEnAir(0.0125);
    const linear = (4.742 + 1.334) / 2;
    expect(mid).toBeLessThan(linear * 0.9);
    expect(mid).toBeGreaterThan(2.0);
    expect(mid).toBeLessThan(3.0);
  });

  it('is monotonic where physics says it must be', () => {
    // Photoelectric absorption falls steeply to a minimum near 60-100 keV, then
    // Compton takes over and it rises gently to a broad peak around 0.5 MeV.
    for (let i = 1; i < MU_EN_AIR.length; i++) {
      if (MU_EN_AIR[i][0] <= 0.1) {
        expect(MU_EN_AIR[i][1], `${MU_EN_AIR[i][0]} MeV`).toBeLessThan(MU_EN_AIR[i - 1][1]);
      }
    }
    const peak = MU_EN_AIR.reduce((m, x) => (x[0] > 0.1 && x[1] > m[1] ? x : m), [0, 0]);
    expect(peak[0]).toBeGreaterThanOrEqual(0.4);
    expect(peak[0]).toBeLessThanOrEqual(0.6);
  });
});

describe('derived gamma constants', () => {
  it('lands within 3% of the published constant for every source offered', () => {
    const off = [];
    for (const s of PROTECT_SOURCES) {
      const pub = PUBLISHED[s.nuclide] * R_TO_MSVH;
      const derived = gammaConst(s.lines);
      const err = Math.abs(derived - pub) / pub;
      if (err > 0.03) off.push(`${s.nuclide}: derived ${derived.toFixed(4)} vs published ${pub.toFixed(4)} (${(err * 100).toFixed(1)}%)`);
    }
    expect(off, 'derived constants adrift:\n  ' + off.join('\n  ')).toEqual([]);
  });

  it('would be ~20% low if the K X-rays were dropped', () => {
    // This is the trap the section's comment describes. Technetium's 18 keV
    // X-rays carry little energy but sit where the air coefficient is twenty
    // times higher, so they are most of its air kerma.
    const tc = PROTECT_SOURCES.find((s) => s.nuclide === 'Tc-99m');
    const withX = gammaConst(tc.lines);
    const withoutX = gammaConst(tc.lines.filter((l) => l[0] > 0.05));
    expect(withoutX / withX).toBeLessThan(0.85);
  });

  it('would be ~20% low if the coefficient were taken at the mean energy', () => {
    // The other half of the trap: one coefficient for the whole spectrum.
    const ir = PROTECT_SOURCES.find((s) => s.nuclide === 'I-131');
    const perLine = gammaConst(ir.lines);
    const eTot = ir.lines.reduce((a, [e, y]) => a + e * y, 0);
    const yTot = ir.lines.reduce((a, [, y]) => a + y, 0);
    const atMean = 1e9 * 1.602e-13 * eTot * muEnAir(eTot / yTot) * 0.1 / (4 * Math.PI) * 3600 * 1000;
    expect(atMean).toBeLessThan(perLine);
  });

  it('ranks the sources the way their decay schemes demand', () => {
    const g = {};
    for (const s of PROTECT_SOURCES) g[s.nuclide] = gammaConst(s.lines);
    // Co-60 emits two hard gammas per decay, Cs-137 one soft one: about 4x.
    expect(g['Co-60'] / g['Cs-137']).toBeGreaterThan(3.5);
    expect(g['Co-60'] / g['Cs-137']).toBeLessThan(4.5);
    expect(g['Tc-99m']).toBeLessThan(g['I-131']);
    expect(g['I-131']).toBeLessThan(g['Cs-137']);
  });
});

describe('the three levers', () => {
  const rate = (s, gbq, m, mu, cm) => gammaConst(s.lines) * gbq * Math.exp(-mu * cm) / (m * m);
  const cs = PROTECT_SOURCES.find((s) => s.nuclide === 'Cs-137');

  it('halves the dose for each lever, and multiplies across them', () => {
    const base = rate(cs, cs.gbq, 1, 0, 0);
    // Distance: x sqrt(2)
    expect(rate(cs, cs.gbq, Math.SQRT2, 0, 0) / base).toBeCloseTo(0.5, 6);
    // Shielding: one half-value layer of lead (mu = 0.771 /cm at 1 MeV)
    const hvl = Math.LN2 / 0.771;
    expect(rate(cs, cs.gbq, 1, 0.771, hvl) / base).toBeCloseTo(0.5, 6);
    // All three together, time included, is one eighth — the section's claim.
    const both = rate(cs, cs.gbq, Math.SQRT2, 0.771, hvl) / base;
    expect(both * 0.5).toBeCloseTo(0.125, 6);
  });

  it('puts a 37 GBq caesium gauge in the range a survey meter would read', () => {
    // ~2.8 mSv/h at 1 m. Orders of magnitude either side would mean the
    // activity or the constant is wrong.
    const r = rate(cs, cs.gbq, 1, 0, 0);
    expect(r).toBeGreaterThan(1.5);
    expect(r).toBeLessThan(5);
    // And the stay time to the public annual limit is minutes, not hours.
    expect(60 / r).toBeGreaterThan(10);
    expect(60 / r).toBeLessThan(45);
  });

  it('keeps the nuclear-medicine patient reassuringly low', () => {
    // The section tells families a whole day at arm's length is not a
    // meaningful dose. That has to be true.
    const tc = PROTECT_SOURCES.find((s) => s.nuclide === 'Tc-99m');
    const allDayAtOneMetre = rate(tc, tc.gbq, 1, 0, 0) * 8;   // mSv over 8 hours
    expect(allDayAtOneMetre).toBeLessThan(0.2);               // under a tenth of annual background
  });

  it('offers limits that match the dose ladder', () => {
    const byId = Object.fromEntries(DOSE_LIMITS.map((l) => [l.id, l.mSv]));
    expect(byId.worker).toBe(DOSES.find((d) => d.name.includes('radiation worker')).mSv);
    expect(byId.sick).toBe(DOSES.find((d) => d.name.includes('Radiation sickness')).mSv);
  });

  it('integrates a falling activity instead of extending the initial rate forever', () => {
    const rate = 2;
    const halfLife = 6;
    const oneHalfLife = decayHelpers.nkIntegratedDose(rate, halfLife, halfLife);
    expect(oneHalfLife).toBeCloseTo(rate * halfLife / (2 * Math.LN2), 10);
    expect(oneHalfLife).toBeLessThan(rate * halfLife);
    const lifetime = rate * halfLife / Math.LN2;
    expect(decayHelpers.nkIntegratedDose(rate, 100 * halfLife, halfLife)).toBeCloseTo(lifetime, 10);
  });

  it('returns no finite time when physical decay keeps lifetime dose below the target', () => {
    const rate = 0.05;
    const halfLife = 6;
    const lifetime = rate * halfLife / Math.LN2;
    expect(decayHelpers.nkTimeToDose(rate, lifetime * 1.01, halfLife)).toBe(Infinity);
    const target = lifetime * 0.75;
    const time = decayHelpers.nkTimeToDose(rate, target, halfLife);
    expect(decayHelpers.nkIntegratedDose(rate, time, halfLife)).toBeCloseTo(target, 10);
  });

  it('qualifies one-eighth as a steady-rate shortcut and states the product correctly', () => {
    expect(SRC).toContain('1/2 × 1/2 × 1/2 = 1/8');
    expect(SRC).toMatch(/source whose rate is effectively steady during a visit/i);
    expect(SRC).not.toMatch(/quarter of a quarter.{0,20}one eighth/i);
  });
});

describe('the protection section renders', () => {
  it('shows all three levers and a stay time', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { ptSrc: 'cs137', ptDist: 1, ptThick: 0 } });
    expect(html).toContain('id="nksec-protect"');
    expect(html).toContain('⏱️ TIME');
    expect(html).toContain('📏 DISTANCE');
    expect(html).toContain('🧱 SHIELDING');
    expect(html).toContain('Initial dose rate');
  });

  it('states the buildup simplification rather than hiding it', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toMatch(/narrow-beam attenuation with no buildup factor/i);
    expect(html).toMatch(/performs somewhat worse/i);
  });

  it('survives a shield thick enough to stop essentially everything', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { ptSrc: 'co60', ptShield: 'lead', ptThick: 20, ptDist: 0.3 } });
    expect(html).toContain('id="nksec-protect"');
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });
});

// ── Shelter or evacuate ────────────────────────────────────────────────────
// This section's whole value is that the answer FLIPS, so what has to be
// tested is that it flips in the right direction, at the right point, for the
// right reason. A version that always said "shelter" would look identical on
// any single screenshot and would be propaganda rather than a calculation.

const SHELTER_PLACES = table('var SHELTER_PLACES = [');
const PAG_LEVELS = table('var PAG_LEVELS = [');

const OUT = SHELTER_PLACES[0].drf;
const shelterDose = (rate, drf, plume) => rate * drf * plume;
const evacDose = (rate, plume, hours) => rate * OUT * Math.min(hours, plume);
const breakEven = (drf, plume) => drf * plume / OUT;

describe('Shielding factors', () => {
  it('orders buildings by how much mass is between you and the sky', () => {
    for (let i = 1; i < SHELTER_PLACES.length; i++) {
      expect(SHELTER_PLACES[i].drf, SHELTER_PLACES[i].name)
        .toBeLessThan(SHELTER_PLACES[i - 1].drf);
    }
    expect(SHELTER_PLACES[0].id).toBe('outdoors');
  });

  it('keeps every factor inside the range it publishes', () => {
    for (const p of SHELTER_PLACES) {
      const [lo, hi] = p.range.split('–').map((x) => parseFloat(x.trim()));
      expect(p.drf, `${p.name} outside its own stated range ${p.range}`).toBeGreaterThanOrEqual(lo);
      expect(p.drf, `${p.name} outside its own stated range ${p.range}`).toBeLessThanOrEqual(hi);
    }
  });

  it('treats a car as no shelter at all, which is the point', () => {
    const car = SHELTER_PLACES.find((p) => p.id === 'outdoors');
    expect(car.drf).toBeGreaterThanOrEqual(0.9);
    expect(car.note).toMatch(/car is not shelter/i);
  });

  it('spans a factor of at least forty from outdoors to a big building', () => {
    const best = SHELTER_PLACES[SHELTER_PLACES.length - 1];
    expect(OUT / best.drf).toBeGreaterThan(40);
  });
});

describe('The decision flips, and flips correctly', () => {
  it('favours sheltering through a short release', () => {
    // 8-hour plume, brick house, 4 hours to get clear through jammed roads.
    const rate = 2, drf = 0.2, plume = 8, evacHrs = 4;
    expect(shelterDose(rate, drf, plume)).toBeLessThan(evacDose(rate, plume, evacHrs));
  });

  it('favours leaving when the release goes on for days', () => {
    // Same house, same drive, but the release lasts three days. No building
    // shields you for 72 hours.
    const rate = 2, drf = 0.2, plume = 72, evacHrs = 4;
    expect(evacDose(rate, plume, evacHrs)).toBeLessThan(shelterDose(rate, drf, plume));
  });

  it('puts the break-even exactly where the two curves cross', () => {
    for (const p of SHELTER_PLACES.slice(1)) {
      for (const plume of [4, 8, 24, 72]) {
        const be = breakEven(p.drf, plume);
        const rate = 3;
        // At break-even the two options cost the same, to floating-point.
        expect(evacDose(rate, plume, be), `${p.id} @ ${plume}h`)
          .toBeCloseTo(shelterDose(rate, p.drf, plume), 9);
        // Either side of it, the cheaper option swaps.
        if (be > 0.2 && be < plume) {
          expect(evacDose(rate, plume, be * 0.9)).toBeLessThan(shelterDose(rate, p.drf, plume));
          expect(evacDose(rate, plume, be * 1.1)).toBeGreaterThan(shelterDose(rate, p.drf, plume));
        }
      }
    }
  });

  it('does not depend on the dose rate — only on time and shielding', () => {
    // The break-even is rate-independent, which is why the section can give a
    // student a rule of thumb rather than a number they must look up.
    const a = breakEven(0.2, 8);
    for (const rate of [0.1, 2, 30]) {
      expect(evacDose(rate, 8, a)).toBeCloseTo(shelterDose(rate, 0.2, 8), 9);
    }
  });

  it('never lets evacuating accrue dose after the plume has stopped', () => {
    // Driving for 12 hours through a 2-hour release must cost 2 hours of dose,
    // not 12. Getting this wrong would bias every answer toward sheltering.
    expect(evacDose(5, 2, 12)).toBeCloseTo(5 * OUT * 2, 9);
  });

  it('makes a basement beat a four-hour drive for any plume under a day', () => {
    const be = breakEven(SHELTER_PLACES.find((p) => p.id === 'basement').drf, 24);
    expect(be).toBeLessThan(4);   // so a 4 h evacuation loses
  });
});

describe('Published thresholds', () => {
  it('matches the EPA and IAEA figures, in order', () => {
    expect(PAG_LEVELS.map((l) => l.mSv)).toEqual([10, 50, 100]);
    expect(PAG_LEVELS[0].window).toMatch(/4 days/);
    expect(PAG_LEVELS[2].window).toMatch(/7 days/);
  });

  it('ties the IAEA criterion to the dose ladder rather than restating it', () => {
    const iaea = PAG_LEVELS.find((l) => l.mSv === 100);
    expect(iaea.what).toMatch(/clearly measurable cancer link/i);
    expect(DOSES.find((x) => x.name.includes('Lowest dose')).mSv).toBe(iaea.mSv);
  });

  it('says the guide is "whichever is lower", not "evacuate"', () => {
    expect(PAG_LEVELS[0].what).toMatch(/whichever gives the lower dose/i);
  });
});

describe('The section renders honestly', () => {
  it('shows both options and the break-even', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { shRate: 2, shPlume: 8, shEvac: 4, shPlace: 'masonry' } });
    expect(html).toContain('id="nksec-shelter"');
    expect(html).toContain('Shelter here');
    expect(html).toContain('Evacuate now');
    expect(html).toMatch(/Break-even is/);
  });

  it('reaches the opposite verdict for a long release', () => {
    const short = renderTool('nuclearLab', { _nuclearLab: { shRate: 2, shPlume: 6, shEvac: 4, shPlace: 'masonry' } });
    const long = renderTool('nuclearLab', { _nuclearLab: { shRate: 2, shPlume: 72, shEvac: 4, shPlace: 'masonry' } });
    expect(short).toContain('stay where you are');
    expect(long).toContain('leaving costs less');
  });

  it('states what the arithmetic leaves out, in the section itself', () => {
    // The official disaster-related-death category is not a radiation tally
    // or a count attributable to one evacuation order. The dose calculator
    // must keep that distinction visible beside its simplified comparison.
    const html = renderTool('nuclearLab', {});
    expect(html).toMatch(/radiation dose was not identified as the cause/i);
    expect(html).toMatch(/legal category does not assign every case/i);
    expect(html).toMatch(/lesson was not never evacuate/i);
    expect(html).toMatch(/per population rather than per map/i);
  });

  it('survives the extremes of every slider', () => {
    for (const st of [
      { shRate: 0.1, shPlume: 1, shEvac: 0.5, shPlace: 'outdoors' },
      { shRate: 30, shPlume: 72, shEvac: 12, shPlace: 'large' },
      { shRate: 30, shPlume: 1, shEvac: 12, shPlace: 'basement' },
    ]) {
      const html = renderTool('nuclearLab', { _nuclearLab: st });
      expect(html, JSON.stringify(st)).toContain('id="nksec-shelter"');
      expect(html, JSON.stringify(st)).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

// ── Question routes ────────────────────────────────────────────────────────
// Nineteen sections in document order is right for a reader going front to
// back and wrong for almost everyone who arrives, because people turn up with
// a question rather than a section number. The routes are the same nineteen
// sections in five reading orders — so the thing to test is that they really
// are the same nineteen, and that turning one on does not strand anybody.

function pathTable() {
  const a = SRC.indexOf('var NK_PATHS = [');
  expect(a, 'NK_PATHS not found').toBeGreaterThan(-1);
  const b = SRC.indexOf('\n      ];', a);
  return new Function('return ' + SRC.slice(a + 'var NK_PATHS = '.length, b) + '\n      ]')();
}
const NK_PATHS = pathTable();
const SECTION_IDS = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);

describe('Question routes', () => {
  it('only ever points at sections that exist', () => {
    // A route step naming a section that was renamed or removed would render a
    // button that jumps nowhere, silently.
    for (const r of NK_PATHS) {
      for (const step of r.steps) {
        expect(SECTION_IDS, `route "${r.q}" points at unknown section "${step}"`).toContain(step);
      }
    }
  });

  it('leaves no section unreachable from any route', () => {
    // Not a formality: the routes are the only question-led way in, so a
    // section none of them mentions is one a student can reach only by
    // scrolling past it or already knowing its name.
    const covered = new Set(NK_PATHS.flatMap((r) => r.steps));
    const orphans = SECTION_IDS.filter((id) => !covered.has(id));
    expect(orphans, 'sections no route leads to: ' + orphans.join(', ')).toEqual([]);
  });

  it('does not repeat a step inside one route', () => {
    for (const r of NK_PATHS) {
      expect(r.steps.length, `route "${r.q}" repeats a step`).toBe(new Set(r.steps).size);
    }
  });

  it('gives every route a unique id, a real question, and a reason', () => {
    const ids = NK_PATHS.map((r) => r.id);
    expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
    for (const r of NK_PATHS) {
      expect(r.q, r.id + ' is not phrased as a question').toMatch(/\?$/);
      expect(r.why.length, r.id + ' has no explanation').toBeGreaterThan(40);
      expect(r.steps.length, r.id + ' is too short to be a route').toBeGreaterThanOrEqual(3);
    }
  });

  it('sequences each route so it opens on something concrete', () => {
    // Every route starts on a section that answers its question directly,
    // rather than on background the student did not ask for.
    const firsts = NK_PATHS.map((r) => r.steps[0]);
    expect(firsts).toEqual(['compare', 'weighting', 'shielding', 'halflife', 'detect']);
  });
});

describe('Every question the lab asks, it also answers', () => {
  // Five sections closed on a "🤔" prompt and then stopped. Good questions,
  // which is exactly why leaving them open was a problem: a reader with a
  // teacher asks; a reader in independent mode has no way to find out whether
  // what they worked out was right. Only one of the five was answered anywhere
  // at all, and that answer sat in an EARLIER section with nothing linking them.
  const PROMPTS = ['halflife', 'chain', 'criticality', 'binding', 'compare'];

  it('routes every prompt through the think-then-check control', () => {
    const raw = [...SRC.matchAll(/ponder\('([a-z]+)'/g)].map((m) => m[1]);
    expect(raw.sort()).toEqual([...PROMPTS].sort());
  });

  it('leaves no bare 🤔 prompt that just stops', () => {
    // The helper prints its own marker, so any OTHER emitted occurrence is a
    // question that was never wired up. Matches the marker as it appears in a
    // string literal ("'🤔 ") so prose about it in comments does not count.
    const render = SRC.slice(SRC.indexOf('render: function (ctx)'));
    const marks = [...render.matchAll(/'🤔 /g)];
    expect(marks.length, 'a 🤔 prompt is not going through ponder()').toBe(1);
  });

  it('hides the answer until it is asked for', () => {
    const shut = renderTool('nuclearLab', {});
    expect(shut).toContain('Worked it out? Check');
    expect(shut).toMatch(/What does that mean for a star once its core is iron and nickel\?/);
    expect(shut, 'the answer is on screen before the reader has thought').not.toMatch(/core-collapse supernova/);
  });

  it('reveals it, and only the one that was opened', () => {
    const open = renderTool('nuclearLab', { _nuclearLab: { ponderOpen: { binding: true } } });
    expect(open).toMatch(/core-collapse supernova/);
    expect(open).toContain('Hide the answer');
    // the other four stay shut
    expect(open, 'opening one prompt opened another').not.toMatch(/sub-slab depressurisation/);
  });

  it('answers each one on the physics, not with a gesture', () => {
    const open = renderTool('nuclearLab', {
      _nuclearLab: { ponderOpen: Object.fromEntries(PROMPTS.map((p) => [p, true])) },
    });
    // half-life: the convention, and where the smooth curve stops being smooth
    expect(open).toMatch(/is a CONVENTION/);
    expect(open).toMatch(/still a kilogram of caesium-137/);
    // radon: it is a flow, not a stock — which is why sealing is the wrong fix
    expect(open).toMatch(/not a stock, it is a flow/);
    expect(open).toMatch(/sub-slab depressurisation/);
    // bomb: fuel, not safety systems
    expect(open).toMatch(/cannot sustain a fast chain reaction at any mass or in any shape/i);
    // star: and where the uranium in section 3 came from
    expect(open).toMatch(/colliding neutron stars/);
    // risk perception: names the research and refuses the smug conclusion
    expect(open).toMatch(/Slovic/);
    expect(open).toMatch(/NOT that the fear is irrational/);
  });

  it('keeps the disclosure accessible — named button, answer outside it', () => {
    const open = renderTool('nuclearLab', { _nuclearLab: { ponderOpen: { chain: true } } });
    expect(open).toMatch(/aria-expanded="true"/);
    // the revealed prose must be a sibling after the button, not swallowed by it
    const btn = open.indexOf('Hide the answer');
    const answer = open.indexOf('not a stock, it is a flow');
    expect(answer, 'answer should follow the button, not sit inside it').toBeGreaterThan(btn);
  });
});

describe('The chain reaction is a task, not a display', () => {
  it('opens shut down, with the job stated', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('The core is shut down. Withdraw the rods until k reads exactly 1.000.');
    expect(html).toMatch(/subcritical/);
    expect(html).not.toMatch(/✓ k = 1\.000/);
  });

  it('confirms it once the learner finds k = 1', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { rods: 50, rodsMoved: true } });
    expect(html).toMatch(/✓ k = 1\.000/);
    expect(html).not.toContain('The core is shut down.');
  });

  it('tells a screen-reader user what the rod position did', () => {
    // A range input announces "50%", which says nothing about whether the core
    // went critical — the one thing the control exists to find.
    expect(SRC).toMatch(/announceToSR\('k is ' \+ k\.toFixed\(3\)/);
    expect(SRC).toMatch(/if \(state !== kState && typeof announceToSR/);
  });
});

describe('Carbon dating scores the guess it was given', () => {
  it('reports the margin rather than only the answer', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { c14Frac: 25 } });
    expect(html, 'nothing revealed before the button is pressed').not.toMatch(/too old|too young|counts as dated/);
    // 25% remaining is two half-lives, 11,460 years.
    expect(SRC).toMatch(/counts as dated/);
    expect(SRC).toMatch(/the clock is logarithmic/);
  });

  it('captures the guess at reveal time instead of re-scoring while it is edited', () => {
    expect(SRC).toMatch(/setShownGuess\(isNaN\(g\) \? null : g\)/);
    expect(SRC).toMatch(/setAgeShown\(false\); setShownGuess\(null\)/);
  });
});

describe('Taking a route', () => {
  it('offers every route on first load', () => {
    const html = renderTool('nuclearLab', {});
    expect(html).toContain('START WITH A QUESTION');
    for (const r of NK_PATHS) expect(html, r.q + ' missing').toContain(r.q);
  });

  it('narrows the index to that route, in its order', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'know' } });
    const steps = [...html.matchAll(/Step (\d+) — ([^<(]+)/g)].map((m) => m[2].trim());
    expect(steps.length).toBe(3);
    // 'know' is detect -> dating -> chain, which is NOT document order
    // (dating is section 2, detect is section 12). Order is the point.
    expect(steps[0]).toMatch(/Measure it/);
    expect(steps[1]).toMatch(/Carbon dating/);
    expect(html).toContain('route: 3 steps');
  });

  it('still shows the section numbers, so a step is locatable in the document', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'know' } });
    expect(html).toMatch(/§13/);   // detect
    expect(html).toMatch(/§2/);    // dating
  });

  it('renders the route steps and only the route steps', () => {
    // A route is progressive disclosure, not just a reordered index: a student
    // following one question sees a short coherent path instead of scrolling
    // past eleven thousand pixels of everything else. This assertion USED to
    // require the opposite ("the route filters the INDEX, not the document")
    // and was left behind when the behaviour was deliberately changed; the
    // filter itself is asserted in nuclearlab_consistency.test.js. Off-route
    // sections must be absent from the DOM, not merely unlinked.
    const route = NK_PATHS.find((r) => r.id === 'safe');
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'safe' } });
    for (const id of route.steps) {
      expect(html, 'route step ' + id + ' is missing').toContain('id="nksec-' + id + '"');
    }
    for (const id of SECTION_IDS.filter((s) => !route.steps.includes(s))) {
      expect(html, 'off-route section ' + id + ' should not render').not.toContain('id="nksec-' + id + '"');
    }
  });

  it('explains why the route is ordered the way it is', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'me' } });
    expect(html).toContain(NK_PATHS.find((r) => r.id === 'me').why);
  });

  it('does not strand the reader if a stale route id is persisted', () => {
    // Old saved state naming a route that no longer exists must fall back to
    // the full index rather than an empty one.
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'no-such-route' } });
    expect(html).toContain('showing all');
    const jumps = (html.match(/aria-label="Jump to /g) || []).length;
    expect(jumps).toBe(SECTION_IDS.length);
  });

  it('labels the category pills as a way OFF a route while one is active', () => {
    const html = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'safe' } });
    expect(html).toMatch(/Leave the route and show/);
  });
});
