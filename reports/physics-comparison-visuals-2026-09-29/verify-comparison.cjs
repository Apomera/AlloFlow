// Run from the repository root; --before captures the previous comparison layout.
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
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const before = process.argv.includes('--before');
const sourceHash = hash(fs.readFileSync('stem_lab/stem_tool_physics.js'));
const results = [], failures = [];
let passed = false;
async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(50);
}
async function finish(page) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'); let count = 0;
    while (cv._launched && count++ < 10000) window.__comparisonTick();
    if (cv._launched) throw Error('Comparison audit flight did not land');
  });
}
async function evidence(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'), d = window.__reviewState.physics;
    return { ball: cv._ball, trails: cv._trails.map(t => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })), log: d.runLog, lastFlight: d.lastFlight, comparison: d.modelComparison };
  });
}
async function textAudit(page) {
  return page.locator('[data-physics-model-comparison]').evaluate(root => {
    const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
    const paint = pixel.getContext('2d');
    const rgba = value => { paint.clearRect(0,0,1,1); paint.fillStyle = value; paint.fillRect(0,0,1,1); return [...paint.getImageData(0,0,1,1).data]; };
    const lum = color => color.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), readings = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!node.textContent.trim() || !el.getClientRects().length || el.closest('[aria-hidden="true"],.sr-only')) continue;
      const s = getComputedStyle(el), a = lum(rgba(s.color)); let bg;
      for (let parent = el; parent; parent = parent.parentElement) { const c = rgba(getComputedStyle(parent).backgroundColor); if (c[3] === 255) { bg = c; break; } }
      if (!bg) throw Error('Missing opaque background');
      const b = lum(bg); readings.push({ text: node.textContent.trim(), font: parseFloat(s.fontSize), contrast: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) });
    }
    return readings;
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of before ? ['default'] : ['default','dark','contrast']) for (const width of before ? [1100,320] : [1100,375,320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        await page.evaluate(() => {
          let id = 0, now = 1000; const frames = new Map();
          window.requestAnimationFrame = cb => { frames.set(++id,cb); return id; };
          window.cancelAnimationFrame = key => frames.delete(key);
          window.__comparisonTick = () => { now += 1000/60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
        });
        await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._startModelComparison, null, { polling: 20 });
        const parameters = { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10 };
        await patch(page, { ...parameters, airResist: true, simSpeed: 2, showEnergy: true });
        await page.locator('[data-physics-model-comparison-start]').click();
        await finish(page);
        await page.waitForFunction(() => document.getElementById('physicsCanvas')._trails.length === 2, null, { polling: 20 });
        await finish(page);
        await page.waitForFunction(() => !!window.__reviewState.physics.modelComparison, null, { polling: 20 });
        const original = await evidence(page);
        await patch(page, { angle: 80, velocity: 5, gravity: 1, mass: 9, launchHeight: 30 });
        const panel = page.locator('[data-physics-model-comparison]');
        const screenshots = [];
        const file = `${before ? 'comparison-before' : 'comparison'}-${theme}-${width}.png`;
        await panel.screenshot({ path: path.join(__dirname,file), animations: 'disabled' }); screenshots.push(file);
        const layout = await panel.evaluate(root => ({ panelWidth: root.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - innerWidth,
          bars: [...root.querySelectorAll('[data-physics-comparison-bar]')].map(bar => ({ key: bar.dataset.comparisonKey, model: bar.dataset.physicsComparisonBar, value: Number(bar.dataset.value), scale: Number(bar.dataset.scaleMax), width: bar.getBoundingClientRect().width, trackWidth: bar.parentElement.getBoundingClientRect().width })) }));
        assert(layout.overflow <= 1);
        if (!before) {
          assert.equal(layout.bars.length, 6);
          for (const bar of layout.bars) {
            const expected = original.comparison[bar.model][bar.key];
            assert.equal(bar.value, expected); assert.equal(bar.scale, Math.max(original.comparison.vacuum[bar.key],original.comparison.drag[bar.key]));
            assert(Math.abs(bar.width - bar.trackWidth * (bar.scale ? bar.value / bar.scale : 0)) < .05, 'Bar length does not match captured values');
          }
          await panel.locator('[data-physics-comparison-exact] summary').click();
          const exactFile = `comparison-${theme}-${width}-exact.png`;
          await panel.screenshot({ path: path.join(__dirname,exactFile), animations: 'disabled' }); screenshots.push(exactFile);
          const text = await textAudit(page);
          assert(text.length >= 25 && text.every(t => t.font >= 11.99 && t.contrast >= 4.5), 'Comparison text audit failed: ' + JSON.stringify(text));
          layout.text = text;
          assert.deepEqual(await evidence(page), original);
          await panel.locator('[data-physics-comparison-inspect="vacuum"]').click();
          await page.waitForFunction(() => document.getElementById('physicsCanvas')._inspection?.snapshot.run === 1, null, { polling: 20 });
          await panel.locator('[data-physics-comparison-inspect="drag"]').click();
          await page.waitForFunction(() => document.getElementById('physicsCanvas')._inspection?.snapshot.run === 2, null, { polling: 20 });
          assert.deepEqual(await evidence(page), original);
        }
        assert.deepEqual(original.comparison.parameters, parameters); assert.deepEqual(errors, []);
        results.push({ theme, viewportWidth: width, ...layout, comparison: original.comparison, evidenceSha256: hash(original), evidenceUnchanged: true, screenshots, pageErrors: errors });
        console.log(`Verified ${before ? 'previous ' : ''}comparison ${theme} at ${width}px`);
      } catch (error) { failures.push({ theme, width, message: error.message, pageErrors: errors }); throw error; }
      finally { await page.close(); }
    }
    assert.equal(hash(fs.readFileSync('stem_lab/stem_tool_physics.js')),sourceHash,'Physics source changed during audit');
    passed = results.length === (before ? 2 : 9);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, before ? 'comparison-before-results.json' : 'comparison-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), sourceSha256: sourceHash, passed, configurations: results, failures },null,2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
