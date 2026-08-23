// Galaxy Explorer readability contracts (2026-08-23).
//
// These pin four defects found by running the tool in a real browser
// (dev-tools/galaxy_a11y_audit.cjs) rather than by reading the source. Each one
// was invisible to every existing galaxy suite, and three of them were invisible
// on the page too — which is exactly why they survived several review passes.
//
//   1. SPECTRAL COLOUR AS TEXT. STAR_TYPES carries each class's true photospheric
//      colour. Half the sequence is near-white (F #f8f7ff, G #fff4ea, A #cad7ff),
//      so using it as `color` on a white card measured 1.06-1.43:1: the class
//      letters and the Luminosity/Mass/Lifetime values rendered invisible, and the
//      fact tiles read as blank boxes. Text now goes through starTextColor().
//
//   2. TINTED EMOJI. The picker drew a ⭐ with `style={{color: st.color}}`. Emoji
//      are colour glyphs and ignore `color`, so a widget whose entire job is
//      "O stars are blue, M stars are red" drew SEVEN IDENTICAL YELLOW STARS.
//      A filled swatch shows the colour; an emoji cannot.
//
//   3. SLIDERS THAT ANNOUNCE A BARE NUMBER. Four sliders had aria-label but no
//      aria-valuetext, so a screen reader read "-450" for a Doppler control whose
//      SIGN is the entire lesson. The tool's other sliders already did this.
//
//   4. 6px POINTER TARGETS. `h-1.5` made the whole range control 6px tall,
//      against the 24px WCAG 2.2 §2.5.8 minimum. `h-6` gives a 24px target with a
//      pixel-identical track (measured, not assumed).
//
// Both served copies are checked: stem_lab/ is the CDN copy and
// desktop/web-app/public/stem_lab/ is the bundled desktop copy.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];
const src = (p) => readFileSync(p, 'utf8');

