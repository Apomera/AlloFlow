'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-exploration-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], checks = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state));
  const open = async (fallback = false) => { await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]'); await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor(); };
  const check = async (name, run) => { phase = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const unlocked = () => page.waitForFunction(() => !document.pointerLockElement);
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas');
    const buffer = await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 30 && png.width > 240 && png.height > 220, 'Nonblank rendered 3D scene');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const lock = async () => {
    await page.waitForTimeout(1300);
    await click('[data-walk-mouse-look]');
    await page.waitForFunction(() => document.pointerLockElement === document.querySelector('[data-walk-stage]'));
    assert.equal(await page.locator('[data-walk-mouse-look]').getAttribute('aria-pressed'), 'true');
  };
  const inStrip = async () => page.locator('.pw-nav').evaluate(nav => {
    const active = nav.querySelector('[aria-pressed=true]').getBoundingClientRect(), rect = nav.getBoundingClientRect();
    return active.left >= rect.left - 1 && active.right <= rect.right + 1;
  });
  try {
    await page.goto(url); await open();
    await check('compact navigation, responsive selection and expanded room overview', async () => {
      assert(await page.locator('[data-walk-previous-room]').isDisabled());
      await click('[data-walk-next-room]'); assert.equal((await state()).perceptionWalk.activity, 'scale');
      await click('[data-walk-activity="length"]'); assert(await page.locator('[data-walk-next-room]').isDisabled());
      assert(await inStrip());
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await page.waitForTimeout(200);
        assert(await inStrip(), 'Active room stays visible after resize to ' + width);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
        await capture('canvas-' + width);
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
        await click('[data-walk-all-rooms]'); assert.equal(await page.locator('[data-walk-all-rooms]').getAttribute('aria-expanded'), 'true');
        await click('[data-walk-activity="ring"]'); await click('[data-walk-all-rooms]'); assert(await inStrip());
        await click('[data-walk-activity="length"]'); assert(await inStrip());
      }
    });
    await check('next unsolved wraps and preserves notes and unfinished arrangements', async () => {
      await page.evaluate(() => window.__perceptionPreview.replace(data => {
        const s = StemLab.PerceptionWalk.normalize(data.perceptionWalk);
        s.notes.weave = 'Keep this crossing arrangement.'; s.weave.depths = [0.8, -0.2, -1];
        s.progress.ring.solved = true; s.progress.scale.solved = true;
        return { ...data, perceptionWalk: s };
      }));
      await click('[data-walk-next-unsolved]'); assert.equal((await state()).perceptionWalk.activity, 'occlusion');
      await click('[data-walk-activity="weave"]');
      const s = await state(); assert.equal(s.perceptionWalk.notes.weave, 'Keep this crossing arrangement.'); assert.deepEqual(s.perceptionWalk.weave.depths, [0.8, -0.2, -1]); assert.equal(s.otherTool.preserved, 37);
      await page.reload(); await open(); assert.equal((await state()).perceptionWalk.notes.weave, 'Keep this crossing arrangement.');
    });
    await check('real mouse capture moves the camera, centers interaction, and exits through keyboard', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await click('[data-walk-activity="weave"]'); await click('[data-walk-home]');
      await click('[data-walk-diagram-toggle]');
      await page.evaluate(() => {
        const create = StemLab.PerceptionWalkScene.createViewer;
        StemLab.PerceptionWalkScene.createViewer = function () {
          const viewer = create.apply(this, arguments), pick = viewer.pick;
          viewer.pick = function (x, y) { window.__explorationPick = { x, y }; return pick.apply(this, arguments); };
          return viewer;
        };
      });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      const beforeImage = await capture(); await lock(); const before = (await state()).perceptionWalk;
      await page.mouse.move(720, 500); await page.mouse.move(780, 530, { steps: 6 }); await page.waitForTimeout(150);
      const after = (await state()).perceptionWalk; assert.notEqual(after.player.yaw, before.player.yaw); assert.deepEqual(after.weave.depths, before.weave.depths);
      await page.keyboard.press('w'); assert.notDeepEqual((await state()).perceptionWalk.player, after.player);
      await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(100);
      const hit = await page.evaluate(() => {
        const rect = document.querySelector('[data-walk-stage]').getBoundingClientRect();
        return { picked: window.__explorationPick, center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
      });
      assert(Math.abs(hit.picked.x - hit.center.x) < 1 && Math.abs(hit.picked.y - hit.center.y) < 1);
      await page.keyboard.press('Escape'); await unlocked(); assert(await page.locator('[data-walk-mouse-look]').evaluate(node => node === document.activeElement));
      assert.notEqual(await capture('mouse-look-result'), beforeImage);
      await lock(); await page.keyboard.press('Tab'); await unlocked(); assert(await page.locator('[data-walk-mouse-look]').evaluate(node => node === document.activeElement));
    });
    await check('blur and room navigation release capture, with rejected requests recoverable', async () => {
      await lock(); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await unlocked();
      await lock(); await page.evaluate(() => document.querySelector('[data-walk-previous-room]').click()); await unlocked(); assert.equal((await state()).perceptionWalk.activity, 'frame');
      await page.evaluate(() => { document.querySelector('[data-walk-stage]').requestPointerLock = () => Promise.reject(new Error('QA denial')); });
      await click('[data-walk-mouse-look]'); assert.match(await page.locator('[data-walk-status]').textContent(), /unavailable/i);
      await page.evaluate(() => { delete document.querySelector('[data-walk-stage]').requestPointerLock; });
      await lock(); await page.keyboard.press('Escape'); await unlocked();
    });
    await check('touch-safe controls, plan fallback, and accessibility remain available', async () => {
      await click('[data-walk-activity="weave"]'); await click('[data-walk-home]');
      await page.setViewportSize({ width: 320, height: 844 });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const axe = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.length })));
      assert.deepEqual(axe, []);
      const before = (await state()).perceptionWalk.player; await click('[data-walk-move="left"]'); assert.notDeepEqual((await state()).perceptionWalk.player, before);
      await click('[data-walk-diagram-toggle]'); assert(await page.locator('[data-walk-mouse-look]').isDisabled()); assert(await page.locator('[data-walk-weave-plan]').isVisible());
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor(); await capture('mobile-restored');
      await page.goto(url + '?no-webgl'); await open(true); assert(await page.locator('[data-walk-mouse-look]').isDisabled());
    });
    assert.deepEqual(errors, []); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
  } catch (error) { console.error('FAILED: ' + phase); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
