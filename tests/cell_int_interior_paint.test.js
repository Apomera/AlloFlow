// Inside the Cell — the layered illustration engine (lane INT).
//
// The interior canvas repaints every frame, so its static art is cached in an
// offscreen layer and only the living layer is redrawn. These tests run the real
// renderer against a recording context and read back what it actually did:
//   1. every structure the catalogue gives a cell type is painted for that type, and
//      nothing eukaryote-only is painted in the bacterium (a past round nearly shipped
//      a cytoskeleton network radiating from the nucleoid);
//   2. what is drawn sits where a click selects it (RER sheets, SER tubules, Golgi
//      cisternae, vacuole, nucleus...), because interiorHitTest is fixed;
//   3. reduced motion produces identical consecutive frames, and motion really moves;
//   4. the static layer is rebuilt when the view changes and ONLY then.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let C;
let ART;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered: () => false, getRegisteredTools: () => [] };
  delete window.__alloCellPure;
  delete window.__alloCellInteriorArt;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_cell.js'), 'utf8'))();
  C = window.__alloCellPure;
  ART = window.__alloCellInteriorArt;
  if (!C || !ART) throw new Error('interior renderer hooks not exposed');
});
afterEach(() => { if (ART) ART.setLayerFactory(null); });

const DRAW_OPS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'drawImage']);
// A context that records every call with its arguments and the paint state in force.
function recorder(extra) {
  const ops = [];
  const ctx = Object.assign({
    globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000', lineWidth: 1, font: '', textAlign: 'left',
    textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowColor: '', shadowBlur: 0,
    shadowOffsetY: 0, lineDashOffset: 0, globalCompositeOperation: 'source-over', _stack: [],
    save() { this._stack.push([this.globalAlpha, this.strokeStyle, this.fillStyle, this.lineWidth]); ops.push(['save']); },
    restore() { const s = this._stack.pop(); if (s) [this.globalAlpha, this.strokeStyle, this.fillStyle, this.lineWidth] = s; ops.push(['restore']); },
    createLinearGradient: (...a) => ({ g: 'lin', a, addColorStop() {} }),
    createRadialGradient: (...a) => ({ g: 'rad', a, addColorStop() {} }),
    measureText: (s) => ({ width: String(s).length * 5 }),
    getLineDash: () => [],
  }, extra || {});
  ['beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'clip',
    'translate', 'rotate', 'scale', 'setLineDash', 'clearRect', 'strokeRect', 'fillRect', 'fillText', 'fill', 'stroke', 'drawImage', 'setTransform']
    .forEach((fn) => {
      if (ctx[fn]) return;
      ctx[fn] = function (...args) {
        const style = fn === 'stroke' || fn === 'strokeRect' ? String(this.strokeStyle && this.strokeStyle.g ? 'gradient' : this.strokeStyle)
          : fn === 'fill' || fn === 'fillRect' || fn === 'fillText' ? String(this.fillStyle && this.fillStyle.g ? 'gradient' : this.fillStyle) : '';
        ops.push([fn, args.map((v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : (v && v.width !== undefined && v.height !== undefined ? 'canvas' : v))), style, Math.round(this.globalAlpha * 1000) / 1000]);
      };
    });
  return { ctx, ops };
}
function traced(type, opts = {}) {
  const spans = [];
  let open = null;
  const { ctx, ops } = recorder({
    __cellTrace(phase, key) {
      if (phase === 'begin') open = { key, from: ops.length };
      else if (open && open.key === key) { spans.push({ key, ops: ops.slice(open.from) }); open = null; }
    },
  });
  // (ctx, W, H, type, t, sel, reduced, contrast, zoom, specialization, showLabels)
  C.drawCellInterior(ctx, 760, 440, type, opts.t ?? 0, opts.sel ?? null, opts.reduced ?? true, false, 1, opts.spec ?? 'general', !!opts.labels);
  return { spans, ops };
}
const painted = (spans, key) => spans.filter((s) => s.key === key).reduce((n, s) => n + s.ops.filter((o) => DRAW_OPS.has(o[0])).length, 0);

