'use strict';
// Real-WebGL interaction and visual QA. Starts an isolated local fixture by default.
// node dev-tools/coralreef_simulation_qa.cjs
// Or use an existing preview: --url http://127.0.0.1:8766/
// Optional: --out reports/coralreef-simulation-2026-10-26
// Optional: --quality low (uses the visible Smoother detail selector)
// Optional: --trail-only (camera/trail and responsive checks, skips swim/survey regression)
// Optional: --capture-only (download checks using the production drawing-buffer policy)
// Optional: --diversity-only (catalog population, observation controls, and species rendering)
// Optional: --lens-only (optical magnification, normal-buffer exports, and responsive controls)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
let BASE = arg('--url', null);
const QUALITY = arg('--quality', 'auto');
const TRAIL_ONLY = process.argv.includes('--trail-only');
const CAPTURE_ONLY = process.argv.includes('--capture-only');
const DIVERSITY_ONLY = process.argv.includes('--diversity-only');
const LENS_ONLY = process.argv.includes('--lens-only');
const OUT = path.resolve(ROOT, arg('--out', 'reports/coralreef-simulation-2026-10-26'));
fs.mkdirSync(OUT, { recursive: true });
const report = { url: BASE, requestedExploreQuality: QUALITY, mode: LENS_ONLY ? 'observation-lens' : DIVERSITY_ONLY ? 'species-diversity' : CAPTURE_ONLY ? 'reef-image' : TRAIL_ONLY ? 'habitat-trail' : 'complete', created: new Date().toISOString(), checks: [], screenshots: [], errors: [], metrics: {}, sources: {} };
const assert = (ok, name, detail) => { report.checks.push({ name, pass: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : '')); };
let browser, page, server;

