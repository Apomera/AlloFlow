// Rocks & Minerals, clarity pass (2026-09-23).
//
// The lab results (acid, streak, scratch) were stored once and never cleared,
// so the tool showed one specimen's result under another: quartz's "White"
// streak beside the greenish-black one the plate drew for pyrite, and a
// finished scratch that drew the NEXT mineral's outcome before it was tested.
// Also here: the rock card's acid test (it had no picture and its own copy of
// the fizz list), the key map's pictures, the Mystery tiles, chalk's texture
// words, and the landscape labels growing with the scene.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const ROCK_IDS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '/g)].map((m) => m[1]);
const FIZZ = new Function('return ' + /var RK_KEY_ROCKS_FIZZ = (\{[^}]*\});/.exec(SRC)[1])();

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
const textOf = (n) => (n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : textOf(n.props && n.props.children));
const buttonByText = (t, text) => findAll(t.node, (n) => n.type === 'button' && textOf(n).indexOf(text) !== -1 && typeof n.props.onClick === 'function')[0];

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── A result belongs to the specimen it was run on ─────────────────────────
describe('lab results belong to their specimen', () => {
  it('does not show quartz\'s streak under pyrite', () => {
    const stale = render({ mode: 'minerals', selectedMineral: 'pyrite', labFor: 'm:quartz', streakResult: 'Powder Streak Result: White' });
    expect(stale).not.toContain('Powder Streak Result: White');
    const fresh = render({ mode: 'minerals', selectedMineral: 'pyrite', labFor: 'm:pyrite', streakResult: 'Powder Streak Result: Greenish-black' });
    expect(fresh).toContain('Powder Streak Result: Greenish-black');
    // An old save with no tag at all still shows what it had.
    expect(render({ mode: 'minerals', selectedMineral: 'pyrite', streakResult: 'Powder Streak Result: Greenish-black' })).toContain('Powder Streak Result: Greenish-black');
  });

  it('does not draw a finished scratch on a mineral that was never scratched', () => {
    const base = { mode: 'minerals', selectedMineral: 'calcite', scratchTool: 'diamond_scribe' };
    const untested = render(base);
    const stale = render(Object.assign({ labFor: 'm:quartz', scratchAnimProgress: 100, scratchResult: 'Result: Scratch created!' }, base));
    const fresh = render(Object.assign({ labFor: 'm:calcite', scratchAnimProgress: 100, scratchResult: 'Result: Scratch created!' }, base));
    expect(stale).toBe(untested);
    expect(fresh).not.toBe(untested);
    expect(fresh).toContain('Result: Scratch created!');
  });

  it('clears the other results when a test is run on a new specimen', () => {
    vi.useFakeTimers();
    const t = tree({ mode: 'minerals', selectedMineral: 'quartz', labFor: 'm:pyrite', streakResult: 'old', scratchResult: 'old too', fizzResult: 'old fizz' });
    buttonByText(t, 'Perform Streak Test').props.onClick();
    expect(t.store.rocks).toMatchObject({ labFor: 'm:quartz', streakAnimActive: true, scratchResult: null, fizzResult: null });
    // Same specimen again: nothing else is wiped.
    const t2 = tree({ mode: 'minerals', selectedMineral: 'quartz', labFor: 'm:quartz', scratchResult: 'keep me' });
    buttonByText(t2, 'Perform Streak Test').props.onClick();
    expect(t2.store.rocks.scratchResult).toBe('keep me');
  });
});

