'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-walk-direct');

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
  fs.mkdirSync(out, { recursive: true });
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
    const detail = pixels(await canvas.screenshot({ path: path.join(out, name + '.png') }));
    assert(detail.width >= 240 && detail.height >= 220);
    assert(detail.colors > 30 && detail.colored > 200, 'Canvas contains varied rendered geometry');
    screenshots.push({ name, ...detail }); return detail;
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const findBlock = async () => page.evaluate(() => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const debug = window.__walkDirectViewer.debug(), item = debug.scaleProjected.find(item => item.id === 'scale-block');
    const centerX = rect.left + (item.center.x + 1) * rect.width / 2, centerY = rect.top + (1 - item.center.y) * rect.height / 2;
    let best = null;
    for (let dy = -40; dy <= 40; dy += 4) for (let dx = -32; dx <= 32; dx += 4) {
      const x = centerX + dx, y = centerY + dy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || document.elementFromPoint(x, y) !== canvas) continue;
      const hit = window.__walkDirectViewer.pick(x, y);
      if (hit && hit.id === 'scale-block') {
        const coordinate = window.__walkDirectViewer.blockCoordinate(x, y), error = coordinate == null ? Infinity : Math.abs(coordinate - debug.blockZ);
        if (coordinate != null && (!best || error < best.error)) best = { x, y, coordinate, error };
      }
    }
    return best;
  });
  const dragTarget = async (from, desiredDelta) => page.evaluate(({ from, desiredDelta }) => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    let best = null;
    for (let y = Math.max(5, rect.top + 10); y < Math.min(innerHeight - 5, rect.bottom - 35); y += 6) {
      for (let x = Math.max(5, rect.left + 10); x < Math.min(innerWidth - 5, rect.right - 10); x += 6) {
        const coordinate = window.__walkDirectViewer.blockCoordinate(x, y);
        if (coordinate == null || Math.hypot(x - from.x, y - from.y) < 8) continue;
        const error = Math.abs(coordinate - from.coordinate - desiredDelta);
        if (!best || error < best.error) best = { x, y, error, coordinate };
      }
    }
    return best;
  }, { from, desiredDelta });
  const dragTo = async (from, target) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.waitForTimeout(50); await page.mouse.move(target.x, target.y); await page.waitForTimeout(150); await page.mouse.up();
    await page.waitForTimeout(100);
  };
  try {
    await page.goto(url); await open();
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__walkDirectViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
    await check('direct block drag changes real geometry without jumping or rotating the camera', async () => {
      await setState({ activity: 'scale', player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 });
      const before = await state(), image = await capture('block-before');
      const from = await findBlock(); assert(from && from.coordinate != null, 'Reachable block has a valid world-coordinate ray');
      await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.waitForTimeout(80);
      assert.equal((await state()).blockZ, 3, 'Selection causes no initial position jump'); await page.mouse.up();
      const selected = await capture('block-selected'); assert.notEqual(selected.hash, image.hash, 'Selection outline visibly changes the canvas');
      const target = await dragTarget(from, 1.7); assert(target && target.error < 0.1);
      await dragTo(from, target);
      const after = await state(); assert(Math.abs(after.blockZ - 4.7) < 0.13);
      assert.deepEqual(after.player, before.player);
      assert.deepEqual(after.progress, before.progress); assert.deepEqual(after.notes, before.notes);
      const changed = await capture('block-dragged'); assert.notEqual(changed.hash, selected.hash);
      return { from, target, before: before.blockZ, after: after.blockZ };
    });
    await check('direct dragging respects track bounds and selection cannot reach distant objects', async () => {
      await setState({ player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 1 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const from = await findBlock(); assert(from);
      const target = await dragTarget(from, -5); assert(target);
      await dragTo(from, target); assert((await state()).blockZ >= -1 && (await state()).blockZ < -0.9);
      await setState({ player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 });
      const fromUpper = await findBlock(), targetUpper = await dragTarget(fromUpper, 6); assert(fromUpper && targetUpper);
      await dragTo(fromUpper, targetUpper); assert((await state()).blockZ <= 6 && (await state()).blockZ > 5.9);
      await setState({ player: { x: 0, z: 13, yaw: 0, pitch: 0 }, blockZ: -1 });
      assert.equal(await page.locator('[data-walk-select-block]').isDisabled(), true);
      assert.equal(await findBlock(), null, 'Raycast rejects targets beyond seven units');
      assert.equal(await page.locator('[data-walk-block-z]').isDisabled(), true);
      const before = await state(); await click('[data-walk-interact]'); assert.equal((await state()).blockZ, before.blockZ);
      return { trackMinimum: -1, range: 7 };
    });
    await check('ordinary drags still look around and face-exhibit restores orientation in place', async () => {
      await setState({ activity: 'ring', player: { x: -12, z: 9, yaw: 0, pitch: 0 } });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const rect = await page.locator('[data-walk-stage]').boundingBox(), before = await state();
      await dragTo({ x: rect.x + rect.width * 0.15, y: rect.y + rect.height * 0.2 }, { x: rect.x + rect.width * 0.15 + 130, y: rect.y + rect.height * 0.2 + 50 });
      const changed = await state(); assert.notEqual(changed.player.yaw, before.player.yaw); assert.notEqual(changed.player.pitch, before.player.pitch);
      await setState({ player: { ...changed.player, yaw: 175, pitch: 25 } });
      assert.match(await page.locator('[data-walk-evidence]').innerText(), /Out of view/);
      await click('[data-walk-face]'); const faced = await state();
      assert.equal(faced.player.x, changed.player.x); assert.equal(faced.player.z, changed.player.z);
      assert.equal(faced.player.yaw, 0); assert.equal(faced.player.pitch, 0);
      assert.doesNotMatch(await page.locator('[data-walk-evidence]').innerText(), /Out of view/);
      return { before: before.player, changed: changed.player, faced: faced.player };
    });
    await check('world waypoints are keyboard accessible and transfer focus to a stable destination', async () => {
      await setState({ activity: 'scale', player: { x: 0, z: 12, yaw: -45, pitch: 0 } });
      const waypoint = page.locator('[data-walk-waypoint="ring"]'); await waypoint.waitFor();
      await waypoint.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(160);
      assert.equal((await state()).activity, 'ring');
      assert.equal(await page.locator('[data-walk-activity="ring"]').evaluate(node => document.activeElement === node), true);
      assert.deepEqual((await state()).player, await page.evaluate(() => StemLab.PerceptionWalk.spawn('ring')));
      await capture('waypoints-desktop'); await page.screenshot({ path: path.join(out, 'desktop-ui.png'), fullPage: true });
    });
    await check('two progressive hints persist independently and do not count as reveals', async () => {
      await click('[data-walk-reset]'); await click('[data-walk-hint]'); await click('[data-walk-hint]');
      assert.equal((await state()).progress.ring.hints, 2); assert.equal((await state()).progress.ring.assisted, false);
      assert.equal(await page.locator('[data-walk-hint]').isDisabled(), true);
      await setState({ player: { x: -12, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-check]');
      assert.equal((await state()).progress.ring.solved, true);
      await click('[data-walk-activity="scale"]'); await click('[data-walk-reset]'); await click('[data-walk-hint]');
      await page.locator('[data-walk-note]').fill('Move the block, keep its physical height.');
      await click('[data-walk-reset]'); assert.equal((await state()).progress.scale.hints, 0);
      assert.equal((await state()).notes.scale, 'Move the block, keep its physical height.');
      const before = await state(); await page.reload(); await open(); assert.deepEqual(await state(), before);
      await click('[data-walk-activity="ring"]'); assert.equal((await state()).progress.ring.hints, 2);
    });
    await check('mobile waypoints remain inside the scene and do not obstruct navigation', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await setState({ activity: 'ring', player: { x: -12, z: 9, yaw: 0, pitch: 0 } });
        await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
        const markers = await page.locator('[data-walk-waypoint]').evaluateAll(nodes => nodes.map(node => {
          const a = node.getBoundingClientRect(), b = node.closest('figure').getBoundingClientRect();
          return { id: node.dataset.walkWaypoint, width: a.width, height: a.height, inside: a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom };
        }));
        assert(markers.length > 0); assert(markers.every(item => item.inside && item.width >= 40 && item.height >= 40));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        const bad = await page.locator('[data-perception-walk] button').evaluateAll(nodes => nodes.filter(node => {
          const a = node.getBoundingClientRect(); return a.width && (a.left < -1 || a.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
        }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
        await page.locator('[data-walk-waypoint="ring"]').tap();
        assert.equal(await page.locator('[data-walk-activity="ring"]').evaluate(node => document.activeElement === node), true);
        await capture('mobile-' + width); await page.screenshot({ path: path.join(out, 'mobile-ui-' + width + '.png'), fullPage: true });
      }
    });
    await check('new controls retain accessible names and pass axe checks', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      assert.doesNotMatch(await page.locator('[data-perception-walk]').innerText(), /\\u[0-9a-f]{4}/i);
    });
    await check('vertical touch gestures scroll instead of moving a selected 3D block', async () => {
      await setState({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 1 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      // Reloading above replaced the viewer; capture its factory again for raycast inspection.
      await click('[data-walk-diagram-toggle]');
      await page.evaluate(() => {
        const create = StemLab.PerceptionWalkScene.createViewer;
        StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__walkDirectViewer = viewer; return viewer; };
      });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const from = await findBlock(); assert(from, 'Teal block remains a touch target on mobile');
      const before = await state(), scroll = await page.evaluate(() => scrollY), cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
      for (let i = 1; i <= 6; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y - i * 16, id: 1 }] });
        await page.waitForTimeout(25);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(160); await cdp.detach();
      assert((await page.evaluate(() => scrollY)) > scroll + 25, 'Vertical gesture scrolls the surrounding page');
      assert.equal((await state()).blockZ, before.blockZ); assert.deepEqual((await state()).player, before.player);
    });
    await check('context loss cancels held movement and recovered 3D preserves progress', async () => {
      const control = page.locator('[data-walk-move="back"]'); await control.scrollIntoViewIfNeeded();
      const rect = await control.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
      await page.waitForTimeout(150);
      const lost = await page.locator('[data-perception-walk] canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'), extension = gl.getExtension('WEBGL_lose_context');
        if (!extension) return false; extension.loseContext(); return true;
      });
      assert(lost, 'Browser supports the real WebGL context-loss test');
      await page.locator('[data-walk-plan]').waitFor();
      const stopped = await state(); await page.waitForTimeout(350); assert.deepEqual(await state(), stopped);
      assert.equal(await page.evaluate(() => window.__walkDirectViewer.blockCoordinate(100, 100)), null);
      await page.mouse.up(); await click('[data-walk-retry]'); await page.locator('[data-perception-walk] canvas').waitFor();
      assert.deepEqual(await state(), stopped); await capture('context-recovered');
    });
    await check('plan view retains face and hint controls and releases the WebGL renderer', async () => {
      const before = await state(); await click('[data-walk-diagram-toggle]'); await page.locator('[data-walk-plan]').waitFor();
      assert.deepEqual(await state(), before);
      await setState({ player: { ...before.player, yaw: 170 } }); await click('[data-walk-face]');
      assert.equal((await state()).player.x, before.player.x); assert.equal((await state()).player.z, before.player.z);
      await click('[data-walk-activity="occlusion"]'); await click('[data-walk-hint]');
      assert.equal((await state()).progress.occlusion.hints, 1);
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' direct-interaction browser groups');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: false, phase, error: error.stack, checks, screenshots, errors }, null, 2)); throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = await serve();
  try { await run('http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
