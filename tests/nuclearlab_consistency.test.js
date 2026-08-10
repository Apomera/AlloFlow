// Nuclear & Radiation Lab — does the tool agree with ITSELF?
//
// Nineteen sections were written across many sessions, and the same physics now
// appears in several places: caesium-137 is in four tables, the uranium chain in
// two, and three dose thresholds are quoted by more than one section. Every
// other suite checks a figure against its published source. None of them checks
// whether two figures inside this file, describing the same nucleus, still say
// the same thing.
//
// That is the failure mode a growing tool actually has. Each table is plausible
// on its own; the drift only shows when you put them side by side. This suite
// found the potassium-40 gamma branch sitting at 10.67% in one entry and 10.71%
// in another, against a published 10.55% — because the two photon rates had been
// rounded independently.
//
// The second half checks that every quest can actually be earned. A quest whose
// state key no handler ever writes renders in the list, can never be ticked, and
// fails silently forever.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const SRC = fs.readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

function table(mark) {
  const a = SRC.indexOf(mark);
  expect(a, 'table not found: ' + mark).toBeGreaterThan(-1);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + mark.length - 1, b) + '\n  ]')();
}

const Y = 365.25;
const ISOTOPES = table('var ISOTOPES = [');
const CHAIN = table('var U238_CHAIN = [');
const BIO = table('var BIO_NUCLIDES = [');
const COUNT = table('var COUNT_SOURCES = [');
const PROTECT = table('var PROTECT_SOURCES = [');
const DOSES = table('var DOSES = [');
const SCANS = table('var SCAN_TYPES = [');
const PAG = table('var PAG_LEVELS = [');
const LIMITS = table('var DOSE_LIMITS = [');
const SHELTER = table('var SHELTER_PLACES = [');

const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-30);

/** U238_CHAIN stores half-lives as display text; everything else stores numbers. */
function parseChainHl(t) {
  const m = /^([\d,.]+)\s*(microseconds|minutes|days|y|thousand y|billion y)?/.exec(String(t).trim());
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ''));
  if (m[2] === 'microseconds') return v / 1e6 / 86400 / Y;
  if (m[2] === 'minutes') return v / 1440 / Y;
  if (m[2] === 'days') return v / Y;
  return v;
}

describe('the same nucleus, described in more than one table', () => {
  it('agrees on half-life between the isotope list and the body-burden list', () => {
    const byId = Object.fromEntries(ISOTOPES.map((i) => [i.id, i]));
    const shared = BIO.filter((b) => byId[b.id]);
    expect(shared.length, 'no shared nuclides — did an id scheme change?').toBeGreaterThanOrEqual(5);
    for (const b of shared) {
      expect(rel(b.tp / Y, byId[b.id].hl), `${b.name}: ${b.tp / Y} y vs ${byId[b.id].hl} y`).toBeLessThan(0.001);
    }
  });

  it('agrees on half-life between the decay chain and everywhere else', () => {
    const chain = Object.fromEntries(CHAIN.map((s) => [s.sym, s]));
    const pairs = [
      ['Po-210', BIO.find((x) => x.id === 'po210').tp / Y],
      ['Ra-226', BIO.find((x) => x.id === 'ra226').tp / Y],
      ['Rn-222', ISOTOPES.find((i) => i.id === 'rn222').hl],
      ['U-238', ISOTOPES.find((i) => i.id === 'u238').hl / 1e9],
    ];
    for (const [sym, other] of pairs) {
      expect(chain[sym], sym + ' missing from the chain').toBeTruthy();
      expect(rel(parseChainHl(chain[sym].hl), other), `${sym}: chain says ${chain[sym].hl}`).toBeLessThan(0.005);
    }
  });

  it('agrees on photons per decay between the detector and the dose-rate sections', () => {
    // The counting section models only the main gamma; the dose-rate section
    // adds the X-rays. The shared quantity is the MAIN line's yield, and that
    // must not drift.
    const cs = COUNT.find((x) => x.id === 'cs137');
    const csP = PROTECT.find((p) => p.nuclide === 'Cs-137');
    const mainYield = csP.lines.filter((l) => Math.abs(l[0] - 0.6617) < 0.01).reduce((a, l) => a + l[1], 0);
    expect(rel(cs.gps / cs.bq, mainYield), 'Cs-137 gamma yield').toBeLessThan(0.005);

    const co = COUNT.find((x) => x.id === 'co60');
    const coP = PROTECT.find((p) => p.nuclide === 'Co-60');
    expect(rel(co.gps / co.bq, coP.lines.reduce((a, l) => a + l[1], 0)), 'Co-60 gamma yield').toBeLessThan(0.005);
  });

  it('uses ONE potassium-40 branching ratio for both potassium sources', () => {
    // The bug this suite was written for. K-40 emits its 1461 keV gamma in
    // 10.55% of decays; two entries had drifted to 10.67% and 10.71% by being
    // rounded to whole photons per second independently of each other.
    const kcl = COUNT.find((x) => x.id === 'kcl');
    const ban = COUNT.find((x) => x.id === 'banana');
    expect(rel(kcl.gps / kcl.bq, 0.1055), 'KCl branch').toBeLessThan(0.005);
    expect(rel(ban.gps / ban.bq, 0.1055), 'banana branch').toBeLessThan(0.02);
    expect(rel(kcl.gps / kcl.bq, ban.gps / ban.bq), 'the two disagree with each other').toBeLessThan(0.02);
  });

  it('quotes one number per dose threshold, however many sections use it', () => {
    const dose = (frag) => DOSES.find((d) => d.name.includes(frag)).mSv;
    expect(LIMITS.find((l) => l.id === 'worker').mSv).toBe(dose('radiation worker'));
    expect(LIMITS.find((l) => l.id === 'sick').mSv).toBe(dose('Radiation sickness'));
    expect(PAG.find((p) => p.mSv === 100).mSv).toBe(dose('Lowest dose'));
    for (const s of SCANS) {
      const d = DOSES.find((x) => x.name.toLowerCase().includes(s.name.toLowerCase()));
      if (d) expect(s.v, s.name + ' differs from the dose ladder').toBe(d.mSv);
    }
  });

  it('keeps the shielding factors a monotonic ladder, each inside its stated range', () => {
    for (let i = 1; i < SHELTER.length; i++) {
      expect(SHELTER[i].drf, SHELTER[i].name).toBeLessThan(SHELTER[i - 1].drf);
    }
    for (const p of SHELTER) {
      const [lo, hi] = p.range.split('–').map((x) => parseFloat(x.trim()));
      expect(p.drf, `${p.name} outside ${p.range}`).toBeGreaterThanOrEqual(lo);
      expect(p.drf, `${p.name} outside ${p.range}`).toBeLessThanOrEqual(hi);
    }
  });
});

