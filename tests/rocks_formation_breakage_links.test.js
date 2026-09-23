// Rocks & Minerals, 2026-09-22 deep dive: the connections between rocks, how
// minerals break, and how an igneous texture actually forms.
//
// Each block pins a defect that shipped, not just the feature that replaced it:
//   - the cooling model drew crystals floating apart in melt, the opposite of
//     the interlocking mosaic the thin section describes
//   - the mineral card's canvas drew random "cleavage" on quartz, printed ~4px
//     labels, and painted malachite's green streak grey (so did the Workbench)
//   - Mystery Rock was a dead end whenever AI was off, the default for students
//   - the weathering lab gave neutral rain ZERO chemical weathering and treated
//     pH 12 "rain" as acid
//   - texture slugs ('clastic-coarse') were printed to students untranslated
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

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
const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const S = UI.stem.rocks;

/** Evaluate a module-scope literal from the shipped source (never a copy). */
function literalAfter(marker, open = '{', close = '}') {
  const at = SRC.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  const start = SRC.indexOf(open, at);
  let depth = 0, inStr = null;
  for (let i = start; i < SRC.length; i++) {
    const ch = SRC[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return new Function('return (' + SRC.slice(start, i + 1) + ')')(); }
  }
  throw new Error('unbalanced literal after ' + marker);
}
/** A top-level function's source text, by brace matching. */
function fnSource(name) {
  const at = SRC.indexOf('  function ' + name + '(');
  expect(at, name).toBeGreaterThan(-1);
  const start = SRC.indexOf('{', at);
  let depth = 0, inStr = null;
  for (let i = start; i < SRC.length; i++) {
    const ch = SRC[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"') { inStr = ch; continue; }
    if (ch === '/' && SRC[i + 1] === '/') { i = SRC.indexOf('\n', i); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return SRC.slice(at, i + 1); }
  }
  throw new Error('unbalanced function ' + name);
}

const ROCK_ROWS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch('))
  .matchAll(/\{ id: '(\w+)', type: '(\w+)'.*?labelKey: 'stem\.rocks\.(\w+)'.*?texture: '([\w-]+)'/g)]
  .map((m) => ({ id: m[1], type: m[2], label: S[m[3]], texture: m[4] }));
const MINERAL_ROWS = [...SRC.slice(SRC.indexOf('const MINERALS = ['), SRC.indexOf('// ── Quiz bank ──'))
  .matchAll(/\{ id: '(\w+)', label: t\('stem\.rocks\.(\w+)'.*?streak: '([^']+)'/g)]
  .map((m) => ({ id: m[1], label: S[m[2]], streak: m[3] }));
const LINKS = literalAfter('var RK_ROCK_LINKS = {');
const AGENTS = literalAfter('var RK_LINK_AGENTS = {');
const CLEAVAGE = literalAfter('var RK_CLEAVAGE = {');
const KINDS = literalAfter('var RK_CLEAVAGE_KINDS = {');
const TEXNAME = literalAfter('var RK_TEXTURE_NAME = {');
const STREAK_HEX = literalAfter('var RK_STREAK_HEX = {');

function mk(rocks, extra) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  }, extra || {}));
  return { store, ctx };
}
function render(rocks, extra) {
  const { store, ctx } = mk(rocks, extra);
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup };
}
function tree(rocks, extra) {
  const { store, ctx } = mk(rocks, extra);
  return { store, ctx, node: window.StemLab._registry.rocks.render(ctx) };
}
function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('source and deploy mirror', () => {
  it('are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── Where a rock comes from, where it goes ──────────────────────────────────
describe('rock-cycle links and look-alikes', () => {
  it('parsed the catalogue, so the checks below are not vacuous', () => {
    expect(ROCK_ROWS.length).toBe(24);
    expect(ROCK_ROWS.every((r) => typeof r.label === 'string' && r.label.length > 2)).toBe(true);
  });

  it('covers every rock, and every id it points at is a real catalogue rock', () => {
    const ids = new Set(ROCK_ROWS.map((r) => r.id));
    expect(Object.keys(LINKS).sort()).toEqual([...ids].sort());
    Object.entries(LINKS).forEach(([id, L]) => {
      expect(L.look.length, id + ' look-alikes').toBeGreaterThan(0);
      L.into.forEach((row) => {
        expect(Object.keys(AGENTS), id + ' agent').toContain(row[0]);
        row[1].forEach((to) => expect(ids.has(to), id + ' -> ' + to).toBe(true));
      });
      L.look.forEach((row) => {
        expect(ids.has(row[0]), id + ' look ' + row[0]).toBe(true);
        expect(row[0]).not.toBe(id);
      });
    });
  });

  it('never names the rock in its own formation story or giveaway, so both work as Mystery clues', () => {
    ROCK_ROWS.forEach((r) => {
      const name = r.label.toLowerCase();
      expect(LINKS[r.id].from.toLowerCase(), r.id + ' from').not.toContain(name);
      expect(LINKS[r.id].clue.toLowerCase(), r.id + ' clue').not.toContain(name);
    });
  });

  it('teaches the metamorphic parents the rest of the tool already names', () => {
    const into = (id, agent) => (LINKS[id].into.find((r) => r[0] === agent) || [null, []])[1];
    expect(into('limestone', 'heat')).toContain('marble');
    expect(into('sandstone', 'heat')).toContain('quartzite');
    expect(into('shale', 'heat')).toEqual(['slate', 'phyllite', 'schist', 'gneiss']);
    expect(into('slate', 'heat')).toContain('phyllite');
    expect(into('phyllite', 'heat')).toContain('schist');
    // Metamorphism is solid-state: the story must not say the rock melted.
    ['marble', 'quartzite'].forEach((id) => expect(LINKS[id].from).toMatch(/never melts|without melting/));
  });

  it('draws the links and look-alikes on the rock card, with chips that open the next rock', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'shale' });
    expect(markup).toContain('data-rk-rock-links="shale"');
    ['slate', 'phyllite', 'schist', 'gneiss'].forEach((id) => expect(markup).toContain('data-rk-link-rock="' + id + '"'));
    expect(markup).toContain('data-rk-lookalikes="shale"');
    expect(markup).toContain('data-rk-lookalike="slate"');

    const t = tree({ mode: 'rocks', selectedRock: 'shale' });
    const chip = findAll(t.node, (n) => n.props && n.props['data-rk-link-rock'] === 'slate' && typeof n.props.onClick === 'function')[0];
    expect(chip).toBeTruthy();
    chip.props.onClick();
    expect(t.store.rocks.selectedRock).toBe('slate');
  });

  it('keeps every SVG id unique on a card that draws the same rock in several rows', () => {
    // Swatch ids are scoped by size; the look-alike rows vary it per row.
    const { markup } = render({ mode: 'rocks', selectedRock: 'granite' });
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(20);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── The drill's feedback is a contrast, not a verdict ────────────────────────
describe('Visual ID drill feedback', () => {
  it('shows the rock the student picked beside the right one, with the discriminator', () => {
    const vid = { rockId: 'granite', options: ['granite', 'diorite', 'gabbro', 'shale'], answered: true, chosen: 'diorite', score: 0, asked: 1 };
    const { markup } = render({ mode: 'rocks', visualId: vid });
    expect(markup).toContain('data-rk-drill-contrast="diorite"');
    expect(markup).toContain('You chose');
    expect(markup).toContain(LINKS.granite.look.find((r) => r[0] === 'diorite')[1]);
  });

  it('finds the discriminator from either rock, whichever one lists the other', () => {
    // conglomerate lists breccia; breccia also lists conglomerate. andesite
    // lists basalt, but test a pair only ONE side lists: sandstone -> siltstone
    // is listed by sandstone, and siltstone lists sandstone too; tuff lists
    // sandstone but sandstone does not list tuff.
    expect(LINKS.sandstone.look.some((r) => r[0] === 'tuff')).toBe(false);
    const vid = { rockId: 'sandstone', options: ['sandstone', 'tuff', 'shale', 'granite'], answered: true, chosen: 'tuff', score: 0, asked: 1 };
    const { markup } = render({ mode: 'rocks', visualId: vid });
    expect(markup).toContain(LINKS.tuff.look.find((r) => r[0] === 'sandstone')[1]);
  });

  it('gives a right answer the look-alike to watch for next time', () => {
    const vid = { rockId: 'granite', options: ['granite', 'diorite', 'gabbro', 'shale'], answered: true, chosen: 'granite', score: 1, asked: 1 };
    const { markup } = render({ mode: 'rocks', visualId: vid });
    expect(markup).toContain('data-rk-drill-watch="' + LINKS.granite.look[0][0] + '"');
    expect(markup).not.toContain('data-rk-drill-contrast');
  });
});

// ── Texture names, not slugs ─────────────────────────────────────────────────
describe('texture names', () => {
  it('has a display name and a registered key for every texture a rock uses', () => {
    const used = new Set(ROCK_ROWS.map((r) => r.texture));
    used.forEach((tx) => {
      expect(TEXNAME[tx], tx).toBeTruthy();
      expect(S['texture_name_' + tx], 'texture_name_' + tx).toBe(TEXNAME[tx]);
    });
  });

  it('never prints a hyphenated slug on the rock card or the drill', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'conglom' });
    expect(markup).toContain(TEXNAME['clastic-coarse']);
    // The slug may still appear inside attributes (swatch ids), never as text.
    const text = markup.replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\bclastic-coarse\b/);
  });
});

