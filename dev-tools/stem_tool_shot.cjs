#!/usr/bin/env node
/**
 * stem_tool_shot — mount ONE STEM tool in one theme and screenshot it.
 *
 * check_stem_layout_defects reports a ratio; this reports a picture. Every
 * finding in that gate is a claim about what a student sees, and the only way
 * to confirm a claim like that is to look. It reuses the gate's own harness
 * (same Tailwind cache, same extracted --allo-stem-* palette, same two-layer
 * host mirror) so a shot and a finding describe the SAME pixels.
 *
 *   node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_physics.js --contrast
 *   node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_molecule.js --contrast --click="🧱Build"
 *
 * Flags: --dark | --contrast (default light), --click=<button label prefix>,
 *        --state=<json>, --out=<png path>, --full (full-page shot).
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

const args = process.argv.slice(2);
const DARK = args.includes('--dark');
const CONTRAST = args.includes('--contrast');
const FULL = args.includes('--full');
const file = args.find((a) => !a.startsWith('--'));
const clickArg = (args.find((a) => a.startsWith('--click=')) || '').slice(8);
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);
const outArg = (args.find((a) => a.startsWith('--out=')) || '').slice(6);
if (!file) {
  console.error('usage: node dev-tools/stem_tool_shot.cjs <toolFile> [--dark|--contrast] [--click=<label>] [--state=<json>] [--out=<png>] [--full]');
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.setContent('<!doctype html><html><head><style>' + tw + '</style><style>' + palette +
    '</style><style>body{margin:0;font-family:system-ui;background:' +
    (CONTRAST ? '#000000' : (DARK ? '#0f172a' : '#ffffff')) +
    '}</style></head><body><main id="slot" class="' +
    (CONTRAST ? 'theme-contrast' : (DARK ? 'theme-dark' : 'theme-default')) + '"></main></body></html>');
  for (const code of runtime) await page.addScriptTag({ content: code });
  await page.addScriptTag({ content: src });
  await page.addScriptTag({ content: SHELL });
  await page.evaluate(
    ({ id, dark, st, ct }) => window.__mount(id, dark, st, ct),
    { id: toolId, dark: DARK, st: stateArg ? JSON.parse(stateArg) : {}, ct: CONTRAST }
  );
  await page.waitForTimeout(450);
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
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  const theme = CONTRAST ? 'contrast' : (DARK ? 'dark' : 'light');
  const out = outArg || path.join(ROOT, 'dev-tools', '.cache', toolId + '_' + theme + '.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: FULL });
  await browser.close();
  if (errors.length) console.error('page errors: ' + errors.join(' | '));
  console.log(out);
})();
