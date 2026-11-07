// City Lab 3D, wave 5 (2026-11-04): missions and feedback.
//
// What has to be TRUE: the mission strip above the board judges exactly as the
// Missions box does (judgeCond: the student's set AND the central one), live;
// a celebration comes ONLY from a Check that counts (never before Check, never
// for a pass under the student's set alone, never for an imported plan or a
// revealed strategy, never for a prediction, which gets a neutral chip right
// or wrong); the Suggested lens is a button that never switches by itself;
// sounds are off by default, made on a gesture only after they are switched
// on, quiet, and closed on unmount; the frames on the 3D model mark only what
// a row already counts, never a place to build; and the strip is keyboard
// complete with focus never lost.
//
// jsdom has no WebGL: the viewer is a stand-in shaped like the host's
// makeOrbitViewer, and the scene is the tool's real buildCityScene on a
// minimal Three.js. The real-WebGL half is tests/e2e/citylab-3d-w5.spec.ts.
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

let root = null;
let P = null;
let rec = null;
let errors = [];
let errSpy = null;
let mql = null;
let audio = null;

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
function installMotionQuery(initial) {
  const q = {
    matches: !!initial, media: '(prefers-reduced-motion: reduce)', listeners: new Set(),
    addEventListener(type, fn) { if (type === 'change') this.listeners.add(fn); },
    removeEventListener(type, fn) { if (type === 'change') this.listeners.delete(fn); },
    flip(v) { this.matches = v; [...this.listeners].forEach((fn) => fn({ matches: v, media: this.media })); }
  };
  window.matchMedia = (query) => (/reduced-motion/.test(query) ? q
    : { matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  return q;
}
// An AudioContext that records what is made, every gain set, and close().
function installAudio() {
  const log = { created: 0, closed: 0, oscillators: 0, gains: [], contexts: [] };
  function Param() { this.setValueAtTime = (v) => log.gains.push(v); this.exponentialRampToValueAtTime = (v) => log.gains.push(v); this.linearRampToValueAtTime = (v) => log.gains.push(v); }
  function Node() { this.connect = () => {}; this.start = () => {}; this.stop = () => {}; }
  class FakeAC {
    constructor() { log.created++; this.state = 'running'; this.currentTime = 0; this.destination = {}; log.contexts.push(this); }
    createOscillator() { log.oscillators++; const n = new Node(); n.frequency = { setValueAtTime() {} }; n.type = 'sine'; return n; }
    createGain() { const n = new Node(); n.gain = new Param(); return n; }
    close() { log.closed++; this.state = 'closed'; return Promise.resolve(); }
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
  mql = installMotionQuery(false);
  audio = installAudio();
  window.WebGLRenderingContext = function () {};
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
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
});

async function mount(opts) {
  opts = opts || {};
  const out = { latest: null, announced: [], award: vi.fn() };
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
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function focus(el) { await act(async () => { el.focus(); }); }
const strip = () => $('[data-citylab-strip]');
const stripCheck = () => $('[data-citylab-strip-check]');
const boxCheck = () => $$('button').find((b) => b.textContent.trim() === 'Check my plan' && !b.hasAttribute('data-citylab-strip-check'));
const passes = () => P.celebrationLog().filter((c) => c.kind === 'pass');
const rowsCued = () => P.celebrationLog().filter((c) => c.kind === 'row');
function tabStopsIn(scope) {
  return [...scope.querySelectorAll('button, select, input, textarea, [tabindex]')].filter((n) => {
    if (n.disabled || n.tabIndex < 0) return false;
    for (let p = n; p; p = p.parentElement) if (p.hidden || (p.style && p.style.display === 'none')) return false;
    return true;
  });
}
const units = (p, id) => { const u = P.USE_BY_ID[p.uses[id]]; return u ? u.units : 0; };

// Plans from the stage E suite: the park mission met; a bond plan that passes
// under optimistic only; and the homes without the civic buildings.
function parkPlan(town) {
  const ex = P.parkExample(town || 'riverbend');
  let p = P.basePlan(town || 'riverbend');
  for (const s of ex.steps) { p = P.setUse(p, s.id, 'park'); if (s.via) p = P.setEdge(p, s.id, s.via, 'path'); }
  return JSON.parse(JSON.stringify(p));
}
function westHomesPlan() {
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a, id) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  return pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
}
function bondTrapPlan() {
  const tg = P.missionTargets('riverbend');
  let p = westHomesPlan();
  for (const id of P.allParcelIds()) {
    if (P.scorecard(p, 'central').tier2.capitalCost > tg.bond) break;
    if (p.uses[id] === 'field') p = P.setUse(p, id, 'civic');
  }
  return JSON.parse(JSON.stringify(Object.assign(P.clonePlan(p), { assumptionSetId: 'optimistic' })));
}
const PARK_DONE = { 'riverbend:m_park': true };

// The tool's real scene on a minimal Three.js (no instancing, so every part is
// a plain mesh; the marks and the fireworks state live on S either way).
function fakeThree() {
  function V(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; this.set = function (a, b, c) { this.x = a; this.y = b; this.z = c; }; }
  return {
    BoxGeometry: function () {}, PlaneGeometry: function () {},
    Color: function (c) { this.hex = c; },
    MeshLambertMaterial: function (o) { this.color = o.color; },
    Mesh: function (g, mat) { this.material = mat; this.position = new V(); this.scale = new V(); this.rotation = {}; this.isMesh = true; },
    AmbientLight: function () {}, DirectionalLight: function () { this.position = new V(); },
    Vector3: V, Vector2: function (x, y) { this.x = x; this.y = y; }, DoubleSide: 2, FrontSide: 0
  };
}
function sceneFrom(push) {
  const S = { model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34 };
  P.buildCityScene(fakeThree(), S, push);
  S.data = push;
  return S;
}

describe('W5 - the strip judges exactly as the Missions box does', () => {
  it('shows the current mission\'s rows live, with judgeCond\'s verdict and the central-estimates note', async () => {
    load(true);
    const cases = [
      { p: JSON.parse(JSON.stringify(P.basePlan('riverbend'))), done: {}, mid: 'm_park' },
      { p: parkPlan(), done: {}, mid: 'm_park' },
      { p: bondTrapPlan(), done: PARK_DONE, mid: 'm_bond' }
    ];
    for (const c of cases) {
      await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: c.p, missionsDone: c.done } } });
      const st = P.missionStatus(c.mid, c.p);
      expect(strip().getAttribute('data-citylab-mission-numbers')).toBe(c.mid);
      const rows = $$('[data-citylab-strip-row]');
      expect(rows.map((r) => r.getAttribute('data-citylab-strip-row'))).toEqual(st.conds.map((x) => x.k));
      st.conds.forEach((cond, i) => {
        expect(rows[i].getAttribute('data-met')).toBe(String(cond.met));
        expect(rows[i].textContent).toContain(P.condSentence(cond));
        if (cond.standardOnly) expect(rows[i].textContent).toContain(P.condStandardNote(cond));
        expect(rows[i].textContent).toContain(cond.met ? 'Met:' : 'Not met yet:');
      });
      // The Missions box, after its own Check, prints the same verdicts.
      await click(boxCheck());
      const boxLines = $$('li').filter((li) => /^[✔○] /.test(li.textContent) && !li.hasAttribute('data-citylab-strip-row'));
      if (!st.met) {
        expect(boxLines.map((li) => li.textContent.startsWith('✔ '))).toEqual(st.conds.map((x) => x.met));
        $$('[data-citylab-strip-row]').forEach((r, i) => expect(boxLines[i].textContent).toContain(P.condSentence(st.conds[i])));
      }
      await unmount();
    }
    // The bond trap: the student's own number passes, the row does not.
    const trap = P.missionStatus('m_bond', bondTrapPlan()).conds.find((x) => x.k === 'cost');
    expect(trap.ownMet).toBe(true);
    expect(trap.met).toBe(false);
    expect(errors).toEqual([]);
  });

  it('sits above the stage on the 3D board, above the map on the map board, and absorbs the K-5 numbers', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const follows = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(strip(), $('#citylab-stage'))).toBe(true);
    expect(follows(strip(), $('[data-citylab-palette]'))).toBe(true);
    await unmount();
    await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true } } });
    expect(follows(strip(), $('#citylab-parcel-A1'))).toBe(true);
    await unmount();
    await mount({ ctx: { gradeBand: 'k2' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($$('[data-citylab-mission-numbers]')).toHaveLength(1);
    expect(strip().textContent).toContain('Mission 1: Fix park access');
    // 9-12 open on the full brief: no missions. W6: the brief has a strip of
    // its own now (tests/citylab_3d_w6.test.js), with no mission numbers.
    await unmount();
    await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect(strip().getAttribute('data-citylab-strip-kind')).toBe('brief');
    expect($$('[data-citylab-mission-numbers]')).toHaveLength(0);
  });
});

