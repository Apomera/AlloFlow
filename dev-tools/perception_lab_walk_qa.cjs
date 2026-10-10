'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-walk');

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
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce', hasTouch: true });
  const checks = [], screenshots = [], errors = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const range = async (selector, value) => {
    await page.locator(selector).evaluate((node, next) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(next));
      node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const stats = pixels(await canvas.screenshot({ path: path.join(out, name + '.png') }));
    assert(stats.width >= 240 && stats.height >= 220, 'Canvas remains a usable size');
    assert(stats.colors > 30 && stats.colored > 200, 'Canvas contains rendered geometry'); screenshots.push({ name, ...stats }); return stats;
  };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, ...patch } })), patch);
    await page.waitForTimeout(120);
  };
  const fit = async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow');
    const bad = await page.locator('[data-perception-walk] button').evaluateAll(nodes => nodes.filter(node => {
      const rect = node.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
    }).map(node => node.outerHTML));
    assert.deepEqual(bad, [], 'Visible buttons and their labels fit');
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await page.waitForTimeout(150);
  };
  const debug = () => page.evaluate(() => window.__walkViewer.debug());
  const findPick = async wanted => page.evaluate(id => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const detail = window.__walkViewer.debug();
    const item = detail.scaleProjected.concat(detail.tokenProjected).find(item => item.id === id);
    if (!item || item.center.z < -1 || item.center.z > 1) return null;
    const centerX = rect.left + (item.center.x + 1) * rect.width / 2;
    const centerY = rect.top + (1 - item.center.y) * rect.height / 2;
    for (let y = Math.max(rect.top + 8, centerY - 80); y < Math.min(rect.bottom - 8, centerY + 80); y += 4) for (let x = Math.max(rect.left + 8, centerX - 80); x < Math.min(rect.right - 8, centerX + 80); x += 4) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || document.elementFromPoint(x, y) !== canvas) continue;
      const hit = window.__walkViewer.pick(x, y);
      if (hit && hit.id === id) return { x, y, distance: hit.distance };
    }
    return null;
  }, wanted);
  try {
    await page.goto(url); await open();
    // Retain the production viewer to inspect real projection and raycast results.
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__walkViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
    await check('first-person scene uses real WebGL in all three activities', async () => {
      const gl = await page.locator('[data-perception-walk] canvas').evaluate(canvas => {
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return context && { version: context.getParameter(context.VERSION), lost: context.isContextLost() };
      });
      assert(gl && !gl.lost);
      for (const id of ['ring', 'scale', 'occlusion']) { await click('[data-walk-activity="' + id + '"]'); await capture('desktop-' + id); }
      await page.screenshot({ path: path.join(out, 'desktop-ui.png'), fullPage: true }); return gl;
    });
    await check('keyboard, step controls, and drag-look move the actual camera', async () => {
      await click('[data-walk-activity="ring"]');
      const before = (await state()).perceptionWalk.player, image = await capture('ring-before-movement');
      await page.locator('[data-walk-stage]').focus(); await page.keyboard.press('w'); await page.waitForTimeout(120);
      const walked = (await state()).perceptionWalk.player; assert(walked.z < before.z);
      await click('[data-walk-move="right"]'); assert((await state()).perceptionWalk.player.x > walked.x);
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const rect = await page.locator('[data-walk-stage]').boundingBox();
      await page.mouse.move(rect.x + rect.width * 0.4, rect.y + rect.height * 0.4); await page.mouse.down();
      await page.mouse.move(rect.x + rect.width * 0.4 + 70, rect.y + rect.height * 0.4 + 20, { steps: 4 }); await page.mouse.up();
      const rotated = (await state()).perceptionWalk.player;
      assert.notEqual(rotated.yaw, walked.yaw); assert.notEqual(rotated.pitch, walked.pitch);
      assert.notEqual((await capture('ring-after-movement')).hash, image.hash);
      await page.locator('[data-walk-note]').fill('Walking changes the view.');
      const fixed = (await state()).perceptionWalk.player; await page.keyboard.type('wasd');
      assert.deepEqual((await state()).perceptionWalk.player, fixed); return { before, walked, rotated };
    });
    await check('continuous movement stops on blur and bay crossings preserve viewpoint and focus', async () => {
      await setState({ activity: 'ring', player: { x: -6.05, z: 9, yaw: 0, pitch: 0 } });
      await page.locator('[data-walk-stage]').focus();
      const scroll = await page.evaluate(() => scrollY); await page.keyboard.press('d'); await page.waitForTimeout(150);
      const crossed = (await state()).perceptionWalk;
      assert.equal(crossed.activity, 'scale'); assert(crossed.player.x > -6 && crossed.player.x < -5);
      assert.equal(crossed.player.z, 9);
      assert.equal(await page.locator('[data-walk-stage]').evaluate(node => document.activeElement === node), true);
      assert.equal(await page.evaluate(() => scrollY), scroll);
      await click('[data-walk-move="back"]');
      const beforeHold = (await state()).perceptionWalk.player;
      const button = await page.locator('[data-walk-move="forward"]').boundingBox();
      await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2); await page.mouse.down();
      await page.waitForTimeout(300);
      const held = (await state()).perceptionWalk.player;
      assert(held.z < beforeHold.z - 0.3, 'Switching from another focused movement button does not cancel the new hold');
      await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(30);
      const stopped = (await state()).perceptionWalk.player; await page.waitForTimeout(300);
      assert.deepEqual((await state()).perceptionWalk.player, stopped); await page.mouse.up();
      return { crossed: crossed.player, held, stopped };
    });
    await check('alignment and scale solves are based on actual geometry', async () => {
      await click('[data-walk-activity="ring"]');
      await setState({ player: { x: -12, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-check]');
      assert.equal((await state()).perceptionWalk.progress.ring.solved, true);
      const aligned = await capture('ring-aligned'), ring = await debug();
      assert(new Set(ring.ringDepths).size > 1, 'Ring fragments occupy distinct depths');
      await click('[data-walk-activity="scale"]');
      await setState({ player: { x: 0, z: 5, yaw: 0, pitch: 0 } }); await click('[data-walk-select-block]');
      await range('[data-walk-block-z]', 3); await click('[data-walk-home]'); await click('[data-walk-check]');
      assert.equal((await state()).perceptionWalk.progress.scale.solved, true);
      const scale = await debug(), sizes = scale.scaleProjected.map(item => Math.abs(item.top.y - item.bottom.y));
      assert(Math.abs(sizes[0] - sizes[1]) < 0.01, 'Unequal objects have equal projected heights');
      await capture('scale-matched'); return { aligned, projectedHeights: sizes };
    });
    await check('raycast selects the movable block and opaque walls block token picking', async () => {
      await click('[data-walk-activity="scale"]'); await setState({ player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const block = await findPick('scale-block'); assert(block, 'Movable block is reachable by real raycast'); await page.mouse.click(block.x, block.y);
      await click('[data-walk-activity="occlusion"]'); await setState({ player: { x: 12, z: 6, yaw: 0, pitch: 0 }, collected: [] });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      for (const id of ['token-0', 'token-1', 'token-2']) assert.equal(await findPick(id), null, 'Wall blocks ' + id);
      await click('[data-walk-interact]'); assert.deepEqual((await state()).perceptionWalk.collected, []);
      await capture('occlusion-wall'); return { block };
    });
    await check('walking around the wall exposes tokens for direct collection', async () => {
      await click('[data-walk-activity="occlusion"]'); await setState({ collected: [] });
      await page.locator('[data-walk-stage]').focus();
      for (let step = 0; step < 40; step++) await page.keyboard.press('w');
      const blocked = (await state()).perceptionWalk.player;
      assert(blocked.z >= 2.55 && blocked.z < 3, 'Walking stops at the physical screen');
      for (let step = 0; step < 24 && (await state()).perceptionWalk.player.x > 9.2; step++) await page.keyboard.press('a');
      for (let step = 0; step < 24 && (await state()).perceptionWalk.player.z > 0.6; step++) await page.keyboard.press('w');
      for (let step = 0; step < 24 && (await state()).perceptionWalk.player.x < 12; step++) await page.keyboard.press('d');
      const around = (await state()).perceptionWalk.player;
      assert(around.z < 1 && around.x >= 12, 'An actual walked route reaches the other side');
      const records = [];
      for (let index = 0; index < 3; index++) {
        await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
        const point = await findPick('token-' + index); assert(point, 'Token ' + index + ' is visible beyond the wall');
        await page.mouse.click(point.x, point.y); await page.waitForTimeout(120);
        assert((await state()).perceptionWalk.collected.includes(index)); records.push(point);
      }
      await click('[data-walk-check]'); assert.equal((await state()).perceptionWalk.progress.occlusion.solved, true);
      await capture('occlusion-collected'); return records;
    });
    await check('reveals stay assisted and navigation preserves notebook and earned work', async () => {
      await click('[data-walk-activity="scale"]'); await click('[data-walk-reset]'); await click('[data-walk-reveal]');
      await setState({ player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 }); await click('[data-walk-check]');
      assert.equal((await state()).perceptionWalk.progress.scale.assisted, true); assert.equal((await state()).perceptionWalk.progress.scale.solved, false);
      await page.locator('[data-walk-note]').fill('Same visual size, different physical size.');
      const before = (await state()).perceptionWalk; await click('[data-walk-close]');
      assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.equal(await page.locator('[data-perception-gallery]').count(), 1);
      await click('[data-gallery-open-walk]'); assert.deepEqual((await state()).perceptionWalk, before);
      await page.reload(); await open(); assert.deepEqual((await state()).perceptionWalk, before);
      assert.equal((await state()).otherTool.preserved, 37);
    });
    await check('mobile controls fit and touch activation moves the scene without horizontal overflow', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 }); await fit();
        const before = (await state()).perceptionWalk.player;
        await page.locator('[data-walk-move="right"]').tap(); await page.waitForTimeout(100);
        assert.notDeepEqual((await state()).perceptionWalk.player, before);
        await capture('mobile-' + width); await page.screenshot({ path: path.join(out, 'mobile-ui-' + width + '.png'), fullPage: true });
      }
    });
    await check('first-person workspace passes automated accessibility checks', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []); return violations;
    });
    await check('fallback preserves interactive state and all canvases are released on close', async () => {
      await click('[data-walk-diagram-toggle]'); assert.equal(await page.locator('[data-walk-plan]').count(), 1);
      const before = (await state()).perceptionWalk.player; await click('[data-walk-move="left"]');
      assert.notDeepEqual((await state()).perceptionWalk.player, before);
      await page.screenshot({ path: path.join(out, 'mobile-diagram.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
      await page.goto(url + '?no-webgl=1'); await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
      await page.locator('[data-walk-plan]').waitFor(); await click('[data-walk-activity="ring"]'); await click('[data-walk-move="left"]');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, [], 'No browser runtime errors');
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' first-person browser groups');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: false, phase, error: error.stack, checks, screenshots, errors }, null, 2));
    throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = await serve();
  try { await run('http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
