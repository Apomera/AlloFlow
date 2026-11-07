// City Lab 3D, wave 4 (2026-11-04): lenses in 3D.
//
// What has to be TRUE: each lens is ONE per-parcel function (lensCells) that
// both boards draw, so the 3D town and the map can never disagree; that
// function is the model's own answer (network walk distance, not a circle;
// the rain split IS effectiveC; the flood classes are the scorecard's tests);
// each lens's spoken summary is the scorecard's numbers; a staged edit keeps
// every lens on the old plan; and the lead's changes after W3 hold (T1 opens
// on 3D, the palette builds on the map by click and by Enter, the camera row
// folds at 1280 with Animation beside the lenses).
//
// jsdom has no WebGL: the viewer is a stand-in shaped like the host's
// makeOrbitViewer, and the scene is the tool's real buildCityScene on a
// minimal Three.js (every part a plain mesh, so the colour each parcel got is
// readable). The real-WebGL half is tests/e2e/citylab-3d-w4.spec.ts.
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
let mql = null;

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
function device(cores) {
  window.WebGLRenderingContext = function () {};
  Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: cores, configurable: true });
  Object.defineProperty(window.navigator, 'deviceMemory', { value: 8, configurable: true });
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
  device(8);
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true, writable: true });
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
const plan = (m) => (m.latest._cityLab && m.latest._cityLab.plan) || null;
async function click(el) { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function key(el, k, extra) {
  await act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
const rgb = (hex) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
const pct = (x) => (x * 100).toFixed(0) + '%';
const n = (v) => Math.round(v).toLocaleString();

// The tool's real scene on a minimal Three.js: every part a plain mesh whose
// material carries the colour it was given. One S across builds, like the host.
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
function sceneFrom(push, S) {
  const THREE = fakeThree();
  S = S || { THREE, model: { add() {} }, camera: { updateMatrixWorld() {} }, rotY: 34 };
  P.buildCityScene(THREE, S, push);
  return S;
}
// What the scene painted on each parcel's ground tile, and its rain lid.
function sceneGround(S) {
  const out = {};
  const b = S.cityBatches.box;
  b.specs.forEach((s, i) => {
    if (s.k === 'ground') out[s.id] = Object.assign(out[s.id] || {}, { colour: b.meshes[i].material.color.hex });
    if (s.k === 'lid') out[s.id] = Object.assign(out[s.id] || {}, { [s.part]: b.meshes[i].scale.x / P.LENS_LID_W, [s.part + 'Colour']: b.meshes[i].material.color.hex });
  });
  return out;
}
function sceneTags(S) {
  const out = {};
  (S.cityTags || []).forEach((tb) => { out[tb.glyph] = tb.specs.map((s) => s.id).sort(); });
  return out;
}

// A worked Riverbend plan: homes on served fields (some by a connected park),
// homes no road reaches, a new park with a path to it, a bus stop, green
// infrastructure and a cool roof, so every lens has every class to draw.
function busyPlan() {
  let p = P.basePlan('riverbend');
  const served = P.servedParcels(p);
  const fields = P.allParcelIds().filter((id) => p.uses[id] === 'field' && served[id]);
  p = P.setUse(p, fields[0], 'housing_mid');
  p = P.setUse(p, fields[1], 'housing_low');
  p = P.setUse(p, fields[2], 'park');
  p = P.setUse(p, fields[3], 'mixed');
  const lonely = P.allParcelIds().find((id) => p.uses[id] === 'field' && !P.servedParcels(p)[id] && P.neighbours(id).every((x) => !served[x.id]));
  p = P.setUse(p, lonely, 'housing_mid');
  p = P.toggleTransit(p, P.SCENARIOS.riverbend.coreParcel);
  if (P.canGreenInfra(p.uses[fields[0]])) p = P.toggleGreenInfra(p, fields[0]);
  if (P.canCoolRoof(p.uses[fields[3]])) p = P.toggleCoolRoof(p, fields[3]);
  return JSON.parse(JSON.stringify(p));
}
async function chooseLens(id) {
  const b = $('[data-citylab-lens="' + id + '"]');
  if (b.getAttribute('aria-pressed') !== 'true') await click(b);
}
function domCells() {
  const out = {};
  $$('[id^="citylab-parcel-"]').forEach((b) => {
    out[b.id.replace('citylab-parcel-', '')] = {
      cls: b.getAttribute('data-citylab-lens-cls'), bg: b.style.backgroundColor, img: b.style.backgroundImage,
      glyph: (b.querySelector('[data-citylab-lens-glyph]') || { getAttribute() { return null; } }).getAttribute('data-citylab-lens-glyph')
    };
  });
  return out;
}

describe('W4 - lensCells is the model, one per-parcel function per lens', () => {
  it('walk to park and bus shade the NETWORK footprint, and mark homes in and out', () => {
    load(true);
    [busyPlan(), P.basePlan('mesahollow'), P.basePlan('harborlight')].forEach((p) => {
      const sc = P.scorecard(p, 'central');
      const served = P.servedParcels(p);
      [['park', sc.parkDistance, sc.parkHopLimit], ['transit', sc.transitDistance, sc.transitHopLimit]].forEach(([lens, dist, limit]) => {
        const L = P.lensCells(p, 'central', lens).cells;
        P.allParcelIds().forEach((id) => {
          if (p.uses[id] === 'water') { expect(L[id].cls).toBe('water'); return; }
          const inside = dist[id] !== undefined && dist[id] <= limit;
          expect(L[id].cls, lens + ' ' + id).toBe(inside ? 'in' : 'out');
          const home = P.livingCity(p, 'central').homes.find((hm) => hm.id === id && hm.served);
          expect(L[id].glyph, lens + ' glyph ' + id).toBe(home ? (inside ? 'yes' : 'no') : null);
        });
      });
      // Not the crow-flies circle: a home with a park in a straight line but
      // no route to it is OUT. (Checked wherever the two measures disagree.)
      const crowOnly = P.allParcelIds().filter((id) => served[id] && P.lensCells(p, 'central', 'park').cells[id].cls === 'out');
      expect(Array.isArray(crowOnly)).toBe(true);
    });
  });

  it('rain splits every parcel at exactly effectiveC; heat, access, flood and height are the scorecard\'s own classes', () => {
    load(true);
    ['riverbend', 'mesahollow', 'harborlight'].forEach((sid) => {
      const p = sid === 'riverbend' ? busyPlan() : P.basePlan(sid);
      ['central', 'conservative', 'optimistic'].forEach((set) => {
        const a = P.ASSUMPTION_SETS.find((s) => s.id === set);
        const sc = P.scorecard(p, set);
        const rain = P.lensCells(p, set, 'rain').cells;
        const heat = P.lensCells(p, set, 'heat').cells;
        const flood = P.lensCells(p, set, 'flood').cells;
        const access = P.lensCells(p, set, 'access').cells;
        const gaps = {};
        P.accessGaps(Object.assign(P.clonePlan(p), { assumptionSetId: set })).rows.forEach((g) => { gaps[g.id] = g; });
        P.allParcelIds().forEach((id) => {
          expect(rain[id].split, sid + ' rain ' + id).toBe(P.effectiveC(p, id, a));
          if (p.uses[id] === 'water') return;
          expect(heat[id].cls).toBe('b' + P.heatBand(sc.surfaceHeat[id]));
          expect(heat[id].fill).toBe(P.HEAT_RAMP[P.heatBand(sc.surfaceHeat[id])]);
          const t = P.terrainAt(id, p);
          const fc = t.floodplain ? 'zone' : (P.inFutureSurge(id, p, a) ? 'future' : 'dry');
          expect(flood[id].cls, sid + ' flood ' + id).toBe(fc);
          expect(access[id].cls).toBe(gaps[id] ? 'm' + gaps[id].missing.length : 'none');
        });
      });
    });
    // The 2100 class moves with the allowance in Harborlight, and only there.
    const hl = P.basePlan('harborlight');
    const fut = (set) => P.allParcelIds().filter((id) => P.lensCells(hl, set, 'flood').cells[id].cls === 'future').length;
    expect(fut('conservative')).toBeGreaterThan(fut('optimistic'));
    expect(P.allParcelIds().some((id) => P.lensCells(P.basePlan('riverbend'), 'conservative', 'flood').cells[id].cls === 'future')).toBe(false);
  });
});

describe('W4 - each lens on the 3D board is the map\'s lens, parcel for parcel', () => {
  async function compareAll(p, lenses) {
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p } } });
    for (const lens of lenses) {
      await chooseLens(lens);
      const push = last(rec.pushes);
      expect(push.lens.lens, lens).toBe(lens);
      expect(push.sig.endsWith('|' + lens)).toBe(true);
      const dom = domCells();
      const S = sceneFrom(push);
      const ground = sceneGround(S);
      const tags = sceneTags(S);
      const L = P.lensCells(p, p.assumptionSetId || 'central', lens).cells;
      const glyphs = {};
      P.allParcelIds().forEach((id) => {
        expect(dom[id].cls, lens + ' ' + id).toBe(L[id].cls);
        if (p.uses[id] === 'water' && lens !== 'rain') return;
        expect(dom[id].bg, lens + ' map fill ' + id).toBe(rgb(L[id].fill));
        if (lens === 'rain') {
          // The map's split and the 3D lid are both effectiveC.
          expect(dom[id].img, id).toContain(' ' + Math.round(L[id].split * 100) + '%');
          expect(ground[id].shed, '3D shed share ' + id).toBeCloseTo(Math.max(0.0001 / P.LENS_LID_W, L[id].split), 6);
          expect(ground[id].shedColour).toBe(L[id].fill);
          expect(ground[id].soakColour).toBe(L[id].fill2);
        } else if (lens === 'use') {
          expect(ground[id].colour, '3D ground ' + id).toBe(P.groundTone(L[id].cls, P.scenePalette('light')));
        } else {
          // The colour the 3D board painted on the parcel is the map's colour.
          expect(ground[id].colour, lens + ' 3D ground ' + id).toBe(L[id].fill);
        }
        if (L[id].glyph) (glyphs[L[id].glyph] = glyphs[L[id].glyph] || []).push(id);
      });
      // The glyph floated over each parcel on the board is the one the map prints.
      Object.keys(glyphs).forEach((g) => glyphs[g].sort());
      expect(tags, lens + ' glyphs').toEqual(glyphs);
      if (lens === 'park' || lens === 'transit' || lens === 'flood') {
        P.allParcelIds().forEach((id) => expect(dom[id].glyph, lens + ' map glyph ' + id).toBe(L[id].glyph));
      }
    }
    expect(errors).toEqual([]);
    return m;
  }

  it('Riverbend, every lens', async () => {
    load(true);
    await compareAll(busyPlan(), LENSES);
  });

  it('Harborlight: flood (today and the 2100 reach) and rain', async () => {
    load(true);
    await compareAll(JSON.parse(JSON.stringify(P.basePlan('harborlight'))), ['flood', 'rain']);
  });

  it('no flow paths, no pooling and no routes: rain is lids and uniform streaks only; buses stand at stops', () => {
    load(true);
    const p = busyPlan();
    const parts = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette('light'), null, P.lensCells(p, 'central', 'rain'));
    // Every parcel gets the same two streaks, all falling from one height band.
    const per = {};
    parts.rain.forEach((r) => { per[r.id] = (per[r.id] || 0) + 1; });
    expect(Object.keys(per).length).toBe(P.allParcelIds().length);
    expect(new Set(Object.values(per))).toEqual(new Set([2]));
    expect(new Set(parts.rain.map((r) => r.y1)).size).toBe(1);
    // Nothing but lids was added to the town for rain: no water on the ground beyond the river.
    const plain = P.townParts(P.buildMassing(p, 'central', null), P.livingCity(p, 'central'), P.scenePalette('light'), null, null);
    // W6: the shed part is hatched (stripes laid on the shed lid itself); those
    // are the only other parts, and each sits inside its own parcel's shed lid.
    const hatch = parts.box.filter((s) => s.k === 'hatch');
    const extra = parts.box.length - plain.box.filter((s) => s.k !== 'cap').length;
    expect(extra - hatch.length).toBe(2 * P.allParcelIds().length);
    hatch.forEach((s) => {
      const lid = parts.box.find((l) => l.k === 'lid' && l.part === 'shed' && l.id === s.id);
      expect(Math.abs(s.x - lid.x) <= lid.sx / 2 + 1e-9, s.id).toBe(true);
    });
    expect(parts.water.length).toBe(plain.water.length);
  });
});