describe('W5 - celebrations only for a Check that counts', () => {
  it('nothing before Check, even with a passing plan on screen; then exactly one, said once', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    expect($$('[data-citylab-strip-row]').every((r) => r.getAttribute('data-met') === 'true')).toBe(true);
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect(rec.pushes.length).toBeGreaterThan(0);
    expect(rec.pushes.every((p) => p.celebrate === null)).toBe(true);
    const said = m.announced.length;
    await click(stripCheck());
    expect(passes()).toHaveLength(1);
    expect(passes()[0].mid).toBe('m_park');
    const banner = $('[data-citylab-celebrate]');
    expect(banner.getAttribute('data-citylab-celebrate')).toBe('fireworks');
    expect(banner.textContent).toContain('Mission complete: Fix park access');
    expect(banner.textContent).toContain('Fireworks over the town');
    expect(banner.getAttribute('role')).toBe(null);
    expect(last(rec.pushes).celebrate && last(rec.pushes).celebrate.token).toBeTruthy();
    expect(m.announced.length - said).toBe(1);
    expect(m.award.mock.calls.filter((c) => c[0] === 'citylab_mission_riverbend_m_park')).toHaveLength(1);
    // Reduced motion: the same pass, a still banner, no fireworks sentence.
    await act(async () => { mql.flip(true); });
    expect($('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('banner');
    expect($('[data-citylab-celebrate]').textContent).not.toContain('Fireworks');
    expect(errors).toEqual([]);
  });

  it('none when only the student\'s own set passes, and the strip says why', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: bondTrapPlan(), missionsDone: PARK_DONE } } });
    expect(strip().getAttribute('data-citylab-mission-numbers')).toBe('m_bond');
    await click(stripCheck());
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect(rec.pushes.every((p) => p.celebrate === null)).toBe(true);
    expect($('[data-citylab-strip-result]').getAttribute('data-citylab-strip-result')).toBe('standard_only');
    expect(strip().textContent).toContain('every mission is also checked under the central estimates');
    expect((m.latest._cityLab.missionsDone || {})['riverbend:m_bond']).toBeUndefined();
    expect(m.award).not.toHaveBeenCalled();
  });

  it('none for an imported plan, which still completes, quietly and with no XP', async () => {
    load(true);
    const p = Object.assign(parkPlan(), { imported: true });
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p } } });
    await click(stripCheck());
    expect(m.latest._cityLab.missionsDone['riverbend:m_park']).toBe(true);
    expect(m.award).not.toHaveBeenCalled();
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect($('[data-citylab-mission-pass="quiet"]').textContent).toContain('earns no XP');
    expect(rec.pushes.every((x) => x.celebrate === null)).toBe(true);
  });

  it('none after "Show one way": the demonstration is the revealed text, and the pass is quiet', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: P.basePlan('riverbend'), teacher: { allowReveal: true } } } });
    expect($$('#root button').some((b) => b.textContent.trim() === 'Show one way to do it')).toBe(false);
    await click(stripCheck());
    await click(stripCheck());
    const reveal = $$('[data-citylab-strip-bar="actions"] button').find((b) => b.textContent.trim() === 'Show one way to do it');
    expect(reveal).toBeTruthy();
    const copyReveal = 'One way: put a park on open land';
    expect(strip().textContent).not.toContain(copyReveal);
    await click(reveal);
    expect(strip().textContent).toContain(copyReveal);
    expect(passes()).toEqual([]);
    await unmount();
    const m2 = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan(),
      missions: { riverbend: { m_park: { checks: 2, revealed: true } } } } } });
    await click(stripCheck());
    expect(m2.latest._cityLab.missionsDone['riverbend:m_park']).toBe(true);
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect($('[data-citylab-mission-pass="quiet"]').textContent).toContain('earns no XP now');
    expect(m.award).not.toHaveBeenCalled();
  });

  it('none on a prediction: right or wrong, the result is the same neutral chip', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, predictEvery: true } } });
    const chips = [];
    for (const [id, guess] of [['A9', 0], ['A10', 1]]) {
      const cell = $('#citylab-parcel-' + id);
      await focus(cell);
      await key(cell, '6');
      const dirs = $$('[aria-label="Your prediction. Choosing one applies the change and shows what happened."] button');
      expect(dirs).toHaveLength(3);
      await click(dirs[guess]);                     // housing raises C: "up" is right, "down" is wrong
      const chip = $('[data-citylab-predict-chip]');
      chips.push({ attr: chip.getAttribute('data-citylab-predict-chip'), cls: chip.className, style: chip.getAttribute('style'), text: chip.textContent });
    }
    expect(chips[0].text).toContain('and it went');                 // the match wording
    expect(chips[1].text).toContain('It actually went');            // the differ wording
    expect(chips[0].attr).toBe('neutral');
    expect(chips[1].attr).toBe('neutral');
    expect(chips[1].cls).toBe(chips[0].cls);
    expect(chips[1].style).toBe(chips[0].style);
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect(rec.pushes.every((x) => x.celebrate == null)).toBe(true);
  });

  it('the gate itself: only met under both sets, own plan, no reveal', () => {
    load(false);
    const ok = { met: true, standardOnly: false };
    const own = { imported: false };
    expect(P.missionCelebrates(ok, {}, own)).toBe(true);
    expect(P.missionCelebrates({ met: false, standardOnly: true }, {}, own)).toBe(false);
    expect(P.missionCelebrates({ met: false, standardOnly: false }, {}, own)).toBe(false);
    expect(P.missionCelebrates(ok, {}, { imported: true })).toBe(false);
    expect(P.missionCelebrates(ok, { revealed: true }, own)).toBe(false);
    expect(P.missionCelebrates(null, {}, own)).toBe(false);
    // And it agrees with the model on the real plans.
    expect(P.missionCelebrates(P.missionStatus('m_park', parkPlan()), {}, parkPlan())).toBe(true);
    expect(P.missionCelebrates(P.missionStatus('m_bond', bondTrapPlan()), {}, bondTrapPlan())).toBe(false);
  });
});

