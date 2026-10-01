'use strict';

// Full registered tool in Chromium. Only time/randomness are controlled for
// repeatable generated earthquake observations; DOM handlers and React are real.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.join(root, 'scratch', 'tectonics-learning-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], checks: [], accessibility: [], errors: [] };
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(String(error)));
  async function check(name, run) {
    try { const detail = await run(); report.checks.push({ name, passed: true, detail }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, error: String(error.message) }); console.error('FAIL', name, error.message); }
  }
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonics learning flow review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      let frameId = 0, time = performance.now();
      const frames = new Map();
      window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      window.qaFrames = (count, step = 1000 / 60) => {
        for (let i = 0; i < count; i++) {
          time += step;
          ReactDOM.flushSync(() => {
            for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(time);
          });
        }
      };
      window.qaGenerateDepthEvent = () => {
        const original = Math.random, sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5]; let index = 0;
        Math.random = () => sequence[(index++) % sequence.length];
        try { qaFrames(1, 1000); } finally { Math.random = original; }
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const noop = () => {}, Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      const root = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaMount = (dark, seed = {}) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaLog = { xp: [], announcements: [], toasts: [], snapshots: [] };
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'hotspots', _ptPicked: true, ptDrift: false, ...seed } });
          window.qaData = data;
          return StemLab._registry.plateTectonics.render({
            React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: (...args) => qaLog.snapshots.push(args), toolSnapshots: [],
            addToast: (...args) => qaLog.toasts.push(args), announceToSR: text => qaLog.announcements.push(text),
            awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
            a11yClick: fn => ({ onClick: fn }), t: (key, fallback) => fallback == null ? key : fallback,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null
          });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    async function pump(count = 3) { await page.evaluate(n => qaFrames(n), count); await page.waitForTimeout(60); }
    async function click(locator) { await locator.click({ force: true }); await pump(); }
    async function topic(tab) {
      const labels = { hotspots: ['Hotspots', '🔥 Hotspots'] };
      await page.locator('[data-pt-topic-search]').fill(labels[tab][0]);
      await click(page.getByRole('button', { name: labels[tab][1], exact: true }));
      await page.waitForFunction(tab => qaData.plateTectonics.simTab === tab && !qaData.plateTectonics._ptSearch, tab, { polling: 50 });
    }
    async function journey(tab) { await click(page.locator('[data-pt-journey-go="' + tab + '"]')); await page.waitForFunction(tab => qaData.plateTectonics.simTab === tab, tab, { polling: 50 }); }
    async function setRate(value) {
      await page.locator('#pt-hl-rate').evaluate((node, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      await pump();
    }
    async function capture(name, locator) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await pump();
      const file = path.join(out, name + '.png');
      await page.screenshot({ path: file });
      const detail = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, tab: qaData.plateTectonics.simTab }));
      report.captures.push({ name, file, ...detail });
      assert.ok(detail.overflow <= 1, 'Page horizontally overflows by ' + detail.overflow + 'px');
    }
    async function audit(name, locator) {
      await locator.evaluate(node => node.setAttribute('data-qa-audit', 'true'));
      const violations = await page.evaluate(async () => {
        const result = await axe.run('[data-qa-audit="true"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
      });
      await locator.evaluate(node => node.removeAttribute('data-qa-audit'));
      report.accessibility.push({ name, violations });
      assert.equal(violations.length, 0, JSON.stringify(violations));
    }
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const prefix = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMount(dark), dark); await pump();
      await check(prefix + ' calculation opens without revealing an answer; invalid values remain invalid', async () => {
        assert.equal(await page.locator('[data-pt-hotspot-calculation]').getAttribute('open'), null);
        await click(page.locator('[data-pt-hotspot-calculation] summary'));
        assert.equal(await page.locator('[data-pt-hotspot-calc-working]').count(), 0);
        for (const value of ['', '0', '-1']) {
          await page.locator('#pt-hl-calc-rate').fill(value);
          await click(page.locator('[data-pt-hotspot-calc-check]'));
          assert.equal(await page.locator('[data-pt-hotspot-calc-result]').getAttribute('data-pt-hotspot-calc-result'), 'invalid');
          assert.equal(await page.locator('[data-pt-hotspot-calc-working]').count(), 0);
          assert.equal(await page.locator('[data-pt-hotspot-calc-use]').count(), 0);
        }
      });
      await check(prefix + ' checked calculation explains units and seeds an uncommitted line', async () => {
        await page.locator('#pt-hl-calc-island').selectOption('kauai');
        await page.locator('#pt-hl-calc-rate').fill('102');
        assert.equal(await page.locator('[data-pt-hotspot-calc-working]').count(), 0);
        await click(page.locator('[data-pt-hotspot-calc-check]'));
        assert.equal(await page.locator('[data-pt-hotspot-calc-result]').getAttribute('data-pt-hotspot-calc-result'), 'rethink');
        await page.locator('#pt-hl-calc-rate').fill('10.2');
        assert.equal(await page.locator('[data-pt-hotspot-calc-working]').count(), 0);
        await click(page.locator('[data-pt-hotspot-calc-check]'));
        assert.equal(await page.locator('[data-pt-hotspot-calc-result]').getAttribute('data-pt-hotspot-calc-result'), 'correct');
        assert.match(await page.locator('[data-pt-hotspot-calc-working]').innerText(), /519 ÷ 5.1 = 101.8/);
        await click(page.locator('[data-pt-hotspot-calc-use]'));
        assert.equal(await page.locator('#pt-hl-rate').inputValue(), '102');
        assert.equal(await page.locator('[data-pt-hotspot-best-fit]').count(), 0);
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptHotspot.est == null), true);
        await capture(prefix + '-calculation', page.locator('[data-pt-hotspot-calculation]'));
        await audit(prefix + '-hotspot', page.locator('[data-pt-hotspot-lab]'));
      });
      await check(prefix + ' draft survives journey navigation; all-point lock and retry keep the estimate', async () => {
        await setRate(77);
        await journey('explain');
        const claim = 'Cold sinking plates carry earthquakes deeper into the mantle.';
        await page.locator('[data-pt-cer="claim"]').fill(claim);
        await topic('hotspots');
        assert.equal(await page.locator('#pt-hl-rate').inputValue(), '77');
        await click(page.locator('[data-pt-hotspot-calculation] summary'));
        assert.equal(await page.locator('#pt-hl-calc-rate').inputValue(), '10.2');
        await click(page.locator('[data-pt-hotspot-commit]'));
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptHotspot.est), 77);
        assert.equal(await page.locator('[data-pt-hotspot-best-fit]').count(), 1);
        await click(page.locator('[data-pt-hotspot-retry]'));
        assert.equal(await page.locator('#pt-hl-rate').inputValue(), '77');
        assert.equal(await page.locator('[data-pt-hotspot-best-fit]').count(), 0);
        await journey('explain');
        assert.equal(await page.locator('[data-pt-cer="claim"]').inputValue(), claim);
        assert.equal(await page.locator('[data-pt-evidence="depths"]').getAttribute('data-pt-evidence-have'), 'false');
        await capture(prefix + '-journey', page.locator('[data-pt-journey]'));
        await audit(prefix + '-journey', page.locator('[data-pt-journey]'));
      });
      await check(prefix + ' missing depth evidence opens and focuses the visible simulator', async () => {
        await click(page.locator('[data-pt-evidence="depths"] button'));
        await page.waitForFunction(() => qaData.plateTectonics.simTab === 'sim' && qaData.plateTectonics.ptShelfTopics.sim === true, null, { polling: 50 });
        await pump(5);
        await page.waitForFunction(() => document.activeElement.tagName === 'CANVAS' && document.activeElement.getAttribute('aria-hidden') !== 'true', null, { polling: 50 });
        assert.equal(await page.locator('[data-pt-depth-record]').isDisabled(), true);
        return page.evaluate(() => ({ focus: document.activeElement.outerHTML.slice(0, 350), records: qaData.plateTectonics.ptDepthTrials || {} }));
      });
      await check(prefix + ' generated depth samples require deliberate record, unlock evidence and clear without XP', async () => {
        const beforeXP = await page.evaluate(() => qaLog.xp.length);
        const simulator = page.locator('#pt-boundary-simulator');
        await click(simulator.getByRole('button', { name: /Play$/, exact: false }));
        await page.evaluate(() => qaGenerateDepthEvent());
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptDepthTrials == null), true);
        await click(page.locator('[data-pt-depth-record="convergent"]'));
        const convergent = await page.evaluate(() => qaData.plateTectonics.ptDepthTrials.convergent);
        assert.ok(convergent.deep > 0 && convergent.maxKm >= 300, JSON.stringify(convergent));
        await click(page.locator('[data-tect-mode="divergent"]'));
        await page.evaluate(() => qaGenerateDepthEvent()); await page.waitForTimeout(50);
        await click(page.locator('[data-pt-depth-record="divergent"]'));
        const divergent = await page.evaluate(() => qaData.plateTectonics.ptDepthTrials.divergent);
        assert.ok(divergent.events > 0 && divergent.maxKm < 70, JSON.stringify(divergent));
        await click(simulator.getByRole('button', { name: /Pause$/, exact: false }));
        await capture(prefix + '-depth-records', page.locator('[data-pt-depth-investigation]'));
        await audit(prefix + '-depth-records', page.locator('[data-pt-depth-investigation]'));
        await journey('explain');
        assert.equal(await page.locator('[data-pt-evidence="depths"]').getAttribute('data-pt-evidence-have'), 'true');
        await click(page.locator('[data-pt-evidence="depths"] button'));
        const evidence = await page.locator('[data-pt-cer="evidence"]').inputValue();
        assert.ok(evidence.includes(convergent.maxKm + ' km') && evidence.includes(divergent.maxKm + ' km'));
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptCER == null), true);
        await capture(prefix + '-depth-evidence', page.locator('[data-pt-explain]'));
        await audit(prefix + '-explain', page.locator('[data-pt-explain]'));
        await journey('sim');
        assert.equal(await page.locator('[data-pt-depth-sample="convergent"]').innerText().then(text => text.includes(convergent.maxKm + ' km')), true);
        await click(page.locator('[data-pt-depth-clear]'));
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptDepthTrials), {});
        await journey('explain');
        assert.equal(await page.locator('[data-pt-evidence="depths"]').getAttribute('data-pt-evidence-have'), 'false');
        assert.equal(await page.locator('[data-pt-cer="evidence"]').inputValue(), evidence);
        assert.equal(await page.evaluate(() => qaLog.xp.length), beforeXP);
        return { convergent, divergent, xpCalls: 0 };
      });
    }
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(c => !c.passed).length, errors: report.errors.length, captures: report.captures.length }));
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
