'use strict';

const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_PROMINENCE_VISTA_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/prominence-edges');
const preview = process.env.UNIVERSE_PROMINENCE_VISTA_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=56#universe-flight';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file));
const pins = Object.fromEntries(['stem_lab/stem_tool_universe.js', 'stem_lab/universe_flight_scene.js'].map(file => [file, hash(read(file))]));
for (const file of Object.keys(pins)) assert.deepEqual(read(file), read('desktop/web-app/public/' + file));
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, pins, harnessHash: hash(fs.readFileSync(__filename)), startup: [], loaderRetries: [], checks: [], accessibility: [], captures: [], poses: [], detailMeasurements: [], served: [], servedReadErrors: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'vista-browser-check.json'), JSON.stringify(result, null, 2) + '\n');
save();
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
const expected = { title: 'Amber stellar limb', position: [-2.8705938420238812, 1.5515762513665616, 8.443995950047807], center: [-3.1, 1, 8.5], range: .6, targetId: 'amber-star', fov: 18 };
const previous = ['The stellar sea', 'Beside the amber star', 'Blue cloud overlook', 'Violet cloud overlook'];
const near = (actual, wanted, epsilon = 1e-9) => assert.ok(Math.abs(actual - wanted) <= epsilon * Math.max(1, Math.abs(wanted)), `${actual} != ${wanted}`);
const range = position => Math.hypot(...position.map((value, index) => value - expected.center[index]));
function sameView(actual, wanted) {
  assert.deepEqual(actual.settings, wanted.settings); assert.equal(actual.targetId, wanted.targetId);
  actual.state.position.forEach((value, index) => near(value, wanted.state.position[index]));
  for (const key of ['pitch', 'distanceLy', 'universeYears', 'travelerYears']) near(actual.state[key], wanted.state[key]);
  near(Math.sin(actual.state.yaw), Math.sin(wanted.state.yaw)); near(Math.cos(actual.state.yaw), Math.cos(wanted.state.yaw));
}

