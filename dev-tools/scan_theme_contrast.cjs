// Theme contrast gate — catches TEXT colours that fail WCAG in one theme.
//
//   node dev-tools/scan_theme_contrast.cjs [file ...]
//
// WHY THIS EXISTS. Across one audit of stem_tool_watercycle.js the same defect
// surfaced FOUR separate times, always the same shape: a colour picked for the
// dark card, then reused flat (or as the light branch) on a white one. Measured
// examples that shipped: '#fbbf24' section label at 1.67:1, '#22c55e' delta text
// at 2.28:1, '#f59e0b' outcome heading at 2.05:1. Every one of them looked
// deliberate in source and fine in the theme its author was viewing. Screenshots
// caught them one at a time; this measures them all at once.
//
// WHAT IT CHECKS. Inline-style TEXT colours only:
//   color: isDark ? '#aaa' : '#bbb'   -> dark branch vs dark bg, light vs light
//   color: '#aaa'                     -> flat, so it must pass on BOTH grounds
// Tailwind classes are NOT in scope (utilities are theme-remapped elsewhere) and
// neither is canvas painting: `ctx.fillStyle` is pixels, not text, and a canvas
// scene legitimately uses low-contrast colour. Only `color:` in a style object.
//
// LIMITS, stated so a green run is not over-read. It reads one line at a time,
// so a style object split across lines is not seen. It resolves a background
// only when the same line declares one as a hex literal; anything else with a
// background (identifier, gradient, rgba, var(), template literal) is SKIPPED
// rather than guessed at.
//
// ★THE BIG ONE: when no background is on the line, the text's real ground comes
// from an ANCESTOR, and this scanner cannot walk the DOM. It assumes the card
// grounds below. Measured across stem_lab/, 7,784 of its findings are that
// case -- so it is calibrated for tools whose panels really are white / slate
// cards (stem_tool_watercycle.js, which it was built against and keeps clean)
// and it MUST NOT be pointed at the whole repo as a gate. For ancestor-resolved
// coverage use the rendered path instead: `npm run verify:contrast-sweep`
// (dev-tools/theme_contrast_sweep.cjs), which measures real pixels with axe.
'use strict';

const fs = require('fs');
const path = require('path');

// Representative grounds. Light cards in this codebase are white or slate-50;
// dark cards are slate-900/950. Using the LIGHTEST dark ground and the DARKEST
// light ground keeps the check conservative rather than flattering.
const LIGHT_BG = '#ffffff';
const DARK_BG = '#0f172a';
const MIN_RATIO = 4.5;

