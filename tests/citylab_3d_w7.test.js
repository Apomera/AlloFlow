// City Lab 3D, wave 7 (2026-11-04): the five calls Aaron approved after the hunt.
//
// What has to be TRUE:
// 1. The brief's XP comes from Check my plan (the strip's, or the HUD's), once
//    per town, only when every required part is met under the student's set
//    AND the central one, never for an imported or device plan, never twice,
//    and a student who was paid under the old automatic rule keeps it. Nothing
//    pays, sets the quest flag (metAllHard), ticks Start here or announces on
//    its own any more: all of that waits for Check.
// 2. In full screen the keyboard can edit: Enter or Space on the model uses the
//    chosen tool on the selected parcel through the same path as a click (so
//    the prediction gate, the move budget, Undo and the announcements hold), a
//    HUD parcel picker moves the selection without touching the camera keys,
//    roads take the same two steps, and the model's name no longer sends the
//    student to a map the HUD covers.
// 3. Only the FIRST passing brief Check in a town sets off fireworks; later ones
//    show the banner (and the tone, only if Sounds are on).
// 4. Importing a plan cancels a change that waits for its prediction, and says so.
// 5. Undo and Redo never replay the "Just met" cue or its tone, and neither
//    does a teacher's scoring-set lock on mount.
//
// CITYLAB_FILE=<path> runs this suite against another copy (the wave's start
// copy, or a mutant) to show which tests fail on the old behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 90000, hookTimeout: 30000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
const STORE_KEY = 'allo_citylab_plan_v1';
const act = React.act || React.unstable_act;
const BRIEF_XP = 'citylab_brief_riverbend';

let root = null;
let P = null;
let rec = null;
let audio = null;
let errors = [];
let errSpy = null;

