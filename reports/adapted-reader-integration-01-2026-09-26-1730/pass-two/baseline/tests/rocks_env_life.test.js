// Rocks & Minerals, fifth pass (2026-09-23): "Where did it form?", "Minerals
// in your life", the igneous rock chart and the hand lens drill.
//
// Both new activities grade the student, so the answer each one accepts has
// to come from the tool's own model: a rock's place of formation must agree
// with the sediment journey, the carbonate factories and the squeeze
// simulator, and a scavenger-hunt answer must follow from the mineral data.
// The hunt's answer key below is written out by hand on purpose: it is the
// independent check that the predicates in the tool pick the right objects.
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
const S_PUB = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.rocks;

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
  return new Function('t', 'return (' + balanced(at, open, close) + ')')((k) => k);
}
function fn(name) {
  const at = SRC.indexOf('  function ' + name + '(');
  expect(at, name).toBeGreaterThan(-1);
  return SRC.slice(at, at + SRC.slice(at).indexOf('{')) + balanced(at, '{', '}');
}
const ENVS = literal('var RK_ENVS = [', '[', ']');
const ENV_OF = literal('var RK_ENV_OF = {');
const SED = literal('var RK_SED_STOPS = [', '[', ']');
const CARB = literal('var RK_CARB_ENVS = [', '[', ']');
const META = literal('var RK_META_PRESET = {');
const LIFE = literal('var RK_LIFE_ITEMS = [', '[', ']');
const HUNT = literal('var RK_LIFE_HUNT = [', '[', ']');
const BOX = literal('var RK_LIFE_BOX = {');
const MINERALS = literal('const MINERALS = [', '[', ']');
const hitBox = new Function('RK_LIFE_BOX', fn('rkLifeHitBox') + '\nreturn rkLifeHitBox;')(BOX);
const envScene = new Function('RK_ENVS', fn('rkEnvSceneSvg') + '\nreturn rkEnvSceneSvg;')(ENVS);
const ROCKS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '(\w+)'[^\n]*?texture: '([^']+)'/g)]
  .map((m) => ({ id: m[1], type: m[2], texture: m[3] }));

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
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}
const byProp = (t, prop, value) => findAll(t.node, (n) => n.props && n.props[prop] === value);
const clickProp = (t, prop, value) => {
  const b = findAll(t.node, (n) => n.props && n.props[prop] === value && typeof n.props.onClick === 'function')[0];
  expect(b, prop + '=' + value).toBeTruthy();
  b.props.onClick();
};
const intersects = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── Where did it form? The mapping agrees with the rest of the tool ────────
describe('place of formation is true to the tool', () => {
  it('gives each of the 24 rocks exactly one real place, and uses every place', () => {
    expect(ROCKS.length).toBe(24);
    expect(Object.keys(ENV_OF).sort()).toEqual(ROCKS.map((r) => r.id).sort());
    const ids = ENVS.map((e) => e.id);
    Object.entries(ENV_OF).forEach(([rock, env]) => expect(ids, rock).toContain(env));
    ids.forEach((id) => expect(Object.values(ENV_OF), id).toContain(id));
  });

  it('agrees with the sediment journey', () => {
    // Each journey stop's setting, in the scene's vocabulary.
    const STOP = { cliff: 'slope', stream: 'slope', river: 'river', delta: 'river', sea: 'deep' };
    expect(SED.map((s) => s.id).sort()).toEqual(Object.keys(STOP).sort());
    SED.forEach((s) => expect(ENV_OF[s.rock], s.rock + ' at ' + s.id).toBe(STOP[s.id]));
  });

  it('agrees with the three carbonate factories', () => {
    const FACTORY = { reef: 'reef', ocean: 'deep', spring: 'spring' };
    expect(CARB.map((c) => c.id).sort()).toEqual(Object.keys(FACTORY).sort());
    CARB.forEach((c) => expect(ENV_OF[c.rock], c.rock).toBe(FACTORY[c.id]));
  });

  it('puts every metamorphic rock, and every squeeze preset, in the mountain root', () => {
    ROCKS.filter((r) => r.type === 'metamorphic').forEach((r) => expect(ENV_OF[r.id], r.id).toBe('root'));
    Object.keys(META).forEach((id) => expect(ENV_OF[id], id).toBe('root'));
    expect(ROCKS.filter((r) => r.type === 'metamorphic').length).toBe(6);
  });

  it('sends coarse-grained igneous rocks underground and the rest to the volcano', () => {
    const ig = ROCKS.filter((r) => r.type === 'igneous');
    expect(ig.length).toBe(9);
    ig.forEach((r) => expect(ENV_OF[r.id], r.id + ' (' + r.texture + ')').toBe(r.texture === 'coarse-grained' ? 'chamber' : 'volcano'));
  });
});