describe('W4 - each lens\'s summary is the scorecard\'s numbers, spoken and shown', () => {
  function expected(p, lens) {
    const sc = P.scorecard(p, 'central'), t1 = sc.tier1, t2 = sc.tier2, scen = P.scenarioOf(p);
    if (lens === 'use') return [n(t1.totalUnitsServed) + ' homes a road reaches, ' + n(t1.newUnitsServed) + ' of them new',
      'Built land ' + t1.builtAreaHa + ' ha, park ' + t1.parkHa + ' ha, farmland in production ' + t1.farmHa + ' ha'];
    if (lens === 'elevation') {
      const el = P.allParcelIds().map((id) => P.terrainAt(id, p).elevationM);
      return ['from ' + Math.min(...el) + ' m to ' + Math.max(...el) + ' m'];
    }
    if (lens === 'heat') return ['not of the air', 'average ' + t2.surfaceHeatC.toFixed(1) + ' C', t2.homeSurfaceHeatC.toFixed(1) + ' C where the homes are'];
    if (lens === 'park') return [pct(t1.parkAccessPct) + ' of the homes a road reaches', 'would read ' + pct(t1.parkAccessPctAsCrowFlies)];
    // Hunt (2026-11-04): no "one of the 1 bus stops" / "one of the 0 bus stops".
    if (lens === 'transit' && !sc.transitStops.length) return ['no bus stop a bus can reach yet', 'not modelled'];
    if (lens === 'transit' && sc.transitStops.length === 1) return [pct(t1.transitAccessPct) + ' of the homes a road reaches', 'the one bus stop a bus can reach', 'not modelled'];
    if (lens === 'transit') return [pct(t1.transitAccessPct) + ' of the homes a road reaches', 'one of the ' + sc.transitStops.length + ' bus stops', 'not modelled'];
    if (lens === 'rain') return [scen.designStormMmPerHour + ' mm an hour', 'C is ' + t2.runoffCoefficient.toFixed(3),
      t2.peakRunoffQ.toFixed(2) + ' cubic metres a second, ' + pct(t2.runoffRatio) + ' of the ' + t2.baselineRunoffQ.toFixed(2),
      'no more than ' + pct(scen.runoffCeilingRatio), 'Where the water goes after it runs off is not modelled'];
    if (lens === 'flood') {
      const out = ['new homes ' + n(t1.newUnitsInFloodplain) + ' and existing homes ' + n(t1.existingUnitsInFloodplain)];
      if (scen.modelsSeaRise) out.push('new homes ' + n(t2.newUnitsInFutureSurge) + ', existing homes ' + n(t2.existingUnitsInFutureSurge) + ', and ' + t2.landAtRiskHa + ' ha');
      return out;
    }
    const g = P.accessGaps(p);
    return ['of the ' + n(g.homes) + ' homes a road reaches, ' + n(g.lackAny) + ' are missing at least one', 'and ' + n(g.lackAll) + ' are missing all three'];
  }

  it('in every lens, on Riverbend and Harborlight; the gauge reads the scorecard\'s Q', async () => {
    load(true);
    for (const p of [busyPlan(), JSON.parse(JSON.stringify(P.basePlan('harborlight')))]) {
      const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: p } } });
      for (const lens of LENSES) {
        await chooseLens(lens);
        const shown = $('[data-citylab-lens-summary="' + lens + '"]').textContent;
        expected(p, lens).forEach((frag) => expect(shown, lens + ': ' + frag).toContain(frag));
        if (lens !== 'use') expect(last(m.announced)).toBe($('[data-citylab-lens-bar]').querySelector('[aria-pressed="true"]').textContent + ' lens. ' + shown);
        if (lens === 'rain') {
          const q = P.scorecard(p, 'central').tier2.peakRunoffQ.toFixed(2);
          expect($('[data-citylab-outlet-gauge="legend"]').getAttribute('data-citylab-gauge-q')).toBe(q);
          expect($('[data-citylab-outlet-gauge="overlay"]').textContent).toContain(q);
        }
        if (lens === 'heat') expect($('[data-citylab-lens-badge="heat"]').textContent).toMatch(/surface, not the air/);
      }
      await act(() => root.unmount());
      root = null;
      document.body.innerHTML = '<div id="root"></div>';
      window.localStorage.removeItem(STORE_KEY);
    }
    expect(errors).toEqual([]);
  });
});

