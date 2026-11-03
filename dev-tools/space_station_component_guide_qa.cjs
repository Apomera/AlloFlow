#!/usr/bin/env node
'use strict';

// Native component reading and real visitor-surface checks. All assets are local.
// node dev-tools/space_station_component_guide_qa.cjs --selftest
// node dev-tools/space_station_component_guide_qa.cjs --widths=1440,390 --out=.tmp/space-station-component-guide-01a185d3/browser
// Add --faults-only --baseline=<passing results.json> for served-source null/throw painter faults.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-component-guide-01a185d3/browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const officialDomains = ['nasa.gov', 'esa.int', 'jaxa.jp', 'asc-csa.gc.ca', 'csa-asc.gc.ca', 'asi.it', 'dlr.de', 'roscosmos.ru', 'spacex.com', 'northropgrumman.com', 'ams02.space', 'home.cern'];
const near = (a, b, tolerance = 1e-7) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function verifyEntry(reading, expected) {
  assert.equal(reading.id, expected.id);
  for (const field of ['name', 'purpose', 'science', 'connection', 'model']) {
    assert.equal(reading[field], expected[field], `${expected.id}: ${field} matches the selected component`);
    assert(reading[field].trim().length > 0);
  }
  assert.equal(reading.date, expected.milestone.date);
  assert.equal(reading.milestone, expected.milestone.text);
  assert.deepEqual(reading.metric, expected.metric);
  assert.equal(reading.sources.length, expected.sources.length);
  assert(reading.sources.length >= 1, 'Every entry supplies a primary source');
  reading.sources.forEach((source, index) => {
    assert.equal(source.url, expected.sources[index].url);
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert(officialDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)), `Unexpected source domain: ${url.hostname}`);
    assert.equal(source.target, '_blank');
    assert(source.rel.split(/\s+/).includes('noopener'));
    assert(source.rel.split(/\s+/).includes('noreferrer'));
  });
  assert(reading.diagram, 'Selected component has a diagram');
  assert(reading.viewportOverflow <= 1, 'Document has no horizontal overflow');
  assert(reading.panelOverflow <= 1, 'Guide has no horizontal overflow');
  assert.deepEqual(reading.overflow, [], 'Guide text and native controls fit the viewport');
}

function verifySolar(solar) {
  const progress = solar.progress;
  assert.equal(progress.length, 2, 'Two original Progress wing meshes');
  progress.forEach((wing, index) => {
    assert.equal(wing.geometry.type, 'BoxGeometry');
    assert.deepEqual(wing.geometry.dimensions, [.98, .02, .52]);
    assert.deepEqual(wing.position, [(index ? 1 : -1) * .74, 0, 7.16]);
    assert.deepEqual(wing.scale, [1, 1, 1]);
    assert.equal(wing.geometry.vertices, 24);
    assert.equal(wing.geometry.triangles, 12);
    assert.equal(wing.color, 0xffffff);
    assert.equal(wing.emissive, 0);
    near(wing.roughness, .38); near(wing.metalness, .3);
    assert.equal(wing.map.name, 'iss-progress-solar-cells');
    assert.deepEqual(wing.map.size, [512, 256]);
    assert(wing.map.canvas && wing.map.srgb && wing.map.clamp && wing.map.colors > 20);
  });
  assert.equal(progress[0].materialId, progress[1].materialId, 'Progress wings share one private material');
  assert.equal(progress[0].map.id, progress[1].map.id, 'Progress wings share one private texture');
  assert.equal(solar.dragon.length, 1); assert.equal(solar.cygnus.length, 2);
  const first = [solar.dragon[0], progress[0], solar.cygnus[0]];
  assert.equal(new Set(first.map(item => item.materialId)).size, 3, 'Each visiting craft has its own cell material');
  assert.equal(new Set(first.map(item => item.map.id)).size, 3, 'Each visiting craft has its own cell texture');
  assert.equal(new Set(first.map(item => item.map.canvasId)).size, 3, 'Three independent cached atlases');
  assert.equal(solar.cygnus[0].map.id, solar.cygnus[1].map.id);
}