// ── Where did it form? The picture ─────────────────────────────────────────
describe('landscape zones and pins', () => {
  const h = (type, props, ...kids) => ({ type, props: props || {}, kids: kids.flat() });
  const walk = (n, acc = []) => { if (n && typeof n === 'object') { acc.push(n); (n.kids || []).forEach((k) => walk(k, acc)); } return acc; };

  it('keeps every zone inside the picture and apart from the others', () => {
    ENVS.forEach((e) => {
      const z = e.zone;
      expect(z[0] >= 0 && z[1] >= 0 && z[0] + z[2] <= 480 && z[1] + z[3] <= 250, e.id).toBe(true);
    });
    ENVS.forEach((a, i) => ENVS.slice(i + 1).forEach((b) => expect(intersects(a.zone, b.zone), a.id + ' / ' + b.id).toBe(false)));
  });

  it('fits a pin for every rock of a place inside it, clear of its number badge', () => {
    const count = {};
    const pins = Object.entries(ENV_OF).map(([rock, env]) => { count[env] = (count[env] || 0) + 1; return [rock, env, count[env] - 1, 'swatch']; });
    const nodes = walk(envScene(h, { pins, marks: {} }));
    const drawn = nodes.filter((n) => n.props['data-rk-env-pin']);
    expect(drawn.length).toBe(24);
    drawn.forEach((p) => {
      const env = ENVS.find((e) => e.id === ENV_OF[p.props['data-rk-env-pin']]);
      const z = env.zone, r = [p.props.x, p.props.y, p.props.width, p.props.height];
      expect(r[0] >= z[0] && r[1] >= z[1] && r[0] + r[2] <= z[0] + z[2] && r[1] + r[3] <= z[1] + z[3], p.props['data-rk-env-pin'] + ' in ' + env.id).toBe(true);
      const badge = [z[0] + z[2] - 3 - 7.5, z[1] + 3 - 7.5, 15, 15];
      expect(intersects(r, badge), p.props['data-rk-env-pin'] + ' vs badge').toBe(false);
    });
    // No two pins overlap.
    drawn.forEach((a, i) => drawn.slice(i + 1).forEach((b) => expect(intersects([a.props.x, a.props.y, 20, 20], [b.props.x, b.props.y, 20, 20]), a.props['data-rk-env-pin'] + '/' + b.props['data-rk-env-pin']).toBe(false)));
  });

  it('numbers the zones in the same order as the list', () => {
    const nodes = walk(envScene(h, { onPick: () => {} }));
    const zones = nodes.filter((n) => n.props['data-rk-env-zone']);
    expect(zones.map((z) => z.props['data-rk-env-zone'])).toEqual(ENVS.map((e) => e.id));
    zones.forEach((z, i) => expect(walk(z).filter((n) => n.type === 'text').map((n) => n.kids.join(''))).toEqual([String(i + 1)]));
    zones.forEach((z) => { expect(z.props.role).toBe('button'); expect(z.props.tabIndex).toBe(0); });
  });
});