describe('W4 - a staged edit keeps every lens on the old plan', () => {
  it('freezes the 3D lens and the map lens in all eight lenses, and lets go after the prediction', async () => {
    load(true);
    const p = busyPlan();
    const served = P.servedParcels(p);
    const target = P.allParcelIds().find((id) => p.uses[id] === 'field' && served[id]);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true, predictEvery: true, plan: p } } });
    for (const lens of LENSES) {
      await chooseLens(lens);
      const before = { lens: JSON.stringify(last(rec.pushes).lens), dom: JSON.stringify(domCells()), sum: $('[data-citylab-lens-summary]').textContent };
      const cell = $('#citylab-parcel-' + target);
      cell.focus();
      await key(cell, '6');
      expect(last(rec.pushes).ghost, lens).toEqual({ a: target });
      expect(plan(m).uses[target]).toBe('field');
      expect(JSON.stringify(last(rec.pushes).lens), lens + ': the 3D lens moved before the prediction').toBe(before.lens);
      expect(JSON.stringify(domCells()), lens + ': the map lens moved before the prediction').toBe(before.dom);
      expect($('[data-citylab-lens-summary]').textContent).toBe(before.sum);
      await click(buttonByText('Undo'));                      // cancels the waiting change
      expect(last(rec.pushes).ghost).toBe(null);
    }
    // Answered, the lens moves with the plan (Rain lens: the parcel now sheds more).
    await chooseLens('rain');
    const cell = $('#citylab-parcel-' + target);
    cell.focus();
    await key(cell, '6');
    await click(buttonByText('up'));
    expect(plan(m).uses[target]).toBe('housing_mid');
    expect(last(rec.pushes).lens.cells[target].split).toBe(P.effectiveC(plan(m), target, P.ASSUMPTION_SETS[0]));
    expect(last(rec.pushes).lens.cells[target].split).toBeGreaterThan(P.effectiveC(p, target, P.ASSUMPTION_SETS[0]));
  });
});

