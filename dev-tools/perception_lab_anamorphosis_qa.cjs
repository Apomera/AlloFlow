'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const out = path.resolve('.tmp/perception-anamorphosis-qa');
const report = path.join(out, process.env.PERCEPTION_QA_FILTER ? 'focused-results.json' : 'results.json');
const url = 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = []; let current = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(100); };
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__anamorphosisViewer.debug());
  const check = async (name, run) => {
    if (process.env.PERCEPTION_QA_FILTER && !name.includes(process.env.PERCEPTION_QA_FILTER)) return;
    current = name; await run(); checks.push(name); console.log('PASS: ' + name);
  };
  const offset = async value => {
    await page.locator('[data-walk-anamorphosis-offset]').evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const patch = async update => {
    await page.evaluate(update => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, ...update }) })), update);
    await page.waitForTimeout(100);
  };
  const settled = async () => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const d = window.__anamorphosisViewer.debug(), s = window.__perceptionPreview.state.perceptionWalk;
      return ['x', 'z', 'yaw', 'pitch'].every(key => Math.abs(d.camera[key] - s.player[key]) < 1e-6)
        && d.anamorphosisSet === s.anamorphosis.set && d.anamorphosisRound === s.anamorphosis.round && d.anamorphosisOffsets.every((value, index) => Math.abs(value - s.anamorphosis.offsets[index]) < 1e-6);
    });
  };
  const capture = async name => {
    await settled(); const buffer = await page.locator('[data-perception-walk] canvas').screenshot(name ? { path: path.join(out, name + '.png') } : {});
    const png = PNG.sync.read(buffer), colors = new Set();
    for (let i = 0; i < png.data.length; i += 16) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
    assert(colors.size > 25 && png.width > 240 && png.height > 220, 'Nonblank rendered room');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  const point = async choice => {
    await settled(); return page.evaluate(choice => {
      const p = window.__anamorphosisViewer.debug().anamorphosisProjected[choice], rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect();
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, hit: window.__anamorphosisViewer.pick(x, y)?.id };
    }, choice);
  };
  const open = async (fallback = false) => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator(fallback ? '[data-walk-retry]' : '[data-perception-walk] canvas').waitFor();
    if (fallback) return;
    await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__anamorphosisViewer = viewer; return viewer; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="anamorphosis"]');
    await check('direct beam dragging and crosshair selection preserve first-person position', async () => {
      assert.equal(await page.locator('[data-walk-activity]').count(), 20);
      await click('[data-walk-reset]'); const before = await state(), first = await capture('desktop-start'), p = await point('B'); assert.equal(p.hit, 'anamorphosis-B');
      const expected = await page.evaluate(({ x, y }) => window.__anamorphosisViewer.anamorphosisCoordinate(x + 35, y, 0) - window.__anamorphosisViewer.anamorphosisCoordinate(x, y, 0), p);
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 35, p.y, { steps: 5 }); await page.mouse.up(); await settled();
      const moved = await state(); assert(Math.abs(moved.anamorphosis.offsets[0] - Math.min(1.2, -.9 + expected)) < .0001);
      assert.equal(moved.anamorphosis.offsets[1], before.anamorphosis.offsets[1]); assert.deepEqual(moved.player, before.player); assert.notEqual(await capture('desktop-dragged'), first);
      await click('[data-walk-reset]'); await click('[data-walk-precision]'); const fine = await point('B');
      await page.mouse.move(fine.x, fine.y); await page.mouse.down(); await page.mouse.move(fine.x + 35, fine.y, { steps: 5 }); await page.mouse.up();
      assert(Math.abs((await state()).anamorphosis.offsets[0] - (-.9 + expected * .25)) < .0001); await click('[data-walk-precision]');
      await click('[data-walk-reset]'); await settled(); const d = await debug(), s = await state(), beam = d.anamorphosisObjects.find(item => item.choice === 'C');
      const target = { x: (beam.from.x + beam.to.x) / 2, y: (beam.from.y + beam.to.y) / 2, z: (beam.from.z + beam.to.z) / 2 };
      const dx = target.x - s.player.x, dz = s.player.z - target.z;
      await patch({ player: { ...s.player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(target.y - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI } }); await settled();
      await page.locator('[data-walk-stage]').press('e'); assert.equal((await state()).anamorphosis.selected, 1); await click('[data-walk-home]');
      for (let step = 0; step < 45; step++) await page.locator('[data-walk-stage]').press('w');
      const stopped = await state(); assert(stopped.player.z >= 3.2 && stopped.player.z < 3.45, 'First-person walking stops before the beams');
      await click('[data-walk-home]'); assert.deepEqual((await state()).player, before.player);
    });
    await check('both arrangements and actual 3D endpoints fit front and side views on desktop and phones', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const set of [0, 1]) for (const round of [0, 1]) for (const kind of ['initial', 'aligned', 'extreme', 'opposite']) {
          const offsets = kind === 'aligned' ? (set ? round ? [-.65, .35] : [.45, -.6] : round ? [-.55, .7] : [.6, -.45]) : kind === 'extreme' ? [-1.2, 1.2] : kind === 'opposite' ? [1.2, -1.2] : (round ? [.9, -.9] : [-.9, .9]);
          await patch({ anamorphosis: { set, round, offsets }, player: { x: 216, z: 10, yaw: 0, pitch: 0 } });
          let frontHash;
          for (const side of ['front', 'side']) {
            await click('[data-walk-anamorphosis-view="' + side + '"]'); await settled();
            const d = await debug(), c = d.camera, rect = await page.locator('[data-perception-walk] canvas').boundingBox(), scale = Math.tan(c.fov * Math.PI / 360), yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180;
            for (const item of d.anamorphosisObjects) for (const q of [item.from, item.to]) {
              const dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch);
              const nx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale * rect.width / rect.height), ny = (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale);
              assert(distance > 0 && Math.abs(nx) < .94 && Math.abs(ny) < .94, JSON.stringify({ width, set, round, kind, side, nx, ny }));
            }
            const project = q => {
              const dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch);
              return { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / distance, y: (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / distance, distance };
            };
            if (kind === 'aligned') {
              const gaps = d.anamorphosisObjects.map((item, index, all) => {
                const a = project(item.to), b = project(all[(index + 1) % 3].from);
                assert(Math.hypot(item.to.x - all[(index + 1) % 3].from.x, item.to.y - all[(index + 1) % 3].from.y, item.to.z - all[(index + 1) % 3].from.z) > 1);
                return Math.hypot(a.x - b.x, a.y - b.y);
              });
              assert(side === 'front' ? Math.max(...gaps) < 1e-6 : Math.max(...gaps) > .02, 'Rendered beams align only in the intended front view');
            }
            const labels = d.anamorphosisLabels.map(label => {
              assert(label.visible, 'Both beam labels remain visible at the observation viewpoints');
              const distance = project(label.position).distance, halfW = label.scale.x / (2 * distance * scale * rect.width / rect.height), halfH = label.scale.y / (2 * distance * scale);
              return { left: label.projected.x - halfW, right: label.projected.x + halfW, bottom: label.projected.y - halfH, top: label.projected.y + halfH };
            });
            assert.equal(labels.length, 2);
            for (const label of labels) assert(label.left > -1 && label.right < 1 && label.bottom > -1 && label.top < 1, 'Beam labels fit: ' + JSON.stringify({ width, round, kind, side, label }));
            assert(labels[0].right <= labels[1].left || labels[1].right <= labels[0].left || labels[0].top <= labels[1].bottom || labels[1].top <= labels[0].bottom, 'Beam labels do not overlap');
            const hash = await capture(kind === 'aligned' ? 'aligned-' + set + '-' + round + '-' + side + '-' + width : null);
            if (side === 'front') frontHash = hash; else assert.notEqual(hash, frontHash);
            assert(!(await page.locator('[data-walk-anamorphosis-offset]').isDisabled()));
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          }
        }
        await page.locator('[data-perception-walk]').screenshot({ path: path.join(out, 'layout-' + width + '.png') });
      }
    });
    await check('depth rails support perspective-correct desktop dragging without changing physical size or camera', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const round of [0, 1]) for (const side of ['front', 'side']) for (const choice of ['B', 'C']) {
        await patch({ anamorphosis: { set: 1, round, offsets: [0, 0] }, player: { x: 216, z: 10, yaw: 0, pitch: 0 } });
        await click('[data-walk-anamorphosis-view="' + side + '"]'); const p = await point(choice), before = await state(), original = await debug(), first = await capture();
        assert.equal(p.hit, 'anamorphosis-' + choice);
        const target = await page.evaluate(({ choice }) => {
          const d = window.__anamorphosisViewer.debug(), c = d.camera, rect = document.querySelector('[data-perception-walk] canvas').getBoundingClientRect(), o = d.anamorphosisObjects.find(o => o.choice === choice);
          const q = { x: (o.from.x + o.to.x) / 2, y: (o.from.y + o.to.y) / 2, z: (o.from.z + o.to.z) / 2 + 1.1 };
          const yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180, dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z;
          const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), distance = depth * Math.cos(pitch) + dy * Math.sin(pitch), scale = Math.tan(c.fov * Math.PI / 360);
          return { x: rect.left + rect.width / 2 + (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / (distance * scale) * rect.height / 2, y: rect.top + rect.height / 2 - (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / (distance * scale) * rect.height / 2 };
        }, { choice });
        await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 5 }); await page.mouse.up(); await settled();
        const changed = await state(), actual = await debug(), index = choice === 'B' ? 0 : 1;
        assert(Math.abs(changed.anamorphosis.offsets[index] - 1.1) < .001, JSON.stringify({ round, side, choice, p, target, value: changed.anamorphosis.offsets[index] }));
        assert.deepEqual(changed.player, before.player); assert.equal(changed.anamorphosis.offsets[1 - index], 0); assert.notEqual(await capture(), first);
        for (const [i, o] of actual.anamorphosisObjects.entries()) {
          const prior = original.anamorphosisObjects[i];
          for (const end of ['from', 'to']) { assert(Math.abs(o[end].x - prior[end].x) < 1e-7); assert(Math.abs(o[end].y - prior[end].y) < 1e-7); }
        }
        for (const rail of actual.anamorphosisRails.filter(item => item.choice !== 'A')) assert.equal(rail.axis, 'z');
      }
      await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-reveal]');
      await capture('depth-reveal'); const revealed = await debug(); assert.equal(revealed.anamorphosisGuides.length, 3); assert.equal(revealed.anamorphosisDepthGuides.length, 3);
      for (const [i, guide] of revealed.anamorphosisGuides.entries()) {
        const next = revealed.anamorphosisGuides[(i + 1) % 3];
        assert(Math.abs((guide.to.x - 216) / (10 - guide.to.z) - (next.from.x - 216) / (10 - next.from.z)) < 1e-7);
        assert(Math.abs((guide.to.y - 1.65) / (10 - guide.to.z) - (next.from.y - 1.65) / (10 - next.from.z)) < 1e-7);
      }
      assert((await state()).progress.anamorphosis.assisted); assert.deepEqual((await state()).anamorphosis.completed, []);
      await click('[data-walk-reset]');
    });
    await check('two earned comparisons survive reload, notes and saved viewpoints', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      for (const round of [0, 1]) {
        for (const [index, value] of (round ? [-.55, .7] : [.6, -.45]).entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
        await click('[data-walk-check]'); assert(!(await state()).anamorphosis.completed.includes(round));
        await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
        await click('[data-walk-check]'); assert(!(await state()).anamorphosis.completed.includes(round));
        await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]'); assert((await state()).anamorphosis.completed.includes(round));
        if (!round) await click('[data-walk-anamorphosis-next]');
      }
      assert((await state()).progress.anamorphosis.solved);
      await click('[data-walk-anamorphosis-set-next]'); assert.equal((await state()).anamorphosis.set, 1); assert.deepEqual((await state()).anamorphosis.completed, []);
      for (const round of [0, 1]) {
        for (const [index, value] of (round ? [-.65, .35] : [.45, -.6]).entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
        await click('[data-walk-check]'); assert(!(await state()).anamorphosis.completed.includes(round));
        await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
        await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]'); assert((await state()).anamorphosis.completed.includes(round));
        if (!round) { assert((await page.locator('[data-walk-status]').textContent()).includes('next arrangement')); await click('[data-walk-anamorphosis-next]'); }
      }
      assert((await state()).anamorphosis.mastered); await page.locator('[data-walk-note]').fill('The joins are in the image, not in space.');
      await click('[data-walk-viewpoint-save="A"]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-viewpoint-save="B"]');
      const saved = await state(); await page.reload(); await open(); assert.deepEqual(await state(), saved);
      await click('[data-walk-viewpoint-recall="A"]'); assert.equal((await state()).player.x, 216); await click('[data-walk-viewpoint-recall="B"]'); assert.equal((await state()).player.x, 220.4);
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('geometry changes invalidate comparisons and reveals never award practice credit', async () => {
      await click('[data-walk-reset]'); await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
      await click('[data-walk-anamorphosis-view="front"]'); assert.equal((await state()).anamorphosis.seen, 3);
      await offset(.1); assert.equal((await state()).anamorphosis.seen, 0); await click('[data-walk-reveal]');
      const r = await state(); assert(r.progress.anamorphosis.assisted); await capture('reveal');
      for (const [index, value] of [.6, -.45].entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
      await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]');
      assert.deepEqual((await state()).anamorphosis.completed, []); assert(!(await state()).progress.anamorphosis.solved);
      await patch({ player: { x: 216, z: 10, yaw: 180, pitch: 0 } }); assert(await page.locator('[data-walk-anamorphosis-offset]').isDisabled());
      await click('[data-walk-home]'); await click('[data-walk-reset]');
    });
    await check('touch dragging, native scrolling and keyboard sliders remain usable on phones', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); const cdp = await page.context().newCDPSession(page);
      try {
        for (const set of [0, 1]) {
        await patch({ anamorphosis: { set, round: 1, offsets: [0, 0] }, player: { x: 216, z: 10, yaw: 0, pitch: 0 } });
        const p = await point(set ? 'C' : 'B'), before = await state(), index = set ? 1 : 0;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 45, y: p.y + 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert((await state()).anamorphosis.offsets[index] > before.anamorphosis.offsets[index]); assert.deepEqual((await state()).player, before.player);
        const q = await point(set ? 'C' : 'B'), changed = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 70 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150);
        assert.deepEqual((await state()).anamorphosis, changed.anamorphosis); assert.notEqual(await page.evaluate(() => scrollY), scroll);
        }
      } finally { await cdp.detach(); }
      await click('[data-walk-anamorphosis-choice="1"]'); await offset(0); await page.locator('[data-walk-anamorphosis-offset]').press('ArrowRight'); assert(Math.abs((await state()).anamorphosis.offsets[1] - .01) < 1e-8);
    });
    await check('accessible Plan and no-WebGL fallback retain all puzzle actions', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(item => ({ id: item.id, count: item.nodes.length }))), []);
      await click('[data-walk-diagram-toggle]'); const svg = page.locator('[data-walk-anamorphosis-plan]'), before = await svg.innerHTML(); await offset(.2);
      assert.notEqual(await svg.innerHTML(), before); assert(!/NaN|Infinity/.test(await svg.innerHTML())); await svg.screenshot({ path: path.join(out, 'plan-320.png') });
      await page.goto(url + '?no-webgl'); await open(true); assert(await page.locator('[data-walk-anamorphosis-plan]').isVisible()); await click('[data-walk-reset]');
      await patch({ anamorphosis: { set: 1 }, player: { x: 216, z: 10, yaw: 0, pitch: 0 } });
      for (const [index, value] of [.45, -.6].entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await offset(value); }
      await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]');
      assert((await state()).anamorphosis.completed.includes(0)); await click('[data-walk-close]'); assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(report, JSON.stringify({ ok: true, checks, errors }, null, 2)); console.log('All ' + checks.length + ' anamorphosis browser groups passed.');
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({ ok: false, current, checks, errors, error: String(error.stack || error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); console.error(current, error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
