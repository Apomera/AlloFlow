'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-new-puzzles');
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
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const setState = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...patch }) })), patch);
    await page.waitForTimeout(160);
  };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(memoryOnly ? {} : { path: path.join(out, name + '.png') }));
    assert(detail.width >= 240 && detail.height >= 220);
    assert(detail.colors > 30 && detail.colored > 150, 'Canvas contains varied rendered geometry');
    screenshots.push({ name, ...detail }); return detail;
  };
  const capturePage = async name => page.screenshot(memoryOnly ? { fullPage: true } : { path: path.join(out, name + '.png'), fullPage: true });
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-plan]' : '[data-perception-walk] canvas').waitFor();
  };
  const inspectViewer = async () => {
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__newPuzzleViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const projected = field => page.evaluate(field => window.__newPuzzleViewer.debug()[field], field);
  const target = async (field, choice) => page.evaluate(({ field, choice }) => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const data = window.__newPuzzleViewer.debug()[field], item = Array.isArray(data) ? data.find(item => item.choice === choice || item.index === choice) : { center: data };
    const projected = item.pickPoint || item.center;
    const x = rect.left + (projected.x + 1) * rect.width / 2, y = rect.top + (1 - projected.y) * rect.height / 2;
    return { x, y, unobstructed: document.elementFromPoint(x, y) === canvas, hit: window.__newPuzzleViewer.pick(x, y) };
  }, { field, choice });
  const imageTileColors = async () => {
    const png = PNG.sync.read(await page.locator('[data-perception-walk] canvas').screenshot());
    const objects = await projected('contextProjected');
    return objects.map(item => {
      const x = Math.round((item.center.x + 1) * png.width / 2), y = Math.round((1 - item.center.y) * png.height / 2);
      const offset = 4 * (y * png.width + x);
      return { choice: item.choice, rgb: Array.from(png.data.subarray(offset, offset + 3)) };
    });
  };
  const setAngle = async (index, angle) => {
    await page.locator('[data-walk-corner="' + index + '"]').check();
    await page.locator('[data-walk-corner-angle]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, angle);
    await page.waitForTimeout(100);
  };
  try {
    await page.goto(url); await open(); await inspectViewer();
    await check('six physical bays render and the new corner and tile objects are ray-pickable', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 6);
      await click('[data-walk-activity="contour"]');
      assert.deepEqual((await state()).player, { x: 36, z: 6.5, yaw: 0, pitch: 0 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      for (const index of [0, 1, 2, 3]) {
        const point = await target('contourProjected', index); assert(point.unobstructed); assert.equal(point.hit?.id, 'contour-' + index);
      }
      await capture('contour-start');
      await click('[data-walk-activity="context"]');
      assert.deepEqual((await state()).player, { x: 48, z: 7, yaw: 0, pitch: 0 });
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      for (const choice of ['A', 'B', 'C', 'D']) {
        const point = await target('contextProjected', choice); assert(point.unobstructed); assert.equal(point.hit?.id, 'context-' + choice);
      }
      await capture('context-start');
    });
    await check('dragging a physical corner rotates it while the camera remains still', async () => {
      await click('[data-walk-activity="contour"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const before = await state(), image = await capture('contour-before-drag'), point = await target('contourProjected', 0);
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 70, point.y, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(120); const after = await state();
      assert.equal(after.contour.selected, 0); assert.equal(after.contour.angles[0], (before.contour.angles[0] + 35) % 360);
      assert.deepEqual(after.player, before.player); assert.notEqual((await capture('contour-after-drag')).hash, image.hash);
      assert.equal(await page.locator('[data-walk-corner="0"]').isChecked(), true);
      return { angleBefore: before.contour.angles[0], angleAfter: after.contour.angles[0] };
    });
    await check('opaque display backs prevent ray interactions and walking respects their boundaries', async () => {
      for (const activity of ['contour', 'context']) {
        const x = activity === 'contour' ? 36 : 48;
        await click('[data-walk-activity="' + activity + '"]');
        await setState({ player: { x, z: -2, yaw: 180, pitch: 0 } });
        await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
        const field = activity === 'contour' ? 'contourProjected' : 'contextProjected';
        for (const choice of activity === 'contour' ? [0, 1, 2, 3] : ['A', 'B', 'C', 'D']) assert.equal((await target(field, choice)).hit, null);
        await setState({ player: { x, z: 1, yaw: 0, pitch: 0 } });
        await page.locator('[data-walk-stage]').focus();
        for (let step = 0; step < 8; step++) await page.keyboard.press('w');
        assert((await state()).player.z >= (activity === 'contour' ? 0.35 : 0.4));
      }
      await click('[data-walk-activity="contour"]');
    });
    await check('corner alternatives wrap angles, solve with hints, and keep guesses insufficient', async () => {
      await setAngle(0, 350); await click('[data-walk-corner-left]'); assert.equal((await state()).contour.angles[0], 35);
      await click('[data-walk-corner-right]'); assert.equal((await state()).contour.angles[0], 350);
      await page.locator('[data-walk-contour-choice="square"]').check(); await click('[data-walk-check]');
      assert.equal((await state()).progress.contour.solved, false);
      await click('[data-walk-hint]'); await click('[data-walk-hint]');
      for (const [index, angle] of [315, 225, 135, 45].entries()) await setAngle(index, angle);
      await page.locator('[data-walk-contour-choice="circle"]').check(); await click('[data-walk-check]'); assert.equal((await state()).progress.contour.solved, false);
      await page.locator('[data-walk-contour-choice="square"]').check(); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.contour, { solved: true, assisted: false, hints: 2 });
      assert.deepEqual(await page.evaluate(() => window.__newPuzzleViewer.debug().contourAngles), [315, 225, 135, 45]);
      await capture('contour-solved'); await capturePage('contour-desktop-ui');
    });
    await check('tile selection toggles through both scene rays and checkboxes without accepting a third choice', async () => {
      await click('[data-walk-activity="context"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const a = await target('contextProjected', 'A'); await page.mouse.click(a.x, a.y); await page.waitForTimeout(120);
      assert.deepEqual((await state()).context.selected, ['A']); assert.equal(await page.locator('[data-walk-context-tile="A"]').isChecked(), true);
      await page.locator('[data-walk-context-tile="B"]').check();
      await page.locator('[data-walk-context-tile="C"]').click(); assert.deepEqual((await state()).context.selected, ['A', 'B']);
      assert.match(await page.locator('[data-walk-status]').innerText(), /two|2|remove|deselect/i);
      await click('[data-walk-check]'); assert.equal((await state()).progress.context.solved, false);
      await page.locator('[data-walk-context-tile="B"]').uncheck(); await page.locator('[data-walk-context-tile="C"]').check();
      assert.deepEqual((await state()).context.selected, ['A', 'C']);
      await click('[data-walk-hint]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.context, { solved: true, assisted: false, hints: 1 });
    });
    await check('the physical surround switch changes the scene while preserving every central tile pixel color', async () => {
      await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
      const before = await imageTileColors(), original = await capture('context-colored-surrounds');
      assert.deepEqual(before[0].rgb, before[2].rgb); assert.notDeepEqual(before[0].rgb, before[1].rgb); assert.notDeepEqual(before[0].rgb, before[3].rgb);
      const point = await target('contextSwitchProjected'); assert(point.unobstructed); assert.equal(point.hit?.id, 'context-switch');
      await page.mouse.click(point.x, point.y); await page.waitForTimeout(120);
      assert.equal((await state()).context.neutral, true); assert.equal(await page.locator('[data-walk-context-neutral]').isChecked(), true);
      assert.deepEqual(await imageTileColors(), before); assert.notEqual((await capture('context-neutral-surrounds')).hash, original.hash);
      assert.equal((await state()).progress.context.assisted, false);
      await page.locator('[data-walk-context-neutral]').uncheck(); assert.deepEqual(await imageTileColors(), before);
      return { tileColors: before };
    });
    await check('new puzzle records and notes survive reload and resets remain scoped', async () => {
      await page.locator('[data-walk-note]').fill('A and C are equal even when their surrounds differ.');
      await click('[data-walk-activity="contour"]'); await page.locator('[data-walk-note]').fill('Aligned corners suggest a square without a drawn edge.');
      const before = await state(); await page.reload(); await open(); await inspectViewer(); assert.deepEqual(await state(), before);
      await click('[data-walk-reset]'); const after = await state();
      assert.deepEqual(after.contour, { angles: [90, 0, 270, 180], selected: 0, choice: '' });
      assert.deepEqual(after.progress.contour, { solved: false, assisted: false, hints: 0 });
      assert.deepEqual(after.context, before.context); assert.deepEqual(after.progress.context, before.progress.context);
      assert.deepEqual(after.notes, before.notes); assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
      await click('[data-walk-activity="context"]'); await click('[data-walk-reveal]'); await click('[data-walk-check]');
      assert.equal((await state()).progress.context.assisted, true);
      await click('[data-walk-reset]'); assert.deepEqual((await state()).context, { selected: [], neutral: false });
      assert.equal((await state()).notes.context, before.notes.context);
    });
    await check('mobile scenes, six-station navigation, new controls, and waypoints fit at 390 and 320 pixels', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const activity of ['contour', 'context']) {
          await click('[data-walk-activity="' + activity + '"]'); await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const bad = await page.locator('[data-perception-walk] button, [data-perception-walk] label').evaluateAll(nodes => nodes.filter(node => {
            const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
          }).map(node => node.outerHTML)); assert.deepEqual(bad, []);
          const objects = await projected(activity === 'contour' ? 'contourProjected' : 'contextProjected');
          assert(objects.every(item => Math.abs(item.center.x) < 0.95 && Math.abs(item.center.y) < 0.95 && item.center.z > -1 && item.center.z < 1), 'Every target remains framed');
          for (const item of objects) {
            const point = await target(activity === 'contour' ? 'contourProjected' : 'contextProjected', activity === 'contour' ? item.index : item.choice);
            assert(point.unobstructed && point.hit?.id === item.id, 'Mobile targets stay clickable beneath scene overlays');
          }
          if (activity === 'context') {
            const framing = await page.evaluate(() => {
              const debug = window.__newPuzzleViewer.debug(), source = debug.camera;
              const rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
              const camera = new THREE.PerspectiveCamera(source.fov, rect.width / rect.height, 0.04, 100);
              const direction = StemLab.PerceptionWalkScene.cameraDirection(source);
              camera.position.set(source.x, source.y, source.z);
              camera.lookAt(new THREE.Vector3(source.x + direction.x, source.y + direction.y, source.z + direction.z));
              camera.updateMatrixWorld(true);
              const points = [], aboveFloor = debug.contextObjects.every(object => object.y - object.height / 2 >= 0);
              for (const object of debug.contextObjects) for (const x of [-1, 1]) for (const y of [-1, 1]) points.push(new THREE.Vector3(object.x + x * object.width / 2, object.y + y * object.height / 2, object.z + 0.06));
              const switchCenter = new THREE.Vector3(debug.contextSwitchProjected.x, debug.contextSwitchProjected.y, debug.contextSwitchProjected.z).unproject(camera);
              for (const x of [-1, 1]) for (const y of [-1, 1]) points.push(new THREE.Vector3(switchCenter.x + x * 0.36, switchCenter.y + y * 0.21, switchCenter.z + 0.075));
              for (const x of [-1, 1]) points.push(new THREE.Vector3(switchCenter.x + x * 0.225, 0, switchCenter.z));
              return { aboveFloor, projected: points.map(point => { point.project(camera); return { x: point.x, y: point.y, z: point.z }; }) };
            });
            assert(framing.aboveFloor, 'All context surrounds are completely above the floor');
            assert(framing.projected.every(point => Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1), 'Complete context surrounds and switch remain framed');
            const point = await target('contextSwitchProjected');
            assert(point.unobstructed && point.hit?.id === 'context-switch', 'The mobile switch remains clickable');
          }
          const marker = page.locator('[data-walk-waypoint="' + activity + '"]'); await marker.waitFor(); await marker.focus(); await page.keyboard.press('Enter');
          assert.equal(await page.locator('[data-walk-activity="' + activity + '"]').evaluate(node => document.activeElement === node), true);
          await capture(activity + '-mobile-' + width); await capturePage(activity + '-mobile-ui-' + width);
        }
      }
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      for (const activity of ['contour', 'context']) {
        await click('[data-walk-activity="' + activity + '"]'); await page.locator('[data-walk-check]').hover();
        const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
        })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
        assert.deepEqual(violations, []);
      }
    });
    await check('WebGL-unavailable plan supports both puzzle solutions and reveal-assisted progress', async () => {
      await page.goto(url + '?no-webgl=1'); await open(true);
      await click('[data-walk-activity="contour"]'); await click('[data-walk-reset]');
      for (const [index, angle] of [315, 225, 135, 45].entries()) await setAngle(index, angle);
      await page.locator('[data-walk-contour-choice="square"]').check(); await click('[data-walk-reveal]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.contour, { solved: false, assisted: true, hints: 0 });
      await click('[data-walk-activity="context"]'); await click('[data-walk-reset]');
      await page.locator('[data-walk-context-tile="A"]').check(); await page.locator('[data-walk-context-tile="C"]').check();
      await page.locator('[data-walk-context-neutral]').check(); await click('[data-walk-check]');
      assert.deepEqual((await state()).progress.context, { solved: true, assisted: false, hints: 0 });
      assert.equal(await page.locator('[data-perception-walk] canvas').count(), 0);
      assert.doesNotMatch(await page.locator('[data-perception-walk]').innerText(), /\\u[0-9a-f]{4}/i);
      await capturePage('fallback-mobile');
      await page.evaluate(() => window.__perceptionPreview.unmount()); assert.equal(await page.locator('canvas').count(), 0);
    });
    assert.deepEqual(errors, []);
    const result = JSON.stringify({ passed: true, memoryOnly, checks, screenshots, errors }, null, 2);
    if (memoryOnly) console.log(result); else fs.writeFileSync(path.join(out, 'qa-results.json'), result);
    console.log('PASS: ' + checks.length + ' new-puzzle browser groups');
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
