// Rock Cycle transformation machine — BEHAVIOUR, not string pinning.
//
// The two bugs this locks down were both ReferenceErrors from variables that
// were declared inside the `rocks` tool body but referenced from the separately
// registered `rockCycle` tool, so nothing that only reads the source could see
// them and the render-digest goldens could not either:
//
//   • updMulti threw the instant the progress timer hit 100%. transformationAnimActive
//     was left TRUE forever → Transform button permanently disabled, progress bar
//     frozen at 100%, result panel never rendered. ("machine gets stuck")
//   • ROCKS_VOCAB threw during RENDER in the rock-cycle quiz. StemLab.renderTool
//     swallows render throws and returns null, so the whole tool blanked out.
//     ("rock cycle keeps resetting")
//
// These tests actually EXECUTE the tool: render it, invoke the real onClick
// handlers, run the timers, and assert on the resulting state.

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

/**
 * Render rockCycle against a mutable toolData store whose setToolData actually
 * applies the update — the smoke harness's stub discards it, which is precisely
 * what would hide a stuck state flag.
 */
function mountRockCycle(initialRockCycleState) {
  const store = { rocks: {}, rockCycle: Object.assign({}, initialRockCycleState) };
  const toasts = [];
  const announcements = [];

  const cfg = window.StemLab._registry.rockCycle;

  const render = () => {
    const ctx = makeCtx({
      toolData: store,
      setToolData: (fnOrObj) => {
        const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
        Object.assign(store, next);
      },
      addToast: (message, type) => { toasts.push({ message, type }); },
      announceToSR: (msg) => { announcements.push(msg); },
    });
    // Wrap so any hooks the tool body uses have a valid context.
    const Wrapper = () => cfg.render(ctx);
    return ReactDOMServer.renderToStaticMarkup(React.createElement(Wrapper));
  };

  return { store, toasts, announcements, render };
}

/** Walk a rendered React element tree collecting nodes that match a predicate. */
function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    node.forEach((n) => findAll(n, predicate, acc));
    return acc;
  }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

/** Render rockCycle to an ELEMENT tree (not markup) so handlers can be invoked. */
function treeFor(store, extras) {
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  }, extras || {}));
  return window.StemLab._registry.rockCycle.render(ctx);
}

