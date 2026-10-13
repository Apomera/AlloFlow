'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-viewpoints-qa');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const selector = (action, slot) => '[data-walk-viewpoint-' + action + '="' + slot + '"]';
  const click = async value => { await page.locator(value).click(); await page.waitForTimeout(100); };
  const act = (action, slot) => click(selector(action, slot));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const rest = value => { const { player, viewpoints, ...puzzle } = value; return puzzle; };
  const check = async (name, run) => { current = name; await run(); checks.push(name); console.log('PASS: ' + name); };
  const patch = async value => {
    await page.evaluate(value => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...value }) })), value);
    await page.waitForTimeout(100);
  };
  const range = async (selector, value) => {
    await page.locator(selector).evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    await page.waitForTimeout(100);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__viewpointsViewer.debug(), p = StemLab.PerceptionWalk.normalize(window.__perceptionPreview.state.perceptionWalk).player;
      return ['x', 'z', 'yaw', 'pitch'].every(key => Number.isFinite(d.camera[key]) && Math.abs(d.camera[key] - p[key]) < 1e-6);
    });
  };
  const capture = async name => {
    await settled();
    const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {}), png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank rendered first-person scene');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__viewpointsViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor(); await settled();
  };
  const assertPose = async expected => {
    assert.deepEqual((await state()).player, expected); await settled();
    const camera = await page.evaluate(() => window.__viewpointsViewer.debug().camera);
    for (const key of ['x', 'z', 'yaw', 'pitch']) assert(Math.abs(camera[key] - expected[key]) < 1e-6, 'Rendered camera restores ' + key);
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="aperture"]');
    await check('A/B restores the rendered camera without restoring puzzle settings or evidence', async () => {
      await click('[data-walk-reset]');
      const initial = await state();
      await patch({ aperture: { ...initial.aperture, phase: 90, speed: .75, masked: false, seenMasked: 7, seenOpen: 7, choice: 'horizontal', completed: [0, 1] } });
      await page.locator('[data-walk-note]').fill('The finite ends distinguish the two motions.');
      const before = await state(), a = before.player;
      assert(await page.locator(selector('recall', 'A')).isDisabled()); assert(await page.locator(selector('clear', 'A')).isDisabled());
      await act('save', 'A'); assert.deepEqual((await state()).viewpoints.aperture.A, a);
      for (let i = 0; i < 4; i++) await click('[data-walk-move="right"]');
      await page.locator('[data-walk-stage]').press('ArrowLeft'); await page.locator('[data-walk-stage]').press('PageUp');
      const b = (await state()).player;
      assert.notEqual(a.x, b.x); assert.notEqual(a.yaw, b.yaw); assert.notEqual(a.pitch, b.pitch);
      await act('save', 'B'); assert.deepEqual((await state()).viewpoints.aperture.B, b);
      await range('[data-walk-aperture-phase]', 270);
      await page.locator('[data-walk-note]').fill('Both saved views now show the later motion phase.');
      const puzzle = rest(await state());
      assert.notEqual(puzzle.aperture.phase, before.aperture.phase); assert.notEqual(puzzle.notes.aperture, before.notes.aperture);
      for (let repeat = 0; repeat < 2; repeat++) {
        await act('recall', 'A'); await assertPose(a); const imageA = await capture(repeat ? undefined : 'view-A');
        await act('recall', 'B'); await assertPose(b); assert.notEqual(await capture(repeat ? undefined : 'view-B'), imageA);
        assert.deepEqual(rest(await state()), puzzle);
      }
      assert.deepEqual((await state()).progress, before.progress);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('per-room viewpoints survive reload and reset; clearing one leaves all other slots intact', async () => {
      const aperture = (await state()).viewpoints.aperture;
      await click('[data-walk-activity="weave"]'); await act('save', 'A');
      await click('[data-walk-weave-view="left"]'); await act('save', 'B');
      const saved = await state(); assert.deepEqual(saved.viewpoints.aperture, aperture);
      await page.reload(); await open(); assert.deepEqual((await state()).viewpoints, saved.viewpoints);
      await click('[data-walk-activity="aperture"]'); await act('recall', 'A'); await assertPose(aperture.A);
      await click('[data-walk-reset]'); const reset = await state();
      assert.deepEqual(reset.viewpoints, saved.viewpoints); assert.equal(reset.notes.aperture, saved.notes.aperture);
      await act('clear', 'A'); const cleared = await state();
      assert.equal(cleared.viewpoints.aperture.A, null); assert.deepEqual(cleared.viewpoints.aperture.B, aperture.B);
      assert.deepEqual(cleared.viewpoints.weave, saved.viewpoints.weave); assert.deepEqual(rest(cleared), rest(reset));
      assert(await page.locator(selector('recall', 'A')).isDisabled()); assert(await page.locator(selector('clear', 'A')).isDisabled());
      assert(!(await page.locator(selector('save', 'A')).isDisabled()));
    });
    await check('recall stays outside a moved block and retains the original saved camera pose', async () => {
      await click('[data-walk-activity="scale"]'); await click('[data-walk-reset]');
      await patch({ player: { x: .95, z: 3, yaw: 0, pitch: 0 } }); await act('save', 'A');
      const saved = (await state()).viewpoints.scale.A;
      for (let i = 0; i < 5; i++) await click('[data-walk-move="right"]');
      await click('[data-walk-select-block]'); assert(!(await page.locator('[data-walk-block-z]').isDisabled()));
      await range('[data-walk-block-z]', 3); assert.equal((await state()).blockZ, 3);
      await act('recall', 'A'); const recalled = await state();
      assert.deepEqual(recalled.viewpoints.scale.A, saved); assert.notDeepEqual(recalled.player, saved);
      assert(!(recalled.player.x > .35 && recalled.player.x < 1.55 && recalled.player.z > 2.4 && recalled.player.z < 3.6), 'Recalled camera remains outside the moved teal block');
      assert.equal(recalled.player.yaw, saved.yaw); assert.equal(recalled.player.pitch, saved.pitch); assert.equal(recalled.blockZ, 3);
      assert.match(await page.locator('[data-walk-status]').textContent(), /obstacle/i);
      await assertPose(recalled.player); await capture('collision-recall');
      await range('[data-walk-block-z]', -1); assert.equal((await state()).blockZ, -1);
      await act('recall', 'A'); await assertPose(saved); assert.deepEqual((await state()).viewpoints.scale.A, saved);
    });
    await check('closed Change Room shutter locks all six viewpoint actions', async () => {
      await click('[data-walk-activity="change"]'); await click('[data-walk-home]'); await act('save', 'A');
      await click('[data-walk-move="right"]'); await act('save', 'B'); await click('[data-walk-home]');
      await click('[data-walk-change-shutter]'); assert((await state()).change.closed); const closed = await state();
      for (const action of ['save', 'recall', 'clear']) for (const slot of ['A', 'B']) {
        const button = page.locator(selector(action, slot)); assert(await button.isDisabled());
        await button.evaluate(node => node.click());
      }
      assert.deepEqual(await state(), closed);
      await click('[data-walk-change-shutter]');
      for (const action of ['save', 'recall', 'clear']) for (const slot of ['A', 'B']) assert(!(await page.locator(selector(action, slot)).isDisabled()));
      await act('recall', 'B'); await assertPose(closed.viewpoints.change.B);
    });
    await check('saving, recalling and clearing stop active exhibit playback', async () => {
      await click('[data-walk-activity="aperture"]'); await click('[data-walk-home]'); await act('save', 'A');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !document.querySelector('[data-walk-aperture-play]').disabled);
      for (const [action, slot] of [['save', 'B'], ['recall', 'A'], ['clear', 'B']]) {
        await click('[data-walk-aperture-play]');
        assert.equal(await page.locator('[data-walk-aperture-play]').getAttribute('aria-pressed'), 'true');
        const phase = (await state()).aperture.phase;
        await page.waitForFunction(phase => window.__perceptionPreview.state.perceptionWalk.aperture.phase !== phase, phase);
        await act(action, slot); assert.equal(await page.locator('[data-walk-aperture-play]').getAttribute('aria-pressed'), 'false');
        const paused = (await state()).aperture.phase; await page.waitForTimeout(200); assert.equal((await state()).aperture.phase, paused);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
    });
    await check('desktop and phone controls stay usable, touch restores views, and the 3D scene remains framed', async () => {
      await click('[data-walk-home]'); await act('save', 'A');
      await click('[data-walk-aperture-view="left"]'); await act('save', 'B');
      const slots = (await state()).viewpoints.aperture;
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await page.locator('[data-walk-viewpoints]').scrollIntoViewIfNeeded();
        const layout = await page.locator('[data-walk-viewpoints]').evaluate(fieldset => {
          const boxes = Array.from(fieldset.querySelectorAll('button')).map(node => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, name: node.getAttribute('aria-label') || node.textContent.trim() };
          });
          return { boxes, overflow: document.documentElement.scrollWidth > innerWidth, width: innerWidth };
        });
        assert.equal(layout.boxes.length, 6); assert(!layout.overflow, 'No horizontal overflow at ' + width);
        for (const box of layout.boxes) assert(box.x >= 0 && box.right <= layout.width + 1 && box.width >= 30 && box.height >= 30 && box.name, 'Visible named viewpoint control: ' + JSON.stringify(box));
        for (let i = 0; i < layout.boxes.length; i++) for (let j = i + 1; j < layout.boxes.length; j++) {
          const a = layout.boxes[i], b = layout.boxes[j]; assert(a.right <= b.x + .5 || b.right <= a.x + .5 || a.bottom <= b.y + .5 || b.bottom <= a.y + .5, 'Viewpoint buttons do not overlap');
        }
        for (const slot of ['A', 'B']) {
          const button = page.locator(selector('recall', slot)); await button.scrollIntoViewIfNeeded(); const r = await button.boundingBox();
          await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await assertPose(slots[slot]);
        }
        await capture('canvas-' + width);
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
      }
    });
    await check('saved views remain accessible in Plan and no-WebGL fallbacks', async () => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []); const before = await state();
      await click('[data-walk-diagram-toggle]'); await act('recall', 'A'); const planA = await page.locator('[data-walk-aperture-plan]').innerHTML();
      assert.deepEqual((await state()).player, before.viewpoints.aperture.A);
      await act('recall', 'B'); const planB = await page.locator('[data-walk-aperture-plan]').innerHTML();
      assert.deepEqual((await state()).player, before.viewpoints.aperture.B); assert.notEqual(planA, planB); assert(!/NaN|Infinity/.test(planA + planB));
      await page.locator('[data-walk-aperture-plan]').screenshot({ path: path.join(out, 'plan-320.png') });
      assert.deepEqual(rest(await state()), rest(before));
      await page.goto(url + '?no-webgl'); await open(true);
      await act('recall', 'A'); assert.deepEqual((await state()).player, before.viewpoints.aperture.A);
      await click('[data-walk-move="right"]'); const pose = (await state()).player; await act('save', 'B'); await act('recall', 'A'); await act('recall', 'B');
      assert.deepEqual((await state()).player, pose); assert(!/NaN|Infinity/.test(await page.locator('[data-walk-aperture-plan]').innerHTML()));
      await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0);
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' viewpoint browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ok: false, current, checks, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
