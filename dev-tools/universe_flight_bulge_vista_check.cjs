'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_BULGE_VISTA_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/rounded-bulges');
const preview = process.env.UNIVERSE_BULGE_VISTA_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=52#universe-flight';
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file));
const pins = Object.fromEntries(['stem_lab/stem_tool_universe.js', 'stem_lab/universe_flight_scene.js'].map(file => [file, hash(read(file))]));
for (const file of Object.keys(pins)) assert.deepEqual(read(file), read('desktop/web-app/public/' + file));
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, pins, harnessHash: hash(fs.readFileSync(__filename)), checks: [], accessibility: [], captures: [], poses: [], served: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'vista-browser-check.json'), JSON.stringify(result, null, 2) + '\n');
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
const expected = { title: 'Spiral galaxy side view', position: [152240.00209557445, -34043.82120061562, 0], targetId: 'galactic-center', fov: 50 };
const previous = ['Spiral portrait', 'Above the arms', 'Across the disk', 'Halo star cluster'];
const near = (actual, wanted, epsilon = 1e-9) => assert.ok(Math.abs(actual - wanted) <= epsilon * Math.max(1, Math.abs(wanted)), `${actual} != ${wanted}`);

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
      let api;
      Object.defineProperty(window, 'UniverseFlight', {
        configurable: true,
        get() { return api; },
        set(value) {
          const create = value.create;
          value.create = function (canvas, options) {
            const scene = create.call(this, canvas, {
              ...options,
              onTelemetry(info) { window.__bulgeVistaInfo = info; options.onTelemetry?.(info); },
              onStatus(status) { window.__bulgeVistaStatus = status; options.onStatus?.(status); }
            });
            window.__bulgeVistaScene = scene;
            window.__bulgeVistaCanvas = canvas;
            return scene;
          };
          api = value;
        }
      });
    });
    await page.goto(preview);
    await page.waitForFunction(() => window.__bulgeVistaStatus?.state === 'ready' && window.__bulgeVistaScene);
    const axePath = path.join(repo, 'node_modules/axe-core/axe.min.js');
    assert.ok(fs.existsSync(axePath), 'The local accessibility checker is available');
    await page.addScriptTag({ path: axePath });
    const stage = page.locator('.uf-stage');
    const panel = stage.locator('#uf-inview-controls');
    const snapshot = () => page.evaluate(() => window.__bulgeVistaScene.snapshot());
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function assertPausedPose(name) {
      await page.waitForFunction(() => window.__bulgeVistaInfo?.running === false);
      await frames();
      const pose = await snapshot();
      assert.equal(pose.settings.mode, 'explore');
      assert.equal(pose.settings.region, 'galaxy');
      assert.equal(pose.settings.fov, expected.fov);
      assert.equal(pose.settings.exposure, 1);
      assert.equal(pose.targetId, expected.targetId);
      pose.state.position.forEach((value, index) => near(value, expected.position[index]));
      near(Math.hypot(...pose.state.position), 156000);
      const direction = pose.state.position.map(value => -value / 156000);
      near(Math.sin(pose.state.yaw) * Math.cos(pose.state.pitch), direction[0]);
      near(Math.cos(pose.state.yaw) * Math.cos(pose.state.pitch), direction[2]);
      near(Math.sin(pose.state.pitch), direction[1]);
      for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(pose.state[key], 0);
      const image = await page.evaluate(() => window.__bulgeVistaScene.capture());
      await page.waitForTimeout(180);
      await frames();
      assert.deepEqual(await snapshot(), pose, 'Paused camera, lens and journey counters stay fixed');
      assert.deepEqual(await page.evaluate(() => window.__bulgeVistaScene.capture()), image, 'Paused pixels remain fixed');
      assert.equal(await page.evaluate(() => window.__bulgeVistaCanvas.getContext('webgl').getError()), 0);
      result.poses.push({ name, snapshot: pose });
      save();
    }
    async function capture(name) {
      const filename = 'vista-' + name + '.png';
      await stage.screenshot({ path: path.join(report, filename) });
      result.captures.push({ name, file: filename, hash: hash(fs.readFileSync(path.join(report, filename))) });
      save();
    }
    async function accessible(name, scope) {
      const violations = await page.evaluate(async selectors => (await axe.run({ include: selectors.map(selector => [selector]) }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })).violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) })), scope);
      result.accessibility.push({ name, violations });
      assert.deepEqual(violations, [], name + ' has no scoped accessibility violations');
      save();
    }
    async function reachable(control) {
      await control.scrollIntoViewIfNeeded();
      const bounds = await control.evaluate(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, viewport: [innerWidth, innerHeight], covered: !node.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) };
      });
      assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport[0] + 1 && bounds.top >= -1 && bounds.bottom <= bounds.viewport[1] + 1, 'The scenic control fits the viewport');
      assert.ok(bounds.width >= 44 && bounds.height >= 40, 'The scenic control is a usable touch target');
      assert.equal(bounds.covered, false, 'The scenic control can be reached');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The page has no horizontal overflow');
    }
    async function normal(name) {
      await page.locator('#uf-region').selectOption('galaxy');
      const list = page.locator('.uf-vista-list');
      assert.equal(await list.getByRole('button').count(), 5);
      const names = await list.getByRole('button').allTextContents();
      previous.forEach((title, index) => assert.ok(names[index].includes(title), 'Existing scenic view indices stay in place'));
      assert.ok(names[4].includes(expected.title));
      const control = list.getByRole('button', { name: new RegExp(expected.title) });
      await reachable(control);
      await control.click();
      await assertPausedPose(name);
      await accessible(name, ['.uf-stage', '.uf-vistas']);
      await capture(name);
    }
    async function enter() {
      await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement === document.querySelector('.uf-stage'));
      await frames();
    }
    async function exit() {
      await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      await frames();
    }
    async function fullscreen(name) {
      await enter();
      await stage.getByRole('button', { name: 'Flight controls', exact: true }).click();
      await panel.waitFor({ state: 'visible' });
      await panel.locator('#uf-inview-tab-explore').click();
      const control = panel.locator('#uf-inview-vista');
      const options = await control.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, label: node.textContent })));
      assert.deepEqual(options.slice(1, 5).map(option => option.label), previous);
      assert.deepEqual(options[5], { value: '4', label: expected.title });
      await reachable(control);
      await accessible(name + '-menu', ['.uf-stage']);
      await control.selectOption('4');
      await page.waitForFunction(() => !document.querySelector('#uf-inview-controls') && document.activeElement === window.__bulgeVistaCanvas);
      assert.equal(await page.evaluate(() => document.fullscreenElement === document.querySelector('.uf-stage')), true);
      await assertPausedPose(name);
      await accessible(name, ['.uf-stage']);
      await capture(name);
      await exit();
    }
    await normal('desktop');
    check('Desktop scenic views append the side view while keeping all four existing indices, and open the exact paused galaxy pose');
    await fullscreen('desktop-fullscreen');
    check('The fullscreen menu exposes the same side view and returns focus to the paused canvas');
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await normal('phone-reduced-motion');
    check('The 320 px scenic menu stays reachable without overflow, and reduced motion keeps the viewpoint stationary');
    await fullscreen('phone-fullscreen-reduced-motion');
    check('The 320 px fullscreen scenic menu remains reachable and preserves the paused pose with reduced motion');
    await Promise.all(pending);
    for (const [file, pin] of Object.entries(pins)) {
      assert.equal(hash(read(file)), pin, 'Runtime files stay fixed throughout the check');
      const served = result.served.filter(item => item.path === '/' + file);
      assert.ok(served.length && served.every(item => item.hash === pin), 'The preview served the pinned runtime source');
    }
    assert.deepEqual(result.errors, [], 'No page errors occur');
    result.completed = true;
    save();
    console.log(JSON.stringify({ completed: true, checks: result.checks.length, accessibility: result.accessibility.length, captures: result.captures.length }));
  } finally {
    await browser.close();
  }
}

main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
