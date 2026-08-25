#!/usr/bin/env node
// scan_dark_mode_contrast.cjs — gate for the "white text on a background that
// stayed white" bug class.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// AlloFlow's theme is an EXPLICIT app setting (light / dark / contrast) applied
// as a class on a div inside the React tree:
//     AlloFlowANTI.txt:  className={`... theme-${theme} ...`}
//
// Tailwind's `dark:` variant is a DIFFERENT mechanism. desktop/web-app/tailwind.config.js
// declares no `darkMode` key, so Tailwind 3.4 uses its default `media` strategy
// and every `dark:` utility compiles to `@media (prefers-color-scheme: dark)`.
// Measured on the shipped bundle (app/static/css/main.d46f2539.css): ONE
// prefers-color-scheme block, ZERO `.dark` class rules. So `dark:` tracks the
// USER'S OPERATING SYSTEM and can never see the app's theme toggle.
//
//   app theme dark + OS light  ->  `bg-white dark:bg-slate-800` stays WHITE
//                                  under the panel's `text-white`  ->  invisible
//   app theme light + OS dark  ->  the same class goes DARK under
//                                  `text-slate-800`                ->  invisible
//
// Measured in Chromium against the real stylesheet, app theme = dark, OS = light:
//     header font-family <select>   #fff on #fff       ratio 1.00
//     header font preview           #fff on #f8fafc    ratio 1.04
//     narrator voice <select>       #fff on #f8fafc    ratio 1.05
// Same markup with OS = dark: 14.63, 6.04, 14.63. The defect is a function of
// the tester's OS setting, which is why it read as intermittent ("some are
// fine") and why no previous pass pinned it down.
//
// The repo's own workaround is the generated remap in app_styles_source.jsx
// (`.theme-dark .allo-docsuite .bg-white { background-color:#1e293b !important }`).
// It exists precisely because `dark:` does not work here. It has two holes this
// scanner covers:
//   1. It is a DESCENDANT selector rooted at .theme-dark, so anything portalled
//      to document.body escapes it entirely.
//   2. It emits `.bg-white`, which does not match the separate class
//      `hover:bg-white`. Measured: an element with a hover-only light
//      background and no base bg token drops to ratio 1.00 on hover in dark
//      mode -- the remapped light text lands on the un-remapped light hover
//      surface. That is the glossary row that "turns white and swallows the
//      text". An element that ALSO carries a base bg token is safe, because the
//      remap's !important outranks the non-important hover rule (measured: A/D
//      hold at 13.35 / 14.48 through hover).
//
// ── WHAT IT CANNOT SEE ──────────────────────────────────────────────────────
// Static text only. It cannot see a colour computed at runtime, a colour that
// arrives from a third-party control's shadow DOM or UA stylesheet, a class
// assembled from template parts (`bg-${x}-50`), or a contrast ratio. It reports
// MECHANISMS KNOWN TO PRODUCE the failure, not measured contrast. Confirm a fix
// by rendering it -- see _dev_scratch/l2/probe_dark.mjs for the pattern.
//
// The sharpest limit is on STATE-LIGHT-BG, and it is worth stating precisely.
// The failure needs the remap to be IN PLAY: light text (remapped) on a light
// hover surface (not remapped). Whether it is in play depends on whether the
// element's subtree is under an `allo-docsuite` ancestor, which is DOM ancestry
// resolved at runtime across files. So a reported site is one of two things:
//   * inside the scope -> a real invisibility, the glossary-row shape
//   * outside it, or inside a hard-coded light panel (view_misc_panels'
//     PdfDiffViewer modal is `bg-white` with `theme-${theme}` but no scope
//     class) -> legible, but the surface ignores dark mode, which is a
//     separate and milder complaint
// The scanner cannot tell those apart. It flags the mechanism; a human decides
// which one this is. That is also why the rule is baselined rather than
// enforced retroactively.
//
// NOTE for anyone adding a NEW colour token to a `view_*_source.jsx` file: the
// generated remap in app_styles_source.jsx is keyed on the token set scanned
// from those files, so a new token makes `node dev-tools/gen_docsuite_theme.cjs
// --check` stale until `dev-tools/_apply_docsuite_theme.cjs` is re-run.
//
// Usage:
//   node dev-tools/scan_dark_mode_contrast.cjs [--quiet] [--all] [--update-baseline]
//     --all              also print baselined (accepted) findings
//     --update-baseline  rewrite the baseline from the current tree
//   Exit 1 if any finding is NOT in dev-tools/dark_mode_contrast_baseline.json.

