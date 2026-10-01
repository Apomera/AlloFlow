'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-hotspot-workflow-review');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Hotspot observation and fit review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window.StemLab = { registerTool() {} }; });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      window.qaMountHotspot = dark => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaRecords = []; window.qaAnnouncements = []; window.qaXP = [];
        function Host() {
          const [saved, setSaved] = React.useState({}); window.qaSaved = saved;
          return React.createElement(AlloTectonicsHotspotLab, { darkMode: dark, saved,
            t: (_key, fallback) => fallback, awardXP: value => qaXP.push(value), announceToSR: value => qaAnnouncements.push(value),
            onRecord(patch) { qaRecords.push(patch); setSaved(prev => ({ ...prev, ...patch })); } });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    const shot = async (selector, name) => { await page.locator(selector).screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' }); report.captures.push(`${name}.png`); };
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMountHotspot(dark), dark);
      const panel = page.locator('[data-pt-hotspot-lab]'), number = panel.locator('[data-pt-hotspot-rate-number]'), slider = panel.locator('#pt-hl-rate');
      await panel.waitFor(); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => qaRecords.length), 0);
      assert.equal(await panel.locator('[data-pt-hotspot-best-fit]').count(), 0);
      await shot('[data-pt-hotspot-lab]', `workflow-${name}`);
      await panel.locator('#pt-hl-observe-island').selectOption('midway');
      assert.equal(await panel.locator('#pt-hl-calc-island').inputValue(), 'midway');
      assert.equal(await panel.locator('[data-pt-hotspot-selected="true"]').getAttribute('data-pt-hotspot-point'), 'midway');
      assert.match(await panel.locator('[data-pt-hotspot-compare]').textContent(), /1,108 km.*2,432 km/);
      const typeRate = async value => {
        const prior = await slider.inputValue();
        await number.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type(value);
        assert.equal(await number.inputValue(), value);
        assert.equal(await slider.inputValue(), prior);
      };
      for (const [value, expected, commit] of [['1.5', '15', 'Enter'], ['9.8', '98', 'Tab'], ['3.7', '37', 'Enter'], ['21.5', '200', 'Enter'], ['0.5', '10', 'Tab']]) {
        await typeRate(value); await page.keyboard.press(commit); assert.equal(await slider.inputValue(), expected);
        assert.equal(await page.evaluate(() => qaSaved.est == null), true);
      }
      await slider.focus(); await page.keyboard.press('ArrowRight'); assert.equal(await number.inputValue(), '1.1');
      await panel.locator('#pt-hl-observe-island').selectOption('kauai');
      await panel.locator('[data-pt-hotspot-calculation] summary').click();
      await panel.locator('#pt-hl-calc-rate').focus(); await page.keyboard.type('10.2');
      await panel.locator('[data-pt-hotspot-calc-check]').click();
      assert.equal(await panel.locator('[data-pt-hotspot-calc-result]').getAttribute('data-pt-hotspot-calc-result'), 'correct');
      await shot('[data-pt-hotspot-calculation]', `calculation-${name}`);
      await panel.locator('[data-pt-hotspot-calc-use]').click();
      assert.equal(await slider.inputValue(), '102'); assert.equal(await number.inputValue(), '10.2');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'pt-hl-rate');
      assert.equal(await panel.locator('[data-pt-hotspot-best-fit]').count(), 0);
      await panel.locator('#pt-hl-observe-island').selectOption('midway');
      assert.match(await panel.locator('[data-pt-hotspot-compare]').textContent(), /predicts 2,825 km.*2,432 km/);
      await shot('[data-pt-hotspot-fit-controls]', `comparison-${name}`);
      await typeRate('9.8'); await panel.locator('[data-pt-hotspot-commit]').click();
      assert.equal(await page.evaluate(() => qaSaved.est), 98);
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-pt-hotspot-retry')), true);
      assert.equal(await panel.locator('[data-pt-hotspot-result]').getAttribute('data-pt-hotspot-result'), 'close');
      assert.equal(await panel.locator('[data-pt-hotspot-line="estimate"]').getAttribute('stroke-dasharray'), '7 5');
      await shot('[data-pt-hotspot-chart]', `fitted-chart-${name}`);
      await shot('[data-pt-hotspot-fit-controls]', `fitted-controls-${name}`);
      await panel.locator('[data-pt-hotspot-retry]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'pt-hl-rate');
      assert.equal(await number.inputValue(), '9.8'); assert.equal(await page.evaluate(() => qaSaved.est), null);
      assert.equal(await panel.locator('[data-pt-hotspot-best-fit]').count(), 0);
      await page.getByRole('radio', { name: 'Northwest, from Hawaiʻi toward Midway', exact: true }).focus(); await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => qaSaved.dir), 'nw');
      await panel.locator('[data-pt-hotspot-table] summary').click();
      const metrics = await panel.evaluate(node => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        clippedControls: [...node.querySelectorAll('input,button,select,summary')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(el => el.id || el.textContent),
        tickFontPx: Number(node.querySelector('[data-pt-hotspot-chart] text').getAttribute('font-size')) * node.querySelector('[data-pt-hotspot-chart]').getBoundingClientRect().width / 460,
        dataRows: node.querySelectorAll('[data-pt-hotspot-table] tbody th[scope="row"]').length
      }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []); assert.ok(metrics.tickFontPx >= 12); assert.equal(metrics.dataRows, 11);
      const audit = await panel.evaluate(async node => {
        const result = await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      const recordsBeforeIdle = await page.evaluate(() => qaRecords.length); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => qaRecords.length), recordsBeforeIdle); assert.equal(await page.evaluate(() => qaXP.length), 0);
      assert.ok(await page.evaluate(() => qaRecords.every(patch => Object.keys(patch).every(key => ['est', 'draftRate', 'dir', 'calculation'].includes(key)))));
      report.checks.push({ name, metrics, audit, realTyping: true, pendingDraftCommitted: 98, idleRecords: 0, xp: 0 });
      console.log(name, JSON.stringify({ metrics, audit }));
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    assert.deepEqual(report.errors, []); assert.ok(report.checks.every(check => check.audit.length === 0));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