// ── Where did it form? The game ────────────────────────────────────────────
describe('Where did it form? game', () => {
  const Q = ['granite', 'shale', 'coal', 'travertine', 'slate', 'basalt', 'sandstone', 'limestone'];
  const eg = (extra) => Object.assign({ queue: Q, idx: 0, placed: {}, misses: {} }, extra);

  it('deals eight different rocks', () => {
    const t = tree({ mode: 'landscape' });
    clickProp(t, 'data-rk-env-start', '1');
    const g = t.store.rocks.envGame;
    expect(g.queue.length).toBe(8);
    expect(new Set(g.queue).size).toBe(8);
    g.queue.forEach((id) => expect(ENV_OF[id], id).toBeTruthy());
    expect(g).toMatchObject({ idx: 0, placed: {}, misses: {} });
  });

  it('places a right answer, scores it and pins it', () => {
    const t = tree({ mode: 'landscape', envGame: eg() });
    clickProp(t, 'data-rk-env-pick', 'chamber');
    expect(t.store.rocks.envGame).toMatchObject({ idx: 0, placed: { granite: 'chamber' }, misses: {} });
    const m = render({ mode: 'landscape', envGame: t.store.rocks.envGame });
    expect(m).toContain('data-rk-env-feedback="right"');
    expect(m).toContain('data-rk-env-score="1/8"');
    expect(m).toContain('data-rk-env-zone="chamber" data-rk-env-mark="right"');
    expect(m).toContain('data-rk-env-pin="granite"');
  });

  it('records a miss, marks both places and still pins the rock where it really formed', () => {
    const t = tree({ mode: 'landscape', envGame: eg() });
    clickProp(t, 'data-rk-env-pick', 'volcano');
    expect(t.store.rocks.envGame).toMatchObject({ placed: { granite: 'chamber' }, misses: { granite: 'volcano' } });
    const m = render({ mode: 'landscape', envGame: t.store.rocks.envGame });
    expect(m).toContain('data-rk-env-feedback="wrong"');
    expect(m).toContain('data-rk-env-score="0/8"');
    expect(m).toContain('data-rk-env-zone="chamber" data-rk-env-mark="answer"');
    expect(m).toContain('data-rk-env-zone="volcano" data-rk-env-mark="wrong"');
    expect(m).toContain('cooled deep underground');
  });

  it('lets the picture answer too, and locks both paths once answered', () => {
    const t = tree({ mode: 'landscape', envGame: eg() });
    clickProp(t, 'data-rk-env-zone', 'chamber');
    expect(t.store.rocks.envGame.placed).toEqual({ granite: 'chamber' });
    const after = tree({ mode: 'landscape', envGame: t.store.rocks.envGame });
    expect(byProp(after, 'data-rk-env-pick', 'volcano').length).toBe(0);
    byProp(after, 'data-rk-env-zone', 'volcano').forEach((z) => expect(z.props.onClick).toBeUndefined());
  });

  it('moves on, then summarises the round with its score', () => {
    const placed = {}; Q.forEach((id) => { placed[id] = ENV_OF[id]; });
    const misses = { shale: 'river', slate: 'deep' };
    const t = tree({ mode: 'landscape', envGame: eg({ idx: 7, placed, misses }) });
    clickProp(t, 'data-rk-env-next', '1');
    expect(t.store.rocks.envGame.idx).toBe(8);
    const m = render({ mode: 'landscape', envGame: t.store.rocks.envGame });
    expect(m).toContain('data-rk-env-game="done"');
    expect(m).toContain('data-rk-env-summary="6"');
  });

  it('survives hostile saved state', () => {
    const bad = ['x', 7, [], { queue: 'x' }, { queue: ['bogus', 'granite'], idx: -4 }, { queue: ['granite'], idx: 99 },
      { queue: Q, placed: [], misses: 'x' }, { queue: Q, idx: NaN }, { queue: Q, placed: { granite: 'bogus' } }, { queue: [null, {}, 'granite'] }];
    bad.forEach((b) => expect(() => render({ mode: 'landscape', envGame: b }), JSON.stringify(b)).not.toThrow());
    expect(render({ mode: 'landscape', envGame: { queue: ['bogus', 'granite'], idx: -4 } })).toContain('data-rk-env-current="granite"');
  });
});

