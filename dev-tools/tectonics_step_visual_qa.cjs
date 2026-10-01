'use strict';

// Production React/canvas/WebGL in Chromium. Only time and event RNG are
// controlled; all model updates, observations and captured fits are real.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-step-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), passed: false, checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><title>Plate model step review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let id = 0, now = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaClock = delta => {
        now += delta;
        const callbacks = [...frames.values()]; frames.clear();
        ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now)));
      };
      window.qaPendingFrames = () => frames.size;
      window.qaSeed = (depth = null, strike = 0.5) => {
        const sequence = [0, 0.3, 0.8, depth, 0.5, strike]; let index = 0;
        Math.random = depth == null ? () => 0.999999 : () => sequence[index++ % sequence.length];
      };
      qaSeed();
      window.qaLog = { xp: [], records: [], depthRecords: [], toasts: [], announcements: [], sound: 0 };
      if (window.AudioContext) {
        const NativeAudioContext = window.AudioContext;
        window.AudioContext = class extends NativeAudioContext {
          createOscillator() {
            const oscillator = super.createOscillator(), start = oscillator.start.bind(oscillator);
            oscillator.start = (...args) => { qaLog.sound++; return start(...args); };
            return oscillator;
          }
        };
      }
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      window.qaMount = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        for (const key of Object.keys(qaLog)) qaLog[key] = key === 'sound' ? 0 : [];
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, t: (_key, fallback) => fallback,
          awardXP: value => qaLog.xp.push(value), addToast: value => qaLog.toasts.push(value),
          onRecord: value => qaLog.records.push(value), onRecordDepths: value => qaLog.depthRecords.push(value),
          onClearDepths() {}, announceToSR: value => qaLog.announcements.push(value)
        })));
      };
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const paint = () => page.evaluate(() => { qaSeed(); qaClock(0); qaClock(0); });
    const seed = (depth, strike) => page.evaluate(({ depth, strike }) => qaSeed(depth, strike), { depth, strike });
    const step = async (depth = null, keyboard = false, strike = 0.5) => {
      await seed(depth, strike);
      if (keyboard) { await page.locator('[data-pt-model-step]').evaluate(node => node.focus()); await page.keyboard.press('Enter'); }
      else await click('[data-pt-model-step]');
      await paint();
    };
    const setRate = value => page.getByRole('slider', { name: 'Plate movement rate in centimeters per year', exact: true }).evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const snapshot = () => page.evaluate(() => {
      const log = document.querySelector('[data-pt-quake-log]');
      return {
        time: document.querySelector('[data-pt-model-reading="time"]').textContent,
        movement: document.querySelector('[data-pt-model-reading="movement"]').textContent,
        check: document.querySelector('[data-pt-sim-check]').textContent,
        shown: Number(log.dataset.ptQuakeLog), live: Number(log.dataset.ptQuakeLiveCount),
        fit: log.querySelector('[data-pt-quake-fit]')?.textContent || null,
        fitLine: log.querySelector('[data-pt-slab-line="fit"]')?.outerHTML || null,
        points: [...log.querySelectorAll('[data-pt-quake-point]')].map(point => [point.dataset.distanceKm, point.dataset.depthKm]),
        pendingFrames: qaPendingFrames()
      };
    });
    const capture = async (name, selector) => {
      const panel = page.locator(selector);
      await panel.evaluate(node => node.scrollIntoView({ block: 'center' })); await paint();
      await panel.screenshot({ path: path.join(out, name + '.png'), animations: 'allow', timeout: 60000 });
      report.captures.push(name + '.png');
    };
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      try {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(dark => qaMount(dark), dark); await paint();
        await click('[data-pt-quake-log] summary'); await paint();
        const initial = await snapshot();
        assert.equal(initial.pendingFrames, 1); assert.match(initial.time, /^0 years$/);
        assert.equal(await page.locator('[data-pt-model-step]').isDisabled(), false);
        await step(0.3, true);
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-pt-model-step')), true);
        const first = await snapshot();
        assert.equal(first.time, '60,000 years'); assert.equal(first.live, 1); assert.equal(first.pendingFrames, 1);
        await page.evaluate(() => { qaSeed(); for (let i = 0; i < 120; i++) qaClock(1000); });
        assert.deepEqual(await snapshot(), first, 'Paused idle must preserve time, movement and observations.');
        await click('[data-pt-model-play]');
        assert.equal(await page.locator('[data-pt-model-step]').isDisabled(), true);
        await click('[data-pt-model-step]');
        assert.equal((await snapshot()).time, first.time, 'Disabled Step cannot advance playback.');
        await page.evaluate(() => { qaSeed(0.5); qaClock(1000); });
        await click('[data-pt-model-play]'); await paint();
        assert.equal((await snapshot()).time, '120,000 years');
        assert.equal(await page.locator('[data-pt-model-step]').isDisabled(), false);
        await step(null, true);
        assert.equal((await snapshot()).time, '180,000 years');
        assert.equal((await snapshot()).pendingFrames, 1);

        // A short real playback interval must retain measurable sub-kilometre
        // motion; two equal-duration rates should display their mean of 10.
        await click('[data-tect-mode="divergent"]'); await setRate(1); await paint();
        await click('[data-pt-model-play]');
        await page.evaluate(() => { qaSeed(); qaClock(16); });
        await click('[data-pt-model-play]'); await paint();
        const short = await snapshot();
        assert.equal(short.movement, '0.0096 km'); assert.match(short.check, /0\.0096 km/); assert.match(short.check, /1\.0 cm per year/);
        await click('[data-pt-model-reset]'); await setRate(5); await step();
        await setRate(15); await step();
        const average = await snapshot();
        assert.equal(average.time, '120,000 years'); assert.equal(average.movement, '12 km'); assert.match(average.check, /10\.0 cm per year/);
        await capture('rate-' + name, '[data-pt-quake-log]');

        await click('[data-tect-mode="convergent"]'); await setRate(5); await paint();
        for (const depth of [0.08, 0.2, 0.31, 0.43, 0.56, 0.69, 0.82, 0.94]) await step(depth);
        const live = await snapshot(); assert.equal(live.live, 8);
        await page.locator('[data-pt-quake-lock]').evaluate(node => node.focus()); await page.keyboard.press('Enter'); await paint();
        const checked = await snapshot(); assert.equal(checked.shown, 8); assert.ok(checked.fit);
        await step(0.5, true);
        const advanced = await snapshot();
        assert.equal(advanced.live, 9); assert.equal(advanced.shown, 8);
        assert.deepEqual(advanced.points, checked.points); assert.equal(advanced.fit, checked.fit); assert.equal(advanced.fitLine, checked.fitLine);
        assert.equal(advanced.time, '540,000 years'); assert.equal(advanced.pendingFrames, 1);
        await capture('captured-plus-step-' + name, '[data-pt-quake-log]');
        await capture('controls-' + name, '#pt-boundary-simulator');

        const key = await page.locator('[data-pt-model-depth-key]').textContent();
        assert.match(key, /70/); assert.match(key, /300/); assert.match(key, /700/);
        const retention = await page.locator('[data-pt-model-dots-note]').textContent();
        assert.match(retention, /stay fixed between advances/); assert.match(retention, /quake log.*keeps.*after.*disappear/);
        const metrics = await page.locator('#pt-boundary-simulator').evaluate(node => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          stepHeight: node.querySelector('[data-pt-model-step]').getBoundingClientRect().height,
          liveReadout: node.querySelector('[data-pt-model-readings]').getAttribute('aria-live'),
          clipped: [...node.querySelectorAll('button,input,summary')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(el => el.textContent || el.getAttribute('aria-label'))
        }));
        assert.equal(metrics.overflow, 0); assert.equal(metrics.liveReadout, 'off'); assert.ok(metrics.stepHeight >= 40); assert.deepEqual(metrics.clipped, []);
        const audit = await page.evaluate(async () => (await axe.run('#pt-boundary-simulator', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
        assert.deepEqual(audit, []);

        await click('[data-tect-view="3d"]');
        await page.waitForFunction(() => __alloTectGL.isReady()); await paint();
        const gl = await page.evaluate(() => __alloTectGL.debug());
        assert.equal(gl.contextLost, false); assert.ok(gl.labelRects.some(label => /^Focus · \d+ km$/.test(label.text)));
        assert.equal(gl.quakeCount, 3, 'New events must not prevent older foci from aging out.');
        await capture('focus-3d-' + name, '[data-tect-gl]');
        await click('[data-pt-model-play]');
        for (let i = 0; i < 4; i++) await page.evaluate(() => { qaSeed(); qaClock(1000); });
        await click('[data-pt-model-play]'); await paint();
        const faded = await page.evaluate(() => __alloTectGL.debug());
        assert.equal(faded.quakeCount, 0); assert.equal(faded.focusAnnotation, null);
        const retained = await snapshot();
        assert.equal(retained.live, 9); assert.equal(retained.shown, 8); assert.deepEqual(retained.points, checked.points);
        await click('[data-pt-model-reset]'); await paint();
        for (const depth of [0.1, 0.3, 0.5, 0.7]) await step(depth);
        const consecutive = await page.evaluate(() => __alloTectGL.debug());
        assert.equal(consecutive.quakeCount, 3);
        assert.deepEqual(consecutive.slabSample.map(q => Math.round(q.depthKm)), [244, 360, 476]);
        assert.equal((await snapshot()).live, 4);
        for (let i = 0; i < 3; i++) await step();
        const cleared = await page.evaluate(() => __alloTectGL.debug());
        assert.equal(cleared.quakeCount, 0); assert.equal(cleared.focusAnnotation, null);
        assert.equal((await snapshot()).live, 4);
        // Drive the actual cutaway slider with the keyboard. Two known foci
        // lie in the removed half; only the retained focus belongs in the alt.
        await click('[data-pt-model-reset]'); await paint();
        await step(0.1, false, 0.2); await step(0.3, false, 0.8); await step(0.5, false, 0.8);
        const fullAlt = await page.locator('[data-tect-gl]').getAttribute('aria-label');
        assert.match(fullAlt, /3 of 3 shown earthquakes/);
        await page.locator('#tect-cut').evaluate(node => node.focus()); await page.keyboard.press('Home'); await paint();
        const slicedAlt = await page.locator('[data-tect-gl]').getAttribute('aria-label');
        assert.match(slicedAlt, /1 of 1 shown earthquakes/);
        assert.equal(Math.round(await page.evaluate(() => __alloTectGL.debug().focusAnnotation.depthKm)), 128);
        await page.keyboard.press('End'); await paint();
        await click('[data-tect-mode="transform"]'); await paint();
        const transformHelp = await page.locator('#tect-gl-description').textContent();
        assert.match(transformHelp, /earthquakes remain shallow/); assert.match(transformHelp, /No sinking slab is present/);
        assert.match(await page.locator('[data-tect-gl]').getAttribute('aria-label'), /Earthquakes are shallow/);
        await click('[data-tect-view="2d"]'); await paint();
        await click('[data-pt-model-reset]'); await paint();
        const reset = await snapshot(); assert.equal(reset.time, '0 years'); assert.equal(reset.live, 0); assert.equal(reset.shown, 0); assert.equal(reset.fit, null);
        const callbacks = await page.evaluate(() => ({ xp: qaLog.xp, records: qaLog.records, depthRecords: qaLog.depthRecords, toasts: qaLog.toasts, sound: qaLog.sound }));
        assert.deepEqual(callbacks, { xp: [], records: [], depthRecords: [], toasts: [], sound: 0 });
        report.checks.push({ name, passed: true, short, average, capturedCount: checked.shown, advancedLiveCount: advanced.live, fadedQuakes: faded.quakeCount, retainedLogCount: retained.live, consecutiveBirths: { log: 4, activeAfterFourth: consecutive.quakeCount, activeAfterNoBirthSteps: cleared.quakeCount }, sliceDescriptions: { fullAlt, slicedAlt }, transformHelp, metrics, key, retention, audit, callbacks });
        console.log('PASS', name, JSON.stringify({ captured: checked.shown, advancedLive: advanced.live, short: short.movement, average: average.movement }));
      } catch (error) { report.checks.push({ name, passed: false, error: String(error.stack || error) }); console.error('FAIL', name, error.message); }
    }
    report.passed = report.checks.length === 4 && report.checks.every(check => check.passed) && !report.errors.length;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, layouts: report.checks.length, captures: report.captures.length, out }));
    await browser.close(); if (!report.passed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
