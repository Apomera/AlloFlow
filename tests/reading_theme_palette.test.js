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
const APP_STYLES = fs.readFileSync(path.join(repo, 'app_styles_source.jsx'), 'utf8');
const HEADER = fs.readFileSync(path.join(repo, 'view_header_source.jsx'), 'utf8');

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
  while ((m = re.exec(APP_STYLES))) {
    out[m[1]] = { fg: m[2], bg: m[3], hl: m[4], ok: m[5], err: m[6], link: m[7] };
  }
  return out;
}

function parseFullThemeTokens() {
  const out = {};
  const blockRe = /\[data-reading-theme="([a-zA-Z]+)"\] \{([^}]*)\}/g;
  let block;
  while ((block = blockRe.exec(APP_STYLES))) {
    if (!block[2].includes('--allo-rt-fg')) continue;
    const tokens = {};
    for (const token of block[2].matchAll(/--allo-rt-([a-z-]+): (#[0-9a-f]{6})/g)) tokens[token[1]] = token[2];
    out[block[1]] = tokens;
  }
  return out;
}

function parseHeaderSwatches() {
  const out = {};
  const re = /\{ id: '([^']+)',[^\r\n]*?bg: '(#[0-9a-f]{6})', fg: '(#[0-9a-f]{6})', border: '(#[0-9a-f]{6})', focus: '(#[0-9a-f]{6})'/g;
  let match;
  while ((match = re.exec(HEADER))) {
    out[match[1]] = { bg: match[2], fg: match[3], border: match[4], focus: match[5] };
  }
  return out;
}

const ALL = parseThemes();
const FULL = parseFullThemeTokens();
// dark / highContrast carry the same accent tokens but are excluded from the
// perceptual-spacing and lightness checks — they are deliberately far from the
// light set, and comparing them would make those assertions meaningless.
const DARKISH = ['dark', 'highContrast'];
const THEMES = Object.fromEntries(Object.entries(ALL).filter(([n]) => !DARKISH.includes(n)));
const NAMES = Object.keys(THEMES);
const SWATCHES = parseHeaderSwatches();

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

  it('keeps text and controls legible on every rebuilt reading surface', () => {
    for (const [name, t] of Object.entries(FULL)) {
      for (const surface of ['surface', 'surface-raised', 'surface-muted', 'control']) {
        expect(ratio(t[surface], t.fg), `${name} text on ${surface}`).toBeGreaterThanOrEqual(7);
      }
      for (const surface of ['bg', 'surface', 'surface-raised', 'surface-muted', 'control']) {
        expect(ratio(t[surface], t.muted), `${name} muted text on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const surface of ['bg', 'surface', 'surface-muted', 'control']) {
        expect(ratio(t[surface], t.border), `${name} boundary on ${surface}`).toBeGreaterThanOrEqual(3);
      }
      expect(ratio(t.bg, t.focus), `${name} focus on canvas`).toBeGreaterThanOrEqual(3);
      expect(ratio(t.control, t.focus), `${name} focus on control`).toBeGreaterThanOrEqual(3);
      for (const accent of ['ok', 'err', 'link']) {
        expect(ratio(t.surface, t[accent]), `${name} ${accent} on nested surface`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps picker swatches truthful, legible, and synchronized with the reading canvases', () => {
    expect(Object.keys(SWATCHES).sort()).toEqual([
      'blue', 'dark', 'default', 'dim', 'dyslexia', 'green', 'highContrast', 'rose', 'sepia', 'warm',
    ]);

    for (const [name, swatch] of Object.entries(SWATCHES)) {
      expect(ratio(swatch.bg, swatch.fg), `${name} swatch label`).toBeGreaterThanOrEqual(7);
      expect(ratio(swatch.bg, swatch.border), `${name} swatch boundary`).toBeGreaterThanOrEqual(3);
      expect(ratio(swatch.bg, swatch.focus), `${name} swatch focus`).toBeGreaterThanOrEqual(3);
      if (name !== 'default') {
        expect(swatch, `${name} swatch tokens`).toEqual({
          bg: FULL[name].bg,
          fg: FULL[name].fg,
          border: FULL[name].border,
          focus: FULL[name].focus,
        });
      }
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

  it('persists valid themes, accepts safe functional changes, and synchronizes open tabs', () => {
    expect(ANTI).toContain("safeGetItem('allo_reading_theme')");
    expect(ANTI).toContain("typeof v === 'function' ? v(prev) : v");
    expect(ANTI).toContain("safeSetItem('allo_reading_theme', readingTheme)");
    expect(ANTI).toContain("window.addEventListener('storage', syncReadingTheme)");
    expect(ANTI).toContain("window.removeEventListener('storage', syncReadingTheme)");
    // The cross-tab listener flipped to positive-match form (favorites got its own).
    expect(ANTI).toContain("if (event.key === 'allo_reading_theme' || event.key === null) {");
    expect(ANTI).toContain("READING_THEME_IDS.includes(event.newValue) ? event.newValue : 'default'");
  });

  it('gives the glossary term a readable colour on every theme', () => {
    // GlossaryTermSpan takes an isDarkBg prop that NO simplified-view call site
    // passes, so it always rendered indigo-600 (#4f46e5): 2.71:1 on dark,
    // 3.34:1 on high contrast, 2.98:1 on dim. The themes now restyle it.
    expect(APP_STYLES).toMatch(/\.allo-glossary-term \{ color: var\(--allo-rt-link\)/);

    // dark + highContrast must carry the tokens that rule depends on, or it
    // resolves to nothing and silently falls back to the unreadable default.
    for (const name of ['dark', 'highContrast']) {
      const m = APP_STYLES.match(new RegExp(`\\[data-reading-theme="${name}"\\] \\{ --allo-rt-fg: (#[0-9a-f]{6}); --allo-rt-bg: (#[0-9a-f]{6});[^}]*--allo-rt-link: (#[0-9a-f]{6});`));
      expect(m, `${name} accent tokens`).toBeTruthy();
      const [, fg, bg, link] = m;
      expect(ratio(bg, link), `${name} glossary term`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(bg, fg), `${name} body text`).toBeGreaterThanOrEqual(7);
    }
  });

  it('drives accents from variables rather than per-theme hardcoding', () => {
    // The point of the refactor: adding a theme should not mean editing a
    // nine-way conditional in four places.
    expect(APP_STYLES).toContain('--allo-rt-hl');
    expect(APP_STYLES).toMatch(/background-color: var\(--allo-rt-hl\)/);
    expect(APP_STYLES).toMatch(/color: var\(--allo-rt-link\)/);
  });

  it('gives explicit reading themes final precedence inside dark and contrast shells', () => {
    const bridgeStart = APP_STYLES.indexOf('App-theme / reading-theme compatibility bridge');
    expect(bridgeStart).toBeGreaterThan(APP_STYLES.indexOf('.theme-contrast [class*="bg-"]'));

    const bridge = APP_STYLES.slice(bridgeStart);
    expect(bridge).toContain(':is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"])');
    expect(bridge).toMatch(/:where\(\*\) \{\s*color: inherit !important;/);
    expect(bridge).toMatch(/:where\(button, \[role="button"\]\) \{[\s\S]*?background-color: var\(--allo-rt-control\) !important;/);
    // Generated docsuite field selectors include three :not([type]) clauses;
    // :is() deliberately retains the field selector specificity needed to beat
    // those earlier rules, while :where() would zero it and lose by one point.
    expect(bridge).toContain(':is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, option)');
    expect(bridge).toContain('outline: 3px solid var(--allo-rt-focus) !important;');
    expect(bridge).toContain('.theme-contrast .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"])');
    expect(bridge).not.toMatch(/\[data-reading-theme="default"\]\s*\{/);
  });

  it('normalizes reading-theme controls and protects picker previews from app-theme overrides', () => {
    const layerStart = APP_STYLES.indexOf('Reading-color interaction layer');
    const bridgeStart = APP_STYLES.indexOf('App-theme / reading-theme compatibility bridge');
    const layer = APP_STYLES.slice(layerStart, bridgeStart);

    expect(layer).toMatch(/:where\(button, \[role="button"\]\) \{[\s\S]*?background-color: var\(--allo-rt-control\) !important;/);
    expect(layer).not.toMatch(/:where\(button:not\(\[class\*="bg-"\]\)/);

    expect(HEADER).toContain('allo-reading-theme-swatch');
    for (const token of ['bg', 'fg', 'border', 'focus']) {
      expect(HEADER).toContain(`--allo-reading-swatch-${token}`);
      expect(APP_STYLES).toContain(`--allo-reading-swatch-${token}`);
    }

    expect(APP_STYLES).toMatch(/button\.allo-reading-theme-swatch \{/);
    expect(APP_STYLES).toMatch(/button\.allo-reading-theme-swatch\[aria-checked="true"\]/);
    expect(APP_STYLES).toMatch(/\.theme-contrast button\.allo-reading-theme-swatch:focus-visible/);
    expect(APP_STYLES).toMatch(/@media \(forced-colors: active\)[\s\S]*?button\.allo-reading-theme-swatch[\s\S]*?CanvasText/);
  });

  it('switches palettes atomically and prints every theme as legible black on white', () => {
    const interactionStart = APP_STYLES.indexOf('Reading-color interaction layer');
    const bridgeStart = APP_STYLES.indexOf('App-theme / reading-theme compatibility bridge');
    const interaction = APP_STYLES.slice(interactionStart, bridgeStart);
    expect(interaction).not.toMatch(/transition:\s*(?:background-)?color/);

    const printStart = APP_STYLES.lastIndexOf('@media print');
    expect(printStart).toBeGreaterThan(APP_STYLES.indexOf('@media (forced-colors: active)'));
    const print = APP_STYLES.slice(printStart);
    expect(print).toContain('--allo-rt-bg: #ffffff');
    expect(print).toContain('--allo-rt-fg: #000000');
    expect(print).toContain('print-color-adjust: economy');
    expect(print).toMatch(/\[data-reading-theme\] :where\(\*\) \{[\s\S]*?color: #000000 !important;/);
    expect(print).toMatch(/\[data-reading-theme\] :is\(h1, h2, h3[\s\S]*?\) \{[\s\S]*?color: #000000 !important;/);
    expect(APP_STYLES).toContain('Images, SVGs, and canvas output remain untouched');
  });

  it('keeps the settings dialog reachable and translated swatches usable on phones', () => {
    expect(HEADER).toContain('allo-header-settings-dialog');
    expect(HEADER).toContain('max-height: calc(100dvh - 8rem)');
    expect(HEADER).toContain('overflow-y: auto');
    const mobileDialog = HEADER.slice(HEADER.indexOf('@media (max-width: 639px)'));
    expect(mobileDialog).toContain('left: .75rem !important');
    expect(mobileDialog).toContain('right: .75rem !important');
    expect(HEADER).toContain('allo-reading-theme-grid');
    expect(HEADER).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
    expect(HEADER).toContain('white-space: normal !important');
    expect(APP_STYLES).toMatch(/button\.allo-reading-theme-swatch \{[\s\S]*?min-height: 44px;/);
    expect(APP_STYLES).toMatch(/button\.allo-reading-theme-swatch > span:last-child \{[\s\S]*?text-overflow: ellipsis;/);
  });
});
