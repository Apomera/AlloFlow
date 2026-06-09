#!/usr/bin/env node
// _audit_stem_contrast.cjs — WCAG 2.1 contrast audit across all stem_tool_*.js.
//
// Usage:  node _audit_stem_contrast.cjs
//
// Approach (heuristic, not semantic):
//   1. Find every `style: { ... }` object literal in each stem_tool_*.js.
//   2. Extract `color`, `background`, `backgroundColor`, `borderColor` values.
//   3. For each `color` site, pair it with the SAME-block background if present,
//      else the most recently declared background in the file's preceding lines
//      (windowed look-back — approximates JSX inheritance).
//   4. Resolve `var(--allo-stem-X, fallback)` to the fallback hex (light-theme
//      default) AND separately to the dark-theme variant defined in
//      AlloFlowANTI.txt. Reports both so we see per-theme contrast.
//   5. Composite rgba foregrounds onto their backgrounds before comparing.
//   6. Flag pairs below WCAG AA 4.5:1 (normal text) — separately list "near-miss"
//      pairs 3:1–4.5:1 since they may be UI components / large text where 3:1 OK.
//
// Limitations:
//   - Does not understand JSX nesting, so background-inheritance is approximated
//     by "last background within 30 lines above". Misses cases where the
//     background lives further up the tree.
//   - Skips `color` values that are JS expressions like `pt.color` (template-data).
//   - Does not handle background-image gradients (only solid bg).
//   - Resolves CSS vars to their fallback only — doesn't traverse the live
//     :root cascade. The dark-theme map below is hardcoded from AlloFlowANTI.txt.
//
// Sibling: _audit_help_keys.cjs, _audit_help_anchors.cjs.

const fs = require('fs');
const path = require('path');

const TOOL_DIR = path.join(__dirname, 'stem_lab');
const REPORT_DIR = path.join(__dirname, 'a11y-audit');
const REPORT_PATH = path.join(REPORT_DIR, 'stem_contrast_audit.txt');

// ─── Color math (WCAG 2.1) ──────────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b, a: 1 };
}

// Theme variable map — pulled from AlloFlowANTI.txt:22262–22299.
// Two passes: light = `:root, .theme-default`; dark = `.theme-dark`.
const VAR_MAP = {
  light: {
    '--allo-stem-canvas': '#ffffff',
    '--allo-stem-panel': '#f8fafc',
    '--allo-stem-deeper': '#e2e8f0',
    '--allo-stem-text': '#0f172a',
    '--allo-stem-text-soft': '#475569',
    '--allo-stem-border': '#cbd5e1',
    '--allo-stem-button-bg': '#f1f5f9',
    '--allo-stem-button-text': '#0f172a',
    '--allo-stem-button-border': '#cbd5e1',
  },
  dark: {
    '--allo-stem-canvas': '#0f172a',
    '--allo-stem-panel': '#1e293b',
    '--allo-stem-deeper': '#020617',
    '--allo-stem-text': '#e2e8f0',
    '--allo-stem-text-soft': '#94a3b8',
    '--allo-stem-border': '#334155',
    '--allo-stem-button-bg': '#1e293b',
    '--allo-stem-button-text': '#e2e8f0',
    '--allo-stem-button-border': '#334155',
  },
};

function parseColor(raw, theme) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^['"]|['"]$/g, '').trim();

  // var(--name, fallback)
  const v = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/);
  if (v) {
    const themed = VAR_MAP[theme] && VAR_MAP[theme][v[1]];
    if (themed) return parseColor(themed, theme);
    if (v[2]) return parseColor(v[2], theme);
    return null;
  }

  // rgb / rgba
  const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    const r = Math.round(+rgba[1]), g = Math.round(+rgba[2]), b = Math.round(+rgba[3]);
    const a = rgba[4] !== undefined ? +rgba[4] : 1;
    return { r, g, b, a };
  }

  // #RGB / #RRGGBB
  if (/^#[0-9a-fA-F]{3,6}$/.test(s)) return hexToRgb(s);

  // Named colors — keep tiny set we actually use
  const NAMED = {
    white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', gray: '#808080', grey: '#808080',
    transparent: null,
  };
  if (NAMED[s.toLowerCase()] !== undefined) {
    const named = NAMED[s.toLowerCase()];
    return named ? hexToRgb(named) : null;
  }
  return null; // unparseable (template literal, JS expression, gradient, etc.)
}

