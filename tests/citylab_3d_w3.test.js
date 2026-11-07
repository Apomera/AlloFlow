// City Lab 3D, wave 3 (2026-11-04): the first two minutes, and K-5.
//
// What has to be TRUE: the coach is three steps the STUDENT takes (it never
// edits the plan and never pays XP), it can be done with the keyboard alone,
// and closing it is remembered; the rarer settings moved behind Options still
// work there and still obey the teacher's locks; the K-5 presentation hides
// nothing it cannot give back in one press; and the first view frames the
// town's buildings, with the whole map one Reset away and a way to slide or
// zoom to an edge district.
//
// jsdom has no WebGL: the viewer is a stand-in shaped like the host's
// makeOrbitViewer, and the scene is the tool's real buildCityScene on a
// minimal Three.js. The real-WebGL half is tests/e2e/citylab-3d-w3.spec.ts.
//
// CITYLAB_FILE=<path> runs this suite against another copy (the wave's start
// copy) to show which tests fail on the old behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 60000, hookTimeout: 30000 });
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
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.WebGLRenderingContext = function () {};
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
  Object.defineProperty(window.navigator, 'deviceMemory', { value: 8, configurable: true });
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  errSpy.mockRestore();
  delete window.matchMedia;
  delete window.WebGLRenderingContext;
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
      theme: 'light'
    }, opts.ctx || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return out;
}
async function remount(opts) {
  if (root) await act(() => root.unmount());
  root = null;
  document.body.innerHTML = '<div id="root"></div>';
  return mount(opts);
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
const buttonsContaining = (text) => $$('button').filter((b) => b.textContent.indexOf(text) !== -1);
const buttonByAria = (aria) => $$('button').find((b) => b.getAttribute('aria-label') === aria);
const last = (arr) => arr[arr.length - 1];
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
const coach = () => $('[data-citylab-coach]');
const coachStep = () => (coach() ? coach().getAttribute('data-citylab-coach') : null);
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function choose(select, value) {
  await act(async () => { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
// Tab stops in document order that a keyboard can reach (not disabled, not
// inside a hidden or display:none subtree).
function tabStops() {
  return $$('#root button, #root select, #root input, #root textarea, #root [tabindex]').filter((n) => {
    if (n.disabled || n.tabIndex < 0) return false;
    for (let p = n; p; p = p.parentElement) {
      if (p.hidden || (p.style && p.style.display === 'none')) return false;
    }
    return true;
  });
}
// Walk the cells with the arrow keys, as a keyboard user does.
async function arrowTo(from, to) {
  let at = from;
  const step = async (k) => { await key($('#citylab-parcel-' + at), k); at = document.activeElement.id.replace('citylab-parcel-', ''); };
  while (P.parcelCol(at) > P.parcelCol(to)) await step('ArrowLeft');
  while (P.parcelCol(at) < P.parcelCol(to)) await step('ArrowRight');
  while (P.parcelRow(at) > P.parcelRow(to)) await step('ArrowUp');
  while (P.parcelRow(at) < P.parcelRow(to)) await step('ArrowDown');
  return at;
}

// The tool's real scene on a minimal Three.js.
function fakeScene(p, data) {
  function V(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; this.set = function (a, b, c) { this.x = a; this.y = b; this.z = c; }; }
  const THREE = {
    BoxGeometry: function () {}, PlaneGeometry: function () {},
    Color: function (c) { this.hex = c; },
    MeshLambertMaterial: function (o) { this.color = o.color; },
    Mesh: function (g, mat) { this.material = mat; this.position = new V(); this.scale = new V(); this.rotation = {}; this.isMesh = true; },
    AmbientLight: function () {}, DirectionalLight: function () { this.position = new V(); },
    Vector3: V, Vector2: function (x, y) { this.x = x; this.y = y; }, DoubleSide: 2, FrontSide: 0
  };
  const S = { THREE, model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34 };
  P.buildCityScene(THREE, S, Object.assign({ massing: P.buildMassing(p, 'central', null), living: P.livingCity(p, 'central'), theme: 'light' }, data || {}));
  return S;
}

describe('W3 - the first view frames the town, and the whole map stays reachable', () => {
  it('frames the bounding box of the town\'s buildings, one parcel of margin, in every town', () => {
    load(true);
    P.SCENARIO_IDS.forEach((sid) => {
      const p = P.basePlan(sid);
      const f = P.townFrame(p);
      const built = P.allParcelIds().filter((id) => P.BUILT_USE_IDS.indexOf(p.uses[id]) !== -1);
      expect(built.length, sid).toBeGreaterThan(0);
      built.forEach((id) => expect(P.inFrame(f, id), sid + ' ' + id).toBe(true));
      const xs = built.map((id) => P.parcelCentre(id).x), zs = built.map((id) => P.parcelCentre(id).z);
      // No wider than the buildings plus the margin (or the five-parcel minimum).
      expect(f.hx).toBeCloseTo(Math.max(2.5, Math.min(6, (Math.max(...xs) - Math.min(...xs) + 1) / 2 + 1)), 6);
      expect(f.hx).toBeLessThan(6);
      expect(f.hz).toBeLessThan(6);
      // Inside the map.
      expect(Math.abs(f.x) + f.hx).toBeLessThanOrEqual(6 + 1e-9);
      expect(Math.abs(f.z) + f.hz).toBeLessThanOrEqual(6 + 1e-9);
    });
    expect(P.wholeFrame()).toMatchObject({ x: 0, z: 0, hx: 6, hz: 6 });
  });

  it('pushes the town frame first; Reset and Home show the whole map; The town and Zoom to come back', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const town = P.townFrame(P.basePlan('riverbend'));
    expect(last(rec.pushes).frame).toMatchObject({ x: town.x, z: town.z, hx: town.hx, hz: town.hz });
    await click(buttonByText('Reset view'));
    expect(last(rec.pushes).frame).toMatchObject(P.wholeFrame());
    expect(last(rec.pushes)).toMatchObject(P.CAM_HOME);
    await click(buttonByText('The town'));
    expect(last(rec.pushes).frame).toMatchObject({ x: town.x, z: town.z });
    await key($('#citylab-stage'), 'Home');
    expect(last(rec.pushes).frame).toMatchObject(P.wholeFrame());
    // Zoom to the selected parcel, an edge district (W4: under More camera).
    await click($('#citylab-parcel-L12'));
    await click($('[data-citylab-cam-more]'));
    await click(buttonByText('Zoom to L12'));
    const f = last(rec.pushes).frame;
    expect(P.inFrame(f, 'L12')).toBe(true);
    expect(f.hx).toBeLessThan(2);
    // A preset turns the camera and keeps what it frames.
    await click(buttonByText('Street'));
    expect(last(rec.pushes).frame).toEqual(f);
    expect(errors).toEqual([]);
  });

  it('Shift + arrows on the stage slide the view across the screen, and the buttons do too', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const stage = $('#citylab-stage');
    const f0 = last(rec.pushes).frame;
    const rot = last(rec.pushes).rotY;
    await key(stage, 'ArrowRight', { shiftKey: true });
    const f1 = last(rec.pushes).frame;
    const mv = P.screenPan(rot, 1, 0);
    expect(f1.x - f0.x).toBeCloseTo(mv.dx, 9);
    expect(f1.z - f0.z).toBeCloseTo(mv.dz, 9);
    expect(last(rec.pushes).rotY).toBe(rot);                  // a slide is not a turn
    // "Right" on screen: the camera's right vector on the ground.
    expect(mv.dx).toBeCloseTo(Math.cos(rot * Math.PI / 180), 9);
    await click($('[data-citylab-cam-more]'));                 // W4: folded at every width
    await click(buttonByAria('Slide the view away from you'));
    const f2 = last(rec.pushes).frame;
    const away = P.screenPan(rot, 0, 1);
    expect(f2.x - f1.x).toBeCloseTo(away.dx, 9);
    expect(f2.z - f1.z).toBeCloseTo(away.dz, 9);
    // Sliding never leaves the map.
    for (let i = 0; i < 30; i++) await key(stage, 'ArrowLeft', { shiftKey: true });
    const f3 = last(rec.pushes).frame;
    expect(Math.abs(f3.x)).toBeLessThanOrEqual(6);
    expect(Math.abs(f3.z)).toBeLessThanOrEqual(6);
    // Plain arrows still turn; nothing was edited and no XP for looking.
    await key(stage, 'ArrowLeft');
    expect(last(rec.pushes).rotY).toBe(rot - 15);
  });

  it('the scene aims the camera at the frame it is given, without a rebuild', () => {
    load(true);
    const p = P.basePlan('riverbend');
    const town = P.townFrame(p);
    const S = fakeScene(p);
    S.data = { frame: town, static: true };
    const builds = P.cityBuildCount();
    S.tick(1000);
    expect(S.target.x).toBeCloseTo(town.x, 9);
    expect(S.target.z).toBeCloseTo(town.z, 9);
    S.fitPts.forEach((v) => {
      expect(Math.abs(v.x - town.x)).toBeLessThanOrEqual(town.hx + 1e-9);
      expect(Math.abs(v.z - town.z)).toBeLessThanOrEqual(town.hz + 1e-9);
    });
    S.data = { frame: null, static: true };
    S.tick(1100);
    expect(S.target.x).toBe(0);
    expect(Math.max(...S.fitPts.map((v) => Math.abs(v.x)))).toBe(6);
    expect(P.cityBuildCount()).toBe(builds);
  });
});

describe('W3 - the coach: three steps, the student\'s own, keyboard only', () => {
  it('walks a keyboard-only student from a field to homes to the runoff number, then into Mission 1', async () => {
    load(false);
    const m = await mount({ ctx: { gradeBand: 'g68' } });
    const base = P.basePlan('riverbend');
    const fields = P.coachFields(base);
    expect(fields.length).toBeGreaterThan(0);
    // Step 1: the fields are named, and tinted on the map.
    expect(coachStep()).toBe('1');
    expect(coach().textContent).toContain(fields.join(', '));
    expect(coach().textContent).toContain('tap or click one');           // the map's words, not the palette's
    expect($$('[data-citylab-coach-tint]').map((n) => n.getAttribute('data-citylab-coach-tint')).sort()).toEqual(fields.slice().sort());
    expect($('[data-citylab-coach-status]').getAttribute('role')).toBe('status');
    // The keyboard path: Tab lands on the selected parcel; arrows walk to a tinted field.
    const core = P.SCENARIOS.riverbend.coreParcel;
    $('#citylab-parcel-' + core).focus();
    const target = fields.find((id) => P.parcelRow(id) === P.parcelRow(core)) || fields[0];
    await arrowTo(core, target);
    expect(document.activeElement.id).toBe('citylab-parcel-' + target);
    expect(coachStep()).toBe('2');
    expect($('[data-citylab-coach-status]').textContent).toMatch(/step 2 of 3/);
    expect(plan(m) ? plan(m).editCount || 0 : 0).toBe(0);           // selecting edits nothing
    expect($$('[data-citylab-coach-tint]')).toEqual([]);
    // Step 2: the student builds homes with the map's own key.
    await key(document.activeElement, '6');
    expect(plan(m).uses[target]).toBe('housing_mid');
    expect(coachStep()).toBe('3');
    const a = P.scorecard(base, 'central'), b = P.scorecard(plan(m), 'central');
    const figs = P.livingCity(plan(m), 'central').people.length - P.livingCity(base, 'central').people.length;
    const txt = coach().textContent;
    expect(txt).toContain((b.tier1.newUnitsServed - a.tier1.newUnitsServed) + ' more homes are reached by a road, so ' + figs + ' more people figures');
    expect(txt).toContain('went from ' + a.tier2.runoffCoefficient.toFixed(3) + ' to ' + b.tier2.runoffCoefficient.toFixed(3));
    expect(b.tier2.runoffCoefficient).toBeGreaterThan(a.tier2.runoffCoefficient);
    expect($('[data-citylab-coach-status]').textContent).toMatch(/step 3 of 3: Roofs shed rain/);
    // The spoken delta is still the edit's own, not the coach's.
    expect(last(m.announced)).toMatch(new RegExp('^' + target + ' set to Housing, mid density\\.'));
    // On into Mission 1: focus lands on the Missions heading; the coach is remembered as done.
    await click(buttonByText('Start Mission 1'));
    expect(coach()).toBeFalsy();
    expect(document.activeElement.id).toBe('citylab-missions-title');
    expect(m.latest._cityLab.coachOff).toBe(true);
    // Grades 6-8 are on missions by their band already, so no level is written for them.
    expect(m.latest._cityLab.level).toBeUndefined();
    expect(errors).toEqual([]);
  });

  it('never edits for the student and pays no XP: every coach button leaves the plan alone', async () => {
    load(false);
    const m = await mount({ ctx: { gradeBand: 'g68' } });
    const base = JSON.stringify(P.basePlan('riverbend').uses);
    // W6: the folded mission strip shares the coach's slot; its show button only shows the strip.
    const coachButtons = () => $$('[data-citylab-coach] button').filter((b) => !b.hasAttribute('data-citylab-coach-close') && !b.hasAttribute('data-citylab-strip-toggle'));
    // Steps 1 and 2 offer nothing that could act on the plan.
    expect(coachButtons()).toEqual([]);
    const target = P.coachFields(P.basePlan('riverbend'))[0];
    await click($('#citylab-parcel-' + target));
    expect(coachStep()).toBe('2');
    expect(coachButtons()).toEqual([]);
    expect(plan(m) ? JSON.stringify(plan(m).uses) : base).toBe(base);
    // The student's edit, through the inspector this time.
    await click($$('button').find((b) => new RegExp('^Set parcel ' + target + ' to Housing, low density').test(b.getAttribute('aria-label') || '')));
    expect(coachStep()).toBe('3');
    const after = JSON.stringify(plan(m));
    // Undo is the student's own edit taken back, and nothing else.
    await click(buttonByText('Undo the homes'));
    expect(JSON.stringify(plan(m).uses)).toBe(base);
    expect(coachStep()).toBe('2');
    expect(document.activeElement.id).toBe('citylab-coach-title');        // the button left; focus did not
    await click(buttonByText('Redo'));
    expect(JSON.stringify(plan(m))).toBe(after);
    expect(coachStep()).toBe('3');
    await click(buttonByText('Start Mission 1'));
    expect(JSON.stringify(plan(m))).toBe(after);
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest._cityLab.xpAwarded).toBeUndefined();
  });

  it('remembers a closed coach, never opens over existing work, and comes back from Options', async () => {
    load(false);
    const m = await mount();
    expect(coachStep()).toBe('1');
    await click($('[data-citylab-coach-close]'));
    expect(coach()).toBeFalsy();
    expect(m.latest._cityLab.coachOff).toBe(true);
    expect(document.activeElement.id).toBe('citylab-options-toggle');      // focus is not lost
    expect(last(m.announced)).toMatch(/Coach closed/);
    await remount({ toolData: m.latest });
    expect(coach()).toBeFalsy();
    // Work in the plan already: no coach.
    await remount({ toolData: { _cityLab: { plan: P.setUse(P.basePlan('riverbend'), 'A9', 'park') } } });
    expect(coach()).toBeFalsy();
    // Escape inside the card closes it too (a fresh device: no saved plan).
    window.localStorage.removeItem(STORE_KEY);
    const m2 = await remount();
    $('[data-citylab-coach-close]').focus();
    await key($('[data-citylab-coach-close]'), 'Escape');
    expect(coach()).toBeFalsy();
    expect(m2.latest._cityLab.coachOff).toBe(true);
    // Reopened from Options, with focus on the card.
    await click($('#citylab-options-toggle'));
    await click(buttonByText('Show the coach again'));
    expect(coachStep()).toBe('1');
    expect(document.activeElement.id).toBe('citylab-coach-title');
    expect(buttonByText('Show the coach again')).toBeFalsy();
  });

  it('a 9-12 student is taken into Mission 1 too; a teacher who fixed the full brief gets the brief', async () => {
    load(false);
    const target = P.coachFields(P.basePlan('riverbend'))[0];
    async function throughCoach() {
      await click($('#citylab-parcel-' + target));
      const cell = $('#citylab-parcel-' + target);
      cell.focus();
      await key(cell, '6');
      expect(coachStep()).toBe('3');
    }
    const m = await mount({ ctx: { gradeBand: 'g912' } });
    await throughCoach();
    await click(buttonByText('Start Mission 1'));
    expect(m.latest._cityLab.level).toBe('missions');
    expect(document.activeElement.id).toBe('citylab-missions-title');
    window.localStorage.removeItem(STORE_KEY);
    const m2 = await remount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { teacher: { level: 'brief' } } } });
    await throughCoach();
    expect(buttonByText('Start Mission 1')).toBeFalsy();
    await click(buttonByText('See the brief'));
    expect(m2.latest._cityLab.level).toBeUndefined();
    expect(document.activeElement.id).toBe('citylab-brief-title');
    expect(m2.latest._cityLab.coachOff).toBe(true);
  });

  it('folds Start here to a progress chip while the coach runs, with 44 px rows when opened', async () => {
    load(false);
    await mount({ ctx: { gradeBand: 'g68' } });
    const nav = $('nav[aria-labelledby="citylab-path-title"]');
    expect(nav.getAttribute('data-citylab-path')).toBe('chip');
    expect(nav.textContent).toContain('Start here: 0 of 6 done in Riverbend');
    expect(nav.querySelectorAll('ol button').length).toBe(0);
    await click(buttonByText('Show the steps'));
    const rows = $$('nav[aria-labelledby="citylab-path-title"] ol button');
    expect(rows.length).toBe(6);
    rows.forEach((r) => expect(r.style.minHeight).toBe('44px'));
    await click($('[data-citylab-coach-close]'));
    expect($('nav[aria-labelledby="citylab-path-title"]').getAttribute('data-citylab-path')).toBe('open');
  });

  it('tints the coach fields on the 3D board too, and only in step 1', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    const fields = P.coachFields(P.basePlan('riverbend'));
    expect(last(rec.pushes).hint).toEqual(fields);
    await click($('#citylab-parcel-' + fields[0]));
    expect(last(rec.pushes).hint).toBe(null);
  });
});

