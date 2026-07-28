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

function mk(weathHunt) {
  const store = { rocks: { mode: 'weathHunt', weathHunt }, rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  return { store, ctx };
}

function render(weathHunt) {
  const { store, ctx } = mk(weathHunt);
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup };
}

function tree(weathHunt) {
  const { store, ctx } = mk(weathHunt);
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

// Slider settings that land in each of the four discrete states.
// physical = tempSwing/50 ; chemical = (rainfall/500) * (|pH-7|/4)
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
    expect(render(STATES.chemDom).markup).toContain('rounded and pitted');
    expect(render(STATES.mixed).markup).toContain('both signatures');
  });

  it('describes the picture for screen readers, not just labels it', () => {
    const phys = render(STATES.physDom).markup;
    expect(phys).toContain('ice-filled fractures');
    expect(phys).toContain('scree');
    const chem = render(STATES.chemDom).markup;
    expect(chem).toContain('solution hollow');
    expect(chem).toContain('dissolving');
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

  it('takes only the state as input', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('function rkWeatheringSvg(h, state)');
      expect(src).toContain('rkWeatheringSvg(h, state)');
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
    expect(markup).toContain('45');
    expect(markup).toContain('500');
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
  const CHEM = { tempSwing: 5, rainfall: 480, pH: 3.2 };
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
