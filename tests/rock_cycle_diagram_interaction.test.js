// Rock Cycle: the diagram answers clicks and shows the student's own journey
// (2026-09-27, round 2).
//
// The mission panel told students to "choose an arrow", but only the three
// family nodes could be clicked; the arrows could not. Now a click on an arrow
// picks its process, the picked arrow glows and the rest dim, and the journey a
// student builds in the transformation machine is drawn on the diagram as
// numbered steps with a "Your rock is here" marker. With reduced motion there is
// no frame loop, so the diagram redraws when those attributes change.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const DPR = 2;

// ── A recording 2D context with a real save/restore stack and path boxes ────
// Translation is tracked (rotate/scale are not), so a drawing made around a
// translated centre reports that centre as tx/ty.
function recorder(log) {
  let st = { strokeStyle: '', fillStyle: '', lineWidth: 1, font: '10px sans-serif', globalAlpha: 1, tx: 0, ty: 0 };
  const stack = [];
  let pts = [], arcs = [];
  const grad = { addColorStop() {} };
  const gradient = () => { const g = { stops: [] }; g.addColorStop = (_o, c) => g.stops.push(c); return g; };
  const box = () => {
    if (!pts.length) return null;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const ops = {
    save() { stack.push(Object.assign({}, st)); },
    restore() { if (stack.length) st = stack.pop(); },
    beginPath() { pts = []; arcs = []; },
    moveTo(x, y) { pts.push([x, y]); },
    lineTo(x, y) { pts.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) { pts.push([cx, cy], [x, y]); },
    arc(x, y, r, s, e) { arcs.push({ x, y, r, s, e }); pts.push([x - r, y - r], [x + r, y + r]); },
    fill() { log.push({ op: 'fill', style: st.fillStyle, alpha: st.globalAlpha, box: box(), arcs: arcs.slice(), tx: st.tx, ty: st.ty }); },
    stroke() { log.push({ op: 'stroke', style: st.strokeStyle, width: st.lineWidth, alpha: st.globalAlpha, box: box(), arcs: arcs.slice() }); },
    fillText(text, x, y) { log.push({ op: 'fillText', text: String(text), x, y, alpha: st.globalAlpha }); },
    measureText(text) { const m = /([\d.]+)px/.exec(st.font); return { width: String(text).length * (m ? Number(m[1]) : 10) * 0.55 }; },
    translate(x, y) { st.tx += x; st.ty += y; },
    drawImage(img) { log.push({ op: 'drawImage', img, tx: st.tx, ty: st.ty, alpha: st.globalAlpha }); },
    createRadialGradient() { return gradient(); },
    createLinearGradient() { return gradient(); },
  };
  return new Proxy({}, {
    get: (_t, k) => (k in ops ? ops[k] : k in st ? st[k] : () => grad),
    set: (_t, k, v) => { st[k] = v; return true; },
  });
}

function mk(rockCycle) {
  const store = { rocks: {}, rockCycle: Object.assign({}, rockCycle) };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); },
    t: (k, fb) => fb || String(k).split('.').pop(),
  });
  return { store, ctx };
}
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}
function render(rockCycle) {
  const { ctx } = mk(rockCycle);
  // Raw markup: '>' inside attribute values stays escaped until attr() reads it.
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rockCycle.render(ctx)));
}

// Mount the real canvas initialiser on a stub element (reduced motion, so one
// frame is drawn at init and redraws happen only on demand).
function mount(W, H, data) {
  const log = [];
  const { store, ctx } = mk({});
  const node = window.StemLab._registry.rockCycle.render(ctx);
  const el = document.createElement('canvas');
  Object.defineProperty(el, 'offsetWidth', { value: W });
  Object.defineProperty(el, 'offsetHeight', { value: H });
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H });
  el.getContext = () => recorder(log);
  Object.keys(data || {}).forEach((k) => { el.dataset[k] = data[k]; });
  document.body.appendChild(el);
  findAll(node, (n) => n.type === 'canvas')[0].ref(el);
  expect(el._rcInit, 'canvas initialiser did not run').toBe(true);
  const click = (x, y) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  return { el, log, store, click };
}

