// Document-suite theme reactivity gate (2026-07-02).
// The Document Hub builder (view_export_preview) + PDF remediation pipeline
// (view_pdf_audit) get their dark/high-contrast skins from a GENERATED remap
// layer (dev-tools/gen_docsuite_theme.cjs → <style data-docsuite-theme="v1">
// in app_styles_source.jsx). This test keeps that layer honest:
//   1. WCAG AA matrix — every dark-mode TEXT color must clear 4.5:1 against
//      EVERY dark-mode SURFACE color the mapping can produce (worst case, so
//      any text/panel combination in the views is safe by construction).
//   2. High-contrast mode is binary black/yellow/green at ≥ 15:1.
//   3. Drift — the CSS block in the AppStyles source matches a fresh generator run.
//   4. Scope — every fixed-overlay root in both views carries .allo-docsuite,
//      and both views ship a theme toggle wired to window.AlloToggleTheme.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const gen = require2(resolve(process.cwd(), 'dev-tools/gen_docsuite_theme.cjs'));

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = (hex) => {
  const h = hex.replace('#', '');
  return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
};
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

const tokens = gen.allTokens(process.cwd());

// Collect every value the dark mapping can emit, bucketed by role.
const darkSurfaces = new Set([gen.DARK.panel, gen.DARK.panelDeep, gen.DARK.panelMid, gen.DARK.panelHigh]);
const darkTexts = new Set();
for (const tok of tokens) {
  const r = gen.darkFor(tok);
  if (!r) continue;
  const bg = r.decl.match(/background-color:(#[0-9a-f]{6})/i);
  if (bg) darkSurfaces.add(bg[1].toLowerCase());
  const tx = r.decl.match(/^color:(#[0-9a-f]{6})/i);
  if (tx) darkTexts.add(tx[1].toLowerCase());
}

describe('dark mode: WCAG AA worst-case matrix', () => {
  it(`found a real token inventory (${tokens.length} tokens across all scopes)`, () => {
    expect(tokens.length).toBeGreaterThan(700);
    expect(darkSurfaces.size).toBeGreaterThan(5);
    expect(darkTexts.size).toBeGreaterThan(5);
  });
  for (const text of darkTexts) {
    it(`text ${text} ≥ 4.5:1 on every dark surface`, () => {
      for (const surface of darkSurfaces) {
        const r = ratio(text, surface);
        expect(r, `${text} on ${surface} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
  it('default dark body text (#f1f5f9 inherit) clears every surface too', () => {
    for (const surface of darkSurfaces) {
      expect(ratio('#f1f5f9', surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('high-contrast mode: binary palette', () => {
  it('yellow-on-black and green-on-black are ≥ 15:1', () => {
    expect(ratio(gen.CONTRAST.text, gen.CONTRAST.bg)).toBeGreaterThanOrEqual(15);
    expect(ratio(gen.CONTRAST.accent, gen.CONTRAST.bg)).toBeGreaterThanOrEqual(15);
  });
  it('every bg token maps to pure black, every text token to yellow', () => {
    for (const tok of tokens) {
      const r = gen.contrastFor(tok);
      if (!r) continue;
      if (tok.startsWith('bg-') && !tok.startsWith('bg-black')) expect(r.decl).toContain('#000000');
      if (tok.startsWith('text-')) expect(r.decl).toContain('#ffff00');
    }
  });
});

describe('generated CSS is live and scoped', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const styleSource = readFileSync(resolve(process.cwd(), 'app_styles_source.jsx'), 'utf8');
  it('AppStyles carries the CURRENT generator output (no drift), exactly ONCE', () => {
    const blocks = styleSource.match(/<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/g) || [];
    expect(blocks.length, 'exactly one generated style block').toBe(1);
    const m = blocks[0].match(/<style data-docsuite-theme="v1">\{`([\s\S]*?)`\}<\/style>/);
    expect(m[1].trim()).toBe(gen.generateCss(process.cwd()).trim());
  });
  it('the main-content region and SEL hub shell carry the scope class', () => {
    expect(anti).toMatch(/className=\{`allo-docsuite flex-grow w-full/);
    const sel = readFileSync(resolve(process.cwd(), 'sel_hub/sel_hub_module.js'), 'utf8');
    expect(sel).toContain("className: 'allo-docsuite',");
  });
  it('high-traffic utilities are all remapped in dark mode', () => {
    for (const tok of ['bg-white', 'bg-slate-50', 'bg-indigo-50', 'bg-amber-50', 'text-slate-600', 'text-slate-700', 'text-indigo-700', 'text-amber-700', 'border-slate-200']) {
      expect(gen.darkFor(tok), tok).toBeTruthy();
    }
  });
  it('games render inside the scope, so games_source.jsx is scanned', () => {
    // The appsuite filter was `view_*_source.jsx` only, so games_source.jsx was
    // never scanned even though the games render inside
    // <main class="allo-docsuite">. MemoryGame alone had 9 colour tokens with no
    // dark mapping. Found by L1, 2026-08-16 fleet.
    const files = gen.SCOPES.map((s) => s.files(process.cwd())).flat();
    expect(files).toContain('games_source.jsx');
    for (const tok of ['from-indigo-200', 'via-indigo-500']) {
      expect(tokens, `${tok} should be in the scanned union`).toContain(tok);
    }
  });

  for (const f of ['view_pdf_audit_source.jsx', 'view_export_preview_source.jsx']) {
    it(`${f}: every fixed-overlay root carries allo-docsuite + has a theme toggle`, () => {
      const src = readFileSync(resolve(process.cwd(), f), 'utf8');
      const overlays = src.match(/className="[^"]*fixed inset-0[^"]*"/g) || [];
      expect(overlays.length).toBeGreaterThan(0);
      for (const o of overlays) expect(o, o).toContain('allo-docsuite');
      expect(src).toContain('window.AlloToggleTheme');
    });
  }
});

// ── State variants (v3, 2026-08-16) ─────────────────────────────────────────
// This gate is the reason the hover bug survived so long: it enforced the
// contrast matrix on RESTING colours and never looked at a state variant. The
// generator emitted `.theme-dark .allo-docsuite .bg-slate-50`, Tailwind emits
// `hover:bg-slate-50` as its own class, and the two never met -- so every hover
// surface inside a scoped region kept its light value in dark mode while the
// resting text was swapped to a light one. Measured in Chromium before the fix:
// glossary row 1.05:1, filter chip 1.00:1, games row 1.00:1. After: 16.30,
// 13.35, 13.35. Light mode measured byte-identical either way.
describe('dark mode: state variants are remapped too', () => {
  const css = gen.generateCss(process.cwd());
  const variants = gen.allVariantTokens(process.cwd());

  it('found a real variant inventory', () => {
    expect(variants.supported.length).toBeGreaterThan(400);
    expect(variants.supported).toContain('hover:bg-slate-50');
    expect(variants.supported).toContain('hover:bg-slate-100');
  });

  it('emits a rule for every supported variant token whose base token maps', () => {
    const missing = variants.supported.filter((full) => {
      const s = gen.splitVariant(full);
      if (!s || !gen.darkFor(s.token) || gen.darkFor(s.token).child) return false;
      return !css.includes(`[class~="${full}"]`);
    });
    expect(missing, `variant tokens with a dark mapping but no emitted rule:\n${missing.join('\n')}`).toEqual([]);
  });

  it('uses the [class~=] selector form, never a backslash escape', () => {
    // The generated CSS is pasted inside a JSX template literal in
    // app_styles_source.jsx, where `\:` collapses to `:` before the browser
    // ever parses it. A `.hover\:bg-x:hover` selector would silently become
    // `.hover:bg-x:hover` -- a rule that matches nothing, with no error
    // anywhere. Same reason slash tokens already use the attribute form.
    // Simplest possible statement of it: the generated CSS contains no
    // backslash at all, anywhere.
    expect(css.includes(String.fromCharCode(92)), 'generated CSS must contain no backslash').toBe(false);
    expect(css).toContain('[class~="hover:bg-slate-50"]:hover');
  });

  it('contains nothing that could terminate the JSX template literal it is pasted into', () => {
    // Caught a real one during the v3 build: a backtick in the generator's own
    // header comment reached the output and would have ended the template
    // literal in app_styles_source.jsx, breaking the entire AppStyles module
    // with a syntax error nowhere near the cause. The backslash assertion above
    // did not catch it, because a backtick is not a backslash.
    const hazards = {
      backtick: css.includes(String.fromCharCode(96)),
      interpolation: css.includes('${'),
      closingTag: css.includes('</style'),
    };
    expect(hazards, 'generated CSS is pasted inside <style>{`...`}</style> in JSX')
      .toEqual({ backtick: false, interpolation: false, closingTag: false });
  });

  it('scopes every variant rule to a theme, so light mode is untouched', () => {
    for (const line of css.split('\n')) {
      if (!line.includes('[class~="hover:') && !line.includes('[class~="focus')) continue;
      for (const sel of line.slice(0, line.indexOf('{')).split(',')) {
        if (!sel.trim()) continue;
        expect(sel.trim(), sel.trim()).toMatch(/^\.theme-(dark|contrast) \.allo-docsuite /);
      }
    }
  });

  it('maps the group/peer relationship onto an ancestor, not the element', () => {
    expect(css).toMatch(/\.group:hover \[class~="group-hover:/);
    expect(css).not.toMatch(/\[class~="group-hover:[^"]*"\]:hover/);
  });

  it('variant surfaces introduce no colour outside the audited matrix', () => {
    // buildVariantRules reuses darkFor on the BARE token, so the value set is
    // by construction the same one the worst-case matrix above already covers.
    // This pins that: a future mapping that special-cased variants would need
    // its own matrix, and this test says so out loud.
    const emitted = new Set();
    for (const full of variants.supported) {
      const s = gen.splitVariant(full);
      const r = s && gen.darkFor(s.token);
      if (!r) continue;
      const bg = r.decl.match(/background-color:(#[0-9a-f]{6})/i);
      const tx = r.decl.match(/^color:(#[0-9a-f]{6})/i);
      if (bg) emitted.add(bg[1].toLowerCase());
      if (tx) emitted.add(tx[1].toLowerCase());
    }
    for (const v of emitted) {
      expect(darkSurfaces.has(v) || darkTexts.has(v), `${v} is emitted by a variant rule but is not in the audited matrix`).toBe(true);
    }
  });

  it('keeps the unsupported list small, known, and non-contrast-critical', () => {
    // Responsive and pseudo-element variants are deliberately out of scope.
    // If this list grows, something new needs a decision rather than a silent skip.
    expect(variants.unsupported.length).toBeLessThan(40);
    for (const t of variants.unsupported) {
      expect(t, `${t} is an unhandled variant that is NOT one of the known-skipped families`)
        .toMatch(/^(sm|md|lg|xl|2xl|print|placeholder|selection|marker|prose-[a-z]+):/);
    }
  });
});