describe('every catalogued structure is painted, and only those', () => {
  for (const type of ['animal', 'plant', 'bacterium']) {
    it(`paints each ${type} structure the catalogue lists`, () => {
      const { spans } = traced(type);
      for (const key of C.interiorOrganelles(type)) {
        expect(painted(spans, key), `${type}: "${key}" is in the catalogue but no paint operations were traced for it`).toBeGreaterThan(0);
      }
    });
  }

  it('never paints eukaryote-only structures in the bacterium', () => {
    const allowed = new Set(C.interiorOrganelles('bacterium').concat(['field']));
    for (const spec of ['general', 'biofilm']) for (const labels of [false, true]) {
      const { spans } = traced('bacterium', { spec, labels });
      const strays = [...new Set(spans.map((s) => s.key))].filter((k) => !allowed.has(k));
      expect(strays, `bacterium (${spec}, labels ${labels}) traced passes for ${strays.join(', ')}`).toEqual([]);
      ['cytoskeleton', 'nucleus', 'mitochondria', 'roughER', 'golgi', 'vacuole', 'chloroplast'].forEach((k) => expect(painted(spans, k)).toBe(0));
    }
  });

  it("the bacterium's only long run of fibre-shaped strokes is its nucleoid DNA", () => {
    // The fibre-emphasis suite finds "the cytoskeleton pass" as the longest run of
    // moveTo+bezierCurveTo strokes at one alpha. In the prokaryote that run must be
    // the faint loops of chromosomal DNA, never a fibre network.
    const { ctx, ops } = recorder();
    const marks = [];
    ctx.__cellTrace = (phase, key) => marks.push([phase, key, ops.length]);
    let path = [];
    const strokes = [];
    const realBegin = ctx.beginPath, realStroke = ctx.stroke;
    ctx.beginPath = function () { path = []; realBegin.call(this); };
    ['moveTo', 'bezierCurveTo', 'lineTo', 'quadraticCurveTo', 'arc', 'ellipse'].forEach((fn) => { const r = ctx[fn]; ctx[fn] = function (...a) { path.push(fn); r.apply(this, a); }; });
    ctx.stroke = function () { strokes.push({ shape: path.join(','), alpha: this.globalAlpha, at: ops.length }); realStroke.call(this); };
    C.drawCellInterior(ctx, 760, 440, 'bacterium', 0, null, true, false, 1, null, true);
    let best = [], run = [];
    for (const s of strokes) {
      if (s.shape !== 'moveTo,bezierCurveTo') { run = []; continue; }
      if (run.length && Math.abs(run[0].alpha - s.alpha) < 1e-9) run.push(s); else run = [s];
      if (run.length > best.length) best = run.slice();
    }
    expect(best.length).toBeGreaterThanOrEqual(8);
    const begin = marks.find((m) => m[0] === 'begin' && m[1] === 'nucleoid');
    const end = marks.find((m) => m[0] === 'end' && m[1] === 'nucleoid');
    expect(begin && end, 'nucleoid pass not traced').toBeTruthy();
    best.forEach((s) => { expect(s.at).toBeGreaterThan(begin[2]); expect(s.at).toBeLessThanOrEqual(end[2]); expect(s.alpha).toBeLessThan(0.2); });
  });
});

