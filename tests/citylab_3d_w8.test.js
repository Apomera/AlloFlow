// City Lab 3D, wave 8 (2026-11-04): follow-ups to wave 7.
//
// What has to be TRUE:
// 1. In full screen the camera keeps the selected parcel clear of the HUD:
//    followPoint says where a covered point must go (the nearest clear spot,
//    a margin from every HUD box and the edge, or nothing when it is clear),
//    and the HUD row has a "Zoom to {parcel}" action that frames the parcel.
//    The real camera (projection, the slide, the ease, the reduced-motion
//    snap) is proved in tests/e2e/citylab-3d-w8.spec.ts.
// 2. A fresh plan never drops a change that waits for its prediction in
//    silence: Start over, Start my own plan, opening another town and Limited
//    moves each say it was cancelled, on screen and in one announcement.
//
// CITYLAB_FILE=<path> runs this suite against another copy (the wave's start
// copy) to show which tests fail on the old behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 90000, hookTimeout: 30000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
const STORE_KEY = 'allo_citylab_plan_v1';
const act = React.act || React.unstable_act;
const DROP = 'The change that was waiting for your prediction was cancelled. It was not applied to the new plan.';

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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const last = (arr) => arr[arr.length - 1];
const btn = (text) => $$('button').find((b) => b.textContent.trim() === text);
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
}
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
const dropNote = () => $('[data-citylab-staged-dropped]');

// A park on A9 (an open field), made on the map, waits for its prediction.
async function stagePark(m) {
  await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
  await key($('#citylab-parcel-A9'), 'Enter');
  expect(plan(m).uses.A9).toBe('field');
  expect(document.body.textContent).toContain('Before you look');
}
const mapStaged = { _cityLab: { boardView: 'use', coachOff: true, predictEvery: true } };

describe('W8 - where a parcel covered by the HUD has to go', () => {
  const area = { left: 0, top: 0, right: 1280, bottom: 720 };
  const topBox = { left: 8, top: 8, right: 1272, bottom: 300 };
  const camBox = { left: 815, top: 640, right: 1272, bottom: 712 };

  it('a clear point stays where it is', () => {
    load(false);
    expect(P.FOLLOW_MARGIN).toBeGreaterThanOrEqual(16);
    expect(P.followPoint({ x: 600, y: 450 }, area, [topBox, camBox])).toBe(null);
  });

  it('a point under the top box goes straight down to just below it, the margin clear', () => {
    load(false);
    const m = P.FOLLOW_MARGIN;
    expect(P.followPoint({ x: 600, y: 200 }, area, [topBox, camBox])).toEqual({ x: 600, y: 300 + m });
    // Inside the margin under the box counts as covered too.
    expect(P.followPoint({ x: 600, y: 300 + m / 2 }, area, [topBox, camBox])).toEqual({ x: 600, y: 300 + m });
    // In the corner: below the box and in from the edge.
    expect(P.followPoint({ x: 1275, y: 100 }, area, [topBox, camBox])).toEqual({ x: 1280 - m, y: 300 + m });
  });

  it('a point under the camera box takes the shorter way out', () => {
    load(false);
    const m = P.FOLLOW_MARGIN;
    expect(P.followPoint({ x: 1000, y: 680 }, area, [topBox, camBox])).toEqual({ x: 1000, y: 640 - m });
    expect(P.followPoint({ x: 830, y: 700 }, area, [topBox, camBox], 10)).toEqual({ x: 805, y: 700 });
  });

  it('a point behind the camera goes to the clear middle; with nowhere clear, the middle of the stage', () => {
    load(false);
    expect(P.followPoint({ x: 0, y: 0, behind: true }, area, [topBox, camBox])).toEqual({ x: 640, y: 360 });
    const all = { left: -10, top: -10, right: 1300, bottom: 800 };
    const r = P.followPoint({ x: 600, y: 200 }, area, [all]);
    expect(r.none).toBe(true);
    expect([r.x, r.y]).toEqual([640, 360]);
  });

  it('a frame aims where the scene always aimed: the frame centre, at a third of its highest roof', () => {
    load(false);
    const tops = { A1: { x: -5.5, z: -5.5, roof: 2 }, F6: { x: -0.5, z: -0.5, roof: 1 }, L12: { x: 5.5, z: 5.5, roof: 3 } };
    const a = P.cityAim(tops, { x: 0, z: 0, hx: 1.75, hz: 1.75 }, 6, 3);
    expect(a.top).toBe(1);
    expect(a.target).toEqual([0, 0.35, 0]);
    expect(a.pts).toEqual([[-1.75, 0, -1.75], [1.75, 1.4, 1.75], [-1.75, 1.4, 1.75], [1.75, 0, -1.75]]);
    expect(P.cityAim(tops, null, 6, 3).top).toBe(3);
    expect(P.cityAim({}, { x: 2, z: 2, hx: 1, hz: 1 }, 6, 0.4).top).toBe(0.4);
  });
});

