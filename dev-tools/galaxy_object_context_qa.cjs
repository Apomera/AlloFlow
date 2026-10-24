// Verify selected-object explanations with real React, Three.js and browser layout.
// Run: node dev-tools/galaxy_object_context_qa.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/galaxy-depth-context-2026-10-22');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shellStart = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shellEnd = core.indexOf('`;\n\n(async', shellStart);
assert(shellStart > 0 && shellEnd > shellStart);
const shell = core.slice(shellStart, shellEnd).replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state }); window.__galaxyState = pair[0].galaxy;`)
  .replace('awardXP: function(){},', 'awardXP: function(){window.__awards++;},');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const samePoint = (actual, expected, why) => ['x', 'y', 'z'].forEach(axis => assert(Math.abs(actual[axis] - expected[axis]) < 1e-5, why + ': ' + axis));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { starCount: 5000, errors: [], layouts: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => result.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window.__awards = 0; let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection === 'function', null, { timeout: 60000 });
    const canvas = page.locator('[data-galaxy-canvas]'), context = page.locator('[data-galaxy-object-context]');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const inspect = () => canvas.evaluate(canvas => canvas._galaxyGetInspectionState());
    const selectBand = async band => { await page.locator('[data-galaxy-object-band]').selectOption(band); await settle(); };
    const selectNebula = async name => {
      await canvas.evaluate((canvas, name) => canvas._galaxyFocusNebula(name), name); await settle();
      if (!(await context.evaluate(node => node.open))) await page.locator('[data-galaxy-object-context-summary]').click();
    };
    assert.equal(await context.count(), 0, 'No object explanation before selection');
    await canvas.evaluate(canvas => canvas._galaxyCycleStar(1)); await settle();
    assert.equal(await context.getAttribute('open'), null, 'Explanation starts collapsed');
    const awardsBeforeReading = await page.evaluate(() => window.__awards);
    const summary = page.locator('[data-galaxy-object-context-summary]');
    await summary.focus(); await page.keyboard.press('Enter');
    assert.equal(await context.evaluate(node => node.open), true);
    assert.equal(await page.evaluate(() => window.__awards), awardsBeforeReading, 'Reading does not award observation XP');
    await canvas.evaluate(canvas => canvas._galaxyInspectSelection()); await settle();
    const starBefore = await inspect();
    await selectBand('xray');
    assert.equal(await context.evaluate(node => node.open), true, 'Changing signals keeps the disclosure open');
    assert.match(await page.locator('[data-galaxy-object-context-signal]').innerText(), /corona|outer atmosphere/i);
    samePoint((await inspect()).camera, starBefore.camera, 'Reading a different signal preserves the camera');
    assert.equal((await inspect()).label, starBefore.label);
    result.starXrayContext = true;

    await selectNebula('Horsehead Nebula'); await selectBand('visible');
    const visibleDust = await page.locator('[data-galaxy-object-context-signal]').innerText();
    await selectBand('infrared');
    const infraredDust = await page.locator('[data-galaxy-object-context-signal]').innerText();
    assert.notEqual(visibleDust, infraredDust);
    assert.match(infraredDust, /dust|infrared/i);
    assert.match(await page.locator('[data-galaxy-object-context-name]').innerText(), /Horsehead/);
    result.darkCloudChangesWithBand = true;

    await selectNebula('Crab Nebula'); await selectBand('radio');
    assert.match(await page.locator('[data-galaxy-object-context-signal]').innerText(), /synchrotron|magnetic|energetic particles/i);
    assert.match(await page.locator('[data-galaxy-object-context-scope]').innerText(), /model|illustrat|schematic/i);
    const source = page.locator('[data-galaxy-object-context-source]');
    assert(['science.nasa.gov', 'imagine.gsfc.nasa.gov', 'heasarc.gsfc.nasa.gov'].includes(new URL(await source.getAttribute('href')).hostname));
    await selectBand('gravity');
    assert.match(await page.locator('[data-galaxy-object-context-signal]').innerText(), /infer|motion|lensing/i);
    assert((await page.locator('[data-galaxy-object-context-prompt]').innerText()).length > 20);
    result.remnantAndGravityContext = true;

    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 }); await settle();
      await context.scrollIntoViewIfNeeded();
      const geometry = await context.evaluate(node => {
        const box = node.getBoundingClientRect(), stage = document.querySelector('[data-galaxy-stage]').getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, stageBottom: stage.bottom,
          targets: [...node.querySelectorAll('summary,a')].map(target => { const r = target.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }) };
      });
      assert(geometry.left >= -1 && geometry.right <= width + 1);
      assert(geometry.targets.every(target => target.width >= 44 && target.height >= 44 && target.left >= -1 && target.right <= width + 1), 'Context targets fit at ' + width);
      if (width < 1280) assert(geometry.top >= geometry.stageBottom, 'Object context stays below the scene at ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await context.screenshot({ path: path.join(OUT, 'object-context-' + width + '.png'), animations: 'disabled' });
      result.layouts.push({ width, overflow: false, targets44px: true, outsideScene: width < 1280 });
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await summary.focus(); await page.keyboard.press('Space');
    assert.equal(await context.evaluate(node => node.open), false);
    await page.keyboard.press('Space');
    assert.equal(await context.evaluate(node => node.open), true);
    result.keyboardAndForcedColors = true;
    await page.locator('[data-galaxy-control-tab="view"]').click();
    await page.getByRole('button', { name: /Infrared.*seeing through dust/ }).click(); await settle();
    assert.equal(await context.count(), 0, 'Ordinary overview filters clear the object-specific explanation');
    result.clearsWithSelection = true;
    assert.deepEqual(result.errors, []);
    fs.writeFileSync(path.join(OUT, 'object-context-browser.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) {
    result.failure = String(error.stack || error);
    fs.writeFileSync(path.join(OUT, 'object-context-browser.json'), JSON.stringify(result, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
