// Rock Cycle: the richer diagram, and following one rock's journey (2026-09-27).
//
// THE DIAGRAM now shows where each process happens (rain on mountains, a river,
// the sea floor, folded rock deep down, a magma chamber), draws each family as a
// specimen you can see, and draws each process as a ribbon in the colour of the
// family it makes. The flow particles on the three branch arrows used to follow
// the FORWARD curve, so they floated beside the arrows they belonged to.
//
// THE JOURNEY lets a student put what a run produced back into the machine and
// follow one rock round the cycle, including the shortcuts the one-way loop
// leaves out. Products the machine has no specimen for end the journey
// honestly instead of pretending greenschist is slate.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const SRC = readFileSync(ROCKS_FILE, 'utf8');

function lit(marker, open, close) {
  const at = SRC.indexOf(marker), st = SRC.indexOf(open, at);
  let d = 0, q = null;
  for (let i = st; i < SRC.length; i++) {
    const c = SRC[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === open) d++;
    else if (c === close && --d === 0) return new Function('return (' + SRC.slice(st, i + 1) + ')')();
  }
  throw new Error('unbalanced ' + marker);
}
const SPEC = lit('var RC_SPECIMENS = [', '[', ']');
const TX = lit('var RC_TRANSFORMS = {', '{', '}');
const NEXT = lit('var RC_NEXT = {', '{', '}');
const FAM = Object.fromEntries(SPEC.map((s) => [s.id, s.family]));
const LABEL = Object.fromEntries(SPEC.map((s) => [s.id, s.label]));
const AGENTS = ['melting_cooling', 'heat_pressure', 'weathering_erosion'];

// ── A recording 2D context ──────────────────────────────────────────────────
function recorder(log) {
  const state = { strokeStyle: '', fillStyle: '', lineWidth: 1, font: '' };
  const returned = { addColorStop() {}, width: 24 };
  return new Proxy({}, {
    get: (_t, k) => {
      if (k in state) return state[k];
      return (...args) => {
        if (k === 'stroke') log.push({ op: 'stroke', style: state.strokeStyle, width: state.lineWidth });
        else if (k === 'translate') log.push({ op: 'translate', x: args[0], y: args[1] });
        else if (k === 'drawImage') log.push({ op: 'drawImage', x: args[1], y: args[2], w: args[3], h: args[4] });
        else if (k === 'fillText') log.push({ op: 'fillText', text: args[0] });
        return returned;
      };
    },
    set: (_t, k, v) => { state[k] = v; return true; },
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
function tree(rockCycle) {
  const { store, ctx } = mk(rockCycle);
  return { store, node: window.StemLab._registry.rockCycle.render(ctx) };
}
function render(rockCycle) {
  const { ctx } = mk(rockCycle);
  // React escapes '>' in attributes; read them back as written.
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))).replace(/&gt;/g, '>');
}
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}

// Mount the real canvas initialiser on a stub element and record one frame.
function drawFrame(W, H, selected) {
  const log = [];
  const live = tree({});
  const el = document.createElement('canvas');
  Object.defineProperty(el, 'offsetWidth', { value: W });
  Object.defineProperty(el, 'offsetHeight', { value: H });
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H });
  el.getContext = () => recorder(log);
  if (selected) el.dataset.selectedRock = selected;
  document.body.appendChild(el);
  const ref = findAll(live.node, (n) => n.type === 'canvas')[0].ref;
  ref(el);
  expect(el._rcInit, 'canvas initialiser did not run').toBe(true);
  return log;
}
// Node positions and the arrow curves, as the canvas lays them out.
const nodesFor = (W, H) => ({ igneous: [W * 0.5, H * 0.15], sedimentary: [W * 0.82, H * 0.7], metamorphic: [W * 0.18, H * 0.7] });
function curve(from, to, bow) {
  const mx = (from[0] + to[0]) / 2 + (to[1] - from[1]) * bow, my = (from[1] + to[1]) / 2 - (to[0] - from[0]) * bow;
  return (t) => [(1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * mx + t * t * to[0], (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * my + t * t * to[1]];
}
const distTo = (f, p) => { let best = Infinity; for (let i = 0; i <= 1000; i++) { const q = f(i / 1000); best = Math.min(best, Math.hypot(q[0] - p[0], q[1] - p[1])); } return best; };

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  // Offscreen specimen textures get a context too.
  HTMLCanvasElement.prototype.getContext = function () { return recorder([]); };
  document.body.innerHTML = '';
});

