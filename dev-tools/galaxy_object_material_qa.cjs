// Local, deterministic close-up material comparisons; no network assets.
// GALAXY_MATERIAL_SOURCE can point at a saved baseline. GALAXY_MATERIAL_TAG names it.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-object-materials-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(file => fs.existsSync(file));
const tag = process.env.GALAXY_MATERIAL_TAG || 'after';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { tag, starCount: 5000, viewport: [1440, 1050], browser: executablePath || 'bundled', images: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => results.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addStyleTag({ path: path.join(ROOT, css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read(process.env.GALAXY_MATERIAL_SOURCE || 'stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection === 'function', null, { timeout: 60000 });
    async function capture(id) {
      await page.waitForTimeout(150);
      const image = tag + '-' + id + '-1440.png';
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled', timeout: 30000 });
      const state = await page.locator('[data-galaxy-canvas]').evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), visual: canvas._galaxyGetInspectionVisualState?.() || null }));
      results.images.push({ id, image, ...state });
      console.log(tag + '/' + id);
    }
    await page.locator('[data-galaxy-canvas]').evaluate(canvas => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    await capture('star');
    await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyExitInspection());
    await page.locator('[data-galaxy-control-tab="discover"]').click();
    const targets = await page.locator('[data-galaxy-nebula-target]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
    for (const [id, index] of [['orion', 0], ['horsehead', 6], ['helix', 4], ['eagle', 1], ['crab', 2]]) {
      await page.locator('[data-galaxy-canvas]').evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, targets[index]);
      await capture(id);
      await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyExitInspection());
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, tag + '-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