// Instrument the actual renderer before the tool is loaded, without exporting
// or replacing product helpers. Cache identity is observed across two mounts.
function installObserver() {
  const Original = THREE.WebGLRenderer, canvases = new WeakMap();
  window.__componentQA = { mounts: [], canvasSequence: 0, draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), originalRender = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, scene: null, camera: null, frames: 0 };
    window.__componentQA.mounts.push(mount);
    renderer.render = function (scene, camera) {
      const answer = originalRender.apply(this, arguments);
      if (scene.name !== 'iss-station-inspection') return answer;
      mount.scene = scene; mount.camera = camera; mount.frames++;
      window.__componentQA.draw = mount;
      for (const id of ['dragon', 'progress', 'cygnus']) {
        scene.getObjectByName('iss-visitor-' + id)?.traverse(object => {
          function track(resource) {
            if (!resource || mount.resources[resource.uuid]) return;
            const record = mount.resources[resource.uuid] = { kind: resource.type, name: resource.name || '', texture: !!resource.isTexture, disposals: 0 };
            resource.addEventListener('dispose', () => record.disposals++);
            if (resource.isTexture && resource.image instanceof HTMLCanvasElement && !canvases.has(resource.image)) {
              canvases.set(resource.image, ++window.__componentQA.canvasSequence);
            }
          }
          track(object.geometry);
          for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
            if (!material) continue;
            track(material);
            for (const value of Object.values(material)) if (value?.isTexture) track(value);
          }
        });
      }
      return answer;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
  window.__componentCanvasId = canvas => canvases.get(canvas);
}

function readScene() {
  const observation = window.__componentQA.draw, cv = document.querySelector('.iss-station-stage canvas');
  if (!observation?.scene || !cv?._issLightingState) throw Error('Real station render is not ready');
  const scene = observation.scene, state = cv._issCameraState(), light = cv._issLightingState();
  function fingerprint(array) {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261;
    for (const byte of bytes) value = Math.imul(value ^ byte, 16777619);
    return (value >>> 0).toString(16);
  }
  const geometry = {}, solar = {};
  for (const id of ['dragon', 'progress', 'cygnus']) {
    geometry[id] = []; solar[id] = [];
    scene.getObjectByName('iss-visitor-' + id).traverse(mesh => {
      if (!mesh.geometry) return;
      const g = mesh.geometry, p = g.parameters || {}, positions = g.getAttribute('position');
      geometry[id].push({ name: mesh.name, type: g.type, parameters: p, position: mesh.position.toArray(), scale: mesh.scale.toArray(), rotation: mesh.rotation.toArray(),
        attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attribute]) => [key, fingerprint(attribute.array)])), index: g.index ? fingerprint(g.index.array) : null });
      if (!['iss-dragon-solar-sleeve', 'iss-progress-solar-wing', 'iss-cygnus-ultraflex'].includes(mesh.name)) return;
      const material = mesh.material, map = material.map, image = map?.image, colors = new Set();
      if (image instanceof HTMLCanvasElement) {
        const bytes = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
        for (let i = 0; i < bytes.length; i += 4) colors.add((bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]);
      }
      solar[id].push({ name: mesh.name, geometry: { type: g.type, dimensions: [p.width ?? null, p.height ?? null, p.depth ?? null], vertices: positions.count, triangles: (g.index?.count || positions.count) / 3 },
        position: mesh.position.toArray(), scale: mesh.scale.toArray(), materialId: material.uuid, color: material.color.getHex(), emissive: material.emissive.getHex(), roughness: material.roughness, metalness: material.metalness,
        map: map ? { id: map.uuid, name: map.name, size: [image.width, image.height], canvas: image instanceof HTMLCanvasElement, canvasId: window.__componentCanvasId(image), colors: colors.size,
          pixelsHash: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null,
          srgb: map.encoding === THREE.sRGBEncoding, clamp: map.wrapS === THREE.ClampToEdgeWrapping && map.wrapT === THREE.ClampToEdgeWrapping } : null });
    });
  }
  return { geometry, solar, physics: { quaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity', 'tracking', 'eclipse', 'playing', 'sun', 'wingNormal'].map(key => [key, light[key]])) },
    camera: state, frames: observation.frames, glLost: observation.gl.isContextLost() };
}

