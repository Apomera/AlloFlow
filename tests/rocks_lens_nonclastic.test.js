// Rocks & Minerals, third pass (2026-09-22):
//   - a 10x hand lens on every rock card, the instrument a student actually
//     holds, between the specimen and the 30 micrometre thin section
//   - formation models for the four sedimentary rocks that are NOT made of
//     transported grains: coal by burial rank, and limestone / chalk /
//     travertine by what made their calcite
// Each block pins the thing the picture or number claims, read off the
// shipped tables and functions rather than a copy.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each test renders the whole ~1 MB tool: well under a second normally,
// but past the 5 s default when the shared machine is loaded.
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
  return SRC.slice(at, at + SRC.slice(at).indexOf('{')) + balanced(at, '{', '}');
}
const COAL_RANKS = literal('var RK_COAL_RANKS = [', '[', ']');
const M = new Function([
  'var RK_COAL_RANKS = ' + JSON.stringify(COAL_RANKS) + ';',
  fn('rkCoalAt'), fn('rkFormatMm'),
  'return { rkCoalAt, rkFormatMm };'
].join('\n'))();
const LENS_STYLE = literal('var RK_LENS_STYLE = {');
const LENS_NOTE = literal('var RK_LENS_NOTE = {');
const CARB = literal('var RK_CARB_ENVS = [', '[', ']');
const THIN = literal('var RK_THIN_SECTION = {');
const ROCK_IDS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '(\w+)'/g)].map((m) => m[1]);

function mk(rocks) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx({ toolData: store, setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); } });
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
function lensOf(id) {
  const { markup } = render({ mode: 'rocks', selectedRock: id });
  const at = markup.indexOf('data-rk-lens=');
  expect(at, id).toBeGreaterThan(-1);
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

// ── The hand lens ────────────────────────────────────────────────────────────
describe('hand lens', () => {
  it('has a drawing style and a "what to look for" note for every rock', () => {
    expect(ROCK_IDS.length).toBe(24);
    expect(Object.keys(LENS_STYLE).sort()).toEqual(ROCK_IDS.slice().sort());
    expect(Object.keys(LENS_NOTE).sort()).toEqual(ROCK_IDS.slice().sort());
  });

  it('appears on every rock card, above the thin section', () => {
    ROCK_IDS.forEach((id) => {
      const { markup } = render({ mode: 'rocks', selectedRock: id });
      const lens = markup.indexOf('data-rk-lens-panel="' + id + '"');
      expect(lens, id).toBeGreaterThan(-1);
      const thin = markup.indexOf('Thin section — polarizing microscope');
      if (thin > -1) expect(lens, id + ' lens before thin section').toBeLessThan(thin);
    });
  });

  it('draws a 1 mm scale bar derived from the 15 mm field', () => {
    const svg = lensOf('granite');
    const bar = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="3" fill="#ffffff"/.exec(svg);
    expect(bar).toBeTruthy();
    expect(Number(bar[2])).toBeCloseTo(192 / 15, 5);
  });

  it('draws sand at its real size: 0.3 mm grains in a 15 mm field', () => {
    const r = [...lensOf('sandstone').matchAll(/<circle[^>]*r="([\d.]+)"[^>]*stroke="rgba\(60,50,40,0.45\)"/g)].map((m) => Number(m[1]));
    expect(r.length).toBeGreaterThan(500);
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    const want = 0.3 * (192 / 15) / 2;
    expect(Math.abs(mean - want) / want).toBeLessThan(0.2);
  });

  it('shows each rock the evidence its note promises', () => {
    expect(lensOf('limestone')).toContain('data-lens-fossil="shell"');
    expect(lensOf('limestone')).toContain('data-lens-fossil="crinoid"');
    // Chalk IS fossils, but too small for a lens: none may be drawn.
    expect(lensOf('chalk')).not.toContain('data-lens-fossil');
    expect(lensOf('travertine')).toContain('data-lens-pore');
    expect(lensOf('travertine')).not.toContain('data-lens-fossil');
    expect(lensOf('slate')).toContain('data-lens-pyrite');
    expect(lensOf('schist')).toContain('data-lens-garnet');
    expect(lensOf('breccia')).toContain('data-lens-clast="angular"');
    expect(lensOf('conglom')).toContain('data-lens-clast="rounded"');
    expect(lensOf('andesite')).toContain('data-lens-pheno');
    expect(lensOf('tuff')).toContain('data-lens-shard');
    const coal = lensOf('coal');
    expect(coal).toContain('data-lens-band="bright"');
    expect(coal).toContain('data-lens-band="dull"');
    expect(lensOf('marble')).toContain('data-lens-glint');
  });

  it('keeps granite mostly pale: dark mica is the minority', () => {
    const fills = [...lensOf('granite').matchAll(/<polygon[^>]*fill="(#[0-9a-f]{6})"[^>]*stroke="rgba\(20,20,25,0.55\)"/g)].map((m) => m[1]);
    expect(fills.length).toBe(25);
    const dark = fills.filter((f) => f === '#1e1e1e').length;
    expect(dark / fills.length).toBeLessThan(0.25);
  });

  it('puts the lens on a ladder of scales, with the thin-section field derived from its magnification', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'granite' });
    ['specimen', 'lens', 'thin', 'atoms'].forEach((s) => expect(markup).toContain('data-rk-scale-step="' + s + '"'));
    expect(markup).toMatch(/data-rk-scale-step="lens" aria-current="step"/);
    expect(markup).toContain('about ' + M.rkFormatMm(200 / THIN.granite.mag) + ' across');
  });
});

