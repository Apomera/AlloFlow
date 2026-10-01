'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-epicenter-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Epicenter learning review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      window.StemLab = { registerTool() {} };
      window.qaPaints = 0;
      const originalFill = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function(...args) {
        if (this.canvas.hasAttribute('data-pt-epicenter-canvas')) window.qaPaints++;
        return originalFill.apply(this, args);
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0, themeSetter;
      window.qaMountEpicenter = dark => {
        window.qaRecords = []; window.qaAnnouncements = [];
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        function Host() {
          const [theme, setTheme] = React.useState(dark); themeSetter = setTheme;
          return React.createElement(AlloTectonicsEpicenter, { darkMode: theme,
            t: (_key, fallback) => fallback,
            onRecord: record => qaRecords.push(record),
            announceToSR: message => qaAnnouncements.push(message) });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
      window.qaSetTheme = dark => ReactDOM.flushSync(() => themeSetter(dark));
      window.qaCanvas = () => document.querySelector('[data-pt-epicenter-canvas]');
    });
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMountEpicenter(dark), dark);
      const canvas = page.locator('[data-pt-epicenter-canvas]');
      await canvas.waitFor();
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      const initial = await page.evaluate(() => qaCanvas().toDataURL());
      await canvas.focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(initial => qaCanvas().toDataURL() !== initial, initial);
      await page.locator('#slot').screenshot({ path: path.join(out, `explore-${name}.png`), animations: 'disabled' });
      await page.locator('[data-pt-mystery-start]').click();
      assert.match(await canvas.getAttribute('aria-label'), /true epicenter and distances are hidden/);
      const mysteryImage = await page.evaluate(() => qaCanvas().toDataURL());
      await page.locator('[data-pt-mystery-dist="BRK"]').fill('420');
      await page.waitForFunction(initial => qaCanvas().toDataURL() !== initial, mysteryImage);
      const readings = await page.locator('[data-pt-epi-reading]').evaluateAll(rows => rows.map(row => ({ id: row.dataset.ptEpiReading, value: Math.round(Number(row.textContent.match(/([\d.]+)s/)[1]) * 8.4) })));
      for (const row of readings) await page.locator(`[data-pt-mystery-dist="${row.id}"]`).fill(String(row.value));
      await page.locator('[data-pt-mystery-check-distances]').click();
      assert.deepEqual(await page.locator('[data-pt-radius-status]').evaluateAll(rows => rows.map(row => row.dataset.ptRadiusStatus)), ['correct', 'correct', 'correct']);
      assert.equal(await page.evaluate(() => qaRecords.length), 0);
      await canvas.focus(); await page.keyboard.press('ArrowRight');
      await page.locator('#slot').screenshot({ path: path.join(out, `mystery-${name}.png`), animations: 'disabled' });
      await canvas.screenshot({ path: path.join(out, `map-${name}.png`), animations: 'disabled' });
      const beforeResize = await canvas.evaluate(node => node.width);
      await page.setViewportSize({ width: width - 30, height: 1000 });
      await page.waitForFunction(before => qaCanvas().width !== before, beforeResize);
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(before => qaCanvas().width === before, beforeResize);
      const beforeTheme = await page.evaluate(() => qaCanvas().toDataURL());
      await page.evaluate(dark => qaSetTheme(!dark), dark);
      await page.waitForFunction(before => qaCanvas().toDataURL() !== before, beforeTheme);
      await page.evaluate(dark => qaSetTheme(dark), dark);
      // Native fullscreen changes CSS geometry; pointer coordinates still use
      // the same 540 by 360 map, and exported PNGs use its current backing size.
      await page.evaluate(() => qaCanvas().parentElement.requestFullscreen());
      await page.waitForFunction(() => document.fullscreenElement && qaCanvas().width === Math.round(Math.min(qaCanvas().clientWidth, 1200) * Math.min(devicePixelRatio || 1, 2)));
      const fullscreenBounds = await canvas.boundingBox();
      await canvas.click({ position: { x: fullscreenBounds.width / 2, y: fullscreenBounds.height / 2 } });
      const centerDescription = await canvas.getAttribute('aria-label');
      // Browser pointer events round to display pixels; allow one CSS pixel
      // converted into map kilometers, plus the text's nearest-km rounding.
      const pointerToleranceKm = Math.ceil(4 * 540 / fullscreenBounds.width) + 1;
      for (const [station, distance] of [['BRK', 805], ['PAS', 788], ['MHC', 768]]) {
        const measured = centerDescription.match(new RegExp(station + ' (\\d+) km'));
        assert.ok(measured && Math.abs(Number(measured[1]) - distance) <= pointerToleranceKm, `Center click should map correctly for ${station}: ${centerDescription}`);
      }
      await canvas.screenshot({ path: path.join(out, `fullscreen-${name}.png`), animations: 'disabled' });
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement && qaCanvas().width === Math.round(Math.min(qaCanvas().clientWidth, 1200) * Math.min(devicePixelRatio || 1, 2)));
      const downloadReady = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save this triangulation map as a PNG image', exact: true }).click();
      const download = await downloadReady;
      const png = fs.readFileSync(await download.path());
      const exported = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
      assert.equal(exported.width, await canvas.evaluate(node => node.width));
      assert.equal(exported.height, await canvas.evaluate(node => node.height));
      await page.waitForTimeout(100);
      const paints = await page.evaluate(() => qaPaints);
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => qaPaints), paints, 'The stationary canvas should not repaint repeatedly.');
      const metrics = await page.locator('#slot').evaluate(node => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        clippedControls: [...node.querySelectorAll('input,select,button')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(el => el.getAttribute('aria-label') || el.textContent),
        canvas: { width: qaCanvas().width, height: qaCanvas().height },
        stationaryPaints: qaPaints
      }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []);
      const audit = await page.locator('#slot').evaluate(async node => {
        const result = await axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'label', 'button-name', 'aria-valid-attr-value'] } });
        return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      await page.locator('[data-pt-mystery-check]').click();
      await page.waitForSelector('[data-pt-mystery="revealed"]');
      assert.equal(await page.evaluate(() => qaRecords.length), 1);
      report.checks.push({ name, metrics, audit, exported, fullscreenPointerVerified: true, recordsAfterReveal: 1 });
      report.captures.push(`explore-${name}.png`, `mystery-${name}.png`, `map-${name}.png`, `fullscreen-${name}.png`);
      console.log(name, JSON.stringify({ metrics, audit }));
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    assert.deepEqual(report.errors, []);
    assert.ok(report.checks.every(check => check.audit.length === 0), 'Accessibility checks should pass.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
