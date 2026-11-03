#!/usr/bin/env node
'use strict';

// Matched procedural-painter and real-WebGL regression checks. Start the local
// preview separately; --before must identify the pre-change source snapshot.
// node dev-tools/space_station_map_panel_skin_qa.cjs --selftest
// node dev-tools/space_station_map_panel_skin_qa.cjs --base=http://127.0.0.1:4179
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, arg('--out', '.tmp/space-station-3d-panel-skin-01a185d3/browser'));
const beforePath = path.resolve(ROOT, arg('--before', '.tmp/space-station-3d-panel-skin-01a185d3/source-before.js'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
const kinds = ['panel', 'mli', 'cargo', 'cupola', 'interior'];
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function extractPainter(source) {
  const start = source.indexOf('function issHullCanvas(kind)'), end = source.indexOf('var _issEarthCanvases', start);
  assert(start >= 0 && end > start, 'Locate the existing standalone hull painter');
  return source.slice(start, end).trim();
}

function paintSkins(code) {
  const make = () => new Function('var _issHullCanvases = {};\n' + code + '\nreturn issHullCanvas;')();
  const painter = make(), fresh = make(), results = {}, proto = CanvasRenderingContext2D.prototype;
  const fillRect = proto.fillRect, fillText = proto.fillText;
  let active = null;
  proto.fillRect = function (...args) { if (active) active.rects.push({ args, fill: this.fillStyle }); return fillRect.apply(this, args); };
  proto.fillText = function (...args) { if (active) active.labels.push(String(args[0])); return fillText.apply(this, args); };
  const encode = bytes => { let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary); };
  try {
    for (const kind of ['panel', 'mli', 'cargo', 'cupola', 'interior']) {
      active = { rects: [], labels: [] };
      const canvas = painter(kind), trace = active, commands = trace.rects.length + trace.labels.length;
      const cached = painter(kind) === canvas && commands === trace.rects.length + trace.labels.length;
      active = null;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const png = canvas.toDataURL('image/png'), distinct = new Set(); let opaque = true;
      for (let i = 0; i < pixels.length; i += 4) { distinct.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]); opaque &&= pixels[i + 3] === 255; }
      // These are the old misleading painted handrails, independently of the
      // replacement panel layout or its chosen decorative detail.
      const paintedRails = trace.rects.filter(({ args: [x, y, w, h] }) => Math.abs(y - 189) < 1e-8 && Math.abs(w - 57.6) < 1e-8 && h === 6 && [35.2, 163.2, 291.2, 419.2].some(expected => Math.abs(x - expected) < 1e-8)).length;
      results[kind] = { width: canvas.width, height: canvas.height, hidden: canvas.getAttribute('aria-hidden'), cached,
        deterministic: fresh(kind).toDataURL('image/png') === png, opaque, colors: distinct.size,
        paintedRails, panelLabels: trace.labels.filter(label => /^P\d+$/.test(label)), png, rgba: encode(pixels) };
    }
    results.defaultMatchesPanel = painter('unknown-panel-kind').toDataURL('image/png') === results.panel.png;
  } finally { proto.fillRect = fillRect; proto.fillText = fillText; }
  return results;
}

