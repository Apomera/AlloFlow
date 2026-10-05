const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = process.env.UNIVERSE_REPO;
assert.ok(repo, 'UNIVERSE_REPO must name the reviewed checkout');
const report = path.join(repo, 'reports/universe-flight-2026-09-29');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source = path.join(repo, 'stem_lab/universe_flight_scene.js'), ui = path.join(repo, 'stem_lab/stem_tool_universe.js');
const result = { sourceHash: sha(source), uiHash: sha(ui), completed: false, layouts: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'flyby-normal-controls.json'), JSON.stringify(result, null, 2));
(async () => {
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
    page.on('pageerror', error => result.errors.push(String(error)));
    await page.addInitScript(() => {
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) { const telemetry = options.onTelemetry; const scene = create.call(this, canvas, Object.assign({}, options, { onTelemetry(info) { window.__normalInfo = info; if (telemetry) telemetry(info); } })); window.__normalScene = scene; return scene; }; api = value;
      } });
    });
    await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?flyby=normal-qa');
    await page.waitForFunction(() => window.__normalScene && !document.querySelector('.uf-transport button')?.disabled);
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      const launch = page.locator('#uf-scenic-flights [data-scenic-flight="halo"]'); await launch.focus(); await launch.press('Enter');
      await page.waitForFunction(() => window.__normalInfo?.flyby?.active && window.__normalInfo.running);
      const canvas = page.locator('.uf-stage canvas'); await canvas.focus(); await canvas.press('Space'); await page.waitForFunction(() => !window.__normalInfo.running);
      const section = page.locator('#uf-flyby-status'); await section.scrollIntoViewIfNeeded();
      assert.equal(await section.getAttribute('data-flyby-state'), 'paused'); assert.ok(await section.evaluate(node => node.scrollWidth <= node.clientWidth + 1)); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const controls = [];
      for (const control of await section.locator('select,button').all()) { const box = await control.boundingBox(); assert.ok(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= viewport.width + 1); controls.push(box); }
      const violations = await section.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []); const name = viewport.width === 320 ? 'phone' : 'landscape';
      await section.screenshot({ path: path.join(report, 'flyby-' + name + '-normal-controls.png') });
      const saved = await page.evaluate(() => window.__normalScene.snapshot()); await page.waitForTimeout(160); assert.deepEqual(await page.evaluate(() => window.__normalScene.snapshot()), saved);
      result.layouts.push({ name, viewport, controls, violations, snapshot: saved }); save(); console.log('Captured flyby-' + name + '-normal-controls.png');
    }
    assert.deepEqual(result.errors, []); assert.equal(sha(source), result.sourceHash); assert.equal(sha(ui), result.uiHash); result.completed = true; save();
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