describe('W5 - a row turning met', () => {
  it('gets a small "Just met" cue from the student\'s own change, never on mount, and no announcement of its own', async () => {
    load(true);
    const full = parkPlan();
    const ex = P.parkExample('riverbend');
    const lastPark = ex.steps[ex.steps.length - 1].id;
    const almost = JSON.parse(JSON.stringify(P.setUse(full, lastPark, 'field')));
    expect(P.missionStatus('m_park', almost).met).toBe(false);
    const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, plan: almost } } });
    expect($('[data-citylab-row-cue]')).toBe(null);
    expect(rowsCued()).toEqual([]);
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    const said = m.announced.length;
    const cell = $('#citylab-parcel-' + lastPark);
    await focus(cell);
    await key(cell, 'Enter');
    expect(plan(m).uses[lastPark]).toBe('park');
    expect($('[data-citylab-strip-row="park"]').getAttribute('data-met')).toBe('true');
    expect($('[data-citylab-row-cue="park"]').textContent).toBe('Just met');
    expect(rowsCued()).toHaveLength(1);
    expect(m.announced.length - said).toBe(1);                   // the edit's own delta, nothing more
    expect(m.announced.join(' ')).not.toContain('Just met');
    // A row met is not a mission passed: that is Check's alone.
    expect(passes()).toEqual([]);
    expect((m.latest._cityLab.missionsDone || {})['riverbend:m_park']).toBeUndefined();
  });
});

