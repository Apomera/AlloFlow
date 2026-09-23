// Rocks & Minerals: how sedimentary and metamorphic rocks form (2026-09-22,
// second pass). The igneous cards had a formation model; the other two
// families had only descriptions, although their classifications ARE the
// record of how they formed:
//   - a clastic rock records a JOURNEY: rounding, size, sorting, composition
//   - a metamorphic rock records a SQUEEZE: foliation needs flat minerals AND
//     directed pressure, and forms at right angles to it (not along bedding)
// Also pinned: the mineral card's data values go through the translator, and
// the challenge strip names its goals instead of hiding them in hover titles.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each test renders the whole ~1 MB tool several times: well under a second
// normally, but past the 5 s default when the shared machine is loaded.
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
const S = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.rocks;

function balanced(at, open, close) {
  const start = SRC.indexOf(open, at);
  let depth = 0, inStr = null;
  for (let i = start; i < SRC.length; i++) {
    const ch = SRC[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && SRC[i + 1] === '/') { i = SRC.indexOf('\n', i); continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  throw new Error('unbalanced');
}
function literal(marker, open = '{', close = '}') {
  const at = SRC.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  return new Function('return (' + balanced(at, open, close) + ')')();
}
function fn(name) {
  const at = SRC.indexOf('  function ' + name + '(');
  expect(at, name).toBeGreaterThan(-1);
  return SRC.slice(at, at + (SRC.slice(at).indexOf('{'))) + balanced(at, '{', '}');
}
// The shipped model functions, evaluated from the source.
const M = new Function([
  fn('rkSeed'),
  'var RK_SED_STOPS = ' + JSON.stringify(literal('var RK_SED_STOPS = [', '[', ']')) + ';',
  'var RK_SED_SIZE_ANCHORS = ' + JSON.stringify(literal('var RK_SED_SIZE_ANCHORS = [', '[', ']')) + ';',
  'var RK_SED_CLASS_MM = ' + JSON.stringify(literal('var RK_SED_CLASS_MM = {')) + ';',
  fn('rkSedAt'), fn('rkSedRoundClass'), fn('rkSedSortClass'), fn('rkSedView'), fn('rkFormatMm'), fn('rkMetaOutcome'),
  'return { rkSedAt, rkSedRoundClass, rkSedSortClass, rkSedView, rkFormatMm, rkMetaOutcome, STOPS: RK_SED_STOPS };'
].join('\n'))();
const PRESET = literal('var RK_META_PRESET = {');
const SED_TEXT = literal('var RK_SED_TEXT = {');
const META_TEXT = literal('var RK_META_TEXT = {');
const LUSTER_TERM = literal('var RK_LUSTER_TERM = {');

function mk(rocks) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => { Object.assign(store, typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj); },
  });
  return { store, ctx };
}
function render(rocks) {
  const { store, ctx } = mk(rocks);
  return { store, markup: ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rocks.render(ctx))) };
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
function svgOf(markup, marker) {
  const at = markup.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  const start = markup.lastIndexOf('<svg', at);
  return markup.slice(start, markup.indexOf('</svg>', at) + 6);
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── The journey model ────────────────────────────────────────────────────────
describe('sedimentary journey model', () => {
  const walk = () => Array.from({ length: 101 }, (_, i) => M.rkSedAt(i / 100));

  it('lands each stop on the rock it names', () => {
    expect(M.STOPS.map((s) => s.rock)).toEqual(['breccia', 'conglom', 'sandstone', 'siltstone', 'shale']);
    M.STOPS.forEach((st) => expect(M.rkSedAt(st.at).rock, st.id).toBe(st.rock));
  });

  it('passes through the five clastic rocks once each, in order, cliff to sea', () => {
    const seq = [];
    walk().forEach((s) => { if (seq[seq.length - 1] !== s.rock) seq.push(s.rock); });
    expect(seq).toEqual(['breccia', 'conglom', 'sandstone', 'siltstone', 'shale']);
  });

  it('shrinks the grains downstream and classes them on the Wentworth boundaries', () => {
    const w = walk();
    for (let i = 1; i < w.length; i++) expect(w[i].d50, 't=' + i).toBeLessThan(w[i - 1].d50);
    w.forEach((s) => {
      const want = s.d50 >= 2 ? 'gravel' : s.d50 >= 0.0625 ? 'sand' : s.d50 >= 0.0039 ? 'silt' : 'clay';
      expect(s.cls).toBe(want);
    });
  });

  it('rounds gravel with distance but leaves silt angular: fine grains are cushioned', () => {
    const w = walk();
    const gravel = w.filter((s) => s.cls === 'gravel');
    for (let i = 1; i < gravel.length; i++) expect(gravel[i].round).toBeGreaterThanOrEqual(gravel[i - 1].round);
    expect(M.rkSedRoundClass(M.rkSedAt(0.03))).toBe('angular');
    expect(M.rkSedAt(0.25).round).toBeGreaterThan(0.6);
    w.filter((s) => s.cls === 'silt').forEach((s) => expect(M.rkSedRoundClass(s)).toBe('angular'));
  });

  it('sorts better and gets purer in quartz the further it travels', () => {
    const w = walk();
    for (let i = 1; i < w.length; i++) expect(w[i].sorting).toBeGreaterThanOrEqual(w[i - 1].sorting);
    const nonClay = w.filter((s) => s.cls !== 'clay');
    for (let i = 1; i < nonClay.length; i++) expect(nonClay[i].quartz).toBeGreaterThanOrEqual(nonClay[i - 1].quartz);
    expect(M.rkSedAt(0.52).quartz).toBeGreaterThan(0.8);
  });

  it('prints a field of view derived from the model', () => {
    const s = M.rkSedAt(M.STOPS[2].at);
    const want = M.rkFormatMm(M.rkSedView(s).fovMm);
    const { markup } = render({ mode: 'rocks', selectedRock: 'sandstone' });
    const row = /data-rk-sed-row="view"[\s\S]*?<dd[^>]*>([^<]+)<\/dd>/.exec(markup);
    expect(row[1]).toBe(want);
  });
});

describe('sedimentary sample drawing', () => {
  const pointsPerGrain = (svg) => [...svg.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map((m) => m[1].trim().split(/\s+/).length).sort((a, b) => a - b);
  const median = (xs) => xs[Math.floor(xs.length / 2)];
  const areas = (svg) => [...svg.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map((m) => {
    const p = m[1].trim().split(/\s+/).map((q) => q.split(',').map(Number));
    let a = 0;
    for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; }
    return Math.abs(a) / 2;
  });
  const cv = (xs) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length) / m; };

  it('draws breccia angular and conglomerate rounded (corner-cutting passes)', () => {
    const brec = svgOf(render({ mode: 'rocks', selectedRock: 'breccia' }).markup, 'data-sed-cls=');
    const cong = svgOf(render({ mode: 'rocks', selectedRock: 'conglom' }).markup, 'data-sed-cls=');
    expect(median(pointsPerGrain(brec))).toBeLessThan(10);
    expect(median(pointsPerGrain(cong))).toBeGreaterThanOrEqual(24);
  });

  it('shows sorting: the scree mixes sizes, the river sand is nearly one size', () => {
    const brec = areas(svgOf(render({ mode: 'rocks', selectedRock: 'breccia' }).markup, 'data-sed-cls='));
    const sand = areas(svgOf(render({ mode: 'rocks', selectedRock: 'sandstone' }).markup, 'data-sed-cls='));
    expect(sand.length).toBeGreaterThan(60);
    expect(cv(brec)).toBeGreaterThan(cv(sand) * 2);
  });

  it('settles clay as flat flakes, not grains', () => {
    const svg = svgOf(render({ mode: 'rocks', selectedRock: 'shale' }).markup, 'data-sed-cls=');
    expect(svg).toContain('data-sed-cls="clay"');
    expect(svg).not.toContain('<polygon');
    expect((svg.match(/<rect/g) || []).length).toBeGreaterThan(100);
  });
});

