// City Lab 3D, wave 6 (2026-11-04): hardening.
//
// What has to be TRUE: the full brief (the 9-12 default) gets a strip that
// judges every requirement exactly as briefJudged does (the student's set AND
// the central one), whose only door to a celebration is Check my plan, never
// for a pass under the student's set alone or for an imported plan, with the
// brief's XP rule untouched, and whose rows offer their lens as a button; the
// dark and high-contrast scenes have a twin for EVERY lens fill (no near-white
// glare on the dark scene, no mid grey in contrast, a readable code ink on
// each), the contrast scene floats the map's land-use code over every parcel,
// shed rain is hatched slate and never the river's blue, the flood badges are
// larger and face the camera; the layout puts the board higher (the Start here
// chip in the title row, the folded strip in the coach's slot, one scrolling
// row each for the tabs, the lens bar and the palette under 768 px); and full
// screen floats a HUD whose Tab order stays on screen, whose Escape leaves,
// and which hands focus back to the Full screen button.
//
// jsdom has no WebGL: the viewer is a stand-in shaped like the host's
// makeOrbitViewer, and the scene is the tool's real buildCityScene on a
// minimal Three.js. The real-WebGL half is tests/e2e/citylab-3d-w6.spec.ts.
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
const LENSES = ['use', 'elevation', 'heat', 'park', 'transit', 'rain', 'flood', 'access'];

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
  delete window.__alloStemFS;
  rec = { pushes: [], viewer: null };
  if (withViewer) window.StemLab.makeOrbitViewer = hostLikeViewer();
  else delete window.StemLab.makeOrbitViewer;
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
}
function setWidth(w) { Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true }); }