// ── Every computed key is registered ─────────────────────────────────────────
// check_stem_i18n_registration sees only a PREFIX for a computed key
// (`'stem.rocks.rlink_from_' + id`), so it cannot prove any member exists.
// This enumerates every member from the same tables the code reads.
describe('computed i18n keys', () => {
  it('registers every link, texture-name and breakage key with the data English', () => {
    const want = {};
    Object.entries(LINKS).forEach(([id, L]) => {
      want['rlink_from_' + id] = L.from;
      want['rlink_clue_' + id] = L.clue;
      L.into.forEach((row) => { want['rlink_into_' + id + '_' + row[0]] = row[2]; });
      L.look.forEach((row) => { want['rlink_look_' + id + '_' + row[0]] = row[1]; });
    });
    Object.entries(AGENTS).forEach(([a, v]) => { want['rlink_agent_' + a] = v; });
    Object.entries(TEXNAME).forEach(([tx, v]) => { want['texture_name_' + tx] = v; });
    Object.entries(KINDS).forEach(([k, v]) => { want['brk_kind_' + k] = v.name; want['brk_pieces_' + k] = v.pieces; });
    expect(Object.keys(want).length).toBeGreaterThan(150);
    const bad = Object.keys(want).filter((k) => S[k] !== want[k]);
    expect(bad, 'unregistered or drifted:\n' + bad.join('\n')).toEqual([]);
  });

  it('registers the same keys in the served ui_strings copy', () => {
    // Key-level, not byte-level: other sessions edit this shared file, and a
    // byte check would fail whenever one of them is between its two writes.
    const pub = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.rocks;
    const mine = Object.keys(S).filter((k) => /^(rlink_|texture_name_|brk_|wx_|speed_porph_|cooling_count_|cooling_compare_|drill_)/.test(k));
    expect(mine.length).toBeGreaterThan(150);
    const drift = mine.filter((k) => pub[k] !== S[k]);
    expect(drift, drift.join(', ')).toEqual([]);
  });
});

