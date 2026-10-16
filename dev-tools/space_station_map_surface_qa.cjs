#!/usr/bin/env node
'use strict';

// Inspect actual Three render inputs and native controls against the running preview.
// Does not start a server or change the application's scene construction.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-surface-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};

function observeSurfaces() {
  const Original = THREE.WebGLRenderer;
  const qa = window.__issSurfaceQA = { draw: null, planet: null, scene: null, sequence: 0, contexts: [], textures: {}, events: [] };
  function textureInfo(texture) {
    if (!texture) return null;
    if (!qa.textures[texture.uuid]) {
      const record = qa.textures[texture.uuid] = { uuid: texture.uuid, disposed: false };
      texture.addEventListener('dispose', () => { record.disposed = true; });
    }
    return { uuid: texture.uuid, isCanvasTexture: texture.isCanvasTexture === true, canvas: texture.image instanceof HTMLCanvasElement,
      width: texture.image?.width, height: texture.image?.height, encoding: texture.encoding, srgb: texture.encoding === THREE.sRGBEncoding };
  }
  function materialInfo(material) {
    if (!material) return null;
    return { type: material.type, map: textureInfo(material.map), emissive: material.emissive?.toArray() || null,
      emissiveMap: !!material.emissiveMap, roughness: material.roughness, metalness: material.metalness };
  }
  function ObservedRenderer(options) {
    const renderer = new Original(options), original = renderer.render;
    qa.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = original.apply(this, arguments), sequence = ++qa.sequence;
      if (scene.name === 'iss-orbital-planet') {
        qa.planet = { sequence, sun: scene.getObjectByName('iss-planet-sun')?.intensity, containsStation: !!scene.getObjectByName('iss-inspected-station') };
      }
      if (scene.name === 'iss-station-inspection' && renderer.domElement._issLightingState) {
        qa.scene = scene;
        const panels = []; let truss = null;
        scene.traverse(node => {
          if (node.isMesh && /^iss-solar-blanket-/.test(node.name)) panels.push({ name: node.name,
            materials: Array.isArray(node.material) ? node.material.map(materialInfo) : [materialInfo(node.material)] });
          if (node.name === 'iss-open-truss') truss = node;
        });
        let lattice = null;
        if (truss?.geometry?.attributes.position) {
          const geometry = truss.geometry; if (!geometry.boundingBox) geometry.computeBoundingBox(); if (!geometry.boundingSphere) geometry.computeBoundingSphere();
          lattice = { id: truss._issId, position: truss.position.toArray(), vertices: geometry.attributes.position.count,
            finite: Array.from(geometry.attributes.position.array).every(Number.isFinite),
            normalsFinite: !!geometry.attributes.normal && Array.from(geometry.attributes.normal.array).every(Number.isFinite),
            min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray(), radius: geometry.boundingSphere.radius };
        }
        const cv = renderer.domElement;
        qa.draw = { sequence, planet: qa.planet, panels, lattice, lighting: cv._issLightingState(), camera: cv._issCameraState(),
          selected: cv._issWantSel, width: cv.clientWidth, height: cv.clientHeight, directSun: scene.getObjectByName('iss-direct-sun')?.intensity,
          containsPlanetSun: !!scene.getObjectByName('iss-planet-sun'), containsEarth: !!scene.getObjectByName('iss-orbital-earth'),
          render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, points: renderer.info.render.points } };
      }
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const { draw, state } = snapshot;
  assert.equal(snapshot.glLost, false); assert(draw && draw.lattice, 'The actual scene contains the open truss');
  assert.equal(draw.panels.length, 8, 'Eight named solar blankets are rendered');
  assert.equal(new Set(draw.panels.map(panel => panel.name)).size, 8);
  const fronts = [], backs = [];
  for (const panel of draw.panels) {
    assert.equal(panel.materials.length, 6, 'Box face order retains separate front and rear materials');
    for (const index of [2, 3]) {
      const material = panel.materials[index]; assert(material && material.map, `${panel.name} face ${index} has a surface map`);
      assert(material.map.isCanvasTexture && material.map.canvas && material.map.srgb);
      assert(material.map.width > 0 && material.map.height > 0 && Number.isInteger(material.map.width) && Number.isInteger(material.map.height));
      assert.deepEqual(material.emissive, [0, 0, 0], 'Solar faces reflect illumination instead of emitting it'); assert.equal(material.emissiveMap, false);
      assert(Number.isFinite(material.roughness) && material.roughness >= 0 && material.roughness <= 1);
      assert(Number.isFinite(material.metalness) && material.metalness >= 0 && material.metalness <= 1);
    }
    fronts.push(panel.materials[2].map.uuid); backs.push(panel.materials[3].map.uuid);
  }
  assert.equal(new Set(fronts).size, 1, 'All fronts share one texture'); assert.equal(new Set(backs).size, 1, 'All backs share one texture'); assert.notEqual(fronts[0], backs[0], 'Front cells and rear blanket use distinct maps');
  const truss = draw.lattice;
  assert.equal(truss.id, 'truss'); assert(truss.finite && truss.normalsFinite && truss.vertices > 0 && Number.isFinite(truss.radius) && truss.radius > 0);
  assert(truss.min.every(Number.isFinite) && truss.max.every(Number.isFinite));
  truss.max.forEach((value, index) => assert(value > truss.min[index], 'The lattice has finite, nonzero extent on every axis'));
  assert.equal(draw.containsPlanetSun, false); assert.equal(draw.containsEarth, false); assert.equal(draw.planet.containsStation, false);
  assert.equal(draw.sequence, draw.planet.sequence + 1, 'Earth draws before the station');
  near(draw.planet.sun, 1.35); near(draw.directSun, state.eclipse ? 0 : 1.35); near(draw.lighting.phase, state.phase);
  assert.equal(draw.lighting.eclipse, state.eclipse); assert.equal(state.playing, false);
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], consoleErrors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), camera: cv._issCameraState(), selected: cv._issWantSel, glLost: gl?.isContextLost(), draw: window.__issSurfaceQA.draw };
  });
  const ready = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issSurfaceQA?.draw;
      if (!cv?._issLightingState || !draw) return false;
      const state = cv._issLightingState(), camera = cv._issCameraState();
      return !camera.tweening && !state.playing && state.phase === draw.lighting.phase && state.eclipse === draw.lighting.eclipse && cv._issWantSel === draw.selected &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const capture = async label => {
    await stage.scrollIntoViewIfNeeded(); await ready();
    const file = `map-surface-${label}-${width}.png`; await stage.screenshot({ path: path.join(output, file), animations: 'disabled' }); result.screenshots.push(file);
  };
  try {
    console.log(`Checking station surface visuals at ${width}px`);
    await page.addInitScript(() => {
      let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      window.AlloPostFXEnabled = false;
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeSurfaces.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!document.querySelector('.iss-station-stage canvas')?._issLightingState);
    await page.evaluate(() => document.addEventListener('click', event => {
      const node = event.target.closest('[data-iss-lighting-preset],[data-iss-camera-fit],.iss-module-picker button');
      if (node) window.__issSurfaceQA.events.push({ trusted: event.isTrusted, label: node.textContent.trim(), preset: node.getAttribute('data-iss-lighting-preset'), fit: node.getAttribute('data-iss-camera-fit') });
    }, true));
    await canvas.evaluate(cv => cv._issSetLighting({ beta: 20, playing: false, tracking: true, motorEnabled: false }));
    await activate(page.locator('[data-iss-lighting-preset="noon"]')); await activate(page.locator('[data-iss-camera-fit="station"]'));
    const day = await ready(); assert(!day.state.eclipse); result.checks.sharedDistinctNonEmissiveTextures = true;
    result.checks.latticeBounds = day.draw.lattice; result.checks.dayRender = { phase: day.state.phase, directSun: day.draw.directSun, planetSun: day.draw.planet.sun, draw: day.draw.render };
    await capture('day');
    await activate(page.locator('[data-iss-camera-fit="array"]')); await ready(); await capture('day-array');
    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); const nightArray = await ready(); assert(nightArray.state.eclipse); await capture('eclipse-array');
    await activate(page.locator('[data-iss-camera-fit="station"]')); const night = await ready(); assert(night.state.eclipse); await capture('eclipse');
    result.checks.eclipseRender = { phase: night.state.phase, directSun: night.draw.directSun, planetSun: night.draw.planet.sun, draw: night.draw.render };

    const trussControl = page.locator('.iss-module-picker').getByRole('button', { name: 'Integrated Truss + Solar Arrays', exact: true });
    await activate(trussControl); const selected = await ready(); assert.equal(selected.selected, 'truss'); assert.equal(await trussControl.getAttribute('aria-pressed'), 'true');
    const picking = await page.evaluate(() => {
      const mesh = window.__issSurfaceQA.scene.getObjectByName('iss-open-truss'), geometry = mesh.geometry;
      mesh.updateMatrixWorld(true);
      const positions = geometry.attributes.position, indices = geometry.index, length = indices ? indices.count : positions.count;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3(), edge = new THREE.Vector3();
      for (let offset = 0; offset + 2 < length; offset += 3) {
        a.fromBufferAttribute(positions, indices ? indices.getX(offset) : offset);
        b.fromBufferAttribute(positions, indices ? indices.getX(offset + 1) : offset + 1);
        c.fromBufferAttribute(positions, indices ? indices.getX(offset + 2) : offset + 2);
        normal.subVectors(b, a).cross(edge.subVectors(c, a));
        if (normal.lengthSq() < 1e-12) continue;
        const center = a.add(b).add(c).multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
        normal.normalize().transformDirection(mesh.matrixWorld);
        const ray = new THREE.Raycaster(center.clone().addScaledVector(normal, .5), normal.clone().negate());
        const hits = ray.intersectObject(mesh, false);
        if (hits.length) return { id: hits[0].object._issId, distance: hits[0].distance, point: hits[0].point.toArray(), triangle: offset / 3 };
      }
      return null;
    });
    assert(picking && picking.id === 'truss' && Number.isFinite(picking.distance) && picking.point.every(Number.isFinite), 'The rendered lattice is raycast-selectable');
    result.checks.nativeTrussSelectionAndRaycast = picking;
    const layout = await page.evaluate(() => {
      const rect = document.querySelector('.iss-station-stage').getBoundingClientRect();
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, stage: { left: rect.left, right: rect.right, width: rect.width, height: rect.height } };
    });
    assert(layout.width <= width + 1); assert(layout.stage.left >= -1 && layout.stage.right <= width + 1 && layout.stage.width > 200 && layout.stage.height >= 300); result.checks.layout = layout;
    const events = await page.evaluate(() => window.__issSurfaceQA.events);
    for (const preset of ['noon', 'midnight']) assert(events.some(event => event.trusted && event.preset === preset));
    assert(events.some(event => event.trusted && event.label === 'Integrated Truss + Solar Arrays'));
    result.errors = errors; result.consoleErrors = consoleErrors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Surface materials, lattice, lighting and layout passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors; result.consoleErrors = consoleErrors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        const qa = window.__issSurfaceQA;
        return { contexts: qa?.contexts.length || 0, lost: (qa?.contexts || []).map(gl => gl.isContextLost()), textures: Object.values(qa?.textures || {}), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0 && result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0);
        assert(result.checks.cleanup.textures.length >= 2 && result.checks.cleanup.textures.every(texture => texture.disposed), 'All observed solar textures are disposed'); assert.deepEqual(errors, []);
      }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await page.close(); }
  }
}
async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally { const temp = path.join(output, 'results.json.tmp'); await fs.writeFile(temp, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temp, path.join(output, 'results.json')); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`Station surface checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