describe('galaxy readability contracts', () => {
  it.each(PATHS)('%s darkens star colours before using them as text', (p) => {
    const s = src(p);
    expect(s).toContain('function starTextColor(');
    // No remaining call site paints letters with the raw photospheric colour.
    expect(s).not.toMatch(/font-black",\s*style:\s*\{\s*color:\s*st\.color\s*\}/);
    expect(s).not.toMatch(/font-bold",\s*style:\s*\{\s*color:\s*st\.color\s*\}\s*\},\s*st\.label/);
    expect(s).not.toMatch(/className:\s*"font-bold",\s*style:\s*\{\s*color:\s*st\.color\s*\}\s*\},\s*item\.v/);
  });

  it.each(PATHS)('%s keeps starTextColor above 4.5:1 on white for every class', async (p) => {
    const s = src(p);
    // Run the shipped implementation rather than a copy of it, so this cannot
    // drift from the function it is meant to protect.
    const body = s.slice(s.indexOf('function starTextColor('));
    const fn = new Function('return ' + body.slice(0, body.indexOf('\n          }') + 12))();
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const onWhite = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
      return 1.05 / (L + 0.05);
    };
    // Every colour in STAR_TYPES, including the near-white ones that caused this.
    for (const c of ['#9bb0ff', '#aabfff', '#cad7ff', '#f8f7ff', '#fff4ea', '#ffd2a1', '#ffcc6f']) {
      const out = fn(c);
      expect(onWhite(out), c + ' -> ' + out).toBeGreaterThanOrEqual(4.5);
    }
    // A garbage input must not produce an unreadable colour either.
    expect(fn('not-a-colour')).toBe('#334155');
  });

  it.each(PATHS)('%s shows spectral colour as a swatch, never as a tinted emoji', (p) => {
    const s = src(p);
    expect(s).toContain('function starSwatch(');
    // U+2B50 is an emoji presentation character: `color` on it is inert.
    expect(s).not.toMatch(/style:\s*\{\s*color:\s*st\.color\s*\}\s*\},\s*"\\u2B50"/);
    expect(s).not.toMatch(/style:\s*\{\s*color:\s*st\.color\s*\}\s*\},\s*"⭐"/);
  });

  it.each(PATHS)('%s gives every range slider an aria-valuetext', (p) => {
    const s = src(p);
    // Scope each check to ONE slider's props object. A fixed character window is
    // not good enough: these sliders sit close together, so a window wide enough
    // to cover one slider's props reaches into the next slider's aria-valuetext
    // and the check passes on a control that has none.
    const sliders = [...s.matchAll(/type:\s*["']range["']/g)];
    expect(sliders.length, 'no range inputs found — the scan is broken, not the tool').toBeGreaterThanOrEqual(6);
    const missing = [];
    for (const m of sliders) {
      // props end at the next element construction, whichever comes first
      const after = s.slice(m.index);
      const stop = Math.min(
        ...[after.indexOf('React.createElement', 1), after.indexOf("h('", 1), 2000]
          .filter((i) => i > 0)
      );
      const props = after.slice(0, stop);
      if (!/aria-valuetext/.test(props)) {
        const label = (props.match(/aria[-_]?label['"]?\s*:\s*\S+\('([^']+)'/) || [])[1] || '(unlabelled)';
        missing.push(label);
      }
    }
    expect(missing, 'range sliders announcing a bare number').toEqual([]);
  });

  it.each(PATHS)('%s never draws stars as untextured square points', (p) => {
    const s = src(p);
    // A PointsMaterial with neither `map` nor `alphaMap` renders every point as a
    // hard-edged SQUARE. This shipped for the background star field (a flat grey
    // box in the sky), the bulge, the accretion disk, the black-hole star field
    // and its polar jet. The two survivors are ShaderMaterial layers, which
    // compute their own round falloff in the fragment shader.
    const bare = [];
    for (const m of s.matchAll(/new THREE\.PointsMaterial\(\{([\s\S]{0,320}?)\}\)/g)) {
      const props = m[1];
      if (/\bmap\s*:/.test(props) || /\balphaMap\s*:/.test(props)) continue;
      bare.push(props.replace(/\s+/g, ' ').slice(0, 90));
    }
    expect(bare, 'PointsMaterial with no map/alphaMap paints square stars').toEqual([]);
  });

  it.each(PATHS)('%s lightens observe-mode accents before using them on the dark HUD', (p) => {
    const s = src(p);
    expect(s).toContain('function hudAccentText(');
    // The raw 500-level accent measured 4.22:1 as HUD text over the real scene.
    expect(s).not.toMatch(/tracking-\[0\.12em\]",\s*style:\s*\{\s*color:\s*activeObserve\.accent\s*\}/);
  });

  it.each(PATHS)('%s keeps the instrument waveband on one line', (p) => {
    const s = src(p);
    // "380-700 nm" broke after the hyphen and again before the unit.
    // Anchor on the PILL, not the first mention: the container's aria-label names
    // activeInstrument.band too, and matching that checks the wrong element.
    const at = s.indexOf('}, activeInstrument.band)');
    expect(at, 'waveband pill not found').toBeGreaterThan(-1);
    expect(s.slice(Math.max(0, at - 300), at)).toMatch(/whitespace-nowrap/);
  });

  it.each(PATHS)('%s illustrates each spectral class with a MAIN-SEQUENCE star', (p) => {
    const s = src(p);
    // The selected-type card renders "<class>-type (<example>)" directly above tiles
    // showing that class's main-sequence Mass Range and Luminosity, so an evolved star
    // contradicts the numbers printed beside it while both are on screen.
    //   Rigel   = B8 Ia supergiant, ~21 M☉ / ~120,000 L☉  vs row 2.1-16 M☉ / 25-30,000x
    //   Arcturus= K1.5 III giant,  ~1.08 M☉ / ~170 L☉      vs row 0.45-0.8 M☉ / 0.08-0.6x
    // Both are famous, which is exactly why they are likely to be put back.
    expect(s, 'Rigel is a supergiant; its mass and luminosity fall outside the B row').not.toMatch(/example:\s*'Rigel'/);
    expect(s, 'Arcturus is a giant; its mass and luminosity fall outside the K row').not.toMatch(/example:\s*'Arcturus'/);
    expect(s).toMatch(/example:\s*'Regulus'/);
    expect(s).toMatch(/example:\s*'61 Cygni A'/);
  });

  it.each(PATHS)('%s keeps range controls at a 24px pointer target', (p) => {
    const s = src(p);
    // h-1.5 / h-2 on a range input makes the whole control 6-8px tall.
    expect(s).not.toMatch(/type:\s*["']range["'][\s\S]{0,600}?className:\s*["'][^"']*\bh-(?:1\.5|2)\b/);
    expect(s).not.toMatch(/className:\s*["'][^"']*\bh-1\.5\b[^"']*accent-/);
  });
});
