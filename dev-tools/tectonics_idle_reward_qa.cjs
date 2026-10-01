'use strict';

// Real React 18 + Chromium regression checks for the primary tectonics canvas.
// RAF is stepped explicitly; canvas rendering, React updates, DOM events, audio
// creation, and timers remain real. This makes several minutes of drift testable
// without a wall-clock wait. Run with --report-only to collect known failures.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const out = path.join(root, 'scratch', 'tectonics-idle-review');
const sourcePath = process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js';
const tectonicsSource = read(sourcePath);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [], errors = [], settlements = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => errors.push(String(e)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonics idle reward regression</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    await page.evaluate(() => {
      window.qaLog = { xp: [], toasts: [], sounds: [], announcements: [] };
      let frameId = 0, frameTime = 0;
      const frames = new Map();
      window.requestAnimationFrame = cb => { frames.set(++frameId, cb); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      window.qaFrames = count => {
        for (let i = 0; i < count; i++) {
          const batch = [...frames.entries()];
          frameTime += 1000 / 60;
          for (const [id, cb] of batch) { if (frames.delete(id)) cb(frameTime); }
        }
      };
      for (const [name, proto] of [['oscillator', OscillatorNode.prototype], ['buffer', AudioBufferSourceNode.prototype]]) {
        const start = proto.start;
        proto.start = function (...args) { qaLog.sounds.push(name); return start.apply(this, args); };
      }
    });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) {
      await page.addScriptTag({ content: read(file) });
    }
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
    });
    await page.addScriptTag({ content: tectonicsSource });
    await page.evaluate(() => {
      const noop = () => {};
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      const reactRoot = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaMount = seed => {
        document.documentElement.classList.toggle('dark', !!seed.qaDark);
        document.body.style.background = seed.qaDark ? '#0f172a' : '#f1f5f9';
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'sim', ptDrift: false, ...seed } });
          window.qaData = data;
          window.qaSet = setData;
          return StemLab._registry.plateTectonics.render({
            React, toolData: data, setToolData: setData, isDark: !!seed.qaDark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [],
            addToast: (...args) => qaLog.toasts.push(args), announceToSR: text => qaLog.announcements.push(text),
            awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: (...args) => qaLog.sounds.push(['beep', ...args]), celebrate: noop, canvasNarrate: noop,
            canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null
          });
        }
        ReactDOM.flushSync(() => reactRoot.render(React.createElement(React.StrictMode, { key: ++generation }, React.createElement(Host))));
      };
      window.qaSnapshot = () => {
        const d = qaData.plateTectonics;
        return {
          xp: qaLog.xp.length, toasts: qaLog.toasts.length, sounds: qaLog.sounds.length,
          quakeCount: d.quakeCount || 0, eruptionCount: d.eruptionCount || 0,
          ptMadeQuakes: d.ptMadeQuakes || 0, ptMadeEruptions: d.ptMadeEruptions || 0,
          ptMadeKinds: d.ptMadeKinds || {}, ptSeenKinds: d.ptSeenKinds || {},
          completedChallenges: d.completedChallenges || [], researchPoints: d.researchPoints || 0,
          xpCalls: qaLog.xp, toastCalls: qaLog.toasts
        };
      };
      qaMount({});
    });
    const canvas = page.locator('.pt-primary-canvas');
    const snapshot = () => page.evaluate(() => qaSnapshot());
    async function frames(count) {
      for (let left = count; left > 0; left -= 60) {
        await page.evaluate(n => qaFrames(n), Math.min(60, left));
      }
    }
    async function ready() {
      await canvas.waitFor();
      await canvas.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await frames(2);
      assert.ok(await canvas.isVisible(), 'The real canvas must be visible during each scenario');
      await page.waitForTimeout(200);
    }
    async function mount(seed = {}, active = true) {
      await page.evaluate(({ seed, active }) => {
        qaLog.xp = []; qaLog.toasts = []; qaLog.sounds = []; qaLog.announcements = [];
        // Most scenarios explicitly enter Simulation. The initial hub check
        // leaves the activity unmounted, matching a student's first visit.
        qaMount({ _ptPicked: active, ...seed });
      }, { seed, active });
      if (active) await ready();
      else assert.equal(await canvas.count(), 0, 'The hub must not mount the primary simulation');
    }
    async function check(name, run) {
      try { const detail = await run(); results.push({ name, passed: true, detail }); console.log('PASS:', name); }
      catch (error) { results.push({ name, passed: false, error: error.message, state: await snapshot() }); console.error('FAIL:', name, error.message); }
    }
    const feedback = s => ({ xp: s.xp, toasts: s.toasts, sounds: s.sounds, ptMadeQuakes: s.ptMadeQuakes, ptMadeEruptions: s.ptMadeEruptions, ptMadeKinds: s.ptMadeKinds, completedChallenges: s.completedChallenges, researchPoints: s.researchPoints });
    async function settleTimers() { await page.waitForTimeout(650); }
    async function committedNotices() {
      // This large development-mode render can commit after the gesture timer.
      // Require the manual event itself before its earned IDs and effects; an
      // empty pre-commit state is not evidence that all notices have settled.
      // Keep real React scheduling and timers. Under concurrent browser load a
      // full development-mode commit can exceed the old ten-second allowance.
      const started = Date.now();
      await page.evaluate(() => { window.qaNoticeQuiet = null; });
      await page.waitForFunction(() => {
        const d = qaData.plateTectonics, done = d.completedChallenges || [];
        if (!(d.ptMadeQuakes >= 1) || !(d.quakeCount >= 1)) return false;
        const expected = ['first_quake'];
        if (d.ptMadeMaxMag >= 8) expected.push('major_quake');
        if (d.ptMadeEruptions >= 1) expected.push('erupt_volcano');
        if (!expected.every(id => done.includes(id)) || qaLog.toasts.length < done.length) return false;
        // The fanfare starts two more tones on real timers. Wait for a quiet
        // tail after the entire committed batch before any no-op baseline.
        const signature = JSON.stringify([d.ptMadeQuakes, d.ptMadeEruptions, done, d.researchPoints, qaLog.xp.length, qaLog.toasts.length, qaLog.sounds.length]);
        if (!window.qaNoticeQuiet || qaNoticeQuiet.signature !== signature) {
          window.qaNoticeQuiet = { signature, since: performance.now() };
          return false;
        }
        return performance.now() - qaNoticeQuiet.since >= 500;
      }, null, { polling: 50, timeout: 60000 });
      settlements.push({ waitMs: Date.now() - started, challenges: (await snapshot()).completedChallenges });
    }
    async function selectFirst() { await canvas.focus(); await page.keyboard.press('ArrowDown'); await frames(1); }
    async function moveRight() { await page.keyboard.press('Shift+ArrowRight'); await frames(2); await settleTimers(); }
    async function current() { return canvas.evaluate(n => ({ ...n._ptKb.current() })); }
    async function platePoint() {
      const p = await current(), box = await canvas.boundingBox();
      return { x: box.x + p.x + p.w / 2, y: box.y + 110 };
    }

    await check('pristine idle: 1,200 real draw frames give no rewards or sound', async () => {
      await mount({}, false); const hubBefore = await snapshot(); await frames(1200); await settleTimers();
      const hubAfter = await snapshot(); assert.deepEqual(feedback(hubAfter), feedback(hubBefore)); assert.equal(hubAfter.quakeCount, 0);
      assert.equal(hubAfter.xp, 0); assert.equal(hubAfter.toasts, 0); assert.equal(hubAfter.sounds, 0);
      await mount(); const before = await snapshot(); await frames(1200); await settleTimers();
      const after = await snapshot(); assert.deepEqual(feedback(after), feedback(before)); assert.equal(after.quakeCount, 0);
      assert.equal(after.xp, 0); assert.equal(after.toasts, 0); assert.equal(after.sounds, 0); return { hub: hubAfter, simulation: after };
    });
    await check('automatic drift: contact events stay silent and earn nothing', async () => {
      await mount({ ptDrift: true, speed: 4 }); const before = await snapshot(); await frames(1200); await settleTimers();
      const after = await snapshot(); assert.ok(after.quakeCount > 0, 'The accelerated drift must actually reach a boundary');
      assert.deepEqual(feedback(after), feedback(before)); return after;
    });
    await check('one deliberate keyboard gesture earns one boundary reward and one first-quake notice', async () => {
      await mount(); await selectFirst(); await moveRight(); await committedNotices(); const after = await snapshot();
      assert.equal(after.xp, 1); assert.equal(after.ptMadeQuakes, 1); assert.ok(after.sounds > 0, 'The sound spy must observe deliberate feedback');
      const firstQuake = after.toastCalls.filter(args => String(args[0]).includes('Plate Boundary Shaker'));
      assert.equal(firstQuake.length, 1, 'React 18 StrictMode must deliver a committed challenge notice exactly once');
      return after;
    });
    await check('stationary clicks, repeated release events and blur cannot replay a boundary reward', async () => {
      // Keep this no-op check independent of whether the preceding scenario's
      // assertions passed: its baseline must always follow the completed input.
      await committedNotices();
      const before = await snapshot(), point = await platePoint();
      for (let i = 0; i < 3; i++) { await page.mouse.click(point.x, point.y); }
      await canvas.evaluate(n => {
        for (let i = 0; i < 4; i++) {
          n.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
          n.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          n.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }
        n.blur();
      });
      await settleTimers(); assert.deepEqual(feedback(await snapshot()), feedback(before)); return await snapshot();
    });
    await check('stationary touch taps cannot replay a boundary reward', async () => {
      const before = await snapshot(), point = await platePoint();
      await canvas.evaluate((n, point) => {
        for (let i = 0; i < 3; i++) {
          const touch = new Touch({ identifier: i + 1, target: n, clientX: point.x, clientY: point.y });
          n.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
          n.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true, cancelable: true }));
        }
      }, point);
      await settleTimers(); assert.deepEqual(feedback(await snapshot()), feedback(before)); return await snapshot();
    });
    await check('a held/clamped keyboard gesture settles once; a later clamped key earns nothing', async () => {
      await mount(); await selectFirst(); await page.keyboard.down('Shift');
      await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowRight');
      await page.keyboard.up('ArrowRight'); await page.keyboard.up('Shift'); await frames(2); await settleTimers();
      await committedNotices();
      const before = await snapshot(), pos = await current(); assert.equal(before.xp, 1);
      await moveRight(); const after = await snapshot(); assert.equal((await current()).x, pos.x, 'The second gesture must be clamped');
      assert.deepEqual(feedback(after), feedback(before)); return after;
    });
    await check('one deliberate pointer gesture earns one boundary reward', async () => {
      await mount(); await selectFirst(); const point = await platePoint();
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 80, point.y, { steps: 5 }); await frames(2); await page.mouse.up();
      await settleTimers(); await committedNotices(); const after = await snapshot(); assert.equal(after.xp, 1); assert.equal(after.ptMadeQuakes, 1); return after;
    });
    await check('rerenders, resizes and continued idle do not replay earned rewards', async () => {
      const before = await snapshot();
      for (let i = 0; i < 8; i++) { await page.evaluate(i => qaSet(prev => ({ ...prev, plateTectonics: { ...prev.plateTectonics, qaRevision: i } })), i); await frames(2); }
      await page.setViewportSize({ width: 390, height: 1000 }); await ready(); await frames(120);
      await page.setViewportSize({ width: 1100, height: 1000 }); await ready(); await frames(300); await settleTimers();
      const after = await snapshot(); assert.deepEqual(feedback(after), feedback(before)); assert.equal(after.quakeCount, before.quakeCount); return after;
    });
    await check('restored completed challenges stay silent on mount and rerender', async () => {
      const existing = ['first_quake', 'erupt_volcano'];
      await page.evaluate(existing => { qaLog.xp = []; qaLog.toasts = []; qaLog.sounds = []; qaMount({ _ptPicked: true, completedChallenges: existing, researchPoints: 25, totalRP: 25, ptMadeQuakes: 1, ptMadeEruptions: 1 }); }, existing);
      await ready(); await frames(120); await settleTimers(); const state = await snapshot();
      assert.equal(state.xp, 0); assert.equal(state.toasts, 0); assert.equal(state.sounds, 0); assert.deepEqual(state.completedChallenges, existing); return state;
    });
    await check('plate key selects without rewards; arrows move that plate; all seven keys wrap on phones', async () => {
      await mount(); const before = await snapshot();
      const key = page.locator('button[data-pt-plate-key]').nth(3);
      assert.equal(await page.locator('button[data-pt-plate-key]').count(), 7);
      await key.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const box = await key.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await frames(2); await settleTimers();
      const chosen = await current(); assert.equal(chosen.id, await key.getAttribute('data-pt-plate-key'));
      assert.equal(await canvas.evaluate(n => document.activeElement === n), true);
      assert.deepEqual(feedback(await snapshot()), feedback(before));
      await page.keyboard.press('ArrowLeft'); await frames(2); await settleTimers();
      assert.ok((await current()).x < chosen.x, 'Arrow movement must act on the selected key');
      await page.setViewportSize({ width: 390, height: 1000 }); await ready();
      const boxes = await page.locator('[data-pt-plate-key]').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, right: r.right, top: r.top }; }));
      assert.ok(boxes.every(b => b.x >= 0 && b.right <= 390), 'Plate keys must stay inside the phone viewport');
      assert.ok(new Set(boxes.map(b => b.top)).size > 1, 'Phone keys must wrap');
      await page.setViewportSize({ width: 1100, height: 1000 }); await ready(); return { chosen: chosen.id, phoneKeyRows: new Set(boxes.map(b => b.top)).size };
    });
    await check('no browser runtime errors', async () => { assert.deepEqual(errors, []); return errors; });
    const report = { passed: results.every(r => r.passed), sourcePath, sourceSha256: crypto.createHash('sha256').update(tectonicsSource).digest('hex'), react: await page.evaluate(() => React.version), mode: 'createRoot + StrictMode development', results, errors, settlements };
    fs.writeFileSync(path.join(out, process.argv.includes('--report-only') ? 'baseline-results.json' : 'browser-results.json'), JSON.stringify(report, null, 2));
    await ready();
    fs.writeFileSync(path.join(out, 'canvas.png'), Buffer.from(await canvas.evaluate(n => n.toDataURL('image/png').split(',')[1]), 'base64'));
    if (!process.argv.includes('--report-only')) {
      for (const dark of [false, true]) {
        for (const width of [1100, 390]) {
          await page.setViewportSize({ width, height: 1300 }); await mount({ qaDark: dark }); await selectFirst(); await moveRight(); await committedNotices(); await frames(3);
          await canvas.evaluate(n => window.scrollTo({ top: Math.max(0, n.getBoundingClientRect().top + scrollY - 60), behavior: 'instant' }));
          const region = await canvas.evaluate(n => {
            const c = n.getBoundingClientRect(), note = document.querySelector('[data-pt-model-note]').getBoundingClientRect();
            const x = Math.max(0, c.left - 8);
            return { x, y: 0, width: Math.min(innerWidth - x, c.width + 16), height: Math.min(innerHeight, note.bottom + 20) };
          });
          await page.screenshot({ path: path.join(out, `scene-${dark ? 'dark' : 'light'}-${width}.png`), clip: region });
          await page.locator('[data-pt-model-note]').evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await frames(2);
          await page.screenshot({ path: path.join(out, `explainer-${dark ? 'dark' : 'light'}-${width}.png`) });
        }
      }
    }
    console.log(`${results.filter(r => r.passed).length}/${results.length} passed. Results: ${out}`);
    if (!report.passed && !process.argv.includes('--report-only')) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
