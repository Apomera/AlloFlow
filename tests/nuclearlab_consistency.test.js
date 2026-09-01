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
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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

describe('the xenon scenario requires a continuous low-power hold', () => {
  function makeXenonStep() {
    const openMark = '} else if (scen.id === \'xenon\') {';
    const closeMark = '} else if (scen.id === \'blackout\')';
    const open = SRC.indexOf(openMark);
    const close = SRC.indexOf(closeMark, open);
    expect(open, 'xenon scoring branch not found').toBeGreaterThan(-1);
    expect(close, 'end of xenon scoring branch not found').toBeGreaterThan(open);
    // Execute the production scoring branch itself, not a copy of its rules.
    return new Function('s', 'dt', SRC.slice(open + openMark.length, close));
  }

  it('restarts the timer if power rises above 20 percent', () => {
    const step = makeXenonStep();
    const s = { phase: 0, power: 20, holdOk: 0, verdict: null };

    step(s, 0);
    expect(s.phase).toBe(1);
    step(s, 45);
    expect(s.holdOk).toBe(45);

    s.power = 21;
    step(s, 1);
    expect(s.phase).toBe(1);
    expect(s.holdOk).toBe(0);
    expect(s.verdict).toBeNull();

    // Ninety low-power seconds in total are not enough when interrupted.
    s.power = 20;
    step(s, 45);
    expect(s.phase).toBe(1);
    expect(s.holdOk).toBe(45);
  });

  it('advances only after 90 continuous low-power seconds, then requires recovery', () => {
    const step = makeXenonStep();
    const s = { phase: 0, power: 20, holdOk: 0, verdict: null };

    step(s, 0);
    step(s, 89);
    expect(s.phase).toBe(1);
    expect(s.verdict).toBeNull();

    step(s, 1);
    expect(s.phase).toBe(2);
    expect(s.verdict).toBeNull();

    s.power = 81;
    step(s, 0.1);
    expect(s.verdict && s.verdict.ok).toBe(true);
  });
});

describe('reactor objectives expose the scoring state learners are trying to control', () => {
  function progressFor(state, scenario) {
    const open = SRC.indexOf('  function rxScenarioProgress(');
    const close = SRC.indexOf('\n  function rxDecayHeat', open);
    expect(open, 'rxScenarioProgress helper not found').toBeGreaterThan(-1);
    expect(close, 'end of rxScenarioProgress helper not found').toBeGreaterThan(open);
    const read = new Function(
      SRC.slice(open, close) + '\nreturn rxScenarioProgress;',
    )();
    return read(state, { id: scenario });
  }

  it('shows a continuous steady-power hold and an explicit reset state', () => {
    const holding = progressFor({ power: 100, holdOk: 23 }, 'steady');
    expect(holding).toMatchObject({
      stage: 'steady-hold', value: 23, max: 60,
    });
    expect(holding.detail).toContain('23 of 60 continuous seconds');

    const reset = progressFor({ power: 106, holdOk: 0 }, 'steady');
    expect(reset).toMatchObject({
      stage: 'steady-reset', value: 0, max: 60,
    });
    expect(reset.detail).toContain('timer is at 0');
  });

  it('names all three xenon phases, including an interrupted hold', () => {
    expect(progressFor({ phase: 0, power: 55, holdOk: 0 }, 'xenon'))
      .toMatchObject({ stage: 'xenon-lower', value: 0, max: 3 });
    expect(progressFor({ phase: 1, power: 20, holdOk: 45 }, 'xenon'))
      .toMatchObject({ stage: 'xenon-hold', value: 1.5, max: 3 });
    expect(progressFor({ phase: 1, power: 21, holdOk: 0 }, 'xenon'))
      .toMatchObject({ stage: 'xenon-reset', value: 1, max: 3 });
    expect(progressFor({ phase: 2, power: 70, holdOk: 90 }, 'xenon'))
      .toMatchObject({ stage: 'xenon-recover', value: 2, max: 3 });
  });

  it('turns blackout SCRAM and cooling into two inspectable steps', () => {
    const beforeScram = progressFor({ scrammed: false, holdOk: 0 }, 'blackout');
    expect(beforeScram).toMatchObject({
      stage: 'blackout-scram', value: 0, max: 2,
    });
    expect(beforeScram.detail).toContain('Cooling is offline');

    const cooling = progressFor({ scrammed: true, holdOk: 60 }, 'blackout');
    expect(cooling).toMatchObject({
      stage: 'blackout-cool', value: 1.5, max: 2,
    });
    expect(cooling.detail).toContain('60 of 120 seconds');

    const complete = progressFor({
      scrammed: true, holdOk: 120, verdict: { ok: true },
    }, 'blackout');
    expect(complete).toMatchObject({ stage: 'complete', value: 2, max: 2 });
  });
});