function hostLikeViewer() {
  return function () {
    let notify = null, node = null, gen = 0, status = 'idle';
    const api = {
      attach(host) {
        if (!host) {
          const g = ++gen; node = null; status = 'idle';
          Promise.resolve().then(() => { if (!node && gen === g) notify = null; });
          return;
        }
        if (node === host) return;
        const g = ++gen; node = host; api._set('loading');
        Promise.resolve().then(() => { if (gen === g && node === host) api._set('ready'); });
      },
      push(p) { rec.pushes.push(p); },
      onStatusChange(fn) { notify = fn; },
      status() { return status; },
      dispose() {},
      _set(s) { status = s; if (notify) notify(s); }
    };
    rec.viewer = api;
    return api;
  };
}
function installAudio() {
  const log = { created: 0, oscillators: 0 };
  function Node() { this.connect = () => {}; this.start = () => {}; this.stop = () => {}; }
  function Param() { this.setValueAtTime = () => {}; this.exponentialRampToValueAtTime = () => {}; }
  class FakeAC {
    constructor() { log.created++; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() { log.oscillators++; const n = new Node(); n.frequency = { setValueAtTime() {} }; return n; }
    createGain() { const n = new Node(); n.gain = new Param(); return n; }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  window.AudioContext = FakeAC;
  delete window.webkitAudioContext;
  return log;
}
function load(withViewer) {
  resetStemLab();
  delete window.__alloCityLabPure;
  rec = { pushes: [], viewer: null };
  if (withViewer) window.StemLab.makeOrbitViewer = hostLikeViewer();
  else delete window.StemLab.makeOrbitViewer;
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
}

beforeEach(() => {
  window.localStorage.removeItem(STORE_KEY);
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
  window.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.WebGLRenderingContext = function () {};
  audio = installAudio();
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
  Object.defineProperty(window.navigator, 'deviceMemory', { value: 8, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true, writable: true });
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  errSpy.mockRestore();
  delete window.matchMedia;
  delete window.WebGLRenderingContext;
  delete window.AudioContext;
  delete window.__alloStemFS;
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
});

async function mount(opts) {
  opts = opts || {};
  const out = { latest: null, announced: [], award: opts.award || vi.fn() };
  function App() {
    const [state, setState] = React.useState(opts.toolData || {});
    out.latest = state;
    return window.StemLab._registry.cityLab.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: out.award,
      announceToSR: (m) => out.announced.push(m),
      theme: 'light', gradeBand: 'g68'
    }, opts.ctx || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return out;
}
async function unmount() {
  if (root) await act(() => root.unmount());
  root = null;
  document.body.innerHTML = '<div id="root"></div>';
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const last = (arr) => arr[arr.length - 1];
const btn = (text) => $$('button').find((b) => b.textContent.trim() === text);
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function focus(el) { await act(async () => { el.focus(); }); }
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
const passes = () => P.celebrationLog().filter((c) => c.kind === 'pass');
const rowsCued = () => P.celebrationLog().filter((c) => c.kind === 'row');
const briefPaid = (m) => m.award.mock.calls.filter((c) => c[0] === BRIEF_XP);
const briefCheck = () => $('[data-citylab-strip-check="brief"]');
const pathBriefDone = (d, p) => P.learningPath('g912', {}, d, p).steps.find((s) => s.id === 'brief').done;
const sel = () => last(rec.pushes).selectedId;

// The stage E plans: the full brief met under both sets, and met only under
// the student's (optimistic) set.
function briefPlan() {
  const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(P.basePlan('riverbend'), homes, 'mixed');
  p = homes.reduce((a, id) => P.toggleGreenInfra(a, id), p);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  pairs.push(['D2', 'D1']);
  return JSON.parse(JSON.stringify(pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p)));
}
function briefTrapPlan() {
  let p = P.setUse(briefPlan(), 'D1', 'civic');
  const roads = [['F1', 'G1'], ['G1', 'H1'], ['F2', 'G2'], ['G2', 'H2'], ['F3', 'G3'], ['G3', 'H3'], ['H3', 'I3'],
    ['F4', 'G4'], ['G4', 'H4'], ['H4', 'I4'], ['F5', 'G5'], ['G5', 'H5'], ['H5', 'I5'], ['I5', 'J5']];
  for (const e of roads) {
    if (!P.constraintReport(p, 'central').allHardMet) break;
    p = P.setEdge(p, e[0], e[1], 'local');
  }
  return JSON.parse(JSON.stringify(Object.assign(P.clonePlan(p), { assumptionSetId: 'optimistic' })));
}
function parkPlan() {
  const ex = P.parkExample('riverbend');
  let p = P.basePlan('riverbend');
  for (const s of ex.steps) { p = P.setUse(p, s.id, 'park'); if (s.via) p = P.setEdge(p, s.id, s.via, 'path'); }
  return JSON.parse(JSON.stringify(p));
}
const brief912 = (extra) => ({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: Object.assign({ boardView: 'model', coachOff: true }, extra) } });

describe('W7 - the brief\'s XP comes from Check my plan', () => {
  it('nothing pays, flags, ticks or announces on mount or on the edit that meets the brief; the first Check does, once', async () => {
    load(true);
    // One edit short of the brief: A9 is still low-density housing, so the homes fall short.
    const full = briefPlan();
    const almost = JSON.parse(JSON.stringify(P.setUse(full, 'A9', 'housing_low')));
    expect(P.briefJudged(almost).allHardMet).toBe(false);
    const m = await mount(brief912({ plan: almost }));
    expect(briefPaid(m)).toHaveLength(0);
    // The student makes the last change on the map twin, with the mixed-use tool.
    await click($('#citylab-parcel-A9'));
    await click($('[data-citylab-tool="mixed"]'));
    const said0 = m.announced.length;
    await key($('#citylab-parcel-A9'), 'Enter');
    expect(plan(m).uses.A9).toBe('mixed');
    expect(P.briefJudged(plan(m)).allHardMet).toBe(true);
    // Met, but not checked: no XP, no quest flag, no path tick, and no announcement of its own.
    expect(briefPaid(m)).toHaveLength(0);
    expect(m.latest._cityLab.metAllHard).toBeUndefined();
    expect(pathBriefDone(m.latest._cityLab, plan(m))).toBe(false);
    expect(m.announced.slice(said0).join(' ')).not.toContain('brief is met');
    expect(m.announced.length - said0).toBe(1);                    // the edit's own delta
    // Check: paid once (20, with a reason), quest flag set, path ticked, ONE announcement.
    const said1 = m.announced.length;
    await click(briefCheck());
    expect(briefPaid(m)).toHaveLength(1);
    expect(briefPaid(m)[0][1]).toBe(20);
    expect(typeof briefPaid(m)[0][2]).toBe('string');
    expect(m.latest._cityLab.metAllHard).toBe(true);
    expect(m.latest._cityLab.xpAwarded[BRIEF_XP]).toBe(true);
    expect(pathBriefDone(m.latest._cityLab, plan(m))).toBe(true);
    expect(m.announced.length - said1).toBe(1);
    expect(last(m.announced)).toContain('checked your plan under your assumption set and under the central estimates');
    // Again, and after a reload: never twice.
    await click(briefCheck());
    expect(briefPaid(m)).toHaveLength(1);
    const saved = m.latest;
    await unmount();
    const m2 = await mount({ award: m.award, ctx: { gradeBand: 'g912' }, toolData: saved });
    await click(briefCheck());
    expect(briefPaid(m2)).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('the HUD\'s Check is the same door, and pays the same once', async () => {
    load(true);
    const m = await mount(brief912({ plan: briefPlan() }));
    expect(briefPaid(m)).toHaveLength(0);
    await click($('[data-citylab-cam-more]'));
    await click($('#citylab-fs-toggle'));
    const chk = $$('[data-citylab-hud-strip="brief"] button').find((b) => b.textContent.trim() === 'Check my plan');
    await click(chk);
    expect(briefPaid(m)).toHaveLength(1);
    expect(m.latest._cityLab.metAllHard).toBe(true);
    await click(chk);
    expect(briefPaid(m)).toHaveLength(1);
  });

  it('pays nothing for a pass under the student\'s set only, an imported plan or a device plan', async () => {
    load(true);
    const m1 = await mount(brief912({ plan: briefTrapPlan() }));
    await click(briefCheck());
    expect(briefPaid(m1)).toHaveLength(0);
    expect(m1.latest._cityLab.metAllHard).toBeUndefined();
    expect(pathBriefDone(m1.latest._cityLab, plan(m1))).toBe(false);
    await unmount();

    const m2 = await mount(brief912({ plan: Object.assign(briefPlan(), { imported: true }) }));
    expect(briefPaid(m2)).toHaveLength(0);
    await click(briefCheck());
    expect(briefPaid(m2)).toHaveLength(0);
    expect(m2.latest._cityLab.metAllHard).toBeUndefined();
    expect($('[data-citylab-mission-pass="quiet"]').textContent).toContain('earns no XP');
    await unmount();

    window.localStorage.setItem(STORE_KEY, JSON.stringify(briefPlan()));
    const m3 = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect(plan(m3).imported).toBe(true);
    await click(briefCheck());
    expect(briefPaid(m3)).toHaveLength(0);
    expect(m3.award).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it('a student paid under the old automatic rule keeps it: no second payment, the path stays ticked', async () => {
    load(true);
    const paid = { xpAwarded: { [BRIEF_XP]: true }, metAllHard: true };
    expect(pathBriefDone(paid, P.basePlan('riverbend'))).toBe(true);
    const m = await mount(brief912(Object.assign({ plan: briefPlan() }, paid)));
    await click(briefCheck());
    expect(briefPaid(m)).toHaveLength(0);
    expect(m.latest._cityLab.xpAwarded[BRIEF_XP]).toBe(true);
    expect(m.latest._cityLab.metAllHard).toBe(true);
    expect(pathBriefDone(m.latest._cityLab, plan(m))).toBe(true);
    expect(errors).toEqual([]);
  });

  it('the Start-here brief step ticks on a passing Check (or old pay), never on a plan that merely meets it', () => {
    load(false);
    const met = briefPlan();
    expect(pathBriefDone({}, met)).toBe(false);
    expect(pathBriefDone({ briefPassed: { riverbend: true } }, met)).toBe(true);
    expect(pathBriefDone({ briefPassed: { mesahollow: true } }, met)).toBe(false);
    expect(pathBriefDone({ xpAwarded: { [BRIEF_XP]: true } }, P.basePlan('riverbend'))).toBe(true);
  });
});

describe('W7 - fireworks for the first passing brief Check only', () => {
  it('the first pass sets off fireworks; later passes show the banner, and the tone only with Sounds on', async () => {
    load(true);
    const m = await mount(brief912({ plan: briefPlan() }));
    await click(briefCheck());
    expect($('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('fireworks');
    const fx1 = last(rec.pushes).celebrate;
    expect(fx1 && fx1.token).toBeTruthy();
    expect(passes()).toHaveLength(1);
    expect(audio.oscillators).toBe(0);                              // Sounds are off
    await click(briefCheck());
    const cel = $('[data-citylab-celebrate]');
    expect(cel.getAttribute('data-citylab-celebrate')).toBe('banner');
    expect(cel.textContent).toContain('checked under your assumption set and under the central estimates');
    expect(cel.textContent).not.toContain('Fireworks');
    expect(last(rec.pushes).celebrate).toBe(null);
    expect(passes()).toHaveLength(1);
    expect(audio.oscillators).toBe(0);
    // Sounds on: a later pass plays the pass tone (three notes), still no fireworks.
    await click(btn('Sounds'));
    const before = audio.oscillators;
    await click(briefCheck());
    expect(audio.oscillators - before).toBe(3);
    expect($('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('banner');
    expect(last(rec.pushes).celebrate).toBe(null);
    // A reload remembers the first pass.
    const saved = m.latest;
    await unmount();
    await mount({ ctx: { gradeBand: 'g912' }, toolData: saved });
    await click(briefCheck());
    expect($('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('banner');
    expect(last(rec.pushes).celebrate).toBe(null);
    expect(errors).toEqual([]);
  });
});

describe('W7 - importing cancels a waiting change', () => {
  it('the waiting change never reaches the imported plan, and the student is told', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, predictEvery: true } } });
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    await key($('#citylab-parcel-A9'), 'Enter');
    expect(plan(m).uses.A9).toBe('field');
    expect(document.body.textContent).toContain('Before you look');
    const file = P.setUse(P.basePlan('mesahollow'), 'H1', 'mixed');
    await click($('#citylab-tab-memo'));
    const input = $$('input[type="file"]').find((i) => /Import plan JSON/.test((i.closest('label') || {}).textContent || ''));
    Object.defineProperty(input, 'files', { value: [new window.File([JSON.stringify(file)], 'p.json', { type: 'application/json' })], configurable: true });
    const said = m.announced.length;
    await act(async () => {
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(plan(m).scenarioId).toBe('mesahollow');
    expect(plan(m).uses).toEqual(P.restorePlan(JSON.stringify(file)).uses);
    expect(plan(m).imported).toBe(true);
    await click($('#citylab-tab-design'));
    expect(document.body.textContent).not.toContain('Before you look');
    const heard = m.announced.slice(said).join(' ');
    expect(heard).toContain('The change that was waiting for your prediction was cancelled');
    expect(errors).toEqual([]);
  });
});

describe('W7 - "Just met" only for the student\'s own new change', () => {
  function almostPark() {
    const full = parkPlan();
    const ex = P.parkExample('riverbend');
    const lastPark = ex.steps[ex.steps.length - 1].id;
    return { plan: JSON.parse(JSON.stringify(P.setUse(full, lastPark, 'field'))), lastPark };
  }
  it('Undo and Redo never replay the cue or its tone', async () => {
    load(true);
    const { plan: almost, lastPark } = almostPark();
    const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, plan: almost, soundOn: true } } });
    await click(btn('Sounds'));                                      // off, then on again: a gesture makes the context
    await click(btn('Sounds'));
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    const cell = $('#citylab-parcel-' + lastPark);
    await focus(cell);
    const o0 = audio.oscillators;
    await key(cell, 'Enter');
    expect($('[data-citylab-row-cue="park"]')).toBeTruthy();
    expect(rowsCued()).toHaveLength(1);
    expect(audio.oscillators - o0).toBe(1);                          // the row tone
    await click(btn('Undo'));
    expect(plan(m).uses[lastPark]).toBe('field');
    expect($('[data-citylab-row-cue]')).toBe(null);
    const o1 = audio.oscillators;
    await click(btn('Redo'));
    expect(plan(m).uses[lastPark]).toBe('park');
    expect($('[data-citylab-strip-row="park"]').getAttribute('data-met')).toBe('true');
    expect($('[data-citylab-row-cue]')).toBe(null);
    expect(rowsCued()).toHaveLength(1);
    expect(audio.oscillators - o1).toBe(0);
    // A new change of the student's own still cues (here: undo, then make it again).
    await click(btn('Undo'));
    await key($('#citylab-parcel-' + lastPark), 'Enter');
    expect($('[data-citylab-row-cue="park"]')).toBeTruthy();
    expect(rowsCued()).toHaveLength(2);
    expect(errors).toEqual([]);
  });

  it('a teacher\'s scoring-set lock applied on mount is not "Just met"', async () => {
    load(true);
    // The brief plan plus a civic hall: inside the bond under central ($21M), over it
    // under conservative (x 1.2). Saved under conservative, the teacher locks central.
    const p = JSON.parse(JSON.stringify(Object.assign(P.setUse(briefPlan(), 'D1', 'civic'), { assumptionSetId: 'conservative' })));
    const cost = (set) => P.briefRows(Object.assign(P.clonePlan(p), { assumptionSetId: set })).find((r) => r.id === 'req_cost').met;
    expect(cost('conservative')).toBe(false);
    expect(cost('central')).toBe(true);
    const m = await mount(brief912({ plan: p, teacher: { scoreSet: 'central' } }));
    expect(plan(m).assumptionSetId).toBe('central');
    expect($('[data-citylab-strip-row="req_cost"]').getAttribute('data-met')).toBe('true');
    expect($('[data-citylab-row-cue]')).toBe(null);
    expect(rowsCued()).toEqual([]);
    expect(errors).toEqual([]);
  });
});

describe('W7 - keyboard editing in full screen', () => {
  async function enterFs() {
    await click($('[data-citylab-cam-more]'));
    await click($('#citylab-fs-toggle'));
    expect($('[data-citylab-hud="on"]')).toBeTruthy();
  }
  const hudTool = (id) => $('[data-citylab-hud-part="top"] [data-citylab-tool="' + id + '"]');
  const pick = (dir) => $('[data-citylab-hud-pick="' + dir + '"]');
  // From the selected parcel, how many presses right reach a field a road enters.
  function rightToField(p, from) {
    const served = P.servedParcels(p);
    const row = from.slice(1), cols = 'ABCDEFGHIJKL';
    for (let i = cols.indexOf(from[0]) + 1; i < cols.length; i++) {
      const id = cols[i] + row;
      if (p.uses[id] === 'field' && served[id]) return { id, n: i - cols.indexOf(from[0]) };
    }
    return null;
  }

  it('the stage says how, in full screen and out, without pointing at the covered map', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const out = $('#citylab-stage').getAttribute('aria-label');
    expect(out).toContain('Enter');
    await enterFs();
    const inFs = $('#citylab-stage').getAttribute('aria-label');
    expect(inFs).toContain('Enter or Space');
    expect(inFs).not.toMatch(/map beside/);
    expect(inFs).toContain('parcel buttons');
  });

  it('Enter and Space use the chosen tool on the selected parcel through the same path, with the move budget and Undo', async () => {
    load(true);
    const base = P.basePlan('riverbend');
    const start = P.SCENARIOS.riverbend.coreParcel;
    const target = rightToField(base, start);
    expect(target).toBeTruthy();
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: JSON.parse(JSON.stringify(P.startChallenge('riverbend', 12))) } } });
    await enterFs();
    await click(hudTool('park'));
    for (let i = 0; i < target.n; i++) await click(pick('right'));
    expect(sel()).toBe(target.id);
    expect(last(m.announced)).toContain('Selected ' + target.id);
    const stage = $('#citylab-stage');
    await focus(stage);
    await key(stage, 'Enter');
    expect(plan(m).uses[target.id]).toBe('park');
    expect(plan(m).editCount).toBe(1);
    expect(document.body.textContent).toContain('11 of 12 moves left');
    expect(last(m.announced)).toContain(target.id + ' set to Park');
    expect(document.activeElement).toBe(stage);
    // Undo in the HUD takes it back.
    await click($('[data-citylab-hud-part="pick"] [data-citylab-hud-undo]'));
    expect(plan(m).uses[target.id]).toBe('field');
    // Space does the same as Enter.
    await focus(stage);
    await key(stage, ' ');
    expect(plan(m).uses[target.id]).toBe('park');
    // The camera keys still turn the camera, and change nothing.
    const uses = JSON.stringify(plan(m).uses), rotY = last(rec.pushes).rotY;
    await key(stage, 'ArrowLeft');
    expect(last(rec.pushes).rotY).not.toBe(rotY);
    expect(JSON.stringify(plan(m).uses)).toBe(uses);
    expect(errors).toEqual([]);
  });

  it('the prediction gate holds: the change waits in the HUD and focus stays on the model', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, predictEvery: true } } });
    await enterFs();
    await click(hudTool('park'));
    const target = rightToField(P.basePlan('riverbend'), sel());
    for (let i = 0; i < target.n; i++) await click(pick('right'));
    const stage = $('#citylab-stage');
    await focus(stage);
    await key(stage, 'Enter');
    expect(plan(m).uses[target.id]).toBe('field');
    expect($('[data-citylab-hud-part="predict"]')).toBeTruthy();
    expect(last(m.announced)).toMatch(/not applied yet/);
    expect(document.activeElement).toBe(stage);
  });

  it('roads take two steps: Enter at the start, move, Enter at the next parcel', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    // Up to the top row, away from the old streets.
    for (let i = 0; i < 12; i++) await click(pick('up'));
    await click(hudTool('road'));
    const a = sel();
    expect(a.slice(1)).toBe('1');
    const stage = $('#citylab-stage');
    await focus(stage);
    await key(stage, 'Enter');
    expect($('[data-citylab-hud-part="top"]').textContent).toContain('next to ' + a);
    // A neighbour with no street to it yet.
    const base = P.basePlan('riverbend');
    const cols = 'ABCDEFGHIJKL', c = cols.indexOf(a[0]), r = +a.slice(1);
    const near = { left: c > 0 ? cols[c - 1] + r : null, up: r > 1 ? a[0] + (r - 1) : null, down: r < 12 ? a[0] + (r + 1) : null, right: c < 11 ? cols[c + 1] + r : null };
    const ek = (x, y) => (x < y ? x + '|' + y : y + '|' + x);
    const dir = Object.keys(near).find((k) => near[k] && !base.edges[ek(a, near[k])] && !P.isWater(near[k], base));
    expect(dir).toBeTruthy();
    await click(pick(dir));
    const b = sel();
    expect(b).toBe(near[dir]);
    await focus(stage);
    await key(stage, 'Enter');
    expect(plan(m).edges[ek(a, b)]).toBe('local');
    expect(last(m.announced)).toContain('Built a connection from ' + a + ' to ' + b);
    expect(errors).toEqual([]);
  });

  it('the picker says where it is, stops at the edge, and offers Apply for a tool (not for Inspect)', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    expect($('[data-citylab-hud-apply]')).toBe(null);
    const row = $('[data-citylab-hud-part="pick"]');
    expect(row.textContent).toContain(sel());
    for (let i = 0; i < 14; i++) await click(pick('up'));
    const top = sel();
    expect(top.slice(1)).toBe('1');
    await click(pick('up'));
    expect(sel()).toBe(top);
    expect(last(m.announced)).toContain('at the edge of the map');
    expect(pick('up').disabled).toBe(false);                         // focus never lost to a disabled button
    await click(hudTool('park'));
    expect($('[data-citylab-hud-apply]').textContent).toContain(top);
    $$('[data-citylab-hud-part="pick"] button').forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    expect(errors).toEqual([]);
  });

  it('every new string goes through the translator', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    await click(hudTool('park'));
    const found = [];
    const sc = $('[data-citylab-hud-part="pick"]');
    const walker = document.createTreeWalker(sc, window.NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const s = n.nodeValue.trim();
      if (s && s.indexOf('«') === -1 && s.indexOf('»') === -1 && /[a-z]{4,}/.test(s)) found.push(s);
    }
    [sc, ...sc.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label')).filter(Boolean)
      .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1).forEach((s) => found.push(s));
    expect(found).toEqual([]);
    expect($('#citylab-stage').getAttribute('aria-label').indexOf('«')).toBe(0);
  });
});