describe('W5 - the Suggested lens is a button, never a switch', () => {
  it('maps each mission to its lens or readout', () => {
    load(false);
    const want = { m_park: 'park', m_runoff: 'rain', m_heat: 'heat' };
    P.SCENARIO_IDS.forEach((town) => {
      Object.keys(want).forEach((mid) => expect(P.missionLens(mid, town)).toEqual({ lens: want[mid], readout: null }));
      expect(P.missionLens('m_bond', town)).toEqual({ lens: null, readout: 'cost' });
      const sc = P.SCENARIOS[town];
      expect(P.missionLens('m_town', town)).toEqual(sc.modelsWater ? { lens: null, readout: 'water' }
        : sc.modelsSeaRise ? { lens: 'flood', readout: null } : { lens: 'use', readout: null });
    });
  });

  it('leaves the lens alone through mount, Check and edits, and changes it only when pressed, focus kept', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    const lensNow = () => $('[data-citylab-lens-bar]').getAttribute('data-citylab-lens-bar');
    expect(lensNow()).toBe('use');
    await click(stripCheck());                                     // a pass, fireworks and all
    expect(lensNow()).toBe('use');
    expect(strip().getAttribute('data-citylab-mission-numbers')).toBe('m_park');   // the strip stays on the mission it passed
    let btn = $('[data-citylab-strip-lens]');
    expect(btn.getAttribute('data-citylab-strip-lens')).toBe('park');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(rec.pushes.every((p) => !p.lens || p.lens.lens === 'use')).toBe(true);
    await focus(btn);
    await click(btn);
    btn = $('[data-citylab-strip-lens]');
    expect(lensNow()).toBe('park');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(btn);
    expect(m.latest._cityLab.lens).toBe('park');
  });

  it('gives the bond a cost readout instead, with the scorecard\'s own lines', async () => {
    load(true);
    const p = JSON.parse(JSON.stringify(westHomesPlan()));
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p, missionsDone: PARK_DONE } } });
    expect($('[data-citylab-strip-lens]')).toBe(null);
    const btn = $('[data-citylab-strip-readout]');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await click(btn);
    const body = $('[data-citylab-strip-readout-body="cost"]');
    const lines = P.scorecard(p, p.assumptionSetId).costLines;
    expect(lines.length).toBeGreaterThan(0);
    expect(body.querySelectorAll('li')).toHaveLength(lines.length);
    lines.forEach((l) => expect(body.textContent).toContain(l.label));
    expect($('[data-citylab-lens-bar]').getAttribute('data-citylab-lens-bar')).toBe('use');
  });
});

