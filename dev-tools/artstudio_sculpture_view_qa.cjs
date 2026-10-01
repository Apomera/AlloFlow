const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8'), out = path.resolve('reports/artstudio-workspace');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__edit=pair[1];window.__state=pair[0];var saved=React.useState([]);window.__saved=saved[0];var ctx = { React: React')
  .replace('setToolSnapshots: function(){}', 'setToolSnapshots: saved[1]').replace('toolSnapshots: []', 'toolSnapshots: saved[0]');
const model = { name: 'Balance in orbit', parts: [
  { shape: 'cylinder', size: [0.8, 0.18, 0.8], position: [0, 0.09, 0], color: '#334155' },
  { shape: 'cone', size: [0.48, 1.4, 0.48], position: [0, 0.9, 0], color: '#f59e0b', finish: 'matte' },
  { shape: 'sphere', size: [0.44, 0.44, 0.44], position: [0, 1.85, 0], color: '#ec4899', finish: 'gloss' },
  { shape: 'torus', size: [0.83, 0.085, 0.83], position: [0, 1.5, 0], rotation: [65, 0, 20], color: '#38bdf8', finish: 'metal' },
  { shape: 'sphere', size: [0.17, 0.17, 0.17], position: [0.84, 1.62, 0], color: '#a3e635' },
  { shape: 'sphere', size: [0.14, 0.14, 0.14], position: [-0.68, 1.17, 0.25], color: '#c084fc' }
] };
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const canvas = () => page.locator('#sculptCanvas'), click = name => page.getByRole('button', { name, exact: true }).click();
  const camera = () => canvas().evaluate(node => { const s = node._p3d; return { yaw: s.yaw, pitch: s.pitch, distance: s.distance, target: s.target, auto: s.auto }; });
  const step = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  async function fitted() {
    const result = await canvas().evaluate(node => {
      const s = node._p3d, box = new THREE.Box3().setFromObject(s.obj), points = [];
      s.renderNow(); s.cam.updateMatrixWorld();
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).project(s.cam); points.push([p.x, p.y, p.z]);
      }
      return points.every(p => p.every(value => Math.abs(value) < 1));
    }); assert(result, 'Every model corner is inside the camera frustum');
  }
  try {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'prim3d_module.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    await page.evaluate(recipe => __mount('artStudio', false, { tab: 'sculpt3d', studioStarted: true, studioHome: false, studioFreeProjectId: 'sculpt-view-qa', studioCurrentProjectRunId: 'sculpt-view-qa', sculptAuto: false, sculptRecipe: recipe }), model);
    await canvas().waitFor(); await click('Focus workspace'); await step();
    const desktop = await canvas().boundingBox(); assert(desktop.width >= 700); assert(Math.abs(desktop.width / desktop.height - 4 / 3) < 0.02); await fitted();
    checks.push({ desktopPreview: desktop });
    await canvas().scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'sculpt-view-desktop.png') });
    for (const view of ['Front', 'Back', 'Left side', 'Right side', 'Top', 'Perspective']) { await click(view); await fitted(); }
    const start = await camera(); await click('Zoom in sculpture view'); assert((await camera()).distance < start.distance);
    await canvas().focus(); await page.keyboard.press('-'); assert(Math.abs((await camera()).distance - start.distance) < 1e-8);
    await page.keyboard.press('f'); await fitted();
    const box = await canvas().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 25, { steps: 5 }); await page.mouse.up();
    const dragged = await camera(); assert(Math.abs(dragged.yaw - start.yaw) > 0.3); assert.equal(dragged.auto, false);
    const persisted = await page.evaluate(() => __state.artStudio.sculptView); assert.equal(persisted.yaw, dragged.yaw);
    await page.evaluate(() => __edit(old => ({ ...old, artStudio: { ...old.artStudio, tab: 'colorWheel' } })));
    await page.locator('#sculptCanvas').waitFor({ state: 'detached' });
    await page.evaluate(() => __edit(old => ({ ...old, artStudio: { ...old.artStudio, tab: 'sculpt3d' } })));
    await canvas().waitFor(); assert.deepEqual(await camera(), dragged); checks.push('Six camera angles fit; zoom, orbit, and saved navigation view verified');
    await click('Perspective');
    const idle = await canvas().evaluate(async node => {
      const s = node._p3d, render = s.ren.render.bind(s.ren); let count = 0;
      s.ren.render = (...args) => { count++; return render(...args); };
      await new Promise(resolve => { let frames = 0; function check() { if (++frames === 8) resolve(); else requestAnimationFrame(check); } requestAnimationFrame(check); });
      s.ren.render = render; return count;
    }); assert.equal(idle, 0); checks.push('Paused preview performs no repeated WebGL draws');
    await click('Floor grid'); assert.equal(await canvas().evaluate(node => node._p3d.grid.visible), false);
    const sizeBefore = await canvas().evaluate(node => [node.width, node.height]);
    const downloadPromise = page.waitForEvent('download'); await click('Save sculpture picture as PNG'); const download = await downloadPromise;
    await download.saveAs(path.join(out, 'sculpt-view-export.png'));
    const bytes = fs.readFileSync(path.join(out, 'sculpt-view-export.png')); assert.equal(bytes.readUInt32BE(16), 1600); assert.equal(bytes.readUInt32BE(20), 1200);
    assert.deepEqual(await canvas().evaluate(node => [node.width, node.height]), sizeBefore);
    const capture = await canvas().evaluate(node => {
      const picture = node._sculptExportCanvas(1600), pixels = picture.getContext('2d').getImageData(0, 0, picture.width, picture.height).data; let painted = 0;
      for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 90) painted++;
      return { width: picture.width, height: picture.height, painted };
    }); assert(capture.painted > 20000); checks.push({ png: capture });
    await page.evaluate(() => document.querySelector('[aria-label="Save current study"]').click());
    await page.waitForFunction(() => __saved.length > 0);
    const study = await page.evaluate(() => __saved[0]); assert(study.data.sculptView); assert.equal(study.data.sculptGrid, false); assert(/^data:image\/(webp|png)/.test(study.artStudioStudy.previewSrc));
    const thumbnailPixels = await page.evaluate(async () => {
      const image = new Image(); image.src = __saved[0].artStudioStudy.previewSrc; await image.decode();
      const picture = document.createElement('canvas'); picture.width = image.width; picture.height = image.height;
      const ctx = picture.getContext('2d'); ctx.drawImage(image, 0, 0); const data = ctx.getImageData(0, 0, image.width, image.height).data;
      let painted = 0; for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) > 90) painted++;
      return painted;
    }); assert(thumbnailPixels > 300);
    checks.push('Study includes camera, grid preference, and rendered thumbnail');
    await page.setViewportSize({ width: 390, height: 844 }); await step(); await canvas().evaluate(node => node.scrollIntoView({ block: 'start' }));
    const phone = await canvas().boundingBox(); assert(phone.width > 300 && phone.width <= 390);
    const phoneLayout = await page.evaluate(() => {
      const workspace = document.querySelector('[data-sculpt-workspace]'), controls = [...workspace.querySelectorAll('button,input,select')].filter(n => !n.disabled && n.getBoundingClientRect().height > 0 && !n.classList.contains('sr-only'));
      return { overflow: document.documentElement.scrollWidth > innerWidth, short: controls.filter(n => n.getBoundingClientRect().height < 43).map(n => n.getAttribute('aria-label') || n.textContent) };
    }); assert.equal(phoneLayout.overflow, false); assert.deepEqual(phoneLayout.short, []); await fitted();
    await page.screenshot({ path: path.join(out, 'sculpt-view-phone.png') }); await page.locator('[data-sculpt-controls]').evaluate(node => node.scrollIntoView({ block: 'start' })); await page.screenshot({ path: path.join(out, 'sculpt-view-phone-controls.png') });
    checks.push({ phonePreview: phone, phoneLayout });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'sculpt-view-browser-results.json'), JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks, errors }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'sculpt-view-browser-results.json'), JSON.stringify({ passed: false, checks, errors, failure: String(error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'sculpt-view-failure.png') }); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