// ── Coal ─────────────────────────────────────────────────────────────────────
describe('coal rank model', () => {
  it('runs peat, lignite, bituminous, anthracite, then graphite, in order of burial', () => {
    expect(COAL_RANKS.map((r) => r.id)).toEqual(['peat', 'lignite', 'bituminous', 'anthracite']);
    const seq = [];
    for (let t = 0; t <= 1.0001; t += 0.01) { const c = M.rkCoalAt(t); const n = c.graphite ? 'graphite' : c.rank.id; if (seq[seq.length - 1] !== n) seq.push(n); }
    expect(seq).toEqual(['peat', 'lignite', 'bituminous', 'anthracite', 'graphite']);
  });

  it('gains carbon and loses water with rank, and burns hotter per kilogram', () => {
    for (let i = 1; i < COAL_RANKS.length; i++) {
      expect(COAL_RANKS[i].carbon[0]).toBeGreaterThan(COAL_RANKS[i - 1].carbon[0]);
      expect(COAL_RANKS[i].water[1]).toBeLessThan(COAL_RANKS[i - 1].water[1]);
      expect(COAL_RANKS[i].energy[1]).toBeGreaterThanOrEqual(COAL_RANKS[i - 1].energy[1]);
      COAL_RANKS[i].carbon.concat(COAL_RANKS[i].water).forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); });
    }
  });

  it('compacts about ten to one, never growing back', () => {
    let prev = 2;
    for (let t = 0; t <= 1.0001; t += 0.05) { const th = M.rkCoalAt(t).thickness; expect(th).toBeLessThanOrEqual(prev); prev = th; }
    expect(M.rkCoalAt(0).thickness).toBe(1);
    expect(M.rkCoalAt(0.62).thickness).toBeCloseTo(0.1, 5);
  });

  it('prints the carbon dioxide figure the chemistry gives', () => {
    // C (12) + O2 -> CO2 (44): 44/12 kg of CO2 per kg of carbon.
    expect(Math.round((44 / 12) * 10) / 10).toBe(3.7);
    expect(render({ mode: 'rocks', selectedRock: 'coal' }).markup).toContain('about 3.7 kilograms of CO2');
  });

  it('shows the readouts of the rank it is on, and only on the coal card', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'coal' });
    expect(markup).toContain('data-rk-coal-lab="bituminous"');
    const bit = COAL_RANKS[2];
    expect(markup).toContain(bit.carbon[0] + '–' + bit.carbon[1] + '%');
    ['limestone', 'shale', 'granite'].forEach((id) => expect(render({ mode: 'rocks', selectedRock: id }).markup).not.toContain('data-rk-coal-lab'));
  });

  it('moves with its rank buttons, reaches graphite at the end, and survives a bad save', () => {
    const t = tree({ mode: 'rocks', selectedRock: 'coal' });
    findAll(t.node, (n) => n.props && n.props['data-rk-coal-rank'] === 'peat')[0].props.onClick();
    expect(render(t.store.rocks).markup).toContain('data-rk-coal-lab="peat"');
    expect(render({ mode: 'rocks', selectedRock: 'coal', coalLab: { t: 1 } }).markup).toContain('data-rk-coal-graphite');
    ['x', ['y'], { t: 'deep' }, { t: -Infinity }].forEach((bad) =>
      expect(render({ mode: 'rocks', selectedRock: 'coal', coalLab: bad }).markup).toContain('data-rk-coal-lab='));
  });
});

