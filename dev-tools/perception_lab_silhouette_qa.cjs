'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-silhouette-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__silhouetteViewer.debug());
  const check = async (name, run) => { current = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const angle = async value => {
    await page.locator('[data-walk-silhouette-angle]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__silhouetteViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return ['x', 'z', 'yaw', 'pitch'].every(key => Math.abs(d.camera[key] - s.player[key]) < 1e-6)
        && d.silhouetteSet === s.silhouette.set && d.silhouetteRound === s.silhouette.round && Math.abs(d.silhouetteAngle - s.silhouette.angle) < 1e-6;
    });
  };
  const capture = async name => {
    await settled(); const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {});
    const png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank rendered 3D room');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const point = async name => {
    await settled(); return page.evaluate(name => {
      const p = window.__silhouetteViewer.debug().silhouetteProjected[name], r = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const x = r.left + (p.x + 1) * r.width / 2, y = r.top + (1 - p.y) * r.height / 2;
      return { x, y, hit: window.__silhouetteViewer.pick(x, y)?.id };
    }, name);
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__silhouetteViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="silhouette"]');
    await check('physical turntable and sculpture selection respond without moving the player', async () => {
      await click('[data-walk-reset]'); assert.equal(await page.locator('[data-walk-activity]').count(), 20);
      const first = await capture('desktop-front'), before = await state(), p = await point('dial'); assert.equal(p.hit, 'silhouette-dial');
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 50, p.y, { steps: 6 }); await page.mouse.up(); await settled();
      assert(Math.abs((await state()).silhouette.angle - 20) < .01); assert.deepEqual((await state()).player, before.player);
      assert.notEqual(await capture('desktop-turned'), first);
      await click('[data-walk-precision]'); await angle(30); const fine = await point('dial');
      await page.mouse.move(fine.x, fine.y); await page.mouse.down(); await page.mouse.move(fine.x + 50, fine.y, { steps: 6 }); await page.mouse.up(); await settled();
      assert(Math.abs((await state()).silhouette.angle - 35) < .01); await click('[data-walk-precision]');
      for (const choice of ['A', 'B']) { const p = await point(choice); assert.equal(p.hit, 'silhouette-' + choice); await page.mouse.click(p.x, p.y); assert.equal((await state()).silhouette.choice, choice); }
      await angle(0); const dial = await point('dial'); await page.mouse.click(dial.x, dial.y); assert.equal((await state()).silhouette.angle, 15);
    });
    await check('crosshair interaction operates the dial and either candidate', async () => {
      for (const choice of ['dial', 'A', 'B']) {
        await click('[data-walk-home]'); await angle(0); await settled();
        const d = await debug(), s = await state();
        const target = choice === 'dial' ? { x: 204, y: 1.15, z: 3 } : d.silhouetteObjects.find(object => object.choice === choice).cubes[0].center;
        const dx = target.x - s.player.x, dz = s.player.z - target.z;
        await patch({ player: { ...s.player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(target.y - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI } }); await settled();
        await page.locator('[data-walk-stage]').press('e');
        if (choice === 'dial') assert.equal((await state()).silhouette.angle, 15); else assert.equal((await state()).silhouette.choice, choice);
      }
      await click('[data-walk-home]');
    });
    await check('both trials remain fully framed and nonblank at desktop and phone sizes', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) for (const amount of [0, 45, 90]) {
          await patch({ silhouette: { round, angle: amount } }); await settled(); const d = await debug();
          assert.equal(d.silhouetteObjects.length, 2);
          const c = d.camera, yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180;
          const rect = await page.locator('[data-perception-walk] canvas').boundingBox(), scale = Math.tan(c.fov * Math.PI / 360);
          const framed = q => {
            const dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw);
            const distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), nx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * rect.width / rect.height), ny = (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale);
            assert(distance > 0 && Math.abs(nx) < .98 && Math.abs(ny) < .98, 'Framed cube/panel: ' + JSON.stringify({ width, round, amount, q, nx, ny }));
          };
          for (const object of d.silhouetteObjects) {
            assert.equal(object.cubes.length, 8); assert(Math.abs(object.angle - amount) < 1e-6);
            for (const [index, cube] of object.cubes.entries()) {
              cube.corners.forEach(framed);
              const cell = object.cells[index], a = amount * Math.PI / 180, x = (cell[0] - 1) * object.cellSize, z = (cell[2] - 1) * object.cellSize;
              assert(Math.abs(cube.center.x - object.x - x * Math.cos(a) - z * Math.sin(a)) < 1e-6);
              assert(Math.abs(cube.center.y - object.y - cell[1] * object.cellSize) < 1e-6);
              assert(Math.abs(cube.center.z - object.z + x * Math.sin(a) - z * Math.cos(a)) < 1e-6);
            }
          }
          for (const panel of d.silhouettePanels) {
            for (const x of [panel.min.x, panel.max.x]) for (const y of [panel.min.y, panel.max.y]) framed({ x, y, z: panel.max.z });
            panel.squares.forEach(square => square.corners.forEach(framed));
          }
          for (const label of [...d.silhouetteLabels, ...d.silhouetteReferenceLabels]) {
            for (const x of [-1, 1]) for (const y of [-1, 1]) framed({ x: label.position.x + x * label.scale.x / 2, y: label.position.y + y * label.scale.y / 2, z: label.position.z });
            assert(label.position.y + label.scale.y / 2 < 5.5, 'Labels stay below the ceiling');
          }
          for (const label of d.silhouetteReferenceLabels) {
            const pixels = label.scale.y * rect.height / (2 * (c.z - label.position.z) * scale);
            assert(pixels >= 15.5, 'Reference labels remain readable');
            assert(label.position.y - label.scale.y / 2 > Math.max(...d.silhouettePanels.map(panel => panel.max.y)), 'Reference labels do not cover targets');
          }
          for (const key of ['A', 'B', 'dial']) { const p = d.silhouetteProjected[key]; assert(Math.abs(p.x) < .98 && Math.abs(p.y) < .98); assert.equal((await point(key)).hit, 'silhouette-' + key); }
          await capture();
        }
        await capture('canvas-' + width); await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
      }
    });
    await check('two earned matches survive reload, notes and saved viewpoints', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      for (const [round, choice] of [[0, 'A'], [1, 'B']]) {
        await click('[data-walk-silhouette-choice="' + choice + '"]'); await click('[data-walk-check]'); assert(!(await state()).silhouette.completed.includes(round));
        await angle(45); await click('[data-walk-check]'); assert(!(await state()).silhouette.completed.includes(round));
        await angle(90); await click('[data-walk-silhouette-choice="' + (choice === 'A' ? 'B' : 'A') + '"]'); await click('[data-walk-check]'); assert(!(await state()).silhouette.completed.includes(round));
        await click('[data-walk-silhouette-choice="' + choice + '"]'); await click('[data-walk-check]'); assert((await state()).silhouette.completed.includes(round));
        if (!round) await click('[data-walk-silhouette-next]');
      }
      assert((await state()).progress.silhouette.solved); await page.locator('[data-walk-note]').fill('One front outline can hide different depths.');
      await click('[data-walk-viewpoint-save="A"]'); await angle(35); const saved = await state(); await click('[data-walk-viewpoint-recall="A"]'); assert.deepEqual((await state()).silhouette, saved.silhouette);
      const beforeReload = await state(); await page.reload(); await open(); assert.deepEqual(await state(), beforeReload);
      await click('[data-walk-reveal]'); assert.equal((await state()).progress.silhouette.assisted, false); await capture('earned-reveal');
      await click('[data-walk-reset]'); assert.equal((await state()).notes.silhouette, saved.notes.silhouette); assert.deepEqual((await state()).viewpoints, saved.viewpoints);
    });
    await check('the second puzzle set preserves mastery while awarding only new earned matches', async () => {
      await patch({ silhouette: { completed: [0, 1] }, progress: { silhouette: { assisted: false } } });
      const saved = await state(); await click('[data-walk-silhouette-set-next]');
      assert.equal((await state()).silhouette.set, 1); assert((await state()).progress.silhouette.solved);
      assert.deepEqual((await state()).silhouette.completed, []); assert.deepEqual((await state()).notes, saved.notes); assert.deepEqual((await state()).viewpoints, saved.viewpoints);
      for (const [round, correct] of [[0, 'B'], [1, 'A']]) {
        await angle(90); await settled(); const d = await debug(); assert.equal(d.silhouetteSet, 1); d.silhouetteObjects.forEach(object => assert.equal(object.cubes.length, 10));
        const expected = await page.evaluate(() => StemLab.PerceptionWalk.silhouetteReference(window.__perceptionPreview.state.perceptionWalk.silhouette.round, 1)); assert.deepEqual(d.silhouetteReference, expected);
        await click('[data-walk-silhouette-choice="' + (correct === 'A' ? 'B' : 'A') + '"]'); await click('[data-walk-check]'); assert(!(await state()).silhouette.completed.includes(round));
        await click('[data-walk-silhouette-choice="' + correct + '"]'); await click('[data-walk-check]'); assert((await state()).silhouette.completed.includes(round));
        if (!round) { assert.match(await page.locator('[data-walk-status]').innerText(), /next pair/i); await click('[data-walk-silhouette-next]'); }
      }
      await capture('second-set-earned'); const completed = await state(); await page.reload(); await open(); assert.deepEqual(await state(), completed);
      await click('[data-walk-silhouette-set-next]'); assert.equal((await state()).silhouette.set, 0); await click('[data-walk-reveal]');
      assert((await state()).progress.silhouette.assisted); assert((await state()).progress.silhouette.solved);
      await angle(90); await click('[data-walk-silhouette-choice="A"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).silhouette.completed, []);
      await click('[data-walk-reset]'); assert.equal((await state()).silhouette.mastered, false);
    });
    await check('close inspection frames every sculpture while preserving puzzle state and readable controls', async () => {
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const set of [0, 1]) for (const round of [0, 1]) for (const amount of [0, 45, 90]) {
          await patch({ silhouette: { set, round, angle: amount, choice: 'B', seen: 1 }, player: { x: 204, z: 11, yaw: 0, pitch: 0 } }); const before = await state();
          for (const choice of ['A', 'B']) for (const side of ['front', 'side']) {
            await click('[data-walk-silhouette-inspect="' + choice + '"]'); await click('[data-walk-silhouette-view="' + side + '"]'); await settled();
            const after = await state(), d = await debug(); assert.deepEqual(after.silhouette, before.silhouette); assert.deepEqual(after.progress, before.progress);
            assert.equal(d.silhouetteInspection, choice); assert.equal(d.silhouetteInspectionSide, side);
            assert(d.silhouetteLabels.every(label => !label.visible)); assert(d.silhouetteReferenceLabels.every(label => !label.visible));
            assert(await page.locator('[data-walk-silhouette-reference-strip]').isVisible()); assert.equal(await page.locator('[data-walk-silhouette-mini-reference]').count(), 2);
            assert(!(await page.locator('[data-walk-silhouette-angle]').isDisabled())); assert.equal((await point(choice)).hit, 'silhouette-' + choice);
            const c = d.camera, yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180, rect = await page.locator('[data-perception-walk] canvas').boundingBox(), scale = Math.tan(c.fov * Math.PI / 360);
            for (const cube of d.silhouetteObjects.find(object => object.choice === choice).cubes) for (const q of cube.corners) {
              const dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw);
              const distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), nx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * rect.width / rect.height), ny = (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale);
              assert(distance > 0 && Math.abs(nx) < .98 && Math.abs(ny) < .98, JSON.stringify({ width, set, round, amount, choice, side, nx, ny }));
            }
            if (set === 1 && round === 1 && amount === 45) await capture('inspection-' + choice + '-' + side + '-' + width);
          }
        }
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'inspection-layout-' + width + '.png') });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        for (const selector of ['[data-walk-silhouette-front]', '[data-walk-silhouette-side]']) assert(await page.locator(selector).evaluate(node => node.scrollWidth <= node.clientWidth), 'Orientation button content fits');
      }
      await click('[data-walk-silhouette-inspect="A"]'); await click('[data-walk-silhouette-view="side"]');
      const closeState = await state();
      for (const key of ['ArrowRight', 'PageUp', 'ArrowDown']) await page.locator('[data-walk-stage]').press(key);
      await settled();
      const nudged = await state(), closeDebug = await debug();
      assert.notDeepEqual(nudged.player, closeState.player); assert.deepEqual(nudged.silhouette, closeState.silhouette);
      assert.equal(closeDebug.silhouetteInspection, 'A'); assert.equal(closeDebug.silhouetteInspectionSide, 'side');
      assert(closeDebug.silhouetteLabels.every(label => !label.visible)); assert(closeDebug.silhouetteReferenceLabels.every(label => !label.visible));
      assert(await page.locator('[data-walk-silhouette-reference-strip]').isVisible()); assert(!(await page.locator('[data-walk-silhouette-angle]').isDisabled()));
      await capture('inspection-adjusted-320');
      await page.locator('[data-walk-stage]').press('ArrowRight'); await page.locator('[data-walk-stage]').press('ArrowRight'); await settled();
      assert.equal((await debug()).silhouetteInspection, null); assert((await debug()).silhouetteLabels.every(label => !label.visible), 'Nearby badges remain out of the sightline after leaving the preset');
      await click('[data-walk-silhouette-inspect="B"]'); await click('[data-walk-silhouette-view="side"]');
      await click('[data-walk-viewpoint-save="A"]'); const saved = await state(); await click('[data-walk-silhouette-overview]');
      await settled(); assert((await debug()).silhouetteLabels.every(label => label.visible)); await click('[data-walk-viewpoint-recall="A"]');
      assert.deepEqual((await state()).player, saved.player); assert.deepEqual((await state()).silhouette, saved.silhouette);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-diagram-toggle]');
      for (const choice of ['A', 'B']) for (const side of ['front', 'side']) {
        await click('[data-walk-silhouette-inspect="' + choice + '"]'); await click('[data-walk-silhouette-view="' + side + '"]');
        const bounds = await page.locator('[data-walk-silhouette-plan]').evaluate((svg, choice) => {
          const points = [...svg.querySelectorAll('[data-walk-silhouette-solid="' + choice + '"]')].flatMap(polygon => polygon.getAttribute('points').split(' ').map(point => point.split(',').map(Number)));
          return { minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])), minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) };
        }, choice);
        assert(bounds.minX >= 0 && bounds.maxX <= 800 && bounds.minY >= 0 && bounds.maxY <= 600 && bounds.maxY - bounds.minY > 250, 'The fallback fits the inspected target: ' + JSON.stringify(bounds));
        await page.locator('[data-walk-silhouette-plan]').screenshot({ path: path.join(out, 'inspection-plan-' + choice + '-' + side + '.png') });
      }
      await click('[data-walk-silhouette-overview]'); await click('[data-walk-diagram-toggle]'); await click('[data-walk-reset]');
    });
    await check('practice reveal cannot award a solve and off-station controls stay gated', async () => {
      await click('[data-walk-reveal]'); await angle(90); await click('[data-walk-silhouette-choice="A"]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).silhouette.completed, []); assert.equal((await state()).progress.silhouette.solved, false);
      const s = await state(); await patch({ player: { ...s.player, yaw: 180 } }); const before = await state();
      assert(await page.locator('[data-walk-silhouette-angle]').isDisabled());
      await page.locator('[data-walk-silhouette-choice="B"]').evaluate(node => node.click()); assert.deepEqual((await state()).silhouette, before.silhouette);
      await click('[data-walk-home]'); await click('[data-walk-reset]');
    });
    await check('touch turns the dial while vertical gestures preserve native scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); const cdp = await page.context().newCDPSession(page);
      try {
        const p = await point('dial'), before = await state();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 50, y: p.y + 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert(Math.abs((await state()).silhouette.angle - 20) < .01); assert.deepEqual((await state()).player, before.player);
        const q = await point('dial'), after = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 80 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert.deepEqual((await state()).silhouette, after.silhouette); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('accessible Plan and no-WebGL fallback preserve all puzzle controls', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-diagram-toggle]'); const old = await page.locator('[data-walk-silhouette-plan]').innerHTML(); await angle(90);
      assert.notEqual(await page.locator('[data-walk-silhouette-plan]').innerHTML(), old); assert(!/NaN|Infinity/.test(await page.locator('[data-walk-silhouette-plan]').innerHTML()));
      await page.locator('[data-walk-silhouette-plan]').screenshot({ path: path.join(out, 'plan-320.png') });
      const saved = await state(); await click('[data-walk-activity="length"]'); await click('[data-walk-activity="silhouette"]'); assert.deepEqual((await state()).silhouette, saved.silhouette);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
      await page.goto(url + '?no-webgl'); await open(true); assert(await page.locator('[data-walk-silhouette-plan]').isVisible());
      await angle(0); await click('[data-walk-silhouette-choice="A"]'); await angle(90); await click('[data-walk-check]'); assert((await state()).silhouette.completed.includes(0));
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: true, checks, errors }, null, 2));
    console.log('All ' + checks.length + ' silhouette browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
