'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(__dirname, '..', argument('out', '.tmp/perception-relief-qa'));

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  for (let i = 0; i < png.data.length; i += 16) colors.add((png.data[i] >> 4) + ',' + (png.data[i + 1] >> 4) + ',' + (png.data[i + 2] >> 4));
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30, 'Canvas must contain rendered geometry');
  return { width: png.width, height: png.height, colors: colors.size, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = [], screenshots = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__reliefViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}));
    if (name) screenshots.push({ name, ...detail }); return detail;
  };
  const check = async (name, run) => { phase = name; checks.push({ name, detail: await run() }); console.log('PASS: ' + name); };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__reliefViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const point = async (choice, light = false) => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    return page.evaluate(({ choice, light }) => {
      const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect(), d = window.__reliefViewer.debug();
      const p = light ? d.reliefLightProjected : d.reliefProjected.find(item => item.choice === choice).center;
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, hit: window.__reliefViewer.pick(x, y), clear: document.elementFromPoint(x, y) === canvas };
    }, { choice, light });
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="relief"]'); await click('[data-walk-reset]');
    await check('light changes pixels but preserves physical shape; meshes and light are pickable', async () => {
      const initial = await debug(), above = await capture('desktop-above');
      for (const choice of ['A', 'B']) { const p = await point(choice); assert.equal(p.hit?.id, 'relief-' + choice); assert(p.clear); await page.mouse.click(p.x, p.y); assert.equal((await state()).relief.choice, choice); }
      await click('[data-walk-relief-light="below"]'); const below = await capture('desktop-below');
      assert.notEqual(above.hash, below.hash); assert.deepEqual((await debug()).reliefObjects, initial.reliefObjects); assert.equal((await state()).relief.seen, 3);
      await click('[data-walk-relief-light="above"]'); const p = await point(null, true), before = await state(); assert.equal(p.hit?.id, 'relief-light'); assert(p.clear);
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 75, p.y + 18, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(160);
      assert.notEqual((await state()).relief.lightAngle, before.relief.lightAngle); assert.deepEqual((await state()).player, before.player);
      return { above, below, draggedAngle: (await state()).relief.lightAngle };
    });
    await check('six close-ups frame actual surfaces on desktop and phones without changing answers', async () => {
      const hashes = new Set();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const choice of ['A', 'B']) {
          await click('[data-walk-relief-inspect="' + choice + '"]');
          for (const side of ['front', 'left', 'right']) {
            const before = await state(); await click('[data-walk-relief-view="' + side + '"]');
            const d = await debug(), target = d.reliefProjected.find(item => item.choice === choice);
            assert(target.corners.every(p => Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96 && p.z > -1 && p.z < 1));
            assert.deepEqual((await state()).relief, before.relief); hashes.add((await capture()).hash);
          }
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await capture(width === 1440 ? 'desktop-side' : 'mobile-' + width);
        await page.screenshot({ path: path.join(out, 'ui-' + width + '.png'), fullPage: true });
      }
      assert(hashes.size >= 12); return { distinctImages: hashes.size };
    });
    await check('two pairs require opposing lights and retain earned progress, notes and inspection on reload', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      await click('[data-walk-relief-choice="B"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).relief.completed, []);
      await click('[data-walk-relief-light="below"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).relief.completed, [0]);
      await click('[data-walk-relief-next]'); assert.equal((await state()).relief.round, 1);
      await click('[data-walk-relief-choice="A"]'); await click('[data-walk-relief-light="above"]'); await click('[data-walk-check]'); assert((await state()).progress.relief.solved);
      await click('[data-walk-reveal]'); assert((await state()).progress.relief.solved); assert(!(await state()).progress.relief.assisted); assert((await debug()).reliefRevealed);
      await click('[data-walk-relief-inspect="A"]'); await click('[data-walk-relief-view="right"]'); await capture('depth-profile');
      await page.locator('[data-walk-note]').fill('The hollow remains hollow when the light changes.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await click('[data-walk-relief-overview]'); await page.keyboard.press('d'); assert((await state()).player.x > 108);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('touch lamp drag changes lighting while vertical gestures keep page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-relief-overview]'); await click('[data-walk-relief-light="above"]');
      const cdp = await page.context().newCDPSession(page);
      try {
        const p = await point(null, true), before = await state(); assert.equal(p.hit?.id, 'relief-light');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 45, y: p.y + 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.notEqual((await state()).relief.lightAngle, before.relief.lightAngle); assert.deepEqual((await state()).player, before.player);
        const q = await point(null, true), saved = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 90 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
        assert.deepEqual((await state()).player, saved.player); assert.equal((await state()).relief.lightAngle, saved.relief.lightAngle);
        assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('accessible controls and geometric Plan fallback remain interactive', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-relief-overview]');
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const axe = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { 'region': { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(axe, []);
      await click('[data-walk-diagram-toggle]'); const plan = page.locator('[data-walk-relief-plan]'); await plan.waitFor();
      const before = await plan.innerHTML(); await click('[data-walk-relief-light="below"]'); assert.notEqual(await plan.innerHTML(), before);
      await click('[data-walk-relief-inspect="B"]'); const front = await plan.innerHTML(); await click('[data-walk-relief-view="left"]'); assert.notEqual(await plan.innerHTML(), front);
      await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-relief-profile]').count(), 1);
      await page.screenshot({ path: path.join(out, 'plan.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      return { axeViolations: axe.length };
    });
    await check('existing room still renders and renderer disposes on exit', async () => {
      await click('[data-walk-activity="ring"]'); await capture('existing-circle');
      const original = await state(); await click('[data-walk-activity="relief"]'); assert.deepEqual((await state()).progress.ring, original.progress.ring);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: true, checks, screenshots, errors }, null, 2));
    console.log('All ' + checks.length + ' relief browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: false, phase, checks, screenshots, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
