'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve(process.env.PT_QA_OUT || 'scratch/tectonics-transform-marker-review');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], checks: [], errors: [], passed: false };
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0"><canvas id="model" aria-label="Transform fault reference markers" style="margin:12px;display:block;width:calc(100vw - 24px);height:400px"></canvas></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) { const renderer = new Renderer(options), render = renderer.render; renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); }; return renderer; };
    });
    await page.addScriptTag({ content: source });
    let signature = 0;
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const width of [1100, 390]) for (const dark of [false, true]) for (const offset of [0, 96, 192, 280]) {
      const name = `${dark ? 'dark' : 'light'}-${width}-offset-${offset}`;
      await page.setViewportSize({ width, height: 424 });
      await page.evaluate(({ model, dark }) => { document.body.style.background = dark ? '#0f172a' : '#f8fafc'; __alloTectGL.submit(model); __alloTectGL.mount(document.getElementById('model')); },
        { dark, model: { mode: 'transform', mountainHeight: 0, rift: 0, offset, quakes: [], rotX: -88, rotY: 0, scale: 1, cut: null, showScale: true, surfaceView: true, sig: String(++signature) } });
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
      const details = await page.evaluate(() => {
        const bands = []; qaScene.updateMatrixWorld(true);
        qaScene.traverse(object => { if (object.userData.feature === 'matching-marker') { const world = object.getWorldPosition(new THREE.Vector3()); bands.push({ ...object.userData, x: world.x, z: world.z, pieces: object.children.length }); } });
        return { bands, debug: __alloTectGL.debug(), renders: qaRenders };
      });
      assert.equal(details.debug.contextLost, false); assert.equal(details.bands.length, 4);
      for (const id of ['reference-1', 'reference-2']) {
        const pair = details.bands.filter(band => band.markerId === id); assert.equal(pair.length, 2);
        assert.ok(pair.every(band => band.pattern === (id === 'reference-1' ? 'solid' : 'dashed')));
        assert.ok(pair.every(band => band.pieces === (id === 'reference-1' ? 1 : 6)));
      }
      if (offset === 192) { const coincident = details.bands.filter(band => Math.abs(band.z) < 1e-8); assert.equal(coincident.length, 2); assert.notEqual(coincident[0].pattern, coincident[1].pattern); }
      await settle(); assert.equal(await page.evaluate(() => qaRenders), details.renders, 'Idle model does not repaint.');
      await page.locator('#model').screenshot({ path: path.join(out, name + '.png') }); report.captures.push(name + '.png');
      report.checks.push({ name, passed: true, details }); console.log('PASS', name);
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