function compositeOver(fg, bg) {
  if (fg.a === undefined || fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = Math.max(0, Math.min(1, fg.a));
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function relLum(c) {
  const ch = [c.r, c.g, c.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(fg, bg) {
  const L1 = relLum(fg), L2 = relLum(bg);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

// ─── Style-block parser ────────────────────────────────────────
// Find every `style: { ... }` in a file. Returns array of
// { content, lineNum, color, bg }.
function parseStyleBlocks(text) {
  const blocks = [];
  let i = 0;
  while (true) {
    const idx = text.indexOf('style:', i);
    if (idx === -1) break;
    // Find opening brace
    let j = idx + 6;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '{') { i = idx + 6; continue; }
    // Brace-match
    let depth = 1, k = j + 1;
    while (k < text.length && depth > 0) {
      const c = text[k];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '/' && text[k + 1] === '/') {
        while (k < text.length && text[k] !== '\n') k++;
      } else if (c === "'" || c === '"' || c === '`') {
        const quote = c; k++;
        while (k < text.length && text[k] !== quote) {
          if (text[k] === '\\') k++;
          k++;
        }
      }
      k++;
    }
    const content = text.slice(j + 1, k - 1);
    const lineNum = text.slice(0, idx).split('\n').length;
    blocks.push({ start: idx, end: k, content, lineNum });
    i = k;
  }
  return blocks;
}

// Extract style-property values from a block. Returns { color, bg }.
// Only captures literal-looking values (quoted strings, hex, rgba, var).
function extractProps(content) {
  const get = (prop) => {
    // Match `prop:` followed by either a quoted literal or a template-like expression.
    const re = new RegExp(prop + "\\s*:\\s*(?:(['\"`])([^'\"`]*?)\\1|([a-zA-Z_$][\\w$.]*))(?=\\s*[,}\\n])", 'g');
    const matches = [];
    let m;
    while ((m = re.exec(content))) {
      matches.push(m[2] !== undefined ? m[2] : null); // null for JS-expression values
    }
    return matches[0] !== undefined ? matches[0] : undefined;
  };
  return {
    color: get('color'),
    bg: get('background') || get('backgroundColor'),
  };
}

// ─── Run the audit ─────────────────────────────────────────────
const files = fs.readdirSync(TOOL_DIR).filter(f => /^stem_tool_.*\.js$/.test(f));
const results = []; // { file, theme, fg, bg, ratio, lineNum }

for (const file of files) {
  const fullPath = path.join(TOOL_DIR, file);
  const text = fs.readFileSync(fullPath, 'utf-8');
  const blocks = parseStyleBlocks(text);

  // Walk blocks; remember last-seen background per theme to approximate inheritance.
  let lastBgLine = -Infinity, lastBgRaw = null;

  for (const b of blocks) {
    const props = extractProps(b.content);
    if (props.bg) {
      lastBgLine = b.lineNum;
      lastBgRaw = props.bg;
    }

    if (!props.color) continue;

    // Pair this color with: SAME-block bg if present, else last bg within 30 lines.
    let bgRaw = props.bg;
    if (!bgRaw && lastBgLine >= b.lineNum - 30 && lastBgLine <= b.lineNum) {
      bgRaw = lastBgRaw;
    }
    if (!bgRaw) continue; // No bg context — skip rather than guess.

    for (const theme of ['light', 'dark']) {
      const fg = parseColor(props.color, theme);
      const bg = parseColor(bgRaw, theme);
      if (!fg || !bg) continue; // unparseable
      // Composite rgba foreground over bg (if bg also has alpha, treat as opaque
      // approximation — we don't track grandparent bg).
      const opaqueBg = { r: bg.r, g: bg.g, b: bg.b, a: 1 };
      const composedFg = compositeOver(fg, opaqueBg);
      const ratio = contrast(composedFg, opaqueBg);
      results.push({
        file, theme, fg: props.color, bg: bgRaw,
        ratio: +ratio.toFixed(2), lineNum: b.lineNum,
      });
    }
  }
}

// ─── Categorize & report ───────────────────────────────────────
const FAIL_AA = 4.5;   // normal text WCAG AA
const LARGE_AA = 3.0;  // large text / UI components

// Classify each finding:
//   "definite"     — bg is opaque (no rgba alpha) OR fg/bg hues are clearly distinct.
//                    Heuristic outcome reliable.
//   "same_hue"     — bg is rgba and shares the fg's hue (within 30 RGB units per channel).
//                    Real rendered contrast depends on grandparent bg that we don't track.
//                    Likely a real failure in dark theme (translucent stays dark) and
//                    a likely pass in light theme (translucent washes light), so we treat
//                    these as suspect rather than confirmed.
//   "translucent"  — bg rgba alpha < 1 but different hue — modest false-positive risk.
function classifyPair(r) {
  const bgRgba = String(r.bg).match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (!bgRgba) return 'definite';
  const a = bgRgba[4] !== undefined ? +bgRgba[4] : 1;
  if (a >= 1) return 'definite';
  // Try parsing fg as a literal color
  const fgRgb = (() => {
    const s = String(r.fg).trim();
    if (/^#[0-9a-fA-F]{3,6}$/.test(s)) return hexToRgb(s);
    const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (rgba) return { r: +rgba[1], g: +rgba[2], b: +rgba[3] };
    return null;
  })();
  if (!fgRgb) return 'translucent';
  const bgRgb = { r: +bgRgba[1], g: +bgRgba[2], b: +bgRgba[3] };
  const dr = Math.abs(fgRgb.r - bgRgb.r);
  const dg = Math.abs(fgRgb.g - bgRgb.g);
  const db = Math.abs(fgRgb.b - bgRgb.b);
  if (dr < 30 && dg < 30 && db < 30) return 'same_hue';
  return 'translucent';
}

for (const r of results) r.category = classifyPair(r);

const failures = results.filter(r => r.ratio < FAIL_AA);
const severe = failures.filter(r => r.ratio < LARGE_AA);
const nearMiss = failures.filter(r => r.ratio >= LARGE_AA);

const definiteSevere = severe.filter(r => r.category === 'definite');
const sameHueSevere  = severe.filter(r => r.category === 'same_hue');
const translucentSevere = severe.filter(r => r.category === 'translucent');

// Deduplicate by (file, fg, bg) — same color pair often appears many times
function dedupe(arr) {
  const seen = new Map();
  for (const r of arr) {
    const key = r.file + '|' + r.theme + '|' + r.fg + '|' + r.bg;
    if (!seen.has(key)) seen.set(key, { ...r, count: 1, lines: [r.lineNum] });
    else { const e = seen.get(key); e.count++; e.lines.push(r.lineNum); }
  }
  return Array.from(seen.values()).sort((a, b) => a.ratio - b.ratio);
}

const dedupedDefinite = dedupe(definiteSevere);
const dedupedSameHue = dedupe(sameHueSevere);
const dedupedTranslucent = dedupe(translucentSevere);
const dedupedNear = dedupe(nearMiss);

// Per-tool tally — count only DEFINITE failures (high confidence) plus near-miss
const perTool = {};
for (const f of [...definiteSevere, ...nearMiss]) {
  perTool[f.file] = perTool[f.file] || { severe: 0, near: 0 };
  if (f.ratio < LARGE_AA) perTool[f.file].severe++;
  else perTool[f.file].near++;
}

// Per-tool tally for suspect-only failures
const perToolSuspect = {};
for (const f of [...sameHueSevere, ...translucentSevere]) {
  perToolSuspect[f.file] = (perToolSuspect[f.file] || 0) + 1;
}

// ─── Write report ──────────────────────────────────────────────
const out = [];
out.push('='.repeat(72));
out.push('  STEM-TOOL CONTRAST AUDIT (WCAG 2.1 AA, normal text 4.5:1)');
out.push('='.repeat(72));
out.push('');
out.push('Files scanned:           ' + files.length);
out.push('Color/bg pairs analyzed: ' + results.length);
out.push('');
out.push('SEVERE FAILURES (ratio < 3:1) — split by confidence:');
out.push('  DEFINITE       (opaque bg, distinct hues): ' + definiteSevere.length + ' instances, ' + dedupedDefinite.length + ' unique pairs');
out.push('  SAME-HUE rgba  (depends on grandparent bg): ' + sameHueSevere.length + ' instances, ' + dedupedSameHue.length + ' unique pairs');
out.push('  TRANSLUCENT bg (modest false-positive risk): ' + translucentSevere.length + ' instances, ' + dedupedTranslucent.length + ' unique pairs');
out.push('NEAR-MISS (3:1 – 4.5:1): ' + nearMiss.length + ' instances, ' + dedupedNear.length + ' unique pairs');
out.push('');
out.push('Tools with ≥1 DEFINITE failure: ' + Object.keys(perTool).length + ' / ' + files.length);
out.push('');
out.push('NOTE: ratios computed against the nearest declared background in the');
out.push('same/preceding style block (≤30 lines). Misses ancestor-inherited bg.');
out.push('Theme = "light" uses :root/theme-default CSS var values; "dark" uses');
out.push('.theme-dark values from AlloFlowANTI.txt.');
out.push('');

out.push('-'.repeat(72));
out.push('TOP 30 TOOLS BY FAILURE COUNT (severe + near)');
out.push('-'.repeat(72));
const topTools = Object.entries(perTool)
  .map(([f, c]) => [f, c.severe, c.near, c.severe + c.near])
  .sort((a, b) => b[3] - a[3])
  .slice(0, 30);
for (const [f, sev, near, total] of topTools) {
  out.push('  ' + String(total).padStart(4) + ' (' + String(sev).padStart(3) + ' severe, ' +
           String(near).padStart(3) + ' near)   ' + f);
}
out.push('');

out.push('-'.repeat(72));
out.push('DEFINITE SEVERE FAILURES — fix these (heuristic high-confidence)');
out.push('-'.repeat(72));
for (const r of dedupedDefinite.slice(0, 80)) {
  out.push('  ratio=' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           'fg=' + r.fg.padEnd(34) + ' bg=' + r.bg.padEnd(34) +
           ' ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedDefinite.length > 80) out.push('  ... ' + (dedupedDefinite.length - 80) + ' more definite pairs omitted.');
out.push('');

out.push('-'.repeat(72));
out.push('TRANSLUCENT-BG SEVERE — likely real but rendered color depends on grandparent');
out.push('-'.repeat(72));
for (const r of dedupedTranslucent.slice(0, 40)) {
  out.push('  ratio=' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           'fg=' + r.fg.padEnd(34) + ' bg=' + r.bg.padEnd(34) +
           ' ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedTranslucent.length > 40) out.push('  ... ' + (dedupedTranslucent.length - 40) + ' more translucent pairs omitted.');
out.push('');

out.push('-'.repeat(72));
out.push('SAME-HUE rgba SUSPECT — only fails if grandparent bg = same hue (eyeball check)');
out.push('-'.repeat(72));
for (const r of dedupedSameHue.slice(0, 30)) {
  out.push('  ratio=' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           'fg=' + r.fg.padEnd(34) + ' bg=' + r.bg.padEnd(34) +
           ' ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedSameHue.length > 30) out.push('  ... ' + (dedupedSameHue.length - 30) + ' more same-hue pairs omitted.');
out.push('');

out.push('-'.repeat(72));
out.push('NEAR-MISS FAILURES (3:1 ≤ ratio < 4.5:1) — passes for large/UI, fails normal text');
out.push('-'.repeat(72));
for (const r of dedupedNear.slice(0, 60)) {
  out.push('  ratio=' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           'fg=' + r.fg.padEnd(34) + ' bg=' + r.bg.padEnd(34) +
           ' ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedNear.length > 60) out.push('  ... ' + (dedupedNear.length - 60) + ' more near-miss pairs omitted.');
out.push('');

try { if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true }); }
catch (_) {}
fs.writeFileSync(REPORT_PATH, out.join('\n'));

console.log('Stem-tool contrast audit:');
console.log('  files=' + files.length + ', pairs=' + results.length);
console.log('  DEFINITE severe pairs:    ' + dedupedDefinite.length + ' (' + definiteSevere.length + ' instances)');
console.log('  Translucent severe pairs: ' + dedupedTranslucent.length + ' (' + translucentSevere.length + ' instances)');
console.log('  Same-hue suspect pairs:   ' + dedupedSameHue.length + ' (' + sameHueSevere.length + ' instances)');
console.log('  Near-miss pairs:          ' + dedupedNear.length + ' (' + nearMiss.length + ' instances)');
console.log('  Tools with DEFINITE failures: ' + Object.keys(perTool).length + '/' + files.length);
console.log('Report: ' + path.relative(__dirname, REPORT_PATH).replace(/\\/g, '/'));
