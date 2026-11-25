// SwimLab: the practice-lab model, the quiz scoring, and what counts as progress.
//
// Before 2026-11-23 four files pinned markup and hook order and nothing tested behaviour, while:
//  - the tool had no model at all: "Rip Escape", "1-1-10 Cold Shock" and "Stroke Physics" opened
//    reading pages, and the one interactive ("Efficiency Lab") scored an invented index
//    (length x 0.5 + kick x 0.3 - |rate - 50| x 0.4) whose chart labelled the "optimal rate";
//  - a wrong quiz pick showed the right answer in green and "Try again" then gave full credit for
//    clicking it, so every mastery badge could be earned with no knowledge;
//  - 26 of 36 mini-quiz keys and 12 of 15 cumulative keys sat in slot B (only the scenario cards
//    were rotated);
//  - "Modules explored", the readiness ring and the "Visit 3 modules" quest counted page visits.
//
// SAFETY RULE pinned here: a lab may never reward the dangerous choice. Swimming against the rip
// always ends "spent" and is never a safe run; "swim out to them" is never the rescue answer.
//
// Model checks run the tool's own functions (window.StemLab.SwimLabModel). SWIMLAB_FILE=<path>
// points the suite at another copy (used once to confirm it goes red on the pre-pass file).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const FILE = process.env.SWIMLAB_FILE || 'stem_lab/stem_tool_swimlab.js';
const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function loadSwimLab() {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  return reg;
}
const REG = loadSwimLab();
const CFG = REG._registry.swimLab;
const M = REG.SwimLabModel;

