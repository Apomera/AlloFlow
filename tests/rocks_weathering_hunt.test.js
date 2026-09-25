// Weathering discovery widget: outcrop illustration + trial log.
//
// The widget was three sliders and a coloured caption — a weathering simulator
// that never showed weathering. And its "Log" button wrote iq.log while nothing
// rendered it, so clicking it stored a trial and showed the student nothing.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

function mk(weathHunt, extra) {
  const store = { rocks: { mode: 'weathHunt', weathHunt }, rockCycle: {} };
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  }, extra));
  return { store, ctx };
}

function render(weathHunt, extra) {
  const { store, ctx } = mk(weathHunt, extra);
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup };
}

function tree(weathHunt, extra) {
  const { store, ctx } = mk(weathHunt, extra);
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

// Slider settings that land in each of the four discrete states. These use the
// OLD rainfall scale (`rainfall`, 0-500), which saves still hold; the tool reads
// it as rainMm = rainfall x 6. See 'rainfall in real millimetres' below.
const STATES = {
  minimal: { tempSwing: 5, rainfall: 20, pH: 7 },
  physDom: { tempSwing: 45, rainfall: 20, pH: 7 },
  chemDom: { tempSwing: 2, rainfall: 500, pH: 3 },
  mixed: { tempSwing: 30, rainfall: 500, pH: 4.6 },
};

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('weathering outcrop illustration', () => {
  it('draws a different outcrop for each of the four states', () => {
    const seen = new Map();
    Object.keys(STATES).forEach((key) => {
      const { markup } = render(STATES[key]);
      const svg = markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>') + 6);
      expect(svg.length, key).toBeGreaterThan(200);
      seen.set(key, svg);
    });
    // All four must be visually distinct.
    const uniq = new Set(seen.values());
    expect(uniq.size).toBe(4);
  });

  it('shows the diagnostic signature of each weathering mode', () => {
    expect(render(STATES.minimal).markup).toContain('edges stay sharp');
    // Physical weathering makes ANGULAR debris; chemical makes rounded forms.
    expect(render(STATES.physDom).markup).toContain('angular blocks');
        expect(render(Object.assign({ rock: 'limestone' }, STATES.chemDom)).markup).toContain('rounded and pitted');
    expect(render(STATES.mixed).markup).toContain('both signatures');
  });

  it('describes the picture for screen readers, not just labels it', () => {
    const phys = render(STATES.physDom).markup;
    expect(phys).toContain('ice-filled fractures');
    expect(phys).toContain('scree');
        const chem = render(Object.assign({ rock: 'limestone' }, STATES.chemDom)).markup;
    expect(chem).toContain('solution hollow');
    expect(chem).toContain('dissolving');
  });

  it('draws the signature of the chosen rock, not limestone for all three', () => {
    // The chemical picture used to be karst for every rock, so granite grew a
    // solution cave while its own note said "feldspar slowly turns to clay".
    const granite = render(Object.assign({ rock: 'granite' }, STATES.chemDom)).markup;
    expect(granite).toContain('data-rk-wx-scene="chemDom-granite"');
        expect(granite).not.toContain('solution hollow');
    // ...and does not DRAW one either: the hollow is the karst cave path.
    const CAVE = 'M96,84 Q102,68 116,84 Z';
    expect(render(Object.assign({ rock: 'limestone' }, STATES.chemDom)).markup).toContain(CAVE);
    expect(granite).not.toContain(CAVE);
    expect(granite).toContain('feldspar rots to clay');
    expect(granite).toContain('quartz is left behind as sand');
    const sand = render(Object.assign({ rock: 'sandstone' }, STATES.chemDom)).markup;
    expect(sand).toContain('honeycomb');
        expect(sand).not.toContain('solution hollow');
    expect(sand).not.toContain(CAVE);
    expect(render(Object.assign({ rock: 'limestone' }, STATES.physDom)).markup).toContain('bedding planes');
    expect(render(Object.assign({ rock: 'sandstone' }, STATES.physDom)).markup).toContain('grain by grain');
  });

  it('draws each rock differently in every state', () => {
    Object.keys(STATES).forEach((key) => {
      const svgs = ['granite', 'limestone', 'sandstone'].map((rock) => {
        const m = render(Object.assign({ rock }, STATES[key])).markup;
        // The drawing only: the opening tag and the clip ids carry the rock's
        // name, which would make every pair differ for free.
        const k = m.indexOf('data-rk-wx-scene');
        expect(k, rock + ' ' + key).toBeGreaterThan(-1);
        return m.slice(m.indexOf('>', k) + 1, m.indexOf('</svg>', k)).replace(/rk-wx-clip-[a-zA-Z]+-[a-z]+/g, 'CLIP');
      });
      expect(new Set(svgs).size, key).toBe(3);
    });
  });

  it('is driven by the discrete state only, never the raw slider values', () => {
    // The widget's design note pins "no rate score". Scaling crack counts or pit
    // sizes off the sliders would smuggle a continuous intensity readout back in
    // through the artwork, so two different settings that classify the same must
    // draw identically.
    const a = render({ tempSwing: 40, rainfall: 10, pH: 7 }).markup;
    const b = render({ tempSwing: 50, rainfall: 30, pH: 7.2 }).markup;
    const svgA = a.slice(a.indexOf('<svg'), a.indexOf('</svg>'));
    const svgB = b.slice(b.indexOf('<svg'), b.indexOf('</svg>'));
    expect(svgA).toEqual(svgB);
  });

    it('takes only the discrete state, the chosen rock and a translator as input', () => {
    // `T` is the render's __alloT, threaded in so the captions drawn INTO the
    // outcrop and its screen-reader description travel with the language. It is
    // a translator, not data. The rock is a category like the state: it picks
    // WHICH signature is drawn, never how much. The guard below is what keeps
    // slider values out.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('function rkWeatheringSvg(h, state, T, rock)');
      expect(src).toContain('rkWeatheringSvg(h, state, __alloT, wxRock)');
      const fn = src.slice(src.indexOf('function rkWeatheringSvg'), src.indexOf('// ═══ 🔬 rocks'));
      // No slider names reachable inside the renderer.
      expect(fn).not.toContain('tempSwing');
      expect(fn).not.toContain('rainfall');
      expect(fn).not.toContain('Math.random');
    });
  });
});

