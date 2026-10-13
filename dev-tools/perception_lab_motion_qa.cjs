'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const argument = (key, fallback) => process.argv.find(arg => arg.startsWith('--' + key + '='))?.slice(key.length + 3) || fallback;
const url = argument('url', 'http://127.0.0.1:47931/dev-tools/perception_lab_gallery_preview.html');
const out = path.resolve(__dirname, '..', argument('out', '.tmp/perception-motion-qa'));

function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  for (let i = 0; i < png.data.length; i += 16) colors.add((png.data[i] >> 4) + ',' + (png.data[i + 1] >> 4) + ',' + (png.data[i + 2] >> 4));
  assert(png.width >= 240 && png.height >= 220 && colors.size > 30, 'Canvas contains rendered geometry');
  return { width: png.width, height: png.height, colors: colors.size, hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [], checks = [], screenshots = []; let phase = 'open';
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => structuredClone(window.__perceptionPreview.state.perceptionWalk));
  const debug = () => page.evaluate(() => window.__motionViewer.debug());
  const click = async selector => { await page.locator(selector).click(); await page.waitForTimeout(120); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-walk] canvas'); await canvas.scrollIntoViewIfNeeded();
    const detail = pixels(await canvas.screenshot(name ? { path: path.join(out, name + '.png') } : {}));
    if (name) screenshots.push({ name, ...detail }); return detail;
  };
  const check = async (name, run) => { phase = name; checks.push({ name, detail: await run() }); console.log('PASS: ' + name); };
  const setMotion = async patch => {
    await page.evaluate(patch => window.__perceptionPreview.replace(data => ({ ...data, perceptionWalk: StemLab.PerceptionWalk.normalize({ ...data.perceptionWalk, motion: { ...data.perceptionWalk.motion, ...patch } }) })), patch);
    await page.waitForTimeout(150);
  };
  const open = async () => {
    await click('[data-perception-open-gallery]'); await click('[data-gallery-open-walk]');
    await page.locator('[data-perception-walk] canvas').waitFor(); await click('[data-walk-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionWalkScene.createViewer;
      StemLab.PerceptionWalkScene.createViewer = function () { const result = create.apply(this, arguments); window.__motionViewer = result; return result; };
    });
    await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
  };
  const target = async (choice, dial = false) => {
    await page.locator('[data-walk-stage]').scrollIntoViewIfNeeded();
    return page.evaluate(({ choice, dial }) => {
      const canvas = document.querySelector('[data-perception-walk] canvas'), rect = canvas.getBoundingClientRect(), d = window.__motionViewer.debug();
      const p = dial ? d.motionDialProjected : d.motionProjected.find(item => item.choice === choice).center;
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, hit: window.__motionViewer.pick(x, y), clear: document.elementFromPoint(x, y) === canvas };
    }, { choice, dial });
  };
  const phaseInput = async value => {
    await page.locator('[data-walk-motion-phase]').evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value); await page.waitForTimeout(120);
  };
  try {
    await page.goto(url); await open(); await click('[data-walk-activity="motion"]'); await click('[data-walk-reset]');
    await check('spheres and physical scrubber are pickable and move actual canvas pixels', async () => {
      const before = await capture('desktop-start');
      for (const choice of ['A', 'C', 'E']) { const point = await target(choice); assert.equal(point.hit?.id, 'motion-' + choice); assert(point.clear); await page.mouse.click(point.x, point.y); }
      assert.deepEqual((await state()).motion.selected, ['A', 'C', 'E']);
      const extra = await target('B'); await page.mouse.click(extra.x, extra.y); assert.deepEqual((await state()).motion.selected, ['A', 'C', 'E']);
      const point = await target(null, true), saved = await state(); assert.equal(point.hit?.id, 'motion-dial'); assert(point.clear);
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 120, point.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(120);
      assert((await state()).motion.phase > 40); assert.deepEqual((await state()).player, saved.player); assert.notEqual((await capture()).hash, before.hash);
      assert(Math.abs((await debug()).motionPhase - (await state()).motion.phase) < 0.001);
      await page.locator('[data-walk-motion-phase]').focus(); const start = (await state()).motion.phase; await page.keyboard.press('ArrowRight');
      assert(Math.abs((await state()).motion.phase - start) <= 1.5 && (await state()).motion.phase > start);
    });
    await check('all spheres stay framed throughout both patterns on desktop and phones', async () => {
      const hashes = new Set();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const round of [0, 1]) {
          await setMotion({ round, selected: [] });
          for (const phase of [0, 45, 90, 180, 270]) {
            await phaseInput(phase);
            const d = await debug();
            assert.equal(d.motionRound, round); assert.equal(d.motionPhase, phase);
            assert(d.motionProjected.every(item => [item.center, item.top, item.bottom].every(p => Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96 && p.z > -1 && p.z < 1)));
            hashes.add((await capture()).hash);
          }
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const choices = await page.locator('[data-walk-motion-choice]').evaluateAll(inputs => inputs.map(input => {
          const rect = input.closest('label').getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }));
        assert.equal(choices.length, 6);
        assert(choices.every(rect => rect.width >= 44 && rect.height >= 44));
        assert(choices.slice(0, 3).every(rect => Math.abs(rect.y - choices[0].y) < 1));
        assert(choices.slice(3).every((rect, index) => Math.abs(rect.y - choices[3].y) < 1 && Math.abs(rect.x - choices[index].x) < 1));
        assert(choices[3].y >= choices[0].y + choices[0].height);
        await capture('motion-' + width); await page.screenshot({ path: path.join(out, 'ui-' + width + '.png'), fullPage: true });
      }
      assert(hashes.size >= 24); return { distinctImages: hashes.size };
    });
    await check('playback is opt-in, reduced-motion aware, pausable and stopped by blur and view changes', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-walk-reset]');
      assert(await page.locator('[data-walk-motion-play]').isDisabled());
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(100);
      assert(!(await page.locator('[data-walk-motion-play]').isDisabled()));
      const before = await capture(); await click('[data-walk-motion-play]'); await page.waitForTimeout(350);
      assert((await state()).motion.phase > 8); assert.notEqual((await capture()).hash, before.hash);
      await click('[data-walk-motion-play]'); const paused = (await state()).motion.phase; await page.waitForTimeout(180); assert.equal((await state()).motion.phase, paused);
      await click('[data-walk-motion-play]'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(100);
      assert.equal(await page.locator('[data-walk-motion-play]').getAttribute('aria-pressed'), 'false');
      const blurred = (await state()).motion.phase; await page.waitForTimeout(180); assert.equal((await state()).motion.phase, blurred);
      await click('[data-walk-motion-play]'); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
      assert(await page.locator('[data-walk-motion-play]').isDisabled()); assert.equal(await page.locator('[data-walk-motion-play]').getAttribute('aria-pressed'), 'false');
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await click('[data-walk-motion-play]'); await click('[data-walk-diagram-toggle]');
      assert.equal(await page.locator('[data-walk-motion-play]').getAttribute('aria-pressed'), 'false'); assert(await page.locator('[data-walk-motion-play]').isDisabled());
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      await click('[data-walk-motion-play]'); await click('[data-walk-activity="shape"]'); const exited = (await state()).motion.phase;
      await page.waitForTimeout(180); assert.equal((await state()).motion.phase, exited); await click('[data-walk-activity="motion"]');
      assert.equal(await page.locator('[data-walk-motion-play]').getAttribute('aria-pressed'), 'false');
    });
    await check('two patterns require motion evidence and preserve earned progress, reveal and notes', async () => {
      await click('[data-walk-reset]'); for (const choice of ['A', 'C', 'E']) await click('[data-walk-motion-choice="' + choice + '"]');
      await click('[data-walk-check]'); assert.deepEqual((await state()).motion.completed, []);
      await phaseInput(90); await phaseInput(180); await click('[data-walk-check]'); assert.deepEqual((await state()).motion.completed, [0]);
      await click('[data-walk-motion-next]'); assert.equal((await state()).motion.round, 1); assert.deepEqual((await state()).motion.selected, []);
      await phaseInput(90); await phaseInput(180); for (const choice of ['B', 'D', 'F']) await click('[data-walk-motion-choice="' + choice + '"]');
      await click('[data-walk-check]'); assert((await state()).progress.motion.solved);
      await click('[data-walk-reveal]'); assert((await state()).progress.motion.solved); assert(!(await state()).progress.motion.assisted); assert((await debug()).motionRevealed);
      const revealed = await capture('motion-reveal'); await phaseInput(270); assert.notEqual((await capture()).hash, revealed.hash);
      await page.locator('[data-walk-note]').fill('The matching three keep their spacing as the phase advances.'); const saved = await state();
      await page.reload(); await open(); assert.deepEqual(await state(), saved); assert.equal(await page.locator('[data-walk-motion-play]').getAttribute('aria-pressed'), 'false');
      assert.equal(await page.evaluate(() => window.__perceptionPreview.state.otherTool.preserved), 37);
    });
    await check('touch scrubber changes phase while vertical gestures preserve page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await click('[data-walk-reset]');
      const cdp = await page.context().newCDPSession(page);
      try {
        const p = await target(null, true), before = await state(); assert.equal(p.hit?.id, 'motion-dial');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 45, y: p.y + 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(180);
        assert((await state()).motion.phase > before.motion.phase); assert.deepEqual((await state()).player, before.player);
        const q = await target(null, true), saved = await state(), scroll = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y - 90 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
        assert.deepEqual((await state()).player, saved.player); assert.equal((await state()).motion.phase, saved.motion.phase); assert.notEqual(await page.evaluate(() => scrollY), scroll);
      } finally { await cdp.detach(); }
    });
    await check('accessible controls and Plan fallback retain phase, selections and reveal', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-walk]'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, count: v.nodes.length })));
      assert.deepEqual(violations, []);
      await click('[data-walk-diagram-toggle]'); const plan = page.locator('[data-walk-motion-plan]'); await plan.waitFor();
      const before = await plan.innerHTML(); await click('[data-walk-motion-forward]'); assert.notEqual(await plan.innerHTML(), before);
      await click('[data-walk-motion-choice="B"]'); assert((await state()).motion.selected.includes('B'));
      await click('[data-walk-reveal]'); assert.equal(await page.locator('[data-walk-motion-links] polygon').count(), 1);
      await page.screenshot({ path: path.join(out, 'plan.png'), fullPage: true });
      await click('[data-walk-diagram-toggle]'); await page.locator('[data-perception-walk] canvas').waitFor();
      return { axeViolations: violations.length };
    });
    await check('neighbor room and exit preserve progress and stop playback', async () => {
      const before = await state(); await click('[data-walk-activity="shape"]'); await capture('existing-shape');
      await click('[data-walk-activity="motion"]'); assert.deepEqual((await state()).progress, before.progress);
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await click('[data-walk-motion-play]'); await click('[data-walk-close]');
      const closedPhase = (await state()).motion.phase; await page.waitForTimeout(180); assert.equal((await state()).motion.phase, closedPhase);
      assert.equal(await page.locator('[data-perception-walk]').count(), 0); assert.deepEqual(errors, []);
    });
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: true, checks, screenshots, errors }, null, 2));
    console.log('All ' + checks.length + ' motion browser groups passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify({ ok: false, phase, checks, screenshots, errors, failure: error.stack }, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
