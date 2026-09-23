// Rocks & Minerals, visual pass (2026-09-23): specimen art that tells the
// look-alikes apart, bigger specimen tiles and cards, cabinet silhouettes,
// pictures in the quiz, and the rock cycle drawn as a network.
//
// The art checks are about DISTINGUISHABILITY, the reason the art exists on
// an identification tool: marble and quartzite, and limestone and chalk, were
// the same picture. The quiz checks make sure a picture never gives an
// answer away.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 });
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_rocks.js';
const SRC = readFileSync(ROCKS_FILE, 'utf8');
const ROCKS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '(\w+)'[^\n]*?texture: '([^']+)', grainColors: \[([^\]]*)\]/g)]
  .map((m) => ({ id: m[1], type: m[2], texture: m[3], cols: [...m[4].matchAll(/#[0-9a-fA-F]{6}/g)].map((x) => x[0].toLowerCase()) }));

function mk(rocks) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx({ toolData: store, setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); } });
  return { store, ctx };
}
function render(rocks) {
  const { ctx } = mk(rocks);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rocks.render(ctx)));
}
function tree(rocks) {
  const { store, ctx } = mk(rocks);
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}
// The first <svg> after an attribute, e.g. a grid tile's swatch.
function svgAfter(markup, attr) {
  const at = markup.indexOf(attr);
  expect(at, attr).toBeGreaterThan(-1);
  const a = markup.indexOf('<svg', at);
  return markup.slice(a, markup.indexOf('</svg>', a) + 6);
}
const count = (s, re) => (s.match(re) || []).length;

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── Specimen art: the look-alikes no longer look alike ─────────────────────
describe('specimen art tells the look-alikes apart', () => {
  let m;
  beforeEach(() => { m = render({ mode: 'rocks' }); });
  const tile = (id) => svgAfter(m, 'data-rk-grid-tile="' + id + '"');

  it('gives quartzite its own warm palette, and a finer, fused mosaic than marble', () => {
    const q = ROCKS.find((r) => r.id === 'quartzite').cols, mb = ROCKS.find((r) => r.id === 'marble').cols;
    q.forEach((c) => expect(mb, c).not.toContain(c));
    const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, v) => a + v, 0) / 3;
    // Warm: red above blue in every quartzite grain colour.
    q.forEach((c) => expect(parseInt(c.slice(1, 3), 16), c).toBeGreaterThan(parseInt(c.slice(5, 7), 16)));
    expect(lum(q[0])).toBeLessThan(lum(mb[0]));
    expect(count(tile('quartzite'), /<polygon/g)).toBeGreaterThan(count(tile('marble'), /<polygon/g));
    expect(tile('quartzite')).toContain('stroke-opacity="0.55"');
  });

  it('veins marble and gives quartzite glassy grains', () => {
    expect(tile('marble')).toContain('stroke="#64748b"');
    expect(tile('quartzite')).not.toContain('stroke="#64748b"');
    expect(count(tile('quartzite'), /<ellipse[^>]*fill="#ffffff"/g)).toBeGreaterThanOrEqual(10);
  });

  it('shows limestone its fossils and chalk none it could not show', () => {
    // Chalk's grains ARE fossils, far too small to see: its lens note says so.
    const lensNote = /chalk: '([^']+)'/.exec(SRC.slice(SRC.indexOf('var RK_LENS_NOTE = {')))[1];
    expect(lensNote).toMatch(/too small/);
    const arcs = (svg) => count(svg, /<path[^>]*d="M[^"]* A[\d.]+,[\d.]+ 0 0,1/g);
    expect(arcs(tile('chalk'))).toBe(0);
    expect(arcs(tile('limestone'))).toBeGreaterThanOrEqual(6);
    // Crinoid discs: an outlined disc with a dot at its centre.
    expect(count(tile('limestone'), /<circle[^>]*r="2\.38"/g)).toBeGreaterThanOrEqual(4);
    expect(count(tile('chalk'), /<circle/g)).toBeGreaterThan(60);
  });

  it('packs conglomerate and breccia with clasts in a sandy matrix', () => {
    expect(count(tile('conglom'), /<ellipse/g)).toBeGreaterThanOrEqual(15);
    expect(count(tile('breccia'), /<polygon/g)).toBeGreaterThanOrEqual(15);
    [tile('conglom'), tile('breccia')].forEach((svg) => expect(count(svg, /<circle/g)).toBeGreaterThanOrEqual(60));
    // Conglomerate's pebbles are rounded, so they catch a highlight; breccia's
    // fragments are not drawn with one.
    expect(tile('conglom')).toContain('stroke="#ffffff"');
  });

  it('draws travertine as bands, not a crystal mosaic', () => {
    const t = tile('travertine');
    expect(count(t, /<path[^>]*d="M0,[^"]*V[\d.]+ H0 Z"/g)).toBe(9);
    expect(count(t, /<polygon/g)).toBe(0);
  });
});