// A stateful host like StemPluginBridge: toolData is real React state.
function mount(initial) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = { xp: [], toasts: [], data: null };
  function Harness() {
    const [toolData, setToolData] = React.useState({ swimLab: initial || {} });
    api.data = toolData.swimLab;
    const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }));
    const updateMulti = (id, obj) => setToolData((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...obj } }));
    api.update = update;
    return CFG.render({
      React, toolData, update, updateMulti, addToast: (m) => api.toasts.push(String(m)),
      awardXP: (...args) => api.xp.push(args), callGemini: null, t: (k, f) => f || k,
      isDark: false, isContrast: false, gradeBand: 'g68',
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  api.host = host;
  api.goTo = (view) => act(() => { api.update('swimLab', 'view', view); });
  api.buttons = () => [...host.querySelectorAll('button')];
  api.click = (text) => {
    const b = api.buttons().find((x) => !x.disabled && (x.textContent || '').includes(text));
    if (!b) throw new Error('no enabled button containing: ' + text + '\n  have: ' + api.buttons().map((x) => (x.textContent || '').slice(0, 40)).join(' | '));
    act(() => { b.click(); });
  };
  api.clickSel = (sel) => {
    const b = host.querySelector(sel);
    if (!b) throw new Error('no element: ' + sel);
    act(() => { b.click(); });
  };
  api.has = (sel) => !!host.querySelector(sel);
  api.text = () => host.textContent || '';
  api.teardown = () => { try { act(() => root.unmount()); } catch (_) { /* gone */ } host.remove(); };
  return api;
}

let app = null;
beforeEach(() => { try { localStorage.clear(); } catch (_) { /* none */ } delete window.__alloflowSwimLab; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { if (app) { app.teardown(); app = null; } vi.restoreAllMocks(); });

// ── quiz banks parsed from the source, as the student-facing text ──
function balanced(from, open, close) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === open) depth++;
    else if (source[i] === close) { depth--; if (depth === 0) return source.slice(from, i + 1); }
  }
  throw new Error('unbalanced');
}
function quizBanks() {
  const banks = {};
  const re = /miniQuizBlock\('([A-Za-z]+)', \[/g;
  let m;
  // eslint-disable-next-line no-new-func
  while ((m = re.exec(source)) !== null) banks[m[1]] = new Function('return ' + balanced(re.lastIndex - 1, '[', ']'))();
  const at = source.indexOf('var CUMULATIVE_QUESTIONS = [') + 'var CUMULATIVE_QUESTIONS = '.length;
  // eslint-disable-next-line no-new-func
  const cumulative = new Function('return ' + balanced(at, '[', ']'))();
  return { banks, cumulative };
}
const { banks: BANKS, cumulative: CQ } = quizBanks();
const orderOf = (key, n) => (M && M.optionOrder ? M.optionOrder(key, n) : [...Array(n).keys()]);

describe('SwimLab model is exported', () => {
  it('exposes the functions the labs run on', () => {
    expect(M, 'window.StemLab.SwimLabModel').toBeTruthy();
    for (const fn of ['ripStart', 'ripStep', 'ripRun', 'ripIsSafe', 'coldBest', 'rescueBest', 'rescueWhy', 'floatAt', 'strokeAt', 'optionOrder', 'labStatus']) {
      expect(typeof M[fn], fn).toBe('function');
    }
  });
});

describe('Rip Escape: the model never rewards swimming against the current', () => {
  const scenarios = M ? M.rip.scenarios : [];

  it('keeps every scenario inside the ranges the Rip Currents module cites', () => {
    expect(scenarios.length).toBe(3);
    for (const sc of scenarios) {
      expect(sc.widthFt, sc.id + ' width').toBeGreaterThanOrEqual(10);
      expect(sc.widthFt, sc.id + ' width').toBeLessThanOrEqual(30);
      expect(sc.currentFt, sc.id + ' speed').toBeLessThanOrEqual(8);
      expect(sc.endFt, sc.id + ' end').toBeGreaterThanOrEqual(150);
      expect(sc.endFt, sc.id + ' end').toBeLessThanOrEqual(300);
      // "The current is faster than you can swim": never a rip the model swimmer can beat.
      expect(sc.currentFt, sc.id + ' current vs swimmer').toBeGreaterThanOrEqual(M.rip.swimFt);
    }
  });

  it.each(['narrow', 'medium', 'wide'])('%s: straight at the beach runs out of energy and is not a safe run', (id) => {
    const s = M.ripRun(id, 'against');
    expect(s.outcome).toBe('spent');
    expect(s.e).toBe(0);
    expect(s.y).toBeGreaterThanOrEqual(M.rip.startFt);   // no closer than the start
    expect(M.ripIsSafe(s)).toBe(false);
  });

  it.each(['narrow', 'medium', 'wide'])('%s: along the beach, then in, gets home with the most energy', (id) => {
    const par = M.ripRun(id, 'parallel'), flo = M.ripRun(id, 'float'), ag = M.ripRun(id, 'against');
    expect(par.outcome).toBe('shore');
    expect(par.fightSec).toBe(0);
    expect(M.ripIsSafe(par)).toBe(true);
    expect(flo.outcome).toBe('shore');
    expect(M.ripIsSafe(flo)).toBe(true);
    expect(par.e).toBeGreaterThan(flo.e);
    expect(flo.e).toBeGreaterThan(ag.e);
    // Floating is carried to the end of the rip and no farther (it pulls out, not under).
    expect(Math.max(...flo.hist.map((p) => p.y))).toBeLessThanOrEqual(M.rip.scenarios.find((x) => x.id === id).endFt + 8);
  });

  it('one step against the current never gains ground, and costs four times a steady step', () => {
    for (const sc of scenarios) {
      const start = M.ripStart(sc.id);
      const fought = M.ripStep(start, 'in');
      expect(fought.y, sc.id).toBeGreaterThanOrEqual(start.y);
      expect(fought.last.fight).toBe(M.rip.stepSec);
      const side = M.ripStep(start, 'right');
      expect(start.e - fought.e).toBe((start.e - side.e) * (M.rip.costFight / M.rip.costSteady));
      const floated = M.ripStep(start, 'float');
      expect(floated.e).toBe(start.e);                     // already full: floating costs nothing
      expect(floated.y - start.y).toBe(sc.currentFt * M.rip.stepSec);
    }
  });

  it('holds its invariants over 3,000 random runs', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const acts = ['in', 'left', 'right', 'float'];
    for (let run = 0; run < 3000; run++) {
      const sc = scenarios[run % 3];
      let s = M.ripStart(sc.id);
      let foughtEver = false, guard = 0;
      while (!s.outcome && guard++ < 200) {
        const a = acts[Math.floor(rnd() * 4)];
        const inLane = Math.abs(s.x) < sc.widthFt / 2;
        const next = M.ripStep(s, a);
        if (next.last.fight > 0) foughtEver = true;
        if (a === 'in' && inLane && M.ripInCurrent(sc, s.x, s.y)) expect(next.last.fight).toBeGreaterThan(0);
        expect(next.e).toBeGreaterThanOrEqual(0);
        expect(next.e).toBeLessThanOrEqual(100);
        expect(next.y).toBeGreaterThanOrEqual(0);
        expect(Math.abs(next.x)).toBeLessThanOrEqual(M.rip.halfSceneFt);
        expect(next.t).toBe(s.t + next.last.sec);
        s = next;
      }
      expect(s.outcome, 'every run ends').toBeTruthy();
      expect(M.ripValid(s, sc.id)).toBe(true);
      if (foughtEver) expect(M.ripIsSafe(s), 'a run that fought the current is never "safe"').toBe(false);
      if (s.outcome === 'spent') expect(M.ripIsSafe(s)).toBe(false);
      if (s.outcome === 'shore' && !foughtEver) expect(M.ripIsSafe(s)).toBe(true);
    }
  });

  it('floating the whole time is carried only to the end of the rip, keeps all its energy, and ends as a safe run', () => {
    for (const sc of scenarios) {
      let s = M.ripStart(sc.id), guard = 0;
      while (!s.outcome && guard++ < 200) s = M.ripStep(s, 'float');
      expect(s.outcome, sc.id).toBe('afloat');
      expect(s.t).toBe(M.rip.maxSec);
      expect(s.e).toBe(100);
      expect(s.y).toBeLessThanOrEqual(sc.endFt + sc.currentFt);
      expect(M.ripIsSafe(s)).toBe(true);
    }
  });

  it('rejects a saved run that a step could not have produced', () => {
    expect(M.ripValid(null, 'narrow')).toBe(false);
    expect(M.ripValid({ sc: 'narrow' }, 'narrow')).toBe(false);
    expect(M.ripValid(M.ripStart('narrow'), 'wide')).toBe(false);
    expect(M.ripValid({ ...M.ripStart('narrow'), e: 'lots' }, 'narrow')).toBe(false);
    expect(M.ripValid({ ...M.ripStart('narrow'), outcome: 'won' }, 'narrow')).toBe(false);
    expect(M.ripValid({ ...M.ripStart('narrow'), hist: [{ t: 0, x: 0, y: NaN, e: 1 }] }, 'narrow')).toBe(false);
    expect(M.ripValid(M.ripStart('narrow'), 'narrow')).toBe(true);
  });
});

describe('Cold Water 1-1-10: the safe choice at each stage', () => {
  it('always floats first, then acts on how far the way out is', () => {
    for (const sc of M.cold.scenarios) expect(M.coldBest(sc.id, 0), sc.id).toBe('float');
    expect([0, 1, 2].map((s) => M.coldBest('dock', s))).toEqual(['float', 'exit', 'warm']);
    expect([0, 1, 2].map((s) => M.coldBest('kayak', s))).toEqual(['float', 'stay', 'help']);
    expect([0, 1, 2].map((s) => M.coldBest('canoe', s))).toEqual(['float', 'stay', 'huddle']);
  });

  it('only uses the distances the module itself gives (about 50 ft: swim; 200 ft: stay)', () => {
    expect(M.cold.nearExitFt).toBe(50);
    for (const sc of M.cold.scenarios) expect(sc.exitFt <= 50 || sc.exitFt === 200, sc.id + ' exitFt ' + sc.exitFt).toBe(true);
    // The wait-in-the-water positions need a life jacket (HELP and huddle are taught with one).
    for (const sc of M.cold.scenarios) if (sc.exitFt > 50) expect(sc.pfd, sc.id).toBe(true);
  });

  it.each(['dock', 'kayak', 'canoe'])('%s: the screen offers the safe choice at every stage and saves 3 of 3', (id) => {
    app = mount({ view: 'coldLab', coldLab: { sc: id, stage: 0, tries: {} } });
    for (let stage = 0; stage < 3; stage++) {
      const best = M.coldBest(id, stage);
      const offered = [...app.host.querySelectorAll('[data-cold-act]')].map((b) => b.getAttribute('data-cold-act'));
      expect(offered.length).toBe(3);
      expect(offered, 'stage ' + stage).toContain(best);
      app.clickSel('[data-cold-act="' + best + '"]');
      app.clickSel('[data-cold-next]');
    }
    expect(app.data.labResults.cold[id].firstTry).toBe(3);
    expect(app.data.badges.lab_cold).toBeTruthy();
    expect(app.xp).toEqual([['swimLab', 8, 'Cold Water 1-1-10: three safe choices']]);
  });

  it('a wrong first pick is explained, can be corrected, and does not count as a safe first choice', () => {
    app = mount({ view: 'coldLab', coldLab: { sc: 'dock', stage: 0, tries: {} } });
    app.clickSel('[data-cold-act="swim"]');
    expect(app.text()).toContain('Not the safe choice.');
    expect(app.has('[data-cold-next]')).toBe(false);      // the timeline does not move on a dangerous choice
    app.clickSel('[data-cold-act="float"]');
    app.clickSel('[data-cold-next]');
    app.clickSel('[data-cold-act="exit"]'); app.clickSel('[data-cold-next]');
    app.clickSel('[data-cold-act="warm"]'); app.clickSel('[data-cold-next]');
    expect(app.data.labResults.cold.dock.firstTry).toBe(2);
    expect(app.data.badges || {}).not.toHaveProperty('lab_cold');
    expect(app.xp).toEqual([]);
  });
});

describe('Rescue Ladder: first safe rung, never the water', () => {
  it('follows reach, then throw, then row, then do not go', () => {
    const best = Object.fromEntries(M.rescueScenes.map((s) => [s.id, M.rescueBest(s)]));
    expect(best).toEqual({ pool: 'reach', dock: 'reach', beach: 'throw', river: 'throw', lake: 'row', pond: 'row', surf: 'dontgo', ice: 'throw', quarry: 'dontgo' });
    for (const s of M.rescueScenes) {
      expect(M.rescueBest(s)).not.toBe('swim');
      expect(M.rescueWhy(s, 'swim'), s.id).toBe('swim');
      expect(M.rescueWhy(s, M.rescueBest(s))).toBe('ok');
    }
  });

  it('explains each wrong pick with the reason that is true of that scene', () => {
    const scene = (id) => M.rescueScenes.find((s) => s.id === id);
    expect(M.rescueWhy(scene('beach'), 'reach')).toBe('tooFarReach');
    expect(M.rescueWhy(scene('surf'), 'throw')).toBe('tooFarThrow');
    expect(M.rescueWhy(scene('pond'), 'throw')).toBe('nothingToThrow');
    expect(M.rescueWhy(scene('quarry'), 'row')).toBe('noBoat');
    expect(M.rescueWhy(scene('pool'), 'throw')).toBe('earlierRung');
    expect(M.rescueWhy(scene('river'), 'dontgo')).toBe('canHelp');
  });

  it('every round shows 6 different scenes with at least 3 different answers', () => {
    for (let round = 0; round < 9; round++) {
      const ids = M.rescueRound(round);
      expect(new Set(ids).size).toBe(6);
      const answers = new Set(ids.map((id) => M.rescueBest(M.rescueScene(id))));
      expect(answers.size, 'round ' + round).toBeGreaterThanOrEqual(3);
    }
  });

  it('a round of safe choices saves 6 of 6; "swim out" every time saves 0 and earns nothing', () => {
    app = mount({ view: 'rescueLab' });
    for (const id of M.rescueRound(0)) {
      expect([...app.host.querySelectorAll('[data-rescue-act]')].length).toBe(5);
      app.clickSel('[data-rescue-act="' + M.rescueBest(M.rescueScene(id)) + '"]');
      expect(app.text()).toContain('call 911');
      app.clickSel('[data-rescue-next]');
    }
    expect(app.data.labResults.rescue).toMatchObject({ best: 6, swam: 0, pass: true });
    expect(app.data.badges.lab_rescue).toBeTruthy();
    expect(app.xp).toEqual([['swimLab', 15, 'Rescue Ladder: 5 of 6 safe choices']]);
    app.teardown();
    // The first mount mirrored its results to localStorage; a fresh student starts without them.
    localStorage.clear(); delete window.__alloflowSwimLab;

    app = mount({ view: 'rescueLab' });
    for (let k = 0; k < 6; k++) { app.clickSel('[data-rescue-act="swim"]'); expect(app.text()).toContain('Do not swim out.'); app.clickSel('[data-rescue-next]'); }
    expect(app.data.labResults.rescue).toMatchObject({ best: 0, swam: 6, pass: false });
    expect(app.data.badges || {}).not.toHaveProperty('lab_rescue');
    expect(app.xp).toEqual([]);
  });

  it('5 of 6 does NOT pass when the one miss was "swim out", and the result says why', () => {
    const ids = M.rescueRound(0);
    const best = ids.map((id) => M.rescueBest(M.rescueScene(id)));
    expect(M.rescueGrade(ids, best)).toEqual({ score: 6, swam: 0, of: 6, pass: true });
    const oneWrong = best.slice(); oneWrong[1] = 'dontgo';
    expect(M.rescueGrade(ids, oneWrong)).toMatchObject({ score: 5, swam: 0, pass: true });
    const oneSwim = best.slice(); oneSwim[4] = 'swim';
    expect(M.rescueGrade(ids, oneSwim)).toMatchObject({ score: 5, swam: 1, pass: false });

    app = mount({ view: 'rescueLab' });
    for (let k = 0; k < 6; k++) { app.clickSel('[data-rescue-act="' + oneSwim[k] + '"]'); app.clickSel('[data-rescue-next]'); }
    expect(app.text()).toContain('Safe first choices: 5 of 6');
    expect(app.text()).toContain('A pass needs 5 safe choices and no swimming out.');
    expect(app.text()).not.toContain('never the water');
    expect(app.data.labResults.rescue).toMatchObject({ best: 5, swam: 1, pass: false });
    expect(app.data.badges || {}).not.toHaveProperty('lab_rescue');
    expect(app.xp).toEqual([]);
    expect(M.labStatus(app.data).rescue).toBe(false);
  });
});

describe('Why You Float: weight against water pushed aside', () => {
  it('floats exactly when the space taken up (liters) is more than the weight (kg)', () => {
    for (let air = 0; air <= M.float.airMaxL; air++) {
      for (let foam = 0; foam <= M.float.foamMaxL; foam++) {
        const f = M.floatAt(air, foam);
        expect(f.massKg).toBe(M.float.massKg);                       // foam and air never change the weight
        expect(f.volL).toBe(M.float.bodyL + air + foam);
        expect(f.pushKg).toBe(f.volL);                                // 1 liter of water = 1 kg
        expect(f.floats).toBe(f.volL > f.massKg);
        expect(f.spareKg).toBe(f.volL - f.massKg);
        if (f.floats) expect(f.abovePct).toBeCloseTo((1 - f.massKg / f.volL) * 100, 1);
        else expect(f.abovePct).toBe(0);
      }
    }
  });

  it('empty lungs sink, full lungs float just barely, and the challenge answer is the smallest foam that floats', () => {
    expect(M.floatAt(0, 0).floats).toBe(false);
    expect(M.floatAt(M.float.airMaxL, 0).floats).toBe(true);
    expect(M.floatAt(M.float.airMaxL, 0).abovePct).toBeLessThan(3);   // "barely positive buoyancy"
    const min = M.floatMinFoam(0);
    expect(M.floatAt(0, min).floats).toBe(true);
    expect(M.floatAt(0, min - 1).floats).toBe(false);
    expect(M.float.airMaxL).toBeGreaterThanOrEqual(4);
    expect(M.float.airMaxL).toBeLessThanOrEqual(6);                   // the module says roughly 4 to 6 liters
  });

  it('the challenge only accepts the smallest block, with empty lungs', () => {
    const min = M.floatMinFoam(0);
    app = mount({ view: 'floatLab', floatLab: { predicted: 'lighter', air: 0, foam: min + 2 } });
    app.clickSel('[data-float-check]');
    expect(app.text()).toContain('a smaller block also works');
    expect(app.data.labResults || {}).not.toHaveProperty('float');
    act(() => { app.update('swimLab', 'floatLab', { predicted: 'lighter', air: 0, foam: min }); });
    app.clickSel('[data-float-check]');
    expect(app.data.labResults.float.found).toBe(true);
    expect(app.xp).toEqual([['swimLab', 8, 'Why You Float: smallest foam block']]);
  });

  it('shows no sliders and no numbers before the prediction is made', () => {
    app = mount({ view: 'floatLab' });
    expect(app.has('#sw-float-foam')).toBe(false);
    expect(app.text()).not.toMatch(/\d+ kg/);
  });
});

describe('Stroke Efficiency: speed, drag and power come from one function', () => {
  const grid = [];
  if (M) for (let spm = M.stroke.spmMin; spm <= M.stroke.spmMax; spm += 5) for (let d10 = 6; d10 <= 22; d10++) grid.push([spm, d10 / 10]);

  it('speed = rate x distance per stroke; drag = k x speed x speed; power = drag x speed', () => {
    for (const [spm, dps] of grid) {
      const r = M.strokeAt(spm, dps, false);
      expect(r.speed).toBe(Math.round(spm / 60 * dps * 100) / 100);
      expect(r.drag).toBeCloseTo(M.stroke.k * r.speed * r.speed, 3);   // from the speed as shown
      expect(r.power).toBeCloseTo(r.drag * r.speed, 3);
      expect(M.strokeAt(spm, dps, true).drag).toBeCloseTo(2 * r.drag, 1);
    }
  });

  it('every pair of tries where the speed exactly doubles reads x 4.0 drag and x 8.0 power', () => {
    let pairs = 0;
    const rows = grid.map(([spm, dps]) => M.strokeAt(spm, dps, false));
    for (const a of rows) for (const b of rows) {
      if (Math.abs(b.speed - 2 * a.speed) >= 0.005) continue;
      pairs++;
      expect((Math.round((b.drag / a.drag) * 10) / 10).toFixed(1), a.speed + ' -> ' + b.speed).toBe('4.0');
      expect((Math.round((b.power / a.power) * 10) / 10).toFixed(1), a.speed + ' -> ' + b.speed).toBe('8.0');
      // ...and a student who divides the two PRINTED numbers gets the same ratio.
      expect((Number(M.fmt(b.drag)) / Number(M.fmt(a.drag))).toFixed(1), 'printed drag ' + M.fmt(a.drag) + ' -> ' + M.fmt(b.drag)).toBe('4.0');
      expect((Number(M.fmt(b.power)) / Number(M.fmt(a.power))).toFixed(1), 'printed power ' + M.fmt(a.power) + ' -> ' + M.fmt(b.power)).toBe('8.0');
    }
    expect(pairs).toBeGreaterThan(50);
  });

  it('the same speed made two ways meets the same drag (the three preset buttons)', () => {
    const short = M.strokeAt(60, 1.0, false), long = M.strokeAt(30, 2.0, false), both = M.strokeAt(60, 2.0, false);
    expect(short.speed).toBe(1);
    expect(long.speed).toBe(1);
    expect(short.drag).toBe(long.drag);
    expect(both.speed).toBe(2);
    expect(both.drag).toBe(4 * short.drag);
    expect(both.power).toBe(8 * short.power);
    expect(long.lapStrokes).toBeLessThan(short.lapStrokes);
  });

  it('is still a notebook: no readouts before predicting, no model statement before the student explains', () => {
    app = mount({ view: 'strokeHunt' });
    expect(app.has('#sh-spm')).toBe(false);
    expect(app.text()).not.toContain('The model behind this lab');
    app.teardown();
    const log = [{ spm: 30, dps: 1, hipsLow: false }, { spm: 60, dps: 1, hipsLow: false }, { spm: 60, dps: 2, hipsLow: false }];
    app = mount({ view: 'strokeHunt', strokeHunt: { predicted: 'x2', log } });
    expect(app.text()).not.toContain('The model behind this lab');
    expect(app.text()).not.toContain('optimal rate');
    expect(app.text()).toContain('x 4.0');                  // their own evidence, from their own log
    app.teardown();
    app = mount({ view: 'strokeHunt', strokeHunt: { predicted: 'x2', log, understood: true, explanation: 'Twice the speed made four times the drag in my own log.' } });
    expect(app.text()).toContain('The model behind this lab');
  });

  it('the Log button adds a row the student can see', () => {
    app = mount({ view: 'strokeHunt', strokeHunt: { predicted: 'x4' } });
    expect(app.host.querySelectorAll('tbody tr').length).toBe(0);
    app.clickSel('[data-stroke-log]');
    app.clickSel('[data-stroke-log]');
    expect(app.host.querySelectorAll('tbody tr').length).toBe(2);
    expect(app.data.strokeHunt.log.length).toBe(2);
  });
});

describe('Quiz answer positions on screen', () => {
  function shownSlots(list, keyOf) {
    const counts = [0, 0, 0, 0];
    list.forEach((q, i) => {
      const order = orderOf(keyOf(i), q.opts.length);
      expect([...order].sort()).toEqual([...Array(q.opts.length).keys()]);   // a permutation: nothing lost
      counts[order.indexOf(q.ans)]++;
    });
    return counts;
  }

  it('mini-quizzes: the right answer is not parked in one slot', () => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (const [mod, qs] of Object.entries(BANKS)) {
      const c = shownSlots(qs, (i) => 'mq-' + mod + '-' + i);
      c.forEach((n, k) => { counts[k] += n; });
      total += qs.length;
    }
    expect(total).toBeGreaterThanOrEqual(36);
    expect(Math.max(...counts) / total, 'shown slots ' + counts.join('/')).toBeLessThanOrEqual(0.4);
    expect(Math.min(...counts), 'shown slots ' + counts.join('/')).toBeGreaterThanOrEqual(4);
  });

  it('cumulative quiz: the right answer is not parked in one slot', () => {
    const counts = shownSlots(CQ, (i) => 'cq-' + i);
    expect(CQ.length).toBe(15);
    expect(Math.max(...counts) / CQ.length, 'shown slots ' + counts.join('/')).toBeLessThanOrEqual(0.4);
  });

  it('the screen really uses that order, and grading still follows the authored key', () => {
    app = mount({ view: 'cumulative' });
    const q = CQ[0];
    const shown = app.buttons().map((b) => b.textContent).filter((t) => q.opts.includes(t));
    expect(shown).toEqual(orderOf('cq-0', q.opts.length).map((i) => q.opts[i]));
    app.click(q.opts[q.ans]);
    expect(app.data.bigQuizState.score).toBe(1);
    expect(app.data.bigQuizState.picks[0]).toBe(q.ans);    // saved as the authored index
  });
});

