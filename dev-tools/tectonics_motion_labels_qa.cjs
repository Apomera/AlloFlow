'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve(process.env.PT_QA_OUT || 'scratch/tectonics-motion-labels-review');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], checks: [], errors: [], passed: false };
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0"><canvas id="model" aria-label="Plate motions and boundary features" style="margin:12px;display:block;width:calc(100vw - 24px);height:340px"></canvas></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) { const renderer = new Renderer(options), render = renderer.render; renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); }; return renderer; };
    });
    await page.addScriptTag({ content: source });
    let signature = 0;
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overlaps = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.1;
    for (const width of [1100, 390]) for (const dark of [false, true]) for (const mode of ['convergent', 'divergent', 'transform']) for (const [rotX, rotY] of [[-67, 2], [-67, 82], [-7, -78], [-37, 42]]) {
      const name = `${dark ? 'dark' : 'light'}-${width}-${mode}-x${rotX}-y${rotY}`;
      await page.setViewportSize({ width, height: 364 });
      await page.evaluate(({ model, dark }) => { document.body.style.background = dark ? '#0f172a' : '#f8fafc'; __alloTectGL.submit(model); __alloTectGL.mount(document.getElementById('model')); },
        { dark, model: { mode, mountainHeight: 7000, rift: 180, offset: 192, quakes: [], rotX, rotY, scale: 1, cut: 0, showScale: true, surfaceView: false, sig: String(++signature) } });
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
      const details = await page.evaluate(() => {
        qaScene.updateMatrixWorld(true); const canvas = document.getElementById('model'), arrows = [];
        qaScene.traverse(object => {
          if (object.userData.feature !== 'plate-motion') return;
          const points = [];
          object.traverse(part => {
            const positions = part.geometry?.attributes.position;
            if (positions) for (let i = 0; i < positions.count; i++) {
              const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld).project(qaCamera);
              points.push({ x: (point.x + 1) * canvas.clientWidth / 2, y: (1 - point.y) * canvas.clientHeight / 2 });
            }
          });
          const xs = points.map(point => point.x), ys = points.map(point => point.y);
          arrows.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
        });
        return { arrows, debug: __alloTectGL.debug(), renders: qaRenders, width: canvas.clientWidth, height: canvas.clientHeight };
      });
      assert.equal(details.debug.contextLost, false); assert.equal(details.arrows.length, 2);
      const labels = details.debug.labelRects, features = labels.filter(label => !['surface', '70 km', '300 km', '700 km'].includes(label.text));
      for (const label of features) for (const arrow of details.arrows) assert.equal(overlaps(label, arrow), false, name + ': ' + label.text + ' covers a motion arrow');
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.width <= details.width && label.y + label.height <= details.height, name + ': bounded ' + label.text);
        for (let j = i + 1; j < labels.length; j++) assert.equal(overlaps(label, labels[j]), false, name + ': overlapping labels');
      }
      await settle(); assert.equal(await page.evaluate(() => qaRenders), details.renders, 'Idle model does not repaint.');
      if (rotX === -67 && rotY === 2) { await page.locator('#model').screenshot({ path: path.join(out, name + '.png') }); report.captures.push(name + '.png'); }
      report.checks.push({ name, passed: true, details }); console.log('PASS', name);
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