// ── Limestone, chalk, travertine ─────────────────────────────────────────────
describe('who made the calcite', () => {
  it('maps the three environments onto the three carbonate rocks', () => {
    expect(CARB.map((e) => e.id + ':' + e.rock)).toEqual(['reef:limestone', 'ocean:chalk', 'spring:travertine']);
    CARB.forEach((e) => expect(render({ mode: 'rocks', selectedRock: e.rock }).markup, e.rock).toContain('data-rk-carb-lab="' + e.id + '"'));
    ['sandstone', 'coal', 'marble'].forEach((id) => expect(render({ mode: 'rocks', selectedRock: id }).markup).not.toContain('data-rk-carb-lab'));
  });

  it('draws each maker: shell fragments, falling plankton plates, escaping CO2', () => {
    const scene = (rock) => render({ mode: 'rocks', selectedRock: rock }).markup;
    expect(scene('limestone')).toContain('data-carb-fragment');
    const ocean = scene('chalk');
    expect(ocean).toContain('data-carb-plate');
    expect(ocean).toContain('data-carb-snow');
    expect(scene('travertine')).toContain('data-carb-co2');
  });

  it('prints a balanced equation', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'limestone' });
    const eq = /Ca²⁺ \+ 2 HCO₃⁻ → CaCO₃ \+ CO₂ \+ H₂O/.exec(markup);
    expect(eq).toBeTruthy();
    const sub = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4 };
    function side(txt) {
      const count = {}, charge = { v: 0 };
      txt.split(' + ').forEach((term) => {
        const m = /^(\d+) (.*)$/.exec(term.trim());
        const k = m ? Number(m[1]) : 1, f = m ? m[2] : term.trim();
        if (/²⁺$/.test(f)) charge.v += 2 * k;
        if (/⁻$/.test(f)) charge.v -= k;
        const body = f.replace(/[²⁺⁻]/g, '');
        for (const el of body.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
          const n = el[2] ? Number([...el[2]].map((c) => sub[c]).join('')) : 1;
          count[el[1]] = (count[el[1]] || 0) + n * k;
        }
      });
      return { count, charge: charge.v };
    }
    const [l, r] = 'Ca²⁺ + 2 HCO₃⁻ → CaCO₃ + CO₂ + H₂O'.split(' → ').map(side);
    expect(l.count).toEqual(r.count);
    expect(l.charge).toBe(r.charge);
  });

  it('switches environment through its buttons and ignores a save for another card', () => {
    const t = tree({ mode: 'rocks', selectedRock: 'limestone' });
    findAll(t.node, (n) => n.props && n.props['data-rk-carb-env'] === 'spring')[0].props.onClick();
    expect(t.store.rocks.carbLab).toEqual({ env: 'spring', forRock: 'limestone' });
    expect(render(t.store.rocks).markup).toContain('data-rk-carb-lab="spring"');
    expect(render({ mode: 'rocks', selectedRock: 'chalk', carbLab: { env: 'spring', forRock: 'limestone' } }).markup).toContain('data-rk-carb-lab="ocean"');
    expect(render({ mode: 'rocks', selectedRock: 'chalk', carbLab: 'x' }).markup).toContain('data-rk-carb-lab="ocean"');
  });
});

// ── i18n ─────────────────────────────────────────────────────────────────────
describe('computed keys for the lens and the non-clastic models', () => {
  it('registers every member with the data English', () => {
    const want = {};
    Object.entries(LENS_NOTE).forEach(([k, v]) => { want['lens_note_' + k] = v; });
    COAL_RANKS.forEach((r) => { want['coal_name_' + r.id] = r.name; want['coal_look_' + r.id] = r.look; });
    CARB.forEach((e) => ['name', 'maker', 'needs', 'keeps'].forEach((f) => { want['carb_' + f + '_' + e.id] = e[f]; }));
    expect(Object.keys(want).length).toBe(24 + 8 + 12);
    const bad = Object.keys(want).filter((k) => S[k] !== want[k]);
    expect(bad, bad.join(', ')).toEqual([]);
  });
});