describe('journey panel', () => {
  const CLASTIC = ['breccia', 'conglom', 'sandstone', 'siltstone', 'shale'];
  it('appears on exactly the five clastic rocks, preset to each rock', () => {
    CLASTIC.forEach((id) => expect(render({ mode: 'rocks', selectedRock: id }).markup, id).toContain('data-rk-sed-journey="' + id + '"'));
    ['limestone', 'chalk', 'travertine', 'coal', 'granite', 'slate'].forEach((id) =>
      expect(render({ mode: 'rocks', selectedRock: id }).markup, id).not.toContain('data-rk-sed-journey'));
  });

  it('moves with the stop buttons and names the rock it would become', () => {
    const t = tree({ mode: 'rocks', selectedRock: 'sandstone' });
    const cliff = findAll(t.node, (n) => n.props && n.props['data-rk-sed-stop'] === 'cliff')[0];
    cliff.props.onClick();
    expect(t.store.rocks.sedJourney).toEqual({ t: M.STOPS[0].at, forRock: 'sandstone' });
    const { markup } = render(t.store.rocks);
    expect(markup).toContain('data-rk-sed-journey="breccia"');
    expect(markup).toContain('formed further downstream');
  });

  it('ignores a position saved for another rock, and survives a malformed save', () => {
    expect(render({ mode: 'rocks', selectedRock: 'shale', sedJourney: { t: 0.03, forRock: 'breccia' } }).markup).toContain('data-rk-sed-journey="shale"');
    [['x'], 'x', { t: 'abc', forRock: 'shale' }, { t: Infinity, forRock: 'shale' }].forEach((bad) =>
      expect(render({ mode: 'rocks', selectedRock: 'shale', sedJourney: bad }).markup).toContain('data-rk-sed-journey="shale"'));
  });
});

