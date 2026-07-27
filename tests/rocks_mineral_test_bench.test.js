// Mineral test-bench visuals: streak plate, Mohs scratch, acid fizz.
//
// All three are classic hands-on identification tests whose whole point is that
// you LOOK at what happens. Each was a button, a progress bar and a sentence of
// result text — the tool described an observation instead of letting a student
// make one.

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

function render(rocksState) {
  const store = { rocks: Object.assign({ mode: 'minerals' }, rocksState), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup };
}

function tree(rocksState) {
  const store = { rocks: Object.assign({ mode: 'minerals' }, rocksState), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
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

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('streak plate', () => {
  it('draws an empty porcelain plate before the test runs', () => {
    const { markup } = render({ selectedMineral: 'pyrite' });
    expect(markup).toContain('unglazed porcelain');
    expect(markup).toContain('ready for testing');
  });

  it('shows the specimen colour beside the streak colour once revealed', () => {
    // Pyrite is the classic case the test exists to teach: brassy gold
    // specimen, greenish-black powder.
    const { markup } = render({ selectedMineral: 'pyrite', streakResult: 'Powder Streak Result: Greenish-black' });
    expect(markup).toContain('looks like');
    expect(markup).toContain('streak');
    expect(markup).toContain('#16301c');           // greenish-black powder
    expect(markup).toContain('greenish-black streak'); // in the aria description
    expect(markup).toContain('the powder colour is the reliable identifier');
  });

  it('shows a scratched plate, not a powder smear, when the mineral is harder', () => {
    // Diamond/corundum/topaz are harder than porcelain: the plate loses.
    const { markup } = render({ selectedMineral: 'diamond', streakResult: 'Powder Streak Result: None (too hard)' });
    expect(markup).toContain('plate scratched — no powder');
    expect(markup).toContain('scratches the plate instead');
    // No side-by-side chips, because there is no powder to compare.
    expect(markup).not.toContain('looks like');
  });
});

describe('Mohs scratch test', () => {
  function runScratch(mineralId, toolId) {
    const { store, node } = tree({ selectedMineral: mineralId, scratchTool: toolId });
    const run = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Run Scratch Test'))[0];
    expect(run, 'Run Scratch Test button').toBeTruthy();
    run.props.onClick();
    vi.advanceTimersByTime(2000);
    return render({ selectedMineral: mineralId, scratchTool: toolId, scratchAnimProgress: 100, scratchResult: store.rocks.scratchResult });
  }

  it('cuts a visible groove when the tool is hard enough', () => {
    // Steel nail (5.5) vs calcite (3) — the nail wins.
    const { markup } = runScratch('calcite', 'steel_nail');
    expect(markup).toContain('cut a groove into');
    expect(markup).toContain('Scratch created!');
  });

  it('leaves only the tool smear when the tool is softer', () => {
    // Fingernail (2.5) vs quartz (7) — the fingernail loses. Showing the tool
    // rubbing off is the observation students are told about but never saw.
    const { markup } = runScratch('quartz', 'fingernail');
    expect(markup).toContain('left only its own smear');
    expect(markup).toContain('No scratch!');
    expect(markup).not.toContain('cut a groove into');
  });

  it('plots both hardnesses on one Mohs strip so the result has a reason', () => {
    const { markup } = runScratch('quartz', 'fingernail');
    expect(markup).toContain('mineral 7');
    expect(markup).toContain('tool 2.5');
  });

  it('offers a retest instead of hiding the button after a run', () => {
    // The old condition was `animProgress === 0`, so a finished run left no way
    // to re-run without re-picking a tool.
    const { node } = tree({ selectedMineral: 'quartz', scratchTool: 'steel_nail', scratchAnimProgress: 100 });
    const again = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Test again'));
    expect(again.length).toBe(1);
  });
});

describe('acid fizz test', () => {
  it('shows the pipette staged before the drop', () => {
    const { markup } = render({ selectedMineral: 'calcite' });
    expect(markup).toContain('ready to test');
  });

  it('animates rising bubbles while the reaction runs', () => {
    const { markup } = render({ selectedMineral: 'calcite', fizzAnimActive: true });
    expect(markup).toContain('rk-bubble');
    expect(markup).toContain('releases a stream of carbon dioxide bubbles');
  });

  it('leaves the bubbles and labels the gas once the reaction settles', () => {
    const { markup } = render({ selectedMineral: 'calcite', fizzResult: 'Fizz!' });
    expect(markup).toContain('releases a stream of carbon dioxide bubbles');
    expect(markup).toContain('CO₂');
    // Bubbles are drawn but no longer animating — the class is only applied
    // while the reaction is live.
    expect(markup).toContain('#0ea5e9');
    expect(markup).not.toContain('rk-bubble');
  });

  it('shows the drop beading with no bubbles on a non-carbonate', () => {
    const { markup } = render({ selectedMineral: 'quartz', fizzResult: 'No reaction.' });
    expect(markup).toContain('no gas released');
    expect(markup).toContain('with no bubbles');
    expect(markup).not.toContain('rk-bubble');
  });
});

describe('test-bench implementation', () => {
  it('animates with CSS keyframes, not new JS timers', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const bench = src.slice(src.indexOf('function rkEnsureBenchCss'), src.indexOf('// ═══ 🔬 rocks'));
      expect(bench).toContain('@keyframes rkBubbleRise');
      expect(bench).toContain('@keyframes rkSmear');
      // No timers inside the renderers — the reduced-motion block already
      // installed above collapses CSS animations to 0.01ms for free.
      expect(bench).not.toContain('setInterval');
      expect(bench).not.toContain('setTimeout');
      // Deterministic placement, same as the specimen swatches.
      expect(bench).not.toContain('Math.random');
      expect(bench).toContain('rkSeed(');
    });
  });

  it('names the carbonate set instead of comparing an id inline', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain("var RK_CARBONATES = ['calcite'];");
      expect(src).not.toContain("if (targetId === 'calcite') {");
    });
  });

  it('gives every test-bench figure an accessible description', () => {
    // Each figure must explain the observation, not just be decoration.
    const cases = [
      [{ selectedMineral: 'pyrite', streakResult: 'x' }, 'streak, next to its outward colour'],
      [{ selectedMineral: 'calcite', fizzResult: 'x' }, 'carbon dioxide bubbles'],
      [{ selectedMineral: 'quartz', fizzResult: 'x' }, 'no bubbles'],
    ];
    cases.forEach(([state, phrase]) => {
      const { markup } = render(state);
      expect(markup, phrase).toContain(phrase);
    });
  });
});