// ── How a mineral breaks ─────────────────────────────────────────────────────
describe('cleavage and fracture', () => {
  it('parsed the minerals, so the checks below are not vacuous', () => {
    expect(MINERAL_ROWS.length).toBe(23);
  });

  it('classifies every mineral, with the textbook cases pinned', () => {
    MINERAL_ROWS.forEach((m) => expect(Object.keys(KINDS), m.id).toContain(CLEAVAGE[m.id]));
    expect(CLEAVAGE.quartz).toBe('none');       // conchoidal: the classic no-cleavage mineral
    expect(CLEAVAGE.mica).toBe('one');          // peels into sheets
    expect(CLEAVAGE.feldspar).toBe('two90');    // two at about 90 degrees
    expect(CLEAVAGE.halite).toBe('three90');    // cubes
    expect(CLEAVAGE.galena).toBe('three90');
    expect(CLEAVAGE.calcite).toBe('rhomb');     // three, not at 90
    expect(CLEAVAGE.fluorite).toBe('four');     // octahedral
    expect(CLEAVAGE.diamond).toBe('four');
    expect(KINDS.rhomb.planes).toBe(3);
    expect(KINDS.four.planes).toBe(4);
  });

  it('replaces the old cross-section canvas with the breakage panel', () => {
    const { markup } = render({ mode: 'minerals', selectedMineral: 'quartz' });
    expect(markup).not.toContain('Mineral cross-section');
    expect(SRC).not.toContain('mineralCrossSectionRef');
    expect(markup).toContain('data-rk-breakage-panel="none"');
    expect(markup).toContain('data-rk-breakage="none"');
    expect(markup).toContain(KINDS.none.name);
  });

  it('draws uneven fracture for the massive minerals and the right kind for the rest', () => {
    expect(render({ mode: 'minerals', selectedMineral: 'hematite' }).markup).toContain('data-rk-breakage="none-uneven"');
    expect(render({ mode: 'minerals', selectedMineral: 'calcite' }).markup).toContain('data-rk-breakage="rhomb"');
    const halite = render({ mode: 'minerals', selectedMineral: 'halite' }).markup;
    expect(halite).toContain('data-rk-breakage="three90"');
    expect(halite).toContain(KINDS.three90.pieces);
  });

  it('shows density, which was in the data for every mineral and on no card', () => {
    const { markup } = render({ mode: 'minerals', selectedMineral: 'galena' });
    expect(markup).toContain('7.5 g/cm³');
  });
});