// ── Squeeze and heat ─────────────────────────────────────────────────────────
describe('metamorphic model', () => {
  const names = (parent, mode) => {
    const out = [];
    for (let g = 0; g <= 1.0001; g += 0.02) {
      const o = M.rkMetaOutcome(parent, mode, g);
      const n = o.rock || o.other;
      if (out[out.length - 1] !== n) out.push(n);
    }
    return out;
  };

  it('walks shale up the grade series under a squeeze', () => {
    expect(names('shale', 'squeeze')).toEqual(['shale', 'slate', 'phyllite', 'schist', 'gneiss', 'migmatite']);
  });

  it('bakes shale into hornfels with heat alone, never a foliated rock', () => {
    expect(names('shale', 'heat')).toEqual(['shale', 'hornfels']);
    for (let g = 0.2; g <= 1; g += 0.1) expect(M.rkMetaOutcome('shale', 'heat', g).fol).toBe('none');
  });

  it('never foliates a rock with no flat minerals, however hard it is squeezed', () => {
    ['squeeze', 'heat'].forEach((mode) => {
      expect(names('limestone', mode)).toEqual(['limestone', 'marble']);
      expect(names('sandstone', mode)).toEqual(['sandstone', 'quartzite']);
      for (let g = 0; g <= 1; g += 0.1) {
        expect(M.rkMetaOutcome('limestone', mode, g).fol).toBe('none');
        expect(M.rkMetaOutcome('sandstone', mode, g).fol).toBe('none');
        expect(M.rkMetaOutcome('limestone', mode, g).align).toBe(0);
      }
    });
    expect(names('granite', 'heat')).toEqual(['granite']);
  });

  it('lines the flakes up only under a squeeze, fully by slate grade', () => {
    expect(M.rkMetaOutcome('shale', 'squeeze', 0.1).align).toBe(0);
    expect(M.rkMetaOutcome('shale', 'squeeze', PRESET.slate[2]).align).toBe(1);
    expect(M.rkMetaOutcome('shale', 'heat', 0.9).align).toBe(0);
  });

  it('makes each metamorphic card show how its own rock forms', () => {
    Object.entries(PRESET).forEach(([id, p]) => {
      expect(M.rkMetaOutcome(p[0], p[1], p[2]).rock, id).toBe(id);
      expect(render({ mode: 'rocks', selectedRock: id }).markup, id).toContain('data-rk-meta-lab="' + id + '"');
    });
  });
});