function readEntry() {
  const guide = document.querySelector('[data-iss-component-guide]'), text = selector => guide.querySelector(selector)?.textContent.trim();
  const boxes = Array.from(guide.querySelectorAll('h3,h4,p,time,a,select,button,strong')).map(node => {
    const b = node.getBoundingClientRect();
    return { name: (node.getAttribute('aria-label') || node.textContent).trim().slice(0, 80), left: b.left, right: b.right, overflow: node.scrollWidth - node.clientWidth };
  });
  return { id: guide.dataset.issComponentGuide, name: text('[data-iss-guide-title]'), purpose: text('[data-iss-guide-purpose]'), science: text('.iss-guide-columns>div:first-child p'),
    connection: text('.iss-guide-columns>div:last-child p'), model: text('.iss-guide-model p'), date: text('.iss-guide-milestone time'), milestone: text('.iss-guide-milestone p'),
    metric: { value: text('.iss-guide-metric strong'), label: text('.iss-guide-metric span') }, diagram: !!guide.querySelector('svg'),
    sources: Array.from(guide.querySelectorAll('.iss-guide-sources a'), anchor => ({ url: anchor.href, target: anchor.target, rel: anchor.rel })),
    viewportOverflow: document.documentElement.scrollWidth - innerWidth, panelOverflow: guide.scrollWidth - guide.clientWidth,
    overflow: boxes.filter(box => box.left < -1 || box.right > innerWidth + 1 || box.overflow > 1) };
}