function verifyPainters(before, after) {
  const result = {};
  for (const kind of kinds) {
    const a = before[kind], b = after[kind];
    for (const value of [a, b]) {
      assert.equal(value.width, 512); assert.equal(value.height, 256); assert.equal(value.hidden, 'true');
      assert(value.cached && value.deterministic && value.opaque, `${kind} stays cached, deterministic and fully painted`);
      assert(value.colors > 1, `${kind} is not a blank single-color bitmap`);
    }
    const oldPixels = Buffer.from(a.rgba, 'base64'), newPixels = Buffer.from(b.rgba, 'base64');
    assert.equal(oldPixels.length, 512 * 256 * 4); assert.equal(newPixels.length, oldPixels.length);
    let changedPixels = 0;
    for (let i = 0; i < oldPixels.length; i += 4) if (!oldPixels.subarray(i, i + 4).equals(newPixels.subarray(i, i + 4))) changedPixels++;
    if (kind === 'panel') {
      assert(changedPixels > 0, 'The panel image must actually change');
      assert.equal(a.paintedRails, 4, 'The baseline fixture includes the four duplicate painted rails');
      assert(a.panelLabels.length > 0, 'The baseline fixture includes P-number labels');
      assert.equal(b.paintedRails, 0, 'Remove duplicate flat painted handrails'); assert.deepEqual(b.panelLabels, [], 'Remove arbitrary P-number labels');
    } else assert.equal(changedPixels, 0, `${kind} pixels must remain exactly unchanged`);
    result[kind] = { width: b.width, height: b.height, changedPixels, beforeHash: sha(oldPixels), afterHash: sha(newPixels), colors: b.colors,
      cached: b.cached, deterministic: b.deterministic, paintedRails: b.paintedRails, panelLabels: b.panelLabels };
  }
  assert(before.defaultMatchesPanel && after.defaultMatchesPanel);
  return result;
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  const qa = window.__issPanelQA = { scene: null, camera: null, draw: null, contexts: [], resources: {}, geometry: {} };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render; qa.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name === 'iss-station-inspection' && cv._issCameraState) {
        qa.scene = scene; qa.camera = camera;
        qa.draw = { camera: cv._issCameraState(), selected: cv._issWantSel, cutaway: !!cv._issCutaway, light: cv._issLightingState(),
          gpu: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls } };
      }
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function sceneSnapshot(includePixels) {
  const qa = window.__issPanelQA, cv = document.querySelector('.iss-station-stage canvas');
  const images = new Map(), geometries = new Set(), materials = new Set(), textures = new Set(), meshes = [], skins = {};
  function track(value, kind) {
    if (!value || qa.resources[value.uuid]) return;
    const record = qa.resources[value.uuid] = { kind, disposed: false };
    value.addEventListener('dispose', () => { record.disposed = true; });
  }
  function hash(array) {
    if (!array) return null;
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261;
    for (const byte of bytes) h = Math.imul(h ^ byte, 16777619);
    return (h >>> 0).toString(16) + ':' + bytes.length;
  }
  function geometry(value) {
    geometries.add(value); track(value, 'geometry');
    if (!qa.geometry[value.uuid]) {
      if (!value.boundingBox) value.computeBoundingBox();
      qa.geometry[value.uuid] = { type: value.type, index: hash(value.index?.array), min: value.boundingBox.min.toArray(), max: value.boundingBox.max.toArray(),
        attributes: Object.fromEntries(Object.entries(value.attributes).map(([key, attribute]) => [key, { count: attribute.count, itemSize: attribute.itemSize, hash: hash(attribute.array) }])), groups: value.groups };
    }
    return qa.geometry[value.uuid];
  }
  function texture(value) {
    if (!value) return null; textures.add(value); track(value, 'texture');
    if (!images.has(value.image)) images.set(value.image, images.size);
    return { name: value.name, image: images.get(value.image), width: value.image?.width, height: value.image?.height,
      canvas: value.image instanceof HTMLCanvasElement, canvasTexture: !!value.isCanvasTexture, repeat: value.repeat.toArray(), offset: value.offset.toArray(),
      wrapS: value.wrapS, wrapT: value.wrapT, encoding: value.encoding, flipY: value.flipY, anisotropy: value.anisotropy,
      minFilter: value.minFilter, magFilter: value.magFilter, mipmaps: value.generateMipmaps };
  }
  function material(value) {
    materials.add(value); track(value, 'material');
    const maps = Object.fromEntries(Object.keys(value).filter(key => value[key]?.isTexture).sort().map(key => [key, texture(value[key])]));
    return { type: value.type, color: value.color?.toArray(), emissive: value.emissive?.toArray(), emissiveIntensity: value.emissiveIntensity,
      roughness: value.roughness, metalness: value.metalness, opacity: value.opacity, transparent: value.transparent, depthWrite: value.depthWrite,
      side: value.side, wireframe: value.wireframe, maps };
  }
  qa.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    meshes.push({ name: mesh.name, id: mesh._issId || null, parentId: mesh._issParentId || null, visible: mesh.visible,
      position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
      geometry: geometry(mesh.geometry), materials: mats.map(material) });
    if (includePixels && mesh._issId && mesh.material?.map?.image instanceof HTMLCanvasElement) skins[mesh._issId] = mesh.material.map.image.toDataURL('image/png');
  });
  const camera = cv._issCameraState(), light = { ...cv._issLightingState() };
  // Independent mounts can render a different number of idle frames while
  // their physical state is identical. Keep that scheduling counter out.
  delete light.renderCount;
  return { meshes, skins, counts: { meshes: meshes.length, geometries: geometries.size, materials: materials.size, textures: textures.size, images: images.size }, gpu: qa.draw.gpu,
    camera: { position: camera.position, target: camera.target, distance: camera.distance, focusId: camera.focusId, stationQuaternion: camera.stationQuaternion },
    light, arm: cv._issArmState(), thermal: cv._issThermalState(), forecast: cv._issForecastState(), preview: cv._issArmPreviewState(),
    selected: cv._issWantSel, cutaway: !!cv._issCutaway, data: JSON.parse(JSON.stringify(window.__toolData.spaceStation)) };
}

