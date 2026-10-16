#!/usr/bin/env node
'use strict';

// Real bloom integration checks against an existing working-tree preview.
// Start space_station_enhancement_qa.cjs --serve --port=4179 separately, then:
//   node dev-tools/space_station_map_bloom_qa.cjs
// Addons are fetched from the production r128 CDN once; a download failure fails
// this check explicitly. No application source or preview server is modified.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, request } = require('playwright');
const arg = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(__dirname, '..', arg('--out', 'reports/space-station-enhancement-qa/map-bloom-browser'));
const addonRoot = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
const addons = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js',
  'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
  'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'].map(name => addonRoot + name);

// This is appended to the local Three script before any renderer is constructed.
// Observe real calls and framebuffer pixels without replacing rendering behavior.
function observeRenderer() {
  const Original = window.THREE.WebGLRenderer;
  const qa = window.__issBloomQA = { events: [], screenDraws: 0, pixels: null };
  const probe = document.createElement('canvas'); probe.width = 40; probe.height = 30;
  const context = probe.getContext('2d', { willReadFrequently: true });
  function Observed(options) {
    const renderer = new Original(options);
    window.__issBloomRenderer = renderer;
    qa.addonsAtConstruction = !!(window.THREE.EffectComposer && window.THREE.UnrealBloomPass);
    const render = renderer.render, clear = renderer.clear;
    const target = () => renderer.getRenderTarget()?.texture.uuid || 'screen';
    const record = event => { qa.events.push(event); if (qa.events.length > 500) qa.events.shift(); };
    renderer.clear = function (color, depth, stencil) {
      record({ kind: 'clear', target: target(), color: color !== false, depth: depth !== false, stencil: stencil !== false });
      return clear.apply(this, arguments);
    };
    renderer.render = function (scene, camera) {
      const named = /^iss-(orbital-planet|station-inspection)$/.test(scene.name || '');
      const state = renderer.domElement._issLightingState?.();
      const event = { kind: 'render', scene: scene.name, target: target(), phase: state?.phase,
        eclipse: state?.eclipse, autoClear: renderer.autoClear, completed: false };
      if (named) record(event);
      const restore = [];
      if (scene.name === 'iss-station-inspection') {
        const ghost = scene.getObjectByName('iss-array-command');
        qa.command = { phase: state?.phase, visible: !!ghost?.visible, nodes: [] };
        ghost?.traverse(object => {
          if (!object.isLineSegments && !object.isPoints) return;
          const observed = { kind: object.isPoints ? 'points' : 'lines', drawn: false,
            material: object.material.type, dashed: !!object.material.isLineDashedMaterial,
            color: object.material.color.getHex(), vertices: object.geometry.getAttribute('position')?.count || 0,
            lineDistances: object.geometry.getAttribute('lineDistance')?.count || 0,
            dashSize: object.material.dashSize ?? null, gapSize: object.material.gapSize ?? null };
          qa.command.nodes.push(observed);
          const originalAfter = object.onAfterRender;
          object.onAfterRender = function () { observed.drawn = true; return originalAfter?.apply(this, arguments); };
          restore.push(() => { object.onAfterRender = originalAfter; });
        });
        const future = scene.getObjectByName('iss-array-forecast');
        const futureState = renderer.domElement._issForecastState?.();
        qa.forecast = { phase: state?.phase, active: !!futureState?.active,
          index: futureState?.index ?? null, visible: !!future?.visible, nodes: [] };
        [
          ['outline', future?.children.find(object => object.isLineSegments)],
          ['path', scene.getObjectByName('iss-array-forecast-path')],
          ['tip', scene.getObjectByName('iss-array-forecast-tip')],
          ['fill-0', scene.getObjectByName('iss-array-forecast-fill-0')],
          ['fill-1', scene.getObjectByName('iss-array-forecast-fill-1')]
        ].forEach(([kind, object]) => {
          const observed = { kind, found: !!object, drawn: false, visible: !!object?.visible };
          qa.forecast.nodes.push(observed);
          if (!object) return;
          Object.assign(observed, { type: object.type, material: object.material.type,
            materialVisible: object.material.visible, opacity: object.material.opacity,
            color: object.material.color.getHex(), depthTest: object.material.depthTest,
            depthWrite: object.material.depthWrite, toneMapped: object.material.toneMapped,
            side: object.material.side, transparent: object.material.transparent,
            geometryId: object.geometry.uuid, materialId: object.material.uuid,
            vertices: object.geometry.getAttribute('position')?.count || 0,
            drawCount: object.geometry.drawRange.count });
          const originalAfter = object.onAfterRender;
          object.onAfterRender = function () { observed.drawn = true; return originalAfter?.apply(this, arguments); };
          restore.push(() => { object.onAfterRender = originalAfter; });
        });
      }
      const result = render.apply(this, arguments);
      restore.forEach(reset => reset());
      if (named) { event.completed = true; record({ kind: 'end', scene: scene.name, target: target() }); }
      if (renderer._alloComposer && target() === 'screen') {
        context.drawImage(renderer.domElement, 0, 0, 40, 30);
        const pixels = context.getImageData(0, 0, 40, 30).data;
        let sum = 0, nonblack = 0, hash = 2166136261;
        const colors = new Set();
        for (let i = 0; i < pixels.length; i += 4) {
          const luminance = pixels[i] + pixels[i + 1] + pixels[i + 2];
          sum += luminance; if (luminance > 18) nonblack++;
          colors.add((pixels[i] >> 4) * 256 + (pixels[i + 1] >> 4) * 16 + (pixels[i + 2] >> 4));
          hash = Math.imul(hash ^ pixels[i], 16777619);
          hash = Math.imul(hash ^ pixels[i + 1], 16777619);
          hash = Math.imul(hash ^ pixels[i + 2], 16777619);
        }
        qa.screenDraws++;
        qa.pixels = { phase: state?.phase, mean: sum / 3600, nonblack, colors: colors.size, hash: hash >>> 0 };
      }
      return result;
    };
    return renderer;
  }
  Observed.prototype = Original.prototype;
  Object.setPrototypeOf(Observed, Original);
  window.THREE.WebGLRenderer = Observed;
}

