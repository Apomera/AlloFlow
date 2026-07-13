// Document-suite theme reactivity gate (2026-07-02).
// The Document Hub builder (view_export_preview) + PDF remediation pipeline
// (view_pdf_audit) get their dark/high-contrast skins from a GENERATED remap
// layer (dev-tools/gen_docsuite_theme.cjs → <style data-docsuite-theme="v1">
// in AlloFlowANTI.txt). This test keeps that layer honest:
//   1. WCAG AA matrix — every dark-mode TEXT color must clear 4.5:1 against
//      EVERY dark-mode SURFACE color the mapping can produce (worst case, so
//      any text/panel combination in the views is safe by construction).
//   2. High-contrast mode is binary black/yellow/green at ≥ 15:1.
//   3. Drift — the CSS block pasted in ANTI matches a fresh generator run.
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
  it('ANTI carries the CURRENT generator output (no drift), exactly ONCE', () => {
    const blocks = anti.match(/<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/g) || [];
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
