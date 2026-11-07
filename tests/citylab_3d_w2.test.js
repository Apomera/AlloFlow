// City Lab 3D, wave 2 (2026-11-04): the city responds and looks like a town.
//
// What has to be TRUE about the moving, living picture is that it is the
// model, drawn: one figure per 12 homes a road reaches and none anywhere
// else, cars only on roads that reach the centre, buses only at stops the
// scorecard counts, chips that say exactly what the spoken delta says, and a
// model that stays frozen while an edit waits for a prediction. Then the
// motion rules: reduced motion read live and snapping to the end state, the
// Animation switch, and the phone camera fold.
//
// jsdom has no WebGL, so the viewer is a stand-in shaped like the host's
// makeOrbitViewer, and the scene is the tool's real buildCityScene on a
// minimal Three.js (each part becomes a plain mesh there). The real-WebGL
// half is tests/e2e/citylab-3d-w2.spec.ts.
//
// CITYLAB_FILE=<path> runs this suite against another copy (the wave's start
// copy, or a mutant) to show which tests fail on the old behaviour.
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
let mql = null;

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

// A MediaQueryList for prefers-reduced-motion that a test can flip, with
// listeners it can count.
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

// A capable device as boardEnv reads it: WebGL present, 8 cores, 8 GB.
function capableDevice() {
  window.WebGLRenderingContext = function () {};
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
  Object.defineProperty(window.navigator, 'deviceMemory', { value: 8, configurable: true });
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
  mql = installMotionQuery(false);
  capableDevice();
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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
const last = (arr) => arr[arr.length - 1];
const plan = (m) => m.latest._cityLab && m.latest._cityLab.plan;
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function open3d(opts) {
  return mount(Object.assign({}, opts || {}, {
    toolData: { _cityLab: Object.assign({ boardView: 'model' }, ((opts || {}).toolData || {})._cityLab || {}) }
  }));
}

// A plan with work in it: homes on a served field, homes with no road, a
// stop a road reaches and one it does not, and a new street.
function busyPlan() {
  let p = P.basePlan('riverbend');
  const served = P.servedParcels(p);
  const fields = P.allParcelIds().filter((id) => p.uses[id] === 'field');
  const servedField = fields.find((id) => served[id]);
  const lonely = fields.find((id) => !served[id] && P.neighbours(id).every((n) => !served[n.id]));
  p = P.setUse(p, servedField, 'housing_mid');
  p = P.setUse(p, lonely, 'mixed');
  p = P.toggleTransit(p, P.SCENARIOS.riverbend.coreParcel);
  p = Object.assign(P.clonePlan(p), { transit: Object.assign({}, p.transit, { [lonely]: true }) });
  return { p, servedField, lonely };
}

describe('W2 - livingCity is the model, drawn', () => {
  it('draws one figure per 12 homes a road reaches, every figure on a served home, in every town', () => {
    load(true);
    const cases = P.SCENARIO_IDS.map((sid) => P.basePlan(sid)).concat([busyPlan().p]);
    cases.forEach((p) => {
      const L = P.livingCity(p, 'central');
      const sc = P.scorecard(p, 'central');
      const served = P.servedParcels(p);
      expect(L.ratio).toBe(12);
      expect(L.people.length, p.scenarioId).toBe(Math.round(sc.tier1.totalUnitsServed / 12));
      expect(L.unitsServed).toBe(sc.tier1.totalUnitsServed);
      // Each served housing parcel holds its share: floor or ceil of units / 12.
      const per = {};
      L.people.forEach((f) => { per[f.id] = (per[f.id] || 0) + 1; });
      L.people.forEach((f) => {
        expect(served[f.id], f.id + ' is not served').toBe(true);
        expect(P.USE_BY_ID[p.uses[f.id]].units, f.id + ' has no homes').toBeGreaterThan(0);
        const c = P.parcelCentre(f.id);
        [f.x0, f.x1].forEach((x) => expect(Math.abs(x - c.x)).toBeLessThan(0.5));
        [f.z0, f.z1].forEach((z) => expect(Math.abs(z - c.z)).toBeLessThan(0.5));
      });
      Object.keys(per).forEach((id) => {
        const share = P.USE_BY_ID[p.uses[id]].units / 12;
        expect(per[id]).toBeGreaterThanOrEqual(Math.floor(share));
        expect(per[id]).toBeLessThanOrEqual(Math.ceil(share));
      });
    });
  });

  it('puts no agent off the network: no figure, car or bus where no road reaches', () => {
    load(true);
    const { p, lonely } = busyPlan();
    const L = P.livingCity(p, 'central');
    const served = P.servedParcels(p);
    const sc = P.scorecard(p, 'central');
    expect(served[lonely]).toBeFalsy();
    expect(L.noRoad).toContain(lonely);
    expect(L.people.filter((f) => f.id === lonely)).toEqual([]);
    expect(L.unitsUnserved).toBe(sc.tier1.unitsUnserved);
    L.cars.forEach((c) => {
      expect(['existing', 'local', 'arterial']).toContain(p.edges[c.key]);
      expect(served[c.a] && served[c.b], c.key).toBe(true);
    });
    expect(L.buses.map((b) => b.id).sort()).toEqual(sc.transitStops.slice().sort());
    expect(L.buses.map((b) => b.id)).not.toContain(lonely);
    // Cut the town's only road into the new homes: their figures go, the
    // parcel joins the no-road list, and no car stays on the dead road.
    const homes = busyPlan().servedField;
    let cut = P.clonePlan(p);
    P.neighbours(homes).forEach((n) => {
      const k = P.edgeKey(homes, n.id);
      if (cut.edges[k] && cut.edges[k] !== 'existing') delete cut.edges[k];
    });
    if (P.servedParcels(cut)[homes]) return;   // reached by an existing street: nothing to cut
    const L2 = P.livingCity(cut, 'central');
    expect(L2.people.filter((f) => f.id === homes)).toEqual([]);
    expect(L2.noRoad).toContain(homes);
  });

  it('keeps cars sparse and uniform, and changes nothing it reads', () => {
    load(true);
    const { p } = busyPlan();
    const before = JSON.stringify(p);
    const sc = JSON.stringify(P.scorecard(p, 'central'));
    const L = P.livingCity(p, 'central');
    expect(L.cars.length).toBe(Math.min(P.CAR_CAP, Math.ceil(L.servedRoads / P.ROADS_PER_CAR)));
    expect(L.cars.length).toBeLessThan(L.servedRoads);
    expect(JSON.stringify(p)).toBe(before);
    expect(JSON.stringify(P.scorecard(p, 'central'))).toBe(sc);
    expect(P.livingCity(p, 'central')).toEqual(L);         // the same plan, the same town
  });
});

describe('W2 - what grows, and the chips', () => {
  it('grows the parcel or the connection that changed, and nothing on a town switch', () => {
    load(true);
    const base = P.basePlan('riverbend');
    expect(P.planGrowth(base, P.setUse(base, 'A9', 'park'))).toEqual({ ids: ['A9'], edges: [] });
    const withRoad = P.setEdge(base, 'A9', 'B9', 'local');
    expect(P.planGrowth(base, withRoad).edges).toEqual([P.edgeKey('A9', 'B9')]);
    expect(P.planGrowth(base, P.toggleTransit(base, P.SCENARIOS.riverbend.coreParcel)).ids).toEqual([P.SCENARIOS.riverbend.coreParcel]);
    expect(P.planGrowth(base, P.basePlan('mesahollow'))).toEqual({ ids: [], edges: [] });
    expect(P.planGrowth(null, base)).toEqual({ ids: [], edges: [] });
  });

  it('builds every chip number from the same values as the scorecard difference', () => {
    load(true);
    const base = P.basePlan('riverbend');
    const { p } = busyPlan();
    const a = P.scorecard(base, 'central'), b = P.scorecard(p, 'central');
    const chips = P.deltaChips(P.deltaValues(a, b));
    const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
    expect(byId.homes.text).toBe(String(Math.abs(b.tier1.newUnitsServed - a.tier1.newUnitsServed)));
    expect(byId.homes.up).toBe(b.tier1.newUnitsServed > a.tier1.newUnitsServed);
    expect(byId.c.text).toBe(Math.abs(b.tier2.runoffCoefficient - a.tier2.runoffCoefficient).toFixed(3));
    // A change to nothing makes no chips.
    expect(P.deltaChips(P.deltaValues(a, a))).toEqual([]);
  });

  it('shows the chips on the board after an edit, matching the spoken delta', async () => {
    load(true);
    const base = P.basePlan('riverbend');
    const served = P.servedParcels(base);
    const id = P.allParcelIds().find((x) => base.uses[x] === 'field' && served[x]);
    const m = await open3d();
    const cell = $('#citylab-parcel-' + id);
    cell.focus();
    await key(cell, '6');                       // housing, mid density
    const after = P.scorecard(plan(m), 'central'), before = P.scorecard(base, 'central');
    const dU = after.tier1.newUnitsServed - before.tier1.newUnitsServed;
    const dC = (after.tier2.runoffCoefficient - before.tier2.runoffCoefficient).toFixed(3);
    const chips = $$('[data-citylab-chip]').map((n) => n.textContent);
    expect(chips).toEqual(['+' + dU + ' homes reached', 'Runoff C +' + dC]);
    expect(last(m.announced)).toContain('up ' + dU + '.');
    expect(last(m.announced)).toContain('up ' + dC + '.');
    // The growth token moved and names the parcel.
    expect(last(rec.pushes).grow.ids).toEqual([id]);
    // Undo clears them: they describe the last edit, and undo is not one.
    await click(buttonByText('Undo'));
    expect($$('[data-citylab-chip]')).toEqual([]);
  });
});

describe('W2 - the model stays frozen while an edit is staged', () => {
  it('pushes the old town, frozen and still, with no chips, until the prediction is in', async () => {
    load(true);
    const base = P.basePlan('riverbend');
    const served = P.servedParcels(base);
    const id = P.allParcelIds().find((x) => base.uses[x] === 'field' && served[x]);
    const m = await open3d({ toolData: { _cityLab: { predictEvery: true } } });
    const pre = last(rec.pushes);
    expect(pre.frozen).toBe(false);
    expect(pre.motion).toBe(true);
    const cell = $('#citylab-parcel-' + id);
    cell.focus();
    await key(cell, '6');
    const staged = last(rec.pushes);
    expect(plan(m) ? plan(m).uses[id] : 'field').toBe('field');
    expect(staged.frozen).toBe(true);
    expect(staged.static).toBe(true);
    expect(staged.sig).toBe(pre.sig);
    expect(staged.living).toEqual(P.livingCity(base, 'central'));
    expect(staged.grow).toEqual(pre.grow);
    expect(staged.ghost).toEqual({ a: id });
    expect($$('[data-citylab-chip]')).toEqual([]);
    await click(buttonByText('up'));
    const done = last(rec.pushes);
    expect(done.frozen).toBe(false);
    expect(done.living.people.length).toBeGreaterThan(pre.living.people.length);
    expect(done.grow.ids).toEqual([id]);
    expect($$('[data-citylab-chip]').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});

describe('W2 - motion: the switch, reduced motion and the tiers', () => {
  it('the Animation switch turns the motion off and on, kept in toolData', async () => {
    load(true);
    const m = await open3d();
    const sw = $('[data-citylab-motion-switch]');
    expect(sw.getAttribute('aria-pressed')).toBe('true');
    expect(last(rec.pushes).motion).toBe(true);
    expect(last(rec.pushes).static).toBe(false);
    await click(sw);
    expect(m.latest._cityLab.motionOff).toBe(true);
    expect(last(rec.pushes).motion).toBe(false);
    expect(last(rec.pushes).static).toBe(true);
    expect($('[data-citylab-motion-switch]').getAttribute('aria-pressed')).toBe('false');
    expect(last(m.announced)).toMatch(/^Animation off/);
    await click($('[data-citylab-motion-switch]'));
    expect(last(rec.pushes).motion).toBe(true);
    expect($('[data-citylab-motion-switch]').style.minHeight).toBe('44px');
  });

  it('reads reduced motion live, stills the town, says why, and unsubscribes on unmount', async () => {
    load(true);
    await open3d();
    expect(mql.listeners.size).toBe(1);
    expect(last(rec.pushes).motion).toBe(true);
    await act(async () => { mql.flip(true); });
    expect(last(rec.pushes).motion).toBe(false);
    expect(last(rec.pushes).static).toBe(true);
    const sw = $('[data-citylab-motion-switch]');
    expect(sw.disabled).toBe(true);
    expect(sw.getAttribute('aria-pressed')).toBe('false');
    expect($('[data-citylab-motion]').textContent).toMatch(/asks for less motion/);
    await act(async () => { mql.flip(false); });
    expect(last(rec.pushes).motion).toBe(true);
    await act(() => root.unmount());
    root = null;
    expect(mql.listeners.size).toBe(0);
  });

  it('a low-power device (T1) keeps the town still', async () => {
    load(true);
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 4, configurable: true });
    await open3d();
    expect(last(rec.pushes).motion).toBe(false);
    expect($('[data-citylab-motion]').textContent).toMatch(/standing still, to keep it responsive/);
  });

  it('the frame watchdog drops the board to still and says so', async () => {
    load(true);
    const m = await open3d();
    await act(async () => { last(rec.pushes).onSlow(); });
    expect(last(rec.pushes).motion).toBe(false);
    expect(m.announced.some((s) => /drawing the model slowly/.test(s))).toBe(true);
  });
});

// The tool's real scene on a minimal Three.js: every part a plain mesh.
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

describe('W2 - the scene: growth, reduced motion read inside the frame, frozen agents', () => {
  function grownScene() {
    const base = P.basePlan('riverbend');
    const next = P.setUse(base, 'A9', 'housing_mid');
    const g = P.planGrowth(base, next);
    const S = fakeScene(next, { grow: { token: 1, ids: g.ids, edges: g.edges, at: Date.now() } });
    const b = S.cityBatches.box;
    const i = b.grow[0];
    return { S, b, i, spec: b.specs[i] };
  }

  it('grows the changed parcel over 400 ms, then stops asking for frames', () => {
    load(true);
    const { S, b, i, spec } = grownScene();
    expect(S.cityGrowing).toBe(true);
    expect(b.meshes[i].scale.y).toBeLessThan(spec.sy * 0.05);
    S.data = { motion: true, static: false };
    S.tick(1000);                                // the frame that draws the rebuild
    S.tick(1300);                                // the clock starts here, not at the slow frame
    expect(b.meshes[i].scale.y).toBeLessThan(spec.sy * 0.05);
    S.tick(1500);
    expect(S.cityGrowing).toBe(true);
    expect(b.meshes[i].scale.y).toBeGreaterThan(spec.sy * 0.05);
    expect(b.meshes[i].scale.y).toBeLessThan(spec.sy);
    S.tick(1700);
    expect(S.cityGrowing).toBe(false);
    expect(b.meshes[i].scale.y).toBeCloseTo(spec.sy, 9);
    // Agents still walk until the idle time is up; then the scene goes still.
    expect(S.data.static).toBe(false);
    S.tick(1400 + P.CITY_IDLE_MS + 10);
    expect(S.data.static).toBe(true);
  });

  it('snaps a growth to its end state on the first frame reduced motion is on', () => {
    load(true);
    const { S, b, i, spec } = grownScene();
    S.data = { motion: true, static: false };
    S.tick(1000);
    expect(S.cityGrowing).toBe(true);
    mql.matches = true;                          // read in the frame, no event needed
    S.tick(1050);
    expect(S.cityGrowing).toBe(false);
    expect(b.meshes[i].scale.y).toBeCloseTo(spec.sy, 9);
    expect(S.data.static).toBe(true);
  });

  it('the watchdog trips on sustained slow frames only, not on a slow start or one bad patch', () => {
    load(true);
    function run(intervals) {
      const S = fakeScene(P.basePlan('riverbend'));
      const onSlow = vi.fn();
      S.data = { motion: true, static: false, onSlow };
      let now = 1000;
      S.tick(now);
      intervals.forEach((dt) => { now += dt; S.tick(now); });
      return { tripped: !!S.cityWdTripped, calls: onSlow.mock.calls.length };
    }
    const many = (n, dt) => Array(n).fill(dt);
    expect(run(many(20 + 200, 50))).toEqual({ tripped: true, calls: 1 });         // sustained 50 ms
    expect(run(many(20 + 200, 23))).toEqual({ tripped: false, calls: 0 });        // this machine's swiftshader
    expect(run(many(20, 240).concat(many(200, 20)))).toEqual({ tripped: false, calls: 0 });   // a slow start
    expect(run(many(20, 20).concat(many(90, 50), many(90, 20), many(90, 50)))).toEqual({ tripped: false, calls: 0 });
  });

  it('holds the figures still while an edit is staged, and walks them otherwise', () => {
    load(true);
    const S = fakeScene(P.basePlan('riverbend'));
    const fig = S.cityBatches.people.meshes[0];
    S.data = { motion: true, frozen: true, static: false };
    S.tick(1000); const x0 = fig.position.x + fig.position.z;
    S.tick(1040); S.tick(1080);
    expect(fig.position.x + fig.position.z).toBe(x0);
    expect(S.data.static).toBe(true);
    S.data = { motion: true, frozen: false, static: false };
    S.tick(2000); S.tick(2040); S.tick(2080);
    expect(fig.position.x + fig.position.z).not.toBe(x0);
    expect(S.data.static).toBe(false);
  });
});

describe('W2 - the town: shape tells the uses apart, windows tell the roads', () => {
  const kinds = ['box', 'prism', 'round', 'cone'];
  function shapeOf(useId) {
    const p = P.setUse(P.basePlan('riverbend'), 'A9', useId);
    const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette('light'), null);
    const sig = {};
    kinds.forEach((k) => {
      sig[k] = parts[k].filter((s) => s.id === 'A9').map((s) => [s.sx, s.sy, s.sz].map((v) => v.toFixed(3)).join('x')).sort().join(';');
    });
    return JSON.stringify(sig);
  }

  it('gives every land use its own shape, colour aside', () => {
    load(true);
    const shapes = P.PALETTE_IDS.map(shapeOf);
    expect(new Set(shapes).size).toBe(P.PALETTE_IDS.length);
  });

  it('lights the windows of homes a road reaches, darkens the rest, and signs them "no road"', () => {
    load(true);
    const pal = P.scenePalette('light');
    const { p, servedField, lonely } = busyPlan();
    const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), pal, null);
    const colours = (id) => parts.box.filter((s) => s.id === id).map((s) => s.c);
    expect(colours(servedField)).toContain(pal.lit);
    expect(colours(servedField)).not.toContain(pal.unlit);
    expect(colours(lonely)).toContain(pal.unlit);
    expect(colours(lonely)).not.toContain(pal.lit);
    expect(parts.sign.map((s) => s.id)).toEqual([lonely]);
  });

  it('draws the ground up from the lowest parcel, every height difference at the one exaggeration', () => {
    load(true);
    P.SCENARIO_IDS.forEach((sid) => {
      const m = P.buildMassing(P.basePlan(sid), 'central', null);
      const low = Math.min(...m.ground.map((g) => g.top));
      expect(low).toBeCloseTo(P.GROUND_PLINTH, 9);
      const a = m.ground[0], b = m.ground[m.ground.length - 1];
      const ea = P.terrainAt(a.id, sid).elevationM, eb = P.terrainAt(b.id, sid).elevationM;
      expect(a.top - b.top).toBeCloseTo(P.metresToWorld(ea - eb), 9);
    });
  });
});