'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const showAll = args.includes('--all');
const updating = args.includes('--update-baseline');
// --root lets the gate's negative control point the scanner at a fixture tree.
// A gate whose green state has never been shown to go red is not a gate: this
// repo has been bitten by a clean scan over a stubbed surface before. See
// tests/dark_mode_contrast_gate.test.js.
const rootArg = args.find((a) => a.startsWith('--root='));
const ROOT = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
const BASELINE = rootArg
  ? path.join(ROOT, 'dark_mode_contrast_baseline.json')
  : path.join(__dirname, 'dark_mode_contrast_baseline.json');

// ── scope ───────────────────────────────────────────────────────────────────
// The app shell: every *_source.jsx at the repo root, the ANTI monolith, and
// the plain-JS modules that have no source pair (so they ARE the source).
// Deliberately excluded, with reasons:
//   desktop/web-app/**   generated mirrors; a finding there is a duplicate
//   *_module.js with a *_source.jsx pair   same reason
//   stem_lab/**          canvas-first tools with their own palette system
//                        (ctx.pal / isDark props); scan_canvas_var_colors.cjs
//                        is the gate for that surface
//   view_pdf_audit_*     owned by a concurrent session as of 2026-08-16
const EXCLUDE_FILES = new Set(['view_pdf_audit_source.jsx', 'view_pdf_audit_module.js']);

function scopeFiles() {
  const entries = fs.readdirSync(ROOT);
  const sources = entries.filter((f) => f.endsWith('_source.jsx'));
  const paired = new Set(sources.map((f) => f.replace('_source.jsx', '_module.js')));
  const lone = entries.filter((f) => f.endsWith('_module.js') && !paired.has(f));
  return [...sources, ...lone, 'AlloFlowANTI.txt', ...entries.filter((f) => f.endsWith('.fixture.jsx'))]
    .filter((f) => !EXCLUDE_FILES.has(f))
    .filter((f) => fs.existsSync(path.join(ROOT, f)))
    .sort();
}

// ── palette knowledge ───────────────────────────────────────────────────────
const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const TINTS = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const FAMS = [...NEUTRALS, ...TINTS].join('|');

// A background utility that lands on a LIGHT surface: white, or any family at
// shade <= 200. Those are the values the dark remap rewrites, so they are the
// ones that read as "still white" when the remap does not reach them.
//
// The alpha suffix matters. `bg-white/10` is a translucent SHEEN over whatever
// is beneath it (the app uses it constantly on the dark gradient header), not
// an opaque surface, and it cannot swallow text. Only alpha >= 60 composites to
// something light enough to matter, so lower alphas are excluded here rather
// than baselined -- they are not instances of the bug.
const LIGHT_BG_RE = new RegExp(`^bg-(white|(?:${FAMS})-(?:50|100|200))(?:\\/(\\d{1,3}))?$`);
const LIGHT_BG = (tok) => {
  const m = LIGHT_BG_RE.exec(tok);
  return !!m && (m[2] === undefined || Number(m[2]) >= 60);
};
// A foreground utility that lands on LIGHT text (invisible on a light surface).
const LIGHT_FG = new RegExp(`^text-(white|(?:${FAMS})-(?:50|100|200|300))(?:\\/\\d{1,3})?$`);
const DARK_FG = new RegExp(`^text-(black|(?:${FAMS})-(?:600|700|800|900|950))(?:\\/\\d{1,3})?$`);
const ANY_BG = new RegExp(`^bg-(white|black|transparent|(?:${FAMS})-\\d{2,3})(?:\\/\\d{1,3})?$`);

const STATE_PREFIX = /^(hover|focus|focus-visible|focus-within|active|group-hover|peer-hover|group-focus)$/;

// Which variant tokens the GENERATED remap layer already covers.
//
// Read from the shipped CSS in app_styles_source.jsx, deliberately NOT from
// gen_docsuite_theme.cjs's potential output: while that block is stale, the
// sites really are still broken and must still be reported. This makes the
// scanner self-correcting -- as soon as `dev-tools/_apply_docsuite_theme.cjs`
// re-pastes the layer, the covered sites stop being findings on their own.
const remappedVariants = (() => {
  const covered = new Set();
  try {
    const styles = fs.readFileSync(path.join(ROOT, 'app_styles_source.jsx'), 'utf8');
    const re = /\[class~="([^"]+)"\]/g;
    let m;
    while ((m = re.exec(styles))) if (m[1].includes(':')) covered.add(m[1]);
  } catch (_) { /* fixture trees have no app_styles_source.jsx */ }
  return covered;
})();

