'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(__dirname, '..', argument('out', '.tmp/perception-weave-qa'));

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
  const debug = () => page.evaluate(() => window.__weaveViewer.debug());
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
  const depth = async (index, value) => {
    await click('[data-walk-weave-piece="' + index + '"]');
    await page.locator('[data-walk-weave-depth]').evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const view = side => click('[data-walk-weave-view="' + side + '"]');
  const record = async () => { await view('front'); await click('[data-walk-weave-record]'); await view('left'); await click('[data-walk-weave-record]'); };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__weaveViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async (index, rail = false) => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    // Offscreen rendering can resume a frame after scrolling back to the scene.
    await page.waitForFunction(() => {
      const d = window.__weaveViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return Math.abs(d.camera.x - s.player.x) < 1e-6 && Math.abs(d.camera.z - s.player.z) < 1e-6 &&
        d.weaveDepths.every((depth, i) => Math.abs(depth - s.weave.depths[i]) < 1e-6);
    });
    return page.evaluate(({ index, rail }) => {
      const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect(), d = window.__weaveViewer.debug();
      const beam = d.weaveProjected[index], t = index === 1 ? 0.9 : 0.1;
      const p = rail ? d.weaveRails[index].projected : { x: beam.from.x + (beam.to.x - beam.from.x) * t, y: beam.from.y + (beam.to.y - beam.from.y) * t };
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, hit: window.__weaveViewer.pick(x, y), clear: document.elementFromPoint(x, y) === canvas };
    }, { index, rail });
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="weave"]'); await click('[data-walk-reset]');
    await check('real beams and depth rails support independent selection and direct dragging', async () => {
      const before = await capture('desktop-start');
      for (const index of [0, 1, 2]) { const p = await target(index); assert.equal(p.hit?.id, 'weave-' + 'ABC'[index]); assert(p.clear); await page.mouse.click(p.x, p.y); await page.waitForTimeout(100); assert.equal((await state()).weave.selected, index); }
      const p = await target(0), start = await state();
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 60, p.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(100);
      const changed = await state(); assert(Math.abs(changed.weave.depths[0] - start.weave.depths[0]) > 0.5); assert.deepEqual(changed.weave.depths.slice(1), start.weave.depths.slice(1)); assert.deepEqual(changed.player, start.player);
      assert.notEqual((await capture()).hash, before.hash);
      const knob = await target(1, true); assert.equal(knob.hit?.id, 'weave-rail-1'); assert(knob.clear);
      await page.mouse.move(knob.x, knob.y); await page.mouse.down(); await page.mouse.move(knob.x, knob.y - 22, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(100);
      assert.notEqual((await state()).weave.depths[1], changed.weave.depths[1]); assert.equal((await state()).weave.depths[0], changed.weave.depths[0]);
      assert.deepEqual((await debug()).weaveDepths, (await state()).weave.depths);
      await depth(0, 0); await page.locator('[data-walk-weave-depth]').focus(); await page.keyboard.press('ArrowRight'); assert.equal((await state()).weave.depths[0], 0.025);
    });
    await check('three inspection positions frame both arrangements on desktop and phones', async () => {
      const hashes = new Set();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) {
          await patch({ weave: { round, depths: round ? [0, -1.5, 1.5] : [1.5, 0, -1.5], selected: 0, seen: 0, completed: [] } });
          for (const side of ['front', 'left', 'right']) {
            await view(side); const d = await debug();
            assert.equal(d.weaveRound, round); assert(d.weaveProjected.every(beam => [beam.from, beam.to, beam.label].every(p => Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.97 && p.z > -1 && p.z < 1)));
            assert(await page.locator('[data-walk-waypoint]').evaluateAll(markers => markers.every(marker => marker.dataset.walkWaypoint === 'weave')));
            for (const index of [0, 1, 2]) assert((await target(index)).clear, 'Beam is unobstructed by floating controls');
            hashes.add((await capture()).hash);
          }
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await capture('weave-' + width); await page.screenshot({ path: path.join(out, 'ui-' + width + '.png'), fullPage: true });
      }
      assert(hashes.size >= 15); return { distinctImages: hashes.size };
    });
    await check('scoring requires current front and side evidence and preserves both earned patterns', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      await depth(0, 1.2); await depth(1, 0); await depth(2, -1.2); await click('[data-walk-check]'); assert.deepEqual((await state()).weave.completed, []);
      await record(); assert.equal((await state()).weave.seen, 3);
      await click('[data-walk-weave-near]'); assert.equal((await state()).weave.seen, 0); await click('[data-walk-check]'); assert.deepEqual((await state()).weave.completed, []);
      await record(); await click('[data-walk-check]'); assert.deepEqual((await state()).weave.completed, [0]);
      await click('[data-walk-weave-next]'); assert.equal((await state()).weave.seen, 0); assert.equal((await state()).weave.round, 1);
      await depth(0, 0.1); await depth(1, -1); await depth(2, 1.1); await record(); await click('[data-walk-check]'); assert((await state()).progress.weave.solved);
      await click('[data-walk-reveal]'); assert((await state()).progress.weave.solved); assert(!(await state()).progress.weave.assisted); assert((await debug()).weaveRevealed);
      await capture('weave-reveal'); await page.locator('[data-walk-note]').fill('The front crossing order stays clearer when I inspect the gaps from the side.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved); assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('touch moves a beam while vertical gestures retain native page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-reset]'); const cdp = await page.context().newCDPSession(page);
      try {
        await page.evaluate(() => { const pick = window.__weaveViewer.pick; window.__weaveTouchPicks = []; window.__weaveViewer.pick = function (x, y) { const hit = pick.apply(this, arguments); window.__weaveTouchPicks.push({ x, y, hit }); return hit; }; });
        const p = await target(0), before = await state(); assert.equal(p.hit?.id, 'weave-A');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 40, y: p.y + 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert.notEqual((await state()).weave.depths[0], before.weave.depths[0], JSON.stringify({ target: p, picks: await page.evaluate(() => window.__weaveTouchPicks) })); assert.deepEqual((await state()).player, before.player);
        const q = await target(0), saved = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 85 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
        assert.deepEqual((await state()).player, saved.player); assert.deepEqual((await state()).weave.depths, saved.weave.depths); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('observation and manipulation gates follow the actual first-person position', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); const before = await state();
      await patch({ player: { ...before.player, yaw: 180 } });
      for (const name of ['depth', 'near', 'far', 'record']) assert(await page.locator('[data-walk-weave-' + name + ']').isDisabled());
      await click('[data-walk-check]'); assert.deepEqual((await state()).weave.completed, []);
      await patch({ player: { x: 153, z: 9, yaw: 18.435, pitch: 0 } }); assert(await page.locator('[data-walk-weave-record]').isDisabled());
      await patch({ player: { x: 151.6, z: 5.5, yaw: 38.659808, pitch: 0 } });
      await click('[data-walk-weave-record]'); assert.equal((await state()).weave.seen, 2);
      await view('front'); await click('[data-walk-weave-record]'); assert.equal((await state()).weave.seen, 3);
    });
    await check('accessible controls and Plan fallback preserve crossings and actual depth guides', async () => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []); await click('[data-walk-diagram-toggle]'); const plan = page.locator('[data-walk-weave-plan]'); await plan.waitFor();
      const before = await plan.innerHTML(); await depth(2, -1); assert.notEqual(await plan.innerHTML(), before); assert.equal((await state()).weave.seen, 0);
      await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-weave-guides] line').count(), 3); assert((await state()).progress.weave.assisted);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const values of [[-1.5, 1.5, 0], [1.5, 0, -1.5]]) {
          await patch({ weave: { ...(await state()).weave, depths: values } });
          for (const side of ['front', 'left', 'right']) {
            await view(side);
            assert(await plan.locator('text').evaluateAll(labels => labels.length === 3 && labels.every(label => { const box = label.getBBox(); return box.x >= 0 && box.y >= 0 && box.x + box.width <= 800 && box.y + box.height <= 600; })));
          }
        }
        await page.screenshot({ path: path.join(out, 'plan-' + width + '.png'), fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: path.join(out, 'plan.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor(); return { axeViolations: violations.length };
    });
    await check('neighbor-room controls, saved observations and renderer disposal remain intact', async () => {
      const before = await state(); await click('[data-walk-activity="frame"]'); await capture('existing-frame');
      const adjustment = (await state()).frame.adjustment; await click('[data-walk-frame-right]'); assert((await state()).frame.adjustment > adjustment);
      await click('[data-walk-activity="weave"]'); assert.deepEqual((await state()).weave, before.weave); assert.deepEqual((await state()).notes, before.notes); assert.deepEqual((await state()).progress, before.progress);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: true, checks, screenshots, errors }, null, 2));
    console.log('All ' + checks.length + ' weave browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: false, phase, checks, screenshots, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
