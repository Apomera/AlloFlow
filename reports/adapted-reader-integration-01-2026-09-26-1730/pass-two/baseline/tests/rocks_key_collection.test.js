// Rocks & Minerals, fourth pass (2026-09-23): the identification key, the
// collection cabinet and the drill streak.
//
// The key is only worth teaching if it is TRUE to the tool's own data: a
// branch that says "it fizzes" must lead only to rocks the acid test fizzes
// on, a "the nail barely marks it" branch only to rocks of that hardness.
// Those consistency checks are the heart of this file; the rest pins the
// behaviour (routes, feedback on a wrong turn, collecting, streaks).
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
const KEY = literal('var RK_KEY = {');
const FIZZ = literal('var RK_KEY_ROCKS_FIZZ = {');
const K = new Function('RK_KEY', 'RK_KEY_ROCKS_FIZZ', [
  fn('rkKeyIsNode'), fn('rkKeyLeaves'), fn('rkKeyPaths'), fn('rkKeyDivergence'), fn('rkKeyTest'),
  'return { rkKeyIsNode, rkKeyLeaves, rkKeyPaths, rkKeyDivergence, rkKeyTest };'
].join('\n'))(KEY, FIZZ);
const ROCKS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '(\w+)'.*?hardness: ([\d.]+)/g)]
  .map((m) => ({ id: m[1], type: m[2], hardness: Number(m[3]) }));
const rockById = (id) => ROCKS.find((r) => r.id === id);

function mk(rocks, extra) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx(Object.assign({ toolData: store, setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); } }, extra || {}));
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
const clickProp = (t, prop, value) => {
  const b = findAll(t.node, (n) => n.props && n.props[prop] === value && typeof n.props.onClick === 'function')[0];
  expect(b, prop + '=' + value).toBeTruthy();
  b.props.onClick();
};

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── The key's structure ──────────────────────────────────────────────────────
describe('identification key structure', () => {
  it('reaches all 24 rocks, every branch ending in a node or a real rock', () => {
    expect(ROCKS.length).toBe(24);
    expect(K.rkKeyLeaves('start').sort()).toEqual(ROCKS.map((r) => r.id).sort());
    Object.entries(KEY).forEach(([n, node]) => {
      expect(node.opts.length, n).toBeGreaterThanOrEqual(2);
      node.opts.forEach((o) => expect(K.rkKeyIsNode(o[2]) || !!rockById(o[2]), n + ':' + o[0]).toBe(true));
    });
  });

  it('uses every node, so no question is unreachable', () => {
    const seen = new Set(['start']);
    (function walk(n) { KEY[n].opts.forEach((o) => { if (K.rkKeyIsNode(o[2]) && !seen.has(o[2])) { seen.add(o[2]); walk(o[2]); } }); })('start');
    expect([...seen].sort()).toEqual(Object.keys(KEY).sort());
  });

  it('gives every rock one route, except the two a good key should forgive', () => {
    ROCKS.forEach((r) => {
      const n = K.rkKeyPaths(r.id).length;
      if (r.id === 'limestone' || r.id === 'tuff') expect(n, r.id).toBe(2);
      else expect(n, r.id).toBe(1);
    });
  });
});

// ── The key agrees with the tool's own data ──────────────────────────────────
describe('identification key is true to the data', () => {
  // Branches whose option IS a test result, and what that result must be.
  const TESTED = {
    'xtal:fizz': ['acid', 'fizz'], 'xtal:nofizz': ['acid', 'nofizz'],
    'fine:fizz': ['acid', 'fizz'], 'fine:nofizz': ['acid', 'nofizz'],
    'clast:shells': ['acid', 'fizz'], 'layer:wavy': ['acid', 'fizz'],
    'sheets:soft': ['nail', 'scratch'], 'sheets:hard': ['nail', 'barely'],
    'xtal2:glassy': ['nail', 'noscratch'], 'volc:froth': ['water', 'float']
  };
  it('never routes a rock through a test result it would not give', () => {
    let checked = 0;
    ROCKS.forEach((r) => K.rkKeyPaths(r.id).forEach((path) => path.forEach(([n, o]) => {
      const need = TESTED[n + ':' + o];
      if (!need) return;
      checked++;
      expect(K.rkKeyTest(r, need[0]), r.id + ' at ' + n + ':' + o).toBe(need[1]);
    })));
    expect(checked).toBeGreaterThan(15);
  });

  it('fizzes exactly on the carbonate rocks the acid lab fizzes on', () => {
    // The rock card's acid lab used to list its carbonates inline, so the two
    // could drift apart. It now reads this same table (and every rock's
    // rendered result is checked in rocks_clarity_pass).
    expect(SRC).toContain('var fizzes = !!RK_KEY_ROCKS_FIZZ[selRock.id];');
    expect(SRC).not.toContain("targetId === 'limestone'");
    expect(Object.keys(FIZZ).sort()).toEqual(['chalk', 'limestone', 'marble', 'travertine']);
  });

  it('floats only pumice', () => {
    ROCKS.forEach((r) => expect(K.rkKeyTest(r, 'water'), r.id).toBe(r.id === 'pumice' ? 'float' : 'sink'));
  });
});