// A selector that is (or ends in) a Tailwind colour utility, including the
// [class~="bg-white/80"] form the generator emits for slash tokens, and the
// bare form-control block. Used to exclude intentional utility overrides.
const TW_UTILITY_SEL = new RegExp(
  `(^|[\\s>+~])(\\.|\\[class~="?)(?:(?:hover|focus|focus-visible|focus-within|active|disabled|checked|group-hover|peer-hover|group-focus):)*(bg|text|border|ring|divide|from|to|via)-` +
  `(white|black|${FAMS})|^(input|select|textarea|button)\\b|^\\*`);

// Hard-coded colours at the extremes of the luminance range. These are the ones
// that cannot be right in both themes.
const EXTREME_COLOR = /#fff(?:fff)?\b|#000(?:000)?\b|\brgba?\(\s*255\s*,\s*255\s*,\s*255\b|\brgba?\(\s*0\s*,\s*0\s*,\s*0\b|(?<![-\w])white(?![-\w])|(?<![-\w])black(?![-\w])/i;

// ── helpers ─────────────────────────────────────────────────────────────────
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// Split a className value into candidate utility tokens. Template holes
// (`${...}`) are replaced with a space so a token is never half-interpolated.
function tokensOf(value) {
  return value.replace(/\$\{[^}]*\}/g, ' ').split(/[\s'"`]+/).filter(Boolean);
}

// Pull every className={...} / className="..." payload with its offset.
// Handles nested braces and template literals well enough for JSX in this repo.
function classNameAttrs(src) {
  const out = [];
  const re = /className\s*=\s*/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1);
      if (end < 0) continue;
      out.push({ value: src.slice(i + 1, end), index: i });
      re.lastIndex = end;
    } else if (ch === '{') {
      let depth = 0, j = i;
      for (; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') { depth--; if (depth === 0) break; }
      }
      out.push({ value: src.slice(i + 1, j), index: i });
      re.lastIndex = j;
    }
  }
  return out;
}

// A className expression is theme-aware if it branches on the app's own theme
// state rather than on CSS. These are the sites that are ACTUALLY fine.
const THEME_AWARE = /\btheme\s*===|\btheme\s*!==|\bisDark\b|\bisContrast\b|\bdarkMode\b|panelTheme|alloSheetTheme|\btheme\s*\?|_skin\./;

// Span of the balanced (...) starting at the '(' at or after `from`.
function callSpan(src, from) {
  const open = src.indexOf('(', from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return [open, i]; }
  }
  return null;
}