describe('the rock cycle diagram', () => {
  it('draws each process as a ribbon in the colour of the family it makes', () => {
    const log = drawFrame(600, 420);
    const ribbons = log.filter((e) => e.op === 'stroke' && /^rgba\((251,191,36|167,139,250|249,115,22),0\.(26|16)\)$/.test(e.style)).map((e) => e.style);
    // Forward loop: to sedimentary (amber), to metamorphic (violet), to igneous
    // (orange); then the three shortcuts, fainter, in the same colour code.
    expect(ribbons).toEqual([
      'rgba(251,191,36,0.26)', 'rgba(167,139,250,0.26)', 'rgba(249,115,22,0.26)',
      'rgba(167,139,250,0.16)', 'rgba(249,115,22,0.16)', 'rgba(251,191,36,0.16)',
    ]);
    // The bright core the contrast test measures is still drawn on every arrow.
    expect(log.filter((e) => e.op === 'stroke' && e.style === 'rgba(226,232,240,0.78)').length).toBe(3);
    expect(log.filter((e) => e.op === 'stroke' && e.style === 'rgba(226,232,240,0.52)').length).toBe(3);
  });

  it('moves every grain along its own arrow, shortcuts included', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    const fwd = curve(N.igneous, N.sedimentary, 0.2);        // weathering, forward
    const cut = curve(N.metamorphic, N.sedimentary, -0.34);  // weathering, shortcut
    const wrong = curve(N.metamorphic, N.sedimentary, 0.2);  // where the bug put them
    const grains = drawFrame(W, H).filter((e) => e.op === 'translate').map((e) => [e.x / 2, e.y / 2]);
    expect(grains.length).toBe(20);
    let onCut = 0;
    grains.forEach((p) => {
      const df = distTo(fwd, p), dc = distTo(cut, p);
      expect(Math.min(df, dc), 'grain at ' + p.map(Math.round)).toBeLessThan(0.5);
      if (dc < 0.5) { onCut++; expect(distTo(wrong, p)).toBeGreaterThan(0.5); }
    });
    expect(onCut).toBeGreaterThan(0);
  });

  it('draws the three families as specimens, the chosen one larger', () => {
    const W = 600, H = 420, N = nodesFor(W, H);
    const imgs = drawFrame(W, H, 'metamorphic').filter((e) => e.op === 'drawImage');
    // Only the three node specimens are drawn from images.
    expect(imgs.length).toBe(3);
    ['igneous', 'sedimentary', 'metamorphic'].forEach((id, i) => {
      const r = id === 'metamorphic' ? 34 : 28;
      const im = imgs[i];
      expect(im.w, id).toBe(r * 2 * 2);
      expect((im.x + im.w / 2) / 2, id + ' x').toBeCloseTo(N[id][0], 5);
      expect((im.y + im.h / 2) / 2, id + ' y').toBeCloseTo(N[id][1], 5);
    });
  });

  it('says where each process happens, but not on a canvas too narrow for it', () => {
    const CAPS = ['Rain and rivers wear rock down', 'Grains settle on the sea floor', 'Squeezed and heated deep down', 'Magma melts rock here'];
    const wide = drawFrame(700, 416).filter((e) => e.op === 'fillText').map((e) => e.text);
    CAPS.forEach((c) => expect(wide, c).toContain(c));
    const narrow = drawFrame(380, 416).filter((e) => e.op === 'fillText').map((e) => e.text);
    CAPS.forEach((c) => expect(narrow, c).not.toContain(c));
    // Process labels are drawn at every width (this translator returns the key's last part).
    expect(narrow).toContain('weathering_erosion');
  });
});

// ── The journey ─────────────────────────────────────────────────────────────
const resultOf = (from, agent) => Object.assign({}, TX[from][agent], { fromId: from, fromLabel: LABEL[from], agentId: agent, agentShort: agent });
// Written out from the families, not borrowed from the tool.
const kindOf = (a, b) => {
  const fa = FAM[a], fb = FAM[b];
  if (fa === fb) return 'stay';
  return ({ igneous: 'sedimentary', sedimentary: 'metamorphic', metamorphic: 'igneous' })[fa] === fb ? 'loop' : 'branch';
};

