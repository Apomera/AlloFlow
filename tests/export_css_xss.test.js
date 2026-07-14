// Export-CSS XSS hardening (2026-06-22), from the document_builder_refinement_report security lane
// (DB-SEC1-6). Brand-profile fonts/colors and PDF-extracted/AI theme CSS are interpolated into export
// <style> blocks; a crafted value like `x;}</style><script>…` would break out (same-origin XSS in the
// preview AND the distributed .html). Two layers: (1) brand_profile_module sanitizes fonts +
// re-enforces hex on save AND every read; (2) sanitizeCustomExportCSS hardened (no-whitespace @import,
// comment-strip-first, data:image/svg+xml, and — the missing core guard — </style> breakout neutralization).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Load the real brand_profile IIFE (registers window.AlloModules.BrandProfile) ──
const bpSrc = readFileSync(resolve(process.cwd(), 'brand_profile_module.js'), 'utf8');
const loadBP = () => {
  const store = {};
  const win = { AlloModules: {} };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const fn = new Function('window', 'console', 'localStorage', 'CustomEvent', bpSrc + '\nreturn window.AlloModules.BrandProfile;');
  return fn(win, { log() {}, warn() {} }, ls, function CustomEvent() {});
};
const BP = loadBP();
const MAL_FONT = "Arial;}</style><script>alert(1)</script>";

describe('brand_profile: font + color XSS hardening (boundary defense)', () => {
  it('validateBrandProfile REJECTS a markup-bearing font with an explicit error', () => {
    const v = BP.validateBrandProfile({ name: 'X', colors: BP.DEFAULT_COLORS, fonts: { body: MAL_FONT } });
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/font contains characters/i);
  });
  it('a legitimate font stack still passes', () => {
    const v = BP.validateBrandProfile({ name: 'X', colors: BP.DEFAULT_COLORS, fonts: { body: "'Inter', system-ui, sans-serif" } });
    expect(v.ok).toBe(true);
  });
  it('brandProfileToCSS NEVER emits </style> or <script even from a stored malicious profile (read-path _normalize)', () => {
    const css = BP.brandProfileToCSS({ name: 'X', colors: BP.DEFAULT_COLORS, fonts: { body: MAL_FONT } });
    expect(css).not.toContain('</style');
    expect(css).not.toContain('<script');
    expect(css).toContain('Inter'); // fell back to the safe default font
  });
  it('brandProfileToCssVars sanitizes the font to the safe default', () => {
    expect(BP.brandProfileToCssVars({ fonts: { body: MAL_FONT } }).bodyFont).toBe(BP.DEFAULT_FONTS.body);
  });
  it('a non-hex (markup-bearing) color falls back to default on read', () => {
    const css = BP.brandProfileToCSS({ name: 'X', colors: { bg: "#fff;}</style><x", body: '#111111', heading: '#222222', accent: '#2563eb', cardBg: '#f8fafc', cardBorder: '#e2e8f0' } });
    expect(css).not.toContain('</style');
    expect(css).toContain('#ffffff'); // bg reset to default
  });
});

// ── Extract + run the real sanitizeCustomExportCSS (closure in doc_pipeline) ──
const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
// Anchor-extract (brace-counting breaks on the regex char-classes [^;}] / [\s;{] inside this fn).
const _sS = dp.indexOf('const sanitizeCustomExportCSS = (rawCss) =>');
const _sE = dp.indexOf('};', dp.indexOf('return out;', _sS)) + 2;
const sanitizeCustomExportCSS = new Function('warnLog', dp.slice(_sS, _sE) + '\nreturn sanitizeCustomExportCSS;')(() => {});