// ── Minerals in your life: data and picture ────────────────────────────────
describe('Minerals in your life: objects', () => {
  it('ties every object to a real mineral, with a drawn box inside the picture', () => {
    expect(LIFE.length).toBe(16);
    LIFE.forEach((it) => {
      expect(MINERALS.some((m) => m.id === it.mineral), it.id).toBe(true);
      expect(BOX[it.id], it.id).toBeTruthy();
      const hb = hitBox(it.id), x = it.pos[0] + hb[0], y = it.pos[1] + hb[1];
      expect(x >= 0 && y >= 0 && x + hb[2] <= 480 && y + hb[3] <= 260, it.id).toBe(true);
    });
    expect(Object.keys(BOX).sort()).toEqual(LIFE.map((it) => it.id).sort());
  });

  it('gives each object a tap target of its own, at least 30 tall', () => {
    const rects = LIFE.map((it) => { const hb = hitBox(it.id); return [it.id, [it.pos[0] + hb[0], it.pos[1] + hb[1], hb[2], hb[3]]]; });
    rects.forEach(([id, r]) => expect(r[3], id).toBeGreaterThanOrEqual(30));
    rects.forEach(([a, ra], i) => rects.slice(i + 1).forEach(([b, rb]) => expect(intersects(ra, rb), a + ' / ' + b).toBe(false)));
  });

  it('keeps the drawings out of the tab order and names every object in a button', () => {
    const t = tree({ mode: 'minerals' });
    const items = findAll(t.node, (n) => n.props && n.props['data-rk-life-item']);
    expect(items.length).toBe(16);
    items.forEach((n) => { expect(n.props.tabIndex).toBeUndefined(); expect(n.props.role).toBeUndefined(); });
    const chips = findAll(t.node, (n) => n.type === 'button' && n.props['data-rk-life-chip']);
    expect(chips.map((c) => c.props['data-rk-life-chip'])).toEqual(LIFE.map((it) => it.id));
    chips.forEach((c, i) => expect(textOf(c)).toContain(LIFE[i].name));
  });

  it('explores: picks an object, shows its mineral, and counts it once', () => {
    const t = tree({ mode: 'minerals', lifeSeen: ['salt'] });
    clickProp(t, 'data-rk-life-chip', 'pencil');
    expect(t.store.rocks.lifeSel).toBe('pencil');
    expect(t.store.rocks.lifeSeen).toEqual(['salt', 'pencil']);
    const again = tree({ mode: 'minerals', lifeSel: 'pencil', lifeSeen: ['salt', 'pencil'] });
    clickProp(again, 'data-rk-life-chip', 'pencil');
    expect(again.store.rocks.lifeSeen).toEqual(['salt', 'pencil']);
    const m = render({ mode: 'minerals', lifeSel: 'pencil', lifeSeen: ['salt', 'pencil', 'bogus', 'salt'] });
    expect(m).toContain('data-rk-life-card="pencil"');
    expect(m).toContain('data-rk-life-mineral="graphite"');
    expect(m).toContain('data-rk-life-seen="2"');
    expect(m).toContain('data-rk-life-item="pencil" data-rk-life-sel="1"');
  });

  it('opens the mineral card from the object card', () => {
    const t = tree({ mode: 'minerals', lifeSel: 'ring' });
    clickProp(t, 'data-rk-life-mineral', 'diamond');
    expect(t.store.rocks.selectedMineral).toBe('diamond');
  });
});