describe('a rock\'s journey through the machine', () => {
  it('sends every product on as one of the machine\'s own specimens, or stops honestly', () => {
    let stops = 0;
    SPEC.forEach((s) => AGENTS.forEach((a) => {
      expect(Object.prototype.hasOwnProperty.call(NEXT[s.id], a), s.id + ' ' + a).toBe(true);
      const nx = NEXT[s.id][a], rec = TX[s.id][a];
      if (nx) {
        expect(FAM[nx], s.id + ' ' + a).toBe(rec.family);
        // It names the rock it becomes, or has that rock's texture.
        const named = rec.product.toLowerCase().includes(LABEL[nx].toLowerCase());
        const sameTexture = SPEC.find((x) => x.id === nx).texture === rec.texture;
        expect(named || sameTexture, s.id + ' ' + a + ' -> ' + nx + ' (' + rec.product + ')').toBe(true);
      } else {
        stops++;
        SPEC.forEach((x) => expect(rec.product.toLowerCase(), s.id + ' ' + a).not.toContain(x.label.toLowerCase()));
      }
    }));
    expect(stops).toBe(6);
  });

  it('puts the product back in the machine and extends the journey', () => {
    const t = tree({ startingRock: 'granite', geologicalAgent: 'weathering_erosion', transformationResult: resultOf('granite', 'weathering_erosion') });
    findAll(t.node, (n) => n.props && n.props['data-rc-keep-going'] === 'sandstone')[0].props.children[0].props.onClick();
    expect(t.store.rockCycle).toMatchObject({ startingRock: 'sandstone', geologicalAgent: null, transformationResult: null, rcJourney: [{ from: 'granite', agent: 'weathering_erosion', to: 'sandstone' }] });
    const t2 = tree(Object.assign({}, t.store.rockCycle, { transformationResult: resultOf('sandstone', 'melting_cooling') }));
    findAll(t2.node, (n) => n.props && n.props['data-rc-keep-going'] === 'granite')[0].props.children[0].props.onClick();
    expect(t2.store.rockCycle.rcJourney.map((s) => s.to)).toEqual(['sandstone', 'granite']);
    // A run from somewhere else starts a new journey.
    const t3 = tree(Object.assign({}, t2.store.rockCycle, { transformationResult: resultOf('shale', 'heat_pressure') }));
    findAll(t3.node, (n) => n.props && n.props['data-rc-keep-going'] === 'slate')[0].props.children[0].props.onClick();
    expect(t3.store.rockCycle.rcJourney).toEqual([{ from: 'shale', agent: 'heat_pressure', to: 'slate' }]);
  });

  it('draws the trail with each step\'s kind, and notices a full trip and its shortcuts', () => {
    const steps = [
      { from: 'granite', agent: 'weathering_erosion', to: 'sandstone' },
      { from: 'sandstone', agent: 'melting_cooling', to: 'granite' },
      { from: 'granite', agent: 'heat_pressure', to: 'gneiss' },
      { from: 'gneiss', agent: 'melting_cooling', to: 'granite' },
    ];
    const m = render({ startingRock: 'granite', rcJourney: steps });
    const got = [...m.matchAll(/data-rc-journey-step="([\w>]+):(\w+)"/g)].map((x) => x[1] + ':' + x[2]);
    expect(got).toEqual(steps.map((s) => s.from + '>' + s.agent + '>' + s.to + ':' + kindOf(s.from, s.to)));
    expect([...m.matchAll(/data-rc-journey-rock="(\w+)(:now)?"/g)].map((x) => x[1] + (x[2] || ''))).toEqual(['granite', 'sandstone', 'granite', 'gneiss', 'granite:now']);
    expect(m).toContain('data-rc-journey="4:full"');
    expect(m).toContain('data-rc-journey-full');
    const shortcuts = steps.filter((s) => kindOf(s.from, s.to) === 'branch').length;
    expect(m).toContain('data-rc-journey-shortcuts="' + shortcuts + '"');
    // Part of the way round: no full trip, and families not yet visited say so.
    const part = render({ startingRock: 'sandstone', rcJourney: steps.slice(0, 1) });
    expect(part).toContain('data-rc-journey="1:part"');
    expect(part).not.toContain('data-rc-journey-full');
    expect(part).toContain('data-rc-journey-fam="metamorphic:no"');
    expect(part).toContain('data-rc-journey-fam="igneous:yes"');
  });

  it('ends the journey where the machine has no specimen for the product', () => {
    const m = render({ startingRock: 'basalt', transformationResult: resultOf('basalt', 'heat_pressure') });
    expect(m).not.toContain('data-rc-keep-going');
    expect(m).toContain('data-rc-journey-end="basalt>heat_pressure"');
    expect(m).toContain('the machine has no specimen for this rock');
  });

  it('keeps only the part of a saved journey that is still a chain', () => {
    const good = { from: 'granite', agent: 'weathering_erosion', to: 'sandstone' };
    [
      [[good, { from: 'shale', agent: 'heat_pressure', to: 'slate' }], 1],
      [[good, { from: 'sandstone', agent: 'heat_pressure', to: 'quartzite' }], 1],
      [[null, good], 0],
      [[good, { from: 'sandstone', agent: 'nope', to: 'granite' }, good], 1],
      ['abc', 0],
    ].forEach(([saved, n]) => {
      const m = render({ startingRock: 'granite', rcJourney: saved });
      if (n === 0) expect(m, JSON.stringify(saved)).not.toContain('data-rc-journey=');
      else expect(m, JSON.stringify(saved)).toContain('data-rc-journey="' + n + ':');
    });
  });

  it('starts a new journey on request', () => {
    const t = tree({ rcJourney: [{ from: 'granite', agent: 'weathering_erosion', to: 'sandstone' }] });
    findAll(t.node, (n) => n.props && n.props['data-rc-journey-reset'])[0].props.onClick();
    expect(t.store.rockCycle.rcJourney).toEqual([]);
  });
});