async function runWidth(browser, base, catalog, width) {
  const result = { width, checks: {}, screenshots: [], entries: [], errors: [] };
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : 1080 }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch(); assert(response.ok());
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' });
  });
  const saved = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const guide = page.locator('[data-iss-component-guide]'), select = page.locator('#iss-component-topic'), canvas = page.locator('.iss-station-stage canvas');
  const activate = async locator => width < 500 ? locator.tap() : locator.click();
  const waitScene = () => page.waitForFunction(() => window.__componentQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issCameraState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening);
  const capture = async (locator, label) => {
    const filename = `component-${label}-${width}.png`;
    // Tall reading panels need a document clip; auto-scroll stabilization can
    // oscillate when the element exceeds the viewport height.
    const clip = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
    await page.screenshot({ path: path.join(output, filename), clip, fullPage: true, animations: 'disabled' }); result.screenshots.push(filename);
  };
  const cleanup = async () => page.evaluate(() => {
    window.__destroy();
    return window.__componentQA.mounts.map(mount => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.values(mount.resources) }));
  });
  try {
    await page.goto(base + '/?tab=map'); await guide.waitFor(); await waitScene();
    await page.evaluate(() => {
      document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false });
      window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation,
        opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25, opsPrediction: 'Keep this working prediction',
        opsTrials: [{ id: 77, label: 'Preserved observation', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Stored prediction', reflection: 'Stored reflection' }],
        opsTrialSelected: 77, opsTrialCompare: 'current', opsLog: ['Preserved working note'] } }));
    });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345);
    await waitScene();
    assert.deepEqual(await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value)), catalog.map(entry => entry.id));
    assert(catalog.length >= 25 && catalog.filter(entry => entry.moduleId).length === 13);
    const original = await saved(), originalScene = await page.evaluate(readScene); verifySolar(originalScene.solar);
    result.checks.visitorSolar = originalScene.solar;
    result.checks.visitorGeometryHashes = Object.fromEntries(Object.entries(originalScene.geometry).map(([id, geometry]) => [id, hash(JSON.stringify(geometry))]));
    assert.equal(originalScene.glLost, false);
    const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules'].includes(key)));
    for (const entry of catalog) {
      const before = await saved(); await select.selectOption(entry.id);
      await page.waitForFunction(id => document.querySelector('[data-iss-component-guide]')?.dataset.issComponentGuide === id, entry.id);
      const reading = await page.evaluate(readEntry); verifyEntry(reading, entry);
      const after = await saved();
      if (entry.moduleId) {
        assert.equal(after.selModule, entry.moduleId);
        assert(after.seenModules[entry.moduleId]);
        assert.deepEqual(independent(after), independent(before), 'Module choices preserve independent saved data');
        for (const [id, value] of Object.entries(before.seenModules)) assert.equal(after.seenModules[id], value);
      } else assert.deepEqual(after, before, 'Hardware and visitor reading preserves every saved field');
      result.entries.push({ id: entry.id, sources: reading.sources.length, layout: 'fits', savedState: 'preserved' });
      if (result.entries.length % 7 === 0) console.log(`Component guide ${width}px: ${result.entries.length}/${catalog.length} entries verified`);
      if (entry.id === 'columbus' || entry.id === 'radiators') await capture(guide, 'guide-' + entry.id);
    }
    result.checks.catalog = { count: catalog.length, moduleCount: 13, allFields: true, links: true, layout: true };
    const afterReading = await page.evaluate(readScene);
    assert.deepEqual(afterReading.geometry, originalScene.geometry, 'Reading never modifies actual visiting-craft geometry');
    assert.deepEqual(afterReading.physics, originalScene.physics, 'Reading never changes physical scene state');
    assert.deepEqual(independent(await saved()), independent(original));
    result.checks.readingPreservesStateAndPhysics = true;

    // Genuine module picker must replace a non-module reading selection.
    const hardware = catalog.find(entry => !entry.moduleId && entry.id !== 'progress');
    await select.selectOption(hardware.id);
    await activate(page.locator('.iss-module-picker').getByRole('button', { name: /^Destiny$/i }));
    await page.waitForFunction(() => document.querySelector('#iss-component-topic')?.value === 'destiny');
    assert.equal((await saved()).selModule, 'destiny');
    verifyEntry(await page.evaluate(readEntry), catalog.find(entry => entry.id === 'destiny'));
    result.checks.modulePickerSync = true;

    // Native keyboard activation reaches both ends without wrapping.
    await select.selectOption(catalog[0].id);
    const previous = guide.getByRole('button', { name: 'Previous component', exact: true }), next = guide.getByRole('button', { name: 'Next component', exact: true });
    assert(await previous.isDisabled()); await next.focus(); await page.keyboard.press('Enter');
    assert.equal(await select.inputValue(), catalog[1].id); await previous.focus(); await page.keyboard.press('Space');
    assert.equal(await select.inputValue(), catalog[0].id);
    await select.selectOption(catalog.at(-1).id); assert(await next.isDisabled());
    await previous.focus(); await page.keyboard.press('Enter'); assert.equal(await select.inputValue(), catalog.at(-2).id);
    result.checks.keyboardNavigation = true;

    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = [];
    for (const id of ['columbus', 'radiators', 'progress']) {
      await select.selectOption(id);
      accessibility.push(await page.evaluate(async id => {
        const checked = await axe.run(document.querySelector('[data-iss-component-guide]'), { rules: { region: { enabled: false } } });
        return { id, passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
      }, id));
    }
    result.checks.accessibility = accessibility;
    accessibility.forEach(check => assert.deepEqual(check.violations, [], `${check.id} scoped axe`));

    const beforeFrame = await saved(), physicsBeforeFrame = (await page.evaluate(readScene)).physics;
    await activate(guide.getByRole('button', { name: /Frame in 3D/ }));
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issCameraState().focusId === 'progress');
    await waitScene(); assert.deepEqual(await saved(), beforeFrame);
    assert.deepEqual((await page.evaluate(readScene)).physics, physicsBeforeFrame);
    await activate(page.locator('[data-iss-camera-zoom="in"]')); await waitScene();
    for (const [preset, eclipse] of [['noon', false], ['midnight', true]]) {
      await activate(page.locator(`[data-iss-lighting-preset="${preset}"]`));
      await page.waitForFunction(value => document.querySelector('.iss-station-stage canvas')._issLightingState().eclipse === value, eclipse);
      await waitScene(); const scene = await page.evaluate(readScene); verifySolar(scene.solar);
      assert.deepEqual(scene.geometry, originalScene.geometry);
      await capture(page.locator('.iss-station-stage'), 'progress-' + (eclipse ? 'eclipse' : 'day'));
      result.checks[eclipse ? 'progressEclipse' : 'progressDay'] = { eclipse: scene.physics.eclipse, sunIntensity: scene.physics.sunIntensity, geometryHash: hash(JSON.stringify(scene.geometry.progress)), solar: scene.solar.progress };
    }
    assert(result.checks.progressEclipse.sunIntensity < result.checks.progressDay.sunIntensity);
    result.checks.framePreservesDataAndPhysics = true;

    const firstAtlases = (await page.evaluate(readScene)).solar;
    result.checks.firstCleanup = await cleanup();
    const assertCleanup = mounts => mounts.forEach(mount => {
      assert(mount.lost, 'WebGL context closes'); assert(mount.resources.length > 0);
      assert(mount.resources.every(resource => resource.disposals === 1), 'All observed visitor resources dispose exactly once');
      const names = mount.resources.filter(resource => resource.texture).map(resource => resource.name);
      for (const id of ['dragon', 'progress', 'cygnus']) assert.equal(names.filter(name => name === `iss-${id}-solar-cells`).length, 1);
    });
    assertCleanup(result.checks.firstCleanup);
    await page.evaluate(seed => window.__mount(seed), original); await guide.waitFor(); await waitScene();
    const remount = await page.evaluate(readScene); verifySolar(remount.solar);
    for (const id of ['dragon', 'progress', 'cygnus']) {
      assert.equal(remount.solar[id][0].map.canvasId, firstAtlases[id][0].map.canvasId, `${id} reuses the cached canvas`);
      assert.notEqual(remount.solar[id][0].map.id, firstAtlases[id][0].map.id, `${id} owns a new mount texture`);
    }
    result.checks.cachedAtlasesAcrossMounts = true;
    result.checks.finalCleanup = await cleanup(); assertCleanup(result.checks.finalCleanup);
    assert.equal(await canvas.count(), 0);
    result.hostErrors = await page.evaluate(() => window.__events.errors);
    assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    console.log(`Component guide: ${catalog.length} entries, keyboard, state, axe, Progress and cleanup passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message;
    result.lastReading = await page.evaluate(readEntry).catch(() => null);
    await page.screenshot({ path: path.join(output, `component-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    await page.evaluate(() => { if (document.querySelector('.iss-station-stage canvas')) window.__destroy?.(); }).catch(() => {});
    await page.close();
  }
}

