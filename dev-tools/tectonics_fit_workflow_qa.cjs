'use strict';

const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-fit-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], accessibility: [], errors: [] };
  page.on('pageerror', error => report.errors.push(String(error)));
  const check = async (name, run) => {
    try { const detail = await run(); report.checks.push({ name, passed: true, detail }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, error: String(error) }); console.error('FAIL', name, String(error)); }
  };
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Continent puzzle learning review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { StemLab.ensureThree = () => new Promise(() => {}); StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')), noop = () => {};
      let generation = 0;
      window.qaMount = (dark, seed = {}) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaLog = { xp: [], announcements: [] };
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, simTab: 'fit', ptShelfTopics: { fit: false }, ptDrift: false, ...seed } });
          window.qaData = data;
          return StemLab._registry.plateTectonics.render({
            React, toolData: data, setToolData: setData, isDark: dark, isContrast: false,
            icons: new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) }),
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop,
            announceToSR: text => qaLog.announcements.push(text), awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: fn => ({ onClick: fn }),
            t: (key, fallback) => fallback == null ? key : fallback, props: {}, srOnly: {}, gradeLevel: '7th Grade'
          });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    async function capture(name, selector) {
      const locator = page.locator(selector); await locator.scrollIntoViewIfNeeded();
      await locator.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const file = path.join(out, name + '.png'); await page.screenshot({ path: file });
      const detail = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
      report.captures.push({ name, file, ...detail }); assert.ok(detail.overflow <= 1, 'page horizontal overflow');
    }
    async function audit(name) {
      const violations = await page.evaluate(async () => {
        const result = await axe.run('[data-pt-fit]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
      });
      report.accessibility.push({ name, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
    }
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const prefix = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMount(dark), dark);
      await page.locator('[data-pt-fit-map]').waitFor();
      await check(prefix + ' keyboard moves and rotates with fine controls, without completing', async () => {
        const map = page.locator('[data-pt-fit-map]'); await map.focus();
        await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('['); await page.keyboard.press('Shift+]');
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptFit.draftT), { dx: 200, dy: 200, rot: 4 });
        await page.keyboard.press('Home');
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptFit.draftT), { dx: 0, dy: 0, rot: 0 });
        assert.equal(await page.evaluate(() => !!qaData.plateTectonics.ptFit.fitted), false);
        assert.equal(await map.getAttribute('role'), 'application');
        assert.equal(await map.getAttribute('aria-describedby'), 'pt-fit-map-description pt-fit-keyboard pt-fit-model-accuracy');
        await page.keyboard.press('Tab');
        assert.equal(await map.evaluate(node => node === document.activeElement), false, 'Tab exits the map');
      });
      await check(prefix + ' drag works through visible evidence layers and persists the result', async () => {
        for (const layer of ['meso', 'glosso', 'rocks']) await page.locator('[data-pt-fit-toggle="' + layer + '"]').check();
        await page.locator('[data-pt-fit-map]').scrollIntoViewIfNeeded();
        const point = await page.evaluate(() => {
          const svg = document.querySelector('[data-pt-fit-map]'), p = __alloPtFit.proj(-50.5, -26);
          const screen = new DOMPoint(p[0], -p[1]).matrixTransform(svg.getScreenCTM());
          const target = document.elementFromPoint(screen.x, screen.y);
          return { x: screen.x, y: screen.y, hit: !!target?.hasAttribute('data-pt-fit-sa') };
        });
        assert.equal(point.hit, true, 'Evidence overlay must not intercept South America');
        await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 24, point.y - 10, { steps: 4 }); await page.mouse.up();
        const draft = await page.evaluate(() => qaData.plateTectonics.ptFit.draftT);
        assert.ok(draft.dx > 300 && draft.dy > 100, JSON.stringify(draft));
        await page.locator('[data-pt-fit-fine]').check();
        await page.locator('[data-pt-journey-go="explain"]').click();
        await page.locator('[data-pt-topic-search]').fill('Continent Puzzle');
        await page.getByRole('button', { name: '🧩 Continent Puzzle', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptFit.draftT), draft);
        assert.equal(await page.locator('[data-pt-fit-fine]').isChecked(), true);
        assert.equal(await page.locator('[data-pt-fit-toggle="rocks"]').isChecked(), true);
        await capture(prefix + '-exploration', '[data-pt-fit-map]');
        await audit(prefix + '-exploration');
      });
      await check(prefix + ' deliberate fit accepts geometry while reset preserves accepted evidence and rate', async () => {
        await page.evaluate(dark => {
          const best = __alloPtFit.best();
          qaMount(dark, { ptFit: { draftT: { ...best.t, dx: best.t.dx - 200 }, layers: { meso: true, glosso: true, rocks: true } } });
        }, dark);
        assert.equal(await page.locator('[data-pt-fit-question]').count(), 0);
        await page.locator('[data-pt-fit-map]').focus(); await page.keyboard.press('ArrowRight');
        await page.locator('[data-pt-fit-answer="joined"]').check();
        const accepted = await page.evaluate(() => qaData.plateTectonics.ptFit.t);
        const rate = await page.locator('[data-pt-fit-rate]').getAttribute('data-pt-fit-rate');
        await capture(prefix + '-fitted-map', '[data-pt-fit-map]');
        await capture(prefix + '-evidence', '[data-pt-fit-question]');
        await audit(prefix + '-accepted');
        const bounds = await page.locator('[data-pt-fit-map]').evaluate(svg => {
          const rect = svg.getBoundingClientRect();
          return [...svg.querySelectorAll('text')].map(node => {
            const r = node.getBoundingClientRect(); return { text: node.textContent, left: r.left - rect.left, right: rect.right - r.right, top: r.top - rect.top, bottom: rect.bottom - r.bottom };
          });
        });
        assert.equal(bounds.some(r => Math.min(r.left, r.right, r.top, r.bottom) < -1), false, JSON.stringify(bounds));
        await page.locator('[data-pt-fit-reset]').click();
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptFit.t), accepted);
        assert.equal(await page.locator('[data-pt-fit-rate]').getAttribute('data-pt-fit-rate'), rate);
        assert.equal(await page.locator('[data-pt-fit-gap]').getAttribute('data-pt-fit-close'), 'false');
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptFit.answer), 'joined');
        const metric = await page.evaluate(() => ({ best: __alloPtFit.best().km, threshold: __alloPtFit.best().km * __alloPtFit.CLOSE_FACTOR, accepted: __alloPtFit.gap(qaData.plateTectonics.ptFit.t), text: document.querySelector('[data-pt-fit-accuracy]').textContent }));
        assert.ok(metric.text.includes(Math.floor(metric.threshold).toLocaleString()));
        assert.ok(metric.text.includes(Math.round(metric.best).toLocaleString()));
        return { accepted, rate, metric, labelBounds: bounds };
      });
    }
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(c => !c.passed).length, errors: report.errors.length, captures: report.captures.length }));
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