describe('W2 - phones: the camera folds into presets and More camera', () => {
  it('shows the presets, hides the rest behind a disclosure, and every button is 44 px', async () => {
    load(true);
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
    await open3d();
    const more = $('[data-citylab-cam-more]');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(buttonByText('Turn left')).toBeFalsy();
    expect(buttonByText('Bird\'s eye')).toBeTruthy();
    expect(buttonByText('Reset view')).toBeTruthy();
    await click(more);
    expect($('[data-citylab-cam-more]').getAttribute('aria-expanded')).toBe('true');
    expect($('#citylab-cam-more')).toBeTruthy();
    expect(buttonByText('Turn left')).toBeTruthy();
    $$('[aria-label="Move the camera"] button').forEach((b) => expect(b.style.minHeight, b.textContent).toBe('44px'));
    expect(parseInt($('#citylab-stage').style.height, 10)).toBeLessThan(420);
  });

  // W4 (lead, after W3): the row folds at EVERY width now, so a wide screen
  // shows the same five presets plus More camera.
  it('folds the camera row on a wide screen too', async () => {
    load(true);
    await open3d();
    expect($('[data-citylab-cam-more]').getAttribute('aria-expanded')).toBe('false');
    expect(buttonByText('Turn left')).toBeFalsy();
    expect(['Bird\'s eye', 'Corner', 'Street', 'The town', 'Reset view'].every((x) => !!buttonByText(x))).toBe(true);
    await click($('[data-citylab-cam-more]'));
    expect(buttonByText('Turn left')).toBeTruthy();
  });
});

describe('W2 - every new string goes through the translator', () => {
  it('leaves no untranslated prose on the board after an edit, a staged edit and with motion off', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    const { p } = busyPlan();
    const base = P.basePlan('riverbend');
    const served = P.servedParcels(base);
    const id = P.allParcelIds().find((x) => base.uses[x] === 'field' && served[x] && p.uses[x] === 'field');
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model', plan: p } } });
    const cell = $('#citylab-parcel-' + id);
    cell.focus();
    await key(cell, '7');
    await act(async () => { mql.flip(true); });
    const board = $('[data-citylab-board3d]');
    const found = [];
    const walker = document.createTreeWalker(board, window.NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const s = n.nodeValue.trim();
      if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
      if (/[a-z]{4,}/.test(s)) found.push(s.slice(0, 80));
    }
    expect($$('[data-citylab-chip]').length).toBeGreaterThan(0);
    expect($('[data-citylab-living-noroad]')).toBeTruthy();
    expect(found).toEqual([]);
  });
});