describe('W8 - the HUD row has Zoom to', () => {
  async function enterFs() {
    await click($('[data-citylab-cam-more]'));
    await click($('#citylab-fs-toggle'));
    expect($('[data-citylab-hud="on"]')).toBeTruthy();
  }

  it('frames the selected parcel at the starting zoom, beside the parcel buttons, with a 44 px target and a full name', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    const pick = $('[data-citylab-hud-pick="up"]');
    await click(pick);
    await click(pick);
    const id = last(rec.pushes).selectedId;
    // No live scene in jsdom: the picker moves the selection and leaves the frame alone.
    const zoomBtn = $('[data-citylab-hud-part="pick"] [data-citylab-hud-zoom]');
    expect(zoomBtn).toBeTruthy();
    expect(zoomBtn.textContent).toBe('Zoom to ' + id);
    expect(zoomBtn.getAttribute('aria-label')).toContain(id);
    expect(parseInt(zoomBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    await click(btn('Bird\'s eye'));
    await click(zoomBtn);
    const p = last(rec.pushes);
    expect(p.zoom).toBe(1);
    expect(p.frame).toEqual(P.parcelFrame(id));
    expect(p.frame.kind).toBe('parcel');
    expect(errors).toEqual([]);
  });

  it('the picker in jsdom (no live scene) changes the selection, never the frame', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    const f0 = JSON.stringify(last(rec.pushes).frame);
    const s0 = last(rec.pushes).selectedId;
    await click($('[data-citylab-hud-pick="left"]'));
    expect(last(rec.pushes).selectedId).not.toBe(s0);
    expect(JSON.stringify(last(rec.pushes).frame)).toBe(f0);
    expect(errors).toEqual([]);
  });

  it('its words go through the translator', async () => {
    load(true);
    await mount({ ctx: { t: (k, fb) => '«' + fb + '»' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    const z = $('[data-citylab-hud-zoom]');
    expect(z.textContent.indexOf('«')).toBe(0);
    expect(z.getAttribute('aria-label').indexOf('«')).toBe(0);
  });
});

describe('W8 - a fresh plan says it cancelled the waiting change', () => {
  it('Start over: one announcement leads with it, and the note sits beside the control', async () => {
    load(true);
    const m = await mount({ toolData: mapStaged });
    await stagePark(m);
    await click($('#citylab-tab-memo'));
    await click(btn('Start over'));
    const said = m.announced.length;
    await click(btn('Yes, clear the plan'));
    expect(plan(m).uses).toEqual(P.basePlan('riverbend').uses);
    expect(m.announced.length - said).toBe(1);
    expect(last(m.announced).indexOf(DROP)).toBe(0);
    expect(last(m.announced)).toContain('Plan reset to Riverbend');
    expect(document.body.textContent).toContain(DROP);
    await click($('#citylab-tab-design'));
    expect(document.body.textContent).not.toContain('Before you look');
    expect(errors).toEqual([]);
  });

  it('Start over with nothing waiting says nothing of the kind', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'use', coachOff: true } } });
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    await key($('#citylab-parcel-A9'), 'Enter');
    expect(plan(m).uses.A9).toBe('park');
    await click($('#citylab-tab-memo'));
    await click(btn('Start over'));
    await click(btn('Yes, clear the plan'));
    expect(last(m.announced)).not.toContain('was cancelled');
    expect(document.body.textContent).not.toContain(DROP);
    expect(dropNote()).toBe(null);
  });

  it('Start my own plan (a plan found on the device)', async () => {
    load(true);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(P.setUse(P.basePlan('riverbend'), 'D12', 'park')));
    const m = await mount({ toolData: mapStaged });
    expect(plan(m).imported).toBe(true);
    await stagePark(m);
    const said = m.announced.length;
    await click(btn('Start my own plan'));
    expect(plan(m).imported).toBeFalsy();
    expect(m.announced.length - said).toBe(1);
    expect(last(m.announced).indexOf(DROP)).toBe(0);
    expect(dropNote().textContent).toBe(DROP);
    expect(document.body.textContent).not.toContain('Before you look');
    expect(errors).toEqual([]);
  });

  it('opening another town, and the note goes with the next change', async () => {
    load(true);
    const m = await mount({ toolData: mapStaged });
    await stagePark(m);
    const sel = $$('select').find((s) => s.getAttribute('aria-label') === 'Choose which town to plan');
    const said = m.announced.length;
    await act(async () => {
      sel.value = 'mesahollow';
      sel.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(plan(m).scenarioId).toBe('mesahollow');
    expect(m.announced.length - said).toBe(1);
    expect(last(m.announced).indexOf(DROP)).toBe(0);
    expect(last(m.announced)).toContain('Opened Mesa Hollow');
    expect(dropNote().textContent).toBe(DROP);
    // The next change that applies takes the note away.
    const field = Object.keys(plan(m).uses).find((id) => plan(m).uses[id] === 'field');
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    await key($('#citylab-parcel-' + field), 'Enter');
    // Predict-every is on: answer it (skip) so the change applies.
    const skip = $$('button').find((b) => /^Skip/.test(b.textContent.trim()));
    expect(skip).toBeTruthy();
    await click(skip);
    expect(plan(m).uses[field]).toBe('park');
    expect(dropNote()).toBe(null);
    expect(errors).toEqual([]);
  });

  it('Limited moves', async () => {
    load(true);
    const m = await mount({ toolData: mapStaged });
    await stagePark(m);
    const said = m.announced.length;
    await click(btn('Limited moves'));
    expect(typeof plan(m).moveBudget).toBe('number');
    expect(m.announced.length - said).toBe(1);
    expect(last(m.announced).indexOf(DROP)).toBe(0);
    expect(last(m.announced)).toContain('Limited-move challenge started');
    expect(dropNote().textContent).toBe(DROP);
    expect(errors).toEqual([]);
  });

  it('the note goes through the translator', async () => {
    load(true);
    const m = await mount({ ctx: { t: (k, fb) => '«' + fb + '»' }, toolData: mapStaged });
    await click($('[data-citylab-map-palette] [data-citylab-tool="park"]'));
    await key($('#citylab-parcel-A9'), 'Enter');
    expect(plan(m).uses.A9).toBe('field');
    await click(btn('«Limited moves»'));
    expect(dropNote().textContent).toBe('«' + DROP + '»');
  });
});