describe('Quiz scoring: first try only', () => {
  const rip = BANKS.ripCurrents;
  const wrongOf = (q) => q.opts[(q.ans + 1) % q.opts.length];

  it('mini-quiz: wrong, "Try again", then the highlighted answer is practice, not credit', () => {
    app = mount({ view: 'ripCurrents' });
    app.click(wrongOf(rip[0]));
    app.click('Try again');
    app.click(rip[0].opts[rip[0].ans]);
    app.click('Next');
    for (let i = 1; i < rip.length; i++) { app.click(rip[i].opts[rip[i].ans]); app.click(i + 1 < rip.length ? 'Next' : 'See score'); }
    expect(app.text()).toContain((rip.length - 1) + ' / ' + rip.length);
    expect(app.data.badges || {}).not.toHaveProperty('mod_ripCurrents');
    expect(app.data.quizResults.ripCurrents.pct).toBe(75);
    expect(app.xp).toEqual([]);
  });

  it('mini-quiz: every question right on the first try earns the badge once, saves the score, credits XP once', () => {
    app = mount({ view: 'ripCurrents' });
    for (let i = 0; i < rip.length; i++) { app.click(rip[i].opts[rip[i].ans]); app.click(i + 1 < rip.length ? 'Next' : 'See score'); }
    expect(app.data.badges.mod_ripCurrents.label).toBe('Module: Rip Currents');
    expect(app.data.quizResults.ripCurrents).toMatchObject({ correct: 4, total: 4, pct: 100 });
    expect(app.xp).toEqual([['swimLab', 2, 'Module quiz passed']]);
    app.goTo('menu'); app.goTo('ripCurrents');
    expect(app.xp.length).toBe(1);
  });

  it('cumulative quiz: "Try again" cannot raise the score, and the miss stays on the review list', () => {
    app = mount({ view: 'cumulative' });
    app.click(wrongOf(CQ[0]));
    expect(app.data.bigQuizState.score).toBe(0);
    app.click('Try again');
    app.click(CQ[0].opts[CQ[0].ans]);
    expect(app.data.bigQuizState.score).toBe(0);
    expect(app.data.bigQuizState.picks[0]).toBe((CQ[0].ans + 1) % CQ[0].opts.length);
  });
});

