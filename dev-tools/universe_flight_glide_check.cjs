'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_DISTANCE_GLIDE_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/distance-glide');
const preview = process.env.UNIVERSE_DISTANCE_GLIDE_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=51#universe-flight';
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file));
const pins = Object.fromEntries(['stem_lab/stem_tool_universe.js', 'stem_lab/universe_flight_scene.js'].map(file => [file, hash(read(file))]));
for (const file of Object.keys(pins)) assert.deepEqual(read(file), read('desktop/web-app/public/' + file));
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, pins, harnessHash: hash(fs.readFileSync(__filename)), checks: [], accessibility: [], captures: [], views: [], served: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'browser-check.json'), JSON.stringify(result, null, 2) + '\n');
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
function sameView(actual, expected) {
  assert.deepEqual(actual.settings, expected.settings);
  assert.equal(actual.targetId, expected.targetId);
  for (const key of ['distanceLy', 'universeYears', 'travelerYears', 'pitch']) near(actual.state[key], expected.state[key]);
  actual.state.position.forEach((value, index) => near(value, expected.state.position[index]));
  near(Math.sin(actual.state.yaw), Math.sin(expected.state.yaw));
  near(Math.cos(actual.state.yaw), Math.cos(expected.state.yaw));
}
function stationaryLaunch(record) {
  assert.equal(record.success, true);
  assert.ok(record.plan);
  assert.deepEqual(record.after.settings, record.before.settings);
  assert.deepEqual(record.after.state.position, record.before.state.position, 'Starting a glide does not jump to another position');
  for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(record.after.state[key], record.before.state[key]);
  assert.equal(record.afterAllocations, record.allocations);
}