// ── Feedback on a wrong turn ─────────────────────────────────────────────────
describe('where a route went wrong', () => {
  it('names a real step and a real alternative for every single wrong turn', () => {
    let cases = 0;
    ROCKS.forEach((target) => {
      K.rkKeyPaths(target.id).forEach((good) => {
        good.forEach(([n, o], i) => {
          KEY[n].opts.filter((alt) => alt[0] !== o).forEach((alt) => {
            const route = good.slice(0, i).concat([[n, alt[0]]]);
            const d = K.rkKeyDivergence(route, target.id);
            // Taking another valid route to the same rock is not a wrong turn.
            if (K.rkKeyPaths(target.id).some((p) => p[i] && p[i][0] === n && p[i][1] === alt[0])) { expect(d).toBeNull(); return; }
            cases++;
            expect(d, target.id + ' ' + n + ':' + alt[0]).toBeTruthy();
            expect(d.step).toBe(i);
            expect(d.node).toBe(n);
            expect(d.fits.length).toBeGreaterThan(0);
            d.fits.forEach((f) => expect(KEY[n].opts.some((x) => x[0] === f)).toBe(true));
          });
        });
      });
    });
    expect(cases).toBeGreaterThan(60);
  });
});

// ── The key in use ───────────────────────────────────────────────────────────
describe('identification key panel', () => {
  const route = (id) => K.rkKeyPaths(id)[0];
  it('keys a specimen out, scores it once and collects it', () => {
    let st = { mode: 'rocks', rkKey: { target: 'granite', path: [], tests: {} } };
    route('granite').forEach(([n, o]) => {
      const t = tree(st);
      clickProp(t, 'data-rk-key-opt', n + ':' + o);
      st = t.store.rocks;
    });
    expect(st.rkKey.scored).toBe(true);
    expect(st.rkKey.stats).toEqual({ tries: 1, right: 1 });
    expect(st.collection).toEqual({ granite: 'key' });
    expect(render(st).markup).toContain('data-rk-key-result="right"');
  });

  it('explains a wrong turn and can step back to it', () => {
    const st = { mode: 'rocks', rkKey: { target: 'diorite', path: [['start', 'crystals'], ['xtal', 'nofizz'], ['xtal2', 'pink']], tests: {}, scored: true } };
    const { markup } = render(st);
    expect(markup).toContain('data-rk-key-result="wrong"');
    expect(markup).toContain('data-rk-key-diverged="xtal2"');
    expect(markup).toContain('like salt and pepper');
    const t = tree(st);
    clickProp(t, 'data-rk-key-retry', 2);
    expect(t.store.rocks.rkKey.path).toEqual([['start', 'crystals'], ['xtal', 'nofizz']]);
  });

  it('runs its tests from the rock data', () => {
    const { markup } = render({ mode: 'rocks', rkKey: { target: 'marble', path: [], tests: { acid: true, nail: true, water: true } } });
    expect(markup).toContain('data-rk-key-test="acid" data-rk-key-test-result="fizz"');
    expect(markup).toContain('data-rk-key-test="nail" data-rk-key-test-result="scratch"');
    expect(markup).toContain('data-rk-key-test="water" data-rk-key-test-result="sink"');
  });

  it('does not name the unknown specimen anywhere a screen reader would read it', () => {
    const { markup } = render({ mode: 'rocks', rkKey: { target: 'chalk', path: [], tests: { lens: true } } });
    const panel = markup.slice(markup.indexOf('id="rk-key-panel"'), markup.indexOf('data-rk-key-candidates'));
    expect(panel).toContain('The unknown specimen through a 10x hand lens');
    expect(panel.toLowerCase()).not.toMatch(/chalk is made|stem\.rocks\.chalk/);
  });

  it('survives a malformed or stale save by replaying only the valid part', () => {
    const bad = [{ target: 'nope', path: 'x' }, { path: [['start', 'bogus']] }, { path: [['layer', 'mica']] }, 'x', ['y']];
    bad.forEach((b) => expect(render({ mode: 'rocks', rkKey: b }).markup).toContain('data-rk-key-node="start"'));
    expect(render({ mode: 'rocks', rkKey: { path: [['start', 'layers'], ['bogus', 'x']] } }).markup).toContain('data-rk-key-node="layer"');
  });

  it('draws the whole key as a map with the route highlighted', () => {
    const { markup } = render({ mode: 'rocks', rkKeyMap: true, rkKey: { path: route('slate') } });
    expect(markup).toContain('data-key-map-rows="26"');
    expect((markup.match(/data-key-edge-hot="1"/g) || []).length).toBe(route('slate').length);
  });
});