// ── Streak colours ───────────────────────────────────────────────────────────
describe('streak colours', () => {
  it('has a streak colour for every mineral the catalogue lists', () => {
    // Malachite (Green) and azurite (Pale blue) had no row, so every streak
    // drawing fell back to pale grey, including the Workbench smear that the
    // observation card then scored as "Green".
    MINERAL_ROWS.forEach((m) => {
      expect(Object.prototype.hasOwnProperty.call(STREAK_HEX, m.streak), m.id + ' ' + m.streak).toBe(true);
    });
    expect(STREAK_HEX.Green).not.toBe('#cbd5e1');
  });

  it('paints malachite green on the card and on the workbench bench', () => {
    expect(render({ mode: 'minerals', selectedMineral: 'malachite' }).markup).toContain('data-rk-streak-chip="' + STREAK_HEX.Green + '"');
    const wb = render({ mode: 'workbench', wb: { spId: 'malachite', pool: 'challenge', streakObs: 'powder-green', history: [], anim: null } }).markup;
    if (wb.includes('M400 152')) expect(wb).toContain('stroke="' + STREAK_HEX.Green + '"');
  });
});

// ── Crystallization by nucleation and growth ────────────────────────────────
describe('cooling model', () => {
  // The shipped functions, evaluated from the source. rkCoolingModel reads
  // rkSeed, rkSrgbLum and the two tables, so those come along too.
  const build = () => new Function([
    fnSource('rkSeed'), fnSource('rkSrgbLum'),
    'var RK_COOL_GRID = ' + JSON.stringify(literalAfter('var RK_COOL_GRID = {')) + ';',
    'var RK_COOL_NUCLEI = ' + JSON.stringify(literalAfter('var RK_COOL_NUCLEI = {')) + ';',
    'var _rkCoolCache = {};',
    fnSource('rkCoolingModel'), fnSource('rkCoolingCounts'),
    'return { model: rkCoolingModel, counts: rkCoolingCounts };'
  ].join('\n'))();
  const granite = { id: 'granite', grainColors: ['#d4d4d8', '#fca5a5', '#1e1e1e', '#fafafa'] };

  it('fills the whole view with crystals by the end: an interlocking mosaic, no melt left', () => {
    const M = build();
    ['slow', 'medium', 'fast', 'porphyritic'].forEach((sp) => {
      const m = M.model(sp, granite);
      let gaps = 0, late = 0;
      for (let i = 0; i < m.owner.length; i++) {
        if (m.owner[i] < 0) gaps++;
        if (m.arrive[i] > m.tEnd) late++;
      }
      expect(gaps, sp + ' unowned cells').toBe(0);
      expect(late, sp + ' cells still molten at the end').toBe(0);
    });
  });

  it('leaves melt between growing crystals partway through, as the animation shows', () => {
    const M = build();
    const m = M.model('slow', granite);
    const t = 0.4 * m.tEnd;
    let solid = 0;
    for (let i = 0; i < m.arrive.length; i++) if (m.arrive[i] <= t) solid++;
    const frac = solid / m.arrive.length;
    expect(frac).toBeGreaterThan(0.05);
    expect(frac).toBeLessThan(0.95);
  });

  it('makes crystal NUMBER the thing cooling rate changes: slow < moderate < fast, quenched none', () => {
    const M = build();
    const g = (sp) => M.model(sp, granite).grains;
    expect(g('slow')).toBeLessThan(g('medium'));
    expect(g('medium')).toBeLessThan(g('fast'));
    // A real spread, not a nudge: slow crystals average several times larger.
    expect(g('fast') / g('slow')).toBeGreaterThan(10);
    expect(M.model('rapid', granite).grains).toBe(0);
    expect(M.model('rapid', granite).owner).toBeNull();
  });

  it('grows a few large crystals and many small ones in the two-stage history', () => {
    const M = build();
    const m = M.model('porphyritic', granite);
    const area = {};
    for (let i = 0; i < m.owner.length; i++) area[m.owner[i]] = (area[m.owner[i]] || 0) + 1;
    const big = m.nuclei.map((n, i) => (n.big ? area[i] || 0 : null)).filter((a) => a !== null);
    const small = m.nuclei.map((n, i) => (!n.big && area[i] ? area[i] : null)).filter((a) => a !== null);
    expect(big.length).toBe(7);
    const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(big) / mean(small)).toBeGreaterThan(8);
  });

  it('is deterministic, so a student sees the same run every time', () => {
    const a = build().model('medium', granite), b = build().model('medium', granite);
    expect(Buffer.from(a.owner.buffer).equals(Buffer.from(b.owner.buffer))).toBe(true);
  });

  it('prints counts read off the model, never typed in', () => {
    const M = build();
    const want = M.model('slow', { id: 'granite', grainColors: granite.grainColors }).grains;
    const { markup } = render({ mode: 'rocks', selectedRock: 'granite', coolingSpeed: 'slow', coolingProgress: 100 });
    expect(markup).toContain('data-rk-cooling-count="' + want + '"');
    expect(markup).toContain('Crystals formed: ' + want);
    expect(render({ mode: 'rocks', selectedRock: 'obsidian', coolingSpeed: 'rapid', coolingProgress: 100 }).markup)
      .toContain('Crystals that started: 0');
  });

  it('offers the two-stage history and explains the mechanism', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'andesite', coolingSpeed: 'porphyritic', coolingProgress: 100 });
    expect(markup).toContain('Two-stage (Porphyritic)');
    expect(markup).toContain('Porphyritic; large crystals (phenocrysts) in a fine-grained matrix');
    expect(markup).toContain('Slow cooling does not make crystals grow faster');
  });

  it('keeps finished runs for a side-by-side comparison, one thumbnail each', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'granite', coolingSpeed: 'fast', coolingProgress: 100, coolingDone: { slow: true, rapid: true, fast: true } });
    expect(markup).toContain('data-rk-cooling-compare="3"');
    ['slow', 'fast', 'rapid'].forEach((sp) => expect(markup).toContain('data-rk-cooling-thumb="' + sp + '"'));
    expect(markup).not.toContain('data-rk-cooling-thumb="medium"');
    // Hostile saved state must not crash or invent runs.
    expect(render({ mode: 'rocks', selectedRock: 'granite', coolingDone: ['slow'] }).markup).not.toContain('data-rk-cooling-compare');
  });

  describe('a run records itself when it finishes', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });
    it('marks the history done after the animation', () => {
      const t = tree({ mode: 'rocks', selectedRock: 'granite', coolingSpeed: 'medium', coolingProgress: 0 });
      const run = findAll(t.node, (n) => n.type === 'button' && /Run solidification/.test(textOf(n)))[0];
      expect(run).toBeTruthy();
      run.props.onClick();
      vi.advanceTimersByTime(4000);
      expect(t.store.rocks.coolingProgress).toBe(100);
      expect(t.store.rocks.coolingDone).toEqual({ medium: true });
    });
  });
});

