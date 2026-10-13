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
const out = path.resolve(root, outArg ? outArg.slice(6) : '.tmp/perception-shadow-qa');
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
  const debug = () => page.evaluate(() => window.__shadowViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(160);
  };
  const slider = async value => {
    await page.locator('[data-walk-shadow-angle]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(120);
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
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__shadowViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async () => page.evaluate(() => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    return window.__shadowViewer.debug().shadowProjected.map(item => {
      const x = rect.left + (item.center.x + 1) * rect.width / 2, y = rect.top + (1 - item.center.y) * rect.height / 2;
      return { x, y, hit: window.__shadowViewer.pick(x, y), unobstructed: document.elementFromPoint(x, y) === canvas };
    }).find(item => item.unobstructed && /^shadow-block-\d+$/.test(item.hit?.id));
  });
  const shadowPixels = async () => {
    const points = await page.evaluate(() => {
      const data = window.__shadowViewer.debug(), source = data.camera, canvas = document.querySelector('[data-perception-walk] canvas');
      const camera = new THREE.PerspectiveCamera(source.fov, canvas.clientWidth / canvas.clientHeight, 0.04, 120);
      const direction = StemLab.PerceptionWalkScene.cameraDirection(source);
      camera.position.set(source.x, source.y, source.z); camera.lookAt(source.x + direction.x, source.y + direction.y, source.z + direction.z); camera.updateMatrixWorld(true);
      return data.shadowProfile.map(row => {
        const p = new THREE.Vector3((row.left + row.right) / 2, row.y, -4).project(camera);
        return { x: p.x, y: p.y };
      });
    });
    const png = PNG.sync.read(await page.locator('[data-perception-walk] canvas').screenshot());
    return points.map(point => {
      const x = Math.round((point.x + 1) * png.width / 2), y = Math.round((1 - point.y) * png.height / 2), offset = (y * png.width + x) * 4;
      return Array.from(png.data.subarray(offset, offset + 3));
    });
  };
  try {
    await page.goto(url); await open(false); await inspect();
    await check('ten bays open with a framed solid sculpture and a real wall silhouette', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 10);
      await click('[data-walk-activity="shadow"]'); await click('[data-walk-reset]');
      assert.deepEqual((await state()).player, { x: 72, z: 9, yaw: 0, pitch: 0 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded(); assert(await target());
      const scene = await debug(); assert.equal(scene.shadowObjects.length, 12);
      assert(scene.shadowProjected.every(item => Math.abs(item.center.x) < 0.95 && Math.abs(item.center.y) < 0.95));
      assert(scene.shadowWallProjected.every(point => Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95));
      const samples = await shadowPixels(); assert(samples.every(rgb => rgb.every(value => value < 110)), 'Every shadow level is visibly dark');
      await capture('desktop-start'); await full('desktop-ui'); return { shadowPixels: samples };
    });
    await check('dragging the sculpture rotates its depth and changes the projected edges without moving the camera', async () => {
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const point = await target(), before = await state(), scene = await debug(), image = await capture('before-drag');
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 120, point.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(160);
      assert.equal((await state()).shadowAngle, 60); assert.deepEqual((await state()).player, before.player);
      assert.notDeepEqual((await debug()).shadowProfile, scene.shadowProfile);
      assert.notDeepEqual((await debug()).shadowObjects.map(item => item.z), scene.shadowObjects.map(item => item.z));
      assert.notEqual((await capture('after-drag')).hash, image.hash);
    });
    await check('walk-around inspection respects the turntable and wall while remote adjustment stays disabled', async () => {
      const image = await capture('before-step'); await page.locator('[data-walk-stage]').focus(); await page.keyboard.press('d');
      assert.notEqual((await capture('after-step')).hash, image.hash);
      await setState({ player: { x: 70, z: 3.5, yaw: 0, pitch: 0 } }); await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 8; i++) await page.keyboard.press('w'); assert((await state()).player.z >= 3.1 - 1e-8);
      await setState({ player: { x: 74, z: 3.5, yaw: 0, pitch: 0 } }); await page.locator('[data-walk-stage]').focus();
      for (let i = 0; i < 40; i++) await page.keyboard.press('w');
      assert((await state()).player.z >= -3.7 - 1e-8 && (await state()).player.z < -3.4);
      assert.equal(await page.locator('[data-walk-shadow-angle]').isDisabled(), true);
      await click('[data-walk-home]'); assert.equal(await page.locator('[data-walk-shadow-angle]').isDisabled(), false);
    });
    await check('keyboard alternatives and all four projected levels determine the solution', async () => {
      await slider(355); await click('[data-walk-shadow-left]'); assert.equal((await state()).shadowAngle, 0);
      await click('[data-walk-precision]'); await click('[data-walk-shadow-right]'); assert.equal((await state()).shadowAngle, 359);
      for (const angle of [0, 180, 270]) { await slider(angle); await click('[data-walk-check]'); assert.equal((await state()).progress.shadow.solved, false); }
      await slider(90); await setState({ player: { x: 74, z: 9, yaw: 0, pitch: 0 } }); await click('[data-walk-check]'); assert.equal((await state()).progress.shadow.solved, false);
      await click('[data-walk-home]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.shadow, { solved: true, assisted: false, hints: 0 });
      assert.deepEqual((await debug()).shadowProfile, (await debug()).shadowTargetProfile);
      await capture('matched-shadow');
      await page.locator('[data-walk-note]').fill('Turning the sculpture changes which depths overlap on the wall.');
      const before = await state(); await page.reload(); await open(false); await inspect(); assert.deepEqual(await state(), before);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('light-path and wireframe reveal preserves the learner rotation and marks the attempt assisted', async () => {
      await click('[data-walk-reset]'); await slider(45); const image = await capture('before-reveal');
      await click('[data-walk-reveal]'); assert.equal((await state()).shadowAngle, 45); assert.equal((await debug()).shadowRevealed, true);
      assert.notEqual((await capture('revealed-rays')).hash, image.hash);
      await slider(90); await click('[data-walk-check]'); assert.equal((await state()).progress.shadow.solved, false);
      await click('[data-walk-reveal]'); await click('[data-walk-check]'); assert.equal((await state()).progress.shadow.assisted, true);
      await click('[data-walk-reset]'); assert.equal((await state()).shadowAngle, 0); assert.match((await state()).notes.shadow, /overlap/);
    });
    await check('phone layouts frame both sculpture and target and allow real touch rotation', async () => {
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 }); await click('[data-walk-reset]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const bad = await page.locator('[data-perception-walk] button, [data-perception-walk] label').evaluateAll(nodes => nodes.filter(node => {
            const rect = node.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
          }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
          for (const angle of [0, 45, 90, 180, 270]) {
            await slider(angle); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
            const scene = await debug(); assert(scene.shadowProjected.every(item => Math.abs(item.center.x) < 0.95 && Math.abs(item.center.y) < 0.95));
            assert(scene.shadowWallProjected.every(p => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95));
          }
          await slider(0); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded(); const point = await target(); assert(point);
          const before = await state(), scroll = await page.evaluate(() => scrollY);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] }); await page.waitForTimeout(80);
          for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + i * 10, y: point.y }] }); await page.waitForTimeout(40); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(160);
          assert(Math.abs((await state()).shadowAngle - 30) < 1); assert.deepEqual((await state()).player, before.player); assert.equal(await page.evaluate(() => scrollY), scroll);
          await capture('mobile-' + width); await full('mobile-ui-' + width);
        }
      } finally { await cdp.detach(); }
    });
    await check('accessible controls and the no-WebGL alternative preserve a complete puzzle', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []);
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
      await page.goto(url + '?no-webgl=1'); await open(true); await click('[data-walk-activity="shadow"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-shadow-plan]').waitFor(); await slider(90); await click('[data-walk-check]'); assert.equal((await state()).progress.shadow.solved, true);
      await full('mobile-fallback'); await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ passed: true, checks, screenshots, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' shadow browser groups');
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
