// SEL Hub — two contrast regressions the existing gates structurally could not see.
//
// Context. `SelHub.renderTool` pins every tool to a dark shell
// (sel_hub_module.js, `needsDarkShell`), so a tool's theme remap helper is
// always in its dark/high-contrast branch. Any colour that does NOT go through
// that helper stays at its light-mode value on a dark surface.
//
// (1) crisiscompanion — `SLATE_TEXT` (#1e293b) was read raw at ~69 call sites
//     while the card backgrounds around it went through `_ccC('#fff')`, which
//     maps to #1e293b in dark. Slate-800 text on a slate-800 card measured
//     1.00:1 — invisible — including the content-warning gate of the
//     suicide-prevention module. Ten backgrounds were also unwrapped.
//
//     Why sel_theme_reactivity.test.js missed it: that suite's static invariant
//     does `src.slice(src.indexOf(': hex); };'))`, i.e. it only scans AFTER the
//     `_xxC` helper definition. crisiscompanion draws its UI in module-scope
//     helper functions ABOVE that point (51% of the file), and all ten leaks sat
//     in that prefix. Its SURFACE_HEXES list also omits plain '#fff', which was
//     eight of the ten. This suite scans the WHOLE file and includes white.
//
// (2) sel_standards_alignment `tagStyle()` rendered tag text at full hue on a
//     `hue + '22'` tint of the same hue: #6366f1 ("CASEL") = 2.84:1 in 32 tools,
//     #a78bfa = 4.32:1 in 18. That single function produced 138 of the 287 AA
//     failures measured across the hub. The contrast here is COMPUTED, not
//     asserted against a hex, so a future palette edit that picks a low-contrast
//     ink fails this test rather than passing it silently.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const esc = (s) => s.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
const Q = String.fromCharCode(39);

// Light surface hexes, INCLUDING plain white (the omission that hid 8 of the 10).
const LIGHT_SURFACES = [
  '#f0fdf4', '#ecfdf5', '#d1fae5', '#dcfce7', '#eff6ff', '#dbeafe', '#e0e7ff',
  '#fef3c7', '#fffbeb', '#fef9c3', '#fff8f0', '#fef2f2', '#fee2e2', '#faf5ff',
  '#f5f3ff', '#ede9fe', '#f8fafc', '#f1f5f9', '#fafafa', '#fff', '#ffffff',
];

// Light-base SEL tools that carry a per-tool remap helper.
const REMAPPED = [
  ['growthmindset', '_gmC'], ['friendship', '_frC'], ['compassion', '_coC'],
  ['voicedetective', '_vdC'], ['peersupport', '_peC'], ['transitions', '_trC'],
  ['sociallab', '_slC'], ['execfunction', '_efC'], ['digitalwellbeing', '_dwC'],
  ['upstander', '_upC'], ['crisiscompanion', '_ccC'],
];

describe('SEL Hub · light backgrounds route through the tool theme remap (WHOLE file)', () => {
  it.each(REMAPPED)('sel_tool_%s.js has no unwrapped light background', (id, helper) => {
    const src = read(`sel_hub/sel_tool_${id}.js`);
    const leaks = [];
    for (const hex of LIGHT_SURFACES) {
      const re = new RegExp(`background: ?(?!${esc(helper)}\\()${Q}${esc(hex)}${Q}`, 'g');
      const m = src.match(re);
      if (m) leaks.push(`${hex} x${m.length}`);
    }
    expect(
      leaks,
      `${id}: light background(s) not routed through ${helper}() — these render at their light value on the forced dark shell: ${leaks.join(', ')}`,
    ).toEqual([]);
  });

  // Guards the scan itself. If this ever passes, the regex above has gone blind
  // and every "0 leaks" result above is meaningless.
  it('the scan actually detects a known-bad sample (calibration)', () => {
    const knownBad = `h('div', { style: { background: '#fff', color: SLATE_TEXT } })`;
    const re = new RegExp(`background: ?(?!_ccC\\()${Q}${esc('#fff')}${Q}`, 'g');
    expect(knownBad.match(re)).toHaveLength(1);
    const fixed = `h('div', { style: { background: _ccC('#fff'), color: SLATE_TEXT } })`;
    expect(fixed.match(re)).toBeNull();
  });
});

describe('SEL Hub · crisiscompanion slate constants follow the theme', () => {
  const src = read('sel_hub/sel_tool_crisiscompanion.js');

  it.each(['SLATE_TEXT', 'SLATE_MID', 'SLATE_BG'])(
    '%s is refreshed per render, not left at its light-mode literal',
    (name) => {
      // module-scope declaration still exists (the light default)
      expect(src).toMatch(new RegExp(`var\\s+${name}\\s*=`));
      // ...and is reassigned inside render(), either straight off the theme flags
      // (foregrounds, which have no map entry) or through _ccC (surfaces, which do)
      const re = new RegExp(`^\\s*${name}\\s*=\\s*(_ccCHC \\?|_ccC\\()`, 'm');
      expect(
        re.test(src),
        `${name} must be reassigned inside render() from _ccCHC/_ccCDark or via _ccC(), otherwise it keeps its light-mode value on the dark shell`,
      ).toBe(true);
    },
  );

  it('the reassignment happens before the content-warning gate renders', () => {
    const assignAt = src.search(/^\s*SLATE_TEXT\s*=\s*_ccCHC \?/m);
    const gateAt = src.indexOf('CONTENT WARNING GATE');
    expect(assignAt).toBeGreaterThan(-1);
    expect(gateAt).toBeGreaterThan(-1);
    expect(assignAt).toBeLessThan(gateAt);
  });
});