beforeEach(() => {
  window.localStorage.removeItem(STORE_KEY);
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.WebGLRenderingContext = function () {};
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
  Object.defineProperty(window.navigator, 'deviceMemory', { value: 8, configurable: true });
  setWidth(1280);
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  errSpy.mockRestore();
  delete window.matchMedia;
  delete window.WebGLRenderingContext;
  setWidth(1024);
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
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function focus(el) { await act(async () => { el.focus(); }); }
const follows = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
const strip = () => $('[data-citylab-strip]');
const passes = () => P.celebrationLog().filter((c) => c.kind === 'pass');
function tabStopsIn(scope) {
  return [...scope.querySelectorAll('button, select, input, textarea, [tabindex]')].filter((n) => {
    if (n.disabled || n.tabIndex < 0) return false;
    for (let p = n; p; p = p.parentElement) if (p.hidden || (p.style && p.style.display === 'none')) return false;
    return true;
  });
}

// Plans from the stage E suite: one meeting the full brief under both sets,
// and one meeting it only under the student's (optimistic) set.
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
  let plan = P.setUse(briefPlan(), 'D1', 'civic');
  const roads = [['F1', 'G1'], ['G1', 'H1'], ['F2', 'G2'], ['G2', 'H2'], ['F3', 'G3'], ['G3', 'H3'], ['H3', 'I3'],
    ['F4', 'G4'], ['G4', 'H4'], ['H4', 'I4'], ['F5', 'G5'], ['G5', 'H5'], ['H5', 'I5'], ['I5', 'J5']];
  for (const e of roads) {
    if (!P.constraintReport(plan, 'central').allHardMet) break;
    plan = P.setEdge(plan, e[0], e[1], 'local');
  }
  return JSON.parse(JSON.stringify(Object.assign(P.clonePlan(plan), { assumptionSetId: 'optimistic' })));
}
// Every class in every lens: homes served and not, a park, a stop, cool roofs.
function busyPlan(town) {
  let p = P.basePlan(town || 'riverbend');
  const served = P.servedParcels(p);
  const fields = P.allParcelIds().filter((id) => p.uses[id] === 'field' && served[id]);
  p = P.setUse(p, fields[0], 'housing_mid');
  p = P.setUse(p, fields[1], 'housing_low');
  if (fields[2]) p = P.setUse(p, fields[2], 'park');
  if (fields[3]) p = P.setUse(p, fields[3], 'mixed');
  const lonely = P.allParcelIds().find((id) => p.uses[id] === 'field' && !P.servedParcels(p)[id]);
  if (lonely) p = P.setUse(p, lonely, 'housing_mid');
  p = P.toggleTransit(p, P.SCENARIOS[town || 'riverbend'].coreParcel);
  return JSON.parse(JSON.stringify(p));
}
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
  const S = { THREE: fakeThree(), model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34, rotX: 26 };
  P.buildCityScene(S.THREE, S, push);
  S.data = push;
  return S;
}
function pushFor(p, lens, theme) {
  return { massing: P.buildMassing(p, p.assumptionSetId || 'central', null), living: P.livingCity(p, p.assumptionSetId || 'central'),
    lens: P.lensCells(p, p.assumptionSetId || 'central', lens), theme, motion: false, static: true };
}
const lum = (hex) => {
  const c = String(hex).replace('#', '');
  const ch = [0, 2, 4].map((i) => { const x = parseInt(c.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const spread = (hex) => { const n = parseInt(String(hex).slice(1), 16); const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return Math.max(...v) - Math.min(...v); };
const bestInk = (f) => Math.max(P.contrastRatio(f, P.INK_LIGHT), P.contrastRatio(f, P.INK_DARK));
// A colour the contrast scene may use: black, white, or a hue (never a grey in between).
const hcOk = (c) => /^#(000000|ffffff)$/i.test(c) || spread(c) >= 48;

describe('W6 - the full-brief strip', () => {
  it('is the 9-12 default and judges every row with briefJudged: met only under the student\'s set AND the central one', async () => {
    load(true);
    for (const p of [JSON.parse(JSON.stringify(P.basePlan('riverbend'))), briefPlan(), briefTrapPlan()]) {
      await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p } } });
      expect(strip().getAttribute('data-citylab-strip-kind')).toBe('brief');
      expect(strip().getAttribute('data-citylab-strip')).toBe('open');
      const own = P.constraintReport(p, p.assumptionSetId);
      const bj = P.briefJudged(p, own);
      const rows = $$('[data-citylab-strip-row]');
      expect(rows.map((r) => r.getAttribute('data-citylab-strip-row'))).toEqual(own.rows.map((r) => r.id));
      own.rows.forEach((r, i) => {
        const both = r.met && bj.standardRows[r.id].met;
        expect(rows[i].getAttribute('data-met'), r.id).toBe(String(both));
        expect(rows[i].textContent).toContain(both ? 'Met:' : 'Not met yet:');
        expect(rows[i].textContent).toContain(r.label);
        expect(!!rows[i].querySelector('[data-citylab-brief-standard-only]')).toBe(r.met && !both);
      });
      const hard = own.rows.filter((r) => r.hard);
      const metBoth = hard.filter((r) => r.met && bj.standardRows[r.id].met).length;
      expect($('#citylab-strip-title').textContent).toContain('(Now: ' + metBoth + ' of ' + hard.length + ' required parts met)');
      await unmount();
    }
    // The trap is real on the rows: a required part met under optimistic only reads "not met".
    const trap = briefTrapPlan();
    const rows = P.briefRows(trap);
    expect(rows.some((r) => r.hard && r.ownMet && !r.met && r.standardOnly)).toBe(true);
    expect(errors).toEqual([]);
  });

  it('celebrates only on Check, only when both sets pass, and leaves the brief\'s XP rule alone', async () => {
    load(true);
    const m = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: briefPlan() } } });
    // W7 (Aaron): the brief's XP moved to Check my plan, once per town: none before it.
    const briefXp = () => m.award.mock.calls.filter((c) => c[0] === 'citylab_brief_riverbend').length;
    expect(briefXp()).toBe(0);
    expect($$('[data-citylab-strip-row]').filter((r) => r.getAttribute('data-met') === 'true').length).toBeGreaterThan(0);
    expect(passes()).toEqual([]);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect(rec.pushes.every((p) => p.celebrate === null)).toBe(true);
    const said = m.announced.length;
    await click($('[data-citylab-strip-check="brief"]'));
    expect(passes().map((c) => c.mid)).toEqual(['brief']);
    expect($('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('fireworks');
    expect($('[data-citylab-celebrate]').textContent).toContain('checked under your assumption set and under the central estimates');
    expect(last(rec.pushes).celebrate && last(rec.pushes).celebrate.token).toBeTruthy();
    expect(m.announced.length - said).toBe(1);
    expect(briefXp()).toBe(1);
    await unmount();

    // Under the student's set only: nothing, and the strip says why.
    const m2 = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: briefTrapPlan() } } });
    await click($('[data-citylab-strip-check="brief"]'));
    expect(passes()).toHaveLength(1);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect($('[data-citylab-strip-result]').getAttribute('data-citylab-strip-result')).toBe('standard_only');
    // Not even a quiet "met": the brief is not met until it is met under both sets.
    expect($('[data-citylab-mission-pass]')).toBe(null);
    expect(last(m2.announced)).toContain('Not met yet.');
    expect(m2.award).not.toHaveBeenCalled();
    await unmount();

    // An imported plan: met, said quietly, no fireworks and no XP.
    const m3 = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: Object.assign(briefPlan(), { imported: true }) } } });
    await click($('[data-citylab-strip-check="brief"]'));
    expect(passes()).toHaveLength(1);
    expect($('[data-citylab-celebrate]')).toBe(null);
    expect($('[data-citylab-mission-pass="quiet"]').textContent).toContain('earns no XP');
    expect(m3.award).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it('the gate itself: Check only, both sets, the student\'s own plan', () => {
    load(false);
    const own = { imported: false };
    expect(P.briefCelebrates({ allHardMet: true }, own)).toBe(true);
    expect(P.briefCelebrates({ allHardMet: false, ownAllHardMet: true }, own)).toBe(false);
    expect(P.briefCelebrates({ allHardMet: true }, { imported: true })).toBe(false);
    expect(P.briefCelebrates(null, own)).toBe(false);
    expect(P.briefCelebrates(P.briefJudged(briefPlan()), briefPlan())).toBe(true);
    expect(P.briefCelebrates(P.briefJudged(briefTrapPlan()), briefTrapPlan())).toBe(false);
  });

  it('offers each requirement\'s lens as a button that changes the lens only when pressed, in one toolbar', async () => {
    load(true);
    const m = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const lensNow = () => $('[data-citylab-lens-bar]').getAttribute('data-citylab-lens-bar');
    expect(lensNow()).toBe('use');
    $$('[data-citylab-strip-row]').forEach((row) => {
      const want = P.briefLens(row.getAttribute('data-citylab-strip-row'));
      const lensBtn = row.querySelector('[data-citylab-strip-lens]'), readBtn = row.querySelector('[data-citylab-strip-readout]');
      if (want.lens) expect(lensBtn.getAttribute('data-citylab-strip-lens')).toBe(want.lens);
      else if (want.readout) expect(readBtn.getAttribute('data-citylab-strip-readout')).toBe(want.readout);
    });
    const bar = $('[data-citylab-strip-bar="rows"]');
    expect(bar.getAttribute('role')).toBe('toolbar');
    expect(tabStopsIn(bar)).toHaveLength(1);
    const flood = $('[data-citylab-strip-row="req_flood"] [data-citylab-strip-lens]');
    await focus(flood);
    await click(flood);
    expect(lensNow()).toBe('flood');
    expect(m.latest._cityLab.lens).toBe('flood');
    expect(document.activeElement).toBe($('[data-citylab-strip-row="req_flood"] [data-citylab-strip-lens]'));
    // The cost row opens the cost readout, with the scorecard's own lines.
    await click($('[data-citylab-strip-row="req_cost"] [data-citylab-strip-readout]'));
    expect($('[data-citylab-strip-readout-body="cost"]')).toBeTruthy();
    $$('[data-citylab-strip] button').forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    expect(errors).toEqual([]);
  });

  it('a teacher who sets 9-12 to missions gets the mission strip, and a teacher\'s brief level gets the brief strip at 6-8', async () => {
    load(true);
    await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, teacher: { level: 'missions' } } } });
    expect(strip().getAttribute('data-citylab-strip-kind')).toBe('mission');
    await unmount();
    await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, teacher: { level: 'brief' } } } });
    expect(strip().getAttribute('data-citylab-strip-kind')).toBe('brief');
  });
});

