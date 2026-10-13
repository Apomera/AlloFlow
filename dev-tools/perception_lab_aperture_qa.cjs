'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-aperture-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__apertureViewer.debug());
  const check = async (name, run) => { current = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const phase = async value => {
    await page.locator('[data-walk-aperture-phase]').evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    await page.waitForTimeout(100);
  };
  const speed = async value => {
    await page.locator('[data-walk-aperture-speed]').evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    await page.waitForTimeout(100);
  };
  const patch = async value => { await page.evaluate(value => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...value }) })), value); await page.waitForTimeout(100); };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__apertureViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return Math.abs(d.camera.x - s.player.x) < 1e-6 && Math.abs(d.camera.z - s.player.z) < 1e-6 && Math.abs(d.camera.yaw - s.player.yaw) < 1e-6 && Math.abs(d.camera.pitch - s.player.pitch) < 1e-6 && d.apertureRound === s.aperture.round && Math.abs(d.aperturePhase - s.aperture.phase) < 1e-6 && d.apertureMasked === s.aperture.masked;
    });
  };
  const capture = async name => {
    await settled(); const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank 3D canvas');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const point = async name => { await settled(); return page.evaluate(name => { const p = window.__apertureViewer.debug().apertureProjected[name], r = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect(), x = r.left + (p.x + 1) * r.width / 2, y = r.top + (1 - p.y) * r.height / 2; return { x, y, hit: window.__apertureViewer.pick(x, y)?.id }; }, name); };
  const dialPoint = async degrees => {
    await settled(); return page.evaluate(degrees => {
      const d = window.__apertureViewer.debug(), dial = d.apertureDial, c = d.camera, r = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const a = degrees * Math.PI / 180, dx = dial.x + Math.sin(a) * .44 - c.x, dy = dial.y + Math.cos(a) * .44 - c.y, dz = dial.z - c.z, yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180;
      const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), scale = Math.tan(c.fov * Math.PI / 360);
      const nx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * r.width / r.height), ny = (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale);
      const x = r.left + (nx + 1) * r.width / 2, y = r.top + (1 - ny) * r.height / 2;
      return { x, y, coordinate: window.__apertureViewer.apertureCoordinate(x, y), hit: window.__apertureViewer.pick(x, y)?.id };
    }, degrees);
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]'); await page.locator('[data-perception-walk] canvas').waitFor();
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => { const create = StemLab.PerceptionWalkScene.createViewer; StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__apertureViewer = viewer; return viewer; }; });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="aperture"]');
    await check('real opaque screen conceals endpoints and the in-world switch opens it', async () => {
      await click('[data-walk-reset]'); const masked = await capture('desktop-masked'); assert.equal((await debug()).aperturePanelCount, 4);
      for (const name of ['from', 'to']) assert.equal((await point(name)).hit, 'aperture-screen');
      const toggle = await point('switch'); assert.equal(toggle.hit, 'aperture-screen'); await page.mouse.click(toggle.x, toggle.y); await settled();
      assert.equal((await state()).aperture.masked, false); assert.equal((await debug()).aperturePanelCount, 0); assert.notEqual(await capture('desktop-open'), masked);
      for (const name of ['from', 'to']) assert.equal((await point(name)).hit, 'aperture-rod');
      await phase(90); const d = await debug(); assert(Math.abs(d.apertureRod.center.x - 180.65) < 1e-6); assert(Math.abs(d.apertureRod.center.y - 2) < 1e-6);
      const moved = await capture(); await phase(270); assert.notEqual(await capture(), moved);
    });
    await check('physical motion dial scrubs through zero, supports repeated turns and fine control', async () => {
      await click('[data-walk-reset]'); await phase(350); const before = await state(), image = await capture();
      const start = await dialPoint(350); assert.equal(start.hit, 'aperture-dial'); assert(Math.abs(start.coordinate - 350) < 1e-5);
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      for (let a = 365; a <= 800; a += 15) { const p = await dialPoint(a); await page.mouse.move(p.x, p.y, { steps: 2 }); }
      await page.mouse.up(); await settled(); const after = await state(); assert(Math.abs(after.aperture.phase - 80) < 1e-4, 'Continuous wrapped phase'); assert.deepEqual(after.player, before.player); assert.notEqual(await capture('dial-turned'), image);
      const center = await point('dial'); assert.equal(await page.evaluate(p => window.__apertureViewer.apertureCoordinate(p.x, p.y), center), null);
      await page.mouse.click(center.x, center.y); await page.waitForTimeout(100); assert(Math.abs((await state()).aperture.phase - 110) < 1e-4);
      await click('[data-walk-precision]'); await phase(0); const first = await dialPoint(0); await page.mouse.move(first.x, first.y); await page.mouse.down();
      for (const a of [15, 30, 45, 60, 75, 90]) { const p = await dialPoint(a); await page.mouse.move(p.x, p.y, { steps: 2 }); } await page.mouse.up(); await settled(); assert(Math.abs((await state()).aperture.phase - 22.5) < 1e-4);
      await click('[data-walk-precision]');
    });
    await check('crosshair keyboard interaction reaches both physical controls from all inspection views', async () => {
      for (const side of ['front', 'left', 'right']) for (const control of ['dial', 'switch']) {
        await click('[data-walk-aperture-view="' + side + '"]'); const before = await state(), x = control === 'dial' ? 176.5 : 183.5, dx = x - before.player.x, dz = before.player.z - 2.2;
        await patch({ player: { ...before.player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(1.1 - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI } }); await settled();
        assert(!(await page.locator('[data-walk-aperture-phase]').isDisabled())); await page.locator('[data-walk-stage]').press('e'); await page.waitForTimeout(100);
        if (control === 'dial') assert(Math.abs((await state()).aperture.phase - (before.aperture.phase + 30) % 360) < 1e-4); else assert.equal((await state()).aperture.masked, !before.aperture.masked);
      }
      await click('[data-walk-aperture-view="front"]');
    });
    await check('both motion axes and the dial stay framed in front and side views on desktop and phones', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) for (const p of [0, 90, 270]) for (const masked of [true, false]) {
          await patch({ aperture: { round, phase: p, masked } });
          for (const side of ['front', 'left', 'right']) {
            await click('[data-walk-aperture-view="' + side + '"]'); await settled(); const d = await debug();
            for (const name of ['from', 'to', 'center', 'switch', 'dial', 'handle']) { const q = d.apertureProjected[name]; assert(q && Math.abs(q.x) < .97 && Math.abs(q.y) < .97 && q.z > -1 && q.z < 1, JSON.stringify({ width, round, p, side, name, q })); }
            assert(d.apertureProjected.dialEdges.every(q => Math.abs(q.x) < .98 && Math.abs(q.y) < .98 && q.z > -1 && q.z < 1)); assert.equal((await point('dial')).hit, 'aperture-dial');
            assert(Math.abs(d.apertureDial.handle.x - d.apertureDial.x - .34 * Math.sin(p * Math.PI / 180)) < 1e-6); assert(Math.abs(d.apertureDial.handle.y - d.apertureDial.y - .34 * Math.cos(p * Math.PI / 180)) < 1e-6);
          }
        }
        await click('[data-walk-aperture-view="front"]'); await capture('canvas-' + width); await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    });
    await check('manual motion, evidence requirements, two rounds, and saved progress', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      await click('[data-walk-aperture-choice="horizontal"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).aperture.completed, []);
      await page.locator('[data-walk-aperture-phase]').focus(); await page.keyboard.press('ArrowRight'); assert.equal((await state()).aperture.phase, 1);
      await speed(.5); await page.locator('[data-walk-aperture-speed]').focus(); await page.keyboard.press('ArrowRight'); assert.equal((await state()).aperture.speed, .75);
      for (const round of [0, 1]) {
        await phase(0); await phase(90); await click('[data-walk-aperture-mask]'); await phase(0);
        await click('[data-walk-aperture-choice="' + (round ? 'vertical' : 'horizontal') + '"]'); await click('[data-walk-check]'); assert((await state()).aperture.completed.includes(round));
        if (!round) { await click('[data-walk-aperture-next]'); assert.equal((await state()).aperture.speed, .75); }
      }
      assert((await state()).progress.aperture.solved); await click('[data-walk-aperture-mask]'); await click('[data-walk-reveal]'); assert(!(await state()).progress.aperture.assisted); assert.equal((await state()).aperture.masked, false); await capture('reveal'); assert.equal((await debug()).aperturePanelCount, 0);
      await page.locator('[data-walk-note]').fill('The ends distinguish two otherwise matching edge motions.'); const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await patch({ player: { ...saved.player, yaw: 180 } }); assert(await page.locator('[data-walk-aperture-phase]').isDisabled()); await click('[data-walk-home]'); assert(!(await page.locator('[data-walk-aperture-phase]').isDisabled()));
    });
    await check('playback respects pause and reduced motion; touch operates the screen without trapping scrolling', async () => {
      assert(await page.locator('[data-walk-aperture-play]').isDisabled()); await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !document.querySelector('[data-walk-aperture-play]').disabled); await click('[data-walk-aperture-play]');
      await speed(.25); assert.equal(await page.locator('[data-walk-aperture-play]').getAttribute('aria-pressed'), 'true'); assert.equal((await state()).aperture.speed, .25);
      const start = (await state()).aperture.phase; await page.waitForFunction(p => window.__perceptionPreview.state.perceptionWalk.aperture.phase !== p, start);
      await click('[data-walk-aperture-play]'); const paused = (await state()).aperture.phase; await page.waitForTimeout(180); assert.equal((await state()).aperture.phase, paused);
      await click('[data-walk-aperture-play]'); await click('[data-walk-aperture-view="left"]'); const stopped = (await state()).aperture.phase; await page.waitForTimeout(180); assert.equal((await state()).aperture.phase, stopped);
      await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-aperture-view="front"]');
      const toggle = await point('switch'), wasMasked = (await state()).aperture.masked; await page.touchscreen.tap(toggle.x, toggle.y); await page.waitForTimeout(150); assert.equal((await state()).aperture.masked, !wasMasked);
      await settled(); const p = await point('center'), before = await state(), scroll = await page.evaluate(() => scrollY), cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - 80 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.deepEqual((await state()).player, before.player); assert.deepEqual((await state()).aperture, before.aperture); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
      const dial = await point('dial'), old = await state(), touch = await page.context().newCDPSession(page);
      try {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: dial.x, y: dial.y }] }); await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: dial.x + 40, y: dial.y + 1 }] }); await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert(Math.abs((await state()).aperture.phase - (old.aperture.phase + 30) % 360) < 1e-4); assert.deepEqual((await state()).player, old.player);
        const p = await point('dial'), before = await state(), scroll = await page.evaluate(() => scrollY);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - 80 }] }); await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.deepEqual((await state()).aperture, before.aperture); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await touch.detach(); }
    });
    await check('accessible plan fallback and neighboring-room state preservation', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []); await click('[data-walk-diagram-toggle]');
      for (const side of ['front', 'left', 'right']) { await click('[data-walk-aperture-view="' + side + '"]'); assert(!/NaN|Infinity/.test(await page.locator('[data-walk-aperture-plan]').innerHTML())); }
      const old = await page.locator('[data-walk-aperture-plan]').innerHTML(); await phase(90); assert.notEqual(await page.locator('[data-walk-aperture-plan]').innerHTML(), old);
      await page.locator('[data-walk-aperture-plan]').screenshot({ path: path.join(out, 'plan-320.png') });
      const saved = await state(); await click('[data-walk-activity="landing"]'); await click('[data-walk-landing-light-right]'); await click('[data-walk-activity="aperture"]'); assert.deepEqual((await state()).aperture, saved.aperture); assert.deepEqual((await state()).notes, saved.notes);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37); await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' aperture browser groups passed.');
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: false, current, checks, errors, failure: error.stack }, null, 2)); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
