// City Lab 3D, independent bug hunt (2026-11-04), after waves 1-6.
//
// Each test pins a defect a fresh tester found and proved on the wave-6 copy:
// focus falling to the page when a button leaves with what it did (the map's
// prediction card, a passing Check from the HUD or the Missions box, the last
// hint, Show one way); the page behind full screen staying reachable; a lost
// context in full screen leaving a blank stage with nothing to press; a code
// label on every parcel burying the high-contrast town (and trees hiding
// "Pr"); Redo and whole-plan changes moving the model under a change that
// waits for its prediction; and "1 more people figures" plural traps on the
// common paths.
//
// CITYLAB_FILE=<path> runs this suite against another copy (the hunt's start
// copy) to show each test fails on the old behaviour.
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
  delete window.__alloStemFS;
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
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const btn = (text) => $$('button').find((b) => b.textContent.trim() === text);
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function focus(el) { await act(async () => { el.focus(); }); }
// Click a button the way a keyboard user does: it has focus first.
async function press(el) { await focus(el); await click(el); }
const active = () => document.activeElement;
const onPage = () => !active() || active() === document.body;
const predictButtons = () => {
  const g = $$('[role="group"]').find((x) => /Your prediction/.test(x.getAttribute('aria-label') || ''));
  return g ? [...g.querySelectorAll('button')] : [];
};
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
function parkPlan(town) {
  const ex = P.parkExample(town || 'riverbend');
  let p = P.basePlan(town || 'riverbend');
  for (const s of ex.steps) { p = P.setUse(p, s.id, 'park'); if (s.via) p = P.setEdge(p, s.id, s.via, 'path'); }
  return JSON.parse(JSON.stringify(p));
}
async function enterFullscreen() {
  const more = $('[data-citylab-cam-more]');
  if (more.getAttribute('aria-expanded') !== 'true') await click(more);
  await click($('#citylab-fs-toggle'));
}
const hudOn = () => $('[data-citylab-hud]').getAttribute('data-citylab-hud') === 'on';

describe('Hunt - focus never falls to the page when a button leaves with what it did', () => {
  it('map board: answering or cancelling the prediction card puts focus back on the selected parcel', async () => {
    load(true);
    const core = () => P.SCENARIOS.riverbend.coreParcel;
    for (const which of ['up', 'cancel', 'skip']) {
      window.localStorage.removeItem(STORE_KEY);
      const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, predictEvery: true } } });
      const cell = $('#citylab-parcel-' + core());
      await focus(cell);
      await key(cell, '5');
      expect(predictButtons()).toHaveLength(3);
      if (which === 'up') await press(predictButtons()[0]);
      else if (which === 'cancel') await press(btn('Cancel this change'));
      else await press(btn('Skip, just apply it'));
      expect(predictButtons()).toHaveLength(0);
      expect(onPage(), which + ': focus fell to the page').toBe(false);
      expect(active().id).toBe('citylab-parcel-' + core());
      expect(plan(m).uses[core()]).toBe(which === 'cancel' ? P.basePlan('riverbend').uses[core()] : P.PALETTE_IDS[4]);
      await unmount();
    }
    expect(errors).toEqual([]);
  });

  it('full screen: a Check that passes in the HUD keeps focus in the HUD (on the model)', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    await enterFullscreen();
    expect(hudOn()).toBe(true);
    const check = $$('[data-citylab-hud-strip] button').find((b) => /Check my plan/.test(b.textContent));
    await press(check);
    expect($('[data-citylab-hud-pass]')).not.toBe(null);
    expect(onPage(), 'focus fell behind the full-screen view').toBe(false);
    expect(active().id).toBe('citylab-stage');
  });

  it('Missions box: a Check that passes moves focus to the next mission\'s Check', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: parkPlan() } } });
    const check = $$('button').find((b) => b.textContent.trim() === 'Check my plan' && !b.hasAttribute('data-citylab-strip-check')
      && !b.closest('[data-citylab-hud]'));
    await press(check);
    expect(onPage()).toBe(false);
    expect(active().id).toBe('citylab-missions-check');
    // It is mission 2's button now.
    expect(active().closest('li').textContent).toContain('2.');
  });

  it('the last hint and Show one way take their buttons away: focus goes to Check (strip and Missions box)', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    let guard = 0;
    while ($('[data-citylab-strip-hint]') && guard++ < 8) await press($('[data-citylab-strip-hint]'));
    expect(guard).toBeGreaterThan(1);
    expect(onPage(), 'strip: last hint').toBe(false);
    expect(active().id).toBe('citylab-strip-check');
    await unmount();

    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const boxHint = () => $$('button').find((b) => /^Show a hint/.test(b.textContent.trim()) && !b.hasAttribute('data-citylab-strip-hint'));
    guard = 0;
    while (boxHint() && guard++ < 8) await press(boxHint());
    expect(onPage(), 'Missions box: last hint').toBe(false);
    expect(active().id).toBe('citylab-missions-check');
    await unmount();

    for (const where of ['strip', 'box']) {
      await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, missions: { riverbend: { m_park: { checks: 2 } } } } } });
      const reveals = $$('button').filter((b) => /Show one way/.test(b.textContent));
      const r = reveals.find((b) => (where === 'strip') === !!b.closest('[data-citylab-strip]'));
      await press(r);
      expect(onPage(), where + ': Show one way').toBe(false);
      expect(active().id).toBe(where === 'strip' ? 'citylab-strip-check' : 'citylab-missions-check');
      await unmount();
    }
    expect(errors).toEqual([]);
  });
});