const nodesFor = (W, H) => ({ igneous: [W * 0.5, H * 0.15], sedimentary: [W * 0.82, H * 0.7], metamorphic: [W * 0.18, H * 0.7] });
// The six arrows in the diagram's own order: the forward loop, then shortcuts.
const ARROWS = [
  ['igneous', 'sedimentary', 0.2], ['sedimentary', 'metamorphic', 0.2], ['metamorphic', 'igneous', 0.2],
  ['igneous', 'metamorphic', -0.34], ['sedimentary', 'igneous', -0.34], ['metamorphic', 'sedimentary', -0.34],
];
function curve(from, to, bow) {
  const mx = (from[0] + to[0]) / 2 + (to[1] - from[1]) * bow, my = (from[1] + to[1]) / 2 - (to[0] - from[0]) * bow;
  return (t) => [(1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * mx + t * t * to[0], (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * my + t * t * to[1]];
}
const arrowCurve = (W, H, i) => { const N = nodesFor(W, H), a = ARROWS[i]; return curve(N[a[0]], N[a[1]], a[2]); };
const distTo = (f, p) => { let best = Infinity; for (let i = 0; i <= 1000; i++) { const q = f(i / 1000); best = Math.min(best, Math.hypot(q[0] - p[0], q[1] - p[1])); } return best; };
const boxDist = (b, x, y) => Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - y, 0, y - b.y - b.h));

const RIBBON = /^rgba\((251,191,36|167,139,250|249,115,22),0\.(26|16|5)\)$/;
const LABEL_FILL = 'rgba(2,6,23,0.84)', NAME_FILL = 'rgba(2,6,23,0.86)', BADGE = '#c2410c';
const badgesOf = (log) => log.filter((e) => e.op === 'fill' && e.style === BADGE && e.arcs.length === 1 && e.arcs[0].r === 9.5 * DPR).map((e) => e.arcs[0]);

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  HTMLCanvasElement.prototype.getContext = function () { return recorder([]); };
  document.body.innerHTML = '';
});

describe('clicking the rock cycle diagram', () => {
  it('picks the process of whichever arrow is clicked, shortcuts included', () => {
    const W = 600, H = 420;
    ARROWS.forEach((a, i) => {
      const m = mount(W, H);
      const p = arrowCurve(W, H, i)(0.5);
      m.click(p[0], p[1]);
      const sp = m.store.rockCycle.selectedProcess;
      expect(sp && [sp.from, sp.to], 'arrow ' + i).toEqual([a[0], a[1]]);
      expect(m.el.dataset.selectedProc).toBe(String(i));
      document.body.innerHTML = '';
    });
  });

  it('takes a click near an arrow but not one well off it', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    const f = arrowCurve(W, H, 0), p = f(0.5);
    // Step toward the chord, away from every other arrow.
    const cx = (N.igneous[0] + N.sedimentary[0]) / 2, cy = (N.igneous[1] + N.sedimentary[1]) / 2;
    const len = Math.hypot(cx - p[0], cy - p[1]), ux = (cx - p[0]) / len, uy = (cy - p[1]) / len;
    const near = mount(W, H);
    near.click(p[0] + ux * 10, p[1] + uy * 10);
    expect(near.store.rockCycle.selectedProcess.to).toBe('sedimentary');
    document.body.innerHTML = '';
    const far = mount(W, H);
    far.click(p[0] + ux * 16, p[1] + uy * 16);
    expect(far.store.rockCycle.selectedProcess).toBeUndefined();
    expect(far.el.dataset.selectedProc).toBeUndefined();
    document.body.innerHTML = '';
    const empty = mount(W, H);
    empty.click(8, H - 8);
    expect(empty.store.rockCycle.selectedProcess).toBeUndefined();
    expect(empty.store.rockCycle.selectedRock).toBeUndefined();
  });

  it('lets a click on a family win over the arrows that start there', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    const m = mount(W, H);
    m.click(N.igneous[0] + 6, N.igneous[1] + 6);
    expect(m.store.rockCycle.selectedRock).toBe('igneous');
    expect(m.store.rockCycle.selectedProcess).toBeUndefined();
  });
});

