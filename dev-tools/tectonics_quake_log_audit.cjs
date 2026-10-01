'use strict';
// Read-only learner workflow audit, using the real local React component.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-orientation-review/quake-log-audit');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const findings = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<html><body style="margin:0;font-family:system-ui;background:#0f172a"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => ReactDOM.flushSync(() => ReactDOM.createRoot(document.getElementById('wrap')).render(React.createElement(AlloTectonicsInteractive, { darkMode: true, isContrast: false }))));
    const click = selector => page.locator(selector).evaluate(node => node.click());
    for (const mode of ['divergent', 'transform']) {
      await click(`[data-tect-mode="${mode}"]`);
      const log = page.locator('[data-pt-quake-log]');
      if (!await log.evaluate(node => node.open)) await log.locator('summary').evaluate(node => node.click());
      await log.locator('svg').waitFor();
      await log.screenshot({ path: path.join(out, `dark-390-${mode}-quake-log.png`) });
      findings.push(await log.evaluate((node, mode) => {
        const svg = node.querySelector('svg');
        const box = svg.getBoundingClientRect();
        return { mode, orangeSlabLineCount: svg.querySelectorAll('line[stroke="#d97706"]').length,
          lineAngles: [...svg.querySelectorAll('line[stroke="#d97706"]')].map(line => ({ x1: line.getAttribute('x1'), y1: line.getAttribute('y1'), x2: line.getAttribute('x2'), y2: line.getAttribute('y2') })),
          axes: node.querySelector('[data-pt-quake-axis]')
            ? [...node.querySelectorAll('[data-pt-quake-axis]')].map(text => ({ text: text.textContent, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) }))
            : [...svg.querySelectorAll('text')].slice(-2).map(text => ({ text: text.textContent, renderedFontPx: Number(text.getAttribute('font-size')) * box.width / 460 })),
          description: node.textContent };
      }, mode));
    }
    await page.getByRole('button', { name: '▶ Play', exact: true }).evaluate(node => node.click());
    await page.waitForFunction(() => !document.querySelector('[data-pt-sim-check]').textContent.startsWith('Press Play'));
    await page.getByRole('button', { name: '⏸ Pause', exact: true }).evaluate(node => node.click());
    const before = await page.locator('[data-pt-sim-check]').textContent();
    await click('[data-tect-mode="transform"]');
    await page.waitForTimeout(100);
    const after = await page.locator('[data-pt-sim-check]').textContent();
    findings.push({ currentModeClickResets: after.startsWith('Press Play'), before, after });
  } finally {
    fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify({ sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), findings, errors }, null, 2));
    console.log(JSON.stringify({ findings, errors, out }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