async function runFault(browser, base, fault, baseline) {
  const result = { fault, width: 1440, errors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' });
  });
  await page.route('**/stem_lab/stem_tool_spacestation.js', async route => {
    const response = await route.fetch(), source = await response.text(), anchor = 'function issProgressSolarCanvas() {';
    assert.equal(source.split(anchor).length, 2, 'Fault injection has one exact painter entry point');
    const injected = fault === 'null' ? ' return null;' : ' throw new Error("QA-only Progress painter fault");';
    await route.fulfill({ response, body: source.replace(anchor, anchor + injected) });
  });
  try {
    await page.goto(base + '/?tab=map');
    await page.waitForFunction(() => window.__componentQA?.draw?.frames > 1);
    await page.locator('#iss-component-topic').selectOption('progress');
    await page.locator('[data-iss-component-guide]').getByRole('button', { name: /Frame in 3D/ }).click();
    await page.waitForFunction(() => {
      const c = document.querySelector('.iss-station-stage canvas')?._issCameraState?.();
      return c?.focusId === 'progress' && !c.tweening;
    });
    const scene = await page.evaluate(readScene), progress = scene.solar.progress;
    assert.equal(progress.length, 2);
    for (const wing of progress) {
      assert.equal(wing.map, null); assert.equal(wing.color, 0x1e2f57); assert.equal(wing.emissive, 0x0a1836);
      near(wing.roughness, .3); near(wing.metalness, .7);
      assert.deepEqual(wing.geometry.dimensions, [.98, .02, .52]);
    }
    assert.equal(progress[0].materialId, progress[1].materialId);
    const normalize = item => {
      const { materialId, map, ...rest } = item;
      const { id, canvasId, ...mapValues } = map;
      return { ...rest, map: mapValues };
    };
    for (const id of ['dragon', 'cygnus']) {
      assert.deepEqual(scene.solar[id].map(normalize), baseline.checks.visitorSolar[id].map(normalize), `${fault}: protected ${id} atlas and material remain exact`);
    }
    result.geometryHashes = Object.fromEntries(Object.entries(scene.geometry).map(([id, geometry]) => [id, hash(JSON.stringify(geometry))]));
    assert.deepEqual(result.geometryHashes, baseline.checks.visitorGeometryHashes, 'Painter faults do not change any visitor geometry');
    result.progress = progress; result.protectedAtlasesUnchanged = true;
    result.cleanup = await page.evaluate(() => {
      window.__destroy();
      return window.__componentQA.mounts.map(mount => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.values(mount.resources) }));
    });
    for (const mount of result.cleanup) {
      assert(mount.lost && mount.frames > 1); assert(mount.resources.length > 0);
      assert(mount.resources.every(resource => resource.disposals === 1));
      const maps = mount.resources.filter(resource => resource.texture).map(resource => resource.name);
      assert.equal(maps.filter(name => name === 'iss-progress-solar-cells').length, 0);
      for (const id of ['dragon', 'cygnus']) assert.equal(maps.filter(name => name === `iss-${id}-solar-cells`).length, 1);
    }
    result.hostErrors = await page.evaluate(() => window.__events.errors);
    assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    console.log(`Progress ${fault} painter fallback passed with protected atlases, unchanged geometry and cleanup`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error;
  } finally {
    await page.evaluate(() => { if (document.querySelector('.iss-station-stage canvas')) window.__destroy?.(); }).catch(() => {});
    await page.close();
  }
}

