'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-gallery', 'followup');

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
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value); await page.waitForTimeout(100);
  };
  const check = async (name, fn) => { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); };
  const capture = async name => {
    const canvas = page.locator('[data-perception-gallery] canvas'); await canvas.scrollIntoViewIfNeeded();
    const stats = pixels(await canvas.screenshot({ path: path.join(out, name + '.png') }));
    assert(stats.colors > 30 && stats.colored > 1000, 'Canvas contains rendered geometry'); screenshots.push({ name, ...stats }); return stats;
  };
  const overview = async () => { await click('[data-gallery-view="gallery"]'); await page.locator('[data-gallery-hotspot]').first().waitFor(); };
  const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow');
  try {
    await page.goto(url); await click('[data-perception-open-gallery]');
    await page.locator('[data-perception-gallery] canvas').waitFor();
    // Capture the real viewer without substituting its renderer or picking implementation.
    await click('[data-gallery-diagram-toggle]');
    await page.evaluate(() => {
      const create = StemLab.PerceptionGalleryScene.createViewer;
      StemLab.PerceptionGalleryScene.createViewer = function () { const viewer = create.apply(this, arguments); window.__followupViewer = viewer; return viewer; };
    });
    await click('[data-gallery-diagram-toggle]'); await page.locator('[data-perception-gallery] canvas').waitFor();
    await check('three accessible hotspots and real WebGL exhibit picking', async () => {
      const results = [];
      for (const id of ['room', 'triangle', 'shape']) {
        await overview(); await page.locator('[data-gallery-render]').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('[data-gallery-hotspot]').count(), 3);
        const point = await page.evaluate(wanted => {
          const canvas = document.querySelector('[data-perception-gallery] canvas'), rect = canvas.getBoundingClientRect();
          for (let y = rect.top + 20; y < rect.bottom - 20; y += 9) for (let x = rect.left + 20; x < rect.right - 20; x += 9) {
            if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) continue;
            if (document.elementFromPoint(x, y) !== canvas) continue;
            if (window.__followupViewer.pickStation(x, y) === wanted) return { x, y };
          }
          return null;
        }, id);
        assert(point, 'A visible mesh can be hit for ' + id);
        await page.mouse.click(point.x, point.y); await page.waitForTimeout(150);
        assert.equal((await state()).perceptionGallery.station, id);
        assert.equal((await state()).perceptionGallery.view, 'illusion');
        assert.equal(await page.locator('[data-gallery-station="' + id + '"]').evaluate(node => node === document.activeElement), true);
        results.push({ id, point });
      }
      await overview(); await capture('desktop-overview');
      await page.locator('[data-gallery-hotspot="triangle"]').focus(); await page.keyboard.press('Enter');
      assert.equal((await state()).perceptionGallery.station, 'triangle');
      return results;
    });
    await check('two hints preserve independent solves and reset cleanly', async () => {
      for (const id of ['room', 'triangle', 'shape']) {
        await click('[data-gallery-station="' + id + '"]'); await click('[data-gallery-reset]');
        await click('[data-gallery-hint]'); await click('[data-gallery-hint]');
        assert.equal(await page.locator('[data-gallery-hints] li').count(), 2);
        assert.equal(await page.locator('[data-gallery-hint]').isDisabled(), true);
        assert.equal((await state()).perceptionGallery.models[id].assisted, false);
        if (id === 'room') await click('[data-gallery-choice="same"]');
        else await range(id === 'shape' ? '[data-gallery-shift]' : '[data-gallery-angle]', 0);
        await click('[data-gallery-check]');
        assert.equal((await state()).perceptionGallery.models[id].solved, true);
        await click('[data-gallery-reset]'); assert.equal((await state()).perceptionGallery.models[id].hints, 0);
      }
    });
    await check('measurement reveals report actual geometry for all three exhibits', async () => {
      const result = {};
      for (const id of ['room', 'triangle', 'shape']) {
        await click('[data-gallery-station="' + id + '"]'); await click('[data-gallery-reveal]');
        result[id] = await page.locator('[data-gallery-measurements="' + id + '"]').innerText();
      }
      assert.match(result.room, /1\.65/); assert.match(result.room, /15\.60/); assert.match(result.room, /10\.00/); assert.match(result.room, /1\.56/);
      assert.match(result.triangle, /3/); assert.match(result.shape, /5\.20/); assert.match(result.shape, /10/);
      return result;
    });
    await check('saved/current comparison is read-only and restores draft camera and focus', async () => {
      await click('[data-gallery-station="shape"]'); await click('[data-gallery-reset]');
      await range('[data-gallery-shift]', 0); await page.locator('[data-gallery-note]').fill('Saved aligned star');
      await click('[data-gallery-view="inspect"]'); await range('[data-gallery-yaw]', 40); await range('[data-gallery-pitch]', 12);
      await click('[data-gallery-save]'); const record = (await state()).perceptionGallery.observations[0];
      await range('[data-gallery-shift]', 50); await page.locator('[data-gallery-note]').fill('Current scattered star');
      await range('[data-gallery-yaw]', -20); await range('[data-gallery-pitch]', 5);
      const before = await state();
      await click('[data-gallery-compare="' + record.id + '"]');
      assert.equal(await page.locator('[data-gallery-comparison] h3').evaluate(node => document.activeElement === node), true);
      assert.equal(await page.locator('[data-gallery-note], [data-gallery-yaw], [data-gallery-check]').count(), 0);
      assert(await page.locator('[data-gallery-view]').evaluateAll(nodes => nodes.every(node => node.disabled)));
      const notes = await page.locator('.pg-compare-notes').innerText();
      assert.match(notes, /Saved aligned star/); assert.match(notes, /Current scattered star/);
      const saved = await capture('comparison-saved'); await click('[data-gallery-compare-view="current"]'); const current = await capture('comparison-current');
      assert.notEqual(saved.hash, current.hash);
      const canvas = await page.locator('[data-gallery-render]').boundingBox();
      await page.mouse.move(canvas.x + 100, canvas.y + 100); await page.mouse.down(); await page.mouse.move(canvas.x + 150, canvas.y + 120); await page.mouse.up();
      assert.deepEqual(await state(), before);
      await page.screenshot({ path: path.join(out, 'comparison-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 320, height: 844 }); await fit();
      await page.screenshot({ path: path.join(out, 'comparison-mobile-320.png'), fullPage: true });
      await capture('comparison-mobile-canvas');
      await page.setViewportSize({ width: 1440, height: 1000 });
      await click('[data-gallery-compare-close]');
      assert.equal(await page.locator('[data-gallery-compare="' + record.id + '"]').evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator('[data-gallery-yaw]').inputValue(), '-20'); assert.equal(await page.locator('[data-gallery-pitch]').inputValue(), '5');
      assert.equal(await page.locator('[data-gallery-note]').inputValue(), 'Current scattered star'); assert.deepEqual(await state(), before);
      return { recordId: record.id, saved: saved.hash, current: current.hash };
    });
    await check('changed or deleted saved records safely close comparison', async () => {
      let id = (await state()).perceptionGallery.observations[0].id;
      await click('[data-gallery-compare="' + id + '"]');
      await page.evaluate(() => window.__perceptionPreview.replace(data => ({ ...data, perceptionGallery: { ...data.perceptionGallery, observations: data.perceptionGallery.observations.map((record, index) => index ? record : ({ ...record, model: { ...record.model, note: 'Changed externally' } })) } })));
      await page.locator('[data-gallery-comparison]').waitFor({ state: 'detached' });
      assert.equal(await page.locator('[data-gallery-note]').inputValue(), 'Current scattered star');
      await click('[data-gallery-compare="' + id + '"]');
      await page.evaluate(() => window.__perceptionPreview.replace(data => ({ ...data, perceptionGallery: { ...data.perceptionGallery, observations: [] } })));
      await page.locator('[data-gallery-comparison]').waitFor({ state: 'detached' });
      assert.equal(await page.locator('[data-gallery-notebook-heading]').evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator('[data-gallery-yaw]').inputValue(), '-20');
    });
    await check('phone hotspots fit and touch scrolling never picks an exhibit', async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await overview();
      await page.locator('[data-gallery-render]').scrollIntoViewIfNeeded();
      const bounds = await page.locator('[data-gallery-hotspot]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }));
      assert.equal(bounds.length, 3); bounds.forEach(r => { assert(r.left >= 0 && r.right <= 320); assert(r.width >= 44 && r.height >= 44); }); await fit();
      await capture('mobile-overview');
      await page.screenshot({ path: path.join(out, 'overview-mobile-320.png'), fullPage: true });
      const box = await page.locator('[data-gallery-render]').boundingBox(), start = await page.evaluate(() => scrollY), before = await state();
      const cdp = await page.context().newCDPSession(page), x = box.x + box.width / 2, y = Math.min(700, box.y + box.height * .7);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let index = 1; index <= 5; index++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 24 }] }); await page.waitForTimeout(45); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
      const end = await page.evaluate(() => scrollY); assert(end > start + 20, 'A vertical touch gesture scrolls the page'); assert.deepEqual(await state(), before); await cdp.detach();
      return { start, end, bounds };
    });
    await check('comparison and hotspot interfaces pass accessibility checks', async () => {
      await click('[data-gallery-station="shape"]'); await click('[data-gallery-save]'); const id = (await state()).perceptionGallery.observations[0].id;
      await click('[data-gallery-compare="' + id + '"]');
      await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-gallery]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []); await click('[data-gallery-compare-close]'); await overview();
      const hotspotViolations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-gallery]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => item.id));
      assert.deepEqual(hotspotViolations, []);
    });
    await check('fallback overview retains three keyboard-accessible station choices', async () => {
      await page.goto(url + '?no-webgl=1'); await click('[data-perception-open-gallery]'); await page.locator('[data-gallery-retry]').waitFor(); await overview();
      assert.equal(await page.locator('[data-gallery-diagram]').count(), 1); assert.equal(await page.locator('[data-gallery-hotspot]').count(), 3);
      assert.equal(await page.locator('[data-perception-gallery] canvas').count(), 0);
      await page.locator('[data-gallery-hotspot="shape"]').focus(); await page.keyboard.press('Enter');
      assert.equal((await state()).perceptionGallery.station, 'shape'); assert.equal((await state()).perceptionGallery.view, 'illusion');
      await fit(); await page.screenshot({ path: path.join(out, 'fallback-mobile-320.png'), fullPage: true });
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks, screenshots, errors }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, screenshots: screenshots.length, output: out }));
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ phase, message: error.message, stack: error.stack, checks, screenshots, errors }, null, 2) + '\n'); throw error;
  } finally { await browser.close(); }
}

(async () => {
  const server = await serve();
  try { await run('http://127.0.0.1:' + server.address().port + '/dev-tools/perception_lab_gallery_preview.html'); }
  finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
