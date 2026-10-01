'use strict';

// Full registered tool, local React/Three, real browser interaction. This is an
// exploratory audit: findings are recorded, not silently turned into assertions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const sourcePath = process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js';
const source = read(sourcePath);
const out = path.join(root, 'scratch', 'tectonics-earthquake-readings-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourcePath, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], findings: [], checks: [], errors: [] };
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(String(error)));
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonics general visual review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      window.qaNativeRequestAnimationFrame = requestAnimationFrame.bind(window);
      window.qaNativeCancelAnimationFrame = cancelAnimationFrame.bind(window);
      const fillRect = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function (...args) {
        this.canvas.__qaPaintCalls = (this.canvas.__qaPaintCalls || 0) + 1;
        return fillRect.apply(this, args);
      };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
        const slot = /^M [\d.]+\s+·/.test(text) ? 'metadata' : ['P wave', 'S wave', 'surface waves'].includes(text) ? text : null;
        if (slot) {
          const metric = this.measureText(text), left = x - (this.textAlign === 'center' ? metric.width / 2 : this.textAlign === 'right' ? metric.width : 0);
          this.canvas.__qaSeismoLabels = this.canvas.__qaSeismoLabels || {};
          this.canvas.__qaSeismoLabels[slot] = { text, x: left, y: y - metric.actualBoundingBoxAscent, width: metric.width, height: metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent };
          this.canvas.setAttribute('data-qa-seismogram', 'true');
        }
        return fillText.call(this, text, x, y, ...args);
      };
      let frameId = 0, frameTime = 0;
      const frames = new Map();
      window.requestAnimationFrame = cb => { frames.set(++frameId, cb); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      window.qaFrames = count => {
        for (let i = 0; i < count; i++) {
          frameTime += 1000 / 60;
          for (const [id, cb] of [...frames.entries()]) if (frames.delete(id)) cb(frameTime);
        }
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const noop = () => {};
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      const reactRoot = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaLog = { xp: [], toasts: [], announcements: [] };
      window.qaMount = (dark, seed = {}) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'sim', ptDrift: false, ...seed } });
          window.qaData = data;
          window.qaSet = setData;
          return StemLab._registry.plateTectonics.render({
            React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [],
            addToast: (...args) => qaLog.toasts.push(args), announceToSR: text => qaLog.announcements.push(text),
            awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
            a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null
          });
        }
        ReactDOM.flushSync(() => reactRoot.render(React.createElement(Host, { key: ++generation })));
      };
      window.qaDestroy = () => ReactDOM.flushSync(() => reactRoot.unmount());
    });

    const paint = async () => page.evaluate(() => qaFrames(2));
    const shot = async (selector, name) => {
      await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'center' })); await paint();
      await page.locator(selector).screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' });
      report.captures.push(name + '.png');
    };
    const readout = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-pt-eq-arrival]')].map(node => [node.dataset.ptEqArrival, Number(node.dataset.seconds)])));
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMount(dark, { simTab: 'earthquake', _ptPicked: true, ptShelfTopics: { earthquake: false }, eqMagnitude: 5, eqDistKm: 600 }), dark);
      const panel = page.locator('[data-pt-earthquake-lab]');
      await panel.waitFor(); await paint();
      const magnitude = panel.locator('#pt-eq-magnitude'), distance = panel.locator('#pt-eq-distance');
      const initial = await readout();
      assert.equal(initial.p, 100); assert.equal(initial.s, 600 / 3.5);
      await magnitude.focus(); await page.keyboard.press('ArrowRight'); await paint();
      assert.equal(await magnitude.inputValue(), '5.1');
      assert.deepEqual(await readout(), initial);
      assert.match(await panel.locator('canvas').getAttribute('aria-label'), /magnitude 5.1 at 600 km/);
      await distance.focus(); await page.keyboard.press('Home'); await paint();
      assert.equal(await distance.inputValue(), '100');
      const nearby = await readout();
      assert.equal(nearby.p, 100 / 6); assert.equal(nearby.gap, 100 / 3.5 - 100 / 6);
      await shot('[data-pt-earthquake-lab]', 'nearby-' + name);
      await distance.focus(); await page.keyboard.press('End'); await paint();
      const far = await readout();
      assert.equal(far.p, 2000 / 6); assert.equal(far.s, 2000 / 3.5);
      assert.equal(await magnitude.inputValue(), '5.1');
      assert.match(await panel.locator('[data-pt-eq-gap-distance]').textContent(), /2,000 km/);
      await panel.locator('canvas').evaluate(node => node.scrollIntoView({ block: 'center' })); await paint();
      const canvas = await panel.locator('canvas').evaluate(node => ({ width: node.width, height: node.height, paint: node.__qaPaintCalls, labels: node.__qaSeismoLabels, live: node._seisLive }));
      assert.equal(canvas.live.eqDistKm, 2000); assert.equal(canvas.live.eqMagnitude, 5.1);
      assert(canvas.paint > 0 && canvas.width > 100 && canvas.height > 100);
      for (const expected of ['P wave', 'S wave', 'surface waves']) assert(canvas.labels[expected]);
      await shot('[data-pt-seis-note]', 'measurements-' + name);
      await panel.locator('[data-pt-eq-model-limits] summary').click({ force: true }); await paint();
      assert.equal(await panel.locator('[data-pt-eq-model-limits]').evaluate(node => node.open), true);
      const scales = panel.locator('[data-pt-eq-magnitude-scales]');
      assert.equal(await scales.isVisible(), true);
      assert.match(await scales.textContent(), /ML saturates for large earthquakes.*M2–6\.5/);
      assert.match(await scales.textContent(), /Moment magnitude remains useful for the M8–9/);
      await shot('[data-pt-eq-model-limits]', 'limits-' + name);
      const metrics = await panel.evaluate(node => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        clipped: [...node.querySelectorAll('input,summary,canvas,dd')].filter(el => { const r=el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => el.id || el.tagName),
        minSliderWidth: Math.min(...[...node.querySelectorAll('input[type=range]')].map(el => el.getBoundingClientRect().width)),
        readingFont: getComputedStyle(node.querySelector('[data-pt-eq-arrival]')).fontSize
      }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clipped, []); assert(metrics.minSliderWidth >= 260); assert(parseFloat(metrics.readingFont) >= 14);
      const audit = await page.evaluate(async () => (await axe.run('[data-pt-earthquake-lab]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length })));
      assert.deepEqual(audit, []);
      const beforeIdle = await page.evaluate(() => JSON.stringify({ state: qaData.plateTectonics, xp: qaLog.xp, toasts: qaLog.toasts }));
      await page.waitForTimeout(300); await page.evaluate(() => qaFrames(90));
      assert.equal(await page.evaluate(() => JSON.stringify({ state: qaData.plateTectonics, xp: qaLog.xp, toasts: qaLog.toasts })), beforeIdle);
      const check = { name, passed: true, initial, nearby, far, metrics, audit, keyboard: true, idleUnchanged: true, canvas };
      report.checks.push(check); console.log(name, JSON.stringify(metrics));
    }
    await page.evaluate(() => qaDestroy());
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ layouts: report.checks.length, captures: report.captures.length, errors: report.errors.length, sourceSha256: report.sourceSha256, report: path.join(out, 'results.json') }));
  if (report.errors.length || report.checks.length !== 4) process.exitCode = 1;
})();
