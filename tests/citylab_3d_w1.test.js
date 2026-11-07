// City Lab 3D, wave 1 (2026-11-04): build in 3D.
//
// The 3D board is a second way to ACT on the plan, so the thing to prove is
// that it is the same plan: a land use set from the grid, the inspector, the
// table or a click on the model is one op, staged, budgeted, undoable and
// announced the same way. The rest covers the three defects the design
// review found (scroll trap, selection in the rebuild signature, small
// targets), the camera, Shift+Arrow roads, and the fall back to the map when
// the GL context is lost.
//
// jsdom has no WebGL, so the viewer here is a stand-in shaped like the host's
// makeOrbitViewer (status arrives asynchronously, the subscriber is dropped a
// microtask after a real detach), and a 3D click reaches a parcel through
// the tool's real buildCityScene + cityPick with a scripted raycaster. The
// real-WebGL half is tests/e2e/citylab-3d-w1.spec.ts.
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

// A stand-in for StemLab.makeOrbitViewer with the host's observable contract.
function hostLikeViewer() {
  return function () {
    let notify = null, node = null, gen = 0, status = 'idle';
    const api = {
      attach(host) {
        rec.attaches.push(host ? 'node' : null);
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
  rec = { pushes: [], attaches: [], viewer: null };
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
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  errSpy.mockRestore();
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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
const buttonByAria = (aria) => $$('button').find((b) => b.getAttribute('aria-label') === aria);
const last = (arr) => arr[arr.length - 1];
const plan = (m) => m.latest._cityLab && m.latest._cityLab.plan;
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function choose(select, value) {
  await act(async () => { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
async function pointer(type, x, y) {
  await act(async () => {
    $('#citylab-stage').dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  });
}

// The tool's own buildCityScene, on a minimal Three.js whose raycaster hits
// whichever parcel the test names. This is what makes cityPick live in jsdom.
function fakeScene(p) {
  function V(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; this.set = function (a, b, c) { this.x = a; this.y = b; this.z = c; }; }
  const THREE = {
    BoxGeometry: function () {}, PlaneGeometry: function () {},
    Color: function (c) { this.hex = c; },
    MeshLambertMaterial: function (o) { this.color = o.color; },
    Mesh: function (g, mat) { this.material = mat; this.position = new V(); this.scale = new V(); this.rotation = {}; this.isMesh = true; },
    AmbientLight: function () {}, DirectionalLight: function () { this.position = new V(); },
    Vector3: V, Vector2: function (x, y) { this.x = x; this.y = y; }, DoubleSide: 2, FrontSide: 0,
    Raycaster: function () {
      this.setFromCamera = function () {};
      this.intersectObjects = function (list) {
        const o = list.find((m) => m.userData && m.userData.parcel === window.__pickId);
        return o ? [{ object: o }] : [];
      };
    }
  };
  const S = {
    THREE, model: { add() {} }, camera: { updateMatrixWorld() {} },
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }) } }
  };
  P.buildCityScene(THREE, S, { massing: P.buildMassing(p, 'central', null), dark: false });
  return S;
}

// Open the 3D board the way a student does, so the start copy reaches its
// own 3D view too and each test fails for its own reason there.
async function open3d(opts) {
  const m = await mount(opts);
  const btn = buttonByAria('Show the map by 3D');
  if (btn && btn.getAttribute('aria-pressed') !== 'true') { await click(btn); await flush(); }
  return m;
}

async function stageClick(id) {
  window.__pickId = id;
  await pointer('pointerdown', 100, 100);
  await pointer('pointerup', 101, 100);
}

const FIRST_WATER = () => P.allParcelIds().find((id) => P.basePlan('riverbend').uses[id] === 'water');

describe('W1 - the selection is out of the rebuild signature', () => {
  it('ignores the selection and still moves with the plan', () => {
    load(true);
    const base = P.basePlan('riverbend');
    expect(P.massingSignature(base, 'central', 'A1')).toBe(P.massingSignature(base, 'central', 'D6'));
    expect(P.massingSignature(P.setUse(base, 'A9', 'mixed'), 'central')).not.toBe(P.massingSignature(base, 'central'));
  });

  it('moving the selection in the map re-sends the same signature with the new selection', async () => {
    load(true);
    await open3d();
    const core = P.SCENARIOS.riverbend.coreParcel;
    const before = last(rec.pushes);
    expect(before.selectedId).toBe(core);
    await key($('#citylab-parcel-' + core), 'ArrowRight');
    const after = last(rec.pushes);
    expect(after.selectedId).not.toBe(core);
    expect(after.sig).toBe(before.sig);
    expect(after.massing.marks).toEqual([]);
    expect(errors).toEqual([]);
  });
});

describe('W1 - one edit API: the same op from all four surfaces', () => {
  async function viaGrid() {
    load(false);
    const m = await mount();
    const cell = $('#citylab-parcel-A9');
    cell.focus();
    await key(cell, '6');
    return m;
  }
  async function viaInspector() {
    load(false);
    const m = await mount();
    await click($('#citylab-parcel-A9'));
    await click($$('button').find((b) => /^Set parcel A9 to Housing, mid density/.test(b.getAttribute('aria-label') || '')));
    return m;
  }
  async function viaTable() {
    load(false);
    const m = await mount();
    await click($('#citylab-tab-table'));
    await choose($('select[aria-label="Land use for parcel A9"]'), 'housing_mid');
    await click($('#citylab-tab-design'));
    return m;
  }
  async function via3d() {
    load(true);
    const m = await open3d();
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(P.basePlan('riverbend'));
    await stageClick('A9');
    return m;
  }

  it('lands the same plan, the same move count and the same spoken delta', async () => {
    const results = [];
    for (const run of [viaGrid, viaInspector, viaTable, via3d]) {
      const m = await run();
      const p = plan(m);
      results.push({ use: p.uses.A9, edits: p.editCount, said: last(m.announced) });
      expect(buttonByText('Undo').disabled, run.name + ': nothing to undo').toBe(false);
      if (root) await act(() => root.unmount());
      root = null;
      document.body.innerHTML = '<div id="root"></div>';
      window.localStorage.removeItem(STORE_KEY);
    }
    expect(results[0].use).toBe('housing_mid');
    expect(results[0].edits).toBe(1);
    expect(results[0].said).toMatch(/^A9 set to Housing, mid density\. New homes/);
    results.slice(1).forEach((r) => expect(r).toEqual(results[0]));
    expect(errors).toEqual([]);
  });

  it('a 3D click waits for the prediction when one is due, with the model frozen', async () => {
    load(true);
    const m = await open3d({ toolData: { _cityLab: { predictEvery: true } } });
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(P.basePlan('riverbend'));
    await stageClick('A9');
    // Not applied: the plan, and so every model-tied mesh, is the old plan.
    expect(plan(m).uses.A9).toBe('field');
    expect(last(rec.pushes).massing.ground.find((g) => g.id === 'A9').colour).toBe(P.USE_BY_ID.field.fill);
    expect(last(rec.pushes).ghost).toEqual({ a: 'A9' });
    expect($('[data-citylab-staged-badge]')).toBeTruthy();
    expect(last(m.announced)).toMatch(/^Waiting, not applied yet: A9 set to Housing, mid density\./);
    expect(last(m.announced)).not.toMatch(/New homes/);
    // The card docks beside the stage, and only there.
    const card = $$('section').filter((s) => { const h3 = s.querySelector(':scope > h3'); return !!h3 && h3.textContent === 'Before you look'; });
    expect(card).toHaveLength(1);
    expect($('[data-allo-fs-stage]').contains(card[0])).toBe(true);
    await click(buttonByText('up'));
    expect(plan(m).uses.A9).toBe('housing_mid');
    expect(last(rec.pushes).ghost).toBe(null);
    // The answered card is gone; focus goes back to the stage, not the page.
    expect(document.activeElement.id).toBe('citylab-stage');
    expect(errors).toEqual([]);
  });

  it('spends the move budget from a 3D click like any other edit', async () => {
    load(true);
    const challenge = P.startChallenge('riverbend', 1);
    const m = await open3d({ toolData: { _cityLab: { plan: challenge } } });
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(challenge);
    await stageClick('A9');
    expect(plan(m).editCount).toBe(1);
    await stageClick('A8');
    expect(plan(m).uses.A8).toBe(challenge.uses.A8);
    expect(last(m.announced)).toMatch(/No moves left/);
  });

  it('refuses the river from the model and says why', async () => {
    load(true);
    const m = await open3d();
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(P.basePlan('riverbend'));
    const water = FIRST_WATER();
    await stageClick(water);
    expect(plan(m).uses[water]).toBe('water');
    expect(last(m.announced)).toMatch(/The river is terrain, not zoning/);
    expect($('[data-citylab-stage-note]').textContent).toMatch(/The river is terrain/);
  });
});

describe('W1 - roads on the model and on the keyboard', () => {
  // A pair of neighbours with no street between them in the base town.
  function freePair() {
    const base = P.basePlan('riverbend');
    for (const id of P.allParcelIds()) {
      if (base.uses[id] === 'water') continue;
      const c = P.COLS.indexOf(id[0]), r = +id.slice(1);
      if (c >= P.N_COLS - 1) continue;
      const b = P.COLS[c + 1] + r;
      if (base.uses[b] === 'water') continue;
      if (!base.edges[P.edgeKey(id, b)]) return [id, b];
    }
    throw new Error('no free pair');
  }

  it('builds a road by clicking a parcel and then its neighbour, and moves the start for a far one', async () => {
    load(true);
    const [a, b] = freePair();
    const m = await open3d();
    await click($('[data-citylab-tool="road"]'));
    fakeScene(P.basePlan('riverbend'));
    await stageClick(a);
    expect(last(rec.pushes).roadFrom).toBe(a);
    // Two columns away is not a neighbour: the start moves, nothing is built.
    const far = P.COLS[P.COLS.indexOf(a[0]) + 2] + a.slice(1);
    await stageClick(far);
    expect(last(rec.pushes).roadFrom).toBe(far);
    expect(plan(m).editCount || 0).toBe(0);
    await stageClick(a);
    await stageClick(b);
    expect(plan(m).edges[P.edgeKey(a, b)]).toBe('local');
    expect(last(m.announced)).toMatch(new RegExp('^Built a connection from ' + a + ' to ' + b));
    expect(last(rec.pushes).roadFrom).toBe(null);
  });

  it('Shift + arrow builds a connection in the grid, moves on, and Shift + the way back removes it', async () => {
    load(false);
    const [a, b] = freePair();
    const m = await mount();
    const cell = $('#citylab-parcel-' + a);
    cell.focus();
    await key(cell, 'ArrowRight', { shiftKey: true });
    expect(plan(m).edges[P.edgeKey(a, b)]).toBe('local');
    expect(document.activeElement.id).toBe('citylab-parcel-' + b);
    await key(document.activeElement, 'ArrowLeft', { shiftKey: true });
    expect(plan(m).edges[P.edgeKey(a, b)]).toBeUndefined();
    expect(last(m.announced)).toMatch(new RegExp('^Removed a connection from ' + b + ' to ' + a));
    expect(document.activeElement.id).toBe('citylab-parcel-' + a);
  });
});

describe('W1 - the camera', () => {
  it('a drag turns the model and edits nothing; no XP for looking', async () => {
    load(true);
    const m = await open3d();
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(P.basePlan('riverbend'));
    window.__pickId = 'A9';
    await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 130, 100);
    await pointer('pointermove', 160, 100);
    await pointer('pointerup', 160, 100);
    expect(plan(m).uses.A9).toBe('field');
    expect(last(rec.pushes).rotY).not.toBe(P.CAM_HOME.rotY);
    expect(m.award).not.toHaveBeenCalled();
  });

  it('a press that moves under 6 px is still a click, and the camera stays put', async () => {
    load(true);
    const m = await open3d();
    await click($('[data-citylab-tool="housing_mid"]'));
    fakeScene(P.basePlan('riverbend'));
    window.__pickId = 'A9';
    await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 103, 101);
    await pointer('pointerup', 103, 101);
    expect(plan(m).uses.A9).toBe('housing_mid');
    expect(last(rec.pushes).rotY).toBe(P.CAM_HOME.rotY);
  });

  it('the focused stage takes arrows to orbit, plus and minus to zoom and Home to reset', async () => {
    load(true);
    await open3d();
    const stage = $('#citylab-stage');
    expect(stage.tabIndex).toBe(0);
    await key(stage, 'ArrowLeft');
    expect(last(rec.pushes).rotY).toBe(P.CAM_HOME.rotY - 15);
    await key(stage, 'ArrowUp');
    expect(last(rec.pushes).rotX).toBe(P.CAM_HOME.rotX + 8);
    await key(stage, '+');
    expect(last(rec.pushes).zoom).toBeGreaterThan(1);
    await key(stage, 'Home');
    expect(last(rec.pushes)).toMatchObject(P.CAM_HOME);
  });

  it('"Closer" moves the camera closer (the viewer divides its distance by zoom)', async () => {
    load(true);
    await open3d();
    // W4: the camera row folds at every width; Closer and Further are under More camera.
    await click($('[data-citylab-cam-more]'));
    await click(buttonByAria('Move the camera closer'));
    expect(last(rec.pushes).zoom).toBeGreaterThan(1);
    // W3: Reset now also shows the whole map, and its name says so (cam_reset_aria_v2).
    await click(buttonByAria('Show the whole map from the starting angle'));
    await click(buttonByAria('Move the camera further away'));
    expect(last(rec.pushes).zoom).toBeLessThan(1);
  });

  it('offers Bird\'s eye, Corner and Street presets', async () => {
    load(true);
    await open3d();
    await click(buttonByText('Bird\'s eye'));
    expect(last(rec.pushes)).toMatchObject(P.CAM_PRESETS.bird);
    await click(buttonByText('Street'));
    expect(last(rec.pushes)).toMatchObject(P.CAM_PRESETS.street);
    await click(buttonByText('Corner'));
    expect(last(rec.pushes)).toMatchObject(P.CAM_PRESETS.corner);
  });

  it('the stage lets a vertical swipe scroll the page, and every board control is at least 44 px', async () => {
    load(true);
    await open3d();
    expect($('#citylab-stage').style.touchAction).toBe('pan-y');
    const groups = ['Move the camera', 'Tools for the 3D model: pick one, then click a parcel', 'Map view'];
    groups.forEach((g) => {
      const btns = $$('[aria-label="' + g + '"] button');
      expect(btns.length, g).toBeGreaterThan(2);
      btns.forEach((b) => expect(b.style.minHeight, g + ': ' + b.textContent).toBe('44px'));
    });
    ['Undo', 'Redo'].forEach((t) => expect(buttonByText(t).style.minHeight).toBe('44px'));
  });
});

describe('W1 - hover chip', () => {
  it('shows the hovered parcel in the inspector\'s own numbers', async () => {
    load(true);
    await open3d();
    fakeScene(P.basePlan('riverbend'));
    window.__pickId = 'C6';
    await pointer('pointermove', 120, 90);
    const chip = $('[data-citylab-hover-chip]');
    expect(chip.getAttribute('data-citylab-hover-chip')).toBe('C6');
    expect(last(rec.pushes).hoverId).toBe('C6');
    // The inspector for the same parcel prints the same coefficient.
    await click($('#citylab-parcel-C6'));
    const c = (document.body.textContent.match(/Runoff coefficient C = ([0-9.]+)\./) || [])[1];
    expect(c).toBeTruthy();
    expect(chip.textContent).toContain('C = ' + c);
  });
});

describe('W1 - the board you get, and the one you keep', () => {
  it('3D at 768 px and wider on a capable device, the map otherwise; a saved choice wins', () => {
    load(true);
    const t2 = { viewer: true, webgl: true, width: 1280, cores: 8, memory: 8 };
    expect(P.renderTier(t2)).toBe('T2');
    expect(P.defaultBoardView(t2)).toBe('model');
    expect(P.defaultBoardView(Object.assign({}, t2, { width: 390 }))).toBe('use');
    expect(P.renderTier(Object.assign({}, t2, { reducedMotion: true }))).toBe('T1');
    expect(P.renderTier(Object.assign({}, t2, { cores: 4 }))).toBe('T1');
    expect(P.renderTier(Object.assign({}, t2, { memory: 4 }))).toBe('T1');
    // W4 (lead, after W3): T1 shows the town in 3D too, standing still.
    expect(P.defaultBoardView(Object.assign({}, t2, { cores: 2 }))).toBe('model');
    expect(P.defaultBoardView(Object.assign({}, t2, { cores: 2, width: 700 }))).toBe('use');
    expect(P.renderTier(Object.assign({}, t2, { webgl: false }))).toBe('T0');
    expect(P.defaultBoardView(Object.assign({}, t2, { viewer: false }))).toBe('use');
    expect(P.defaultBoardView(t2, 'heat')).toBe('heat');
    expect(P.defaultBoardView(t2, 'nonsense')).toBe('model');
  });

  it('opens on the saved board and remembers a new choice in toolData', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    expect($('[data-citylab-board3d="live"]')).toBeTruthy();
    // W4: a lens no longer leaves the 3D board; it is the lens both boards
    // show. The Map button changes the board and keeps the lens.
    await click(buttonByAria('Show the map by height'));
    expect(m.latest._cityLab.boardView).toBe('model');
    expect(m.latest._cityLab.lens).toBe('elevation');
    expect($('[data-citylab-board3d="live"]')).toBeTruthy();
    await click(buttonByAria('Show the flat map, with the same lens'));
    expect(m.latest._cityLab.boardView).toBe('elevation');
    expect($('[data-citylab-board3d]')).toBeFalsy();
  });

  it('jsdom has no WebGL, so a fresh student gets the map', async () => {
    load(true);
    await mount();
    expect($('#citylab-parcel-D6')).toBeTruthy();
    expect($('[data-citylab-board3d]')).toBeFalsy();
  });
});