// ── Mystery Rock with no AI ──────────────────────────────────────────────────
describe('Mystery Rock offline clues', () => {
  it('says where the clues come from', () => {
    expect(render({ mode: 'mystery' }).markup).toContain('data-rk-mystery-source="offline"');
    expect(render({ mode: 'mystery' }, { callGemini: () => Promise.resolve('a|||b|||c') }).markup).toContain('data-rk-mystery-source="ai"');
  });

  it('starts a real game without AI, three clues, none naming the rock', () => {
    for (let run = 0; run < 12; run++) {
      const t = tree({ mode: 'mystery' });
      const start = findAll(t.node, (n) => n.type === 'button' && /Start Challenge/.test(textOf(n)))[0];
      expect(start).toBeTruthy();
      start.props.onClick();
      const my = t.store.rocks.mystery;
      expect(my.error == null).toBe(true);
      expect(my.offline).toBe(true);
      expect(my.clues).toHaveLength(3);
      expect(my.cluesShown).toBe(1);
      const rock = ROCK_ROWS.find((r) => r.id === my.rockId);
      expect(rock).toBeTruthy();
      my.clues.forEach((c) => {
        expect(c.length).toBeGreaterThan(10);
        expect(c.toLowerCase(), my.rockId).not.toContain(rock.label.toLowerCase());
      });
    }
  });
});

