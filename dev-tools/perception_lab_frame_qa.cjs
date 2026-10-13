'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(__dirname, '..', argument('out', '.tmp/perception-frame-qa'));

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  for (let i = 0; i < png.data.length; i += 16) colors.add((png.data[i] >> 4) + ',' + (png.data[i + 1] >> 4) + ',' + (png.data[i + 2] >> 4));
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30, 'Canvas contains rendered geometry');
  return { width: png.width, height: png.height, colors: colors.size, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = [], screenshots = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__frameViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}));
    if (name) screenshots.push({ name, ...detail }); return detail;
  };
  const check = async (name, run) => { phase = name; checks.push({ name, detail: await run() }); console.log('PASS: ' + name); };
  const patch = async value => {
    await page.evaluate(value => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...value }) })), value);
    await page.waitForTimeout(120);
  };
  const input = async (name, value) => {
    await page.locator('[data-walk-frame-' + name + ']').evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__frameViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async (surround = false) => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    return page.evaluate(surround => {
      const rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect(), d = window.__frameViewer.debug();
      const p = surround ? d.frameProjected.corners[2] : d.frameProjected.rod.to;
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, hit: window.__frameViewer.pick(x, y), clear: document.elementFromPoint(x, y)?.tagName === 'CANVAS' };
    }, surround);
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="frame"]'); await click('[data-walk-reset]');
    await check('rod and surround support independent direct manipulation with real canvas changes', async () => {
      const before = await capture('desktop-start'), start = await state(), rod = await target();
      assert.equal(rod.hit?.id, 'frame-rod'); assert(rod.clear);
      await page.mouse.move(rod.x, rod.y); await page.mouse.down(); await page.mouse.move(rod.x + 55, rod.y + 10, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(100); const turned = await state();
      assert(Math.abs(turned.frame.adjustment) > 4); assert.equal(turned.frame.surround, start.frame.surround); assert.deepEqual(turned.player, start.player);
      assert.notEqual((await capture()).hash, before.hash);
      const surround = await target(true); assert.equal(surround.hit?.id, 'frame-surround'); assert(surround.clear);
      await page.mouse.move(surround.x, surround.y); await page.mouse.down(); await page.mouse.move(surround.x + 30, surround.y + 30, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(100); const framed = await state();
      assert.notEqual(framed.frame.surround, turned.frame.surround); assert.equal(framed.frame.adjustment, turned.frame.adjustment);
      assert.equal((await debug()).frameAngle, 18 + framed.frame.adjustment);
      await click('[data-walk-frame-visible]'); assert.equal((await debug()).frameVisible, false);
      assert.notEqual((await target(true)).hit?.id, 'frame-surround'); assert.equal((await state()).frame.adjustment, framed.frame.adjustment);
      await page.locator('[data-walk-frame-adjustment]').focus(); await page.keyboard.press('ArrowLeft');
      assert(Math.abs((await state()).frame.adjustment - (framed.frame.adjustment - 0.5)) <= 0.51);
    });
    await check('both alignment trials stay framed on desktop and phones across the full adjustment range', async () => {
      const hashes = new Set();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) for (const [adjustment, surround] of [[-45, -30], [0, 22], [45, 30]]) {
          await patch({ frame: { round, adjustment, surround, visible: true, seen: 1, completed: [] } });
          const d = await debug(), projected = d.frameProjected;
          assert.equal(d.frameAngle, (round ? 66 : 18) + adjustment);
          assert.equal(d.frameSurround, surround);
          assert([projected.rod.from, projected.rod.to, ...projected.corners].every(p => Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96 && p.z > -1 && p.z < 1));
          hashes.add((await capture()).hash);
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await capture('frame-' + width); await page.screenshot({ path: path.join(out, 'ui-' + width + '.png'), fullPage: true });
      }
      assert(hashes.size >= 15); return { distinctImages: hashes.size };
    });
    await check('two trials require context comparisons and preserve earned progress, poses and notes', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      for (const round of [0, 1]) {
        await input('adjustment', round ? 24 : -18); await click('[data-walk-check]'); assert(!(await state()).frame.completed.includes(round));
        await click('[data-walk-frame-visible]'); await click('[data-walk-check]'); assert((await state()).frame.completed.includes(round));
        if (!round) { await click('[data-walk-frame-next]'); assert.equal((await state()).frame.seen, 1); assert.equal((await state()).frame.adjustment, 0); }
      }
      assert((await state()).progress.frame.solved);
      await click('[data-walk-reveal]'); assert((await state()).progress.frame.solved); assert(!(await state()).progress.frame.assisted); assert((await debug()).frameRevealed);
      await capture('frame-reveal');
      await page.locator('[data-walk-note]').fill('Hiding the frame changes the context, not the rod.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('touch turns the rod while vertical gestures preserve page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-reset]');
      const cdp = await page.context().newCDPSession(page);
      try {
        const p = await target(), before = await state(); assert.equal(p.hit?.id, 'frame-rod');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 35, y: p.y + 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.notEqual((await state()).frame.adjustment, before.frame.adjustment); assert.deepEqual((await state()).player, before.player);
        const q = await target(), saved = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 85 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
        assert.deepEqual((await state()).player, saved.player); assert.equal((await state()).frame.adjustment, saved.frame.adjustment); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('out-of-view controls are gated and Plan fallback preserves geometry and reveal guides', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const before = await state(); await patch({ player: { ...before.player, yaw: 180 } });
      for (const name of ['adjustment', 'surround', 'visible', 'left', 'right']) assert(await page.locator('[data-walk-frame-' + name + ']').isDisabled());
      await click('[data-walk-check]'); assert.deepEqual((await state()).frame.completed, []);
      await patch({ player: before.player }); await click('[data-walk-diagram-toggle]');
      const plan = page.locator('[data-walk-frame-plan]'); await plan.waitFor(); const original = await plan.innerHTML();
      await input('adjustment', -18); assert.notEqual(await plan.innerHTML(), original);
      await click('[data-walk-frame-visible]'); assert.equal(await page.locator('[data-walk-frame-surround-plan]').count(), 0);
      await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-frame-guides] line').count(), 2);
      await click('[data-walk-check]'); assert(!(await state()).progress.frame.solved); assert((await state()).progress.frame.assisted);
      await page.screenshot({ path: path.join(out, 'plan.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
    });
    await check('accessible controls, neighbor-room playback and renderer disposal remain intact', async () => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []);
      const before = await state(); await click('[data-walk-activity="motion"]'); await capture('existing-motion');
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await click('[data-walk-motion-play]'); await page.waitForTimeout(160);
      await click('[data-walk-activity="frame"]'); const stopped = (await state()).motion.phase; await page.waitForTimeout(180); assert.equal((await state()).motion.phase, stopped);
      assert.deepEqual((await state()).frame, before.frame); assert.deepEqual((await state()).progress, before.progress);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
      return { axeViolations: violations.length };
    });
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: true, checks, screenshots, errors }, null, 2));
    console.log('All ' + checks.length + ' frame browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: false, phase, checks, screenshots, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
