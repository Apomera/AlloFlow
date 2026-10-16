'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-anamorphosis-history-qa');
const report = path.join(out, process.env.PERCEPTION_QA_FILTER ? 'focused-results.json' : 'results.json');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
const front = { x: 216, z: 10, yaw: 0, pitch: 0 };
const targets = [[.6, -.45], [.45, -.6], [15, -12]];
const close = (actual, expected, message, tolerance = 1e-5) => assert(Math.abs(actual - expected) < tolerance, message + ': ' + actual + ' versus ' + expected);
const geometryEqual = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  for (const [index, item] of actual.entries()) for (const endpoint of ['from', 'to']) for (const axis of ['x', 'y', 'z']) {
    close(item[endpoint][axis], expected[index][endpoint][axis], 'Restored physical endpoint ' + index + '.' + endpoint + '.' + axis);
  }
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__anamorphosisViewer.debug());
  const check = async (name, run) => {
    if (process.env.PERCEPTION_QA_FILTER && !name.includes(process.env.PERCEPTION_QA_FILTER)) return;
    current = name; await run(); checks.push(name); console.log('PASS: ' + name);
  };
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const seed = async (set = 0) => {
    await click('[data-walk-reset]'); await patch({ anamorphosis: { set, round: 0, offsets: [0, 0], selected: 0 }, player: front, precise: false });
    assert.deepEqual((await state()).anamorphosis.history, { past: [], future: [] });
  };
  const offset = async value => {
    await page.locator('[data-walk-anamorphosis-offset]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__anamorphosisViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return ['x', 'z', 'yaw', 'pitch'].every(key => Math.abs(d.camera[key] - s.player[key]) < 1e-6)
        && d.anamorphosisSet === s.anamorphosis.set && d.anamorphosisRound === s.anamorphosis.round
        && d.anamorphosisOffsets.every((value, index) => Math.abs(value - s.anamorphosis.offsets[index]) < 1e-6);
    });
  };
  const captureElement = async (element, name, minimumColors = 25) => {
    const buffer = await element.screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > minimumColors && png.width > 240 && png.height > 180, 'Nonblank visual output');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const capture = async name => { await settled(); return captureElement(page.locator('[data-perception-walk] canvas'), name); };
  // Derive the gesture from rendered beam endpoints and independent camera projection.
  const dragPoints = async (set, choice = 'B') => {
    await settled(); return page.evaluate(({ set, choice }) => {
      const d = window.__anamorphosisViewer.debug(), camera = d.camera, rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const beam = d.anamorphosisObjects.find(item => item.choice === choice), mid = { x: (beam.from.x + beam.to.x) / 2, y: (beam.from.y + beam.to.y) / 2, z: (beam.from.z + beam.to.z) / 2 };
      const point = set === 2 ? { x: beam.from.x + (beam.to.x - beam.from.x) * .8, y: beam.from.y + (beam.to.y - beam.from.y) * .8, z: mid.z } : mid;
      let moved;
      if (set === 2) {
        const angle = 12 * Math.PI / 180, dx = point.x - mid.x, dy = point.y - mid.y;
        moved = { x: mid.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: mid.y + dx * Math.sin(angle) + dy * Math.cos(angle), z: point.z };
      } else moved = { ...point, [set === 1 ? 'z' : 'x']: point[set === 1 ? 'z' : 'x'] + (set === 1 ? 1.1 : .7) };
      function project(q) {
        const yaw = camera.yaw * Math.PI / 180, pitch = camera.pitch * Math.PI / 180, dx = q.x - camera.x, dy = q.y - camera.y, dz = q.z - camera.z;
        const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), scale = Math.tan(camera.fov * Math.PI / 360);
        return { x: rect.left + rect.width / 2 + (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale) * rect.height / 2, y: rect.top + rect.height / 2 - (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale) * rect.height / 2 };
      }
      const start = project(point), target = project(moved);
      return { start, target, viewportWidth: innerWidth, hit: window.__anamorphosisViewer.pick(start.x, start.y)?.id };
    }, { set, choice });
  };
  const drag = async points => {
    await page.mouse.move(points.start.x, points.start.y); await page.mouse.down();
    await page.mouse.move(points.target.x, points.target.y, { steps: 8 }); await page.mouse.up(); await settled();
  };
  const observe = async () => {
    await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-anamorphosis-record]');
    await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
    await click('[data-walk-anamorphosis-view="front"]');
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__anamorphosisViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="anamorphosis"]');
    await check('one undo and redo restore all three physical manipulation modes after multi-event first-person drags', async () => {
      for (const set of [0, 1, 2]) for (const view of ['front', 'side']) {
        await seed(set); await click('[data-walk-anamorphosis-view="' + view + '"]');
        assert(await page.locator('[data-walk-anamorphosis-undo]').isDisabled()); assert(await page.locator('[data-walk-anamorphosis-redo]').isDisabled());
        const before = await state(), original = (await debug()).anamorphosisObjects, hash = await capture(), points = await dragPoints(set);
        assert.equal(points.hit, 'anamorphosis-B'); await drag(points);
        const changed = await state(), moved = (await debug()).anamorphosisObjects;
        assert.notDeepEqual(changed.anamorphosis.offsets, before.anamorphosis.offsets, 'Physical drag changes geometry: ' + JSON.stringify({ set, view, points, changed: changed.anamorphosis })); assert.deepEqual(changed.player, before.player);
        assert.equal(changed.anamorphosis.history.past.length, 1, 'Eight pointer moves form one undo transaction');
        assert.equal(changed.anamorphosis.history.future.length, 0); assert.notEqual(await capture(), hash);
        await click('[data-walk-anamorphosis-undo]'); await settled(); const undone = await state();
        assert.deepEqual(undone.anamorphosis.offsets, before.anamorphosis.offsets); assert.equal(undone.anamorphosis.selected, before.anamorphosis.selected); assert.deepEqual(undone.player, before.player);
        assert.equal(undone.anamorphosis.history.past.length, 0); assert.equal(undone.anamorphosis.history.future.length, 1); geometryEqual((await debug()).anamorphosisObjects, original);
        await click('[data-walk-anamorphosis-redo]'); await settled();
        assert.deepEqual((await state()).anamorphosis.offsets, changed.anamorphosis.offsets); geometryEqual((await debug()).anamorphosisObjects, moved);
        await capture('restored-set-' + set + '-' + view);
      }
      await seed(0); const active = await dragPoints(0);
      await page.mouse.move(active.start.x, active.start.y); await page.mouse.down();
      await page.mouse.move((active.start.x + active.target.x) / 2, (active.start.y + active.target.y) / 2, { steps: 4 });
      assert.equal((await state()).anamorphosis.history.past.length, 1);
      await page.keyboard.press('Control+z'); await settled(); assert.deepEqual((await state()).anamorphosis.offsets, [0, 0]);
      await page.mouse.move(active.target.x, active.target.y, { steps: 4 }); await page.mouse.up();
      assert.deepEqual((await state()).anamorphosis.offsets, [0, 0], 'Undo cancels an active pointer gesture before subsequent movement');
      assert.equal((await state()).anamorphosis.history.past.length, 0); assert.equal((await state()).anamorphosis.history.future.length, 1);
    });
    await check('native range gestures coalesce, keyboard changes remain distinct and shortcuts respect text editing', async () => {
      await seed(0); const slider = page.locator('[data-walk-anamorphosis-offset]'); await slider.scrollIntoViewIfNeeded();
      const rect = await slider.boundingBox(), start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .8, start.y, { steps: 8 }); await page.mouse.up();
      const dragged = await state(); assert(dragged.anamorphosis.offsets[0] > .4); assert.equal(dragged.anamorphosis.history.past.length, 1);
      await click('[data-walk-anamorphosis-undo]'); assert.deepEqual((await state()).anamorphosis.offsets, [0, 0]);
      await click('[data-walk-anamorphosis-redo]'); assert.deepEqual((await state()).anamorphosis.offsets, dragged.anamorphosis.offsets);
      await slider.press('ArrowLeft'); const firstKey = await state(); await slider.press('ArrowLeft'); const secondKey = await state();
      assert.equal(secondKey.anamorphosis.history.past.length, 3); close(firstKey.anamorphosis.offsets[0] - secondKey.anamorphosis.offsets[0], .01, 'Each arrow is a native slider step');
      const stage = page.locator('[data-walk-stage]'); await stage.focus(); await page.keyboard.press('Control+z');
      assert.deepEqual((await state()).anamorphosis.offsets, firstKey.anamorphosis.offsets);
      await page.keyboard.press('Control+Shift+z'); assert.deepEqual((await state()).anamorphosis.offsets, secondKey.anamorphosis.offsets);
      await page.keyboard.press('Control+z'); await page.keyboard.press('Control+y'); assert.deepEqual((await state()).anamorphosis.offsets, secondKey.anamorphosis.offsets);
      await page.keyboard.press('Meta+z'); assert.deepEqual((await state()).anamorphosis.offsets, firstKey.anamorphosis.offsets);
      await page.keyboard.press('Meta+Shift+z'); assert.deepEqual((await state()).anamorphosis.offsets, secondKey.anamorphosis.offsets);
      const rangeHistory = (await state()).anamorphosis.history; await slider.press('Control+z');
      assert.deepEqual((await state()).anamorphosis.history, rangeHistory, 'Editable native range input retains its own key handling');
      const history = (await state()).anamorphosis.history, note = page.locator('[data-walk-note]');
      await note.fill('An observation'); await note.press('End'); await note.press('!'); await note.press('Control+z');
      assert.deepEqual((await state()).anamorphosis.history, history, 'Textarea undo does not consume puzzle history');
      assert.notEqual(await note.inputValue(), 'An observation!', 'Native text undo stays available');
      await stage.focus(); await page.keyboard.press('Control+z'); await offset(-.2);
      assert.equal((await state()).anamorphosis.history.future.length, 0, 'A new manipulation drops the redo branch');
      await patch({ player: { ...front, yaw: 180 } }); const locked = await state();
      assert(await page.locator('[data-walk-anamorphosis-undo]').isDisabled()); assert(await page.locator('[data-walk-anamorphosis-redo]').isDisabled());
      await stage.focus(); await page.keyboard.press('Control+z'); assert.deepEqual((await state()).anamorphosis, locked.anamorphosis, 'Out-of-view shortcut cannot bypass the manipulation gate');
    });
    await check('history preserves earned progress and practice status, invalidates evidence and survives reload with scoped resets', async () => {
      await seed(1);
      for (const [index, value] of targets[1].entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
      await observe(); await click('[data-walk-check]'); assert.deepEqual((await state()).anamorphosis.completed, [0]);
      await page.locator('[data-walk-note]').fill('A restored arrangement still needs fresh observations.'); await click('[data-walk-viewpoint-save="A"]');
      await offset(-.3); await observe(); const before = await state(); assert.equal(before.anamorphosis.seen, 3);
      await click('[data-walk-anamorphosis-view="side"]'); const camera = (await state()).player; await click('[data-walk-anamorphosis-undo]'); const undone = await state();
      assert.deepEqual(undone.anamorphosis.offsets, targets[1]); assert.equal(undone.anamorphosis.seen, 0); assert.deepEqual(undone.anamorphosis.completed, [0]);
      assert.deepEqual(undone.player, camera); assert.deepEqual(undone.notes, before.notes); assert.deepEqual(undone.viewpoints, before.viewpoints); assert.deepEqual(undone.progress, before.progress);
      await click('[data-walk-reveal]'); await click('[data-walk-anamorphosis-redo]'); const assisted = await state();
      assert(assisted.progress.anamorphosis.assisted); assert.equal(assisted.anamorphosis.seen, 0); assert.deepEqual(assisted.anamorphosis.completed, [0]);
      await page.reload(); await open(); assert.deepEqual(await state(), assisted, 'Both history stacks persist with the rest of the saved room');
      await click('[data-walk-anamorphosis-undo]'); assert.deepEqual((await state()).anamorphosis.offsets, targets[1]);
      await click('[data-walk-anamorphosis-next]'); assert.equal((await state()).anamorphosis.round, 1); assert.deepEqual((await state()).anamorphosis.history, { past: [], future: [] });
      await offset(.2); assert.equal((await state()).anamorphosis.history.past.length, 1); await click('[data-walk-anamorphosis-set-next]');
      assert.equal((await state()).anamorphosis.set, 2); assert.deepEqual((await state()).anamorphosis.history, { past: [], future: [] });
      await offset(10); await click('[data-walk-reset]'); assert.deepEqual((await state()).anamorphosis.history, { past: [], future: [] });
      assert.equal((await state()).notes.anamorphosis, before.notes.anamorphosis); assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('touch transactions and undo controls remain usable and nonoverlapping on narrow phones', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); const cdp = await page.context().newCDPSession(page);
      try {
        for (const set of [0, 1, 2]) {
          await seed(set); const points = await dragPoints(set), before = await state(); assert.equal(points.hit, 'anamorphosis-B');
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points.start] });
          for (const delta of [20, 40, 60]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.start.x + delta, y: points.start.y + 1 }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(100);
          const changed = await state(); assert.notDeepEqual(changed.anamorphosis.offsets, before.anamorphosis.offsets); assert.equal(changed.anamorphosis.history.past.length, 1); assert.deepEqual(changed.player, before.player);
          await click('[data-walk-anamorphosis-undo]'); assert.deepEqual((await state()).anamorphosis.offsets, before.anamorphosis.offsets);
          await click('[data-walk-anamorphosis-redo]'); assert.deepEqual((await state()).anamorphosis.offsets, changed.anamorphosis.offsets);
        }
      } finally { await cdp.detach(); }
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await capture('history-canvas-' + width);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
        const undo = await page.locator('[data-walk-anamorphosis-undo]').boundingBox(), redo = await page.locator('[data-walk-anamorphosis-redo]').boundingBox();
        assert(undo.width >= 32 && undo.height >= 32 && redo.width >= 32 && redo.height >= 32, 'History controls remain practical touch targets');
        assert(undo.x + undo.width <= redo.x || redo.x + redo.width <= undo.x || undo.y + undo.height <= redo.y || redo.y + redo.height <= undo.y, 'History controls do not overlap');
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'history-layout-' + width + '.png') });
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      }
    });
    await check('Plan and no-WebGL fallback retain reversible geometry and accessible history controls', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await seed(2); await click('[data-walk-diagram-toggle]');
      const svg = page.locator('[data-walk-anamorphosis-plan]'), before = await svg.innerHTML(); await offset(12); const moved = await svg.innerHTML();
      assert.notEqual(moved, before); await click('[data-walk-anamorphosis-undo]'); assert.equal(await svg.innerHTML(), before);
      await click('[data-walk-anamorphosis-redo]'); assert.equal(await svg.innerHTML(), moved); assert(!/NaN|Infinity/.test(moved));
      await captureElement(svg, 'history-plan-320', 10);
      await page.goto(url + '?no-webgl'); await open(true); await seed(1);
      const fallback = page.locator('[data-walk-anamorphosis-plan]'), original = await fallback.innerHTML(); await offset(.7); const changed = await fallback.innerHTML();
      assert.notEqual(changed, original); await click('[data-walk-anamorphosis-undo]'); assert.equal(await fallback.innerHTML(), original);
      await click('[data-walk-anamorphosis-redo]'); assert.equal(await fallback.innerHTML(), changed); await captureElement(fallback, 'history-fallback-320', 10);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(report, JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' anamorphosis history browser groups passed.');
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
