#!/usr/bin/env node
/**
 * stem_tool_shot — mount ONE STEM tool in one theme and screenshot it.
 *
 * check_stem_layout_defects reports a ratio; this reports a picture. Every
 * finding in that gate is a claim about what a student sees, and the only way
 * to confirm a claim like that is to look. It reuses the gate's own harness
 * (same Tailwind cache, same extracted --allo-stem-* palette, same two-layer
 * host mirror) so a shot and a finding describe the SAME pixels, and both wait
 * for entry animations to finish before measuring - a shot taken mid-animation
 * shows a frame, not a layout.
 *
 *   node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_physics.js --contrast
 *   node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_molecule.js --contrast --click="🧱Build"
 *
 * Flags: --dark | --contrast (default light), --click=<button label prefix>,
 *        --state=<json>, --out=<png path>, --full (full-page shot),
 *        --narrow | --viewport=WxH, --probe=<js body> (prints what it returns).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const gate = fs.readFileSync(path.join(ROOT, 'dev-tools', 'check_stem_layout_defects.cjs'), 'utf8');

// Reuse, don't re-implement: pull the harness pieces straight out of the gate
// so the two instruments can never drift apart.
function grab(startMarker, endMarker) {
  const a = gate.indexOf(startMarker);
  if (a === -1) throw new Error('marker not found in the gate: ' + startMarker);
  const b = gate.indexOf(endMarker, a + startMarker.length);
  if (b === -1) throw new Error('end marker not found in the gate: ' + endMarker);
  return gate.slice(a, b);
}
const SHELL = (function () {
  const block = grab('const SHELL = `', '`;\n');
  return block.slice('const SHELL = `'.length);
})();

// ★★★ THE SHOT MUST CARRY THE SAME HOST LAYER THE GATE MEASURES THROUGH.
// This file's header claimed a "two-layer host mirror" while injecting only
// Tailwind and the --allo-stem-* palette — no host theme rules at all. Under
// `contrast` that omission is decisive: app_styles_module rewrites inline light
// backgrounds to #000 !important so forced yellow text stays readable, so a
// screenshot without it shows DIFFERENT PIXELS than the finding it is meant to
// confirm — the one thing a verification instrument must never do. Lifted from
// the gate by source so the two cannot drift.
const extractHostThemeRules = (function () {
  const fn = grab('function extractHostThemeRules(theme) {', '\n}\n') + '\n}';
  // `read` is the gate's helper name; this file has its own with the same shape.
  return new Function('read', 'return ' + fn + ';')(readForHostCss);
})();
function readForHostCss(p) {
  return fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8');
}

const args = process.argv.slice(2);
const DARK = args.includes('--dark');
const CONTRAST = args.includes('--contrast');
const FULL = args.includes('--full');
const file = args.find((a) => !a.startsWith('--'));
const clickArg = (args.find((a) => a.startsWith('--click=')) || '').slice(8);
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);
const outArg = (args.find((a) => a.startsWith('--out=')) || '').slice(6);
// ★ --probe runs a snippet in the mounted page and prints what it returns. A
// picture says WHAT is wrong; triage needs WHY. archstudio's onboarding panel
// is `left:50%; translate(-50%,-50%)` yet paints in the bottom-right corner —
// only the offsetParent chain can say whether that is the tool's bug or an
// artefact of mounting it in a bare slot.
const probeArg = (args.find((a) => a.startsWith('--probe=')) || '').slice(8);
// ★ --pre runs a snippet (or @file) AFTER the tool script loads and BEFORE mount,
// for tools that read a window-level handoff at mount time (Print Lab's
// __alloPrintLabPendingHandoff). Without it those states cannot be photographed.
const preArg = (args.find((a) => a.startsWith('--pre=')) || '').slice(6);
// ★ --wait=<ms> extra settle after mount, for tools that fetch an engine
// (Art Studio's sculpt tab shows only a loading line until three.js arrives).
const WAIT = Number((args.find((a) => a.startsWith('--wait=')) || '').slice(7)) || 0;
const PRE = preArg ? (preArg.startsWith('@') ? fs.readFileSync(path.isAbsolute(preArg.slice(1)) ? preArg.slice(1) : path.join(ROOT, preArg.slice(1)), 'utf8') : preArg) : '';
// Match the gate's viewport axis, so a narrow finding can be looked at.
const NARROW = args.includes('--narrow');
const vpArg = (args.find((a) => a.startsWith('--viewport=')) || '').slice(11);
const VIEWPORT = (function () {
  const m = vpArg && /^(\d{2,5})x(\d{2,5})$/.exec(vpArg);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };
  return NARROW ? { width: 768, height: 1024 } : { width: 1280, height: 1000 };
})();
if (!file) {
  console.error('usage: node dev-tools/stem_tool_shot.cjs <toolFile> [--dark|--contrast] [--click=<label>] [--state=<json>] [--pre=<js|@file>] [--wait=<ms>] [--out=<png>] [--full]');
  process.exit(2);
}

const read = (p) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');

function extractStemPalette() {
  const src = read('app_styles_module.js');
  const start = src.indexOf(':root, .theme-default {');
  const anchor = src.indexOf('.theme-contrast {', start);
  const end = src.indexOf('}', src.indexOf('--allo-stem-button-border', anchor));
  return src.slice(start, end + 1);
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const palette = extractStemPalette();
  const tw = fs.readFileSync(TW, 'utf8');
  const runtime = [
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js')
  ];
  const src = read(file);
  const toolId = /registerTool\(\s*['"]([^'"]+)['"]/.exec(src)[1];

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  // Same condition as the gate: the host layer only exists for contrast.
  const hostCss = CONTRAST ? extractHostThemeRules('contrast') : '';
  await page.setContent('<!doctype html><html><head><style>' + tw + '</style><style>' + palette +
    '</style><style>' + hostCss +
    '</style><style>body{margin:0;font-family:system-ui;background:' +
    (CONTRAST ? '#000000' : (DARK ? '#0f172a' : '#ffffff')) +
    '}</style></head><body><main id="slot" class="' +
    (CONTRAST ? 'theme-contrast' : (DARK ? 'theme-dark' : 'theme-default')) + '"></main></body></html>');
  for (const code of runtime) await page.addScriptTag({ content: code });
  await page.addScriptTag({ content: src });
  await page.addScriptTag({ content: SHELL });
  if (PRE) await page.evaluate(new Function(PRE));
  await page.evaluate(
    ({ id, dark, st, ct }) => window.__mount(id, dark, st, ct),
    { id: toolId, dark: DARK, st: stateArg ? JSON.parse(stateArg) : {}, ct: CONTRAST }
  );
  await page.waitForTimeout(450 + WAIT);
  if (clickArg) {
    const hit = await page.evaluate((want) => {
      const els = Array.from(document.querySelectorAll('#slot button, #slot [role="tab"]'));
      const el = els.find((e) => (e.textContent || '').trim().indexOf(want) === 0);
      if (!el) return false;
      el.click();
      return true;
    }, clickArg);
    if (!hit) console.error('! no control whose label starts with: ' + clickArg);
    await page.waitForTimeout(450);
  }
  // ★ Same settle as the gate: a running CSS animation beats an inline style, so
  // a shot taken mid-entry-animation shows a frame, not the layout. archstudio's
  // onboarding panel loses its centring transform for the 0.2s `arch-panel-in`
  // runs and photographs 56px out of its column. Capped, since infinite
  // animations never finish.
  await page.evaluate(() => {
    const running = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.playState === 'running' &&
        !(a.effect && a.effect.getTiming && a.effect.getTiming().iterations === Infinity));
    return Promise.race([
      Promise.all(running.map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 1200))
    ]);
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  if (probeArg) {
    const val = await page.evaluate('(function(){' + probeArg + '})()');
    console.log(JSON.stringify(val, null, 2));
  }

  const theme = CONTRAST ? 'contrast' : (DARK ? 'dark' : 'light');
  const out = outArg || path.join(ROOT, 'dev-tools', '.cache', toolId + '_' + theme + '.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: FULL });
  await browser.close();
  if (errors.length) console.error('page errors: ' + errors.join(' | '));
  console.log(out);
})();
