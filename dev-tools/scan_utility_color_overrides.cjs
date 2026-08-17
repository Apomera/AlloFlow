// Find injected CSS that redefines a Tailwind colour utility IN LIGHT MODE.
//
//   node dev-tools/scan_utility_color_overrides.cjs [file ...]
//   npm run verify:utility-overrides
//
// WHY. stem_tool_watercycle.js injected `.text-slate-600 { color:#64748b
// !important }`. #64748b is slate-FIVE-hundred, so every `text-slate-600` in
// that tool rendered one step LIGHTER (4.34:1 instead of 6.92:1 on
// bg-slate-100) and any contrast fix made by choosing that class was silently
// reverted. axe reported a colour the source did not contain; that mismatch is
// the only reason it was ever noticed.
//
// ★WHY THIS RENDERS INSTEAD OF PARSING. A dark-mode remap that redefines the
// same utility inside `.dark {}` or `@media (prefers-color-scheme: dark)` is
// CORRECT and must not be reported. Deciding that from source needs brace
// tracking across CSS embedded in JS string literals, and a per-rule regex gets
// it wrong: measured on this repo, 327 utility-redefining rules exist, 185 are
// legitimate dark inversions, and a naive scanner flags ~142 mostly-false
// positives. So this injects the stylesheet into a real page with NO theme
// class and asks the browser for the computed colour. Scoped rules do not
// apply there; unscoped ones do. Zero scope false positives by construction.
//
// WHAT IT FLAGS: a utility whose computed colour in the default (light) context
// is not the Tailwind palette value its own class name claims.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const req = require('module').createRequire(path.join(ROOT, 'desktop', 'web-app', 'package.json'));
const twColors = req('tailwindcss/colors');

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function paletteHex(family, shade) {
  const fam = twColors[family];
  if (!fam || typeof fam !== 'object') return null;
  const v = fam[shade];
  return typeof v === 'string' && v.charAt(0) === '#' ? v.toLowerCase() : null;
}

function shadeOf(family, hex) {
  for (const s of SHADES) {
    const p = paletteHex(family, s);
    if (p && p === hex.toLowerCase()) return s;
  }
  return null;
}

function rgbToHex(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
  if (!m) return null;
  return '#' + [1, 2, 3].map((i) => ('0' + Number(m[i]).toString(16)).slice(-2)).join('');
}

// Pull out the CSS blobs a file injects. These are string literals assigned to
// .textContent (or innerHTML) that contain at least one colour-utility rule.
// Concatenated pieces are captured individually and joined, which is fine: the
// browser is what interprets them.
function extractCss(source) {
  const blobs = [];
  const re = /(?:textContent|innerHTML)\s*=\s*((?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)(?:\s*\+\s*(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`))*)/g;
  let m;
  while ((m = re.exec(source))) {
    let value;
    try {
      // The captured text is a literal expression; evaluating it is safe here
      // because the pattern admits only string literals and `+`.
      value = new Function('return (' + m[1] + ');')();
    } catch (e) { continue; }
    if (typeof value === 'string' && /\.(?:text|bg)-[a-z]+-\d{2,3}\s*\{/.test(value)) blobs.push(value);
  }
  return blobs;
}

function candidatesIn(css) {
  const out = [];
  const re = /\.(text)-([a-z]+)-(\d{2,3})\s*\{[^}]*?\bcolor:\s*(#[0-9a-fA-F]{3,8})/g;
  let m;
  while ((m = re.exec(css))) {
    if (paletteHex(m[2], Number(m[3]))) out.push({ family: m[2], shade: Number(m[3]), declared: m[4].toLowerCase() });
  }
  return out;
}

// The compiled Tailwind stylesheet, shared with the contrast sweeps.
const BASE_CSS_PATH = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
let BASE_CSS = '';

async function scan(files) {
  if (!BASE_CSS) {
    if (!fs.existsSync(BASE_CSS_PATH)) {
      throw new Error('Missing ' + path.relative(ROOT, BASE_CSS_PATH) +
        ' -- build it with: node dev-tools/build_sweep_tailwind_css.cjs');
    }
    BASE_CSS = fs.readFileSync(BASE_CSS_PATH, 'utf8');
  }
  const targets = [];
  for (const file of files) {
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
    const css = extractCss(src).join('\n');
    if (!css) continue;
    const cands = candidatesIn(css);
    if (cands.length) targets.push({ file, css, cands });
  }
  if (!targets.length) return [];

  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const findings = [];
  try {
    for (const t of targets) {
      // No theme class anywhere: this is the DEFAULT (light) context, so only
      // unscoped rules can take effect.
      // Real Tailwind FIRST, then the file's injected CSS on top. Without the
      // base stylesheet, a utility the file never redefines is simply undefined,
      // computes to black, and gets reported as an override -- the probe would
      // be measuring its own missing CSS rather than the file's behaviour.
      await page.setContent('<!doctype html><html><head><style>' + BASE_CSS +
        '</style><style>' + t.css.replace(/<\//g, '<\\/') +
        '</style></head><body></body></html>');
      const seen = new Set();
      for (const c of t.cands) {
        const key = c.family + '-' + c.shade;
        if (seen.has(key)) continue;
        seen.add(key);
        const computed = await page.evaluate((cls) => {
          const el = document.createElement('span');
          el.className = cls;
          el.textContent = 'x';
          document.body.appendChild(el);
          const v = getComputedStyle(el).color;
          el.remove();
          return v;
        }, 'text-' + key);
        const got = rgbToHex(computed);
        const want = paletteHex(c.family, c.shade);
        if (!got || !want || got === want) continue;
        findings.push({
          file: t.file, cls: 'text-' + key, want, got,
          gotShade: shadeOf(c.family, got),
        });
      }
    }
  } finally {
    await browser.close();
  }
  return findings;
}

function defaultFiles() {
  const list = [];
  for (const dir of ['stem_lab', '.']) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (e) { continue; }
    for (const f of entries) {
      if (!/\.(js|jsx)$/.test(f)) continue;
      if (dir === '.' && !/_(module|source)\.(js|jsx)$/.test(f) && !/^_build_/.test(f)) continue;
      list.push(dir === '.' ? f : path.join(dir, f));
    }
  }
  return list;
}

module.exports = { scan, extractCss, candidatesIn, paletteHex, shadeOf };

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = args.length ? args : defaultFiles();
  scan(files).then((findings) => {
    if (!findings.length) {
      console.log('utility colour overrides: clean (' + files.length + ' file(s) scanned)');
      process.exit(0);
    }
    findings.forEach((f) => {
      console.log(f.file + '  .' + f.cls + '  declares ' + f.want +
        ' but renders ' + f.got + (f.gotShade ? '  (= ' + f.cls.replace(/-\d+$/, '') + '-' + f.gotShade + ')' : '') +
        '  in the DEFAULT/light context');
    });
    console.log('\n' + findings.length + ' utility/utilities redefined in light mode; the class name lies about the colour');
    process.exit(1);
  }).catch((e) => {
    console.error('scan failed: ' + (e && e.message));
    process.exit(2);
  });
}
