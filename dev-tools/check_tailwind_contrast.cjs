#!/usr/bin/env node
/**
 * check_tailwind_contrast.cjs — WCAG AA contrast for Tailwind colour pairs.
 *
 * The 2026-09-15 sweep found 133 places where white text sat on a fill too
 * light to read (emerald-600 is 3.77:1, amber-600 3.19, lime-500 1.76), plus
 * 18 hover fills that went LIGHTER under white text — the control became least
 * readable exactly when the pointer was on it — and a reading-fluency legend at
 * 1.23:1 that was effectively invisible. Every one of those shipped through a
 * green test suite, because nothing measured colour.
 *
 * This gate measures them from the Tailwind palette itself (no browser, no
 * network) using the WCAG 2.x relative-luminance formula, and ratchets: the
 * recorded count may go DOWN but never UP.
 *
 * What it flags, inside ONE class string so both tokens really co-apply:
 *   1. text-white (or an explicit light text token) on a bg-* below 4.5:1
 *   2. hover:bg-* below 4.5:1 where the text is (or becomes) white
 *   3. text-<hue>-<n> on bg-<hue|other>-<50..200> below 4.5:1
 *
 * What it deliberately ignores, because WCAG does:
 *   - disabled styling (`disabled:`, `cursor-not-allowed`, low `opacity-`)
 *   - a second background between the two tokens: they style different states
 *   - `dark:` variants, which pair with a different surface
 *
 *   node dev-tools/check_tailwind_contrast.cjs            # verify (CI / pre-deploy)
 *   node dev-tools/check_tailwind_contrast.cjs --verbose  # list every violation
 *   node dev-tools/check_tailwind_contrast.cjs --update   # re-baseline after a REDUCTION
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'tailwind_contrast_baseline.json');
const UPDATE = process.argv.includes('--update');
const VERBOSE = process.argv.includes('--verbose');
const QUIET = process.argv.includes('--quiet');

// Tailwind v3 default palette, the shades this repo actually uses. Values are
// the published hex codes; the ratio maths below is the WCAG 2.x formula, so
// these numbers match what a browser reports (verified in Chromium 2026-09-15:
// emerald-600 3.77, indigo-500 4.47, amber-600 3.19, cyan-700 5.36).
const PALETTE = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
  lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
};

function channel(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
const colourOf = (hue, shade) => (PALETTE[hue] && PALETTE[hue][shade]) || null;

const AA = 4.5;
// `print:` restyles for paper; `group-`/`peer-` react to another element's
// state, so their colours never co-apply with the base ones here.
const SKIP = /disabled:|cursor-not-allowed|opacity-[0-5]\d?\b|dark:|print:|group-|peer-/;
// a class string: "...", '...' or `...` with no newline
const STRING = /(["'`])([^"'`\n]{0,400})\1/g;
// The (?!\/) tail rejects an alpha-suffixed token such as bg-amber-300/15. \b
// alone does NOT: it matches happily before the slash, so a 15% highlight tint
// over a dark backdrop was being scored as a solid 1.44:1 amber button. A
// translucent fill composites over whatever is behind it, so its solid-colour
// ratio is not a fact about the rendered page.
const BG = /\bbg-([a-z]+)-(\d{2,3})(?!\/)\b/;
const HOVER_BG = /\bhover:bg-([a-z]+)-(\d{2,3})(?!\/)\b/;
const TEXT = /\btext-([a-z]+)-(\d{2,3})(?!\/)\b/;

function between(chunk, a, b) {
  const i = chunk.indexOf(a);
  const j = chunk.indexOf(b);
  if (i < 0 || j < 0) return null;
  return chunk.slice(Math.min(i, j), Math.max(i, j));
}
// a second background between the two tokens means they style different states
function sameSurface(chunk, bgToken, otherToken) {
  const span = between(chunk, bgToken, otherToken);
  if (span === null) return false;
  return !span.split(/\s+/).some((t) => /^(hover:|focus:|active:)?bg-/.test(t) && t !== bgToken);
}

function violationsIn(chunk, whiteOnly) {
  if (SKIP.test(chunk)) return [];
  const out = [];
  const bg = chunk.match(BG);
  const hoverBg = chunk.match(HOVER_BG);
  const text = chunk.match(TEXT);
  // A same-string dark text token means the white one belongs to another
  // variant (print:, a hover, a conditional branch), so do not pair it.
  const whiteText = /\btext-white\b/.test(chunk) && !/\btext-(black|slate-[6789]00|gray-[6789]00|zinc-[6789]00)\b/.test(chunk);

  if (bg && whiteText) {
    const fill = colourOf(bg[1], bg[2]);
    if (fill && sameSurface(chunk, bg[0], 'text-white')) {
      const r = ratio('#ffffff', fill);
      if (r < AA) out.push({ kind: 'white-on-fill', pair: `text-white on ${bg[0]}`, ratio: r });
    }
  }
  if (hoverBg && whiteText) {
    const fill = colourOf(hoverBg[1], hoverBg[2]);
    if (fill) {
      const r = ratio('#ffffff', fill);
      if (r < AA) out.push({ kind: 'white-on-hover', pair: `text-white on ${hoverBg[0]}`, ratio: r });
    }
  }
  if (!whiteOnly && bg && text && !whiteText && Number(bg[2]) <= 200) {
    const fill = colourOf(bg[1], bg[2]);
    const ink = colourOf(text[1], text[2]);
    if (fill && ink && sameSurface(chunk, bg[0], text[0])) {
      const r = ratio(ink, fill);
      if (r < AA) out.push({ kind: 'tinted-text', pair: `${text[0]} on ${bg[0]}`, ratio: r });
    }
  }
  return out;
}

// A template literal splits one class list across several strings:
//   `... text-white ${cond ? 'bg-emerald-600 ...' : 'bg-amber-800 ...'}`
// The fill and the text token then live in DIFFERENT string literals, and a
// per-string scan cannot see the pair at all. (Found 2026-09-15: an injected
// emerald-700 -> emerald-600 regression in the header went undetected.)
// So for each backtick template, pair its static text with EACH quoted string
// interpolated inside it, and scan those combinations too.
// No length cap: a JSX className template in this repo can run to ~30 KB, and a
// 1200-char cap silently skipped exactly those (the header's status pill).
const TEMPLATE = /`([^`]*)`/g;
const INNER = /(['"])([^'"\n]{0,200})\1/g;

function templateCombos(text) {
  const combos = [];
  let t;
  TEMPLATE.lastIndex = 0;
  while ((t = TEMPLATE.exec(text)) !== null) {
    const body = t[1];
    // Static parts of the template, with ${...} holes removed. Only these are
    // unconditional: a token inside a hole belongs to one branch.
    const statics = body.replace(/\$\{[^}]*\}/g, ' ');
    // A <style> block is also a backtick template, and its selectors name the
    // very same classes; pairing across one produced pure fiction such as
    // "text-white on bg-slate-50 (1.05)". A class list has no braces -- but the
    // holes must come out FIRST, or this rejects every real className template.
    if (/[{}]/.test(statics) || /!important|@media/.test(statics)) continue;
    if (!/\btext-white\b/.test(statics)) continue;
    // Keep the static text for SKIP context (disabled:, dark:, print:) but
    // blank out its fills, so an unrelated static bg- cannot be read as the
    // branch's own -- that mispaired a cyan-300 log line (really on
    // bg-slate-900) with a bg-slate-100 from elsewhere in the same template.
    const ink = statics.replace(/\b(hover:|focus:|active:|group-hover:)?bg-[a-z]+-\d{2,3}\b/g, ' ');
    let i;
    INNER.lastIndex = 0;
    while ((i = INNER.exec(body)) !== null) {
      const piece = i[2];
      if (!BG.test(piece)) continue;
      // A branch that names its OWN text colour is not wearing the static one.
      if (/\btext-(white|black|[a-z]+-\d{2,3})\b/.test(piece)) continue;
      combos.push({ chunk: ink + ' ' + piece, snippet: piece.slice(0, 90) });
    }
  }
  return combos;
}

// A class list is often assigned to a variable and interpolated far away:
//   const tone = cond ? 'bg-emerald-600 ...' : 'bg-amber-800 ...';
//   ... className={`... text-white ${tone}`}
// The fill and the text token are then in different STATEMENTS, so neither the
// per-string nor the template pass can see the pair. This is how an injected
// emerald-700 -> emerald-600 regression in the header survived two earlier
// versions of this gate (2026-09-15).
// The declaration is frequently multi-line, so match up to the terminating
// semicolon across newlines. Capped so a malformed file cannot run away.
const ASSIGN = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]{0,4000});/g;

function variableCombos(text) {
  // Which variables are interpolated into a template that puts white text on them?
  const white = new Set();
  let t;
  TEMPLATE.lastIndex = 0;
  while ((t = TEMPLATE.exec(text)) !== null) {
    const body = t[1];
    // Strip ${...} holes BEFORE the CSS-brace test: a className template is full
    // of legitimate holes, and testing the raw body rejected every one of them.
    const bare = body.replace(/\$\{[^}]*\}/g, ' ');
    if (/[{}]/.test(bare)) continue;
    if (!/\btext-white\b/.test(bare)) continue;
    let h;
    const HOLE = /\$\{([^}]*)\}/g;
    while ((h = HOLE.exec(body)) !== null) {
      for (const id of h[1].match(/[A-Za-z_$][\w$]*/g) || []) white.add(id);
    }
  }
  if (!white.size) return [];

  const combos = [];
  let a;
  // Comments must go BEFORE matching, not after: a // comment between the
  // ternary arms may itself contain a semicolon, which ends the match early and
  // hides the arms that follow. (That is exactly what happened in the header --
  // the comment reads "...3.3-3.8:1 against white text; the 700/800 shades".)
  const code = text.replace(/\/\/[^\n]*/g, ' ');
  ASSIGN.lastIndex = 0;
  while ((a = ASSIGN.exec(code)) !== null) {
    if (!white.has(a[1])) continue;
    const rhs = a[2];
    // Only a class-list assignment, never a block of code that happens to fit.
    if (/[{}()]/.test(rhs)) continue;
    let i;
    INNER.lastIndex = 0;
    while ((i = INNER.exec(rhs)) !== null) {
      const piece = i[2];
      // A /NN alpha suffix is a translucent tint composited over whatever sits
      // behind it, so its solid-colour ratio says nothing (bg-amber-300/15 is a
      // 15% highlight on the tour's dark backdrop, not a 1.44:1 amber button).
      if (!BG.test(piece)) continue;
      // A branch that names its own text colour is not wearing the white one.
      if (/\btext-(white|black|[a-z]+-\d{2,3})\b/.test(piece)) continue;
      combos.push({ chunk: 'text-white ' + piece, snippet: piece.slice(0, 90) });
    }
  }
  return combos;
}

