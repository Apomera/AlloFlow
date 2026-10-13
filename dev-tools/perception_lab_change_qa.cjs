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
const out = path.resolve(root, outArg ? outArg.slice(6) : '.tmp/perception-change-qa');
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
  const debug = () => page.evaluate(() => window.__changeViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(160);
  };
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
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__changeViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async choice => page.evaluate(choice => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const item = window.__changeViewer.debug().changeProjected.find(item => item.choice === choice);
    const x = rect.left + (item.center.x + 1) * rect.width / 2, y = rect.top + (1 - item.center.y) * rect.height / 2;
    return { x, y, hit: window.__changeViewer.pick(x, y), unobstructed: document.elementFromPoint(x, y) === canvas };
  }, choice);
  const pickObject = async choice => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded(); const point = await target(choice);
    assert(point.unobstructed, 'Object ' + choice + ' is not covered by interface controls'); assert.equal(point.hit?.id, 'change-' + choice);
    await page.mouse.click(point.x, point.y); await page.waitForTimeout(160); assert.equal((await state()).change.selected, choice);
  };
  const swap = async () => {
    const before = (await state()).change; assert.equal(before.closed, false);
    await click('[data-walk-change-shutter]'); assert.equal((await state()).change.closed, true);
    assert.equal((await state()).change.variant, before.variant);
    await click('[data-walk-change-shutter]'); assert.equal((await state()).change.closed, false);
    assert.equal((await state()).change.variant, 1 - before.variant); assert.equal((await state()).change.seen, 3);
  };
  const assertFramed = async () => {
    const scene = await debug(); assert.equal(scene.changeObjects.length, 5);
    assert(scene.changeProjected.every(item => [item.center, item.top, item.bottom].every(p => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && p.z > -1 && p.z < 1)), 'All five objects fit in the current viewport');
  };
  const compareGeometry = (before, after, round) => {
    const changed = before.filter((object, i) => JSON.stringify(object) !== JSON.stringify(after[i]));
    assert.deepEqual(changed.map(object => object.choice), ['B', 'D', 'A'].slice(round, round + 1));
    const index = before.findIndex(object => object.choice === ['B', 'D', 'A'][round]);
    if (round === 0) { assert.equal(before[index].z, 1.2); assert.equal(after[index].z, -0.3); }
    if (round === 1) { assert.equal(before[index].height, 1); assert.equal(after[index].height, 1.8); assert.equal(after[index].y, 1.8); }
    if (round === 2) { assert.equal(before[index].rotation, 0); assert.equal(after[index].rotation, 65); }
  };
  try {
    await page.goto(url); await open(false); await inspect();
    await check('ten bays include five framed, colored and directly pickable solids', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 10);
      await click('[data-walk-activity="change"]'); await click('[data-walk-reset]');
      assert.deepEqual((await state()).player, { x: 84, z: 9, yaw: 0, pitch: 0 }); await assertFramed();
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      for (const choice of 'ABCDE') { const point = await target(choice); assert(point.unobstructed); assert.equal(point.hit?.id, 'change-' + choice); }
      const scene = await debug(), png = PNG.sync.read(await page.locator('[data-perception-walk] canvas').screenshot());
      const samples = scene.changeProjected.map(item => {
        const x = Math.round((item.center.x + 1) * png.width / 2), y = Math.round((1 - item.center.y) * png.height / 2);
        return Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3));
      });
      assert(samples.every(rgb => Math.max(...rgb) - Math.min(...rgb) > 25), 'Each expected object center contains its colored surface');
      assert.equal((await state()).change.seen, 1); assert.equal(await page.locator('[data-walk-change-next]').isDisabled(), true);
      await capture('desktop-start'); await full('desktop-ui'); return { objectPixels: samples };
    });
    await check('the manual opaque shutter stays closed without swapping and blocks selection or camera movement', async () => {
      const before = await state(); await click('[data-walk-change-shutter]');
      await page.locator('[data-walk-change-cover]').waitFor(); await page.waitForTimeout(850);
      assert.equal((await state()).change.closed, true); assert.equal((await state()).change.variant, before.change.variant);
      assert.equal((await state()).change.seen, before.change.seen);
      assert.equal(await page.locator('[data-walk-change-choice="A"]').isDisabled(), true);
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded(); await page.locator('[data-walk-stage]').focus();
      for (const key of ['w', 'd', 'ArrowLeft', 'ArrowUp', 'Enter']) await page.keyboard.press(key);
      const cover = await page.locator('[data-walk-change-cover]').boundingBox();
      await page.mouse.move(cover.x + cover.width / 2, cover.y + cover.height / 2); await page.mouse.down();
      await page.mouse.move(cover.x + cover.width / 2 + 80, cover.y + cover.height / 2, { steps: 5 }); await page.mouse.up();
      assert.deepEqual((await state()).player, before.player); assert.equal((await state()).change.selected, before.change.selected);
      const png = PNG.sync.read(await page.locator('[data-walk-change-cover]').screenshot({ path: path.join(out, 'closed-shutter.png') }));
      const offset = (Math.floor(png.height / 4) * png.width + Math.floor(png.width / 4)) * 4;
      assert.deepEqual(Array.from(png.data.subarray(offset, offset + 4)), [82, 100, 102, 255]);
      await click('[data-walk-check]'); assert.deepEqual((await state()).change.completed, []);
      await click('[data-walk-change-shutter]'); assert.equal((await state()).change.variant, 1); assert.equal((await state()).change.seen, 3);
      assert.equal(await page.locator('[data-walk-change-cover]').isVisible(), false);
      await click('[data-walk-reset]'); await click('[data-walk-change-shutter]');
      await click('[data-walk-activity="shadow"]');
      await setState({ player: { x: 77.9, z: 9, yaw: 0, pitch: 0 } });
      await page.locator('[data-walk-stage]').focus(); await page.keyboard.press('d'); await page.waitForTimeout(160);
      const reentered = await state(); assert.equal(reentered.activity, 'change'); assert.equal(reentered.change.closed, true);
      assert(reentered.player.x < 80); assert.equal(reentered.change.variant, 0); assert.equal(reentered.change.seen, 1);
      assert.equal(await page.locator('[data-walk-change-shutter]').isDisabled(), false);
      await click('[data-walk-change-shutter]');
      assert.equal((await state()).change.closed, false); assert.equal((await state()).change.variant, 0); assert.equal((await state()).change.seen, 1);
      assert.deepEqual((await state()).player, reentered.player);
      await click('[data-walk-home]'); assert.deepEqual((await state()).player, { x: 84, z: 9, yaw: 0, pitch: 0 });
    });
    await check('both views and a correct object are required, with partial completion and notes surviving reload', async () => {
      await click('[data-walk-reset]'); await click('[data-walk-change-choice="B"]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).change.completed, []); assert.equal((await state()).change.seen, 1);
      const before = await debug(), image = await capture('depth-before'); await swap();
      compareGeometry(before.changeObjects, (await debug()).changeObjects, 0); assert.notEqual((await capture('depth-after')).hash, image.hash);
      await click('[data-walk-change-choice="A"]'); await click('[data-walk-check]'); assert.deepEqual((await state()).change.completed, []);
      assert.equal(await page.locator('[data-walk-change-next]').isDisabled(), true);
      await pickObject('B'); await click('[data-walk-check]'); assert.deepEqual((await state()).change.completed, [0]);
      assert.equal((await state()).progress.change.solved, false); assert.equal(await page.locator('[data-walk-change-next]').isDisabled(), false);
      await page.locator('[data-walk-note]').fill('The sphere moved in depth while its color stayed the same.');
      const saved = await state(); await page.reload(); await open(false); await inspect(); assert.deepEqual(await state(), saved);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('height and orientation changes are real geometry and three independent answers complete the activity', async () => {
      for (const round of [1, 2]) {
        await click('[data-walk-change-next]'); assert.equal((await state()).change.round, round); assert.equal((await state()).change.seen, 1);
        const before = await debug(), image = await capture('round-' + round + '-before'); await swap();
        compareGeometry(before.changeObjects, (await debug()).changeObjects, round);
        assert.notEqual((await capture('round-' + round + '-after')).hash, image.hash);
        await pickObject(['B', 'D', 'A'][round]); await click('[data-walk-check]');
        assert.equal((await state()).progress.change.solved, round === 2);
      }
      assert.deepEqual((await state()).change.completed, [0, 1, 2]); assert.equal((await state()).progress.change.assisted, false);
      await click('[data-walk-check]'); assert.deepEqual((await state()).change.completed, [0, 1, 2]);
      await click('[data-walk-reveal]'); assert.equal((await debug()).changeRevealed, true);
      assert.equal((await state()).progress.change.solved, true); assert.equal((await state()).progress.change.assisted, false);
      assert.deepEqual((await state()).change.completed, [0, 1, 2]);
      await click('[data-walk-reveal]'); assert.equal((await debug()).changeRevealed, false);
      assert.equal((await state()).progress.change.solved, true); assert.equal((await state()).progress.change.assisted, false);
      await click('[data-walk-change-next]'); assert.equal((await state()).change.round, 0); assert.equal((await state()).progress.change.solved, true);
    });
    await check('the counterpart reveal is assisted, persists on reload, and reset preserves notes and other activities', async () => {
      await click('[data-walk-reset]'); const before = await debug(), image = await capture('before-reveal');
      await click('[data-walk-reveal]'); assert.equal((await debug()).changeRevealed, true);
      assert.deepEqual((await debug()).changeObjects, before.changeObjects); assert.equal((await state()).change.variant, 0);
      assert.notEqual((await capture('revealed-counterpart')).hash, image.hash); assert.equal((await state()).progress.change.assisted, true);
      await swap(); await pickObject('B'); await click('[data-walk-check]'); assert.equal((await state()).progress.change.solved, false);
      assert.deepEqual((await state()).change.completed, []); await click('[data-walk-change-next]'); assert.equal((await state()).change.round, 1);
      const saved = await state(); await page.reload(); await open(false); await inspect(); assert.deepEqual(await state(), saved);
      const unrelated = (await state()).progress.shadow; await click('[data-walk-reset]');
      assert.deepEqual((await state()).change, { round: 0, variant: 0, closed: false, seen: 1, selected: '', completed: [] });
      assert.deepEqual((await state()).progress.change, { solved: false, assisted: false, hints: 0 });
      assert.deepEqual((await state()).progress.shadow, unrelated); assert.match((await state()).notes.change, /sphere moved/);
    });
    await check('first-person inspection changes the canvas and respects the platform, wall and observation limits', async () => {
      const image = await capture('before-step'); await page.locator('[data-walk-stage]').focus(); await page.keyboard.press('d');
      assert.notEqual((await capture('after-step')).hash, image.hash);
      await setState({ player: { x: 84, z: 3, yaw: 0, pitch: 0 } }); await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 12; i++) await page.keyboard.press('w'); assert((await state()).player.z >= 2.6 - 1e-8);
      await setState({ player: { x: 88.7, z: 3, yaw: 0, pitch: 0 } }); await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 36; i++) await page.keyboard.press('w');
      assert((await state()).player.z >= -4.15 - 1e-8 && (await state()).player.z < -3.85);
      assert.equal(await page.locator('[data-walk-change-choice="B"]').isDisabled(), true);
      await setState({ player: { x: 84, z: -6, yaw: 180, pitch: 0 } }); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      assert.equal((await target('C')).hit, null, 'Opaque rear wall prevents through-wall picks');
      await click('[data-walk-home]'); assert.equal(await page.locator('[data-walk-change-choice="B"]').isDisabled(), false);
    });
    await check('390px and 320px layouts frame every scene and support real touch selection without camera drift', async () => {
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 }); await click('[data-walk-reset]');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const bad = await page.locator('[data-perception-walk] button, [data-perception-walk] label').evaluateAll(nodes => nodes.filter(node => {
            const rect = node.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
          }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
          for (const round of [0, 1, 2]) {
            await setState({ change: { round, variant: 0, closed: false, seen: 1, selected: '', completed: [] } });
            await assertFramed(); await swap(); await assertFramed();
          }
          await click('[data-walk-reset]'); await swap(); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          const point = await target('B'), before = await state(), scroll = await page.evaluate(() => scrollY);
          assert(point.unobstructed); assert.equal(point.hit?.id, 'change-B');
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
          await page.waitForTimeout(80); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(160);
          assert.equal((await state()).change.selected, 'B'); assert.deepEqual((await state()).player, before.player); assert.equal(await page.evaluate(() => scrollY), scroll);
          await capture('mobile-' + width); await full('mobile-ui-' + width);
        }
      } finally { await cdp.detach(); }
    });
    await check('accessible controls, complete no-WebGL play and disposal remain available', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
      const fallbackUrl = new URL(url); fallbackUrl.searchParams.set('no-webgl', '1');
      await page.goto(fallbackUrl.href); await open(true); await click('[data-walk-activity="change"]'); await click('[data-walk-reset]');
      for (const round of [0, 1, 2]) {
        if (round) await click('[data-walk-change-next]');
        await swap(); await click('[data-walk-change-choice="' + ['B', 'D', 'A'][round] + '"]'); await click('[data-walk-check]');
      }
      assert.equal((await state()).progress.change.solved, true); assert.deepEqual((await state()).change.completed, [0, 1, 2]);
      assert.equal(await page.locator('[data-perception-walk] canvas').count(), 0); await full('mobile-fallback');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' change-room browser groups');
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
