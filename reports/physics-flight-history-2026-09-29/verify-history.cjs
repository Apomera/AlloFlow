// Run from the repository root. Uses actual React, application styles and strings.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
let fixture = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
fixture = fixture.replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
fixture += '\nglobalThis.makePhysicsPage = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(fixture, sandbox);
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const sourceHash = hash(fs.readFileSync('stem_lab/stem_tool_physics.js'));
const results = [], failures = [];
let passed = false;
async function patch(page, value) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), value);
  await page.waitForTimeout(60);
}
async function draw(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas');
    window.__historyText = []; window.__captureHistory = true;
    try { cv._physScheduleFrame(); window.__historyTick(); }
    finally { window.__captureHistory = false; }
    return { width: cv.getBoundingClientRect().width, height: cv.getBoundingClientRect().height, text: window.__historyText };
  });
}
async function launch(page, drag, count) {
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag, simSpeed: 2, showEnergy: true, showVectors: true, showGraphs: true, showFlightData: true, showOverlay: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'); let i = 0;
    while (cv._launched && i++ < 10000) window.__historyTick();
    if (cv._launched) throw Error('Audit flight did not land');
  });
  await page.waitForFunction(n => window.__reviewState.physics.runCount === n, count, { polling: 20 });
}
async function evidence(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas');
    return { ball: cv._ball, trails: cv._trails.map(t => ({ points: [...t], parameters: t.parameters, apex: t.apex, run: t.run, modelVersion: t.modelVersion })),
      records: window.__reviewState.physics.runLog, lastFlight: window.__reviewState.physics.lastFlight };
  });
}
async function textAudit(page) {
  return page.evaluate(() => {
    const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
    const paint = pixel.getContext('2d');
    const rgba = color => { paint.clearRect(0, 0, 1, 1); paint.fillStyle = color; paint.fillRect(0, 0, 1, 1); return [...paint.getImageData(0, 0, 1, 1).data]; };
    const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const readings = [];
    for (const root of document.querySelectorAll('[data-physics-flight-history],[data-physics-graph-flight],[data-physics-run-inspect]')) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!node.textContent.trim() || !el.getClientRects().length || el.closest('option,[aria-hidden="true"]')) continue;
        const style = getComputedStyle(el), a = lum(rgba(style.color));
        let bg;
        for (let parent = el; parent; parent = parent.parentElement) { const c = rgba(getComputedStyle(parent).backgroundColor); if (c[3] === 255) { bg = c; break; } }
        if (!bg) throw Error('Missing opaque background for ' + node.textContent);
        const b = lum(bg);
        readings.push({ text: node.textContent.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) });
      }
    }
    return readings;
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        await page.evaluate(() => {
          let id = 0, now = 1000;
          const frames = new Map();
          window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
          window.cancelAnimationFrame = key => frames.delete(key);
          window.__historyTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
          window.__historyText = [];
          const original = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
            if (this.canvas.id === 'physicsCanvas' && window.__captureHistory) {
              const m = this.measureText(String(text)), t = this.getTransform(), rect = this.canvas.getBoundingClientRect();
              const rx = this.canvas.width / rect.width, ry = this.canvas.height / rect.height;
              const corners = [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent]].map(([px, py]) => ({ x: (t.a * px + t.c * py + t.e) / rx, y: (t.b * px + t.d * py + t.f) / ry }));
              window.__historyText.push({ text: String(text), left: corners[0].x, right: corners[1].x, top: corners[0].y, bottom: corners[1].y });
            }
            if (maxWidth === undefined) original.call(this, text, x, y); else original.call(this, text, x, y, maxWidth);
          };
        });
        await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
        await launch(page, false, 1); await launch(page, true, 2);
        await patch(page, { angle: 5, velocity: 5, launchHeight: 30, mass: 9 });
        const before = await evidence(page);
        await page.locator('[data-physics-history-select]').selectOption('0');
        await page.locator('[data-physics-sample-jump="highest"]').click();
        const canvas = await draw(page);
        for (const t of canvas.text) assert(t.left >= -1 && t.right <= canvas.width + 1 && t.top >= -1 && t.bottom <= canvas.height + 1, 'Canvas text clipped: ' + t.text);
        const readings = await textAudit(page);
        assert(readings.length >= 5);
        assert(readings.every(t => t.font >= 11.99 && t.contrast >= 4.5), 'History text contrast or font failed: ' + JSON.stringify(readings));
        const selection = await page.evaluate(() => {
          const cv = document.getElementById('physicsCanvas'), s = cv._inspection.snapshot;
          return { snapshot: s, marker: cv._visualInspection, graphRun: document.querySelector('[data-physics-graph-flight]').dataset.physicsGraphFlight,
            tableRun: document.querySelector('[data-physics-flight-summary]').dataset.run, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        assert.equal(selection.snapshot.run, 1); assert.equal(selection.graphRun, '1'); assert.equal(selection.tableRun, '1'); assert(selection.overflow <= 1);
        assert.deepEqual(selection.snapshot.parameters, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, modelVersion: 'projectile-v3' });
        assert.deepEqual(await evidence(page), before);
        const screenshots = [];
        for (const [name, selector] of [['canvas', '#physics-fs-wrap'], ['chooser', '[data-physics-flight-history]'], ['inspector', '[data-physics-sample-inspector]'], ['graphs', '[data-physics-motion-panel]']]) {
          const file = `history-${theme}-${width}-${name}.png`;
          await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); screenshots.push(file);
        }
        await page.locator('[data-physics-history-select]').selectOption('1'); await draw(page);
        assert.equal(await page.locator('[data-physics-graph-flight]').getAttribute('data-physics-graph-flight'), '2');
        assert.deepEqual(await evidence(page), before); assert.deepEqual(errors, []);
        results.push({ theme, width, ...selection, evidenceSha256: hash(before), evidenceUnchanged: true, canvas, text: readings, screenshots, pageErrors: errors });
        console.log(`Verified history ${theme} at ${width}px`);
      } catch (error) { failures.push({ theme, width, message: error.message, pageErrors: errors }); throw error; }
      finally { await page.close(); }
    }
    assert.equal(hash(fs.readFileSync('stem_lab/stem_tool_physics.js')), sourceHash, 'Physics changed during audit');
    passed = results.length === 9;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'history-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), sourceSha256: sourceHash, passed, configurations: results, failures }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