async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const pending = [];
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, hasTouch: true, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pins[pathname.slice(1)] && response.status() === 200) pending.push(response.body()
        .then(body => result.served.push({ path: pathname, hash: hash(body) }))
        .catch(error => { result.servedReadErrors.push({ path: pathname, error: String(error) }); save(); }));
    });
    await page.addInitScript(() => {
      // Advance only the native scene clock. Browser layout, focus callbacks,
      // React and accessibility checks keep their usual frame scheduling.
      const raf = requestAnimationFrame.bind(window), cancel = cancelAnimationFrame.bind(window), frames = new Map();
      let id = -1, time = 10000;
      window.requestAnimationFrame = function (callback) {
        if (callback.name === 'frame' && callback.toString().includes('glideFrame')) { const next = id--; frames.set(next, callback); return next; }
        return raf(callback);
      };
      window.cancelAnimationFrame = function (value) { if (value < 0) frames.delete(value); else cancel(value); };
      window.__tickProminenceScene = function (seconds = 0) { time += seconds * 1000; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const scene = create.call(this, canvas, { ...options,
            onTelemetry(info) { window.__prominenceInfo = info; options.onTelemetry?.(info); },
            onStatus(status) { window.__prominenceStatus = status; options.onStatus?.(status); } });
          window.__prominenceScene = scene; window.__prominenceCanvas = canvas; return scene;
        }; api = value;
      } });
    });
    async function startupDiagnostic(name) {
      const diagnostic = await page.evaluate(() => {
        const canvas = window.__prominenceCanvas || document.querySelector('.uf-stage canvas'), stage = document.querySelector('.uf-stage');
        let glError = null; try { const gl = canvas?.getContext('webgl'); if (gl) glError = gl.getError(); } catch (error) { glError = String(error); }
        return { apiPresent: !!window.UniverseFlight, hookedCreate: !!window.UniverseFlight?.create?.toString().includes('__prominenceScene'),
          scenePresent: !!window.__prominenceScene, status: window.__prominenceStatus || null, telemetryPresent: !!window.__prominenceInfo,
          stagePresent: !!stage, sceneText: stage?.innerText.slice(0, 700) || '',
          canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, glError } : null };
      });
      result.startup.push({ name, ...diagnostic }); save(); console.log('Startup ' + JSON.stringify({ name, ...diagnostic }));
    }
    await page.goto(preview); await startupDiagnostic('loaded');
    const retry = page.getByRole('button', { name: 'Retry 3D view', exact: true });
    if (await retry.isVisible() && await page.evaluate(() => !!window.UniverseFlight?.create)) {
      result.loaderRetries.push({ action: 'Retry 3D view', reason: 'The local renderer became available after the existing UI loader timeout', nativeApiAvailable: true }); save();
      await retry.click(); await startupDiagnostic('retried');
    }
    try { await page.waitForFunction(() => window.__prominenceStatus?.state === 'ready' && window.__prominenceScene); }
    catch (error) { await startupDiagnostic('ready-wait-failed'); throw error; }
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    const stage = page.locator('.uf-stage'), controls = stage.locator('#uf-inview-controls');
    const snapshot = () => page.evaluate(() => __prominenceScene.snapshot()), info = () => page.evaluate(() => __prominenceInfo);
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function tick(seconds = 0, count = 1) {
      await page.evaluate(({ seconds, count }) => { for (let index = 0; index < count; index++) __tickProminenceScene(seconds); __prominenceScene.set({}); }, { seconds, count });
      await frames();
    }
    async function paused() {
      assert.equal((await info()).running, false); const pose = await snapshot(), image = hash((await page.evaluate(() => __prominenceScene.capture())).dataUrl);
      await tick(.5, 3); sameView(await snapshot(), pose);
      assert.equal(hash((await page.evaluate(() => __prominenceScene.capture())).dataUrl), image, 'Paused stellar pixels stay fixed');
      assert.equal(await page.evaluate(() => __prominenceCanvas.getContext('webgl').getError()), 0);
      return pose;
    }
    async function assertPose(name) {
      await tick(); const pose = await paused(), current = await info();
      assert.equal(pose.settings.mode, 'explore'); assert.equal(pose.settings.region, 'neighborhood'); assert.equal(pose.settings.fov, expected.fov);
      assert.equal(pose.settings.exposure, 1); assert.equal(pose.targetId, expected.targetId);
      pose.state.position.forEach((value, index) => near(value, expected.position[index])); near(range(pose.state.position), expected.range);
      const direction = expected.center.map((value, index) => (value - pose.state.position[index]) / expected.range);
      near(Math.sin(pose.state.yaw) * Math.cos(pose.state.pitch), direction[0]); near(Math.sin(pose.state.pitch), direction[1]); near(Math.cos(pose.state.yaw) * Math.cos(pose.state.pitch), direction[2]);
      near(current.target.distanceLy, expected.range); near(current.target.screen[0], .5); near(current.target.screen[1], .5);
      assert.equal(current.target.id, expected.targetId); assert.equal(current.orbit.active || current.navigation.active || current.flyby.active, false);
      for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(pose.state[key], 0);
      result.poses.push({ name, snapshot: pose }); save(); return pose;
    }
    async function capture(name) {
      const filename = 'vista-' + name + '.png'; await stage.screenshot({ path: path.join(report, filename) });
      result.captures.push({ name, file: filename, hash: hash(fs.readFileSync(path.join(report, filename))) }); save();
    }
    async function accessible(name, scope = ['.uf-stage']) {
      const violations = await page.evaluate(async selectors => (await axe.run({ include: selectors.map(selector => [selector]) }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), scope);
      result.accessibility.push({ name, violations }); assert.deepEqual(violations, [], name + ' has no scoped accessibility violations'); save();
    }
    async function reachable(control) {
      await control.scrollIntoViewIfNeeded(); const bounds = await control.evaluate(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height,
          viewport: [innerWidth, innerHeight], covered: !node.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) };
      });
      assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport[0] + 1 && bounds.top >= -1 && bounds.bottom <= bounds.viewport[1] + 1, 'Scenic control fits the viewport');
      assert.ok(bounds.width >= 44 && bounds.height >= 40, 'Scenic control is a usable touch target'); assert.equal(bounds.covered, false, 'Scenic control remains reachable');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow');
    }
    async function normal(name) {
      await page.locator('#uf-region').selectOption('neighborhood'); const list = page.locator('.uf-vista-list');
      assert.equal(await list.getByRole('button').count(), 5); const names = await list.getByRole('button').allTextContents();
      previous.forEach((title, index) => assert.ok(names[index].includes(title), 'Existing scenic view indices stay in place')); assert.ok(names[4].includes(expected.title));
      const control = list.getByRole('button', { name: new RegExp(expected.title) }); await reachable(control); await control.click();
      await assertPose(name); assert.equal(await page.locator('#uf-fov').inputValue(), '18');
      await accessible(name, ['.uf-stage', '.uf-vistas']); await capture(name);
    }
    async function detail(name) {
      const inspector = stage.locator('.uf-inspector');
      if (!await inspector.count()) await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
      await inspector.waitFor({ state: 'visible' });
      if (await inspector.getByRole('button', { name: 'Details', exact: true }).getAttribute('aria-expanded') !== 'true') await inspector.getByRole('button', { name: 'Details', exact: true }).click();
      const lens = inspector.getByRole('button', { name: 'Detail 10° lens', exact: true });
      await reachable(lens); const origin = await paused(); assert.equal(origin.settings.fov, 18);
      async function surface() {
        return page.evaluate(async () => {
          const capture = __prominenceScene.capture(), image = new Image(); image.src = capture.dataUrl; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const warm = new Uint8Array(canvas.width * canvas.height), queue = new Int32Array(warm.length);
          for (let pixel = 0; pixel < warm.length; pixel++) {
            const index = pixel * 4, red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
            warm[pixel] = red >= 100 && green >= 45 && red > green * 1.05 && green > blue * 1.15 ? 1 : 0;
          }
          // The largest connected bright warm area isolates the photosphere
          // from tiny distant stars and the faint outer halo.
          let largest = { count: 0, left: canvas.width, right: -1, top: canvas.height, bottom: -1 };
          for (let start = 0; start < warm.length; start++) {
            if (!warm[start]) continue; let head = 0, tail = 1; queue[0] = start; warm[start] = 0;
            const component = { count: 0, left: canvas.width, right: -1, top: canvas.height, bottom: -1 };
            while (head < tail) {
              const pixel = queue[head++], x = pixel % canvas.width, y = Math.floor(pixel / canvas.width); component.count++;
              component.left = Math.min(component.left, x); component.right = Math.max(component.right, x);
              component.top = Math.min(component.top, y); component.bottom = Math.max(component.bottom, y);
              for (const neighbor of [x > 0 ? pixel - 1 : -1, x + 1 < canvas.width ? pixel + 1 : -1, y > 0 ? pixel - canvas.width : -1, y + 1 < canvas.height ? pixel + canvas.width : -1]) {
                if (neighbor >= 0 && warm[neighbor]) { warm[neighbor] = 0; queue[tail++] = neighbor; }
              }
            }
            if (component.count > largest.count) largest = component;
          }
          return { width: canvas.width, height: canvas.height, surfacePixels: largest.count,
            bounds: { left: largest.left, right: largest.right, top: largest.top, bottom: largest.bottom, width: largest.right - largest.left + 1, height: largest.bottom - largest.top + 1 } };
        });
      }
      const before = await surface(); await lens.click(); await tick();
      const changed = await paused(); sameView(changed, { ...origin, settings: { ...origin.settings, fov: 10 } });
      assert.equal(await lens.getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('#uf-fov').inputValue(), '10'); await reachable(lens);
      const after = await surface(); assert.equal(after.width, before.width); assert.equal(after.height, before.height);
      assert.ok(before.surfacePixels >= 64, 'The initial limb view contains a measurable stellar surface');
      assert.ok(after.surfacePixels > before.surfacePixels * 1.5, 'The Detail lens visibly enlarges the stellar surface');
      assert.ok(after.bounds.width > before.bounds.width * 1.3 && after.bounds.height > before.bounds.height * 1.3, 'The Detail lens enlarges both stellar surface dimensions');
      result.detailMeasurements.push({ name, before, after, areaRatio: after.surfacePixels / before.surfacePixels, snapshot: changed }); save();
      await accessible(name); await capture(name);
      await inspector.getByRole('button', { name: 'Close landmark inspector', exact: true }).click();
    }
    async function enter() {
      await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement === document.querySelector('.uf-stage')); await tick();
    }
    async function exit() {
      await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement); await tick();
    }
    async function fullscreen(name) {
      await enter(); await stage.getByRole('button', { name: 'Flight controls', exact: true }).click(); await controls.waitFor({ state: 'visible' });
      await controls.locator('#uf-inview-tab-explore').click(); const control = controls.locator('#uf-inview-vista');
      const options = await control.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, label: node.textContent })));
      assert.deepEqual(options.slice(1, 5).map(option => option.label), previous); assert.deepEqual(options[5], { value: '4', label: expected.title });
      await reachable(control); await accessible(name + '-menu'); await control.selectOption('4');
      await page.waitForFunction(() => !document.querySelector('#uf-inview-controls') && document.activeElement === __prominenceCanvas);
      assert.equal(await page.evaluate(() => document.fullscreenElement === document.querySelector('.uf-stage')), true);
      await assertPose(name); await accessible(name); await capture(name); await exit();
    }

    await normal('desktop');
    check('The appended stellar limb scenic button preserves existing indices and opens the exact paused Amber star pose, selected target, 18 degree lens and zero journey counters');
    const origin = await snapshot();
    await page.locator('#uf-target-info').getByRole('button', { name: 'Orbit destination', exact: true }).click(); await frames(); await tick(); await tick(.25, 4);
    const orbit = await snapshot(), orbitInfo = await info(); assert.equal(orbitInfo.orbit.active, true); assert.equal(orbitInfo.running, true);
    assert.notDeepEqual(orbit.state.position, origin.state.position); near(range(orbit.state.position), expected.range);
    assert.equal(orbit.state.position[1], origin.state.position[1]); assert.equal(orbit.settings.fov, 18); assert.equal(orbit.settings.exposure, 1);
    assert.equal(orbit.state.universeYears, 0); assert.equal(orbit.state.travelerYears, 0); near(orbitInfo.target.screen[0], .5); near(orbitInfo.target.screen[1], .5);
    await page.locator('.uf-transport').getByRole('button', { name: 'Pause travel', exact: true }).click(); await tick(); await paused();
    await page.locator('#uf-target-info').getByRole('button', { name: 'End orbit', exact: true }).click(); await tick(); assert.equal((await info()).orbit.active, false);
    await normal('desktop-after-orbit');
    check('An actual Orbit destination action moves around the limb view at fixed range and height, keeps the narrow lens and physical clocks, and pauses cleanly');

    const notes = page.locator('#uf-field-notes'); if (!await notes.evaluate(node => node.open)) await notes.locator('summary').click();
    await notes.locator('#uf-view-name').fill('Amber limb verification'); await notes.locator('#uf-view-note').fill('A paused look along the generated stellar limb.');
    await notes.getByRole('button', { name: 'Save current view', exact: true }).click();
    const saved = await snapshot(); await page.locator('.uf-vista-list').getByRole('button', { name: /The stellar sea/ }).click(); await tick();
    await notes.getByRole('button', { name: 'Return to saved view: Amber limb verification', exact: true }).click(); await tick(); sameView(await snapshot(), saved); await assertPose('saved-return');
    await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
    const inspector = stage.locator('.uf-inspector'), perspective = inspector.locator('.uf-inspector-perspective');
    if (await inspector.getByRole('button', { name: 'Details', exact: true }).getAttribute('aria-expanded') !== 'true') await inspector.getByRole('button', { name: 'Details', exact: true }).click();
    if (!await perspective.evaluate(node => node.open)) await perspective.locator('summary').click();
    await perspective.locator('[data-distance-style="step"]').click(); const beforeStep = await snapshot();
    await perspective.locator('[data-perspective-step="right"]').click(); await tick(); assert.notDeepEqual((await snapshot()).state.position, beforeStep.state.position);
    await stage.getByRole('button', { name: 'Return to previous view', exact: true }).click(); await tick(); sameView(await snapshot(), beforeStep); await assertPose('back-return');
    await accessible('saved-and-back-return'); check('Field notes save and restore the new limb vista, and Back restores its exact pose after an actual perspective step');
    await normal('desktop-fullscreen-origin'); await fullscreen('desktop-fullscreen');
    check('Fullscreen Explore exposes the new scenic option and restores the exact paused limb pose with focus on the canvas');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport); await normal('reduced-motion-' + viewport.width); await detail('reduced-motion-detail-' + viewport.width);
      await normal('reduced-motion-detail-reset-' + viewport.width); await fullscreen('reduced-motion-fullscreen-' + viewport.width);
    }
    check('Phone and short landscape scenic controls stay reachable without overflow, including fullscreen and reduced motion');
    check('Phone and short landscape Detail 10 degree lenses enlarge the measured stellar surface while preserving its exact paused camera pose, selected target and journey counters');
    await page.setViewportSize({ width: 1280, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await normal('system-colors'); await fullscreen('system-colors-fullscreen');
    check('System colors preserve the scenic actions and paused viewport');
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
    const spacing = await page.addStyleTag({ content: '.uf-vistas *,#uf-inview-controls *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}' });
    await normal('text-spacing'); await fullscreen('text-spacing-fullscreen'); await spacing.evaluate(node => node.remove());
    check('Expanded text spacing preserves scenic action reachability and fullscreen focus');

    await Promise.all(pending);
    assert.deepEqual(result.servedReadErrors, [], 'Pinned source response bodies load successfully');
    for (const [file, pin] of Object.entries(pins)) { assert.equal(hash(read(file)), pin, 'Runtime stays fixed during verification'); const served = result.served.filter(item => item.path === '/' + file); assert.ok(served.length && served.every(item => item.hash === pin), 'Preview serves the pinned runtime'); }
    assert.deepEqual(result.errors, [], 'No page errors occur'); result.completed = true; save();
    console.log(JSON.stringify({ completed: true, checks: result.checks.length, accessibility: result.accessibility.length, captures: result.captures.length, poses: result.poses.length }));
  } catch (error) {
    // Preserve the workflow error before browser cleanup can reject requests.
    result.failure = String(error); save(); throw error;
  } finally {
    const settled = Promise.allSettled(pending); let deadline;
    try { await Promise.race([settled, new Promise(resolve => { deadline = setTimeout(resolve, 10000); })]); }
    finally { clearTimeout(deadline); }
    await browser.close(); await settled; save();
  }
}
main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
