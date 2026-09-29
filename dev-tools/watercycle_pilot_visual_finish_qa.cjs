'use strict';
// Visual acceptance check for pilot framing, route choices, and notebook materials.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const output = path.join(root, 'reports', 'watercycle-pilot-visual-finish');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water cycle pilot visual review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: read('desktop/web-app/node_modules/axe-core/axe.min.js') });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.mountPilot = function (theme) {
        function Host() {
          const [data, setData] = React.useState({ waterCycle: { wcMode: 'pilot', pilot: { onboardingComplete: true, paused: true } }, _threeLoaded: true });
          const noop = () => {};
          return StemLab._registry.waterCycle.render({ React, toolData: data, setToolData: setData, isDark: theme === 'dark', isContrast: theme === 'contrast', gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons, setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: noop, getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f, props: {}, srOnly: {}, callGemini: null });
        }
        document.documentElement.className = theme === 'dark' ? 'dark' : theme === 'contrast' ? 'theme-contrast' : '';
        document.body.style.background = theme === 'light' ? '#e8eee8' : '#0b2027';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
    });
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(theme => mountPilot(theme), theme);
        await page.waitForSelector('.wc-pilot-notebook');
        await page.locator('#wcPilotMissions').evaluate(node => { node.open = true; });
        await page.locator('.wc-pilot-climate-drawer').evaluate(node => { node.open = true; });
        const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, notebookFont: getComputedStyle(document.querySelector('.wc-pilot-notebook-head p')).fontSize, notebookButtonMinHeight: getComputedStyle(document.querySelector('.wc-pilot-notebook-btn')).minHeight }));
        assert(metrics.scrollWidth <= width + 1, 'No horizontal overflow in ' + theme + ' at ' + width);
        assert(parseFloat(metrics.notebookFont) >= 13, 'Readable notebook copy');
        assert(parseFloat(metrics.notebookButtonMinHeight) >= 44, 'Notebook touch target height');
        const audits = {};
        for (const selector of ['.wc-pilot-navigation', '.wc-pilot-climate-drawer', '#wcPilotMissions', '.wc-pilot-notebook']) {
          audits[selector] = await page.evaluate(async selector => (await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.html) })), selector);
          assert.deepEqual(audits[selector], [], selector + ' accessibility in ' + theme + ' at ' + width);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, 'pilot-' + theme + '-' + width + '.png'), animations: 'disabled', timeout: 60000 });
        await page.locator('.wc-pilot-notebook').screenshot({ path: path.join(output, 'notebook-' + theme + '-' + width + '.png'), animations: 'disabled', timeout: 60000 });
        results.push({ theme, ...metrics, audits });
      }
    }
    assert.deepEqual(errors, [], 'No browser errors');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log('PASS: 6 pilot theme/viewport states, 24 scoped accessibility audits, readable notebook type and touch targets, no horizontal overflow or browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