describe('Progress is earned, not visited', () => {
  const VIEWS = ['menu', 'howSwimming', 'coldShock', 'ripCurrents', 'reachThrow', 'pfd', 'iceSafety', 'hypothermia', 'drainEntrap', 'autismWater',
    'cumulative', 'resources', 'ripLab', 'coldLab', 'rescueLab', 'floatLab', 'strokeHunt', 'menu'];

  it('opening every screen gives no XP, no badge and no lab result', () => {
    app = mount({});
    for (const v of VIEWS) { app.goTo(v); expect(app.text(), v).not.toContain('SwimLab error:'); expect(app.text().length, v).toBeGreaterThan(200); }
    expect(app.xp).toEqual([]);
    expect(app.data.badges || {}).toEqual({});
    expect(app.data.labResults || {}).toEqual({});
    expect(app.toasts).toEqual([]);
  });

  it('the quest that used to be "Visit 3 modules" now needs two saved lab results', () => {
    const hook = CFG.questHooks.find((q) => q.id === 'ws_first_module');
    const visitedAll = { modulesVisited: { coldShock: 'x', pfd: 'x', reachThrow: 'x', ripCurrents: 'x', iceSafety: 'x' } };
    expect(hook.check(visitedAll)).toBe(false);
    expect(hook.check({ labResults: { rip: { narrow: { safe: true } } } })).toBe(false);
    expect(hook.check({ labResults: { rip: { narrow: { safe: true } }, rescue: { best: 5, pass: true } } })).toBe(true);
    expect(hook.check({ labResults: { rip: { narrow: { safe: false } }, rescue: { best: 4, pass: false }, cold: { dock: { firstTry: 2 } } } })).toBe(false);
    // 5 of 6 with a "swim out" pick is saved as not passed, so it cannot count here either.
    expect(hook.check({ labResults: { rip: { narrow: { safe: true } }, rescue: { best: 5, swam: 1, pass: false } } })).toBe(false);
  });

  it('the menu counts labs and quizzes passed, and says "opened" for a page that was only opened', () => {
    app = mount({ modulesVisited: { coldShock: 'x', pfd: 'x', reachThrow: 'x' } });
    const shell = app.text();
    expect(shell).toContain('Labs passed0 / 5');
    expect(shell).toContain('Quizzes passed0 / 9');
    expect(shell).toContain('Modules opened3 / 9');
    expect(shell).toContain('0%');
    expect(app.host.querySelector('[data-swimlab-start]').getAttribute('data-swimlab-start')).toBe('ripLab');
    expect(app.host.querySelectorAll('[data-swimlab-lab]').length).toBe(5);
  });

  it('one tap from the menu lands on something to do', () => {
    app = mount({});
    app.clickSel('[data-swimlab-start]');
    expect(app.data.view).toBe('ripLab');
    expect(app.text()).toContain('Predict first');
  });

  it('Rip Escape on screen: fighting the current earns nothing; a run with no fighting earns the badge and XP once', () => {
    app = mount({ view: 'ripLab', ripLab: { sc: 'narrow', predicted: 'against' } });
    for (let i = 0; i < 12 && app.has('[data-rip-act="in"]'); i++) app.clickSel('[data-rip-act="in"]');
    expect(app.data.ripLab.run.outcome).toBe('spent');
    expect(app.text()).toContain('Not a safe run yet');
    expect(app.data.labResults.rip.narrow.safe).toBe(false);
    expect(app.xp).toEqual([]);
    app.click('Try another run');
    for (let i = 0; i < 3; i++) app.clickSel('[data-rip-act="right"]');
    for (let i = 0; i < 40 && app.has('[data-rip-act="in"]'); i++) app.clickSel('[data-rip-act="in"]');
    expect(app.data.ripLab.run.outcome).toBe('shore');
    expect(app.data.labResults.rip.narrow.safe).toBe(true);
    expect(app.data.badges.lab_rip).toBeTruthy();
    expect(app.xp).toEqual([['swimLab', 10, 'Rip Escape: safe run']]);
    // The result sentence and the numbers beside it describe the same run.
    const s = app.data.ripLab.run;
    expect(app.text()).toContain('back on the beach in ' + s.t + ' seconds with ' + s.e + ' of 100 energy left');
    const par = M.ripRun('narrow', 'parallel');
    expect(app.text()).toContain('on the beach in ' + par.t + ' seconds, with ' + par.e + ' of 100 energy left');
  });

  it('no action buttons before the prediction, and the comparison only after a finished run', () => {
    app = mount({ view: 'ripLab' });
    expect(app.has('[data-rip-act]')).toBe(false);
    expect(app.text()).not.toContain('The three plans in this model');
    app.click('Dive under the current');
    expect(app.has('[data-rip-act="in"]')).toBe(true);
    expect(app.text()).not.toContain('The three plans in this model');
  });
});

describe('Safety framing stays on every lab', () => {
  it.each(['ripLab', 'coldLab', 'rescueLab', 'floatLab', 'strokeHunt'])('%s shows the 911 banner and the "does not teach swimming" notice', (view) => {
    app = mount({ view });
    expect(app.text()).toContain('In a real emergency: call 911');
    expect(app.text()).toContain('does not teach swimming');
    expect(app.text()).toContain('find a certified Water Safety Instructor');
  });
});