describe('W6 - the dark and contrast palettes', () => {
  it('give every lens class a twin: no near-white glare on the dark scene, no mid grey in contrast, a readable code ink on each', () => {
    load(false);
    let checked = 0;
    [busyPlan('riverbend'), busyPlan('harborlight'), busyPlan('mesahollow')].forEach((p) => {
      LENSES.filter((l) => l !== 'use').forEach((lens) => {
        const cells = P.lensCells(p, 'central', lens).cells;
        const byClass = { light: {}, dark: {}, contrast: {} };
        P.allParcelIds().forEach((id) => {
          const c = cells[id];
          if (c.cls === 'water' || c.cls === 'height') return;
          const fills = [c.fill].concat(c.fill2 ? [c.fill2] : []);
          fills.forEach((f, k) => {
            const cls = c.cls + (k ? '2' : '');
            ['dark', 'contrast'].forEach((th) => {
              const g = P.lensThemeFill(f, th);
              expect(/^#[0-9a-f]{6}$/i.test(g), th + ' ' + lens + ' ' + cls).toBe(true);
              expect(bestInk(g), th + ' ink on ' + lens + ' ' + cls + ' ' + g).toBeGreaterThanOrEqual(4.5);
              if (th === 'contrast') expect(hcOk(g), 'contrast grey ' + lens + ' ' + cls + ' ' + g).toBe(true);
              // The light theme's pale "outside" fills are dark on the dark scene.
              if (th === 'dark' && lum(f) > 0.8) expect(lum(g), 'dark glare ' + lens + ' ' + cls + ' ' + g).toBeLessThan(0.12);
              byClass[th][cls] = g;
              checked++;
            });
            byClass.light[cls] = f;
          });
        });
        // Classes that differ in light still differ in each theme.
        ['dark', 'contrast'].forEach((th) => {
          const ks = Object.keys(byClass.light);
          ks.forEach((a) => ks.forEach((b) => {
            if (a < b && byClass.light[a] !== byClass.light[b]) expect(byClass[th][a], th + ' ' + lens + ' ' + a + ' vs ' + b).not.toBe(byClass[th][b]);
          }));
        });
      });
    });
    // The height ramp keeps its order on the dark scene (paler is still higher).
    const dark = P.TERRAIN_RAMP.map((c) => lum(P.lensThemeFill(c, 'dark')));
    dark.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(dark[i]));
    P.TERRAIN_RAMP.forEach((c) => expect(bestInk(P.lensThemeFill(c, 'dark'))).toBeGreaterThanOrEqual(4.5));
    expect(checked).toBeGreaterThan(500);
  });

  it('the map, the keys and the 3D board all paint the theme\'s fill', async () => {
    load(true);
    const p = busyPlan('riverbend');
    for (const theme of ['dark', 'contrast']) {
      await mount({ ctx: { theme }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p, lens: 'park' } } });
      const L = P.lensCells(p, 'central', 'park').cells;
      const push = last(rec.pushes);
      expect(push.theme).toBe(theme);
      const S = sceneFrom(push);
      const b = S.cityBatches.box;
      b.specs.forEach((s, i) => {
        if (s.k === 'ground' && L[s.id].cls !== 'water') expect(b.meshes[i].material.color.hex, theme + ' 3D ' + s.id).toBe(P.lensThemeFill(L[s.id].fill, theme));
      });
      P.allParcelIds().forEach((id) => {
        if (L[id].cls === 'water') return;
        const cell = $('#citylab-parcel-' + id);
        const hex = P.lensThemeFill(L[id].fill, theme);
        const rgb = 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16)).join(', ') + ')';
        expect(cell.style.backgroundColor, theme + ' map ' + id).toBe(rgb);
      });
      const keyFills = $$('[data-citylab-key-fill]').map((n) => n.getAttribute('data-citylab-key-fill'));
      expect(keyFills).toContain(P.lensThemeFill(P.LENS_FILL.walkIn, theme));
      expect(keyFills).toContain(P.lensThemeFill(P.LENS_FILL.out, theme));
      await unmount();
    }
    expect(errors).toEqual([]);
  });

  it('shed rain is hatched slate, never the river\'s blue, on the map, the key and the 3D board', async () => {
    load(true);
    const p = busyPlan('riverbend');
    ['light', 'dark', 'contrast'].forEach((th) => {
      const pal = P.scenePalette(th);
      const shed = P.lensThemeFill(P.LENS_FILL.shed, th);
      [pal.water, P.USE_BY_ID.water.fill, '#1d4ed8'].forEach((w) => expect(shed).not.toBe(w));
      // Slate: a low-saturation colour, where the river is a saturated blue.
      if (th !== 'contrast') expect(spread(shed)).toBeLessThan(spread(P.USE_BY_ID.water.fill));
      const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), pal, null, P.lensCells(p, 'central', 'rain'));
      const lids = parts.box.filter((s) => s.k === 'lid' && s.part === 'shed');
      const hatch = parts.box.filter((s) => s.k === 'hatch');
      expect(hatch.length).toBeGreaterThan(lids.length);
      lids.forEach((l) => expect(l.c).toBe(shed));
      hatch.forEach((s) => expect(s.c).toBe(P.LENS_HATCH[th]));
    });
    await mount({ toolData: { _cityLab: { boardView: 'rain', coachOff: true, plan: p } } });
    const cell = $('#citylab-parcel-A1');
    expect(cell.style.backgroundImage).toContain('repeating-linear-gradient');
    expect($('[data-citylab-key-item="shed"]').textContent).toContain('slate with stripes');
    expect($('[data-citylab-key-item="shed"] [data-citylab-key-fill]').style.backgroundImage).toContain('repeating-linear-gradient');
  });

  it('contrast is its own scene: no mid greys, white parcel edges, and a code label over every parcel (the map\'s own two letters)', () => {
    load(false);
    const p = busyPlan('riverbend');
    const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette('contrast'), null, null);
    ['box', 'prism', 'round', 'cone', 'people', 'cars', 'flood'].forEach((kind) => {
      parts[kind].forEach((s) => expect(hcOk(s.c), kind + ' ' + s.id + ' ' + s.c).toBe(true));
    });
    expect(parts.box.filter((s) => s.k === 'edge')).toHaveLength(P.allParcelIds().length * 4);
    expect(parts.codes).toHaveLength(P.allParcelIds().length);
    parts.codes.forEach((cd) => {
      expect(cd.code).toBe(P.USE_BY_ID[p.uses[cd.id]].code);
      expect(P.CODE_ATLAS_IDS[cd.cell]).toBe(p.uses[cd.id]);
    });
    // Only in contrast: the light and dark scenes carry colour and the map does the codes.
    ['light', 'dark'].forEach((th) => {
      const q = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette(th), null, null);
      expect(q.codes).toHaveLength(0);
      expect(q.box.filter((s) => s.k === 'edge')).toHaveLength(0);
    });
    // The scene builds the codes as one batch and they face the camera.
    const S = sceneFrom(pushFor(p, 'use', 'contrast'));
    expect(S.cityCodeN).toBe(P.allParcelIds().length);
    expect(S.cityCodes.facePitch).toBe(true);
    S.rotX = 60;
    S.tick(16);
    expect(S.cityCodes.meshes[0].rotation.x).toBeCloseTo(-60 * Math.PI / 180, 6);
    expect(sceneFrom(pushFor(p, 'use', 'light')).cityCodeN).toBe(0);
  });

  it('flood badges are larger, outlined and face the camera; the fireworks are larger at the default frame', () => {
    load(false);
    const p = JSON.parse(JSON.stringify(P.basePlan('harborlight')));
    const S = sceneFrom(pushFor(p, 'flood', 'light'));
    expect(S.cityTags.length).toBeGreaterThan(0);
    S.cityTags.forEach((tb) => {
      expect(tb.facePitch).toBe(true);
      tb.specs.forEach((s) => { expect(s.sy).toBeGreaterThanOrEqual(0.36); expect(s.sx).toBeGreaterThanOrEqual(0.4); });
    });
    S.rotX = 45;
    S.tick(16);
    expect(S.cityTags[0].meshes[0].rotation.x).toBeCloseTo(-Math.PI / 4, 6);
    // One badge per parcel the map marks, still (no thinning: the map and the board agree).
    const L = P.lensCells(p, 'central', 'flood').cells;
    const n = P.allParcelIds().filter((id) => L[id].glyph).length;
    expect(S.cityTags.reduce((a, tb) => a + tb.n, 0)).toBe(n);
    expect(P.fwScale(P.townFrame(p))).toBeGreaterThanOrEqual(1.3);
    expect(P.fwScale({ hx: 6, hz: 6 })).toBeGreaterThan(P.fwScale({ hx: 2.5, hz: 2.5 }));
  });
});

