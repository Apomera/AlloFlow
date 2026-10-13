'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(root, argument('out', '.tmp/perception-inspection-qa'));

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set(); let colored = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const [r, g, b] = png.data.subarray(i, i + 3);
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    colors.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30 && colored > 150, 'Rendered inspection is not blank');
  return { width: png.width, height: png.height, colors: colors.size, colored, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = [], screenshots = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__inspectionViewer.debug());
  const view = () => page.evaluate(() => StemLab.PerceptionWalk.rotationInspection(window.__perceptionPreview.state.perceptionWalk));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}));
    if (name) screenshots.push({ name, ...detail }); return detail;
  };
  const check = async (name, run) => { phase = name; const detail = await run(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => {
      const current = data.perceptionWalk, next = { ...current, ...patch };
      if (patch.rotation) next.rotation = { ...current.rotation, ...patch.rotation };
      return { ...data, perceptionWalk: StemLab.PerceptionWalk.normalize(next) };
    }), patch); await page.waitForTimeout(130);
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor();
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__inspectionViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const framed = async choice => {
    const item = (await debug()).rotationProjected.find(item => item.choice === choice);
    assert(item.corners.every(point => Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.96 && point.z > -1 && point.z < 1), choice + ' fits completely in its close-up');
  };
  const target = async choice => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    return page.evaluate(choice => {
      const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
      const item = window.__inspectionViewer.debug().rotationProjected.find(item => item.choice === choice);
      return item.voxelCenters.map(point => {
        const x = rect.left + (point.x + 1) * rect.width / 2, y = rect.top + (1 - point.y) * rect.height / 2;
        return { x, y, hit: window.__inspectionViewer.pick(x, y), clear: document.elementFromPoint(x, y) === canvas };
      }).find(point => point.clear && point.hit?.id === 'rotation-' + choice);
    }, choice);
  };
  const focusIsStage = () => page.evaluate(() => document.activeElement === document.querySelector('[data-walk-stage]'));
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="rotation"]'); await click('[data-walk-reset]');
    await check('all nine inspection viewpoints preserve the puzzle and frame real geometry in both pairs', async () => {
      const hashes = new Set();
      for (const round of [0, 1]) {
        await setState({ rotation: { round } });
        const before = await state();
        for (const choice of ['R', 'A', 'B']) {
          await click('[data-walk-rotation-inspect="' + choice + '"]');
          for (const side of ['front', 'left', 'right']) {
            await click('[data-walk-rotation-view="' + side + '"]');
            assert.equal((await view()).choice, choice); assert.equal((await view()).side, side); assert(await focusIsStage());
            await framed(choice); hashes.add((await capture()).hash);
            const after = await state();
            for (const key of ['round', 'angles', 'tilts', 'choice', 'completed']) assert.deepEqual(after.rotation[key], before.rotation[key]);
            assert.deepEqual(after.progress, before.progress); assert.deepEqual(after.notes, before.notes);
          }
        }
      }
      assert(hashes.size >= 16, 'Changing viewpoints changes the actual canvas');
      await click('[data-walk-rotation-inspect="A"]'); await capture('desktop-closeup');
      await page.screenshot({ path: path.join(out, 'desktop-ui.png'), fullPage: true });
      return { distinctImages: hashes.size };
    });
    await check('close-up dragging, protected reference controls and same-side candidate selection work', async () => {
      await click('[data-walk-reset]'); await click('[data-walk-rotation-inspect="A"]'); await click('[data-walk-rotation-view="left"]');
      const point = await target('A'), before = await state(), image = await capture(); assert(point);
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 70, point.y - 30, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
      const after = await state(); assert(Math.abs(after.rotation.angles[0] - before.rotation.angles[0] - 35) < 0.01);
      assert(Math.abs(after.rotation.tilts[0] - before.rotation.tilts[0] - 10.5) < 0.01); assert.deepEqual(after.player, before.player);
      assert.notEqual((await capture()).hash, image.hash);
      await click('[data-walk-rotation-inspect="R"]'); assert.equal((await view()).side, 'left');
      for (const control of ['yaw', 'tilt', 'left', 'right', 'up', 'down']) assert(await page.locator('[data-walk-rotation-' + control + ']').isDisabled());
      assert.equal(await page.locator('[data-walk-rotation-piece]:checked').count(), 0);
      await click('[data-walk-rotation-piece="1"]'); assert.equal((await view()).choice, 'B'); assert.equal((await view()).side, 'left');
      assert.equal((await state()).rotation.selected, 1); assert.equal(await page.locator('[data-walk-rotation-yaw]').isDisabled(), false);
      await framed('B');
    });
    await check('returning restores the observation area and keyboard navigation without changing earned progress', async () => {
      await click('[data-walk-reset]'); await click('[data-walk-rotation-inspect="A"]');
      await click('[data-walk-rotation-choice="A"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).rotation.completed, []);
      await click('[data-walk-rotation-overview]'); assert.deepEqual((await state()).player, { x: 96, z: 9, yaw: 0, pitch: 0 }); assert(await focusIsStage());
      await page.keyboard.press('d'); await page.waitForTimeout(120); assert((await state()).player.x > 96);
      await click('[data-walk-rotation-overview]'); await click('[data-walk-check]'); assert.deepEqual((await state()).rotation.completed, [0]);
      await click('[data-walk-rotation-next]'); await click('[data-walk-rotation-choice="B"]'); await click('[data-walk-check]'); assert.equal((await state()).progress.rotation.solved, true);
      const solved = await state(); await click('[data-walk-rotation-inspect="R"]'); await click('[data-walk-rotation-view="right"]'); await click('[data-walk-rotation-overview]');
      assert.deepEqual((await state()).rotation, solved.rotation); assert.deepEqual((await state()).progress, solved.progress);
      await click('[data-walk-rotation-inspect="A"]'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120);
      assert.equal(await view(), null); assert(await page.locator('[data-walk-rotation-view="front"]').isDisabled());
    });
    await check('close-up position and observations persist across reload', async () => {
      await click('[data-walk-rotation-inspect="B"]'); await click('[data-walk-rotation-view="right"]');
      await page.locator('[data-walk-note]').fill('The side view exposes the second bend.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved); assert.equal((await view()).choice, 'B'); assert.equal((await view()).side, 'right');
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('phone close-ups remain framed and touch rotation preserves vertical scrolling', async () => {
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          for (const round of [0, 1]) {
            await setState({ rotation: { round, angles: [280, 280], tilts: [-33, 75] } });
            for (const choice of ['R', 'A', 'B']) {
              await click('[data-walk-rotation-inspect="' + choice + '"]');
              for (const side of ['front', 'left', 'right']) { await click('[data-walk-rotation-view="' + side + '"]'); await framed(choice); }
            }
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          assert.deepEqual(await page.locator('[data-perception-walk] button').evaluateAll(nodes => nodes.filter(node => node.clientWidth && (node.scrollWidth > node.clientWidth + 2 || node.getBoundingClientRect().right > innerWidth + 1)).map(node => node.outerHTML)), []);
          await click('[data-walk-reset]'); await click('[data-walk-rotation-inspect="A"]');
          const point = await target('A'), before = await state(), scroll = await page.evaluate(() => scrollY); assert(point);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
          for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + 10 * i, y: point.y }] }); await page.waitForTimeout(50); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
          assert(Math.abs((await state()).rotation.angles[0] - before.rotation.angles[0] - 25) < 0.1); assert.deepEqual((await state()).rotation.tilts, before.rotation.tilts); assert.deepEqual((await state()).player, before.player); assert.equal(await page.evaluate(() => scrollY), scroll);
          const vertical = await target('A'), saved = await state(); assert(vertical);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vertical.x, y: vertical.y }] });
          for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vertical.x, y: vertical.y - 18 * i }] }); await page.waitForTimeout(50); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200);
          assert((await page.evaluate(() => scrollY)) > scroll + 1); assert.deepEqual(await state(), saved);
          await capture('mobile-' + width); if (width === 320) await page.screenshot({ path: path.join(out, 'mobile-ui.png'), fullPage: true });
        }
      } finally { await cdp.detach(); }
    });
    await check('inspection controls are accessible, absent in fallback and dispose cleanly', async () => {
      await click('[data-walk-rotation-inspect="R"]');
      await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      await click('[data-walk-diagram-toggle]'); assert.equal(await page.locator('[data-walk-rotation-inspection]').count(), 0);
      assert.equal(await page.locator('[data-walk-rotation-yaw]').isDisabled(), false);
      await click('[data-walk-rotation-left]'); await page.locator('[data-walk-rotation-plan]').waitFor();
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-walk-rotation-inspection]').waitFor(); assert.equal((await view()).choice, 'R');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' inspection browser groups');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: false, phase, error: error.stack, checks, screenshots, errors }, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