// A GRADIENT is a fill too, and nothing above sees it: `bg-gradient-to-r
// from-teal-500 to-cyan-500` under white text measures 2.41:1 in Chromium, and
// every token-pair rule here looks for `bg-<hue>-<shade>`, which a gradient
// never has. 256 stops across 24 files were below AA when this was added
// (2026-09-15). A gradient is only as readable as its LIGHTEST stop, so grade
// that one; the hover: variants are a separate state and are graded separately.
const GRAD_STOP = /\b(?:(hover|focus|active|group-hover):)?(from|via|to)-([a-z]+)-(\d{2,3})(?!\/)\b/g;

function gradientViolations(chunk) {
  if (!/\bbg-gradient-to-/.test(chunk)) return [];
  if (!/\btext-white\b/.test(chunk)) return [];
  if (SKIP.test(chunk)) return [];
  const states = new Map();
  let m;
  GRAD_STOP.lastIndex = 0;
  while ((m = GRAD_STOP.exec(chunk)) !== null) {
    const state = m[1] || 'base';
    const c = colourOf(m[3], m[4]);
    if (!c) continue;
    const r = ratio('#ffffff', c);
    const prev = states.get(state);
    // Keep the worst stop of each state: that is where the label fails.
    if (!prev || r < prev.ratio) states.set(state, { ratio: r, token: m[0] });
  }
  const out = [];
  for (const [state, v] of states) {
    if (v.ratio < AA) {
      out.push({
        kind: 'white-on-gradient',
        pair: `text-white on ${v.token}` + (state === 'base' ? '' : ` (${state})`),
        ratio: v.ratio,
      });
    }
  }
  return out;
}