function findButtonByText(tree, text) {
  const hits = findAll(tree, (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes(text));
  return hits[0];
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rock cycle transformation machine', () => {
  it('registers both tools from one file', () => {
    expect(window.StemLab._registry.rocks).toBeTruthy();
    expect(window.StemLab._registry.rockCycle).toBeTruthy();
  });

  it('renders without throwing on a fresh state', () => {
    const { render } = mountRockCycle({});
    expect(() => render()).not.toThrow();
  });

  // ── The "stuck" bug ──
  it('completes a run: clears the busy flag and produces a specific named result', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'shale', geologicalAgent: 'heat_pressure' } };

    const tree = treeFor(store);
    const transform = findButtonByText(tree, 'Transform!');
    expect(transform).toBeTruthy();
    expect(transform.props.disabled).toBe(false);

    transform.props.onClick();
    expect(store.rockCycle.transformationAnimActive).toBe(true);
    expect(store.rockCycle.transformationResult).toBeNull();

    // Drive the progress timer to completion. Before the fix this threw a
    // ReferenceError at 100% and left transformationAnimActive TRUE.
    vi.advanceTimersByTime(3000);

    expect(store.rockCycle.transformationAnimActive).toBe(false);
    expect(store.rockCycle.transformationProgress).toBe(100);
    expect(store.rockCycle.transformationResult).toBeTruthy();
    // Shale + heat & pressure is the classic prograde series, not "metamorphic rock".
    expect(store.rockCycle.transformationResult.product).toBe('Slate → Phyllite → Schist → Gneiss');
    expect(store.rockCycle.transformationResult.family).toBe('metamorphic');
    expect(store.rockCycle.transformationResult.conditions).toContain('200');
    expect(store.rockCycle.transformsRun).toBe(1);
  });

  it('re-enables the Transform button after a run (the stuck-forever regression)', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'limestone', geologicalAgent: 'heat_pressure' } };

    findButtonByText(treeFor(store), 'Transform!').props.onClick();
    vi.advanceTimersByTime(3000);

    const after = findButtonByText(treeFor(store), 'Transform!');
    expect(after.props.disabled).toBe(false);
    expect(store.rockCycle.transformationResult.product).toBe('Marble');
  });

  it('can be run repeatedly and counts each run', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'granite', geologicalAgent: 'weathering_erosion' } };

    for (let i = 0; i < 3; i++) {
      findButtonByText(treeFor(store), 'Transform!').props.onClick();
      vi.advanceTimersByTime(3000);
    }

    expect(store.rockCycle.transformsRun).toBe(3);
    expect(store.rockCycle.transformationAnimActive).toBe(false);
    // Granite weathers to TWO sedimentary rocks — quartz sand and clay.
    expect(store.rockCycle.transformationResult.product).toBe('Sandstone and Shale');
  });

  it('awards the cycle_interact challenge on the rocks slice after 3 runs', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'basalt', geologicalAgent: 'melting_cooling' } };

    for (let i = 0; i < 3; i++) {
      findButtonByText(treeFor(store), 'Transform!').props.onClick();
      vi.advanceTimersByTime(3000);
    }

    expect(store.rocks.cycleInteractions).toBe(3);
    expect(store.rocks.completedChallenges).toContain('cycle_interact');
    expect(store.rocks.researchPoints).toBeGreaterThan(0);
  });

  it('ignores a second click while a run is in flight', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'gneiss', geologicalAgent: 'heat_pressure' } };

    findButtonByText(treeFor(store), 'Transform!').props.onClick();
    vi.advanceTimersByTime(300);

    // Mid-run the button relabels to "Transforming..." and disables itself.
    const midRun = findButtonByText(treeFor(store), 'Transforming');
    expect(midRun).toBeTruthy();
    expect(midRun.props.disabled).toBe(true);
    midRun.props.onClick(); // must be a no-op, not a second timer

    vi.advanceTimersByTime(3000);
    expect(store.rockCycle.transformsRun).toBe(1);
    expect(store.rockCycle.transformationAnimActive).toBe(false);
  });

  it('resolves every specimen/agent pairing to a distinct, named product', () => {
    const specimens = ['granite', 'basalt', 'sandstone', 'limestone', 'shale', 'slate', 'marble', 'gneiss'];
    const agents = ['melting_cooling', 'heat_pressure', 'weathering_erosion'];
    const expectedFamily = { melting_cooling: 'igneous', heat_pressure: 'metamorphic', weathering_erosion: 'sedimentary' };

    specimens.forEach((sp) => {
      agents.forEach((ag) => {
        const store = { rocks: {}, rockCycle: { startingRock: sp, geologicalAgent: ag } };
        findButtonByText(treeFor(store), 'Transform!').props.onClick();
        vi.advanceTimersByTime(3000);

        const r = store.rockCycle.transformationResult;
        expect(r, `${sp} + ${ag}`).toBeTruthy();
        expect(r.family, `${sp} + ${ag} family`).toBe(expectedFamily[ag]);
        // Every cell carries real teaching content, not a placeholder.
        expect(r.product.length, `${sp} + ${ag} product`).toBeGreaterThan(3);
        expect(r.conditions.length, `${sp} + ${ag} conditions`).toBeGreaterThan(5);
        expect(r.change.length, `${sp} + ${ag} change`).toBeGreaterThan(40);
        expect(r.evidence.length, `${sp} + ${ag} evidence`).toBeGreaterThan(20);
        expect(Array.isArray(r.stages) && r.stages.length === 4, `${sp} + ${ag} stages`).toBe(true);
      });
    });
  });

  it('flags the carbonate melting simplification instead of asserting it', () => {
    ['limestone', 'marble'].forEach((sp) => {
      const store = { rocks: {}, rockCycle: { startingRock: sp, geologicalAgent: 'melting_cooling' } };
      findButtonByText(treeFor(store), 'Transform!').props.onClick();
      vi.advanceTimersByTime(3000);
      expect(store.rockCycle.transformationResult.caveat, sp).toMatch(/decarbonation|CO₂/);
    });
  });

  it('reset clears the result and the busy flag', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'sandstone', geologicalAgent: 'heat_pressure' } };

    findButtonByText(treeFor(store), 'Transform!').props.onClick();
    vi.advanceTimersByTime(3000);
    expect(store.rockCycle.transformationResult.product).toBe('Quartzite');

    const resetBtn = findAll(treeFor(store), (n) => n.type === 'button' && n.props['aria-label'] === 'Reset machine')[0];
    expect(resetBtn).toBeTruthy();
    resetBtn.props.onClick();

    expect(store.rockCycle.transformationResult).toBeNull();
    expect(store.rockCycle.transformationAnimActive).toBe(false);
    expect(store.rockCycle.transformationProgress).toBe(0);
  });

  it('migrates state saved by the old family-based machine', () => {
    // The previous machine stored a rock FAMILY where a specimen id now lives.
    ['igneous', 'sedimentary', 'metamorphic'].forEach((legacy) => {
      const store = { rocks: {}, rockCycle: { startingRock: legacy, geologicalAgent: 'heat_pressure' } };
      expect(() => treeFor(store)).not.toThrow();
      findButtonByText(treeFor(store), 'Transform!').props.onClick();
      vi.advanceTimersByTime(3000);
      expect(store.rockCycle.transformationResult, legacy).toBeTruthy();
    });
  });

  it('ignores a result saved by the old machine instead of printing undefined', () => {
    // Persisted tool data can carry the previous { id, desc } result shape.
    const store = {
      rocks: {},
      rockCycle: {
        startingRock: 'granite',
        geologicalAgent: 'heat_pressure',
        transformationResult: { id: 'metamorphic', desc: 'Buried deep, intense heat...' },
      },
    };

    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))
    );

    expect(markup).not.toContain('undefined');
    // ...and the machine is still usable rather than showing a broken panel.
    expect(findButtonByText(treeFor(store), 'Transform!').props.disabled).toBe(false);
  });

  it('renders the SVG scene with textured swatches', () => {
    const store = { rocks: {}, rockCycle: { startingRock: 'shale', geologicalAgent: 'heat_pressure' } };
    findButtonByText(treeFor(store), 'Transform!').props.onClick();
    vi.advanceTimersByTime(3000);

    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))
    );

    expect(markup).toContain('<svg');
    // Input (foliated/clastic shale) and product both drawn, with clip paths.
    expect(markup).toContain('rcclip-in');
    expect(markup).toContain('rcclip-out');
    // Progress bar exposes its value.
    expect(markup).toContain('role="progressbar"');
    // No CSS var() in SVG attributes — they render black there.
    const svgChunk = markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>'));
    expect(svgChunk).not.toContain('var(--');
  });

  // ── The "resetting" bug ──
  it('renders the rock-cycle quiz concept panel without blanking the tool', () => {
    // ROCKS_VOCAB was out of scope here; this render threw and renderTool
    // returned null, which is what made the tool appear to reset itself.
    const store = {
      rocks: {},
      rockCycle: {
        rcQuiz: {
          q: 'Which rock type forms from cooled magma/lava?',
          a: 'Igneous',
          opts: ['Igneous', 'Sedimentary', 'Metamorphic'],
          concept: 'Igneous',
          wrongFeedback: ['Correct!', 'No.', 'No.'],
          answered: true,
          chosen: 'Igneous',
          chosenIdx: 0,
          score: 1,
        },
      },
    };

    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    let markup;
    expect(() => {
      markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))
      );
    }).not.toThrow();

    expect(markup).toContain('Concept Focus');
    expect(markup).toContain('cooling and solidification of molten magma');
  });

  it('studying a term from the rock-cycle quiz credits the rocks slice', () => {
    const store = {
      rocks: {},
      rockCycle: {
        rcQuiz: {
          q: 'q', a: 'Igneous', opts: ['Igneous'], concept: 'Igneous',
          answered: true, chosen: 'Igneous', chosenIdx: 0, score: 1,
        },
      },
    };

    const studyBtn = findAll(treeFor(store), (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Study Term'))[0];
    expect(studyBtn).toBeTruthy();
    expect(() => studyBtn.props.onClick()).not.toThrow();
    expect(store.rocks.vocabLookedUp).toContain('Igneous');
  });

  it('passes toast messages as strings, never objects', () => {
    const toasts = [];
    const store = { rocks: {}, rockCycle: { startingRock: 'granite', geologicalAgent: 'heat_pressure' } };

    for (let i = 0; i < 3; i++) {
      const tree = treeFor(store, { addToast: (message, type) => toasts.push({ message, type }) });
      findButtonByText(tree, 'Transform!').props.onClick();
      vi.advanceTimersByTime(3000);
    }

    expect(toasts.length).toBeGreaterThan(0);
    toasts.forEach((t) => {
      expect(typeof t.message).toBe('string');
      expect(t.message).not.toContain('[object Object]');
    });
  });
});

