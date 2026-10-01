'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const before = process.argv.includes('--before');
const read = p => fs.readFileSync(p, 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-globe-review', before ? 'before' : 'after');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), before, checks: [], captures: [], errors: [], passed: false };
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1100, height: 1000 } });
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.setContent('<html lang="en"><head><title>Globe and deep-time review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(p) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => new Promise(() => {}); StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let id = 0, now = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaFrames = (count, delta = 1000 / 60) => { for (let i = 0; i < count; i++) { now += delta; const pending = [...frames.values()]; frames.clear(); ReactDOM.flushSync(() => pending.forEach(cb => cb(now))); } };
      window.qaLog = { xp: [], toasts: [], announcements: [], sounds: 0 };
      for (const proto of new Set([window.AudioContext?.prototype, window.webkitAudioContext?.prototype].filter(Boolean))) {
        const create = proto.createOscillator;
        proto.createOscillator = function () { const oscillator = create.call(this), start = oscillator.start; oscillator.start = function (...args) { qaLog.sounds++; return start.apply(this, args); }; return oscillator; };
      }
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      const noop = () => {}, icons = new Proxy({}, { get: () => () => React.createElement('span') });
      window.qaMount = (dark, era = 3) => {
        for (const key of Object.keys(qaLog)) qaLog[key] = key === 'sounds' ? 0 : [];
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'timeline', _ptPicked: true, _ptCategory: 'sim_quiz', ptDrift: false, timelineEra: era } });
          window.qaData = data.plateTectonics; window.qaSet = patch => ReactDOM.flushSync(() => setData(prev => ({ plateTectonics: { ...prev.plateTectonics, ...patch } })));
          return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: (...args) => qaLog.toasts.push(args),
            awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0, announceToSR: value => qaLog.announcements.push(value),
            beep: () => qaLog.sounds++, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }),
            t: (_key, fallback) => fallback, props: {}, srOnly: {}, gradeLevel: '7th Grade' });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    const globe = page.locator('#geology-earth-canvas');
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const settle = async () => { await page.waitForTimeout(80); await page.evaluate(() => qaFrames(2)); };
    const snap = () => page.evaluate(() => ({ era: qaData.timelineEra, playing: qaData.timelapsePlaying || false, tls: document.getElementById('geology-earth-canvas')._tlState, lon: document.getElementById('geology-earth-canvas')._geoLongitude, log: qaLog, explored: qaData.ptExploredEras || {} }));
    const capture = async (name, selector) => { await page.locator(selector).screenshot({ path: path.join(out, name), animations: 'allow' }); report.captures.push(name); };
    const layouts = before ? [[false, 1100], [true, 390]] : [[false, 1100], [false, 390], [true, 1100], [true, 390]];
    for (const [dark, width] of layouts) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      try {
        await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMount(dark), dark);
        await globe.waitFor(); await globe.evaluate(node => node.scrollIntoView({ block: 'center' })); await settle();
        await capture(name + '-globe.png', '[data-pt-globe-panel]');
        const initial = await snap(); const initialData = await page.evaluate(() => JSON.stringify(qaData));
        const original = await globe.evaluate(node => node.toDataURL());
        await globe.evaluate(node => node.focus()); await page.keyboard.press('ArrowRight'); await settle();
        const turned = await globe.evaluate(node => node.toDataURL());
        if (!before) {
          assert.equal((await snap()).lon, -5);
          await page.keyboard.press('Home'); await settle();
          assert.equal(await globe.evaluate(node => node.toDataURL()), original, 'Home restores the same hemisphere.');
          await page.locator('[data-pt-globe-turn="west"]').focus(); await page.keyboard.press('Enter'); await settle();
          assert.equal((await snap()).lon, -35);
          assert.equal(await page.evaluate(() => document.activeElement.dataset.ptGlobeTurn), 'west');
          await click('[data-pt-globe-turn="east"]'); await settle(); assert.equal((await snap()).lon, -20);
          assert.equal(await page.evaluate(() => JSON.stringify(qaData)), initialData, 'View controls do not change saved progress.');
          await page.evaluate(() => qaFrames(120)); await settle(); assert.deepEqual((await snap()).log, initial.log, 'Pristine idle has no side effects.');
          // Playback must work when started from its controls above the globe.
          await page.setViewportSize({ width, height: 400 });
          await page.locator('[data-pt-timelapse-toggle]').evaluate(node => node.scrollIntoView({ block: 'start' }));
          assert.equal(await globe.evaluate(node => { const r = node.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }), false);
        }
        await page.getByRole('button', { name: '▶ Time-Lapse', exact: true }).evaluate(node => node.click()); await settle();
        // The deliberate first Play completes a challenge whose existing three
        // notes are scheduled over time. Finish that sound before testing idle.
        if (!before) await page.waitForTimeout(500);
        const started = await snap(); await page.evaluate(() => qaFrames(300)); await settle(); const advanced = await snap();
        await click('[data-pt-era-step="prev"]'); await settle(); const manual = await snap();
        await page.setViewportSize({ width, height: 1000 });
        const metrics = await page.locator('[data-pt-globe-panel]').evaluate(node => { const canvas = node.querySelector('canvas'), cr = canvas.getBoundingClientRect(), pr = node.getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth - innerWidth, width: canvas.clientWidth, height: canvas.clientHeight, canvasWithinPanel: cr.left >= pr.left && cr.right <= pr.right, alt: canvas.getAttribute('aria-label') }; });
        let finished, replayed, idle, axe;
        if (!before) {
          assert.notEqual(original, turned, 'ArrowRight must turn the visible globe.');
          assert.ok(advanced.era > started.era, 'Time-lapse must advance era.');
          assert.equal(manual.playing, false, 'A deliberate era step pauses playback.');
          assert.equal(metrics.overflow, 0);
          assert.equal(metrics.canvasWithinPanel, true, 'Entire globe must fit within phone panel.');
          assert.deepEqual(advanced.explored, initial.explored, 'Automatic eras do not count as deliberate era exploration.');
          assert.deepEqual(advanced.log, started.log, 'Advancing eras does not repeat challenge notices.');
          assert.equal(manual.lon, -20, 'The same hemisphere is retained across manual and automatic era changes.');
          await click('[data-pt-timelapse-toggle]'); await settle(); await page.evaluate(() => qaFrames(900)); await settle(); finished = await snap();
          assert.equal(finished.era, 7); assert.equal(finished.playing, false); assert.equal(finished.tls.progress, 7);
          assert.deepEqual(finished.log, started.log, 'Automatic completion produces no additional reward, notification, or sound.');
          assert.match(await page.locator('[data-pt-timelapse-toggle]').textContent(), /Replay/);
          await globe.evaluate(node => node.scrollIntoView({ block: 'center' })); await settle();
          await click('[data-pt-globe-turn="east"]'); await settle(); await capture(name + '-modern-turned.png', '[data-pt-globe-panel]');
          await capture(name + '-timeline.png', '[data-pt-timeline-panel]');
          await click('[data-pt-timelapse-toggle]'); await settle(); replayed = await snap();
          assert.equal(replayed.era, 0); assert.equal(replayed.playing, true, 'Replay deliberately starts a new pass.');
          assert.deepEqual(replayed.log, started.log, 'Replay cannot re-earn its completed challenge.');
          await click('[data-pt-era-step="next"]'); await settle();
          assert.equal((await snap()).playing, false, 'Later era also pauses playback.');
          // Range keyboard and era card navigation keep the same manual-pause contract.
          await click('[data-pt-timelapse-toggle]'); await settle();
          await page.getByRole('slider', { name: 'timeline era', exact: true }).focus(); await page.keyboard.press('ArrowRight'); await settle();
          assert.equal((await snap()).playing, false);
          await click('[data-pt-timelapse-toggle]'); await settle(); await click('[data-pt-era="3"]'); await settle();
          assert.equal((await snap()).playing, false);
          const beforeIdle = await snap(); await page.evaluate(() => qaFrames(600)); await settle(); idle = await snap();
          assert.deepEqual(idle, beforeIdle, 'Idle time must not repeat notices, progress, or globe movement.');
          assert.deepEqual(idle.log.toasts, started.log.toasts, 'Manual era visits preserve the once-only challenge notice.');
          assert.deepEqual(idle.log.xp, [['plateTectonics', 2, 'Timeline explored']], 'Only the explicit era-card visit earns exploration XP.');
          assert.equal(idle.log.sounds, started.log.sounds); assert.equal(idle.log.toasts.length, 1);
          axe = await page.evaluate(async () => (await window.axe.run({ include: [['[data-pt-globe-panel]'], ['[data-pt-timeline-panel]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
          assert.deepEqual(axe, [], 'Globe and timeline scope must pass axe.');
        }
        report.checks.push({ name, passed: true, keyboardChangesGlobe: original !== turned, initial, started, advanced, manual, finished, replayed, idle, metrics, axe });
        console.log('PASS', name, JSON.stringify({ keyboardChangesGlobe: original !== turned, started: started.era, advanced: advanced.era, playingAfterManual: manual.playing }));
      } catch (e) { report.checks.push({ name, passed: false, error: String(e.stack || e) }); console.error('FAIL', name, e.message); }
    }
    report.passed = report.checks.every(check => check.passed) && !report.errors.length;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close();
    if (!report.passed) process.exitCode = 1;
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