// ── Tiles and the card ─────────────────────────────────────────────────────
describe('rock grid tiles and card', () => {
  it('gives every rock a tile with a bigger specimen, its family colour and its texture', () => {
    const m = render({ mode: 'rocks', collection: { granite: 'drill', slate: 'key' } });
    const TYPE_COLOR = { igneous: '#ef4444', sedimentary: '#f59e0b', metamorphic: '#8b5cf6' };
    ROCKS.forEach((r) => {
      const at = m.indexOf('data-rk-grid-tile="' + r.id + '"');
      expect(at, r.id).toBeGreaterThan(-1);
      const open = m.slice(m.lastIndexOf('<button', at), m.indexOf('>', at));
      expect(open, r.id).toContain('border-top-color:' + TYPE_COLOR[r.type]);
      expect(svgAfter(m, 'data-rk-grid-tile="' + r.id + '"'), r.id).toContain('width="68"');
    });
    expect(count(m, /data-rk-grid-got="/g)).toBe(2);
    expect(m).toContain('data-rk-grid-got="granite"');
    expect(m).toContain('Coarse-grained');
  });

  it('opens the card right under the grid, before the drill and the key', () => {
    const m = render({ mode: 'rocks', selectedRock: 'basalt' });
    const lastTile = m.lastIndexOf('data-rk-grid-tile=');
    const card = m.indexOf('data-rk-rock-card="basalt"');
    // The drill's own region, not the cabinet hint that also names it.
    const drill = m.indexOf('aria-label="Visual rock identification drill"');
    expect(lastTile).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(lastTile);
    expect(drill).toBeGreaterThan(card);
    expect(svgAfter(m, 'data-rk-hero="basalt"')).toContain('width="136"');
  });

  it('draws each empty cabinet slot as the outline of the rock that fills it', () => {
    const empty = render({ mode: 'rocks' });
    const full = render({ mode: 'rocks', collection: { granite: 'drill', shale: 'key', gneiss: 'drill' } });
    ['granite', 'shale', 'gneiss'].forEach((id) => {
      const silD = /<path d="([^"]+)"/.exec(empty.slice(empty.indexOf('data-rk-silhouette="' + id + '"')))[1];
      const slot = full.slice(full.indexOf('data-rk-slot="' + id + '"'));
      const bodyD = /<path d="([^"]+)" fill="#/.exec(slot.slice(slot.indexOf('<svg')))[1];
            expect(silD, id).toBe(bodyD);
    });
    expect(count(empty, /data-rk-silhouette="/g)).toBe(24);
    expect(count(full, /data-rk-silhouette="/g)).toBe(21);
  });
});

// ── The quiz shows what it asks about, and never the answer ────────────────
describe('quiz pictures', () => {
  const questions = [];
  beforeEach(() => {
    if (questions.length) return;
    for (let i = 0; i < 36; i++) {
      const t = tree({ mode: 'quiz', quizIdx: i });
      const pics = findAll(t.node, (n) => n.props && n.props['data-rk-quiz-pic']).map((n) => n.props['data-rk-quiz-pic']);
      const showEl = findAll(t.node, (n) => n.props && n.props['data-rk-quiz-show'])[0];
      const buttons = findAll(t.node, (n) => n.type === 'button' && typeof n.props['aria-label'] === 'string' && n.props['aria-label'].indexOf('Answer ') === 0);
      questions.push({ i, pics, show: showEl ? showEl.props['data-rk-quiz-show'].split(' ') : [], options: buttons.length });
    }
  });

  it('has a picture for every answer that names a specimen, and a progress bar', () => {
    expect(questions.length).toBe(36);
    const withPics = questions.filter((q) => q.pics.length);
    expect(withPics.length).toBeGreaterThanOrEqual(15);
    withPics.forEach((q) => expect(q.pics.length, 'q' + q.i).toBeLessThanOrEqual(q.options));
    expect(render({ mode: 'quiz', quizIdx: 4 })).toContain('data-rk-quiz-progress="5"');
  });

  it('shows the specimens a question is about, never one of its answers', () => {
    const shown = questions.filter((q) => q.show.length);
    expect(shown.length).toBe(12);
    const ids = new Set(ROCKS.map((r) => r.id).concat([...SRC.matchAll(/\{ id: '(\w+)', label: t\('stem\.rocks\./g)].map((x) => x[1])));
    shown.forEach((q) => {
      q.show.forEach((id) => expect(ids.has(id), id).toBe(true));
      q.show.forEach((id) => expect(q.pics, 'q' + q.i + ' shows ' + id + ' as an answer too').not.toContain(id));
    });
  });

  it('keeps the specimen pictures out of the accessible names', () => {
    const t = tree({ mode: 'quiz', quizIdx: 1 });
    findAll(t.node, (n) => n.props && n.props['data-rk-quiz-pic']).forEach((n) => expect(n.props['aria-hidden']).toBe(true));
  });
});

// ── The rock cycle as a network ────────────────────────────────────────────
describe('rock cycle network', () => {
  it('draws an arrow both ways between every pair, coloured by where it ends', () => {
    const m = render({ mode: 'landscape' });
    const COLOR = { sedimentary: '#b45309', metamorphic: '#6d28d9', igneous: '#b91c1c' };
    const fams = Object.keys(COLOR);
    let n = 0;
    fams.forEach((a) => fams.forEach((b) => {
      if (a === b) return;
      const at = m.indexOf('data-rk-cyc-arrow="' + a + '-' + b + '"');
      expect(at, a + '-' + b).toBeGreaterThan(-1);
      expect(m.slice(at, m.indexOf('/>', at)), a + '-' + b).toContain('stroke="' + COLOR[b] + '"');
      n++;
    }));
    expect(n).toBe(6);
    expect(count(m, /data-rk-cyc-arrow="/g)).toBe(6);
    expect(m).not.toContain('The cycle never stops!');
  });

  it('opens a family in the Rocks tab from its node', () => {
    const t = tree({ mode: 'landscape' });
    const node = findAll(t.node, (n) => n.props && n.props['data-rk-cyc-node'] === 'metamorphic')[0];
    expect(node.props.role).toBe('button');
    node.props.onClick();
    expect(t.store.rocks).toMatchObject({ mode: 'rocks', selectedType: 'metamorphic', selectedRock: null });
  });
});
