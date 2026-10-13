'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(__dirname, '..', argument('out', '.tmp/perception-shape-qa'));

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
  const debug = () => page.evaluate(() => window.__shapeViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}));
    if (name) screenshots.push({ name, ...detail }); return detail;
  };
  const check = async (name, run) => { phase = name; checks.push({ name, detail: await run() }); console.log('PASS: ' + name); };
  const setShape = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, shape: { ...data.perceptionWalk.shape, ...patch } }) })), patch);
    await page.waitForTimeout(150);
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__shapeViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async (choice, center = false) => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    return page.evaluate(({ choice, center }) => {
      const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
      const item = window.__shapeViewer.debug().shapeProjected.find(item => item.choice === choice);
      const points = center ? [item.center] : item.points;
      return points.map(p => {
        const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
        return { x, y, hit: window.__shapeViewer.pick(x, y), clear: document.elementFromPoint(x, y) === canvas };
      }).find(p => center || p.clear && p.hit?.id === 'shape-' + choice);
    }, { choice, center });
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="shape"]'); await click('[data-walk-reset]');
    await check('real open hoops support direct turn and tilt without changing their proportions', async () => {
      const initial = await debug(), picture = await capture('desktop-start');
      for (const choice of ['A', 'B']) { assert(await target(choice)); assert.notEqual((await target(choice, true)).hit?.id, 'shape-' + choice); }
      const point = await target('A'), before = await state();
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 64, point.y - 24, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(160);
      const after = await state(); assert(Math.abs(after.shape.angles[0] - before.shape.angles[0] - 32) < 0.001); assert(Math.abs(after.shape.tilts[0] - before.shape.tilts[0] - 8.4) < 0.001); assert.deepEqual(after.player, before.player);
      assert.notEqual((await capture()).hash, picture.hash);
      assert.deepEqual((await debug()).shapeObjects.map(({ rx, ry }) => ({ rx, ry })), initial.shapeObjects.map(({ rx, ry }) => ({ rx, ry })));
      await page.locator('[data-walk-shape-yaw]').focus(); await page.keyboard.press('ArrowRight'); assert.equal((await state()).shape.angles[0], Math.round(after.shape.angles[0]) + 1);
    });
    await check('both pairs stay framed across six inspection views and three viewport sizes', async () => {
      const hashes = new Set();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) {
          await setShape({ round, angles: [127, 241], tilts: [-60, 65] });
          for (const choice of ['A', 'B']) {
            await click('[data-walk-shape-inspect="' + choice + '"]');
            for (const side of ['front', 'left', 'right']) {
              const before = await state(); await click('[data-walk-shape-view="' + side + '"]');
              const item = (await debug()).shapeProjected.find(item => item.choice === choice);
              assert(item.corners.every(p => Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96 && p.z > -1 && p.z < 1), 'Entire hoop fits inspection');
              const after = await state(); for (const key of ['round', 'angles', 'tilts', 'choice', 'completed']) assert.deepEqual(after.shape[key], before.shape[key]);
              hashes.add((await capture()).hash);
            }
          }
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await capture('inspection-' + width); await page.screenshot({ path: path.join(out, 'ui-' + width + '.png'), fullPage: true });
      }
      assert(hashes.size >= 24); return { distinctImages: hashes.size };
    });
    await check('two-round scoring, earned reveals, notes and current pose survive a reload', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      await click('[data-walk-shape-choice="B"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).shape.completed, []);
      await click('[data-walk-shape-choice="A"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).shape.completed, [0]);
      await click('[data-walk-shape-next]'); assert.equal((await state()).shape.round, 1); assert.deepEqual((await state()).shape.tilts, [4, 59]);
      await click('[data-walk-shape-choice="B"]'); await click('[data-walk-check]'); assert((await state()).progress.shape.solved);
      await click('[data-walk-reveal]'); assert((await state()).progress.shape.solved); assert(!(await state()).progress.shape.assisted); assert((await debug()).shapeRevealed);
      await click('[data-walk-shape-inspect="B"]'); await click('[data-walk-shape-view="left"]'); await capture('diameter-reveal');
      await page.locator('[data-walk-note]').fill('Turning changes the view but not the two diameters.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await click('[data-walk-shape-overview]'); await page.keyboard.press('d'); assert((await state()).player.x > 120);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('phone touch turns a hoop while vertical gestures preserve page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-reset]'); await click('[data-walk-shape-inspect="A"]');
      const cdp = await page.context().newCDPSession(page);
      try {
        const p = await target('A'), before = await state(); assert(p);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 45, y: p.y + 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.notEqual((await state()).shape.angles[0], before.shape.angles[0]); assert.deepEqual((await state()).shape.tilts, before.shape.tilts); assert.deepEqual((await state()).player, before.player);
        const q = await target('A'), saved = await state(), scroll = await page.evaluate(() => scrollY); assert(q);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 90 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
        assert.deepEqual((await state()).player, saved.player); assert.deepEqual((await state()).shape, saved.shape); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('accessibility and geometric fallback retain rotation, inspection and diameter guides', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-shape-overview]');
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []);
      await click('[data-walk-diagram-toggle]'); const plan = page.locator('[data-walk-shape-plan]'); await plan.waitFor();
      const before = await plan.innerHTML(); await click('[data-walk-shape-right]'); assert.notEqual(await plan.innerHTML(), before);
      await click('[data-walk-shape-inspect="B"]'); const front = await plan.innerHTML(); await click('[data-walk-shape-view="left"]'); assert.notEqual(await plan.innerHTML(), front);
      await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-shape-diameters] line').count(), 4);
      await page.screenshot({ path: path.join(out, 'plan.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      return { axeViolations: violations.length };
    });
    await check('adjacent room and exit preserve progress and dispose the renderer', async () => {
      const before = await state(); await click('[data-walk-activity="relief"]'); await capture('existing-relief');
      await click('[data-walk-activity="shape"]'); assert.deepEqual((await state()).progress, before.progress);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: true, checks, screenshots, errors }, null, 2));
    console.log('All ' + checks.length + ' shape browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: false, phase, checks, screenshots, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
