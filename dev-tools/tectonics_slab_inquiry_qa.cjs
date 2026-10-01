'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-slab-inquiry-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), passed: false, checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Slab angle inquiry review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      window.StemLab = { registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}) };
      const frames = new Map(); let id = 0, now = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      const nativeRandom = Math.random;
      window.qaFrame = (delta = 16, depth = null, jitter = 0.5) => {
        now = Math.max(now + delta, performance.now());
        const sequence = [0, 0.3, 0.8, depth, jitter, 0.5]; let index = 0;
        // Control only the clock and RNG: event creation, coordinates, state,
        // fitted line, and captured samples all come from the production model.
        Math.random = depth == null ? () => 0.999999 : () => sequence[index++ % sequence.length];
        try {
          const callbacks = [...frames.values()]; frames.clear();
          ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now)));
        } finally { Math.random = nativeRandom; }
      };
      window.qaClearFrames = () => frames.clear();
      window.qaLog = { xp: [], records: [], depthRecords: [], announcements: [], toasts: [] };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      window.qaMountSlab = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        for (const key of Object.keys(qaLog)) qaLog[key] = [];
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, t: (_key, fallback) => fallback,
          awardXP: value => qaLog.xp.push(value), onRecord: value => qaLog.records.push(value),
          onRecordDepths: value => qaLog.depthRecords.push(value), onClearDepths() {},
          addToast: value => qaLog.toasts.push(value), announceToSR: value => qaLog.announcements.push(value)
        })));
      };
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const control = name => page.getByRole('button', { name, exact: true }).evaluate(node => node.click());
    const settle = async () => { await page.evaluate(() => qaFrame()); await page.evaluate(() => qaFrame()); };
    const event = (depth, jitter = 0.5) => page.evaluate(({ depth, jitter }) => qaFrame(1000, depth, jitter), { depth, jitter });
    const generate = async () => {
      for (const [index, depth] of [0.08, 0.2, 0.31, 0.43, 0.56, 0.69, 0.82, 0.94].entries()) await event(depth, index % 2 ? 0.7 : 0.3);
    };
    const snapshot = () => page.locator('[data-pt-quake-log]').evaluate(node => ({
      shown: Number(node.dataset.ptQuakeLog), live: Number(node.dataset.ptQuakeLiveCount),
      captured: node.querySelector('[data-pt-quake-sample-note]').dataset.ptQuakeSampleNote === 'captured',
      fit: node.querySelector('[data-pt-quake-fit]')?.textContent || null,
      points: [...node.querySelectorAll('[data-pt-quake-point]')].map(point => ({ x: Number(point.dataset.distanceKm), z: Number(point.dataset.depthKm), cx: Number(point.getAttribute('cx')), cy: Number(point.getAttribute('cy')) })),
      fitLine: node.querySelector('[data-pt-slab-line="fit"]')?.outerHTML || null,
      time: document.querySelector('[data-pt-model-reading="time"]').textContent
    }));
    const capture = async name => {
      const panel = page.locator('[data-pt-quake-log]');
      await panel.evaluate(node => node.scrollIntoView({ block: 'center' })); await settle();
      await panel.screenshot({ path: path.join(out, `${name}.png`), animations: 'allow', timeout: 60000 });
      report.captures.push(`${name}.png`);
    };

    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      try {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(dark => qaMountSlab(dark), dark); await settle();
        await click('[data-pt-quake-log] summary'); await settle();
        const number = page.locator('[data-pt-slab-angle-number]');
        const slider = page.locator('#pt-ql-dip');
        const typeAngle = async value => {
          const committed = await slider.inputValue();
          await number.evaluate(node => node.focus());
          await page.keyboard.press('Control+A');
          await page.keyboard.type(value);
          assert.equal(await number.inputValue(), value, 'Character-by-character typing must preserve the exact draft.');
          assert.equal(await slider.inputValue(), committed, 'Typing keeps the prior committed angle until Enter, blur, or Check.');
        };
        assert.equal(await page.locator('[data-pt-quake-lock]').isDisabled(), true);
        await page.evaluate(() => { for (let i = 0; i < 120; i++) qaFrame(1000); });
        assert.equal((await snapshot()).live, 0);
        assert.deepEqual(await page.evaluate(() => ({ xp: qaLog.xp, records: qaLog.records, depthRecords: qaLog.depthRecords, toasts: qaLog.toasts })), { xp: [], records: [], depthRecords: [], toasts: [] });
        // The first digit of 37 or 15 used to clamp immediately to 5,
        // turning ordinary typing into 57 or 55. Exercise real key events.
        for (const [value, expected, commit] of [['37', '37', 'Enter'], ['15', '15', 'Tab'], ['95', '85', 'Enter'], ['1', '5', 'Tab'], ['37.4', '37', 'Enter']]) {
          await typeAngle(value); await page.keyboard.press(commit);
          assert.equal(await slider.inputValue(), expected);
          assert.equal(await number.inputValue(), expected);
        }
        await slider.evaluate(node => node.focus()); await page.keyboard.press('ArrowRight');
        assert.equal(await number.inputValue(), '38');
        assert.equal(await slider.getAttribute('aria-valuetext'), '38 degrees');
        await control('▶ Play'); await settle(); await generate();
        const live = await snapshot();
        assert.ok(live.points.length >= 8); assert.ok(live.points.filter(point => point.z >= 70).length >= 8);
        assert.equal(live.captured, false); assert.equal(live.fit, null);
        assert.ok(new Set(live.points.map(point => point.z)).size >= 8);
        for (const point of live.points) {
          assert.ok(Math.abs(point.cx - (52 + (point.x + 150) / 950 * 396)) < 0.000001);
          assert.ok(Math.abs(point.cy - (14 + point.z / 720 * 196)) < 0.000001);
        }
        await capture(`estimate-${name}`);
        await page.locator('[data-pt-quake-lock]').evaluate(node => node.focus()); await page.keyboard.press('Enter'); await settle();
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-pt-slab-revise')), true);
        assert.equal(await page.getByRole('button', { name: '▶ Play', exact: true }).count(), 1);
        assert.equal(await number.isDisabled(), true); assert.equal(await slider.isDisabled(), true);
        const checked = await snapshot(); assert.equal(checked.captured, true); assert.deepEqual(checked.points, live.points);
        assert.match(checked.fit, /Your estimate was 38°/); assert.match(checked.fit, /within the slab/);
        assert.equal(await page.locator('[data-pt-slab-line="guess"]').getAttribute('stroke-dasharray'), '7 5');
        assert.equal(await page.locator('[data-pt-slab-line="fit"]').getAttribute('stroke-dasharray'), null);
        assert.match(await page.locator('[data-pt-slab-legend]').textContent(), /estimate \(dashed\).*Data fit \(solid\)/);
        await capture(`checked-${name}`);
        await control('▶ Play'); await settle(); for (const depth of [0.15, 0.35, 0.55, 0.75]) await event(depth);
        const resumed = await snapshot();
        assert.ok(resumed.live > checked.live); assert.notEqual(resumed.time, checked.time);
        assert.deepEqual(resumed.points, checked.points); assert.equal(resumed.fit, checked.fit); assert.equal(resumed.fitLine, checked.fitLine);
        await click('[data-pt-slab-revise]'); await settle();
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'pt-ql-dip');
        const revised = await snapshot();
        assert.equal(revised.captured, false); assert.equal(revised.shown, resumed.live); assert.equal(revised.fit, null);
        assert.deepEqual(revised.points.slice(0, checked.points.length), checked.points);
        // Leave 42 as an unfinished draft, then click Check directly. The
        // browser's blur/click sequence must capture 42, not the earlier 38.
        await typeAngle('42');
        await page.locator('[data-pt-quake-lock]').click({ force: true }); await settle();
        assert.match((await snapshot()).fit, /Your estimate was 42°/); assert.equal((await snapshot()).shown, resumed.live);
        assert.equal(await number.inputValue(), '42'); assert.equal(await slider.inputValue(), '42');
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-pt-slab-revise')), true);
        await capture(`rechecked-${name}`);
        const metrics = await page.locator('[data-pt-quake-log]').evaluate(node => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          clippedControls: [...node.querySelectorAll('input,button,summary')].filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => el.id || el.textContent),
          tickFontPx: Number(node.querySelector('svg text').getAttribute('font-size')) * node.querySelector('svg').getBoundingClientRect().width / 460
        }));
        assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []); assert.ok(metrics.tickFontPx >= 12);
        const audit = await page.evaluate(async () => {
          const result = await axe.run('[data-pt-quake-log]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
          return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
        });
        assert.deepEqual(audit, []);
        await control('↻ Reset'); await settle();
        const reset = await snapshot(); assert.equal(reset.live, 0); assert.equal(reset.shown, 0); assert.equal(reset.captured, false); assert.equal(reset.fit, null);
        assert.equal(await page.locator('[data-pt-quake-lock]').isDisabled(), true);
        await control('▶ Play'); await settle(); await generate(); await click('[data-pt-quake-lock]'); await settle();
        assert.equal((await snapshot()).captured, true);
        await click('[data-tect-mode="divergent"]'); await settle();
        const changed = await snapshot(); assert.equal(changed.live, 0); assert.equal(changed.captured, false); assert.equal(changed.fit, null);
        assert.equal(await page.locator('[data-pt-slab-line]').count(), 0);
        await capture(`boundary-cleared-${name}`);
        assert.deepEqual(await page.evaluate(() => ({ xp: qaLog.xp, records: qaLog.records, depthRecords: qaLog.depthRecords, toasts: qaLog.toasts })), { xp: [], records: [], depthRecords: [], toasts: [] });
        report.checks.push({ name, passed: true, typedAngles: ['37', '15', '95', '1', '37.4', '42'], draftCheckAngle: 42, generatedPoints: live.points, capturedCount: checked.shown, resumedLiveCount: resumed.live, capturedFit: checked.fit, metrics, audit, callbacks: { xp: 0, onRecord: 0, onRecordDepths: 0, toasts: 0 } });
        console.log('PASS', name, JSON.stringify({ generated: live.shown, resumedLive: resumed.live, captured: checked.shown, tickFontPx: metrics.tickFontPx }));
      } catch (error) { report.checks.push({ name, passed: false, error: String(error.stack || error) }); console.error('FAIL', name, error.message); }
    }
    report.passed = report.checks.length === 4 && report.checks.every(check => check.passed) && !report.errors.length;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, layouts: report.checks.length, captures: report.captures.length, out }));
    await browser.close(); if (!report.passed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
