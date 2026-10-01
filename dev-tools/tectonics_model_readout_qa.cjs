'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-model-readout-review/after');
fs.mkdirSync(out, { recursive: true });
const records = {
  convergent: { mode: 'convergent', events: 10, minKm: 10, maxKm: 650, shallow: 4, intermediate: 3, deep: 3, years: 600000, rate: 5 },
  divergent: { mode: 'divergent', events: 4, minKm: 5, maxKm: 30, shallow: 4, intermediate: 0, deep: 0, years: 600000, rate: 5 },
  transform: { mode: 'transform', events: 2, minKm: 5, maxKm: 30, shallow: 2, intermediate: 0, deep: 0, years: 600000, rate: 5 }
};
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const checks = [], captures = [], errors = [], accessibility = [];
  const check = async (name, fn) => {
    try { checks.push({ name, passed: true, detail: await fn() }); console.log('PASS', name); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<html lang="en"><head><title>Tectonics readings QA</title></head><body style="margin:0;font-family:system-ui"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let id = 0, now = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaFrame = (delta = 16) => {
        now = Math.max(now + delta, performance.now());
        const callbacks = [...frames.values()]; frames.clear();
        ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now)));
      };
      window.qaFixedEvents = () => {
        // Event probability, magnitude, deep branch, depth, cross-strike jitter,
        // along-strike location. Only RNG/clock are fixtures; real state logic runs.
        const sequence = [0, 0.5, 0.9, 0.6, 0.5, 0.5]; let index = 0;
        Math.random = () => sequence[index++ % sequence.length];
      };
      window.qaLog = { announcements: [], xp: [], toasts: [] };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('wrap')); let generation = 0;
      function QAHost(props) {
        const [records, setRecords] = React.useState(props.records);
        return React.createElement(AlloTectonicsInteractive, { darkMode: props.dark, isContrast: false, depthRecords: records,
          onRecordDepths: trial => setRecords(previous => ({ ...previous, [trial.mode]: trial })), onClearDepths: () => setRecords({}),
          announceToSR: text => qaLog.announcements.push(text), awardXP: value => qaLog.xp.push(value), addToast: value => qaLog.toasts.push(value) });
      }
      window.qaMount = (dark, records) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        qaLog.announcements = []; qaLog.xp = []; qaLog.toasts = [];
        ReactDOM.flushSync(() => root.render(React.createElement(QAHost, { key: ++generation, dark, records })));
      };
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const settle = async () => { await page.evaluate(() => qaFrame()); await page.evaluate(() => qaFrame()); };
    const state = () => page.evaluate(() => ({ time: document.querySelector('[data-pt-model-reading="time"]').textContent,
      movement: document.querySelector('[data-pt-model-reading="movement"]').textContent,
      log: document.querySelector('[data-pt-quake-log]').getAttribute('data-pt-quake-log'),
      paused: [...document.querySelectorAll('button')].some(button => button.textContent === '▶ Play'),
      announcements: qaLog.announcements.length, xp: qaLog.xp.length, toasts: qaLog.toasts.length }));
    const shot = async (selector, name) => {
      if (selector === '#pt-boundary-simulator') {
        // A whole-panel shot centers a >2000px element. That leaves WebGL
        // offscreen, where its renderer correctly defers painting. Capture the
        // model and readings together while both are actually in the viewport.
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle();
        const clip = await page.locator(selector).evaluate(node => {
          const panel = node.getBoundingClientRect(), canvas = node.querySelector('[data-tect-gl]').getBoundingClientRect();
          return { x: panel.x, y: panel.y, width: panel.width, height: canvas.bottom - panel.top + 6 };
        });
        await page.screenshot({ path: path.join(out, `${name}.png`), clip, animations: 'allow' });
        captures.push(name); return;
      }
      await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'center' }));
      await settle();
      await page.locator(selector).screenshot({ path: path.join(out, `${name}.png`), animations: 'allow', timeout: 60000 });
      captures.push(name);
    };
    for (const [dark, width] of [[false, 1100], [true, 390]]) {
      const tag = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ dark, records }) => qaMount(dark, records), { dark, records });
      await settle();
      await check(`${tag}: saved depth distributions use their actual counts and equal full scales`, async () => {
        const data = await page.locator('[data-pt-depth-bands]').evaluateAll(nodes => nodes.map(node => ({ mode: node.dataset.ptDepthBands,
          width: node.querySelector('[data-pt-depth-segment]').parentElement.getBoundingClientRect().width,
          segments: [...node.querySelectorAll('[data-pt-depth-segment]')].map(segment => ({ band: segment.dataset.ptDepthSegment, percent: parseFloat(segment.style.width), width: segment.getBoundingClientRect().width })),
          counts: [...node.querySelectorAll('[data-pt-depth-band-count]')].map(row => ({ band: row.dataset.ptDepthBandCount, count: Number(row.querySelector('dd').textContent), font: parseFloat(getComputedStyle(row).fontSize) })) })));
        assert.equal(data.length, 3);
        assert.ok(Math.max(...data.map(row => row.width)) - Math.min(...data.map(row => row.width)) <= 1);
        for (const row of data) for (const segment of row.segments) {
          const expected = records[row.mode][segment.band] / records[row.mode].events * 100;
          assert.ok(Math.abs(segment.percent - expected) < 0.01);
          assert.equal(row.counts.find(count => count.band === segment.band).count, records[row.mode][segment.band]);
        }
        assert.ok(data.every(row => row.counts.every(count => count.font >= 12)));
        return data;
      });
      await shot('[data-pt-depth-investigation]', `${tag}-depth-distributions`);
      await click('[data-pt-quake-log] summary'); await settle();
      await check(`${tag}: live readings show real elapsed time and preserve observations on current-mode clicks`, async () => {
        await page.evaluate(() => qaFixedEvents());
        await page.getByRole('button', { name: '▶ Play', exact: true }).evaluate(node => node.click());
        await settle();
        for (let i = 0; i < 8; i++) await page.evaluate(() => qaFrame(1000));
        await page.getByRole('button', { name: '⏸ Pause', exact: true }).evaluate(node => node.click());
        await settle();
        const before = await state();
        assert.notEqual(before.time, '0 years'); assert.notEqual(before.movement, '0 m'); assert.ok(Number(before.log) > 0); assert.equal(before.paused, true);
        const current = page.locator('[data-tect-mode="convergent"]');
        await current.evaluate(node => { node.scrollIntoView({ block: 'center' }); node.focus(); });
        await page.keyboard.press('Enter'); await settle();
        assert.deepEqual(await state(), before);
        const box = await current.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await settle();
        assert.deepEqual(await state(), before);
        assert.equal(await page.locator('[data-pt-model-readings]').getAttribute('aria-live'), 'off');
        return before;
      });
      await check(`${tag}: convergent guide retains real plot coordinates and readable HTML axes`, async () => {
        assert.equal(await page.locator('[data-pt-slab-line="guess"]').count(), 1);
        assert.match(await page.locator('[data-pt-quake-axis="distance"]').textContent(), /overriding plate/);
        const labelSize = await page.locator('[data-pt-quake-log] svg').evaluate(node => Number(node.querySelector('text').getAttribute('font-size')) * node.getBoundingClientRect().width / 460);
        assert.ok(labelSize >= 12, `Tick text is ${labelSize}px`);
        return { labelSize };
      });
      await shot('[data-pt-quake-log]', `${tag}-convergent-quake-log`);
      await click('[data-tect-view="3d"]');
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready', null, { polling: 50 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle();
      await check(`${tag}: same HTML readings remain visible in the actual WebGL view`, async () => {
        assert.equal(await page.locator('[data-pt-model-readings]').count(), 1);
        assert.equal(await page.locator('[data-tect-section]').getAttribute('aria-hidden'), 'true');
        assert.equal(await page.locator('[data-tect-gl]').getAttribute('aria-hidden'), 'false');
        assert.ok(await page.locator('[data-pt-model-readings]').isVisible());
        const geometry = await page.evaluate(() => __alloTectGL.debug());
        assert.ok(geometry.geometryBuilds > 0, 'Visible WebGL must have built the model');
        assert.ok(geometry.labelRects.length >= 4, 'Visible WebGL must have rendered its labels');
        return await state();
      });
      await shot('#pt-boundary-simulator', `${tag}-readings-3d`);
      for (const mode of ['divergent', 'transform']) {
        await click(`[data-tect-mode="${mode}"]`); await settle();
        await check(`${tag}: ${mode} has no slab guide or overriding-plate label`, async () => {
          assert.equal(await page.locator('[data-pt-slab-line]').count(), 0);
          assert.doesNotMatch(await page.locator('[data-pt-quake-axis="distance"]').textContent(), /overriding/);
          assert.match(await page.locator('[data-pt-quake-log] svg').getAttribute('aria-label'), /No slab-angle/);
        });
      }
      await shot('[data-pt-quake-log]', `${tag}-transform-quake-log`);
      await check(`${tag}: new readings, recorded-depth comparisons and quake chart pass scoped WCAG checks`, async () => {
        for (const selector of ['[data-pt-model-readings]', '[data-pt-depth-investigation]', '[data-pt-quake-log]']) {
          const result = await page.evaluate(async selector => {
            const result = await axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
            return result.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) }));
          }, selector);
          accessibility.push({ tag, selector, violations: result }); assert.deepEqual(result, []);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      });
    }
    await check('no page errors', () => assert.deepEqual(errors, []));
  } finally {
    const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), passed: checks.length > 0 && checks.every(check => check.passed) && !errors.length, checks, captures, accessibility, errors };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, checks: checks.length, captures: captures.length, out }));
    await browser.close(); if (!report.passed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