function selftest() {
  const expected = { id: 'example', name: 'Example', purpose: 'Purpose', science: 'Science', connection: 'People', model: 'Schematic', milestone: { date: '2001', text: 'Installed' }, metric: { value: '2', label: 'parts' }, sources: [{ url: 'https://www.nasa.gov/example' }] };
  const reading = { ...expected, date: '2001', milestone: 'Installed', diagram: true, viewportOverflow: 0, panelOverflow: 0, overflow: [], sources: [{ url: 'https://www.nasa.gov/example', target: '_blank', rel: 'noopener noreferrer' }] };
  verifyEntry(reading, expected);
  for (const change of [value => { value.model = ''; }, value => { value.sources[0].rel = ''; }, value => { value.viewportOverflow = 10; }, value => { value.overflow = [{ name: 'clipped title' }]; }, value => { value.diagram = false; }]) {
    const mutant = structuredClone(reading); change(mutant); assert.throws(() => verifyEntry(mutant, expected));
  }
  const part = { geometry: { type: 'BoxGeometry', dimensions: [.98, .02, .52], vertices: 24, triangles: 12 }, position: [-.74, 0, 7.16], scale: [1, 1, 1], materialId: 'progress', color: 0xffffff, emissive: 0, roughness: .38, metalness: .3,
    map: { id: 'progress', name: 'iss-progress-solar-cells', size: [512, 256], canvas: true, canvasId: 2, colors: 80, srgb: true, clamp: true } };
  const solar = { progress: [part, { ...structuredClone(part), position: [.74, 0, 7.16] }], dragon: [{ materialId: 'dragon', map: { id: 'dragon', canvasId: 1 } }], cygnus: [{ materialId: 'cygnus', map: { id: 'cygnus', canvasId: 3 } }, { materialId: 'cygnus', map: { id: 'cygnus', canvasId: 3 } }] };
  verifySolar(solar);
  for (const change of [value => { value.progress[0].map.colors = 1; }, value => { value.progress[0].emissive = 1; }, value => { value.progress[0].geometry.dimensions[0] = 1.1; }, value => { value.progress[1].map.id = 'duplicate'; }, value => { value.dragon[0].map.id = 'progress'; }]) {
    const mutant = structuredClone(solar); change(mutant); assert.throws(() => verifySolar(mutant));
  }
  console.log('Guide and Progress QA oracles reject missing content, unsafe links, overflow, blank/emissive textures, changed geometry and leaked maps.');
}

