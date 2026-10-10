'use strict';

const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_VIEWPOINT_GLIDE_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/viewpoint-glides');
const preview = process.env.UNIVERSE_VIEWPOINT_GLIDE_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=53#universe-flight';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file));
const pins = Object.fromEntries(['stem_lab/stem_tool_universe.js', 'stem_lab/universe_flight_scene.js'].map(file => [file, hash(read(file))]));
for (const file of Object.keys(pins)) assert.deepEqual(read(file), read('desktop/web-app/public/' + file));
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, focusOnly: !!process.env.UNIVERSE_VIEWPOINT_GLIDE_FOCUS_ONLY, pins, harnessHash: hash(fs.readFileSync(__filename)), checks: [], accessibility: [], captures: [], views: [], served: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'browser-check.json'), JSON.stringify(result, null, 2) + '\n');
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
function sameView(actual, expected) {
  assert.deepEqual(actual.settings, expected.settings); assert.equal(actual.targetId, expected.targetId);
  for (const key of ['distanceLy', 'universeYears', 'travelerYears', 'pitch']) near(actual.state[key], expected.state[key]);
  actual.state.position.forEach((value, index) => near(value, expected.state.position[index]));
  near(Math.sin(actual.state.yaw), Math.sin(expected.state.yaw)); near(Math.cos(actual.state.yaw), Math.cos(expected.state.yaw));
}
function sampleInvariant(record, info) {
  const glide = info.viewpointGlide, origin = record.before.state.position.map((value, i) => value - record.center[i]);
  const radius = Math.hypot(...origin), horizontal = Math.hypot(origin[0], origin[2]);
  const azimuth = Math.atan2(origin[0], origin[2]), elevation = Math.atan2(origin[1], horizontal);
  const eased = glide.progress ** 2 * (3 - 2 * glide.progress), vertical = ['up', 'down'].includes(record.direction);
  const angle = vertical ? elevation + (record.plan.elevationDeg * Math.PI / 180 - elevation) * eased : azimuth + (record.direction === 'left' ? 1 : -1) * record.degrees * Math.PI / 180 * eased;
  const expected = vertical ? [radius * Math.cos(angle) * Math.sin(azimuth), radius * Math.sin(angle), radius * Math.cos(angle) * Math.cos(azimuth)] : [horizontal * Math.sin(angle), origin[1], horizontal * Math.cos(angle)];
  info.position.forEach((value, i) => near(value, record.center[i] + expected[i]));
  near(info.target.distanceLy, radius); near(glide.rangeLy, radius); near(glide.distanceLy, record.plan.distanceLy);
  near(info.distanceLy - record.before.state.distanceLy, record.plan.distanceLy * eased);
  near(info.target.screen[0], .5); near(info.target.screen[1], .5);
  assert.equal(info.universeYears, record.before.state.universeYears); assert.equal(info.travelerYears, record.before.state.travelerYears);
  assert.equal(info.motion.kind, 'glide'); assert.equal(glide.durationSeconds, 3);
  assert.equal(info.distanceGlide.active || info.flyby.active || info.orbit.active || info.navigation.active, false);
}

