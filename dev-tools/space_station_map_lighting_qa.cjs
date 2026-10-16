#!/usr/bin/env node
'use strict';

// Exercise the real WebGL scene against an already running working-tree preview.
// Start that preview separately with space_station_enhancement_qa.cjs --serve.
//   node dev-tools/space_station_map_lighting_qa.cjs
//   node dev-tools/space_station_map_lighting_qa.cjs --base=http://127.0.0.1:4179 --widths=1440,390
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const value = process.argv.slice(2).find(arg => arg.startsWith(name + '='));
  return value ? value.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-lighting-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320), 'Use valid viewport widths');
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Expected finite values: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vector = value => {
  assert(Array.isArray(value) && value.length === 3 && value.every(Number.isFinite), 'Expected a finite world-space vector');
  return value;
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

// Installed immediately after the local Three script, before the tool constructs
// its renderer. Observe the actual render inputs without changing the scene.
function instrumentRenderPasses() {
  const OriginalRenderer = window.THREE.WebGLRenderer;
  window.__issRenderPasses = [];
  window.__issQAContexts = [];
  let sequence = 0;
  function ObservedRenderer(options) {
    const renderer = new OriginalRenderer(options);
    const originalRender = renderer.render;
    window.__issQAContexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const lights = [];
      let meshes = 0;
      scene.traverse(object => {
        if (object.isMesh) meshes++;
        if (object.isLight) lights.push({ name: object.name, type: object.type,
          intensity: object.intensity, visible: object.visible });
      });
      const state = renderer.domElement._issLightingState?.();
      const pass = { sequence: ++sequence, scene: scene.name, meshes, lights,
        phase: state?.phase, eclipse: state?.eclipse,
        station: !!scene.getObjectByName('iss-inspected-station'),
        earth: !!scene.getObjectByName('iss-orbital-earth'),
        positiveDirectionalLights: lights.filter(light => light.type === 'DirectionalLight' && light.visible && light.intensity > 0).length,
        completed: false };
      window.__issRenderPasses.push(pass);
      if (window.__issRenderPasses.length > 8) window.__issRenderPasses.shift();
      const result = originalRender.apply(this, arguments);
      pass.completed = true;
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = OriginalRenderer.prototype;
  Object.setPrototypeOf(ObservedRenderer, OriginalRenderer);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verifyRenderPasses(passes, expectedPhase, eclipsed) {
  assert(passes.length >= 2, 'The renderer proxy must observe the real scene draws');
  const [planet, station] = passes.slice(-2);
  assert.equal(planet.scene, 'iss-orbital-planet');
  assert.equal(station.scene, 'iss-station-inspection');
  assert.equal(station.sequence, planet.sequence + 1, 'Render the planet before the station');
  for (const pass of [planet, station]) {
    assert.equal(pass.completed, true, 'The original renderer must complete each observed draw');
    near(pass.phase, expectedPhase);
    assert.equal(pass.eclipse, eclipsed);
    assert(pass.meshes > 0, 'Each lighting pass contains actual scene meshes');
  }
  assert.equal(planet.earth, true); assert.equal(planet.station, false);
  assert.equal(station.station, true); assert.equal(station.earth, false);
  const planetSun = planet.lights.find(light => light.name === 'iss-planet-sun');
  const directSun = station.lights.find(light => light.name === 'iss-direct-sun');
  assert(planetSun && directSun, 'Each real render pass includes its own named Sun');
  assert.equal(planetSun.type, 'DirectionalLight'); assert.equal(directSun.type, 'DirectionalLight');
  near(planetSun.intensity, 1.35);
  near(directSun.intensity, eclipsed ? 0 : 1.35);
  assert.equal(planet.lights.some(light => light.name === 'iss-direct-sun'), false);
  assert.equal(station.lights.some(light => light.name === 'iss-planet-sun'), false,
    'The planet Sun must never enter the station render pass');
  assert(planet.positiveDirectionalLights > 0, 'The visible planet retains directional illumination');
  if (eclipsed) {
    assert(station.lights.some(light => light.type === 'DirectionalLight' && light.visible && Math.abs(light.intensity - .18) < 1e-7),
      'Eclipse preserves the intended dim station rim light');
    assert(station.lights.filter(light => light.type === 'DirectionalLight').every(light => light.intensity <= .18 + 1e-7),
      'No bright directional light leaks into the eclipsed station pass');
  }
  return { planet, station };
}

function verifyPhysics(snapshot) {
  const s = snapshot.state;
  for (const key of ['phase', 'beta', 'periodSeconds', 'incidence', 'generation', 'eclipseMinutes', 'sunIntensity', 'earthSunIntensity', 'renderCount']) {
    assert(Number.isFinite(s[key]), `Lighting ${key} must be finite`);
  }
  assert(s.phase >= 0 && s.phase <= 360);
  assert(s.beta >= 0 && s.beta <= 80);
  assert(s.periodSeconds > 0);
  assert.equal(typeof s.eclipse, 'boolean');
  assert.equal(typeof s.playing, 'boolean');
  assert.equal(typeof s.tracking, 'boolean');
  assert([60, 180].includes(s.rate));
  assert(s.renderCount > 0);
  const sun = vector(s.sun), normal = vector(s.wingNormal);
  near(Math.hypot(...sun), 1, 1e-6);
  near(Math.hypot(...normal), 1, 1e-6);
  const cosine = Math.max(0, Math.min(1, dot(normal, sun)));
  near(s.incidence, cosine, 1e-6);
  if (s.tracking) near(dot(normal, sun), 1, 1e-6);
  near(s.generation, s.eclipse ? 0 : cosine, 1e-6);
  assert(s.incidence >= 0 && s.incidence <= 1);
  assert(s.generation >= 0 && s.generation <= 1);
  assert(s.sunIntensity >= 0 && s.earthSunIntensity > 0, 'Earth remains illuminated when the station crosses its shadow');
  if (s.eclipse) near(s.sunIntensity, 0);
  if (!s.playing) {
    near(snapshot.phase, s.phase, .500001);
    near(snapshot.beta, s.beta);
  }
  assert.equal(snapshot.tracking, String(s.tracking));
  assert.equal(snapshot.rate, String(s.rate));
  assert.equal(snapshot.playing, String(s.playing));
  assert.equal(snapshot.phaseChip, s.eclipse ? 'eclipse' : 'sunlight');
  near(Number.parseFloat(snapshot.readings.phase), s.phase, .050001);
  near(Number.parseFloat(snapshot.readings.beta), s.beta, .500001);
  near(Number.parseFloat(snapshot.readings.input), Math.round(s.generation * 100));
  assert.equal(snapshot.gl.lost, false);
  assert(snapshot.gl.width > 200 && snapshot.gl.height >= 300);
  if (s.eclipseMinutes > 0) {
    assert(Number.isFinite(s.eclipseStart) && Number.isFinite(s.eclipseEnd));
    assert(s.eclipseStart >= 0 && s.eclipseStart < s.eclipseEnd && s.eclipseEnd <= 360);
    near(s.eclipseMinutes, (s.eclipseEnd - s.eclipseStart) / 360 * s.periodSeconds / 60, 1e-6);
    assert(Number.isFinite(s.untilEventSeconds) && s.untilEventSeconds >= 0);
    assert(s.nextEvent, 'An eclipse orbit identifies its next transition');
  }
  return s;
}

async function runWidth(browser, width) {
  const phone = width < 500;
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], result = { width, touch: phone, reducedMotion: true, checks: {}, screenshots: [] };
  page.on('pageerror', error => errors.push(error.stack || error.message));
  // Keep independent screenshots reproducible without changing the physical inputs.
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    window.AlloPostFXEnabled = false;
  });
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch();
    assert(response.ok(), 'The local Three dependency must load before instrumentation');
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + instrumentRenderPasses.toString() + ')();\n' });
  });
  const canvas = page.locator('.iss-station-stage canvas');
  const stage = page.locator('.iss-station-stage');
  const panel = page.locator('[data-iss-lighting-panel]');
  const phase = page.locator('[data-iss-orbit-phase]');
  const beta = page.locator('[data-iss-beta]');
  const play = page.locator('[data-iss-lighting-play]');
  const rate = page.locator('[data-iss-lighting-rate]');
  const tracking = page.locator('[data-iss-array-tracking]');
  const preset = name => page.locator(`[data-iss-lighting-preset="${name}"]`);
  const activate = async locator => {
    if (phone) await locator.tap();
    else { await locator.focus(); await page.keyboard.press('Enter'); }
  };
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), phase: Number(document.querySelector('[data-iss-orbit-phase]').value),
      beta: Number(document.querySelector('[data-iss-beta]').value),
      tracking: document.querySelector('[data-iss-array-tracking]').getAttribute('aria-pressed'),
      playing: document.querySelector('[data-iss-lighting-play]').getAttribute('aria-pressed'),
      rate: document.querySelector('[data-iss-lighting-rate]').value,
      phaseChip: document.querySelector('[data-iss-light-phase]').getAttribute('data-phase'),
      readings: Object.fromEntries(['phase', 'beta', 'input'].map(key => [key,
        document.querySelector('[data-iss-lighting-reading="' + key + '"]').textContent])),
      transitionDisabled: ['sunset', 'sunrise'].map(name => document.querySelector('[data-iss-lighting-preset="' + name + '"]').disabled),
      gl: { lost: gl ? gl.isContextLost() : null, width: cv.clientWidth, height: cv.clientHeight } };
  });
  const waitState = (predicate, arg) => page.waitForFunction(({ source, arg }) => {
    const cv = document.querySelector('.iss-station-stage canvas');
    return cv && cv._issLightingState && Function('s', 'arg', 'return (' + source + ')(s, arg)')(cv._issLightingState(), arg);
  }, { source: predicate.toString(), arg }, { timeout: 30000, polling: 100 });
  const waitRender = count => waitState((s, count) => s.renderCount > count, count);
  const stablePaused = async () => {
    const before = verifyPhysics(await read());
    assert.equal(before.playing, false);
    // A bounded observation checks that passive reduced-motion viewing does not run the orbit.
    await page.waitForTimeout(350);
    const after = verifyPhysics(await read());
    assert.equal(after.playing, false);
    near(after.phase, before.phase);
    near(after.beta, before.beta);
    return after;
  };
  const screenshot = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    const stageName = `map-lighting-${label}-stage-${width}.png`;
    const panelName = `map-lighting-${label}-controls-${width}.png`;
    const pixels = await stage.screenshot({ path: path.join(output, stageName), animations: 'disabled' });
    await panel.screenshot({ path: path.join(output, panelName), animations: 'disabled' });
    result.screenshots.push(stageName, panelName);
    return pixels;
  };

  try {
    console.log(`Checking orbital lighting at ${width}px`);
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' });
    await panel.waitFor();
    await waitState(s => s.renderCount > 0);
    const initial = verifyPhysics(await read());
    near(initial.phase, 35); near(initial.beta, 20);
    assert.equal(initial.tracking, true); assert.equal(initial.playing, false);
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    for (const [locator, min, max, step] of [[phase, '0', '360', '0.5'], [beta, '0', '80', '1']]) {
      assert.equal(await locator.getAttribute('type'), 'range');
      assert.equal(await locator.getAttribute('min'), min);
      assert.equal(await locator.getAttribute('max'), max);
      assert.equal(Number(await locator.getAttribute('step')), Number(step));
    }
    result.checks.initial = await stablePaused();

    await phase.focus(); await page.keyboard.press('ArrowRight');
    await waitState(s => Math.abs(s.phase - 35.5) < 1e-7);
    await waitRender(initial.renderCount);
    const keyed = verifyPhysics(await read());
    near(keyed.phase, 35.5); assert.equal(keyed.playing, false);
    result.checks.keyboardPhase = keyed;
    // Exercise the browser's range input on both pointer platforms; its native thumb
    // width makes the exact percentage browser-dependent, so verify its actual value.
    await phase.hover();
    const rangeBox = await phase.boundingBox();
    assert(rangeBox && rangeBox.width > 100);
    const px = rangeBox.x + rangeBox.width * .72, py = rangeBox.y + rangeBox.height / 2;
    const beforePointer = await read();
    if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
    await waitState((s, prior) => Math.abs(s.phase - prior) > 1, beforePointer.state.phase);
    await waitRender(beforePointer.state.renderCount);
    const pointer = verifyPhysics(await read());
    near(pointer.phase, Number(await phase.inputValue()), .500001);
    assert(pointer.phase > 180 && pointer.phase < 340);
    result.checks.pointerPhase = pointer;

    await activate(preset('noon'));
    await waitState(s => s.phase === 0 && !s.eclipse && !s.playing);
    const noon = verifyPhysics(await read());
    near(noon.generation, 1, 1e-6); assert(noon.sunIntensity > 0);
    const noonPixels = await screenshot('noon');
    result.checks.noonRenderPasses = verifyRenderPasses(await page.evaluate(() => window.__issRenderPasses), 0, false);
    await activate(preset('midnight'));
    await waitState(s => s.phase === 180 && s.eclipse && !s.playing);
    const midnight = verifyPhysics(await read());
    near(midnight.generation, 0); near(midnight.sunIntensity, 0); assert(midnight.earthSunIntensity > 0);
    const nightPixels = await screenshot('eclipse');
    result.checks.eclipseRenderPasses = verifyRenderPasses(await page.evaluate(() => window.__issRenderPasses), 180, true);
    assert.notEqual(Buffer.compare(noonPixels, nightPixels), 0, 'The actual rendered scene changes across the shadow boundary');
    result.checks.noon = noon; result.checks.midnight = midnight;

    await activate(preset('sunset'));
    await waitState(s => s.eclipse && !s.playing);
    const sunset = verifyPhysics(await read());
    near(sunset.phase, sunset.eclipseStart + .5);
    await activate(preset('sunrise'));
    await waitState(s => !s.eclipse && !s.playing);
    const sunrise = verifyPhysics(await read());
    near(sunrise.phase, sunrise.eclipseEnd + .5);
    result.checks.transitions = { sunset, sunrise };
    console.log(`Lighting geometry, native controls and eclipse renders passed at ${width}px`);

    await beta.focus(); await page.keyboard.press('End');
    await waitState(s => s.beta === 80 && !s.playing);
    let highBeta = await read(); verifyPhysics(highBeta);
    assert.deepEqual(highBeta.transitionDisabled, [true, true]);
    near(highBeta.state.eclipseMinutes, 0);
    await activate(preset('midnight'));
    await waitState(s => s.phase === 180 && s.beta === 80);
    highBeta = await read(); verifyPhysics(highBeta);
    assert.equal(highBeta.state.eclipse, false); near(highBeta.state.generation, 1, 1e-6);
    result.checks.highBeta = highBeta.state;

    await activate(play); await waitState(s => s.playing);
    await beta.focus(); await page.keyboard.press('Home');
    await waitState(s => s.beta === 0 && !s.playing);
    assert.deepEqual((await read()).transitionDisabled, [false, false]);
    await activate(preset('noon')); await waitState(s => s.phase === 0);
    await activate(play); await waitState(s => s.playing);
    await activate(tracking); await waitState(s => !s.tracking && !s.playing);
    const parked = verifyPhysics(await read());
    assert.equal(parked.tracking, false);
    result.checks.parked = parked;

    // Camera and cutaway actions still render, and cannot seek the orbital clock.
    const beforeCamera = await read(), beforeCameraPixels = await stage.screenshot();
    const truss = page.locator('[data-iss-camera-view="truss"]');
    await activate(truss); await waitRender(beforeCamera.state.renderCount);
    assert.equal(await truss.getAttribute('aria-pressed'), 'true');
    const camera = verifyPhysics(await read());
    near(camera.phase, beforeCamera.state.phase); near(camera.beta, beforeCamera.state.beta);
    assert.equal(camera.tracking, false);
    assert.notEqual(Buffer.compare(beforeCameraPixels, await stage.screenshot()), 0, 'The camera preset changes the real scene');
    const cutaway = page.locator('[data-iss-cutaway]');
    const beforeCutawayPixels = await stage.screenshot(), beforeCutaway = await read();
    await activate(cutaway);
    await waitRender(beforeCutaway.state.renderCount);
    assert.equal(await cutaway.getAttribute('aria-pressed'), 'true');
    assert.equal(await canvas.evaluate(cv => cv._issCutaway), true);
    const isolated = verifyPhysics(await read());
    near(isolated.phase, camera.phase); near(isolated.beta, camera.beta);
    assert.notEqual(Buffer.compare(beforeCutawayPixels, await stage.screenshot()), 0, 'Cutaway still changes the rendered station');
    await activate(cutaway);
    assert.equal(await cutaway.getAttribute('aria-pressed'), 'false');
    await activate(page.locator('[data-iss-camera-view="overview"]'));
    await activate(tracking); await waitState(s => s.tracking && !s.playing);
    verifyPhysics(await read());
    result.checks.cameraAndCutaway = { camera, isolated };

    await rate.selectOption('180'); await waitState(s => s.rate === 180);
    assert.equal((await read()).state.playing, false, 'Choosing a playback rate does not start the orbit');
    await rate.selectOption('60'); await waitState(s => s.rate === 60);
    const beforePlay = verifyPhysics(await read());
    await activate(play);
    await waitState((s, prior) => s.playing && ((s.phase - prior.phase + 360) % 360) > .05 && s.renderCount > prior.renderCount, beforePlay);
    const advancing = verifyPhysics(await read());
    assert.equal(advancing.rate, 60);
    await activate(play); await waitState(s => !s.playing);
    const paused = await stablePaused();
    result.checks.explicitPlayback = { before: beforePlay, advancing, paused };
    // Presets must also stop an explicitly started orbit.
    await activate(play); await waitState(s => s.playing);
    await activate(preset('noon')); await waitState(s => s.phase === 0 && !s.playing);
    verifyPhysics(await read());
    console.log(`Tracking, camera/cutaway and reduced-motion playback passed at ${width}px`);

    const layout = await page.evaluate(() => {
      const selectors = ['.iss-station-stage', '[data-iss-lighting-panel]', '[data-iss-lighting-panel] button',
        '[data-iss-lighting-panel] input', '[data-iss-lighting-panel] select'];
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        nodes: Array.from(document.querySelectorAll(selectors.join(',')), node => {
          const box = node.getBoundingClientRect();
          return { tag: node.tagName, text: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 100),
            left: box.left, right: box.right, width: box.width, height: box.height,
            clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflowX: getComputedStyle(node).overflowX };
        }) };
    });
    assert(layout.scrollWidth <= width + 1, `Page overflows at ${width}px: ${layout.scrollWidth}`);
    for (const node of layout.nodes) {
      assert(node.left >= -1 && node.right <= layout.viewport + 1, `Control escapes viewport: ${JSON.stringify(node)}`);
      assert(node.width > 0 && node.height > 0);
      if (!['hidden', 'clip'].includes(node.overflowX)) {
        assert(node.scrollWidth <= node.clientWidth + 1, `Control contents overflow: ${JSON.stringify(node)}`);
      }
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run(document.querySelector('[data-iss-lighting-panel]'), {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
      });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, impact: v.impact,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []);
    result.checks.layout = layout; result.checks.accessibility = accessibility;
    result.errors = errors;
    result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    return result;
  } catch (error) {
    result.passed = false;
    result.failure = error.stack || error.message;
    result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-lighting-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result;
    throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        const cv = document.querySelector('.iss-station-stage canvas');
        cv?._issSetLighting?.({ playing: false });
        window.__destroy?.();
        return { contexts: window.__issQAContexts?.length || 0,
          lost: (window.__issQAContexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0, 'The proxy must observe a real WebGL context');
        assert(result.checks.cleanup.lost.every(Boolean), 'Destroy must release all observed WebGL contexts');
        assert.equal(result.checks.cleanup.canvases, 0, 'Destroy unmounts the station canvas');
        assert.deepEqual(errors, []);
      }
    } catch (error) {
      if (result.passed) {
        result.passed = false; result.failure = error.stack || error.message; error.qaResult = result;
        throw error;
      }
      result.cleanupFailure = error.stack || error.message;
    } finally { await page.close(); }
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const results = [], browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results }, null, 2) + '\n'); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`Map-lighting browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