describe('weathering trial log', () => {
  it('renders nothing when no trials are logged', () => {
    const { markup } = render(STATES.minimal);
    expect(markup).not.toContain('Logged trials');
  });

  it('shows each logged trial with the state it produced', () => {
    // Regression: this data was written by the Log button and never rendered.
    const { markup } = render(Object.assign({}, STATES.mixed, {
      log: [
        { t: 45, r: 20, p: 7, st: 'physDom' },
        { t: 2, r: 500, p: 3, st: 'chemDom' },
      ],
    }));
    expect(markup).toContain('Logged trials');
    expect(markup).toContain('(2)');
    // Old-scale trials (r) read onto the millimetre scale: 20 -> 120, 500 -> 3000.
    expect(markup).toContain('ΔT 45°  rain 120 mm');
    expect(markup).toContain('ΔT 2°  rain 3000 mm');
    // Each row is chipped with the state that setting produced.
    expect(markup).toContain('Physical-dominated');
    expect(markup).toContain('Chemical-dominated');
  });

  it('the Log button writes a trial that then appears', () => {
    const { store, node } = tree(STATES.chemDom);
    const logBtn = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Log'))[0];
    expect(logBtn).toBeTruthy();
    logBtn.props.onClick();

    expect(store.rocks.weathHunt.log).toHaveLength(1);
    expect(store.rocks.weathHunt.log[0].st).toBe('chemDom');

    // ...and the stored trial is now visible.
    const { markup } = render(store.rocks.weathHunt);
    expect(markup).toContain('Logged trials');
    expect(markup).toContain('Chemical-dominated');
  });

  it('can be cleared', () => {
    const state = Object.assign({}, STATES.mixed, { log: [{ t: 1, r: 2, p: 3, st: 'minimal' }] });
    const { store, node } = tree(state);
    const clear = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '') === '"Clear"')[0];
    expect(clear).toBeTruthy();
    clear.props.onClick();
    expect(store.rocks.weathHunt.log).toEqual([]);
  });

  it('keeps the widget a notebook, not a leaderboard', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const block = src.slice(src.indexOf("mode === 'weathHunt'"), src.indexOf('// Bottom controls'));
      // The design note pins no rate score / no reveal. The log must not sort,
      // rank or total anything.
      expect(block).not.toContain('.sort(');
      expect(block).toContain('weath_log_title');
      // And the design note itself is still shown.
      expect(block).toContain('weath_design_note');
    });
  });
});