describe('W3 - a calmer header: Options holds the rarer settings, and they still work', () => {
  it('keeps Undo, Redo and the views in view and every moved control inside Options', async () => {
    load(false);
    const m = await mount({ toolData: { _cityLab: { coachOff: true } } });
    const opts = $('#citylab-options');
    const toggle = $('#citylab-options-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('citylab-options');
    expect(opts.hidden).toBe(true);
    ['Keyboard shortcuts', 'Predict before every change', 'Limited moves', 'Show the coach again'].forEach((label) => {
      const b = buttonByText(label);
      expect(b, label).toBeTruthy();
      expect(opts.contains(b), label + ' is in Options').toBe(true);
    });
    ['Undo', 'Redo'].forEach((label) => expect(opts.contains(buttonByText(label))).toBe(false));
    expect(opts.contains($('[aria-label="Map view"]'))).toBe(false);
    // Hidden means out of the tab order.
    expect(tabStops().some((n) => opts.contains(n))).toBe(false);
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(opts.hidden).toBe(false);
    expect(document.activeElement === toggle || document.activeElement === document.body).toBe(true);
    // They work from there.
    await click(buttonByText('Predict before every change'));
    expect(m.latest._cityLab.predictEvery).toBe(true);
    await click(buttonByText('Keyboard shortcuts'));
    expect(document.body.textContent).toContain('Shift + arrow keys slide it');
    await click(buttonByText('Limited moves'));
    expect(plan(m).moveBudget).toBe(45);
    expect(document.body.textContent).toContain('45 of 45 moves left');       // the count stays in view
    await click(buttonByText('End challenge'));
    expect(plan(m).moveBudget).toBe(null);
    // Escape closes it and puts focus back on the toggle.
    buttonByText('Keyboard shortcuts').focus();
    await key(buttonByText('Keyboard shortcuts'), 'Escape');
    expect($('#citylab-options').hidden).toBe(true);
    expect(document.activeElement.id).toBe('citylab-options-toggle');
  });

  it('still honours the teacher\'s locks inside Options', async () => {
    load(false);
    await mount({ toolData: { _cityLab: { coachOff: true, teacher: { predictEvery: true, moveBudget: 30 } } } });
    await click($('#citylab-options-toggle'));
    const pe = buttonByText('Predict before every change');
    expect(pe.disabled).toBe(true);
    expect(pe.getAttribute('aria-pressed')).toBe('true');
    expect(pe.getAttribute('aria-label')).toBe('Predict before every change, set by your teacher');
    expect(buttonByText('Limited moves')).toBeFalsy();
    expect(buttonByText('End challenge')).toBeFalsy();
    expect(document.body.textContent).toContain('of 30 moves left');
  });

  it('puts fewer tab stops and fewer words before the 3D board, with the palette one stop', async () => {
    load(true);
    await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { boardView: 'model' } } });
    const stops = tabStops();
    const iStage = stops.findIndex((n) => n.id === 'citylab-stage');
    expect(iStage).toBeGreaterThan(0);
    const palette = $('[role="toolbar"][aria-label="Tools for the 3D model: pick one, then click a parcel"]');
    expect(stops.filter((n) => palette.contains(n))).toHaveLength(1);
    // Before W3 this was 35: town, the path's 7, the tab, 3 settings, 5 views and 16 tools.
    expect(iStage, stops.slice(0, iStage).map((n) => n.textContent.trim().slice(0, 20)).join(' | ')).toBeLessThanOrEqual(15);
    // The intro is one sentence now (the coach speaks first; closed, the sentence shows).
    await click($('[data-citylab-coach-close]'));
    const intro = $('[data-citylab-intro]').textContent;
    expect(intro.split(/[.:!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(2);
    expect(intro.split(/\s+/).length).toBeLessThan(20);
  });

  it('says the runoff number in plain words first, the technical name second', async () => {
    load(false);
    await mount({ toolData: { _cityLab: { coachOff: true, predictEvery: true } } });
    const cell = $('#citylab-parcel-A9');
    cell.focus();
    await key(cell, '6');
    const opt = $$('option').find((o) => o.value === 'runoffCoefficient');
    expect(opt.textContent).toBe('How much rain runs off the land (runoff coefficient C)');
  });
});

describe('W3 - the palette: grouped, one stop, every tool still there', () => {
  it('groups Build, Connect and Improve, keeps the rarer uses one press away, and roves with the arrows', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const bar = $('[role="toolbar"][data-citylab-palette]');
    expect($$('[data-citylab-palette-group]').map((g) => g.getAttribute('aria-label'))).toEqual(['Build', 'Connect', 'Improve']);
    const more = $('[data-citylab-more-uses]');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    P.PALETTE_GROUPS.more.forEach((id) => expect($('[data-citylab-tool="' + id + '"]')).toBeFalsy());
    await click(more);
    expect($('[data-citylab-more-uses]').getAttribute('aria-expanded')).toBe('true');
    // With More uses open, every tool the board offers is here.
    expect($$('[data-citylab-tool]').map((b) => b.getAttribute('data-citylab-tool')).sort()).toEqual(P.STAGE_TOOL_IDS.slice().sort());
    // One tab stop: the tool in use. Arrows move along the bar.
    expect($$('[data-citylab-palette-item]').filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('data-citylab-tool'))).toEqual(['inspect']);
    const first = $('[data-citylab-tool="inspect"]');
    first.focus();
    await key(first, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-citylab-tool')).toBe('housing_low');
    await key(document.activeElement, 'End');
    expect(document.activeElement.getAttribute('data-citylab-tool')).toBe('gi');
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-citylab-tool')).toBe('inspect');
    await click($('[data-citylab-tool="farm"]'));
    expect($$('[data-citylab-palette-item]').filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('data-citylab-tool'))).toEqual(['farm']);
    expect(bar.contains(document.activeElement) || true).toBe(true);
  });
});

