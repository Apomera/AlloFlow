'use strict';

// Real WebGL renderer, shipped Three.js, and known earthquake observations.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const before = process.argv.includes('--before');
const read = file => fs.readFileSync(file, 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-focus-review', before ? 'before' : 'after');
fs.mkdirSync(out, { recursive: true });
const quakes = [
  { depthKm: 30, distKm: 30, strikeKm: -120, m: 5 },
  { depthKm: 180, distKm: 180, strikeKm: -40, m: 5 },
  { depthKm: 520, distKm: 520, strikeKm: -100, m: 5 }
];
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const errors = [], captures = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) errors.push(message.text()); });
  try {
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0;background:#020617"><main style="padding:12px"><canvas id="model" style="display:block;width:100%;height:300px" aria-label="Plate model with known earthquake observations"></canvas></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { StemLab.ensureThree = () => Promise.resolve(THREE); });
    await page.addScriptTag({ content: source });
    let signature = 0;
    const cases = before ? [
      { name: 'phone-oblique-deep', width: 390, quakes },
      { name: 'phone-surface-deep', width: 390, quakes, rotX: -88, rotY: 0, surfaceView: true }
    ] : [
      { name: 'phone-oblique-deep', width: 390, quakes },
      { name: 'desktop-oblique-deep', width: 1100, quakes },
      { name: 'phone-cut-deep', width: 390, quakes, cut: 0, rotX: 0, rotY: 0 },
      { name: 'phone-rotated-deep', width: 390, quakes, cut: 0, rotX: -7, rotY: 80 },
      { name: 'phone-surface-deep', width: 390, quakes, rotX: -88, rotY: 0, surfaceView: true },
      { name: 'phone-shallow', width: 390, quakes: [quakes[0]] },
      { name: 'phone-cut-newest-clipped', width: 390, quakes: [...quakes, { depthKm: 640, distKm: 640, strikeKm: 180, m: 5 }], cut: 0 },
      { name: 'phone-cut-all-clipped', width: 390, quakes: [{ depthKm: 640, distKm: 640, strikeKm: 180, m: 5 }], cut: 0 },
      { name: 'phone-empty', width: 390, quakes: [] }
    ];
    for (const scenario of cases) {
      await page.setViewportSize({ width: scenario.width, height: 430 });
      const model = { mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100, rotX: -22, rotY: -38, scale: 1, cut: null, showScale: true, surfaceView: false, ...scenario, sig: String(++signature) };
      await page.evaluate(model => { __alloTectGL.submit(model); __alloTectGL.mount(document.getElementById('model')); }, model);
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#model').screenshot({ path: path.join(out, scenario.name + '.png') });
      const debug = await page.evaluate(() => __alloTectGL.debug());
      captures.push({ name: scenario.name, debug });
      assert.equal(debug.contextLost, false);
      if (!before) {
        const retained = scenario.quakes.filter(q => scenario.cut == null || q.strikeKm * 0.1 <= scenario.cut);
        assert.equal(debug.focusAnnotation?.depthKm ?? null, retained.length ? retained[retained.length - 1].depthKm : null, scenario.name);
        if (retained.length) {
          const label = debug.labelRects.find(rect => /focus/i.test(rect.text));
          assert.ok(label, scenario.name + ': depth label present');
          assert.ok(label.height >= 18);
        }
        for (const rect of debug.labelRects) {
          assert.ok(rect.x >= -0.1 && rect.y >= -0.1 && rect.x + rect.width <= debug.canvas.w + 0.1 && rect.y + rect.height <= debug.canvas.h + 0.1, scenario.name + ': bounded ' + rect.text);
        }
        for (let i = 0; i < debug.labelRects.length; i++) for (let j = i + 1; j < debug.labelRects.length; j++) {
          const a = debug.labelRects[i], b = debug.labelRects[j];
          const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          assert.ok(dx <= 1 || dy <= 1, scenario.name + ': ' + a.text + ' overlaps ' + b.text);
        }
      }
      console.log('PASS', scenario.name);
    }
    assert.deepEqual(errors, []);
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