// INLINE STYLES are the other way to write the same defect, and nothing above
// sees them: `style={{ background:'#22c55e', color:'#fff' }}` is 2.28:1 and
// carries no Tailwind class at all. 61 pairs were below AA when this was added
// (2026-09-15). Only literal hex pairs inside one object literal are graded --
// a computed colour cannot be checked statically.
const STYLE_OBJ = /\{([^{}]{0,400})\}/g;
// (?<![-\w]) keeps `background-color` and `borderColor` from matching as color.
const S_COLOR = /(?<![-\w])color\s*:\s*['"](#[0-9a-fA-F]{3,6}|white|black)['"]/;
const S_BG = /(?<![-\w])(?:background|backgroundColor)\s*:\s*['"](#[0-9a-fA-F]{3,6}|white|black)['"]/;
const NAMED_HEX = { white: '#ffffff', black: '#000000' };

function expandHex(h) {
  h = h.toLowerCase();
  if (NAMED_HEX[h]) return NAMED_HEX[h];
  if (/^#[0-9a-f]{3}$/.test(h)) return '#' + h.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
}

function inlineStyleViolations(text) {
  const out = [];
  let m;
  STYLE_OBJ.lastIndex = 0;
  while ((m = STYLE_OBJ.exec(text)) !== null) {
    const body = m[1];
    // Raw CSS payloads and disabled controls are not graded.
    if (body.indexOf('!important') !== -1) continue;
    if (body.indexOf('not-allowed') !== -1) continue;
    // A large fontSize with no text content is an emoji tile (the placeholder
    // glyph paints in its own colours), so its `color` never renders.
    if (/fontSize\s*:\s*['"](?:2[4-9]|[3-9]\d|\d{3})px['"]/.test(body)) continue;
    const c = S_COLOR.exec(body);
    const b = S_BG.exec(body);
    if (!c || !b) continue;
    const fg = expandHex(c[1]);
    const bg = expandHex(b[1]);
    if (!fg || !bg || fg === bg) continue;
    const r = ratio(fg, bg);
    if (r < AA) {
      out.push({
        kind: 'inline-style',
        pair: `color ${fg} on background ${bg}`,
        ratio: r,
      });
    }
  }
  return out;
}

// A palette entry named `icon:` feeds an aria-hidden tile whose content is an
// EMOJI. Emoji paint in their own colours, so the text-<hue> token on such a
// tile never renders and its ratio is meaningless. Two scripted passes fought
// over these tokens (2026-09-15) before this exemption settled it.
const DECORATIVE = /(?:^|[\s,{])icon\s*:\s*$/;

function isDecorativeIconToken(text, index) {
  // Look at what immediately precedes the string literal.
  return DECORATIVE.test(text.slice(Math.max(0, index - 40), index));
}

function scanFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
  const found = [];
  const seen = new Set();
  const add = (v, snippet) => {
    const key = v.pair + '|' + snippet;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ ...v, snippet });
  };
  let m;
  STRING.lastIndex = 0;
  while ((m = STRING.exec(text)) !== null) {
    if (isDecorativeIconToken(text, m.index)) continue;
    for (const v of violationsIn(m[2])) add(v, m[2].slice(0, 90));
    for (const v of gradientViolations(m[2])) add(v, m[2].slice(0, 90));
  }
  for (const c of templateCombos(text)) {
    for (const v of violationsIn(c.chunk, true)) add(v, c.snippet);
  }
  for (const c of variableCombos(text)) {
    for (const v of violationsIn(c.chunk, true)) add(v, c.snippet);
  }
  for (const v of inlineStyleViolations(text)) add(v, v.pair);
  return found;
}

// A module built from a source would double-count every violation, so scan the
// SOURCE where one exists and the built module only when it is hand-maintained
// (behavior_lens, word_sounds, report_writer and friends have no source file).
function targets() {
  const all = fs.readdirSync(ROOT);
  const sources = new Set(all.filter((f) => /_source\.jsx$/.test(f)));
  const out = [];
  for (const f of all) {
    if (sources.has(f)) { out.push(path.join(ROOT, f)); continue; }
    if (!/_module\.js$/.test(f)) continue;
    if (sources.has(f.replace(/_module\.js$/, '_source.jsx'))) continue;
    out.push(path.join(ROOT, f));
  }
  return out;
}

function main() {
  const perFile = {};
  let total = 0;
  for (const file of targets()) {
    const hits = scanFile(file);
    if (!hits.length) continue;
    const name = path.relative(ROOT, file).replace(/\\/g, '/');
    perFile[name] = hits.length;
    total += hits.length;
    if (VERBOSE) for (const h of hits) console.log(`  ${h.ratio.toFixed(2)}  ${h.pair}  ${name}\n      ${h.snippet}`);
  }

  let baseline = null;
  try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (_) {}

  if (UPDATE || !baseline) {
    const previous = baseline ? baseline.total : Infinity;
    if (baseline && total > previous) {
      console.error(`check_tailwind_contrast: refusing to re-baseline UPWARD (${previous} -> ${total}). Fix the new violations instead.`);
      process.exit(1);
    }
    fs.writeFileSync(BASELINE, JSON.stringify({
      note: 'WCAG AA contrast for Tailwind pairs in one class string. Ratchet: the count may only go DOWN. Remaining entries are under review; see project_student_view_review_2026-09-14.',
      updated: new Date().toISOString().slice(0, 10),
      total,
      files: perFile,
    }, null, 1) + '\n');
    console.log(`check_tailwind_contrast: baseline written (${total} remaining across ${Object.keys(perFile).length} file(s)).`);
    return;
  }

  // PER FILE, not just the total: a total-only ratchet lets a new violation in
  // one file hide behind an unrelated fix in another. (Caught 2026-09-15 by
  // injecting emerald-700 -> emerald-600 in the header: the total was unchanged
  // and the gate passed.)
  const grew = Object.entries(perFile).filter(([f, n]) => n > (baseline.files[f] || 0));
  if (grew.length) {
    console.error("");
    console.error(`❌ check_tailwind_contrast: contrast violations increased in ${grew.length} file(s).`);
    for (const [f, n] of grew) console.error(`   ${f}: ${baseline.files[f] || 0} -> ${n}`);
    console.error("");
    console.error("   White text needs a 700/800 fill (emerald-600 is 3.77:1, amber-600 3.19, lime-500 1.76).");
    console.error("   Coloured text on a 50-200 tint usually needs the 800 shade.");
    console.error("   Run with --verbose to list them.");
    process.exit(1);
  }
  if (!QUIET) {
    const delta = baseline.total - total;
    console.log(`✓ check_tailwind_contrast: ${total} known violation(s)${delta > 0 ? `, ${delta} fewer than baseline — run --update to lock it in` : ''}.`);
  }
}

main();
