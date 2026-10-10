'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-parallax');
const memoryOnly = process.env.QA_MEMORY_ONLY === '1';

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
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    colors.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  return { width: png.width, height: png.height, colors: colors.size, colored, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

async function run(url) {
  if (!memoryOnly) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  const checks = [], screenshots = [], errors = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(140);
  };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(memoryOnly ? {} : { path: path.join(out, name + '.png') }));
    assert(detail.width >= 240 && detail.height >= 220);
    assert(detail.colors > 30 && detail.colored > 200, 'Canvas contains varied rendered geometry');
    screenshots.push({ name, ...detail }); return detail;
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-plan]' : '[data-perception-walk] canvas').waitFor();
  };
  const inspectViewer = async () => {
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__parallaxViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const projected = () => page.evaluate(() => window.__parallaxViewer.debug().parallaxProjected);
  const target = async choice => page.evaluate(choice => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const item = window.__parallaxViewer.debug().parallaxProjected.find(item => item.choice === choice);
    const x = rect.left + (item.center.x + 1) * rect.width / 2, y = rect.top + (1 - item.center.y) * rect.height / 2;
    return { x, y, unobstructed: document.elementFromPoint(x, y) === canvas, hit: window.__parallaxViewer.pick(x, y) };
  }, choice);
  const keyboard = async key => { await page.locator('[data-walk-stage]').focus(); await page.keyboard.press(key); await page.waitForTimeout(120); };
  const capturePage = async name => page.screenshot(memoryOnly ? { fullPage: true } : { path: path.join(out, name + '.png'), fullPage: true });
  try {
    await page.goto(url); await open(); await inspectViewer();
    await check('fourth bay renders equal-size projections and ray-picks all three physical spheres', async () => {
      await click('[data-walk-activity="parallax"]');
      assert.equal(await page.locator('[data-walk-activity]').count(), 6);
      assert.deepEqual((await state()).player, { x: 24, z: 9, yaw: 0, pitch: 0 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const objects = await projected(), heights = objects.map(item => Math.abs(item.top.y - item.bottom.y));
      heights.forEach(height => assert(Math.abs(height / heights[0] - 1) < 0.001));
      const hits = [];
      for (const choice of ['A', 'B', 'C']) {
        const point = await target(choice); assert(point.unobstructed, 'Sphere center is not covered by an overlay');
        assert.equal(point.hit?.id, 'parallax-' + choice); hits.push(point.hit);
      }
      assert(hits[1].distance > 7 && hits[1].distance < 20, 'Farther sphere remains inspectable beyond manipulation reach');
      assert(hits[2].distance < hits[0].distance && hits[0].distance < hits[1].distance);
      await capture('parallax-start'); return { heights, hits };
    });
    await check('sideways walking changes real projections most for the nearest object', async () => {
      const before = await projected(), first = await capture('parallax-before-strafe');
      await keyboard('d');
      const after = await projected(), shifts = after.map((item, i) => Math.abs(item.center.x - before[i].center.x));
      assert(shifts[2] > shifts[0] && shifts[0] > shifts[1]);
      assert(Math.abs((await state()).player.x - 24.2) < 0.00001);
      assert.equal((await state()).player.yaw, 0);
      const second = await capture('parallax-after-strafe'); assert.notEqual(first.hash, second.hash);
      return { shifts };
    });
    await check('viewpoint recording enforces a meaningful sideways baseline and replays captured views', async () => {
      await click('[data-walk-reset]');
      await setState({ player: { x: 19, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-record]');
      assert.equal((await state()).parallax.samples.length, 0);
      await setState({ player: { x: 24, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-record]');
      assert.equal((await state()).parallax.samples.length, 1);
      await click('[data-walk-record]'); assert.equal((await state()).parallax.samples.length, 1);
      await setState({ player: { x: 25.4, z: 9.5, yaw: 0, pitch: 0 } }); await click('[data-walk-record]');
      assert.equal((await state()).parallax.samples.length, 1);
      await setState({ player: { x: 25.4, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-record]');
      assert.equal((await state()).parallax.samples.length, 2);
      await click('[data-walk-view="0"]'); const a = await capture('recorded-view-a');
      assert.deepEqual((await state()).player, { x: 24, z: 9, yaw: 0, pitch: 0 });
      await click('[data-walk-view="1"]'); const b = await capture('recorded-view-b');
      assert.deepEqual((await state()).player, { x: 25.4, z: 9, yaw: 0, pitch: 0 });
      assert.notEqual(a.hash, b.hash); return { samples: (await state()).parallax.samples };
    });
    await check('ray selection and radio alternatives agree and hints still permit independent solves', async () => {
      await click('[data-walk-view="0"]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const point = await target('A'); assert.equal(point.hit?.id, 'parallax-A');
      await page.mouse.click(point.x, point.y); await page.waitForTimeout(120);
      assert.equal((await state()).parallax.choice, 'A'); assert.equal(await page.locator('[data-walk-choice="A"]').isChecked(), true);
      await click('[data-walk-check]'); assert.equal((await state()).progress.parallax.solved, false);
      await click('[data-walk-hint]'); await click('[data-walk-hint]');
      await page.locator('[data-walk-choice="C"]').check(); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.parallax, { solved: true, assisted: false, hints: 2 });
      assert.equal(await page.evaluate(() => window.__parallaxViewer.debug().parallaxChoice), 'C');
      await capture('parallax-selected'); await capturePage('desktop-ui');
    });
    await check('records, notes, precision preference, and sibling activity work survive reload and scoped reset', async () => {
      await page.locator('[data-walk-note]').fill('C shifts more between fixed-heading views.');
      await page.locator('[data-walk-precision]').check();
      await setState({ progress: { ...(await state()).progress, ring: { solved: true, assisted: false, hints: 1 } }, notes: { ...(await state()).notes, ring: 'Keep the circle note.' } });
      const before = await state(); await page.reload(); await open(); await inspectViewer(); assert.deepEqual(await state(), before);
      await click('[data-walk-reset]'); const after = await state();
      assert.deepEqual(after.parallax, { samples: [], choice: '' });
      assert.deepEqual(after.progress.parallax, { solved: false, assisted: false, hints: 0 });
      assert.equal(after.notes.parallax, before.notes.parallax); assert.equal(after.notes.ring, before.notes.ring);
      assert.deepEqual(after.progress.ring, before.progress.ring); assert.equal(after.precise, true);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('precision works for movement buttons and keyboard with a Shift alternative', async () => {
      await setState({ player: { x: 24, z: 9, yaw: 0, pitch: 0 }, precise: false });
      await click('[data-walk-move="right"]'); assert(Math.abs((await state()).player.x - 24.2) < 0.00001);
      await click('[data-walk-precision]'); await click('[data-walk-move="right"]'); assert(Math.abs((await state()).player.x - 24.25) < 0.00001);
      await keyboard('ArrowRight'); assert.equal((await state()).player.yaw, 1);
      await click('[data-walk-precision]'); await keyboard('Shift+ArrowRight'); assert.equal((await state()).player.yaw, 2);
      await keyboard('ArrowRight'); assert.equal((await state()).player.yaw, 7);
      await setState({ activity: 'occlusion', player: { x: 17.95, z: 9, yaw: 0, pitch: 0 } });
      await keyboard('d'); assert.equal((await state()).activity, 'parallax'); assert((await state()).player.x > 18 && (await state()).player.x < 19);
      assert.equal(await page.locator('[data-walk-stage]').evaluate(node => document.activeElement === node), true);
    });
    await check('mobile navigation, observation controls, and world labels fit and remain accessible', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await click('[data-walk-activity="parallax"]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        const bad = await page.locator('[data-perception-walk] button').evaluateAll(nodes => nodes.filter(node => {
          const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
        }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
        const marker = page.locator('[data-walk-waypoint="parallax"]'); await marker.waitFor(); await marker.focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-walk-activity="parallax"]').evaluate(node => document.activeElement === node), true);
        for (const x of [22.8, 25.4]) {
          await setState({ player: { x, z: 8.5, yaw: 0, pitch: 0 } });
          const objects = await projected();
          assert(objects.every(item => Math.abs(item.center.x) < 0.95 && Math.abs(item.top.y) < 1 && Math.abs(item.bottom.y) < 1 && item.center.z > -1 && item.center.z < 1), 'All three spheres remain in frame at the observation-area edges');
          await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          for (const choice of ['A', 'B', 'C']) assert.equal((await target(choice)).hit?.id, 'parallax-' + choice, 'No sphere is occluded at the observation-area edges');
        }
        await setState({ player: { x: 24, z: 9, yaw: 0, pitch: 0 } });
        await capture('mobile-' + width); await capturePage('mobile-ui-' + width);
      }
      await page.locator('[data-walk-check]').hover();
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
    });
    await check('WebGL-unavailable fallback supports the same comparison and marks reveals as assisted', async () => {
      await page.goto(url + '?no-webgl=1'); await open(true);
      await click('[data-walk-activity="parallax"]'); await click('[data-walk-reset]');
      await click('[data-walk-record]'); await setState({ player: { x: 25.4, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-record]');
      await page.locator('[data-walk-choice="C"]').check(); await click('[data-walk-reveal]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.parallax, { solved: false, assisted: true, hints: 0 });
      assert.equal((await state()).parallax.samples.length, 2);
      assert.equal(await page.locator('[data-perception-walk] canvas').count(), 0);
      await click('[data-walk-view="0"]'); assert.equal((await state()).player.x, 24);
      const name = await page.locator('[data-walk-plan]').getAttribute('aria-label'); assert.match(name, /six challenge spaces/i);
      assert.doesNotMatch(await page.locator('[data-perception-walk]').innerText(), /\\u[0-9a-f]{4}/i);
      await capturePage('fallback-mobile');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    const result = JSON.stringify({ passed: true, memoryOnly, checks, screenshots, errors }, null, 2);
    if (memoryOnly) console.log(result); else fs.writeFileSync(path.join(out, 'qa-results.json'), result);
    console.log('PASS: ' + checks.length + ' parallax browser groups');
  } catch (error) {
    if (!memoryOnly) await capturePage('failure').catch(() => {});
    const result = JSON.stringify({ passed: false, memoryOnly, phase, error: error.stack, checks, screenshots, errors }, null, 2);
    if (memoryOnly) console.log(result); else fs.writeFileSync(path.join(out, 'qa-results.json'), result);
    throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = await serve();
  try { await run('http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