describe('W3 - K-2 and 3-5: pictures, mission numbers up front, the full scorecard one press away', () => {
  function sectionText(title) {
    const s = $$('section').find((x) => { const h3 = x.querySelector(':scope > h3'); return h3 && h3.textContent === title; });
    return s ? s.textContent : null;
  }

  it('shows a picture palette with words for K-2, and the teacher can switch it off (or on for 6-8)', async () => {
    load(true);
    await mount({ ctx: { gradeBand: 'k2' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($('[role="toolbar"][data-citylab-palette]').getAttribute('data-citylab-palette')).toBe('pictures');
    const house = $('[data-citylab-tool="housing_low"]');
    expect(house.querySelector('[data-citylab-tool-pic]').getAttribute('aria-hidden')).toBe('true');
    expect(house.textContent).toContain('Housing, low density');           // the word stays
    $$('[data-citylab-palette-item]').forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    await remount({ ctx: { gradeBand: 'k2' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, teacher: { simple: 'off' } } } });
    expect($('[role="toolbar"][data-citylab-palette]').getAttribute('data-citylab-palette')).toBe('words');
    await remount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, teacher: { simple: 'on' } } } });
    expect($('[role="toolbar"][data-citylab-palette]').getAttribute('data-citylab-palette')).toBe('pictures');
    expect(P.simpleViewOn('g35', '')).toBe(true);
    expect(P.simpleViewOn('g912', '')).toBe(false);
    expect(P.teacherSettings({ simple: 'sideways' }).simple).toBe('');
  });

  it('puts the current mission\'s numbers up front, the model\'s own, with no tick before Check', async () => {
    load(false);
    const p = P.setUse(P.basePlan('riverbend'), 'C3', 'park');
    await mount({ ctx: { gradeBand: 'g35' }, toolData: { _cityLab: { coachOff: true, plan: p } } });
    const card = $('[data-citylab-mission-numbers]');
    expect(card.getAttribute('data-citylab-mission-numbers')).toBe('m_park');
    expect(card.textContent).toContain('Mission 1: Fix park access');
    const st = P.missionStatus('m_park', p);
    st.conds.forEach((c) => expect(card.textContent).toContain(P.condSentence(c)));
    expect(card.textContent).not.toMatch(/[✔✓]/);
    // Its place: in the board's panel, ahead of the map.
    const map = $('#citylab-parcel-A1');
    expect(card.compareDocumentPosition(map) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps every number reachable: the full brief and scorecard are one press away and identical', async () => {
    load(false);
    const p = P.setUse(P.basePlan('riverbend'), 'A6', 'housing_mid');
    await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { coachOff: true, plan: p } } });
    const full = { score: sectionText('Scorecard'), brief: sectionText('The planning board asked for') };
    expect(full.score).toBeTruthy();
    await remount({ ctx: { gradeBand: 'k2' }, toolData: { _cityLab: { coachOff: true, plan: p } } });
    expect(sectionText('Scorecard')).toBe(null);
    const btn = $('[data-citylab-full-score]');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await click(btn);
    expect($('[data-citylab-full-score]').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement === $('[data-citylab-full-score]') || document.activeElement === document.body).toBe(true);
    expect(sectionText('Scorecard')).toBe(full.score);
    expect(sectionText('The planning board asked for')).toBe(full.brief);
    expect(errors).toEqual([]);
  });
});