describe('W1 - a lost context falls back to the map, focus kept', () => {
  it('drops to the map on the selected parcel, then offers Back to 3D after a restore', async () => {
    load(true);
    const m = await open3d();
    const core = P.SCENARIOS.riverbend.coreParcel;
    const stage = $('#citylab-stage');
    await act(async () => { stage.focus(); });
    expect(document.activeElement).toBe(stage);
    await act(async () => { rec.viewer._set('failed'); });
    await flush();
    expect($('[data-citylab-3d-fallback="lost"]')).toBeTruthy();
    expect(document.activeElement.id).toBe('citylab-parcel-' + core);
    expect(m.announced.some((s) => /stopped working/.test(s))).toBe(true);
    // The stage stays mounted (hidden), so the viewer can hear the restore.
    expect(last(rec.attaches)).toBe('node');
    expect(buttonByText('Back to 3D')).toBeFalsy();
    await act(async () => { rec.viewer._set('ready'); });
    await click(buttonByText('Back to 3D'));
    expect($('[data-citylab-board3d="live"]')).toBeTruthy();
    expect(document.activeElement.id).toBe('citylab-stage');
    expect(errors).toEqual([]);
  });

  it('still hears the viewer after a switch to Land use and back', async () => {
    load(true);
    await open3d();
    // W4: the map board is its own button now (a lens keeps the 3D board).
    await click(buttonByAria('Show the flat map, with the same lens'));
    await flush();
    await click(buttonByAria('Show the map by 3D'));
    await flush();
    await act(async () => { rec.viewer._set('failed'); });
    await flush();
    expect(document.body.textContent).toMatch(/stopped working|not available on this device/);
  });

  it('learns the model is live even when the viewer was ready before React subscribed', async () => {
    // The real host resolves ensureThree in a microtask, which can land before
    // the status effect subscribes. This stand-in is ready inside attach and
    // never notifies again, so only a read at subscribe time can see it.
    resetStemLab();
    delete window.__alloCityLabPure;
    rec = { pushes: [], attaches: [], viewer: null };
    const inner = hostLikeViewer();
    window.StemLab.makeOrbitViewer = function () {
      const api = inner();
      api.attach = function (host) {
        rec.attaches.push(host ? 'node' : null);
        if (host) { api._set('loading'); api._set('ready'); }
      };
      return api;
    };
    loadTool(FILE, 'cityLab');
    P = window.__alloCityLabPure;
    await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    await act(async () => { rec.viewer._set('failed'); });
    await flush();
    expect($('[data-citylab-3d-fallback="lost"]'), 'a loss after a live model must read as lost, not as no WebGL').toBeTruthy();
  });

  it('without a viewer at all, the map is the board and no canvas is left', async () => {
    load(false);
    await open3d();
    expect(document.body.textContent).toContain('The 3D model is not available on this device.');
    expect($('#citylab-parcel-D6')).toBeTruthy();
    expect($('canvas')).toBeFalsy();
  });

  it('detaches the viewer on unmount', async () => {
    load(true);
    await open3d();
    await act(() => root.unmount());
    root = null;
    expect(last(rec.attaches)).toBe(null);
  });
});

describe('W1 - every new string goes through the translator', () => {
  it('leaves no untranslated prose on the 3D board', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model' } } });
    fakeScene(P.basePlan('riverbend'));
    window.__pickId = 'C6';
    await pointer('pointermove', 120, 90);
    await click($('[data-citylab-tool="road"]'));
    await stageClick('C6');
    const board = $('[data-citylab-board3d]');
    const found = [];
    const walker = document.createTreeWalker(board, window.NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const s = n.nodeValue.trim();
      if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
      if (/[a-z]{4,}/.test(s)) found.push(s.slice(0, 80));
    }
    [...board.querySelectorAll('[aria-label]')].forEach((el) => {
      const s = el.getAttribute('aria-label');
      if (/[a-z]{4,}/.test(s) && s.indexOf('«') === -1) found.push('aria: ' + s.slice(0, 80));
    });
    expect(found).toEqual([]);
  });
});