describe('W5 - sounds', () => {
  it('are off by default: mounting, pressing, keys and a Check make no AudioContext', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    await act(async () => { $('#root > div').dispatchEvent(new window.Event('pointerdown', { bubbles: true })); });
    await key(stripCheck(), 'Enter');
    await click(stripCheck());
    expect(passes()).toHaveLength(1);
    const sw = $$('#citylab-options button').find((b) => b.textContent.trim() === 'Sounds');
    expect(sw.getAttribute('aria-pressed')).toBe('false');
    expect(audio.created).toBe(0);
  });

  it('switched on: one context, made on that press; quiet tones beside text; closed on unmount and when switched off', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    await click($('#citylab-options-toggle'));
    const sw = () => $$('#citylab-options button').find((b) => b.textContent.trim() === 'Sounds');
    await click(sw());
    expect(sw().getAttribute('aria-pressed')).toBe('true');
    expect(audio.created).toBe(1);
    expect(last(m.announced)).toContain('Every sound is also written on screen');
    const before = audio.oscillators;
    await click(stripCheck());
    expect(audio.oscillators).toBeGreaterThan(before);              // the pass tones...
    expect($('[data-citylab-celebrate]')).toBeTruthy();            // ...beside the words
    expect(audio.created).toBe(1);
    expect(Math.max(...audio.gains)).toBeLessThanOrEqual(0.1);
    expect(P.CUE_GAIN).toBeLessThanOrEqual(0.1);
    await click(sw());                                            // off: closed at once
    expect(audio.closed).toBe(1);
    await click(sw());
    expect(audio.created).toBe(2);
    await unmount();
    expect(audio.closed).toBe(2);
    expect(audio.contexts.every((c) => c.state === 'closed')).toBe(true);
  });

  it('a saved "on" waits for the first gesture inside the tool before it makes the context', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, soundOn: true } } });
    expect(audio.created).toBe(0);
    await act(async () => { $('[data-citylab-strip]').dispatchEvent(new window.Event('pointerdown', { bubbles: true })); });
    expect(audio.created).toBe(1);
    await act(async () => { $('[data-citylab-strip]').dispatchEvent(new window.Event('pointerdown', { bubbles: true })); });
    expect(audio.created).toBe(1);
    await unmount();
    expect(audio.closed).toBe(1);
  });
});