// ── Minerals in your life: the scavenger hunt ──────────────────────────────
describe('Minerals in your life: scavenger hunt', () => {
  // The answer key, from geology rather than from the tool's predicates.
  const KEY = {
    softest: ['powder'],
    hardest: ['ring'],
    fizz: ['antacid'],
    sheets: ['wall', 'powder', 'makeup', 'pencil', 'battery'],
    element: ['matches', 'pencil', 'battery', 'ring'],
    iron: ['pan'],
    salt: ['salt', 'wall']
  };
  const tryItem = (i, item) => {
    const t = tree({ mode: 'minerals', lifeHunt: { i, tries: 0, first: 0 } });
    clickProp(t, 'data-rk-life-chip', item);
    return t.store.rocks.lifeHunt.last.right;
  };

  it('asks the questions the key covers, in order', () => {
    expect(HUNT.map((q) => q.id)).toEqual(Object.keys(KEY));
  });

  it('accepts exactly the objects the key allows, for every question', () => {
    HUNT.forEach((q, i) => {
      const right = LIFE.filter((it) => tryItem(i, it.id)).map((it) => it.id);
      expect(right.sort(), q.id).toEqual(KEY[q.id].slice().sort());
    });
  });

  it('counts a first-try find, and only a first-try find', () => {
    const t = tree({ mode: 'minerals', lifeHunt: { i: 0, tries: 0, first: 2 } });
    clickProp(t, 'data-rk-life-chip', 'powder');
    expect(t.store.rocks.lifeHunt).toMatchObject({ i: 0, tries: 1, first: 3, last: { q: 'softest', item: 'powder', right: true } });
    const t2 = tree({ mode: 'minerals', lifeHunt: { i: 0, tries: 1, first: 2, last: { q: 'softest', item: 'salt', right: false } } });
    clickProp(t2, 'data-rk-life-chip', 'powder');
    expect(t2.store.rocks.lifeHunt).toMatchObject({ tries: 2, first: 2 });
  });

  it('ignores further picks once a find is made, then moves on', () => {
    const lh = { i: 0, tries: 1, first: 1, last: { q: 'softest', item: 'powder', right: true } };
    const t = tree({ mode: 'minerals', lifeHunt: lh });
    clickProp(t, 'data-rk-life-chip', 'salt');
    expect(t.store.rocks.lifeHunt).toEqual(lh);
    clickProp(t, 'data-rk-life-next', '1');
    expect(t.store.rocks.lifeHunt).toMatchObject({ i: 1, tries: 0, first: 1, last: null });
  });

  it('names the minerals that fit after two misses, and not before', () => {
    const miss = (tries) => ({ mode: 'minerals', lifeHunt: { i: 3, tries, first: 0, last: { q: 'sheets', item: 'salt', right: false } } });
    expect(render(miss(1))).not.toContain('data-rk-life-hint');
    const t = tree(miss(2));
    const hint = findAll(t.node, (n) => n.props && n.props['data-rk-life-hint'] === 'sheets');
    expect(hint.length).toBe(1);
    const text = textOf(hint[0]);
    const used = [...new Set(LIFE.map((it) => it.mineral))];
    const fits = used.filter((id) => ['gypsum', 'talc', 'mica', 'graphite'].includes(id));
    expect(fits.length).toBe(4);
        // Labels are the harness's untranslated keys, e.g. stem.rocks.mica_muscovite.
    const label = (id) => MINERALS.find((m) => m.id === id).label;
    const named = text.replace(/^.*?is /, '').replace(/[.]$/, '').split(/, | or /);
    expect(named.sort()).toEqual(fits.map(label).sort());
  });

  it('finishes with the first-try count', () => {
    const m = render({ mode: 'minerals', lifeHunt: { i: 7, tries: 0, first: 5 } });
    expect(m).toContain('data-rk-life="hunt-done"');
    expect(m).toContain('data-rk-life-done="5"');
    expect(m).toContain('First-try finds: 5 / 7');
  });

  it('survives hostile saved state', () => {
    const bad = [
      { lifeHunt: 'x' }, { lifeHunt: [] }, { lifeHunt: { i: -3 } }, { lifeHunt: { i: 99 } }, { lifeHunt: { i: 'x', last: 7 } },
      { lifeHunt: { i: 0, last: { q: 'softest', item: 'bogus', right: true } } }, { lifeSel: 42 }, { lifeSel: 'bogus' },
      { lifeSeen: 'pencil' }, { lifeSeen: [null, 3, {}] }
    ];
    bad.forEach((b) => expect(() => render(Object.assign({ mode: 'minerals' }, b)), JSON.stringify(b)).not.toThrow());
  });
});

