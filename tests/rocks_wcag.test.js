// WCAG 2.1 A/AA invariants for the two rock tools.
//
// A live axe-core sweep over all 20 views is in dev-tools/wcag_audit_rocks.cjs
// and reports zero violations, but it needs Chromium so it cannot run here.
// These are the invariants that DID break, pinned so they cannot break again,
// plus the two whole classes axe cannot see at all:
//
//   * axe reads CSS colours. These tools draw almost everything in inline SVG,
//     and axe does not evaluate SVG <text> contrast — the porcelain-plate hint
//     sat at 3.78:1 and the machine's prompt at 2.36:1 with axe reporting clean.
//   * SC 1.4.11 (non-text contrast) applies to the graphics themselves, which
//     no automated DOM checker evaluates.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';

const srgb = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const x = srgb(a), y = srgb(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** `fg` at `alpha` composited over `bg`. */
const over = (fg, alpha, bg) => {
  const F = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16));
  const B = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return '#' + F.map((v, i) => {
    const o = Math.round(v * alpha + B[i] * (1 - alpha));
    return (o < 16 ? '0' : '') + o.toString(16);
  }).join('');
};

const src = () => readFileSync(ROCKS_FILE, 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('WCAG 1.4.3 — text contrast on the surfaces it is actually drawn on', () => {
  it('keeps every rock-type ink readable on its own tinted chip, not just on white', () => {
    // The chip paints `color + "20"` behind `ink`. Checking ink against WHITE —
    // which the older test did — passed sedimentary at 4.92:1 while the chip it
    // actually sits on gave 4.48:1. Same class as the two data-driven-colour
    // rounds before it: verified on one surface, used on another.
    const s = src();
    const rows = [...s.matchAll(/(\w+): \{ label: t\('stem\.rocks\.\w+'\), icon: '[^']*', color: '(#[0-9a-f]{6})', ink: '(#[0-9a-f]{6})'/g)];
    expect(rows.length).toBe(3);
    rows.forEach((m) => {
      const chip = over(m[2], 0x20 / 255, '#ffffff');
      expect(ratio(m[3], chip), `${m[1]} ink ${m[3]} on its chip ${chip}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps every rock-cycle family ink readable on its own tinted chip', () => {
    const s = src();
    const rows = [...s.matchAll(/id: '(\w+)', label: t\('stem\.rocks\.\w+'\), emoji: '[^']*', color: '(#[0-9a-f]{6})', glow: '#[0-9a-f]{6}', ink: '(#[0-9a-f]{6})'/g)];
    expect(rows.length).toBe(3);
    rows.forEach((m) => {
      const chip = over(m[2], 0x15 / 255, '#ffffff');
      expect(ratio(m[3], chip), `${m[1]} ink ${m[3]} on its chip ${chip}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps the SVG labels readable on the surfaces they sit on', () => {
    // Three of these failed and axe reported the pages clean, because axe does
    // not evaluate SVG text.
    const s = src();
    const PAIRS = [
      ['#57534e', '#e8e5de', 'streak-plate hint on the porcelain'],
      ['#cbd5e1', '#0f172a', 'machine prompt on the dark chamber'],
      ['#64748b', '#ffffff', 'unknown-product placeholder on white'],
      ['#f8fafc', '#6b5b45', 'weathering caption on the ground band'],
    ];
    PAIRS.forEach(([fg, bg, what]) => {
      expect(ratio(fg, bg), what).toBeGreaterThanOrEqual(4.5);
      expect(s, what + ' — colour no longer present').toContain(fg);
    });
  });
});

describe('WCAG 1.4.11 — non-text contrast on the graphics that carry meaning', () => {
  function helpers() {
    const s = src();
    const grab = (n) => {
      const at = s.indexOf('function ' + n + '(');
      let d = 0, i = s.indexOf('{', at);
      for (; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { d--; if (d === 0) break; } }
      return s.slice(at, i + 1);
    };
    return new Function(grab('rkSrgbLum') + grab('rkContrast') + grab('rkMixToward') + grab('rkMarkOn')
      + 'return { markOn: rkMarkOn, contrast: rkContrast };')();
  }

  it('computes a real WCAG ratio, not a luminance gap', () => {
    // The first version of this rule measured luminance DIFFERENCE, which is a
    // different quantity: it left the scratch groove at 1.07:1 on olivine while
    // reporting the gap as satisfied.
    const h = helpers();
    expect(h.contrast('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(h.contrast('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(h.contrast('#777777', '#888888')).toBeLessThan(1.5);
  });

  it('gives every scratch result 3:1 against its own specimen', () => {
    const h = helpers();
    const rows = src().split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    expect(rows.length).toBe(18);
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const body = /\bcolor:\s*'([^']+)'/.exec(l)[1];
      [['groove', '#1f2937'], ['smear', '#e2e8f0']].forEach(([what, base]) => {
        const outCol = h.markOn(base, body, 3.0);
        expect(h.contrast(outCol, body), `${id} ${what} on ${body}`).toBeGreaterThanOrEqual(2.99);
      });
    });
  });

  it('gives every rock texture a 3:1 boundary WITHOUT repainting the grain', () => {
    // The trade-off that matters. Forcing 3:1 onto the FILL repainted 51 of 60
    // grain colours — sandstone's quartz went dark brown, rhyolite's pale
    // phenocrysts black — and on an identification tool the grain colour IS the
    // information, which is the "essential presentation" 1.4.11 excepts. The
    // boundary carries the contrast instead.
    const h = helpers();
    const s = src();
    const block = s.slice(s.indexOf('const ROCKS = ['), s.indexOf('const MINERALS = ['));
    const rocks = block.split('\n').filter((l) => /\{ id: '/.test(l) && l.includes('desc:'));
    expect(rocks.length).toBe(20);
    rocks.forEach((l) => {
      const id = /\{ id: '(\w+)'/.exec(l)[1];
      const cols = [...(/grainColors:\s*\[([^\]]*)\]/.exec(l)[1]).matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0]);
      const edge = h.markOn('#0f172a', cols[0], 3.0);
      expect(h.contrast(edge, cols[0]), `${id} mark boundary`).toBeGreaterThanOrEqual(2.99);
      // ...and nothing pushed the grain colours themselves around.
      expect(s).toContain('var separate = function (hex) { return hex; };');
    });
  });

  it('keeps obsidian conchoidal ripples visible on black glass', () => {
    // Conchoidal fracture is obsidian's diagnostic, so the ripples are a
    // graphic required to understand the content. The old alpha ramp faded the
    // outermost ring to 2.44:1.
    for (let i = 1; i <= 7; i++) {
      const alpha = 0.62 - i * 0.024;
      const composited = over('#c6dcff', alpha, '#0f0f0f');
      expect(ratio(composited, '#0f0f0f'), `ripple ${i} at alpha ${alpha.toFixed(3)}`).toBeGreaterThanOrEqual(3);
    }
    expect(src()).toContain('(0.62 - i * 0.024)');
  });
});

describe('WCAG 1.1.1 / 2.4.7 / 2.3.3 — alternatives, focus and motion', () => {
  function render(toolId, state) {
    const store = { rocks: {}, rockCycle: {} };
    store[toolId] = state;
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    return ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry[toolId].render(ctx))
    );
  }

  it('gives every informative SVG a name and hides the decorative ones', () => {
    ['rocks', 'minerals', 'weathHunt'].forEach((mode) => {
      const markup = render('rocks', { mode });
      const svgs = markup.match(/<svg[^>]*>/g) || [];
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((tag) => {
        const named = /aria-label="/.test(tag) || /role="img"/.test(tag);
        const hidden = /aria-hidden="true"/.test(tag);
        expect(named || hidden, `unlabelled svg in ${mode}: ${tag.slice(0, 90)}`).toBe(true);
      });
    });
  });

  it('never removes a focus outline without replacing it', () => {
    const s = src();
    const stripped = (s.match(/outline-none/g) || []).length;
    const rings = (s.match(/focus:ring/g) || []).length;
    expect(stripped).toBeGreaterThan(0);
    expect(rings, 'every outline-none needs a visible replacement').toBeGreaterThanOrEqual(stripped);
  });

  it('honours prefers-reduced-motion in the CSS and in every animation loop', () => {
    const s = src();
    expect(s).toContain('prefers-reduced-motion: reduce');
    // Both canvas loops and the transformation machine each read the setting,
    // rather than relying on the CSS block that only reaches keyframes.
    expect([...s.matchAll(/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/g)].length)
      .toBeGreaterThanOrEqual(3);
  });

  it('gives the 3D viewer keyboard equivalents for every drag gesture', () => {
    const markup = render('rocks', { mode: 'minerals', selectedMineral: 'halite' });
    ['Rotate left', 'Rotate right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Reset view']
      .forEach((label) => expect(markup, label).toContain(label));
  });
});

describe('i18n — a missing key must not render as nothing', () => {
  // Two different call shapes live in this tool and they fail differently:
  //
  //   __alloT('key', 'English')  — a wrapper; falls back to the English literal
  //   t('key')                   — the host's t DIRECTLY, with no fallback
  //
  // The host's t returns undefined for a key it cannot resolve, and React
  // renders undefined as nothing. So a bare t() whose key is absent is a
  // silently blank rock label, mineral name or quiz option — no error, no
  // warning off localhost, just a gap where a word should be. Every rock and
  // mineral name in this tool goes through the bare form.
  it('resolves every bare t() key in ui_strings.js', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const ui = readFileSync('ui_strings.js', 'utf8');

    const bare = new Set();
    const re = /(^|[^A-Za-z_$.])t\(\s*'([^']+)'\s*\)/g;
    let m;
    while ((m = re.exec(src))) bare.add(m[2]);
    // Guard against the extraction silently matching nothing.
    expect(bare.size).toBeGreaterThan(40);

    const resolves = (key) => {
      const parts = key.split('.');
      const leaf = parts[parts.length - 1];
      const group = parts[parts.length - 2];
      const gi = ui.indexOf('"' + group + '": {');
      if (gi < 0) return false;
      let depth = 0, i = ui.indexOf('{', gi), end = i;
      for (; i < ui.length; i++) {
        if (ui[i] === '{') depth++;
        else if (ui[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      const block = ui.slice(gi, end);
      const safe = leaf.replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);
      return new RegExp('"' + safe + '"\\s*:').test(block);
    };

    const missing = [...bare].filter((k) => !resolves(k)).sort();
    expect(missing, 'bare t() keys with no entry — these render as nothing').toEqual([]);
  });

  it('gives every __alloT call an English fallback', () => {
    // The wrapper only saves you if a fallback was actually passed; a one-arg
    // __alloT degrades to returning the key string itself.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const oneArg = [...src.matchAll(/__alloT\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
    expect(oneArg, '__alloT calls with no fallback').toEqual([]);
  });
});