// Each entry needs a reason. Large text (>=18.7px bold / >=24px) may use 3:1.
const ALLOWLIST = [
  // color, why
  ['#94a3b8', 'muted meta on dark cards; paired light branch carries the contrast'],
];

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function expand(hex) {
  // #abc -> #aabbcc
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

const HEX = "#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?";
// color: isDark ? '#a' : '#b'   (also matches isContrast/dark-ish flag names)
const TERNARY = new RegExp(
  `\\bcolor:\\s*(?:!!)?[A-Za-z_$][\\w$.]*\\s*\\?\\s*['"](${HEX})['"]\\s*:\\s*['"](${HEX})['"]`,
  'g',
);
// color: '#a'  with no conditional in front
const FLAT = new RegExp(`\\bcolor:\\s*['"](${HEX})['"]`, 'g');

// `color:` is ambiguous: it is a CSS property in a style object, but also a
// plain data field on this codebase's component/stage/label descriptors, where
// it drives borders, chart strokes and canvas paint rather than DOM text.
// Measuring those produced ~17 false positives on the first run (every
// MAINE_WATERSHED_COMPONENTS and STAGES entry). A line counts as a style only
// if it carries style context, and never if it looks like a descriptor record.
const STYLE_CONTEXT = /style:\s*\{|fontSize|fontWeight|lineHeight|letterSpacing|textTransform|padding|margin|borderRadius/;
const DATA_RECORD = /\b(?:id|emoji|icon|xNorm|yNorm|pathKey|tier|appliesTo|hours|effects)\s*:/;

function isStyleLine(line) {
  return STYLE_CONTEXT.test(line) && !DATA_RECORD.test(line);
}

// When the same style object paints its own background, THAT is the ground the
// text sits on - not the card behind it. Without this, every white-on-brand
// button reports 1.00:1. A gradient or rgba() ground cannot be resolved from
// source, so those lines are skipped rather than guessed at (a false negative
// is recoverable; a wall of false positives gets the gate switched off).
// The rule is INVERTED from the original: rather than enumerate the
// unresolvable forms (gradient, rgba, ternary) and treat everything else as the
// card, only a hex literal counts as resolved. `background: color` -- a bare
// identifier, e.g. a band colour passed in as a variable -- slipped through that
// enumeration and was silently measured against the card, producing 143 false
// positives repo-wide (dark text on a variable background "failing on dark").
// Enumerating the KNOWN-GOOD cases fails safe; enumerating the bad ones does not.
const BG_ANY = /\b(?:background|backgroundColor):/;
const BG_SOLID = new RegExp(`\\b(?:background|backgroundColor):\\s*['"](${HEX})['"]`);
// `background: isDark ? '#a' : '#b'` is resolvable PER THEME, so each branch is
// measured against its own ground instead of the line being skipped wholesale.
const BG_TERNARY = new RegExp(
  `\\b(?:background|backgroundColor):\\s*(?:!!)?[A-Za-z_$][\\w$.]*\\s*\\?\\s*['"](${HEX})['"]\\s*:\\s*['"](${HEX})['"]`,
);

// WCAG large text (>=24px, or >=18.66px bold) may use 3:1 instead of 4.5:1.
// Both numbers are usually right there in the same style object, so read them
// rather than flagging every stat tile. Without this the gate reports things
// like a 20px/800 figure at 3.96:1, which genuinely conforms.
const LARGE_MIN_RATIO = 3;
function minRatioFor(line) {
  const size = /fontSize:\s*(\d+(?:\.\d+)?)/.exec(line);
  if (!size) return MIN_RATIO;
  const px = parseFloat(size[1]);
  const weightM = /fontWeight:\s*['"]?(\d{3}|bold)/.exec(line);
  const weight = weightM ? (weightM[1] === 'bold' ? 700 : parseInt(weightM[1], 10)) : 400;
  const bold = weight >= 700 || /h\('(?:strong|b|h[1-3])'/.test(line);
  if (px >= 24 || (px >= 18.66 && bold)) return LARGE_MIN_RATIO;
  return MIN_RATIO;
}

function groundsFor(line) {
  const t = BG_TERNARY.exec(line);
  if (t) return { light: expand(t[2]), dark: expand(t[1]), own: true };
  const m = BG_SOLID.exec(line);
  if (m) return { light: expand(m[1]), dark: expand(m[1]), own: true };
  // A background is declared but is not a hex literal (identifier, gradient,
  // rgba, var(), template literal). Unknowable from source -> skip, do not
  // fall back to the card. A false negative is recoverable; a wall of false
  // positives is how a gate gets switched off.
  if (BG_ANY.test(line)) return null;
  return { light: LIGHT_BG, dark: DARK_BG, own: false };
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const findings = [];
  const allowed = new Set(ALLOWLIST.map((a) => expand(a[0])));

  lines.forEach((line, i) => {
    if (!isStyleLine(line)) return;
    const ground = groundsFor(line);
    if (!ground) return;
    const LIGHT = ground.light;
    const DARK = ground.dark;
    const bar = minRatioFor(line);
    // A line may hold several declarations; walk each pattern independently.
    let m;
    const ternaryRanges = [];
    TERNARY.lastIndex = 0;
    while ((m = TERNARY.exec(line))) {
      ternaryRanges.push([m.index, m.index + m[0].length]);
      const darkC = expand(m[1]);
      const lightC = expand(m[2]);
      // Convention in this codebase is `isDark ? <dark-theme> : <light-theme>`.
      if (!allowed.has(darkC)) {
        const r = contrast(darkC, DARK);
        if (r < bar) findings.push({ file, line: i + 1, color: darkC, ground: 'dark', ratio: r, bar, kind: 'themed' });
      }
      if (!allowed.has(lightC)) {
        const r = contrast(lightC, LIGHT);
        if (r < bar) findings.push({ file, line: i + 1, color: lightC, ground: 'light', ratio: r, bar, kind: 'themed' });
      }
    }

    FLAT.lastIndex = 0;
    while ((m = FLAT.exec(line))) {
      // Skip hexes already accounted for by a ternary match on this line.
      if (ternaryRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
      const c = expand(m[1]);
      if (allowed.has(c)) continue;
      // Flat colour: no theme branch, so it has to survive on both grounds.
      const rl = contrast(c, LIGHT);
      const rd = contrast(c, DARK);
      // Always check both grounds. On a solid own-background the two are the
      // same colour so the checks coincide; on a THEMED own-background they
      // correctly differ. The old `own ? light-only` shortcut would have let a
      // themed background's dark branch through unmeasured.
      if (rl < bar || rd < bar) {
        findings.push({
          file, line: i + 1, color: c, kind: 'flat',
          ground: rl < rd ? 'light' : 'dark',
          ratio: Math.min(rl, rd), bar,
        });
      }
    }
  });

  return findings;
}

function run(files) {
  return files.flatMap(scanFile);
}

module.exports = { run, scanFile, contrast, luminance, MIN_RATIO, LIGHT_BG, DARK_BG };

if (require.main === module) {
  const args = process.argv.slice(2);
  const files = args.length ? args : ['stem_lab/stem_tool_watercycle.js'];
  const findings = run(files.map((f) => path.resolve(process.cwd(), f)));
  if (!findings.length) {
    console.log('theme contrast: clean (' + files.length + ' file(s))');
    process.exit(0);
  }
  findings
    .sort((a, b) => a.ratio - b.ratio)
    .forEach((f) => {
      console.log(
        `${path.relative(process.cwd(), f.file)}:${f.line}  ${f.color}  ${f.ratio.toFixed(2)}:1 on ${f.ground} (needs ${f.bar})` +
        `  (${f.kind === 'flat' ? 'flat colour, must pass both themes' : 'themed branch'})`,
      );
    });
  console.log('\n' + findings.length + ' text colour(s) below ' + MIN_RATIO + ':1');
  process.exit(1);
}