describe('sanitizeCustomExportCSS: hardened against the documented bypasses', () => {
  it('neutralizes the </style> breakout (the core XSS escape) — no raw </ survives', () => {
    const out = sanitizeCustomExportCSS('body{color:red}</style><script>alert(1)</script>');
    expect(out).not.toContain('</');           // every </ escaped to <\/
    expect(out).not.toContain('</style');
  });
  it('catches the no-whitespace @import form (SEC5)', () => {
    const out = sanitizeCustomExportCSS('@import"https://attacker/x.css";body{}');
    expect(out).not.toContain('attacker');
  });
  it('strips block comments first so split tokens cannot hide (SEC5 evasion)', () => {
    expect(sanitizeCustomExportCSS('/* hi */ body{}')).not.toContain('/* hi */');
  });
  it('blocks data:image/svg+xml in url() (SEC6)', () => {
    const out = sanitizeCustomExportCSS("body{background:url('data:image/svg+xml;base64,PHN2Zz4=')}");
    expect(out).not.toContain('svg+xml');
    expect(out).toContain('about:blank');
  });
  it('still strips the classic vectors (expression, javascript: url)', () => {
    expect(sanitizeCustomExportCSS('x{width:expression(alert(1))}')).not.toContain('alert(1)'); // call removed (replacement comment may mention the word)
    expect(sanitizeCustomExportCSS("x{background:url(javascript:alert(1))}")).toContain('about:blank');
  });
  it('leaves valid CSS intact', () => {
    const css = "body { color: #333; font-family: 'Inter', sans-serif; }";
    const out = sanitizeCustomExportCSS(css);
    expect(out).toContain('#333');
    expect(out).toContain("'Inter'");
    expect(out).toContain('font-family');
  });
});

// ── _sanitizeStyleObj (PDF brand-override + auto-extract style objects → style="" attrs) ──
const _soS = dp.indexOf('function _sanitizeStyleObj(obj)');
// the fn has an EARLY `return out;` (guard) + the FINAL one — anchor on the 2nd so the
// closing } we slice to is the function's, not a } inside the /["<>;{}\\]/ char-class.
const _soRet = dp.indexOf('return out;', dp.indexOf('return out;', _soS) + 1);
const _soE = dp.indexOf('}', _soRet) + 1;
const _sanitizeStyleObj = new Function(dp.slice(_soS, _soE) + '\nreturn _sanitizeStyleObj;')();

describe('PDF brand-override style sanitization (DB-SEC missed-sink consistency)', () => {
  it('_sanitizeStyleObj drops attribute/style breakout + CSS-injection values', () => {
    const out = _sanitizeStyleObj({ accentColor: '#2563eb', headingColor: '"><img src=x onerror=alert(1)>', bodyFont: 'url(javascript:alert(1))', bgColor: '#fff;}</style>' });
    expect(out.accentColor).toBe('#2563eb');     // clean value kept
    expect(out.headingColor).toBeUndefined();     // " > < dropped
    expect(out.bodyFont).toBeUndefined();         // url( dropped
    expect(out.bgColor).toBeUndefined();          // ; } < dropped
  });
  it('every LIVE _brandOverride merge site routes through _sanitizeStyleObj (no raw spread)', () => {
    // Harness repair (2026-07-09): the batchDocStyle merge lived in the dead legacy batch loop
    // deleted @3a5d9280 (S4) — one live merge site remains, and it is sanitized. The raw-spread
    // bans stay: a NEW unsanitized merge anywhere still fails.
    expect(dp).not.toMatch(/\{ \.\.\.batchDocStyle, \.\.\._brandOverride \}/);
    expect(dp).not.toMatch(/\{ \.\.\.docStyle, \.\.\._brandOverride \}/);
    const sanitizedMerges = dp.match(/\.\.\._sanitizeStyleObj\(_brandOverride\)/g) || [];
    expect(sanitizedMerges.length).toBeGreaterThanOrEqual(1);
    // and no bare `_brandOverride` spread exists outside the sanitizer route
    const rawSpreads = (dp.match(/\.\.\._brandOverride\b/g) || []).length;
    expect(rawSpreads).toBe(0);
  });
});