// The source ranges that actually render OUTSIDE the themed tree.
//
// An earlier version asked only "does this file contain createPortal?", which
// made every `text-white` in a 1,500-line header file a finding even though the
// header bar is an always-dark gradient. The rule is only meaningful for markup
// INSIDE a portal call, so resolve the spans -- including one level of helper
// indirection, because this repo wraps the call (`_headerPortal`).
function portalRegions(src) {
  const names = new Set(['ReactDOM.createPortal', 'createPortal']);
  const helperRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[\s\S]{0,400}?createPortal\s*\([^;]{0,120}?document\.(?:body|documentElement)/g;
  let h;
  while ((h = helperRe.exec(src))) names.add(h[1]);

  const regions = [];
  for (const n of names) {
    const re = new RegExp('\\b' + n.replace(/[.$]/g, '\\$&') + '\\s*\\(', 'g');
    let m;
    while ((m = re.exec(src))) {
      // skip the helper's own definition body
      const span = callSpan(src, m.index + n.length);
      if (span) regions.push(span);
    }
  }
  return regions;
}
const inRegions = (regions, idx) => regions.some(([a, b]) => idx >= a && idx <= b);

// ── rules ───────────────────────────────────────────────────────────────────
const findings = [];
const add = (file, line, rule, key, detail) =>
  findings.push({ file, line, rule, key: rule + '|' + key, detail });

function scanJsxLike(file, src) {
  const attrs = classNameAttrs(src);
  const regions = portalRegions(src);

  for (const attr of attrs) {
    const toks = tokensOf(attr.value);
    const line = lineOf(src, attr.index);

    // Base (unprefixed) background token present on this element?
    const hasBaseBg = toks.some((t) => !t.includes(':') && ANY_BG.test(t));
    const themeAware = THEME_AWARE.test(attr.value);

    for (const tok of toks) {
      const parts = tok.split(':');
      const bare = parts[parts.length - 1];
      const prefixes = parts.slice(0, -1);

      // R1 DARK-VARIANT — `dark:` cannot see the app theme in this build.
      if (prefixes.includes('dark')) {
        // Which light-side counterpart sits next to it decides severity.
        const counterpart = toks.find((o) => {
          if (o.includes(':')) return false;
          return bare.startsWith('bg-') ? LIGHT_BG(o) : bare.startsWith('text-') ? DARK_FG.test(o) : false;
        });
        add(file, line, counterpart ? 'DARK-VARIANT-PAIRED' : 'DARK-VARIANT',
          tok + (counterpart ? '+' + counterpart : ''),
          counterpart
            ? `\`${counterpart} ${tok}\` — the dark half only fires on OS dark mode, so in app dark mode this stays "${counterpart}"`
            : `\`${tok}\` is gated on prefers-color-scheme, not on the app theme`);
        continue;
      }

      // R2 STATE-LIGHT-BG — a hover/focus/active light background with no base
      // bg token to carry the dark remap's !important. Measured ratio 1.00.
      if (prefixes.length && prefixes.some((p) => STATE_PREFIX.test(p)) && LIGHT_BG(bare)
          && !hasBaseBg && !themeAware && !remappedVariants.has(tok)) {
        add(file, line, 'STATE-LIGHT-BG', tok,
          `\`${tok}\` with no base bg-* on the same element — the generated remap has no rule for \`${tok}\` (it targets \`.${bare}\`, a different class), so the surface goes light while the text stays light`);
      }

      // R3 HALF-PAIR — a light foreground with no background anywhere on the
      // element inherits its background across whatever theme boundary it
      // happens to land in.
      if (!prefixes.length && LIGHT_FG.test(tok) && !hasBaseBg && !themeAware && inRegions(regions, attr.index)) {
        add(file, line, 'HALF-PAIR-FG', tok,
          `\`${tok}\` sets a light foreground with no background, inside a portalled subtree — the background it inherits comes from outside the themed tree`);
      }
    }
  }

  // R4 PORTAL-ESCAPE — createPortal to document.body leaves the theme-${theme}
  // div behind, so both the class-based remap and any `.theme-dark ...`
  // descendant rule stop applying.
  const portalRe = /createPortal\s*\(\s*([\s\S]{0,80}?),\s*document\.(body|documentElement)/g;
  let pm;
  while ((pm = portalRe.exec(src))) {
    add(file, lineOf(src, pm.index), 'PORTAL-ESCAPE', 'document.' + pm[2],
      'content portalled to document.' + pm[2] + ' is outside the theme-${theme} div, so .theme-dark descendant rules and the generated remap do not reach it; every colour inside must be set by an explicit theme branch');
  }

  // R5 STYLE-LITERAL-VS-VAR — an inline style object that mixes a hard-coded
  // extreme colour with a CSS custom property (the KitchenLab shape: hardcoded
  // dark next to a theme var renders invisible in the OTHER theme).
  const styleRe = /style\s*=\s*\{\{([\s\S]{0,400}?)\}\}/g;
  let sm;
  while ((sm = styleRe.exec(src))) {
    const body = sm[1];
    if (EXTREME_COLOR.test(body) && /var\(\s*--/.test(body)) {
      add(file, lineOf(src, sm.index), 'STYLE-LITERAL-VS-VAR', body.replace(/\s+/g, ' ').slice(0, 60),
        'inline style mixes a hard-coded #fff/#000 with a var(--...) colour; one of the two moves with the theme and the other does not');
    }
  }
}

// R6 CSS payloads: dark-only definitions and literal/var mixes inside <style> blocks.
function scanCssPayload(file, src) {
  // Every template-literal <style> body in the file.
  const blocks = [];
  const re = /<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g;
  let m;
  while ((m = re.exec(src))) blocks.push({ css: m[1], index: m.index });

  for (const b of blocks) {
    // Selectors defined ONLY under a dark scope, with no base definition.
    const darkScoped = new Map();  // bare selector -> line
    const baseDefined = new Set();
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let r;
    while ((r = ruleRe.exec(b.css))) {
      const sel = r[1].replace(/\s+/g, ' ').trim();
      const decl = r[2];
      if (!/color|background/i.test(decl)) continue;
      const line = lineOf(src, b.index + r.index);

      if (EXTREME_COLOR.test(decl) && /var\(\s*--/.test(decl)) {
        add(file, line, 'CSS-LITERAL-VS-VAR', sel.slice(0, 60),
          `\`${sel.slice(0, 60)}\` mixes a hard-coded #fff/#000 with a var(--...) colour in one rule`);
      }

      const dark = sel.match(/^(?:\.theme-dark|\.theme-contrast|\[data-theme[^\]]*\])\s+(.*)$/);
      if (dark) {
        const bare = dark[1].trim();
        if (bare && !darkScoped.has(bare)) darkScoped.set(bare, line);
      } else if (!/^@|^\s*$/.test(sel)) {
        for (const part of sel.split(',')) baseDefined.add(part.trim());
      }
    }
    for (const [bare, line] of darkScoped) {
      // A dark-scoped override of a TAILWIND UTILITY is not a missing base
      // definition -- the base lives in Tailwind's own stylesheet, and
      // overriding it under .theme-dark is exactly what the generated remap in
      // app_styles_source.jsx is for. Only custom/semantic selectors can be
      // genuinely dark-only. Without this, all 169 remap rules report as
      // findings and the rule is pure noise.
      if (TW_UTILITY_SEL.test(bare)) continue;
      const anyBase = [...baseDefined].some((s) => s === bare || s.endsWith(' ' + bare) || bare.endsWith(' ' + s));
      if (!anyBase) {
        add(file, line, 'DARK-ONLY-DEF', bare.slice(0, 70),
          `\`${bare.slice(0, 70)}\` gets a colour only inside a dark/contrast scope; with no base rule the light theme falls through to whatever it inherits`);
      }
    }
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
const files = scopeFiles();
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  scanJsxLike(f, src);
  if (src.includes('<style')) scanCssPayload(f, src);
}

// ── baseline ────────────────────────────────────────────────────────────────
let baseline = { note: '', accepted: {} };
if (fs.existsSync(BASELINE)) baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

// The baseline records a COUNT per (file, rule|token), not just the set of
// keys. A set would let a second `hover:bg-slate-100` be added to a file that
// already has one -- exactly how this class grew to its current size. Counts
// make every added instance a failure while leaving the existing ones green.
const countsOf = (list) => {
  const c = {};
  for (const x of list) c[x.key] = (c[x.key] || 0) + 1;
  return c;
};

if (updating) {
  const accepted = {};
  for (const [file, list] of [...byFile.entries()].sort()) {
    const c = countsOf(list);
    accepted[file] = Object.fromEntries(Object.keys(c).sort().map((k) => [k, c[k]]));
  }
  const note = baseline.note || 'Findings accepted when this gate was wired (2026-08-16, fleet lane L2). Each entry is a KNOWN mechanism at a KNOWN count, not a proven-safe site: the gate exists so the class cannot grow. Regenerate with --update-baseline only after reading each site.';
  fs.writeFileSync(BASELINE, JSON.stringify({ note, accepted }, null, 2) + '\n');
  console.log('baseline written: ' + Object.keys(accepted).length + ' files, ' +
    Object.values(accepted).reduce((n, o) => n + Object.values(o).reduce((a, b) => a + b, 0), 0) + ' findings');
  process.exit(0);
}

let newCount = 0, acceptedCount = 0;
const report = [];
for (const [file, list] of [...byFile.entries()].sort()) {
  const acc = baseline.accepted[file] || {};
  const seenCount = {};
  const fresh = [];
  for (const x of list) {
    seenCount[x.key] = (seenCount[x.key] || 0) + 1;
    if (seenCount[x.key] > (acc[x.key] || 0)) fresh.push(x); else acceptedCount++;
  }
  if (!fresh.length && !showAll) continue;
  const show = showAll ? list : fresh;
  newCount += fresh.length;
  report.push('=== ' + file + '  (' + fresh.length + ' new, ' + (list.length - fresh.length) + ' baselined)');
  const seen = new Set();
  for (const x of show) {
    const dedupe = x.rule + '|' + x.line;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    report.push('   ' + x.rule.padEnd(22) + file + ':' + x.line + '  ' + x.detail);
  }
}

if (!quiet || newCount) console.log(report.join('\n'));
console.log('\nscanned ' + files.length + ' files; ' + findings.length + ' findings (' +
  acceptedCount + ' baselined, ' + newCount + ' new)');
if (newCount) {
  console.log('\nA NEW finding means a theme-blind colour was added. Fix it by branching on the\n' +
    'app `theme` value in JS, the way the surrounding code already does, or accept it\n' +
    'with --update-baseline after reading the site.');
  process.exit(1);
}
console.log('OK — no new theme-blind colour sites.');
