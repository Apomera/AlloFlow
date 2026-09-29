const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
let source = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
source = source
  .replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
source += '\nglobalThis.makePhysicsPage = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(source, sandbox);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const output = [];
  try {
    for (const theme of ['default', 'dark', 'contrast']) {
      const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme));
      await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch);
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics, showGraphs: true, airResist: true, angle: 45, velocity: 25, simSpeed: 1 } })));
      await page.getByRole('button', { name: 'Launch!', exact: true }).click();
      await page.waitForFunction(() => !!window.__reviewState.physics.lastFlight, null, { timeout: 15000 });
      const original = await page.evaluate(() => window.__reviewState.physics.lastFlight);
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics, simSpeed: 0, airResist: false } })));
      await page.locator('[data-physics-inspect]').click();
      const inspection = await page.locator('[data-physics-inspection]').innerText();
      assert.match(inspection, /KE.*PE/);
      assert.match(inspection, / N/);
      for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const graphs = page.locator('[data-physics-component-graphs]');
        await graphs.scrollIntoViewIfNeeded();
        const measurements = await graphs.evaluate(el => {
          const graphs = [...el.querySelectorAll('svg')];
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            graphs: graphs.map(svg => ({
              top: svg.getBoundingClientRect().top, height: svg.getBoundingClientRect().height,
              effectiveText: Number(svg.querySelector('text').getAttribute('font-size')) * svg.getScreenCTM().a,
              name: svg.getAttribute('aria-label')
            }))
          };
        });
        assert(measurements.overflow <= 1);
        assert(measurements.graphs[1].top > measurements.graphs[0].top + measurements.graphs[0].height);
        assert(measurements.graphs.every(g => g.effectiveText >= 12));
        assert.match(measurements.graphs[0].name, /drag/i);
        const screenshot = 'after-' + theme + '-' + width + '.png';
        await page.screenshot({ path: path.join(__dirname, screenshot) });
        output.push({ theme, width, measurements, original, screenshot });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'improvement-visual-results.json'), JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