describe('every quest can actually be earned', () => {
  const hooks = SRC.slice(SRC.indexOf('questHooks:'), SRC.indexOf('render: function (ctx)'));
  const render = SRC.slice(SRC.indexOf('render: function (ctx)'));
  const quests = [...hooks.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?check:\s*function\s*\(d\)\s*\{([\s\S]*?)\}\s*\}/g)]
    .map((m) => ({
      id: m[1],
      keys: [...new Set([...m[2].matchAll(/d\.([A-Za-z0-9_]+)/g)].map((k) => k[1]))],
    }));

  it('finds the quest list at all', () => {
    expect(quests.length, 'quest hooks not parsed — did the shape change?').toBeGreaterThanOrEqual(19);
    quests.forEach((q) => expect(q.keys.length, q.id + ' checks nothing').toBeGreaterThan(0));
  });

  it('has a unique id per quest', () => {
    const ids = quests.map((q) => q.id);
    expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
  });

  it('writes every state key some quest depends on', () => {
    // A key read by a check but written by no handler is a quest that renders
    // and can never be completed. Nothing errors; it just never ticks.
    const dead = [];
    for (const q of quests) {
      for (const key of q.keys) {
        const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const written = [
          new RegExp("pushOnce\\('" + esc + "'"),
          new RegExp("\\b" + esc + ":\\s"),
          new RegExp("patch\\." + esc + "\\s*="),
          new RegExp("\\[\\s*'" + esc + "'\\s*\\]\\s*="),
        ].some((re) => re.test(render));
        if (!written) dead.push(`${q.id} reads d.${key}, which nothing writes`);
      }
    }
    expect(dead, 'unearnable quests:\n  ' + dead.join('\n  ')).toEqual([]);
  });

  it('marks the annual-dose quest from every kind of estimator input', () => {
    const start = SRC.indexOf("slider('ds-alt'");
    const end = SRC.indexOf("sec('doseladder'", start);
    const estimator = SRC.slice(start, end);
    expect(estimator).toMatch(/upd\(\{ dsAlt:[^}]*doseEstimated: true/);
    expect(estimator).toMatch(/upd\(\{ dsFlights:[^}]*doseEstimated: true/);
    expect(estimator).toMatch(/upd\(\{ dsRadon:[^}]*doseEstimated: true/);
    const scanUpdates = estimator.match(/upd\(\{ dsScans: nx, doseEstimated: true \}\)/g) || [];
    expect(scanUpdates, 'both fewer and more scan controls must count as estimating').toHaveLength(2);
  });

  it('gives each section that has a quest a matching anchor', () => {
    // Weak but useful: a quest whose section was deleted would survive here.
    const sections = [...SRC.matchAll(/sec\('([a-z0-9]+)'/g)].map((m) => m[1]);
    expect(sections.length).toBeGreaterThanOrEqual(19);
    expect(quests.length).toBeLessThanOrEqual(sections.length + 2);
  });
});

describe('no quest is granted for free', () => {
  // The mirror image of the block above, and the failure it was written for.
  // "Hold a chain reaction critical" was awarded on MOUNT: the rod slider
  // defaulted to 50% inserted, k = 1.30 - 0.006 x 50 is exactly 1.000, that
  // lands inside the critical band, and the effect wrote heldCritical with no
  // interaction at all. The section also opened on a green tick, so the one
  // thing it teaches — that holding k at 1 is a thing you do — was handed over
  // before the reader touched anything. Every check here is on the arithmetic
  // rather than on a remembered number, so retuning the model cannot quietly
  // restore the free pass.
  const num = (re, label) => {
    const m = re.exec(SRC);
    expect(m, 'not found: ' + label).toBeTruthy();
    return parseFloat(m[1]);
  };
  const rodDefault = num(/typeof d\.rods === 'number' \? d\.rods : (\d+)/, 'rod default');
  const kIntercept = num(/var kEff = ([\d.]+) - [\d.]+ \* rods/, 'k intercept');
  const kSlope = num(/var kEff = [\d.]+ - ([\d.]+) \* rods/, 'k slope');
  const kAt = (rods) => kIntercept - kSlope * rods;
  const isCritical = (k) => k >= 0.995 && k <= 1.005;

  it('does not open the chain-reaction section already critical', () => {
    expect(isCritical(kAt(rodDefault)), `rods default ${rodDefault}% gives k=${kAt(rodDefault)}`).toBe(false);
  });

  it('still leaves criticality reachable, or the quest becomes impossible', () => {
    // Over-correcting is the other way to break this.
    const reachable = [];
    for (let r = 0; r <= 100; r++) if (isCritical(kAt(r))) reachable.push(r);
    expect(reachable.length, 'no rod position produces k = 1').toBeGreaterThan(0);
  });

  it('requires a rod movement before crediting the quest, whatever the default is', () => {
    const effect = /if \(kState === 'critical'([^)]*)\) upd\(\{ heldCritical: true \}\)/.exec(SRC);
    expect(effect, 'the heldCritical effect changed shape').toBeTruthy();
    expect(effect[1], 'heldCritical is written without an interaction guard').toMatch(/d\.rodsMoved/);
  });

  it('sets that interaction flag from the control the learner actually moves', () => {
    expect(SRC).toMatch(/upd\(\{ rods: v, rodsMoved: true \}\)/);
  });

  it('pays each XP award at most once', () => {
    // The same class of bug one layer down, and the general form of it. The
    // carbon-dating award sat behind an accuracy test but no PERSISTED flag,
    // so "Reveal" with a good guess still in the box paid out on every press
    // and the button became an XP tap. Two of the three awards in the file
    // were already guarded correctly, which is the pattern this enforces on
    // all of them rather than on the one that broke.
    const calls = [...SRC.matchAll(/awardXP\(\s*'([^']+)'/g)];
    expect(calls.length, 'no awardXP calls found — did the API change?').toBeGreaterThanOrEqual(3);
    for (const c of calls) {
      const before = SRC.slice(Math.max(0, c.index - 320), c.index);
      expect(before, `awardXP('${c[1]}') has no "!d.<flag>" re-award guard above it`)
        .toMatch(/!\s*d\.[A-Za-z0-9_]+/);
    }
  });
});

describe('safety, provenance, and mobile reading safeguards', () => {
  it('keeps official-instructions warnings beside every actionable model', () => {
    expect(SRC).toContain('Educational model — not emergency or medical instructions');
    expect(SRC).toContain(`safetyNotice('ki')`);
    expect(SRC).toContain(`safetyNotice('dose')`);
    expect(SRC).toContain(`safetyNotice('medical')`);
    expect(SRC).toContain(`safetyNotice('emergency')`);
    expect(SRC).toContain('follow state and local officials');
  });

  it('links reviewed primary sources and protects phone text size', () => {
    expect(SRC).toContain(`var NK_REVIEWED = '2026-08'`);
    expect(SRC).toContain('https://www.nrc.gov/about-nrc/emerg-preparedness/in-radiological-emerg');
    expect(SRC).toContain('https://www.nndc.bnl.gov/nudat3/');
    expect(SRC).toContain('https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html');
    expect(SRC).toContain('full magnetic energy in 2036');
    expect(SRC).toContain('deuterium-tritium operation in 2039');
    expect(SRC).toContain('.nk-readable .text-\\\\[11px\\\\]');
  });
});

describe('route progressive disclosure', () => {
  it('filters rendered sections when a question route is active', () => {
    expect(SRC).toContain('nkPath.steps.indexOf(id) === -1');
    expect(SRC).toContain('var nkVisible = nkPath');
    expect(SRC).toContain('showing all');
  });
});