describe('what is drawn is what a click selects', () => {
  const hit = (type, x, y, zoom = 1) => C.interiorHitTest(type, x / 760, y / 440, 760, 440, zoom);
  for (const zoom of [0.85, 1, 1.25]) {
    it(`keeps organelle artwork inside its own click target at zoom ${zoom}`, () => {
      for (const type of ['animal', 'plant']) {
        const sc = ART.scene(760, 440, type, zoom, 'general');
        const N = sc.nucleus;
        expect(sc.rer.length, `${type}: no rough ER sheets were laid out`).toBeGreaterThanOrEqual(3);
        sc.rer.forEach((sh) => { for (let f = 0; f <= 1; f += 0.125) { const a = sh.a0 + (sh.a1 - sh.a0) * f; expect(hit(type, N.x + Math.cos(a) * sh.r, N.y + Math.sin(a) * sh.r, zoom), `${type} RER sheet r=${sh.r.toFixed(1)}`).toBe('roughER'); } });
        expect(sc.ser.nodes.length).toBeGreaterThanOrEqual(5);
        sc.ser.nodes.forEach((p) => expect(hit(type, p[0], p[1], zoom), `${type} SER node`).toBe('smoothER'));
        const g = sc.golgi, ax = Math.cos(g.ax), ay = Math.sin(g.ax);
        for (let ci = 0; ci < 6; ci++) for (const u of [-1, -0.5, 0, 0.5, 1]) {
          const d = (2.5 - ci) * g.spacing + g.bow * (1 - u * u), half = g.half[ci];
          expect(hit(type, g.x - ay * u * half + ax * d, g.y + ax * u * half + ay * d, zoom), `${type} golgi cisterna ${ci} u=${u}`).toBe('golgi');
        }
        expect(hit(type, N.x, N.y, zoom)).toBe('nucleus');
        expect(hit(type, N.x + N.R * 0.6, N.y - N.R * 0.6, zoom)).toBe('nucleus');
      }
      const plant = ART.scene(760, 440, 'plant', zoom, 'general');
      const v = plant.vacuole;
      let inVacuole = 0, total = 0;
      v.pts.forEach((p, i) => { if (i % 3) return; total++; const q = [v.x + (p[0] - v.x) * 0.8, v.y + (p[1] - v.y) * 0.8]; if (hit('plant', q[0], q[1], zoom) === 'vacuole') inVacuole++; });
      expect(inVacuole / total, 'most of the drawn vacuole must select the vacuole').toBeGreaterThan(0.8);
    });
  }
});

