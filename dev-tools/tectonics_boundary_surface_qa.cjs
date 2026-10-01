'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve(process.env.PT_QA_OUT || 'scratch/tectonics-boundary-surface-review');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], checks: [], errors: [], passed: false };
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0"><canvas id="model" aria-label="Boundary surface features" style="margin:12px;display:block;width:calc(100vw - 24px);height:400px"></canvas></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) { const renderer = new Renderer(options), render = renderer.render; renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); }; return renderer; };
    });
    await page.addScriptTag({ content: source });
    let signature = 0;
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const cases = [
      ['convergent-high-surface', { mountainHeight: 7000, rotX: -88, rotY: 0, surfaceView: true }],
      ['convergent-high-cutaway', { mountainHeight: 7000, cut: 0, rotX: 0, rotY: 0 }],
      ['divergent-wide-surface', { mode: 'divergent', rift: 180, rotX: -88, rotY: 0, surfaceView: true }],
      ['divergent-wide-cutaway', { mode: 'divergent', rift: 180, cut: 0 }]
    ];
    for (const width of [1100, 390]) for (const dark of [false, true]) for (const [label, patch] of cases) {
      const name = `${dark ? 'dark' : 'light'}-${width}-${label}`;
      await page.setViewportSize({ width, height: 424 });
      await page.evaluate(({ model, dark }) => { document.body.style.background = dark ? '#0f172a' : '#f8fafc'; __alloTectGL.submit(model); __alloTectGL.mount(document.getElementById('model')); },
        { dark, model: { mode: 'convergent', mountainHeight: 0, rift: 0, offset: 0, quakes: [], rotX: -22, rotY: -38, scale: 1, cut: null, showScale: true, surfaceView: false, ...patch, sig: String(++signature) } });
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
      const details = await page.evaluate(() => {
        qaScene.updateMatrixWorld(true); const features = {}, solidMeshes = [];
        qaScene.traverse(object => {
          const feature = object.userData.feature; if (feature) (features[feature] || (features[feature] = [])).push(object);
          if (object.isMesh && !object.isSprite && object.visible && (Array.isArray(object.material) ? object.material.every(material => !material.transparent) : !object.material.transparent)) solidMeshes.push(object);
        });
        const craters = (features['volcanic-arc-crater'] || []).map(crater => {
          const point = crater.getWorldPosition(new THREE.Vector3()), ray = new THREE.Raycaster(new THREE.Vector3(point.x, 100, point.z), new THREE.Vector3(0, -1, 0));
          return { x: point.x, y: point.y, z: point.z, clearFromAbove: ray.intersectObjects(solidMeshes, false)[0]?.object === crater };
        });
        const ridge = features['new-solid-crust']?.[0], oldTops = [];
        qaScene.traverse(object => { if (object.isMesh && Array.isArray(object.material) && object !== ridge) oldTops.push(object.material[2].map); });
        return { craters, ridge: ridge ? { width: ridge.geometry.parameters.width, distinctSurface: oldTops.every(texture => texture !== ridge.material[2].map), opaque: !ridge.material[2].transparent, seams: (features['new-solid-crust-edge'] || []).length, fissureWidth: features['ridge-fissure'][0].geometry.parameters.width } : null, debug: __alloTectGL.debug(), renders: qaRenders };
      });
      assert.equal(details.debug.contextLost, false);
      if (patch.mode === 'divergent') {
        assert.equal(details.ridge.distinctSurface, true); assert.equal(details.ridge.opaque, true); assert.equal(details.ridge.width, 16); assert.equal(details.ridge.seams, 2); assert.equal(details.ridge.fissureWidth, 1.1);
      } else { assert.equal(details.craters.length, 3); assert.ok(details.craters.every(crater => crater.clearFromAbove && Math.abs(crater.x - 10) < 1e-8)); }
      await settle(); assert.equal(await page.evaluate(() => qaRenders), details.renders, 'Idle model does not repaint.');
      await page.locator('#model').screenshot({ path: path.join(out, name + '.png') }); report.captures.push(name + '.png');
      report.checks.push({ name, passed: true, details }); console.log('PASS', name);
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