describe('W5 - mission progress on the 3D model', () => {
  // Homes on served fields, homes no road reaches, a park: every kind of parcel.
  function partialPlan(town) {
    let p = P.basePlan(town);
    const served = P.servedParcels(p);
    const fields = P.allParcelIds().filter((id) => p.uses[id] === 'field' && served[id]);
    p = P.setUse(p, fields[0], 'housing_mid');
    p = P.setUse(p, fields[1], 'mixed');
    if (fields[2]) p = P.setUse(p, fields[2], 'park');
    const lonely = P.allParcelIds().find((id) => p.uses[id] === 'field' && !P.servedParcels(p)[id]);
    if (lonely) p = P.setUse(p, lonely, 'housing_low');
    return p;
  }

  it('frames only what a row already counts: never open land, never the worked example\'s answer', () => {
    load(false);
    let checked = 0;
    P.SCENARIO_IDS.forEach((town) => {
      const answers = new Set(P.parkExample(town).steps.map((s) => s.id));
      [P.basePlan(town), partialPlan(town)].forEach((p) => {
        const served = P.servedParcels(p), base = P.basePlan(town);
        const open = new Set(P.servedOpenParcels(p));
        const parkYes = P.lensCells(p, p.assumptionSetId, 'park').cells;
        P.MISSION_IDS.forEach((mid) => {
          const mk = P.missionMarks(p, mid);
          expect(mk.kind).toBe(mid === 'm_park' ? 'park' : 'homes');
          mk.ids.forEach((id) => {
            expect(units(p, id), town + ' ' + mid + ' ' + id).toBeGreaterThan(0);
            expect(served[id]).toBe(true);
            expect(open.has(id)).toBe(false);
            // The worked example's answer parcels hold no homes until a student builds them.
            expect(answers.has(id) && ['field', 'farm', 'park'].indexOf(p.uses[id]) !== -1).toBe(false);
            checked++;
          });
          // Exactly the scorecard's own count, nothing more.
          if (mk.kind === 'park') {
            expect(mk.ids).toEqual(P.allParcelIds().filter((id) => parkYes[id].glyph === 'yes'));
          } else {
            expect(mk.ids).toEqual(P.allParcelIds().filter((id) => served[id] && units(p, id) > units(base, id)));
          }
        });
      });
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('rides in the push, the scene frames exactly those, and a closed strip frames none', async () => {
    load(true);
    const p = JSON.parse(JSON.stringify(partialPlan('riverbend')));
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p, missionsDone: PARK_DONE } } });
    const want = P.missionMarks(p, 'm_bond').ids;
    expect(want.length).toBeGreaterThan(0);
    const push = last(rec.pushes);
    expect(push.marks).toEqual(want);
    const S = sceneFrom(push);
    S.tick(16);
    expect(S.cityMarkIds).toEqual(want);
    expect(strip().textContent).toContain('a thin green frame marks each of the ' + want.length + ' parcels');
    // Marks are data, not geometry: they are not in the scene signature.
    await click($('#citylab-strip-toggle'));
    expect(last(rec.pushes).marks).toBe(null);
    expect(last(rec.pushes).sig).toBe(push.sig);
  });
});

describe('W5 - fireworks in the scene', () => {
  function push(extra) {
    const p = parkPlan();
    return Object.assign({ massing: P.buildMassing(p, 'central', null), living: P.livingCity(p, 'central'), theme: 'light', motion: true }, extra);
  }
  it('play for a fresh celebration on a moving board, keep the scene drawing, and end on their own', () => {
    load(false);
    const S = sceneFrom(push({ celebrate: { token: 7, at: Date.now() } }));
    S.tick(1000);
    expect(S.cityFw).toBeTruthy();
    S.tick(1016); S.tick(1500);
    expect(S.cityFwFrames).toBeGreaterThan(1);
    expect(S.cityActive).toBe(true);
    expect(S.data.static).not.toBe(true);
    S.tick(1016 + P.FW_MS + 50);
    expect(S.cityFw).toBe(null);
    expect(S.cityFwDone).toBe(1);
    // The same token never replays.
    S.tick(5000);
    expect(S.cityFw).toBe(null);
  });
  it('never under reduced motion, on a still board or for a stale pass, and clear at once if reduced motion turns on', () => {
    load(false);
    mql.flip(true);
    let S = sceneFrom(push({ celebrate: { token: 1, at: Date.now() } }));
    S.tick(16);
    expect(S.cityFw == null).toBe(true);
    expect(S.cityFwSkipped).toBe(1);
    mql.flip(false);
    S = sceneFrom(push({ motion: false, celebrate: { token: 2, at: Date.now() } }));
    S.tick(16);
    expect(S.cityFw == null).toBe(true);
    S = sceneFrom(push({ celebrate: { token: 3, at: Date.now() - 5000 } }));
    S.tick(16);
    expect(S.cityFw == null).toBe(true);
    S = sceneFrom(push({ celebrate: { token: 4, at: Date.now() } }));
    S.tick(16); S.tick(32); S.tick(200);
    expect(S.cityFw).toBeTruthy();
    mql.flip(true);
    S.tick(216);
    expect(S.cityFw).toBe(null);
    expect(S.cityFwStopped).toBe(1);
    expect(S.cityActive).toBe(false);
    expect(S.data.static).toBe(true);
  });
});

