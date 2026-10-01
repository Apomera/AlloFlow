'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const out = path.resolve('scratch/tectonics-stress-review');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Boundary Stress review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      window.StemLab = { registerTool(id, config) { this[id] = config; }, ensureThree: () => Promise.reject(new Error('No 3D needed for stress review')), makeBayViewer: () => ({}) };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaMountStress = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        const noop = () => {};
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'boundaryHunt', _ptPicked: true, ptDrift: false } });
          window.qaState = data.plateTectonics;
          return StemLab.plateTectonics.render({ React, toolData: data, setToolData: setData, isDark: dark,
            isContrast: false, icons: new Proxy({}, { get: () => () => null }), t: (_k, fallback) => fallback,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', toolSnapshots: [], getXP: () => 0,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, addToast: noop, announceToSR: noop,
            awardXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: fn => ({ onClick: fn }) });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMountStress(dark), dark);
      const panel = page.locator('[data-pt-stress-reveal]');
      await panel.waitFor();
      await panel.locator('[data-pt-stress-record]').click({ force: true });
      await panel.locator('[data-pt-stress-value="force"]').fill('80');
      await page.waitForFunction(() => qaState.boundaryHunt.force === 80);
      await panel.locator('[data-pt-stress-record]').click({ force: true });
      await page.waitForFunction(() => qaState.boundaryHunt.log.length === 2);
      const comparison = panel.locator('[data-pt-stress-compare]');
      assert.equal(await comparison.getAttribute('data-pt-stress-compare'), '1');
      // The native slider remains operable with keyboard arrows.
      await panel.locator('#bh-friction').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => qaState.boundaryHunt.friction === 51);
      const metrics = await panel.evaluate(node => {
        const inputs = [...node.querySelectorAll('input,textarea,button')];
        return { overflow: document.documentElement.scrollWidth - innerWidth,
          clippedControls: inputs.filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(el => el.id || el.textContent),
          fonts: [...node.querySelectorAll('th,td,label,p')].map(el => parseFloat(getComputedStyle(el).fontSize)),
          tableScrollable: node.querySelector('[data-pt-stress-log]').tabIndex === 0 };
      });
      assert.equal(metrics.overflow, 0);
      assert.deepEqual(metrics.clippedControls, []);
      assert.equal(metrics.tableScrollable, true);
      const audit = await panel.evaluate(async node => {
        const result = await axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'label', 'button-name', 'aria-valid-attr-value'] } });
        return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await panel.screenshot({ path: path.join(out, `stress-${name}.png`), animations: 'disabled' });
      await comparison.screenshot({ path: path.join(out, `comparison-${name}.png`), animations: 'disabled' });
      report.checks.push({ name, metrics, audit });
      report.captures.push(`stress-${name}.png`, `comparison-${name}.png`);
      console.log(name, JSON.stringify({ overflow: metrics.overflow, clippedControls: metrics.clippedControls, audit }));
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
