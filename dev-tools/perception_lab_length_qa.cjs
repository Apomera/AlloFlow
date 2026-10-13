'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-length-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__lengthViewer.debug());
  const check = async (name, run) => { current = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const value = async amount => {
    await page.locator('[data-walk-length-value]').evaluate((node, amount) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(amount));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, amount);
    await page.waitForTimeout(100);
  };
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__lengthViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return ['x', 'z', 'yaw', 'pitch'].every(key => Number.isFinite(d.camera[key]) && Math.abs(d.camera[key] - s.player[key]) < 1e-6)
        && d.lengthRound === s.length.round && Math.abs(d.lengthValue - s.length.value) < 1e-6 && d.lengthVisible === s.length.visible;
    });
  };
  const capture = async name => {
    await settled();
    const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank first-person scene');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const point = async name => {
    await settled();
    return page.evaluate(name => {
      const p = window.__lengthViewer.debug().lengthProjected[name], r = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const x = r.left + (p.x + 1) * r.width / 2, y = r.top + (1 - p.y) * r.height / 2;
      return { x, y, hit: window.__lengthViewer.pick(x, y)?.id, coordinate: window.__lengthViewer.lengthCoordinate(x, y) };
    }, name);
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__lengthViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const drag = async (dx, fine, endpoint = 'handle') => {
    const before = await state(), start = await point(endpoint), geometryBefore = (await debug()).lengthObjects.adjustable;
    assert.equal(start.hit, endpoint === 'from' ? 'length-rod' : 'length-handle'); assert(Number.isFinite(start.coordinate));
    const direction = start.coordinate < 192 ? -1 : 1;
    const end = { x: start.x + dx, y: start.y };
    const coordinate = await page.evaluate(p => window.__lengthViewer.lengthCoordinate(p.x, p.y), end); assert(Number.isFinite(coordinate));
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 6 }); await page.mouse.up(); await settled();
    const after = await state(), expected = Math.max(1.8, Math.min(4.2, before.length.value + direction * 2 * (coordinate - start.coordinate) * (fine ? .25 : 1)));
    assert(Math.abs(after.length.value - expected) < .011, 'Dragging changes the rod by twice its endpoint displacement');
    assert.notEqual(after.length.value, before.length.value); assert.deepEqual(after.player, before.player);
    const cap = endpoint === 'from' ? 'from' : 'to', geometryAfter = (await debug()).lengthObjects.adjustable;
    assert.equal(Math.sign(geometryAfter[cap].x - geometryBefore[cap].x), Math.sign(coordinate - start.coordinate), 'The grabbed rendered cap follows the pointer direction');
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="length"]');
    await check('physical fins switch and endpoint drag update the rendered comparison', async () => {
      await click('[data-walk-reset]'); const initial = await capture('desktop-fins'); assert.equal((await debug()).lengthFins, 8);
      assert.match(await page.locator('[data-walk-waypoint="length"]').innerText(), /Length/);
      const toggle = await point('switch'); assert.equal(toggle.hit, 'length-fins');
      await page.mouse.click(toggle.x, toggle.y); await settled(); assert.equal((await state()).length.visible, false); assert.equal((await debug()).lengthFins, 0);
      assert.notEqual(await capture('desktop-bare'), initial);
      await value(2.8); const old = await capture(); await drag(24, false); assert.notEqual(await capture('endpoint-drag'), old);
      await click('[data-walk-precision]'); await value(2.8); await drag(24, true); await click('[data-walk-precision]');
      await value(3); await drag(24, false, 'from'); await value(3); await drag(-24, false, 'from');
      await click('[data-walk-precision]'); await value(3); await drag(24, true, 'from'); await click('[data-walk-precision]');
      await value(2.8); const handle = await point('handle'); await page.mouse.click(handle.x, handle.y); await settled(); assert(Math.abs((await state()).length.value - 2.9) < 1e-6);
    });
    await check('crosshair interaction reaches the handle and switch from every inspection view', async () => {
      for (const side of ['front', 'left', 'right']) for (const control of ['handle', 'switch']) {
        await click('[data-walk-length-view="' + side + '"]'); await value(2.8); await settled();
        const before = await state(), d = await debug(), target = control === 'handle' ? d.lengthHandle : { x: 188.5, y: 1.1, z: 2.2 };
        const dx = target.x - before.player.x, dz = before.player.z - target.z;
        await patch({ player: { ...before.player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(target.y - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI } }); await settled();
        assert(!(await page.locator('[data-walk-length-value]').isDisabled()));
        await page.locator('[data-walk-stage]').press('e'); await page.waitForTimeout(100);
        if (control === 'handle') assert(Math.abs((await state()).length.value - 2.9) < 1e-6); else assert.equal((await state()).length.visible, !before.length.visible);
      }
      await click('[data-walk-length-view="front"]');
    });
    await check('both fin arrangements and rod extremes remain framed on desktop and phones', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) for (const amount of [1.8, 3, 4.2]) for (const visible of [true, false]) {
          await patch({ length: { round, value: amount, visible } });
          for (const side of ['front', 'left', 'right']) {
            await click('[data-walk-length-view="' + side + '"]'); await settled(); const d = await debug();
            for (const name of ['referenceFrom', 'referenceTo', 'from', 'to', 'center', 'handle', 'switch']) {
              const p = d.lengthProjected[name]; assert(p && Math.abs(p.x) < .97 && Math.abs(p.y) < .97 && p.z > -1 && p.z < 1, JSON.stringify({ width, round, amount, visible, side, name, p }));
            }
            assert.equal(d.lengthFins, visible ? 8 : 0); assert.equal((await point('handle')).hit, 'length-handle');
            assert(Math.abs(d.lengthHandle.x - 192 - amount / 2) < 1e-6);
            const reference = d.lengthObjects.reference, adjustable = d.lengthObjects.adjustable;
            assert(Math.abs(reference.length - 3) < 1e-6); assert(Math.abs(adjustable.length - amount) < 1e-6);
            assert(Math.abs(reference.from.x - 190.5) < 1e-6 && Math.abs(reference.to.x - 193.5) < 1e-6);
            assert(Math.abs(adjustable.from.x - 192 + amount / 2) < 1e-6 && Math.abs(adjustable.to.x - 192 - amount / 2) < 1e-6);
            if (visible) {
              const c = d.camera, yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180;
              const rect = await page.locator('[data-perception-walk] canvas').boundingBox(), scale = Math.tan(c.fov * Math.PI / 360);
              for (const [index, rod] of [reference, adjustable].entries()) {
                assert.equal(rod.fins.length, 4);
                for (const fin of rod.fins) {
                  const direction = Math.sign((fin.to.x - fin.from.x) * (fin.from.x - 192));
                  assert.equal(direction, round === index ? 1 : -1, 'The two trials reverse each rod\'s fin arrangement');
                  for (const q of [fin.from, fin.to]) {
                    const dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw);
                    const distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), nx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * rect.width / rect.height), ny = (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale);
                    assert(distance > 0 && Math.abs(nx) < .98 && Math.abs(ny) < .98, 'Fin endpoints remain inside the canvas: ' + JSON.stringify({ width, round, amount, side, q, nx, ny }));
                  }
                }
              }
            }
          }
        }
        await click('[data-walk-length-view="front"]'); await capture('canvas-' + width);
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width);
      }
    });
    await check('evidence follows the current adjustment and two earned trials survive reload and viewpoint recall', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      await page.locator('[data-walk-length-value]').focus(); await page.keyboard.press('ArrowRight'); assert(Math.abs((await state()).length.value - 2.21) < 1e-6);
      await click('[data-walk-length-longer]'); assert(Math.abs((await state()).length.value - 2.31) < 1e-6);
      await click('[data-walk-precision]'); await click('[data-walk-length-shorter]'); assert(Math.abs((await state()).length.value - 2.285) < 1e-6); await click('[data-walk-precision]');
      await click('[data-walk-length-visible]'); assert.equal((await state()).length.seen, 3);
      await value(3); assert.equal((await state()).length.seen, 2); await click('[data-walk-check]'); assert.deepEqual((await state()).length.completed, []);
      await click('[data-walk-length-visible]'); await click('[data-walk-check]'); assert.deepEqual((await state()).length.completed, [0]);
      await click('[data-walk-length-next]'); assert.equal((await state()).length.round, 1); assert.equal((await state()).length.value, 3.8);
      await value(3); await click('[data-walk-length-visible]'); await click('[data-walk-check]'); assert.deepEqual((await state()).length.completed, [0, 1]); assert((await state()).progress.length.solved);
      await page.locator('[data-walk-note]').fill('Removing the fins reveals equal rods.');
      await click('[data-walk-viewpoint-save="A"]'); await click('[data-walk-length-view="left"]'); await click('[data-walk-viewpoint-save="B"]');
      await value(3.2); const saved = await state();
      for (const slot of ['A', 'B']) {
        await click('[data-walk-viewpoint-recall="' + slot + '"]'); const recalled = await state();
        assert.deepEqual(recalled.player, saved.viewpoints.length[slot]); assert.deepEqual(recalled.length, saved.length); assert.deepEqual(recalled.progress, saved.progress);
      }
      const beforeReload = await state(); await page.reload(); await open(); assert.deepEqual(await state(), beforeReload);
      await click('[data-walk-reveal]'); assert.equal((await state()).progress.length.assisted, false); await capture('earned-reveal');
      await click('[data-walk-reset]'); assert.deepEqual((await state()).viewpoints, saved.viewpoints); assert.equal((await state()).notes.length, saved.notes.length);
    });
    await check('practice reveal never awards a trial, and off-station controls cannot change the puzzle', async () => {
      await click('[data-walk-home]'); await click('[data-walk-reveal]'); assert((await state()).progress.length.assisted);
      await value(3); await click('[data-walk-length-visible]'); await click('[data-walk-length-visible]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).length.completed, []); assert.equal((await state()).progress.length.solved, false);
      const s = await state(); await patch({ player: { ...s.player, yaw: 180 } });
      for (const selector of ['[data-walk-length-value]', '[data-walk-length-shorter]', '[data-walk-length-longer]', '[data-walk-length-visible]']) assert(await page.locator(selector).isDisabled());
      const before = await state(); await page.locator('[data-walk-length-longer]').evaluate(node => node.click()); assert.deepEqual((await state()).length, before.length);
      await click('[data-walk-home]'); assert(!(await page.locator('[data-walk-length-value]').isDisabled()));
      await patch({ player: { x: 192, z: 1.8, yaw: 0, pitch: 0 } }); assert(await page.locator('[data-walk-length-value]').isDisabled());
      await click('[data-walk-home]'); await click('[data-walk-reset]');
    });
    await check('touch adjusts the endpoint while vertical gestures preserve native page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-length-view="front"]'); await value(2.4);
      const toggle = await point('switch'), beforeVisible = (await state()).length.visible;
      await page.touchscreen.tap(toggle.x, toggle.y); await page.waitForTimeout(150); assert.equal((await state()).length.visible, !beforeVisible);
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const fine of [false, true]) {
          if (fine) await click('[data-walk-precision]');
          await value(2.4); const p = await point('handle'), before = await state();
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 40, y: p.y + 1 }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
          assert(Math.abs((await state()).length.value - (fine ? 2.5 : 2.8)) < .011); assert.deepEqual((await state()).player, before.player);
        }
        await click('[data-walk-precision]'); const p = await point('handle'), before = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - 80 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.deepEqual((await state()).length, before.length); assert.deepEqual((await state()).player, before.player); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('accessible live Plan, no-WebGL fallback, and neighboring-room state are preserved', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length })));
      assert.deepEqual(violations, []); await click('[data-walk-diagram-toggle]');
      for (const side of ['front', 'left', 'right']) { await click('[data-walk-length-view="' + side + '"]'); assert(!/NaN|Infinity/.test(await page.locator('[data-walk-length-plan]').innerHTML())); }
      const old = await page.locator('[data-walk-length-plan]').innerHTML(); await value(3.4); assert.notEqual(await page.locator('[data-walk-length-plan]').innerHTML(), old);
      await page.locator('[data-walk-length-plan]').screenshot({ path: path.join(out, 'plan-320.png') });
      const saved = await state(); await click('[data-walk-activity="aperture"]'); await click('[data-walk-aperture-forward]'); await click('[data-walk-activity="length"]');
      assert.deepEqual((await state()).length, saved.length); assert.deepEqual((await state()).notes, saved.notes); assert.deepEqual((await state()).viewpoints, saved.viewpoints);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
      await page.goto(url + '?no-webgl'); await open(true); assert(await page.locator('[data-walk-length-plan]').isVisible()); assert(await page.locator('[data-walk-mouse-look]').isDisabled());
      const before = (await state()).length.value; await click('[data-walk-length-longer]'); assert((await state()).length.value > before);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' length browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: false, current, checks, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