function verifyScenePair(before, after) {
  assert.deepEqual(after.meshes, before.meshes, 'All actual geometry, hardware placement, material parameters and texture configuration stay unchanged');
  assert.deepEqual(after.counts, before.counts, 'No new mesh, geometry, material, texture or source canvas');
  assert.deepEqual(after.gpu, before.gpu, 'GPU allocation and draw-call counts remain unchanged at the matched view');
  assert.deepEqual(after.camera, before.camera, 'Before/after screenshots use exactly the same camera');
  for (const key of ['light', 'arm', 'thermal', 'forecast', 'preview', 'selected', 'cutaway', 'data']) assert.deepEqual(after[key], before[key], `Matched ${key} is unchanged`);
}

function summarize(snapshot) {
  const hardware = snapshot.meshes.filter(mesh => /^iss-module-(hull|handrails|endcaps)-/.test(mesh.name));
  return { counts: snapshot.counts, gpu: snapshot.gpu, camera: snapshot.camera, selected: snapshot.selected, cutaway: snapshot.cutaway,
    eclipse: snapshot.light.eclipse, hardware, skinHashes: Object.fromEntries(Object.entries(snapshot.skins).map(([id, png]) => [id, sha(png)])) };
}

async function runScene(browser, source, painted, width, variant) {
  const phone = width < 500, page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  const errors = [], captures = {}, result = { variant, width, passed: false, screenshots: [] };
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.addInitScript(() => { let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; window.AlloPostFXEnabled = false; });
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch(); assert(response.ok());
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();' });
  });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  const settled = async () => page.waitForFunction(() => {
    const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issPanelQA?.draw;
    if (!cv?._issCameraState || !draw) return false;
    const camera = cv._issCameraState(), light = cv._issLightingState();
    return !camera.tweening && !camera.activePointers && !light.playing && draw.selected === cv._issWantSel && draw.cutaway === !!cv._issCutaway &&
      draw.camera.focusId === camera.focusId && draw.camera.position.every((v, i) => Math.abs(v - camera.position[i]) < 1e-9) && draw.light.phase === light.phase && draw.light.eclipse === light.eclipse;
  }, undefined, { polling: 100 });
  const capture = async (name, pixels = false) => {
    await settled(); captures[name] = await page.evaluate(sceneSnapshot, pixels);
    await page.evaluate(() => document.activeElement?.blur());
    const file = `panel-${variant}-${name}-${width}.png`; await stage.screenshot({ path: path.join(output, file), animations: 'disabled' });
    result.screenshots.push(file); console.log('Panel screenshot: ' + path.join(output, file));
  };
  try {
    await page.goto(base + '/?tab=map', { waitUntil: 'load' }); await settled();
    const initial = await page.evaluate(sceneSnapshot, true);
    for (const [id, png] of Object.entries(initial.skins)) {
      const kind = ['zarya', 'zvezda', 'nauka'].includes(id) ? 'mli' : id === 'cupola' ? 'cupola' : 'panel';
      assert.equal(png, painted[kind].png, `${id} renders the actual ${kind} painter canvas`);
    }
    assert.equal(initial.meshes.filter(mesh => mesh.name.startsWith('iss-module-handrails-')).length, 11);
    for (const [id, label] of [['destiny', 'Destiny'], ['kibo', 'Kibo']]) {
      await activate(page.locator('[data-iss-camera-view="labs"]')); await settled();
      await activate(page.locator('.iss-module-picker').getByRole('button', { name: label, exact: true })); await settled();
      const saved = await page.evaluate(() => JSON.stringify(window.__toolData.spaceStation));
      await activate(page.locator(`[data-iss-focus-module="${id}"]`)); await settled();
      assert.equal(await canvas.evaluate(cv => cv._issCameraState().focusId), id);
      assert.equal(await page.evaluate(() => JSON.stringify(window.__toolData.spaceStation)), saved, 'Focusing is view-only');
      await capture(id + '-day', true);
    }
    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await capture('kibo-eclipse');
    assert.equal(captures['kibo-eclipse'].light.eclipse, true);
    await activate(page.locator('[data-iss-lighting-preset="noon"]')); await settled();
    await activate(page.locator('[data-iss-cutaway]')); await capture('kibo-cutaway');
    assert.equal(captures['kibo-cutaway'].cutaway, true);
    assert.deepEqual(errors, []); assert.deepEqual(await page.evaluate(() => window.__events?.errors || []), []);
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(layout.scrollWidth <= width + 1); result.layout = layout; result.errors = errors; result.passed = true;
    return { captures, result };
  } catch (error) {
    result.failure = error.stack || error.message; result.errors = errors; error.qaResult = result;
    await page.screenshot({ path: path.join(output, `failure-${variant}-${width}.png`), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    result.cleanup = await page.evaluate(() => {
      window.__destroy?.(); const qa = window.__issPanelQA;
      return { resources: Object.values(qa?.resources || {}), lost: (qa?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
    }).catch(() => null);
    await page.close();
    if (result.passed) {
      assert(result.cleanup?.resources.length > 0 && result.cleanup.resources.every(value => value.disposed));
      assert(result.cleanup.lost.length > 0 && result.cleanup.lost.every(Boolean)); assert.equal(result.cleanup.canvases, 0);
    }
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const beforeSource = await fs.readFile(beforePath, 'utf8'), afterSource = await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8');
  const report = { base, beforePath, beforeHash: sha(beforeSource), afterHash: sha(afterSource), results: [] };
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const paintPage = await browser.newPage();
    const before = await paintPage.evaluate(paintSkins, extractPainter(beforeSource)), after = await paintPage.evaluate(paintSkins, extractPainter(afterSource));
    report.painters = verifyPainters(before, after);
    for (const [variant, painted] of [['before', before], ['after', after]]) await fs.writeFile(path.join(output, `panel-texture-${variant}.png`), Buffer.from(painted.panel.png.split(',')[1], 'base64'));
    await paintPage.close(); console.log('Exact painter pixels, cache behavior and removed duplicate decoration passed.');
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    for (const width of widths) {
      const baseline = await runScene(browser, beforeSource, before, width, 'before');
      const changed = await runScene(browser, afterSource, after, width, 'after');
      const comparisons = {};
      for (const name of Object.keys(baseline.captures)) {
        verifyScenePair(baseline.captures[name], changed.captures[name]);
        comparisons[name] = summarize(changed.captures[name]);
      }
      report.results.push({ width, passed: true, before: baseline.result, after: changed.result, comparisons });
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
      console.log(`Matched panel-only appearance, real geometry/material/GPU invariance and cleanup passed at ${width}px.`);
    }
    report.passed = true;
  } catch (error) { report.passed = false; report.failure = error.stack || error.message; if (error.qaResult) report.failedRun = error.qaResult; throw error; }
  finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
}

function selftest() {
  const pixels = Buffer.alloc(512 * 256 * 4, 240); for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  const skin = { width: 512, height: 256, hidden: 'true', cached: true, deterministic: true, opaque: true, colors: 12, rgba: pixels.toString('base64'), paintedRails: 0, panelLabels: [] };
  const before = Object.fromEntries(kinds.map(kind => [kind, structuredClone(skin)])); before.defaultMatchesPanel = true;
  before.panel.paintedRails = 4; before.panel.panelLabels = ['P1'];
  const after = structuredClone(before); const changed = Buffer.from(pixels); changed[0] = 220; after.panel.rgba = changed.toString('base64'); after.panel.paintedRails = 0; after.panel.panelLabels = [];
  verifyPainters(before, after);
  const mutant = change => { const value = structuredClone(after); change(value); return value; };
  assert.throws(() => verifyPainters(before, mutant(value => { value.panel.rgba = before.panel.rgba; })), /actually change/);
  assert.throws(() => verifyPainters(before, mutant(value => { value.mli.rgba = after.panel.rgba; })), /exactly unchanged/);
  assert.throws(() => verifyPainters(before, mutant(value => { value.panel.paintedRails = 1; })), /painted handrails/);
  assert.throws(() => verifyPainters(before, mutant(value => { value.panel.panelLabels = ['P1']; })), /P-number/);
  assert.throws(() => verifyPainters(before, mutant(value => { value.panel.colors = 1; })), /blank/);
  const scene = { meshes: [{ geometry: { hash: 'same' }, materials: [{ roughness: .42 }] }], counts: { textures: 1 }, gpu: { calls: 2 }, camera: { target: [0, 0, 0] }, light: { playing: false } };
  verifyScenePair(scene, structuredClone(scene));
  for (const change of [value => { value.meshes[0].geometry.hash = 'changed'; }, value => { value.meshes[0].materials[0].roughness = .8; }, value => { value.gpu.calls++; }, value => { value.counts.textures++; }, value => { value.camera.target[0]++; }]) {
    const altered = structuredClone(scene); change(altered); assert.throws(() => verifyScenePair(scene, altered));
  }
  console.log('Panel QA selftests passed: unchanged/blank panel, changed protected skin, retained painted hardware/labels, geometry/material/resource/camera mutants.');
}

if (process.argv.includes('--selftest')) selftest();
else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