// ── Drill streak and collecting ──────────────────────────────────────────────
describe('Visual ID drill streak and collection', () => {
  const vid = (extra) => Object.assign({ rockId: 'granite', options: ['granite', 'diorite', 'gabbro', 'shale'], answered: false, chosen: null, score: 2, asked: 3, streak: 2, best: 3 }, extra);
  const answer = (st, id) => {
    const t = tree(st);
    const b = findAll(t.node, (n) => n.type === 'button' && n.key === id && n.props.disabled === false)[0];
    expect(b, id).toBeTruthy();
    b.props.onClick();
    return t.store.rocks;
  };
  it('counts a streak, keeps the best, and collects a right answer', () => {
    const right = answer({ mode: 'rocks', visualId: vid() }, 'granite');
    expect(right.visualId).toMatchObject({ streak: 3, best: 3, score: 3 });
    expect(right.collection).toEqual({ granite: 'drill' });
    const wrong = answer({ mode: 'rocks', visualId: vid({ streak: 3, best: 3 }) }, 'diorite');
    expect(wrong.visualId).toMatchObject({ streak: 0, best: 3 });
    expect(wrong.collection).toBeUndefined();
  });

  it('offers to key a missed specimen out', () => {
    const t = tree({ mode: 'rocks', visualId: vid({ answered: true, chosen: 'diorite' }) });
    clickProp(t, 'data-rk-drill-to-key', 'granite');
    expect(t.store.rocks.rkKey).toMatchObject({ target: 'granite', path: [] });
  });

  it('collects a solved Mystery Rock', () => {
    const t = tree({ mode: 'mystery', mystery: { rockId: 'basalt', clues: ['a', 'b', 'c'], cluesShown: 1, revealed: false, solved: false } });
    const b = findAll(t.node, (n) => n.type === 'button' && n.key === 'basalt' && typeof n.props.onClick === 'function')[0];
    b.props.onClick();
    expect(t.store.rocks.collection).toEqual({ basalt: 'mystery' });
  });
});

describe('collection cabinet', () => {
  it('shows each shelf, marks a complete one, and opens a collected rock', () => {
    const col = {};
    ROCKS.filter((r) => r.type === 'metamorphic').forEach((r) => { col[r.id] = 'drill'; });
    col.granite = 'key';
    const st = { mode: 'rocks', collection: col };
    const { markup } = render(st);
    expect(markup).toContain('data-rk-cabinet="7"');
    expect(markup).toContain('data-rk-shelf="metamorphic" data-rk-shelf-full="1"');
    expect(markup).toContain('data-rk-shelf="igneous" data-rk-shelf-full="0"');
    expect((markup.match(/data-rk-slot-via="none"/g) || []).length).toBe(17);
    const t = tree(st);
    clickProp(t, 'data-rk-slot', 'granite');
    expect(t.store.rocks.selectedRock).toBe('granite');
  });

  it('treats a malformed collection as empty', () => {
    [['granite'], 'granite', 7].forEach((bad) => expect(render({ mode: 'rocks', collection: bad }).markup).toContain('data-rk-cabinet="0"'));
  });
});

describe('computed keys for the identification key', () => {
  it('registers every question and option', () => {
    const want = {};
    Object.entries(KEY).forEach(([n, node]) => { want['key_q_' + n] = node.q; node.opts.forEach((o) => { want['key_opt_' + n + '_' + o[0]] = o[1]; }); });
    expect(Object.keys(want).length).toBeGreaterThan(40);
    const bad = Object.keys(want).filter((k) => S[k] !== want[k]);
    expect(bad, bad.join(', ')).toEqual([]);
  });
});