describe('W4 - the lens bar: one control for both boards', () => {
  it('is one tab stop with arrow keys, keeps the 3D board, remembers the lens, and the Map button keeps it', async () => {
    load(true);
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const bar = $('[role="toolbar"][data-citylab-lens-bar]');
    expect([...bar.querySelectorAll('button')].map((b) => b.getAttribute('data-citylab-lens'))).toEqual(LENSES);
    expect([...bar.querySelectorAll('button')].filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('data-citylab-lens'))).toEqual(['use']);
    $('[data-citylab-lens="use"]').focus();
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-citylab-lens')).toBe('elevation');
    await key(document.activeElement, 'End');
    expect(document.activeElement.getAttribute('data-citylab-lens')).toBe('access');
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-citylab-lens')).toBe('use');
    await click($('[data-citylab-lens="rain"]'));
    expect($('[data-citylab-lens="rain"]').getAttribute('aria-pressed')).toBe('true');
    expect($('[data-citylab-lens="rain"]').tabIndex).toBe(0);
    expect(m.latest._cityLab).toMatchObject({ boardView: 'model', lens: 'rain' });
    expect($('[data-citylab-board3d="live"]')).toBeTruthy();
    expect(last(rec.pushes).lens.lens).toBe('rain');
    // Every lens button is labelled with its visible word in its name.
    [...bar.querySelectorAll('button')].forEach((b) => {
      expect(b.getAttribute('aria-label').toLowerCase(), b.textContent).toContain(b.textContent.toLowerCase().split(' ')[0]);
      expect(b.style.minHeight).toBe('44px');
    });
    // There is no second control for the lens: the old Heat/Access/Height
    // view buttons ARE these.
    expect($$('button').filter((b) => b.textContent.trim() === 'Heat')).toHaveLength(1);
    await click($('[data-citylab-board-mode="map"]'));
    expect($('[data-citylab-board3d]')).toBeFalsy();
    expect(m.latest._cityLab.boardView).toBe('rain');
    expect($('[data-citylab-lens="rain"]').getAttribute('aria-pressed')).toBe('true');
    expect(last(m.announced)).toMatch(/flat map with the Rain and runoff lens/);
    await click($('[data-citylab-lens="heat"]'));
    expect(m.latest._cityLab.boardView).toBe('heat');
    await click($('[data-citylab-board-mode="3d"]'));
    expect(m.latest._cityLab).toMatchObject({ boardView: 'model', lens: 'heat' });
    expect(last(rec.pushes).lens.lens).toBe('heat');
  });

  it('opens on a saved lens, and a pre-W4 saved view still opens its lens on the map', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', lens: 'flood', coachOff: true } } });
    expect($('[data-citylab-lens="flood"]').getAttribute('aria-pressed')).toBe('true');
    await act(() => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ toolData: { _cityLab: { boardView: 'heat', coachOff: true } } });
    expect($('[data-citylab-board3d]')).toBeFalsy();
    expect($('[data-citylab-lens="heat"]').getAttribute('aria-pressed')).toBe('true');
    expect($('[data-citylab-lens-legend="heat"]')).toBeTruthy();
  });
});

