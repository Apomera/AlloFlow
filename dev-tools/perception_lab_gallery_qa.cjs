'use strict';

// Real Three.js r128, local React, and Chromium; no CDN or WebGL substitution.
// `node dev-tools/perception_lab_gallery_qa.cjs --serve --port=47931` opens a reusable preview server.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'perception-gallery');
const previewPath = '/dev-tools/perception_lab_gallery_preview.html';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filename;
      try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
      catch (_) { res.writeHead(400).end(); return; }
      const relative = path.relative(root, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative) || /(^|[\\/])\.(git|aws|codex)([\\/]|$)/.test(relative)) {
        res.writeHead(403).end(); return;
      }
      fs.readFile(filename, (error, data) => {
        if (error) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function pixelStats(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  let opaque = 0, colored = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    if (a > 0) opaque++;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    colors.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  return { width: png.width, height: png.height, colors: colors.size, opaque, colored,
    hash: crypto.createHash('sha256').update(buffer).digest('hex') };
}

async function run(url) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], checks = [], screenshots = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  let phase = 'open';
  const state = () => page.evaluate(() => window.__perceptionPreview.state);
  async function check(name, fn) { phase = name; const detail = await fn(); checks.push({ name, detail }); console.log('PASS: ' + name); }
  async function capture(name) {
    const canvas = page.locator('[data-perception-gallery] canvas');
    await canvas.scrollIntoViewIfNeeded();
    const buffer = await canvas.screenshot({ path: path.join(out, name + '.png') });
    const pixels = pixelStats(buffer);
    assert(pixels.width >= 250 && pixels.height >= 220, 'A usable canvas must remain visible');
    assert(pixels.colors > 30 && pixels.colored > 1000, 'Scene must contain rendered geometry and color');
    screenshots.push({ name, pixels });
    return pixels;
  }
  async function openGallery() {
    await page.locator('[data-perception-open-gallery]').click();
    await page.locator('[data-perception-gallery] canvas').waitFor();
    await page.waitForTimeout(250);
  }
  async function click(selector) { await page.locator(selector).click(); await page.waitForTimeout(100); }
  async function range(selector, value) {
    await page.locator(selector).evaluate((node, next) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(next));
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForTimeout(100);
  }
  try {
    await page.goto(url);
    await page.locator('[data-perception-open-gallery]').waitFor();
    await check('2D experiments remain the initial experience', async () => {
      assert.equal(await page.locator('[data-perception-gallery]').count(), 0);
      assert.equal(await page.locator('#perception-stage-current').count(), 1);
    });
    await openGallery();
    await check('gallery is a real WebGL scene', async () => {
      assert.equal(await page.locator('[data-perception-gallery] canvas').count(), 1);
      const gl = await page.locator('[data-perception-gallery] canvas').evaluate(canvas => {
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return context && { version: context.getParameter(context.VERSION), lost: context.isContextLost() };
      });
      assert(gl && !gl.lost); return { gl, pixels: await capture('desktop-gallery') };
    });
    await check('station views change real canvas pixels', async () => {
      const result = [];
      for (const station of ['room', 'triangle', 'shape']) {
        await click('[data-gallery-station="' + station + '"]');
        await click('[data-gallery-view="illusion"]');
        const illusion = await capture('desktop-' + station + '-illusion');
        await click('[data-gallery-view="inspect"]');
        const inspect = await capture('desktop-' + station + '-inspect');
        assert.notEqual(illusion.hash, inspect.hash, station + ' must expose depth from a second viewpoint');
        result.push({ station, illusion: illusion.hash, inspect: inspect.hash });
      }
      return result;
    });
    await page.screenshot({ path: path.join(out, 'desktop-ui.png'), fullPage: true });
    await check('alignment puzzles distinguish independent and assisted solutions', async () => {
      await click('[data-gallery-station="triangle"]');
      await range('[data-gallery-angle]', 0);
      await click('[data-gallery-check]');
      assert.equal((await state()).perceptionGallery.models.triangle.solved, true);
      await capture('desktop-triangle-aligned');
      await click('[data-gallery-station="shape"]');
      await click('[data-gallery-reveal]');
      await click('[data-gallery-solution]');
      await click('[data-gallery-check]');
      assert.equal((await state()).perceptionGallery.models.shape.solved, false);
      assert.equal((await state()).perceptionGallery.models.shape.assisted, true);
      await capture('desktop-shape-aligned');
      return { independentTriangle: true, assistedShape: true };
    });
    await check('room prediction, reveal, and saved observation', async () => {
      await click('[data-gallery-station="room"]');
      await click('[data-gallery-view="illusion"]');
      await click('[data-gallery-choice="same"]');
      await click('[data-gallery-check]');
      await click('[data-gallery-reveal]');
      await range('[data-gallery-yaw]', 40); await range('[data-gallery-pitch]', 12);
      await page.locator('[data-gallery-note]').fill('The two objects keep their physical height.');
      await click('[data-gallery-save]');
      assert.equal((await state()).otherTool.preserved, 37);
      const saved = (await state()).perceptionGallery.observations[0];
      assert.deepEqual(saved.camera, { y: 40, x: 12 });
      await range('[data-gallery-yaw]', -20);
      await page.locator('[data-gallery-note]').fill('Changed draft');
      await page.locator('[data-gallery-record] button').first().click();
      assert.equal(await page.locator('[data-gallery-yaw]').inputValue(), '40');
      assert.equal(await page.locator('[data-gallery-pitch]').inputValue(), '12');
      assert.equal(await page.locator('[data-gallery-note]').inputValue(), saved.model.note);
      return (await state()).perceptionGallery;
    });
    await check('gallery progress survives returning to 2D and reload', async () => {
      const before = JSON.stringify((await state()).perceptionGallery);
      await click('[data-gallery-close]');
      assert.equal(await page.locator('[data-perception-gallery]').count(), 0);
      assert.equal(await page.locator('#perception-stage-current').count(), 1);
      await page.reload(); await openGallery();
      assert.equal(JSON.stringify((await state()).perceptionGallery), before);
    });
    await check('phone scene and controls fit and remain interactive', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await click('[data-gallery-station="triangle"]');
      await click('[data-gallery-view="illusion"]');
      const before = await capture('phone-triangle-illusion');
      await range('[data-gallery-angle]', 20);
      const after = await capture('phone-triangle-adjusted');
      assert.notEqual(before.hash, after.hash);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: path.join(out, 'phone-ui.png'), fullPage: true });
      return { before, after };
    });
    await check('keyboard camera adjustment and diagram switching preserve the puzzle', async () => {
      await click('[data-gallery-view="inspect"]');
      const yaw = page.locator('[data-gallery-yaw]');
      await yaw.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await yaw.inputValue(), '1');
      const before = JSON.stringify((await state()).perceptionGallery);
      await click('[data-gallery-diagram-toggle]');
      assert.equal(await page.locator('[data-gallery-diagram]').count(), 1);
      assert.equal(await page.locator('[data-perception-gallery] canvas').count(), 0);
      await click('[data-gallery-diagram-toggle]');
      await page.locator('[data-perception-gallery] canvas').waitFor();
      assert.equal(JSON.stringify((await state()).perceptionGallery), before);
    });
    await check('gallery satisfies automated accessibility checks', async () => {
      await page.addScriptTag({ path: path.join(root, 'node_modules', 'axe-core', 'axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-gallery]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      assert.deepEqual(violations, []); return violations;
    });
    await check('closing the gallery removes its canvas', async () => {
      await click('[data-gallery-close]');
      assert.equal(await page.locator('[data-perception-gallery] canvas').count(), 0);
      await page.evaluate(() => window.__perceptionPreview.unmount());
      assert.equal(await page.locator('canvas').count(), 0);
    });
    await check('WebGL failure leaves an interactive diagram and can recover', async () => {
      await page.goto(url + '?no-webgl=1');
      await page.locator('[data-perception-open-gallery]').click();
      await page.locator('[data-gallery-retry]').waitFor();
      assert.equal(await page.locator('[data-gallery-diagram]').count(), 1);
      await click('[data-gallery-station="shape"]');
      await click('[data-gallery-reset]');
      await click('[data-gallery-reveal]');
      await click('[data-gallery-solution]');
      const starCenters = await page.locator('[data-gallery-diagram] polygon').evaluateAll(nodes => nodes.map(node => node.getAttribute('points').split(' ')[0]));
      assert.equal(starCenters.length, 10);
      assert.deepEqual([...new Set(starCenters)], ['400,250'], 'Show aligned view must join the diagram fragments');
      await range('[data-gallery-shift]', 0);
      await click('[data-gallery-check]');
      await click('[data-gallery-save]');
      assert.equal((await state()).perceptionGallery.observations.length, 2);
      await page.screenshot({ path: path.join(out, 'phone-fallback.png'), fullPage: true });
      await click('[data-gallery-station="triangle"]');
      await click('[data-gallery-reset]');
      await click('[data-gallery-reveal]');
      await click('[data-gallery-solution]');
      const beams = await page.locator('[data-gallery-diagram] line').evaluateAll(nodes => nodes.map(node => ({
        start: [Number(node.getAttribute('x1')), Number(node.getAttribute('y1'))],
        end: [Number(node.getAttribute('x2')), Number(node.getAttribute('y2'))]
      })));
      assert.equal(beams.length, 3);
      beams.forEach((beam, index) => assert.deepEqual(beam.end, beams[(index + 1) % beams.length].start, 'Show aligned view must join the diagram beams'));
      await page.evaluate(() => { StemLab.ensureThree = () => Promise.resolve(THREE); });
      await click('[data-gallery-retry]');
      await page.locator('[data-perception-gallery] canvas').waitFor();
      await capture('phone-recovered');
      await page.evaluate(() => window.__perceptionPreview.unmount());
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks, screenshots, errors }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, screenshots: screenshots.length, output: out }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ phase, message: error.message, stack: error.stack, checks, screenshots, errors }, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
}

(async () => {
  const serve = process.argv.includes('--serve');
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  const port = portArg ? Number(portArg.split('=')[1]) : serve ? 47931 : 0;
  let server;
  try { server = await startServer(port); }
  catch (error) { if (error.code !== 'EADDRINUSE') throw error; server = await startServer(0); }
  const url = 'http://127.0.0.1:' + server.address().port + previewPath;
  console.log(url);
  if (serve) return;
  try { await run(url); } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
