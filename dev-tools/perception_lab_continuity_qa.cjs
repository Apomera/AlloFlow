'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find(arg => arg.startsWith('--out='));
const out = path.resolve(root, outputArg ? outputArg.slice(6) : '.tmp/perception-continuity-qa');
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
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set(); let colored = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const [r, g, b] = png.data.subarray(i, i + 3);
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    colors.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30 && colored > 150, 'Canvas renders varied colored geometry');
  return { width: png.width, height: png.height, colors: colors.size, colored, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

async function run(url) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  const checks = [], screenshots = [], errors = [], loadRetries = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__continuityViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(160);
  };
  const slider = async value => {
    await page.locator('[data-walk-continuity-offset]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await page.waitForTimeout(120);
  };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas');
    await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot({ path: path.join(out, name + '.png') }));
    screenshots.push({ name, ...detail }); return detail;
  };
  const capturePage = async name => page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  const inspectViewer = async () => {
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__continuityViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async (endpoint = 'center') => page.evaluate(endpoint => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const rod = window.__continuityViewer.debug().continuationProjected.find(item => item.id === 'continuity-rod');
    const point = rod[endpoint], x = rect.left + (point.x + 1) * rect.width / 2, y = rect.top + (1 - point.y) * rect.height / 2;
    return { x, y, hit: window.__continuityViewer.pick(x, y), unobstructed: document.elementFromPoint(x, y) === canvas };
  }, endpoint);
  const open = async fallback => {
    await click('[data-perception-open-gallery]');
    // Exercise the existing Retry action if local file I/O exceeds the loader's timeout.
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.locator('[data-gallery-open-walk], .perception-gallery-loading button').filter({ hasText: /Walk-through challenges|Retry/ }).first().waitFor({ timeout: 45000 });
      if (await page.locator('[data-gallery-open-walk]').count()) break;
      loadRetries.push({ phase, attempt: attempt + 1 }); await click('.perception-gallery-loading button:has-text("Retry")');
    }
    await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-plan]' : '[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(false); await inspectViewer();
    await check('seventh bay renders, rods are framed and the screen blocks hidden geometry', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 10);
      await click('[data-walk-activity="continuity"]'); await click('[data-walk-reset]');
      assert.deepEqual((await state()).player, { x: 60, z: 9, yaw: 0, pitch: 0 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const point = await target(); assert(point.unobstructed); assert.equal(point.hit?.id, 'continuity-rod');
      assert.equal((await target('from')).hit, null, 'Screen blocks the inner rod endpoint');
      const scene = await debug(); assert.equal(scene.continuityScreenVisible, true);
      assert(scene.continuationProjected.every(rod => [rod.from, rod.to].every(p => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && p.z > -1 && p.z < 1)));
      await capture('desktop-start'); await capturePage('desktop-ui');
    });
    await check('direct dragging changes physical rod height without turning or moving the camera', async () => {
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const point = await target(), before = await state(), image = await capture('before-drag');
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x, point.y + 55, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(160);
      const after = await state();
      assert(after.continuityOffset < before.continuityOffset - 0.1);
      assert.deepEqual(after.player, before.player); assert.equal((await debug()).selected, true);
      assert.equal((await debug()).continuityOffset, after.continuityOffset);
      assert.notEqual((await capture('after-drag')).hash, image.hash);
      return { before: before.continuityOffset, after: after.continuityOffset };
    });
    await check('walking moves the image, respects the exhibit footprint and disables distant adjustments', async () => {
      const before = await capture('before-step'); await page.locator('[data-walk-stage]').focus();
      await page.keyboard.press('d'); assert((await state()).player.x > 60);
      assert.notEqual((await capture('after-step')).hash, before.hash);
      await setState({ player: { x: 60, z: 1, yaw: 0, pitch: 0 } });
      await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 8; i++) await page.keyboard.press('w');
      assert((await state()).player.z >= 0.6 - 1e-8);
      await setState({ player: { x: 64, z: 1, yaw: 0, pitch: 0 } });
      await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 12; i++) await page.keyboard.press('w');
      assert((await state()).player.z < -1, 'Side route permits inspection behind the exhibit');
      assert.equal(await page.locator('[data-walk-continuity-offset]').isDisabled(), true);
      await click('[data-walk-home]'); assert.equal(await page.locator('[data-walk-continuity-offset]').isDisabled(), false);
    });
    await check('slider and fine buttons solve only from a valid observation viewpoint', async () => {
      await slider(0.35); await click('[data-walk-continuity-down]');
      assert(Math.abs((await state()).continuityOffset - 0.3) < 1e-8);
      await click('[data-walk-precision]'); await click('[data-walk-continuity-up]');
      assert(Math.abs((await state()).continuityOffset - 0.31) < 1e-8);
      await click('[data-walk-check]'); assert.equal((await state()).progress.continuity.solved, false);
      await slider(0); await setState({ player: { x: 62, z: 9, yaw: 0, pitch: 0 } });
      await click('[data-walk-check]'); assert.equal((await state()).progress.continuity.solved, false);
      await click('[data-walk-home]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.continuity, { solved: true, assisted: false, hints: 0 });
      await page.locator('[data-walk-note]').fill('My perceived continuation and the geometric continuation can differ.');
      const before = await state(); await page.reload(); await open(false); await inspectViewer();
      assert.deepEqual(await state(), before); assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('uncovering adds a guide but preserves the estimate and stays assisted after re-covering', async () => {
      await click('[data-walk-reset]'); await slider(0.42);
      const image = await capture('covered'); await click('[data-walk-reveal]');
      assert.equal((await debug()).continuityScreenVisible, false);
      assert.equal((await state()).continuityOffset, 0.42);
      assert.equal((await state()).progress.continuity.assisted, true);
      assert.notEqual((await capture('uncovered')).hash, image.hash);
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      assert.equal((await target('from')).hit?.id, 'continuity-rod');
      await click('[data-walk-reveal]'); assert.equal((await debug()).continuityScreenVisible, true);
      await slider(0); await click('[data-walk-check]'); assert.equal((await state()).progress.continuity.solved, false);
      await click('[data-walk-reset]'); assert.equal((await state()).continuityOffset, 0.8);
      assert.match((await state()).notes.continuity, /geometric/);
    });
    await check('mobile controls, ten-bay navigation and direct touch dragging fit at 390 and 320 pixels', async () => {
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 }); await click('[data-walk-reset]');
          await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const bad = await page.locator('[data-perception-walk] button, [data-perception-walk] label').evaluateAll(nodes => nodes.filter(node => {
            const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
          }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
          const scene = await debug(); assert(scene.continuationProjected.every(rod => [rod.from, rod.to].every(p => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95)));
          const point = await target(); assert(point.unobstructed && point.hit?.id === 'continuity-rod');
          const before = await state(), scroll = await page.evaluate(() => scrollY);
          await page.evaluate(() => {
            window.__continuityTouchEvents = [];
            for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) document.querySelector('[data-walk-stage]').addEventListener(type, event => window.__continuityTouchEvents.push({ type, x: event.clientX, y: event.clientY, button: event.button, pointerType: event.pointerType }));
          });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
          await page.waitForTimeout(80);
          for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y + i * 6 }] }); await page.waitForTimeout(40); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(160);
          const after = await state(), touchEvents = await page.evaluate(() => window.__continuityTouchEvents);
          assert(after.continuityOffset < before.continuityOffset - 0.1, JSON.stringify({ width, before: before.continuityOffset, after: after.continuityOffset, touchEvents }));
          assert.deepEqual((await state()).player, before.player); assert.equal(await page.evaluate(() => scrollY), scroll);
          await capture('mobile-' + width); await capturePage('mobile-ui-' + width);
        }
      } finally { await cdp.detach(); }
    });
    await check('keyboard-accessible fallback works without WebGL and the workspace releases its canvas', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
      await page.goto(url + '?no-webgl=1'); await open(true); await click('[data-walk-activity="continuity"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-continuity-plan]').waitFor(); await slider(0); await click('[data-walk-check]');
      assert.equal((await state()).progress.continuity.solved, true);
      await capturePage('mobile-fallback');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, [], 'No browser runtime errors');
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors, loadRetries }, null, 2));
    console.log('PASS: ' + checks.length + ' continuity browser groups');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: false, phase, error: error.stack, checks, screenshots, errors, loadRetries }, null, 2));
    throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = urlArg ? null : await serve();
  try { await run(urlArg ? urlArg.slice(6) : 'http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