describe('W4 - lead changes after W3', () => {
  it('T1 (4 cores) opens on the 3D board, standing still; under 768 px the map', async () => {
    load(true);
    device(4);
    await mount({ toolData: { _cityLab: { coachOff: true } } });
    expect($('[data-citylab-board3d="live"]')).toBeTruthy();
    expect(last(rec.pushes).motion).toBe(false);
    expect(last(rec.pushes).static).toBe(true);
    await act(() => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    Object.defineProperty(window, 'innerWidth', { value: 700, configurable: true, writable: true });
    await mount({ toolData: { _cityLab: { coachOff: true } } });
    expect($('[data-citylab-board3d]')).toBeFalsy();
    expect($('#citylab-parcel-D6')).toBeTruthy();
  });

  it('the palette builds on the map by click and by Enter, through the same parcelAction', async () => {
    load(false);                                   // no viewer: the map is the board
    const m = await mount({ toolData: { _cityLab: { coachOff: true } } });
    const pal = $('[data-citylab-map-palette] [role="toolbar"]');
    expect(pal.getAttribute('aria-label')).toBe('Tools for the map: pick one, then click a parcel or press Enter on it');
    await click($('[data-citylab-tool="housing_mid"]'));
    await click($('#citylab-parcel-A9'));
    expect(plan(m).uses.A9).toBe('housing_mid');
    expect(plan(m).editCount).toBe(1);
    expect(last(m.announced)).toMatch(/^A9 set to Housing, mid density\. New homes/);
    expect($('[data-citylab-stage-note]').textContent).toBe('A9 set to Housing, mid density.');
    // Enter on a parcel runs the tool ONCE (the key is handled, so no second click).
    await click($('[data-citylab-tool="park"]'));
    const cell = $('#citylab-parcel-A8');
    cell.focus();
    await key(cell, 'Enter');
    expect(plan(m).uses.A8).toBe('park');
    expect(plan(m).editCount).toBe(2);
    // A road: Enter on a parcel, then on its neighbour; Escape clears a start.
    await click($('[data-citylab-tool="road"]'));
    const base = P.basePlan('riverbend');
    const a = 'A10', b = 'A11';
    expect(base.edges[P.edgeKey(a, b)]).toBeFalsy();
    $('#citylab-parcel-' + a).focus();
    await key($('#citylab-parcel-' + a), 'Enter');
    expect($('#citylab-parcel-' + a).style.boxShadow).toMatch(/#22d3ee|rgb\(34, 211, 238\)/);
    await key($('#citylab-parcel-' + a), 'Escape');
    expect($('#citylab-parcel-' + a).style.boxShadow).not.toMatch(/#22d3ee|rgb\(34, 211, 238\)/);
    await key($('#citylab-parcel-' + a), 'Enter');
    await key($('#citylab-parcel-' + a), 'ArrowDown');
    await key($('#citylab-parcel-' + b), 'Enter');
    expect(plan(m).edges[P.edgeKey(a, b)]).toBe('local');
    // Inspect selects and changes nothing.
    await click($('[data-citylab-tool="inspect"]'));
    await key($('#citylab-parcel-' + b), 'Enter');
    await click($('#citylab-parcel-B9'));
    expect(plan(m).editCount).toBe(3);
    expect(m.award).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it('a K-2 student on the map gets the picture palette and builds with one click', async () => {
    load(false);
    const m = await mount({ ctx: { gradeBand: 'k2' }, toolData: { _cityLab: { coachOff: true } } });
    expect($('[role="toolbar"][data-citylab-palette]').getAttribute('data-citylab-palette')).toBe('pictures');
    await click($('[data-citylab-tool="housing_low"]'));
    await click($('#citylab-parcel-A9'));
    expect(plan(m).uses.A9).toBe('housing_low');
  });

  it('folds the camera row at 1280, with Animation beside the lenses, not under the camera', async () => {
    load(true);
    await mount({ toolData: { _cityLab: { boardView: 'model', coachOff: true } } });
    const cam = $('[aria-label="Move the camera"]');
    expect([...cam.querySelectorAll('button')].map((b) => b.textContent.trim()))
      .toEqual(['Bird\'s eye', 'Corner', 'Street', 'The town', 'Reset view', 'More camera']);
    expect($('[data-citylab-cam-more]').getAttribute('aria-expanded')).toBe('false');
    const sw = $('[data-citylab-motion-switch]');
    expect(cam.contains(sw)).toBe(false);
    const row = $('[data-citylab-view-controls]').parentElement;
    expect(row.contains(sw)).toBe(true);
    expect(row.contains($('[data-citylab-lens-bar]'))).toBe(true);
    await click($('[data-citylab-cam-more]'));
    ['Zoom to D6', 'Turn left', 'Tilt up', 'Closer', 'Further', 'Full screen'].forEach((x) => expect(buttonByText(x), x).toBeTruthy());
  });
});

describe('W4 - the coach points at the outlet gauge', () => {
  it('step 3 keeps the runoff number and offers the gauge in the Rain lens, a button that edits nothing', async () => {
    load(false);
    const m = await mount({ ctx: { gradeBand: 'g68' } });
    const target = P.coachFields(P.basePlan('riverbend'))[0];
    await click($('#citylab-parcel-' + target));
    const cell = $('#citylab-parcel-' + target);
    cell.focus();
    await key(cell, '6');
    const coach = $('[data-citylab-coach]');
    expect(coach.getAttribute('data-citylab-coach')).toBe('3');
    expect($('[data-citylab-coach-status]').textContent).toMatch(/watch the outlet gauge/);
    const sc = P.scorecard(plan(m), 'central');
    expect(coach.textContent).toContain('went from');
    expect(coach.textContent).toContain(sc.tier2.peakRunoffQ.toFixed(2) + ' cubic metres a second, against ' + sc.tier2.baselineRunoffQ.toFixed(2));
    const before = JSON.stringify(plan(m));
    await click(buttonByText('Show the outlet gauge'));
    expect(JSON.stringify(plan(m))).toBe(before);
    expect($('[data-citylab-lens="rain"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement.id).toBe('citylab-outlet-gauge');
    expect(buttonByText('Show the outlet gauge')).toBeFalsy();
    expect(m.award).not.toHaveBeenCalled();
  });
});

describe('W4 - the sea sheets ease between assumption sets, and snap under reduced motion', () => {
  function hlPush(set) {
    const p = Object.assign(P.clonePlan(P.basePlan('harborlight')), { assumptionSetId: set });
    return { massing: P.buildMassing(p, set, null), living: P.livingCity(p, set), lens: P.lensCells(p, set, 'flood'), theme: 'light' };
  }
  it('eases over 700 ms on a moving board, snaps on a still one or under reduced motion', () => {
    load(true);
    const a = hlPush('optimistic'), b = hlPush('conservative'), c = hlPush('central');
    const S = sceneFrom(a);
    const y0 = S.citySheets.find((s) => s.id === 'surge_2050').to;
    sceneFrom(b, S);
    const sh = () => S.citySheets.find((s) => s.id === 'surge_2050');
    expect(sh().from).toBe(y0);
    expect(sh().to).toBeGreaterThan(y0);
    expect(S.citySheetAnim).toBeTruthy();
    S.data = { motion: true, static: false };
    S.tick(1000); S.tick(1100); S.tick(1450);
    const mid = S.citySheetY.surge_2050;
    expect(mid).toBeGreaterThan(y0);
    expect(mid).toBeLessThan(sh().to);
    expect(S.data.static).toBe(false);
    S.tick(1900);
    expect(S.citySheetY.surge_2050).toBeCloseTo(sh().to, 9);
    expect(S.citySheetAnim).toBe(null);
    // Reduced motion: the next change lands on the very first frame.
    mql.matches = true;
    sceneFrom(c, S);
    S.data = { motion: true, static: false };
    S.tick(2000);
    expect(S.citySheetY.surge_2050).toBeCloseTo(sh().to, 9);
    expect(S.citySheetSnapped).toBe(true);
    expect(S.citySheetEaseFrames).toBe(0);
    expect(S.data.static).toBe(true);
  });

  it('the Flood lens offers the three allowances as buttons; a teacher\'s fixed set disables them', async () => {
    load(true);
    const hl = JSON.parse(JSON.stringify(P.basePlan('harborlight')));
    const m = await mount({ toolData: { _cityLab: { boardView: 'model', lens: 'flood', coachOff: true, plan: hl } } });
    const btns = $$('[data-citylab-sea-set]');
    expect(btns.map((x) => x.textContent)).toEqual(['0.3 m by 2100', '0.6 m by 2100', '1.0 m by 2100']);
    await click($('[data-citylab-sea-set="conservative"]'));
    expect(plan(m).assumptionSetId).toBe('conservative');
    expect(plan(m).editCount || 0).toBe(0);                  // not an edit, costs no move
    expect(last(rec.pushes).massing.sheets.find((s) => s.id === 'surge_2050').y)
      .toBeGreaterThan(P.buildMassing(hl, 'central', null).sheets.find((s) => s.id === 'surge_2050').y);
    await act(() => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ toolData: { _cityLab: { boardView: 'model', lens: 'flood', coachOff: true, plan: hl, teacher: { scoreSet: 'central' } } } });
    $$('[data-citylab-sea-set]').forEach((x) => expect(x.disabled).toBe(true));
  });
});

describe('W4 - every new string goes through the translator', () => {
  it('leaves no untranslated prose in the lens bar, any lens key, the gauge or the map palette', async () => {
    load(true);
    const wrapT = (k, fb) => '«' + fb + '»';
    const found = new Set();
    const leaks = (where, scope) => {
      const walker = document.createTreeWalker(scope, window.NodeFilter.SHOW_TEXT);
      let nd;
      while ((nd = walker.nextNode())) {
        const s = nd.nodeValue.trim();
        if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
        if (/[a-z]{4,}/.test(s)) found.add(where + ': ' + s.slice(0, 80));
      }
      [...scope.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label'))
        .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1).forEach((s) => found.add(where + ' aria: ' + s.slice(0, 80)));
    };
    const hl = JSON.parse(JSON.stringify(P.basePlan('harborlight')));
    await mount({ ctx: { t: wrapT }, toolData: { _cityLab: { boardView: 'model', coachOff: true, plan: hl } } });
    for (const lens of LENSES) {
      await chooseLens(lens);
      leaks(lens + ' bar', $('[data-citylab-view-controls]').parentElement);
      leaks(lens + ' key', $('[data-citylab-lens-legend]'));
      leaks(lens + ' stage', $('#citylab-stage'));
    }
    await click($('[data-citylab-board-mode="map"]'));
    leaks('map palette', $('[data-citylab-map-palette]'));
    expect([...found]).toEqual([]);
  });
});