// ── The rock card's acid test ──────────────────────────────────────────────
describe('rock acid test', () => {
  it('fizzes for exactly the rocks the identification key says fizz', () => {
    expect(Object.keys(FIZZ).sort()).toEqual(['chalk', 'limestone', 'marble', 'travertine']);
    ROCK_IDS.forEach((id) => {
      const m = render({ mode: 'rocks', selectedRock: id, labFor: 'r:' + id, fizzResult: 'x' });
      expect(m, id).toContain('data-rk-rock-fizz="' + (FIZZ[id] ? 'fizz' : 'none') + '"');
    });
    // The lab no longer keeps its own copy of the list.
    expect(SRC).not.toContain("targetId === 'limestone' || targetId === 'marble'");
  });

  it('draws the test, and forgets another rock\'s result', () => {
    const ready = render({ mode: 'rocks', selectedRock: 'granite' });
    expect(ready).toContain('data-rk-rock-fizz="ready"');
    expect(ready).toContain('A pipette of dilute hydrochloric acid above the specimen');
    expect(render({ mode: 'rocks', selectedRock: 'granite', labFor: 'r:limestone', fizzResult: 'fizz' })).toContain('data-rk-rock-fizz="ready"');
    expect(render({ mode: 'rocks', selectedRock: 'granite', labFor: 'r:granite', fizzResult: 'none' })).toContain('no bubbles, so no carbonate is present');
  });

  it('writes a balanced equation with real subscripts', () => {
    const m = render({ mode: 'rocks', selectedRock: 'limestone', labFor: 'r:limestone', fizzResult: 'fizz' });
    const eq = />([^<]*→[^<]*)<\/p>/.exec(m.slice(m.indexOf('data-rk-fizz-equation')))[1];
    expect(eq).toContain('₃');
    const SUB = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
    const side = (str) => {
      const tally = {};
      str.split(' + ').forEach((term) => {
        const t = term.replace('↑', '').trim();
        const k = /^(\d*)(.*)$/.exec(t);
        const coef = k[1] ? Number(k[1]) : 1;
        for (const a of k[2].matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
          const n = a[2] ? Number([...a[2]].map((c) => SUB[c]).join('')) : 1;
          tally[a[1]] = (tally[a[1]] || 0) + coef * n;
        }
      });
      return tally;
    };
    const [l, r] = eq.split('→');
    expect(side(l)).toEqual(side(r));
    expect(side(l)).toEqual({ Ca: 1, C: 1, O: 3, H: 2, Cl: 2 });
  });
});