describe('W5 - keyboard and focus', () => {
  it('is one tab stop per toolbar, arrows move, collapsing keeps focus, a pass moves focus to Next', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    const nav = $('[data-citylab-strip-bar="nav"]'), acts = $('[data-citylab-strip-bar="actions"]');
    expect(nav.getAttribute('role')).toBe('toolbar');
    expect(tabStopsIn(nav)).toHaveLength(1);
    expect(tabStopsIn(acts)).toHaveLength(1);
    expect(tabStopsIn(acts)[0]).toBe(stripCheck());
    const toggle = $('#citylab-strip-toggle');
    expect(tabStopsIn(nav)[0]).toBe(toggle);
    await focus(toggle);
    await key(toggle, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-citylab-strip-nav')).toBe('prev');
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement.id).toBe('citylab-strip-next');
    await key(document.activeElement, 'Home');
    expect(document.activeElement).toBe(toggle);
    // Collapse and expand: the same button keeps focus.
    await click(toggle);
    expect(strip().getAttribute('data-citylab-strip')).toBe('closed');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe($('#citylab-strip-toggle'));
    await click($('#citylab-strip-toggle'));
    expect(strip().getAttribute('data-citylab-strip')).toBe('open');
    expect(document.activeElement).toBe($('#citylab-strip-toggle'));
    // Check from the strip: the button goes with the passed mission, focus to Next.
    await focus(stripCheck());
    await click(stripCheck());
    expect(document.activeElement.id).toBe('citylab-strip-next');
    expect($('[data-citylab-celebrate]')).toBeTruthy();
    await click(document.activeElement);
    expect(strip().getAttribute('data-citylab-mission-numbers')).toBe('m_bond');
    expect(document.activeElement.id).toBe('citylab-strip-next');
    // Every strip button is a 44 px target.
    $$('[data-citylab-strip] button').forEach((b) => {
      expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(b.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
    });
    expect(errors).toEqual([]);
  });

  it('shows closed while the coach runs, and opens for this visit only', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    expect($('[data-citylab-coach]')).toBeTruthy();
    expect(strip().getAttribute('data-citylab-strip')).toBe('closed');
    await click($('#citylab-strip-toggle'));
    expect(strip().getAttribute('data-citylab-strip')).toBe('open');
    expect(m.latest._cityLab.stripClosed).toBeUndefined();
  });

  it('puts Inspect at the start of the Build row', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const row = $('[data-citylab-palette-row="build"]');
    expect(row.querySelector('[data-citylab-tool="inspect"]')).toBeTruthy();
    expect(row.querySelector('[data-citylab-palette-group="build"]')).toBeTruthy();
    expect($$('[data-citylab-palette-item]')[0].getAttribute('data-citylab-tool')).toBe('inspect');
    // Inspect is not inside the Build group's name.
    expect($('[data-citylab-palette-group="build"] [data-citylab-tool="inspect"]')).toBe(null);
  });
});

describe('W5 - every new string goes through the translator', () => {
  it('leaves no untranslated prose in the strip, its results or the Sounds switch', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    const found = new Set();
    const leaks = (where) => {
      const scope = [strip(), $('#citylab-options')].filter(Boolean);
      scope.forEach((sc) => {
        const walker = document.createTreeWalker(sc, window.NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const s = n.nodeValue.trim();
          if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
          if (/[a-z]{4,}/.test(s)) found.add(where + ': ' + s.slice(0, 80));
        }
        [...sc.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label'))
          .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1).forEach((s) => found.add(where + ' aria: ' + s.slice(0, 80)));
      });
    };
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: bondTrapPlan(), missionsDone: PARK_DONE } } });
    leaks('bond');
    await click(stripCheck());
    await click($('[data-citylab-strip-readout]'));
    await click($('#citylab-options-toggle'));
    leaks('bond-checked');
    await unmount();
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    await click(stripCheck());
    leaks('pass');
    await click($('#citylab-strip-toggle'));
    leaks('closed');
    expect([...found]).toEqual([]);
  });
});