async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, hasTouch: true, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(60000); const pending = [];
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', response => { const pathname = new URL(response.url()).pathname; if (pins[pathname.slice(1)] && response.status() === 200) pending.push(response.body().then(body => result.served.push({ path: pathname, hash: hash(body) }))); });
    await page.addInitScript(() => {
      window.__allocations = 0; window.__viewpointLaunches = []; window.__viewpointSteps = [];
      for (const prototype of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) for (const key of ['createBuffer', 'createTexture', 'createProgram']) {
        const original = prototype[key]; prototype[key] = function (...args) { window.__allocations++; return original.apply(this, args); };
      }
      // Control only the native flight renderer's frame clock. React, layout,
      // focus callbacks and the browser keep their usual animation scheduling.
      const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window), frames = new Map();
      let nextId = -1, time = 10000;
      window.requestAnimationFrame = function (callback) {
        if (callback.name === 'frame' && callback.toString().includes('glideFrame')) { const id = nextId--; frames.set(id, callback); return id; }
        return raf(callback);
      };
      window.cancelAnimationFrame = function (id) { if (id < 0) frames.delete(id); else cancel(id); };
      window.__tickScene = function (seconds = 0) { time += seconds * 1000; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const scene = create.call(this, canvas, { ...options, onTelemetry(info) { window.__info = info; options.onTelemetry?.(info); }, onStatus(status) { window.__status = status; options.onStatus?.(status); } });
          for (const [method, records] of [['startViewpointGlide', __viewpointLaunches], ['stepOrbitView', __viewpointSteps]]) {
            const original = scene[method]; scene[method] = function (id, direction, degrees) {
              const before = scene.snapshot(), plan = method === 'startViewpointGlide' ? scene.planViewpointGlide(id, direction, degrees) : scene.planOrbitView(id, direction, degrees), allocations = __allocations;
              const center = value.landmarks(before.settings.region).find(item => item.id === id)?.position;
              const success = original.call(this, id, direction, degrees);
              records.push({ before, after: scene.snapshot(), id, direction, degrees, plan, center, success, allocations, afterAllocations: __allocations }); return success;
            };
          }
          window.__scene = scene; window.__canvas = canvas; return scene;
        }; api = value;
      } });
    });
    await page.goto(preview); await page.waitForFunction(() => window.__status?.state === 'ready' && window.__info?.viewpointGlide);
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    const stage = page.locator('.uf-stage'), panel = stage.locator('.uf-inspector'), perspective = panel.locator('.uf-inspector-perspective');
    const back = stage.getByRole('button', { name: 'Return to previous view', exact: true });
    const action = direction => perspective.locator('[data-perspective-step="' + direction + '"]');
    const style = name => perspective.locator('[data-distance-style="' + name + '"]');
    const footer = name => panel.locator('.uf-inspector-actions').getByRole('button', { name, exact: true });
    const details = () => panel.getByRole('button', { name: 'Details', exact: true });
    const snapshot = () => page.evaluate(() => __scene.snapshot()), info = () => page.evaluate(() => __info);
    async function tick(seconds = 0, count = 1) { await page.evaluate(({ seconds, count }) => { for (let i = 0; i < count; i++) __tickScene(seconds); __scene.set({}); }, { seconds, count }); }
    async function controls() { if (await details().getAttribute('aria-expanded') !== 'true') await details().click(); if (!await perspective.evaluate(node => node.open)) await perspective.locator('summary').click(); }
    async function scenic(region, id, view) {
      await page.locator('#uf-region').selectOption(region);
      if (view === 'vista-barred') {
        await page.locator('.uf-vistas').getByRole('button', { name: /^Barred spiral overlook/ }).click();
        await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
        await tick(); await controls(); return;
      }
      const name = await page.evaluate(({ region, id }) => UniverseFlight.landmarks(region).find(target => target.id === id).name, { region, id });
      await page.locator('.uf-destination-list').getByRole('button', { name: 'Select destination: ' + name, exact: true }).click();
      await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
      await controls(); await panel.locator('[data-inspector-view="' + view + '"]').click(); await tick(); await controls();
    }
    async function fullscreen() { await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await tick(); }
    async function paused() {
      assert.equal((await info()).running, false); const before = await snapshot(), pixels = await page.evaluate(() => __scene.capture());
      await tick(.5, 3); sameView(await snapshot(), before); assert.deepEqual(await page.evaluate(() => __scene.capture()), pixels);
      assert.equal(await page.evaluate(() => __canvas.getContext('webgl').getError()), 0);
    }
    async function axeCheck(name) {
      const violations = await stage.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })));
      result.accessibility.push({ name, violations }); assert.deepEqual(violations, []); save();
    }
    async function capture(name) { await stage.screenshot({ path: path.join(report, name + '.png') }); result.captures.push({ name, hash: hash(fs.readFileSync(path.join(report, name + '.png'))) }); save(); }
    async function reachable() {
      for (const control of [action('left'), action('right'), action('up'), action('down'), style('step'), style('glide')]) {
        await control.scrollIntoViewIfNeeded(); assert.equal(await control.evaluate(button => { const rect = button.getBoundingClientRect(); return rect.width < 44 || rect.height < 44 || rect.left < 0 || rect.right > innerWidth + 1 || rect.top < 0 || rect.bottom > innerHeight + 1 || !button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)); }), false);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    async function launch(direction, degrees = 15) {
      await controls(); if (await style('glide').getAttribute('aria-pressed') !== 'true') await style('glide').click();
      await perspective.getByRole('button', { name: degrees + ' degree viewpoint steps', exact: true }).click();
      const before = await snapshot(), pixels = await page.evaluate(() => __scene.capture().dataUrl);
      await action(direction).focus(); await action(direction).press('Enter'); await tick();
      const record = await page.evaluate(() => __viewpointLaunches.at(-1));
      assert.equal(record.success, true); sameView({ ...record.after, state: { ...record.after.state, yaw: record.before.state.yaw, pitch: record.before.state.pitch } }, record.before);
      assert.deepEqual(record.before, before); assert.equal(record.afterAllocations, record.allocations);
      assert.equal(await back.count(), 1); assert.equal((await info()).viewpointGlide.progress, 0);
      await tick(.5, 3); const middle = await info(); sampleInvariant(record, middle); near(middle.viewpointGlide.progress, .5);
      assert.notEqual(await page.evaluate(() => __scene.capture().dataUrl), pixels);
      assert.ok(await action(direction).evaluate(button => document.activeElement === button), 'The focused launch action remains mounted');
      for (const dir of ['left', 'right', 'up', 'down']) assert.equal(await action(dir).getAttribute('aria-disabled'), 'true');
      assert.equal(await style('step').isDisabled(), true); assert.equal(await style('glide').isDisabled(), true);
      await footer('Pause glide').click(); await tick(); await paused();
      const frozen = (await info()).viewpointGlide, launches = await page.evaluate(() => __viewpointLaunches.length);
      await action('left').press('Enter'); assert.equal(await page.evaluate(() => __viewpointLaunches.length), launches);
      assert.deepEqual((await info()).viewpointGlide, frozen);
      const progress = panel.getByRole('progressbar', { name: 'Viewpoint glide progress', exact: true });
      assert.equal(await progress.getAttribute('aria-valuenow'), '50'); assert.match(await progress.getAttribute('aria-valuetext'), /Glide paused/);
      return record;
    }
    async function arrive(record) {
      await footer('Resume glide').click(); await tick(); await tick(.5, 3);
      const after = await snapshot(), current = await info();
      assert.deepEqual(after.settings, record.before.settings); assert.deepEqual(after.state.position, record.plan.position);
      near(after.state.distanceLy - record.before.state.distanceLy, record.plan.distanceLy);
      for (const key of ['universeYears', 'travelerYears']) assert.equal(after.state[key], record.before.state[key]);
      assert.equal(current.viewpointGlide.completed, true); assert.equal(current.viewpointGlide.active || current.running, false);
      near(current.target.distanceLy, record.plan.radiusLy); near(current.target.screen[0], .5); near(current.target.screen[1], .5);
      assert.equal(await page.evaluate(() => __allocations), record.allocations);
      assert.match(await panel.getByRole('progressbar', { name: 'Viewpoint glide progress', exact: true }).getAttribute('aria-valuetext'), /Arrived/);
      await paused(); return after;
    }

    if (!result.focusOnly) {
    const scenes = [['neighborhood', 'amber-star', 'stellar-amber'], ['neighborhood', 'blue-nebula', 'nebula-filaments'], ['galaxy', 'galactic-center', 'halo-panorama'], ['cosmic', 'golden-elliptical', 'group-elliptical'], ['cosmic', 'distant-galaxy', 'vista-barred']];
    for (const [region, id, view] of scenes) {
      await scenic(region, id, view); if (id === 'amber-star') await panel.getByRole('button', { name: 'Detail 10° lens', exact: true }).click();
      await tick(); await fullscreen();
      for (const direction of ['left', 'right', 'up', 'down']) {
        const record = await launch(direction); const after = await arrive(record);
        result.views.push({ region, id, direction, from: record.before.state.position, to: after.state.position, arcLy: record.plan.distanceLy, radiusLy: record.plan.radiusLy });
        if (direction === 'up') { await capture('viewpoint-' + id); await axeCheck('viewpoint-' + id); }
        await back.click(); await tick(); sameView(await snapshot(), record.before); await paused(); await controls();
      }
      await fullscreen();
    }
    check('Twenty fixed-range angular glides across stars, cloud, spiral, elliptical and barred galaxy follow independent arc samples, change pixels, reach exact endpoints, preserve lenses/clocks and restore exact paused Back without GPU allocations');
    await scenic('neighborhood', 'amber-star', 'stellar-amber'); await style('step').click();
    const steppedOrigin = await snapshot(), count = await page.evaluate(() => __viewpointLaunches.length);
    await action('up').click(); await tick(); const step = await page.evaluate(() => __viewpointSteps.at(-1));
    assert.equal(step.success, true); assert.deepEqual((await snapshot()).state.position, step.plan.position);
    assert.equal(await page.evaluate(() => __viewpointLaunches.length), count); await paused(); await back.click(); await tick(); sameView(await snapshot(), steppedOrigin);
    check('The shared Step style retains exact instantaneous perspective moves and reversible Back');

    await controls(); await style('glide').click();
    // Launch and activate Back in one DOM task, before any native frame.
    const immediate = await page.evaluate(() => { const before = __scene.snapshot(); document.querySelector('[data-perspective-step="left"]').click(); return before; });
    await page.waitForFunction(() => !!document.querySelector('.uf-inspector [aria-label="Return to previous view"]'));
    assert.equal((await info()).viewpointGlide.progress, 0); await back.click(); await tick(); sameView(await snapshot(), immediate); await paused();
    check('Back is available before the first movement frame and restores the launch origin immediately');
    const partial = await launch('right'), intermediate = await snapshot();
    await footer('End glide').click(); await tick(); sameView(await snapshot(), intermediate);
    assert.equal((await info()).viewpointGlide.active || (await info()).viewpointGlide.completed, false);
    assert.ok(await details().evaluate(button => document.activeElement === button)); await paused(); await back.click(); await tick(); sameView(await snapshot(), partial.before);
    check('End leaves the partial view paused, keeps Back, and returns focus to Details');

    await launch('up'); await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await page.waitForFunction(() => !__info.viewpointGlide.active && !__info.running);
    assert.equal(await style('step').getAttribute('aria-pressed'), 'true'); await tick(); await paused(); await fullscreen();
    await reachable(); await axeCheck('viewpoint-reduced-motion-colors'); await capture('viewpoint-reduced-motion-colors'); await fullscreen();
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    check('Live reduced motion ends the angular glide at the current view and selects Step; system colors preserve controls');

    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport); await scenic('neighborhood', 'amber-star', 'stellar-amber'); await fullscreen(); const record = await launch('left', 5);
      await reachable(); await axeCheck('viewpoint-' + viewport.width); await capture('viewpoint-' + viewport.width);
      await back.click(); await tick(); sameView(await snapshot(), record.before); await paused(); await fullscreen();
    }
    check('Phone and short landscape preserve reachable angular controls, progress and paused Back without overflow');
    await page.setViewportSize({ width: 1280, height: 850 }); await scenic('cosmic', 'golden-elliptical', 'group-elliptical'); await fullscreen();
    await page.addStyleTag({ content: '.uf-inspector *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}' });
    const spaced = await launch('down', 5); await reachable(); await axeCheck('viewpoint-text-spacing'); await capture('viewpoint-text-spacing');
    await action('down').press('Escape'); assert.equal(await panel.count(), 0); assert.equal((await info()).running, false); assert.ok(await page.evaluate(() => document.activeElement === __canvas));
    await back.click(); await tick(); sameView(await snapshot(), spaced.before); await fullscreen();
    check('Text spacing and Escape preserve accessible movement and return history');

    await scenic('neighborhood', 'amber-star', 'stellar-amber'); await style('glide').click(); const completed = await launch('left'); await arrive(completed);
    const rejectedCancel = await page.evaluate(() => { const before = __scene.snapshot(), glide = __info.viewpointGlide; const success = __scene.cancelViewpointGlide(); return { before, after: __scene.snapshot(), glide, afterGlide: __info.viewpointGlide, success }; });
    assert.equal(rejectedCancel.success, false); assert.deepEqual(rejectedCancel.after, rejectedCancel.before); assert.deepEqual(rejectedCancel.afterGlide, rejectedCancel.glide);
    await page.evaluate(() => __scene.view('forward')); await tick(); assert.equal((await info()).viewpointGlide.completed, false); assert.equal(await panel.getByRole('progressbar').count(), 0);
    check('Completed progress survives an inactive cancel and clears when manual camera control takes over');
    const cross = await page.evaluate(() => {
      const checks = [];
      for (const type of ['viewpoint', 'distance']) {
        __scene.set({ running: false }); const started = type === 'viewpoint' ? __scene.startViewpointGlide('amber-star', 'up', 15) : __scene.startDistanceGlide('amber-star', 'farther');
        const before = __scene.snapshot(), allocations = __allocations;
        const success = type === 'viewpoint' ? __scene.startDistanceGlide('amber-star', 'closer') : __scene.startViewpointGlide('amber-star', 'left', 15);
        checks.push({ started, success, before, after: __scene.snapshot(), allocations, afterAllocations: __allocations });
        __scene.cancelDistanceGlide(); __scene.cancelViewpointGlide();
      }
      return checks;
    });
    for (const item of cross) { assert.equal(item.started, true); assert.equal(item.success, false); assert.deepEqual(item.after, item.before); assert.equal(item.afterAllocations, item.allocations); }
    await tick(); await paused(); check('Distance and viewpoint glides reject overlapping launches atomically');
    }

    await scenic('neighborhood', 'amber-star', 'stellar-amber'); await style('glide').click();
    await page.evaluate(() => {
      const saved = __scene.snapshot(), target = UniverseFlight.landmarks('neighborhood').find(item => item.id === 'amber-star'), radius = 2;
      saved.state.position = target.position.map((value, index) => value + [0, radius * Math.sin(80 * Math.PI / 180), radius * Math.cos(80 * Math.PI / 180)][index]);
      __scene.restore(saved); __scene.focusTarget('amber-star');
    });
    await tick(); await controls(); await perspective.getByRole('button', { name: '15 degree viewpoint steps', exact: true }).click();
    await action('up').focus(); await action('up').press('Enter'); await tick(); await tick(.5, 3);
    result.limitSample = await page.evaluate(() => ({ info: __info, snapshot: __scene.snapshot(), launch: __viewpointLaunches.at(-1), step: __viewpointSteps.at(-1), style: document.querySelector('[data-distance-style="glide"]').getAttribute('aria-pressed'), buttons: [...document.querySelectorAll('[data-perspective-step]')].map(button => ({ direction: button.dataset.perspectiveStep, disabled: button.disabled, busy: button.getAttribute('aria-disabled') })) })); save();
    assert.equal(await action('up').evaluate(button => button.disabled), false); assert.equal(await action('up').getAttribute('aria-disabled'), 'true');
    assert.ok(await action('up').evaluate(button => document.activeElement === button)); await tick(.5, 3);
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Details');
    assert.equal(await action('up').isDisabled(), true); assert.equal(await action('down').isDisabled(), false);
    near((await info()).pitch, -85 * Math.PI / 180); await paused();
    check('A glide clipped at 85 degrees keeps its initiating action focusable in motion, then transfers focus to Details when that direction is exhausted');
    await page.evaluate(() => {
      const saved = __scene.snapshot(), target = UniverseFlight.landmarks('neighborhood').find(item => item.id === 'amber-star');
      saved.state.position = target.position.map((value, index) => value + (index === 1 ? 2 : 0)); __scene.restore(saved);
    });
    await tick(); await controls(); assert.equal(await action('down').isDisabled(), true);
    await style('step').click(); assert.equal(await action('down').isDisabled(), false); await action('down').click(); await tick();
    await style('glide').click(); assert.equal(await action('down').isDisabled(), false); await paused();
    check('Glide planning disables pole moves that cannot stay centered; Step moves away from the pole and restores smooth movement');

    await page.locator('.uf-modes').getByRole('button', { name: 'Einstein’s light chase', exact: true }).click();
    const physical = await page.evaluate(() => { const before = __scene.snapshot(); const success = __scene.startViewpointGlide('amber-star', 'up', 15); return { before, after: __scene.snapshot(), success }; });
    assert.equal(physical.success, false); assert.deepEqual(physical.after, physical.before); assert.equal(await panel.count(), 0);
    check('Physical light-chase mode rejects viewpoint glides without mutation');
    await Promise.all(pending);
    for (const [file, pin] of Object.entries(pins)) { assert.equal(hash(read(file)), pin); const served = result.served.filter(item => item.path === '/' + file); assert.ok(served.length && served.every(item => item.hash === pin)); }
    assert.deepEqual(result.errors, []); result.completed = true; save();
    console.log(JSON.stringify({ completed: true, checks: result.checks.length, accessibility: result.accessibility.length, captures: result.captures.length, views: result.views.length }));
  } finally { await browser.close(); }
}
main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