async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, hasTouch: true, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(60000);
    const pending = [];
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pins[pathname.slice(1)] && response.status() === 200) pending.push(response.body().then(body => result.served.push({ path: pathname, hash: hash(body) })));
    });
    await page.addInitScript(() => {
      window.__allocations = 0;
      window.__glides = [];
      window.__distanceSteps = [];
      for (const prototype of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) {
        for (const key of ['createBuffer', 'createTexture', 'createProgram']) {
          const original = prototype[key];
          prototype[key] = function (...args) { window.__allocations++; return original.apply(this, args); };
        }
      }
      let api;
      Object.defineProperty(window, 'UniverseFlight', {
        configurable: true,
        get() { return api; },
        set(value) {
          const create = value.create;
          value.create = function (canvas, options) {
            const scene = create.call(this, canvas, {
              ...options,
              onTelemetry(info) { window.__info = info; options.onTelemetry?.(info); },
              onStatus(status) { window.__status = status; options.onStatus?.(status); }
            });
            for (const [method, records] of [['startDistanceGlide', window.__glides], ['stepDistanceView', window.__distanceSteps]]) {
              const original = scene[method];
              scene[method] = function (id, direction) {
                const before = scene.snapshot(), plan = scene.planDistanceView(id, direction), allocations = window.__allocations;
                const success = original.call(this, id, direction);
                records.push({ before, after: scene.snapshot(), id, direction, plan, success, allocations, afterAllocations: window.__allocations });
                return success;
              };
            }
            window.__scene = scene;
            window.__canvas = canvas;
            return scene;
          };
          api = value;
        }
      });
    });
    await page.goto(preview);
    await page.waitForFunction(() => window.__status?.state === 'ready' && window.__info?.distanceGlide);
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });

    const stage = page.locator('.uf-stage');
    const panel = stage.locator('.uf-inspector');
    const perspective = panel.locator('.uf-inspector-perspective');
    const distance = perspective.locator('.uf-distance-steps');
    const progress = panel.getByRole('progressbar', { name: 'Distance glide progress', exact: true });
    const back = stage.getByRole('button', { name: 'Return to previous view', exact: true });
    const detailsButton = () => panel.getByRole('button', { name: 'Details', exact: true });
    const style = name => perspective.locator('[data-distance-style="' + name + '"]');
    const action = direction => distance.getByRole('button', { name: direction === 'closer' ? 'Move closer to landmark' : 'Move farther from landmark', exact: true });
    const footer = name => panel.locator('.uf-inspector-actions').getByRole('button', { name, exact: true });
    const snapshot = () => page.evaluate(() => __scene.snapshot());
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const telemetry = () => page.evaluate(() => __info);
    async function details() { if (await detailsButton().getAttribute('aria-expanded') !== 'true') await detailsButton().click(); }
    async function controls() { await details(); if (!await perspective.evaluate(node => node.open)) await perspective.locator('summary').click(); }
    async function fullscreen() { await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await frames(); }
    async function scenic(region, id, view) {
      await page.locator('#uf-region').selectOption(region);
      const name = await page.evaluate(({ region, id }) => UniverseFlight.landmarks(region).find(target => target.id === id).name, { region, id });
      await page.locator('.uf-destination-list').getByRole('button', { name: 'Select destination: ' + name, exact: true }).click();
      await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
      await details();
      await panel.locator('[data-inspector-view="' + view + '"]').click();
      await frames();
      await controls();
    }
    async function paused() {
      assert.equal(await page.evaluate(() => __info.running), false);
      const before = await snapshot();
      const image = await page.evaluate(() => __scene.capture());
      await page.waitForTimeout(220);
      await frames();
      sameView(await snapshot(), before);
      assert.deepEqual(await page.evaluate(() => __scene.capture()), image);
      assert.equal(await page.evaluate(() => __canvas.getContext('webgl').getError()), 0);
    }
    async function capture(name) {
      await stage.screenshot({ path: path.join(report, name + '.png') });
      result.captures.push({ name, hash: hash(fs.readFileSync(path.join(report, name + '.png'))) });
      save();
    }
    async function axeCheck(name) {
      const violations = await stage.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) })));
      result.accessibility.push({ name, violations });
      assert.deepEqual(violations, []);
      save();
    }
    async function reachable(names = ['closer', 'farther', 'glide', 'step']) {
      for (const name of names) {
        const control = ['glide', 'step'].includes(name) ? style(name) : ['closer', 'farther'].includes(name) ? action(name) : footer(name);
        await control.scrollIntoViewIfNeeded();
        const failure = await control.evaluate(button => {
          const rect = button.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44 || rect.left < 0 || rect.right > innerWidth + 1 || rect.top < 0 || rect.bottom > innerHeight + 1 || !button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
        });
        assert.equal(failure, false, name + ' remains reachable at the current viewport');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    async function expanded() {
      assert.equal(await perspective.evaluate(node => node.open), true);
      assert.equal(await detailsButton().getAttribute('aria-expanded'), 'true');
    }
    async function styles(selected, disabled = false) {
      for (const [name, label] of [['glide', 'Smooth inspection glides'], ['step', 'Instant inspection steps']]) {
        const control = style(name);
        assert.equal(await perspective.getByRole('button', { name: label, exact: true }).count(), 1);
        assert.equal(await control.getAttribute('aria-pressed'), String(name === selected));
        assert.equal(await control.isDisabled(), disabled);
      }
    }
    async function chooseGlide() {
      await controls();
      const before = await snapshot();
      if (await style('glide').getAttribute('aria-pressed') !== 'true') await style('glide').click();
      await styles('glide');
      sameView(await snapshot(), before);
    }
    async function readouts(active = false) {
      const current = await snapshot();
      for (const direction of ['closer', 'farther']) {
        const plan = await page.evaluate(({ id, direction }) => __scene.planDistanceView(id, direction), { id: current.targetId, direction });
        const control = action(direction);
        assert.equal(await control.getAttribute('data-distance-step'), direction);
        assert.equal(await control.evaluate(button => button.disabled), !plan);
        if (plan) assert.equal(await control.getAttribute('aria-disabled'), String(active));
        const description = await control.evaluate(button => {
          const readout = button.querySelector('small');
          const ids = (button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
          return { text: readout.textContent, id: readout.id, ids, resolved: ids.map(id => document.getElementById(id)?.textContent) };
        });
        assert.ok(description.id && description.ids.includes(description.id));
        assert.ok(description.resolved.every(Boolean) && description.resolved.includes(description.text));
        if (!plan) assert.match(description.text, /Limit reached/);
      }
    }
    async function progressState() {
      assert.equal(await progress.getAttribute('aria-valuemin'), '0');
      assert.equal(await progress.getAttribute('aria-valuemax'), '100');
      const value = Number(await progress.getAttribute('aria-valuenow'));
      const info = await telemetry();
      assert.ok(value >= 0 && value <= 100);
      assert.ok(Math.abs(value - info.distanceGlide.progress * 100) <= 3, 'Progressbar follows glide telemetry');
      return info;
    }
    function middleInvariant(record, info) {
      const glide = info.distanceGlide;
      assert.equal(glide.active, true);
      assert.equal(glide.completed, false);
      assert.equal(glide.targetId, record.before.targetId);
      assert.equal(glide.direction, record.direction);
      assert.equal(glide.durationSeconds, 3);
      assert.ok(glide.progress > 0 && glide.progress < 1);
      near(glide.progress, glide.elapsedSeconds / glide.durationSeconds);
      const eased = glide.progress * glide.progress * (3 - 2 * glide.progress);
      info.position.forEach((value, index) => near(value, record.before.state.position[index] + (record.plan.position[index] - record.before.state.position[index]) * eased));
      near(info.distanceLy - record.before.state.distanceLy, record.plan.distanceLy * eased);
      assert.equal(info.universeYears, record.before.state.universeYears);
      assert.equal(info.travelerYears, record.before.state.travelerYears);
      assert.equal(info.motion.kind, 'glide');
      near(info.target.screen[0], .5);
      near(info.target.screen[1], .5);
      near(glide.endRangeLy, record.plan.rangeLy);
      assert.ok(Number.isFinite(glide.startRangeLy) && glide.startRangeLy > 0);
      assert.equal(info.orbit.active || info.flyby.active || info.navigation.active, false);
    }
    async function launch(direction = 'closer', takeMiddle = true) {
      await chooseGlide();
      const control = action(direction);
      assert.ok(await control.isEnabled());
      assert.notEqual(await control.getAttribute('aria-disabled'), 'true');
      const count = await page.evaluate(() => __glides.length);
      const pixels = takeMiddle ? await page.evaluate(() => __scene.capture().dataUrl) : null;
      await control.scrollIntoViewIfNeeded();
      await control.focus();
      await control.press('Enter');
      // Sample and press the visible Pause control in the same browser task. The
      // three-second motion can otherwise finish between slow-host round trips.
      await page.waitForFunction(direction => {
        const info = __info, inspector = document.querySelector('.uf-inspector');
        const pause = [...(inspector?.querySelectorAll('.uf-inspector-actions button') || [])].find(button => button.textContent.trim() === 'Pause glide');
        if (!info.distanceGlide.active || !info.running || info.distanceGlide.progress < .12 || !pause) return false;
        const action = inspector.querySelector('[data-distance-step="' + direction + '"]');
        window.__glideActiveSample = {
          record: __glides.at(-1), count: __glides.length, info: JSON.parse(JSON.stringify(info)),
          focusOnAction: document.activeElement === action,
          backAvailable: !!inspector.querySelector('[aria-label="Return to previous view"]'),
          expanded: inspector.querySelector('.uf-inspector-actions button').getAttribute('aria-expanded'),
          perspectiveOpen: inspector.querySelector('.uf-inspector-perspective').open,
          distanceButtons: [...inspector.querySelectorAll('[data-distance-step]')].map(button => ({ direction: button.dataset.distanceStep, disabled: button.disabled, busy: button.getAttribute('aria-disabled') })),
          styles: [...inspector.querySelectorAll('[data-distance-style]')].map(button => ({ style: button.dataset.distanceStyle, pressed: button.getAttribute('aria-pressed'), disabled: button.disabled }))
        };
        pause.click();
        return true;
      }, direction);
      await page.waitForFunction(() => __info.distanceGlide.active && !__info.running);
      const middle = await page.evaluate(takeMiddle => ({ ...__glideActiveSample, pixels: takeMiddle ? __scene.capture().dataUrl : null }), takeMiddle);
      const recorded = middle.record;
      assert.equal(middle.count, count + 1);
      stationaryLaunch(recorded);
      assert.equal(middle.backAvailable, true, 'Back becomes available at launch');
      middleInvariant(recorded, middle.info);
      if (takeMiddle) assert.notEqual(middle.pixels, pixels, 'Intermediate camera movement changes the rendered pixels');
      assert.equal(middle.focusOnAction, true, 'Focused launch action survives the running state');
      assert.equal(middle.expanded, 'true');
      assert.equal(middle.perspectiveOpen, true);
      for (const button of middle.distanceButtons) assert.equal(button.busy, 'true');
      for (const button of middle.styles) { assert.equal(button.disabled, true); assert.equal(button.pressed, String(button.style === 'glide')); }
      await styles('glide', true);
      await readouts(true);
      await expanded();
      await progressState();
      return { ...recorded, middle: middle.info.distanceGlide };
    }
    async function arrive(recorded) {
      await page.evaluate(direction => {
        const inspector = document.querySelector('.uf-inspector');
        const resume = [...inspector.querySelectorAll('.uf-inspector-actions button')].find(button => button.textContent.trim() === 'Resume glide');
        if (!resume) throw Error('A paused glide must expose Resume glide');
        resume.click();
        inspector.querySelector('[data-distance-step="' + direction + '"]').focus();
      }, recorded.direction);
      await page.waitForFunction(() => __info.distanceGlide.completed && !__info.distanceGlide.active && !__info.running, null, { timeout: 30000 });
      await frames();
      const after = await snapshot(), info = await telemetry();
      assert.deepEqual(after.settings, recorded.before.settings);
      assert.equal(after.targetId, recorded.before.targetId);
      after.state.position.forEach((value, index) => near(value, recorded.plan.position[index]));
      near(after.state.distanceLy - recorded.before.state.distanceLy, recorded.plan.distanceLy);
      for (const key of ['universeYears', 'travelerYears']) assert.equal(after.state[key], recorded.before.state[key]);
      near(info.distanceGlide.progress, 1);
      near(info.distanceGlide.elapsedSeconds, 3);
      near(info.target.distanceLy, recorded.plan.rangeLy);
      near(info.target.screen[0], .5);
      near(info.target.screen[1], .5);
      assert.equal(await page.evaluate(() => __allocations), recorded.allocations);
      assert.ok(await action(recorded.direction).evaluate(button => document.activeElement === button), 'Arrival retains focus on the distance action');
      await expanded();
      await styles('glide');
      await readouts();
      await paused();
      return after;
    }

    const scenicViews = [
      ['neighborhood', 'amber-star', 'stellar-amber'],
      ['neighborhood', 'blue-nebula', 'nebula-filaments'],
      ['galaxy', 'galactic-center', 'halo-panorama'],
      ['cosmic', 'near-galaxy', 'group-spiral'],
      ['cosmic', 'golden-elliptical', 'group-elliptical']
    ];
    for (const [region, id, view] of scenicViews) {
      await scenic(region, id, view);
      if (id === 'amber-star') { await panel.getByRole('button', { name: 'Detail 10° lens', exact: true }).click(); await frames(); }
      await chooseGlide();
      await fullscreen();
      const moved = await launch();
      const arrived = await arrive(moved);
      await reachable();
      await axeCheck('glide-arrival-' + id);
      await capture('glide-arrival-' + id);
      result.views.push({ region, id, view, from: moved.before.state.position, middle: moved.middle, to: arrived.state.position, rangeLy: moved.plan.rangeLy });
      if (id === 'amber-star' || id === 'blue-nebula') {
        assert.equal(await progress.count(), 1, 'The completed glide exposes its arrival progress');
        assert.match(await progress.getAttribute('aria-valuetext'), /Arrived/);
        const rejectedCancel = await page.evaluate(() => {
          const before = __scene.snapshot(), beforeGlide = __info.distanceGlide, allocations = __allocations;
          const success = __scene.cancelDistanceGlide();
          return { success, before, after: __scene.snapshot(), beforeGlide, afterGlide: __info.distanceGlide, allocations, afterAllocations: __allocations };
        });
        assert.equal(rejectedCancel.success, false);
        assert.deepEqual(rejectedCancel.after, rejectedCancel.before);
        assert.deepEqual(rejectedCancel.afterGlide, rejectedCancel.beforeGlide, 'An inactive cancel preserves completed arrival metadata');
        assert.equal(rejectedCancel.afterAllocations, rejectedCancel.allocations);
        if (id === 'amber-star') await page.evaluate(() => __scene.view('forward'));
        else {
          const neighbor = panel.locator('[data-inspector-neighbor]').first();
          const nextId = await neighbor.getAttribute('data-inspector-neighbor');
          assert.ok(nextId && nextId !== id);
          await neighbor.click();
          await page.waitForFunction(id => __info.target?.id === id, nextId);
          await controls();
        }
        await frames();
        assert.equal((await telemetry()).distanceGlide.active, false);
        assert.equal((await telemetry()).distanceGlide.completed, false);
        assert.equal(await progress.count(), 0, 'A successful camera handoff removes stale Arrived progress');
        const handedOff = await snapshot();
        assert.deepEqual(handedOff.settings, arrived.settings);
        assert.deepEqual(handedOff.state.position, arrived.state.position);
        for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(handedOff.state[key], arrived.state[key]);
        await paused();
      }
      await back.click();
      await frames();
      sameView(await snapshot(), moved.before);
      await paused();
      await fullscreen();
    }
    check('Five scenic landmarks glide through distinct intermediate pixels to the exact radial endpoint with centered targets, unchanged lenses and clocks, no GPU allocation, retained focus, and exact paused Back');
    check('Completed arrival progress survives a rejected inactive cancel and disappears after a manual view or a different inspected target takes over');

    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    let before = await snapshot();
    await style('step').click();
    await styles('step');
    sameView(await snapshot(), before);
    let counts = await page.evaluate(() => [__glides.length, __distanceSteps.length]);
    await action('closer').click();
    await frames();
    assert.deepEqual(await page.evaluate(() => [__glides.length, __distanceSteps.length]), [counts[0], counts[1] + 1]);
    const stepped = await page.evaluate(() => __distanceSteps.at(-1));
    assert.equal(stepped.success, true);
    stepped.after.state.position.forEach((value, index) => near(value, stepped.plan.position[index]));
    assert.equal(stepped.afterAllocations, stepped.allocations);
    await paused();
    await back.click();
    await frames();
    sameView(await snapshot(), before);
    await controls();
    await style('glide').click();
    sameView(await snapshot(), before);
    check('Movement style changes preserve the camera and Step executes the existing exact instantaneous move');

    const resumable = await launch('farther', false);
    await page.waitForFunction(() => __info.distanceGlide.active && !__info.running);
    const frozen = { snapshot: await snapshot(), glide: (await telemetry()).distanceGlide };
    await progressState();
    await page.waitForTimeout(400);
    await frames();
    sameView(await snapshot(), frozen.snapshot);
    assert.deepEqual((await telemetry()).distanceGlide, frozen.glide);
    await styles('glide', true);
    await readouts(true);
    await expanded();
    counts = await page.evaluate(() => __glides.length);
    await action('closer').press('Enter');
    assert.equal(await page.evaluate(() => __glides.length), counts, 'Busy distance controls guard keyboard activation');
    await reachable(['closer', 'farther', 'glide', 'step', 'Resume glide', 'End glide']);
    await axeCheck('glide-paused');
    await capture('glide-paused');
    await footer('Resume glide').click();
    await page.waitForFunction(progress => __info.running && __info.distanceGlide.progress > progress, frozen.glide.progress);
    // Arrival focus follows the control used to resume playback, while the inspector remains open.
    await page.waitForFunction(() => __info.distanceGlide.completed && !__info.running);
    const resumed = await snapshot();
    resumed.state.position.forEach((value, index) => near(value, resumable.plan.position[index]));
    near(resumed.state.distanceLy - resumable.before.state.distanceLy, resumable.plan.distanceLy);
    assert.deepEqual(resumed.settings, resumable.before.settings);
    for (const key of ['universeYears', 'travelerYears']) assert.equal(resumed.state[key], resumable.before.state[key]);
    assert.equal(await page.evaluate(() => __allocations), resumable.allocations);
    await expanded();
    await paused();
    check('Pause freezes progress, position, distance, and pixels; guarded distance controls stay inert; Resume reaches the original endpoint without GPU allocation');

    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    const ended = await launch('closer', false);
    const atEnd = await snapshot();
    await footer('End glide').click();
    await frames();
    sameView(await snapshot(), atEnd);
    assert.equal((await telemetry()).distanceGlide.active, false);
    assert.equal((await telemetry()).distanceGlide.completed, false);
    assert.ok(await detailsButton().evaluate(button => document.activeElement === button), 'End moves focus to the mounted Details control');
    await expanded();
    await paused();
    await back.click();
    await frames();
    sameView(await snapshot(), ended.before);
    await paused();
    check('End keeps the current intermediate view paused, retains expanded inspection, places focus on Details, and leaves the origin available through Back');

    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    const interrupted = await launch('closer', false);
    assert.ok((await telemetry()).distanceGlide.active);
    await footer('Resume glide').click();
    await page.waitForFunction(() => {
      if (!__info.distanceGlide.active || !__info.running) return false;
      const back = document.querySelector('.uf-inspector [aria-label="Return to previous view"]');
      if (!back) return false;
      window.__backDuringGlide = JSON.parse(JSON.stringify(__info.distanceGlide));
      back.click();
      return true;
    });
    assert.equal(await page.evaluate(() => __backDuringGlide.active), true);
    await frames();
    sameView(await snapshot(), interrupted.before);
    assert.equal((await telemetry()).distanceGlide.active, false);
    await paused();
    check('Back during a running glide immediately cancels motion and restores the launch origin paused');

    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    const reduced = await launch('closer', false);
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await page.waitForFunction(() => !__info.distanceGlide.active && !__info.running);
    await controls();
    await styles('step');
    await readouts();
    const reducedStopped = await snapshot();
    assert.notDeepEqual(reducedStopped.state.position, reduced.before.state.position);
    assert.notDeepEqual(reducedStopped.state.position, reduced.plan.position);
    await paused();
    await fullscreen();
    await reachable();
    await axeCheck('system-colors-reduced-motion');
    await capture('glide-system-colors-reduced-motion');
    counts = await page.evaluate(() => [__glides.length, __distanceSteps.length]);
    await action('farther').click();
    await frames();
    assert.deepEqual(await page.evaluate(() => [__glides.length, __distanceSteps.length]), [counts[0], counts[1] + 1]);
    await paused();
    await fullscreen();
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    check('A system reduced-motion change ends active movement at its current view, selects Step, and keeps distance actions usable in forced colors');

    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      await scenic('neighborhood', 'amber-star', 'stellar-amber');
      await style('glide').click();
      await fullscreen();
      const launched = await launch('closer', false);
      await progressState();
      await reachable(['closer', 'farther', 'glide', 'step', 'Resume glide', 'End glide']);
      await axeCheck('glide-' + viewport.width);
      await capture('glide-' + viewport.width);
      await back.click();
      await frames();
      sameView(await snapshot(), launched.before);
      await controls();
      await reachable();
      await paused();
      await fullscreen();
    }
    check('Phone and short landscape expose paused progress, playback, movement style, distance actions, and exact Back without overflow');

    await page.setViewportSize({ width: 1280, height: 850 });
    await scenic('cosmic', 'golden-elliptical', 'group-elliptical');
    await style('glide').click();
    await fullscreen();
    await page.addStyleTag({ content: '.uf-inspector *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}' });
    const spaced = await launch('closer', false);
    await progressState();
    await reachable(['closer', 'farther', 'glide', 'step', 'Resume glide', 'End glide']);
    await axeCheck('glide-text-spacing');
    await capture('glide-text-spacing');
    await action('closer').press('Escape');
    assert.equal(await panel.count(), 0);
    assert.equal(await page.evaluate(() => __info.running), false);
    assert.ok(await page.evaluate(() => document.activeElement === __canvas));
    await back.click();
    await panel.waitFor();
    await frames();
    sameView(await snapshot(), spaced.before);
    await paused();
    await fullscreen();
    check('Text spacing preserves accessible glide controls and Escape returns focus to the scene while Back restores the origin');

    // Native failures are measured within one browser task so no animation frame can obscure mutation checks.
    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    const rejected = await page.evaluate(() => {
      const checks = [];
      for (const [id, direction] of [['missing-landmark', 'closer'], ['amber-star', 'sideways'], ['amber-star', null]]) {
        const before = __scene.snapshot(), allocations = __allocations;
        const success = __scene.startDistanceGlide(id, direction);
        checks.push({ id, direction, before, after: __scene.snapshot(), success, allocations, afterAllocations: __allocations });
      }
      return checks;
    });
    for (const invalid of rejected) {
      assert.equal(invalid.success, false);
      assert.deepEqual(invalid.after, invalid.before);
      assert.equal(invalid.afterAllocations, invalid.allocations);
    }
    const duplicate = await page.evaluate(() => {
      const success = __scene.startDistanceGlide('amber-star', 'closer');
      const before = __scene.snapshot(), allocations = __allocations;
      const rejected = __scene.startDistanceGlide('amber-star', 'farther');
      return { success, rejected, before, after: __scene.snapshot(), allocations, afterAllocations: __allocations };
    });
    assert.equal(duplicate.success, true);
    assert.equal(duplicate.rejected, false);
    assert.deepEqual(duplicate.after, duplicate.before);
    assert.equal(duplicate.afterAllocations, duplicate.allocations);
    await page.evaluate(() => __scene.cancelDistanceGlide());
    await frames();
    await paused();
    check('Invalid target and direction launches and a duplicate active launch return false without position, lens, clock, or GPU mutation');

    for (const limit of ['minimum', 'boundary']) {
      await scenic('neighborhood', 'amber-star', 'stellar-amber');
      const native = await page.evaluate(limit => {
        const saved = __scene.snapshot(), target = UniverseFlight.landmarks(saved.settings.region).find(item => item.id === saved.targetId);
        const ray = saved.state.position.map((value, index) => value - target.position[index]), range = Math.hypot(...ray), unit = ray.map(value => value / range);
        const dot = target.position.reduce((sum, value, index) => sum + value * unit[index], 0);
        const next = limit === 'minimum' ? target.arrivalRadiusLy * .1 : -dot + Math.sqrt(dot * dot + 100000 * 100000 - target.position.reduce((sum, value) => sum + value * value, 0));
        saved.state.position = target.position.map((value, index) => value + unit[index] * next);
        const restored = __scene.restore(saved), before = __scene.snapshot(), allocations = __allocations;
        const direction = limit === 'minimum' ? 'closer' : 'farther';
        const plan = __scene.planDistanceView(saved.targetId, direction), success = __scene.startDistanceGlide(saved.targetId, direction);
        return { restored, before, after: __scene.snapshot(), direction, plan, success, allocations, afterAllocations: __allocations };
      }, limit);
      assert.equal(native.restored, true);
      assert.equal(native.plan, null);
      assert.equal(native.success, false);
      assert.deepEqual(native.after, native.before);
      assert.equal(native.afterAllocations, native.allocations);
      await frames();
      await controls();
      assert.ok(await action(native.direction).isDisabled());
      assert.ok(await action(native.direction === 'closer' ? 'farther' : 'closer').isEnabled());
    }
    check('Minimum viewing range and the scene boundary reject blocked native glides and disable only the unavailable direction');

    for (const kind of ['look', 'view', 'nudge', 'orbit', 'scene', 'mode']) {
      await scenic('neighborhood', 'amber-star', 'stellar-amber');
      await page.evaluate(() => __scene.startDistanceGlide('amber-star', 'closer'));
      await page.waitForFunction(() => __info.distanceGlide.active && __info.distanceGlide.progress > .02);
      const changed = await page.evaluate(kind => {
        const before = __scene.snapshot();
        let success;
        if (kind === 'look') success = __scene.look(.02, 0);
        if (kind === 'view') success = __scene.view('forward');
        if (kind === 'nudge') success = __scene.nudge('right', .01);
        if (kind === 'orbit') success = __scene.startOrbit('amber-star');
        if (kind === 'scene') success = __scene.set({ region: 'galaxy' });
        if (kind === 'mode') success = __scene.set({ mode: 'relativity' });
        return { before, after: __scene.snapshot(), success, info: __info };
      }, kind);
      assert.equal(changed.info.distanceGlide.active, false, kind + ' clears active distance motion');
      if (kind === 'orbit') { assert.equal(changed.success, true); assert.equal(changed.info.orbit.active, true); await page.evaluate(() => __scene.endOrbit()); }
      else assert.equal(changed.info.running, false, kind + ' leaves movement paused');
      if (['look', 'view', 'nudge'].includes(kind)) {
        assert.deepEqual(changed.after.settings, changed.before.settings);
        for (const key of ['universeYears', 'travelerYears']) assert.equal(changed.after.state[key], changed.before.state[key]);
      }
      await page.evaluate(() => __scene.set({ mode: 'explore', region: 'neighborhood', running: false }));
      await frames();
      await paused();
    }
    check('Manual look, named view, camera nudge, orbit, scene change, and mode change clear the glide and transfer control without residual glide motion');

    await scenic('neighborhood', 'amber-star', 'stellar-amber');
    await page.locator('.uf-modes').getByRole('button', { name: 'Einstein’s light chase', exact: true }).click();
    const physical = await page.evaluate(() => {
      const before = __scene.snapshot(), allocations = __allocations;
      const success = __scene.startDistanceGlide('amber-star', 'closer');
      return { before, after: __scene.snapshot(), success, allocations, afterAllocations: __allocations };
    });
    assert.equal(physical.success, false);
    assert.deepEqual(physical.after, physical.before);
    assert.equal(physical.afterAllocations, physical.allocations);
    assert.equal(await panel.count(), 0);
    check('Physical light-chase mode rejects native distance glides without mutation');

    // A fresh reduced-motion page checks the initial default as well as a live preference change.
    const reducedPage = await browser.newPage({ viewport: { width: 1280, height: 850 }, reducedMotion: 'reduce' });
    try {
      await reducedPage.goto(preview);
      await reducedPage.waitForFunction(() => document.querySelector('.uf-transport button')?.disabled === false);
      await reducedPage.locator('.uf-destination-list').getByRole('button', { name: 'Select destination: Amber star', exact: true }).click();
      await reducedPage.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
      const reducedPanel = reducedPage.locator('.uf-inspector');
      await reducedPanel.getByRole('button', { name: 'Details', exact: true }).click();
      await reducedPanel.locator('.uf-inspector-perspective summary').click();
      assert.equal(await reducedPanel.locator('[data-distance-style="step"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await reducedPanel.locator('[data-distance-style="glide"]').getAttribute('aria-pressed'), 'false');
    } finally { await reducedPage.close(); }
    check('A fresh page with system reduced motion starts with Instant distance steps selected');

    await Promise.all(pending);
    for (const [file, pin] of Object.entries(pins)) {
      assert.equal(hash(read(file)), pin);
      const records = result.served.filter(record => record.path === '/' + file);
      assert.ok(records.length && records.every(record => record.hash === pin));
    }
    assert.deepEqual(result.errors, []);
    result.completed = true;
    save();
    console.log(JSON.stringify({ completed: true, checks: result.checks.length, accessibility: result.accessibility.length, captures: result.captures.length, views: result.views.length }));
  } finally { await browser.close(); }
}
main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