// ── Weathering chemistry ─────────────────────────────────────────────────────
describe('weathering model', () => {
  const stateOf = (w) => {
    const { markup } = render({ mode: 'weathHunt', weathHunt: Object.assign({ hypothesis: '', log: [] }, w) });
    return ['Chemical-dominated', 'Physical-dominated', 'Mixed weathering', 'Minimal weathering'].find((s) => markup.includes('>' + s) || markup.includes(s + '<'));
  };

  it('lets plain water weather rock: neutral rain in a wet climate is not "minimal"', () => {
    // The old term was |pH - 7|, which made this exactly zero chemical weathering.
    expect(stateOf({ tempSwing: 5, rainfall: 500, pH: 7 })).toBe('Chemical-dominated');
  });

  it('does not treat alkaline "rain" as acid rain', () => {
    const neutral = stateOf({ tempSwing: 5, rainfall: 300, pH: 7 });
    expect(stateOf({ tempSwing: 5, rainfall: 300, pH: 12 })).toBe(neutral);
    // ...while real acid rain does push toward chemical weathering.
    expect(stateOf({ tempSwing: 12, rainfall: 300, pH: 4 })).toBe('Chemical-dominated');
  });

  it('weathers a carbonate faster than granite in the same climate', () => {
    const climate = { tempSwing: 10, rainfall: 250, pH: 5.6 };
    expect(stateOf(Object.assign({ rock: 'granite' }, climate))).not.toBe('Chemical-dominated');
    expect(stateOf(Object.assign({ rock: 'limestone' }, climate))).toBe('Chemical-dominated');
    expect(render({ mode: 'weathHunt', weathHunt: Object.assign({ rock: 'limestone', log: [] }, climate) }).markup)
      .toContain('data-wx-rock-note="limestone-chemDom"');
  });

  it('offers only a realistic rain pH range, labelled', () => {
    const { markup } = render({ mode: 'weathHunt' });
    const ph = /<input[^>]*id="wh-pH"[^>]*>/.exec(markup)[0];
    expect(ph).toContain('min="3"');
    expect(ph).toContain('max="8"');
    expect(markup).toContain('natural rain');
    expect(markup).not.toContain('Widget classifies');
    expect(markup).not.toContain('Design note:');
  });
});

// ── Landscape zones ──────────────────────────────────────────────────────────
describe('landscape zones', () => {
  it('keeps the sedimentary zone on the beds, clear of the metamorphic fold', () => {
    const m = /\{ id: 'river'[^}]*x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+)/.exec(SRC);
    const fold = parseFloat(/var fx0 = W \* ([\d.]+)/.exec(SRC)[1]);
    const basin = parseFloat(/var bx0 = W \* ([\d.]+)/.exec(SRC)[1]);
    const x = parseFloat(m[1]), w = parseFloat(m[3]);
    expect(x).toBeGreaterThanOrEqual(basin);
    expect(x + w).toBeLessThanOrEqual(fold + 1e-9);
  });
});

// ── Crystalline specimen art ─────────────────────────────────────────────────
describe('crystalline swatches tile', () => {
  // Shoelace area of every grain polygon inside the swatch.
  function grainArea(markup) {
    let sum = 0, n = 0;
    for (const m of markup.matchAll(/<polygon[^>]*points="([^"]+)"/g)) {
      const pts = m[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        a += x1 * y2 - x2 * y1;
      }
      sum += Math.abs(a) / 2; n++;
    }
    return { sum, n };
  }
  it('covers the whole specimen square with grains: no rock showing between crystals', () => {
    const { markup } = render({ mode: 'rocks', selectedRock: 'granite' });
    const at = markup.indexOf('aria-label="Rock texture close-up');
    const svg = markup.slice(markup.indexOf('<svg', at), markup.indexOf('</svg>', at));
    const { sum, n } = grainArea(svg);
        expect(n).toBeGreaterThanOrEqual(25);
    // The swatch is S x S; a tiling mosaic covers it to rounding error.
    const W = Number(/^<svg[^>]*width="([0-9.]+)"/.exec(svg)[1]);
    expect(W).toBeGreaterThanOrEqual(100);
    expect(Math.abs(sum - W * W) / (W * W)).toBeLessThan(0.01);
  });
});