describe('metamorphic drawing', () => {
  const flakeAngles = (markup) => [...svgOf(markup, 'data-meta-fol=').matchAll(/data-meta-flake="(-?\d+)"/g)].map((m) => Number(m[1]));
  const meanDist = (xs, target) => xs.reduce((s, a) => s + Math.abs(((a - target) % 180 + 270) % 180 - 90), 0) / xs.length;
  const withLab = (card, lab) => render({ mode: 'rocks', selectedRock: card, metaLab: Object.assign({ forRock: card }, lab) }).markup;

  it('rotates shale flakes from flat bedding to 90 degrees from the squeeze', () => {
    const bedding = flakeAngles(withLab('slate', { parent: 'shale', mode: 'squeeze', grade: 0.05 }));
    const slate = flakeAngles(render({ mode: 'rocks', selectedRock: 'slate' }).markup);
    expect(bedding.length).toBeGreaterThan(100);
    expect(meanDist(bedding, 0)).toBeLessThan(12);
    expect(meanDist(slate, 90)).toBeLessThan(12);
  });

  it('leaves baked flakes pointing every which way', () => {
    const baked = flakeAngles(withLab('slate', { parent: 'shale', mode: 'heat', grade: 0.6 }));
    expect(meanDist(baked, 90)).toBeGreaterThan(25);
    expect(meanDist(baked, 0)).toBeGreaterThan(25);
  });

  it('grows garnet at schist grade, not before; draws melt at the top of the scale', () => {
    expect(render({ mode: 'rocks', selectedRock: 'schist' }).markup).toContain('data-meta-garnet');
    expect(render({ mode: 'rocks', selectedRock: 'slate' }).markup).not.toContain('data-meta-garnet');
    expect(withLab('gneiss', { parent: 'shale', mode: 'squeeze', grade: 0.98 })).toContain('data-meta-melt');
  });

  it('has no flakes in marble, and loses the fossils when limestone becomes marble', () => {
    const marble = render({ mode: 'rocks', selectedRock: 'marble' }).markup;
    expect(svgOf(marble, 'data-meta-fol=')).toContain('data-meta-flakes="0"');
    expect(marble).not.toContain('data-meta-fossil');
    expect(withLab('marble', { parent: 'limestone', mode: 'squeeze', grade: 0.05 })).toContain('data-meta-fossil');
  });
});

describe('metamorphic panel', () => {
  it('switches parent and mode through its buttons', () => {
    const t = tree({ mode: 'rocks', selectedRock: 'slate' });
    findAll(t.node, (n) => n.props && n.props['data-rk-meta-mode'] === 'heat')[0].props.onClick();
    expect(t.store.rocks.metaLab).toMatchObject({ parent: 'shale', mode: 'heat', forRock: 'slate' });
    const { markup } = render(t.store.rocks);
    expect(markup).toContain('data-rk-meta-lab="hornfels"');
    expect(markup).toContain('data-rk-meta-reset="slate"');
  });

  it('survives a malformed save and ignores a lab set up for another card', () => {
    expect(render({ mode: 'rocks', selectedRock: 'marble', metaLab: { parent: 'shale', mode: 'squeeze', grade: 0.3, forRock: 'slate' } }).markup).toContain('data-rk-meta-lab="marble"');
    [['x'], 'x', { parent: {}, mode: 7, grade: 'high', forRock: 'marble' }].forEach((bad) =>
      expect(render({ mode: 'rocks', selectedRock: 'marble', metaLab: bad }).markup).toContain('data-rk-meta-lab="marble"'));
  });

  it('does not mention garnet in the key when none is drawn', () => {
    const slate = render({ mode: 'rocks', selectedRock: 'slate' }).markup;
    const schist = render({ mode: 'rocks', selectedRock: 'schist' }).markup;
    expect(slate).not.toContain('Dark red: garnet.');
    expect(schist).toContain('Dark red: garnet.');
  });
});