// ── Hand lens drill ────────────────────────────────────────────────────────
describe('hand lens drill', () => {
  const vid = { rockId: 'granite', options: ['granite', 'diorite', 'gabbro', 'shale'], answered: false, chosen: null, score: 0, asked: 1 };
  it('toggles, and shows only the lens view with ids of its own', () => {
    const t = tree({ mode: 'rocks', visualId: vid });
    clickProp(t, 'data-rk-drill-lens', 'off');
    expect(t.store.rocks.drillLens).toBe(true);
    const m = render({ mode: 'rocks', visualId: vid, drillLens: true });
    expect(m).toContain('data-rk-drill-view="lens"');
    expect(m).toContain('rk-lens-granite-drill');
    const ids = [...m.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
    expect(ids.length).toBe(new Set(ids).size);
    expect(render({ mode: 'rocks', visualId: vid })).toContain('data-rk-drill-view="specimen"');
  });
});

// ── The igneous rock chart ─────────────────────────────────────────────────
describe('igneous rock chart: placement is read from the data', () => {
  const TS = literal('var RK_THIN_SECTION = {');
  const COLS = literal('var RK_IGN_COLS = [', '[', ']');
  const ROWS = literal('var RK_IGN_ROWS = [', '[', ']');
  const DARK = literal('var RK_IGN_DARK = [', '[', ']');
  const IGN = new Function('RK_THIN_SECTION', 'RK_ENV_OF', 'RK_IGN_ROWS', 'RK_IGN_COLS', 'RK_IGN_DARK',
    [fn('rkIgnCell'), fn('rkIgnDark'), fn('rkIgnColOfSilica'), 'return { rkIgnCell, rkIgnDark, rkIgnColOfSilica };'].join('\n'))(TS, ENV_OF, ROWS, COLS, DARK);
  // The textbook chart, written out independently of the tool.
  const CHART = {
    granite: ['intrusive', 'felsic'], diorite: ['intrusive', 'intermediate'], gabbro: ['intrusive', 'mafic'],
    rhyolite: ['extrusive', 'felsic'], andesite: ['extrusive', 'intermediate'], basalt: ['extrusive', 'mafic']
  };

  it('puts the six crystalline igneous rocks in the textbook cells, one per cell', () => {
    const placed = {};
    ROCKS.filter((r) => r.type === 'igneous').forEach((r) => { const c = IGN.rkIgnCell(r.id); if (c) placed[r.id] = c; });
    expect(placed).toEqual(CHART);
    expect(new Set(Object.values(placed).map((c) => c.join('-'))).size).toBe(6);
  });

  it('leaves the glassy, frothy and ashy rocks off, and no other rock type on', () => {
    ['obsidian', 'pumice', 'tuff'].forEach((id) => expect(IGN.rkIgnCell(id), id).toBeNull());
    ROCKS.filter((r) => r.type !== 'igneous').forEach((r) => expect(IGN.rkIgnCell(r.id), r.id).toBeNull());
  });

  it('gives each row the texture its crystal clue describes', () => {
    Object.entries(CHART).forEach(([id, [row]]) => {
      expect(ROCKS.find((r) => r.id === id).texture, id).toBe(ROWS.find((r) => r.id === row).texture);
    });
  });

  it('gets darker from felsic to mafic, by the thin sections themselves', () => {
    const dark = (col) => Object.keys(CHART).filter((id) => CHART[id][1] === col).map((id) => IGN.rkIgnDark(id));
    expect(Math.max(...dark('felsic'))).toBeLessThan(Math.min(...dark('intermediate')));
    expect(Math.max(...dark('intermediate'))).toBeLessThan(Math.min(...dark('mafic')));
    Object.keys(TS).forEach((id) => expect(TS[id].parts.reduce((a, p) => a + p[1], 0), id).toBeCloseTo(1, 5));
  });

  it('reads the silica boundaries the columns print', () => {
    const cases = [[45, 'mafic'], [51.9, 'mafic'], [52, 'intermediate'], [62.9, 'intermediate'], [63, 'felsic'], [75, 'felsic']];
    cases.forEach(([pct, col]) => expect(IGN.rkIgnColOfSilica(pct), String(pct)).toBe(col));
    COLS.forEach((c) => expect(IGN.rkIgnColOfSilica(c.mid), c.id).toBe(c.id));
  });
});

describe('igneous rock chart: build a rock', () => {
  const st = (extra) => Object.assign({ mode: 'rocks', selectedRock: 'granite' }, extra);

  it('shows only for igneous rocks', () => {
    expect(render(st())).toContain('data-rk-ign="build"');
    expect(render(st({ selectedRock: 'shale' }))).not.toContain('data-rk-ign=');
  });

  it('turns a silica value and a cooling place into the rock the chart names', () => {
    expect(render(st({ ignSilica: 70, ignCool: 'intrusive' }))).toContain('data-rk-ign-build="granite"');
    expect(render(st({ ignSilica: 58, ignCool: 'extrusive' }))).toContain('data-rk-ign-build="andesite"');
        expect(render(st({ ignSilica: 46, ignCool: 'extrusive' }))).toContain('data-rk-ign-build="basalt"');
    // The shares shown are the thin sections' own.
    expect(render(st({ ignSilica: 58, ignCool: 'intrusive' }))).toContain('Dark minerals: 38%');
    expect(render(st({ ignSilica: 48, ignCool: 'intrusive' }))).toContain('Dark minerals: 50%');
    expect(render(st({ ignSilica: 70, ignCool: 'intrusive' }))).toContain('Dark minerals: 10%');
  });

  it('runs the slider the same way as the chart: silica-rich on the left', () => {
    const t = tree(st({ ignSilica: 70 }));
    const input = findAll(t.node, (n) => n.type === 'input' && n.props.id === 'rk-ign-silica')[0];
    expect(input.props.value).toBe(5);
    input.props.onChange({ target: { value: '27' } });
    expect(t.store.rocks.ignSilica).toBe(48);
  });

  it('lands on the clicked cell, for every cell', () => {
    ['granite', 'diorite', 'gabbro', 'rhyolite', 'andesite', 'basalt'].forEach((id) => {
      const t = tree(st());
      const b = findAll(t.node, (n) => n.type === 'button' && n.props['data-rk-ign-rock'] === id)[0];
      expect(b, id).toBeTruthy();
      b.props.onClick();
      expect(render(st({ ignSilica: t.store.rocks.ignSilica, ignCool: t.store.rocks.ignCool })), id).toContain('data-rk-ign-build="' + id + '"');
    });
  });

  it('swaps to the twin and opens the built rock', () => {
    const t = tree(st({ ignSilica: 70, ignCool: 'intrusive' }));
    clickProp(t, 'data-rk-ign-twin', 'rhyolite');
    expect(t.store.rocks.ignCool).toBe('extrusive');
    const t2 = tree(st({ ignSilica: 48, ignCool: 'intrusive' }));
    clickProp(t2, 'data-rk-ign-open', 'gabbro');
    expect(t2.store.rocks.selectedRock).toBe('gabbro');
  });

  it('lists the igneous rocks it cannot place', () => {
    expect(render(st())).toContain('data-rk-ign-specials="obsidian pumice tuff"');
  });
});

describe('igneous rock chart: sort the specimens', () => {
  const Q = ['gabbro', 'rhyolite', 'andesite', 'granite', 'diorite', 'basalt'];
  const st = (sort) => ({ mode: 'rocks', selectedRock: 'granite', ignTab: 'sort', ignSort: sort });
  const cellBtn = (t, cell) => findAll(t.node, (n) => n.type === 'button' && n.props['data-rk-ign-cell'] === cell)[0];

  it('deals the six chart rocks', () => {
    const t = tree({ mode: 'rocks', selectedRock: 'granite', ignTab: 'sort' });
    clickProp(t, 'data-rk-ign-start', '1');
    expect(t.store.rocks.ignSort.queue.slice().sort()).toEqual(Q.slice().sort());
    expect(t.store.rocks.ignSort).toMatchObject({ idx: 0, picks: {} });
  });

  it('hides the name and the answer cell until a pick, and gives both clues', () => {
    const t = tree(st({ queue: Q, idx: 1, picks: { gabbro: ['intrusive', 'mafic'] } }));
    const m = render(st({ queue: Q, idx: 1, picks: { gabbro: ['intrusive', 'mafic'] } }));
    expect(m).toContain('data-rk-ign-current="rhyolite"');
    expect(m).toContain('Name hidden');
    expect(m).not.toContain('data-rk-ign-rock="rhyolite"');
    expect(m).toContain('data-rk-ign-rock="gabbro"');
    const clues = findAll(t.node, (n) => n.props && n.props['data-rk-ign-clue']);
    expect(textOf(clues[0])).toContain('Crystals too small to see');
    expect(textOf(clues[1])).toContain('quartz');
  });

  it('grades a pick on both axes and says which one was wrong', () => {
    const pick = (cell) => {
      const t = tree(st({ queue: Q, idx: 0, picks: {} }));
      cellBtn(t, cell).props.onClick();
      return render(st(t.store.rocks.ignSort));
    };
    expect(pick('intrusive-mafic')).toContain('data-rk-ign-feedback="right"');
    expect(pick('extrusive-mafic')).toContain('data-rk-ign-feedback="row"');
    expect(pick('intrusive-felsic')).toContain('data-rk-ign-feedback="col"');
    expect(pick('extrusive-felsic')).toContain('data-rk-ign-feedback="both"');
    const m = pick('extrusive-felsic');
    expect(m).toContain('data-rk-ign-cell="intrusive-mafic" data-rk-ign-rock="gabbro" data-rk-ign-mark="answer"');
    expect(m).toContain('data-rk-ign-cell="extrusive-felsic" data-rk-ign-mark="wrong"');
  });

  it('locks the chart after a pick, then moves on and scores the round', () => {
    const t = tree(st({ queue: Q, idx: 0, picks: { gabbro: ['extrusive', 'mafic'] } }));
        expect(cellBtn(t, 'intrusive-mafic').props.disabled).toBe(true);
        cellBtn(t, 'intrusive-mafic').props.onClick();
    expect(t.store.rocks.ignSort).toEqual({ queue: Q, idx: 0, picks: { gabbro: ['extrusive', 'mafic'] } });
    clickProp(t, 'data-rk-ign-next', '1');
    expect(t.store.rocks.ignSort.idx).toBe(1);
    const right = { gabbro: ['extrusive', 'mafic'], rhyolite: ['extrusive', 'felsic'], andesite: ['extrusive', 'intermediate'], granite: ['intrusive', 'felsic'], diorite: ['intrusive', 'felsic'], basalt: ['extrusive', 'mafic'] };
    const m = render(st({ queue: Q, idx: 6, picks: right }));
    expect(m).toContain('data-rk-ign-done="4"');
  });

  it('survives hostile saved state', () => {
    const bad = ['x', 5, [], { queue: 'x' }, { queue: ['bogus', 'gabbro', 'gabbro', null], idx: -2 }, { queue: Q, idx: 99, picks: [] },
      { queue: Q, idx: 0, picks: { gabbro: 'x' } }, { queue: Q, idx: 0, picks: { gabbro: ['nowhere', 'felsic'] } }, { queue: Q, idx: 1.7 }];
    bad.forEach((b) => expect(() => render(st(b)), JSON.stringify(b)).not.toThrow());
    [{ ignSilica: 'x' }, { ignSilica: NaN }, { ignSilica: 9999 }, { ignSilica: -5 }, { ignCool: 7 }, { ignTab: {} }].forEach((b) =>
      expect(() => render(Object.assign({ mode: 'rocks', selectedRock: 'basalt' }, b)), JSON.stringify(b)).not.toThrow());
        const deduped = render(st({ queue: ['bogus', 'gabbro', 'gabbro', null], idx: -2 }));
    expect(deduped).toContain('data-rk-ign-current="gabbro"');
    expect(deduped).toContain('Specimen 1 / 1');
    expect(render(st({ queue: Q, idx: 0, picks: { gabbro: ['nowhere', 'felsic'] } }))).not.toContain('data-rk-ign-feedback');
  });
});

// ── Every new string is registered, with the English the code falls back to
describe('round 5 strings are registered', () => {
  const COLS = literal('var RK_IGN_COLS = [', '[', ']');
  const ROWS = literal('var RK_IGN_ROWS = [', '[', ']');
  const family = {};
  ENVS.forEach((e) => { family['env_name_' + e.id] = e.name; family['env_blurb_' + e.id] = e.blurb; });
  LIFE.forEach((it) => { family['life_name_' + it.id] = it.name; family['life_why_' + it.id] = it.why; });
  HUNT.forEach((q) => { family['life_q_' + q.id] = q.q; });
  COLS.forEach((c) => ['name', 'look', 'why', 'magma'].forEach((f) => { family['ign_col_' + f + '_' + c.id] = c[f]; }));
  ROWS.forEach((r) => ['short', 'name', 'crystals', 'why'].forEach((f) => { family['ign_row_' + f + '_' + r.id] = r[f]; }));
  it('registers every computed-key member in both copies', () => {
    expect(Object.keys(family).length).toBe(9 * 2 + 16 * 2 + 7 + 3 * 4 + 2 * 4);
    Object.entries(family).forEach(([k, v]) => { expect(S[k], k).toBe(v); expect(S_PUB[k], k).toBe(v); });
  });
  it('registers every static env_, life_, ign_ and drill_lens_ key with its fallback', () => {
    const re = /(?:__alloT|\bT)\('stem\.rocks\.((?:env|life|ign|drill_lens)_[a-z0-9_]+)',\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\)/g;
    const seen = new Set();
    for (const m of SRC.matchAll(re)) {
      const v = new Function('return ' + m[2])();
      expect(S[m[1]], m[1]).toBe(v);
      expect(S_PUB[m[1]], m[1]).toBe(v);
      seen.add(m[1]);
    }
    // Every registered key of these prefixes is either a static call or a
    // family member: nothing registered and never read.
    const registered = Object.keys(S).filter((k) => /^(env|life|ign|drill_lens)_/.test(k));
    expect(registered.sort()).toEqual([...seen, ...Object.keys(family)].sort());
    expect(seen.size).toBe(42 + 36);
  });
});
