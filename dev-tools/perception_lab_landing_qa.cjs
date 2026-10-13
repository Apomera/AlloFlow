'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-landing-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__landingViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const view = side => click('[data-walk-landing-view="' + side + '"]');
  const check = async (name, run) => { phase = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const patch = async value => { await page.evaluate(value => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...value }) })), value); await page.waitForTimeout(100); };
  const height = async (index, value) => {
    await click('[data-walk-landing-piece="' + index + '"]');
    await page.locator('[data-walk-landing-height]').evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); }, value); await page.waitForTimeout(100);
  };
  const light = async value => {
    await page.locator('[data-walk-landing-light]').evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const d = window.__landingViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk; return Math.abs(d.camera.x - s.player.x) < 1e-6 && Math.abs(d.camera.z - s.player.z) < 1e-6 && d.landingRound === s.landing.round && Math.abs(d.landingLightAngle - s.landing.lightAngle) < 1e-6 && d.landingHeights.every((h, i) => Math.abs(h - s.landing.heights[i]) < 1e-6); });
  };
  const capture = async name => {
    await settled(); const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 30 && png.width > 240 && png.height > 220); return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const target = async index => { await settled(); return page.evaluate(index => { const d = window.__landingViewer.debug(), r = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect(), p = d.landingProjected[index].center, x = r.left + (p.x + 1) * r.width / 2, y = r.top + (1 - p.y) * r.height / 2; return { x, y, hit: window.__landingViewer.pick(x, y), clear: document.elementFromPoint(x, y)?.tagName === 'CANVAS' }; }, index); };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]'); await page.locator('[data-perception-walk] canvas').waitFor();
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => { const create = StemLab.PerceptionWalkScene.createViewer; StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__landingViewer = viewer; return viewer; }; });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="landing"]');
    await check('three real spheres lift independently and their projected shadows follow', async () => {
      const before = await capture('desktop-start');
      for (const i of [0, 1, 2]) { const p = await target(i); assert.equal(p.hit?.id, 'landing-' + 'ABC'[i]); assert(p.clear); await page.mouse.click(p.x, p.y); await page.waitForTimeout(100); assert.equal((await state()).landing.selected, i); }
      const p = await target(1), old = await state(); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x, p.y - 45, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(120);
      const after = await state(); assert(after.landing.heights[1] > old.landing.heights[1] + 0.2); assert.equal(after.landing.heights[0], old.landing.heights[0]); assert.deepEqual(after.player, old.player); assert.notEqual(await capture(), before);
      const d = await debug(); d.landingObjects.forEach(o => { assert(Math.abs(o.shadow.x - o.x - o.y * d.landingLight.x) < 1e-8); assert(Math.abs(o.shadow.z - o.z - o.y * d.landingLight.z) < 1e-8); });
      await height(2, 1.5); await page.locator('[data-walk-landing-height]').focus(); await page.keyboard.press('ArrowUp'); assert.equal((await state()).landing.heights[2], 1.525);
    });
    await check('front and side views frame both light arrangements at desktop and phone sizes', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) { for (const lightAngle of [-25, 0, 25]) { for (const h of [0.55, 3.2]) { await patch({ landing: { round, lightAngle, heights: [h, h, h], selected: 1, completed: [] } });
          for (const side of ['front', 'left', 'right']) { await view(side); await capture(); const d = await debug();
            assert(d.landingProjected.every(o => [o.center, o.shadow, o.target, o.label, o.targetLabel].every(p => p && Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.97 && p.z > -1 && p.z < 1)), JSON.stringify({ width, round, side, projected: d.landingProjected }));
            const labels = d.landingTargetLabelBounds; assert.equal(labels.length, 3);
            for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i], b = labels[j]; assert(a.right + 1 <= b.left || b.right + 1 <= a.left || a.bottom + 1 <= b.top || b.bottom + 1 <= a.top, 'Floor letters remain separate: ' + JSON.stringify({ width, round, lightAngle, h, side, labels }));
            }
            const edgesVisible = await page.evaluate(() => {
              const d = window.__landingViewer.debug(), c = d.camera, canvas = document.querySelector('[data-perception-walk] canvas'), yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180, scale = Math.tan(c.fov * Math.PI / 360), aspect = canvas.clientWidth / canvas.clientHeight;
              function visible(point) { const dx = point.x - c.x, dz = point.z - c.z, dy = point.y - c.y, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch); return distance > 0 && Math.abs((dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * aspect)) < 0.98 && Math.abs((dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale)) < 0.98; }
              return d.landingObjects.every(o => [o.shadow, o.target].every(e => Array.from({ length: 64 }, (_, i) => { const a = i * Math.PI / 32, u = e.major * Math.cos(a), v = e.minor * Math.sin(a); return visible({ x: e.x + u * Math.cos(e.angle) - v * Math.sin(e.angle), y: 0.025, z: e.z + u * Math.sin(e.angle) + v * Math.cos(e.angle) }); }).every(Boolean)));
            }); assert(edgesVisible, 'Entire shadow and target ellipses stay framed: ' + [width, round, lightAngle, h, side].join('/'));
          }
        } } }
        await view('front'); await capture('canvas-' + width); await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    });
    await check('light controls rotate live shadows while preserving sphere heights and scoring', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      const before = await state(), imageBefore = await capture('light-original'); await light(25); await settled();
      const after = await state(), d = await debug(); assert.deepEqual(after.landing.heights, before.landing.heights); assert.deepEqual(after.landing.completed, []); assert.equal(d.landingLightAngle, 25);
      assert.notEqual(await capture('light-rotated'), imageBefore); d.landingObjects.forEach(o => { assert(Math.abs(o.shadow.x - o.x - o.y * d.landingLight.x) < 1e-8); assert(Math.abs(o.target.z - o.z - o.targetHeight * d.landingLight.z) < 1e-8); });
      await page.locator('[data-walk-landing-light]').focus(); await page.keyboard.press('ArrowLeft'); assert.equal((await state()).landing.lightAngle, 24);
      await click('[data-walk-landing-light-left]'); assert.equal((await state()).landing.lightAngle, 19); await click('[data-walk-precision]'); await click('[data-walk-landing-light-right]'); assert.equal((await state()).landing.lightAngle, 20);
      await click('[data-walk-landing-light-reset]'); assert.equal((await state()).landing.lightAngle, 0); assert.deepEqual((await state()).landing.heights, before.landing.heights); await click('[data-walk-precision]');
    });
    await check('touch lifting and native vertical scrolling remain separate', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-reset]'); const cdp = await page.context().newCDPSession(page);
      try {
        const p = await target(1), before = await state(); assert.equal(p.hit?.id, 'landing-B');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 40, y: p.y + 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert((await state()).landing.heights[1] > before.landing.heights[1]); assert.deepEqual((await state()).player, before.player);
        const q = await target(1), old = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 85 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200);
        assert.deepEqual((await state()).landing, old.landing); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('two lighting arrangements, reveal, saved notes, and access gates', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]'); assert(await page.locator('[data-walk-landing-next]').isDisabled());
      for (const [round, values] of [[0, [1.25, 2.7, 1.9]], [1, [2.65, 1.35, 2.3]]]) {
        await light(round ? -25 : 25);
        for (const [index, value] of values.entries()) await height(index, value); await click('[data-walk-check]'); assert((await state()).landing.completed.includes(round)); if (!round) await click('[data-walk-landing-next]');
      }
      assert((await state()).progress.landing.solved); await click('[data-walk-reveal]'); assert(!(await state()).progress.landing.assisted); await capture('reveal'); assert((await debug()).landingRevealed);
      await page.locator('[data-walk-note]').fill('The light direction changes where the shadow lands.'); const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await patch({ player: { ...saved.player, yaw: 180 } }); assert(await page.locator('[data-walk-landing-height]').isDisabled()); assert(await page.locator('[data-walk-landing-light]').isDisabled()); await click('[data-walk-home]'); assert(!(await page.locator('[data-walk-landing-height]').isDisabled()));
    });
    await check('accessible fallback and neighboring rooms preserve the session', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const axe = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length }))); assert.deepEqual(axe, []);
      await click('[data-walk-diagram-toggle]'); await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-landing-guides] line').count(), 9);
      const originalPlan = await page.locator('[data-walk-landing-plan]').innerHTML(); await light(25); assert.notEqual(await page.locator('[data-walk-landing-plan]').innerHTML(), originalPlan);
      for (const side of ['front', 'left', 'right']) { await view(side); assert(!/NaN|Infinity/.test(await page.locator('[data-walk-landing-plan]').innerHTML())); }
      await page.locator('[data-walk-landing-plan]').screenshot({ path: path.join(out, 'plan-320.png') });
      await click('[data-walk-diagram-toggle]'); await capture('restored'); const before = await state();
      await click('[data-walk-activity="weave"]'); await click('[data-walk-weave-near]'); await click('[data-walk-activity="landing"]'); assert.deepEqual((await state()).landing, before.landing); assert.deepEqual((await state()).notes, before.notes);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37); await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' landing browser groups passed.');
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: false, phase, checks, errors, failure: error.stack }, null, 2)); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