function fixtureHTML() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coral Reef Simulation QA</title><style>body{margin:0;background:#e9f0f0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#root{max-width:1440px;margin:0 auto}button,input,select{font:inherit}*{box-sizing:border-box}</style></head><body><main id="root"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.development.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.development.js"></script><script src="/vendor/three-r128/three.min.js"></script>
<script>window.StemLab={_registry:{},isRegistered:function(id){return !!this._registry[id]},registerTool:function(id,cfg){this._registry[id]=cfg},ensureThree:function(){return Promise.resolve(window.THREE)}};window.__RR_TEST_EXPORTS__={};</script><script src="/stem_lab/stem_tool_coralreef.js"></script>
<script>window.__qaAnnouncements=[];function Shell(){const[data,setData]=React.useState({coralReef:{section:new URLSearchParams(location.search).get('section')||'explore'}});window.previewState=data;window.previewSet=setData;return StemLab._registry.coralReef.render({React,toolData:data,setToolData:setData,t:(key,fallback)=>fallback||key,theme:new URLSearchParams(location.search).get('theme')||'light',embedded:true,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,announceToSR:message=>window.__qaAnnouncements.push(message)})}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Shell));</script></body></html>`;
}
async function startFixture() {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fixtureHTML()); return; }
    let filename;
    try { filename = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname)); } catch (_) { res.writeHead(400); res.end(); return; }
    if (!filename.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await fs.promises.readFile(filename), type = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css' }[path.extname(filename)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(data);
    } catch (_) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  BASE = 'http://127.0.0.1:' + server.address().port + '/';
}

// Observe real renderers and controllers; all original scene building, inputs,
// rendering and state transitions still run unchanged.
const rendererProbe = `;(() => {
  window.__qaRenderers = [];
  const RealRenderer = THREE.WebGLRenderer;
  function ObservedRenderer(options) {
    const renderer = new RealRenderer(${CAPTURE_ONLY || LENS_ONLY ? 'options' : 'Object.assign({}, options, { preserveDrawingBuffer: true })'});
    const item = { renderer, canvas: renderer.domElement, frames: 0, disposed: false };
    window.__qaRenderers.push(item);
    const render = renderer.render.bind(renderer), dispose = renderer.dispose.bind(renderer);
    renderer.render = function(scene, camera) { item.scene = scene; item.camera = camera; item.frames++; return render(scene, camera); };
    renderer.dispose = function() { item.disposed = true; return dispose(); };
    return renderer;
  }
  ObservedRenderer.prototype = RealRenderer.prototype;
  Object.setPrototypeOf(ObservedRenderer, RealRenderer);
  THREE.WebGLRenderer = ObservedRenderer;
})();`;
const controllerProbe = (globalName, key) => `;(() => {
  const original = window.${globalName}.mount;
  window.${globalName}.mount = function(canvas, options) {
    const controller = original.call(this, canvas, options);
    window.__qaControllers = window.__qaControllers || {};
    window.__qaControllers.${key} = controller;
    return controller;
  };
})();`;
async function setup(page) {
  page.setDefaultTimeout(30000);
  const fixtures = {}, assets = {};
  for (const name of ['reef_3d_species', 'reef_3d_explore', 'reef_3d_habitat', 'reef_3d_engine']) {
    const asset = 'stem_lab/' + name + '.js', original = fs.readFileSync(path.join(ROOT, asset), 'utf8');
    const probe = name === 'reef_3d_explore' ? controllerProbe('Reef3DExplore', 'explore') : name === 'reef_3d_engine' ? controllerProbe('Reef3D', 'survey') : '';
    const body = original + probe;
    fixtures['/' + asset] = body;
    assets[asset] = { integrity: 'sha384-' + createHash('sha384').update(body).digest('base64'), bytes: Buffer.byteLength(body) };
    report.sources['/' + asset] = createHash('sha256').update(original).digest('hex');
  }
  const manifest = { schemaVersion: 1, releaseId: createHash('sha256').update(JSON.stringify(assets)).digest('hex'), fallbackCommit: null, allowDesktopRemoteFallback: false, assets };
  // Standalone preview fixture supplies the production delivery policy with a
  // fresh manifest for these exact local bytes (including observation hooks).
  // The product's lazy companion loader and browser SRI enforcement still run.
  await page.addInitScript({ content: fs.readFileSync(path.join(ROOT, 'browser_delivery_policy.js'), 'utf8') +
    '\n{const policy=_alloCreateBrowserDeliveryPolicy(' + JSON.stringify(manifest) + ',{baseUrl:' + JSON.stringify(new URL('.', BASE).href) + '});window.__alloConfigureTrustedScript=(element,url)=>policy.configureScript(element,url);}' });
  report.delivery = 'Production policy factory with a fixture manifest for the observed local companion scripts';
  page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push({ type: 'console', message: msg.text() }); });
  page.on('requestfailed', req => { if (!req.failure()?.errorText?.includes('ERR_ABORTED')) report.errors.push({ type: 'network', url: req.url(), message: req.failure()?.errorText }); });
  for (const [pattern, probe] of [
    [/\/vendor\/three-r128\/three\.min\.js(?:\?|$)/, rendererProbe],
    [/\/stem_lab\/reef_3d_explore\.js(?:\?|$)/, controllerProbe('Reef3DExplore', 'explore')],
    [/\/stem_lab\/reef_3d_engine\.js(?:\?|$)/, controllerProbe('Reef3D', 'survey')],
    [/\/stem_lab\/(?:stem_tool_coralreef|reef_3d_habitat|reef_3d_species)\.js(?:\?|$)/, '']
  ]) await page.route(pattern, async route => {
    const response = await route.fetch(), asset = new URL(route.request().url()).pathname;
    if (fixtures[asset]) await route.fulfill({ response, body: fixtures[asset] });
    else { const body = await response.text(); report.sources[asset] = createHash('sha256').update(body).digest('hex'); await route.fulfill({ response, body: body + probe }); }
  });
}
const state = key => page.evaluate(key => window.__qaControllers?.[key]?.getState(), key);
async function metrics() {
  return page.evaluate(() => {
    const item = window.__qaRenderers.find(item => !item.disposed && item.canvas.isConnected);
    if (!item) return null;
    const gl = item.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const controller = window.__qaControllers?.explore || window.__qaControllers?.survey;
    return { quality: controller?.getState()?.quality, version: gl.getParameter(gl.VERSION), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), frames: item.frames,
      canvas: { width: item.canvas.width, height: item.canvas.height, cssWidth: item.canvas.clientWidth, cssHeight: item.canvas.clientHeight },
      drawCalls: item.renderer.info.render.calls, triangles: item.renderer.info.render.triangles, memory: item.renderer.info.memory,
      activeRenderers: window.__qaRenderers.filter(r => !r.disposed && r.canvas.isConnected).length,
      viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
}
async function capture(name, locator) {
  const filename = name + '.png';
  const isCanvas = await locator.evaluate(element => element.tagName === 'CANVAS');
  if (isCanvas) {
    const data = await locator.evaluate(canvas => canvas.toDataURL('image/png'));
    fs.writeFileSync(path.join(OUT, filename), Buffer.from(data.split(',')[1], 'base64'));
  } else {
    // CDP clipping captures the actual composed page without the element
    // screenshot helper resizing the viewport / waiting on a paused render loop.
    await locator.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const clip = await locator.evaluate(element => { const box = element.getBoundingClientRect(); return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, scale: 1 }; });
    const session = await page.context().newCDPSession(page);
    const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip });
    fs.writeFileSync(path.join(OUT, filename), Buffer.from(shot.data, 'base64'));
    await session.detach();
  }
  console.log('CAPTURE ' + name);
  report.screenshots.push({ name, path: path.join(OUT, filename) });
}
async function waitState(key, predicate) {
  await page.waitForFunction(({ key, predicate }) => { const s = window.__qaControllers?.[key]?.getState(); return s && new Function('s', 'return (' + predicate + ')')(s); }, { key, predicate }, { timeout: 180000 });
}
async function cameraState() {
  return page.evaluate(() => {
    const item = window.__qaRenderers.find(item => !item.disposed && item.canvas.isConnected);
    const ring = item.scene.getObjectByName('reef-explore-focus');
    const ndc = ring && ring.position.clone().project(item.camera);
    return { quaternion: item.camera.quaternion.toArray(), position: item.camera.position.toArray(), focus: ndc && ndc.toArray(), fov: item.camera.fov, aspect: item.camera.aspect, frames: item.frames };
  });
}
async function waitFocusedFrame() {
  await page.waitForFunction(() => {
    const item = window.__qaRenderers.find(item => !item.disposed && item.canvas.isConnected);
    const ring = item?.scene?.getObjectByName('reef-explore-focus');
    if (!ring || !ring.visible) return false;
    const ndc = ring.position.clone().project(item.camera);
    return Math.hypot(ndc.x, ndc.y) < .002 && ndc.z > -1 && ndc.z < 1;
  }, null, { timeout: 30000 });
}
const logState = () => page.evaluate(() => JSON.stringify(window.previewState.coralReef.speciesLog || {}));
async function trailTargets(route = 'habitats') {
  return page.evaluate(route => {
    const ctl = window.__qaControllers.explore;
    const choices = {
      habitats: [['staghorn_coral', 'brain_coral', 'boulder_coral'], ['spotted_garden_eel', 'sea_cucumber', 'bluespotted_stingray'], ['sea_fan', 'barrel_sponge', 'foliose_coral']],
      small: [['porcelain_anemone_crab', 'magnificent_anemone'], ['varicose_phyllidia', 'white_spotted_hermit_crab', 'nudibranch'], ['orange_cup_coral', 'christmas_tree_worm', 'cleaner_shrimp']],
      swimmers: [['ocellated_eagle_ray', 'reef_manta'], ['bigfin_reef_squid', 'broadclub_cuttlefish'], ['longfin_bannerfish', 'moorish_idol', 'blue_tang']]
    };
    return choices[route]
      .map(ids => ids.map(id => ctl.findSpecies(id)).find(target => target && target.distanceM >= 0));
  }, route);
}
async function checkTrailStop(trail, id, expected, baseline) {
  await expect(trail.locator('[data-habitat-trail-stop="' + id + '"]')).toBeVisible();
  await page.waitForFunction(uid => window.__qaControllers.explore.getState().focused?.uid === uid, expected.uid);
  await waitFocusedFrame();
  const current = await state('explore');
  assert(current.focused.uid === expected.uid && current.focused.speciesId === expected.speciesId && current.paused && !current.navigation && JSON.stringify(current.diver) === JSON.stringify(baseline.diver), 'Habitat trail locates real ' + id + ' stop while paused', { target: expected, current });
}

async function checkAlternativeTrails(trail) {
  const chooser = trail.getByRole('combobox', { name: 'Choose a trail', exact: true }), baseline = await state('explore'), records = await logState();
  for (const [route, stops] of [['small', ['anemone', 'rubble', 'attached']], ['swimmers', ['glide', 'fins', 'silhouettes']]]) {
    const selected = (await state('explore')).focused, beforeCamera = await cameraState();
    await chooser.focus(); await chooser.selectOption(route);
    await expect(chooser).toBeFocused();
    const nextCamera = await cameraState();
    assert(JSON.stringify((await state('explore')).focused) === JSON.stringify(selected) && JSON.stringify(beforeCamera.quaternion) === JSON.stringify(nextCamera.quaternion), 'Choosing ' + route + ' trail preserves selection and camera');
    const targets = await trailTargets(route);
    assert(targets.every(Boolean), route + ' trail resolves all three real organisms', targets);
    await trail.getByRole('button', { name: 'Start habitat trail', exact: true }).click();
    for (let index = 0; index < stops.length; index++) {
      if (index) await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
      await checkTrailStop(trail, stops[index], targets[index], baseline);
    }
    await capture('desktop-' + route + '-trail', trail);
    const text = await trail.innerText();
    assert(!/porcelain|phyllidia|orange cup|eagle ray|reef squid|bannerfish/i.test(text) && await logState() === records, route + ' trail keeps identification and learning records unchanged');
    await trail.getByRole('button', { name: 'Close trail', exact: true }).click();
  }
  await chooser.selectOption('habitats');
}

async function checkReefDownload(name, activation) {
  const button = page.locator('[data-dive-capture]'), before = await state('explore'), records = await page.evaluate(() => JSON.stringify(window.previewState)), camera = await cameraState();
  // SwiftShader can take a while to redraw a detailed reef before encoding it.
  // Attach both promise handlers immediately so a slow click cannot leave an
  // unhandled download timeout and bypass the browser's cleanup in finally.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    (async () => { if (activation) { await button.focus(); await button.press(activation, { timeout: 180000 }); } else await button.click({ timeout: 180000 }); })()
  ]);
  const filename = path.join(OUT, name + '.png');
  await download.saveAs(filename);
  assert(download.suggestedFilename() === 'coral-reef-view.png' && !(await download.failure()), name + ' downloads a generic PNG');
  const bytes = fs.readFileSync(filename), dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }, currentMetrics = await metrics();
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && dimensions.width === currentMetrics.canvas.width && dimensions.height === currentMetrics.canvas.height, name + ' uses current drawing-buffer dimensions', { bytes: bytes.length, ...dimensions });
  const pixels = await page.evaluate(async encoded => {
    const img = new Image(); img.src = 'data:image/png;base64,' + encoded; await img.decode();
    const sample = document.createElement('canvas'); sample.width = 64; sample.height = 64;
    const ctx = sample.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data, colors = new Set(); let opaque = 0;
    for (let i = 0; i < data.length; i += 4) { if (data[i + 3] > 0) opaque++; colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]); }
    return { colors: colors.size, opaque };
  }, bytes.toString('base64'));
  assert(pixels.colors > 100 && pixels.opaque === 4096, name + ' contains a rendered reef rather than a cleared buffer', pixels);
  const after = await state('explore'), nextCamera = await cameraState();
  for (const key of ['diver', 'focused', 'navigation', 'paused', 'view', 'light', 'vision', 'magnification']) assert(JSON.stringify(before[key]) === JSON.stringify(after[key]), name + ' preserves ' + key);
  assert(JSON.stringify(camera.position) === JSON.stringify(nextCamera.position) && JSON.stringify(camera.quaternion) === JSON.stringify(nextCamera.quaternion) && camera.fov === nextCamera.fov && records === await page.evaluate(() => JSON.stringify(window.previewState)), name + ' preserves camera and learning data');
  await expect(button).toBeFocused(); await expect(page.locator('[data-dive-capture-status]')).toHaveText('PNG download started.');
  assert(await page.locator('a[download]').count() === 0 && currentMetrics.activeRenderers === 1, name + ' cleans up its download link and reuses the renderer');
  report.screenshots.push({ name, path: filename });
}

async function checkReefCapture(stage) {
  const navigation = page.locator('[data-dive-navigation]');
  const attributes = await page.evaluate(() => window.__qaRenderers.find(item => !item.disposed).renderer.getContext().getContextAttributes());
  assert(attributes.preserveDrawingBuffer === false, 'Image export uses the normal non-preserved WebGL buffer', attributes);
  await navigation.getByRole('button', { name: 'Next organism', exact: true }).click();
  await waitState('explore', '!!s.focused');
  await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
  await waitFocusedFrame();
  await checkReefDownload('desktop-reef-image');
  await capture('desktop-image-controls', stage);
  await stage.getByRole('button', { name: 'Mask view', exact: true }).click();
  await waitState('explore', 's.view === "first"');
  await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
  await waitFocusedFrame();
  await checkReefDownload('mask-reef-image', 'Enter');
  await stage.getByRole('button', { name: 'Mask view', exact: true }).click();
  await waitState('explore', 's.view === "third"');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => { const c = document.querySelector('.cr-dive-stage canvas'); return c && c.width === c.clientWidth && c.height === c.clientHeight; });
  await checkReefDownload('mobile-reef-image', 'Space');
  report.metrics.mobile = await metrics();
  assert(report.metrics.mobile.scrollWidth <= 390, 'Mobile image controls fit without horizontal overflow', report.metrics.mobile);
  await capture('mobile-image-controls', stage);
}

async function checkObservationLens(stage) {
  const navigation = page.locator('[data-dive-navigation]'), select = navigation.getByRole('combobox', { name: 'Observation lens', exact: true });
  const trail = page.locator('[data-habitat-trail]'), pause = stage.getByRole('button', { name: 'Pause the reef', exact: true });
  const records = await logState();
  await expect(select).toHaveValue('1');
  const attributes = await page.evaluate(() => window.__qaRenderers.find(item => !item.disposed).renderer.getContext().getContextAttributes());
  assert(attributes.preserveDrawingBuffer === false, 'Lens uses the normal non-preserved WebGL buffer');
  await trail.locator('summary').click();
  await trail.getByRole('combobox', { name: 'Choose a trail', exact: true }).selectOption('small');
  await trail.getByRole('button', { name: 'Start habitat trail', exact: true }).click();
  await waitState('explore', 's.focused && s.focused.speciesId === "porcelain_anemone_crab"');
  const start = await state('explore');
  await pause.click(); await waitState('explore', '!s.paused');
  await navigation.getByRole('button', { name: 'Swim to selected', exact: true }).click();
  await page.waitForFunction(before => {
    const s = window.__qaControllers.explore.getState();
    return !s.navigation && Math.hypot(s.diver.x - before.x, s.diver.y - before.y, s.diver.z - before.z) > .2;
  }, start.diver, { timeout: 180000 });
  await pause.click(); await waitState('explore', 's.paused');
  await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click(); await waitFocusedFrame();
  const before = await state('explore'), base = await cameraState();
  assert(before.focused.uid === start.focused.uid && before.focused.distanceM < start.focused.distanceM && before.magnification === 1, 'Learner can approach the actual tiny animal before using the lens', { before: start.focused, approached: before.focused });
  const obstruction = await page.evaluate(() => {
    const item = window.__qaRenderers.find(item => !item.disposed), target = item.scene.getObjectByName('reef-explore-focus').position;
    const direction = target.clone().sub(item.camera.position), distance = direction.length();
    item.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(item.camera.position, direction.normalize(), .01, distance);
    const solids = ['reef-explore-diver-body', 'reef-explore-diver-equipment'].map(name => item.scene.getObjectByName(name));
    return ray.intersectObjects(solids, true).map(hit => ({ name: hit.object.name, distance: hit.distance }));
  });
  assert(obstruction.length === 0, 'Third-person observation keeps the diver and tank out of the sightline', obstruction);
  // Keyboard interaction with the native select, followed by its ordinary options.
  await select.focus(); await select.press('Home'); await select.press('ArrowDown'); await select.press('Enter');
  await expect(select).toHaveValue('2');
  for (const factor of [2, 4, 8, 1]) {
    if (factor !== 2) await select.selectOption(String(factor));
    await waitState('explore', 's.magnification === ' + factor);
    const current = await state('explore'), camera = await cameraState(), ratio = Math.tan(base.fov * Math.PI / 360) / Math.tan(camera.fov * Math.PI / 360);
    assert(Math.abs(ratio - factor) < 1e-8 && JSON.stringify(camera.position) === JSON.stringify(base.position) && JSON.stringify(camera.quaternion) === JSON.stringify(base.quaternion), factor + 'x lens changes projection without moving or turning the camera', { ratio, fov: camera.fov });
    assert(current.paused && !current.navigation && current.focused.uid === before.focused.uid && JSON.stringify(current.diver) === JSON.stringify(before.diver) && await logState() === records, factor + 'x lens preserves the paused dive and learning records');
  }
  await checkReefDownload('desktop-wide-view');
  await select.selectOption('8'); await waitState('explore', 's.magnification === 8');
  await checkReefDownload('desktop-8x-lens');
  await capture('desktop-lens-controls', navigation);
  const cameraControls = page.locator('[data-dive-camera-controls]'); await cameraControls.locator('summary').click();
  await cameraControls.getByRole('button', { name: 'Look left', exact: true }).click();
  await expect(select).toHaveValue('1');
  assert((await state('explore')).paused, 'Manual looking restores wide view without resuming the reef');
  await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
  await select.selectOption('4');
  await stage.getByRole('button', { name: 'Mask view', exact: true }).click();
  await waitState('explore', 's.view === "first" && s.magnification === 1');
  await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click(); await waitFocusedFrame();
  const mask = await cameraState();
  await select.selectOption('4'); await waitState('explore', 's.magnification === 4');
  const maskZoom = await cameraState();
  assert(Math.abs(Math.tan(mask.fov * Math.PI / 360) / Math.tan(maskZoom.fov * Math.PI / 360) - 4) < 1e-8, 'Mask view uses its own base lens at 4x');
  await checkReefDownload('mask-4x-lens');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => { const c = document.querySelector('.cr-dive-stage canvas'); return c && Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) < .02; });
  await expect(select).toHaveValue('4');
  const mobileLens = await cameraState();
  await select.selectOption('1'); const mobileBase = await cameraState();
  assert(Math.abs(Math.tan(mobileBase.fov * Math.PI / 360) / Math.tan(mobileLens.fov * Math.PI / 360) - 4) < 1e-8, 'Portrait resize retains magnification relative to the mask lens');
  await select.selectOption('8'); await checkReefDownload('mobile-8x-lens');
  await capture('mobile-lens-controls', navigation);
  report.metrics.mobile = await metrics();
  assert(report.metrics.mobile.scrollWidth <= 390 && report.metrics.mobile.activeRenderers === 1, 'Observation lens fits mobile and reuses one renderer', report.metrics.mobile);
  await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
  await expect(select).toHaveValue('1');
  assert((await state('explore')).focused.uid !== before.focused.uid && await logState() === records, 'Selecting another trail organism restores wide view without discovery credit');
}

async function checkReefDiversity(stage, canvas) {
  const ids = ['porcelain_anemone_crab', 'varicose_phyllidia', 'broadclub_cuttlefish', 'blackspotted_puffer', 'ocellated_eagle_ray', 'textile_cone', 'orange_cup_coral', 'banded_sea_krait', 'white_spotted_hermit_crab', 'longfin_bannerfish', 'bigfin_reef_squid'];
  const census = await page.evaluate(ids => {
    const scene = window.__qaRenderers.find(item => !item.disposed).scene, byId = {}, placeholders = [], badGeometry = [];
    scene.getObjectByName('reef-explore-organisms').traverse(object => {
      const data = object.userData, id = data.speciesId;
      if (/placeholder/.test(object.name)) placeholders.push(object.name);
      if (id && data.exploreUid) (byId[id] ||= new Set()).add(data.exploreUid);
      if (id && data.exploreUids) for (const uid of data.exploreUids) (byId[id] ||= new Set()).add(uid);
      if (object.isMesh && ids.includes(id)) {
        const positions = object.geometry?.attributes?.position?.array;
        if (!positions || !positions.every(Number.isFinite)) badGeometry.push(id + ':' + object.name);
      }
    });
    return { counts: Object.fromEntries(Object.entries(byId).map(([id, values]) => [id, values.size])), placeholders, badGeometry,
      targets: Object.fromEntries(ids.map(id => [id, window.__qaControllers.explore.findSpecies(id)])) };
  }, ids);
  assert(Object.keys(census.counts).length === 74 && Object.values(census.counts).reduce((sum, n) => sum + n, 0) === 237, 'Healthy reef contains 74 living species and 237 organism groups', census.counts);
  assert(census.placeholders.length === 0 && census.badGeometry.length === 0 && ids.every(id => census.targets[id]), 'All eleven added species use real finite models and are locatable', census);
  await capture('diverse-reef-start', canvas);
  const before = await state('explore'), log = await logState();
  for (const id of ids) {
    // Fixture setup chooses an observation card; the learner's actual Locate
    // and Aim controls then operate on the existing, unchanged reef.
    await page.evaluate(id => window.previewSet(old => ({ ...old, coralReef: { ...old.coralReef, diveStudySpeciesId: id } })), id);
    const card = page.locator('[data-marine-observation="' + id + '"]');
    await card.locator('[data-observation-locate]').click();
    await waitState('explore', 's.focused && s.focused.speciesId === ' + JSON.stringify(id));
    await page.locator('[data-dive-navigation]').getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
    await waitFocusedFrame();
    const current = await state('explore');
    assert(current.paused && !current.navigation && JSON.stringify(current.diver) === JSON.stringify(before.diver) && await logState() === log, id + ' can be located and observed without moving or awarding discovery');
  }
  // Diagnostic close views use the real scene and existing renderer. Temporarily
  // frame the model at its actual habitat position, then restore every camera and
  // visibility value. These images are visual QA, not a learner teleport feature.
  // Tiny host-associated animals need their host's normal culling/approach
  // context; a detached diagnostic camera is not a useful portrait of them.
  for (const id of ['ocellated_eagle_ray', 'bigfin_reef_squid', 'blackspotted_puffer']) {
    const png = await page.evaluate(id => {
      const item = window.__qaRenderers.find(item => !item.disposed), ctl = window.__qaControllers.explore, target = ctl.findSpecies(id);
      let root; item.scene.getObjectByName('reef-explore-organisms').traverse(o => { if (o.userData.exploreUid === target.uid) root = o; });
      if (!root) return null; // Instanced colonies use the regular full-reef image.
      const camera = item.camera, position = camera.position.clone(), quaternion = camera.quaternion.clone(), fov = camera.fov;
      const box = new THREE.Box3().setFromObject(root), centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z, .04), visible = root.visible, ring = item.scene.getObjectByName('reef-explore-focus'), ringVisible = ring.visible;
      try {
        root.visible = true; ring.visible = false; camera.fov = 45;
        camera.position.copy(centre).add(new THREE.Vector3(.38, .32, 1).normalize().multiplyScalar(extent * 1.7));
        camera.lookAt(centre); camera.updateProjectionMatrix(); item.renderer.render(item.scene, camera);
        return item.canvas.toDataURL('image/png');
      } finally {
        root.visible = visible; ring.visible = ringVisible; camera.position.copy(position); camera.quaternion.copy(quaternion); camera.fov = fov; camera.updateProjectionMatrix(); item.renderer.render(item.scene, camera);
      }
    }, id);
    if (png) { const filename = path.join(OUT, 'habitat-' + id + '.png'); fs.writeFileSync(filename, Buffer.from(png.split(',')[1], 'base64')); report.screenshots.push({ name: 'habitat-' + id, path: filename }); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => { const c = document.querySelector('.cr-dive-stage canvas'); return c && Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) < .02; });
  report.metrics.mobile = await metrics();
  assert(report.metrics.mobile.scrollWidth <= 390 && report.metrics.mobile.activeRenderers === 1, 'Diverse reef and observation controls fit mobile with one renderer', report.metrics.mobile);
  await capture('mobile-diverse-reef', stage);
}

(async () => {
  try {
    if (!BASE) await startFixture();
    report.url = BASE;
    // Keep transient downloads inside the writable QA workspace on Windows.
    const downloadsPath = path.join(OUT, 'downloads'); fs.mkdirSync(downloadsPath, { recursive: true });
    browser = await chromium.launch({ headless: true, downloadsPath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, reducedMotion: 'reduce', acceptDownloads: true });
    await setup(page);
    await page.goto(new URL('?section=explore', BASE).href, { waitUntil: 'load' });
    await page.locator('label').filter({ hasText: 'Dive detail' }).locator('select').selectOption(QUALITY);
    await page.getByRole('button', { name: 'Start the dive', exact: true }).click();
    await waitState('explore', 's.ready');
    await page.locator('[data-dive-navigation]').waitFor();
    report.metrics.desktop = await metrics();
    assert(report.metrics.desktop.activeRenderers === 1 && report.metrics.desktop.triangles > 1000, 'Real WebGL reef rendered', report.metrics.desktop);
    const stage = page.locator('.cr-dive-stage'), canvas = stage.locator('canvas');
    const pause = stage.getByRole('button', { name: 'Pause the reef', exact: true });
    if (!(await state('explore')).paused) { await pause.click(); await waitState('explore', 's.paused'); }
    if (LENS_ONLY) {
      await checkObservationLens(stage);
      assert(report.errors.length === 0, 'No browser, shader, or network errors', report.errors);
      report.pass = true; return;
    }
    if (DIVERSITY_ONLY) {
      await checkReefDiversity(stage, canvas);
      assert(report.errors.length === 0, 'No browser, shader, or network errors', report.errors);
      report.pass = true; return;
    }
    if (CAPTURE_ONLY) {
      await checkReefCapture(stage);
      assert(report.errors.length === 0, 'No browser, shader, or network errors', report.errors);
      report.pass = true; return;
    }
    const navigation = page.locator('[data-dive-navigation]');
    await navigation.getByRole('button', { name: 'Next organism', exact: true }).click();
    await waitState('explore', '!!s.focused');
    const first = (await state('explore')).focused.uid;
    assert(await navigation.getByRole('button', { name: 'Swim to selected', exact: true }).isDisabled(), 'Pause disables automatic swimming');
    await navigation.getByRole('button', { name: 'Next organism', exact: true }).click();
    await page.waitForFunction(uid => window.__qaControllers.explore.getState().focused?.uid !== uid, first);
    await navigation.getByRole('button', { name: 'Previous organism', exact: true }).click();
    await page.waitForFunction(uid => window.__qaControllers.explore.getState().focused?.uid === uid, first);
    assert((await state('explore')).focused.uid === first, 'Navigator previous/next selection works');
    await navigation.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await waitState('explore', '!s.focused');
    await expect(navigation.getByRole('button', { name: 'Clear selection', exact: true })).toBeDisabled();
    assert(await navigation.getByRole('button', { name: 'Clear selection', exact: true }).isDisabled(), 'Clear selection clears focus');
    await navigation.getByRole('button', { name: 'Next organism', exact: true }).click();
    await waitState('explore', '!!s.focused');
    const beforeAim = await state('explore'), cameraBeforeAim = await cameraState(), logBeforeTrail = await logState();
    await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
    await waitFocusedFrame();
    const afterAim = await state('explore'), cameraAfterAim = await cameraState();
    assert(JSON.stringify(beforeAim.diver) === JSON.stringify(afterAim.diver) && afterAim.paused && !afterAim.navigation && cameraAfterAim.quaternion.some((value, index) => Math.abs(value - cameraBeforeAim.quaternion[index]) > 1e-7), 'Aim camera frames selection without moving or resuming diver', { before: cameraBeforeAim, after: cameraAfterAim });
    const trail = page.locator('[data-habitat-trail]');
    assert(await trail.getAttribute('open') === null, 'Habitat trail starts collapsed');
    await trail.locator('summary').click();
    const targets = await trailTargets(), trailBaseline = await state('explore');
    assert(targets.every(Boolean), 'All three habitat stops resolve to organisms in this reef', targets);
    await page.evaluate(() => { if (window.__qaAnnouncements) window.__qaAnnouncements.length = 0; });
    await trail.getByRole('button', { name: 'Start habitat trail', exact: true }).click();
    await checkTrailStop(trail, 'garden', targets[0], trailBaseline);
    if (await page.evaluate(() => Array.isArray(window.__qaAnnouncements))) {
      const gardenState = await state('explore');
      if (!gardenState.nearby.some(n => n.uid === targets[0].uid)) {
        await page.waitForFunction(() => window.__qaAnnouncements.some(message => /^Selected organism, \d+ meters away/.test(message)));
        const announcements = await page.evaluate(() => window.__qaAnnouncements);
        assert(announcements.some(message => /^Selected organism, \d+ meters away/.test(message)) && !announcements.some(message => /^Organism \d+/.test(message)), 'Distant habitat target announces neutral selection without a false nearby ordinal', announcements);
      }
    }
    await capture('desktop-habitat-trail', trail);
    await capture('desktop-habitat-trail-stage', stage);
    await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
    await checkTrailStop(trail, 'sand', targets[1], trailBaseline);
    await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
    await checkTrailStop(trail, 'slope', targets[2], trailBaseline);
    const trailText = await trail.innerText();
    assert(!/staghorn|brain coral|boulder coral|garden eel|sea cucumber|stingray|sea fan|barrel sponge|foliose/i.test(trailText) && await logState() === logBeforeTrail, 'Habitat trail keeps species identification and species log unchanged', { text: trailText, speciesLog: await logState() });
    const selectedBeforeClose = (await state('explore')).focused.uid;
    await trail.getByRole('button', { name: 'Close trail', exact: true }).click();
    await expect(trail.getByRole('button', { name: 'Start habitat trail', exact: true })).toBeFocused();
    assert((await state('explore')).focused.uid === selectedBeforeClose, 'Closing habitat trail preserves selection and restores keyboard focus');
    await checkAlternativeTrails(trail);
    await capture('desktop-dive-canvas', canvas);
    await capture('desktop-dive-stage', stage);
    if (!TRAIL_ONLY) {
    await canvas.evaluate(canvas => { window.__qaOriginalCanvas = canvas; });
    const originalSize = await canvas.boundingBox();
    await stage.locator('[data-dive-expand]').click();
    await page.waitForFunction(height => document.querySelector('.cr-dive-stage canvas')?.clientHeight > height + 40, originalSize.height);
    assert(await canvas.evaluate(c => c === window.__qaOriginalCanvas), 'Expand reuses the same canvas');
    await page.waitForFunction(height => document.querySelector('.cr-dive-stage canvas').height > height, report.metrics.desktop.canvas.height);
    report.metrics.expanded = await metrics();
    assert(report.metrics.expanded.canvas.cssHeight > originalSize.height + 40 && report.metrics.expanded.canvas.height > report.metrics.desktop.canvas.height, 'Expanded WebGL drawing buffer resizes', report.metrics.expanded.canvas);
    await stage.locator('[data-dive-expand]').click();
    await page.waitForFunction(height => Math.abs(document.querySelector('.cr-dive-stage canvas').clientHeight - height) < 2, originalSize.height);
    await stage.getByRole('button', { name: 'Mask view', exact: true }).click();
    await waitState('explore', 's.view === "first"');
    assert(await stage.getByRole('button', { name: 'Mask view', exact: true }).getAttribute('aria-pressed') === 'true', 'Mask mode toggles on');
    const maskBeforeAim = await state('explore');
    await navigation.getByRole('button', { name: 'Aim camera at selection', exact: true }).click();
    await waitFocusedFrame();
    const maskAfterAim = await state('explore');
    assert(maskAfterAim.view === 'first' && maskAfterAim.paused && !maskAfterAim.navigation && JSON.stringify(maskBeforeAim.diver) === JSON.stringify(maskAfterAim.diver), 'Mask camera aims while diver stays paused', await cameraState());
    await capture('desktop-mask-canvas', canvas);
    await stage.getByRole('button', { name: 'Mask view', exact: true }).click();
    await waitState('explore', 's.view === "third"');

    // The preview reads the media preference on render. Re-render its existing
    // state after changing the preference, then drive the visible resume button.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => window.previewSet(old => ({ ...old })));
    await page.waitForTimeout(200);
    await pause.click();
    await waitState('explore', '!s.paused');
    const beforeSwim = await state('explore');
    await navigation.getByRole('button', { name: 'Swim to selected', exact: true }).click();
    await page.waitForFunction(before => { const s = window.__qaControllers.explore.getState(); return Math.hypot(s.diver.x-before.x, s.diver.y-before.y, s.diver.z-before.z) > 0.05; }, beforeSwim.diver, { timeout: 30000 });
    const stopSwim = navigation.getByRole('button', { name: 'Stop swimming', exact: true });
    await stopSwim.click();
    await page.waitForFunction(() => !window.__qaControllers.explore.getState().navigation);
    await expect(stopSwim).toBeDisabled();
    assert(await stopSwim.isDisabled(), 'Stop swimming cancels automatic travel');
    await pause.click(); await waitState('explore', 's.paused');
    const stopped = await state('explore');
    await page.waitForTimeout(700);
    const held = await state('explore');
    assert(JSON.stringify(stopped.diver) === JSON.stringify(held.diver), 'Pause holds diver after automatic swim');
    assert(held.frames > beforeSwim.frames, 'Live simulation advanced before pausing', { before: beforeSwim.frames, after: held.frames });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => { const c = document.querySelector('.cr-dive-stage canvas'); return c && Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) < 0.02; });
    await trail.getByRole('button', { name: 'Start habitat trail', exact: true }).click();
    await expect(trail.locator('[data-habitat-trail-stop="garden"]')).toBeVisible();
    await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
    await expect(trail.locator('[data-habitat-trail-stop="sand"]')).toBeVisible();
    await trail.getByRole('button', { name: 'Next stop', exact: true }).click();
    await expect(trail.locator('[data-habitat-trail-stop="slope"]')).toBeVisible();
    await waitFocusedFrame();
    await capture('mobile-habitat-trail', trail);
    const mobileLayout = await page.evaluate(() => {
      const nav = document.querySelector('[data-dive-navigation]').getBoundingClientRect(), trail = document.querySelector('[data-habitat-trail]').getBoundingClientRect();
      return { navigationBottom: nav.bottom, trailTop: trail.top, trailWidth: trail.width };
    });
    assert(mobileLayout.trailTop >= mobileLayout.navigationBottom && mobileLayout.trailWidth <= 390 && await logState() === logBeforeTrail, 'Mobile habitat controls remain unobstructed without species-log credit', mobileLayout);
    await trail.getByRole('combobox', { name: 'Choose a trail', exact: true }).selectOption('swimmers');
    await trail.getByRole('button', { name: 'Start habitat trail', exact: true }).click();
    await expect(trail.locator('[data-habitat-trail-stop="glide"]')).toBeVisible();
    await capture('mobile-swimmers-trail', trail);
    assert((await state('explore')).focused.speciesId === 'ocellated_eagle_ray' && await logState() === logBeforeTrail, 'Mobile trail selector locates the eagle ray without discovery credit');
    report.metrics.mobile = await metrics();
    assert(report.metrics.mobile.scrollWidth <= 390, 'Mobile has no horizontal overflow', report.metrics.mobile);
    await capture('mobile-dive-navigator', navigation);
    await capture('mobile-dive-stage', stage);
    if (!TRAIL_ONLY) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(new URL('?section=survey', BASE).href, { waitUntil: 'load' });
    const toggle = page.getByRole('button', { name: 'Dive view (3D)', exact: true });
    await toggle.click();
    await waitState('survey', 's.ready');
    const survey = page.locator('[data-survey-dive]');
    const surveyPause = survey.locator('[data-survey-pause]');
    if (!(await state('survey')).paused) { await surveyPause.click(); await waitState('survey', 's.paused'); }
    await survey.getByRole('button', { name: 'Whole transect', exact: true }).click();
    await waitState('survey', 's.cameraMode === "overview"');
    assert(await survey.getByRole('button', { name: 'Whole transect', exact: true }).getAttribute('aria-pressed') === 'true', 'Survey whole-transect viewpoint selected');
    report.metrics.survey = await metrics();
    await capture('survey-whole-transect', survey);
    await survey.getByRole('button', { name: 'Diver view', exact: true }).click();
    await waitState('survey', 's.cameraMode === "diver"');
    assert(await survey.getByRole('button', { name: 'Diver view', exact: true }).getAttribute('aria-pressed') === 'true', 'Survey diver viewpoint restored');
    }
    assert(report.errors.length === 0, 'No browser, shader, or network errors', report.errors);
    report.pass = true;
  } catch (error) {
    report.pass = false; report.failure = error.stack || String(error);
    if (page) {
      report.lastPageText = await page.locator('body').innerText().catch(() => '');
      await page.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: false, timeout: 10000 }).catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    console.log(JSON.stringify({ pass: report.pass, checks: report.checks.length, errors: report.errors.length, report: path.join(OUT, 'report.json'), failure: report.failure }, null, 2));
  }
})();