describe('the reactor dashboard communicates state without relying on colour', () => {
  const tones = ['neutral', 'info', 'success', 'caution', 'danger'];

  function renderReactor(state = {}) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
    const host = document.createElement('div');
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state });
    return host;
  }

  function productionTones() {
    const open = SRC.indexOf('      function rxMetricTone(');
    const close = SRC.indexOf('\n\n      function rxWriteTelemetry', open);
    const clad = /var RX_T_CLAD = ([\d.]+)/.exec(SRC);
    expect(open, 'rxMetricTone helper not found').toBeGreaterThan(-1);
    expect(close, 'end of reactor tone helpers not found').toBeGreaterThan(open);
    expect(clad, 'cladding threshold not found').toBeTruthy();
    return new Function(
      'RX_T_CLAD',
      SRC.slice(open, close) + '\nreturn { metric: rxMetricTone, objective: rxObjectiveTone };',
    )(parseFloat(clad[1]));
  }

  it('gives every live reading a semantic tone and a visible status tag', () => {
    const host = renderReactor();
    const readings = host.querySelector('#rx-live-readings');
    expect(readings).toBeTruthy();

    const metrics = [...readings.children];
    expect(metrics, 'all five reactor readings need a semantic card').toHaveLength(5);
    expect(metrics.every((metric) => metric.matches('div[data-rx-metric]'))).toBe(true);
    expect(new Set(metrics.map((metric) => metric.getAttribute('data-rx-metric'))).size)
      .toBe(metrics.length);

    for (const metric of metrics) {
      expect(tones, metric.getAttribute('data-rx-metric') + ' has an unknown tone')
        .toContain(metric.getAttribute('data-tone'));
      const status = metric.querySelector('.nk-rx-tone');
      expect(status, metric.getAttribute('data-rx-metric') + ' has no text status').toBeTruthy();
      expect(status.textContent.trim()).not.toBe('');
      expect(status.getAttribute('aria-hidden')).not.toBe('true');
      // A definition list may group each metric in a div, but that div may
      // contain only terms and descriptions. Keeping the visible tone as a
      // second dd avoids the invalid span sibling that screen readers flatten.
      expect([...metric.children].every((node) => ['DT', 'DD'].includes(node.tagName))).toBe(true);
      expect([...metric.children].filter((node) => node.tagName === 'DT')).toHaveLength(1);
      expect([...metric.children].filter((node) => node.tagName === 'DD')).toHaveLength(2);
      expect(status.tagName).toBe('DD');
    }
  });

  it('gives objective progress a semantic tone and visible status', () => {
    const host = renderReactor({ rxScenario: 'blackout' });
    const objective = host.querySelector('#rx-objective-progress');
    expect(objective).toBeTruthy();
    expect(tones).toContain(objective.getAttribute('data-tone'));

    const status = objective.querySelector('#rx-objective-tone');
    expect(status).toBeTruthy();
    expect(status.textContent.trim()).not.toBe('');
    expect(status.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('uses truthful scenario-aware labels and aggregates hazardous state', () => {
    const tone = productionTones();
    const nominal = {
      power: 100, t: 310, xe: 1, pumps: true, scrammed: false, verdict: null,
    };
    const reactivity = (pcm) => ({ total: pcm / 1e5 });

    expect(tone.metric('power', nominal, reactivity(0), true, { id: 'steady' }))
      .toEqual({ tone: 'success', label: 'Target band' });
    expect(tone.metric(
      'power', { ...nominal, power: 20, phase: 1 }, reactivity(0), true, { id: 'xenon' },
    )).toEqual({ tone: 'success', label: 'Low-power goal' });
    expect(tone.metric(
      'power', { ...nominal, power: 240 }, reactivity(0), true, { id: 'steady' },
    )).toEqual({ tone: 'danger', label: 'Power excursion' });
    expect(tone.metric(
      'temperature', nominal, reactivity(0), false, { id: 'steady' },
    )).toEqual({ tone: 'neutral', label: 'Below 400 °C' });
    expect(tone.metric(
      'temperature', { ...nominal, t: 1200 }, reactivity(0), true, { id: 'steady' },
    )).toMatchObject({ tone: 'danger', label: 'Cladding risk' });
    expect(tone.metric(
      'reactivity', nominal, reactivity(700), true, { id: 'steady' },
    )).toMatchObject({ tone: 'danger', label: 'Prompt critical' });

    expect(tone.metric(
      'state', { ...nominal, power: 240 }, reactivity(0), true, { id: 'steady' },
    )).toEqual({ tone: 'danger', label: 'Hazard' });
    expect(tone.metric(
      'state', { ...nominal, pumps: false }, reactivity(0), true, { id: 'blackout' },
    )).toEqual({ tone: 'caution', label: 'Needs action' });
    expect(tone.metric(
      'state', nominal, reactivity(0), false, { id: 'steady' },
    )).toEqual({ tone: 'neutral', label: 'Paused' });
  });

  it('distinguishes a paused objective from a running, failed, or completed one', () => {
    const tone = productionTones();
    const nominal = {
      power: 100, t: 310, xe: 1, pumps: true, scrammed: false, verdict: null,
    };
    const progress = { value: 0, max: 2 };

    expect(tone.objective(nominal, progress, false))
      .toEqual({ tone: 'neutral', label: 'Ready to begin' });
    expect(tone.objective(nominal, progress, true))
      .toEqual({ tone: 'info', label: 'In progress' });
    expect(tone.objective({ ...nominal, pumps: false }, progress, false))
      .toEqual({ tone: 'neutral', label: 'Ready to begin' });
    expect(tone.objective({ ...nominal, pumps: false }, progress, true))
      .toEqual({ tone: 'caution', label: 'Watch conditions' });
    expect(tone.objective({ ...nominal, verdict: { ok: false } }, progress, false))
      .toEqual({ tone: 'danger', label: 'Run ended' });
    expect(tone.objective({ ...nominal, verdict: { ok: true } }, { value: 2, max: 2 }, false))
      .toEqual({ tone: 'success', label: 'Complete' });
  });

  it('labels the three simulator control groups in task order', () => {
    const host = renderReactor();
    const labels = [
      '1. Choose scenario',
      '2. Choose core design',
      '3. Operate the reactor',
    ];
    const groups = [...host.querySelectorAll('fieldset')]
      .filter((field) => labels.includes(field.getAttribute('aria-label')));

    expect(groups.map((field) => field.getAttribute('aria-label'))).toEqual(labels);
    expect(groups[0].querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
    expect(groups[1].querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
    expect(groups[2].querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
    expect(groups[2].querySelector('input[type="range"]')).toBeTruthy();
  });

  it('passes the learner motion preference into the 3D viewer and resyncs when it changes', () => {
    const syncAt = SRC.indexOf('RX_VIEWER.sync({');
    const effectAt = SRC.lastIndexOf('React.useEffect(function () {', syncAt);
    const effectEnd = SRC.indexOf('\n\n      React.useEffect(function () {', syncAt);
    expect(syncAt, '3D viewer sync not found').toBeGreaterThan(-1);
    expect(effectAt, 'viewer sync effect not found').toBeGreaterThan(-1);
    expect(effectEnd, 'end of viewer sync effect not found').toBeGreaterThan(syncAt);

    const effect = SRC.slice(effectAt, effectEnd);
    expect(effect).toMatch(/\breduced:\s*nkReduceMotion\b/);
    expect(effect).toMatch(/\},\s*\[[^\]]*\bnkReduceMotion\b[^\]]*\]\);/);
  });
});

