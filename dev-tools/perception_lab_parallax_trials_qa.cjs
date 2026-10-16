'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-parallax-trials-qa');
const report = path.join(out, process.env.PERCEPTION_QA_FILTER ? 'focused-results.json' : 'results.json');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';
const start = { x: 24, z: 9, yaw: 0, pitch: 0 };
const targets = ['C', 'A', 'B'];
const layouts = [
  { x: [22.4, 24, 25.8], z: [1, -3, 4] },
  { x: [22.4, 24, 25.8], z: [4, -3, 1] },
  { x: [21.6, 24, 28.3], z: [1, 4, -3] }
];
const close = (actual, expected, label, tolerance = 1e-5) => assert(Math.abs(actual - expected) < tolerance, label + ': ' + actual + ' versus ' + expected);

// Exact angular silhouettes check physical separation independently of the scorer.
function silhouettes(objects, player) {
  return objects.map(object => {
    const dx = object.center.x - player.x, depth = player.z - object.center.z;
    const center = Math.atan2(dx, depth), radius = Math.asin(object.radius / Math.hypot(dx, depth));
    return { choice: object.choice, left: center - radius, right: center + radius };
  }).sort((a, b) => a.left - b.left);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__parallaxTrialsViewer.debug());
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const seed = async (round = 0, completed = []) => {
    await click('[data-walk-activity="parallax"]'); await click('[data-walk-reset]');
    await patch({ activity: 'parallax', parallax: { round, completed, samples: [], choice: '' }, player: start, precise: false });
  };
  const check = async (name, run) => {
    if (process.env.PERCEPTION_QA_FILTER && !name.includes(process.env.PERCEPTION_QA_FILTER)) return;
    current = name; await run(); checks.push(name); console.log('PASS: ' + name);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__parallaxTrialsViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return d.parallaxRound === s.parallax.round && ['x', 'z', 'yaw', 'pitch'].every(key => Math.abs(d.camera[key] - s.player[key]) < 1e-6);
    });
  };
  const captureElement = async (element, name, minimumColors = 25) => {
    const buffer = await element.screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > minimumColors && png.width > 240 && png.height > 160, 'Nonblank visual output');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const capture = async name => { await settled(); return captureElement(page.locator('[data-perception-walk] canvas'), name); };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__parallaxTrialsViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async choice => page.evaluate(choice => {
    const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect();
    const item = window.__parallaxTrialsViewer.debug().parallaxProjected.find(item => item.choice === choice);
    const x = rect.left + (item.center.x + 1) * rect.width / 2, y = rect.top + (1 - item.center.y) * rect.height / 2;
    return { x, y, unobstructed: document.elementFromPoint(x, y) === canvas, hit: window.__parallaxTrialsViewer.pick(x, y) };
  }, choice);
  const keyboard = async key => {
    const stage = page.locator('[data-walk-stage]');
    if (await stage.isVisible()) { await stage.focus(); await page.keyboard.press(key); }
    else {
      const command = { d: 'right', w: 'forward' }[key]; assert(command, 'Fallback movement key has an equivalent control');
      const control = page.locator('[data-walk-move="' + command + '"]'); assert(await control.isVisible());
      await control.focus(); await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(50);
  };
  const recordPair = async () => {
    await click('[data-walk-record]'); assert.equal((await state()).parallax.samples.length, 1);
    await keyboard('d'); await click('[data-walk-record]'); assert.equal((await state()).parallax.samples.length, 1, 'A small sideways step is not enough');
    for (let step = 0; step < 5; step++) await keyboard('d');
    close((await state()).player.x, 25.2, 'Actual walking supplies the baseline');
    await click('[data-walk-record]'); assert.equal((await state()).parallax.samples.length, 2);
    close(Math.abs((await state()).parallax.samples[1].x - (await state()).parallax.samples[0].x), 1.2, 'Recorded sideways separation');
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="parallax"]');
    await check('all three physical sphere arrangements preserve matched sizes and swap the strongest parallax shift', async () => {
      const signatures = [];
      for (const round of [0, 1, 2]) {
        await seed(round); await capture('parallax-round-' + round + '-start'); const before = await debug();
        const model = await page.evaluate(round => StemLab.PerceptionWalk.parallaxObjects(round), round);
        assert.equal(before.parallaxRound, round); assert.equal(before.parallaxRendered.length, 3);
        for (const [index, object] of before.parallaxRendered.entries()) {
          assert.equal(object.id, 'parallax-' + ['A', 'B', 'C'][index]);
          for (const key of ['x', 'y', 'z']) close(object.center[key], model[index][key], 'Actual mesh center matches model ' + key);
          close(object.center.x, layouts[round].x[index], 'Independent X layout'); close(object.center.z, layouts[round].z[index], 'Independent depth layout');
          close(object.center.y, 1.65, 'Spheres share eye height'); close(object.radius, model[index].radius, 'Actual sphere radius');
          close(object.radius / (9 - object.center.z), 0.07, 'Matched apparent radius at the starting distance');
          const point = await target(object.choice); assert(point.unobstructed); assert.equal(point.hit?.id, object.id);
          await page.mouse.click(point.x, point.y); await page.waitForTimeout(60); assert.equal((await state()).parallax.choice, object.choice);
        }
        const heights = before.parallaxProjected.map(object => object.top.y - object.bottom.y);
        heights.forEach(height => close(height, heights[0], 'Projected vertical diameters match'));
        signatures.push(JSON.stringify(before.parallaxRendered));
        const beforeImage = await capture(); await keyboard('d'); await settled(); const after = await debug();
        const shifts = after.parallaxProjected.map((object, index) => ({ choice: object.choice, shift: Math.abs(object.center.x - before.parallaxProjected[index].center.x) }));
        shifts.sort((a, b) => b.shift - a.shift); assert.equal(shifts[0].choice, targets[round]);
        assert(shifts[0].shift > shifts[1].shift && shifts[1].shift > shifts[2].shift, 'Three distinct depths produce distinct image shifts');
        assert.notEqual(await capture('parallax-round-' + round + '-step'), beforeImage, 'First-person movement visibly changes the scene');
      }
      assert.equal(new Set(signatures).size, 3);
    });
    await check('actual walking records fresh evidence and independently earns every depth arrangement', async () => {
      await seed(); assert(await page.locator('[data-walk-parallax-next]').isDisabled());
      for (const round of [0, 1, 2]) {
        assert.equal((await state()).parallax.round, round); assert.match(await page.locator('[data-walk-parallax-trial]').textContent(), new RegExp(String(round + 1)));
        assert.deepEqual((await state()).parallax.samples, []); assert.equal((await state()).parallax.choice, '');
        await page.locator('[data-walk-choice="' + targets[round] + '"]').check(); await click('[data-walk-check]');
        assert.deepEqual((await state()).parallax.completed, Array.from({ length: round }, (_, index) => index), 'Old completion cannot replace fresh evidence');
        await recordPair(); await click('[data-walk-view="0"]'); close((await state()).player.x, 24, 'Replay first viewpoint');
        const first = await capture(); await click('[data-walk-view="1"]'); close((await state()).player.x, 25.2, 'Replay second viewpoint'); assert.notEqual(await capture(), first);
        const wrong = targets[(round + 1) % 3]; await page.locator('[data-walk-choice="' + wrong + '"]').check(); await click('[data-walk-check]');
        assert.equal((await state()).parallax.completed.length, round, 'Incorrect nearest choice earns no credit');
        await page.locator('[data-walk-choice="' + targets[round] + '"]').check(); await click('[data-walk-check]'); await click('[data-walk-check]');
        assert.deepEqual((await state()).parallax.completed, Array.from({ length: round + 1 }, (_, index) => index));
        assert.equal((await state()).progress.parallax.solved, true); assert(!(await page.locator('[data-walk-parallax-next]').isDisabled()));
        assert.match(await page.locator('[data-walk-parallax-completed]').textContent(), new RegExp(String(round + 1)));
        await click('[data-walk-parallax-next]'); assert.deepEqual((await state()).player, start);
      }
      assert.equal((await state()).parallax.round, 0); assert.deepEqual((await state()).parallax.completed, [0, 1, 2]);
    });
    await check('reveals isolate current-trial credit and legacy progress survives reload and scoped reset', async () => {
      for (const round of [0, 1, 2]) {
        await seed(round, round ? [0] : []); await recordPair(); await page.locator('[data-walk-choice="' + targets[round] + '"]').check();
        await click('[data-walk-reveal]'); assert.equal((await state()).progress.parallax.assisted, true); await capture('parallax-reveal-' + round); await click('[data-walk-check]');
        assert.deepEqual((await state()).parallax.completed, round ? [0] : []); await click('[data-walk-parallax-next]');
        assert.equal((await state()).parallax.round, (round + 1) % 3); assert.equal((await state()).progress.parallax.assisted, false);
        assert.deepEqual((await state()).parallax.samples, []); assert.equal((await state()).parallax.choice, '');
      }
      await seed(); const original = await state();
      await patch({ parallax: { samples: [], choice: '' }, progress: { ...original.progress, parallax: { solved: true, assisted: false, hints: 1 } } });
      assert.equal((await state()).progress.parallax.solved, true); assert.deepEqual((await state()).parallax.completed, [0], 'Original earned room migrates only its original trial');
      await click('[data-walk-parallax-next]'); assert.equal((await state()).parallax.round, 1); assert(await page.locator('[data-walk-parallax-next]').isDisabled());
      await page.locator('[data-walk-note]').fill('Compare sideways shifts while keeping the viewing direction fixed.');
      await click('[data-walk-viewpoint-save="A"]'); await recordPair(); await page.locator('[data-walk-choice="A"]').check(); await click('[data-walk-check]');
      const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await click('[data-walk-next-room]'); await click('[data-walk-previous-room]'); assert.deepEqual((await state()).parallax, saved.parallax);
      await click('[data-walk-reset]'); assert.deepEqual((await state()).parallax, { round: 0, completed: [], samples: [], choice: '' });
      assert.equal((await state()).notes.parallax, saved.notes.parallax); assert.deepEqual((await state()).viewpoints.parallax, saved.viewpoints.parallax);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('current sphere collisions protect walking saved recovery and recalled bookmarks in every arrangement', async () => {
      for (const round of [0, 1, 2]) {
        await seed(round); await settled(); const objects = (await debug()).parallaxRendered;
        for (const object of objects) {
          const occupied = { x: object.center.x, z: object.center.z, yaw: 0, pitch: 0 };
          await patch({ player: occupied }); let currentState = await state();
          assert(Math.hypot(currentState.player.x - occupied.x, currentState.player.z - occupied.z) > object.radius, 'Saved-state recovery stays outside actual sphere');
          await patch({ player: start, viewpoints: { ...currentState.viewpoints, parallax: { ...currentState.viewpoints.parallax, A: occupied } } });
          await click('[data-walk-viewpoint-recall="A"]'); currentState = await state();
          assert(Math.hypot(currentState.player.x - occupied.x, currentState.player.z - occupied.z) > object.radius, 'Bookmark recall respects the current arrangement');
          await patch({ player: { ...occupied, z: occupied.z + object.radius + 1 } });
          for (let step = 0; step < 12; step++) await keyboard('w');
          assert((await state()).player.z > occupied.z + object.radius, 'Actual keyboard movement cannot tunnel through the sphere');
        }
      }
    });
    await check('trial changes cancel held movement and release first-person mouse capture', async () => {
      await seed(0, [0]); const move = page.locator('[data-walk-move="right"]'); await move.scrollIntoViewIfNeeded(); const rect = await move.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.waitForTimeout(280);
      await page.evaluate(() => document.querySelector('[data-walk-parallax-next]').click()); const changed = await state();
      assert.equal(changed.parallax.round, 1); assert.deepEqual(changed.player, start); await page.waitForTimeout(300);
      assert.deepEqual((await state()).player, start, 'Changing the arrangement cancels repeating movement'); await page.mouse.up();
      await seed(0, [0]); await page.waitForTimeout(1300); await click('[data-walk-mouse-look]');
      await page.waitForFunction(() => document.pointerLockElement === document.querySelector('[data-walk-stage]'));
      await page.evaluate(() => document.querySelector('[data-walk-parallax-next]').click()); await page.waitForFunction(() => !document.pointerLockElement);
      assert.equal((await state()).parallax.round, 1); assert.equal(await page.locator('[data-walk-mouse-look]').getAttribute('aria-pressed'), 'false');
    });
    await check('spheres and world labels remain separated framed and accessible at desktop and phone observation edges', async () => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1, 2]) {
          await seed(round); await capture('parallax-canvas-' + width + '-round-' + round);
          for (const x of [22.8, 25.4]) for (const z of [8.5, 11]) {
            await patch({ player: { x, z, yaw: 0, pitch: 0 } }); await settled(); const d = await debug();
            const canvas = await page.locator('[data-perception-walk] canvas').boundingBox(), aspect = canvas.width / canvas.height, tangent = Math.tan(d.camera.fov * Math.PI / 360);
            const bounds = silhouettes(d.parallaxRendered, { x, z });
            for (let index = 0; index < bounds.length; index++) {
              assert(Math.abs(Math.tan(bounds[index].left) / (tangent * aspect)) < 1 && Math.abs(Math.tan(bounds[index].right) / (tangent * aspect)) < 1, 'Complete sphere remains inside the horizontal field');
              if (index) assert(bounds[index - 1].right < bounds[index].left, 'Spheres do not occlude one another');
            }
            for (const object of d.parallaxProjected) assert(Math.abs(object.top.y) < 1 && Math.abs(object.bottom.y) < 1 && object.center.z > -1 && object.center.z < 1);
            assert.equal(d.parallaxLabels.length, 3);
            const labels = d.parallaxLabels.map(label => {
              assert(label.visible); const depth = z - label.position.z;
              const halfWidth = label.scale.x / (2 * depth * tangent * aspect), halfHeight = label.scale.y / (2 * depth * tangent);
              assert(Math.abs(label.projected.x) + halfWidth < 1 && Math.abs(label.projected.y) + halfHeight < 1, 'Complete world label stays visible');
              return { left: label.projected.x - halfWidth, right: label.projected.x + halfWidth };
            }).sort((a, b) => a.left - b.left);
            assert(labels[0].right < labels[1].left && labels[1].right < labels[2].left, 'World labels remain separated');
            for (const choice of ['A', 'B', 'C']) { const point = await target(choice); assert(point.unobstructed); assert.equal(point.hit?.id, 'parallax-' + choice); }
          }
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
        const next = await page.locator('[data-walk-parallax-next]').boundingBox(); assert(next.width >= 32 && next.height >= 32 && next.x >= 0 && next.x + next.width <= width);
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'parallax-layout-' + width + '.png') });
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      }
    });
    await check('Plan and no-WebGL fallback preserve perspective movement recording and trial advancement', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await seed(); await click('[data-walk-diagram-toggle]');
      for (const round of [0, 1, 2]) {
        await patch({ parallax: { round, completed: [], samples: [], choice: '' }, player: start }); const svg = page.locator('[data-walk-parallax-plan]'), before = await svg.innerHTML();
        await click('[data-walk-move="right"]'); assert.notEqual(await svg.innerHTML(), before, 'Plan projection follows actual walking');
        assert(!/NaN|Infinity/.test(await svg.innerHTML())); await captureElement(svg, 'parallax-plan-' + round, 10);
      }
      await patch({ parallax: { round: 0, completed: [], samples: [], choice: '' }, player: { x: 24, z: -7, yaw: 180, pitch: 0 } });
      assert.deepEqual(await page.locator('[data-parallax-plan-choice]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-parallax-plan-choice'))), ['C', 'A', 'B'], 'Looking back through the room paints the nearest sphere last');
      await captureElement(page.locator('[data-walk-parallax-plan]'), 'parallax-plan-reverse-view', 10);
      await page.goto(url + '?no-webgl'); await open(true); await seed(2); const svg = page.locator('[data-walk-parallax-plan]'), before = await svg.innerHTML();
      assert(await page.locator('[data-walk-mouse-look]').isDisabled()); await recordPair(); assert.notEqual(await svg.innerHTML(), before);
      await click('[data-walk-view="0"]'); close((await state()).player.x, 24, 'Fallback replays first viewpoint');
      await page.locator('[data-walk-choice="B"]').check(); await click('[data-walk-check]'); assert.deepEqual((await state()).parallax.completed, [2]);
      await click('[data-walk-parallax-next]'); assert.equal((await state()).parallax.round, 0); assert.deepEqual((await state()).parallax.samples, []);
      await captureElement(svg, 'parallax-no-webgl-320', 10); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0);
    });
    assert.deepEqual(errors, []); fs.writeFileSync(report, JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' parallax trial browser groups passed.');
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
