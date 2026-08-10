// Nuclear & Radiation Lab — colour contrast, measured not eyeballed.
//
// This is the half of accessibility the axe suite explicitly cannot cover:
// running in jsdom with no stylesheet, its colour-contrast rule would be
// judging default black-on-transparent, so that suite disables the rule and
// this one takes it. Here the tool's own hard-coded hex values are read out of
// the source and measured against the card backgrounds it actually paints,
// in both themes, with the WCAG 2.1 relative-luminance formula.
//
// The defect this was written for: the accent palette was picked against the
// DARK card and reused verbatim on the light one, where 22 of 24 text colours
// came out below 4.5:1 — every section heading among them.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const SRC = fs.readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

// The two card backgrounds, composited over the page beneath them:
// dark  card() paints rgba(15,23,42,0.72) over the slate page,
// light card() paints rgba(255,255,255,0.92) over a near-white page.
const DARK_BG = [15, 23, 42];
const LIGHT_BG = [253, 253, 254];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const a = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const ratio = (fg, bg) => {
  const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Every glyph in this tool is 10–14px, i.e. "normal text" under WCAG. The
// 3:1 large-text allowance never applies here, so AA is 4.5:1 throughout.
const AA = 4.5;

function inkTable() {
  const start = SRC.indexOf('var NK_INK = {');
  expect(start, 'NK_INK table not found').toBeGreaterThan(-1);
  const end = SRC.indexOf('\n  };', start);
  const body = SRC.slice(start + 'var NK_INK = '.length, end + 4);
  return new Function('return ' + body.replace(/\/\/[^\n]*/g, ''))();
}

describe('the ink table itself', () => {
  const INK = inkTable();

  it('gives every accent a readable ink in BOTH themes', () => {
    const failures = [];
    for (const [accent, [dk, lt]] of Object.entries(INK)) {
      const rd = ratio(hex(dk), DARK_BG);
      const rl = ratio(hex(lt), LIGHT_BG);
      if (rd < AA) failures.push(`${accent} dark -> ${dk} = ${rd.toFixed(2)}:1`);
      if (rl < AA) failures.push(`${accent} light -> ${lt} = ${rl.toFixed(2)}:1`);
    }
    expect(failures, 'below WCAG AA 4.5:1:\n  ' + failures.join('\n  ')).toEqual([]);
  });

  it('actually changes the colour where the raw accent would have failed', () => {
    // A table that mapped everything to itself would pass the test above on
    // the dark side and quietly reintroduce the bug on the light side.
    let remapped = 0;
    for (const [accent, [, lt]] of Object.entries(INK)) {
      if (ratio(hex(accent), LIGHT_BG) < AA) {
        expect(lt.toLowerCase(), accent + ' failing on light was left unmapped').not.toBe(accent.toLowerCase());
        remapped++;
      }
    }
    expect(remapped).toBeGreaterThan(15);
  });
});

describe('the source uses it', () => {
  it('routes every section heading through ink()', () => {
    // A raw hex reaching heading() is the exact regression this guards.
    const raw = [...SRC.matchAll(/heading\('(#[0-9a-fA-F]{6})'/g)].map((m) => m[1]);
    expect(raw, 'heading() called with a raw accent instead of ink()').toEqual([]);
    const inked = [...SRC.matchAll(/heading\(ink\('#[0-9a-fA-F]{6}'\)/g)];
    expect(inked.length).toBeGreaterThanOrEqual(15);
  });

  it('leaves no bare accent hex in a text-colour position', () => {
    // Scoped to the render body on purpose. Above it, `color:` is a DATA field
    // on the reactor-parts table, not a CSS property — inking those put an
    // ink() call at module scope where the helper does not exist, which
    // check_free_vars caught as a ReferenceError before it could ship.
    const RENDER = SRC.slice(SRC.indexOf('    render: function (ctx) {'));
    expect(RENDER.length).toBeGreaterThan(1000);
    // '#0b1020' and '#fff' are text ON an accent background, not on the card,
    // so they are measured against that accent in the rendered pass below.
    const ALLOWED = new Set(['#0b1020', '#ffffff', '#fff']);
    const bare = [...RENDER.matchAll(/color: '(#[0-9a-fA-F]{6})'/g)]
      .map((m) => m[1])
      .filter((c) => !ALLOWED.has(c.toLowerCase()));
    expect([...new Set(bare)], 'un-inked text colours').toEqual([]);
  });

  // The reactor panel is the one surface that opts out of the theme: it paints
  // its own #0b1120 in both light and dark, because it is a control panel
  // rather than a document. That means ink() does not apply to it and the
  // rendered-DOM pass cannot see it either — the colours are arguments to
  // fillText inside an animation loop. So its palette is measured here,
  // against its own background, straight out of the source.
  //
  // This replaces a Playwright pixel probe that sampled glyph rows and reported
  // 1.09:1. That number was anti-aliased glyph EDGES, not text: on a near-black
  // panel almost every partly-lit pixel clears a background-relative threshold,
  // so the probe was measuring font smoothing and calling it legibility.
  describe('the reactor panel, which paints its own background', () => {
    const PANEL_BG = [11, 17, 32];             // #0b1120, set by the draw loop
    const rgba = (v) => {
      const m = /^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/.exec(v.replace(/\s/g, ''));
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
      const h = /^#([0-9a-fA-F]{6})$/.exec(v);
      return h ? [...hex('#' + h[1]), 1] : null;
    };
    const flat = (c) => [0, 1, 2].map((i) => Math.round(c[i] * c[3] + PANEL_BG[i] * (1 - c[3])));

    it('keeps every text colour in the draw loop above AA', () => {
      const a = SRC.indexOf('function draw(ts) {');
      // The loop now parks completely when idle; slice to the observer setup
      // that follows draw() rather than relying on a tail RAF call.
      const b = SRC.indexOf("var ro = typeof ResizeObserver", a);
      expect(a, 'reactor draw loop not found').toBeGreaterThan(-1);
      expect(b, 'reactor loop tail not found').toBeGreaterThan(a);
      const loop = SRC.slice(a, b);

      // Only fillStyle values that are followed by a fillText before the next
      // fillStyle — i.e. the ones that actually colour glyphs. Line and bar
      // colours have no contrast requirement.
      const inks = [];
      const re = /c\.fillStyle = '([^']+)';/g;
      let m;
      while ((m = re.exec(loop))) {
        const rest = loop.slice(m.index + m[0].length);
        const nextFill = rest.search(/c\.fillStyle = /);
        const nextText = rest.search(/c\.fillText\(/);
        if (nextText !== -1 && (nextFill === -1 || nextText < nextFill)) inks.push(m[1]);
      }
      expect(inks.length, 'no text inks found — did the loop change shape?').toBeGreaterThan(4);

      const bad = [];
      for (const v of new Set(inks)) {
        const c = rgba(v);
        if (!c) continue;
        const r = ratio(flat(c), PANEL_BG);
        if (r < AA) bad.push(`${v} = ${r.toFixed(2)}:1`);
      }
      expect(bad, 'reactor readouts below AA on their own panel:\n  ' + bad.join('\n  ')).toEqual([]);
    });

    it('scales the power trace so an excursion is visible rather than clipped', () => {
      // hist is clamped to 200%, and the trace used to map 200 onto y=0 — the
      // very top pixel — so a real excursion drew itself flat along the canvas
      // edge and read as "power stopped rising". The band must leave headroom,
      // and the panel must say the true figure when it is off scale.
      expect(SRC).toMatch(/var plotTop = 26 \* dpr, plotBot = H - 46 \* dpr;/);
      expect(SRC).toMatch(/off scale — /);
      expect(SRC, 'the trace still maps power onto the raw canvas height').not.toMatch(/var gy = H \* 0\.62;/);
    });
  });

  // Written after typing this exact mistake twice: once inherited from the
  // original palette, once reintroduced by copying a neighbouring line into a
  // new section. The rendered-DOM pass below catches it, but only for text
  // that happens to be on a surface under test — and it reports a colour, not
  // a cause. Name the bad spelling directly so the next copy-paste fails fast.
  it('never spells the muted pair the wrong way round', () => {
    // slate-500 on the DARK card and slate-400 on the LIGHT one: the dim
    // colour on the dim background, in both themes.
    expect(SRC, "inverted muted pair — should be isDark ? '#94a3b8' : '#475569'")
      .not.toContain("isDark ? '#64748b' : '#94a3b8'");
    // slate-400 anywhere on the light theme is 2.5:1 and never passes.
    expect(SRC, 'slate-400 used as light-theme text').not.toMatch(/isDark \? '#[0-9a-f]{6}' : '#94a3b8'/);
  });

  it('never inks a border, a fill or a 3D material', () => {
    // ink() is for text. Borders and bars have no contrast requirement, and
    // remapping them would change the design for no accessibility gain.
    expect(SRC).not.toMatch(/borderColor: ink\(/);
    expect(SRC).not.toMatch(/background: ink\(/);
    expect(SRC).not.toMatch(/THREE\.Color\(ink/);
    expect(SRC).not.toMatch(/ink\(ink\(/);
  });
});

// ── Measured on the rendered DOM, not guessed from the source ─────────────
// Reading accents out of the source and assuming each is a pill background
// over-collects badly: every `colour:` field in a data table looks like a pill
// accent, and most are bar fills that never sit behind text. So render the
// thing and measure the pairs that actually occur — compositing each element's
// rgba background down onto whatever is behind it, exactly as a browser would.

function parseColor(v) {
  if (!v) return null;
  let m = /^#([0-9a-fA-F]{6})$/.exec(v.trim());
  if (m) return [...hex('#' + m[1]), 1];
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(v.trim());
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null;
}
const over = (fg, bg) => [0, 1, 2].map((i) => Math.round(fg[i] * fg[3] + bg[i] * (1 - fg[3])));

function resolveBg(el, root, pageRgb) {
  const chain = [];
  for (let c = el; c && c !== root.parentNode; c = c.parentElement) chain.push(c);
  chain.reverse();
  let bg = pageRgb;
  for (const node of chain) {
    const raw = node.style.background || node.style.backgroundColor;
    if (!raw) continue;
    if (/gradient/i.test(raw)) return null;   // unmeasurable statically; skipped
    const c = parseColor(raw);
    if (c) bg = over(c, bg);
  }
  return bg;
}

describe('every rendered text/background pair', () => {
  const SURFACES = [
    ['dark, first load', {}, undefined, [15, 23, 42]],
    ['light, first load', {}, { theme: 'light' }, [248, 250, 252]],
    ['dark, everything open', {
      chainPick: 6, enrPick: 5, dosePick: 7, incidentId: 'chernobyl', reactorId: 'smr',
      wrId: 'alpha', wtId: 'lung', bioId: 'cs137', rods: 10,
      cdSrc: 'cs137', cdRuns: [{ g: 900, b: 250, t: 600, d: 5, s: 'cs137' }],
    }, undefined, [15, 23, 42]],
    ['light, everything open', {
      chainPick: 6, enrPick: 5, dosePick: 7, incidentId: 'chernobyl', reactorId: 'smr',
      wrId: 'alpha', wtId: 'lung', bioId: 'cs137', rods: 10,
      cdSrc: 'cs137', cdRuns: [{ g: 900, b: 250, t: 600, d: 5, s: 'cs137' }],
    }, { theme: 'light' }, [248, 250, 252]],
  ];

  for (const [name, state, ctx, page] of SURFACES) {
    it(name + ' meets WCAG AA 4.5:1', async () => {
      const { loadTool, renderTool, resetStemLab } = await import('./helpers/stem_widgets_smoke_harness.js');
      resetStemLab();
      loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
      const host = document.createElement('div');
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state }, ctx);

      const failures = [];
      let checked = 0;
      for (const el of host.querySelectorAll('*')) {
        const fg = parseColor(el.style.color);
        if (!fg || fg[3] === 0) continue;
        // Only elements holding their own visible text.
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
        if (!own) continue;
        if (el.getAttribute('aria-hidden') === 'true') continue;
        const bg = resolveBg(el, host, page);
        if (!bg) continue;
        checked++;
        const r = ratio(over(fg, bg), bg);
        if (r < AA) {
          failures.push(`${r.toFixed(2)}:1  ${el.style.color} on rgb(${bg})  "${own.slice(0, 42)}"`);
        }
      }
      expect(checked, 'nothing was measured — the walk is broken').toBeGreaterThan(40);
      const uniq = [...new Set(failures)];
      expect(uniq, `${name}: ${uniq.length} pairs below AA:\n  ` + uniq.join('\n  ')).toEqual([]);
    // Renders a full surface and walks every element on it, four times over.
    // That is real work; relying on vitest's 5 s default made it fall over the
    // moment the machine was busy with a browser suite, which is a flake rather
    // than a finding.
    }, 60000);
  }
});