describe('station blackout actually removes cooling', () => {
  function productionReactor() {
    const constantsOpen = SRC.indexOf('  var RX_BETA =');
    const constantsClose = SRC.indexOf('\n  var RX_SCENARIOS =', constantsOpen);
    const decayOpen = SRC.indexOf('  function rxDecayHeat(');
    const decayClose = SRC.indexOf('\n\n  // ── 3D core', decayOpen);
    const reactivityOpen = SRC.indexOf('      function rxReactivity(');
    const reactivityClose = SRC.indexOf('\n\n      function rxWriteTelemetry', reactivityOpen);
    const stepOpen = SRC.indexOf('      function rxStep(');
    const stepClose = SRC.indexOf('\n\n      React.useEffect(function () {', stepOpen);
    for (const [label, value] of Object.entries({
      constantsOpen, constantsClose, decayOpen, decayClose,
      reactivityOpen, reactivityClose, stepOpen, stepClose,
    })) expect(value, label + ' not found').toBeGreaterThan(-1);
    return new Function(
      SRC.slice(constantsOpen, constantsClose)
        + SRC.slice(decayOpen, decayClose)
        + SRC.slice(reactivityOpen, reactivityClose)
        + SRC.slice(stepOpen, stepClose)
        + '\nreturn { step: rxStep, mode: RX_MODES[0], clad: RX_T_CLAD };',
    )();
  }

  function scrammedState(pumps) {
    return {
      rods: 100, pumps, scrammed: true, power: 100, t: 320,
      xe: 1, iod: 1, elapsed: 0, sinceScram: 0, holdOk: 0,
      phase: 0, peakT: 320, verdict: null,
    };
  }

  it('fails before 120 seconds if the learner never restores cooling', () => {
    const { step, mode, clad } = productionReactor();
    const state = scrammedState(false);
    while (!state.verdict && state.elapsed < 121) {
      step(state, 0.016, mode, { id: 'blackout' });
    }
    expect(state.verdict && state.verdict.ok).toBe(false);
    expect(state.elapsed).toBeLessThan(120);
    expect(state.t).toBeGreaterThanOrEqual(clad);
  });

  it('survives the full hold if cooling is restored halfway through', () => {
    const { step, mode, clad } = productionReactor();
    const state = scrammedState(false);
    while (!state.verdict && state.elapsed < 121) {
      if (state.elapsed >= 60) state.pumps = true;
      step(state, 0.016, mode, { id: 'blackout' });
    }
    expect(state.verdict && state.verdict.ok).toBe(true);
    expect(state.elapsed).toBeGreaterThanOrEqual(120);
    expect(state.peakT).toBeLessThan(clad);
  });
});