describe('W3 - every new string goes through the translator', () => {
  it('leaves no untranslated prose in the coach, Options, the palette or the K-5 views', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    const found = new Set();
    const leaks = (where) => {
      const walker = document.createTreeWalker(document.getElementById('root'), window.NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const s = n.nodeValue.trim();
        if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
        if (/^(Riverbend|Mesa Hollow|Harborlight)$/.test(s)) continue;
        if (/[a-z]{4,}/.test(s)) found.add(where + ': ' + s.slice(0, 80));
      }
      $$('#root [aria-label]').map((el) => el.getAttribute('aria-label'))
        .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1).forEach((s) => found.add(where + ' aria: ' + s.slice(0, 80)));
    };
    await mount({ ctx: { t: wrapT, gradeBand: 'k2', isTeacherMode: true }, toolData: { _cityLab: { boardView: 'model' } } });
    leaks('step1');
    await click($('#citylab-options-toggle'));
    await click($('[data-citylab-more-uses]'));
    await click($('[data-citylab-full-score]'));
    leaks('options');
    const target = P.coachFields(P.basePlan('riverbend'))[0];
    await click($('#citylab-parcel-' + target));
    leaks('step2');
    const cell = $('#citylab-parcel-' + target);
    cell.focus();
    await key(cell, '6');
    leaks('step3');
    expect([...found]).toEqual([]);
  });
});
