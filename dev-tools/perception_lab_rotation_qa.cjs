'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const outArg = process.argv.find(arg => arg.startsWith('--out='));
const out = path.resolve(root, process.env.PERCEPTION_ROTATION_QA_OUT || (outArg ? outArg.slice(6) : '.tmp/perception-rotation-qa'));
const urlArg = process.argv.find(arg => arg.startsWith('--url='));

async function serve() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
    catch (_) { res.writeHead(400).end(); return; }
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || /(^|[\\/])\.(git|aws|codex)([\\/]|$)/.test(relative)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return server;
}

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set(); let colored = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const [r, g, b] = png.data.subarray(i, i + 3);
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    colors.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30 && colored > 150, 'Canvas contains rendered geometry');
  return { width: png.width, height: png.height, colors: colors.size, colored, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

async function run(url) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  const checks = [], screenshots = [], errors = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__rotationViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(140); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(160);
  };
  const setRotation = async patch => { const current = await state(); await setState({ rotation: { ...current.rotation, ...patch } }); };
  const canvasPixels = async () => { const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded(); return pixels(await canvas.screenshot()); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot({ path: path.join(out, name + '.png') }));
    screenshots.push({ name, ...detail }); return detail;
  };
  const full = async name => page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  const open = async fallback => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-plan]' : '[data-perception-walk] canvas').waitFor();
  };
  const inspect = async () => {
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__rotationViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async choice => page.evaluate(choice => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const item = window.__rotationViewer.debug().rotationProjected.find(item => item.choice === choice);
    const points = item.voxelCenters.map(point => {
      const x = rect.left + (point.x + 1) * rect.width / 2, y = rect.top + (1 - point.y) * rect.height / 2;
      return { x, y, ndc: point, hit: window.__rotationViewer.pick(x, y), unobstructed: document.elementFromPoint(x, y) === canvas };
    });
    return points.find(point => point.unobstructed && point.hit?.id === 'rotation-' + choice) || points.find(point => point.unobstructed) || points[0];
  }, choice);
  const pickObject = async choice => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded(); const point = await target(choice);
    assert(point.unobstructed, 'Sculpture ' + choice + ' is not covered by interface controls'); assert.equal(point.hit?.id, 'rotation-' + choice);
    await page.mouse.click(point.x, point.y); await page.waitForTimeout(160);
    assert.equal((await state()).rotation.selected, choice === 'A' ? 0 : 1); return point;
  };
  const assertFramed = async () => {
    const scene = await debug(); assert.equal(scene.rotationObjects.length, 3);
    assert(scene.rotationProjected.every(item => item.corners.length >= 48 && item.corners.every(point => Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.96 && point.z > -1 && point.z < 1)), 'Every corner of all three sculptures fits in the viewport');
  };
  const slider = async (name, value) => {
    await page.locator('[data-walk-rotation-' + name + ']').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value); await page.waitForTimeout(160);
  };
  const choose = async choice => click('[data-walk-rotation-choice="' + choice + '"]');
  try {
    await page.goto(url); await open(false); await inspect();
    await check('ten bays include three framed solid sculptures and ray-pickable candidate voxels', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 10);
      await click('[data-walk-activity="rotation"]'); await click('[data-walk-reset]');
      assert.deepEqual((await state()).player, { x: 96, z: 9, yaw: 0, pitch: 0 }); await assertFramed();
      const scene = await debug(); assert.deepEqual(scene.rotationObjects.map(object => object.choice), ['R', 'A', 'B']);
      assert(scene.rotationObjects.every(object => object.cells.length === 6));
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const samples = [];
      for (const choice of ['A', 'B']) {
        const point = await pickObject(choice), png = PNG.sync.read(await page.locator('[data-perception-walk] canvas').screenshot());
        const x = Math.round((point.ndc.x + 1) * png.width / 2), y = Math.round((1 - point.ndc.y) * png.height / 2);
        const rgb = Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3));
        assert(Math.max(...rgb) - Math.min(...rgb) > 25, 'Picked voxel contains a colored solid surface'); samples.push(rgb);
      }
      assert.equal((await target('R')).hit, null, 'Reference sculpture is not selectable');
      assert.equal(await page.locator('[data-walk-rotation-next]').isDisabled(), true);
      await capture('desktop-start'); await full('desktop-ui'); return { solidPixels: samples };
    });
    await check('desktop mesh dragging turns and tilts only the chosen sculpture and changes the rendered geometry', async () => {
      await click('[data-walk-reset]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const point = await target('A'), before = await state(), scene = await debug(), image = await canvasPixels();
      assert(point.unobstructed); assert.equal(point.hit?.id, 'rotation-A');
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x + 100, point.y - 60, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(180);
      const after = await state(); assert(Math.abs(after.rotation.angles[0] - 175) < 0.01); assert(Math.abs(after.rotation.tilts[0] - 41) < 0.01);
      assert.equal(after.rotation.angles[1], before.rotation.angles[1]); assert.equal(after.rotation.tilts[1], before.rotation.tilts[1]);
      assert.deepEqual(after.player, before.player); assert.deepEqual((await debug()).rotationObjects.map(object => object.cells), scene.rotationObjects.map(object => object.cells));
      assert.notDeepEqual((await debug()).rotationProjected[1].voxelCenters, scene.rotationProjected[1].voxelCenters);
      assert.notEqual((await capture('desktop-turned')).hash, image.hash);
      await slider('yaw', 359); await click('[data-walk-rotation-left]'); assert.equal((await state()).rotation.angles[0], 4);
      await slider('tilt', 75); assert.equal((await state()).rotation.tilts[0], 75); assert.equal(await page.locator('[data-walk-rotation-up]').isDisabled(), true);
      await click('[data-walk-rotation-down]'); assert.equal((await state()).rotation.tilts[0], 70);
    });
    await check('wrong choices and non-observation viewpoints cannot advance; partial completion and notes persist', async () => {
      await click('[data-walk-reset]'); await choose('B'); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, []); assert.equal(await page.locator('[data-walk-rotation-next]').isDisabled(), true);
      await choose('A'); await setState({ player: { x: 96, z: 3, yaw: 0, pitch: 0 } }); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, []); await click('[data-walk-home]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, [0]); assert.equal((await state()).progress.rotation.solved, false);
      assert.equal(await page.locator('[data-walk-rotation-next]').isDisabled(), false);
      await page.locator('[data-walk-note]').fill('The bends preserve their handedness when I turn the solid.');
      const saved = await state(); await page.reload(); await open(false); await inspect(); assert.deepEqual(await state(), saved);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('two independent pairs complete the activity and later reveals preserve the earned solve', async () => {
      await click('[data-walk-rotation-next]'); assert.equal((await state()).rotation.round, 1);
      assert((await debug()).rotationObjects.every(object => object.cells.length === 7));
      await choose('A'); await click('[data-walk-check]'); assert.deepEqual((await state()).rotation.completed, [0]);
      await pickObject('B'); await choose('B'); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, [0, 1]); assert.equal((await state()).progress.rotation.solved, true);
      assert.equal((await state()).progress.rotation.assisted, false); await click('[data-walk-check]'); assert.deepEqual((await state()).rotation.completed, [0, 1]);
      const before = (await state()).rotation, image = await canvasPixels(); await click('[data-walk-reveal]');
      assert.equal((await debug()).rotationRevealed, true); assert.notEqual((await capture('desktop-reveal')).hash, image.hash);
      assert.deepEqual((await state()).rotation, before); assert.equal((await state()).progress.rotation.solved, true); assert.equal((await state()).progress.rotation.assisted, false);
      await click('[data-walk-reveal]'); assert.equal((await debug()).rotationRevealed, false); assert.equal((await state()).progress.rotation.solved, true);
      await click('[data-walk-rotation-next]'); assert.equal((await state()).rotation.round, 0); assert.equal((await state()).progress.rotation.solved, true);
    });
    await check('unearned reveals are assisted and reset clears only this activity while preserving notes', async () => {
      await click('[data-walk-reset]'); const before = (await state()).rotation;
      await click('[data-walk-reveal]'); assert.equal((await debug()).rotationRevealed, true); assert.deepEqual((await state()).rotation, before);
      assert.equal((await state()).progress.rotation.assisted, true); await choose('A'); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, []); assert.equal((await state()).progress.rotation.solved, false);
      await click('[data-walk-rotation-next]'); assert.equal((await state()).rotation.round, 1); await choose('B'); await click('[data-walk-check]');
      assert.deepEqual((await state()).rotation.completed, []); assert.equal((await state()).progress.rotation.solved, false);
      const saved = await state(); await page.reload(); await open(false); await inspect(); assert.deepEqual(await state(), saved);
      const unrelated = (await state()).progress.change; await click('[data-walk-reset]');
      assert.deepEqual((await state()).rotation, { round: 0, angles: [125, 225], tilts: [20, -25], selected: 0, choice: '', completed: [] });
      assert.deepEqual((await state()).progress.rotation, { solved: false, assisted: false, hints: 0 });
      assert.deepEqual((await state()).progress.change, unrelated); assert.match((await state()).notes.rotation, /handedness/);
    });
    await check('walking changes the 3D view, pedestals block movement and the rear wall blocks picking', async () => {
      const image = await canvasPixels(); await page.locator('[data-walk-stage]').focus(); await page.keyboard.press('d');
      assert.notEqual((await canvasPixels()).hash, image.hash);
      await setState({ player: { x: 96, z: 3, yaw: 0, pitch: 0 } }); await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 12; i++) await page.keyboard.press('w'); assert((await state()).player.z >= 1.65 - 1e-8 && (await state()).player.z < 2);
      await setState({ player: { x: 96, z: -6, yaw: 180, pitch: 0 } }); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      assert.equal((await target('A')).hit, null, 'Opaque wall prevents picking the sculpture from behind');
      assert.equal(await page.locator('[data-walk-rotation-yaw]').isDisabled(), true); assert.equal(await page.locator('[data-walk-rotation-choice="A"]').isDisabled(), true);
      await click('[data-walk-home]'); assert.equal(await page.locator('[data-walk-rotation-yaw]').isDisabled(), false);
    });
    await check('mobile layouts frame complete rotated solids; horizontal touch turns and vertical touch still scrolls', async () => {
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 }); await click('[data-walk-reset]');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const bad = await page.locator('[data-perception-walk] button, [data-perception-walk] label').evaluateAll(nodes => nodes.filter(node => {
            const rect = node.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
          }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
          for (const round of [0, 1]) {
            for (const yaw of [0, 90, 180, 270]) {
              await setRotation({ round, angles: [yaw, yaw], tilts: [-75, 75] }); await assertFramed();
            }
            await setRotation({ round, angles: [280, 280], tilts: [-33, -33] }); await assertFramed();
          }
          await click('[data-walk-reset]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          const point = await target('A'), before = await state(), scroll = await page.evaluate(() => scrollY);
          assert(point.unobstructed); assert.equal(point.hit?.id, 'rotation-A');
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
          for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + i * 12, y: point.y }] }); await page.waitForTimeout(50); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
          assert(Math.abs((await state()).rotation.angles[0] - before.rotation.angles[0] - 30) < 0.1);
          assert.deepEqual((await state()).rotation.tilts, before.rotation.tilts); assert.deepEqual((await state()).player, before.player); assert.equal(await page.evaluate(() => scrollY), scroll);
          const vertical = await target('A'), preScroll = await page.evaluate(() => scrollY), preVertical = await state();
          assert.equal(vertical.hit?.id, 'rotation-A');
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vertical.x, y: vertical.y }] });
          for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vertical.x, y: vertical.y - i * 18 }] }); await page.waitForTimeout(50); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
          assert((await page.evaluate(() => scrollY)) > preScroll + 1, 'Vertical touch gesture scrolls the page');
          assert.deepEqual((await state()).rotation.angles, preVertical.rotation.angles); assert.deepEqual((await state()).rotation.tilts, preVertical.rotation.tilts); assert.deepEqual((await state()).player, preVertical.player);
          await capture('mobile-' + width); if (width === 320) await full('mobile-ui-320');
        }
      } finally { await cdp.detach(); }
    });
    await check('accessible controls and no-WebGL two-round play remain available and dispose cleanly', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
      const fallbackUrl = new URL(url); fallbackUrl.searchParams.set('no-webgl', '1');
      await page.goto(fallbackUrl.href); await open(true); await click('[data-walk-activity="rotation"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-rotation-plan]').waitFor(); const before = await page.locator('[data-walk-rotation-plan]').innerHTML();
      await slider('yaw', 335); await slider('tilt', 15); assert.notEqual(await page.locator('[data-walk-rotation-plan]').innerHTML(), before);
      await choose('A'); await click('[data-walk-check]'); assert.deepEqual((await state()).rotation.completed, [0]);
      await click('[data-walk-rotation-next]'); await choose('B'); await click('[data-walk-check]');
      assert.equal((await state()).progress.rotation.solved, true); assert.deepEqual((await state()).rotation.completed, [0, 1]);
      assert.equal(await page.locator('[data-perception-walk] canvas').count(), 0);
      await click('[data-walk-reveal]'); await page.locator('[data-walk-rotation-comparison] polyline').first().waitFor();
      assert.equal((await state()).progress.rotation.solved, true); assert.equal((await state()).progress.rotation.assisted, false);
      await full('mobile-fallback');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' rotation-studio browser groups');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: false, phase, error: error.stack, checks, screenshots, errors }, null, 2));
    throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = urlArg ? null : await serve();
  try { await run(urlArg ? urlArg.slice(6) : 'http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