describe('Hunt - full screen: the page behind is inert, and given back', () => {
  function decorate() {
    const out = document.createElement('div');
    out.innerHTML = '<div id="outside"><button id="outside-btn">behind</button></div>'
      + '<div id="live" aria-live="polite"></div>'
      + '<div id="mixed"><button id="mixed-btn">behind too</button><p id="mixed-live" role="status"></p></div>'
      + '<div id="already" inert><button>was inert</button></div>';
    [...out.children].forEach((c) => document.body.appendChild(c));
  }
  it('makes everything outside the stage inert except live regions, and restores exactly that on exit and on unmount', async () => {
    load(true);
    decorate();
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($$('[inert]').map((n) => n.id)).toEqual(['already']);
    await enterFullscreen();
    expect(hudOn()).toBe(true);
    const fs = $('[data-citylab-hud="on"]');
    expect($('#outside').hasAttribute('inert')).toBe(true);
    expect($('#mixed-btn').hasAttribute('inert')).toBe(true);
    expect($('#live').hasAttribute('inert'), 'a live region stays live').toBe(false);
    expect($('#mixed').hasAttribute('inert'), 'the path to a live region stays').toBe(false);
    expect($('#mixed-live').hasAttribute('inert')).toBe(false);
    // Inside the tool: the twin map and the panels are covered too; the stage column is not.
    expect($('#citylab-parcel-A1').closest('[inert]')).not.toBe(null);
    expect(fs.closest('[inert]')).toBe(null);
    expect([...fs.querySelectorAll('[inert]')]).toEqual([]);
    // Escape leaves; everything this added is given back, nothing else.
    await key($('#citylab-stage'), 'Escape');
    expect(hudOn()).toBe(false);
    expect($$('[inert]').map((n) => n.id)).toEqual(['already']);
    expect(active().id).toBe('citylab-fs-toggle');
    // Leaving the tool while in full screen gives it back as well.
    await enterFullscreen();
    expect($('#outside').hasAttribute('inert')).toBe(true);
    await unmount();
    expect($$('[inert]').map((n) => n.id)).toEqual(['already']);
    expect(errors).toEqual([]);
  });

  it('a context lost in full screen leaves full screen, so the map and focus on it are reachable', async () => {
    load(true);
    // The host helper's fill-the-frame mode: a marker attribute, toggled.
    window.__alloStemFS = (el) => {
      if (el.hasAttribute('data-allo-fullscreen-active')) el.removeAttribute('data-allo-fullscreen-active');
      else el.setAttribute('data-allo-fullscreen-active', 'true');
    };
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFullscreen();
    await act(async () => { await Promise.resolve(); });
    expect(hudOn()).toBe(true);
    await focus($('#citylab-stage'));
    await act(async () => { rec.viewer._set('failed'); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const fsEl = $('[data-allo-fs-stage]');
    expect(fsEl.hasAttribute('data-allo-fullscreen-active'), 'still filling the screen with no HUD').toBe(false);
    expect(hudOn()).toBe(false);
    expect($('[data-citylab-3d-fallback="lost"]')).not.toBe(null);
    expect($$('[inert]')).toEqual([]);
    expect(active().id).toBe('citylab-parcel-' + P.SCENARIOS.riverbend.coreParcel);
  });
});

describe('Hunt - high contrast: codes that do not bury the town', () => {
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
  function pushFor(p, theme) {
    return { massing: P.buildMassing(p, 'central', null), living: P.livingCity(p, 'central'),
      lens: P.lensCells(p, 'central', 'use'), theme, motion: false, static: true };
  }
  function shown(S) {
    return S.cityCodes.specs.map((s, i) => (S.cityCodes.meshes[i].scale.x > 0.01 ? s.id : null)).filter(Boolean);
  }
  it('labels every parcel but the open fields, plus the selected and hovered ones; the codes clear the trees', () => {
    load(false);
    const p = JSON.parse(JSON.stringify(P.setUse(P.setUse(P.basePlan('riverbend'), 'D6', 'park'), 'E6', 'housing_mid')));
    const fields = P.allParcelIds().filter((id) => p.uses[id] === 'field');
    expect(fields.length).toBeGreaterThan(60);
    const S = { THREE: fakeThree(), model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34, rotX: 26 };
    const push = pushFor(p, 'contrast');
    P.buildCityScene(S.THREE, S, push);
    S.data = Object.assign({}, push, { selectedId: null, hoverId: null });
    S.tick(16);
    const quietOff = shown(S);
    expect(quietOff.length).toBe(P.allParcelIds().length - fields.length);
    expect(quietOff.some((id) => p.uses[id] === 'field')).toBe(false);
    // The selected field, and then a hovered one, show their code.
    S.data = Object.assign({}, push, { selectedId: fields[0], hoverId: fields[1] });
    S.tick(32);
    const focused = shown(S);
    expect(focused).toContain(fields[0]);
    expect(focused).toContain(fields[1]);
    expect(focused.length).toBe(quietOff.length + 2);
    S.data = Object.assign({}, push, { selectedId: null, hoverId: null });
    S.tick(48);
    expect(shown(S).length).toBe(quietOff.length);
    // The light scene has no codes at all; the map keeps every one.
    const L = { THREE: fakeThree(), model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34, rotX: 26 };
    P.buildCityScene(L.THREE, L, pushFor(p, 'light'));
    expect(L.cityCodeN).toBe(0);
    // A code floats clear of the trees of a park or a preserve (the cones reach 0.26 above the ground).
    const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette('contrast'), null, null);
    const treeTop = {};
    ['round', 'cone'].forEach((k) => parts[k].forEach((s) => { treeTop[s.id] = Math.max(treeTop[s.id] || 0, s.y + s.sy / 2); }));
    parts.codes.filter((c) => p.uses[c.id] === 'preserve' || p.uses[c.id] === 'park').forEach((c) => {
      expect(c.y - c.sy / 2, c.id + ' code bottom vs trees').toBeGreaterThan(treeTop[c.id]);
    });
  });

  it('says what a blank parcel is, in contrast only', async () => {
    load(true);
    await mount({ ctx: { theme: 'contrast', isDark: true }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($('[data-citylab-hc-codes]').textContent).toContain('except open fields');
    await unmount();
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($('[data-citylab-hc-codes]')).toBe(null);
  });
});

describe('Hunt - nothing moves the model under a change that waits for its prediction', () => {
  it('Redo is off while a change waits (Undo already cancels it)', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true, predictEvery: true } } });
    const core = P.SCENARIOS.riverbend.coreParcel;
    let cell = $('#citylab-parcel-' + core);
    await focus(cell); await key(cell, '5');
    await click(predictButtons()[0]);
    expect(plan(m).uses[core]).toBe(P.PALETTE_IDS[4]);
    await click(btn('Undo'));
    expect(plan(m).uses[core]).toBe(P.basePlan('riverbend').uses[core]);
    cell = $('#citylab-parcel-B2'); await focus(cell); await key(cell, '6');
    expect(predictButtons()).toHaveLength(3);
    const redo = btn('Redo');
    expect(redo.disabled, 'Redo while a change waits').toBe(true);
    await click(redo);
    expect(plan(m).uses[core], 'the model moved under the waiting change').toBe(P.basePlan('riverbend').uses[core]);
    expect(predictButtons()).toHaveLength(3);
    expect(errors).toEqual([]);
  });
});

