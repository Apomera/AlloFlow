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
const before = process.argv.includes('--before'), sourceHash = hash(fs.readFileSync('stem_lab/stem_tool_physics.js'));
const configurations = [], failures = [];
async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(50);
}
async function launch(page, velocity) {
  await patch(page, { angle: 45, velocity, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 1 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => { const cv = document.getElementById('physicsCanvas'); let count = 0; while (cv._launched && count++ < 10000) window.__trialTick(); if (cv._launched) throw Error('Trial audit did not land'); });
  await page.waitForTimeout(60);
}
async function evidence(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'), d = window.__reviewState.physics;
    return { ball: cv._ball, log: d.runLog, lastFlight: d.lastFlight, trails: cv._trails.map(t => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })) };
  });
}
async function textAudit(root) {
  return root.evaluate(root => {
    const lum = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
    const readings = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement; if (!node.textContent.trim() || !el.getClientRects().length || el.closest('[aria-hidden="true"]')) continue;
      const s = getComputedStyle(el); let bg;
      for (let parent = el; parent; parent = parent.parentElement) { const color = getComputedStyle(parent).backgroundColor; if (/^rgb\(/.test(color)) { bg = color; break; } }
      if (!bg) throw Error('Missing text background');
      const a = lum(s.color), b = lum(bg); readings.push({ text: node.textContent.trim(), font: parseFloat(s.fontSize), contrast: (Math.max(a,b) + .05) / (Math.min(a,b) + .05) });
    }
    return readings;
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of before ? ['default'] : ['default', 'dark', 'contrast']) for (const width of before ? [1100,320] : [1100,375,320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        await page.evaluate(() => { let id = 0, now = 1000; const frames = new Map(); window.requestAnimationFrame = cb => { frames.set(++id,cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key); window.__trialTick = () => { now += 1000/60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); }; });
        await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' },theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
        for (const velocity of [15,30,20]) await launch(page, velocity);
        await patch(page, { velocity: 30, investigationOpen: true, investigationDraft: { activityId: 'speed_squared', title: 'Testing launch speed', question: 'How does speed change range?', prediction: 'Four times the range.', observation: 'Keep my writing.', selectedRunIds: [3] } });
        const original = await evidence(page), root = page.locator('[data-physics-investigation-activity]').locator('..');
        const file = `trials-${before ? 'before-' : ''}${theme}-${width}.png`;
        await root.screenshot({ path: path.join(__dirname,file), animations: 'disabled' });
        const layout = await root.evaluate(el => ({ panelWidth: el.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - innerWidth, controls: [...el.querySelectorAll('button,select')].map(n => n.getBoundingClientRect().height) }));
        assert.equal(layout.overflow,0); assert(layout.controls.every(h => h >= 44)); assert.deepEqual(errors,[]);
        const result = { theme, width, ...layout, screenshots: [file], pageErrors: errors, evidenceSha256: hash(original) };
        if (!before) {
          assert.equal(await root.locator('[data-physics-investigation-trial-evidence="1"]').getAttribute('data-matched-run'),'1');
          assert.equal(await root.locator('[data-physics-investigation-trial-evidence="2"]').getAttribute('data-matched-run'),'2');
          const text = await textAudit(root); assert(text.every(t => t.font >= 12 && t.contrast >= 4.5)); result.text = text;
          await root.locator('[data-physics-investigation-select-trials]').click();
          const selector = page.locator('[data-physics-investigation-reference]');
          await selector.selectOption('2');
          assert.deepEqual(await page.evaluate(() => window.__reviewState.physics.investigationDraft.selectedRunIds),[2,1]);
          assert.deepEqual(await evidence(page),original);
          assert.equal(await page.locator('[data-physics-investigation-comparison]').getAttribute('data-reference-run'),'2');
          if (theme === 'default' && width !== 375) { const selection = `trial-selection-${width}.png`; await selector.locator('xpath=ancestor::fieldset').screenshot({ path: path.join(__dirname,selection), animations: 'disabled' }); result.screenshots.push(selection); }
          await root.locator('[data-physics-investigation-launch-link]').click();
          assert(await page.locator('[data-physics-launch]').evaluate(el => el === document.activeElement));
          assert.deepEqual(await evidence(page),original); result.evidenceUnchanged = true;
        }
        configurations.push(result); console.log(`Verified ${before ? 'previous ' : ''}guided trials ${theme} at ${width}px`);
      } catch (error) { failures.push({ theme, width, message: error.message, pageErrors: errors }); throw error; }
      finally { await page.close(); }
    }
    assert.equal(hash(fs.readFileSync('stem_lab/stem_tool_physics.js')),sourceHash,'Source changed during audit');
  } finally {
    await browser.close(); fs.writeFileSync(path.join(__dirname,before ? 'trials-before-results.json' : 'trials-results.json'),JSON.stringify({ createdAt: new Date().toISOString(), sourceSha256: sourceHash, passed: configurations.length === (before ? 2 : 9) && !failures.length, configurations, failures },null,2));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
