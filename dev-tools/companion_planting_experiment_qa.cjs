// Run from the repository root: node dev-tools/companion_planting_experiment_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/companion-planting-enhancement');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const findings = { viewports: [], assertions: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => findings.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Companion Planting Lab · experiment verification</title></head><body><main id="root"></main></body></html>');
    const cssDir = path.join(root, 'app/static/css');
    const css = fs.readdirSync(cssDir).find(file => /^main\..*\.css$/.test(file));
    await page.addStyleTag({ path: path.join(cssDir, css) });
    await page.addStyleTag({ content: 'body{margin:0;background:#eff3ef;font-family:system-ui}#root{max-width:1152px;margin:16px auto;padding:0 12px}button,select,input,textarea{font:inherit}@media(max-width:640px){#root{padding:0 6px;margin:6px auto}}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_companionplanting.js') });
    await page.evaluate(() => {
      const R = window.React, h = R.createElement, noop = () => {};
      const icons = new Proxy({}, { get: () => () => h('span', { 'aria-hidden': true }) });
      function App() {
        const [data, setData] = R.useState({ companionPlanting: { gardenMode: 'community', communityGarden: {} } });
        window.cpData = data;
        window.cpSetData = setData;
        return window.StemLab._registry.companionPlanting.render({
          React: R, toolData: data, setToolData: setData, setStemLabTool: noop, setStemLabTab: noop,
          stemLabTool: 'companionPlanting', toolSnapshots: [], setToolSnapshots: noop, addToast: noop, icons,
          t: (key, fallback) => fallback || key, gradeLevel: '7th Grade', props: {},
          srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
          a11yClick: fn => ({ onClick: fn }), announceToSR: noop, canvasNarrate: noop,
          awardXP: noop, beep: noop, celebrate: noop, saveSnapshot: noop
        });
      }
      window.cpRoot = ReactDOM.createRoot(document.getElementById('root'));
      window.cpRoot.render(h(App));
    });
    const bench = page.locator('[data-community-experiment-bench]');
    await bench.locator('[data-experiment-capture]').click();
    await bench.locator('[data-experiment-crop]').selectOption('corn');
    await bench.locator('[data-experiment-plot="b-1"]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.experimentPlot), 'b-5');
    await bench.locator('[data-experiment-plot="b-15"]').click();
    assert.equal(await page.evaluate(() => cpData.companionPlanting.communityGarden.experimentBench.variant[15].plantId), 'beans');
    await bench.locator('[data-experiment-prediction]').fill('Moving beans away may reduce the modeled growth of corn.');
    const layoutHeights = await bench.locator('.cp-experiment-layout').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    assert.equal(layoutHeights[0], layoutHeights[1], 'both plot maps use matching row heights');
    await bench.screenshot({ path: path.join(out, 'experiment-layout-desktop.png') });
    await bench.locator('[data-experiment-run]').click();
    await bench.locator('[data-experiment-results]').waitFor();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const replay = bench.locator('[data-growth-replay]');
    await replay.scrollIntoViewIfNeeded();
    await replay.locator('[data-replay-play]').click();
    await page.waitForFunction(() => Number(document.querySelector('[data-growth-replay]').dataset.replayDay) >= 2);
    await replay.locator('[data-replay-play]').click();
    const pausedDay = await replay.getAttribute('data-replay-day');
    await page.waitForTimeout(1050);
    assert.equal(await replay.getAttribute('data-replay-day'), pausedDay, 'pause stops playback');
    await replay.locator('[data-replay-scrubber]').focus();
    await page.keyboard.press('End');
    assert.equal(await replay.getAttribute('data-replay-day'), '14');
    assert.equal(await replay.getAttribute('data-replay-playing'), 'false');
    await replay.screenshot({ path: path.join(out, 'growth-replay-desktop.png') });
    await bench.locator('[data-experiment-motion]').click();
    assert.equal(await replay.locator('[data-replay-play]').isDisabled(), true, 'manual reduced motion disables timed playback');
    await replay.locator('[data-replay-previous]').click();
    assert.equal(await replay.getAttribute('data-replay-day'), '13', 'manual day stepping remains available');
    assert.equal(await replay.locator('.cp-botanical-canopy').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await bench.locator('[data-experiment-motion]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-replay-play]').disabled);
    await page.setViewportSize({ width: 320, height: 844 });
    await replay.screenshot({ path: path.join(out, 'growth-replay-mobile-320.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await replay.locator('[data-replay-play]').click();
    await bench.locator('.cp-experiment-head').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-growth-replay]').dataset.replayPlaying === 'false');
    findings.motion = ['Play advances recorded days', 'Pause stops the timer', 'Keyboard scrubbing reaches endpoint', 'Manual and OS reduced motion', 'Manual stepping without motion', 'Offscreen playback pauses'];
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const samples = await page.evaluate(() => cpData.companionPlanting.communityGarden.experimentBench.result.samples);
    assert.ok(samples.at(-1).a.maturity > samples.at(-1).b.maturity, 'moving beans away affects corn growth');
    assert.equal(await page.evaluate(() => (cpData.companionPlanting.communityGarden.grid || []).filter(cell => cell.plantId).length), 0, 'live garden remains empty');
    await bench.locator('[data-experiment-conclusion]').fill('Layout A had greater modeled corn maturity. This does not establish the best layout in a real garden.');
    await bench.locator('[data-experiment-save]').click();
    await bench.locator('[data-experiment-status]').filter({ hasText: 'Trial saved' }).waitFor();
    assert.equal(await page.evaluate(() => cpData.companionPlanting.communityGarden.experimentHistory.length), 1);
    await bench.locator('[data-experiment-results]').screenshot({ path: path.join(out, 'experiment-results-desktop.png') });
    await page.addScriptTag({ path: require.resolve('axe-core') });
    findings.accessibility = await page.evaluate(async () => {
      const result = await axe.run(document.querySelector('[data-community-experiment-bench]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    const downloadPromise = page.waitForEvent('download');
    await bench.locator('[data-experiment-export]').click();
    const download = await downloadPromise;
    await download.saveAs(path.join(out, download.suggestedFilename()));
    const csv = fs.readFileSync(path.join(out, download.suggestedFilename()), 'utf8');
    assert.ok(csv.includes('"A crop","B crop"') && csv.includes('"B minus A maturity (points)"'), 'download includes layouts and data');
    // Reload the component from serialized garden progress, just as the host restores it.
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(cpData)));
    await page.evaluate(() => cpSetData({ companionPlanting: { gardenMode: 'sisters' } }));
    await page.locator('[data-experiment-entry]').waitFor();
    await page.evaluate(data => cpSetData(data), saved);
    await bench.locator('[data-experiment-results]').waitFor();
    assert.equal(await page.evaluate(() => cpData.companionPlanting.communityGarden.experimentHistory.length), 1);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await bench.scrollIntoViewIfNeeded();
      const geometry = await bench.evaluate(el => ({ width: el.getBoundingClientRect().width, content: el.scrollWidth, viewport: innerWidth, right: el.getBoundingClientRect().right }));
      assert.ok(geometry.content <= geometry.width + 1 && geometry.right <= width + 1, 'bench fits mobile viewport');
      await bench.locator('[data-experiment-plot="b-0"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.experimentPlot), 'b-1');
      findings.viewports.push({ width, geometry });
      await bench.screenshot({ path: path.join(out, `experiment-mobile-${width}.png`) });
    }
    await bench.locator('.cp-experiment-columns').screenshot({ path: path.join(out, 'experiment-layout-mobile-320.png') });
    await bench.locator('[data-experiment-results]').screenshot({ path: path.join(out, 'experiment-results-mobile-320.png') });
    await bench.locator('[data-experiment-reset]').click();
    assert.equal(await bench.locator('[data-experiment-results]').count(), 0, 'editing removes outdated results');
    await bench.locator('[data-experiment-history] summary').click();
    await bench.getByRole('button', { name: 'Reopen saved trial', exact: true }).click();
    await bench.locator('[data-experiment-results]').waitFor();
    await bench.locator('[data-experiment-toggle]').click();
    await bench.getByRole('button', { name: 'Resume experiment', exact: true }).click();
    await bench.locator('[data-experiment-results]').waitFor();
    findings.assertions = ['Keyboard swap and focus navigation', 'Modeled layout effect', 'Live garden isolation', 'Notebook save', 'CSV download', 'Serialized state restoration', '390px and 320px containment', 'Stale result invalidation', 'Reopen saved trial', 'Close and resume'];
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const canvas = page.locator('canvas[aria-describedby="community-plot-help"]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__cgCanvasEl && window.__cgCanvasEl.dataset.gardenMotion === 'still');
    await page.evaluate(() => { window.originalGardenCanvas = window.__cgCanvasEl; cpSetData(prev => {
      const garden = prev.companionPlanting.communityGarden;
      const grid = garden.experimentBench.baseline.grid.map(cell => ({ ...cell, growthDay: cell.plantId ? 35 : 0 }));
      return { companionPlanting: { ...prev.companionPlanting, communityGarden: { ...garden, grid, day: 14, phase: 'grow' } } };
    }); });
    await page.waitForFunction(() => window.__cgCanvasEl.dataset.gardenRenderDay === '14');
    assert.equal(await page.evaluate(() => window.originalGardenCanvas === window.__cgCanvasEl), true, 'canvas updates without remount');
    await page.waitForFunction(() => window.__cgCanvasEl._cgAnim === null);
    await canvas.screenshot({ path: path.join(out, 'garden-overview-still.png') });
    const pausedCanvas = await canvas.evaluate(el => el.toDataURL());
    await page.waitForTimeout(200);
    assert.equal(await canvas.evaluate(el => el.toDataURL()), pausedCanvas, 'reduced motion freezes pixels');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => window.__cgCanvasEl.dataset.gardenMotion === 'animated');
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, reducedMotion: true } } })));
    await page.waitForFunction(() => window.__cgCanvasEl.dataset.gardenMotion === 'still' && window.__cgCanvasEl._cgAnim === null);
    await page.setViewportSize({ width: 320, height: 844 });
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Number(window.__cgCanvasEl.dataset.gardenTileWidth) * 4 <= window.__cgCanvasEl.width - 47);
    await canvas.screenshot({ path: path.join(out, 'garden-overview-mobile-320.png') });
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, phase: 'plan' } } })));
    await page.waitForFunction(() => window.__cgCanvasEl._cgFrameState.phase === 'plan');
    const target = await canvas.evaluate(el => {
      const tw = Number(el.dataset.gardenTileWidth), th = Number(el.dataset.gardenTileHeight), box = el.getBoundingClientRect();
      return { x: box.width / 2, y: (Number(el.dataset.gardenOriginY) + 3.5 * th) * box.height / el.height };
    });
    await canvas.click({ position: target });
    await page.waitForFunction(() => cpData.companionPlanting.communityGarden.relationshipFocus === 15);
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Dense planting, seasons, and all plot centers must stay legible and selectable.
    await page.evaluate(() => cpSetData(prev => {
      const ids = ['corn', 'sunflower', 'beans', 'tomato', 'marigold', 'borage', 'pepper', 'basil', 'squash', 'nasturtium', 'lettuce', 'carrot', 'lavender', 'strawberry', 'radish', 'rain_barrel'];
      return { companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden,
        grid: ids.map((plantId, i) => ({ plantId, growthDay: 95, health: 98, pests: 0, watered: i % 2 === 0 })),
        day: 44, phase: 'plan', selectedPlant: null, placementPreview: null, relationshipLens: false, relationshipFocus: null } } };
    }));
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__cgCanvasEl.dataset.gardenPlantedCount === '16');
    for (const viewport of [{ width: 1280, height: 1000 }, { width: 320, height: 844 }]) {
      await page.setViewportSize(viewport);
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.__cgCanvasEl.width === window.__cgCanvasEl.offsetWidth * 2 && Number(window.__cgCanvasEl.dataset.gardenRenderWidth) === window.__cgCanvasEl.width);
      for (let plot = 0; plot < 16; plot++) {
        const position = await canvas.evaluate((el, index) => {
          const box = el.getBoundingClientRect(), w = Number(el.dataset.gardenTileWidth), h = Number(el.dataset.gardenTileHeight);
          const row = Math.floor(index / 4) + .5, col = index % 4 + .5;
          return { x: (el.width / 2 + (col - row) * w / 2) * box.width / el.width, y: (Number(el.dataset.gardenOriginY) + (col + row) * h / 2) * box.height / el.height };
        }, plot);
        await canvas.click({ position });
        try { await page.waitForFunction(index => cpData.companionPlanting.communityGarden.relationshipFocus === index, plot, { timeout: 30000 }); } catch (error) { console.error('Hit test failed', { viewport, plot, position }, await canvas.evaluate(el => ({ width: el.width, height: el.height, data: { ...el.dataset }, focus: cpData.companionPlanting.communityGarden.relationshipFocus }))); throw error; }
      }
      await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, relationshipLens: false, relationshipFocus: null } } })));
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => window.__cgCanvasEl._cgAnim === null);
      await canvas.screenshot({ path: path.join(out, viewport.width === 320 ? 'garden-full-mobile-320.png' : 'garden-full-desktop.png') });
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await canvas.scrollIntoViewIfNeeded();
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, day: 94 } } })));
    await page.waitForFunction(() => window.__cgCanvasEl.dataset.gardenRenderDay === '94');
    await canvas.screenshot({ path: path.join(out, 'garden-winter-desktop.png') });
    await page.getByRole('button', { name: 'Maximize garden view', exact: true }).click();
    await page.waitForFunction(() => window.__cgCanvasEl && window.__cgCanvasEl.offsetHeight > 650);
    const maximizedBounds = await canvas.evaluate(el => {
      const w = Number(el.dataset.gardenTileWidth), h = Number(el.dataset.gardenTileHeight), y = Number(el.dataset.gardenOriginY);
      return { fits: w * 4 < el.width && y + h * 4 + 40 < el.height };
    });
    assert.equal(maximizedBounds.fits, true, 'maximized garden keeps all beds in view');
    await page.getByRole('button', { name: 'Exit maximized garden view', exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    // Subsequent cleanup check follows the new normal-size canvas.
    await page.evaluate(() => { window.originalGardenCanvas = window.__cgCanvasEl; });
    findings.assertions.push('All 16 plot centers select correctly at desktop and 320px', 'Dense crop and winter scenes render', 'Maximized garden fits all beds');
    const map = page.locator('[data-community-garden-canvas]');
    await map.locator('[data-plot-growth-stage]').first().scrollIntoViewIfNeeded();
    await map.locator('[data-plot-growth-stage]').first().screenshot({ path: path.join(out, 'garden-plot-botanical.png') });
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, reducedMotion: false } } })));
    await page.waitForFunction(() => window.__cgCanvasEl._cgVisible === false && window.__cgCanvasEl._cgAnim === null);
    await page.evaluate(() => cpSetData({ companionPlanting: { gardenMode: 'sisters' } }));
    await page.waitForFunction(() => window.originalGardenCanvas._cgCanvasInit === false && window.originalGardenCanvas._cgAnim === null);
    findings.motion.push('Live canvas receives current day without remount', 'Canvas motion respects OS and lab settings', 'Canvas fits 320px and hit-tests plot 16 correctly', 'Canvas stops when offscreen', 'Canvas releases animation resources on unmount');
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(findings, null, 2));
    assert.equal(findings.errors.length, 0, JSON.stringify(findings.errors));
    assert.equal(findings.accessibility.length, 0, JSON.stringify(findings.accessibility));
    console.log(JSON.stringify(findings, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
