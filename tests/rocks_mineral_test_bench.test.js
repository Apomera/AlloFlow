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

// ── The streak has to be visible on the plate ───────────────────────────────
//
// The whole premise of the streak test is that you LOOK at the powder. The
// plate was drawn at #fbfbfa — all but white — and ELEVEN of the tool's
// eighteen minerals have a White streak, painted at #f1f5f9. That is a
// luminance difference of about 0.01, so for the majority of minerals there
// was nothing to see and the student had to read the answer instead of
// observing it.
//
// Fixing it by tinting white streaks grey would have been a lie about the
// mineral. Unglazed porcelain biscuit really is an off-white grey, and a pale
// powder really does read as a deposit sitting ON the plate, so the plate is
// now the colour it actually is and the smear carries the faint shadow a real
// one has.
describe('streak plate — the powder is visible for every mineral', () => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  // Separation, not brightness. Sulfur's pale yellow sits only 0.079 from the
  // plate in luminance but is obvious on it, because the difference is hue —
  // demanding luminance alone would have forced "white-yellow" to pure white
  // and thrown away a true fact about the mineral. Straight RGB distance
  // captures both, and still fails the state this fixed: the original
  // #f1f5f9 streak on the original #fbfbfa plate scores 0.045.
  const separation = (a, b) => {
    const [x, y, z] = rgb(a), [p, q, r] = rgb(b);
    return Math.sqrt((x - p) ** 2 + (y - q) ** 2 + (z - r) ** 2);
  };

  function minerals() {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    return src.split('\n')
      .filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l))
      .map((l) => ({
        id: /\{\s*id:\s*'(\w+)'/.exec(l)[1],
        streak: /streak:\s*'([^']*)'/.exec(l)[1],
      }));
  }

  /** The streak plate svg for one mineral, found by its own viewBox. */
  function plate(id) {
    // This file's render() hands back { store, markup }, not a bare string.
    const { markup } = render({ selectedMineral: id, streakResult: true });
    const anchor = markup.indexOf('viewBox="0 0 168 80"');
    expect(anchor, `no streak plate rendered for ${id}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  it('separates every streak colour from the plate it is drawn on', () => {
    const mins = minerals();
    expect(mins.length).toBe(18);
    let checked = 0;
    mins.forEach((m) => {
      const svg = plate(m.id);
      const plateFill = /<rect[^>]*width="116"[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg);
      expect(plateFill, `${m.id}: no plate`).toBeTruthy();
      const smear = /<path[^>]*class="rk-smear"[^>]*stroke="(#[0-9a-fA-F]{6})"/.exec(svg)
        || /<path[^>]*stroke="(#[0-9a-fA-F]{6})"[^>]*class="rk-smear"/.exec(svg);
      expect(smear, `${m.id}: nothing drawn on the plate at all`).toBeTruthy();
      checked++;
      // Diamond is harder than the porcelain, so what has to be visible is the
      // GROOVE it cuts rather than a powder — it carries the same class, and
      // it has the same job of being seen.
      if (m.streak.includes('too hard')) expect(svg).toContain('plate scratched');
      const d = separation(smear[1], plateFill[1]);
      expect(d, `${m.id}: streak ${smear[1]} is invisible on plate ${plateFill[1]}`)
        .toBeGreaterThan(0.10);
    });
    // Guard against the assertion quietly covering nothing.
    expect(checked).toBe(18);
  });

  it('keeps a pale powder legible as a deposit, not as a hue', () => {
    // Hue alone cannot carry a white streak whatever colour the plate is, so
    // the smear sits on the faint shadow a real powder deposit casts.
    // Assert on what RENDERS. A React key never reaches the DOM, so keying the
    // shadow 'smearShadow' and looking for that string passes against nothing.
    const svg = plate('quartz');
    const shadow = /<path[^>]*\bd="M18,53\.4[^"]*"[^>]*stroke="([^"]+)"/.exec(svg);
    expect(shadow, 'no shadow under the smear').toBeTruthy();
    expect(shadow[1]).toMatch(/^rgba\(/);
  });

  it('does not tint a white streak to make it show up', () => {
    // The mineral's answer must stay true: quartz streaks white, and the plate
    // is what changed.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const table = src.slice(src.indexOf('var RK_STREAK_HEX = {'), src.indexOf('};', src.indexOf('var RK_STREAK_HEX = {')));
    expect(table).toContain("'White': '#ffffff'");
    // And the plate is no longer paper white.
    expect(src).not.toContain("key: 'plate', x: 4, y: 8, width: 116, height: 62, rx: 5, fill: '#fbfbfa'");
  });

  it('still shows the classic pyrite contrast', () => {
    // Brassy gold specimen, greenish-black powder — the case the whole test
    // exists to teach.
    const svg = plate('pyrite');
    expect(svg).toContain('#16301c');
    expect(svg).toContain('looks like');
    expect(svg).toContain('streak');
  });

  it('ships the same bench in both copies', () => {
    const [a, b] = PATHS.map((p) => readFileSync(p, 'utf8'));
    expect(a).toBe(b);
  });
});

// ── The scratch result has to be visible on the specimen ────────────────────
//
// Fourth appearance of the same bug. The groove was a flat #1f2937, which is
// magnetite's body colour EXACTLY, so scratching magnetite cut a groove with
// zero separation from the rock it was cut into. The softer-tool smear was a
// flat #e2e8f0, invisible on quartz, halite, calcite, talc, gypsum and diamond.
// Ten of the eighteen minerals had an unreadable result in a test whose whole
// output is the mark left behind.
describe('scratch bench — the mark is visible on every specimen', () => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const separation = (a, b) => {
    const [x, y, z] = rgb(a), [p, q, r] = rgb(b);
    return Math.sqrt((x - p) ** 2 + (y - q) ** 2 + (z - r) ** 2);
  };

  function minerals() {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    return src.split('\n')
      .filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l))
      .map((l) => ({
        id: /\{\s*id:\s*'(\w+)'/.exec(l)[1],
        hardness: parseFloat(/hardness:\s*([\d.]+)/.exec(l)[1]),
        colour: /\bcolor:\s*'([^']+)'/.exec(l)[1],
      }));
  }

  function bench(mineralId, toolId) {
    const { markup } = render({ selectedMineral: mineralId, scratchTool: toolId, scratchAnimProgress: 100 });
    const anchor = markup.indexOf('viewBox="0 0 168 118"');
    expect(anchor, `no scratch bench for ${mineralId}/${toolId}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  it('separates both the groove and the smear from the body they are drawn on', () => {
    const mins = minerals();
    expect(mins.length).toBe(18);
    let checked = 0;
    // A diamond scribe cuts everything; a fingernail cuts almost nothing. Between
    // them every mineral gets tested for both marks.
    ['diamond_scribe', 'fingernail'].forEach((tool) => {
      mins.forEach((m) => {
        const svg = bench(m.id, tool);
        const body = /<rect[^>]*width="144"[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg);
        expect(body, `${m.id}: no specimen body`).toBeTruthy();
        // The groove is 2.6 wide, the smear 3.4 — whichever this case produced.
        const mark = /<line[^>]*stroke="(#[0-9a-fA-F]{6})"[^>]*stroke-width="(?:2\.6|3\.4)"/.exec(svg)
          || /<line[^>]*stroke-width="(?:2\.6|3\.4)"[^>]*stroke="(#[0-9a-fA-F]{6})"/.exec(svg);
        expect(mark, `${m.id}/${tool}: no mark drawn at all`).toBeTruthy();
        checked++;
        expect(separation(mark[1], body[1]),
          `${m.id}/${tool}: mark ${mark[1]} is invisible on body ${body[1]}`).toBeGreaterThan(0.10);
      });
    });
    expect(checked).toBe(36);
  });

  it('was genuinely broken before — magnetite scored exactly zero', () => {
    // Guards the guard: a threshold that everything passes proves nothing.
    // #1f2937 was the literal groove colour AND magnetite's literal body.
    const magnetite = minerals().find((m) => m.id === 'magnetite');
    expect(magnetite.colour).toBe('#1f2937');
    expect(separation('#1f2937', magnetite.colour)).toBe(0);
  });

  it('keeps the Mohs captions inside the frame at both ends of the scale', () => {
    // At hardness 10 the marker lands at x=156 of a 168-wide viewBox, so
    // "mineral 10" ran off the right edge and rendered as "mineral " — on
    // diamond, whose hardness is the entire point of it.
    const texts = (svg) => [...svg.matchAll(/<text[^>]*\bx="([-\d.]+)"[^>]*>([^<]*)</g)]
      .map((m) => ({ x: parseFloat(m[1]), label: m[2] }));

    const hardest = bench('diamond', 'diamond_scribe');
    const mineralCap = texts(hardest).find((t) => t.label.startsWith('mineral'));
    expect(mineralCap.label).toBe('mineral 10');
    // Centred, ~7.5px font: half-width of "mineral 10" is about 20 units.
    expect(mineralCap.x + 20).toBeLessThanOrEqual(168);
    expect(mineralCap.x - 20).toBeGreaterThanOrEqual(0);

    const softest = bench('talc', 'fingernail');
    const talcCap = texts(softest).find((t) => t.label.startsWith('mineral'));
    expect(talcCap.label).toBe('mineral 1');
    expect(talcCap.x - 20).toBeGreaterThanOrEqual(0);
  });

  it('keeps the marker itself at the true hardness even when the caption moves', () => {
    // Clamping the caption must not lie about where the value sits.
    const svg = bench('diamond', 'diamond_scribe');
    // Mineral marker triangle is filled #7c3aed; its apex x is the true position.
    const marker = /<polygon[^>]*points="([\d.]+),[\d.]+ [^"]*"[^>]*fill="#7c3aed"/.exec(svg);
    expect(marker, 'no mineral marker').toBeTruthy();
    expect(parseFloat(marker[1])).toBeCloseTo(12 + (10 / 10) * 144, 1);
  });

  it('does not print the caption on top of the specimen', () => {
    // The specimen bar ends at y=70. At the old scaleY the caption's glyphs
    // started around y=68.5, so dark purple text sat on magnetite's near-black
    // body.
    const svg = bench('magnetite', 'diamond_scribe');
    const cap = /<text[^>]*\by="([\d.]+)"[^>]*>mineral/.exec(svg);
    expect(cap, 'no mineral caption').toBeTruthy();
    const baseline = parseFloat(cap[1]);
    // Glyph top for a 7.5px font sits roughly 5.5 above the baseline.
    expect(baseline - 5.5).toBeGreaterThan(70);
  });

  it('shares one implementation of the keep-it-visible rule', () => {
    // This bug has appeared four times. The rule lives in one place now, and
    // the rock swatch delegates to it rather than keeping a second copy.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('function rkMarkOn(mark, base, minRatio)');
    // It targets a WCAG RATIO now, not a luminance gap. The first version made
    // marks visible but left the scratch groove as low as 1.07:1 against its
    // specimen — visible, and nowhere near SC 1.4.11's 3:1.
    expect(src).toContain('function rkContrast(a, b)');
    expect(src).toContain("var grooveInk = rkMarkOn('#1f2937', body, 3.0);");
    expect(src).toContain("var edge = rkMarkOn('#0f172a', cols[0], MIN_RATIO);");
    // Still exactly one implementation — the whole point of hoisting it.
    expect([...src.matchAll(/function rkMarkOn\(/g)].length).toBe(1);
    expect([...src.matchAll(/function rkContrast\(/g)].length).toBe(1);
  });
});
