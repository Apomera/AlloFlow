'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const before = process.argv.includes('--before');
const source = fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8');
const out = path.resolve('scratch/tectonics-vent-inspection-review', before ? 'before' : 'after');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [], passed: false };
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0"><canvas id="model" style="display:block;width:calc(100vw - 32px);margin:16px;height:470px" aria-label="Volcano anatomy model"></canvas></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: fs.readFileSync(file, 'utf8') });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      const Renderer = THREE.WebGLRenderer;
      window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) {
        const renderer = new Renderer(options), render = renderer.render;
        renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); };
        return renderer;
      };
    });
    await page.addScriptTag({ content: source });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const capture = async name => { await page.locator('#model').screenshot({ path: path.join(out, name + '.png') }); report.captures.push(name + '.png'); };
    for (const [width, dark] of before ? [[390, false], [1100, true]] : [[390, false], [1100, false], [390, true], [1100, true]]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 520 });
      await page.evaluate(dark => {
        document.body.style.background = dark ? '#0f172a' : '#dbeafe';
        document.getElementById('model').style.background = dark ? 'linear-gradient(#0f1f35,#172a43)' : 'linear-gradient(#7baeed,#e9f2ff)';
        __alloVentGL.resetView();
        __alloVentGL.submit({ active: false, paused: true, motionClock: 0, tick: 0, dark, labels: true, magma: 'andesite' });
        __alloVentGL.mount(document.getElementById('model'));
      }, dark);
      await page.waitForFunction(() => __alloVentGL.debug().state === 'ready'); await settle();
      await capture(name + '-all-anatomy');
      const baseline = await page.evaluate(() => __alloVentGL.debug());
      if (before) { report.checks.push({ name, passed: true, baseline }); continue; }
      const observations = [];
      for (const id of ['vent', 'conduit', 'chamber', 'dike', 'sill']) {
        await page.evaluate(id => __alloVentGL.selectAnatomy(id), id); await settle();
        const current = await page.evaluate(() => {
          const inspection = __alloVentGL.getInspection(), canvas = document.getElementById('model');
          const projected = new THREE.Vector3().fromArray(inspection.anchor).project(qaCamera);
          return { inspection, debug: __alloVentGL.debug(), renders: qaRenders, width: canvas.clientWidth, height: canvas.clientHeight,
            marker: { x: (projected.x + 1) * canvas.clientWidth / 2 - 6.5, y: (1 - projected.y) * canvas.clientHeight / 2 - 6.5, width: 13, height: 13 } };
        });
        assert.equal(current.inspection.id, id); assert.equal(current.inspection.visible, true);
        assert.equal(current.debug.tick, baseline.tick); assert.equal(current.debug.fill, baseline.fill);
        const rects = [...current.debug.labelRects, current.marker];
        for (let i = 0; i < rects.length; i++) {
          const a = rects[i];
          assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= current.width && a.y + a.height <= current.height, id + ': label/marker stays in frame');
          for (let j = i + 1; j < rects.length; j++) {
            const b = rects[j];
            assert.ok(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) <= 0.1 || Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) <= 0.1, id + ': selected marker and captions stay separate');
          }
        }
        if (id === 'dike' || id === 'sill') await capture(name + '-' + id);
        const count = current.renders; await settle();
        assert.equal(await page.evaluate(() => qaRenders), count, 'Selection settles without a perpetual render.');
        observations.push(current.inspection);
      }
      await page.evaluate(() => { __alloVentGL.selectAnatomy('chamber'); __alloVentGL.setCut(20); }); await settle();
      const hidden = await page.evaluate(() => __alloVentGL.getInspection()); assert.equal(hidden.visible, false);
      if (width === 390) await capture(name + '-chamber-hidden');
      await page.evaluate(() => { __alloVentGL.setCut(0); __alloVentGL.setCam(-40, -70); }); await settle();
      assert.equal(await page.evaluate(() => __alloVentGL.getInspection().visible), true);
      if (width === 390) await capture(name + '-chamber-rotated');
      await page.evaluate(() => __alloVentGL.selectAnatomy(null)); await settle();
      assert.equal(await page.evaluate(() => __alloVentGL.getInspection().id), null);
      report.checks.push({ name, passed: true, observations, hidden });
      console.log('PASS', name);
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