describe('the picked arrow on the diagram', () => {
  it('glows wider and brighter while the other five dim', () => {
    const plain = mount(600, 420).log.filter((e) => e.op === 'stroke' && RIBBON.test(e.style));
    expect(plain.length).toBe(6);
    plain.forEach((e) => expect(e.alpha).toBe(1));
    document.body.innerHTML = '';
    const picked = mount(600, 420, { selectedProc: '3' }).log.filter((e) => e.op === 'stroke' && RIBBON.test(e.style));
    expect(picked.length).toBe(6);
    // Igneous to metamorphic: violet, the colour of the family it makes.
    expect(picked[3]).toMatchObject({ style: 'rgba(167,139,250,0.5)', width: 18 * DPR, alpha: 1 });
    picked.forEach((e, i) => { if (i !== 3) expect(e.alpha, 'ribbon ' + i).toBe(0.4); });
    expect(plain.filter((e) => e.width === 18 * DPR).length).toBe(0);
  });

  it('names a picked shortcut, and hides the label it would land on', () => {
    const texts = (data) => { document.body.innerHTML = ''; return mount(600, 420, data).log.filter((e) => e.op === 'fillText').map((e) => e.text); };
    const count = (arr, s) => arr.filter((x) => x === s).length;
    const plain = texts({});
    expect(count(plain, 'heat_pressure')).toBe(1);
    expect(count(plain, 'melting_cooling')).toBe(1);
    // Shortcut igneous -> metamorphic is heat & pressure; its reverse,
    // metamorphic -> igneous, is melting & cooling and shares its spot.
    const picked = texts({ selectedProc: '3' });
    expect(count(picked, 'heat_pressure')).toBe(2);
    expect(count(picked, 'melting_cooling')).toBe(0);
    // A picked forward arrow hides nothing.
    const fwd = texts({ selectedProc: '0' });
    ['weathering_erosion', 'heat_pressure', 'melting_cooling'].forEach((s) => expect(count(fwd, s), s).toBe(1));
    // The other labels fade with their arrows; the picked one stays bright.
    document.body.innerHTML = '';
    const named = mount(600, 420, { selectedProc: '0' }).log.filter((e) => e.op === 'fillText' && ['weathering_erosion', 'heat_pressure', 'melting_cooling'].includes(e.text));
    expect(named.map((e) => e.text + ':' + e.alpha)).toEqual(['weathering_erosion:1', 'heat_pressure:0.4', 'melting_cooling:0.4']);
  });

  it('ignores a selected-process attribute it cannot use', () => {
    ['', 'x', '9', '-1', '2.5'].forEach((v) => {
      document.body.innerHTML = '';
      const r = mount(600, 420, { selectedProc: v }).log.filter((e) => e.op === 'stroke' && RIBBON.test(e.style));
      expect(r.length, v).toBe(6);
      r.forEach((e) => expect(e.alpha, v).toBe(1));
    });
  });
});