// ── i18n ─────────────────────────────────────────────────────────────────────
describe('computed keys for the formation models and mineral values', () => {
  it('registers every member of every family with the data English', () => {
    const want = {};
    literal('var RK_SED_STOPS = [', '[', ']').forEach((st) => { want['sed_stop_' + st.id] = st.env; });
    Object.entries(SED_TEXT.cls).forEach(([k, v]) => { want['sed_cls_' + k] = v; });
    Object.entries(SED_TEXT.round).forEach(([k, v]) => { want['sed_round_' + k] = v; });
    Object.entries(SED_TEXT.sort).forEach(([k, v]) => { want['sed_sort_' + k] = v; });
    ['mode', 'fol', 'other', 'change'].forEach((f) => Object.entries(META_TEXT[f]).forEach(([k, v]) => { want['meta_' + f + '_' + k] = v; }));
    Object.entries(META_TEXT.otherWhy).forEach(([k, v]) => { want['meta_why_' + k] = v; });
    Object.entries(LUSTER_TERM).forEach(([k, v]) => { want['luster_term_' + k] = v; });
    expect(Object.keys(want).length).toBeGreaterThan(50);
    const bad = Object.keys(want).filter((k) => S[k] !== want[k]);
    expect(bad, bad.join(', ')).toEqual([]);
  });

  it('covers every luster word the catalogue uses', () => {
    const lusters = [...SRC.slice(SRC.indexOf('const MINERALS = ['), SRC.indexOf('// ── Quiz bank ──')).matchAll(/luster: '([^']+)'/g)].map((m) => m[1]);
    expect(lusters.length).toBe(23);
    lusters.forEach((l) => l.split('/').forEach((w) => expect(LUSTER_TERM, w).toHaveProperty(w.trim().toLowerCase())));
  });
});

describe('mineral card values', () => {
  it('prints luster, streak and crystal system through the translator', () => {
    const mica = render({ mode: 'minerals', selectedMineral: 'mica' }).markup;
    expect(mica).toContain('Pearly / Vitreous');
    expect(mica).toContain('Workbench class: ');
    const calcite = render({ mode: 'minerals', selectedMineral: 'calcite' }).markup;
    expect(calcite).toContain('Trigonal (rhombohedral)');
    expect(render({ mode: 'minerals', selectedMineral: 'diamond' }).markup).toContain('None: harder than the streak plate');
    // The raw data string no longer reaches the card.
    expect(mica).not.toContain('Pearly/Vitreous');
  });
});

describe('challenge strip', () => {
  it('names every goal as text, and marks the ones done', () => {
    const { markup } = render({ mode: 'landscape', completedChallenges: ['quiz_ace'] });
    const chips = [...markup.matchAll(/data-rk-challenge="([a-z_]+)" data-rk-challenge-done="([01])"/g)];
    expect(chips.length).toBe(6);
    expect(chips.find((c) => c[1] === 'quiz_ace')[2]).toBe('1');
    expect(chips.filter((c) => c[2] === '1').length).toBe(1);
    expect(markup).toContain('Earth Science Ace');
    expect(markup).not.toContain('opacity-25 grayscale');
  });
});