// ── The eight specimens have to look like eight rocks ───────────────────────
//
// rcSwatch takes its colour from the FAMILY and its pattern from the TEXTURE,
// so two rocks sharing both draw the identical picture. Sandstone and shale
// were both tagged sedimentary/clastic — two of the eight things a student
// chooses between were the same image, under notes that describe different
// rocks ("visible bedding" vs "splits into thin sheets"). The sibling rocks
// tool had already separated them; the rock cycle's vocabulary was coarser.
describe('rock cycle specimen art', () => {
  const readSrc = () => readFileSync(ROCKS_FILE, 'utf8');

  /** The IN swatch for one specimen, found by its own clip id — never by position. */
  function inSwatch(specId) {
    const store = { rocks: {}, rockCycle: { mode: 'machine', startingRock: specId } };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))
    );
    const anchor = markup.indexOf('rcclip-in');
    expect(anchor, `no IN swatch rendered for ${specId}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  function specimens() {
    const src = readSrc();
    const block = src.slice(src.indexOf('var RC_SPECIMENS = ['), src.indexOf('var RC_AGENTS'));
    return [...block.matchAll(/\{ id: '(\w+)',\s*label: '([^']+)',\s*family: '(\w+)',\s*texture: '(\w+)'/g)]
      .map((m) => ({ id: m[1], label: m[2], family: m[3], texture: m[4] }));
  }

  it('draws a different picture for every specimen', () => {
    const specs = specimens();
    expect(specs.length).toBe(8);
    const seen = new Map();
    specs.forEach((s) => {
      const svg = inSwatch(s.id);
      const clash = seen.get(svg);
      expect(clash, `${s.id} and ${clash} draw the identical swatch`).toBeUndefined();
      seen.set(svg, s.id);
    });
    expect(seen.size).toBe(8);
  });

  it('separates shale from sandstone, which is what their notes describe', () => {
    const specs = specimens();
    const byId = Object.fromEntries(specs.map((s) => [s.id, s]));
    expect(byId.shale.texture).toBe('finelayered');
    expect(byId.sandstone.texture).toBe('clastic');
    // Fissility drawn as more, thinner partings than sandstone's bedding.
    const count = (svg) => (svg.match(/<line\b/g) || []).length;
    expect(count(inSwatch('shale'))).toBeGreaterThan(count(inSwatch('sandstone')));
  });

  it('handles by name every texture the data asks for', () => {
    // rcSwatch's final branch is BOTH the nonfoliated renderer and the
    // catch-all, so an unhandled texture silently draws a marble-like mosaic
    // with no error — a typo would look like a deliberate rock.
    const src = readSrc();
    const block = src.slice(src.indexOf('var RC_SPECIMENS = ['), src.indexOf('var RC_FAMILY_COLORS'));
    const requested = new Set([...block.matchAll(/texture:\s*'([^']+)'/g)].map((m) => m[1]));
    expect(requested.size).toBeGreaterThan(5);

    const fn = src.slice(src.indexOf('var rcSwatch = function'), src.indexOf('var RC_FAMILY_TEXTURE'));
    requested.forEach((t) => {
      // 'nonfoliated' is the one legitimately reached via the else.
      if (t === 'nonfoliated') return;
      expect(fn, `rcSwatch has no branch for texture "${t}" — it would fall through`)
        .toContain("texture === '" + t + "'");
    });
  });

  it('keeps the catch-all documented as a catch-all', () => {
    const src = readSrc();
    expect(src).toContain('this is also the catch-all');
  });
});
