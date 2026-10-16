'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-anamorphosis-rotation-qa');
const report = path.join(out, process.env.PERCEPTION_QA_FILTER ? 'focused-results.json' : 'results.json');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
const targets = [[15, -12], [-18, 9]];
const front = { x: 216, z: 10, yaw: 0, pitch: 0 };
const center = item => ({ x: (item.from.x + item.to.x) / 2, y: (item.from.y + item.to.y) / 2, z: (item.from.z + item.to.z) / 2 });
const length = item => Math.hypot(item.to.x - item.from.x, item.to.y - item.from.y, item.to.z - item.from.z);
const close = (actual, expected, message, tolerance = 1e-5) => assert(Math.abs(actual - expected) < tolerance, (message || 'Numeric equality') + ': ' + actual + ' versus ' + expected);

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
  const offset = async value => {
    await page.locator('[data-walk-anamorphosis-offset]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const seed = async (round = 0, offsets = round ? [30, -30] : [-30, 30]) => {
    await click('[data-walk-reset]'); await patch({ anamorphosis: { set: 2, round, offsets }, player: front, precise: false });
    assert.equal((await state()).anamorphosis.set, 2);
    assert.equal(await page.locator('[data-walk-anamorphosis-set-label]').textContent(), 'Angular alignment');
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
  const capture = async name => {
    await settled(); const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {});
    const png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank rendered room');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  // Use actual rendered endpoints and independent camera projection, not the model's solution or drag helper.
  const dragPoints = async (choice, degrees, fraction = .8) => {
    await settled(); return page.evaluate(({ choice, degrees, fraction }) => {
      const d = window.__anamorphosisViewer.debug(), camera = d.camera, rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const beam = d.anamorphosisObjects.find(item => item.choice === choice), mid = { x: (beam.from.x + beam.to.x) / 2, y: (beam.from.y + beam.to.y) / 2, z: beam.from.z };
      const point = { x: beam.from.x + (beam.to.x - beam.from.x) * fraction, y: beam.from.y + (beam.to.y - beam.from.y) * fraction, z: beam.from.z };
      const radians = degrees * Math.PI / 180, dx = point.x - mid.x, dy = point.y - mid.y;
      const rotated = { x: mid.x + dx * Math.cos(radians) - dy * Math.sin(radians), y: mid.y + dx * Math.sin(radians) + dy * Math.cos(radians), z: point.z };
      function project(q) {
        const yaw = camera.yaw * Math.PI / 180, pitch = camera.pitch * Math.PI / 180, dx = q.x - camera.x, dy = q.y - camera.y, dz = q.z - camera.z;
        const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), scale = Math.tan(camera.fov * Math.PI / 360);
        return { x: rect.left + rect.width / 2 + (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale) * rect.height / 2, y: rect.top + rect.height / 2 - (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale) * rect.height / 2 };
      }
      const start = project(point), target = project(rotated);
      return { start, target, hit: window.__anamorphosisViewer.pick(start.x, start.y)?.id };
    }, { choice, degrees, fraction });
  };
  const drag = async points => {
    await page.mouse.move(points.start.x, points.start.y); await page.mouse.down();
    await page.mouse.move(points.target.x, points.target.y, { steps: 6 }); await page.mouse.up(); await settled();
  };
  const observe = async () => {
    await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-anamorphosis-record]');
    await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
    await click('[data-walk-anamorphosis-view="front"]');
  };
  const align = async round => {
    for (const [index, value] of targets[round].entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
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
    await check('angular desktop dragging follows the physical beam around a fixed pivot, including wrap and fine control', async () => {
      for (const round of [0, 1]) for (const side of ['front', 'side']) for (const choice of ['B', 'C']) {
        await seed(round, [0, 0]); await click('[data-walk-anamorphosis-view="' + side + '"]');
        const points = await dragPoints(choice, 12), before = await state(), original = await debug(), hash = await capture();
        assert.equal(points.hit, 'anamorphosis-' + choice); await drag(points);
        const changed = await state(), actual = await debug(), index = choice === 'B' ? 0 : 1;
        close(changed.anamorphosis.offsets[index], 12, 'Perspective-correct angular drag', .001);
        assert.equal(changed.anamorphosis.offsets[1 - index], 0); assert.deepEqual(changed.player, before.player); assert.notEqual(await capture(), hash);
        for (const [i, item] of actual.anamorphosisObjects.entries()) {
          close(length(item), length(original.anamorphosisObjects[i]), 'Rigid beam length');
          for (const axis of ['x', 'y', 'z']) close(center(item)[axis], center(original.anamorphosisObjects[i])[axis], 'Fixed pivot ' + axis);
          close(item.from.z, original.anamorphosisObjects[i].from.z, 'Fixed depth'); close(item.to.z, original.anamorphosisObjects[i].to.z, 'Fixed depth');
        }
      }
      await seed(1, [0, -16]); const wrap = await dragPoints('C', 30); assert.equal(wrap.hit, 'anamorphosis-C');
      await drag(wrap); close((await state()).anamorphosis.offsets[1], 14, 'Crossing the atan2 boundary takes the short angular path', .001);
      await seed(0, [0, 0]); await click('[data-walk-precision]'); await drag(await dragPoints('B', 20));
      close((await state()).anamorphosis.offsets[0], 5, 'Fine drag is a quarter of ordinary angular movement', .001);
      await click('[data-walk-precision]'); await capture('desktop-angular-drag');
    });
    await check('rotating beams and labels fit both observation views across desktop and phone sizes', async () => {
      await seed();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) for (const kind of ['initial', 'aligned', 'extreme', 'opposite']) {
          const offsets = kind === 'aligned' ? targets[round] : kind === 'extreme' ? [-45, 45] : kind === 'opposite' ? [45, -45] : round ? [30, -30] : [-30, 30];
          await patch({ anamorphosis: { set: 2, round, offsets }, player: front }); let frontHash;
          for (const side of ['front', 'side']) {
            await click('[data-walk-anamorphosis-view="' + side + '"]'); await settled();
            const d = await debug(), camera = d.camera, rect = await page.locator('[data-perception-walk] canvas').boundingBox();
            const scale = Math.tan(camera.fov * Math.PI / 360), yaw = camera.yaw * Math.PI / 180, pitch = camera.pitch * Math.PI / 180;
            const project = point => {
              const dx = point.x - camera.x, dy = point.y - camera.y, dz = point.z - camera.z;
              const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch);
              return { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / distance, y: (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / distance, distance };
            };
            for (const item of d.anamorphosisObjects) for (const endpoint of [item.from, item.to]) {
              const q = project(endpoint), nx = q.x / (scale * rect.width / rect.height), ny = q.y / scale;
              assert(q.distance > 0 && Math.abs(nx) < .94 && Math.abs(ny) < .94, JSON.stringify({ width, round, kind, side, nx, ny }));
            }
            if (kind === 'aligned') {
              const gaps = d.anamorphosisObjects.map((item, index, all) => {
                const next = all[(index + 1) % all.length], a = project(item.to), b = project(next.from);
                assert(Math.hypot(item.to.x - next.from.x, item.to.y - next.from.y, item.to.z - next.from.z) > 1, 'Triangle corners remain genuinely separated in space');
                return Math.hypot(a.x - b.x, a.y - b.y);
              });
              assert(side === 'front' ? Math.max(...gaps) < 1e-6 : Math.max(...gaps) > .02, 'Actual rendered endpoints align from front only');
            }
            const labels = d.anamorphosisLabels.map(label => {
              assert(label.visible, 'Both movable beam labels remain visible');
              const distance = project(label.position).distance, halfW = label.scale.x / (2 * distance * scale * rect.width / rect.height), halfH = label.scale.y / (2 * distance * scale);
              return { left: label.projected.x - halfW, right: label.projected.x + halfW, bottom: label.projected.y - halfH, top: label.projected.y + halfH };
            });
            assert.equal(labels.length, 2);
            for (const label of labels) assert(label.left > -1 && label.right < 1 && label.bottom > -1 && label.top < 1, 'Labels fit: ' + JSON.stringify({ width, round, kind, side, label }));
            assert(labels[0].right <= labels[1].left || labels[1].right <= labels[0].left || labels[0].top <= labels[1].bottom || labels[1].top <= labels[0].bottom, 'Labels do not overlap');
            const hash = await capture(kind === 'aligned' ? 'aligned-' + round + '-' + side + '-' + width : null);
            if (side === 'front') frontHash = hash; else assert.notEqual(hash, frontHash, 'First-person viewpoint changes the image');
            assert(!(await page.locator('[data-walk-anamorphosis-offset]').isDisabled()));
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          }
        }
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
      }
    });
    await check('both angular puzzles earn credit, cycle through all three sets and preserve notes and bookmarks after reload', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await seed();
      assert(await page.locator('[data-walk-anamorphosis-set-next]').isDisabled());
      for (const round of [0, 1]) {
        await align(round); await click('[data-walk-check]'); assert(!(await state()).anamorphosis.completed.includes(round));
        await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
        await click('[data-walk-check]'); assert(!(await state()).anamorphosis.completed.includes(round), 'Side view cannot award a solution');
        await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]'); assert((await state()).anamorphosis.completed.includes(round));
        if (!round) { assert(await page.locator('[data-walk-anamorphosis-set-next]').isDisabled()); await click('[data-walk-anamorphosis-next]'); }
      }
      assert((await state()).anamorphosis.mastered); assert((await state()).progress.anamorphosis.solved);
      await page.locator('[data-walk-note]').fill('Rotating a beam changes its direction, not its length or depth.');
      await click('[data-walk-viewpoint-save="A"]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-viewpoint-save="B"]');
      await click('[data-walk-anamorphosis-set-next]'); assert.equal((await state()).anamorphosis.set, 0); assert.deepEqual((await state()).anamorphosis.completed, []);
      for (const expected of [1, 2]) {
        await click('[data-walk-reveal]'); assert((await state()).progress.anamorphosis.assisted);
        await click('[data-walk-anamorphosis-set-next]'); const next = await state();
        assert.equal(next.anamorphosis.set, expected); assert(next.anamorphosis.mastered); assert(!next.progress.anamorphosis.assisted); assert.deepEqual(next.anamorphosis.completed, []);
      }
      const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await click('[data-walk-viewpoint-recall="A"]'); assert.equal((await state()).player.x, 216);
      await click('[data-walk-viewpoint-recall="B"]'); assert.equal((await state()).player.x, 220.4);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('angular evidence follows the current geometry and reveal guides never award assisted credit', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await seed(); await observe(); assert.equal((await state()).anamorphosis.seen, 3);
      await offset(-20); assert.equal((await state()).anamorphosis.seen, 0); await click('[data-walk-reveal]'); await capture('rotation-reveal');
      const revealed = await debug(); assert.equal(revealed.anamorphosisGuides.length, 3);
      for (const [i, item] of revealed.anamorphosisGuides.entries()) {
        const next = revealed.anamorphosisGuides[(i + 1) % 3], physical = revealed.anamorphosisObjects[i];
        close((item.to.x - 216) / (10 - item.to.z), (next.from.x - 216) / (10 - next.from.z), 'Guide joins horizontally');
        close((item.to.y - 1.65) / (10 - item.to.z), (next.from.y - 1.65) / (10 - next.from.z), 'Guide joins vertically');
        close(length(item), length(physical), 'Guide keeps physical beam length');
        for (const axis of ['x', 'y', 'z']) close(center(item)[axis], center(physical)[axis], 'Guide keeps fixed pivot');
      }
      assert((await state()).progress.anamorphosis.assisted); await align(0); await observe(); await click('[data-walk-check]');
      assert.deepEqual((await state()).anamorphosis.completed, []); assert(!(await state()).progress.anamorphosis.solved);
      await patch({ player: { ...front, yaw: 180 } }); assert(await page.locator('[data-walk-anamorphosis-offset]').isDisabled());
      await click('[data-walk-home]'); await click('[data-walk-reset]');
    });
    await check('phone touch rotation preserves page scrolling and native keyboard and fine step controls', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await seed(0, [0, 0]);
      const cdp = await page.context().newCDPSession(page);
      try {
        const p = (await dragPoints('B', 0)).start, before = await state();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 45, y: p.y + 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        const changed = await state(); assert(changed.anamorphosis.offsets[0] > before.anamorphosis.offsets[0]); assert.deepEqual(changed.player, before.player);
        const q = (await dragPoints('B', 0)).start, stable = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 70 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert.deepEqual((await state()).anamorphosis, stable.anamorphosis); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
      await click('[data-walk-anamorphosis-choice="1"]'); await offset(0); const slider = page.locator('[data-walk-anamorphosis-offset]');
      assert.equal(await slider.getAttribute('min'), '-45'); assert.equal(await slider.getAttribute('max'), '45'); assert.equal(await slider.getAttribute('step'), '0.5');
      await slider.press('ArrowRight'); close((await state()).anamorphosis.offsets[1], .5, 'Native keyboard angular step');
      await offset(0); await click('[data-walk-anamorphosis-clockwise]'); close((await state()).anamorphosis.offsets[1], -3, 'Clockwise step');
      await click('[data-walk-anamorphosis-counterclockwise]'); close((await state()).anamorphosis.offsets[1], 0, 'Counterclockwise step');
      await click('[data-walk-precision]'); await click('[data-walk-anamorphosis-counterclockwise]'); close((await state()).anamorphosis.offsets[1], .5, 'Fine angular step');
      await offset(45); assert(await page.locator('[data-walk-anamorphosis-counterclockwise]').isDisabled());
      await offset(-45); assert(await page.locator('[data-walk-anamorphosis-clockwise]').isDisabled());
      await click('[data-walk-precision]');
    });
    await check('angular Plan and no-WebGL views remain keyboard accessible and solve the full comparison', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await seed(); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-diagram-toggle]'); const svg = page.locator('[data-walk-anamorphosis-plan]');
      await svg.getByRole('button', { name: 'Select beam C' }).press('Enter'); assert.equal((await state()).anamorphosis.selected, 1);
      const before = await svg.innerHTML(); await offset(10); assert.notEqual(await svg.innerHTML(), before); assert(!/NaN|Infinity/.test(await svg.innerHTML()));
      await svg.screenshot({ path: path.join(out, 'angular-plan-320.png') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await page.goto(url + '?no-webgl'); await open(true); await seed(); assert(await page.locator('[data-walk-anamorphosis-plan]').isVisible());
      for (const round of [0, 1]) {
        await align(round); await observe(); await click('[data-walk-check]'); assert((await state()).anamorphosis.completed.includes(round));
        if (!round) await click('[data-walk-anamorphosis-next]');
      }
      assert((await state()).anamorphosis.mastered); assert((await state()).progress.anamorphosis.solved);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(report, JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' angular anamorphosis browser groups passed.');
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
