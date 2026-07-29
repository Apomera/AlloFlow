import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The reading themes are an ACCESSIBILITY feature (visual stress, Irlen,
// dyslexia), so their colours are a contract, not decoration. Before this pass:
//   · every theme painted the SAME accent hexes on its own background, so the
//     yellow-200 highlight sat at 1.0:1 on warm/sepia (invisible), success ran
//     2.7-3.1:1 and error 3.9-4.5:1 — all below AA;
//   · five theme pairs were within dE 10 (dyslexia vs default was 5.3), and the
//     whole set spanned 8 L* points, so the picker offered near-identical tints.
// These tests re-derive the numbers from the shipped source.

const repo = path.resolve(import.meta.dirname, '..');
const ANTI = fs.readFileSync(path.join(repo, 'AlloFlowANTI.txt'), 'utf8');

const hex = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function lab(h) {
  const [R, G, B] = hex(h).map(lin);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const dE = (a, b) => { const [l1, a1, b1] = lab(a); const [l2, a2, b2] = lab(b); return Math.hypot(l1 - l2, a1 - a2, b1 - b2); };

// Parse the custom-property block straight out of the shipped CSS.
function parseThemes() {
  const out = {};
  const re = /\[data-reading-theme="([a-zA-Z]+)"\] \{ --allo-rt-fg: (#[0-9a-f]{6}); --allo-rt-bg: (#[0-9a-f]{6}); --allo-rt-hl: (#[0-9a-f]{6}); --allo-rt-ok: (#[0-9a-f]{6}); --allo-rt-err: (#[0-9a-f]{6}); --allo-rt-link: (#[0-9a-f]{6});/g;
  let m;
  while ((m = re.exec(ANTI))) {
    out[m[1]] = { fg: m[2], bg: m[3], hl: m[4], ok: m[5], err: m[6], link: m[7] };
  }
  return out;
}

const ALL = parseThemes();
// dark / highContrast carry the same accent tokens but are excluded from the
// perceptual-spacing and lightness checks — they are deliberately far from the
// light set, and comparing them would make those assertions meaningless.
const DARKISH = ['dark', 'highContrast'];
const THEMES = Object.fromEntries(Object.entries(ALL).filter(([n]) => !DARKISH.includes(n)));
const NAMES = Object.keys(THEMES);

describe('reading theme palette', () => {
  it('defines every theme with a full accent set', () => {
    expect(NAMES.sort()).toEqual(['blue', 'dim', 'dyslexia', 'green', 'rose', 'sepia', 'warm']);
    DARKISH.forEach((n) => expect(ALL[n], `${n} tokens`).toBeTruthy());
  });

  it('body text reaches AAA on every theme', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      expect(ratio(t.bg, t.fg), `${name} body text`).toBeGreaterThanOrEqual(7);
    }
  });

  it('success, error and links reach AA on every theme', () => {
    // These were 2.7-4.5:1 when every theme shared one hex.
    for (const [name, t] of Object.entries(THEMES)) {
      expect(ratio(t.bg, t.ok), `${name} success`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.bg, t.err), `${name} error`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.bg, t.link), `${name} link`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the highlight is actually visible against its own background', () => {
    // The old yellow-200 highlight measured 1.0:1 on warm — same luminance as
    // the page, so highlighting did nothing at all. Checked on every theme,
    // dark ones included.
    for (const [name, t] of Object.entries(ALL)) {
      const vsBg = ratio(t.bg, t.hl);
      expect(vsBg, `${name} highlight vs background`).toBeGreaterThanOrEqual(1.7);
      // …and body text must still be readable ON the highlight.
      expect(ratio(t.hl, t.fg), `${name} text on highlight`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('no two themes are confusable at a glance', () => {
    const withDefault = { ...THEMES, default: { bg: '#ffffff' } };
    const names = Object.keys(withDefault);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d = dE(withDefault[names[i]].bg, withDefault[names[j]].bg);
        expect(d, `${names[i]} vs ${names[j]} perceptual distance`).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('spans a real lightness range, not seven near-whites', () => {
    const Ls = NAMES.map((n) => lab(THEMES[n].bg)[0]).concat([100]); // include default
    const spread = Math.max(...Ls) - Math.min(...Ls);
    expect(spread, 'lightness spread across the picker').toBeGreaterThan(20);
  });

  it('registers dim in the theme lists so it can be selected and cycled', () => {
    const lists = ANTI.match(/\['default','warm','sepia','dark','highContrast','blue','green','rose','dyslexia'[^\]]*\]/g) || [];
    expect(lists.length).toBeGreaterThan(0);
    lists.forEach((l) => expect(l).toContain("'dim'"));
  });

  it('gives the glossary term a readable colour on every theme', () => {
    // GlossaryTermSpan takes an isDarkBg prop that NO simplified-view call site
    // passes, so it always rendered indigo-600 (#4f46e5): 2.71:1 on dark,
    // 3.34:1 on high contrast, 2.98:1 on dim. The themes now restyle it.
    expect(ANTI).toMatch(/\.allo-glossary-term \{ color: var\(--allo-rt-link\)/);

    // dark + highContrast must carry the tokens that rule depends on, or it
    // resolves to nothing and silently falls back to the unreadable default.
    for (const name of ['dark', 'highContrast']) {
      const m = ANTI.match(new RegExp(`\\[data-reading-theme="${name}"\\] \\{ --allo-rt-fg: (#[0-9a-f]{6}); --allo-rt-bg: (#[0-9a-f]{6});[^}]*--allo-rt-link: (#[0-9a-f]{6});`));
      expect(m, `${name} accent tokens`).toBeTruthy();
      const [, fg, bg, link] = m;
      expect(ratio(bg, link), `${name} glossary term`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(bg, fg), `${name} body text`).toBeGreaterThanOrEqual(7);
    }
  });

  it('drives accents from variables rather than per-theme hardcoding', () => {
    // The point of the refactor: adding a theme should not mean editing a
    // nine-way conditional in four places.
    expect(ANTI).toContain('--allo-rt-hl');
    expect(ANTI).toMatch(/background-color: var\(--allo-rt-hl\)/);
    expect(ANTI).toMatch(/color: var\(--allo-rt-link\)/);
  });
});