// ── The outcrop drawing ─────────────────────────────────────────────────────
describe('weathering outcrop art', () => {
  /** The outcrop svg for a given set of slider values. */
  function outcrop(weathHunt) {
    const { markup } = render(Object.assign({ hypothesis: '', log: [] }, weathHunt));
    const anchor = markup.indexOf('viewBox="0 0 200 110"');
    expect(anchor, `no outcrop rendered for ${JSON.stringify(weathHunt)}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  // One representative setting per reachable state.
  const MINIMAL = { tempSwing: 5, rainfall: 50, pH: 7 };
  const PHYS = { tempSwing: 45, rainfall: 60, pH: 7 };
    // Limestone: the karst picture ("rounded and pitted") is limestone's; granite
  // and sandstone draw their own chemical signatures (tested above).
  const CHEM = { tempSwing: 5, rainfall: 480, pH: 3.2, rock: 'limestone' };
  const MIXED = { tempSwing: 30, rainfall: 400, pH: 4.5 };

  it('draws a different outcrop for each of the four states', () => {
    const arts = [MINIMAL, PHYS, CHEM, MIXED].map(outcrop);
    expect(new Set(arts).size).toBe(4);
    expect(arts[0]).toContain('edges stay sharp');
    expect(arts[1]).toContain('angular blocks');
    expect(arts[2]).toContain('rounded and pitted');
    expect(arts[3]).toContain('cracks and rounding');
  });

  it('does not paint acid rain a colour real acid rain does not have', () => {
    // It was lime green (#84cc16). Acid rain looks exactly like ordinary rain —
    // that you CANNOT see it is the whole point, and green rain teaches a child
    // to expect a visible warning that does not exist. The grey overcast sky
    // and the caption carry "acidic" instead.
    const chem = outcrop(CHEM);
    expect(chem).not.toContain('#84cc16');
    // Same rain as any other rain in this widget.
    const rainOf = (svg) => {
      const m = /<line[^>]*stroke="(#[0-9a-fA-F]{6})"[^>]*stroke-width="1\.[56]"/.exec(svg)
        || /<line[^>]*stroke-width="1\.[56]"[^>]*stroke="(#[0-9a-fA-F]{6})"/.exec(svg);
      return m && m[1];
    };
    expect(rainOf(chem)).toBe(rainOf(outcrop(MIXED)));
    // And the caption still says what is happening.
    expect(chem).toContain('acid dissolves it');
  });

  it('is driven ONLY by the discrete state, never by the raw slider values', () => {
    // The widget's design note pins "discrete 4-state weathering marker; no rate
    // score; no reveal — by design". Scaling crack counts or pit sizes off the
    // sliders would smuggle a continuous intensity readout back in through the
    // artwork, which is exactly what that note forbids. Two very different
    // settings that classify the same way must draw the same picture.
    const chemA = outcrop({ tempSwing: 5, rainfall: 480, pH: 3.2 });
    const chemB = outcrop({ tempSwing: 12, rainfall: 300, pH: 4.0 });
    expect(chemA).toBe(chemB);

    const physA = outcrop({ tempSwing: 45, rainfall: 60, pH: 7 });
    const physB = outcrop({ tempSwing: 50, rainfall: 20, pH: 6.8 });
    expect(physA).toBe(physB);

    // Sanity: those pairs really are different inputs reaching the same state.
    expect(chemA).not.toBe(physA);
  });

  it('keeps the caption in the same place as the state changes', () => {
    // 'minimal' sat at y=102 and the other three at y=104, so the caption
    // hopped as a student moved a slider.
    const ys = [MINIMAL, PHYS, CHEM, MIXED].map((s) => {
      const m = /<text[^>]*\by="([\d.]+)"/.exec(outcrop(s));
      return m && m[1];
    });
    expect(new Set(ys).size).toBe(1);
    expect(ys[0]).toBe('104');
  });
});

// ── Rainfall in real millimetres, places, and the trials map (2026-09-24) ──
// The rainfall slider stopped at 500 mm a year and called 200 mm "typical
// temperate": a semi-desert. It now runs 0-3000 mm; old saves (`rainfall`,
// 0-500) read as x6 and give the same result. The map shows the student's
// OWN logged trials only: this is an inquiry widget (no score, no reveal), so
// it never paints where each kind of weathering wins.
const SRC = readFileSync(ROCKS_FILE, 'utf8');
const LABEL = { chemDom: 'Chemical-dominated', physDom: 'Physical-dominated', mixed: 'Mixed weathering', minimal: 'Minimal weathering' };
const INK = { chemDom: '#6d28d9', physDom: '#b91c1c', mixed: '#0e7490', minimal: '#047857' };
const stateIn = (markup) => Object.keys(LABEL).find((k) => markup.includes(LABEL[k] + '<'));
const stateOf = (w) => stateIn(render(Object.assign({ hypothesis: '', log: [] }, w)).markup);
const PLACES = [...SRC.matchAll(/\{ id: '(\w+)', icon: '[^']*', sw: (\d+), mm: (\d+), label: __alloT\('stem\.rocks\.wx_place_/g)].map((m) => ({ id: m[1], sw: Number(m[2]), mm: Number(m[3]) }));
const mapOf = (markup) => {
  const at = markup.indexOf('data-wx-map=');
  return markup.slice(markup.indexOf('<svg', at), markup.indexOf('</svg>', at) + 6);
};

describe('rainfall in real millimetres', () => {
  it('runs 0 to 3000 mm a year, starting at a temperate 1200', () => {
    const { markup } = render(undefined);
    const input = /<input[^>]*id="wh-rainMm"[^>]*>/.exec(markup)[0];
    expect(input).toContain('min="0"');
    expect(input).toContain('max="3000"');
    expect(input).toContain('step="50"');
    expect(input).toContain('value="1200"');
    expect(markup).toContain('Desert under 250');
    expect(stateIn(markup)).toBe('mixed');
  });

  it('reads an old save the same way it read before', () => {
    let changed = 0;
    ['granite', 'limestone', 'sandstone'].forEach((rock) => [5, 20, 45].forEach((t) => [20, 200, 480].forEach((r) => [3, 5.6, 7].forEach((pH) => {
      const old = stateOf({ rock, tempSwing: t, rainfall: r, pH });
      expect(stateOf({ rock, tempSwing: t, rainMm: r * 6, pH }), rock + ' ' + t + ' ' + r + ' ' + pH).toBe(old);
      if (old !== 'minimal') changed++;
    }))));
    expect(changed).toBeGreaterThan(20);
    const shown = /<input[^>]*id="wh-rainMm"[^>]*>/.exec(render({ tempSwing: 5, rainfall: 250, pH: 7 }).markup)[0];
    expect(shown).toContain('value="1500"');
  });

  it('prefers the new field, and falls back to 1200 on junk', () => {
    const val = (w) => /id="wh-rainMm"[^>]*value="(\d+)"/.exec(render(w).markup)[1];
    expect(val({ rainMm: 2500, rainfall: 20 })).toBe('2500');
    expect(val({ rainMm: 'lots', rainfall: {} })).toBe('1200');
    expect(val({ rainMm: 99999 })).toBe('3000');
  });

  it('logs trials in millimetres, and Reset drops the old field', () => {
    const { store, node } = tree({ tempSwing: 30, rainMm: 100, pH: 5.6, log: [] });
    findAll(node, (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes('Log'))[0].props.onClick();
    expect(store.rocks.weathHunt.log).toEqual([{ t: 30, rm: 100, p: 5.6, rk: 'granite', st: 'physDom' }]);
    const t2 = tree({ tempSwing: 5, rainfall: 400, pH: 3 });
    findAll(t2.node, (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes('Reset'))[0].props.onClick();
    expect(t2.store.rocks.weathHunt.rainMm).toBe(1200);
    expect(t2.store.rocks.weathHunt.rainfall).toBe(null);
  });
});

describe('example places', () => {
  it('has four, each inside its band of the rainfall scale', () => {
    expect(PLACES.map((p) => p.id)).toEqual(['desert', 'temperate', 'mountains', 'rainforest']);
    const P = Object.fromEntries(PLACES.map((p) => [p.id, p]));
    expect(P.desert.mm).toBeLessThan(250);
    expect(P.temperate.mm).toBeGreaterThanOrEqual(600);
    expect(P.temperate.mm).toBeLessThanOrEqual(1500);
    expect(P.rainforest.mm).toBeGreaterThan(2000);
  });

  it('sets the climate with natural rain, and shows which place is on', () => {
    PLACES.forEach((p) => {
      const { store, node } = tree({ tempSwing: 3, rainMm: 50, pH: 3.5 });
      findAll(node, (n) => n.props && n.props['data-wx-place'] === p.id)[0].props.onClick();
      expect(store.rocks.weathHunt).toMatchObject({ tempSwing: p.sw, rainMm: p.mm, pH: 5.6 });
      const m = render(store.rocks.weathHunt).markup;
      const pressed = [...m.matchAll(/<button[^>]*aria-pressed="true"[^>]*data-wx-place="(\w+)"/g)].map((x) => x[1]);
      expect(pressed, p.id).toEqual([p.id]);
      // Same climate with acid rain is not that place.
      const acid = render(Object.assign({}, store.rocks.weathHunt, { pH: 4 })).markup;
      expect(acid, p.id + ' at pH 4').not.toMatch(/aria-pressed="true"[^>]*data-wx-place=/);
    });
  });

  it('puts each place well inside one result for every rock, never on a threshold', () => {
    const want = { desert: 'physDom', rainforest: 'chemDom' };
    PLACES.forEach((p) => ['granite', 'limestone', 'sandstone'].forEach((rock) => {
      const here = stateOf({ rock, tempSwing: p.sw, rainMm: p.mm, pH: 5.6 });
      if (want[p.id]) expect(here, p.id + ' ' + rock).toBe(want[p.id]);
      [[-2, 0], [2, 0], [0, -100], [0, 100]].forEach(([dt, dm]) => {
        expect(stateOf({ rock, tempSwing: p.sw + dt, rainMm: p.mm + dm, pH: 5.6 }), p.id + ' ' + rock + ' nudged ' + dt + '/' + dm).toBe(here);
      });
    }));
  });
});

describe('trials map: the student\'s own evidence, never the answer', () => {
  const x = (mm) => 46 + (mm / 3000) * 304;
  const y = (sw) => 180 - (sw / 50) * 170;

  it('draws the same map whatever the result, apart from where "you" are', () => {
    const strip = (svg) => svg.replace(/aria-label="[^"]*"/, '').replace(/<g data-wx-you=.*?<\/g>/, '');
    const maps = ['chemDom', 'physDom', 'mixed', 'minimal'].map((k) => mapOf(render(Object.assign({ log: [] }, STATES[k])).markup));
    maps.forEach((m) => expect(m).toContain('data-wx-you='));
    expect(new Set(maps.map(strip)).size).toBe(1);
    // One background, no painted regions, and an invitation to log.
    expect((maps[0].match(/<rect/g) || []).length).toBe(1);
    expect(maps[0]).toContain('data-wx-map-empty');
    expect(maps[0]).not.toContain('data-wx-trial');
  });

  it('plots each trial at its climate, numbered, in its result\'s shape and colour', () => {
    const log = [
      { t: 30, rm: 100, p: 5.6, rk: 'granite', st: 'physDom' },
      { t: 8, rm: 2800, p: 5.6, rk: 'granite', st: 'chemDom' },
      { t: 14, rm: 1300, p: 5.6, rk: 'granite', st: 'mixed' },
      { t: 2, rm: 200, p: 5.6, rk: 'granite', st: 'minimal' },
    ];
    const m = render({ tempSwing: 20, rainMm: 1200, pH: 5.6, rock: 'granite', log }).markup;
    const map = mapOf(m);
    const TAG = { physDom: '<rect', chemDom: '<circle', mixed: '<path', minimal: '<path' };
    log.forEach((e, i) => {
      const at = map.indexOf('data-wx-trial="' + (i + 1) + ':same"');
      expect(at, 'trial ' + (i + 1)).toBeGreaterThan(-1);
      const g = map.slice(at, map.indexOf('</g>', at));
      expect(g).toContain('data-wx-shape="' + e.st + '"');
      expect(g.slice(g.indexOf('<')).startsWith(TAG[e.st]), 'shape of ' + e.st).toBe(true);
      expect(g).toContain('fill="' + INK[e.st] + '"');
      expect(g).toContain('>' + (i + 1) + '</text>');
      const num = /<text x="([\d.]+)" y="([\d.]+)"/.exec(g);
      expect(Number(num[1])).toBeCloseTo(x(e.rm), 5);
      expect(Number(num[2]) - (e.st === 'minimal' ? 4 : 3)).toBeCloseTo(y(e.t), 5);
    });
    // Dots are drawn after the "you" marker, so none hides under it.
    expect(map.indexOf('data-wx-trial=')).toBeGreaterThan(map.indexOf('data-wx-you='));
    expect(map).not.toContain('data-wx-map-empty');
    expect(m).not.toContain('data-wx-hollow-note');
    // The list's badge is the dot's shape, in the same order.
    expect([...m.matchAll(/data-wx-log-badge="(\w+)"/g)].map((b) => b[1])).toEqual(log.map((e) => e.st));
    // The key uses the same shapes.
    Object.keys(TAG).forEach((k) => {
      const at = m.indexOf('data-wx-key-shape="' + k + '"');
      expect(at, k).toBeGreaterThan(-1);
      expect(m.slice(m.indexOf('>', at) + 1).startsWith(TAG[k]), 'key ' + k).toBe(true);
    });
  });

  it('draws a trial from another rock or rain pH hollow, and says so', () => {
    const log = [
      { t: 10, rm: 1500, p: 4, rk: 'limestone', st: 'chemDom' },
      { t: 10, rm: 1500, p: 5.6, rk: 'granite', st: 'minimal' },
      { t: 10, rm: 1500, p: 4, rk: 'granite', st: 'mixed' },
    ];
    const m = render({ tempSwing: 20, rainMm: 1200, pH: 5.6, rock: 'granite', log }).markup;
    const map = mapOf(m);
    expect([...map.matchAll(/data-wx-trial="(\d+):(\w+)"/g)].map((t) => t[1] + ':' + t[2])).toEqual(['1:other', '2:same', '3:other']);
    const hollow = map.slice(map.indexOf('data-wx-trial="1:other"'));
    expect(hollow.slice(0, hollow.indexOf('</g>'))).toContain('fill="#ffffff"');
    expect(m).toContain('data-wx-hollow-note');
  });

  it('reads old-scale trials onto the map, and skips broken ones', () => {
    const log = [null, 5, { t: 'x', r: 10 }, {}, { t: 45, r: 20, p: 7, st: 'physDom' }, { t: 12, rm: 'wet', st: 'mixed' }];
    const map = mapOf(render({ log }).markup);
    // Numbered by position in the log, like the list.
    expect([...map.matchAll(/data-wx-trial="(\d+):/g)].map((t) => t[1])).toEqual(['5']);
    const g = map.slice(map.indexOf('data-wx-trial="5:'));
    expect(Number(/<text x="([\d.]+)"/.exec(g)[1])).toBeCloseTo(x(120), 5);
  });

  it('sets the climate where the map is clicked, and ignores clicks off the plot', () => {
    const { store, node } = tree({ tempSwing: 20, rainMm: 1200, pH: 5.6, log: [] });
    const svg = findAll(node, (n) => n.type === 'svg' && n.props.role === 'img' && typeof n.props.onClick === 'function')[0];
    const at = (clientX, clientY) => ({ clientX, clientY, currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50, width: 720, height: 432 }) } });
    // A 2x-scaled map at (100, 50): plot point (1500 mm, 40 degrees).
    svg.props.onClick(at(100 + x(1500) * 2, 50 + y(40) * 2));
    expect(store.rocks.weathHunt).toMatchObject({ rainMm: 1500, tempSwing: 40 });
    svg.props.onClick(at(100 + 20 * 2, 50 + y(10) * 2));
    expect(store.rocks.weathHunt).toMatchObject({ rainMm: 1500, tempSwing: 40 });
  });
});

// ── The model's map is earned (2026-09-24) ─────────────────────────────────
// Evidence first (4 logged trials that got at least 2 different results), then
// the student's own explanation; only then can they compare with the model's
// answer. A teacher can open it straight away.
describe('the model map is earned', () => {
  // The rule, written out here from the widget's spec, not borrowed.
  const K = { granite: [1, 1], limestone: [2, 0.9], sandstone: [0.7, 1.25] };
  const rule = (sw, mm, ph, rock) => {
    const acid = 0.45 + Math.max(0, 7 - ph) / 6.5;
    const P = (sw / 50) * K[rock][1], C = (mm / 3000) * acid * K[rock][0];
    return C > P * 1.5 && C > 0.4 ? 'chemDom' : P > C * 1.5 && P > 0.4 ? 'physDom' : P + C > 0.5 ? 'mixed' : 'minimal';
  };
  const SHORT = { chemDom: 'Chemical wins', physDom: 'Physical wins', mixed: 'Both at work', minimal: 'Little weathering' };
  const TRIALS = [
    { t: 30, rm: 100, p: 5.6, rk: 'granite', st: 'physDom' },
    { t: 8, rm: 2800, p: 5.6, rk: 'granite', st: 'chemDom' },
    { t: 14, rm: 1300, p: 5.6, rk: 'granite', st: 'mixed' },
    { t: 35, rm: 1500, p: 5.6, rk: 'granite', st: 'physDom' },
  ];
  const WORDS = 'Wet places with small swings dissolve rock; big swings crack it.';
  const READY = { tempSwing: 14, rainMm: 1300, pH: 5.6, rock: 'granite', understood: true, explanation: WORDS, log: TRIALS };
  const gate = (m) => /data-wx-model-gate="(\w+)"/.exec(m)[1];
  const steps = (m) => [...m.matchAll(/data-wx-gate-step="(\w+:\w+)"/g)].map((s) => s[1]);
  const runsOf = (m) => [...mapOf(m).matchAll(/<rect data-wx-run="(\w+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
    .map((r) => ({ st: r[1], x: Number(r[2]), y: Number(r[3]), w: Number(r[4]), h: Number(r[5]) }));
  const toggleOf = (node) => findAll(node, (n) => n.props && n.props['data-wx-model-toggle'])[0];

  it('stays locked until there is evidence AND an explanation, whatever the save says', () => {
    const cases = [
      [{ modelOn: true }, ['evidence:todo', 'explain:todo']],
      [Object.assign({}, READY, { explanation: '', modelOn: true }), ['evidence:done', 'explain:todo']],
      [Object.assign({}, READY, { understood: false, modelOn: true }), ['evidence:done', 'explain:todo']],
      [Object.assign({}, READY, { explanation: '   too short here    ', modelOn: true }), ['evidence:done', 'explain:todo']],
      [Object.assign({}, READY, { log: TRIALS.slice(0, 3), modelOn: true }), ['evidence:todo', 'explain:done']],
      [Object.assign({}, READY, { log: TRIALS.map((e) => Object.assign({}, e, { st: 'physDom' })), modelOn: true }), ['evidence:todo', 'explain:done']],
      [Object.assign({}, READY, { log: [null, 7, {}, TRIALS[0], TRIALS[1], TRIALS[2]], modelOn: true }), ['evidence:todo', 'explain:done']],
    ];
    cases.forEach(([w, want], i) => {
      const m = render(w).markup;
      expect(gate(m), 'case ' + i).toBe('locked');
      expect(steps(m), 'case ' + i).toEqual(want);
      expect(runsOf(m), 'case ' + i).toEqual([]);
      expect(m, 'case ' + i).toContain('data-wx-model="off"');
      expect(/<button[^>]*disabled=""[^>]*data-wx-model-toggle/.test(m), 'case ' + i).toBe(true);
    });
    // The step counts what the student has done.
    expect(render(Object.assign({}, READY, { log: TRIALS.slice(0, 3) })).markup).toContain('(3 logged, 3 different)');
  });

  it('opens once both are done, and paints the rule under the student\'s dots', () => {
    const closed = render(READY).markup;
    expect(gate(closed)).toBe('open');
    expect(steps(closed)).toEqual([]);
    expect(runsOf(closed)).toEqual([]);
    const { store, node } = tree(READY);
    toggleOf(node).props.onClick();
    expect(store.rocks.weathHunt.modelOn).toBe(true);
    const m = render(store.rocks.weathHunt).markup;
    expect(m).toContain('data-wx-model="on"');
    const runs = runsOf(m);
    // 40 rows, each covering the whole plot, every cell coloured by the rule.
    const rows = {};
    runs.forEach((r) => {
      rows[r.y] = (rows[r.y] || 0) + r.w;
      const j = Math.round((180 - r.y) / 4.25) - 1;
      for (let i = Math.round((r.x - 46) / (304 / 60)); i < Math.round((r.x + r.w - 46) / (304 / 60)); i++) {
        expect(rule((j + 0.5) * 1.25, (i + 0.5) * 50, 5.6, 'granite'), 'cell ' + i + ',' + j).toBe(r.st);
      }
    });
    expect(Object.keys(rows).length).toBe(40);
    Object.values(rows).forEach((w) => expect(w).toBeCloseTo(304, 5));
    expect(new Set(runs.map((r) => r.st)).size).toBe(4);
    // The regions sit under the dots.
    expect(mapOf(m).indexOf('data-wx-run=')).toBeLessThan(mapOf(m).indexOf('data-wx-trial='));
    // ...and the toggle closes it again.
    const again = tree(store.rocks.weathHunt);
    toggleOf(again.node).props.onClick();
    expect(again.store.rocks.weathHunt.modelOn).toBe(false);
  });

  it('offers the model right under the explanation, once it is open', () => {
    const locked = render(Object.assign({}, READY, { log: TRIALS.slice(0, 2) })).markup;
    expect(locked).toContain('data-wx-explain-next="locked"');
    expect(locked).toContain('log 4 trials that get at least 2 different results');
    const { store, node } = tree(READY);
    const btn = findAll(node, (n) => n.props && n.props['data-wx-explain-next'] === 'open')[0];
    findAll(btn, (n) => n.type === 'button')[0].props.onClick();
    expect(store.rocks.weathHunt.modelOn).toBe(true);
  });

  it('locks again when the log is cleared, and Reset turns it off', () => {
    expect(runsOf(render(Object.assign({}, READY, { modelOn: true, log: [] })).markup)).toEqual([]);
    const { store, node } = tree(Object.assign({}, READY, { modelOn: true }));
    findAll(node, (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes('Reset'))[0].props.onClick();
    expect(store.rocks.weathHunt.modelOn).toBe(false);
  });

  it('opens straight away for a teacher', () => {
    const m = render({ modelOn: true, log: [] }, { isTeacherMode: true }).markup;
    expect(gate(m)).toBe('open');
    expect(m).toContain('data-wx-model-teacher');
    expect(m).not.toContain('data-wx-explain-next');
    expect(runsOf(m).length).toBeGreaterThan(40);
    expect(render({ modelOn: true, log: [] }).markup).not.toContain('data-wx-model-teacher');
  });

  it('says in words where each place lands, by the same rule', () => {
    [['granite', 5.6], ['limestone', 4.2], ['sandstone', 7]].forEach(([rock, pH]) => {
      const m = render({ modelOn: true, rock, pH, log: [] }, { isTeacherMode: true }).markup;
      const at = m.indexOf('data-wx-model-places');
      const words = m.slice(m.indexOf('>', at) + 1, m.indexOf('</p>', at)).replace(/<[^>]*>/g, '');
      PLACES.forEach((p) => {
        const label = { desert: 'Hot desert', temperate: 'Temperate lowland', mountains: 'High mountains', rainforest: 'Rainforest' }[p.id];
        expect(words, rock + ' ' + p.id).toContain(label + ': ' + SHORT[rule(p.sw, p.mm, pH, rock)]);
      });
      expect(/aria-label="[^"]*The model is shown/.test(m), rock).toBe(true);
    });
  });

  it('moves with the rock and the rain: acid rain on limestone grows the chemical region', () => {
    const area = (m, st) => runsOf(m).filter((r) => r.st === st).reduce((a, r) => a + r.w, 0);
    const granite = render({ modelOn: true, rock: 'granite', pH: 5.6, log: [] }, { isTeacherMode: true }).markup;
    const lime = render({ modelOn: true, rock: 'limestone', pH: 4.2, log: [] }, { isTeacherMode: true }).markup;
    expect(area(lime, 'chemDom')).toBeGreaterThan(area(granite, 'chemDom') * 2);
  });

  it('puts each region label inside its region, clear of every pin and dot', () => {
    let seen = 0;
    [['granite', 5.6], ['limestone', 4.2], ['sandstone', 7], ['granite', 3]].forEach(([rock, pH]) => {
      const m = render(Object.assign({}, READY, { rock, pH, modelOn: true, log: TRIALS.map((e) => Object.assign({}, e, { rk: rock, p: pH })) })).markup;
      const map = mapOf(m);
      const marks = [...map.matchAll(/<g data-wx-pin="\w+"[^>]*><circle cx="([\d.]+)" cy="([\d.]+)"/g)].map((c) => [Number(c[1]), Number(c[2]), 8.5])
        .concat([...map.matchAll(/data-wx-trial="\d+:\w+"[^>]*>.*?<text x="([\d.]+)" y="([\d.]+)"/g)].map((c) => [Number(c[1]), Number(c[2]) - 3, 6.5]));
      expect(marks.length, rock).toBe(8);
      [...map.matchAll(/<text data-wx-region="(\w+)" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)</g)].forEach((l) => {
        seen++;
        const st = l[1], cx = Number(l[2]), cy = Number(l[3]) - 3.7, hw = l[4].length * 3.1 + 3;
        [[cx - hw, cy - 7], [cx + hw, cy - 7], [cx - hw, cy + 7], [cx + hw, cy + 7], [cx, cy]].forEach(([px, py]) => {
          expect(rule((180 - py) / 170 * 50, (px - 46) / 304 * 3000, pH, rock), rock + ' ' + st + ' label corner').toBe(st);
        });
        marks.forEach(([mx, my, r]) => {
          const nx = Math.max(cx - hw, Math.min(cx + hw, mx)), ny = Math.max(cy - 7, Math.min(cy + 7, my));
          expect(Math.hypot(nx - mx, ny - my), rock + ' ' + st + ' label vs mark').toBeGreaterThanOrEqual(r);
        });
      });
    });
    expect(seen).toBeGreaterThanOrEqual(8);
  });
});