async function main() {
  assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
  assert(output.startsWith(ROOT + path.sep));
  const source = await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8');
  const declaration = source.match(/var ISS_COMPONENT_GUIDE = (\[[\s\S]*?\]);/);
  assert(declaration, 'Guide catalog declaration exists');
  const catalog = JSON.parse(declaration[1]); assert(catalog.length >= 25, 'Wait for the complete guide source before running');
  for (const entry of catalog) for (const source of entry.sources) {
    const url = new URL(source.url); assert.equal(url.protocol, 'https:');
    assert(officialDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)), `Unreviewed primary-source domain: ${url.hostname}`);
  }
  await fs.mkdir(output, { recursive: true });
  const preview = await createPreview(), report = { sourceSha256: hash(source), started: new Date().toISOString(), catalogCount: catalog.length, results: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const faultsOnly = process.argv.includes('--faults-only');
    let baseline;
    if (faultsOnly) {
      const baselineFile = argument('--baseline', ''); assert(baselineFile, 'Fault checks require a passing normal-mount report');
      const prior = JSON.parse(await fs.readFile(path.resolve(ROOT, baselineFile), 'utf8'));
      assert.equal(prior.sourceSha256, report.sourceSha256, 'Fault baseline uses this exact product source');
      assert(prior.sourceUnchanged); baseline = prior.results.find(result => result.passed && result.width === 1440);
      assert(baseline?.checks?.visitorSolar, 'Passing desktop baseline has observed private atlases');
      report.baseline = path.resolve(ROOT, baselineFile);
    }
    for (const scenario of faultsOnly ? ['null', 'throw'] : widths) {
      try { report.results.push(faultsOnly ? await runFault(browser, preview.base, scenario, baseline) : await runWidth(browser, preview.base, catalog, scenario)); }
      catch (error) { report.results.push(error.qaResult || { scenario, passed: false, failure: error.stack }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
  } finally {
    report.finished = new Date().toISOString();
    report.sourceUnchanged = hash(await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8')) === report.sourceSha256;
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => preview.server.close(resolve));
  }
  assert(report.sourceUnchanged, 'Source stayed fixed during the native run');
}

if (require.main === module) {
  if (process.argv.includes('--selftest')) selftest();
  else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { verifyEntry, verifySolar, selftest };