describe('W6 - the board starts higher', () => {
  it('first visit: Start here is a chip in the title row, the folded strip is a button in the coach\'s slot, then palette and stage', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model' } } });
    const title = $('[data-citylab-title-row]');
    expect(title.querySelector('nav[aria-labelledby="citylab-path-title"]').getAttribute('data-citylab-path')).toBe('chip');
    const coach = $('[data-citylab-coach]');
    const slot = coach.querySelector('[data-citylab-strip-slot="coach"]');
    expect(slot.getAttribute('data-citylab-strip')).toBe('closed');
    expect($$('[data-citylab-strip]')).toHaveLength(1);
    expect(follows(title, $('[role="tablist"]'))).toBe(true);
    expect(follows($('[role="tablist"]'), coach)).toBe(true);
    expect(follows(coach, $('[data-citylab-palette]'))).toBe(true);
    expect(follows($('[data-citylab-palette]'), $('#citylab-stage'))).toBe(true);
    // Opening the strip from the slot: it opens under the coach, focus kept on its button.
    await focus($('#citylab-strip-toggle'));
    await click($('#citylab-strip-toggle'));
    expect(strip().getAttribute('data-citylab-strip')).toBe('open');
    expect(follows(coach, strip())).toBe(true);
    expect(document.activeElement).toBe($('#citylab-strip-toggle'));
    await click($('#citylab-strip-toggle'));
    expect($('[data-citylab-strip-slot="coach"]')).toBeTruthy();
    expect(document.activeElement).toBe($('#citylab-strip-toggle'));
    expect(errors).toEqual([]);
  });

  it('returning: the strip is one header line with its actions inline, Start here opens under the title and focus follows its button', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const head = $('[data-citylab-strip-head]');
    expect(head.querySelector('[data-citylab-strip-check]')).toBeTruthy();
    expect(head.querySelector('#citylab-strip-toggle')).toBeTruthy();
    expect(head.querySelector('#citylab-strip-title')).toBeTruthy();
    // Folded, the actions stay on the line.
    await click($('#citylab-strip-toggle'));
    expect(strip().getAttribute('data-citylab-strip')).toBe('closed');
    expect($('[data-citylab-strip-check]')).toBeTruthy();
    expect($('[data-citylab-strip-rows]')).toBe(null);
    expect(document.activeElement).toBe($('#citylab-strip-toggle'));
    // Start here: a chip in the title row; opened, a panel below it.
    expect($('[data-citylab-title-row] nav[data-citylab-path="chip"]')).toBeTruthy();
    await focus($('#citylab-path-toggle'));
    await click($('#citylab-path-toggle'));
    const nav = $('nav[aria-labelledby="citylab-path-title"]');
    expect(nav.getAttribute('data-citylab-path')).toBe('open');
    expect($('[data-citylab-title-row]').contains(nav)).toBe(false);
    expect(document.activeElement).toBe($('#citylab-path-toggle'));
    expect(nav.querySelectorAll('ol button').length).toBeGreaterThan(0);
    await click($('#citylab-path-toggle'));
    expect($('[data-citylab-title-row] nav[data-citylab-path="chip"]')).toBeTruthy();
    expect(document.activeElement).toBe($('#citylab-path-toggle'));
    // A teacher's "no path" still holds.
    await unmount();
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, teacher: { pathOff: true } } } });
    expect($('nav[aria-labelledby="citylab-path-title"]')).toBe(null);
  });

  it('under 768 px: the tabs, the lens bar and the palette are each one row that scrolls, and 3D | Map shares the lens row', async () => {
    load(true);
    setWidth(390);
    await mount({ toolData: { _cityLab: { coachOff: true } } });
    const tabs = $('[role="tablist"]');
    expect(tabs.getAttribute('data-citylab-tabs')).toBe('strip');
    expect(tabs.style.flexWrap).toBe('nowrap');
    expect(tabs.style.overflowX).toBe('auto');
    const lensBar = $('[data-citylab-lens-bar]');
    expect(lensBar.style.overflowX).toBe('auto');
    const row = $('[data-citylab-view-controls]');
    expect(row.style.flexWrap).toBe('nowrap');
    expect(row.contains($('[data-citylab-board-mode="3d"]'))).toBe(true);
    expect(row.contains(lensBar)).toBe(true);
    const pal = $('[data-citylab-map-palette] [data-citylab-palette]');
    expect(pal.style.flexWrap).toBe('nowrap');
    expect(pal.style.overflowX).toBe('auto');
    // Every tab and lens is still reachable: one tab stop each, arrows move along.
    expect(tabStopsIn(tabs)).toHaveLength(1);
    expect(tabStopsIn(lensBar)).toHaveLength(1);
    // 768 and over: they wrap as before.
    await unmount();
    setWidth(1280);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    expect($('[role="tablist"]').getAttribute('data-citylab-tabs')).toBe('wrap');
  });
});