async function fetchAddons() {
  const api = await request.newContext();
  try {
    return new Map(await Promise.all(addons.map(async url => {
      const response = await api.get(url, { timeout: 30000 });
      assert(response.ok(), `Required bloom addon unavailable: ${response.status()} ${url}`);
      const body = await response.text();
      assert(body.includes('THREE.'), `Required bloom addon is not JavaScript: ${url}`);
      return [url, body];
    })));
  } finally { await api.dispose(); }
}

function verifyComposition(snapshot, phase) {
  assert.equal(snapshot.enabled, true, 'The preview HTML must enable postprocessing');
  assert.equal(snapshot.contextLost, false);
  assert.deepEqual(snapshot.passes.map(pass => pass.scene), ['iss-orbital-planet', 'iss-station-inspection', null]);
  assert(snapshot.passes[0].renderPass && snapshot.passes[1].renderPass && snapshot.passes[2].bloom);
  assert.equal(snapshot.passes[0].clear, true);
  assert.equal(snapshot.passes[1].clear, false);
  assert.equal(snapshot.passes[1].clearDepth, false);
  assert.equal(snapshot.passes[1].background, null, 'The station background must not erase the planet pass');
  const events = snapshot.events;
  const stationIndex = events.findLastIndex(event => event.kind === 'render' && event.scene === 'iss-station-inspection');
  const planetIndex = events.findLastIndex((event, index) => index < stationIndex && event.kind === 'render' && event.scene === 'iss-orbital-planet');
  assert(planetIndex >= 0 && stationIndex > planetIndex, 'Both original scene draws must occur in order');
  const planet = events[planetIndex], station = events[stationIndex];
  assert(planet.completed && station.completed, 'Both original WebGL draws must finish');
  assert.equal(planet.phase, phase); assert.equal(station.phase, phase);
  assert.equal(planet.target, station.target, 'Both passes must draw into the same compositing target');
  assert.notEqual(planet.target, 'screen', 'Bloom must use its offscreen compositing target');
  const planetEnd = events.findIndex((event, index) => index > planetIndex && event.kind === 'end' && event.scene === planet.scene);
  const stationEnd = events.findIndex((event, index) => index > stationIndex && event.kind === 'end' && event.scene === station.scene);
  assert(planetEnd > planetIndex && stationEnd > stationIndex);
  assert.equal(events.slice(planetEnd + 1, stationEnd).some(event => event.kind === 'clear' && event.target === planet.target && (event.color || event.depth)), false,
    'The station pass must preserve both planet color and depth');
  assert.equal(snapshot.pixels.phase, phase);
  assert(snapshot.screenDraws > 0 && snapshot.pixels.nonblack > 30 && snapshot.pixels.colors > 8,
    'Bloom must produce a nonblank, varied final screen framebuffer');
  return { planet, station, pixels: snapshot.pixels, screenDraws: snapshot.screenDraws, passes: snapshot.passes };
}