// ── The key map, the Mystery tiles, chalk's words ──────────────────────────
describe('catalogue pictures and words', () => {
  it('puts each rock\'s specimen at its leaf of the key map, and the question at each fork', () => {
    const m = render({ mode: 'rocks', rkKeyMap: true, rkKey: { path: [] } });
    const map = m.slice(m.indexOf('data-rk-key-map'), m.indexOf('</svg>', m.lastIndexOf('data-key-map-pic')) + 6);
    const pics = [...map.matchAll(/data-key-map-pic="(\w+)"/g)].map((x) => x[1]);
    expect(pics.length).toBe(26);
    expect(new Set(pics).size).toBe(24);
    ROCK_IDS.forEach((id) => expect(pics, id).toContain(id));
    expect(map).toContain('<title>Look at the whole specimen and through the hand lens. Which describes it best?</title>');
    expect(count(map, /<title>/g)).toBe(11);
  });

  it('gives Mystery Rock the same tiles as the catalogue', () => {
    const m = render({ mode: 'mystery', mystery: { rockId: 'breccia', clues: ['a', 'b', 'c'], cluesShown: 1, revealed: false, solved: false, lastGuess: 'conglom' } });
    expect(count(m, /data-rk-mystery-tile="/g)).toBe(24);
    const at = m.indexOf('data-rk-mystery-tile="conglom"');
    expect(m.slice(at, m.indexOf('</button>', at))).toContain('✗ ');
    expect(m.slice(at, m.indexOf('</button>', at))).toContain('width="68"');
  });

    it('puts the mineral catalogue first and the room of objects after it, as the Rocks tab does', () => {
    const none = render({ mode: 'minerals' });
    expect(none.indexOf('data-mineral-grid')).toBeGreaterThan(-1);
    expect(none.indexOf('data-rk-life=')).toBeGreaterThan(none.indexOf('data-mineral-grid'));
    const picked = render({ mode: 'minerals', selectedMineral: 'quartz' });
    expect(picked.indexOf('data-rk-life=')).toBeGreaterThan(picked.indexOf('data-rk-mineral-hero="quartz"'));
  });

  it('registers every mineral description exactly as the code has it', () => {
    // The registered English wins over the code fallback, so a description
    // edited in the code alone never reaches the screen. Four descriptions
    // gained a habit sentence in the visual pass; this keeps the two in step.
    const S = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.rocks;
    const S_PUB = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.rocks;
    const rows = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    expect(rows.length).toBe(23);
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const desc = new Function("return '" + /desc:\s*'((?:[^'\\]|\\.)*)'/.exec(l)[1] + "'")();
      expect(S['mdesc_' + id], id).toBe(desc);
      expect(S_PUB['mdesc_' + id], id).toBe(desc);
    });
  });

  it('says in words the habit the mineral picture draws, for every mineral that has one', () => {
    const rows = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    let withHabit = 0;
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const habit = (/habit:\s*'(\w+)'/.exec(l) || [])[1];
      const m = render({ mode: 'minerals', selectedMineral: id });
      if (habit) {
        withHabit++;
        expect(m, id).toContain('data-rk-mineral-habit="' + habit + '"');
        expect(m, id).toContain('Grows as: ');
      } else {
        expect(m, id).not.toContain('data-rk-mineral-habit');
        expect(m, id).not.toContain('Grows as: ');
      }
    });
    expect(withHabit).toBe(12);
  });

  it('calls chalk powdery, not shelly, because its fossils cannot be seen', () => {
    const m = render({ mode: 'rocks' });
    const tileText = (id) => { const at = m.indexOf('data-rk-grid-tile="' + id + '"'); return m.slice(at, m.indexOf('</button>', at)); };
    expect(tileText('chalk')).toContain('Powdery (bioclastic)');
    expect(tileText('chalk')).not.toContain('Shelly');
    expect(tileText('limestone')).toContain('Shelly (bioclastic)');
    expect(m).toContain('made of fossils too small to see');
  });
});
const count = (s, re) => (s.match(re) || []).length;

// ── Landscape labels grow with the scene ───────────────────────────────────
describe('landscape label size', () => {
  function fonts(W, H) {
    const store = { rocks: { mode: 'landscape' }, rockCycle: {} };
    const ctx = makeCtx({ toolData: store, setToolData: (f) => Object.assign(store, typeof f === 'function' ? f(store) : f) });
    const node = window.StemLab._registry.rocks.render(ctx);
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const seen = {};
    const state = { font: '' };
    const gradient = { addColorStop() {} };
    const target = {
      measureText: (t) => ({ width: String(t).length * 5 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      fillText: (t) => { seen[String(t)] = state.font; },
    };
    const c2d = new Proxy(target, {
      get(t, p) { if (p in t) return t[p]; if (p === 'roundRect') return undefined; if (typeof p !== 'string') return undefined; return () => undefined; },
      set(t, p, v) { state[p] = v; t[p] = v; return true; },
    });
    ref({
      offsetWidth: W, offsetHeight: H, width: 0, height: 0, isConnected: true, style: {}, dataset: {},
      getContext: () => c2d, addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
    });
    return seen;
  }
  const px = (font) => Number(/([\d.]+)px/.exec(font || '')[1]);

  it('draws the process labels at 9px on a phone and 12px on a wide scene', () => {
    const narrow = fonts(374, 280), wide = fonts(1148, 656);
    ['Cooling', 'Weathering & erosion', 'Melting'].forEach((t) => {
      expect(px(narrow[t]), t + ' narrow').toBeCloseTo(9, 1);
      expect(px(wide[t]), t + ' wide').toBeCloseTo(12, 1);
    });
    expect(px(wide.Igneous)).toBeGreaterThan(px(narrow.Igneous));
  });
});
