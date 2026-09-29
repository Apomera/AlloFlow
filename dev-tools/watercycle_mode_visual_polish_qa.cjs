'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-mode-visual-polish');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contrastOnly = process.argv.includes('--contrast-only');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const checks = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water cycle visual review</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.mountWater = function(seed, dark = false, contrast = false) {
        function Host() {
          const [data, setData] = React.useState({ waterCycle: seed });
          window.waterReviewData = data.waterCycle;
          const noop = () => {};
          return StemLab._registry.waterCycle.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: contrast, gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: noop, getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f, props: {}, srOnly: {}, callGemini: null });
        }
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.classList.toggle('high-contrast', contrast);
        document.body.style.background = dark ? '#081b21' : '#eef2ed';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
    });
    await page.addScriptTag({ content: read('desktop/web-app/node_modules/axe-core/axe.min.js') });
    for (const theme of contrastOnly ? ['contrast'] : ['light', 'dark']) {
      for (const width of contrastOnly ? [1280, 320] : [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 980 });
        for (const mode of contrastOnly ? ['steward-setup'] : ['storm', 'steward-setup', 'steward-year']) {
          await page.evaluate(({ mode, theme }) => mountWater(mode === 'storm' ? { wcMode: 'precipHunt', precipHunt: { viewMode: '2d', paused: true } } : { wcMode: 'steward' }, theme === 'dark', theme === 'contrast'), { mode, theme });
          if (mode === 'steward-year') await page.getByRole('button', { name: '💧 Begin 10-year Watershed Campaign', exact: true }).click();
          await page.evaluate(() => window.scrollTo(0, 0));
          const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
          assert(overflow.scroll <= overflow.width, JSON.stringify({ mode, theme, overflow }));
          const selector = mode === 'storm' ? '.wc-precip-lab' : '.wc-steward-experience';
          const violations = await page.evaluate(async selector => (await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })), selector);
          const scene = mode === 'storm' ? await page.locator('#wcPrecipCanvas').boundingBox() : null;
          if (scene) assert(scene.y < (width > 820 ? 500 : 760), 'Storm scene remains near the top');
          if (mode === 'storm') {
            const boxes = await page.locator('.wc-precip-head-actions button').evaluateAll(buttons => buttons.map(button => {
              const r = button.getBoundingClientRect();
              return { text: button.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            }));
            for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i], b = boxes[j];
              assert(Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 1, 'Header buttons must not overlap: ' + a.text + ', ' + b.text);
            }
          }
          await page.screenshot({ path: path.join(out, mode + '-' + theme + '-' + width + '.png') });
          checks.push({ mode, theme, width, overflow, scene, violations });
          console.log(mode, theme, width, violations.length + ' axe rule violations');
        }
      }
    }
    fs.writeFileSync(path.join(out, contrastOnly ? 'results-contrast.json' : 'results.json'), JSON.stringify({ checks, errors }, null, 2));
    assert.deepEqual(errors, [], 'No browser errors');
    const failures = checks.filter(check => check.violations.length);
    assert.deepEqual(failures.map(({ mode, theme, width, violations }) => ({ mode, theme, width, ids: violations.map(v => v.id) })), [], 'Full mode accessibility audits');
    console.log(JSON.stringify({ checks: checks.length, errors: errors.length }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