describe('Hunt - no "1 more people figures"', () => {
  it('the coach\'s homes step, the bus lens and the strip frames read right for one and for none', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    const field = P.coachFields(P.basePlan('riverbend'))[0];
    const cell = $('#citylab-parcel-' + field);
    await focus(cell); await key(cell, 'Enter'); await key(cell, '5');
    const coach = $('[data-citylab-coach]');
    expect(coach.getAttribute('data-citylab-coach')).toBe('3');
    expect(coach.textContent).toContain('12 more homes are reached by a road, so one more people figure walks there.');
    expect(coach.textContent).not.toContain('1 more people figures');
    await unmount();

    // The Bus lens with no stop, then one.
    const base = JSON.parse(JSON.stringify(P.basePlan('riverbend')));
    expect(P.scorecard(base, 'central').transitStops).toHaveLength(0);
    await mount({ toolData: { _cityLab: { boardView: 'model', lens: 'transit', coachOff: true, plan: base } } });
    let sum = $('[data-citylab-lens-summary="transit"]').textContent;
    expect(sum).not.toContain('one of the 0');
    expect(sum).toContain('no bus stop a bus can reach yet');
    await unmount();
    const one = JSON.parse(JSON.stringify(P.toggleTransit(P.basePlan('riverbend'), P.SCENARIOS.riverbend.coreParcel)));
    expect(P.scorecard(one, 'central').transitStops).toHaveLength(1);
    await mount({ toolData: { _cityLab: { boardView: 'model', lens: 'transit', coachOff: true, plan: one } } });
    sum = $('[data-citylab-lens-summary="transit"]').textContent;
    expect(sum).toContain('the one bus stop a bus can reach');
    expect($('[data-citylab-living]').textContent).toContain('A bus waits at the one stop a road reaches.');
    expect($('[data-citylab-living]').textContent).not.toContain('the 1 stops');
    await unmount();

    // The strip's frames for a single counted parcel (Mission 2, homes).
    const tg = P.coachFields(P.basePlan('riverbend'))[0];
    const h1 = JSON.parse(JSON.stringify(P.setUse(P.basePlan('riverbend'), tg, 'housing_mid')));
    expect(P.missionMarks(h1, 'm_bond').ids).toHaveLength(1);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: h1, missionsDone: { 'riverbend:m_park': true } } } });
    const marks = $('[data-citylab-strip-marks]');
    expect(marks.getAttribute('data-citylab-strip-marks')).toBe('1');
    expect(marks.textContent).toContain('the one parcel whose new homes a road reaches');
    expect(errors).toEqual([]);
  });
});