describe('the tool does not contradict itself in the headline', () => {
  // Both of these are the same failure: someone fixed the careful case and
  // left the summary sentence stating the thing they had just disproved.
  it('does not promise "the shorter clock wins" when its own verdict denies it', () => {
    // The biological half-life section opened by asserting the shorter of the
    // two clocks wins, and then, four elements down the page, told the reader
    // "Neither clock is running this one" for strontium-90 — where the two are
    // a factor of 1.6 apart and the effective half-life lands 38% below even
    // the shorter. The branching verdict was written specifically to handle
    // that case; the intro was never updated to match it.
    expect(SRC).not.toMatch(/The shorter clock wins/);
    expect(SRC).toMatch(/shorter than EITHER of them/);
    expect(SRC).toMatch(/Neither clock is running this one/);
  });

  it('keeps the effective half-life below both inputs, which is what the intro now claims', () => {
    const BIO = table('var BIO_NUCLIDES = [');
    for (const b of BIO) {
      const eff = (b.tp * b.tb) / (b.tp + b.tb);
      expect(eff, b.name + ' effective vs physical').toBeLessThan(b.tp);
      expect(eff, b.name + ' effective vs biological').toBeLessThan(b.tb);
    }
  });

  it('only sends the reader to tools that exist', () => {
    // sec('next') offers four cross-links, and setStemLabTool on a renamed id
    // fails silently — the button just does nothing.
    const closing = SRC.slice(SRC.indexOf("sec('next'"));
    const ids = [...closing.matchAll(/\{ id: '([A-Za-z0-9_]+)', icon:/g)].map((m) => m[1]);
    expect(ids.length, 'cross-links not found — did sec(next) change shape?').toBeGreaterThanOrEqual(4);
    const all = fs.readdirSync('stem_lab')
      .filter((f) => f.startsWith('stem_tool_') && f.endsWith('.js'))
      .map((f) => fs.readFileSync('stem_lab/' + f, 'utf8'))
      .join('\n');
    for (const id of ids) {
      expect(all.includes("registerTool('" + id + "'"), `"${id}" is linked but no tool registers it`).toBe(true);
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

  it('keeps sliders unit-aware and reflows them at phone width', () => {
    expect(SRC).toMatch(/className: 'nk-slider flex/);
    expect(SRC).toMatch(/aria-valuetext': valueText/);
    expect(SRC).toMatch(/h\('output', \{ htmlFor: id/);
    expect(SRC).toMatch(/\.nk-readable \.nk-slider\{display:grid!important/);
  });

  it('qualifies half-life invariance and radiocarbon dating limits', () => {
    expect(SRC).toMatch(/practical rule rather than a universal law/);
    expect(SRC).toMatch(/especially electron capture/);
    expect(SRC).toMatch(/idealised radiocarbon age/);
    expect(SRC).toMatch(/use a calibration curve/);
    expect(SRC).not.toMatch(/which nothing can change/);
    expect(SRC).not.toMatch(/the one rule that never changes/);
  });

  it('keeps Fukushima evidence categories explicit and source-linked', () => {
    expect(SRC).toContain('Japan Reconstruction Agency disaster-related deaths (2026)');
    expect(SRC).toContain('Japan MHLW Fukushima worker health report (2024)');
    expect(SRC).toMatch(/2,350 disaster-related deaths/);
    expect(SRC).toMatch(/legal category/);
    expect(SRC).not.toMatch(/2,200 people died because of the Fukushima evacuation/);
    expect(SRC).not.toMatch(/one from radiation/);
  });
});

describe('route progressive disclosure', () => {
  it('exposes native route progress semantics', () => {
    expect(SRC).toMatch(/h\('progress', \{/);
  });

  it('filters rendered sections when a question route is active', () => {
    expect(SRC).toContain('nkPath.steps.indexOf(id) === -1');
    expect(SRC).toContain('var nkVisible = nkPath');
    expect(SRC).toContain('showing all');
  });
});