describe('the scene builder asks the real click test', () => {
  it('its fast hit test agrees with interiorHitTest everywhere on the canvas', () => {
    const mismatches = [];
    for (const type of ['animal', 'plant', 'bacterium']) for (const zoom of [0.85, 1, 1.25]) {
      const pts = [];
      for (let x = -10; x <= 770; x += 7.3) for (let y = -10; y <= 450; y += 7.3) pts.push([x, y]);
      const fast = ART.hitMany(760, 440, type, zoom, pts);
      pts.forEach((p, i) => { const real = C.interiorHitTest(type, p[0] / 760, p[1] / 440, 760, 440, zoom); if (real !== fast[i]) mismatches.push(`${type}@${zoom} (${p[0]},${p[1]}): ${fast[i]} vs ${real}`); });
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});

describe('motion', () => {
  const frame = (type, t, reduced, sel, labels) => { const { ctx, ops } = recorder(); C.drawCellInterior(ctx, 760, 440, type, t, sel || null, reduced, false, 1, 'general', !!labels, false, 50, [], 0, null, undefined, false); return JSON.stringify(ops); };
  for (const type of ['animal', 'plant', 'bacterium']) {
    it(`${type}: reduced motion gives identical frames; full motion does not`, () => {
      expect(frame(type, 0, true, 'mitochondria'), 'reduced-motion frames differ over time').toBe(frame(type, 7.3, true, 'mitochondria'));
      expect(frame(type, 0, true, null, true)).toBe(frame(type, 31.9, true, null, true));
      expect(frame(type, 0, false), 'the living layer never moved').not.toBe(frame(type, 7.3, false));
    });
  }
  it('guided trace and process lens stay still under reduced motion', () => {
    const run = (t) => { const { ctx, ops } = recorder(); C.drawCellInterior(ctx, 760, 440, 'animal', t, 'golgi', true, false, 1, 'general', false, false, 50, ['nucleus', 'roughER', 'golgi', 'cellMembrane'], 1, '#fbbf24', undefined, false); return JSON.stringify(ops); };
    expect(run(0)).toBe(run(4.2));
  });
});

describe('static layer cache', () => {
  function setup() {
    const builds = [];
    ART.setLayerFactory((w, h) => {
      const layer = recorder();
      const canvas = { width: w, height: h, getContext: () => layer.ctx };
      builds.push(layer);
      return canvas;
    });
    const target = recorder({ canvas: {}, getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) });
    const draw = (o = {}) => C.drawCellInterior(target.ctx, 760, 440, o.type || 'animal', o.t || 0, o.sel || null, false, !!o.contrast, o.zoom || 1, o.spec || 'general', !!o.labels, !!o.depth, o.depthLevel ?? 50, [], 0, null, undefined, true);
    const store = () => target.ctx.canvas._cellInteriorArt;
    return { builds, target, draw, store };
  }
  it('builds once, composites every frame, and rebuilds only when the view changes', () => {
    const { builds, target, draw, store } = setup();
    draw();
    expect(store().builds).toBe(1);
    expect(builds.length).toBe(1);
    expect(builds[0].ops.filter((o) => DRAW_OPS.has(o[0])).length, 'the layer was never painted').toBeGreaterThan(120);
    const layerOps = builds[0].ops.length;
    draw({ t: 1.5 }); draw({ t: 3 }); draw({ sel: 'golgi' }); draw({ sel: 'nucleus', t: 9 });
    expect(store().builds, 'time or selection changes must not repaint the static art').toBe(1);
    expect(builds[0].ops.length).toBe(layerOps);
    expect(target.ops.filter((o) => o[0] === 'drawImage').length).toBe(5);
    let n = 1;
    for (const change of [{ zoom: 1.2 }, { type: 'plant' }, { type: 'plant', contrast: true }, { type: 'plant', contrast: true, spec: 'leaf' }, { type: 'plant', contrast: true, spec: 'leaf', labels: true }, { type: 'plant', contrast: true, spec: 'leaf', labels: true, depth: true }, { type: 'plant', contrast: true, spec: 'leaf', labels: true, depth: true, depthLevel: 80 }, { type: 'plant', contrast: true, spec: 'leaf', labels: true, depth: true, depthLevel: 80, sel: 'vacuole' }]) {
      draw(change); n++;
      expect(store().builds, `no rebuild after ${JSON.stringify(change)}`).toBe(n);
      draw(Object.assign({ t: 5 }, change));
      expect(store().builds, `extra rebuild for an unchanged view ${JSON.stringify(change)}`).toBe(n);
    }
    // the offscreen layer is reused, not reallocated, as the view changes
    expect(builds.length).toBe(1);
  });
  it('the cached and direct paths paint the same static art', () => {
    const { builds, target, draw } = setup();
    draw({ type: 'plant', spec: 'root' });
    const direct = recorder();
    C.drawCellInterior(direct.ctx, 760, 440, 'plant', 0, null, false, false, 1, 'root', false, false, 50, [], 0, null, undefined, true);
    const strip = (ops) => ops.filter((o) => o[0] !== 'save' && o[0] !== 'restore' && o[0] !== 'clearRect' && o[0] !== 'setTransform');
    const staticOps = strip(builds[0].ops);
    expect(JSON.stringify(strip(direct.ops).slice(0, staticOps.length))).toBe(JSON.stringify(staticOps));
    expect(target.ops.some((o) => o[0] === 'drawImage')).toBe(true);
  });
});

describe('phone labels', () => {
  it('numbers the label chips in the same order as the legend', () => {
    for (const type of ['animal', 'plant', 'bacterium']) {
      const legend = ART.labelLegend(type, 1, 'general');
      expect(legend.length).toBe(C.interiorOrganelles(type).length);
      const { ctx, ops } = recorder();
      C.drawCellInterior(ctx, 760, 440, type, 0, null, true, false, 1, 'general', true, false, 50, [], 0, null, undefined, true, { labelMode: 'numbers', displayScale: 0.45 });
      const numbers = ops.filter((o) => o[0] === 'fillText' && /^\d+$/.test(o[1][0])).map((o) => Number(o[1][0]));
      expect(numbers).toEqual(legend.map((e) => e.number));
      expect(ops.some((o) => o[0] === 'fillText' && legend.some((e) => e.name === o[1][0])), 'names belong in the HTML legend at phone width').toBe(false);
    }
  });
});