describe('the journey on the diagram', () => {
  const TRIP = ['igneous>sedimentary', 'sedimentary>igneous', 'igneous>metamorphic', 'metamorphic>igneous', 'igneous>igneous'];

  it('numbers each step on the arrow it took, and a stay beside its family', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    const log = mount(W, H, { journey: TRIP.join(',') }).log;
    const badges = badgesOf(log);
    expect(badges.length).toBe(5);
    const nums = log.filter((e) => e.op === 'fillText' && /^\d+$/.test(e.text)).map((e) => e.text);
    expect(nums).toEqual(['1', '2', '3', '4', '5']);
    TRIP.forEach((step, k) => {
      const [a, b] = step.split('>');
      const c = [badges[k].x / DPR, badges[k].y / DPR];
      if (a === b) {
        const d = Math.hypot(c[0] - N[a][0], c[1] - N[a][1]);
        expect(d, step).toBeGreaterThan(28 + 9.5);
        expect(d, step).toBeLessThan(100);
      } else {
        const i = ARROWS.findIndex((x) => x[0] === a && x[1] === b);
        expect(distTo(arrowCurve(W, H, i), c), step).toBeLessThan(0.5);
      }
    });
  });

  it('keeps every badge off the process names, the family names and each other', () => {
    const trips = [
      TRIP,
      ['igneous>sedimentary', 'sedimentary>sedimentary', 'sedimentary>igneous', 'igneous>sedimentary'],
      ['sedimentary>metamorphic', 'metamorphic>sedimentary', 'sedimentary>metamorphic', 'metamorphic>metamorphic', 'metamorphic>igneous', 'igneous>sedimentary', 'sedimentary>metamorphic'],
      // Staying put again and again (granite melted and cooled three times).
      ['igneous>igneous', 'igneous>igneous', 'igneous>igneous', 'igneous>sedimentary', 'sedimentary>sedimentary', 'sedimentary>sedimentary'],
      // Back and forth along the bottom until the arrows are crowded.
      ['sedimentary>metamorphic', 'metamorphic>sedimentary', 'sedimentary>metamorphic', 'metamorphic>sedimentary', 'sedimentary>metamorphic', 'metamorphic>sedimentary', 'sedimentary>metamorphic', 'metamorphic>sedimentary'],
    ];
    // The narrowest has the chosen family drawn larger, so it crowds its arrows.
    [[600, 420, ''], [370, 416, ''], [1000, 420, ''], [320, 416, 'sedimentary'], [320, 416, 'metamorphic']].forEach(([W, H, sel]) => trips.forEach((trip) => {
      document.body.innerHTML = '';
      const N = nodesFor(W, H);
      const log = mount(W, H, sel ? { journey: trip.join(','), selectedRock: sel } : { journey: trip.join(',') }).log;
      const labels = log.filter((e) => e.op === 'fill' && (e.style === LABEL_FILL || e.style === NAME_FILL) && e.box).map((e) => e.box);
      expect(labels.length, W + ' labels').toBe(6);
      const badges = badgesOf(log);
      expect(badges.length).toBe(trip.length);
      badges.forEach((bd, k) => {
        const at = W + ' ' + trip[0] + ' step ' + (k + 1);
        labels.forEach((lb) => expect(boxDist(lb, bd.x, bd.y), at).toBeGreaterThan(bd.r));
        Object.keys(N).forEach((id) => expect(Math.hypot(bd.x - N[id][0] * DPR, bd.y - N[id][1] * DPR), at + ' on ' + id).toBeGreaterThan((id === sel ? 34 : 28) * DPR + bd.r));
        badges.slice(0, k).forEach((o) => expect(Math.hypot(o.x - bd.x, o.y - bd.y), at).toBeGreaterThan(2 * bd.r + 2));
      });
    }));
  });

  it('rings where the rock is now, open under its name, with the tag clear of it', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    [['igneous>sedimentary,sedimentary>igneous', 'igneous', -1], ['igneous>sedimentary', 'sedimentary', 1], ['sedimentary>metamorphic', 'metamorphic', 1]].forEach(([j, at, side]) => {
      document.body.innerHTML = '';
      const log = mount(W, H, { journey: j }).log;
      const ring = log.filter((e) => e.op === 'stroke' && e.style === 'rgba(251,146,60,0.95)');
      expect(ring.length, at).toBe(1);
      const arc = ring[0].arcs[0];
      expect([arc.x / DPR, arc.y / DPR]).toEqual(N[at]);
      // The gap is centred straight down, where the family's name is.
      expect(arc.s, at).toBeGreaterThan(Math.PI / 2);
      expect(arc.e, at).toBeLessThan(Math.PI / 2 + Math.PI * 2);
      expect((arc.s + arc.e) / 2 - Math.PI * 1.5, at).toBeCloseTo(0, 6);
      const tag = log.filter((e) => e.op === 'fillText' && e.text === 'Your rock is here');
      expect(tag.length, at).toBe(1);
      expect(tag[0].x / DPR).toBeCloseTo(N[at][0], 6);
      // Above the top family; below the name of a low one.
      expect(Math.sign(tag[0].y / DPR - N[at][1]), at).toBe(side);
      const name = log.filter((e) => e.op === 'fill' && e.style === NAME_FILL).map((e) => e.box);
      const tagBox = log.filter((e) => e.op === 'fill' && e.style === BADGE && !e.arcs.length).map((e) => e.box)[0];
      name.forEach((nb) => expect(tagBox.y >= nb.y + nb.h || tagBox.y + tagBox.h <= nb.y || tagBox.x >= nb.x + nb.w || tagBox.x + tagBox.w <= nb.x, at).toBe(true));
    });
  });

  it('draws nothing for a journey it cannot read, and no marker without one', () => {
    ['', 'igneous', 'lava>igneous', ',,', 'igneous>sedimentary>metamorphic'].forEach((j) => {
      document.body.innerHTML = '';
      const log = mount(600, 420, { journey: j }).log;
      expect(badgesOf(log).length, JSON.stringify(j)).toBe(0);
      expect(log.some((e) => e.op === 'fillText' && e.text === 'Your rock is here'), JSON.stringify(j)).toBe(false);
    });
  });

  it('redraws when the journey or the pick changes with no animation running', async () => {
    const m = mount(600, 420);
    expect(badgesOf(m.log).length).toBe(0);
    m.log.length = 0;
    m.el.setAttribute('data-journey', 'igneous>sedimentary');
    await new Promise((r) => setTimeout(r, 0));
    expect(badgesOf(m.log).length).toBe(1);
    m.log.length = 0;
    m.el.setAttribute('data-selected-proc', '1');
    await new Promise((r) => setTimeout(r, 0));
    expect(m.log.filter((e) => e.op === 'stroke' && e.style === 'rgba(167,139,250,0.5)').length).toBe(1);
    // Once the canvas is cleaned up it stops listening.
    m.el._rcCleanup();
    m.log.length = 0;
    m.el.setAttribute('data-journey', '');
    await new Promise((r) => setTimeout(r, 0));
    expect(m.log.length).toBe(0);
  });

  it('lets go of its attribute watcher when the canvas is cleaned up', () => {
    const Real = globalThis.MutationObserver, made = [];
    globalThis.MutationObserver = class extends Real {
      constructor(cb) { super(cb); this.off = false; made.push(this); }
      disconnect() { this.off = true; super.disconnect(); }
    };
    try {
      const m = mount(600, 420);
      expect(made.length).toBeGreaterThan(0);
      expect(made.some((o) => o.off)).toBe(false);
      m.el._rcCleanup();
      expect(made.every((o) => o.off)).toBe(true);
    } finally {
      globalThis.MutationObserver = Real;
    }
  });
});

