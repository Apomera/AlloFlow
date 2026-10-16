'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-ring-trials-qa');
const report = path.join(out, process.env.PERCEPTION_QA_FILTER ? 'focused-results.json' : 'results.json');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
const targets = [[-12, 9], [-9.6, 7.6], [-14.6, 11.4]].map(([x, z]) => ({ x, z, yaw: Math.atan2(-12 - x, z) * 180 / Math.PI, pitch: 0 }));
const start = { x: -15, z: 10, yaw: 15, pitch: 0 };
const close = (actual, expected, label, tolerance = 1e-5) => assert(Math.abs(actual - expected) < tolerance, label + ': ' + actual + ' versus ' + expected);

// Project the actual rendered tube centerlines independently of the model scorer.
function project(point, camera) {
  const yaw = camera.yaw * Math.PI / 180, pitch = camera.pitch * Math.PI / 180;
  const dx = point.x - camera.x, dy = point.y - camera.y, dz = point.z - camera.z;
  const forward = dx * Math.sin(yaw) - dz * Math.cos(yaw), depth = forward * Math.cos(pitch) + dy * Math.sin(pitch);
  assert(depth > 0, 'Every arc sample is in front of the camera');
  return { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / depth, y: (dy * Math.cos(pitch) - forward * Math.sin(pitch)) / depth };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__ringTrialsViewer.debug());
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const seed = async (round = 0, completed = []) => {
    await click('[data-walk-reset]');
    await patch({ activity: 'ring', ring: { round, completed }, player: start, precise: false });
  };
  const check = async (name, run) => {
    if (process.env.PERCEPTION_QA_FILTER && !name.includes(process.env.PERCEPTION_QA_FILTER)) return;
    current = name; await run(); checks.push(name); console.log('PASS: ' + name);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__ringTrialsViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return d.ringRound === s.ring.round && ['x', 'z', 'yaw', 'pitch'].every(key => Math.abs(d.camera[key] - s.player[key]) < 1e-6);
    });
  };
  const captureElement = async (element, name, minimumColors = 25) => {
    const buffer = await element.screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > minimumColors && png.width > 240 && png.height > 160, 'Nonblank visual output');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const capture = async name => { await settled(); return captureElement(page.locator('[data-perception-walk] canvas'), name); };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__ringTrialsViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="ring"]');
    await check('all three physical arc arrangements form true circles only from their own viewpoints', async () => {
      const signatures = [];
      for (const round of [0, 1, 2]) {
        await seed(round); const broken = await capture('round-' + round + '-start');
        await patch({ player: targets[round] }); await settled();
        const d = await debug(), objects = d.ringObjects;
        assert.equal(d.ringRound, round); assert.equal(objects.length, 12); assert(new Set(d.ringDepths).size >= 3);
        for (const key of ['x', 'z', 'yaw', 'pitch']) close(d.ringTarget[key], targets[round][key], 'Target pose ' + key);
        const projected = objects.map(part => part.points.map(point => project(point, d.camera)));
        const expectedRadius = (round ? 1.2 : 1.35) / Math.hypot(targets[round].x + 12, targets[round].z);
        for (const [index, points] of projected.entries()) {
          assert(points.length > 12);
          for (const point of points) close(Math.hypot(point.x, point.y), expectedRadius, 'Actual mesh lies on the projected circle', 1e-5);
          const a = points.at(-1), b = projected[(index + 1) % projected.length][0];
          close(a.x, b.x, 'Horizontal join closes'); close(a.y, b.y, 'Vertical join closes');
          for (const point of objects[index].points) assert(point.y > 0 && point.y < 4.3 && point.x > -19.3 && point.x < -6, 'Arc remains inside the room and above the floor');
        }
        signatures.push(JSON.stringify(objects));
        assert.notEqual(await capture('round-' + round + '-aligned'), broken, 'Finding the viewpoint visibly joins the fragments');
        assert.equal(await page.evaluate(() => StemLab.PerceptionWalk.checkAnswer(window.__perceptionPreview.state.perceptionWalk)), true);
        await patch({ player: { ...targets[round], yaw: targets[round].yaw + 180 } }); await click('[data-walk-check]');
        assert.deepEqual((await state()).ring.completed, [], 'Turning away never earns credit');
        await patch({ player: targets[(round + 1) % 3] }); await click('[data-walk-check]');
        assert.deepEqual((await state()).ring.completed, [], 'Another trial viewpoint cannot solve this arrangement');
      }
      assert.equal(new Set(signatures).size, 3, 'Each trial changes physical arc geometry');
      await seed(1); const before = await state(), image = await capture();
      await click('[data-walk-move="right"]'); assert.notDeepEqual((await state()).player, before.player); assert.notEqual(await capture('walking-parallax'), image);
      await page.locator('[data-walk-stage]').focus(); const keyboard = await state(); await page.keyboard.press('w');
      assert.notDeepEqual((await state()).player, keyboard.player, 'First-person keyboard movement stays available');
    });
    await check('independent trial gates preserve original room credit while earning all three viewpoints', async () => {
      await seed(); assert(await page.locator('[data-walk-ring-next]').isDisabled());
      assert.match(await page.locator('[data-walk-ring-trial]').textContent(), /1/);
      for (const round of [0, 1, 2]) {
        assert.equal((await state()).ring.round, round); assert(await page.locator('[data-walk-ring-next]').isDisabled());
        await patch({ player: targets[round] }); await click('[data-walk-check]');
        assert.deepEqual((await state()).ring.completed, Array.from({ length: round + 1 }, (_, index) => index));
        assert.equal((await state()).progress.ring.solved, true, 'Original independent completion remains earned');
        assert(!(await page.locator('[data-walk-ring-next]').isDisabled()));
        await click('[data-walk-check]'); assert.equal((await state()).ring.completed.length, round + 1, 'Checking twice does not duplicate credit');
        assert.match(await page.locator('[data-walk-ring-completed]').textContent(), new RegExp(String(round + 1)));
        await click('[data-walk-ring-next]');
        assert.equal((await state()).ring.round, (round + 1) % 3); assert.deepEqual((await state()).player, start);
      }
      assert.deepEqual((await state()).ring.completed, [0, 1, 2]);
      assert.equal((await state()).progress.ring.solved, true);
    });
    await check('reveal markers follow the current eye and assistance never borrows earned credit from another trial', async () => {
      for (const round of [0, 1, 2]) {
        await seed(round, round ? [0] : []); await settled(); assert.equal((await debug()).ringRevealTarget, null);
        await click('[data-walk-reveal]'); await settled(); const d = await debug();
        assert.equal((await state()).progress.ring.assisted, true);
        close(d.ringRevealTarget.x, targets[round].x, 'Rendered reveal marker X'); close(d.ringRevealTarget.z, targets[round].z, 'Rendered reveal marker Z');
        await patch({ player: targets[round] }); await click('[data-walk-check]');
        assert.deepEqual((await state()).ring.completed, round ? [0] : [], 'Reveal-assisted alignment cannot earn the current trial');
        await click('[data-walk-ring-next]'); assert.equal((await state()).ring.round, (round + 1) % 3); assert.equal((await state()).progress.ring.assisted, false);
        await settled(); assert.equal((await debug()).ringRevealTarget, null, 'A new trial closes the reveal');
      }
      await seed(1, [0]); await page.locator('[data-walk-note]').fill('Move sideways and compare neighboring endpoints.');
      await patch({ player: targets[1] }); await click('[data-walk-viewpoint-save="A"]'); await click('[data-walk-check]');
      const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved, 'Trial completion and viewpoint persist through reload');
      await click('[data-walk-next-room]'); await click('[data-walk-previous-room]');
      assert.deepEqual((await state()).ring, saved.ring); assert.deepEqual((await state()).viewpoints.ring, saved.viewpoints.ring);
      await click('[data-walk-reset]'); assert.deepEqual((await state()).ring, { round: 0, completed: [] });
      assert.equal((await state()).notes.ring, saved.notes.ring); assert.deepEqual((await state()).viewpoints.ring, saved.viewpoints.ring);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('trial changes and resets stop held movement and release mouse capture', async () => {
      await seed(0, [0]); const move = page.locator('[data-walk-move="right"]'); await move.scrollIntoViewIfNeeded();
      const rect = await move.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.waitForTimeout(280);
      await page.evaluate(() => document.querySelector('[data-walk-ring-next]').click());
      const changed = await state(); assert.equal(changed.ring.round, 1); assert.deepEqual(changed.player, start);
      await page.waitForTimeout(300); assert.deepEqual((await state()).player, changed.player, 'Next trial cancels the repeating movement timer'); await page.mouse.up();
      await patch({ ring: { round: 0, completed: [0] } }); await page.waitForTimeout(1300); await click('[data-walk-mouse-look]');
      await page.waitForFunction(() => document.pointerLockElement === document.querySelector('[data-walk-stage]'));
      await page.evaluate(() => document.querySelector('[data-walk-ring-next]').click());
      await page.waitForFunction(() => !document.pointerLockElement); assert.equal(await page.locator('[data-walk-mouse-look]').getAttribute('aria-pressed'), 'false');
      await page.waitForTimeout(1300); await click('[data-walk-mouse-look]');
      await page.waitForFunction(() => document.pointerLockElement === document.querySelector('[data-walk-stage]'));
      await page.evaluate(() => document.querySelector('[data-walk-reset]').click()); await page.waitForFunction(() => !document.pointerLockElement);
      assert.deepEqual((await state()).player, start); assert.deepEqual((await state()).ring, { round: 0, completed: [] });
    });
    await check('all trials stay framed and accessible on desktop and narrow phones', async () => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1, 2]) {
          await seed(round); await patch({ player: targets[round] }); await capture('ring-canvas-' + width + '-round-' + round);
          const d = await debug();
          for (const points of d.ringProjected) for (const point of points) assert(Math.abs(point.x) < 1 && Math.abs(point.y) < 1, 'Complete circle is visible at width ' + width);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
        }
        const next = await page.locator('[data-walk-ring-next]').boundingBox();
        assert(next.width >= 32 && next.height >= 32 && next.x >= 0 && next.x + next.width <= width, 'Trial control is a visible practical touch target');
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'ring-layout-' + width + '.png') });
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      }
    });
    await check('Plan and no-WebGL fallback show changing first-person perspective for every trial', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await seed(); await click('[data-walk-diagram-toggle]');
      for (const round of [0, 1, 2]) {
        await patch({ ring: { round, completed: [] }, player: start }); const svg = page.locator('[data-walk-ring-plan]'), before = await svg.innerHTML();
        await patch({ player: targets[round] }); const aligned = await svg.innerHTML(); assert.notEqual(aligned, before); assert(!/NaN|Infinity/.test(aligned));
        await captureElement(svg, 'ring-plan-' + round, 10); await click('[data-walk-move="right"]'); assert.notEqual(await svg.innerHTML(), aligned, 'Plan perspective follows walking controls');
      }
      await page.goto(url + '?no-webgl'); await open(true); await seed(2); const svg = page.locator('[data-walk-ring-plan]'), before = await svg.innerHTML();
      assert(await page.locator('[data-walk-mouse-look]').isDisabled()); await patch({ player: targets[2] }); assert.notEqual(await svg.innerHTML(), before);
      await click('[data-walk-check]'); assert.deepEqual((await state()).ring.completed, [2]); await click('[data-walk-ring-next]'); assert.equal((await state()).ring.round, 0);
      await captureElement(svg, 'ring-no-webgl-320', 10); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0);
    });
    assert.deepEqual(errors, []); fs.writeFileSync(report, JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' ring trial browser groups passed.');
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