describe('SEL Hub · standards alignment tag text meets AA on its own tint', () => {
  const src = read('sel_hub/sel_standards_alignment.js');

  const parse = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const lum = (rgb) => {
    const v = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // tagStyle does `background: color + '22'`; the panel behind it is #1e293b.
  const PANEL = parse('#1e293b');
  const ALPHA = 0x22 / 255;
  const composite = (hue) => {
    const t = parse(hue);
    return t.map((c, i) => c * ALPHA + PANEL[i] * (1 - ALPHA));
  };

  it('tagStyle uses a TAG_INK lookup rather than the raw hue', () => {
    expect(src).toMatch(/var TAG_INK = \{/);
    expect(src).toMatch(/color: TAG_INK\[color\] \|\| color/);
  });

  it('every TAG_INK entry clears 4.5:1 on its own tinted background', () => {
    const block = src.slice(src.indexOf('var TAG_INK = {'), src.indexOf('function tagStyle'));
    const entries = [...block.matchAll(/'(#[0-9a-f]{6})':\s*'(#[0-9a-f]{6})'/gi)];
    expect(entries.length).toBeGreaterThanOrEqual(3);
    const failures = entries
      .map(([, hue, ink]) => ({ hue, ink, r: ratio(parse(ink), composite(hue)) }))
      .filter((e) => e.r < 4.5);
    expect(
      failures,
      `TAG_INK entries below AA: ${failures.map((f) => `${f.hue}->${f.ink} ${f.r.toFixed(2)}:1`).join(', ')}`,
    ).toEqual([]);
  });

  it('the raw hues it replaced really were below AA (calibration)', () => {
    // If these ever pass, the composite model is wrong and the test above is vacuous.
    expect(ratio(parse('#6366f1'), composite('#6366f1'))).toBeLessThan(4.5);
    expect(ratio(parse('#a78bfa'), composite('#a78bfa'))).toBeLessThan(4.5);
  });

  it('every tag call site passes a hue that TAG_INK covers', () => {
    const used = [...src.matchAll(/tagStyle\('(#[0-9a-f]{6})'\)/gi)].map((m) => m[1].toLowerCase());
    const block = src.slice(src.indexOf('var TAG_INK = {'), src.indexOf('function tagStyle'));
    const covered = [...block.matchAll(/'(#[0-9a-f]{6})':/gi)].map((m) => m[1].toLowerCase());
    const uncovered = [...new Set(used)].filter((h) => !covered.includes(h));
    expect(
      uncovered,
      `tagStyle() called with hue(s) absent from TAG_INK, so they fall back to the failing raw hue: ${uncovered.join(', ')}`,
    ).toEqual([]);
  });
});

describe('SEL Hub · a theme helper is never called above its own definition', () => {
  // These helpers are declared inside render(ctx) because they need the theme,
  // but the colour data they remap usually lives in a module-scope array ABOVE
  // that point. Routing one of those data literals through the helper looks
  // right and parses fine, yet throws ReferenceError the moment the file loads
  // and the tool drops silently out of the registry. Hit twice while routing
  // accents; check_sel_render notices only as "71 tools" quietly becoming 70.
  const NAME = /\bvar (_\w*?(?:Fg|Bg|Bd|Ink|C))\s*=\s*function\s*\(/g;
  const files = readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /^sel_tool_.*\.js$/.test(f));

  const lineOf = (src, index) => src.slice(0, index).split('\n').length;
  // Blank out comments rather than deleting them, so every offset still maps to
  // its real line. Several of these files explain the helper in a comment that
  // spells out `_coC('#hex')`, which a naive scan reads as a call site.
  const blankComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));

  it.each(files)('%s', (f) => {
    const src = blankComments(readFileSync(resolve(ROOT, 'sel_hub', f), 'utf8'));
    const bad = [];
    for (const m of src.matchAll(NAME)) {
      const name = m[1];
      const definedAt = m.index;
      const use = new RegExp('\\b' + name + '\\s*\\(', 'g');
      let u;
      while ((u = use.exec(src)) !== null) {
        if (u.index >= definedAt) break;
        bad.push(`${name} called at line ${lineOf(src, u.index)}, defined at line ${lineOf(src, definedAt)}`);
        break;
      }
    }
    expect(bad, `${f}: theme helper used before it exists, so the module throws at load:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the scan detects a known-bad shape (calibration)', () => {
    const sample = "var DATA = [{ color: _xxFg('#fff') }];\nvar _xxFg = function (h) { return h; };";
    const m = new RegExp(NAME.source).exec(sample);
    expect(m, 'the definition pattern must match').toBeTruthy();
    expect(sample.indexOf('_xxFg('), 'the use must be found before the definition').toBeLessThan(m.index);
  });
});