describe('what the canvas element carries', () => {
  const canvasTag = (m) => /<canvas[^>]*>/.exec(m)[0];
  const attr = (tag, name) => { const x = new RegExp(' ' + name + '="([^"]*)"').exec(tag); return x && x[1].replace(/&gt;/g, '>').replace(/&#x27;/g, "'"); };

  it('names the picked process by its arrow, and tolerates a bad saved one', () => {
    ARROWS.forEach((a, i) => {
      const tag = canvasTag(render({ selectedProcess: { from: a[0], to: a[1], label: 'P' + i } }));
      expect(attr(tag, 'data-selected-proc'), a.join('>')).toBe(String(i));
      expect(attr(tag, 'aria-label')).toContain('Selected process: P' + i + '.');
    });
    [null, 'heat', { from: 'igneous' }, { from: 'igneous', to: 'igneous', label: 5 }, []].forEach((sp) => {
      const tag = canvasTag(render({ selectedProcess: sp }));
      expect(attr(tag, 'data-selected-proc'), JSON.stringify(sp)).toBe('');
      expect(attr(tag, 'aria-label'), JSON.stringify(sp)).not.toContain('Selected process:');
    });
  });

  it('passes the journey as family steps and says so to a screen reader', () => {
    const none = canvasTag(render({}));
    expect(attr(none, 'data-journey')).toBe('');
    expect(attr(none, 'aria-label')).toContain('Click an arrow to see its process.');
    expect(attr(none, 'aria-label')).not.toContain('numbered steps');
    const steps = [
      { from: 'granite', agent: 'weathering_erosion', to: 'sandstone' },
      { from: 'sandstone', agent: 'melting_cooling', to: 'granite' },
      { from: 'granite', agent: 'melting_cooling', to: 'granite' },
    ];
    const tag = canvasTag(render({ startingRock: 'granite', rcJourney: steps }));
    expect(attr(tag, 'data-journey')).toBe('igneous>sedimentary,sedimentary>igneous,igneous>igneous');
    expect(attr(tag, 'aria-label')).toContain("Your rock's journey is marked with numbered steps.");
    // A broken chain is cut where it breaks, the same as in the machine.
    const cut = canvasTag(render({ rcJourney: [steps[0], { from: 'shale', agent: 'heat_pressure', to: 'slate' }] }));
    expect(attr(cut, 'data-journey')).toBe('igneous>sedimentary');
  });
});

// ── The travelling chip ─────────────────────────────────────────────────────
// With reduced motion the chip rests where it is changing, so one frame shows
// HOW each process changes rock. Metamorphism must never be drawn as melting.
describe('a chip of rock on the picked arrow', () => {
  const CAPTION = { sedimentary: 'broken into grains', igneous: 'melted into magma', metamorphic: 'squeezed, not melted' };
  const GRAINS = ['#fde68a', '#d6a35c', '#e7e5e4'];
  const isMelt = (e) => e.op === 'fill' && e.style && Array.isArray(e.style.stops) && e.style.stops.includes('#fef9c3');
  const chipImages = (log) => log.filter((e) => e.op === 'drawImage' && (e.tx !== 0 || e.ty !== 0));

  it('changes the way each process changes rock, where no label hides it', () => {
    [[600, 420], [370, 416]].forEach(([W, H]) => ARROWS.forEach((a, i) => {
      document.body.innerHTML = '';
      const at = W + ' ' + a[0] + '>' + a[1];
      const log = mount(W, H, { selectedProc: String(i) }).log;
      const f = arrowCurve(W, H, i);
      const caps = log.filter((e) => e.op === 'fillText' && Object.values(CAPTION).includes(e.text));
      expect(caps.map((e) => e.text), at).toEqual([CAPTION[a[1]]]);
      expect(caps[0].y / DPR, at).toBeGreaterThan(0);
      expect(caps[0].y / DPR, at).toBeLessThan(H);
      let centre;
      if (a[1] === 'metamorphic') {
        // Solid the whole way: squashed, banded, pressed from both sides.
        const im = chipImages(log);
        expect(im.length, at).toBe(2);
        expect(im[0].tx).toBe(im[1].tx);
        // The old rock's texture fades into the new one's (the specimens are drawn in family order).
        const nodeImgs = log.filter((e) => e.op === 'drawImage' && e.tx === 0 && e.ty === 0).map((e) => e.img);
        const famOf = (img) => ['igneous', 'sedimentary', 'metamorphic'][nodeImgs.indexOf(img)];
        expect([famOf(im[0].img), famOf(im[1].img)], at).toEqual([a[0], 'metamorphic']);
        expect(im[1].alpha, at + ' new rock shows most').toBeGreaterThan(0.8);
        expect(im[0].alpha + im[1].alpha).toBeCloseTo(1, 6);
        expect(log.filter((e) => e.op === 'fill' && e.style === '#e2e8f0' && e.tx === im[0].tx).length, at).toBe(2);
        expect(log.some(isMelt), at + ' drawn as melting').toBe(false);
        centre = [im[0].tx / DPR, im[0].ty / DPR];
      } else if (a[1] === 'igneous') {
        const melt = log.filter(isMelt);
        expect(melt.length, at).toBe(1);
        expect(chipImages(log).length, at + ' still a solid chip').toBe(0);
        centre = [melt[0].tx / DPR, melt[0].ty / DPR];
      } else {
        const grains = log.filter((e) => e.op === 'fill' && GRAINS.includes(e.style) && e.arcs.length === 1).map((e) => [e.arcs[0].x / DPR, e.arcs[0].y / DPR]);
        expect(grains.length, at).toBe(9);
        expect(chipImages(log).length, at + ' still a solid chip').toBe(0);
        centre = [grains.reduce((s, g) => s + g[0], 0) / 9, grains.reduce((s, g) => s + g[1], 0) / 9];
        expect(distTo(f, centre), at + ' grains off the arrow').toBeLessThan(8);
        grains.forEach((g) => expect(Math.hypot(g[0] - centre[0], g[1] - centre[1]), at).toBeLessThan(20));
        expect(log.some(isMelt), at + ' drawn as melting').toBe(false);
      }
      if (a[1] !== 'sedimentary') expect(distTo(f, centre), at + ' off the arrow').toBeLessThan(0.5);
      expect(caps[0].x / DPR, at).toBeCloseTo(a[1] === 'sedimentary' ? caps[0].x / DPR : centre[0], 6);
      // Where it changes, no process label covers it...
      const labels = log.filter((e) => e.op === 'fill' && e.style === LABEL_FILL).map((e) => e.box);
      labels.forEach((lb) => expect(boxDist({ x: lb.x / DPR, y: lb.y / DPR, w: lb.w / DPR, h: lb.h / DPR }, centre[0], centre[1]), at).toBeGreaterThan(8));
      // ...and the labels are drawn after it, so it slides under them.
      const lastChip = log.lastIndexOf(caps[0]);
      expect(log.findIndex((e) => e.op === 'fill' && e.style === LABEL_FILL), at).toBeGreaterThan(lastChip);
    }));
  });

  it('is not drawn when no arrow is picked', () => {
    const log = mount(600, 420).log;
    expect(chipImages(log).length).toBe(0);
    expect(log.some(isMelt)).toBe(false);
    expect(log.some((e) => e.op === 'fillText' && Object.values(CAPTION).includes(e.text))).toBe(false);
  });
});