async function runCase(browser, assets, mode) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], result = { mode, passed: false, checks: {} };
  page.on('pageerror', error => errors.push(error.stack || error.message));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const snapshot = () => page.evaluate(() => {
    const renderer = window.__issBloomRenderer, composer = renderer?._alloComposer;
    return { enabled: window.AlloPostFXEnabled, ...window.__issBloomQA,
      contextLost: renderer?.getContext().isContextLost(),
      passes: (composer?.passes || []).map(pass => ({ scene: pass.scene?.name || null,
        renderPass: pass instanceof window.THREE.RenderPass, bloom: pass instanceof window.THREE.UnrealBloomPass,
        clear: pass.clear, clearDepth: pass.clearDepth, background: pass.scene?.background?.getHex?.() ?? null })) };
  });
  try {
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok(), 'Local Three must load');
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.route(addonRoot + '**', async route => {
      const url = route.request().url(); assert(assets.has(url), `Unexpected addon: ${url}`);
      if (mode === 'lazy' && url === addons[0]) await gate;
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: assets.get(url) });
    });
    await page.route(url => url.origin === new URL(base).origin && url.pathname === '/', async route => {
      const response = await route.fetch(); assert(response.ok(), 'The existing preview must respond');
      let html = await response.text();
      assert(html.includes('window.AlloPostFXEnabled=false'), 'Expected the established preview harness');
      html = html.replace('window.AlloPostFXEnabled=false', 'window.AlloPostFXEnabled=true');
      if (mode === 'preloaded') {
        const threeTag = '<script src="/vendor/three-r128/three.min.js"></script>';
        assert(html.includes(threeTag), 'Cannot insert addons immediately after local Three');
        html = html.replace(threeTag, threeTag + addons.map(url => `<script src="${url}"></script>`).join(''));
      }
      await route.fulfill({ response, body: html });
    });
    await page.goto(base + '/?tab=map', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')?._issLightingState?.().renderCount > 0);
    if (mode === 'lazy') {
      assert.equal(await page.evaluate(() => !!window.__issBloomRenderer._alloComposer), false, 'First draw must precede lazy addon availability');
      release();
    }
    await page.waitForFunction(() => !!window.__issBloomRenderer?._alloComposer && window.__issBloomQA.screenDraws > 0);
    assert.equal(await page.evaluate(() => window.__issBloomQA.addonsAtConstruction), mode === 'preloaded');
    for (const [name, phase] of [['noon', 0], ['midnight', 180]]) {
      const prior = await page.evaluate(() => window.__issBloomQA.screenDraws);
      await page.evaluate(value => document.querySelector('.iss-station-stage canvas')._issSetLighting({ phase: value, beta: 20, playing: false }), phase);
      await page.waitForFunction(({ phase, prior }) => window.__issBloomQA.screenDraws > prior && window.__issBloomQA.pixels?.phase === phase, { phase, prior });
      result.checks[name] = verifyComposition(await snapshot(), phase);
      await page.locator('.iss-station-stage canvas').screenshot({ path: path.join(output, `${mode}-${name}.png`) });
    }
    assert.notEqual(result.checks.noon.pixels.hash, result.checks.midnight.pixels.hash, 'Changing sunlight must visibly change the composited framebuffer');
    const priorMotor = await page.evaluate(() => window.__issBloomQA.screenDraws);
    const motorState = await page.evaluate(() => {
      const cv = document.querySelector('.iss-station-stage canvas');
      cv._issSetLighting({ motorEnabled: false, phase: 35, beta: 20, tracking: true, playing: false });
      cv._issSetLighting({ motorEnabled: true, motorSmooth: true, arrayAlpha: -50, arrayFeather: 40 });
      cv._issStepLighting(60);
      return cv._issLightingState();
    });
    await page.waitForFunction(({ phase, prior }) => window.__issBloomQA.screenDraws > prior &&
      window.__issBloomQA.pixels?.phase === phase && window.__issBloomQA.command?.phase === phase,
    { phase: motorState.phase, prior: priorMotor });
    const pending = await snapshot(), composition = verifyComposition(pending, motorState.phase);
    assert.equal(motorState.motorSmooth, true); assert.equal(motorState.motorEnabled, true);
    assert(Math.abs(motorState.actualAlphaRate) > .001 && Math.abs(motorState.actualFeatherRate) > .001,
      'Smooth joints must have nonzero physical velocity after the shared-clock step');
    assert.equal(motorState.commandVisible, true); assert.equal(pending.command.visible, true);
    assert(Math.abs(motorState.arrayAlpha - motorState.commandAlpha) > 1 &&
      Math.abs(motorState.arrayFeather - motorState.commandFeather) > 1, 'The composited view must show a pending command');
    const outline = pending.command.nodes.find(node => node.kind === 'lines');
    const corners = pending.command.nodes.find(node => node.kind === 'points');
    assert(outline?.drawn && outline.dashed && outline.material === 'LineDashedMaterial' &&
      outline.vertices >= 16 && outline.lineDistances >= 16 && outline.dashSize > 0 && outline.gapSize > 0,
    'The dashed command outline must complete a real WebGL draw through bloom');
    assert(corners?.drawn && corners.material === 'PointsMaterial' && corners.vertices >= 8,
      'The command corner markers must complete a real WebGL draw through bloom');
    result.checks.pendingMotor = { ...composition, state: motorState, command: pending.command };
    await page.locator('.iss-station-stage canvas').screenshot({ path: path.join(output, `${mode}-pending-motor.png`) });
    const priorForecast = await page.evaluate(() => window.__issBloomQA.screenDraws);
    const futureState = await page.evaluate(() => {
      const cv = document.querySelector('.iss-station-stage canvas');
      cv._issToggleForecast(true);
      return { live: cv._issLightingState(), forecast: cv._issForecastState() };
    });
    await page.waitForFunction(({ phase, prior }) => window.__issBloomQA.screenDraws > prior &&
      window.__issBloomQA.pixels?.phase === phase && window.__issBloomQA.forecast?.active &&
      window.__issBloomQA.forecast.nodes.every(node => node.drawn),
    { phase: motorState.phase, prior: priorForecast });
    const forecastSnapshot = await snapshot(), forecastComposition = verifyComposition(forecastSnapshot, motorState.phase);
    assert.equal(futureState.forecast.active, true); assert.equal(futureState.forecast.sampleCount, 41);
    assert.equal(futureState.forecast.selected.seconds, 300);
    assert.equal(futureState.live.playing, false);
    for (const key of ['phase', 'beta', 'tracking', 'motorEnabled', 'motorSmooth', 'motorRate', 'motorAcceleration',
      'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'commandAlpha', 'commandFeather', 'driveElapsed']) {
      assert.equal(futureState.live[key], motorState[key], `Opening the composited forecast preserves live ${key}`);
    }
    assert.notEqual(futureState.forecast.selected.phase, motorState.phase, 'The overlay predicts a future orbital phase');
    assert.equal(forecastSnapshot.forecast.visible, true);
    assert.equal(forecastSnapshot.forecast.index, futureState.forecast.index);
    for (const node of forecastSnapshot.forecast.nodes) {
      assert(node.found && node.visible && node.materialVisible && node.opacity > 0 && node.drawn,
        `The forecast ${node.kind} must complete a visible original WebGL draw through bloom`);
      assert.equal(node.depthTest, false); assert.equal(node.depthWrite, false);
    }
    const futureOutline = forecastSnapshot.forecast.nodes.find(node => node.kind === 'outline');
    const futurePath = forecastSnapshot.forecast.nodes.find(node => node.kind === 'path');
    const futureTip = forecastSnapshot.forecast.nodes.find(node => node.kind === 'tip');
    assert.equal(futureOutline.type, 'LineSegments'); assert.equal(futureOutline.material, 'LineBasicMaterial');
    assert.equal(futureOutline.color, 0x22d3ee); assert(futureOutline.vertices >= 16);
    assert.equal(futurePath.type, 'Line'); assert.equal(futurePath.material, 'LineBasicMaterial');
    assert.equal(futurePath.color, 0x22d3ee); assert.equal(futurePath.drawCount, 41); assert.equal(futurePath.vertices, 41);
    assert.equal(futureTip.type, 'Mesh'); assert.equal(futureTip.material, 'MeshBasicMaterial');
    assert.equal(futureTip.color, 0x67e8f9); assert(futureTip.vertices > 0);
    const futureFills = forecastSnapshot.forecast.nodes.filter(node => /^fill-/.test(node.kind));
    assert.equal(futureFills.length, 2);
    assert.equal(futureState.forecast.selected.eclipse, false, 'This composited sample predicts sunlight');
    for (const fill of futureFills) {
      assert.equal(fill.type, 'Mesh'); assert.equal(fill.material, 'MeshBasicMaterial');
      assert.equal(fill.color, 0xffd374);
      assert(Math.abs(fill.opacity - (.06 + .18 * futureState.forecast.selected.generation)) < 1e-10,
        'The future panel opacity must use predicted solar input');
      assert.equal(fill.transparent, true); assert.equal(fill.side, 2); assert.equal(fill.toneMapped, false);
      assert(fill.vertices > 0 && fill.drawn, 'Each translucent future panel must complete its own onAfterRender through bloom');
    }
    assert.equal(futureFills[0].geometryId, futureFills[1].geometryId, 'Future panels share one plane geometry');
    assert.equal(futureFills[0].materialId, futureFills[1].materialId, 'Future panels share one illumination material');
    result.checks.forecast = { ...forecastComposition, state: futureState, overlay: forecastSnapshot.forecast };
    await page.locator('.iss-station-stage canvas').screenshot({ path: path.join(output, `${mode}-forecast.png`) });
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.__events?.errors || []), []);
    result.checks.cleanup = await page.evaluate(() => {
      const renderer = window.__issBloomRenderer, cv = renderer.domElement, gl = renderer.getContext();
      const scene = renderer._alloComposer.passes.find(pass => pass.scene?.name === 'iss-station-inspection').scene;
      const future = scene.getObjectByName('iss-array-forecast');
      const fills = [0, 1].map(index => scene.getObjectByName('iss-array-forecast-fill-' + index));
      const objects = [future.children.find(object => object.isLineSegments),
        scene.getObjectByName('iss-array-forecast-path'), scene.getObjectByName('iss-array-forecast-tip'), ...fills];
      const geometries = new Set(objects.map(object => object.geometry)), materials = new Set(objects.map(object => object.material));
      const disposed = { geometries: 0, materials: 0 }, fillDisposals = { geometry: 0, material: 0 };
      geometries.forEach(geometry => geometry.addEventListener('dispose', () => disposed.geometries++));
      materials.forEach(material => material.addEventListener('dispose', () => disposed.materials++));
      fills[0].geometry.addEventListener('dispose', () => fillDisposals.geometry++);
      fills[0].material.addEventListener('dispose', () => fillDisposals.material++);
      window.__destroy();
      return { lost: gl.isContextLost(), composerCleared: renderer._alloComposer === null,
        initialized: cv._issInit, canvases: document.querySelectorAll('.iss-station-stage canvas').length,
        forecastResources: { geometries: geometries.size, materials: materials.size, disposed,
          sharedFillGeometry: fills[0].geometry === fills[1].geometry,
          sharedFillMaterial: fills[0].material === fills[1].material, fillDisposals } };
    });
    assert.deepEqual(result.checks.cleanup, { lost: true, composerCleared: true, initialized: false, canvases: 0,
      forecastResources: { geometries: 4, materials: 4, disposed: { geometries: 4, materials: 4 },
        sharedFillGeometry: true, sharedFillMaterial: true, fillDisposals: { geometry: 1, material: 1 } } });
    assert.deepEqual(errors, []);
    result.passed = true;
    return result;
  } catch (error) {
    result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await snapshot().catch(() => null);
    await page.screenshot({ path: path.join(output, `${mode}-failure.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    release();
    await page.evaluate(() => window.__destroy?.()).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const results = [];
  const assets = await fetchAddons();
  const browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const mode of ['preloaded', 'lazy']) {
      try { results.push(await runCase(browser, assets, mode)); }
      catch (error) { results.push(error.qaResult || { mode, passed: false, failure: error.stack }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results }, null, 2) + '\n'); }
    }
  } finally { await browser.close(); }
  console.log(`Bloom checks passed for preloaded and lazy addons. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