describe('W6 - the fullscreen HUD', () => {
  async function enterFs() {
    await click($('[data-citylab-cam-more]'));
    const btn = $('#citylab-fs-toggle');
    await focus(btn);
    await click(btn);
  }
  it('floats the palette, the lens bar, the strip summary, the gauge and the camera over the stage, and focus goes to the model', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, lens: 'rain' } } });
    expect($('[data-citylab-hud="off"]')).toBeTruthy();
    await enterFs();
    const fs = $('[data-citylab-hud="on"]');
    expect(fs).toBeTruthy();
    const top = fs.querySelector('[data-citylab-hud-part="top"]');
    expect(top.querySelector('[data-citylab-palette]')).toBeTruthy();
    expect(top.querySelector('[data-citylab-hud-lens="rain"]').getAttribute('role')).toBe('toolbar');
    expect(top.querySelector('[data-citylab-hud-strip="mission"]').textContent).toContain('Mission 1: Fix park access');
    const sc = P.scorecard(P.basePlan('riverbend'), 'central');
    expect(fs.querySelector('[data-citylab-hud-gauge]').getAttribute('data-citylab-hud-gauge')).toBe(sc.tier2.peakRunoffQ.toFixed(2));
    const cam = fs.querySelector('[data-citylab-hud-part="camera"]');
    expect(cam.textContent).toContain('Bird\'s eye');
    expect(cam.querySelector('#citylab-hud-exit')).toBeTruthy();
    // The HUD is beside the stage, not inside it: its clicks never reach the model.
    expect($('#citylab-stage').contains(top)).toBe(false);
    expect(document.activeElement).toBe($('#citylab-stage'));
    expect(last(m.announced)).toContain('Escape leaves full screen');
    // The legends and the long camera row step aside while the HUD shows.
    expect(fs.querySelector('[data-citylab-lens-legend]')).toBe(null);
    fs.querySelectorAll('button').forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    expect(errors).toEqual([]);
  });

  it('keeps Tab on screen, leaves on Escape and hands focus back to Full screen; Escape on a road start only clears it', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    await enterFs();
    const fs = $('[data-citylab-hud="on"]');
    const stops = tabStopsIn(fs);
    expect(stops.length).toBeGreaterThan(4);
    // Off the last stop, Tab comes back to the first; Shift+Tab the other way.
    await focus(stops[stops.length - 1]);
    await key(stops[stops.length - 1], 'Tab');
    expect(document.activeElement).toBe(stops[0]);
    await key(stops[0], 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(stops[stops.length - 1]);
    // A road start: Escape clears it and stays in full screen.
    await click($('[data-citylab-hud-part="top"] [data-citylab-tool="road"]'));
    const stage = $('#citylab-stage');
    await focus(stage);
    // Pick a start parcel through the twin map, which shares the tool.
    await click($('#citylab-parcel-B6'));
    expect($('[data-citylab-hud-part="top"]').textContent).toContain('next to B6');
    await key(stage, 'Escape');
    expect($('[data-citylab-hud="on"]')).toBeTruthy();
    expect($('[data-citylab-hud-part="top"]').textContent).not.toContain('next to B6');
    // Escape again: out of full screen, focus back on the button that opened it.
    await key(stage, 'Escape');
    expect($('[data-citylab-hud="off"]')).toBeTruthy();
    expect(document.activeElement).toBe($('#citylab-fs-toggle'));
    // And the Exit button does the same.
    await click($('#citylab-fs-toggle'));
    await click($('#citylab-hud-exit'));
    expect($('[data-citylab-hud="off"]')).toBeTruthy();
    expect(document.activeElement).toBe($('#citylab-fs-toggle'));
    expect(errors).toEqual([]);
  });

  it('Check in the HUD is the same gate: nothing before it, one pass after', async () => {
    load(true);
    const ex = P.parkExample('riverbend');
    let p = P.basePlan('riverbend');
    for (const s of ex.steps) { p = P.setUse(p, s.id, 'park'); if (s.via) p = P.setEdge(p, s.id, s.via, 'path'); }
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: JSON.parse(JSON.stringify(p)) } } });
    await enterFs();
    expect(passes()).toEqual([]);
    const chk = $$('[data-citylab-hud-strip] button').find((b) => b.textContent.trim() === 'Check my plan');
    await click(chk);
    expect(passes().map((c) => c.mid)).toEqual(['m_park']);
    expect($('[data-citylab-hud-pass]').textContent).toContain('Mission complete: Fix park access');
  });
});

describe('W6 - every new string goes through the translator', () => {
  it('leaves no untranslated prose in the brief strip, the coach slot, the HUD or the rain key', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    const found = new Set();
    const leaks = (where, scopes) => {
      scopes.filter(Boolean).forEach((sc) => {
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
    await mount({ ctx: { t: wrapT, gradeBand: 'g912' }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: briefTrapPlan(), lens: 'rain' } } });
    await click($('[data-citylab-strip-check="brief"]'));
    leaks('brief', [strip(), $('[data-citylab-lens-legend]')]);
    await click($('[data-citylab-cam-more]'));
    await click($('#citylab-fs-toggle'));
    leaks('hud', [$('[data-citylab-hud="on"]')]);
    await unmount();
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model' } } });
    leaks('coach', [$('[data-citylab-coach]'), $('[data-citylab-title-row] nav')]);
    expect([...found]).toEqual([]);
  });
});
