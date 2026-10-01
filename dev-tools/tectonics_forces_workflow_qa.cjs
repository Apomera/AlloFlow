'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8'), source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-forces-review'); fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], accessibility: [], errors: [] };
  page.on('pageerror', error => report.errors.push(String(error)));
  async function check(name, run) {
    try { const detail = await run(); report.checks.push({ name, passed: true, detail }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, error: String(error) }); console.error('FAIL', name, String(error)); }
  }
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Plate forces learning review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { StemLab.ensureThree = () => new Promise(() => {}); StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')), noop = () => {};
      let generation = 0;
      window.qaMount = dark => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaLog = { xp: [], announcements: [] };
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, simTab: 'forces', ptShelfTopics: { forces: false }, ptDrift: false } });
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
    const control = name => page.locator('[data-pt-forces-' + name + ']');
    async function capture(name, selector) {
      await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const file = path.join(out, name + '.png'); await page.screenshot({ path: file });
      const detail = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
      report.captures.push({ name, file, ...detail }); assert.ok(detail.overflow <= 1, 'page horizontal overflow');
    }
    async function audit(name) {
      const violations = await page.evaluate(async () => {
        const result = await axe.run('[data-pt-forces]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
      });
      report.accessibility.push({ name, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
    }
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const prefix = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMount(dark), dark);
      await control('canvas').waitFor();
      await check(prefix + ' prediction baseline and cancel are accessible and do not record', async () => {
        await control('cut').click();
        await page.waitForFunction(() => document.activeElement.hasAttribute('data-pt-forces-predict'));
        assert.equal(await control('lock').isDisabled(), true);
        await capture(prefix + '-prediction', '[data-pt-forces-predict]'); await audit(prefix + '-prediction');
        await control('cancel').click();
        await page.waitForFunction(() => document.activeElement.hasAttribute('data-pt-forces-cut'));
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptForce == null), true);
      });
      await check(prefix + ' deliberate cut finishes, pauses and records the immediate numerical change once', async () => {
        const expected = await page.evaluate(() => { const w = __alloPtForces.make(), before = w.vA; __alloPtForces.cut(w); return { before, after: w.vA }; });
        await control('cut').click(); await page.locator('[data-pt-forces-predict] input').first().check(); await control('lock').click();
        await page.waitForFunction(() => document.activeElement.hasAttribute('data-pt-forces-watch'));
        assert.equal(await control('continent').isDisabled(), true);
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptForce.observations == null), true);
        await control('result').waitFor();
        assert.equal(await control('run').getAttribute('data-pt-forces-run'), 'false');
        const saved = await page.evaluate(() => qaData.plateTectonics.ptForce);
        assert.equal(saved.preds.length, 1); assert.equal(saved.observations.length, 1);
        assert.equal(saved.observations[0].vBefore, expected.before); assert.equal(saved.observations[0].vAfter, expected.after);
        assert.equal(await control('result').getAttribute('data-pt-forces-result'), 'different');
        await capture(prefix + '-cut-comparison', '[data-pt-forces-result]'); await audit(prefix + '-cut');
        await control('run').click(); await page.waitForTimeout(250); await control('run').click();
        assert.equal(await page.evaluate(() => qaData.plateTectonics.ptForce.observations.length), 1);
        return expected;
      });
      await check(prefix + ' collision observation has clear progress and survives reset and navigation', async () => {
        await control('reset').click(); await control('continent').click();
        await page.locator('[data-pt-forces-predict] input').nth(1).check(); await control('lock').click(); await control('run').click();
        assert.match(await control('watch').innerText(), /Time is paused/);
        assert.equal(await control('cut').isDisabled(), true);
        await capture(prefix + '-observation', '[data-pt-forces-watch]');
        for (let i = 0; i < 120 && await control('watch').count(); i++) await control('step').click();
        const saved = await page.evaluate(() => qaData.plateTectonics.ptForce);
        assert.equal(saved.observations.length, 2);
        const observed = saved.observations[1];
        assert.equal(observed.a, 'continent'); assert.ok(observed.vBefore > observed.vAfter && observed.vAfter > 0 && observed.mountainKm > 0);
        assert.equal(await control('run').getAttribute('data-pt-forces-run'), 'false');
        await capture(prefix + '-all-comparisons', '[data-pt-forces-observations]'); await audit(prefix + '-completed');
        await control('reset').click(); assert.equal(await page.locator('[data-pt-forces-observation]').count(), 2);
        await page.locator('[data-pt-journey-go="explain"]').click();
        assert.equal(await page.locator('[data-pt-evidence="cut"]').getAttribute('data-pt-evidence-have'), 'true');
        assert.equal(await page.locator('[data-pt-evidence="continent"]').getAttribute('data-pt-evidence-have'), 'true');
        await page.locator('[data-pt-topic-search]').fill('What Moves Plates');
        await page.getByRole('button', { name: '⚖️ What Moves Plates', exact: true }).click();
        assert.equal(await page.locator('[data-pt-forces-observation]').count(), 2);
        assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.ptForce.observations), saved.observations);
        assert.equal(await control('run').getAttribute('data-pt-forces-run'), 'false');
        assert.equal(await page.evaluate(() => qaLog.xp.length), 0);
        return observed;
      });
    }
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(c => !c.passed).length, errors: report.errors.length, captures: report.captures.length }));
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
