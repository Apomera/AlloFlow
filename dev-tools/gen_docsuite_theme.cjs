#!/usr/bin/env node
/**
 * Scoped theme remap generator (2026-07-02, multi-scope since v2).
 *
 * Large parts of the app were authored light-only with Tailwind color
 * utilities. Instead of hand-editing thousands of class sites, this script
 * derives scoped CSS remap layers per SCOPE:
 *
 *   allo-docsuite — Document Hub builder (view_export_preview) + PDF
 *                   remediation pipeline (view_pdf_audit) modal overlays
 *   allo-selsuite — the 4 SEL Hub tools that style via Tailwind classNames
 *                   (civicaction/cultureexplorer/ethicalreasoning/selfadvocacy;
 *                   the other 66 use the inline-hex _xxC remap pattern)
 *   allo-appsuite — the main content area (<main id="main-content">): the
 *                   artifact views (quiz/glossary/renderers/lesson-plan/…)
 *                   and sidebar panels. DARK gets the full inverse mapping;
 *                   CONTRAST fills the tint gaps the app-wide binary rules
 *                   (.theme-contrast .bg-white/... in ANTI) don't cover.
 *
 * .theme-dark …   →  inverse dark palette (WCAG AA enforced by
 *                    tests/docsuite_theme_contrast.test.js — full worst-case
 *                    text×surface matrix)
 * .theme-contrast →  binary black / yellow / green, matching the app pattern
 *
 * The generated block lives in AlloFlowANTI.txt inside
 * <style data-docsuite-theme="v1"> … </style> (exactly one copy). Regenerate:
 *
 *   node dev-tools/_apply_docsuite_theme.cjs         # re-paste into ANTI
 *   node dev-tools/gen_docsuite_theme.cjs --check    # verify ANTI is current
 *
 * Iframes (document previews / WYSIWYG surface) are separate documents —
 * page CSS cannot reach them, so student-facing document content keeps its
 * own theming. STEM Lab / SEL hex-remapped tools / games render OUTSIDE
 * these scopes and keep their own theme systems.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DOCSUITE_FILES = ['view_pdf_audit_source.jsx', 'view_export_preview_source.jsx'];
const SELSUITE_FILES = [
  'sel_hub/sel_tool_civicaction.js',
  'sel_hub/sel_tool_cultureexplorer.js',
  'sel_hub/sel_tool_ethicalreasoning.js',
  'sel_hub/sel_tool_selfadvocacy.js',
];
// Everything that renders inside <main id="main-content">: all view sources
// (minus the two docsuite modals, which render outside <main>) + shared
// components. Extra tokens from files whose components render outside the
// scope are harmless (their selectors simply never match).
function appsuiteFiles(root) {
  return fs.readdirSync(root)
    .filter(f => f.startsWith('view_') && f.endsWith('_source.jsx') && !DOCSUITE_FILES.includes(f))
    .concat(['misc_components_source.jsx'])
    .filter(f => fs.existsSync(path.join(root, f)))
    .sort();
}

// ANTI is scanned ONLY between <main id="main-content"> and </main> — the
// region the scope class actually covers. Scanning the whole 1.7MB file would
// drag in STEM/games/splash tokens whose rules could never match.
function antiMainSliceTokens(root) {
  const anti = fs.readFileSync(path.join(root || ROOT, 'AlloFlowANTI.txt'), 'utf8');
  // Anchor on the <main> element's ref (unique), NOT on id="main-content" —
  // that string also appears in skip-link hrefs and in our own generated CSS
  // comment (a self-reference that once made --check flap between runs).
  const start = anti.indexOf('ref={mainContainerRef}');
  const end = anti.indexOf('</main>', start);
  if (start === -1 || end === -1) throw new Error('main-content region not found in AlloFlowANTI.txt');
  const slice = anti.slice(start, end);
  const seen = new Set();
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(slice))) seen.add(m[0]);
  return [...seen].sort();
}

// ONE shared scope class for every generated-theme region. The name predates
// the SEL/main-content scopes (it started on the Document-suite modals) but
// renaming it would churn all the already-tagged overlay roots for zero gain.
const SCOPE_CLASS = 'allo-docsuite';
const SCOPES = [
  { name: 'docsuite (PDF remediation + Document Hub modals)', files: () => DOCSUITE_FILES },
  { name: 'selsuite (4 Tailwind SEL tools)', files: () => SELSUITE_FILES },
  { name: 'appsuite (main-content artifact views + sidebar)', files: appsuiteFiles },
];

// Tailwind v3 palette slices used by the mapping (300 for dark-mode text,
// 700/800 for borders+rings, 900/950 for tinted dark surfaces).
const FAM = {
  slate:   { 300:'#cbd5e1', 700:'#334155', 800:'#1e293b', 900:'#0f172a', 950:'#020617' },
  gray:    { 300:'#d1d5db', 700:'#374151', 800:'#1f2937', 900:'#111827', 950:'#030712' },
  zinc:    { 300:'#d4d4d8', 700:'#3f3f46', 800:'#27272a', 900:'#18181b', 950:'#09090b' },
  neutral: { 300:'#d4d4d4', 700:'#404040', 800:'#262626', 900:'#171717', 950:'#0a0a0a' },
  stone:   { 300:'#d6d3d1', 700:'#44403c', 800:'#292524', 900:'#1c1917', 950:'#0c0a09' },
  red:     { 300:'#fca5a5', 700:'#b91c1c', 800:'#991b1b', 900:'#7f1d1d', 950:'#450a0a' },
  orange:  { 300:'#fdba74', 700:'#c2410c', 800:'#9a3412', 900:'#7c2d12', 950:'#431407' },
  amber:   { 300:'#fcd34d', 700:'#b45309', 800:'#92400e', 900:'#78350f', 950:'#451a03' },
  yellow:  { 300:'#fde047', 700:'#a16207', 800:'#854d0e', 900:'#713f12', 950:'#422006' },
  lime:    { 300:'#bef264', 700:'#4d7c0f', 800:'#3f6212', 900:'#365314', 950:'#1a2e05' },
  green:   { 300:'#86efac', 700:'#15803d', 800:'#166534', 900:'#14532d', 950:'#052e16' },
  emerald: { 300:'#6ee7b7', 700:'#047857', 800:'#065f46', 900:'#064e3b', 950:'#022c22' },
  teal:    { 300:'#5eead4', 700:'#0f766e', 800:'#115e59', 900:'#134e4a', 950:'#042f2e' },
  cyan:    { 300:'#67e8f9', 700:'#0e7490', 800:'#155e75', 900:'#164e63', 950:'#083344' },
  sky:     { 300:'#7dd3fc', 700:'#0369a1', 800:'#075985', 900:'#0c4a6e', 950:'#082f49' },
  blue:    { 300:'#93c5fd', 700:'#1d4ed8', 800:'#1e40af', 900:'#1e3a8a', 950:'#172554' },
  indigo:  { 300:'#a5b4fc', 700:'#4338ca', 800:'#3730a3', 900:'#312e81', 950:'#1e1b4b' },
  violet:  { 300:'#c4b5fd', 700:'#6d28d9', 800:'#5b21b6', 900:'#4c1d95', 950:'#2e1065' },
  purple:  { 300:'#d8b4fe', 700:'#7e22ce', 800:'#6b21a8', 900:'#581c87', 950:'#3b0764' },
  fuchsia: { 300:'#f0abfc', 700:'#a21caf', 800:'#86198f', 900:'#701a75', 950:'#4a044e' },
  pink:    { 300:'#f9a8d4', 700:'#be185d', 800:'#9d174d', 900:'#831843', 950:'#500724' },
  rose:    { 300:'#fda4af', 700:'#be123c', 800:'#9f1239', 900:'#881337', 950:'#4c0519' },
};

// Dark neutral scale (panels + text) — tuned so every TEXT value clears
// WCAG AA 4.5:1 on every SURFACE value (the test enforces the full matrix).
const DARK = {
  panel: '#1e293b',        // bg-white
  panelDeep: '#0f172a',    // bg-slate-50
  panelMid: '#26334a',     // bg-slate-200
  panelHigh: '#334155',    // bg-slate-300
  textHi: '#f8fafc', textHi2: '#f1f5f9', textMain: '#e2e8f0',
  textSoft: '#cbd5e1', textDim: '#a9b7c8', textFaint: '#a3b1c2',
  borderMain: '#334155', borderStrong: '#475569',
};

const CONTRAST = { bg: '#000000', text: '#ffff00', accent: '#00ff00' };

const FAMS_RE = Object.keys(FAM).join('|');
const TOKEN_RE = new RegExp(`\\b(bg|text|border|from|to|via|ring|divide)-(white|black|${FAMS_RE})(?:-(\\d{2,3}))?(?:\\/(\\d{1,3}))?\\b`, 'g');

function scanTokens(root, files) {
  const seen = new Set();
  for (const f of files) {
    const txt = fs.readFileSync(path.join(root || ROOT, f), 'utf8');
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(txt))) seen.add(m[0]);
  }
  return [...seen].sort();
}

function allTokens(root) {
  const union = new Set();
  for (const scope of SCOPES) {
    for (const tok of scanTokens(root, scope.files(root || ROOT))) union.add(tok);
  }
  for (const tok of antiMainSliceTokens(root)) union.add(tok);
  return [...union].sort();
}

function parseToken(tok) {
  TOKEN_RE.lastIndex = 0;
  const m = TOKEN_RE.exec(tok);
  if (!m) return null;
  return { prop: m[1], fam: m[2], shade: m[3] ? parseInt(m[3], 10) : null, alpha: m[4] ? parseInt(m[4], 10) : null };
}

const isNeutral = (fam) => fam === 'slate' || fam === 'gray' || fam === 'zinc' || fam === 'neutral' || fam === 'stone';

// → { decl: 'background-color:#... !important', ... } or null (keep as-authored)
function darkFor(tok) {
  const p = parseToken(tok);
  if (!p) return null;
  const { prop, fam, shade, alpha } = p;
  const bgVal = () => {
    if (fam === 'white') return alpha != null ? `rgba(30,41,59,${Math.max(alpha, 85) / 100})` : DARK.panel;
    if (fam === 'black') return null;
    if (isNeutral(fam)) return shade <= 50 ? DARK.panelDeep : shade === 100 ? DARK.panel : shade === 200 ? DARK.panelMid : shade === 300 ? DARK.panelHigh : null;
    if (shade == null) return null;
    // All light tints flatten to the family's 950 — keeps the worst-case
    // text-on-surface contrast matrix ≥ 4.5:1 (see the test).
    if (shade <= 300) return FAM[fam][950];
    return null; // saturated ≥400 stays (buttons/CTAs already work on dark)
  };
  switch (prop) {
    case 'bg': {
      const v = bgVal();
      return v ? { decl: `background-color:${v} !important` } : null;
    }
    case 'text': {
      if (fam === 'white') return null;
      if (fam === 'black') return { decl: `color:${DARK.textHi2} !important` };
      if (isNeutral(fam)) {
        const map = { 900: DARK.textHi, 800: DARK.textHi2, 700: DARK.textMain, 600: DARK.textSoft, 500: DARK.textDim, 400: DARK.textFaint };
        return map[shade] ? { decl: `color:${map[shade]} !important` } : null;
      }
      if (shade >= 400) return { decl: `color:${FAM[fam][300]} !important` };
      return null; // -300 and lighter already read on dark
    }
    case 'border': {
      if (fam === 'white') return { decl: `border-color:${DARK.borderMain} !important` };
      if (fam === 'black') return null;
      if (isNeutral(fam)) return shade <= 200 ? { decl: `border-color:${DARK.borderMain} !important` } : shade <= 400 ? { decl: `border-color:${DARK.borderStrong} !important` } : null;
      if (shade <= 300) return { decl: `border-color:${FAM[fam][800]} !important` };
      if (shade <= 600) return { decl: `border-color:${FAM[fam][700]} !important` };
      return null;
    }
    case 'ring': {
      if (fam === 'white' || fam === 'black') return null;
      if (isNeutral(fam)) return { decl: `--tw-ring-color:${DARK.borderStrong} !important` };
      if (shade != null && shade <= 600) return { decl: `--tw-ring-color:${FAM[fam][700]} !important` };
      return null;
    }
    case 'divide': {
      if (isNeutral(fam)) return { decl: `border-color:${DARK.borderMain} !important`, child: true };
      if (shade != null && shade <= 300) return { decl: `border-color:${FAM[fam][800]} !important`, child: true };
      return null;
    }
    case 'from': case 'to': case 'via': {
      // Light gradient tints → flatten to a dark panel (version-proof vs
      // guessing at --tw-gradient-* internals across Tailwind releases).
      const v = bgVal();
      return v ? { decl: `background-image:none !important;background-color:${v} !important` } : null;
    }
    default: return null;
  }
}

function contrastFor(tok) {
  const p = parseToken(tok);
  if (!p) return null;
  const { prop, fam } = p;
  switch (prop) {
    case 'bg':
      if (fam === 'black') return null;
      return { decl: `background-color:${CONTRAST.bg} !important` };
    case 'text':
      return { decl: `color:${CONTRAST.text} !important` };
    case 'border':
      return { decl: `border-color:${CONTRAST.text} !important` };
    case 'ring':
      return { decl: `--tw-ring-color:${CONTRAST.text} !important` };
    case 'divide':
      return { decl: `border-color:${CONTRAST.text} !important`, child: true };
    case 'from': case 'to': case 'via':
      return { decl: `background-image:none !important;background-color:${CONTRAST.bg} !important` };
    default: return null;
  }
}

// Slash tokens (bg-white/80) use [class~=] so no backslash escaping is needed
// when the emitted CSS is pasted inside a JSX template literal in ANTI.
const selFor = (tok) => tok.includes('/') ? `[class~="${tok}"]` : `.${tok}`;

function buildRules(tokens, mapFn, scopePrefix) {
  const groups = new Map(); // decl -> [selectors]
  for (const tok of tokens) {
    const r = mapFn(tok);
    if (!r) continue;
    const sel = `${scopePrefix} ${selFor(tok)}${r.child ? ' > * + *' : ''}`;
    if (!groups.has(r.decl)) groups.set(r.decl, []);
    groups.get(r.decl).push(sel);
  }
  const out = [];
  for (const [decl, sels] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push(`${sels.join(', ')} { ${decl}; }`);
  }
  return out.join('\n');
}

function formControlBlock(cls) {
  return `.theme-dark .${cls} { color-scheme: dark; }
.theme-dark .${cls} input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.theme-dark .${cls} textarea,
.theme-dark .${cls} select {
  background-color:${DARK.panel};
  color:${DARK.textMain};
  border-color:${DARK.borderMain};
}
.theme-contrast .${cls} { color-scheme: dark; }
.theme-contrast .${cls} input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.theme-contrast .${cls} textarea,
.theme-contrast .${cls} select {
  background-color:${CONTRAST.bg} !important;
  color:${CONTRAST.text} !important;
  border-color:${CONTRAST.text} !important;
}
.theme-contrast .${cls} button {
  color:${CONTRAST.accent} !important;
  border-color:${CONTRAST.accent} !important;
}
.theme-contrast .${cls} [class*="bg-gradient"] {
  background-image:none !important;
  background-color:${CONTRAST.bg} !important;
}`;
}

function generateCss(root) {
  const r = root || ROOT;
  // One rule set over the token UNION under the single shared scope class —
  // the mapping is identical for every scope, so per-scope duplication would
  // only triple the CSS for zero behavioral difference.
  const union = allTokens(r);
  const parts = [`/* ── Scoped theme remaps (GENERATED — do not hand-edit) ──
 * Source of truth: dev-tools/gen_docsuite_theme.cjs (re-apply via
 * dev-tools/_apply_docsuite_theme.cjs when any scanned file gains new
 * color utilities). Contrast matrix + drift enforced by
 * tests/docsuite_theme_contrast.test.js.
 * Scope class .${SCOPE_CLASS} covers: ${SCOPES.map(s => s.name).join('; ')};
 * plus the main-content JSX region of ANTI. Union ${union.length} tokens. */`];
  parts.push(formControlBlock(SCOPE_CLASS));
  parts.push(buildRules(union, darkFor, `.theme-dark .${SCOPE_CLASS}`));
  parts.push(buildRules(union, contrastFor, `.theme-contrast .${SCOPE_CLASS}`));
  return parts.join('\n');
}

module.exports = { FAM, DARK, CONTRAST, SCOPES, SCOPE_CLASS, scanTokens, allTokens, antiMainSliceTokens, parseToken, darkFor, contrastFor, generateCss };

if (require.main === module) {
  const css = generateCss(ROOT);
  if (process.argv.includes('--check')) {
    const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
    const blocks = anti.match(/<style data-docsuite-theme="v1">\{`([\s\S]*?)`\}<\/style>/g) || [];
    if (blocks.length !== 1) { console.error(`✗ expected exactly 1 docsuite theme <style> block in AlloFlowANTI.txt, found ${blocks.length}`); process.exit(1); }
    const m = blocks[0].match(/<style data-docsuite-theme="v1">\{`([\s\S]*?)`\}<\/style>/);
    if (m[1].trim() !== css.trim()) { console.error('✗ docsuite theme CSS in AlloFlowANTI.txt is STALE — rerun dev-tools/_apply_docsuite_theme.cjs.'); process.exit(1); }
    console.log('✓ scoped theme CSS is current (' + css.split('\n').length + ' lines, ' + SCOPES.length + ' scopes).');
  } else {
    process.stdout.write(css);
  }
}
